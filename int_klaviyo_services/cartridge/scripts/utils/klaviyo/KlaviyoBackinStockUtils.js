
var Site = require('dw/system/Site');
var Logger = require('dw/system/Logger');
var ServiceRegistry = require('dw/svc/LocalServiceRegistry');
var apiKey = Site.getCurrent().getCustomPreferenceValue('klaviyo_api_key');

function addUsertoBackInStockList(email, productId) {
	
	var additionStatus = false;
	
	var logger = Logger.getLogger('Klaviyo', 'KlaviyoBackInStockUtils - addUsertoBackInStockList()');
	
	var payload = createPayload(email, productId);
	var result = KlaviyoBackInStockService.call(payload);
	
	var resultObj = JSON.parse(result.object);
	if(!empty(resultObj)) {
		var response = resultObj;
		if (!empty(response)) {
			if(response.status == 1) {
				additionStatus = true;
			} else {
				logger.error('addUsertoBackInStockList() failed for ' + email + '. Error from Klaviyo. Response: ' + response.response);
			}
		} else {
			logger.error('addUsertoBackInStockList() failed for ' + email + '. Error from Klaviyo. Response: ' + resultObj);
		}
	}
	
	return additionStatus;
	
}

function createPayload (email, productId) {
	var jsonData = {};
	jsonData.backinstock = email;
	jsonData.productSKU = productId;
	
	return JSON.stringify(jsonData);
}

module.exports = {
	addUsertoBackInStockList : addUsertoBackInStockList
}


var KlaviyoBackInStockService = ServiceRegistry.createService('KlaviyoBackInStockService', {
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
	createRequest: function(svc, params) {
		//Set HTTP Method
		svc = svc.setRequestMethod("POST");
		svc = svc.addHeader('Content-Type','application/json');
		return params;
			
	},
	/**
     * JSON parse the response text and return it in configured retData object
     *
     * @param {dw.svc.HTTPService} svc - HTTP Service instance
     * @param {dw.net.HTTPClient} client - HTTPClient class instance of the current service
     * @returns {Object} retData - Service response object
     */
	parseResponse: function(svc, client) {
		return client.text;
	}
	
});