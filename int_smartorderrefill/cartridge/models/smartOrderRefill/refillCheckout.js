/* eslint-disable no-restricted-syntax, guard-for-in, no-array-constructor, no-continue, new-cap */

"use strict";
/**
 *  Property of OSF Global Services, Inc., (with its brand OSF Commerce). OSF remains the sole owner of all right, title and interest in the software.
 *  Do not copy, sell, reverse engineer or otherwise attempt to derive or obtain information about the functioning, manufacture or operation therein.
 */
/* global request, session, empty */
var dwsystem   = require('dw/system');
var PromotionMgr = require("dw/campaign/PromotionMgr");
var ShippingMgr = require("dw/order/ShippingMgr");
var Transaction = require("dw/system/Transaction");
var CustomerMgr = require("dw/customer/CustomerMgr");
var BasketMgr = require("dw/order/BasketMgr");
var Currency = require("dw/util/Currency");
var OrderMgr = require("dw/order/OrderMgr");
var ProductMgr = require("dw/catalog/ProductMgr");
var HashMap = require("dw/util/HashMap");
var PaymentMgr = require("dw/order/PaymentMgr");
var PaymentInstrument = require("dw/order/PaymentInstrument");
var Order = require("dw/order/Order");
var dwcampaign = require('dw/campaign');
var SORLogger = require("dw/system/Logger").getLogger("SORLogger", "SORLogger");

var RefillAddress = require("~/cartridge/models/smartOrderRefill/refillAddress");
var paymentIntegration = require("~/cartridge/controllers/paymentIntegration/PaymentIntegration");
var RefillEmails = require("~/cartridge/scripts/smartOrderRefill/refillEmails");

/**
 * @module RefillCheckout
 */

/**
 * @description Model for Smart Order Refill Checkout
 * @typedef {RefillCheckout} RefillCheckout
 * @property {RefillOrder} customerRefillOrder
 * @property {dw.customer.Customer} customer
 * @property {string} type
 * @property {number} cancelationFee
 * @property {dw.order.LineItemCtnr} lineItemCtnr
 */

/**
 * @description constructor for RefillCheckout
 * @param {Object} args - Plain object that matches the model properties
 * @constructor RefillCheckout
 */
function RefillCheckout(args) {
    this.customerRefillOrder = args.customerRefillOrder;
    this.customer = args.customer;
    this.type = args.type;
    this.cancelationFee = args.cancelationFee;
    this.lineItemCtnr = null;
}
/**
 * @description Function responsible for calculating product prices based on line item quantities
 * @function calculateProductPrices
 * @param {dw.order.Basket} basket customer basket
*/
function calculateProductPrices(basket) {
    // iterate all product line items of the basket and set prices
    var productLineItems = basket.getAllProductLineItems().iterator();
    while (productLineItems.hasNext()) {
        var productLineItem = productLineItems.next();
        var product = productLineItem.product;

        // handle option line items
        if (productLineItem.optionProductLineItem) {
            // for bonus option line items, we do not update the price
            // the price is set to 0.0 by the promotion engine
            if (!productLineItem.bonusProductLineItem) {
                productLineItem.updateOptionPrice();
            }
        // handle bundle line items, but only if they're not a bonus
        } else if (productLineItem.bundledProductLineItem) {
            // no price is set for bundled product line items
        // handle bonus line items
        // the promotion engine set the price of a bonus product to 0.0
        // we update this price here to the actual product price just to
        // provide the total customer savings in the storefront
        // we have to update the product price as well as the bonus adjustment
        } else if (productLineItem.bonusProductLineItem && product !== null) {
            var price = product.priceModel.price;
            var adjustedPrice = productLineItem.adjustedPrice;
            productLineItem.setPriceValue(price.valueOrNull);
            // get the product quantity
            var quantity2 = productLineItem.quantity;
            // we assume that a bonus line item has only one price adjustment
            var adjustments = productLineItem.priceAdjustments;
            if (!adjustments.isEmpty()) {
                var adjustment = adjustments.iterator().next();
                var adjustmentPrice = price.multiply(quantity2.value).multiply(-1.0).add(adjustedPrice);
                adjustment.setPriceValue(adjustmentPrice.valueOrNull);
            }

        // handle product line items unrelated to product
        } else if (product === null && productLineItem.catalogProduct) {
            productLineItem.setPriceValue(null);
        // handle normal product line items
        } else {
            productLineItem.setPriceValue(productLineItem.basePrice.valueOrNull);
        }
    }
}

