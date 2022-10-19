
var Site = require('dw/system/Site');
var Logger = require('dw/system/Logger');
var ServiceRegistry = require('dw/svc/LocalServiceRegistry');
var apiKey = Site.getCurrent().getCustomPreferenceValue('klaviyo_account');
var HTTPRequestPart = require('dw/net/HTTPRequestPart');

function addUsertoBackInStockList(email, productId) {
	
	var additionStatus = false;
	
	var logger = Logger.getLogger('Klaviyo', 'KlaviyoCustomBackInStockUtils - addUsertoBackInStockList()');
	
	var payload = createPayload(email, productId);

	var result = KlaviyoCustomBackInStockService.call(apiKey, email, productId);
	
	var resultObj = JSON.parse(result.object);
	if(!empty(resultObj)) {
		var response = resultObj;
		if (!empty(response)) {
			if(response.success == true) {
				additionStatus = true;
			} else {
				logger.error('addUsertoBackInStockList() failed for email, product: ' + email + ',' + productId + '. Error from Klaviyo. Response: ' + response);
			}
		} else {
			logger.error('addUsertoBackInStockList() failed for email, product: ' + email + ',' + productId + '. Error from Klaviyo. Response: ' + resultObj);
		}
	}
	
	return additionStatus;
	
}

function createPayload(email, productId) {
	return [
		new HTTPRequestPart('a', apiKey),
		new HTTPRequestPart('email', email),
		new HTTPRequestPart('variant', productId),
		new HTTPRequestPart('platform', 'api'),
	];

}

module.exports = {
	addUsertoBackInStockList : addUsertoBackInStockList
}


var KlaviyoCustomBackInStockService = ServiceRegistry.createService('KlaviyoCustomBackInStockService', {
	/**
     * Create the service request
     * - Set request method to be the HTTP POST method
     * - Construct request URL
     * - Append the request HTTP query string as a URL parameter
     *
     * @param {dw.svc.HTTPService} svc - HTTP Service instance
     * @param {Object} params - Additional paramaters
     * @returns {void}
     */
	createRequest: function(svc, apiKey, email, productId) {
		//Set HTTP Method
		svc = svc.setRequestMethod("POST");
		return [
			new HTTPRequestPart('a', apiKey),
			new HTTPRequestPart('email', email),
			new HTTPRequestPart('variant', productId),
			new HTTPRequestPart('platform', 'api'),
	];
	},
	/**
     * JSON parse the response text and return it in configured retData object
     *
     * @param {dw.svc.HTTPService} svc - HTTP Service instance
     * @param {HTTPClient} client - HTTPClient class instance of the current service
     * @returns {Object} retData - Service response object
     */
	parseResponse: function(svc, client) {
		return client.text;
	}
	
});