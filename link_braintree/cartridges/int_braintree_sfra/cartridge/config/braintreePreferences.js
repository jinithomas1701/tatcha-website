'use strict';
var URLUtils = require('dw/web/URLUtils');
var site = require('dw/system/Site').getCurrent();
//var cacheBraintreePreferences = require('dw/system/CacheMgr').getCache('braintreePreferences');

const serviceName = 'int_braintree.http.xml.payment.Braintree';
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');

var SDKVersion = '3.76.4';
var btLoggingMode = 'all';
var btFraudToolsEnabled = true;
var btPaypalFraudToolsEnabled = true;
var btCreditCardDescriptorPhone = '';
var btCreditCardDescriptorName = '';
var btCreditCardDescriptorUrl = '';
var btPaypalDescriptor = '';
var paypalButtonConfigs = require('~/cartridge/scripts/braintree/configuration/paypalButtonConfigs');
var SRCButtonConfig = require('../scripts/braintree/configuration/SRCButtonConfig');


/**
 * Gets from credentials and returns tokenization key
 *
 * @returns {string} with tokenization key
 */
var getTokenizationKey = function () {
    var braintreeService = LocalServiceRegistry.createService(serviceName, {});
    var tokenizationKey = braintreeService.configuration.credential.custom.BRAINTREE_Tokenization_Key;
    return tokenizationKey;
};

/**
 *  Returns all custom site preferences
 *
 * @returns {Object} statis preferences
 */
var getCustomSitePreferencies = function () {
    return {
        merchantAccountIDs: site.getCustomPreferenceValue('BRAINTREE_Merchant_Account_IDs'),
        vaultMode: site.getCustomPreferenceValue('BRAINTREE_Vault_Mode'),
        isSettle: site.getCustomPreferenceValue('BRAINTREE_SETTLE'),
        isL2L3: site.getCustomPreferenceValue('BRAINTREE_L2_L3'),
        customFields: site.getCustomPreferenceValue('BRAINTREE_Custom_Fields'),

        is3DSecureEnabled: site.getCustomPreferenceValue('BRAINTREE_3DSecure_Enabled').getValue() === 'enabled',
        is3DSecureSkipClientValidationResult: site.getCustomPreferenceValue('BRAINTREE_3DSecure_Skip_Client_Validation_Result').getValue() === 'enabled',

        paypalDisplayName: site.getCustomPreferenceValue('BRAINTREE_PAYPAL_Display_Name'),
        paypalOrderIntent: site.getCustomPreferenceValue('BRAINTREE_PAYPAL_Is_Order_Intent'),
        paypalBillingAgreementDescription: site.getCustomPreferenceValue('BRAINTREE_PAYPAL_Billing_Agreement_Description'),
        paypalButtonLocation: site.getCustomPreferenceValue('BRAINTREE_PAYPAL_Button_Location').getValue(),

        applepayDisplayName: site.getCustomPreferenceValue('BRAINTREE_APPLEPAY_Display_Name'),
        applepayVisibilityOnCart: site.getCustomPreferenceValue('BRAINTREE_APPLEPAY_Visibility_Button_On_Cart'),

        venmoDisplayName: site.getCustomPreferenceValue('BRAINTREE_VENMO_Display_Name'),

        googlepayDisplayName: site.getCustomPreferenceValue('BRAINTREE_GOOGLEPAY_Display_Name'),
        googlepayVisibilityOnCart: site.getCustomPreferenceValue('BRAINTREE_GOOGLEPAY_Visibility_Button_On_Cart'),

        srcDisplayName: site.getCustomPreferenceValue('BRAINTREE_SRC_Display_Name'),
        srcVisibilityOnCart: site.getCustomPreferenceValue('BRAINTREE_SRC_Visibility_Button_On_Cart')
    };
};

