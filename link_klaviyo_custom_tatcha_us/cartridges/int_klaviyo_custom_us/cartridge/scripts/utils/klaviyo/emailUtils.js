'use strict';


var Site = require('dw/system/Site');
var Logger = require('dw/system/Logger');
var URLUtils = require('dw/web/URLUtils');
var productMgr = require('dw/catalog/ProductMgr');
var Resource = require('dw/web/Resource');
var imageSize = Site.getCurrent().getCustomPreferenceValue('klaviyo_image_size') || null;

/**
 * Sends an order to Klaviyo with the order email type.
 *
 * @param order
 * @param mailType
 * @returns
 */
function sendOrderEmail(order, mailType) {
    var logger = Logger.getLogger('Klaviyo', 'emailUtils - sendOrderEmail()');
    try {
        var isFutureOrder = (mailType == 'Auto Delivery Order Confirmation');
        var orderPayload = prepareOrderPayload(order, isFutureOrder, mailType);
        require('*/cartridge/scripts/utils/klaviyo/klaviyoUtils').sendEmail(order.getCustomerEmail(), orderPayload, mailType);
    } catch (e) {
        logger.error('sendOrderEmail() failed for order: ' + order.getOrderNo() + ', mailType: ' + mailType + '. Error: ' + e.message);
    }
}

