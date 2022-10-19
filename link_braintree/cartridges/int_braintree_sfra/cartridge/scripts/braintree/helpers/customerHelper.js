'use strict';

var Transaction = require('dw/system/Transaction');
var Site = require('dw/system/Site');
var CustomerMgr = require('dw/customer/CustomerMgr');
var { find } = require('*/cartridge/scripts/util/array');

var prefs = require('~/cartridge/config/braintreePreferences');

var customerHelper = {};

/**
 * Get customer payment instrument by uuid
 * @param {string} uuid uuid for PI
 * @return {dw.customer.CustomerPaymentInstrument} cutomet payment indstrument
 */
customerHelper.getCustomerPaymentInstrument = function (uuid) {
    if (!customer.authenticated) {
        return false;
    }

    var customerPaymentInstruments = customer.getProfile().getWallet().getPaymentInstruments();
    var instrument = null;

    if (uuid === null || customerPaymentInstruments === null || customerPaymentInstruments.size() < 1) {
        return false;
    }

    var instrumentsIter = customerPaymentInstruments.iterator();

    while (instrumentsIter.hasNext()) {
        instrument = instrumentsIter.next();
        if (uuid.equals(instrument.UUID)) {
            return instrument;
        }
    }

    return false;
};

/**
 * Return stored PayPal payment instrument by UUID.
 * This method only used for checkout flow.
 * @param {dw.web.HttpParameterMap} httpParameterMap needed for extracting of payment instrument uuid
 * @returns {dw.customer.CustomerPaymentInstrument} or false is returned
 */
customerHelper.getSavedPayPalPaymentInstrumentByUUID = function (httpParameterMap) {
    var paymentMethodFromCart = httpParameterMap.paymentMethodUUID.stringValue;
    var paymentMethodFromBillingPage = httpParameterMap.braintreePaypalAccountList.stringValue;
    var paymentMethodUUID = paymentMethodFromCart || paymentMethodFromBillingPage;

    if (!customer.authenticated) {
        return false;
    }

    return customerHelper.getCustomerPaymentInstrument(paymentMethodUUID);
};

/**
 * Return specific payment method from customers payment methods list
 * @param {string} paymentMethodName Name of the payment method
 * @param {string} customerId Customer id
 * @return {Object} Payment method from customers payment methods list
 */
customerHelper.getCustomerPaymentInstruments = function (paymentMethodName, customerId) {
    var profile = null;

    if (customerId) {
        profile = CustomerMgr.getProfile(customerId.indexOf('_') >= 0 ? customerId.split('_')[1] : customerId);
    } else {
        profile = customer.authenticated ? customer.getProfile() : null;
    }

    if (!profile) {
        return null;
    }

    return profile.getWallet().getPaymentInstruments(paymentMethodName);
};

/**
 * Get default customer PayPal payment instrument
 * @param {string} customerId Braintree customer id or dw cusomer id. If customer id is null, returns payment instruments of current customer
 * @return {dw.customer.CustomerPaymentInstrument} payment instrument
 */
customerHelper.getDefaultCustomerPaypalPaymentInstrument = function (customerId) {
    var instruments = customerHelper.getCustomerPaymentInstruments(prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId, customerId);

    if (!instruments) {
        return null;
    }

    var iterator = instruments.iterator();
    var instrument = null;

    while (iterator.hasNext()) {
        instrument = iterator.next();
        if (instrument.custom.braintreeDefaultCard) {
            return instrument;
        }
    }

    return instruments.length > 0 && instruments[0];
};

/**
 * Get saved PayPal customer payment method instrument
 * @param {string} email PayPal account email
 * @return {dw.util.Collection} payment instruments
 */
customerHelper.getPaypalCustomerPaymentInstrumentByEmail = function (email) {
    var customerPaymentInstruments = customerHelper.getCustomerPaymentInstruments(prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId);

    if (empty(customerPaymentInstruments)) {
        return null;
    }

    var iterator = customerPaymentInstruments.iterator();
    var paymentInst = null;

    while (iterator.hasNext()) {
        paymentInst = iterator.next();
        if (paymentInst.custom.braintreePaypalAccountEmail === email) {
            return paymentInst;
        }
    }

    return null;
};

