'use strict';

/**
 * @namespace Account
 */

var server = require('server');

var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var URLUtils = require('dw/web/URLUtils');
var LOGGER = dw.system.Logger.getLogger('login');
var braintreeUtil = require('*/cartridge/scripts/util/braintreeUtil');

/**
 * Checks if the email value entered is correct format
 * @param {string} email - email string to check if valid
 * @returns {boolean} Whether email is valid
 */
function validateEmail(email) {
    var regex = /^[\w.%+-]+@[\w.-]+\.[\w]{2,6}$/;
    return regex.test(email);
}

/**
 * Account-Show : The Account-Show endpoint will render the shopper's account page. Once a shopper logs in they will see is a dashboard that displays profile, address, payment and order information.
 * @name Base/Account-Show
 * @function
 * @memberof Account
 * @param {middleware} - server.middleware.https
 * @param {middleware} - userLoggedIn.validateLoggedIn
 * @param {middleware} - consentTracking.consent
 * @param {querystringparameter} - registration - A flag determining whether or not this is a newly registered account
 * @param {category} - senstive
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
server.get(
    'Show',
    server.middleware.https,
    userLoggedIn.validateLoggedIn,
    consentTracking.consent,
    function (req, res, next) {
        var CustomerMgr = require('dw/customer/CustomerMgr');
        var Resource = require('dw/web/Resource');
        var URLUtils = require('dw/web/URLUtils');
        var accountHelpers = require('*/cartridge/scripts/account/accountHelpers');
        var reportingUrlsHelper = require('*/cartridge/scripts/reportingUrls');
        var reportingURLs;

        // Get reporting event Account Open url
        if (req.querystring.registration && req.querystring.registration === 'submitted') {
            reportingURLs = reportingUrlsHelper.getAccountOpenReportingURLs(
                CustomerMgr.registeredCustomerCount
            );
        }

        var accountModel = accountHelpers.getAccountModel(req);

        res.render('account/accountDashboard', {
            account: accountModel,
            accountlanding: true,
            breadcrumbs: [
                {
                    htmlValue: Resource.msg('global.home', 'common', null),
                    url: URLUtils.home().toString()
                }
            ],
            reportingURLs: reportingURLs,
            payment: accountModel.payment,
            viewSavedPaymentsUrl: URLUtils.url('PaymentInstruments-List').toString(),
            addPaymentUrl: URLUtils.url('PaymentInstruments-AddPayment').toString()
        });
        next();
    }
);

/**
 * Account-Login : The Account-Login endpoint will render the shopper's account page. Once a shopper logs in they will see is a dashboard that displays profile, address, payment and order information.
 * @name Base/Account-Login
 * @function
 * @memberof Account
 * @param {middleware} - server.middleware.https
 * @param {middleware} - csrfProtection.validateAjaxRequest
 * @param {querystringparameter} - rurl - redirect url. The value of this is a number. This number then gets mapped to an endpoint set up in oAuthRenentryRedirectEndpoints.js
 * @param {httpparameter} - loginEmail - The email associated with the shopper's account.
 * @param {httpparameter} - loginPassword - The shopper's password
 * @param {httpparameter} - loginRememberMe - Whether or not the customer has decided to utilize the remember me feature.
 * @param {httpparameter} - csrf_token - a CSRF token
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - post
 *
 */