/**
 * Prepares the order in JSON format for email send.
 * @param order
 * @param isFutureOrder
 * @param mailType
 * @returns
 */
 function prepareOrderPayload(order, isFutureOrder, mailType) {
    var orderDetails = {};
    var isReplenishmentOrder = !!((mailType != null && mailType == 'Auto Delivery Order Confirmation'));

    // Billing Address
    var orderBillingAddressFirstName = (order.billingAddress.firstName) ? order.billingAddress.firstName : '';
    var orderBillingAddressLastName = (order.billingAddress.lastName) ? order.billingAddress.lastName : '';
    var orderBillingAddressAddress1 = (order.billingAddress.address1) ? order.billingAddress.address1 : '';
    var orderBillingAddressAddress2 = (order.billingAddress.address2) ? order.billingAddress.address2 : '';
    var orderBillingAddressCity = (order.billingAddress.city) ? order.billingAddress.city : '';
    // var orderBillingAddressPostalCode = (order.billingAddress.postalCode) ? order.billingAddress.postalCode : '';
    var orderBillingAddressStateCode = (order.billingAddress.stateCode) ? order.billingAddress.stateCode : '';
    var orderBillingAddressCountryCode = (order.billingAddress.countryCode.value) ? order.billingAddress.countryCode.value : '';
    var orderBillingAddressPhone = (order.billingAddress.phone) ? order.billingAddress.phone : '';

    // Shipping address
    var orderShippingAddressFirstName = '';
    var orderShippingAddressLastName = '';
    var orderShippingAddressAddress1 = '';
    var orderShippingAddressAddress2 = '';
    var orderShippingAddressCity = '';
    var orderShippingAddressPostalCode = '';
    var orderShippingAddressStateCode = '';
    var orderShippingAddressCountryCode = '';
    var orderShippingAddressPhone = '';
    var productLineItems = '';
    var paymentInstruments = '';

    if (order.shipments.length > 0) {
        // Shipping Address
        orderShippingAddressFirstName = (order.shipments[0].shippingAddress.firstName) ? order.shipments[0].shippingAddress.firstName : '';
        orderShippingAddressLastName = (order.shipments[0].shippingAddress.lastName) ? order.shipments[0].shippingAddress.lastName : '';
        orderShippingAddressAddress1 = (order.shipments[0].shippingAddress.address1) ? order.shipments[0].shippingAddress.address1 : '';
        orderShippingAddressAddress2 = (order.shipments[0].shippingAddress.address2) ? order.shipments[0].shippingAddress.address2 : '';
        orderShippingAddressCity = (order.shipments[0].shippingAddress.city) ? order.shipments[0].shippingAddress.city : '';
        orderShippingAddressPostalCode = (order.shipments[0].shippingAddress.postalCode) ? order.shipments[0].shippingAddress.postalCode : '';
        orderShippingAddressStateCode = (order.shipments[0].shippingAddress.stateCode) ? order.shipments[0].shippingAddress.stateCode : '';
        orderShippingAddressCountryCode = (order.shipments[0].shippingAddress.countryCode.value) ? order.shipments[0].shippingAddress.countryCode.value : '';
        orderShippingAddressPhone = (order.shipments[0].shippingAddress.phone) ? order.shipments[0].shippingAddress.phone : '';

        var keywords = "";
		if(orderShippingAddressCountryCode != 'US') {
			keywords = "INTERNATIONAL";
		} else {
			var list = Site.getCurrent().getCustomPreferenceValue('USTerritories');
			if(!empty(list) && list.indexOf(orderShippingAddressStateCode) >= 0) {
				keywords = "US-TERRITORY-PO";
			}
		}

        // var lineItems = order.getAllProductLineItems();
        // var iterator_lines = lineItems.iterator();

        // Product Details
        productLineItems = order.shipments[0].productLineItems;
        var productLineItem = {};
        var productLineItemsArray = [];
        var items = [];
        var itemCount = 0;
        var itemPrimaryCategories = [];
        var itemCategories = [];

        if(dw.system.Site.current.getCustomPreferenceValue('LincEnabled')) {
			var lincItemVariationValues = [];
			var lincItemCategories = [];
			var lincLineItems = [];
		}

        for (var j in productLineItems) {
            productLineItem = productLineItems[j];

            //Resetting keywords value, if it has already a value 'FINAL-SALE' (Sample or GiftWrap)
			if(keywords === 'FINAL-SALE') {
				keywords = '';	
			}
            var prdUrl = '';
            var prdAbsUrl = '';
            var replenishment = false;
            var replenishment_interval = 0;
            var priceString = '';
            // var priceValue = 0.0;
            // var hasOsfSmartOrderRefill = false;
            var hasOsfSmartOrderRefill = productLineItem.custom.hasSmartOrderRefill;
		    if(!empty(productLineItem.custom.hasSmartOrderRefill) && productLineItem.custom.hasSmartOrderRefill && !isReplenishmentOrder){
		    	if (productLineItem.custom.SorMonthInterval > 0 || productLineItem.custom.SorWeekInterval > 0) {
		    		replenishment = true;
		    		if(productLineItem.custom.SorMonthInterval>1){
						replenishment_interval = 'Auto-Delivery ('+productLineItem.custom.SorMonthInterval+' months)';
					}else{
						replenishment_interval = 'Auto-Delivery ('+productLineItem.custom.SorMonthInterval+' month)';
					}
		    	}
		    }
            prdUrl = URLUtils.https('Product-Show', 'pid', productLineItem.productID).toString();
            var secondaryName = '';

            // Get the product secondary nam
            var lineItemProduct = productLineItem.product;
            var productDetail = productMgr.getProduct(lineItemProduct.ID);

            if(productDetail.custom.secondaryName){
		    	secondaryName = productDetail.custom.secondaryName;
		    }

            if (!productLineItem.bonusProductLineItem) {
                priceString = dw.util.StringUtils.formatMoney(dw.value.Money(productLineItem.price.value, session.getCurrency().getCurrencyCode()));
            } else {
                priceString = dw.util.StringUtils.formatMoney(dw.value.Money(0, session.getCurrency().getCurrencyCode()));
            }

            // Variation values
            var variationValues = '';
            lincItemVariationValues = [];
            if (productDetail.isVariant()) {
                var variationAttrs = productDetail.variationModel.getProductVariationAttributes();
                for (var i = 0; i < variationAttrs.length; i++) {
                    var VA = variationAttrs[i];
                    var selectedValue = productDetail.variationModel.getSelectedValue(VA);
                    if (selectedValue) {
                        variationValues += selectedValue.displayValue;
                        if (i < (variationAttrs.length - 1)) {
                            variationValues += ' | ';
                        }
                        if(dw.system.Site.current.getCustomPreferenceValue('LincEnabled')) {
							lincItemVariationValues.push({
								"name": VA.displayName,
								"value": selectedValue.displayValue
							});
						}
                    }
                }
            }

            items.push(productLineItem.productID);

            itemCount += productLineItem.quantity.value;
            lincItemCategories = [];
            if(productDetail.getPrimaryCategory()) {
				var primaryCategory = productDetail.getPrimaryCategory();
				itemPrimaryCategories.push(primaryCategory.displayName);
				if(dw.system.Site.current.getCustomPreferenceValue('LincEnabled')) {
					lincItemCategories.push({
						"name": primaryCategory.displayName,
						"id": primaryCategory.ID
					});
				}
			}
            var allCategories;
            if (productDetail.variant) {
                if(productDetail.masterProduct.getPrimaryCategory() && productDetail.masterProduct.getPrimaryCategory().displayName) {
                    itemPrimaryCategories.push(productDetail.masterProduct.getPrimaryCategory().displayName);
                }
                allCategories = productDetail.masterProduct.getAllCategories();
            } else {
                    if(productDetail.getPrimaryCategory() &&  productDetail.getPrimaryCategory().displayName){
                        itemPrimaryCategories.push(productDetail.getPrimaryCategory().displayName);
                    }
                allCategories = productDetail.getAllCategories();
            }

            var isSample = false;
            if (!empty(allCategories) && allCategories.length > 0) {
                var category = '';
                for (var categoryCount = 0; categoryCount < allCategories.length; categoryCount++) {
                    category = allCategories[categoryCount];
                    itemCategories.push(category.displayName);
                    if (category.ID == 'samples') {
                        isSample = true;
                        lincItemVariationValues.push({
							"name": "Size",
							"value": "Sample"
						});
                    }
                    if(category.ID == 'GWP-HIDDEN') {
						isSample = true;
					}
                }
            }

            //for replenishment Order - Auto Delivery
			if(isReplenishmentOrder){
				replenishment = true;
				if(productLineItem.custom.SorMonthInterval>1){
					replenishment_interval = 'Auto-Delivery ('+productLineItem.custom.SorMonthInterval+' months)';
				}else{
					replenishment_interval = 'Auto-Delivery ('+productLineItem.custom.SorMonthInterval+' month)';
				}
			}

            productLineItemsArray.push({
                'ID'             		 : productLineItem.productID,
                'PRODUCT_NAME'           : productLineItem.productName,
                'PRODUCT_SECONDARY_NAME' : secondaryName,
                'QUANTITY'               : productLineItem.quantity.value,
                'PRICE'                  : priceString,
                'DISCOUNT'               : productLineItem.adjustedPrice.value,
                'PRODUCT_URL'            : prdUrl,
                'REPLENISHMENT'          : replenishment,
				'REPLENISHMENT_INTERVAL' : replenishment_interval,
                'PRODUCT_VARIANT'        : variationValues,
                'PRICE_VALUE'            : productLineItem.price.value,
                'PRODUCT_IMG_URL'        : imageSize ? productDetail.getImage(imageSize).getAbsURL().toString() : null,
                'IS_SAMPLE'              : isSample
            });

            if(dw.system.Site.current.getCustomPreferenceValue('LincEnabled')) {
				prdAbsUrl =  require('dw/web/URLUtils').abs('Product-Show', 'pid', productLineItem.productID).toString();
				if(isSample || 
						productLineItem.productID == dw.system.Site.getCurrent().getCustomPreferenceValue('GiftWrapId')) {
					keywords = "FINAL-SALE";					  
				}
				
				var itemprice = 0;
				if(productLineItem.price.value && productLineItem.quantity.value) {
					itemprice = productLineItem.price.value/productLineItem.quantity.value;
				}

				var lincLineItem = {
						"product_id": productLineItem.productID,
						"variant_id": productLineItem.productID,
						"upc": productLineItem.productID,
						"product_name": productLineItem.productName,
						"description": productDetail.custom.benefitsSection1,
						"quantity": productLineItem.quantity.value,
						"image": productDetail.getImage("large").getAbsURL().toString(),
						"link": prdAbsUrl,
						"price": itemprice,
						"tax": productLineItem.adjustedTax.value,
						"discount": productLineItem.adjustedPrice.value,
						"categories": lincItemCategories,
						"properties": lincItemVariationValues
					}; 
				if(!empty(keywords)) {
					lincLineItem['keywords'] = keywords;
				}
				
				lincLineItems.push(lincLineItem);
			}
        }


        // Append gift card
        var giftCertificateLineItems = order.giftCertificateLineItems;
        var giftLineItem = {};
        var giftLineItemsArray = [];
        if (giftCertificateLineItems && giftCertificateLineItems.length > 0) {
            orderDetails.GIFT_ITEM_PRESENT = true;
            var giftCardId = dw.system.Site.getCurrent().getCustomPreferenceValue('EgiftProduct-ID');
            var giftCardProductDetail = productMgr.getProduct(giftCardId);
            var giftCardImage = '';
            if (!empty(giftCardProductDetail)) {
                giftCardImage = imageSize ? giftCardProductDetail.getImage(imageSize).getAbsURL().toString() : null;
            }
            for (var l in giftCertificateLineItems) {
                giftLineItem = giftCertificateLineItems[l];

                giftLineItemsArray.push({
                    'RECIPIENT_NAME'  : giftLineItem.recipientName,
                    'RECIPIENT_EMAIL' : giftLineItem.recipientEmail,
                    'SENDER_NAME'     : giftLineItem.senderName,
                    'SENDER_EMAIL'    : order.getCustomerEmail(),
                    'PRICE'           : dw.util.StringUtils.formatMoney(dw.value.Money(giftLineItem.price.value, session.getCurrency().getCurrencyCode())),
                    'MESSAGE'         : giftLineItem.message,
                    'IMAGE'           : !empty(giftLineItem.custom.giftCertificateImage) ? giftLineItem.custom.giftCertificateImage : giftCardImage
                });

                items.push(Site.getCurrent().getCustomPreferenceValue('EgiftProduct-ID'));
                itemCount += 1;
                itemPrimaryCategories.push('Gift cards');
                itemCategories.push('Gift cards');
            }
        } else {
            orderDetails['GIFT_ITEM_PRESENT'] = false;
            giftLineItemsArray.push({
                'RECIPIENT_NAME'  : '',
                'RECIPIENT_EMAIL' : '',
                'SENDER_NAME'     : '',
                'SENDER_EMAIL'    : '',
                PRICE             : ''
            });
        }

        // Get the coupon attached to the order
        var discountCoupon = '';
        var promotionID = '';
        var shippingLineItems = order.shipments[0].shippingLineItems;
        // var shippingLineItem = {};
        // var shippingItemsArray = [];
        if (shippingLineItems && shippingLineItems.length > 0) {
            if (shippingLineItems[0].lineItemCtnr) {
                var couponLineItems = shippingLineItems[0].lineItemCtnr.couponLineItems;
                if (couponLineItems && couponLineItems.length > 0) {
                    //var couponLineItem = {};
                    for (var q in couponLineItems) {
                        if (couponLineItems[q].statusCode == 'APPLIED') {
                            discountCoupon = couponLineItems[q].couponCode;
                            if (!empty(couponLineItems[q].promotion)) {
                                var promotion = couponLineItems[q].promotion;
                                promotionID = promotion.ID;
                            }
                            break;
                        }
                    }
                }
            }
        } else {
            discountCoupon = '';
        }


        // Payment Details
        paymentInstruments = order.paymentInstruments;
        var ccLastFourDigits = '';
        var creditCardType = '';
        var paymentInstrumentItem = {};
        // var paymentInstrumentsArray = [];
        var paymentMethod = '';
        var maskedGiftCertificateCode = '';
        for (var k in paymentInstruments) {
            paymentInstrumentItem = paymentInstruments[k];
            if (paymentInstrumentItem.creditCardNumberLastDigits) {
                ccLastFourDigits = paymentInstrumentItem.maskedCreditCardNumber;
                creditCardType = (paymentInstrumentItem.creditCardType) ? paymentInstrumentItem.creditCardType : '';
            }
            if (paymentInstrumentItem.maskedGiftCertificateCode) {
                maskedGiftCertificateCode = paymentInstrumentItem.maskedGiftCertificateCode;
            }
            paymentMethod = paymentInstrumentItem.paymentMethod;
			if(paymentMethod=='CREDIT_CARD') {
				paymentMethod = 'Credit Card';
			}
			if(paymentMethod=='GIFT_CERTIFICATE') {
				paymentMethod = 'Gift Card';
			}
        }
        orderDetails['PAYMENT_METHOD'] = paymentMethod;


        // Order Total
        var merchTotalExclOrderDiscounts = order.getAdjustedMerchandizeTotalPrice(false);
        var merchTotalInclOrderDiscounts = order.getAdjustedMerchandizeTotalPrice(true);


        // Merchandise total
        // var merchandiseTotal = merchTotalExclOrderDiscounts.add(order.giftCertificateTotalPrice);
        // var merchandiseTotalString = dw.util.StringUtils.formatMoney(dw.value.Money(merchandiseTotal.value, session.getCurrency().getCurrencyCode()));

        // discounts
        var orderDiscount = merchTotalExclOrderDiscounts.subtract(merchTotalInclOrderDiscounts);
        var orderDiscountString = dw.util.StringUtils.formatMoney(dw.value.Money(orderDiscount.value, session.getCurrency().getCurrencyCode()));

        // Sub Total
        var subTotal = merchTotalInclOrderDiscounts.add(order.giftCertificateTotalPrice);
        var subTotalString = dw.util.StringUtils.formatMoney(dw.value.Money(subTotal.value, session.getCurrency().getCurrencyCode()));

        // Shipping
        var shippingExclDiscounts = order.shippingTotalPrice;
        var shippingInclDiscounts = order.getAdjustedShippingTotalPrice();
        var shippingDiscount = shippingExclDiscounts.subtract(shippingInclDiscounts);
        var shippingTotalCost = shippingExclDiscounts.subtract(shippingDiscount);
        var shippingTotalCostString = dw.util.StringUtils.formatMoney(dw.value.Money(shippingTotalCost.value, session.getCurrency().getCurrencyCode()));

        // Tax
        var totalTax = 0.00;
        if (order.totalTax.available) {
            totalTax = order.totalTax.value;
        } else if (order.giftCertificateTotalPrice.available) {
            totalTax = order.merchandizeTotalTax.value;
        }
        var totalTaxString = dw.util.StringUtils.formatMoney(dw.value.Money(totalTax, session.getCurrency().getCurrencyCode()));


        // Order Total
        var orderTotal = '';
        if (order.totalNetPrice.available) {
            orderTotal = order.totalNetPrice.value + totalTax;
        } else {
            orderTotal = order.getAdjustedMerchandizeTotalPrice(true) + (order.giftCertificateTotalPrice) + (order.shippingTotalPrice) + (totalTax);
        }
        var orderTotalString = dw.util.StringUtils.formatMoney(dw.value.Money(orderTotal, session.getCurrency().getCurrencyCode()));

        orderDetails['ORDER_TOTAL'] = orderTotalString;
        orderDetails.TAX = totalTaxString;
        orderDetails.SUBTOTAL = subTotalString;
        orderDetails['SUBTOTAL_VALUE'] = subTotal.value;
        orderDetails['SHIPPING_COST'] = shippingTotalCostString;
        if (orderDiscountString) {
            orderDetails.DISCOUNT = orderDiscountString;
        } else {
            orderDetails.DISCOUNT = '';
        }
    }

    // Add gift message if exists
    var giftMsg = (order.shipments[0].giftMessage) ? order.shipments[0].giftMessage : '';
    orderDetails.GIFT_MESSAGE = giftMsg;

    // Order Details
    var orderDate = new Date(order.creationDate);
	//Consider the timezone
	var cal = new dw.util.Calendar(orderDate);
	cal.setTimeZone('PST');
	var orderCreationDate = dw.util.StringUtils.formatCalendar(cal, 'yyyy-MM-dd' );	
    orderDetails.event = 'Placed Order';
    orderDetails['ORDER_NUMBER'] = order.orderNo;
    orderDetails['ORDER_DATE'] = orderCreationDate;
    orderDetails['CUSTOMER_NUMBER'] = (order.customerNo) ? order.customerNo : '';
    orderDetails['CUSTOMER_FIRST_NAME'] = order.customer.profile ? order.customer.profile.firstName : (order.billingAddress.firstName ? order.billingAddress.firstName : order.customerName);
	orderDetails['CUSTOMER_LAST_NAME'] = order.customer.profile ? order.customer.profile.lastName : (order.billingAddress.lastName ? order.billingAddress.lastName : order.customerName);
   // orderDetails['Shipping Method'] = (order.shipments[0].shippingMethod && order.shipments[0].shippingMethod.displayName) ? order.shipments[0].shippingMethod.displayName : '';

   if(order.shipments[0].shippingMethod){
	var shipmentCarrier=order.shipments[0].shippingMethod.custom.shippingMethodCarrier;
		/*if(shipmentCarrier.value!=null){
			orderDetails['SHIPPING_METHOD'] = (order.shipments[0].shippingMethod && order.shipments[0].shippingMethod.displayName)? shipmentCarrier +' '+order.shipments[0].shippingMethod.displayName:'';
		}
		else{
			orderDetails['SHIPPING_METHOD'] = (order.shipments[0].shippingMethod && order.shipments[0].shippingMethod.displayName)? order.shipments[0].shippingMethod.displayName:'';	
			}*/
		orderDetails['SHIPPING_METHOD'] = (order.shipments[0].shippingMethod && order.shipments[0].shippingMethod.displayName)? order.shipments[0].shippingMethod.displayName:'';
	}else{
	orderDetails['SHIPPING_METHOD'] = (order.shipments[0].shippingMethod && order.shipments[0].shippingMethod.displayName)? order.shipments[0].shippingMethod.displayName:'';	
	}
	
	if(order.productLineItems.length===0 && order.giftCertificateLineItems.length > 0){
		orderDetails['SHIPPING_METHOD'] ='Gift Card Shipment';
	}

    orderDetails['CARD_LAST_FOUR_DIGITS'] = ccLastFourDigits;
    orderDetails['CARD_TYPE'] = creditCardType;
    orderDetails['GIFT_CARD_LAST_FOUR'] = maskedGiftCertificateCode;
    orderDetails['PROMO_CODE'] = discountCoupon;
    var promoType = '';
    var position = discountCoupon.search('HBD');
    if(position == 0) {
    	promoType = 'HBD';
    }
    position = discountCoupon.search('RDK');
    if(position == 0) {
    	promoType = 'RDK';
    }
	orderDetails['PROMO_TYPE'] = promoType;


    orderDetails['REPLENISHMENT_ORDER'] = isReplenishmentOrder;

    // Billing Address
    var billingaddress = [];
    billingaddress.push({
        'FIRST_NAME'   : orderBillingAddressFirstName,
        'LAST_NAME'    : orderBillingAddressLastName,
        ADDRESS1       : orderBillingAddressAddress1,
        ADDRESS2       : orderBillingAddressAddress2,
        CITY           : orderBillingAddressCity,
        'POSTAL_CODE'  : orderShippingAddressPostalCode,
        'STATE_CODE'   : orderBillingAddressStateCode,
        'COUNTRY_CODE' : orderBillingAddressCountryCode,
        PHONE          : orderBillingAddressPhone
    });

    // Shipping Address
    var shippingaddress = [];
    shippingaddress.push({
        'FIRST_NAME'   : orderShippingAddressFirstName,
        'LAST_NAME'    : orderShippingAddressLastName,
        ADDRESS1       : orderShippingAddressAddress1,
        ADDRESS2       : orderShippingAddressAddress2,
        CITY           : orderShippingAddressCity,
        'POSTAL_CODE'  : orderShippingAddressPostalCode,
        'STATE_CODE'   : orderShippingAddressStateCode,
        'COUNTRY_CODE' : orderShippingAddressCountryCode,
        PHONE          : orderShippingAddressPhone
    });

    // Add product / billing / shipping

    orderDetails.PRODUCT = productLineItemsArray;
    orderDetails['GIFTITEMS'] = giftLineItemsArray;
    orderDetails['BILLING_ADDRESS'] = billingaddress;
    orderDetails['SHIPPING_ADDRESS'] = shippingaddress;
    orderDetails['MANAGE_ORDER_URL'] = URLUtils.https('Account-Show').toString();
    orderDetails.ITEMS = items;
    orderDetails['ITEM_COUNT'] = itemCount;
    orderDetails['ITEM_PRIMARY_CATEGORIES'] = itemPrimaryCategories;
    orderDetails['ITEM_CATEGORIES'] = require('*/cartridge/scripts/utils/klaviyo/klaviyoUtils').removeDuplicates(itemCategories);
    orderDetails.$value = orderTotal;
    orderDetails.$event_id = mailType + '-' + order.orderNo;
    orderDetails['TRACKING_NUMBER'] = (order.shipments[0].trackingNumber) ? order.shipments[0].trackingNumber : '';
    var shipment = order.shipments[0];
	var trackingUrl = '';
	
	if(!empty(orderDetails['TRACKING_NUMBER']) && !empty(shipment.shippingMethod)) {
		if(shipment.shippingMethod.custom.shippingMethodCarrier=='USPS') {
			trackingUrl = Resource.msgf('tracking.USPS','order',null, shipment.trackingNumber);
		} else if(shipment.shippingMethod.custom.shippingMethodCarrier=='UPS') {
			trackingUrl = Resource.msgf('tracking.UPS','order',null, shipment.trackingNumber);
		} else {
			//trackingUrl = Resource.msgf('tracking.Fedex','order',null,'english',shipment.shippingAddress.countryCode.value, shipment.trackingNumber);
			trackingUrl = Resource.msgf('tracking.UPS','order',null, shipment.trackingNumber);
		}
	}

    // Added an extra check
	if(Site.getCurrent().getCustomPreferenceValue('enableUSPSCheck')) {
		if(!empty(shipment.trackingNumber)){
			var isUSPS = require('app_storefront_core/cartridge/scripts/util/Tatcha').isUSPSTrackNumber(shipment.trackingNumber);
			if(isUSPS) {
				trackingUrl = Resource.msgf('tracking.USPS','order',null, shipment.trackingNumber);
			}
		}
	}
	
	orderDetails['TRACKING_URL'] = trackingUrl;

    //PrepareLinc Payload
	if(dw.system.Site.current.getCustomPreferenceValue('LincEnabled')) {
		var lincPayload = {
			"shop_id": dw.system.Site.getCurrent().getCustomPreferenceValue('LincShopID'),
			"order_id": orderDetails['ORDER_NUMBER'],
			"user":{
				"user_id": orderDetails['CUSTOMER_NUMBER'],
				"first_name": orderDetails['CUSTOMER_FIRST_NAME'],
				"last_name": orderDetails['CUSTOMER_LAST_NAME'],
				"email": order.getCustomer().profile ? order.getCustomer().profile.email: order.customerEmail,
			},
			"billing_address": {
				'first_name': orderBillingAddressFirstName,
				'last_name':orderBillingAddressLastName,
				'address1': orderBillingAddressAddress1,
				'address2': orderBillingAddressAddress2,
				'city': orderBillingAddressCity,
				'postal_code': orderShippingAddressPostalCode,
				'province': orderBillingAddressStateCode,
				'country': orderBillingAddressCountryCode,
				'phone': orderBillingAddressPhone
			},
			"shipping_address": {
				'first_name': orderShippingAddressFirstName,
				'last_name':orderShippingAddressLastName,
				'address1': orderShippingAddressAddress1,
				'address2': orderShippingAddressAddress2,
				'city': orderShippingAddressCity,
				'postal_code': orderShippingAddressPostalCode,
				'province': orderShippingAddressStateCode,
				'country': orderShippingAddressCountryCode,
				'phone': orderShippingAddressPhone
			},
			"locale": "en_US",
			"purchase_date": new Date().toISOString(),
			"subtotal_price": subTotal.value,
			"total_shipping": shippingTotalCost.value,
			"total_tax": totalTax,
			"total_discounts": orderDiscount.value,
			"total_price": orderTotal,
			"currency": session.getCurrency().getCurrencyCode(),
			"extra":[
				{
					"name":"status",
					"value": order.confirmationStatus.displayValue
				},
				{
					"name":"payment_status",
					"value": order.paymentStatus.displayValue
				}
			],
			"line_items": lincLineItems
		};
		if(mailType != null && (mailType == 'orderConfirmation' || mailType == 'Auto Delivery Order Confirmation') && lincLineItems.length) {
			orderDetails['LINC_PAYLOAD'] = JSON.stringify(lincPayload);
		}
	}
	
	
	if(dw.system.Site.current.getCustomPreferenceValue('enablePreferredLocation')) {
		require('app_storefront_core/cartridge/scripts/util/PreferredLocationUtil').setPreferredLocation(order,orderDetails);
	}
	

    return orderDetails;
}