/**
 * @description Function responsible for calculating the tax for the basket
 * @function calculateTax
 * @param {dw.order.Basket} basket custoemr basket
*/
function calculateTax(basket) {
    var ShippingLocation = require("dw/order/ShippingLocation");
    var TaxMgr = require("dw/order/TaxMgr");
    var shipments = basket.getShipments().iterator();

    while (shipments.hasNext()) {
        var shipment = shipments.next();
        var shipmentLineItems = shipment.getAllLineItems().iterator();
        while (shipmentLineItems.hasNext()) {
            var tempLineItem = shipmentLineItems.next();
            if (tempLineItem.taxClassID === TaxMgr.customRateTaxClassID) {
                tempLineItem.updateTax(tempLineItem.taxRate);
            } else {
                tempLineItem.updateTax(null);
            }
        }

        var taxJurisdictionID = null;

        if (shipment.shippingAddress !== null) {
            var location = new ShippingLocation(shipment.shippingAddress);
            taxJurisdictionID = TaxMgr.getTaxJurisdictionID(location);
        }

        if (taxJurisdictionID === null) {
            taxJurisdictionID = TaxMgr.defaultTaxJurisdictionID;
        }

        // if we have no tax jurisdiction, we cannot calculate tax
        if (taxJurisdictionID === null) {
            continue;
        }

        // shipping address and tax juridisction are available
        var shipmentLineItems2 = shipment.getAllLineItems().iterator();
        while (shipmentLineItems2.hasNext()) {
            var lineItem = shipmentLineItems2.next();
            var taxClassID = lineItem.taxClassID;

            // do not touch line items with fix tax rate
            if (taxClassID === TaxMgr.customRateTaxClassID) {
                continue;
            }

            // line item does not define a valid tax class; let's fall back to default tax class
            if (taxClassID === null) {
                taxClassID = TaxMgr.defaultTaxClassID;
            }

            // if we have no tax class, we cannot calculate tax
            if (taxClassID === null) {
                continue;
            }

            // get the tax rate
            var taxRate = TaxMgr.getTaxRate(taxClassID, taxJurisdictionID);
            // w/o a valid tax rate, we cannot calculate tax for the line item
            if (taxRate === null) {
                continue;
            }

            // calculate the tax of the line item
            lineItem.updateTax(taxRate);
        }
    }

    // besides shipment line items, we need to calculate tax for possible order-level price adjustments
    // this includes order-level shipping price adjustments
    if (!basket.getPriceAdjustments().empty || !basket.getShippingPriceAdjustments().empty) {
        // calculate a mix tax rate from
        var basketPriceAdjustmentsTaxRate = (basket.getMerchandizeTotalGrossPrice().value / basket.getMerchandizeTotalNetPrice().value) - 1;
        var basketPriceAdjustments = basket.getPriceAdjustments().iterator();

        while (basketPriceAdjustments.hasNext()) {
            var basketPriceAdjustment = basketPriceAdjustments.next();
            basketPriceAdjustment.updateTax(basketPriceAdjustmentsTaxRate);
        }

        var basketShippingPriceAdjustments = basket.getShippingPriceAdjustments().iterator();
        while (basketShippingPriceAdjustments.hasNext()) {
            var basketShippingPriceAdjustment = basketShippingPriceAdjustments.next();
            basketShippingPriceAdjustment.updateTax(basketPriceAdjustmentsTaxRate);
        }
    }
}

/**
 * @description Static methode that updates the locale and currency
 * @function setLocaleAndCurrency
 * @memberof RefillCheckout
 * @param {RefillOrder|RefillSubscription} refillList refill list object
 * @param {dw.order.Basket} basket customer basket
 * @static
 *
 */
