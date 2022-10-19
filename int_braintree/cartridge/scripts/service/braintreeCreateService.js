'use strict';
/* global empty */

var braintreeApi = require('~/cartridge/scripts/braintree/braintreeApi');
var getPreference = require('~/cartridge/config/braintreePreferences.js');

/**
 * Defines callbacks for use with the LocalServiceRegistry.
 * 
 * @param {Object} prefs - BraintreeHelper custom preferences 
 * @returns {Object} Request object to give to the execute method.
 */
var getServiceConfig = function (prefs) {
    return {

        /**
         * Parse object with request data into string line for request
         * @param {dw.svc.HTTPService} service Service, which will be used for the call
         * @param {Object} requestData Object with request data
         * @returns {boolean} String line for request
         */
        createRequest: function (service, requestData) {
            var credentialErrorMsg = 'Cannot get Credential or Configuration object for int_braintree.http.xml.payment.Braintree service. Please check configuration';
            var serviceCredential;

            try {
                serviceCredential = service.getConfiguration().getCredential();
            } catch (error) {
                throw new Error(credentialErrorMsg);
            }

            if (!serviceCredential) {
                throw new Error(credentialErrorMsg);
            }

            var ecvzApiToken = serviceCredential.custom.BRAINTREE_ECVZ_Access_Token;
            var ecvzApiUrl = serviceCredential.custom.BRAINTREE_ECVZ_Api_Url;
            var isUseECVZ = !empty(ecvzApiToken);
            var merchantID, url;

            if(isUseECVZ) {
                merchantID = ecvzApiToken.split('$')[2];
                url = ecvzApiUrl;
            } else {
                merchantID = serviceCredential.custom.BRAINTREE_Merchant_ID;
                url = serviceCredential.getURL();
            }

            if (!url.match(/.+\/$/)) {
                url += '/';
            }

            url += 'merchants/' + merchantID + '/';
            url += requestData.requestPath;
            service.setURL(url);

            service.setRequestMethod(requestData.requestMethod || 'POST');
            service.addHeader('Content-Type', 'application/xml');
            service.addHeader('X-ApiVersion', prefs.apiVersion);
            service.addHeader('User-Agent', prefs.userAgent);

            if (isUseECVZ) {
                service.setAuthentication('NONE');
                service.addHeader('Authorization', 'Bearer ' + ecvzApiToken);
            }

            return braintreeApi.createXml(requestData.xmlType, requestData);
        },

        /**
         * Parse XML response from API call into object
         * @param {dw.svc.HTTPService} service Service that is used for API call
         * @param {dw.net.HTTPClient} httpClient Demandware http client
         * @return {Object} Response data
         */
        parseResponse: function (service, httpClient) {
            var result = null;

            if (httpClient.getText().length > 1) {
                result = braintreeApi.parseXml(httpClient.getText());
            } else {
                result = {};
            }

            return result;
        },

        getRequestLogMessage: function (request) {
            return request;
        },

        getResponseLogMessage: function (response) {
            return response.text;
        }
    };
};

module.exports = function () {
    return require('dw/svc').LocalServiceRegistry.createService(getPreference().serviceName, getServiceConfig(getPreference()));
};