/**
 * Sends a thank you email.
 * 
 * @param giftCertificate
 * @param message
 * @returns
 */
 function sendThankyouEmail(giftCertificate, message) {
	var logger = Logger.getLogger('Klaviyo', 'EmailUtils - sendThankyouEmail()');
	try {
		var giftCardDetails = prepareThankyouEmailPayload(giftCertificate, message);
		require('*/cartridge/scripts/utils/klaviyo/klaviyoUtils').sendEmail(giftCertificate.custom.giftCertificateSenderEmail, giftCardDetails, 'Gift Card Thank You Note');
		
	} catch (e) {
		logger.error('sendGiftCertificateEmail() failed for gc ' + giftCertificate.merchantID + '. Error: ' +  e.message);
		return;
	}
}

/**
 * Prepare the Thank you email payload.
 * @param giftCertificate
 * @param message
 * @returns
 */
 function prepareThankyouEmailPayload(giftCertificate, message) {
	
	var giftCardDetails = {};
	
	giftCardDetails['SENDER_EMAIL'] = giftCertificate.custom.giftCertificateSenderEmail;
	giftCardDetails['SENDER_NAME'] = giftCertificate.senderName;
	giftCardDetails['RECIPIENT_EMAIL'] = giftCertificate.recipientEmail;
	giftCardDetails['RECIPIENT_NAME'] = giftCertificate.recipientName;
	giftCardDetails['AMOUNT'] = giftCertificate.amount.value;
	giftCardDetails['PRODUCT_IMG_URL'] = giftCertificate.custom.giftCertificateImage;
	giftCardDetails['THANKYOU_MESSAGE'] = message.stringValue;
	giftCardDetails["$event_id"] = 'Gift Card Thank You Note -' + giftCertificate.UUID;
	
	return giftCardDetails;
}


