'use strict';

var base = module.superModule;
var ProductMgr = require('dw/catalog/ProductMgr');
var Resource = require('dw/web/Resource');
var productHelper = require('*/cartridge/scripts/helpers/productHelpers');
var URLUtils = require('dw/web/URLUtils');
var Site = require('dw/system/Site');


/**
 * Get the gift wrap product details
 * @param {dw.order.Basket} currentBasket - Current users's basket
 * @param {dw.catalog.Product} giftWrapProduct - Gift Wrap Product
 */
function getGiftWrapProductDetails(currentBasket,giftWrapProduct) {

    // Check the cart has already a gift wrap added
    var hasGiftWrap = false;
    var productLineItems = currentBasket.productLineItems;
    for (var q = 0; q < productLineItems.length; q++) {
        var item = productLineItems[q];
        if (item.productID === giftWrapProduct.ID) {
            hasGiftWrap = true;
        }
    }
    var giftWrapImageUrl = '';
    if (!empty(giftWrapProduct) && !empty(giftWrapProduct.getImages('large')) && giftWrapProduct.getImages('large').length > 0) {
        giftWrapImageUrl = giftWrapProduct.getImage('large').getAbsImageURL( { scaleWidth: 200,scaleHeight: 200 } ).toString();
    }

    var defaultShipment = currentBasket.getDefaultShipment();
    var giftMessage = !empty(defaultShipment.giftMessage) ? defaultShipment.giftMessage : '';
    var giftFrom = !empty(defaultShipment.custom.giftFrom) ? defaultShipment.custom.giftFrom : '';
    var giftTo = !empty(defaultShipment.custom.giftTo) ? defaultShipment.custom.giftTo : '';
    var giftWrapId = Site.getCurrent().getCurrent().getCustomPreferenceValue('GiftWrapId');
    var giftMsgLength = Site.getCurrent().getCurrent().getCustomPreferenceValue('GiftMsgLen');
    var giftWrapDesc = Site.getCurrent().getCurrent().getCustomPreferenceValue('Giftwrapdescription');
    var giftpricemodel = giftWrapProduct.getPriceModel();
    var giftprice = giftpricemodel.getPrice();

    return {
        hasGiftWrap: hasGiftWrap,
        giftMessage: giftMessage,
        giftFrom: giftFrom,
        giftTo: giftTo,
        giftMsgLength: giftMsgLength,
        giftWrapDesc: giftWrapDesc,
        giftprice: giftprice.value,
        giftWrapImageUrl: giftWrapImageUrl,
        giftWrapProduct: giftWrapProduct
    };
}

/**
 *  Adds pairs with product to the cart.
 *  @param {Object} itemIDs - the productId of the products added to the cart
 *  @param {string} productId - the productId of the pairsWith
 *  @return {Object} returns an error object
 */
function getPairsWithProduct(itemIDs, productId) {

    var inCart = false;
    var ProductFactory = require('*/cartridge/scripts/factories/product');
    var product;

    for (var l = 0; l < itemIDs.length; l++) {
        if (productId == itemIDs[l]) {
            inCart = true;
            break;
        }
    }

    if (!inCart) {
        var params = {
            pid: productId,
            variables: null,
            pview: 'pairsWith'
        };
        product = ProductFactory.get(params);

        if (!empty(product) && product.available) {
            if (!empty(product.travelProductVariant)) {
                for (var h = 0; h < itemIDs.length; h++) {
                    if (product.travelProductVariant.id == itemIDs[h]) {
                        inCart = true;
                        break;
                    }
                }
            }
        } else {
            product = [];
        }
    }

    if (inCart) {
        product = [];
    }
    return product;
}

/**
 *  Autodelivery check in cart.
 *  @param {Object} basket - current basket
 *  @return {Object} returns an error object
 */
function hasAutoDeliveryProductInBag() {
    var hasADProduct = false;
    var hasSORProductInCart = null;
    if (Site.getCurrent().getCustomPreferenceValue('SorEnabled')) {
        hasSORProductInCart = session.custom && session.custom.hasSORProducts;
    }
    if (hasSORProductInCart) {
        hasADProduct = true;
    }
    return hasADProduct;
}

