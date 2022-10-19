'use strict';

var page = module.superModule;
var Resource = require('dw/web/Resource');
var server = require('server');

var {
    createBraintreePayPalButtonConfig,
    createBraintreeApplePayButtonConfig,
    createBraintreeVenmoButtonConfig,
    createBraintreeLocalPaymentMethodButtonConfig,
    createBraintreeGooglePayButtonConfig,
    createBraintreeSrcButtonConfig
} = require('~/cartridge/scripts/braintree/helpers/buttonConfigHelper');

var {
    createGooglepayConfig,
    createSrcConfig,
    createCreditCardConfig,
    createPaypalConfig,
    createVenmoConfig
} = require('~/cartridge/scripts/braintree/helpers/paymentConfigHelper');

var {
    getAccountNameFields,
    createBillingFormFields
} = require('~/cartridge/scripts/braintree/helpers/paymentHelper');

var btBusinessLogic = require('~/cartridge/scripts/braintree/braintreeAPI/braintreeBusinessLogic');
var prefs = require('~/cartridge/config/braintreePreferences');
var braintreeConstants = require('~/cartridge/scripts/util/braintreeConstants');

/**
* Gets Array with SFRA Checkout, Form Fields Names
* @returns {Function} Array with valid checkout Form Fields Names
*/
function getSFRABillingFormFieldsNames() {
    return getAccountNameFields(createBillingFormFields(), {
        firstName: '',
        lastName: '',
        address1: '',
        address2: '',
        city: '',
        postalCode: '',
        stateCode: '',
        country: '',
        email: '',
        phone: ''
    });
}

/**
* Creates config Brantree hosted fields
* @param {Response} res Response system object
* @param {string} clientToken Braintree clientToken
* @returns {Object} hosted fields config object
*/
function createHostedFieldsConfig(res, clientToken) {
    var isEnable3dSecure = prefs.is3DSecureEnabled;
    var billingData = res.getViewData();
    var cardForm = billingData.forms.billingForm.creditCardFields;

    return {
        paymentMethodName: prefs.paymentMethods.BRAINTREE_CREDIT.paymentMethodId,
        is3dSecureEnabled: isEnable3dSecure,
        isFraudToolsEnabled: prefs.isFraudToolsEnabled,
        isSkip3dSecureLiabilityResult: prefs.is3DSecureSkipClientValidationResult,
        clientToken: clientToken,
        messages: {
            validation: Resource.msg('braintree.creditcard.error.validation', 'locale', null),
            secure3DFailed: Resource.msg('braintree.creditcard.error.secure3DFailed', 'locale', null),
            HOSTED_FIELDS_FIELDS_EMPTY: Resource.msg('braintree.creditcard.error.HOSTED_FIELDS_FIELDS_EMPTY', 'locale', null),
            HOSTED_FIELDS_FIELDS_INVALID: Resource.msg('braintree.creditcard.error.HOSTED_FIELDS_FIELDS_INVALID', 'locale', null),
            HOSTED_FIELDS_FAILED_TOKENIZATION: Resource.msg('braintree.creditcard.error.HOSTED_FIELDS_FAILED_TOKENIZATION', 'locale', null),
            HOSTED_FIELDS_TOKENIZATION_NETWORK_ERROR: Resource.msg('braintree.creditcard.error.HOSTED_FIELDS_TOKENIZATION_NETWORK_ERROR', 'locale', null),
            CLIENT_REQUEST_TIMEOUT: Resource.msg('braintree.error.CLIENT_REQUEST_TIMEOUT', 'locale', null),
            CLIENT_GATEWAY_NETWORK: Resource.msg('braintree.error.CLIENT_GATEWAY_NETWORK', 'locale', null),
            CLIENT_REQUEST_ERROR: Resource.msg('braintree.error.CLIENT_REQUEST_ERROR', 'locale', null),
            CLIENT_MISSING_GATEWAY_CONFIGURATION: Resource.msg('braintree.error.CLIENT_MISSING_GATEWAY_CONFIGURATION', 'locale', null)
        },
        amount: 0,
        fieldsConfig: {
            initOwnerValue: '',
            ownerHtmlName: cardForm.cardOwner.htmlName,
            typeHtmlName: cardForm.cardType.htmlName,
            numberHtmlName: cardForm.cardNumber.htmlName,
            expirationMonth: cardForm.expirationMonth.htmlName,
            expirationYear: cardForm.expirationYear.htmlName
        }
    };
}