server.post(
    'Login',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        var CustomerMgr = require('dw/customer/CustomerMgr');
        var Resource = require('dw/web/Resource');
        var Site = require('dw/system/Site');

        var accountHelpers = require('*/cartridge/scripts/helpers/accountHelpers');
        var emailHelpers = require('*/cartridge/scripts/helpers/emailHelpers');
        var hooksHelper = require('*/cartridge/scripts/helpers/hooks');

        var email = req.form.loginEmail;
        var password = req.form.loginPassword;
        var rememberMe = false;
        var status;

        var customerLoginResult = accountHelpers.loginCustomer(email, password, rememberMe);

        if (customerLoginResult.error) {
            status = 'error';
            if (customerLoginResult.status === 'ERROR_CUSTOMER_LOCKED') {
                var context = {
                    customer: CustomerMgr.getCustomerByLogin(email) || null
                };

                var emailObj = {
                    to: email,
                    subject: Resource.msg('subject.account.locked.email', 'login', null),
                    from: Site.current.getCustomPreferenceValue('customerServiceEmail') || 'no-reply@testorganization.com',
                    type: emailHelpers.emailTypes.accountLocked
                };

                hooksHelper('app.customer.email', 'sendEmail', [emailObj, 'account/accountLockedEmail', context], function () {});
            }

            res.json({
                status: status,
                error: [customerLoginResult.errorMessage || Resource.msg('error.message.login.form', 'login', null)]
            });

            return next();
        }

        var argsForQueryString = req.session.privacyCache.get('args');
        var result;

        if (argsForQueryString) {
            result = URLUtils.url('AccountSfra-Show', 'registration', false, 'args', argsForQueryString).relative().toString();
        } else {
            result = URLUtils.url('AccountSfra-Show', 'registration', false).relative().toString();
        }

        //Add item to wishlist
        if (customerLoginResult.authenticatedCustomer) {
            try{
                var callBackAction = req.httpParameterMap.callBackAction.stringValue;
                if(callBackAction == 'wishlist') {
                    /*var wishlist = require('app_storefront_controllers/cartridge/controllers/Wishlist.js');
                    wishlist.AddProduct();*/
                    var wishlistHelper = require('*/cartridge/scripts/helpers/wishListHelpers');
                    var list = wishlistHelper.getCurrentOrNewList(customerLoginResult.authenticatedCustomer, { type: 10 });
                    var pid = req.httpParameterMap.pid.stringValue;
                    var optionId = null;
                    var optionVal = null;
                    var config = {
                        qty: 1,
                        optionId: optionId,
                        optionValue: optionVal,
                        req: req,
                        type: 10
                    };
                    wishlistHelper.addItem(list, pid, config);
                }
            }catch (e) {
                LOGGER.info('Login wishlist error', e.toString());
            }
            /*if(callBackAction == 'wishlist-addall') {
                var wishlist = require('app_storefront_controllers/cartridge/controllers/Wishlist.js');
                wishlist.AddAllItem();
            }*/
        }

        if(Site.getCurrent().getCustomPreferenceValue('mParticleEnabled')){
            session.privacy.loginEvent = true;
            //Get Wishlist
            var productList = accountHelpers.getWishlistIds();
            var wishlistContent = new dw.util.ArrayList(productList.items);
            var wishlistPids = [];
            try {
                for (var i = 0; i < wishlistContent.length; i++) {
                    if(wishlistContent[i] && wishlistContent[i].product) {
                        wishlistPids.push(wishlistContent[i].product.name);
                    }
                }
                session.privacy.wishlistPids = JSON.stringify(wishlistPids);
                //Get the Subscribed Products List
                var mParticleUtil = require('int_mParticle/cartridge/scripts/mParticleUtils.js');
                mParticleUtil.getCustomersActiveSubscriptions();
            } catch (e) {
                LOGGER.info('mParticle wishlist error', e.toString());
            }
        }

        if(Site.getCurrent().getCustomPreferenceValue('EnableRSCADC')){
            session.privacy.loginEventRSC = true;
            //Get Wishlist
            var productList = accountHelpers.getWishlistIds();
            var wishlistContent = new dw.util.ArrayList(productList.items);
            var wishlistPids = [];
            try {
                for (var i = 0; i < wishlistContent.length; i++) {
                    if(wishlistContent[i] && wishlistContent[i].product) {
                        wishlistPids.push(wishlistContent[i].product.name);
                    }
                }
                session.privacy.wishlistPids = JSON.stringify(wishlistPids);
                //Get the Subscribed Products List
                var rscUtils = require('int_rsc_gpds/cartridge/scripts/rscUtils.js');
                rscUtils.getCustomersActiveSubscriptions();
            } catch (e) {
                LOGGER.info('RSC wishlist error', e.toString());
            }
        }

        /*
        * Patch for handling customer registration on braintree end
        * Once Login and registration is moved to SFRA, default braintree customizations in Account.js can be used
        * for this functionality
        */
        try {
            braintreeUtil.createCustomerOnBraintreeSide();
        } catch (e) {
            LOGGER.warn('Create user on braintree end failed - ' + e.toString());
        }

        if (customerLoginResult.authenticatedCustomer) {
            res.setViewData({ authenticatedCustomer: customerLoginResult.authenticatedCustomer });
            res.json({
                success: true,
                redirectUrl: result
            });

            req.session.privacyCache.set('args', null);
        } else {
            res.json({ error: [Resource.msg('error.message.login.form', 'login', null)] });
        }

        return next();
    }
);

