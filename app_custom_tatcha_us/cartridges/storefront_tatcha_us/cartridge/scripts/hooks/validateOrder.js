'use strict';

var Resource = require('dw/web/Resource');
var validationHelpers = require('*/cartridge/scripts/helpers/basketValidationHelpers');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');

/**
 * validates the current users basket
 * @param {dw.order.Basket} basket - The current user's basket
 * @param {boolean} validateTax - boolean that determines whether or not to validate taxes
 * @returns {Object} an error object
 */
function validateOrder(basket, validateTax) {
    var result = { error: false, message: null };

    if (!basket) {
        result.error = true;
        result.message = Resource.msg('error.cart.expired', 'cart', null);
    } else {
        var productExistence = validationHelpers.validateProducts(basket);
        var validCoupons = validationHelpers.validateCoupons(basket);
        var validShipments = validationHelpers.validateShipments(basket);
        var orderType = COHelpers.getOrderType(basket);
        var totalTax = true;

        if (validateTax) {
            totalTax = basket.totalTax.available;
        }

        if (productExistence.error || !productExistence.hasInventory) {
            result.error = true;
            result.message = Resource.msg('error.cart.or.checkout.error', 'cart', null);
            // customization to show the OOS modal on place order button click
            result.oosStatus = true;
        } else if (validCoupons.error) {
            result.error = true;
            result.message = Resource.msg('error.invalid.coupon', 'cart', null);
        } else if (basket.productLineItems.getLength() === 0 && basket.giftCertificateLineItems.getLength() === 0) {
            result.error = true;
        } else if (!basket.merchandizeTotalPrice.available) {
            result.error = true;
            result.message = Resource.msg('error.cart.or.checkout.error', 'cart', null);
        } else if (!totalTax) {
            result.error = true;
            result.message = Resource.msg('error.invalid.tax', 'cart', null);
        } else if (!validShipments && orderType != 'giftcard') {
            result.error = true;
            result.message = Resource.msg('error.card.invalid.shipments', 'cart', null);
        }
    }

    return result;
}

module.exports = {
    validateOrder: validateOrder
};
