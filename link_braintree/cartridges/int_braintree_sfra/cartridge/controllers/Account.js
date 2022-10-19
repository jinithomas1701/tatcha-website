'use strict';

var page = module.superModule;
var server = require('server');
var URLUtils = require('dw/web/URLUtils');
var Resource = require('dw/web/Resource');
var site = require('dw/system/Site').getCurrent();
var prefs = require('~/cartridge/config/braintreePreferences');
var btBusinessLogic = require('~/cartridge/scripts/braintree/braintreeAPI/braintreeBusinessLogic');
var {
    getAccountFormFields
} = require('~/cartridge/scripts/braintree/helpers/paymentHelper');
var {
    createAccountVenmoButtonConfig,
    createAccountSrcButtonConfig,
    createAccountGooglePayButtonConfig,
    createPaypalAccountButtonConfig
} = require('~/cartridge/scripts/braintree/helpers/accountButtonConfigHelper');

var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
server.extend(page);

/**
* Creates config for hosted fields
* @param {Object} cardForm The string to repeat.
* @returns {Object} configuration object
*/
function createHostedFieldsConfig(cardForm) {
    var isEnable3dSecure = prefs.is3DSecureEnabled;

    return {
        paymentMethodName: prefs.paymentMethods.BRAINTREE_CREDIT.paymentMethodId,
        is3dSecureEnabled: isEnable3dSecure,
        isFraudToolsEnabled: prefs.isFraudToolsEnabled,
        isSkip3dSecureLiabilityResult: prefs.is3DSecureSkipClientValidationResult,
        clientToken: btBusinessLogic.getClientToken(site.getDefaultCurrency()),
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
        amount: 1,
        fieldsConfig: {
            initOwnerValue: '',
            ownerHtmlName: cardForm.cardOwner.htmlName,
            typeHtmlName: cardForm.cardType.htmlName,
            numberHtmlName: cardForm.cardNumber.htmlName
        }
    };
}

/**
 * Creates customer on Braintree side if customer doesn't exist in Braintree
 */
function createCustomerOnBraintreeSide() {
    var customerVaultData = btBusinessLogic.isCustomerInVault(customer);

    if (!customerVaultData.isCustomerInVault && !customerVaultData.error) {
        btBusinessLogic.createCustomerOnBraintreeSide();
    }
}