RefillCheckout.setLocaleAndCurrency = function (refillList, basket) {
    var originalOrder = OrderMgr.getOrder(refillList.originalOrder);
	
	if(originalOrder) {
		request.setLocale(originalOrder.getCustomerLocaleID());
	    var newCurrency = Currency.getCurrency(originalOrder.getCurrencyCode());
	    session.setCurrency(newCurrency);
	
	    if (!empty(basket) && originalOrder.getCurrencyCode() !== basket.getCurrencyCode()) {
	        basket.updateCurrency();
	    }
	} else {
		request.setLocale('en_US');
	    var newCurrency = Currency.getCurrency('USD');
	    session.setCurrency(newCurrency);
	
	    if (!empty(basket)) {
	        basket.updateCurrency();
	    }
	}
    
};

/**
 * @descriptuion Method responsible for initializing the customers basket
 * @function initBasket
 * @memberof RefillCheckout.prototype
 */
RefillCheckout.prototype.initBasket = function () {

	SORLogger.info("Start initBasket ***");
	Transaction.begin();
    var basket = BasketMgr.currentBasket;
    if (basket !== null) {
		SORLogger.info("SOR Job: Basket UUID before deletion ***: {0}", basket.UUID);
        BasketMgr.deleteBasket(basket);
    }
    basket = BasketMgr.currentOrNewBasket;

    RefillCheckout.setLocaleAndCurrency(this.customerRefillOrder, basket);
    this.lineItemCtnr = basket;
	if(!empty(this.lineItemCtnr)){
		SORLogger.info("SOR Job: New Basket ***: {0}", this.lineItemCtnr.UUID);
	}
    Transaction.commit();
	SORLogger.info("End initBasket ***");
};

/**
 * @description Method responsible for populating the customers basket
 * @function populateBasket
 * @memberof RefillCheckout.prototype
 */