function prepareNotificationPayload(productList, isFutureOrder, mailType) {
	var orderDetails = {};
	
	var shippingAddr  = productList.custom.OsfSorRefillShippingAddress;
    var shippingObj = JSON.parse(shippingAddr);
    var defaultShipping = dw.order.ShippingMgr.getDefaultShippingMethod();
    
    orderDetails['FULLFILMENT_DATE'] = dw.util.StringUtils.formatCalendar(new dw.util.Calendar(productList.eventDate), 'MM/dd/yyyy' );
    
    var total = 0;
    var currencyCode;
	for(var i=0; i<productList.productItems.length;i++) {
		var plItem = productList.productItems[i];
		var lineItemProduct = plItem.product;
        var productDetail = productMgr.getProduct(lineItemProduct.ID);
        orderDetails.event = 'Placed Order';
		orderDetails['PRODUCT_NAME'] = plItem.product.name;
		orderDetails['PRODUCT_QTY'] = plItem.quantityValue;
		orderDetails['PRODUCT_PRICE'] = dw.util.StringUtils.formatMoney(plItem.product.priceModel.price);
		orderDetails['PRODUCT_IMG_URL'] = productDetail.getImage("large").getAbsURL().toString();
		orderDetails['PRODUCT_URL'] = require('dw/web/URLUtils').url('Product-Show', 'pid', plItem.productID).toString();
	    
		total = total + (plItem.product.priceModel.price.value * plItem.quantity.value);
		currencyCode = plItem.product.priceModel.price.currencyCode;
	}
	
	var shippingCost = dw.system.Site.getCurrent().getCustomPreferenceValue("OsfSorEnableFreeShipping") ?
            new dw.value.Money(0.0, currencyCode) : dw.order.ShippingMgr.getShippingCost(defaultShipping, new dw.value.Money(total, currencyCode));
    var orderTotal = total + shippingCost.decimalValue;
	
	//orderDetails['DISCOUNT'] = shippingaddress;
	orderDetails['SUBTOTAL'] = dw.util.StringUtils.formatMoney(dw.value.Money(total, currencyCode));
	//orderDetails['TAX'] = new dw.value.Money(0.0, currencyCode);
	orderDetails['SHIPPING_COST'] = dw.util.StringUtils.formatMoney(dw.value.Money(shippingCost.value, currencyCode));
	orderDetails['ORDER_TOTAL'] = dw.util.StringUtils.formatMoney(dw.value.Money(orderTotal, currencyCode));
	orderDetails['SHIPPING'] = shippingObj;
	orderDetails['SHIPPING_METHOD'] = defaultShipping.ID;
	orderDetails['$event_id'] = mailType + '-' + productList.ID;
	
	return orderDetails;
}

