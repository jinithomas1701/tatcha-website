'use strict';

var braintreeApiCalls = require('~/cartridge/scripts/braintree/braintreeAPI/braintreeApiCalls');
var { getApplicableCreditCardPaymentInstruments } = require('~/cartridge/scripts/braintree/helpers/paymentHelper');
var { find } = require('*/cartridge/scripts/util/array');

var controllerBase = {};

controllerBase.getPaymentMethodNonceByUUID = function (uuid) {
    var customerPaymentInstruments = getApplicableCreditCardPaymentInstruments();
    var token = find(customerPaymentInstruments, function (payment) {
        return uuid === payment.UUID;
    }).creditCardToken;

    if (!token) {
        require('~/cartridge/scripts/braintree/helpers/paymentHelper').getLogger().error(new Error('No token find for given uuid: ' + uuid));
        return null;
    }

    return braintreeApiCalls.getNonceFromToken(token);
};

module.exports = controllerBase;
