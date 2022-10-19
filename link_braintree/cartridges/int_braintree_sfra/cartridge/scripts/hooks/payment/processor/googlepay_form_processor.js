var {
    updateShippingAddress,
    getBillingAddressFromStringValue
} = require('~/cartridge/scripts/hooks/payment/processor/processorHelper');

/**
 * Update Billing Form for GogglePay checkout from cart and billing page
 * @param {Object} data req, paymentForm, viewFormData
 * @returns {boolean} true\false
 */
function updateBillingForm(data) {
    var httpParameterMap = data.req.httpParameterMap;
    var googlepayBillingAddress = getBillingAddressFromStringValue(httpParameterMap.braintreeGooglePayBillingAddress.stringValue);
    // in case of cart checkout billing address is updated by core functionality (braintreeGooglePayBillingAddress is not passed)
    if (!googlepayBillingAddress) {
        return false;
    }
    // billing address update in case of checkout from billing page
    data.viewData.address = {
        firstName: { value: googlepayBillingAddress.firstName },
        lastName: { value: googlepayBillingAddress.lastName },
        address1: { value: googlepayBillingAddress.streetAddress },
        address2: { value: googlepayBillingAddress.extendedAddress || '' },
        city: { value: googlepayBillingAddress.locality },
        postalCode: { value: googlepayBillingAddress.postalCode },
        countryCode: { value: googlepayBillingAddress.countryCodeAlpha2 },
        stateCode: { value: googlepayBillingAddress.stateCode }
    };
    data.viewData.phone = {
        value: googlepayBillingAddress.phone
    };
    data.viewData.email = {
        value: googlepayBillingAddress.email || data.paymentForm.contactInfoFields.email.value
    };

    return true;
}

/**
 * GooglePay form processor:
 * Adding paymentMethod and email to viewData
 * Updating Shipping Address (only from Cart Checkout)
 *
 * @param {Object} req the request object
 * @param {Object} paymentForm - the payment form
 * @param {Object} viewFormData - object contains billing form data
 * @returns {Object} an object that has payment information
 */
function processForm(req, paymentForm, viewFormData) {
    var BasketMgr = require('dw/order/BasketMgr');
    var currentBasket = BasketMgr.getCurrentBasket();
    var viewData = viewFormData;
    var fromCart = (req.querystring || {}).fromCart;
    var usingMultiShipping = false; // Current integration support only single shpping
    req.session.privacyCache.set('usingMultiShipping', usingMultiShipping);

    viewData.paymentMethod = {
        value: paymentForm.paymentMethod.value
    };

    viewData.email = {
        value: paymentForm.contactInfoFields.email.value
    };

    // Shipping handling
    if (fromCart) {
        updateShippingAddress(req.httpParameterMap.braintreeGooglePayShippingAddress.stringValue, currentBasket.getDefaultShipment());
    }

    // Handle Billing Form
    updateBillingForm({ req: req, paymentForm: paymentForm, viewData: viewData });

    return {
        error: false,
        viewData: viewData
    };
}

exports.processForm = processForm;