/**
 * Account-PasswordReset : The Account-PasswordReset endpoint renders the forgot your password form that allows a shopper to submit their email address in order to request a password change
 * @name Base/Account-PasswordReset
 * @function
 * @memberof Account
 * @param {middleware} - server.middleware.https
 * @param {category} - sensitive
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
server.get('PasswordReset', server.middleware.https, function (req, res, next) {
	if (customer && customer.authenticated && customer.registered) {
        res.redirect(URLUtils.url('Account-Show'));
    }
    var Site = require('dw/system/Site');
	var template = 'account/password/requestpasswordreset_emailonly';
	if (Site.getCurrent().getCustomPreferenceValue('enableSMSPasswordReset')){
		template = 'account/password/requestpasswordreset';
	}
    res.render(template, { CountryCode: '1' });
    next();
});

/**
 * Account-SavePasswordReset : The Account-SavePasswordReset endpoint is the endpoint that gets hit once the shopper has clicked forgot password and has submitted their email address to request to reset their password
 * @name Base/Account-SavePasswordReset
 * @function
 * @memberof Account
 * @param {middleware} - server.middleware.https
 * @param {querystringparameter} - mobile - a flag determining whether or not the shopper is on a mobile sized screen
 * @param {httpparameter} - loginEmail - Input field, the shopper's email address
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - post
 */
server.use('SavePasswordReset', server.middleware.https, function (req, res, next) {
    var CustomerMgr = require('dw/customer/CustomerMgr');
    var accountHelpers = require('*/cartridge/scripts/helpers/accountHelpers');
    var twilioHelper = require('*/cartridge/scripts/helpers/twilioHelper');
    var renderTemplateHelper = require('*/cartridge/scripts/renderTemplateHelper');
    var Site = require('dw/system/Site');

    if (customer && customer.authenticated && customer.registered) {
        res.redirect(URLUtils.url('Account-Show'));
    }

	var template = 'account/password/requestpasswordreset_emailonly';
	if (Site.getCurrent().getCustomPreferenceValue('enableSMSPasswordReset')){
		template = 'account/password/requestpasswordreset';
	}

    var resetType = req.form.resetType || 'email';
    var email = req.form.resetEmail;
    var isValid;
    var errorCode = "";
    var formattedNumber = "";
    var duplicateEmail = "";
    var phoneNumber = "";
    var resettingCustomer;
    var hasMultiplePhoneAccounts = false;

    if (resetType == 'email') {
	    if (email) {
	        isValid = validateEmail(email);
	        if (isValid) {
	            resettingCustomer = CustomerMgr.getCustomerByLogin(email);
	        }
	    }
	} else {
		var countryCode = req.form.countryCode || "1";
        phoneNumber = req.form.phoneText || "" ;
        formattedNumber = req.form.formattedNumber || "" ;
        duplicateEmail = req.form.duplicateEmail || "" ;
        try {
            phoneNumber = phoneNumber.replace(/\D/g, '');
        } catch(err){}

        if (phoneNumber) {
        	let resetProfile, resetProfiles;
        	if (empty(duplicateEmail)) {
            	resetProfiles = CustomerMgr.searchProfiles('phoneMobile = {0} AND custom.countryCode = {1} and custom.isVerifiedPhone = {2}', null,phoneNumber,countryCode,true);
        	} else {
        		resetProfiles = CustomerMgr.searchProfiles('phoneMobile = {0} AND custom.countryCode = {1} and custom.isVerifiedPhone = {2} and email={3}', null,phoneNumber,countryCode,true,duplicateEmail);
        	}
        	if (resetProfiles.count == 1) {
				while (resetProfiles.hasNext()) {
					resetProfile = resetProfiles.next();
				}
        	} else if(resetProfiles.count > 1){
        		errorCode = "Multiple entries found";
        		hasMultiplePhoneAccounts = true;
        	}
        	if (resetProfile) {
        		resettingCustomer = CustomerMgr.getCustomerByLogin(resetProfile.customer.profile.email);
        	}
        }
	}

	if (empty(resettingCustomer) && resetType =='sms') {
		if (!empty(duplicateEmail)){
        	errorCode = "duplicateemailnotfound";
		} else {
			errorCode = "notfounderrorphone";
		}

	} else if (empty(resettingCustomer)) {
		errorCode = "notfounderror";
	}

    if (empty(errorCode)) {
		var success = false;
		var showVerificationModal = false;
		var renderingTemplate = 'account/password/requestpasswordreset_confirm';
		if (!Site.getCurrent().getCustomPreferenceValue('enableSMSPasswordReset')) {
			renderingTemplate = 'account/password/requestpasswordreset_emailonly';
        }
		if (resetType =='email') {
			if (resettingCustomer) {
                accountHelpers.sendPasswordResetEmail(email, resettingCustomer);
            }
            success = true;
        } else if (resetType =='sms') {
			var twilioResponse = twilioHelper.sendVerificationCode(phoneNumber,countryCode,'sms');
            if (twilioResponse) {
				var rsp = JSON.parse(twilioResponse);
            	success = rsp.success;
            	if (success) {
            		showVerificationModal = true
            	} else {
					renderingTemplate = 'account/password/requestpasswordreset';
            		if (rsp.is_cellphone) {
            			errorCode = "notcellphoneerror";
            		} else {
            			errorCode = "phonenumbererror";
            		}
            	}
            } else {
				renderingTemplate = 'account/password/requestpasswordreset';
                errorCode = "networkerror";
            }
		}
	    res.render(renderingTemplate, {
			ErrorCode: errorCode,
            success: success,
 			ShowContinue: true,
 			ShowVerificationModal: showVerificationModal,
 			ResetType: resetType,
 			FormattedNumber: formattedNumber,
 			ResetEmail: resettingCustomer.profile.email,
 			CountryCode: countryCode,
 			ResetPhone: phoneNumber
		});
	} else {
	    res.render(template, {
			ResetType: resetType,
            ErrorCode: errorCode,
            HasMultiplePhoneAccounts: hasMultiplePhoneAccounts,
            FormattedNumber: formattedNumber,
            ResetPhone: phoneNumber,
            CountryCode: countryCode
		});
	}

    next();
});

