'use strict';

/**
 * @namespace Twilio
 */

var server = require('server');

var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var CustomerMgr = require('dw/customer/CustomerMgr');
var twilioHelper = require('*/cartridge/scripts/helpers/twilioHelper');

var Transaction = require('dw/system/Transaction');

/**
* Send the verification code for a mobilenumber
*
*/
server.post(
	'SendVerificationCode',
	server.middleware.https,
	function (req, res, next) {
		var phoneNumber = req.form.phoneNumber;
		var countryCode = req.form.countryCode || "1";
		var resetType = req.form.resetType || "sms";
		var updateProfile = req.form.updateProfile || false;
		var resetPassword = req.form.resetPassword || false;
		var userPassword =  req.form.password || "";
		var resetToken = req.form.resetToken || "";
		var response, resettingCustomer;
		var is_cellphone = false;
		var success = false;
		var msg = "";

		if (typeof(phoneNumber) == 'undefined' || empty(phoneNumber)) {
			is_cellphone = false;
			success = false;
			msg = "Empty fields"
		} else {
			try {
	        	phoneNumber = phoneNumber.replace(/\D/g, '');
	        } catch(err){}

			if (!empty(userPassword)) {
				let userName = session.customer.profile.email;
				let isAuthenticatedRequest;
				if (!empty(userName)) {
					try {
						Transaction.begin();
						isAuthenticatedRequest = CustomerMgr.authenticateCustomer(userName, userPassword);
						Transaction.commit();
						if (isAuthenticatedRequest && isAuthenticatedRequest.status !== "AUTH_OK") {
							res.json({
								"response" : {
									"msg": "authentication_failed",
									"is_cellphone": false,
									"success": false
								}
							});
						}
					} catch (e) {
						res.json({
							"response" : {
								"msg": "authentication_failed",
								"is_cellphone": false,
								"success": false
							}
						});
					}
				}
			}

		   if (resetPassword) {
		       let resetProfile = CustomerMgr.queryProfile('phoneMobile = {0} AND custom.countryCode = {1} and custom.isVerifiedPhone = {2}', phoneNumber,countryCode,true);
		       if (resetProfile) {
		    	   resettingCustomer = CustomerMgr.getCustomerByLogin(resetProfile.customer.profile.email);
		       }
		   	   if (empty(resettingCustomer)) {
			   	    res.json({
			   			"response" : {
			   				"msg":"Customer Not Found",
			   				"is_cellphone": false,
			   				"success": false
			   			}
			   		});
		   	   }
		   }

	   	   if (empty(msg)) {
	   		  response = twilioHelper.sendVerificationCode(phoneNumber,countryCode,resetType);
	   	   }

	   	   if (response) {
	   		  let rsp = JSON.parse(response);
			  is_cellphone = rsp.is_cellphone;
			  success = rsp.success;
			  if (success) {
				  msg = "Success";
				  if (dw.system.Site.getCurrent().getCustomPreferenceValue('mParticleEnabled')) {
					  session.privacy.phoneUpdated = true;
				  }
				  if (resetToken) {
					  var resetCustomer = CustomerMgr.getCustomerByToken(resetToken);
					  if (!resetCustomer) {
						res.redirect(URLUtils.url('AccountSfra-PasswordReset'));
					  } else {
						Transaction.wrap(function () {
							resetCustomer.profile.phoneMobile = phoneNumber;
							resetCustomer.profile.custom.isVerifiedPhone = true;
							resetCustomer.profile.custom.countryCode = parseInt(countryCode);
						});
					  }
				  } else {
					if (updateProfile) {
						if (customer.authenticated && customer.registered) {
							if (empty(phoneMobile) || empty(countryCode) || !customer.profile) {
								msg = "Customer update failed";
								success = false;
							} else {
								Transaction.wrap(function () {
									customer.profile.phoneMobile = phoneNumber;
									customer.profile.custom.isVerifiedPhone = false;
									customer.profile.custom.countryCode = parseInt(countryCode);
								});
							}
		              	}
		            }
					session.custom.registeredNumber = phoneNumber;
				  }

			  } else {
				if (is_cellphone) {
					msg = "Not a cell phone";
				} else {
					msg = "Error sending the code";
				}
			  }
	   	   } else {
				msg = "Network Error";
	   	   }
		}

	    res.json({
			"response" : {
				"msg":msg,
				"is_cellphone": is_cellphone,
				"success": success
			}
		});
		next();
	}
);

