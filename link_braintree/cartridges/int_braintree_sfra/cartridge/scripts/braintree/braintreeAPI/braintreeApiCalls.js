var Resource = require('dw/web/Resource');

var { getLogger } = require('~/cartridge/scripts/braintree/helpers/paymentHelper');

var braintreeApiCalls = {};

/**
 * Call API request
 *
 * @param {Object} requestData Request data
 * @returns {Object} Response data
 */
function call(requestData) {
    var createService = require('*/cartridge/scripts/service/braintreeCreateService');
    var createGQService = require('*/cartridge/scripts/service/braintreeGraphQLService');
    var service = null;
    var result = null;

    try {
        if (requestData.isLegacyApiCall) {
            service = createService();
        } else {
            service = createGQService();
        }
    } catch (error) {
        throw new Error('Service int_braintree.http.graphql.payment.Braintree or int_braintree.http.xml.payment.Braintree is undefined. Need to add this service in Administration > Operations > Services');
    }

    try {
		getLogger().warn("Calling Braintree Service. Request Data: " + requestData);
        result = service.call(requestData);
    } catch (error) {
        getLogger().error(error);

        error.customMessage = Resource.msg('braintree.server.error.parse', 'locale', null);

        throw error;
    }

    if (!result.isOk()) {
        throw new Error(Resource.msg('braintree.server.error', 'locale', null));
    }

    return service.getResponse();
}

braintreeApiCalls.getNonceFromToken = function (token) {
    var responseData = null;

    try {
        responseData = call({
            isLegacyApiCall: true,
            requestPath: 'payment_methods/' + token + '/nonces'
        });
    } catch (error) {
        getLogger().error(error);
    }
    // eslint-disable-next-line no-prototype-builtins
    return responseData && responseData.hasOwnProperty('paymentMethodNonce') ? responseData.paymentMethodNonce.nonce : null;
};

braintreeApiCalls.call = call;
module.exports = braintreeApiCalls;
