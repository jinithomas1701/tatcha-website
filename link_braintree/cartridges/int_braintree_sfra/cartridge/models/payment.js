var base = module.superModule;

var collections = require('*/cartridge/scripts/util/collections');

/**
 * Creates an array of objects containing selected payment information
 * @param {dw.util.ArrayList<dw.order.PaymentInstrument>} selectedPaymentInstruments - ArrayList
 *      of payment instruments that the user is using to pay for the current basket
 * @returns {Array} Array of objects that contain information about the selected payment instruments
 */
function getSelectedPaymentInstruments(selectedPaymentInstruments) {
    return collections.map(selectedPaymentInstruments, function (paymentInstrument) {
        var results = {
            paymentMethod: paymentInstrument.paymentMethod,
            amount: paymentInstrument.paymentTransaction.amount.value
        };

        switch (paymentInstrument.paymentMethod) {
            case 'GIFT_CERTIFICATE':
                results.giftCertificateCode = paymentInstrument.giftCertificateCode;
                results.maskedGiftCertificateCode = paymentInstrument.maskedGiftCertificateCode;
                break;
            case 'GooglePay':
                results.maskedCreditCardNumber = paymentInstrument.maskedCreditCardNumber || paymentInstrument.custom.braintreeGooglePayCardDescription;
                results.type = paymentInstrument.creditCardType;
                break;
            case 'SRC':
                results.maskedCreditCardNumber = paymentInstrument.maskedCreditCardNumber || paymentInstrument.custom.braintreeSrcCardDescription;
                results.type = paymentInstrument.creditCardType;
                break;
            case 'PayPal':
                results.braintreePaypalEmail = paymentInstrument.custom.braintreePaypalEmail;
                break;
            case 'Venmo':
                results.braintreeVenmoUserId = paymentInstrument.custom.braintreeVenmoUserId;
                break;
            default:
                results.lastFour = paymentInstrument.creditCardNumberLastDigits;
                results.owner = paymentInstrument.creditCardHolder;
                results.expirationYear = paymentInstrument.creditCardExpirationYear;
                results.type = paymentInstrument.creditCardType;
                results.maskedCreditCardNumber = paymentInstrument.maskedCreditCardNumber;
                results.expirationMonth = paymentInstrument.creditCardExpirationMonth;
        }

        return results;
    });
}

 /**
 * @constructor
 * @classdesc Payment class that represents payment information for the current basket
 *
 * @param {dw.order.Basket} currentBasket - the target Basket object
 * @param {dw.customer.Customer} currentCustomer - the associated Customer object
 * @param {string} countryCode - the associated Site countryCode
 * @constructor
 */
function Payment(currentBasket, currentCustomer, countryCode) {
    base.call(this, currentBasket, currentCustomer, countryCode);

    var paymentInstruments = currentBasket.paymentInstruments;
    this.selectedPaymentInstruments = paymentInstruments ?
        getSelectedPaymentInstruments(paymentInstruments) : null;
}

module.exports = Payment;
