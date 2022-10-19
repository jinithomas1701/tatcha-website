/**
* Description of the Controller and the logic it provides
*
* @module  controllers/Twilio
*/

'use strict';

// HINT: New Controller functions

/* Script Modules */
var Transaction = require('dw/system/Transaction');
var CustomerMgr = require('dw/customer/CustomerMgr');
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');

/**
* Send the verification code for a mobilenumber
*
*/
var sendVerificationCode = function(){
	
	var phoneNumber = request.httpParameterMap.phoneNumber.stringValue;	
	var countryCode = request.httpParameterMap.countryCode.stringValue ? request.httpParameterMap.countryCode.stringValue : "1"; 
	var resetType = request.httpParameterMap.resetType.stringValue ? request.httpParameterMap.resetType.stringValue : "sms";
	var updateProfile = request.httpParameterMap.updateProfile.stringValue ? request.httpParameterMap.updateProfile.stringValue : false;
	var resetPassword = request.httpParameterMap.resetPassword.stringValue ? request.httpParameterMap.resetPassword.stringValue : false;
	var userPassword =  request.httpParameterMap.password.stringValue ? request.httpParameterMap.password.stringValue : "";
	var resetToken = request.httpParameterMap.resetToken ? request.httpParameterMap.resetToken.stringValue : "";
	var response,resettingCustomer;
	var is_cellphone = false;
	var success = false;
	var msg = "";
	
	if(typeof(phoneNumber) == 'undefined' || empty(phoneNumber)){
		is_cellphone = false;
		success = false;
		msg = "Empty fields"
		
	} else {
		try {
        	phoneNumber = phoneNumber.replace(/\D/g, '');
        } catch(err){}
		
		if(!empty(userPassword)) {
			let userName = session.customer.profile.email;
			let isAuthenticatedRequest;
			if(!empty(userName)) {
				try {
					Transaction.begin();
					isAuthenticatedRequest =  CustomerMgr.authenticateCustomer(userName, userPassword);
					Transaction.commit();
					if(isAuthenticatedRequest && isAuthenticatedRequest.status !== "AUTH_OK") {
						require('~/cartridge/scripts/util/Response').renderJSON({
							"response" : {
								"msg": "authentication_failed",
								"is_cellphone": false,
								"success": false
							}
						});
						return;
					}
				} catch (e) {
					require('~/cartridge/scripts/util/Response').renderJSON({
						"response" : {
							"msg": "authentication_failed",
							"is_cellphone": false,
							"success": false
						}
					});
					return;
				}
			}
		}
		
	   //Get the customer			
	   if(resetPassword){
	       let resetProfile = CustomerMgr.queryProfile('phoneMobile = {0} AND custom.countryCode = {1} and custom.isVerifiedPhone = {2}', phoneNumber,countryCode,true);
	       if(resetProfile){
	    	   resettingCustomer = app.getModel('Customer').retrieveCustomerByLogin(resetProfile.customer.profile.email);
	       }        	
	   	   if (empty(resettingCustomer)) {
		   	    require('~/cartridge/scripts/util/Response').renderJSON({
		   			"response" : {
		   				"msg":"Customer Not Found",
		   				"is_cellphone": false,
		   				"success": false
		   			}
		   		});
		   	    return;
	   	   }		   
	   }	

   	   //Call the API
   	   if (empty(msg)) {
   		  response = require('app_storefront_core/cartridge/scripts/util/TwilioHelper').sendVerificationCode(phoneNumber,countryCode,resetType);   		
   	   }
   	   
   	   // set the error code if not success
   	   if(response){
   		  let rsp = JSON.parse(response); 
		  is_cellphone = rsp.is_cellphone;
		  success = rsp.success;
		  if(success) {
			  msg = "Success";
			  if (dw.system.Site.getCurrent().getCustomPreferenceValue('mParticleEnabled')) {
				  session.privacy.phoneUpdated = true;
			  }
			  if(resetToken) {
				  var Customer = app.getModel('Customer');
				  var resetCustomer = Customer.getByPasswordResetToken(resetToken);
				  var updateStatus = Customer.updateCustomerPhoneByCustomerData(resetCustomer, phoneNumber, countryCode, false);
			  } else {
				  if(updateProfile){
	              	if(customer.authenticated && customer.registered){
	              		//status is not checked bcos SMS is already triggered. In verify method update is invoked again
	              		var updateStatus = app.getModel('Customer').updateCustomerPhone(phoneNumber,countryCode,false);
	              	}	                	
	              }
				  session.custom.registeredNumber = phoneNumber;
			  }
			  
		  } else {            				
			if(is_cellphone) {
				msg = "Not a cell phone";
			} else {
				msg = "Error sending the code";
			}            				
		  }            			
   	   } else {
   		msg = "Network Error";
   	   } 

	}
	
    require('~/cartridge/scripts/util/Response').renderJSON({
		"response" : {
			"msg":msg,
			"is_cellphone": is_cellphone,
			"success": success
		}
	});
}

