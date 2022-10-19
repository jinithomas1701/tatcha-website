'use strict';

/* Constants */
var TWILIO_VERIFY_START = 'https://api.authy.com/protected/json/phones/verification/start';
var TWILIO_VERIFY_CHECK = 'https://api.authy.com/protected/json/phones/verification/check';
var TWILIO_API_KEY = require('dw/system/Site').getCurrent().getCustomPreferenceValue('twilioApiKey');

var LOGGER = require('dw/system/Logger').getLogger('twilio');

/*
 * This function is used to send verification code  
 */

function sendVerificationCode(phoneNumber,countryCode,type) {
	
	if (!TWILIO_VERIFY_START || !TWILIO_API_KEY || !phoneNumber || !countryCode || !type) {
		return;
	}
	
    try {
        var response = '';
        var param =  {"api_key":TWILIO_API_KEY,"via":type,"phone_number":phoneNumber,"country_code":countryCode};
		var params = JSON.stringify(param); 			
		var httpClient = new dw.net.HTTPClient();
		httpClient.setTimeout(5000);
		httpClient.open('POST', TWILIO_VERIFY_START);
		httpClient.setRequestHeader('Content-Type', 'application/json');
		httpClient.setRequestHeader('Accept', 'application/json');
		httpClient.send(params);
	    if (httpClient.statusCode == 200) {
			response = httpClient.text;
	    	return response;
	    }
     	return false;
	} catch(e) {
		LOGGER.error('send verification code failed - ' + e.toString());
		return false;
	}
}

/*
 * This function is used to verify the code  
 */
function verifyCode(phoneNumber, countryCode, verificationCode) {
	
	if (!TWILIO_VERIFY_CHECK || !TWILIO_API_KEY || !phoneNumber || !countryCode || !verificationCode) {
		return;
	}
	
    try {
		var httpClient = new dw.net.HTTPClient();
		httpClient.setTimeout(5000);
		httpClient.open('GET',TWILIO_VERIFY_CHECK+'?api_key='+TWILIO_API_KEY+'&verification_code='+verificationCode+'&phone_number='+phoneNumber+'&country_code='+countryCode);
		httpClient.setRequestHeader('Content-Type', 'application/json');
		httpClient.setRequestHeader('Accept', 'application/json');
		httpClient.send();
	    if (httpClient.statusCode == 200){
	    	return httpClient.text;
	    }
	} catch(e) {
		LOGGER.error('verify verification code failed - '+ e.toString());
		return false;
	}
 	return false;
}

module.exports = {
    sendVerificationCode: sendVerificationCode,
    verifyCode: verifyCode
};
