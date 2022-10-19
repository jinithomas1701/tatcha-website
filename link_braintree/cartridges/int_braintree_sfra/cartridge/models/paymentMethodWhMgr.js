var webHookInitModel = require('~/cartridge/models/webHookInit');
var { deletePaymentMethod } = require('~/cartridge/scripts/braintree/braintreeAPI/braintreeBusinessLogic');
var prefs = require('~/cartridge/config/braintreePreferences');
var array = require('*/cartridge/scripts/util/array');
var {
    setAndReturnNewDefaultCard
} = require('~/cartridge/scripts/braintree/helpers/paymentHelper');

var CustomerMgr = require('dw/customer/CustomerMgr');
var Resource = require('dw/web/Resource');

/**
 * paymentMethodWhMgr model
 */
function paymentMethodWhMgr() {
    webHookInitModel.apply(this, arguments);
}

paymentMethodWhMgr.prototype = Object.create(webHookInitModel.prototype);

/**
 * Deletes revoked payment method from storefront and braintree account when a customer canceled their PayPal billing agreement.
 * @param {Object} paypalAccount Customer paypal account
 */
paymentMethodWhMgr.prototype.deleteRevokedPaymentMethod = function (paypalAccount) {
    var customerId = paypalAccount.customerId;
    var customerProfile = CustomerMgr.queryProfile('custom.braintreeCustomerId = {0}', customerId);

    // Handles cases when customer was created by legacy API
    if (!customerProfile) {
        var customerNumber = customerId.substring(customerId.indexOf('_') + 1);
        customerProfile = CustomerMgr.queryProfile('customerNo = {0}', customerNumber);
    }

    // Handle cases when merchant removed storefront customer from business manager and buyer revoked billing agreement from its account
    if (!customerProfile) {
        throw new Error(Resource.msg('braintree.server.error.custom', 'locale', null));
    }

    var isPayPalAccountIsDefaultPayment = array.find(customerProfile.wallet.paymentInstruments, function (paymentInstrument) {
        return paymentInstrument.creditCardToken === paypalAccount.token;
    }).custom.braintreeDefaultCard;

    // Deletes revoked payment method from storefront and braintree account
    deletePaymentMethod({ payment: { creditCardToken: paypalAccount.token } }, customerProfile);

    // Sets new default paypal card
    if (isPayPalAccountIsDefaultPayment) {
        setAndReturnNewDefaultCard(prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId, customerProfile);
    }
};

module.exports = paymentMethodWhMgr;
