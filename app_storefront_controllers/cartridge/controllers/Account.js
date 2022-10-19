'use strict';

/**
 * Controller that renders the account overview, manages customer registration and password reset,
 * and edits customer profile information.
 *
 * @module controllers/Account
 */

/* API includes */
var Resource = require('dw/web/Resource');
var URLUtils = require('dw/web/URLUtils');
var Form = require('~/cartridge/scripts/models/FormModel');
var OrderMgr = require('dw/order/OrderMgr');

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var Transaction = require('dw/system/Transaction');
var Tatcha = require('app_storefront_core/cartridge/scripts/util/Tatcha');
var Site = require('dw/system/Site');
var securityHeader = require('~/cartridge/scripts/util/SecurityHeaders');
var braintreeUtil = require('*/cartridge/scripts/util/braintreeUtil.js');

importPackage( dw.web );

/**
 * Gets a ContentModel object that wraps the myaccount-home content asset,
 * updates the page metadata, and renders the account/accountoverview template.
 */
function show() {
    var accountHomeAsset, pageMeta, Content;

    Content = app.getModel('Content');
    accountHomeAsset = Content.get('myaccount');

    pageMeta = require('~/cartridge/scripts/meta');
    pageMeta.update(accountHomeAsset);
    securityHeader.setSecurityHeaders();
    app.getView().render('account/accountoverview');
}

/**
 * Clears the profile form and copies customer profile information from the customer global variable
 * to the form. Gets a ContentModel object that wraps the myaccount-personaldata content asset, and updates the page
 * meta data. Renders the account/user/registration template using an anonymous view.
 */
function editProfile() {
    var pageMeta;
    var accountPersonalDataAsset;
    var Content = app.getModel('Content');

    if (!request.httpParameterMap.invalid.submitted) {
        app.getForm('profile').clear();
        session.custom.errorForm = null;
		session.custom.isAcceptablePassword = null;

        app.getForm('profile.customer').copyFrom(customer.profile);
        app.getForm('profile.login').copyFrom(customer.profile.credentials);
        app.getForm('profile.addressbook.addresses').copyFrom(customer.profile.addressBook.addresses);
    }
    accountPersonalDataAsset = Content.get('myaccount');
	var isProfileUpdated = session.custom.profileUpdated;
	session.custom.profileUpdated = null;
    pageMeta = require('~/cartridge/scripts/meta');
    pageMeta.update(accountPersonalDataAsset);
    securityHeader.setSecurityHeaders();
    // @FIXME bctext2 should generate out of pagemeta - also action?!
    app.getView({
        bctext2: Resource.msg('account.user.registration.editaccount', 'account', null),
		isProfileUpdated: isProfileUpdated ? isProfileUpdated : false,
        Action: 'edit',
        ContinueURL: URLUtils.https('Account-EditForm')
    }).render('account/user/registration');
}


function emailupdate() {
    var pageMeta = require('~/cartridge/scripts/meta');
    var content = app.getModel('Content').get('myaccount');
    if (content) {
        pageMeta.update(content.object);
    }
    
    app.getView().render('account/user/emailupdate');
}

function editSubscribtion(){
	app.getForm('subscribe').handleAction({
        cancel: function () {
            app.getForm('subscribe').clear();
            response.redirect(URLUtils.https('Account-Show'));
        },

		updatepref: function () {
			var customer= session.customer;
			var frequency = app.getForm('subscribe.newsletterFrequency').value();
			if(customer) {
				Transaction.wrap(function () {
	    			customer.profile.custom.newsletterFrequency = frequency;
	    		});
			}
			session.custom.updatePref = 'Your preferences have been updated.';
			response.redirect(URLUtils.https('Account-EmailUpdate'));
	    },
	    
	    unsubscribe: function (){
	    	var  Email;
	    	var customer= session.customer;
	    	var email = customer.profile.email;
	    	
    		Transaction.wrap(function () {
    			customer.profile.custom.newsletterSubscription = false;
    			customer.profile.custom.newsletterFrequency = '';
    		});        	
            response.redirect(URLUtils.https('Account-EmailUpdate', 'triggerEvent', 'unsubscribe'));   	
	    },
	    
	    subscribe: function (){
	    	var Email;
	    	var CustomerMgr =require('dw/customer/CustomerMgr'); 
	    	var customer= session.customer;
	    	var email = app.getForm('subscribe.email').value();
	    	
	    	var existingCustomer = CustomerMgr.getCustomerByLogin(email);
	    	
	    	if(existingCustomer) {
	    		Transaction.wrap(function () {
	    			existingCustomer.profile.custom.newsletterSubscription = true;
	    			existingCustomer.profile.custom.newsletterFrequency = 'default';
	    		});
	    	}

	    	if(request.httpParameterMap.format.stringValue === 'ajax') {
    			let r = require('~/cartridge/scripts/util/Response');
    	        r.renderJSON({status: 'success'});
    	        return;
    		} else {
    			response.redirect(URLUtils.https('Account-EmailUpdate', 'triggerEvent', 'newsletterSuccess'));
    		}
	    }
	});
}
/**
 * Handles the form submission on profile update of edit profile. Handles cancel and confirm actions.
 *  - cancel - clears the profile form and redirects to the Account-Show controller function.
 *  - confirm - gets a CustomerModel object that wraps the current customer. Validates several form fields.
 * If any of the profile validation conditions fail, the user is redirected to the Account-EditProfile controller function. If the profile is valid, the user is redirected to the Account-Show controller function.
 */
