/**
* Script file for use in the Script pipelet node.
* To define input and output parameters, create entries of the form:
*
* @<paramUsageType> <paramName> : <paramDataType> [<paramComment>]
*
* where
*   <paramUsageType> can be either 'input' or 'output'
*   <paramName> can be any valid parameter name
*   <paramDataType> identifies the type of the parameter
*   <paramComment> is an optional comment
*
* For example:
*
*-   @input ExampleIn : String This is a sample comment.
*-   @output ExampleOut : Number
*
*/

importPackage( dw.system );
importPackage( dw.util );
importPackage( dw.web );
importPackage( dw.net );
importPackage( dw.io );
var app = require('app_storefront_controllers/cartridge/scripts/app');
var Site = require('dw/system/Site');

/*
 * This function is used to send verification code  
 */

function sendVerificationCode(phoneNumber,countryCode,type) {
	
	var apiAddress : String = 'https://api.authy.com/protected/json/phones/verification/start'; 
    var apiKey : String = Site.getCurrent().getCustomPreferenceValue('twilioApiKey'); 

	
	if (!apiAddress || !apiKey || !phoneNumber || !countryCode || !type) {
		return;
	}
	
    try
	{
		var response : String = '';		
		var param =  {"api_key":apiKey,"via":type,"phone_number":phoneNumber,"country_code":countryCode};
		params = JSON.stringify(param); 			
		var httpClient = new dw.net.HTTPClient();
		httpClient.setTimeout(5000);
		httpClient.open('POST', apiAddress);
		httpClient.setRequestHeader('Content-Type', 'application/json');
		httpClient.setRequestHeader('Accept', 'application/json');
		httpClient.send(params); 			
	    if (httpClient.statusCode == 200){
	    	response = httpClient.text;
	    	 return response;
	     }
     	return false;
	} 
	catch(e){
		return false;
	}
}

/*
 * This function is used to verify the code  
 */
function verifyCode(phoneNumber,countryCode,verificationCode) {
	
	var apiAddress : String = 'https://api.authy.com/protected/json/phones/verification/check'; 
    var apiKey : String = Site.getCurrent().getCustomPreferenceValue('twilioApiKey'); 

	
	if (!apiKey || !phoneNumber || !countryCode || !verificationCode) {
		return;
	}
	
    try {
		var httpClient = new dw.net.HTTPClient();
		httpClient.setTimeout(5000);
		httpClient.open('GET',apiAddress+'?api_key='+apiKey+'&verification_code='+verificationCode+'&phone_number='+phoneNumber+'&country_code='+countryCode);
		httpClient.setRequestHeader('Content-Type', 'application/json');
		httpClient.setRequestHeader('Accept', 'application/json');
		httpClient.send(); 			
	    if (httpClient.statusCode == 200){
	    	return httpClient.text;
	     }
	}  catch(e){
		return false;
	}
 	return false;
}


module.exports.sendVerificationCode = sendVerificationCode;
module.exports.verifyCode = verifyCode;