/**
* Verify the sms code sent for a number
*
*/
server.post(
	'VerifyPasswordResetCode',
	server.middleware.https,
	function (req, res, next) {
		var URLUtils = require('dw/web/URLUtils');

		var phoneNumber = req.form.phoneNumber || "";
		var countryCode = req.form.countryCode || "1";
		var verificationCode = req.form.verificationCode || "";
		var resetPassword = req.form.resetPassword || false;
		var updateProfile = req.form.updateProfile || false;
		var resetToken = req.form.resetToken || "";

		var msg = "";
		var resettingCustomer = "";
		var success = false;
		var error = false;

		if(!empty(phoneNumber) || !empty(verificationCode)){

	        try {
	        	phoneNumber = phoneNumber.replace(/\D/g, '');
	        } catch(err){}

		    if (resetPassword) {
		    	var resetEmail = req.form.resetEmail || "";
		        let resetProfile = CustomerMgr.queryProfile('phoneMobile = {0} AND custom.countryCode = {1} AND custom.isVerifiedPhone = {2} AND email = {3}', phoneNumber,countryCode,true,resetEmail);
		        if (resetProfile){
		     	   resettingCustomer = CustomerMgr.getCustomerByLogin(resetProfile.customer.profile.email);
		        } else {
		        	error = true;
		        	msg = "Customer not found";
		        }
		    }

			if (!error) {
		        let response = twilioHelper.verifyCode(phoneNumber,countryCode,verificationCode);
		        if (response){
		            let rsp = JSON.parse(response);
		            if (rsp && rsp.success){
		                msg = "Code verified";
		                success = true;
		                if (resetToken) {
	      				  var resetCustomer = CustomerMgr.getCustomerByToken(resetToken);
						  if (!resetCustomer) {
							res.redirect(URLUtils.url('AccountSfra-PasswordReset'));
						  } else {
							Transaction.wrap(function () {
								resetCustomer.profile.phoneMobile = phoneNumber;
								resetCustomer.profile.custom.isVerifiedPhone = true;
								resetCustomer.profile.custom.countryCode = parseInt(countryCode);
							});
						  }
	                	}
		                if (updateProfile) {
		                	 if (customer.authenticated && customer.registered) {
								if (empty(phoneMobile) || empty(countryCode) || !customer.profile) {
									msg = "Customer update failed";
			    	                success = false;
								} else {
									Transaction.wrap(function () {
										customer.profile.phoneMobile = phoneNumber;
										customer.profile.custom.isVerifiedPhone = false;
										customer.profile.custom.countryCode = parseInt(countryCode);
									});
								}
		                	}
		                } else {
		                	if (empty(resetToken)) {
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

	    if (resetPassword && !empty(resettingCustomer) && msg == 'Code verified' ) {
	    	var resetPasswordToken;
			Transaction.wrap(function () {
				resetPasswordToken = resettingCustomer.profile.credentials.createResetPasswordToken();
			});
	    	let resetPasswordUrl = URLUtils.https('AccountSfra-SetNewPassword', 'Token', resetPasswordToken);

	    	res.json({
	    		"response" : {
	    			"success":success,
	    			"redirectUrl":(resetPasswordUrl) ? ""+resetPasswordUrl : "",
	    			"msg": msg
	    		}
	    	});

	    } else {
	    	res.json({
	    		"response" : {
	    			"success":success,
	    			"msg": msg
	    		}
	    	});
	    }
		next();
	}
);

server.post(
	'DeletePhoneNumber',
	server.middleware.https,
	csrfProtection.validateAjaxRequest,
	function (req, res, next) {
		var userPassword =  req.form.password || "";
		var msg = "";
		var success = false;
		var error = false;

		if (!empty(userPassword)) {
			let userName = session.customer.profile.email;
			if (!empty(userName)) {
				try {
					Transaction.wrap(function () {
						let isAuthenticatedRequest = CustomerMgr.authenticateCustomer(userName, userPassword);
						if (isAuthenticatedRequest && isAuthenticatedRequest.status !== "AUTH_OK") {
							res.json({
								"response" : {
									"msg": "authentication_failed",
									"is_cellphone": false,
									"success": false
								}
							});
						} else {
							if (customer.authenticated && customer.registered) {
								if (!customer.profile) {
									msg = "Customer update failed";
			    	                success = false;
								} else {
									Transaction.wrap(function () {
										customer.profile.phoneMobile = '';
										customer.profile.custom.isVerifiedPhone = false;
										customer.profile.custom.countryCode = 0;
									});
									msg = "Customer data updated";
						            success = true;
								}
							}
							res.json({
								"response" : {
									"success":success,
									"msg": msg
								}
							});
						}
				    });
				} catch(e) {
					res.json({
						"response" : {
							"msg": "authentication_failed",
							"is_cellphone": false,
							"success": false
						}
					});
				}
			}
		}
		next();
	}
);

module.exports = server.exports();
