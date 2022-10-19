const { msgf } = require('dw/web/Resource');
const { getLogger } = require('../braintree/helpers/paymentHelper');

var serviceName = 'int_braintree.http.graphql.payment.Braintree';

/**
 * Defines callbacks for use with the LocalServiceRegistry.
 *
 * @returns {Object} Request object to give to the execute method.
 */
function createGraphQLService() {
    return {
        /**
         * Parse object with request data into string line for request
         * @param {dw.svc.HTTPService} service Service, which will be used for the call
         * @param {Object} requestData Object with request data
         * @returns {string} String line for request
         */
        createRequest: function (service, requestData) {
            var serviceCredential;

            try {
                serviceCredential = service.getConfiguration().getCredential();
            } catch (error) {
                throw new Error(msgf('braintree.service.nocredentials', 'locale', null, serviceName));
            }

            if (!serviceCredential) {
                throw new Error(msgf('braintree.service.nocredentials', 'locale', null, serviceName));
            }

            service.addHeader('Braintree-Version', '2021-01-13');
            service.addHeader('Content-Type', 'application/json');

            return requestData;
        },
        /**
         * Parse response from API call into object
         * @param {dw.svc.HTTPService} _ Service that is used for API call
         * @param {dw.net.HTTPClient} httpClient Demandware http client
         * @return {Object} Response data
         */
        parseResponse: function (_, httpClient) {
            var resp;
            var errorCode = null;
            var errorMsg = null;
            try {
                resp = JSON.parse(httpClient.getText());
            } catch (error) {
                throw new Error(error);
            }

            if (!resp) {
                throw new Error();
            }
            if (!empty(resp.errors)) {
                getLogger().error(JSON.stringify(resp.errors[0]));

                errorMsg = resp.errors[0].message;

                if (resp.errors[0].extensions && resp.errors[0].extensions.legacyCode) {
                    errorCode = resp.errors[0].extensions.legacyCode;
                }
            }
            return {
                error: !empty(resp.errors),
                data: resp.data,
                errorMsg: errorMsg,
                errorCode: errorCode
            };
        },
        filterLogMessage: function (msg) {
            return msg;
        },
        getRequestLogMessage: function (request) {
            return request;
        },
        getResponseLogMessage: function (response) {
            return response.text;
        }
    };
}

module.exports = function () {
    return require('dw/svc/LocalServiceRegistry').createService(serviceName, createGraphQLService());
};