RefillCheckout.prototype.populateBasket = function () {

		SORLogger.info("Start populateBasket ***");
		Transaction.begin();
	    var basket = this.lineItemCtnr;
	    var billingAddress = null;
	    var shippingAddress = null;
	    var shipmentIterator = basket.getShipments().iterator();
	    var shipmentDefault = null;

	    if (basket.getBillingAddress() == null) {
	        basket.createBillingAddress();
	    }

	    if (shipmentIterator.hasNext()) {
	        shipmentDefault = shipmentIterator.next();
	        shippingAddress = shipmentDefault.shippingAddress;
	        if (shippingAddress == null) {
	            shippingAddress = shipmentDefault.createShippingAddress();
	        }
	        RefillAddress.setOrderAddressValues(shippingAddress, this.customerRefillOrder.shippingAddress);
	    }
	    billingAddress = basket.getBillingAddress();
	    if (billingAddress != null) {
	        RefillAddress.setOrderAddressValues(billingAddress, this.customerRefillOrder.billingAddress);
	    }

		/**
		* Update shipping method to the one specified in preferences
		* 
		* Default SORV2 config was setting the original order shipping method to refill orders
		**/
		
		var OREnabled = dwsystem.Site.current.getCustomPreferenceValue("SorEnabled"),
	        ORFreeShippingEnabled = dwsystem.Site.current.getCustomPreferenceValue("OsfSorEnableFreeShipping");
	    
	    var osfShippingID = dwsystem.Site.current.getCustomPreferenceValue("osfShippingMethod");
	    if(osfShippingID) {
	    	var osfMethod = null;
	    	var allMethods = dw.order.ShippingMgr.getAllShippingMethods();
			for (var i = 0; i < allMethods.length; i++) {
				var method = allMethods[i];
				if(osfShippingID == method.ID) {
					osfMethod = method;
				}
			}
	    	basket.defaultShipment.setShippingMethod(osfMethod);
	    }
	    
	    if (OREnabled && ORFreeShippingEnabled) {
	            var allLineItems = basket.getAllLineItems();

	            for each(var line in allLineItems ) {
	                if (line.describe().ID == 'ShippingLineItem') {
	                    line.setPriceValue(0);
	                    line.updateTax(0);
	                }
	            }
	        }
	    basket.updateTotals();

		// Update shipping method: END
		
	    /*var originalOrder = OrderMgr.getOrder(this.customerRefillOrder.originalOrder);
	    var defaultShipping = originalOrder.getDefaultShipment().getShippingMethod();

		SORLogger.info("Set SOR shipping method: {0}", defaultShipping);

	    shipmentDefault.setShippingMethod(defaultShipping);
	    if (originalOrder.getAdjustedShippingTotalPrice().value === 0) {
	        shipmentDefault.getShippingLineItems()[0].setPriceValue(originalOrder.getAdjustedShippingTotalPrice().value);
	    } else {
	        ShippingMgr.applyShippingCost(basket);
	    }*/

		

	    for (var productsIndex in this.customerRefillOrder.products) {
	        var prod = this.customerRefillOrder.products[productsIndex];
	        var productLineItem;
	        var product;
	        if (!prod.cancelDate) {
	            product = ProductMgr.getProduct(prod.ID);
	            if (product.master) {
	                var pvm = product.variationModel;
	                var variant = pvm.selectedVariant;
	                if (empty(variant)) {
	                    var attDefs = pvm.getProductVariationAttributes();
	                    var map = new HashMap();

	                    for (var i = 0, len = attDefs.length; i < len; i++) {
	                        var attribute = attDefs[i];
	                        var selectedValue = pvm.getSelectedValue(attribute);
	                        if (selectedValue && selectedValue.displayValue.length > 0) {
	                            map.put(attribute.ID, selectedValue.ID);
	                        }
	                    }

	                    var variants = pvm.getVariants(map);
	                    for (var k = 0; k < variants.length; k++) {
	                        var p = variants[k];
	                        if (p.onlineFlag && p.availabilityModel.availability > 0) {
	                            variant = p;
	                            break;
	                        }
	                    }
	                }
	                SORLogger.info("SOR PopulateBasket: Variant ID: {0}", variant.getID());
	                productLineItem = basket.createProductLineItem(variant.getID(), shipmentDefault);
	            } else {
	            	SORLogger.info("SOR PopulateBasket: product id: {0}", product.getID());
	                productLineItem = basket.createProductLineItem(product.getID(), shipmentDefault);
	            }
	            if (productLineItem) {
	                productLineItem.setQuantityValue(parseInt(prod.quantity, 10));
	                productLineItem.setPriceValue(parseFloat(product.priceModel.getPrice() ? product.priceModel.getPrice().value : prod.price));
	                productLineItem.productName = product.name;

	                //setting AD interval on product level
					if(!empty(prod) && !empty(prod.interval)){
						productLineItem.custom.SorMonthInterval = prod.interval;
					}
	            }
	            SORLogger.info("Added to Cart ID: {0} ({1})", productLineItem.getProductID(), prod.quantity);
	        }
	    }

		//Add samples
	    var FreeSamplesEnabled = dwsystem.Site.current.getCustomPreferenceValue("OsfSorEnableFreeSamples");

	    if (FreeSamplesEnabled) {
	        var SampleIDs = dwsystem.Site.current.getCustomPreferenceValue("OsfSorFreeSamplesID");
			
			for each(var SampleID in SampleIDs) {
					var plitem;
		            var Product = ProductMgr.getProduct(SampleID);
					SORLogger.info("Added sample to refill order: {0}", SampleID);
		
		            if (Product != null) {
		                if (Product.master) {
		                    var ProductUtils = require('app_storefront_core/cartridge/scripts/product/ProductUtils.js');
		                    var Product = ProductUtils.getDefaultVariant(Product.variationModel);
		                }
		
		                if(Product && !Product.productSet) {
		                    plitem = basket.createProductLineItem(Product.getID(), basket.defaultShipment);
		                }
		
						if(plitem) {
							plitem.setQuantityValue(1);
							
							plitem.setPriceValue(0.0); // need to check the price of these SKU's
						}
		            }
	        	}
	        
	     }

	     Transaction.commit();
	     SORLogger.info("End of populateBasket ***");
};

/**
 * @description Method responsible for initializing the session customer
 * @function initSessionCustomer
 * @memberof RefillCheckout.prototype
 */
RefillCheckout.prototype.initSessionCustomer = function () {
    /*
     * Temporary user to make sure the order will be created. This is needed because
     * when calling the createOrder method it expects that a session contains a valid user.
     */
	SORLogger.info("Start initSessionCustomer ****");
    Transaction.begin();
    if (!CustomerMgr.loginExternallyAuthenticatedCustomer("SmartOrderRefilUser", "12Fa_KeP*&ass45", false)) {
        CustomerMgr.createExternallyAuthenticatedCustomer("SmartOrderRefilUser", "12Fa_KeP*&ass45");
        CustomerMgr.loginExternallyAuthenticatedCustomer("SmartOrderRefilUser", "12Fa_KeP*&ass45", false);
    }
    Transaction.commit();
	SORLogger.info("End initSessionCustomer ****");
};