function editForm() {
    app.getForm('profile').handleAction({
        cancel: function () {
            app.getForm('profile').clear();
            response.redirect(URLUtils.https('Account-Show'));
        },
        confirm: function () {
            var isProfileUpdateValid = true;
            var hasEditSucceeded = false;
            var Customer = app.getModel('Customer');
            var email = app.getForm('profile.customer.email').value();
            
            if (app.getForm('profile.customer.birthday').value()) {
            	var myDate = new Date(app.getForm('profile.customer.birthday').value());
                var today = new Date();
                if (myDate>today) {
                	app.getForm('profile.customer.birthday').invalidate();
                	isProfileUpdateValid = false;
                }                
            }

            if (isProfileUpdateValid) {
                hasEditSucceeded = Customer.editProfile(app.getForm('profile'));
                if (!hasEditSucceeded) {
                    isProfileUpdateValid = false;                    
                }
            }

            if (isProfileUpdateValid && hasEditSucceeded) {
				session.custom.profileUpdated = true;
                response.redirect(URLUtils.https('Account-EditProfile'));
                session.custom.errorForm = null;
				session.custom.isAcceptablePassword = null;
            } else {
            	session.custom.errorForm = 'profile';
                response.redirect(URLUtils.https('Account-EditProfile', 'invalid', 'true'));
            }
        },
        changeemail: function() {
        	var isProfileUpdateValid = true;
            var hasEditSucceeded = false;
            var Customer = app.getModel('Customer');

            if (!Customer.checkUserName()) {
                app.getForm('profile.customer.email').invalidate();
                isProfileUpdateValid = false;
            }

            if (app.getForm('profile.customer.email').value() !== app.getForm('profile.customer.emailconfirm').value()) {
                app.getForm('profile.customer.emailconfirm').invalidate();
                isProfileUpdateValid = false;
            }
            
            if (isProfileUpdateValid) {
                hasEditSucceeded = Customer.editEmail(app.getForm('profile.customer.email').value(), app.getForm('profile'));

                if (!hasEditSucceeded) {
                    app.getForm('profile.login.email').invalidate();
                    isProfileUpdateValid = false;                    
                }
            }

            if (isProfileUpdateValid && hasEditSucceeded) {
				session.custom.profileUpdated = true;
				if(Site.getCurrent().getCustomPreferenceValue('mParticleEnabled')) {
					session.privacy.emailUpdated = true;
            	}
                response.redirect(URLUtils.https('Account-EditProfile'));
                session.custom.errorForm = null;
				session.custom.isAcceptablePassword = null;
            } else {
            	session.custom.errorForm = 'email';
                response.redirect(URLUtils.https('Account-EditProfile', 'invalid', 'true'));
            }
        },
        changepassword: function () {
            var isProfileUpdateValid = true;
            var hasEditSucceeded = false;
            var Customer = app.getModel('Customer');
			var CustomerMgr =require('dw/customer/CustomerMgr');
			var isAcceptablePassword = null;
			session.custom.isAcceptablePassword = null;

            if (!app.getForm('profile.login.currentpassword').value()) {
                app.getForm('profile.login.currentpassword').invalidate();
                isProfileUpdateValid = false;
            }

            if (app.getForm('profile.login.newpassword').value() !== app.getForm('profile.login.newpasswordconfirm').value()) {
                app.getForm('profile.login.newpasswordconfirm').invalidate();
                isProfileUpdateValid = false;
            }
			
			if(isProfileUpdateValid) {
				isAcceptablePassword = CustomerMgr.isAcceptablePassword(app.getForm('profile.login.newpassword').value());
				if(!isAcceptablePassword) {
					isProfileUpdateValid = false;
				}
			}

            if (isProfileUpdateValid) {
                hasEditSucceeded = Customer.editPassword(app.getForm('profile.login.newpassword').value(), app.getForm('profile.login.currentpassword').value());
                if (!hasEditSucceeded) {
                    app.getForm('profile.login.currentpassword').invalidate();
                    //app.getForm('profile.login.newpassword').invalidate();
                    //app.getForm('profile.login.newpasswordconfirm').invalidate();
                }
            }

            if (isProfileUpdateValid && hasEditSucceeded) {
				session.custom.profileUpdated = true;
				session.custom.isAcceptablePassword = null;
                response.redirect(URLUtils.https('Account-EditProfile'));
            } else {
            	session.custom.errorForm = 'password';
				session.custom.isAcceptablePassword = isAcceptablePassword;
                response.redirect(URLUtils.https('Account-EditProfile', 'invalid', 'true','isAcceptablePassword', isAcceptablePassword));
            }
        },
        
        error: function () {
        	if(app.getForm('profile').object.submittedAction.formId == 'changepassword') {
        		session.custom.errorForm = 'password';
        		var isAcceptablePassword = null;
        		if(!empty(app.getForm('profile.login.newpassword').value())) {
        			var CustomerMgr =require('dw/customer/CustomerMgr');
					isAcceptablePassword = CustomerMgr.isAcceptablePassword(app.getForm('profile.login.newpassword').value());
					session.custom.isAcceptablePassword = isAcceptablePassword;
				}
        	} else if(app.getForm('profile').object.submittedAction.formId == 'changeemail') {
        		session.custom.errorForm = 'email';
        	} else {
        		session.custom.errorForm = 'profile';
        	}
            response.redirect(URLUtils.https('Account-EditProfile', 'invalid', 'true'));
        }
    });
}