function createGiftCertificatePaymentInstrument (giftCertificate, currentBasket) {
        var Money = require('dw/value/Money');
        var PaymentMgr = require('dw/order/PaymentMgr');

        // Removes any duplicates.
        // Iterates over the list of payment instruments to check.
        var gcPaymentInstrs = currentBasket.getGiftCertificatePaymentInstruments(giftCertificate.getGiftCertificateCode()).iterator();
        var existingPI = null;

         // Removes found gift certificates, to prevent duplicates.
         while (gcPaymentInstrs.hasNext()) {
            existingPI = gcPaymentInstrs.next();
            currentBasket.removePaymentInstrument(existingPI);
        }

        // Fetches the balance and the order total.
        var balance = giftCertificate.getBalance();
        var orderTotal = currentBasket.getTotalGrossPrice();

         // Sets the amount to redeem equal to the remaining balance.
         var amountToRedeem = balance;

         // Since there may be multiple gift certificates, adjusts the amount applied to the current
        // gift certificate based on the order total minus the aggregate amount of the current gift certificates.
        var giftCertTotal = new Money(0.0, currentBasket.getCurrencyCode());

         // Iterates over the list of gift certificate payment instruments
        // and updates the total redemption amount.
        gcPaymentInstrs = currentBasket.getGiftCertificatePaymentInstruments().iterator();
        var orderPI = null;

        while (gcPaymentInstrs.hasNext()) {
            orderPI = gcPaymentInstrs.next();
            giftCertTotal = giftCertTotal.add(orderPI.getPaymentTransaction().getAmount());
        }

        // Calculates the remaining order balance.
        // This is the remaining open order total that must be paid.
        var orderBalance = orderTotal.subtract(giftCertTotal);

        // The redemption amount exceeds the order balance.
        // use the order balance as maximum redemption amount.
        if (orderBalance < amountToRedeem) {
            // Sets the amount to redeem equal to the order balance.
            amountToRedeem = orderBalance;
            // if the GC has sufficinet balance, remove other payment isnturments  - RDMP-4217
            currentBasket.removeAllPaymentInstruments();
        }
        var paymentInstrument = currentBasket.createGiftCertificatePaymentInstrument(giftCertificate.getGiftCertificateCode(), amountToRedeem);
        var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.paymentMethod).getPaymentProcessor();
        paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);

        return paymentInstrument;
}

function removeGiftCertificatePaymentInstrument(giftCertificate, currentBasket) {
    // Iterates over the list of payment instruments.
    var gcPaymentInstrs = currentBasket.getGiftCertificatePaymentInstruments(giftCertificate);
    var iter = gcPaymentInstrs.iterator();
    var existingPI = null;

    // Remove (one or more) gift certificate payment
    // instruments for this gift certificate ID.
    while (iter.hasNext()) {
        existingPI = iter.next();
        currentBasket.removePaymentInstrument(existingPI);
    }
    return;
}

/**
 * Creates rendering html for product modal card
 * @param {Object} gwpProductIDs - a set of IDs of bonus products
 * @param {Object} dataIDs - a set of IDs of bonus products in cart
 * @returns {Array} an array of gwp products to be shown in modal
 */
function gwpModalProductCard(gwpProductIDs, dataIDs,template) {
    var ProductFactory = require('*/cartridge/scripts/factories/product');
    var renderTemplateHelper = require('*/cartridge/scripts/renderTemplateHelper');

    var context;
    var gwpBonusHtml = [];
    for (var i = 0; i < gwpProductIDs.length; i++) {
        var params = {
            pid: gwpProductIDs[i],
            variables: null,
            pview: 'tile'
        };
        var gwpBonusProduct = ProductFactory.get(params);
        if (gwpBonusProduct.available) {
            if (dataIDs) {
                for (var l = 0; l < dataIDs.length; l++) {
                    if (dataIDs[l] === gwpBonusProduct.id) {
                        gwpBonusProduct.selected = true;
                        break;
                    } else {
                        gwpBonusProduct.selected = false;
                    }
                }
            }
            context = { bonusProduct: gwpBonusProduct };
            gwpBonusHtml.push(renderTemplateHelper.getRenderedHtml(context, template));
        }
    }
    return gwpBonusHtml;
}

/**
 * Creates rendering html for product modal card
 * @param {Object} discounts - discount applied to the basket
 * @param {Object} bonusDiscountLineItems - discount bonus line items
 * @param {Object} items - product line items
 * @returns {Array} an array of gwp products to be shown in modal
 */