/**
 * Function for overriding current date
 * @param {Date} dateOverride
 * @returns {Date}
 */
function getCurrentDate (dateOverride){
    var currentDate = null;
    var today = new Date();
    if (dateOverride) {
        currentDate = dateOverride;
    } else {
        currentDate = today;
    }
	dwsystem.Logger.info('SOR Job: Date override: {0}', currentDate);
    return currentDate;
}

/**
* Custom Method: - To apply promotions
**/
RefillCheckout.prototype.applyPromotions = function(Basket, currentDate) {
	
	var sitePrefs = dwsystem.Site.getCurrent().getPreferences();
	
	var sourceCode = sitePrefs.getCustom()["OsfSorRefillSourceCode"];
	var SORCampaign = sitePrefs.getCustom()["OsfSorRefillCampaign"];

    if(SORCampaign) {
		try {
			var promotionPlan = dwcampaign.PromotionMgr.getActiveCustomerPromotions();
		    var promotionCollection = promotionPlan.promotions;
		    var campaign = dwcampaign.PromotionMgr.getCampaign(SORCampaign);
		
		    var currentDate = getCurrentDate(currentDate);;
		    var currentDay = currentDate.getDate();
		    var tomorrowDay = currentDay + 1;
		    var tomorrow = new Date(currentDate.getFullYear(), currentDate.getMonth(), tomorrowDay);
		
		    var campaignPromotionPlan = dwcampaign.PromotionMgr.getActivePromotionsForCampaign(campaign, currentDate, tomorrow);
		    var status = promotionCollection.addAll(campaignPromotionPlan.promotions);
		    var discountPlanCampaign = dwcampaign.PromotionMgr.getDiscounts(Basket, campaignPromotionPlan);
		    dwcampaign.PromotionMgr.applyDiscounts(discountPlanCampaign);
		} catch(e) {
			dwsystem.Logger.info('Error while applying promotion: {0}', e);
		}
		
	}
}

/**
 * @description Method responsible for basket price calculation and updates
 * @function calculateBasket
 * @memberof RefillCheckout.prototype
 */
RefillCheckout.prototype.calculateBasket = function (currentDate) {

		SORLogger.info("Start calculateBasket: currentDate ***: {0}", currentDate);
		Transaction.begin();
	    var basket = this.lineItemCtnr;

		//Custom Method
		this.applyPromotions(this.lineItemCtnr, currentDate);
		
	    calculateProductPrices(basket);
	    var giftCertificates = basket.getGiftCertificateLineItems().iterator();
	    while (giftCertificates.hasNext()) {
	        var giftCertificate = giftCertificates.next();
	        giftCertificate.setPriceValue(giftCertificate.basePrice.valueOrNull);
	    }
	    
	    if (this.type !== "cancel") {
	        ShippingMgr.applyShippingCost(basket);
	        PromotionMgr.applyDiscounts(basket);
	    }
	 	var OREnableCouponCode = dwsystem.Site.current.getCustomPreferenceValue("OsfSorEnableCouponCode");
	    var ORCouponCode = dwsystem.Site.current.getCustomPreferenceValue("OsfSorCouponCode");
	    
	    if(OREnableCouponCode && !empty(ORCouponCode)){
			SORLogger.info("SOR Job: Coupon applied ***: {0}", ORCouponCode);
	    	basket.createCouponLineItem(ORCouponCode, true);
	    }
		PromotionMgr.applyDiscounts(basket);
	    calculateProductPrices(basket);
	     // avalara code starts 
	    var avaconfig = JSON.parse(dwsystem.Site.getCurrent().getCustomPreferenceValue('ATSettings'));
	     if (avaconfig.taxCalculation) 
	     {
	     	dwsystem.Logger.info('SOR Job: Calling AvaTax ');
	     	session.custom.NoCall = false;
	     	   //require('int_avatax/cartridge/scripts/app').getController('Avatax').CalculateTaxes(basket);
		 	require('int_avatax_sfra/cartridge/scripts/hooks/avatax/avataxhooks').calculateTax(basket);

	     }else{
	     	calculateTax(basket);
	     }
	   
	    basket.updateTotals();
	    Transaction.commit();

	    SORLogger.info("End calculateBasket ***");
};

