/**
* Description of the Controller and the logic it provides
*
* @module  controllers/Loqate
*/

'use strict';


/* Script Modules */
var Transaction = require('dw/system/Transaction');
var CustomerMgr = require('dw/customer/CustomerMgr');
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var Site = require('dw/system/Site');


// HINT: do not put all require statements at the top of the file
// unless you really need them for all functions


/**
 * Loqate Address verification,
 * Method checks the address, and returns verification status and
 * a suggested address if one available from Loqate response,
 * **/
var verifyAddress = function() {
	var loqate = require('app_storefront_core/cartridge/scripts/util/LoqateHelper');
	let r = require('~/cartridge/scripts/util/Response');
	var param = request.httpParameterMap;
	var hasError = false;
	
	if(!param || empty(param.Address)) {
		hasError = true;
	}
	
	var address = JSON.parse(param.Address.stringValue);
	if( (address['Address1'] && address['Address1'].length === 0) || (address['Country'] && address['Country'].length === 0) || (address['PostalCode'] && address['PostalCode'].length === 0) || (address['State'] && address['State'].length === 0)) {
		hasError = true;
	}
	
	if(hasError) {
		r.renderJSON({
			"response" : {
				"success": false
			}
		});
		return;
	}
	
	try {
		// address verification service call
		var response = loqate.verifyAddress(address);
		
		if(!response) {
			r.renderJSON({
				"response" : {
					"success": false
				}
			});
			return;
		}
		
		if(response) {
			var res = response;
			if(res.length > 0) {
				var rs = JSON.parse(res);
				var rowData = rs[0];
				var responseData ={};
				var hasAddressSuggetion = false;
				var isSuccess = false;
				var verificationStatus = '';
				
				// Comma separated list of acceptable AQI index (eg:- 'A,B')
				var acceptedAQIs = Site.getCurrent().getCustomPreferenceValue('LOQATE_Address_Quality_index');
				var AQIs = acceptedAQIs.toUpperCase();
				
				/**
				 * To check the address quality index returned by loquate,
				 * If it is greater than the min quality index configured, return loqate suggested address
				 * Else, return a flag indicating hasAddressSuggetion = false
				 * **/
				
				if(rowData && rowData.Matches && rowData.Matches.length > 0) {
					isSuccess =  true;
					
					var addressData = rowData.Matches[0];
					var isValidAQI = addressData.AQI ? (AQIs.indexOf(addressData.AQI.toUpperCase()) > -1) : false;
					var isValidPostVerificationValue = false;
					
					if(addressData.AVC) {
						isValidPostVerificationValue = (addressData.AVC[1] >= 4) ? true : false;
					}
					
					var addressMatchScore = 0;
					var postProcessedVerificationMatchLevel = 0;
					
					// set user entered address to response object
					if(rowData.Input) {
						responseData.inputAddress = rowData.Input;
					}
					
					//set address suggestion to response object
					responseData.suggestedAddress = addressData;
					
					if(addressData.AVC) {
						var avcSplit = addressData.AVC.split('-');
						if(avcSplit.length === 4) {
							addressMatchScore = avcSplit[3];
							postProcessedVerificationMatchLevel = avcSplit[0];
						}
					}
					
					if(isValidAQI && isValidPostVerificationValue){
						// Address suggestion available
						hasAddressSuggetion = true;
						verificationStatus = 'verified';
						
					} else if ((isValidAQI && !isValidPostVerificationValue) || (!isValidAQI && isValidPostVerificationValue )) {
						//addresses with some partial corrections required
						hasAddressSuggetion = true;
						verificationStatus = 'partial';

					} else if((!addressData.hasOwnProperty('AQI')) || (addressData && (!isValidAQI && !isValidPostVerificationValue))) {
						
						verificationStatus = 'unverified';
						hasAddressSuggetion = true;
						
					} else {
						hasAddressSuggetion = false;
					}
					
				} else {
					hasAddressSuggetion =  false;
				}
			}
			
			r.renderJSON({
				"response" : {
					"success": isSuccess,
					"hasAddressSuggetion": hasAddressSuggetion,
					"verificationStatus": verificationStatus,
					"matchScore": addressMatchScore,
					"postProcessMatch": postProcessedVerificationMatchLevel,
					"data": responseData
				}
			});
		}
	} catch(e) {
		r.renderJSON({
			"response" : {
				"success": false
			}
		});
		return;
	}
	
} 


exports.VerifyAddress = guard.ensure(['post', 'https'], verifyAddress);
