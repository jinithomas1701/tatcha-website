'use strict';
/* global dw customer */

var Transaction = require('dw/system/Transaction');
var BraintreeHelper = require('~/cartridge/scripts/braintree/braintreeHelper');

var controllerBase = {};

controllerBase.getPaymentMethodNonceByUUID = function (uuid) {
    var currentCustomerProfile = customer.getProfile();
    var customerPaymentInstruments = currentCustomerProfile.getWallet().getPaymentInstruments(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);
    var token = null;

    var iterator = customerPaymentInstruments.iterator();
    var paymentInst = null;
    while (iterator.hasNext()) {
        paymentInst = iterator.next();
        if (paymentInst.getUUID() === uuid) {
            if (paymentInst.custom.braintreePaymentMethodToken) {
                token = paymentInst.custom.braintreePaymentMethodToken;
            } else {
                token = paymentInst.creditCardToken;
                Transaction.wrap(function () { // eslint-disable-line no-loop-func
                    paymentInst.custom.braintreePaymentMethodToken = token;
                });
            }
            break;
        }
    }

    if (!token) {
        BraintreeHelper.getLogger().error(new Error('No token find for given uuid: ' + uuid));
    }

    var responseData = null;
    try {
        responseData = BraintreeHelper.call({
            xmlType: 'empty',
            requestPath: 'payment_methods/' + token + '/nonces'
        });
    } catch (error) {
        BraintreeHelper.getLogger().error(error);
    }

    return responseData && responseData.hasOwnProperty('paymentMethodNonce') ? responseData.paymentMethodNonce.nonce : null; // eslint-disable-line no-prototype-builtins
};

module.exports = controllerBase;
