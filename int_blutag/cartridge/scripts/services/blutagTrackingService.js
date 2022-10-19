
"use strict";

/* API Includes */
var LocalServiceRegistry = require("dw/svc/LocalServiceRegistry");
var Result = require("dw/svc/Result");
var Site = require("dw/system/Site");
var Logger = require('dw/system/Logger');


/**
* Create and configure service.
*
* @param {string} serviceID - The service ID
* @param {Object} serviceConfig - The service configuration object
* @returns {Service} - The configured service
*/
function getService(serviceID, serviceConfig) {
    var blutagTrackingService = LocalServiceRegistry.createService(serviceID, serviceConfig);
    return blutagTrackingService;
}

/**
 * Service configurations for validating request.
 *
 * @returns {Object} serviceConfig - The service configuration
 */
function getServiceConfigs() {
    var serviceConfig = {
        createRequest: function (svc, args) {
            svc.setRequestMethod("POST");
            svc.addHeader("Content-Type", "application/json");
            return args;
        },
        parseResponse: function(svc, client) {
            return client.text;        
        }
    };
    return serviceConfig;
}

/**
* This method is used to make the call to the Blutag service.
*
* @param {string} requestParamsMap - request parameters
* @returns {Result} blutagTrackingServiceResponse - service result
*/
function callblutagTracking(payload) {
	
	var logger = Logger.getLogger('blutagTracking', 'blutag Service - callblutagTracking()');
    var blutagTrackingServiceResponse;
    var blutagTrackingService = getService("int_blutag.http.tracking.api.service", getServiceConfigs());
    
    var serviceCredential = blutagTrackingService.configuration.credential;

    var blutagTrackingEndpoint = blutagTrackingService.getURL();

    blutagTrackingService.setURL(blutagTrackingEndpoint);
    
    blutagTrackingService.addParam('access_token', serviceCredential.getUser());

    try {
        blutagTrackingServiceResponse = blutagTrackingService.call(payload);
        if (!blutagTrackingServiceResponse.isOk()) {
            var responseStatus = blutagTrackingServiceResponse.getStatus();

            if (Result.UNAVAILABLE_TIMEOUT.equals(responseStatus) || Result.SERVICE_UNAVAILABLE.equals(responseStatus)) {
            	logger.error("A  call was made to blutag API but there were issues with remote server like timeout, rate limits etc");
            }
        }
    } catch (e) {
    	logger.error("An error occured while trying to send request through Blutag API " + e);
    }

    return blutagTrackingServiceResponse;
}

/* Module Exports */
exports.callblutagTracking = callblutagTracking;
