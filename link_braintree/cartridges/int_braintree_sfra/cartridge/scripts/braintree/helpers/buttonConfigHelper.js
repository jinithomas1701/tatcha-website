'use strict';

var Site = require('dw/system/Site');
var URLUtils = require('dw/web/URLUtils');
var Resource = require('dw/web/Resource');

var prefs = require('~/cartridge/config/braintreePreferences');
var {
    addDefaultShipping,
    getAmountPaid,
    createSRCImageUrl
} = require('~/cartridge/scripts/braintree/helpers/paymentHelper');
var braintreeConstants = require('~/cartridge/scripts/util/braintreeConstants');

var buttonConfigHelper = {};

/**
 * Creates general button config object for all payment methods
 * @param {dw.order.BasketMgr} basket Basket Object
 * @param {string} clientToken Braintree clientToken
 * @returns {Object} Button config object
 */
buttonConfigHelper.createGeneralButtonConfig = function (basket, clientToken) {
    var amount = getAmountPaid(basket);
    var sessionCurrency = request.session.currency.currencyCode;
    var currency = amount.valueOrNull === null ? sessionCurrency : amount.getCurrencyCode();
    var buttonConfig = {
        clientToken: clientToken,
        messages: {
            CLIENT_REQUEST_TIMEOUT: Resource.msg('braintree.error.CLIENT_REQUEST_TIMEOUT', 'locale', null),
            CLIENT_GATEWAY_NETWORK: Resource.msg('braintree.error.CLIENT_GATEWAY_NETWORK', 'locale', null),
            CLIENT_REQUEST_ERROR: Resource.msg('braintree.error.CLIENT_REQUEST_ERROR', 'locale', null),
            CLIENT_MISSING_GATEWAY_CONFIGURATION: Resource.msg('braintree.error.CLIENT_MISSING_GATEWAY_CONFIGURATION', 'locale', null)
        },
        options: {
            amount: parseFloat(amount.getValue()),
            currency: currency
        },
        getOrderInfoUrl: URLUtils.url('Braintree-GetOrderInfo').toString()
    };

    return buttonConfig;
};

/**
* Creates config button object for paypal
* @param {Basket} basket Basket Object
* @param {string} clientToken Braintree clientToken
* @param {string} currentFlow Name of flow that called the method
* @returns {Object} button config object
*/
buttonConfigHelper.createBraintreePayPalButtonConfig = function (basket, clientToken, currentFlow) {
    var locale = Site.getCurrent().getDefaultLocale();
    var displayName = empty(prefs.paypalDisplayName) ? '' : prefs.paypalDisplayName;
    var billingAgreementDescription = empty(prefs.paypalBillingAgreementDescription) ? '' : prefs.paypalBillingAgreementDescription;
    var paypalMessages = {
        PAYPAL_ACCOUNT_TOKENIZATION_FAILED: Resource.msg('braintree.error.PAYPAL_ACCOUNT_TOKENIZATION_FAILED', 'locale', null),
        PAYPAL_INVALID_PAYMENT_OPTION: Resource.msg('braintree.error.PAYPAL_INVALID_PAYMENT_OPTION', 'locale', null),
        PAYPAL_FLOW_FAILED: Resource.msg('braintree.error.PAYPAL_FLOW_FAILED', 'locale', null),
        PAYPAL_BROWSER_NOT_SUPPORTED: Resource.msg('braintree.error.PAYPAL_BROWSER_NOT_SUPPORTED', 'locale', null)
    };
    var paymentSpecificConfigs = {
        paymentMethodName: prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId,
        paypalConfig: prefs.paypalBillingButtonConfig,
        isFraudToolsEnabled: prefs.isPaypalFraudToolsEnabled,
        paypalHandle: prefs.checkoutFromCartUrl,
        redirectUrl: URLUtils.url('Checkout-Begin', 'stage', 'placeOrder').toString()
    };
    var braintreePaypalButtonConfig = buttonConfigHelper.createGeneralButtonConfig(basket, clientToken);
    var flow = braintreeConstants.FLOW_CHECKOUT;
    var intent = prefs.paypalIntent;

    if (prefs.vaultMode) {
        flow = braintreeConstants.FLOW_VAULT;
    }

    if (prefs.paypalOrderIntent) {
        intent = braintreeConstants.INTENT_TYPE_ORDER;
        flow = braintreeConstants.FLOW_CHECKOUT;
    }

    var paypalOptions = {
        flow: flow,
        intent: intent,
        locale: locale,
        enableShippingAddress: true,
        billingAgreementDescription: billingAgreementDescription,
        displayName: displayName
    };

    for (var config in paymentSpecificConfigs) {
        braintreePaypalButtonConfig[config] = paymentSpecificConfigs[config];
    }

    // Sets paypal related messages
    for (var paypalMessage in paypalMessages) {
        braintreePaypalButtonConfig.messages[paypalMessage] = paypalMessages[paypalMessage];
    }

    // Sets paypal related options
    for (var paypalOption in paypalOptions) {
        braintreePaypalButtonConfig.options[paypalOption] = paypalOptions[paypalOption];
    }

    if (prefs.isSettle && !prefs.paypalOrderIntent) {
        braintreePaypalButtonConfig.options.useraction = braintreeConstants.BUTTON_CONFIG_OPTIONS_USERACTION_COMMIT;
    }

    if (currentFlow !== braintreeConstants.FLOW_CHECKOUT) {
        var paypalConfig = prefs.paypalCartButtonConfig;
        braintreePaypalButtonConfig.paypalConfig = paypalConfig;
        braintreePaypalButtonConfig.options.style = {
            layout: braintreeConstants.BUTTON_CONFIG_OPTIONS_STYLE_LAYOUT_HORIZONTAL,
            label: braintreeConstants.BUTTON_CONFIG_PAYPAL,
            maxbuttons: 1,
            fundingicons: false,
            shape: braintreeConstants.BUTTON_CONFIG_OPTIONS_STYLE_SHAPE_RECT,
            size: braintreeConstants.BUTTON_CONFIG_OPTIONS_STYLE_SIZE_MEDIUM,
            tagline: false
        };

        addDefaultShipping(basket);
    }

    return braintreePaypalButtonConfig;
};