/**
 * Sends a thank you email.
 * 
 * @param giftCertificate
 * @param message
 * @returns
 */
function sendThankyouEmail(giftCertificate, message) {
	var logger = Logger.getLogger('Klaviyo', 'EmailUtils - sendThankyouEmail()');
	try {
		var giftCardDetails = prepareThankyouEmailPayload(giftCertificate, message);
		require('*/cartridge/scripts/utils/klaviyo/klaviyoUtils').sendEmail(giftCertificate.custom.giftCertificateSenderEmail, giftCardDetails, 'Gift Card Thank You Note');
		
	} catch (e) {
		logger.error('sendGiftCertificateEmail() failed for gc ' + giftCertificate.merchantID + '. Error: ' +  e.message);
		return;
	}
}

/**
 * Sends a gift card email.
 * 
 * @param giftCardLineItems
 * @param mailType
 * @returns
 */
 function sendGiftCertificateEmail(giftCertificateLineItem, orderNo) {
	var logger = Logger.getLogger('Klaviyo', 'EmailUtils - sendGiftCertificateEmail()');
	try {
		var giftCardDetails = prepareGiftCertificateEmailPayload(giftCertificateLineItem, orderNo);
		require('*/cartridge/scripts/utils/klaviyo/klaviyoUtils').sendEmail(giftCertificateLineItem.recipientEmail, giftCardDetails, 'Received Gift Card');
		
		//mParticle change
	    if(Site.getCurrent().getCustomPreferenceValue('mParticleEnabled')) {
	    	var eventAttributes = {	    			
	    			senderName : (giftCertificateLineItem.senderName) ? giftCertificateLineItem.senderName : '',
	    			message : (giftCertificateLineItem.message) ? giftCertificateLineItem.message : '',
	    			code : (giftCertificateLineItem.giftCertificateCode) ? giftCertificateLineItem.giftCertificateCode : '',
	    	    	productImgUrl : (giftCertificateLineItem.custom.giftCertificateImage) ? giftCertificateLineItem.custom.giftCertificateImage :'',
	    	    	recipientName : (giftCertificateLineItem.recipientName) ? giftCertificateLineItem.recipientName : '',
	    	    	amount : (giftCertificateLineItem.amount.value) ? giftCertificateLineItem.amount.value : '',
	    	    	senderEmail : (giftCertificateLineItem.custom.giftCertificateSenderEmail) ? giftCertificateLineItem.custom.giftCertificateSenderEmail : '',
	    	    	recipientEmail : (giftCertificateLineItem.recipientEmail) ? giftCertificateLineItem.recipientEmail : '',
	    	    	orderNo : orderNo,
	    	    	recipientUrl : (giftCardDetails.RECIPIENT_URL) ? giftCardDetails.RECIPIENT_URL :''
	    	    };
	    	require('int_mParticle/cartridge/scripts/mParticleUtils').klaviyoEventTrigger('Received Gift Card', JSON.stringify(eventAttributes));
        }
	} catch (e) {
		logger.error('sendGiftCertificateEmail() failed for order: ' + orderNo + '. Error: ' +  e.message);
		return;
	}
}

