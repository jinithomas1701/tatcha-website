'use strict';
/**
 * 	Initialize HTTP services for a cartridge
 */
 
var ServiceRegistry = require('dw/svc/LocalServiceRegistry');

// HTTP Services

ServiceRegistry.createService('Extole', {
	/**
     * Create the service request
     * - Set request method to be the HTTP GET method
     * - Construct request URL
     * - Append the request HTTP query string as a URL parameter
     *
     * @param {dw.svc.HTTPService} svc - HTTP Service instance
     * @param {Object} params - Additional paramaters
     * @returns {void}
     */
	createRequest: function(svc, args) {
		svc.setRequestMethod('GET');
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
	},
	/**
     * Return the Mocked Data
     *
     * @param {dw.svc.HTTPService} svc - HTTP Service instance
     * @param {dw.net.HTTPClient} client - HTTPClient class instance of the current service
     * @returns {Object} - Mocked service response object
     */
	mockCall: function(svc, client) {
		return {
			statusCode: 200,
			statusMessage: 'Success',
			text: 'MOCK RESPONSE (' + svc.URL + ')'
		};
	},
	filterLogMessage: function(msg) {
		return msg.replace('headers', 'OFFWITHTHEHEADERS');
	}
});	