function editGwpProductsList(discounts, bonusDiscountLineItems, items) {
    var gwpUUID;
    var selectedGwpCount = 0;
    var gwpCouponUUID;

    if (discounts.length) {
        var bonusLineItemProducts;
        for (var i = 0; i < discounts.length; i++) {
            if (discounts[i].type === 'coupon') {
                var couponCode = discounts[i].couponCode;
                if (bonusDiscountLineItems) {
                    for (var j = 0; j < bonusDiscountLineItems.length; j++) {
                        if (bonusDiscountLineItems[j].couponLineItem && (couponCode === bonusDiscountLineItems[j].couponLineItem.couponCode)) {
                            gwpUUID = bonusDiscountLineItems[j].UUID;
                            bonusLineItemProducts = bonusDiscountLineItems[j].bonusProducts;
                            discounts[i].gwpCoupon = true;
                            gwpCouponUUID = discounts[i].UUID;
                            //break; - commented bcz of RDMP-4584: Choose22 Bug
                        } else {
                            discounts[i].gwpCoupon = false;
                        }
                    }
                } else {
                    discounts[i].gwpCoupon = false;
                }
            }
        }

        if (bonusLineItemProducts) {
            for (var k = 0; k < bonusLineItemProducts.length; k++) {
                for (var l = 0; l < items.length; l++) {
                    if (items[l] === bonusLineItemProducts[k].ID) {
                        selectedGwpCount++;
                    }
                }
            }
        }
    }

    var gwpBonusProductArray;
    if (gwpUUID) {
        gwpBonusProductArray = {
            uuid: gwpUUID,
            selectedGwpCount: selectedGwpCount,
            gwpCouponUUID: gwpCouponUUID,
            editGwpProductsUrl: URLUtils.url('CartSFRA-EditGwpProducts').toString()
        };
    }

    return gwpBonusProductArray;
}

function isAfterpayEligible(basket){
    var afterPayEligible = false;

    //After Pay Changes Start
    var sitePreferences = require("int_afterpay_core/cartridge/scripts/util/afterpayUtilities.js").getSitePreferencesUtilities();
    var afterpayEnable = sitePreferences.isAfterpayEnabled();
    if(afterpayEnable){
        //setting threshold value
        require("int_afterpay_core/cartridge/scripts/util/afterpayCallThreshold.js").SetThreshold();

        //Getting Afterpay threshold
        var afterPayOrderTotal = basket.getAdjustedMerchandizeTotalPrice().add(basket.getGiftCertificateTotalPrice());
        var afterPayMin = Site.getCurrent().getCustomPreferenceValue('apMinThresholdAmount');
        var afterPayMax = Site.getCurrent().getCustomPreferenceValue('apMaxThresholdAmount');

        if(((afterPayOrderTotal >= parseFloat(afterPayMin,10)) && (afterPayOrderTotal <= parseFloat(afterPayMax,10)))) {
            afterPayEligible = true;
        }
    }
    //After Pay Changes End

    return (afterPayEligible);
}

function hasOnlyGiftCertificateItem(basket){
    var hasOnlyGiftCertificate = false;
    var productLineItems = basket.productLineItems;
    if(productLineItems.length === 0 && basket.giftCertificateLineItems && basket.giftCertificateLineItems.length > 0) {
        hasOnlyGiftCertificate = true;
    }
    return hasOnlyGiftCertificate;
}

function getBasketDataStr(basket){
    var plis = basket.getProductLineItems();
    var detailsString = '';
    for (var i = 0, il = plis.length; i < il; i++) {
        var item = plis[i];
        detailsString+= item.productID;
    }
    //shipping details
    if(!empty(basket.defaultShipment) && !empty(basket.defaultShipment.shippingAddress)){
        var shippingAddress = basket.defaultShipment.shippingAddress;
        detailsString+=(shippingAddress.address1? shippingAddress.address1: '')+(shippingAddress.address2? shippingAddress.address2: '')+(shippingAddress.postalCode? shippingAddress.postalCode: '')+(shippingAddress.stateCode? shippingAddress.stateCode: '')+(shippingAddress.countryCode? shippingAddress.countryCode.value : '');
    }
    //couponlineitems
    if(!empty(basket.couponLineItems)){
        var couponLineItems = basket.getCouponLineItems();
        for (var i = 0; i <  couponLineItems.length; i++) {
            var couponLineItem = couponLineItems[i];
            detailsString+=couponLineItem.getCouponCode();
        }
    }

    if(session.privacy.afterpaytoken){
        detailsString+=session.privacy.afterpaytoken;
    }

    detailsString = JSON.stringify(detailsString);
    if (empty(session.custom.taxString)) {
        session.custom.taxString = detailsString;
    }

    return detailsString;
}