/**
 * Create customer ID for braintree based on the customer number
 * @param {dw.customer.Customer} customer  Registered customer object
 * @return {string} Customer ID
 */
customerHelper.createCustomerId = function (customer) {
    if (session.privacy.customerId) {
        return session.privacy.customerId;
    }

    var id = customer.getProfile().getCustomerNo();
    /*var siteName = Site.getCurrent().getID().toLowerCase();
    var allowNameLength = 31 - id.length;

    if (siteName.length > allowNameLength) {
        siteName = siteName.slice(0, allowNameLength);
    }

    siteName = siteName + '_' + id;*/
    session.privacy.customerId = id;

    return id;
};

/**
 * Get saved Venmo customer payment method instrument
 * @param {string} userId venmo
 * @return {dw.util.Collection} payment instruments
 */
customerHelper.getVenmoCustomerPaymentInstrumentByUserID = function (userId) {
    var customerPaymentInstruments = customerHelper.getCustomerPaymentInstruments(prefs.paymentMethods.BRAINTREE_VENMO.paymentMethodId);

    if (customerPaymentInstruments) {
        var iterator = customerPaymentInstruments.iterator();
        var paymentInst = null;

        while (iterator.hasNext()) {
            paymentInst = iterator.next();
            if (paymentInst.custom.braintreeVenmoUserId === userId) {
                return paymentInst;
            }
        }
    }

    return null;
};

/**
 * @param  {dw.customer.Profile} profile Customer profile
 * @returns {string} Phone number
 */
customerHelper.getPhoneFromProfile = function (profile) {
    return profile.getPhoneMobile() || profile.getPhoneHome() || profile.getPhoneBusiness();
};

/**
 * Clear default property
 * applicablePI - applicable Payment Instruments
 * @param {array} applicablePI of existed payment instruments
 * @return {Object} default PI property or {}
 */
customerHelper.clearDefaultProperty = function (applicablePI) {
    if (empty(applicablePI)) return {};

    var defaultPI = find(applicablePI, function (pi) {
        return pi.custom.braintreeDefaultCard;
    });

    if (defaultPI) {
        Transaction.wrap(function () {
            defaultPI.custom.braintreeDefaultCard = false;
        });

        return defaultPI;
    }

    return {};
};

/**
 * Set braintreeDefaultCard as true for following paymentMethods:
 * -CreditCart
 * -PayPal
 * -Venmo
 * -GooglePay
 * -SRC
 *
 * @param {string} paymentMethodToken token from Braintree
 */
customerHelper.setBraintreeDefaultCard = function (paymentMethodToken) {
    var savedPaymentInstruments = customer.getProfile().getWallet().getPaymentInstruments();

    Transaction.wrap(function () {
        find(savedPaymentInstruments, function (payment) {
            return paymentMethodToken === payment.creditCardToken;
        }).custom.braintreeDefaultCard = true;
    });
};

/**
* Create Preferred Address for customer
* @param {Object} payerInfo payerInfo object
* @param  {string} shippingDataString stringified address data
*/
customerHelper.createPreferredAddress = function (payerInfo, shippingDataString) {
    var addressHelpers = require('*/cartridge/scripts/helpers/addressHelpers');
    var addressBook = customer.getProfile().getAddressBook();
    var shippingData = JSON.parse(shippingDataString);
    shippingData.firstName = payerInfo.firstName;
    shippingData.lastName = payerInfo.lastName;
    shippingData.phone = payerInfo.phoneNumber;
    shippingData.address1 = shippingData.line1;
    shippingData.address2 = shippingData.line2;
    shippingData.country = shippingData.countryCode;
    shippingData.states = { stateCode: shippingData.state };

    var address = addressBook.createAddress(shippingData.address1 + ' - ' + shippingData.city + ' - ' + shippingData.postalCode);
    addressHelpers.updateAddressFields(address, shippingData);
    addressBook.setPreferredAddress(address);
};

/**
 * Defines which customer id to use
 * @param {dw.customer.Customer} customer Customer object
 * @return {string} customer id
 */
customerHelper.getCustomerId = function (customer) {
    return customer.profile.custom.braintreeCustomerId || customerHelper.createCustomerId(customer);
};

module.exports = customerHelper;
