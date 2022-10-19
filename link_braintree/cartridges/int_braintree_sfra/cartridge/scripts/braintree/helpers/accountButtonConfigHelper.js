'use strict';

var Site = require('dw/system/Site').getCurrent();
var Resource = require('dw/web/Resource');

var btBusinessLogic = require('~/cartridge/scripts/braintree/braintreeAPI/braintreeBusinessLogic');
var prefs = require('~/cartridge/config/braintreePreferences');
var {
    createSRCImageUrl
} = require('~/cartridge/scripts/braintree/helpers/paymentHelper');
var braintreeConstants = require('~/cartridge/scripts/util/braintreeConstants');

var accountButtonConfigHelper = {};

/**
 * Creates general button config object for all payment methods
 * @param {string} paymentMethodName Payment Method name
 * @returns {Object} Button config object
 */
accountButtonConfigHelper.createGeneralButtonConfig = function (paymentMethodName) {
    var buttonConfig = {
        clientToken: btBusinessLogic.getClientToken(Site.getDefaultCurrency()),
        paymentMethodName: paymentMethodName,
        messages: {
            CLIENT_REQUEST_TIMEOUT: Resource.msg('braintree.error.CLIENT_REQUEST_TIMEOUT', 'locale', null),
            CLIENT_GATEWAY_NETWORK: Resource.msg('braintree.error.CLIENT_GATEWAY_NETWORK', 'locale', null),
            CLIENT_REQUEST_ERROR: Resource.msg('braintree.error.CLIENT_REQUEST_ERROR', 'locale', null),
            CLIENT_MISSING_GATEWAY_CONFIGURATION: Resource.msg('braintree.error.CLIENT_MISSING_GATEWAY_CONFIGURATION', 'locale', null)
        }
    };

    if (paymentMethodName === prefs.paymentMethods.BRAINTREE_GOOGLEPAY.paymentMethodId ||
        paymentMethodName === prefs.paymentMethods.BRAINTREE_SRC.paymentMethodId
    ) {
        buttonConfig.options = {
            amount: '0.00',
            isAccount: true
        };
    }

    return buttonConfig;
};

/**
* Creates config for PayPal button on Profile page
* @returns {Object} configuration object
*/
accountButtonConfigHelper.createPaypalAccountButtonConfig = function () {
    var config = accountButtonConfigHelper.createGeneralButtonConfig(prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId);
    var paypalMessages = {
        PAYPAL_ACCOUNT_TOKENIZATION_FAILED: Resource.msg('braintree.error.PAYPAL_ACCOUNT_TOKENIZATION_FAILED', 'locale', null),
        PAYPAL_INVALID_PAYMENT_OPTION: Resource.msg('braintree.error.PAYPAL_INVALID_PAYMENT_OPTION', 'locale', null),
        PAYPAL_FLOW_FAILED: Resource.msg('braintree.error.PAYPAL_FLOW_FAILED', 'locale', null),
        PAYPAL_BROWSER_NOT_SUPPORTED: Resource.msg('braintree.error.PAYPAL_BROWSER_NOT_SUPPORTED', 'locale', null)
    };

    // Sets paypal related messages
    for (var paypalMessage in paypalMessages) {
        config.messages[paypalMessage] = paypalMessages[paypalMessage];
    }

    config.options = {
        flow: braintreeConstants.FLOW_VAULT,
        enableShippingAddress: true,
        displayName: empty(prefs.paypalDisplayName) ? '' : prefs.paypalDisplayName,
        billingAgreementDescription: empty(prefs.paypalBillingAgreementDescription) ? '' : prefs.paypalBillingAgreementDescription
    };
    config.paypalConfig = {
        fundingSource: braintreeConstants.BUTTON_CONFIG_PAYPAL,
        style: {
            layout: braintreeConstants.BUTTON_CONFIG_OPTIONS_STYLE_LAYOUT_HORIZONTAL,
            label: braintreeConstants.BUTTON_CONFIG_PAYPAL,
            maxbuttons: 1,
            fundingicons: false,
            shape: braintreeConstants.BUTTON_CONFIG_OPTIONS_STYLE_SHAPE_RECT,
            size: braintreeConstants.BUTTON_CONFIG_OPTIONS_STYLE_SIZE_SMALL,
            tagline: false
        }
    };

    return config;
};

/**
 * Creates config for GooglePay button on Profile page
 * @returns {Object} configuration object
 */
accountButtonConfigHelper.createAccountGooglePayButtonConfig = function () {
    var config = accountButtonConfigHelper.createGeneralButtonConfig(prefs.paymentMethods.BRAINTREE_GOOGLEPAY.paymentMethodId);
    var googlePayOptions = {
        currency: prefs.currencyCode,
        displayName: prefs.googlepayDisplayName
    };

    for (var option in googlePayOptions) {
        config.options[option] = googlePayOptions[option];
    }

    config.messages.saving_paypal_account_error = Resource.msg('braintree.account.error.savingpaypalaccount', 'locale', null);

    return config;
};

/**
 * Creates config for Src button on Profile page
 * @returns {Object} configuration object
 */
accountButtonConfigHelper.createAccountSrcButtonConfig = function () {
    var config = accountButtonConfigHelper.createGeneralButtonConfig(prefs.paymentMethods.BRAINTREE_SRC.paymentMethodId);
    var srcOptions = {
        displayName: prefs.srcDisplayName,
        isShippingAddressRequired: false
    };
    var paymentSpecificConfigs = {
        SRCImageUrl: createSRCImageUrl(prefs.SRCImageLink, prefs.SRCAccountButtonConfig.style),
        settings: prefs.SRCAccountButtonConfig
    };

    for (var option in srcOptions) {
        config.options[option] = srcOptions[option];
    }

    for (var paymentConfig in paymentSpecificConfigs) {
        config[paymentConfig] = paymentSpecificConfigs[paymentConfig];
    }

    return config;
};

/**
* Creates config for Venmo button on Profile page
* @returns {Object} configuration object
*/
accountButtonConfigHelper.createAccountVenmoButtonConfig = function () {
    var config = accountButtonConfigHelper.createGeneralButtonConfig(prefs.paymentMethods.BRAINTREE_VENMO.paymentMethodId);
    var venmoMessages = {
        VENMO_ACCOUNT_TOKENIZATION_FAILED: Resource.msg('braintree.error.VENMO_ACCOUNT_TOKENIZATION_FAILED', 'locale', null),
        VENMO_BROWSER_NOT_SUPPORTED: Resource.msg('braintree.error.VENMO_BROWSER_NOT_SUPPORTED', 'locale', null)
    };
    config.venmoAccountPage = true;
    config.options = {
        flow: braintreeConstants.FLOW_VAULT,
        displayName: prefs.venmoDisplayName || ''
    };

    for (var message in venmoMessages) {
        config.messages[message] = venmoMessages[message];
    }

    return config;
};

module.exports = accountButtonConfigHelper;
