'use strict';

/* Script Modules */
var Site = require('dw/system/Site');
var Logger = require('dw/system/Logger');
var ServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Transaction = require('dw/system/Transaction');
var apiKey = Site.getCurrent().getCustomPreferenceValue('klaviyo_api_key');

/**
 * Uses the post subscribe list API call per
 * https://www.klaviyo.com/docs/api/v2/lists#post-subscribe
 * to subscribe an email to a subscription list.
 * 
 * @param email
 * @returns
 */
function subscribeToList (email, source) {
	
	var logger = Logger.getLogger('Klaviyo', 'KlaviyoSubscriptionUtils - subscribeToList()');
	
	try {
		var subscriptionStatus = false;
		if(checkSubscription(email, source)) {
			return false;
		}
		var jsonData = prepareSubscribePayload(email, source); 
		var KlaviyoSubscriptionService = createKlaviyoSubscriptionService();
		var result = KlaviyoSubscriptionService.call(jsonData);
		
		var resultObj = JSON.parse(result.object);
		if(!empty(resultObj)) {
			var response = resultObj[0];
			if (!empty(response) && response.email == email) {
				subscriptionStatus = true;
			} else {
				logger.error('subscribeToList() failed for ' + email + '. Error from Klaviyo. Response: ' + resultObj);
				return;
			}
		}
		
		return subscriptionStatus;
	} catch(e) {
		logger.error('subscribeToList() failed for ' + email + 'at source ' + source + ' .Error: ' +  e.message);
		return;
	}
	
}

/**
 * Prepares subscribe payload per https://www.klaviyo.com/docs/api/v2/lists#post-subscribe
 * @param email
 * @returns
 */
function prepareSubscribePayload (email, source) {
	
	var jsonData = {};
	var profiles = [];
	
	jsonData.api_key = apiKey;
	jsonData.profiles = profiles;
	var profileData = {};
	profileData.email = email;
	if (!empty(source)) {
		profileData.source = source;
	}
	jsonData.profiles.push(profileData);
	
	return JSON.stringify(jsonData);
	
}


/**
 * 
 * @param email
 * @returns
 */
function checkSubscription (email) {
	
	var logger = Logger.getLogger('Klaviyo', 'KlaviyoSubscriptionUtils - checkSubscription()');
	
	try {
		var requestObj = {};
		var KlaviyoCheckSubscriptionService = createKlaviyoCheckSubscriptionService();
		KlaviyoCheckSubscriptionService.addParam('emails', email);
		var result = KlaviyoCheckSubscriptionService.call(requestObj);
		var profileId = null;
		var resultObj = JSON.parse(result.object);
		if(!empty(resultObj)) {
			var response = resultObj[0];
			if (!empty(response) && response.email == email) {
				profileId = response.id;
			} else {
				logger.error('checkSubscription() failed for ' + email + '. Error from Klaviyo. Response: ' + resultObj);
				return;
			}
		} else {
			logger.info('checkSubscription() returned empty for ' + email + '.');
			return;
		}
		return profileId;
	} catch (e) {
		logger.error('checkSubscription() failed for ' + email + '. Error: ' +  e.message);
		return;
	}
}


/**
 * 
 * @param customerId
 * @returns
 */
function getProfile (customerId) {
	var logger = Logger.getLogger('Klaviyo', 'KlaviyoSubscriptionUtils - getProfile()');
	
	try {
		var KlaviyoProfileService = createKlaviyoProfileService();
		var url = KlaviyoProfileService.getURL();
		url = url + '/' + customerId;
		KlaviyoProfileService.setURL(url);
		var requestObj = {};
		var result = KlaviyoProfileService.call(requestObj);
		
		var resultObj = JSON.parse(result.object);
		return resultObj;
	} catch (e) {
		logger.error('getProfile() failed for customer ID: ' + customerId + '. Error: ' +  e.message);
		return;
	}
	
}

/**
 * Syncs subscription information into Klaviyo on login.
 * @returns
 */
function syncSubscription () {
	var logger = Logger.getLogger('Klaviyo', 'KlaviyoSubscriptionUtils - syncSubscription()');
	
	try {
		var customerEmail = session.customer.profile.email;
		var profileId = checkSubscription(customerEmail);
		if (!empty(profileId)) {
			var klaviyoProfile = getProfile(profileId);
			if(!empty(klaviyoProfile)) {
				var newsletterSubscription = klaviyoProfile["Newsletter Subscriber"];
				var newsletterFrequency = klaviyoProfile["Newsletter Frequency"];
				if (!empty(newsletterSubscription) && !empty(newsletterFrequency)) {
					Transaction.wrap(function () {
						session.customer.profile.custom.newsletterSubscription = newsletterSubscription;
						session.customer.profile.custom.newsletterFrequency = newsletterFrequency;
					});
				}
			}
		}
	} catch (e) {
		logger.error('syncSubscription() failed for customer email: ' + customerEmail + '. Error: ' +  e.message);
		return;
	}
}

/**
 * Checks for an empty js object
 * @param obj
 * @returns
 */
function isEmpty(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop))
            return false;
    }

    return JSON.stringify(obj) === JSON.stringify({});
}

module.exports = {
		subscribeToList: subscribeToList,
		getProfile: getProfile,
		syncSubscription: syncSubscription
	};

//HTTP Services

function createKlaviyoSubscriptionService() {
	return ServiceRegistry.createService('KlaviyoSubscriptionService', {
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
}

function createKlaviyoCheckSubscriptionService() {
	return ServiceRegistry.createService('KlaviyoCheckSubscriptionService', {
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
			svc = svc.setRequestMethod("GET");	
			svc = svc.addHeader('api-key', apiKey)
			
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