/**
* Creates config button object for Apple Pay
* @param {Basket} basket Basket object
* @param {string} clientToken Braintree clientToken
* @param {string} currentFlow Name of flow that called the method
* @returns {Object} button config object
*/
buttonConfigHelper.createBraintreeApplePayButtonConfig = function (basket, clientToken, currentFlow) {
    var applePayButtonConfig = buttonConfigHelper.createGeneralButtonConfig(basket, clientToken);
    var paymentSpecificConfigs = {
        paymentMethodName: prefs.paymentMethods.BRAINTREE_APPLEPAY.paymentMethodId,
        isFraudToolsEnabled: prefs.isPaypalFraudToolsEnabled
    };

    if (currentFlow === braintreeConstants.FLOW_CART) {
        addDefaultShipping(basket);
    }

    for (var config in paymentSpecificConfigs) {
        applePayButtonConfig[config] = paymentSpecificConfigs[config];
    }

    applePayButtonConfig.options.displayName = prefs.applepayDisplayName;

    return applePayButtonConfig;
};

/**
* Creates config button object for Venmo
* @param {Basket} basket Basket object
* @param {string} clientToken Braintree clientToken
* @returns {Object} button config object
*/
buttonConfigHelper.createBraintreeVenmoButtonConfig = function (basket, clientToken) {
    var venmoButtonConfig = buttonConfigHelper.createGeneralButtonConfig(basket, clientToken);
    venmoButtonConfig.paymentMethodName = prefs.paymentMethods.BRAINTREE_VENMO.paymentMethodId;
    venmoButtonConfig.options.displayName = prefs.venmoDisplayName;

    return venmoButtonConfig;
};

/**
* Creates config button object for LPM
* @param {Basket} basket Basket object
* @param {string} clientToken Braintree clientToken
* @returns {Object} button config object
*/
buttonConfigHelper.createBraintreeLocalPaymentMethodButtonConfig = function (basket, clientToken) {
    var localPaymentMethodButtonConfig = buttonConfigHelper.createGeneralButtonConfig(basket, clientToken);
    var paymentSpecificConfigs = {
        paymentMethodName: prefs.paymentMethods.BRAINTREE_LOCAL.paymentMethodIds,
        paymentConfirmUrl: URLUtils.url('Braintree-PaymentConfirm').toString(),
        fallbackUrl: URLUtils.https('Braintree-FallbackProcess').toString()
    };

    for (var config in paymentSpecificConfigs) {
        localPaymentMethodButtonConfig[config] = paymentSpecificConfigs[config];
    }

    localPaymentMethodButtonConfig.options.displayName = '';

    return localPaymentMethodButtonConfig;
};

/**
* Creates config button object for Google Pay
* @param {Basket} basket Basket object
* @param {string} clientToken Braintree clientToken
* @param {string} currentFlow Name of flow that called the method
* @returns {Object} button config object
*/
buttonConfigHelper.createBraintreeGooglePayButtonConfig = function (basket, clientToken, currentFlow) {
    var googlepayButtonConfig = buttonConfigHelper.createGeneralButtonConfig(basket, clientToken);
    var paymentSpecificConfigs = {
        paymentMethodName: prefs.paymentMethods.BRAINTREE_GOOGLEPAY.paymentMethodId,
        isFraudToolsEnabled: prefs.isFraudToolsEnabled
    };
    var googlePayOptions = {
        displayName: prefs.googlepayDisplayName,
        isShippingAddressRequired: currentFlow === braintreeConstants.FLOW_CART
    };

    for (var config in paymentSpecificConfigs) {
        googlepayButtonConfig[config] = paymentSpecificConfigs[config];
    }

    for (var option in googlePayOptions) {
        googlepayButtonConfig.options[option] = googlePayOptions[option];
    }

    return googlepayButtonConfig;
};

/**
* Creates config button object for Src
* @param {Basket} basket Basket object
* @param {string} clientToken Braintree clientToken
* @param {string} currentFlow Name of flow that called the method
* @returns {Object} button config object
*/
buttonConfigHelper.createBraintreeSrcButtonConfig = function (basket, clientToken, currentFlow) {
    var srcButtonConfig = buttonConfigHelper.createGeneralButtonConfig(basket, clientToken);
    var buttonSettings = currentFlow !== braintreeConstants.FLOW_CHECKOUT ?
    prefs.SRCCartButtonConfig : prefs.SRCBillingButtonConfig;
    var paymentSpecificConfigs = {
        paymentMethodName: prefs.paymentMethods.BRAINTREE_SRC.paymentMethodId,
        isFraudToolsEnabled: prefs.isFraudToolsEnabled,
        SRCImageUrl: createSRCImageUrl(prefs.SRCImageLink, buttonSettings),
        settings: buttonSettings
    };

    for (var config in paymentSpecificConfigs) {
        srcButtonConfig[config] = paymentSpecificConfigs[config];
    }

    srcButtonConfig.options.isShippingAddressRequired = currentFlow === braintreeConstants.FLOW_CART;

    if (currentFlow === braintreeConstants.FLOW_CART) {
        srcButtonConfig.options.displayName = prefs.srcDisplayName;
    } else {
        srcButtonConfig.isNeedHideContinueButton = true;
    }

    return srcButtonConfig;
};

module.exports = buttonConfigHelper;