function giftWrapEligibility(currentBasket, giftWrapId) {
    var plis = currentBasket.getProductLineItems();
    if (empty(plis)) { return false; }

    var ineligible = 0;
    for (var q = 0; q < plis.length; q++) {
        var item = plis[q];
        if (!empty(item.bonusProductLineItem) && item.bonusProductLineItem == false
            && !empty(item.product.custom.isEligibleForGiftWrap) && item.product.custom.isEligibleForGiftWrap == false && item.productID != giftWrapId) {
            ineligible++;
        }
    }
    if (plis.length == ineligible){
        return 'ineligible';
    } else if(ineligible == 0){
        return 'eligible';
    } else {
        return 'part-eligible';
    }
}

function revalidateGiftCertificatePayment(currentBasket){
    var Status = require('dw/system/Status');
    var GiftCertificate = require('dw/order/GiftCertificate');
    var GiftCertificateMgr = require('dw/order/GiftCertificateMgr');
    var GiftCertificateStatusCodes = require('dw/order/GiftCertificateStatusCodes');
    var Transaction = require('dw/system/Transaction');
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');

    if(currentBasket.getGiftCertificatePaymentInstruments().empty == false) {
        Transaction.wrap(function () {
            session.custom.NoCall = false;
            basketCalculationHelpers.calculateTotals(currentBasket);
            for(var i in currentBasket.getGiftCertificatePaymentInstruments()) {
                var giftCertificateCode = currentBasket.giftCertificatePaymentInstruments[i].giftCertificateCode;
                removeGiftCertificatePaymentInstrument(giftCertificateCode, currentBasket);
                var gc, newGCPaymentInstrument, gcPaymentInstrument, status, result;

                if (currentBasket) {
                    // fetch the gift certificate
                    gc = GiftCertificateMgr.getGiftCertificateByCode(giftCertificateCode);

                    if (!gc) {// make sure exists
                        result = new Status(Status.ERROR, GiftCertificateStatusCodes.GIFTCERTIFICATE_NOT_FOUND);
                    } else if (!gc.isEnabled()) {// make sure it is enabled
                        result = new Status(Status.ERROR, GiftCertificateStatusCodes.GIFTCERTIFICATE_DISABLED);
                    } else if (gc.getStatus() === GiftCertificate.STATUS_PENDING) {// make sure it is available for use
                        result = new Status(Status.ERROR, GiftCertificateStatusCodes.GIFTCERTIFICATE_PENDING);
                    } else if (gc.getStatus() === GiftCertificate.STATUS_REDEEMED) {// make sure it has not been fully redeemed
                        result = new Status(Status.ERROR, GiftCertificateStatusCodes.GIFTCERTIFICATE_INSUFFICIENT_BALANCE);
                    } else if (gc.balance.currencyCode !== currentBasket.getCurrencyCode()) {// make sure the GC is in the right currency
                        result = new Status(Status.ERROR, GiftCertificateStatusCodes.GIFTCERTIFICATE_CURRENCY_MISMATCH);
                    } else {
                        newGCPaymentInstrument = Transaction.wrap(function () {
                            gcPaymentInstrument = createGiftCertificatePaymentInstrument(gc, currentBasket);
                            basketCalculationHelpers.calculateTotals(currentBasket);
                            return gcPaymentInstrument;
                        });

                        status = new Status(Status.OK);
                        status.addDetail('NewGCPaymentInstrument', newGCPaymentInstrument);
                        result = status;
                    }
                } else {
                    result = new Status(Status.ERROR, 'BASKET_NOT_FOUND');
                }
                return result;
            }
        });
    }
}

/**
 * Calculates the total amount of an order paid for by gift certificate payment
 * instruments. Any remaining open amount is applied to the non-gift certificate payment
 * instrument, such as a credit card. <b>Note:</b> this script assumes that only one non-gift certificate
 * payment instrument is used for the payment.
 *
 * @alias module:models/CartModel~CartModel/calculatePaymentTransactionTotal
 * @returns {boolean} false in the case of an error or if the amount of the transaction is not covered, true otherwise.
 */
