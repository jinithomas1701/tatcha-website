


/* global request, session, response */

/* Script Includes */
var mParticleSSOService = require('~/cartridge/scripts/service/mParticleSSOService');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');

/* API Includes */
var Status = require("dw/system/Status");
var URLUtils = require("dw/web/URLUtils");
var Logger = require('dw/system/Logger');

var Transaction = require('dw/system/Transaction');
var Site = require('dw/system/Site');

/**
 * It loads the Yotpo configuration by locale ID from Custom Objects.
 *
 * @param {string} localeID - current locale id
 * @returns {Object} YotpoConfiguration The CustomObject holding Yotpo configuration.
 */
function loadmparticleprofileApiConfig(key) {
	
	var logger = Logger.getLogger('mParticleProfileAPI', 'mParticle - loadmparticleprofileApiConfig()');

    var mparticleprofileApiConfig = CustomObjectMgr.getCustomObject("mparticleProfileAPIConfigs", key);

    if (mparticleprofileApiConfig == null) {
    	
    	logger.error("Error. Empty mparticleprofileApiConfig. Creating a new one");
    	Transaction.wrap(function () {
    		mparticleprofileApiConfig = CustomObjectMgr.createCustomObject("mparticleProfileAPIConfigs", key);
    	});	  

    }

    return mparticleprofileApiConfig;
}

/**
 * 
 */
function updatemParticleProfileApiAccessToken () {

	var logger = Logger.getLogger('mParticleProfileAPI', 'mParticle - updatemParticleProfileApiAccessToken()');
	
	var mparticleprofileApiConfig = loadmparticleprofileApiConfig(Site.current.ID);

	logger.info("Calling mParticle SSO Service");
	var accessToken = mParticleSSOService.callmParticleSSO();
	logger.info("mParticle SSO Service call successful");

	Transaction.wrap(function () {
		logger.info("Updating key with value; " + accessToken);
		mparticleprofileApiConfig.custom.profileAPIAccesstoken = accessToken;
	});	  
	
	return mparticleprofileApiConfig.custom.profileAPIAccesstoken;
}

/**
 * 
 */
function getmParticleAccessToken() {
	
	var logger = Logger.getLogger('mParticleProfileAPI', 'mParticle - updatemParticleProfileApiAccessToken()');
	
	var accessToken = '';
	
    var mparticleprofileApiConfig = CustomObjectMgr.getCustomObject("mparticleProfileAPIConfigs", Site.current.ID);

    if (mparticleprofileApiConfig == null || empty(mparticleprofileApiConfig.custom.profileAPIAccesstoken)) {	
    	logger.info("Retrieving mParticle Access Token from Service");
    	accessToken = updatemParticleProfileApiAccessToken();
    } else {
    	logger.info("Retrieving mParticle Access Token from Custom Object");
    	accessToken = mparticleprofileApiConfig.custom.profileAPIAccesstoken;
    }
    
    return accessToken;
}



exports.updatemParticleProfileApiAccessToken = updatemParticleProfileApiAccessToken;
exports.getmParticleAccessToken = getmParticleAccessToken;