/**
 * Gets the requestpassword form and renders the requestpasswordreset template. This is similar to the password reset
 * dialog, but has a screen-based interaction instead of a popup interaction.
 */
function passwordReset() {
	securityHeader.setSecurityHeaders();
	if(!empty(request.httpParameterMap.resetType.stringValue) && request.httpParameterMap.resetType.stringValue != null){
		passwordResetForm();
	}
	else{
		var template = 'account/password/requestpasswordreset_emailonly';
	
		if(Site.getCurrent().getCustomPreferenceValue('enableSMSPasswordReset') == true){
			template = 'account/password/requestpasswordreset';
		} 
        
	    app.getForm('requestpassword').clear();
	    app.getView({
	        ContinueURL: URLUtils.https('Account-PasswordReset'),
	        CountryCode: '1'
	    }).render(template);
	}
}

/**
 * Handles form submission from dialog and full page password reset. Handles cancel, send, and error actions.
 *  - cancel - renders the given template.
 *  - send - gets a CustomerModel object that wraps the current customer. Gets an EmailModel object that wraps an Email object.
 * Checks whether the customer requested the their login password be reset.
 * If the customer wants to reset, a password reset token is generated and an email is sent to the customer using the mail/resetpasswordemail template.
 * Then the account/password/requestpasswordreset_confirm template is rendered.
 *  - error - the given template is rendered and passed an error code.
 */