/**
 * @description Method responsible for order creation from basket
 * @function createOrder
 * @memberof RefillCheckout.prototype
 */
RefillCheckout.prototype.createOrder = function () {

		SORLogger.info("SOR Job: Create Order ***");
		Transaction.begin();
	    var orderNo = OrderMgr.createOrderNo();
		SORLogger.info("SOR Job: OrderNo ***: {0}", orderNo);
	    var basket = this.lineItemCtnr;
	    if(!empty(basket)){
			SORLogger.info("SOR Job: Basket Product ID ***: {0} Total Gross: {1}", basket.getProductLineItems()[0].getProductID(), basket.totalGrossPrice);
		}
	    var order = OrderMgr.createOrder(basket, orderNo);
	    SORLogger.info("Created Order: {0}", orderNo);

	    order.custom.IsSorOrder = true;
	    if (this.type === "cancel") {
	        order.custom.SorOrderRefillListID = "cancel_fee";
	    } else {
	        order.custom.SorOrderRefillListID = this.customerRefillOrder.ID;
			SORLogger.info("SOR Job: SorOrderRefillListID ***: {0}", this.customerRefillOrder.ID);
	    }
	    order.setCustomer(this.customer);
	    order.setCustomerEmail(this.customer.profile.email);
	    order.setCustomerName(this.customer.profile.getFirstName() + " " + this.customer.profile.getLastName());
	    this.lineItemCtnr = order;
		SORLogger.info("End CreateOrder ****");
	    Transaction.commit();

};

/**
 * Method responsible handling order payment
 * @function handleOrderPayment
 * @memberof RefillCheckout.prototype
 */
RefillCheckout.prototype.handleOrderPayment = function () {
	var scheduledCustomer = this.customer;

		SORLogger.info("Start handleOrderPayment ***");
		Transaction.begin();
	    var order = this.lineItemCtnr;
	    var subscriptionToken = null;
	    var customerPaymentInstrument = this.customer.profile.wallet.createPaymentInstrument(PaymentInstrument.METHOD_CREDIT_CARD);
	    var paymentProcessorID = PaymentMgr.getPaymentMethod(customerPaymentInstrument.paymentMethod).getPaymentProcessor().getID();
	    this.customer.profile.wallet.removePaymentInstrument(customerPaymentInstrument);
	    Transaction.commit();
	    if (!paymentProcessorID) {
	        throw new Error("paymentProcessorID is undefined");
	    }
	    if (this.customer.profile.custom.OsfSorSubscriptionToken) {
	        subscriptionToken = this.customer.profile.custom.OsfSorSubscriptionToken;
	    }
	    var amount = order.getTotalGrossPrice();
	    if (paymentIntegration[paymentProcessorID]) {
	        Transaction.begin();
	        var paymentInstrument = order.createPaymentInstrument(PaymentInstrument.METHOD_CREDIT_CARD, amount);
	        var paymentMethod = PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod());
	        var paymentProcessor = paymentMethod.getPaymentProcessor();
			var paymentTransaction = paymentInstrument.getPaymentTransaction();
			paymentTransaction.setPaymentProcessor(paymentProcessor);
	        var paymentResponse;
	        Transaction.commit();
	        if (amount > 0) {
	            SORLogger.info("Start payment process. Type: {0}, Amount: {1}, paymentProcessorID: {2}", this.type, amount, paymentProcessorID);
	            if (!empty(subscriptionToken)) {
	                if (this.type === "cancel") {
	                    Transaction.wrap(function () {
	                        paymentResponse = paymentIntegration[paymentProcessorID].chargeFee({
	                            OrderList: this.customerRefillOrder,
	                            CancelationFee: this.cancelationFee,
	                            Order: order
	                        });
	                    });
	                } else {
	                	Transaction.wrap(function () {
	                        paymentResponse = paymentIntegration[paymentProcessorID].authorize(order, scheduledCustomer, paymentInstrument);
	                    });
	                }
	            }

	            if (!paymentResponse || paymentResponse.error) {
	               //RefillEmails.sendPaymentFail(this.customerRefillOrder, this.customer);
	                Transaction.wrap(function () {
	                    OrderMgr.failOrder(order);
	                });
	                throw new Error("Authorization error");
	            } else {
	                Transaction.begin();
	                SORLogger.info("Success payment");
	                paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
	                
	                // Need to cross check this, seems not required
	                /*paymentIntegration[paymentProcessorID].updatePaymentInstrument({
	                    paymentInstrument: paymentInstrument,
	                    response: paymentResponse,
	                    order: order
	                });*/
	                
	                order.setExportStatus(Order.EXPORT_STATUS_READY);
	                order.setPaymentStatus(Order.PAYMENT_STATUS_PAID);
	                Transaction.commit();
	            }
	        } else {
	            Transaction.begin();
	            SORLogger.info("Payment is not needed");
	            order.setExportStatus(Order.EXPORT_STATUS_READY);
	            order.setPaymentStatus(Order.PAYMENT_STATUS_PAID);
	            Transaction.commit();
	        }
	    } else {
	        Transaction.wrap(function () {
	            OrderMgr.failOrder(order);
	        });
	        throw new Error("Payment Integration is not found");
	    }
	SORLogger.info("End handleOrderPayment ***");
};

