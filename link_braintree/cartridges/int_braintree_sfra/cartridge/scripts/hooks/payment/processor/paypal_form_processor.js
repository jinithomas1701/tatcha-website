'use strict';

var {
    getCustomerPaymentInstrument,
    getSavedPayPalPaymentInstrumentByUUID
} = require('~/cartridge/scripts/braintree/helpers/customerHelper');
var {
    createPreferredAddressObj,
    updateShippingAddress,
    getBillingAddressFromStringValue
} = require('~/cartridge/scripts/hooks/payment/processor/processorHelper');
var {
    getAmountPaid,
    isSavedPaypalMethod
} = require('~/cartridge/scripts/braintree/helpers/paymentHelper');

/**
 * Gets email from Billing Checkout
 *
 * @param {Object} paymentForm - the payment form
 * @returns {string}  Current email
 */
function getEmail(paymentForm) {
    return isSavedPaypalMethod(request.httpParameterMap) ?
        // Customer saved account email
        getCustomerPaymentInstrument(request.httpParameterMap.braintreePaypalAccountList.value).custom.braintreePaypalAccountEmail :
        // Storefront Billing email
        paymentForm.contactInfoFields.email.value;
}

/**
 * Getting Preferred Shipping Address, Checkout from Cart scenario
 *
 * if user has default shipping info on store and saved PayPal account,
 * then use default shipping info from store otherwise use shipping from PayPal
 *
 * @param {Object} req the request object
 * @returns {Object} an object that has customer shipping address
 */
function getPreferredShippingAddress(req) {
    var customerdPPAddress = req.httpParameterMap.braintreePaypalShippingAddress.stringValue;
    var customerPreferredAddress;
    if (!customer.authenticated) {
        // shipping from PayPal
        return customerdPPAddress;
    }

    customerPreferredAddress = customer.getProfile().getAddressBook();
    return (customerPreferredAddress && customerPreferredAddress.getPreferredAddress()) ?
        // shipping from store
        createPreferredAddressObj(customerPreferredAddress.getPreferredAddress()) :
        // shipping from PayPal
        customerdPPAddress;
}

/**
 * Update Billing Form
 *
 * Checkout scenarios: PDP, Minicart, Cart, Billing page
 *
 * Authenticated scenario
 *      - Saved Billing data
 *      - New PayPal account (new billing data)
 *
 * Unauthenticated scenario
 *      - New PayPal account (new billing data)
 *
 * @param {Object} data req, paymentForm, viewFormData
 * @returns {boolean} true\false
 */
function updateBillingForm(data) {
    var httpParameterMap = data.req.httpParameterMap;
    var customerPaymentInstrument = null;
    var billingAddressToUpdate = null;
    var newPpBillingAddress = getBillingAddressFromStringValue(httpParameterMap.braintreePaypalBillingAddress.stringValue);

    // new PP account scenario
    if (newPpBillingAddress) {
        billingAddressToUpdate = newPpBillingAddress;

        // scenario only for Auntificated buyers
    } else if (customer.authenticated) {
        // stored PayPal account scenario
        customerPaymentInstrument = getSavedPayPalPaymentInstrumentByUUID(httpParameterMap);

        if (customerPaymentInstrument) {
            billingAddressToUpdate = JSON.parse(customerPaymentInstrument.custom.braintreePaypalAccountAddresses);
        }
    }

    // do not update billing address for cases when "Billing use case" and buyer go with new PP account and try to write a new billing address (session account scenario)
    if (!billingAddressToUpdate) {
        return false;
    }

    data.viewData.address = {
        firstName: { value: billingAddressToUpdate.firstName },
        lastName: { value: billingAddressToUpdate.lastName },
        address1: { value: billingAddressToUpdate.streetAddress },
        address2: { value: billingAddressToUpdate.extendedAddress || '' },
        city: { value: billingAddressToUpdate.locality },
        postalCode: { value: billingAddressToUpdate.postalCode },
        countryCode: { value: billingAddressToUpdate.countryCodeAlpha2 },
        stateCode: { value: billingAddressToUpdate.region }
    };
    data.viewData.phone = {
        value: billingAddressToUpdate.phone
    };
    data.viewData.email = {
        value: billingAddressToUpdate.email || getEmail(data.paymentForm)
    };

    return true;
}

/**
 * PayPal form processor:
 * - Validating basket amount
 * - Updating Shipping Address (only from Cart Checkout)
 * - Adding paymentMethod & email to viewData
 * - Updating Billing Form
 *
 * @param {Object} req the request object
 * @param {Object} paymentForm - the payment form
 * @param {Object} viewFormData - object contains billing form data
 * @returns {Object} an object that has payment information
 */
function processForm(req, paymentForm, viewFormData) {
    var BasketMgr = require('dw/order/BasketMgr');
    var Resource = require('dw/web/Resource');
    var currentBasket = BasketMgr.getCurrentBasket();
    var currentBasketAmount = getAmountPaid(currentBasket).value;
    var fromCart = (req.querystring || {}).fromCart;
    var viewData = viewFormData;
    var usingMultiShipping = false; // Current integration support only single shpping
    req.session.privacyCache.set('usingMultiShipping', usingMultiShipping);

    if (currentBasketAmount === 0) {
        // respond with custom PP error
        return {
            fieldErrors: [],
            serverErrors: [Resource.msg('error.paypal.zeroamount', 'error', null)],
            error: true
        };
    }

    viewData.paymentMethod = {
        value: paymentForm.paymentMethod.value
    };

    // Shipping handling
    if (fromCart) {
        updateShippingAddress(getPreferredShippingAddress(req), currentBasket.getDefaultShipment());
    }

    // Handle Billing Form
    updateBillingForm({ req: req, paymentForm: paymentForm, viewData: viewData });

    return {
        error: false,
        viewData: viewData
    };
}

exports.processForm = processForm;
