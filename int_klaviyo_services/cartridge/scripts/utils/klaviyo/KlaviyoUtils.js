'use strict';

var StringUtils = require('dw/util/StringUtils');
var Site = require('dw/system/Site');
var Logger = require('dw/system/Logger');
var ServiceRegistry = require('dw/svc/LocalServiceRegistry');
var apiKey = Site.getCurrent().getCustomPreferenceValue('klaviyo_api_key');


/**
 * Uses the service framework to get the Klaviyo Service configuration
 * (please see metadata/klaviyo-services.xml) and executes a get call with the payload generated from the 
 * preparePayload() method. 
 * 
 * This is a track API call. Please refer https://www.klaviyo.com/docs/http-api
 * 
 * @param email
 * @param data
 * @param event
 * @returns
 */
function sendEmail(email, data, event) {
	var requestBody = {};
	var resultObj = {};
	
	var logger = Logger.getLogger('Klaviyo', 'KlaviyoUtils - sendEmail()');
	
	var KlaviyoTrackService = createKlaviyoService();	
	
	if (KlaviyoTrackService == null ) {
		logger.error('sendEmail() failed for email: ' + email + '. Service Connection for send email via Klaviyo returned null.');
		return;
	}
	
	logger.info('Send email: ' + email + ' Event: ' + event);
	
	var klaviyoData = preparePayload(email, data, event);


    
	KlaviyoTrackService.addParam('data', klaviyoData);

	var result = KlaviyoTrackService.call(requestBody);

	if (result == null){
		logger.error('Result for send email via Klaviyo returned null. Payload info: ' +  klaviyoData);
		return;
	}

	resultObj = JSON.parse(result.object);

	if (resultObj == 1) {
		logger.debug('Send email via Klaviyo is successful. Payload info ' + klaviyoData);
	} else {
		logger.error('Send email via Klaviyo failed. Payload info ' +  klaviyoData);
	}

}



/**
 * Prepares Track API Payload Data in format per 
 * https://www.klaviyo.com/docs/http-api
 * 
 * @param email
 * @param data
 * @param event
 * @returns
 */
function preparePayload (email, data, event) {
	
	var jsonData = {};
	jsonData.token = Site.getCurrent().getCustomPreferenceValue('klaviyo_account');
	jsonData.event = event;
	var customerProperties = {};
	customerProperties.$email = email;
	jsonData.customer_properties = customerProperties;
	jsonData.properties = data;
	jsonData.time = Math.floor(Date.now() / 1000);
	
	var klaviyoData = JSON.stringify(jsonData);
	
	var baseEncodedData = StringUtils.encodeBase64(klaviyoData);
	
	return encodeURI(baseEncodedData);
	
}


module.exports = {
	sendEmail: sendEmail
};


// HTTP Services
function createKlaviyoService() {
	
	return ServiceRegistry.createService('KlaviyoTrackService', {
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
		}
		
	});	
	
}