/**
 * @description Method responsible for placing the Smart Order Refill Subscription Order
 * @function placeOrder
 * @memberof RefillCheckout.prototype
 * @returns {boolean} success status
 */
RefillCheckout.prototype.placeOrder = function (currentDate) {
    this.initSessionCustomer();
    this.initBasket();
    this.populateBasket();
    this.calculateBasket(currentDate);
    this.createOrder();
    this.handleOrderPayment();
 	var Signifyd = require('*/cartridge/scripts/service/signifyd');

    var status = false;
    var order = this.lineItemCtnr;
    
    	Transaction.wrap(function () {
            status = OrderMgr.placeOrder(order);
        });

        if (status && status.error) {
            Transaction.wrap(function () {
                OrderMgr.failOrder(order);
            });
            throw new Error("OrderMgr.placeOrder - " + status.message);
        }

        Transaction.wrap(function () {
            order.confirmationStatus = Order.CONFIRMATION_STATUS_CONFIRMED;
        });

        /* var note = this.customerRefillOrder.note;
           var emailTemplate = "mail/orderconfirmation";
           if (this.type === "cancel" && this.customerRefillOrder.note) {
             Transaction.wrap(function () {
                order.addNote("Commitment Payment", note);
             });
             emailTemplate = "mail/sorCancel";
           }
           RefillEmails.sendConfirmation(this.customerRefillOrder, this.customer, order, emailTemplate);
        */
		//Create Payload Service Data
		if(!empty(dwsystem.Site.getCurrent().getCustomPreferenceValue('mParticleEnabled')) && dwsystem.Site.getCurrent().getCustomPreferenceValue('mParticleEnabled')){
			var requestData = {};
			var mParticleUtil = require('int_mParticle/cartridge/scripts/mParticleUtils.js');
			requestData = mParticleUtil.createPurchaseDataJsonForCreateOrder(order);
			var result = mParticleUtil.callmParticleService(requestData);
			SORLogger.info("purchase event service request data: " + JSON.stringify(requestData));
			SORLogger.info("purchase event service call: " + result.status);
		}
	   var klaviyoAutoDeliveryTxnlEnabled = dwsystem.Site.getCurrent().getCustomPreferenceValue('klaviyo_autodelivery_transactional_enabled');
		if (klaviyoAutoDeliveryTxnlEnabled) {
			require('*/cartridge/scripts/utils/klaviyo/emailUtils').sendOrderEmail(order, 'Auto Delivery Order Confirmation');
		}
               
         //Signifyd API Call with suto delivery status set to true
         Signifyd.Call(order,true);
         SORLogger.info('SOR Job: Sent Order Number {0} to SignifyD', order.orderNo);
                
        
        
        SORLogger.info("Sent confirmation email");
        return status;
};

module.exports = RefillCheckout;
