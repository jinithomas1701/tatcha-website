"use strict";

/* API Includes */
var LocalServiceRegistry = require("dw/svc/LocalServiceRegistry");
var Result = require("dw/svc/Result");
var Site = require("dw/system/Site");
var Encoding = require("dw/crypto/Encoding");
var Logger = require('dw/system/Logger');


/**
* Create and configure service.
*
* @param {string} serviceID - The service ID
* @param {Object} serviceConfig - The service configuration object
* @returns {Service} - The configured service
*/
function getService(serviceID, serviceConfig) {
    var mparticleProfileAPIService = LocalServiceRegistry.createService(serviceID, serviceConfig);
    return mparticleProfileAPIService;
}

/**
 * Service configurations for validating request.
 *
 * @returns {Object} serviceConfig - The service configuration
 */
function getServiceConfigs(bearerToken) {
    var serviceConfig = {
            createRequest: function (svc, args) {
                svc.setRequestMethod("GET");
                svc.addHeader("Authorization", "Bearer " + bearerToken);
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
function createServiceRequestBody() {
    var requestBody = {}; 

    return JSON.stringify(requestBody);
}

/**
* This method is used to make actual call to Data Dome service.
*
* @param {string} requestParamsMap - request parameters
* @returns {Result} mparticleProfileServiceResponse - service result
*/
function callmParticleProfileAPI(access_token,mpid) {
	
	var logger = Logger.getLogger('mParticleProfileAPI', 'mParticle Service - callmParticleProfileAPI()');
    var mparticleProfileServiceResponse;
    var mparticleProfileAPIService = getService("int_mparticle.http.profile.api.service", getServiceConfigs(access_token));
    var org_account_workspace_id = Site.getCurrent().getCustomPreferenceValue('mparticleProfileWorkspaceID');
    var fields = Site.getCurrent().getCustomPreferenceValue('mparticleProfileAPIFields');
    var audiences = "";

    if(!empty(org_account_workspace_id) && !empty(fields)) {
        var mparticleProfileAPIEndpoint = mparticleProfileAPIService.getURL() + org_account_workspace_id + "/" + mpid + "?fields=" + fields;

        mparticleProfileAPIService.setURL(mparticleProfileAPIEndpoint);

        try {
            var requestBody = createServiceRequestBody();
            mparticleProfileServiceResponse = mparticleProfileAPIService.call(requestBody);
            if (!mparticleProfileServiceResponse.isOk()) {
                var responseStatus = mparticleProfileServiceResponse.getStatus();
                logger.error("Error response while calling Profile API for MPID: " + mpid + ". Response Status: ", responseStatus);
            } else {
                var mparticleProfileServiceResponseJson = JSON.parse(mparticleProfileServiceResponse.object);
                var audienceMemberships = mparticleProfileServiceResponseJson.audience_memberships;
                if(!empty(audienceMemberships)) {
                    for(var i = 0; i < audienceMemberships.length; i++) {
                        var audienceMembership = audienceMemberships[i];
                        if(i < audienceMemberships.length-1) {
                            audiences = audiences + audienceMembership.audience_id + ',';
                        } else {
                            audiences = audiences + audienceMembership.audience_id;
                        }
                    }
                }
            }
        } catch (e) {
            logger.error("An error occured while trying to send request through Profile API: " + e);
        }
    }

    if(empty(audiences)) {
    	audiences = 'NONE';
    }
    
      
    return audiences;

}

function findmParticleCookie(cookieName, cookieValue) {
	
	
	var logger = Logger.getLogger('mParticleProfileAPI', 'mParticle Service - findmParticleCookie()');
	var mpid = '';
	logger.error(cookieName + ' the freaking value is ' + cookieName.replace('',''));
	if(cookieName.replace('','').startsWith('mprtcl')){
		logger.error("Found mparticle cookie.");
		mparticleCookieValue = cookieValue;
		mparticleCookieValue = mparticleCookieValue.replace('|',',');
		jsonValue = JSON.parse(mparticleCookieValue);
		mpid = jsonValue.cu;	
	}
	
	return mpid;
	
}

/* Module Exports */
exports.callmParticleProfileAPI = callmParticleProfileAPI;
exports.findmParticleCookie = findmParticleCookie;