function passwordResetFormHandler(templateName, continueURL) {
    var resetPasswordToken, passwordemail;

    app.getForm('profile').handleAction({
        cancel: function () {
            app.getView({
                ContinueURL: continueURL
            }).render(templateName);
        },
        send: function () {
            var Customer, resettingCustomer, Email, resetPasswordUrl;
            Customer = app.getModel('Customer');
            Email = app.getModel('Email');            
            var phoneNumber = ""; 
            var formattedNumber = "";
        	var errorCode = "";
        	var rsp  = "";
            var duplicateEmail = "";

            var currentHttpParameterMap = request.httpParameterMap;
            var resetType = (currentHttpParameterMap.resetType.stringValue) ?currentHttpParameterMap.resetType.stringValue:'email';
                        
            // CHECK THE RESET TYPE
            if(resetType == 'email'){
            	            	
            	if(Site.getCurrent().getCustomPreferenceValue('enableSMSPasswordReset') == true){
                    var requestForm = (currentHttpParameterMap.resetEmail.stringValue) ? currentHttpParameterMap.resetEmail.stringValue:'';
            	} else {
                    var requestForm = Form.get('requestpassword').object.email.htmlValue;
            	}

            	resettingCustomer = Customer.retrieveCustomerByLogin(requestForm);
            } else {
            	// Get the country code and phone number   
            	var countryCode = currentHttpParameterMap.countryCode.stringValue ? currentHttpParameterMap.countryCode.stringValue : "1"; 
                phoneNumber = currentHttpParameterMap.phoneText.stringValue ? currentHttpParameterMap.phoneText.stringValue:"" ; 
                formattedNumber = currentHttpParameterMap.formattedNumber.stringValue ? currentHttpParameterMap.formattedNumber.stringValue:"" ; 
                duplicateEmail = currentHttpParameterMap.duplicateEmail.stringValue ? currentHttpParameterMap.duplicateEmail.stringValue:"" ;
                var hasMultiplePhoneAccounts = false;
                
                try {
                    phoneNumber = phoneNumber.replace(/\D/g, '');
                } catch(err){}

                
                if(phoneNumber) {                	
                	let resetProfile,resetProfiles;   
                	/*
                	resetProfile = require('dw/customer/CustomerMgr').queryProfile('phoneMobile = {0} AND custom.countryCode = {1} and custom.isVerifiedPhone = {2}', phoneNumber,countryCode,true);
                	if(resetProfile){
                		resettingCustomer = Customer.retrieveCustomerByLogin(resetProfile.customer.profile.email);
                	}	*/
                	
                	//Get all the profiles (Specific requirement for Tatcha)
                	if(empty(duplicateEmail)){
                    	resetProfiles = require('dw/customer/CustomerMgr').searchProfiles('phoneMobile = {0} AND custom.countryCode = {1} and custom.isVerifiedPhone = {2}', null,phoneNumber,countryCode,true);
                	} else {
                		resetProfiles = require('dw/customer/CustomerMgr').searchProfiles('phoneMobile = {0} AND custom.countryCode = {1} and custom.isVerifiedPhone = {2} and email={3}', null,phoneNumber,countryCode,true,duplicateEmail);
                	}

                	if(resetProfiles.count == 1){
                		for each(var profile in resetProfiles) {
                			resetProfile = profile;
                		}
                	} else if(resetProfiles.count > 1){
                		errorCode = "Multiple entries found";
                		hasMultiplePhoneAccounts = true;
                		
                	}
                	
                	if(resetProfile){
                		resettingCustomer = Customer.retrieveCustomerByLogin(resetProfile.customer.profile.email);
                	}
                	
                	
                	
                }            	
            }
            
            var twilio = require('app_storefront_core/cartridge/scripts/util/TwilioHelper');

        	
            //Check the error scenarios 
        	if (empty(resettingCustomer) && (resetType =='sms' || resetType =='voice')) {
        		if(!empty(duplicateEmail)){
        			errorCode = "duplicateemailnotfound";
        		} else {
        			errorCode = "notfounderrorphone";
        		}
        		
        	} else if (empty(resettingCustomer)) {
        		errorCode = "notfounderror";
        	} 
            
            if (empty(errorCode)) {
                resetPasswordToken = resettingCustomer.generatePasswordResetToken();                
                                
                if (currentHttpParameterMap.scope == 'checkout'){
                    resetPasswordUrl = URLUtils.https('Account-SetNewPassword', 'Token', resetPasswordToken, 'scope', 'checkout')
                }else{
                	resetPasswordUrl = URLUtils.https('Account-SetNewPassword', 'Token', resetPasswordToken)
             	}

               var renderingTemplate = 'account/password/requestpasswordreset_confirm';
                //var renderingTemplate = 'account/password/requestpasswordreset';
                
        		if(!Site.getCurrent().getCustomPreferenceValue('enableSMSPasswordReset') == true){
        			renderingTemplate = 'account/password/requestpasswordreset_emailonly';
        		} 
                var showVerificationModal = false;
            	var is_cellphone = false;
            	var success = false;
            	var msg = "";
            	
                if(resetType =='email') {
                	var klaviyoEnabled = Site.getCurrent().getCustomPreferenceValue('klaviyo_enabled');
                	var klaviyoResetPwdMailEnabled = Site.getCurrent().getCustomPreferenceValue('klaviyo_reset_pwd_transactional_enabled');
                	
                	if(klaviyoEnabled && klaviyoResetPwdMailEnabled) {
	                	var resetPasswordDetails = {};
	            	    resetPasswordDetails['RESET_URL'] = require('dw/web/URLUtils').abs('Account-SetNewPassword', 'Token', resetPasswordToken).toString(); 
	            		require('int_klaviyo_services/cartridge/scripts/utils/klaviyo/KlaviyoUtils').sendEmail(resettingCustomer.object.profile.email, resetPasswordDetails, 'reset password');
                	}
            		else {
            			passwordemail = Email.get('mail/resetpasswordemail', resettingCustomer.object.profile.email);
                        passwordemail.setSubject(Resource.msg('resource.passwordassistance', 'email', null));
                        passwordemail.send({
                            ResetPasswordToken: resetPasswordToken,
                            Customer: resettingCustomer.object.profile.customer
                        });
                        success = true; 
            		}
                	} else if (resetType =='sms'){
                	var twilioResponse = twilio.sendVerificationCode(phoneNumber,countryCode,'sms');
                	
                	// set the error code if not success
                	if(twilioResponse){
                		rsp = JSON.parse(twilioResponse); 
            			is_cellphone = rsp.is_cellphone;
            			success = rsp.success;
            			if(success) {
            				showVerificationModal = true
            			} else {
            				renderingTemplate = 'account/password/requestpasswordreset';
            				if(is_cellphone) {
            					errorCode = "notcellphoneerror";
            				} else {
            					errorCode = "phonenumbererror";
            				}            				
            			}            			
                	} else {
                		renderingTemplate = 'account/password/requestpasswordreset';
                		errorCode = "networkerror";
                	}  	
                	
                } else if (resetType =='voice'){                	
                	var twilioResponse = twilio.sendVerificationCode(phoneNumber,countryCode,'call');
                	
                	// set the error code if not success
                	if(twilioResponse){
                		rsp = JSON.parse(twilioResponse); 
            			is_cellphone = rsp.is_cellphone;
            			success = rsp.success;
            			if(success) {
            				showVerificationModal = true
            			} else {
            				errorCode = "phonenumbererror";
            			}            			
                	} else {
                		errorCode = "networkerror";
                	}
                }

                
                //for security reasons the same message will be shown for a valid reset password request as for a invalid one
                if (currentHttpParameterMap.scope == 'checkout') {
             	   app.getView().render('checkout/firstlogin');
             	} else {
             		app.getView({
                        ErrorCode: errorCode,
                        success: success,
             			ShowContinue: true,
             			ContinueURL: continueURL,
             			ShowVerificationModal: showVerificationModal,
             			ResetType:resetType,
             			FormattedNumber:formattedNumber,
             			ResetEmail:resettingCustomer.object.profile.email,
             			CountryCode:countryCode,
             			ResetPhone:phoneNumber
             		}).render(renderingTemplate);
             	}
            } else {
            	app.getView({
            		ResetType: resetType,
                    ErrorCode: errorCode,
                    ContinueURL: continueURL,
                    HasMultiplePhoneAccounts:hasMultiplePhoneAccounts,
                    FormattedNumber:formattedNumber,
                    ResetPhone:phoneNumber,
                    CountryCode:countryCode
                }).render(templateName);
            }
        },
        error: function () {
            app.getView({
                ErrorCode: 'formnotvalid',
                ContinueURL: continueURL
            }).render(templateName);
        }
    });
}