server.extend(page);
server.append('Begin', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var basket = BasketMgr.getCurrentBasket();

    if (!basket) {
        next();
        return;
    }

    var clientToken = btBusinessLogic.getClientToken(basket.getCurrencyCode());
    var paymentMethod;
    var payPalButtonConfig = null;
    var applePayButtonConfig = null;
    var venmoButtonConfig = null;
    var lpmButtonConfig = null;
    var googlepayButtonConfig = null;
    var googlepayConfig = {};
    var paypalConfig = {};
    var creditCardConfig = {};
    var venmoConfig = {};
    var hostedFieldsConfig = {};
    var srcConfig = {};
    var srcButtonConfig = {};
    var lpmPaymentOptions;
    var isActiveLpmPaymentOptions;

    if (prefs.paymentMethods.BRAINTREE_PAYPAL.isActive) {
        payPalButtonConfig = createBraintreePayPalButtonConfig(basket, clientToken, braintreeConstants.FLOW_CHECKOUT);
        paymentMethod = basket.getPaymentInstruments(prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId);
        paypalConfig = createPaypalConfig(paymentMethod);
    }

    if (prefs.paymentMethods.BRAINTREE_VENMO.isActive) {
        venmoButtonConfig = createBraintreeVenmoButtonConfig(basket, clientToken);
        paymentMethod = basket.getPaymentInstruments(prefs.paymentMethods.BRAINTREE_VENMO.paymentMethodId);
        venmoConfig = createVenmoConfig(paymentMethod);
    }

    if (prefs.paymentMethods.BRAINTREE_APPLEPAY.isActive) {
        applePayButtonConfig = createBraintreeApplePayButtonConfig(basket, clientToken, braintreeConstants.FLOW_CHECKOUT);
    }

    if (prefs.paymentMethods.BRAINTREE_CREDIT.isActive) {
        paymentMethod = basket.getPaymentInstruments(require('dw/order/PaymentInstrument').METHOD_CREDIT_CARD);
        creditCardConfig = createCreditCardConfig(paymentMethod);
        hostedFieldsConfig = createHostedFieldsConfig(res, clientToken);
    }

    if (prefs.paymentMethods.BRAINTREE_LOCAL.isActive) {
        isActiveLpmPaymentOptions = prefs.paymentMethods.BRAINTREE_LOCAL.isActive;
        lpmButtonConfig = createBraintreeLocalPaymentMethodButtonConfig(basket, clientToken);
        lpmPaymentOptions = require('~/cartridge/scripts/braintree/helpers/paymentHelper').getApplicableLocalPaymentMethods({
            applicablePaymentMethods: res.viewData.order.billing.payment.applicablePaymentMethods,
            paymentMethodIds: prefs.paymentMethods.BRAINTREE_LOCAL.paymentMethodIds
        });
    }

    if (prefs.paymentMethods.BRAINTREE_GOOGLEPAY.isActive) {
        googlepayButtonConfig = createBraintreeGooglePayButtonConfig(basket, clientToken, braintreeConstants.FLOW_CHECKOUT);
        paymentMethod = basket.getPaymentInstruments(prefs.paymentMethods.BRAINTREE_GOOGLEPAY.paymentMethodId);
        googlepayConfig = createGooglepayConfig(paymentMethod);
    }

    if (prefs.paymentMethods.BRAINTREE_SRC.isActive) {
        srcButtonConfig = createBraintreeSrcButtonConfig(basket, clientToken, braintreeConstants.FLOW_CHECKOUT);
        paymentMethod = basket.getPaymentInstruments(prefs.paymentMethods.BRAINTREE_SRC.paymentMethodId);
        srcConfig = createSrcConfig(paymentMethod);
    }

    res.setViewData({
        braintree: {
            prefs: prefs,
            currency: basket.getCurrencyCode(),
            paypalConfig: paypalConfig,
            payPalButtonConfig: payPalButtonConfig,
            applePayButtonConfig: applePayButtonConfig,
            venmoButtonConfig: venmoButtonConfig,
            venmoConfig: venmoConfig,
            hostedFieldsConfig: hostedFieldsConfig,
            creditCardConfig: creditCardConfig,
            lpmPaymentOptions: lpmPaymentOptions,
            isActiveLpmPaymentOptions: isActiveLpmPaymentOptions,
            lpmButtonConfig: lpmButtonConfig,
            googlepayButtonConfig: googlepayButtonConfig,
            googlepayConfig: googlepayConfig,
            srcConfig: srcConfig,
            srcButtonConfig: srcButtonConfig,
            sfraBillingFormFieldsNames: getSFRABillingFormFieldsNames()
        }
    });

    next();
});

module.exports = server.exports();