var getPreference = function () {
    //var cacheResult = cacheBraintreePreferences.get('btPreference');
    //if (cacheResult) return cacheResult;

    var prefs = getCustomSitePreferencies();

    // Hardcoded preferencies:
    prefs.loggingMode = btLoggingMode;
    prefs.isFraudToolsEnabled = btFraudToolsEnabled;
    prefs.isPaypalFraudToolsEnabled = btPaypalFraudToolsEnabled;
    prefs.creditCardDescriptorPhone = btCreditCardDescriptorPhone;
    prefs.creditCardDescriptorName = btCreditCardDescriptorName;
    prefs.creditCardDescriptorUrl = btCreditCardDescriptorUrl;
    prefs.paypalDescriptorName = btPaypalDescriptor;

    prefs.paypalIntent = prefs.isSettle ? 'capture' : 'authorize';
    prefs.paypalBillingAgreementDescription = empty(prefs.paypalBillingAgreementDescription) ? '' : prefs.paypalBillingAgreementDescription.slice(0, 249);

    // PayPal Configs preferencies:
    prefs.tokenizationKey = getTokenizationKey();
    prefs.paypalCartButtonConfig = paypalButtonConfigs.PAYPAL_Cart_Button_Config;
    prefs.paypalBillingButtonConfig = paypalButtonConfigs.PAYPAL_Billing_Button_Config;
    prefs.paypalMiniCartButtonConfig = paypalButtonConfigs.PAYPAL_MiniCart_Button_Config;
    prefs.paypalPdpButtonConfig = paypalButtonConfigs.PAYPAL_PDP_Button_Config;
    prefs.SRCBillingButtonConfig = SRCButtonConfig.SRC_Billing_Button_Config;
    prefs.SRCCartButtonConfig = SRCButtonConfig.SRC_Cart_Button_Config;
    prefs.SRCAccountButtonConfig = SRCButtonConfig.SRC_Account_Button_Config;

    if (prefs.paypalCartButtonConfig === null) {
        prefs.paypalCartButtonConfig = {};
    }

    if (prefs.paypalBillingButtonConfig === null) {
        prefs.paypalBillingButtonConfig = {};
    }
    if (prefs.paypalMiniCartButtonConfig === null) {
        prefs.paypalMiniCartButtonConfig = {};
    }
    if (prefs.paypalPdpButtonConfig === null) {
        prefs.paypalPdpButtonConfig = {};
    }

    // Hardcoded values that may not be configured in BM:
    prefs.apiVersion = 4;

    prefs.clientSdk3ClientUrl = 'https://js.braintreegateway.com/web/' + SDKVersion + '/js/client.min.js';
    prefs.clientSdk3HostedFieldsUrl = 'https://js.braintreegateway.com/web/' + SDKVersion + '/js/hosted-fields.min.js';
    prefs.clientSdk3ThreeDSecureUrl = 'https://js.braintreegateway.com/web/' + SDKVersion + '/js/three-d-secure.min.js';
    prefs.clientSdk3DataCollectorUrl = 'https://js.braintreegateway.com/web/' + SDKVersion + '/js/data-collector.min.js';
    prefs.clientSdk3PayPalUrl = 'https://js.braintreegateway.com/web/' + SDKVersion + '/js/paypal.min.js';
    prefs.clientSdk3PayPalCheckoutUrl = 'https://js.braintreegateway.com/web/' + SDKVersion + '/js/paypal-checkout.min.js';
    prefs.clientSdk3ApplePayUrl = 'https://js.braintreegateway.com/web/' + SDKVersion + '/js/apple-pay.min.js';
    prefs.clientSdk3VenmoUrl = 'https://js.braintreegateway.com/web/' + SDKVersion + '/js/venmo.min.js';
    prefs.clientSdkLocalPaymentUrl = 'https://js.braintreegateway.com/web/' + SDKVersion + '/js/local-payment.min.js';
    prefs.googlePaySdkUrl = 'https://pay.google.com/gp/p/js/pay.js';
    prefs.braintreeGooglePaySdkUrl = 'https://js.braintreegateway.com/web/' + SDKVersion + '/js/google-payment.min.js';
    prefs.srcSdkUrl = 'https://sandbox-assets.secure.checkout.visa.com/checkout-widget/resources/js/integration/v1/sdk.js';
    prefs.braintreeSrcSdkUrl = 'https://js.braintreegateway.com/web/' + SDKVersion + '/js/visa-checkout.min.js';
    prefs.staticImageLink = 'https://www.paypalobjects.com/webstatic/en_US/i/buttons/checkout-logo-large.png';
    prefs.SRCImageLink = 'https://sandbox.secure.checkout.visa.com/wallet-services-web/xo/button.png';

    prefs.checkoutFromCartUrl = URLUtils.https('CheckoutServices-SubmitPayment', 'fromCart', 'true').toString();
    prefs.placeOrdeUrl = URLUtils.url('Checkout-Begin', 'stage', 'placeOrder').toString();

    prefs.paymentMethods = require('~/cartridge/scripts/braintree/helpers/paymentHelper').getActivePaymentMethods();

    prefs.currencyCode = site.getDefaultCurrency();
    prefs.braintreeChannel = 'SFCC_BT_SFRA_21_2_0';
    prefs.userAgent = 'Braintree DW_Braintree 21.2.0';
    prefs.braintreeEditStatus = 'Submitted for settlement';

    //cacheBraintreePreferences.put('btPreference', prefs);
    return prefs;
};

module.exports = getPreference();
