'use strict';
var site = require('dw/system/Site').getCurrent();
var btLoggingMode = 'all';

/**
 * reates service, gets from credentials and returns tokenization key
 *
 * @returns {string} with tokenization key
 */
function getTokenizationKey() {
    const serviceName = 'int_braintree.http.xml.payment.Braintree';
    const service = require('dw/svc/LocalServiceRegistry').createService(serviceName, {});
    return service.configuration.credential.custom.BRAINTREE_Tokenization_Key;
}

module.exports = {
    vaultMode: site.getCustomPreferenceValue('BRAINTREE_Vault_Mode'),
    isSettle: site.getCustomPreferenceValue('BRAINTREE_SETTLE'),
    loggingMode: btLoggingMode,
    tokenizationKey: getTokenizationKey(),
    merchantAccountIDs: site.getCustomPreferenceValue('BRAINTREE_Merchant_Account_IDs'),
    apiVersion: 4,
    clientSdk3ClientUrl: 'https://js.braintreegateway.com/web/3.58.0/js/client.min.js',
    clientSdk3HostedFieldsUrl: 'https://js.braintreegateway.com/web/3.58.0/js/hosted-fields.min.js',
    braintreeEditStatus: 'Submitted for settlement',
    braintreeChannel: 'SFCC_BT_SFRA_21_2_0',
    userAgent: 'Braintree DW_Braintree_BM 21.2.0'
};