/**
 * The form handler for password resets.
 */
function passwordResetForm() {
	var template = 'account/password/requestpasswordreset_emailonly';
	
	if(Site.getCurrent().getCustomPreferenceValue('enableSMSPasswordReset') == true){
		template = 'account/password/requestpasswordreset';
	} 
	
    passwordResetFormHandler(template, URLUtils.https('Account-PasswordReset'));
}


/**
 * Clears the requestpassword form and renders the account/password/requestpasswordresetdialog template.
 */
function passwordResetDialog() {
    // @FIXME reimplement using dialogify
    app.getForm('requestpassword').clear();
    app.getView({
        ContinueURL: URLUtils.https('Account-PasswordResetDialogForm')
    }).render('account/password/requestpasswordresetdialog');
}

function firstTimeLogin(){
	app.getView().render('account/login/firsttimelogin');
	
}

/**
 * Handles the password reset form.
 */
function passwordResetDialogForm() {
    // @FIXME reimplement using dialogify
    passwordResetFormHandler('account/password/requestpasswordresetdialog', URLUtils.https('Account-PasswordResetDialogForm'));
}

/**
 * Gets a CustomerModel wrapping the current customer. Clears the resetpassword form. Checks if the customer wants to reset their password.
 * If there is no reset token, redirects to the Account-PasswordReset controller function. If there is a reset token,
 * renders the screen for setting a new password.
 */
function setNewPassword() {
    var Customer, resettingCustomer;
    Customer = app.getModel('Customer');

    app.getForm('resetpassword').clear();
    resettingCustomer = Customer.getByPasswordResetToken(request.httpParameterMap.Token.getStringValue());

    if (empty(resettingCustomer)) {
        response.redirect(URLUtils.https('Account-PasswordReset'));
    } else {
        app.getView({
            ContinueURL: URLUtils.https('Account-SetNewPasswordForm')
        }).render('account/password/setnewpassword');
    }
}

