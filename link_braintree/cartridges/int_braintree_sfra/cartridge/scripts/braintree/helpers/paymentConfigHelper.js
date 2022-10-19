'use strict';

var prefs = require('~/cartridge/config/braintreePreferences');
var {
    getApplicableCreditCardPaymentInstruments
} = require('~/cartridge/scripts/braintree/helpers/paymentHelper');
var {
    getCustomerPaymentInstruments
} = require('~/cartridge/scripts/braintree/helpers/customerHelper');
var paymentConfigHelper = {};

/**
 * Checks if payment method is default on customer level
 * @param {dw.customer.CustomerPaymentInstrument} customerPaymentInstruments Customer payment instrument
 * @returns {boolean} Indicates whether card is default or not
 */
function isBraintreeDefaultCard(customerPaymentInstruments) {
    if (customer.authenticated && !empty(customerPaymentInstruments)) {
        var iterator = customerPaymentInstruments.iterator();
        var instrument = null;

        while (iterator.hasNext()) {
            instrument = iterator.next();

            if (instrument.custom.braintreeDefaultCard) {
                return true;
            }
        }

        return false;
    }

    return false;
}

/**
 * Creates general payment configs
 * @param {Object} paymentMethods Payment methods list
 * @returns {Object} Config object
 */
function createGeneralPaymentConfig(paymentMethods) {
    var isPaymentMethodsEmpty = empty(paymentMethods);
    var paymentConfigs = {
        braintreePaymentMethodNonce: !isPaymentMethodsEmpty ? paymentMethods[0].custom.braintreePaymentMethodNonce : '',
        newAccountSelected: true,
        isNeedHideContinueButton: isPaymentMethodsEmpty
    };

    return paymentConfigs;
}

/**
 * Creates config object for googlepay
 * @param {Array} paymentMethods Payment methods list
 * @returns {Object} googlepay config object
 */
paymentConfigHelper.createGooglepayConfig = function (paymentMethods) {
    var generalPaymentConfig = createGeneralPaymentConfig(paymentMethods);
    var isPaymentMethodsEmpty = empty(paymentMethods);
    var specificPaymentConfig = {
        braintreeGooglePayCardDescription: !isPaymentMethodsEmpty ? paymentMethods[0].custom.braintreeGooglePayCardDescription : '',
        isNeedHideGooglepayButton: !isPaymentMethodsEmpty,
        isSaveSessionAccount: !isPaymentMethodsEmpty ? paymentMethods[0].custom.braintreeSaveCreditCard : false
    };

    return Object.assign(generalPaymentConfig, specificPaymentConfig);
};

/**
 * Creates config object for Src
 * @param {Array} paymentMethods Payment methods list
 * @returns {Object} Src config object
 */
paymentConfigHelper.createSrcConfig = function (paymentMethods) {
    var isPaymentMethodsEmpty = empty(paymentMethods);
    var generalPaymentConfig = createGeneralPaymentConfig(paymentMethods);
    var specificPaymentConfig = {
        braintreeSrcCardDescription: !isPaymentMethodsEmpty ? paymentMethods[0].custom.braintreeSrcCardDescription : '',
        isSaveSessionAccount: !isPaymentMethodsEmpty ? paymentMethods[0].custom.braintreeSaveCreditCard : false
    };

    return Object.assign(generalPaymentConfig, specificPaymentConfig);
};

/**
* Creates config for credit card
* @param {Array} paymentMethods Payment methods
* @returns {Object} credit card config object
*/
paymentConfigHelper.createCreditCardConfig = function (paymentMethods) {
    var isPaymentMethodsEmpty = empty(paymentMethods);
    var paymentConfig = {
        sessionAccount: !isPaymentMethodsEmpty ? paymentMethods[0] : null,
        customerSavedCreditCards: [],
        newCardSelected: !isPaymentMethodsEmpty,
        braintreePaymentMethodNonce: !isPaymentMethodsEmpty ? paymentMethods[0].custom.braintreePaymentMethodNonce : ''
    };

    if (customer.authenticated) {
        paymentConfig.customerSavedCreditCards = getApplicableCreditCardPaymentInstruments();
        paymentConfig.newCardSelected = !paymentConfig.customerSavedCreditCards.some(function (card) {
            return card.custom.braintreeDefaultCard;
        });
    }

    return paymentConfig;
};

/**
* Creates config object for paypal
* @param {Array} paymentMethods Payment methods list
* @returns {Object} paypal config object
*/
paymentConfigHelper.createPaypalConfig = function (paymentMethods) {
    var generalPaymentConfig = createGeneralPaymentConfig(paymentMethods);
    var isPaymentMethodsEmpty = empty(paymentMethods);

    var specificPaymentConfig = {
        isShowCheckbox: customer.authenticated && prefs.vaultMode && !prefs.paypalOrderIntent,
        braintreePaypalEmail: !isPaymentMethodsEmpty ? paymentMethods[0].custom.braintreePaypalEmail : '',
        isSaveSessionAccount: !isPaymentMethodsEmpty ? paymentMethods[0].custom.braintreeSaveCreditCard : false,
        customerPaypalPaymentInstruments: getCustomerPaymentInstruments(prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId)
    };

    var isDefaultCard = isBraintreeDefaultCard(specificPaymentConfig.customerPaypalPaymentInstruments);

    if (isDefaultCard) {
        generalPaymentConfig.isNeedHideContinueButton = false;
        generalPaymentConfig.newAccountSelected = false;
    }

    return Object.assign(generalPaymentConfig, specificPaymentConfig);
};

/**
* Creates config object for venmo
* @param {Array} paymentMethods Payment methods list
* @returns {Object} venmo config object
*/
paymentConfigHelper.createVenmoConfig = function (paymentMethods) {
    var generalPaymentConfig = createGeneralPaymentConfig(paymentMethods);
    var isPaymentMethodsEmpty = empty(paymentMethods);

    var specificPaymentConfig = {
        braintreeVenmoUserId: !isPaymentMethodsEmpty ? paymentMethods[0].custom.braintreeVenmoUserId : '',
        isNeedHideVenmoButton: !isPaymentMethodsEmpty,
        customerVenmoPaymentInstruments: getCustomerPaymentInstruments(prefs.paymentMethods.BRAINTREE_VENMO.paymentMethodId)
    };

    var isDefaultCard = isBraintreeDefaultCard(specificPaymentConfig.customerPaypalPaymentInstruments);

    if (isDefaultCard) {
        generalPaymentConfig.isNeedHideContinueButton = false;
        generalPaymentConfig.newAccountSelected = false;
    }

    return Object.assign(generalPaymentConfig, specificPaymentConfig);
};

module.exports = paymentConfigHelper;
