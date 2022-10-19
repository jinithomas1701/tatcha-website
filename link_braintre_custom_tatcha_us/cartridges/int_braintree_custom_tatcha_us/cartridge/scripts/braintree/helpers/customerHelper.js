'use strict';
var base = module.superModule;
var Transaction = require('dw/system/Transaction');
var Site = require('dw/system/Site');
var CustomerMgr = require('dw/customer/CustomerMgr');
var { find } = require('*/cartridge/scripts/util/array');

var prefs = require('*/cartridge/config/braintreePreferences');

/**
 * Create customer ID for braintree based on the customer number
 * @param {dw.customer.Customer} customer  Registered customer object
 * @return {string} Customer ID
 */
base.createCustomerId = function (customer) {
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
 * Return specific payment method from customers payment methods list
 * @param {string} paymentMethodName Name of the payment method
 * @param {string} customerId Customer id
 * @return {Object} Payment method from customers payment methods list
 */
base.getCustomerPaymentInstruments = function (paymentMethodName, customerId) {
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

module.exports = base;