/**
 * Account-SetNewPassword : The Account-SetNewPassword endpoint renders the page that displays the password reset form
 * @name Base/Account-SetNewPassword
 * @function
 * @memberof Account
 * @param {middleware} - server.middleware.https
 * @param {middleware} - consentTracking.consent
 * @param {querystringparameter} - Token - SFRA utilizes this token to retrieve the shopper
 * @param {category} - sensitive
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
server.get('SetNewPassword', server.middleware.https, consentTracking.consent, function (req, res, next) {
    var CustomerMgr = require('dw/customer/CustomerMgr');
    var URLUtils = require('dw/web/URLUtils');

    var passwordForm = server.forms.getForm('resetpassword');
    passwordForm.clear();
    var token = req.querystring.Token;
    var resettingCustomer = CustomerMgr.getCustomerByToken(token);
    if (!resettingCustomer) {
        res.redirect(URLUtils.url('AccountSfra-PasswordReset'));
    } else {
        res.render('account/password/setnewpassword', { passwordForm: passwordForm, token: token });
    }
    next();
});

/**
 * Account-SaveNewPassword : The Account-SaveNewPassword endpoint handles resetting a shoppers password. This is the last step in the forgot password user flow. (This step does not log the shopper in.)
 * @name Base/Account-SaveNewPassword
 * @function
 * @memberof Account
 * @param {middleware} - server.middleware.https
 * @param {querystringparameter} - Token - SFRA utilizes this token to retrieve the shopper
 * @param {httpparameter} - dwfrm_resetpassword_password - Input field for the shopper's new password
 * @param {httpparameter} - dwfrm_resetpassword_passwordconfirm  - Input field to confirm the shopper's new password
 * @param {httpparameter} - save - unutilized param
 * @param {category} - sensitive
 * @param {renders} - isml
 * @param {serverfunction} - post
 */