/**
 * Prepare the Gift Certificate payload.
 * @param giftCertificateLineItem
 * @param orderNo
 * @returns
 */
 function prepareGiftCertificateEmailPayload(giftCertificate, orderNo) {
	
	var giftCertCategory = dw.system.Site.getCurrent().getCustomPreferenceValue('giftCertCategory');
	var giftCardDetails = {};
	
	giftCardDetails['ORDER_NO'] = orderNo;
	giftCardDetails['CODE'] = giftCertificate.getGiftCertificateCode();
	giftCardDetails['SENDER_EMAIL'] = giftCertificate.custom.giftCertificateSenderEmail;
	giftCardDetails['SENDER_NAME'] = giftCertificate.senderName;
	giftCardDetails['RECIPIENT_EMAIL'] = giftCertificate.recipientEmail;
	giftCardDetails['RECIPIENT_NAME'] = giftCertificate.recipientName;
	giftCardDetails['AMOUNT'] = giftCertificate.amount.value;
	giftCardDetails['PRODUCT_IMG_URL'] = giftCertificate.custom.giftCertificateImage;
	giftCardDetails['MESSAGE'] = giftCertificate.message;
	// giftCardDetails['RECIPIENT_URL'] = URLUtils.https('Search-Show', 'cgid', giftCertCategory , 'view', giftCertificate.merchantID, 'pmin', '0', 'pmax', giftCertificate.amount.value,'sz','149','is_gc', true,'rec_name',giftCertificate.recipientName).toString();
    giftCardDetails['RECIPIENT_URL'] = URLUtils.https('Page-Show', 'cid', 'gift-recipient' ,'view', giftCertificate.merchantID, 'is_gc', true).toString();
	giftCardDetails["$event_id"] = 'Received Gift Card-' + giftCertificate.UUID;
	
	if(empty(giftCertificate.custom.giftCertificateImage)) {
		var giftCardId = dw.system.Site.getCurrent().getCustomPreferenceValue('EgiftProduct-ID')
        var giftCardProductDetail = productMgr.getProduct(giftCardId);
		
		if(!empty(giftCardProductDetail)) {
			giftCardDetails['PRODUCT_IMG_URL'] = giftCardProductDetail.getImage("large").getAbsURL().toString();
		}
	}
	
	return giftCardDetails;
}

function sendOrderNotificationEmail(productList, mailType) {
	var logger = Logger.getLogger('Klaviyo', 'EmailUtils - sendOrderEmail()');
	try {
		var isFutureOrder = (mailType == 'Auto Delivery Order Notification') ? true : false;
		var orderPayload = prepareNotificationPayload(productList, isFutureOrder, mailType);
		require('*/cartridge/scripts/utils/klaviyo/klaviyoUtils').sendEmail(productList.owner.profile.email, orderPayload, mailType);
	} catch (e) {
		logger.error('sendOrderNotificationEmail() failed for List ID: ' + productList.ID + ', mailType: ' +  mailType + '. Error: ' +  e.message);
		return;
	}
}


module.exports = {
	sendOrderEmail: sendOrderEmail,
	prepareOrderPayload: prepareOrderPayload,
	sendGiftCertificateEmail: sendGiftCertificateEmail,
	sendOrderNotificationEmail: sendOrderNotificationEmail,
	prepareThankyouEmailPayload : prepareThankyouEmailPayload,
	sendThankyouEmail : sendThankyouEmail
};