/**
 * Gets a profile form and handles the cancel and send actions.
 *  - cancel - renders the setnewpassword template.
 *  - send - gets a CustomerModel object that wraps the current customer and gets an EmailModel object that wraps an Email object.
 * Checks whether the customer can be retrieved using a reset password token.
 * If the customer does not have a valid token, the controller redirects to the Account-PasswordReset controller function.
 * If they do, then an email is sent to the customer using the mail/setpasswordemail template and the setnewpassword_confirm template is rendered.
 * */
function setNewPasswordForm() {

    app.getForm('profile').handleAction({
        cancel: function () {
            app.getView({
                ContinueURL: URLUtils.https('Account-SetNewPasswordForm')
            }).render('account/password/setnewpassword');
            return;
        },
        send: function () {
            var Customer;
            var Email;
            //var passwordChangedMail;
            var resettingCustomer;
            var success;

            Customer = app.getModel('Customer');
            Email = app.getModel('Email');
            resettingCustomer = Customer.getByPasswordResetToken(request.httpParameterMap.Token.getStringValue());

            if (!resettingCustomer) {
                response.redirect(URLUtils.https('Account-PasswordReset'));
            }

            if (app.getForm('resetpassword.password').value() !== app.getForm('resetpassword.passwordconfirm').value()) {
                app.getForm('resetpassword.passwordconfirm').invalidate();
                app.getView({
                    ContinueURL: URLUtils.https('Account-SetNewPasswordForm')
                }).render('account/password/setnewpassword');
            } else {

                success = resettingCustomer.resetPasswordByToken(request.httpParameterMap.Token.getStringValue(), app.getForm('resetpassword.password').value());
                if (!success) {
                    app.getView({
                        ErrorCode: 'formnotvalid',
                        ContinueURL: URLUtils.https('Account-SetNewPasswordForm')
                    }).render('account/password/setnewpassword');
                } else {
                    /*passwordChangedMail = Email.get('mail/passwordchangedemail', resettingCustomer.object.profile.email);
                    passwordChangedMail.setSubject(Resource.msg('resource.passwordassistance', 'email', null));
                    passwordChangedMail.send({
                        Customer: resettingCustomer.object
                    });*/
                    Transaction.wrap(function () {
                    	resettingCustomer.object.profile.custom.IsPasswordReset = false;
                    });
                    var currentHttpParameterMap = request.httpParameterMap;
                    if (currentHttpParameterMap.scope == 'checkout'){
                 	   app.getView().render('checkout/checkoutsetnewpassword_confirm');
                 	}else{
                    app.getView().render('account/password/setnewpassword_confirm');
                 	}
                }
            }
        }
    });
}

/** Clears the profile form, adds the email address from login as the profile email address,
 *  and renders customer registration page.
 */
function startRegister() {

    app.getForm('profile').clear();
    var original = request.httpParameterMap.original.value;
    original = require('app_storefront_core/cartridge/scripts/util/Redirect').validateOriginalURL(original);
    var callBackAction = request.httpParameterMap.callBackAction.value;
    var pid = request.httpParameterMap.pid.value;
    securityHeader.setSecurityHeaders();
    
    app.getView({
        ContinueURL: URLUtils.https('Account-RegistrationForm', 'original', original, 'callBackAction', callBackAction, 'pid', pid)
    }).render('account/user/registration');
}

/**
 * Gets a CustomerModel object wrapping the current customer.
 * Gets a profile form and handles the confirm action.
 *  confirm - validates the profile by checking  that the email and password fields:
 *  - match the emailconfirm and passwordconfirm fields
 *  - are not duplicates of existing username and password fields for the profile
 * If the fields are not valid, the registration template is rendered.
 * If the fields are valid, a new customer account is created, the profile form is cleared and
 * the customer is redirected to the Account-Show controller function.
 */
