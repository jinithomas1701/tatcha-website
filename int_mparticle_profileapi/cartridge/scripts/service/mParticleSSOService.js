
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
    var mparticleSSOService = LocalServiceRegistry.createService(serviceID, serviceConfig);
    return mparticleSSOService;
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
 * This method is used to create a request body sent to DataDome API.
 *
 * @param {HashMap} requestParamsMap - request parameters
 * @returns {String} requestBody - request body sent to DataDome API
 */
function createServiceRequestBody(serviceCredential) {
    var requestBody = {};
    
    
    requestBody.client_id = serviceCredential.getUser();
    requestBody.client_secret = serviceCredential.getPassword();
    requestBody.audience = "https://api.mparticle.com";
    requestBody.grant_type = "client_credentials";
	
    return JSON.stringify(requestBody);
}

/**
* This method is used to make actual call to Data Dome service.
*
* @param {string} requestParamsMap - request parameters
* @returns {Result} mparticlesSSOServiceResponse - service result
*/
function callmParticleSSO() {
	
	var logger = Logger.getLogger('mParticleSSO', 'mParticle Service - callmParticleSSO()');
    var mparticlesSSOServiceResponse;
    var mparticleSSOService = getService("int_mparticle.http.sso.service", getServiceConfigs());
    
    var serviceCredential = mparticleSSOService.configuration.credential;

    var mparticleSSOEndpoint = mparticleSSOService.getURL();

    mparticleSSOService.setURL(mparticleSSOEndpoint);

    try {
        var requestBody = createServiceRequestBody(serviceCredential);
        mparticlesSSOServiceResponse = mparticleSSOService.call(requestBody);
        if (!mparticlesSSOServiceResponse.isOk()) {
            var responseStatus = mparticlesSSOServiceResponse.getStatus();

            if (Result.UNAVAILABLE_TIMEOUT.equals(responseStatus) || Result.SERVICE_UNAVAILABLE.equals(responseStatus)) {
            	logger.error("A  call was made to mParticle API but there were issues with remote server like timeout, rate limits etc");
            }
        }
    } catch (e) {
    	logger.error("An error occured while trying to send request through Profile API " + e);
    }

    var mparticlesSSOServiceResponseJson = JSON.parse(mparticlesSSOServiceResponse.object);
    
    return mparticlesSSOServiceResponseJson.access_token;
}

/* Module Exports */
exports.callmParticleSSO = callmParticleSSO;