function calculatePaymentTransactionTotal(currentBasket) {
    var Money = require('dw/value/Money');
    var PaymentInstrument = require('dw/order/PaymentInstrument');
    var Transaction = require('dw/system/Transaction');

    // Gets all payment instruments for the basket.
    var iter = currentBasket.getPaymentInstruments().iterator();
    var paymentInstrument = null;
    var nonGCPaymentInstrument = null;
    var giftCertTotal = new Money(0.0, currentBasket.getCurrencyCode());

    // Locates a non-gift certificate payment instrument if one exists.
    while (iter.hasNext()) {
        paymentInstrument = iter.next();
        if (PaymentInstrument.METHOD_GIFT_CERTIFICATE.equals(paymentInstrument.getPaymentMethod())) {
            giftCertTotal = giftCertTotal.add(paymentInstrument.getPaymentTransaction().getAmount());
            continue;
        }

        // Captures the non-gift certificate payment instrument.
        nonGCPaymentInstrument = paymentInstrument;
        break;
    }

    // Gets the order total.
    var orderTotal = currentBasket.getTotalGrossPrice();

    // If a gift certificate payment and non-gift certificate payment
    // instrument are found, the function returns true.
    if (!nonGCPaymentInstrument) {
        // If there are no other payment types and the gift certificate
        // does not cover the open amount, then return false.
        if (giftCertTotal < orderTotal) {
            return false;
        } else {
            return true;
        }
    }
    return true;
}

function updateCoupons(currentBasket) {
	var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    if (currentBasket) {
		var couponLineItems = currentBasket.getCouponLineItems();
	    for (var i = 0; i < couponLineItems.length; i++) {
			if (!couponLineItems[i].applied) {
		        currentBasket.removeCouponLineItem(couponLineItems[i]);
		        basketCalculationHelpers.calculateTotals(currentBasket);
		    }
	    }
	}
}
function addMultipleItems(req,list){
    var BasketMgr = require('dw/order/BasketMgr');
    var Transaction = require('dw/system/Transaction');
    var GiftSet = require('*/cartridge/scripts/util/giftset');
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    var currentBasket = BasketMgr.getCurrentOrNewBasket();
    var childProducts = [];
    var result;
    if (currentBasket) {
        for(var i=0; i < list.length; i++) {
            var productId = list[i]['id'];
            var quantity = parseInt(list[i]['qty']);
            var options = list[i]['options'] ? list[i]['options'] : [];
            if(productId&&quantity) {
                Transaction.wrap(function () {
                    result = base.addProductToCart(
                        currentBasket,
                        productId,
                        quantity,
                        childProducts,
                        options
                    );
                    GiftSet.checkGiftBuilderItem(currentBasket);
                    base.ensureAllShipmentsHaveMethods(currentBasket);
                    basketCalculationHelpers.calculateTotals(currentBasket);
                    base.updateCoupons(currentBasket);
                });
            }
        }
    }
}
//Selected paymentInstruments except giftcertificate is removed
function removePaymentInstruments(basket){
    var collections = require('*/cartridge/scripts/util/collections');
    var PaymentInstrument = require('dw/order/PaymentInstrument');
    var paymentInstruments = basket.getPaymentInstruments();
    collections.forEach(paymentInstruments, function (item) {
        if(!empty(item.paymentMethod)
            &&item.paymentMethod != PaymentInstrument.METHOD_GIFT_CERTIFICATE){
            basket.removePaymentInstrument(item);
        }
    });
}

base.createGiftCertificatePaymentInstrument = createGiftCertificatePaymentInstrument;
base.removeGiftCertificatePaymentInstrument = removeGiftCertificatePaymentInstrument;
base.getGiftWrapProductDetails = getGiftWrapProductDetails;
base.getPairsWithProduct = getPairsWithProduct;
base.hasAutoDeliveryProductInBag = hasAutoDeliveryProductInBag;
base.gwpModalProductCard = gwpModalProductCard;
base.editGwpProductsList = editGwpProductsList;
base.isAfterpayEligible = isAfterpayEligible;
base.hasOnlyGiftCertificateItem = hasOnlyGiftCertificateItem;
base.getBasketDataStr = getBasketDataStr;
base.giftWrapEligibility = giftWrapEligibility;
base.revalidateGiftCertificatePayment = revalidateGiftCertificatePayment;
base.calculatePaymentTransactionTotal = calculatePaymentTransactionTotal;
base.updateCoupons = updateCoupons;
base.addMultipleItems = addMultipleItems;
base.removePaymentInstruments = removePaymentInstruments;

module.exports = base;
