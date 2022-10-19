'use strict';

var { updateShippingAddress } = require('~/cartridge/scripts/hooks/payment/processor/processorHelper');

/**
 * ApplePay form processor:
 * Updating Shipping Address (only from Cart Checkout)
 * Adding paymentMethod & email to viewData
 *
 * @param {Object} req the request object
 * @param {Object} paymentForm - the payment form
 * @param {Object} viewFormData - object contains billing form data
 * @returns {Object} an object that has payment information
 */
function processForm(req, paymentForm, viewFormData) {
    var BasketMgr = require('dw/order/BasketMgr');
    var currentBasket = BasketMgr.getCurrentBasket();
    var fromCart = (req.querystring || {}).fromCart;
    var viewData = viewFormData;
    var usingMultiShipping = false; // Current integration support only single shpping
    req.session.privacyCache.set('usingMultiShipping', usingMultiShipping);

    viewData.paymentMethod = {
        value: paymentForm.paymentMethod.value
    };

    /*viewData.email = {
        value: paymentForm.contactInfoFields.email.value
    };*/

    // Shipping handling
    if (fromCart) {
        updateShippingAddress(req.httpParameterMap.braintreeApplePayShippingAddress.stringValue, currentBasket.getDefaultShipment());
    }

    return {
        error: false,
        viewData: viewData
    };
}

exports.processForm = processForm;
