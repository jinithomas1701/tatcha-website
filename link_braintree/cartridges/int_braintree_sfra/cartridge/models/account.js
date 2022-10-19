'use strict';
var account = module.superModule;
var URLUtils = require('dw/web/URLUtils');

account.getCustomerPaymentInstruments = function (userPaymentInstruments) {
    var result = null;
    var paymentInstruments = userPaymentInstruments.toArray().map(function (paymentInstrument) {
        if (paymentInstrument.custom.braintreePaypalAccountEmail) {
            result = {
                email: paymentInstrument.custom.braintreePaypalAccountEmail,
                address: paymentInstrument.custom.braintreePaypalAccountAddresses,
                UUID: paymentInstrument.UUID,
                isDefault: paymentInstrument.custom.braintreeDefaultCard
            };
        } else if (paymentInstrument.custom.braintreeVenmoUserId) {
            result = {
                userID: paymentInstrument.custom.braintreeVenmoUserId,
                UUID: paymentInstrument.UUID,
                isDefault: paymentInstrument.custom.braintreeDefaultCard };
        } else if (paymentInstrument.custom.braintreeGooglePayCustomerId) {
            result = {
                maskedCreditCardNumber: paymentInstrument.maskedCreditCardNumber,
                creditCardType: paymentInstrument.creditCardType,
                creditCardExpirationMonth: paymentInstrument.creditCardExpirationMonth,
                creditCardExpirationYear: paymentInstrument.creditCardExpirationYear,
                UUID: paymentInstrument.UUID,
                isDefault: paymentInstrument.custom.braintreeDefaultCard
            };
        } else {
            result = {
                creditCardHolder: paymentInstrument.creditCardHolder,
                maskedCreditCardNumber: paymentInstrument.maskedCreditCardNumber,
                creditCardType: paymentInstrument.creditCardType,
                creditCardExpirationMonth: paymentInstrument.creditCardExpirationMonth,
                creditCardExpirationYear: paymentInstrument.creditCardExpirationYear,
                UUID: paymentInstrument.UUID,
                isDefault: paymentInstrument.custom.braintreeDefaultCard,
                braintreeIsCard: true
            };
            result.cardTypeImage = {
                src: URLUtils.staticURL('/images/' +
                    paymentInstrument.creditCardType.toLowerCase().replace(/\s/g, '') +
                    '-dark.svg'),
                alt: paymentInstrument.creditCardType
            };
        }

        return result;
    });

    return paymentInstruments;
};

module.exports = account;