function registrationForm() {
    app.getForm('profile').handleAction({
        confirm: function () {
            var email, emailConfirmation, addemail, orderNo, profileValidation, password, passwordConfirmation, existingCustomer, Customer, target;

			if(session.custom.invalidpassword) {
				delete session.custom.invalidpassword;
			}

            Customer = app.getModel('Customer');
            email = app.getForm('profile.customer.email').value();
            addemail = app.getForm('profile.customer.addtoemaillist').value();
            orderNo =  app.getForm('profile.customer.orderNo').value();
            profileValidation = true;

            password = app.getForm('profile.login.password').value();
            passwordConfirmation = app.getForm('profile.login.passwordconfirm').value();

            if (password !== passwordConfirmation) {
                app.getForm('profile.login.passwordconfirm').invalidate();
                profileValidation = false;
            }

            // Checks if login is already taken.
            existingCustomer = Customer.retrieveCustomerByLogin(email);
            if (existingCustomer !== null) {
                //invalidate hidden field - not to highlight email field
            	app.getForm('profile.customer.email').invalidate();
                profileValidation = false;
            }
            
            //Validation to ensure that phone was tampered in request after the verification
            var phoneMobile = Form.get('profile.customer.phoneMobile').value() ? Form.get('profile.customer.phoneMobile').value() : "";
        	if(!empty(phoneMobile) && (session.custom.phoneVerified) && (phoneMobile != session.custom.phoneNumber)) {
        		app.getForm('profile.customer.phoneMobile').invalidate();
    			delete session.custom.phoneVerified;
    			delete session.custom.phoneNumber;
    			delete session.custom.countryCode;
        		profileValidation = false;
        	} 

            if (profileValidation) {
            	
            	profileValidation = Customer.createAccount(email, password, app.getForm('profile'));
            	
                if (orderNo) {
                    var orders = OrderMgr.searchOrders('orderNo={0} AND status!={1}', 'creationDate desc', orderNo,
                            dw.order.Order.ORDER_STATUS_REPLACED);
                    if (orders) {
                        var foundOrder = orders.next();
                        Transaction.wrap(function(){
                            foundOrder.customer = profileValidation;
                        })
                        session.custom.TargetLocation = URLUtils.https('Account-Show','Registration','true').toString();
                    }
                }
            }

			var isInvalidPassword = session.custom.invalidpassword ? session.custom.invalidpassword : false;
            if (!profileValidation) {
            	var original = request.httpParameterMap.original.value;
            	original = require('app_storefront_core/cartridge/scripts/util/Redirect').validateOriginalURL(original);
                var callBackAction = request.httpParameterMap.callBackAction.value;
                var pid = request.httpParameterMap.pid.value;
                
                //Delete session in error scenario
                if(session.custom.phoneVerified){
        			delete session.custom.phoneVerified;
        			delete session.custom.phoneNumber;
        			delete session.custom.countryCode;
                }
                securityHeader.setSecurityHeaders();
                app.getView({
                	ContinueURL: URLUtils.https('Account-RegistrationForm', 'original', original, 'callBackAction', callBackAction, 'pid', pid),
					isInvalidPassword: isInvalidPassword
                }).render('account/user/registration');
            } else {
            	try{
            		if(addemail == true){
                		Transaction.wrap(function () {
                			session.customer.profile.custom.newsletterSubscription = true;
                			session.customer.profile.custom.newsletterFrequency = 'default';
						});
                	} else {
						Tatcha.syncSubscriptionStatus();
            		}
            		
            		//Add item to wishlist
            	    var callBackAction = request.httpParameterMap.callBackAction.stringValue;
            	    if(callBackAction == 'wishlist') {
            	    	var wishlist = require('app_storefront_controllers/cartridge/controllers/Wishlist.js');
            	    	wishlist.AddProduct();
            	    }
            	    
            	} catch (e) {
            		var LOGGER = dw.system.Logger.getLogger('customer');
            		LOGGER.warn('Newsletter subscription Sync failed for customer - '+ session.customer.profile.email);
                	LOGGER.warn('Newsletter subscription Sync error - '+ e.toString());
            	}

				/*
				* Patch for handling customer registration on braintree end
				* Once Login and registration is moved to SFRA, default braintree customizations in Account.js can be used
				* for this functionality
				*/
				try {
					braintreeUtil.createCustomerOnBraintreeSide();
				} catch (e) {
					LOGGER.warn('Create user on braintree end failed - '+ e.toString());
				}

                app.getForm('profile').clear();
                var skip_email_gate = request.httpParameterMap.skip_email_gate.value;
                if(skip_email_gate){
                	target = URLUtils.https('COShipping-Start');
                } else{
                	target = session.custom.TargetLocation;
                	target = require('app_storefront_core/cartridge/scripts/util/Redirect').validateOriginalURL(target);
                }
                session.custom.showCreateAccountSuccess = true;
                if(Site.getCurrent().getCustomPreferenceValue('mParticleEnabled')) {
                	session.privacy.registrationEvent = true;
                }
                securityHeader.setSecurityHeaders();
                response.redirect(URLUtils.https('Account-Show', 'registration', 'true'));
            }
        },
        error: function () {
        	securityHeader.setSecurityHeaders();
        	
        	if(app.getForm('profile.login.password').value()) {
        	    var CustomerMgr =require('dw/customer/CustomerMgr');
				var isAcceptablePassword = null;
				isAcceptablePassword = CustomerMgr.isAcceptablePassword(app.getForm('profile.login.password').value());
				if(!isAcceptablePassword) {
					session.custom.invalidpassword = true;
				}
        	}
        	
        	app.getView({
                ContinueURL: URLUtils.https('Account-RegistrationForm'),
                isInvalidPassword: session.custom.invalidpassword ? session.custom.invalidpassword : null,
                registerError: true
            }).render('account/user/registration');
        }
    });
}


