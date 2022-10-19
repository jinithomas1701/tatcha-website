'use strict';
/* global dw empty */

var system = require('dw/system');
var SDKVerion = '3.62.0';

var getPreference = function (inpSite) {
    var prefs = {};
    var paypalButtonConfigs = require('~/cartridge/scripts/braintree/paypalButtonConfigs');
    var hostedFieldsConfig = require('~/cartridge/scripts/braintree/hostedFieldsConfig');
    var site = inpSite || system.Site.getCurrent();

    // Site custom preferences:
    var allSitePreferences = site.getPreferences().getCustom();
    Object.keys(allSitePreferences).forEach(function (key) {
        if (key.match(/^BRAINTREE_+/)) {
            if (typeof allSitePreferences[key] === 'object' && 'value' in allSitePreferences[key]) {
                prefs[key] = allSitePreferences[key].getValue();
            } else {
                prefs[key] = allSitePreferences[key];
            }
        }
    });

    prefs.BRAINTREE_3DSecure_Enabled = prefs.BRAINTREE_3DSecure_Enabled === 'enabled';
    prefs.BRAINTREE_3DSecure_Skip_Client_Validation_Result = prefs.BRAINTREE_3DSecure_Skip_Client_Validation_Result === 'enabled';
    prefs.BRAINTREE_Fraud_Tools_Enabled = prefs.BRAINTREE_Fraud_Tools_Enabled === 'enabled';
    prefs.BRAINTREE_PAYPAL_Fraud_Tools_Enabled = prefs.BRAINTREE_PAYPAL_Fraud_Tools_Enabled === 'enabled';
    prefs.BRAINTREE_PAYPAL_PayNow_Button_Enabled = prefs.BRAINTREE_PAYPAL_PayNow_Button_Enabled === 'enabled';
    prefs.BRAINTREE_PAYPAL_Billing_Agreement_Description = empty(prefs.BRAINTREE_PAYPAL_Billing_Agreement_Description) ? '' : prefs.BRAINTREE_PAYPAL_Billing_Agreement_Description.slice(0, 249);
    prefs.BRAINTREE_PAYPAL_Cart_Button_Config = paypalButtonConfigs.BRAINTREE_PAYPAL_Cart_Button_Config;
    prefs.BRAINTREE_PAYPAL_Billing_Button_Config = paypalButtonConfigs.BRAINTREE_PAYPAL_Billing_Button_Config;
    prefs.BRAINTREE_PAYPAL_MiniCart_Button_Config = paypalButtonConfigs.BRAINTREE_PAYPAL_MiniCart_Button_Config;
    prefs.BRAINTREE_PAYPAL_PDP_Button_Config = paypalButtonConfigs.BRAINTREE_PAYPAL_PDP_Button_Config;
    prefs.BRAINTREE_Hosted_Fields_Advanced_Options = empty(prefs.BRAINTREE_Hosted_Fields_Advanced_Options) ? hostedFieldsConfig.BRAINTREE_Hosted_Fields_Advanced_Options : prefs.BRAINTREE_Hosted_Fields_Advanced_Options;
    prefs.BRAINTREE_Hosted_Fields_Styling = empty(prefs.BRAINTREE_Hosted_Fields_Styling) ? hostedFieldsConfig.BRAINTREE_Hosted_Fields_Styling : prefs.BRAINTREE_Hosted_Fields_Styling;

    // Checks if JSON is valid
    try {
        JSON.parse(prefs.BRAINTREE_Hosted_Fields_Styling);
    } catch (error) {
        prefs.BRAINTREE_Hosted_Fields_Styling = 'null';
    }

    // Checks if js literal object is valid
    try {
        new Function('return ' + prefs.BRAINTREE_Hosted_Fields_Advanced_Options); // eslint-disable-line no-new, no-new-func
    } catch (error) {
        prefs.BRAINTREE_Hosted_Fields_Advanced_Options = 'null';
    }

    if (prefs.BRAINTREE_PAYPAL_Cart_Button_Config === null) {
        prefs.BRAINTREE_PAYPAL_Cart_Button_Config = {};
    }
    if (prefs.BRAINTREE_PAYPAL_Billing_Button_Config === null) {
        prefs.BRAINTREE_PAYPAL_Billing_Button_Config = {};
    }
    if (prefs.BRAINTREE_PAYPAL_MiniCart_Button_Config === null) {
        prefs.BRAINTREE_PAYPAL_MiniCart_Button_Config = {};
    }
    if (prefs.BRAINTREE_PAYPAL_PDP_Button_Config === null) {
        prefs.BRAINTREE_PAYPAL_PDP_Button_Config = {};
    }
    // Hardcoded values that may not be configured in BM:
    prefs.initialServiceName = 'int_braintree.http.xml.payment.Braintree';
    prefs.serviceName = prefs.initialServiceName + '.' + site.getID();
    prefs.apiVersion = 4;

    prefs.initialPaypalRestServiceName = 'int_paypal.http.rest.payment.PayPal';
    prefs.paypalRestApiVersion = 'v1';

    prefs.clientSdk3ClientUrl = 'https://js.braintreegateway.com/web/' + SDKVerion + '/js/client.min.js';
    prefs.clientSdk3HostedFieldsUrl = 'https://js.braintreegateway.com/web/' + SDKVerion + '/js/hosted-fields.min.js';
    prefs.clientSdk3ThreeDSecureUrl = 'https://js.braintreegateway.com/web/' + SDKVerion + '/js/three-d-secure.min.js';
    prefs.clientSdk3DataCollectorUrl = 'https://js.braintreegateway.com/web/' + SDKVerion + '/js/data-collector.min.js';
    prefs.clientSdk3PayPalUrl = 'https://js.braintreegateway.com/web/' + SDKVerion + '/js/paypal.min.js';
    prefs.clientSdk3PayPalCheckoutUrl = 'https://js.braintreegateway.com/web/' + SDKVerion + '/js/paypal-checkout.min.js';
    prefs.clientSdk3ApplePayUrl = 'https://js.braintreegateway.com/web/' + SDKVerion + '/js/apple-pay.min.js';
    prefs.clientSdk3VenmoUrl = 'https://js.braintreegateway.com/web/' + SDKVerion + '/js/venmo.min.js';
    prefs.clientPayPalUrl = 'https://www.paypalobjects.com/api/checkout.js';

    prefs.creditCardMethodName = dw.order.PaymentInstrument.METHOD_CREDIT_CARD;
    prefs.paypalMethodName = 'PayPal';
    prefs.applePayMethodName = 'ApplePay';
    prefs.venmoMethodName = 'Venmo';

    prefs.currencyCode = site.getDefaultCurrency();
    prefs.braintreeChannel = 'SFCC_BT_SG_20_0_1';
    prefs.userAgent = 'Braintree DW_Braintree 20.0.1';
    prefs.braintreeEditStatus = 'Submitted for settlement';
    prefs.logsPath = '/on/demandware.servlet/webdav/Sites/Logs';

    return prefs;
};

module.exports = getPreference;
