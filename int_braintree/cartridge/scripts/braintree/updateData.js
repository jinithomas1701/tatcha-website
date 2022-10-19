'use strict';
/* global empty profile */

var CustomerMgr = require('dw/customer/CustomerMgr');
var Transaction = require('dw/system/Transaction');
var BraintreeHelper = require('~/cartridge/scripts/braintree/braintreeHelper');

/**
 * Perform actions after API call for some methods
 * @param {string} method Used API method
 * @param {Object} dataObject Request data for API call
 */
module.exports = function (method, dataObject) {
    if (method === 'removeCustomer' || method === 'bindCustomer') {
        var customerNumber = dataObject.customerId.substring(dataObject.customerId.indexOf('_') + 1);
        var customerProfile = CustomerMgr.getProfile(customerNumber);
        Transaction.wrap(function () {
            customerProfile.custom.isBraintree = method === 'bindCustomer';
        });
    } else if (method === 'updatePaymentMethod') {
        if (dataObject.deleteBillingAddress && dataObject.billingAddressId && dataObject.customerId) {
            BraintreeHelper.deleteBillingAddress(dataObject.customerId, dataObject.billingAddressId);
        }
    } else if (method === 'deletePaymentMethod' && !empty(dataObject.customerId)) {
        var customerPaymentInstruments = BraintreeHelper.getCustomerCrditCardPaymentInstruments(dataObject.customerId);
        var iterator = customerPaymentInstruments.iterator();
        var paymentInst = null;
        while (iterator.hasNext()) {
            paymentInst = iterator.next();
            if (dataObject.token === paymentInst.custom.braintreePaymentMethodToken) {
                try {
                    profile.getWallet().removePaymentInstrument(paymentInst);
                } catch (error) {
                    throw new Error(error);
                }
            }
        }
    }
};
