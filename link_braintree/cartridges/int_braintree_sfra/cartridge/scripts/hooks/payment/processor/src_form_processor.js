'use strict';

var {
    updateShippingAddress,
    getBillingAddressFromStringValue
} = require('~/cartridge/scripts/hooks/payment/processor/processorHelper');

/**
 * Update Billing Form
 *
 * Checkout scenarios: Cart, Billing page
 *
 * Authenticated scenario, Unauthenticated scenario
 *
 * @param {Object} data req, paymentForm, viewFormData
 * @returns {boolean} true\false
 */
function updateBillingForm(data) {
    var httpParameterMap = data.req.httpParameterMap;
    var scrBillingAddress = getBillingAddressFromStringValue(httpParameterMap.braintreeSrcBillingAddress.stringValue);

    // in case of cart checkout billing address is updated by core functionality(braintreeSrcBillingAddress is not passed)
    if (!scrBillingAddress) {
        return false;
    }
    // billing address update in case of checkout from billing page
    data.viewData.address = {
        firstName: { value: scrBillingAddress.firstName },
        lastName: { value: scrBillingAddress.lastName },
        address1: { value: scrBillingAddress.streetAddress },
        address2: { value: scrBillingAddress.extendedAddress || '' },
        city: { value: scrBillingAddress.locality },
        postalCode: { value: scrBillingAddress.postalCode },
        countryCode: { value: scrBillingAddress.countryCode },
        stateCode: { value: scrBillingAddress.region }
    };
    data.viewData.phone = {
        value: scrBillingAddress.phoneNumber
    };
    data.viewData.email = {
        value: scrBillingAddress.email || data.paymentForm.contactInfoFields.email.value
    };

    return true;
}

/**
 * SRC form processor:
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
    var httpParameterMap = req.httpParameterMap;
    var fromCart = (req.querystring || {}).fromCart;
    var viewData = viewFormData;
    var usingMultiShipping = false; // Current integration support only single shpping
    req.session.privacyCache.set('usingMultiShipping', usingMultiShipping);

    // Error handling
    if (empty(httpParameterMap.braintreeSrcNonce.stringValue) && empty(httpParameterMap.accountUUID.stringValue)) {
        return { error: true };
    }

    viewData.paymentMethod = {
        value: paymentForm.paymentMethod.value
    };

    // Shipping handling
    if (fromCart) {
        updateShippingAddress(httpParameterMap.braintreeSrcShippingAddress.stringValue, currentBasket.getDefaultShipment());
    }

    // Handle Billing Form
    updateBillingForm({ req: req, paymentForm: paymentForm, viewData: viewData });

    return {
        error: false,
        viewData: viewData
    };
}

exports.processForm = processForm;
