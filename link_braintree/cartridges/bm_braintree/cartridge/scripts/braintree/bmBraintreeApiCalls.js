var Resource = require('dw/web/Resource');

var BraintreeHelper = require('~/cartridge/scripts/braintree/bmBraintreeHelper');
var btConstants = require('*/cartridge/scripts/util/braintreeConstants');

var braintreeApiCalls = {};

/**
 * Call API request
 *
 * @param {Object} requestData Request data
 * @returns {Object} Response data
 */
function call(requestData) {
    var createGQService = require('~/cartridge/scripts/service/bmBraintreeGraphQLService');
    var service = null;
    var result = null;

    try {
        service = createGQService();
    } catch (error) {
        throw Object.assign(
            new Error(Resource.msgf('braintree.service.noconfiguration', 'braintreebm', null, btConstants.SERVICE_NAME)),
            { isBusinessLogic: true }
        );
    }

    try {
        result = service.call(requestData);
    } catch (error) {
        BraintreeHelper.getLogger().error(error);

        throw Object.assign(
            new Error(Resource.msg('braintree.server.error.parse', 'braintreebm', null)),
            { isBusinessLogic: true }
        );
    }

    if (!result.isOk()) {
        throw Object.assign(
            new Error(Resource.msg('braintree.server.error', 'braintreebm', null)),
            { isBusinessLogic: true }
        );
    }

    return service.getResponse();
}

braintreeApiCalls.call = call;
module.exports = braintreeApiCalls;