/**
* Send the verify sms code for a number
*
*/
function verifyPasswordResetCode() {	
	var currentHttpParameterMap = request.httpParameterMap;
	var phoneNumber = request.httpParameterMap.phoneNumber.stringValue ? request.httpParameterMap.phoneNumber.stringValue : "";	
	var countryCode = request.httpParameterMap.countryCode.stringValue ? request.httpParameterMap.countryCode.stringValue : "1"; 
	var verificationCode = currentHttpParameterMap.verificationCode.stringValue ? request.httpParameterMap.verificationCode.stringValue : "";
	var resetPassword = currentHttpParameterMap.resetPassword.stringValue ? currentHttpParameterMap.resetPassword.stringValue : false;
	var updateProfile = currentHttpParameterMap.updateProfile.stringValue ? currentHttpParameterMap.updateProfile.stringValue : false;
	var resetToken = request.httpParameterMap.resetToken ? request.httpParameterMap.resetToken.stringValue : "";
	
	var twilio = require('app_storefront_core/cartridge/scripts/util/TwilioHelper');
	var msg = "";
	var resettingCustomer = "";
	var success = false;
	var error = false;
	
	if(!empty(phoneNumber) || !empty(verificationCode)){
		
        try {
        	phoneNumber = phoneNumber.replace(/\D/g, '');
        } catch(err){}
        
		//Get the customer	
	    if(resetPassword) {
	    	var resetEmail = currentHttpParameterMap.resetEmail.stringValue ? request.httpParameterMap.resetEmail.stringValue : "";
	        let resetProfile = require('dw/customer/CustomerMgr').queryProfile('phoneMobile = {0} AND custom.countryCode = {1} AND custom.isVerifiedPhone = {2} AND email = {3}', phoneNumber,countryCode,true,resetEmail);
	        if(resetProfile){
	     	   resettingCustomer = app.getModel('Customer').retrieveCustomerByLogin(resetProfile.customer.profile.email);
	        } else {
	        	error = true;
	        	msg = "Customer not found";
	        }     	
	    }
	
	    // Check if reset password / Phone capture
		 if(!error) {
	        let response = twilio.verifyCode(phoneNumber,countryCode,verificationCode);  
	        if(response){
	            let rsp = JSON.parse(response); 
	            if(rsp && rsp.success){        	
	                msg = "Code verified";
	                success = true;	                
	                //Check if profile needs to be updated
	                if(resetToken) {
      				  var Customer = app.getModel('Customer');
      				  var resetCustomer = Customer.getByPasswordResetToken(resetToken);
      				  var updateStatus = Customer.updateCustomerPhoneByCustomerData(resetCustomer, phoneNumber, countryCode, true);
                	}
	                if(updateProfile){
	                	 if(customer.authenticated && customer.registered){
	                		var updateStatus = app.getModel('Customer').updateCustomerPhone(phoneNumber,countryCode,true);
	                		if(!updateStatus){
		    	                msg = "Customer update failed";
		    	                success = false;	                			
	                		}
	                	}		                	
	                } else {
	                	if(empty(resetToken)) {
	                		session.custom.phoneVerified = true;
			                session.custom.phoneNumber = phoneNumber;
			                session.custom.countryCode = countryCode;
	                	}                	
	                }
	                
	            }       	
	        } else {
	        	msg = "Invalid code";
	        }
	    }
	} else {
		msg ="Empty parameters";
	}
	
    //Response
    let r = require('~/cartridge/scripts/util/Response');
    if(resetPassword && !empty(resettingCustomer) && msg == 'Code verified' ) {    	
    	//Generate token and url     	
    	let resetPasswordToken = resettingCustomer.generatePasswordResetToken(); 
    	let resetPasswordUrl = require('dw/web/URLUtils').https('Account-SetNewPassword', 'Token', resetPasswordToken);
    	
    	r.renderJSON({
    		"response" : {
    			"success":success,
    			"redirectUrl":(resetPasswordUrl) ? ""+resetPasswordUrl : "",
    			"msg": msg
    		}
    	});
    	
    } else {
    	r.renderJSON({
    		"response" : {
    			"success":success,
    			"msg": msg
    		}
    	});
    }

	return;
}

function deletePhoneNumber() {
	var currentHttpParameterMap = request.httpParameterMap;
	var userPassword =  request.httpParameterMap.password.stringValue ? request.httpParameterMap.password.stringValue : "";
	var msg = "";
	var success = false;
	var error = false;
	
	if(!empty(userPassword)) {
		let userName = session.customer.profile.email;
		if(!empty(userName)) {
			try {
				Transaction.wrap(function () {
					let isAuthenticatedRequest =  CustomerMgr.authenticateCustomer(userName, userPassword);
					if(isAuthenticatedRequest && isAuthenticatedRequest.status !== "AUTH_OK") {
						require('~/cartridge/scripts/util/Response').renderJSON({
							"response" : {
								"msg": "authentication_failed",
								"is_cellphone": false,
								"success": false
							}
						});
						return;
					} else {
						if(customer.authenticated && customer.registered){
							
							var updateStatus = app.getModel('Customer').updateCustomerPhone("",0,false, true);
							if(!updateStatus){
					            msg = "Customer update failed";
					            success = false;	                			
							} else {
								msg = "Customer data updated";
					            success = true;
							}
						}
						let r = require('~/cartridge/scripts/util/Response');
						r.renderJSON({
							"response" : {
								"success":success,
								"msg": msg
							}
						});
					}
			    });
			}catch(e){
				require('~/cartridge/scripts/util/Response').renderJSON({
					"response" : {
						"msg": "authentication_failed",
						"is_cellphone": false,
						"success": false
					}
				});
				return;
			}
			
		}
	}
}

/* Exports of the controller */
exports.SendVerificationCode = guard.ensure(['post', 'https'], sendVerificationCode);
exports.VerifyPasswordResetCode = guard.ensure(['post', 'https'], verifyPasswordResetCode);
exports.DeletePhoneNumber = guard.ensure(['post', 'https', 'csrf'], deletePhoneNumber);