function verifyPasswordResetCode() {
	
	var currentHttpParameterMap = request.httpParameterMap;
	var resetEmail = currentHttpParameterMap.resetEmail.stringValue;
	var verificationCode = currentHttpParameterMap.smsverifycode.stringValue;
	var twilio = require('app_storefront_core/cartridge/scripts/util/TwilioHelper');
	
	if(resetEmail=='' || verificationCode==''){
		return false;
	}
	
	// Get the phonenumber , country code and generate token
    var Customer, resettingCustomer,phoneNumber,resetPasswordToken,countryCode,response;
    var resetPasswordUrl = "";
    Customer = app.getModel('Customer');
    resettingCustomer = Customer.retrieveCustomerByLogin(resetEmail);

    if(!empty(resettingCustomer)){
        phoneNumber = resettingCustomer.object.profile.phoneMobile; 
        countryCode = '1';
        response = twilio.verifyCode(phoneNumber,countryCode,verificationCode);  
        var rsp = JSON.parse(response); 
        // Return success 
        if(rsp && rsp.success){        	
            resetPasswordToken = resettingCustomer.generatePasswordResetToken(); 
            resetPasswordUrl = URLUtils.https('Account-SetNewPassword', 'Token', resetPasswordToken);
        }
    }
    
	response.renderJSON({
		   "response" : {
			      "redirectUrl":resetPasswordUrl
			   }
			});
	return;
}

/**
 * Renders the accountnavigation template.
 */
function includeNavigation() {
    app.getView().render('account/accountnavigation');
}

/* Web exposed methods */

/** Renders the account overview.
 * @see {@link module:controllers/Account~show} */
exports.Show = guard.ensure(['get', 'https', 'loggedIn'], show);
/** Updates the profile of an authenticated customer.
 * @see {@link module:controllers/Account~editProfile} */
exports.EditProfile = guard.ensure(['get', 'https', 'loggedIn'], editProfile);
/** Handles the form submission on profile update of edit profile.
 * @see {@link module:controllers/Account~editForm} */
exports.EditForm = guard.ensure(['post', 'https', 'loggedIn', 'csrf'], editForm);
exports.EditSubscribtion = guard.ensure(['post', 'https'], editSubscribtion);
/** Renders the password reset dialog.
 * @see {@link module:controllers/Account~passwordResetDialog} */
exports.PasswordResetDialog = guard.ensure(['get', 'https'], passwordResetDialog);
/** Renders the password reset screen.
 * @see {@link module:controllers/Account~passwordReset} */
exports.PasswordReset = guard.ensure(['https'], passwordReset);
/** Handles the password reset form.
 * @see {@link module:controllers/Account~passwordResetDialogForm} */
exports.PasswordResetDialogForm = guard.ensure(['post', 'https', 'csrf'], passwordResetDialogForm);
/** The form handler for password resets.
 * @see {@link module:controllers/Account~passwordResetForm} */
exports.PasswordResetForm = guard.ensure(['post', 'https'], passwordResetForm);

exports.FirstTimeLogin = guard.ensure(['get', 'https'], firstTimeLogin);
/** Renders the screen for setting a new password.
 * @see {@link module:controllers/Account~setNewPassword} */
exports.SetNewPassword = guard.ensure(['get', 'https'], setNewPassword);
/** Handles the set new password form submit.
 * @see {@link module:controllers/Account~setNewPasswordForm} */
exports.SetNewPasswordForm = guard.ensure(['post', 'https'], setNewPasswordForm);
/** Start the customer registration process and renders customer registration page.
 * @see {@link module:controllers/Account~startRegister} */
exports.StartRegister = guard.ensure(['https'], startRegister);
/** Handles registration form submit.
 * @see {@link module:controllers/Account~registrationForm} */
exports.RegistrationForm = guard.ensure(['post', 'https', 'csrf'], registrationForm);
/** Renders the account navigation.
 * @see {@link module:controllers/Account~includeNavigation} */
exports.IncludeNavigation = guard.ensure(['get'], includeNavigation);
exports.EmailUpdate = guard.ensure(['get', 'https', 'loggedIn'], emailupdate);
exports.VerifyPasswordResetCode = guard.ensure(['post', 'https'], verifyPasswordResetCode);