server.post('SaveNewPassword', server.middleware.https, function (req, res, next) {
    var Transaction = require('dw/system/Transaction');
    var Resource = require('dw/web/Resource');

    if (customer && customer.authenticated && customer.registered) {
        res.redirect(URLUtils.url('Account-Show'));
    }

    var passwordForm = server.forms.getForm('resetpassword');
    var token = req.querystring.Token;
    if (passwordForm.password.value !== passwordForm.passwordconfirm.value) {
        passwordForm.valid = false;
        passwordForm.password.valid = false;
        passwordForm.passwordconfirm.valid = false;
        passwordForm.passwordconfirm.error = Resource.msg('error.message.mismatch.newpassword', 'forms', null);
    }

    if (passwordForm.valid) {
        var result = {
            newPassword: passwordForm.password.value,
            newPasswordConfirm: passwordForm.passwordconfirm.value,
            token: token,
            passwordForm: passwordForm
        };
        res.setViewData(result);
        this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
            var CustomerMgr = require('dw/customer/CustomerMgr');

            var formInfo = res.getViewData();
            var status;
            var resettingCustomer;
            Transaction.wrap(function () {
                resettingCustomer = CustomerMgr.getCustomerByToken(formInfo.token);
                status = resettingCustomer.profile.credentials.setPasswordWithToken(
                    formInfo.token,
                    formInfo.newPassword
                );
            });
            if (status.error) {
                passwordForm.password.valid = false;
                passwordForm.passwordconfirm.valid = false;
                passwordForm.passwordconfirm.error = Resource.msg('error.message.resetpassword.invalidformentry', 'forms', null);
                res.render('account/password/setnewpassword', {
                    passwordForm: passwordForm,
                    token: token,
                    ErrorCode: 'formnotvalid'
                });
            } else {
				Transaction.wrap(function () {
                	resettingCustomer.profile.custom.IsPasswordReset = false;
                });
                res.render('account/password/setnewpassword_confirm');
            }
        });
    } else {
        res.render('account/password/setnewpassword', { passwordForm: passwordForm, token: token });
    }
    next();
});

server.get('StartRegister', server.middleware.https, function (req, res, next) {
	var profileForm = server.forms.getForm('profile');
    profileForm.clear();
    res.render('account/user/registration');
    next();
});

/**
 * Account-SubmitRegistration : The Account-SubmitRegistration endpoint is the endpoint that gets hit when a shopper submits their registration for a new account
 * @name Base/Account-SubmitRegistration
 * @function
 * @memberof Account
 * @param {middleware} - server.middleware.https
 * @param {middleware} - csrfProtection.validateAjaxRequest
 * @param {querystringparameter} - rurl - redirect url. The value of this is a number. This number then gets mapped to an endpoint set up in oAuthRenentryRedirectEndpoints.js
 * @param {httpparameter} - dwfrm_profile_customer_firstname - Input field for the shoppers's first name
 * @param {httpparameter} - dwfrm_profile_customer_lastname - Input field for the shopper's last name
 * @param {httpparameter} - dwfrm_profile_customer_phone - Input field for the shopper's phone number
 * @param {httpparameter} - dwfrm_profile_customer_email - Input field for the shopper's email address
 * @param {httpparameter} - dwfrm_profile_login_password - Input field for the shopper's password
 * @param {httpparameter} - dwfrm_profile_login_passwordconfirm: - Input field for the shopper's password to confirm
 * @param {httpparameter} - dwfrm_profile_customer_addtoemaillist - Checkbox for whether or not a shopper wants to be added to the mailing list
 * @param {httpparameter} - csrf_token - hidden input field CSRF token
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - post
 */
