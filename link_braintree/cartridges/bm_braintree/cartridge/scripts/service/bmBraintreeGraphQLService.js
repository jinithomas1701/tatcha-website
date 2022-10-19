const { msg } = require('dw/web/Resource');
const { getLogger } = require('*/cartridge/scripts/braintree/bmBraintreeHelper');
var btConstants = require('*/cartridge/scripts/util/braintreeConstants');

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
                throw Object.assign(
                    new Error(msg('braintree.service.nocredentials', 'braintreebm', null)),
                    { isBusinessLogic: true }
                );
            }

            if (!serviceCredential) {
                throw Object.assign(
                    new Error(msg('braintree.service.nocredentials', 'braintreebm', null)),
                    { isBusinessLogic: true }
                );
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
            }
            return {
                error: !empty(resp.errors),
                data: resp.data,
                message: resp.errors && resp.errors[0].message ? resp.errors[0].message : ''
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
    return require('dw/svc/LocalServiceRegistry').createService(btConstants.SERVICE_NAME, createGraphQLService());
};