server.append(
    'Show',
    csrfProtection.generateToken,
    consentTracking.consent,
    userLoggedIn.validateLoggedIn,
    function (req, res, next) {
        var { getCustomerPaymentInstruments } = require('~/cartridge/scripts/braintree/helpers/customerHelper');
        var AccountModel = require('*/cartridge/models/account');
        var CREDIT_CARD = require('dw/order/PaymentInstrument').METHOD_CREDIT_CARD;

        var creditCardPaymentInstruments = AccountModel.getCustomerPaymentInstruments(getCustomerPaymentInstruments(CREDIT_CARD));
        var googlePayPaymentInstruments = AccountModel.getCustomerPaymentInstruments(getCustomerPaymentInstruments(prefs.paymentMethods.BRAINTREE_GOOGLEPAY.paymentMethodId));
        var paypalPaymentInstruments = AccountModel.getCustomerPaymentInstruments(getCustomerPaymentInstruments(prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId));
        var venmoPaymentInstruments = AccountModel.getCustomerPaymentInstruments(getCustomerPaymentInstruments(prefs.paymentMethods.BRAINTREE_VENMO.paymentMethodId));
        var srcPaymentInstruments = AccountModel.getCustomerPaymentInstruments(getCustomerPaymentInstruments(prefs.paymentMethods.BRAINTREE_SRC.paymentMethodId));

        var customerSavedCreditCards = [];
        if (!empty(creditCardPaymentInstruments)) {
            creditCardPaymentInstruments.map(function (el) {
                return customerSavedCreditCards.push(el);
            });
        }
        if (!empty(googlePayPaymentInstruments)) {
            googlePayPaymentInstruments.map(function (el) {
                return customerSavedCreditCards.push(el);
            });
        }
        if (!empty(srcPaymentInstruments)) {
            srcPaymentInstruments.map(function (el) {
                return customerSavedCreditCards.push(el);
            });
        }

        var formKeys = {
            email: '',
            nonce: '',
            addresses: '',
            shippingAddress: ''
        };
        var paypalAccounttForm = server.forms.getForm('braintreepaypalaccount');
        var paypalAccountFormFields = getAccountFormFields(paypalAccounttForm, formKeys);
        var isPaypalVaultAllowed = prefs.vaultMode && !prefs.paypalOrderIntent;

        var venmoAccounttForm = server.forms.getForm('braintreevenmoaccount');
        var venmoAccountFormFields = getAccountFormFields(venmoAccounttForm, formKeys);

        res.setViewData({
            braintree: {
                customerSavedCreditCards: customerSavedCreditCards,
                paypalPaymentInstruments: paypalPaymentInstruments,
                venmoPaymentInstruments: venmoPaymentInstruments,
                prefs: prefs,
                deletePaymentUrl: URLUtils.url('PaymentInstruments-DeletePayment').toString(),
                paypal: {
                    hasDefaultPaypalPaymentMethod: !empty(paypalPaymentInstruments),
                    paypalAddAccountHandler: URLUtils.url('Braintree-AccountAddPaypalHandle'),
                    isPaypalVaultAllowed: isPaypalVaultAllowed,
                    paypalAccountButtonConfig: createPaypalAccountButtonConfig(),
                    paypalAccountFormFields: paypalAccountFormFields,
                    isPaypalBlockShown: prefs.paymentMethods.BRAINTREE_PAYPAL && prefs.paymentMethods.BRAINTREE_PAYPAL.isActive && (isPaypalVaultAllowed || !empty(paypalPaymentInstruments))
                },
                venmo: {
                    hasDefaultVenmoPaymentMethod: !empty(venmoPaymentInstruments),
                    venmoAddAccountHandler: URLUtils.url('Braintree-AccountAddVenmoHandle'),
                    venmoAccountButtonConfig: createAccountVenmoButtonConfig(),
                    venmoAccountFormFields: venmoAccountFormFields,
                    isVenmoBlockShown: prefs.paymentMethods.BRAINTREE_VENMO && prefs.paymentMethods.BRAINTREE_VENMO.isActive && (prefs.vaultMode || !empty(venmoPaymentInstruments))
                },
                creditcardPaymentForm: server.forms.getForm('creditCard'),
                googlepayPaymentForm: server.forms.getForm('braintreegooglepayaccount'),
                srcPaymentForm: server.forms.getForm('braintreesecureremotecommerceaccount'),
                accountGooglePayButtonConfig: createAccountGooglePayButtonConfig(),
                hostedFieldsConfig: createHostedFieldsConfig(server.forms.getForm('creditCard')),
                accountSrcButtonConfig: createAccountSrcButtonConfig(),
                isCreditCardSavingAllowed: prefs.paymentMethods.BRAINTREE_CREDIT && prefs.paymentMethods.BRAINTREE_CREDIT.isActive && prefs.vaultMode && !prefs.is3DSecureEnabled,
                isGooglePaySavingAllowed: prefs.paymentMethods.BRAINTREE_GOOGLEPAY && prefs.paymentMethods.BRAINTREE_GOOGLEPAY.isActive && prefs.vaultMode,
                isSrcSavingAllowed: prefs.paymentMethods.BRAINTREE_SRC && prefs.paymentMethods.BRAINTREE_SRC.isActive && prefs.vaultMode,
                isSRCBlockShown: prefs.paymentMethods.BRAINTREE_SRC && prefs.paymentMethods.BRAINTREE_SRC.isActive && (prefs.vaultMode || !empty(srcPaymentInstruments)),
                isCreditCardBlockShown: prefs.paymentMethods.BRAINTREE_CREDIT && prefs.paymentMethods.BRAINTREE_CREDIT.isActive && (prefs.vaultMode || !empty(creditCardPaymentInstruments)),
                isGooglePayBlockShown: prefs.paymentMethods.BRAINTREE_GOOGLEPAY && prefs.paymentMethods.BRAINTREE_GOOGLEPAY.isActive && (prefs.vaultMode || !empty(googlePayPaymentInstruments)),
                makePaymentMethodDefaultUrl: URLUtils.https('Braintree-MakePaymentMethodDefault').toString()
            }
        });
        next();
    });

server.append('Login', function (req, res, next) {
    if (customer.authenticated) {
        createCustomerOnBraintreeSide();
    }

    next();
});

server.append('SubmitRegistration', function (req, res, next) {
    this.on('route:BeforeComplete', function (_, res) { // eslint-disable-line no-shadow
        if (customer.authenticated && res.viewData.validForm) {
            createCustomerOnBraintreeSide();
        }
    });

    next();
});

module.exports = server.exports();