server.post(
    'SubmitRegistration',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        var CustomerMgr = require('dw/customer/CustomerMgr');
        var Resource = require('dw/web/Resource');
        var Site = require('dw/system/Site');
        var formErrors = require('*/cartridge/scripts/formErrors');
        var registrationForm = server.forms.getForm('profile');
        var isInvalidPassword = false;
        var isInvalidEmail = false;

        // form validation
        if (registrationForm.login.password.value !== registrationForm.login.passwordconfirm.value) {
            registrationForm.login.password.valid = false;
            registrationForm.login.passwordconfirm.valid = false;
            registrationForm.login.passwordconfirm.error = Resource.msg('error.message.mismatch.password', 'forms', null);
            registrationForm.valid = false;
            isInvalidPassword = true;
        }

        if (!CustomerMgr.isAcceptablePassword(registrationForm.login.password.value)) {
            registrationForm.login.password.valid = false;
            registrationForm.login.passwordconfirm.valid = false;
            registrationForm.login.passwordconfirm.error = Resource.msg('error.message.password.constraints.not.matched', 'forms', null);
            registrationForm.valid = false;
            isInvalidPassword = true;
        }

        if (CustomerMgr.getCustomerByLogin(registrationForm.customer.email.value) != null) {
            registrationForm.customer.email.valid = false;
            registrationForm.valid = false;
            isInvalidEmail = true;
        }

        // setting variables for the BeforeComplete function
        var registrationFormObj = {
            firstName: registrationForm.customer.firstname.value,
            lastName: registrationForm.customer.lastname.value,
            phone: registrationForm.customer.phoneMobile.value,
            email: registrationForm.customer.email.value,
            password: registrationForm.login.password.value,
            passwordConfirm: registrationForm.login.passwordconfirm.value,
            addToEmailList: registrationForm.customer.addtoemaillist.value || false,
            validForm: registrationForm.valid,
            form: registrationForm,
            isInvalidPassword: isInvalidPassword,
            isInvalidEmail: isInvalidEmail
        };

        if (registrationForm.valid) {
            res.setViewData(registrationFormObj);

            this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
                var Transaction = require('dw/system/Transaction');
                var accountHelpers = require('*/cartridge/scripts/helpers/accountHelpers');
                var authenticatedCustomer;
                var serverError;

                // getting variables for the BeforeComplete function
                var registrationForm = res.getViewData(); // eslint-disable-line

                if (registrationForm.validForm) {
                    var login = registrationForm.email;
                    var password = registrationForm.password;

                    // attempt to create a new user and log that user in.
                    try {
                        Transaction.wrap(function () {
                            var error = {};
                            var newCustomer = CustomerMgr.createCustomer(login, password);

                            var authenticateCustomerResult = CustomerMgr.authenticateCustomer(login, password);
                            if (authenticateCustomerResult.status !== 'AUTH_OK') {
                                error = { authError: true, status: authenticateCustomerResult.status };
                                throw error;
                            }

                            authenticatedCustomer = CustomerMgr.loginCustomer(authenticateCustomerResult, false);

                            if (!authenticatedCustomer) {
                                error = { authError: true, status: authenticateCustomerResult.status };
                                throw error;
                            } else {
                                // assign values to the profile
                                var newCustomerProfile = newCustomer.getProfile();

                                newCustomerProfile.firstName = registrationForm.firstName;
                                newCustomerProfile.lastName = registrationForm.lastName;
                                if (registrationForm.phone && !empty(registrationForm.phone)) {
									newCustomerProfile.phoneMobile = registrationForm.phone;
								}
                                newCustomerProfile.email = registrationForm.email;
                                if (registrationForm.addToEmailList) {
									newCustomerProfile.custom.newsletterSubscription = true;
                					newCustomerProfile.custom.newsletterFrequency = 'default';
								}

                                //Add new email to klaviyo Newsletter Subscription List from create account page
                                try{
                                    var addtoemaillistYN = registrationFormObj.addToEmailList;
                                    if(addtoemaillistYN){
                                        var statusMessage = null;
                                        var klaviyoSubscriptionUtils = require('*/cartridge/scripts/utils/klaviyo/klaviyoSubscriptionUtils');
                                        if (klaviyoSubscriptionUtils.subscribeToList(registrationFormObj.email, "Account Creation")) {
                                            statusMessage = 'success';
                                        } else {
                                            statusMessage = 'alreadyconfirmed';
                                        }
                                    }
                                }catch (e) {
                                    LOGGER.warn('Newsletter subscription failed - '+ e.toString());
                                }
                            }
                        });
                    } catch (e) {
                        if (e.authError) {
                            serverError = true;
                        } else {
                            registrationForm.validForm = false;
                            registrationForm.form.customer.email.valid = false;
                            registrationForm.form.customer.email.error = Resource.msg('error.message.username.invalid', 'forms', null);
                        }
                    }
                }

                delete registrationForm.password;
                delete registrationForm.passwordConfirm;
                formErrors.removeFormValues(registrationForm.form);

                if (serverError) {
                    res.setStatusCode(500);
                    res.json({
                        success: false,
                        errorMessage: Resource.msg('error.message.unable.to.create.account', 'login', null)
                    });

                    return;
                }

                if (registrationForm.validForm) {
					try {
						braintreeUtil.createCustomerOnBraintreeSide();
					} catch (e) {
						LOGGER.warn('Create user on braintree end failed - '+ e.toString());
					}
                    session.custom.showCreateAccountSuccess = true;
                    if (Site.getCurrent().getCustomPreferenceValue('mParticleEnabled')) {
                        session.privacy.registrationEvent = true;
                    }
					var redirectURL = accountHelpers.getLoginRedirectURL(req.querystring.rurl, req.session.privacyCache, true);
					req.session.privacyCache.set('args', null);
                    res.redirect(redirectURL);
                } else {
                    res.render('account/user/registration', { isInvalidPassword: registrationForm.isInvalidPassword, isInvalidEmail: registrationForm.isInvalidEmail });
                }
            });
        } else {
            res.render('account/user/registration', { isInvalidPassword: isInvalidPassword, isInvalidEmail: isInvalidEmail });
        }

        return next();
    }
);

module.exports = server.exports();
