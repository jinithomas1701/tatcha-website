'use strict';

/**
 * Controller for all customer login storefront processes.
 *
 * @module controllers/Login
 */

/* API Includes */
var OAuthLoginFlowMgr = require('dw/customer/oauth/OAuthLoginFlowMgr');
var OrderMgr = require('dw/order/OrderMgr');
var Transaction = require('dw/system/Transaction');
var URLUtils = require('dw/web/URLUtils');
var Site = require('dw/system/Site');
var RateLimiter = require('app_storefront_core/cartridge/scripts/util/RateLimiter');

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var Customer = app.getModel('Customer');
var LOGGER = dw.system.Logger.getLogger('login');
var Resource = require('dw/web/Resource');
var Tatcha = require('app_storefront_core/cartridge/scripts/util/Tatcha');
var braintreeUtil = require('*/cartridge/scripts/util/braintreeUtil.js');

/**
 * Contains the login page preparation and display, it is called from various
 * places implicitly when 'loggedIn' is ensured via the {@link module:guard}.
 */
function show() {
    var pageMeta = require('~/cartridge/scripts/meta');
    var ContentMgr = dw.content.ContentMgr;
    var content = ContentMgr.getContent('myaccount-login');
    var loginForm = app.getForm('login');
    var oauthLoginForm = app.getForm('oauthlogin');
    var orderTrackForm = app.getForm('ordertrack');
    var loginView = app.getView('Login',{
        RegistrationStatus: false
    });

    loginForm.clear();
    oauthLoginForm.clear();
    orderTrackForm.clear();
    require('~/cartridge/scripts/util/SecurityHeaders').setSecurityHeaders();
    if (customer.registered) {
        loginForm.setValue('username', customer.profile.credentials.login);
        loginForm.setValue('rememberme', true);
    }

    if (content) {
        pageMeta.update(content);
    }

    // Save return URL in session.
    if (request.httpParameterMap.original.submitted) {
        session.custom.TargetLocation = request.httpParameterMap.original.value;
    }

    if (request.httpParameterMap.scope.submitted) {
        switch (request.httpParameterMap.scope.stringValue) {
            case 'wishlist':
                loginView.template = 'account/wishlist/wishlistlanding';
                break;
            case 'giftregistry':
                loginView.template = 'account/giftregistry/giftregistrylanding';
                break;
            default:
        }
    }
    
    if(customer.authenticated && loginView.template == 'account/login/accountlogin') {
    	response.redirect(URLUtils.url('Account-Show'));
    	return;
    } else {
    	loginView.render();
    }
}

/**
 * Internal function that reads the URL that should be redirected to after successful login
 * @return {dw.web.Url} The URL to redirect to in case of success
 * or {@link module:controllers/Account~Show|Account controller Show function} in case of failure.
 */
function getTargetUrl () {
    if (session.custom.TargetLocation) {
        var target = session.custom.TargetLocation;
        delete session.custom.TargetLocation;
        //@TODO make sure only path, no hosts are allowed as redirect target
        dw.system.Logger.info('Redirecting to "{0}" after successful login', target);
        var targetUrl = decodeURI(target);
        targetUrl = require('app_storefront_core/cartridge/scripts/util/Redirect').validateOriginalURL(targetUrl);
        return targetUrl;
    } else {
        return URLUtils.https('Account-Show');
    }
}

/**
 * Form handler for the login form. Handles the following actions:
 * - __login__ - logs the customer in and renders the login page.
 * If login fails, clears the login form and redirects to the original controller that triggered the login process.
 * - __register__ - redirects to the {@link module:controllers/Account~startRegister|Account controller StartRegister function}
 * - __findorder__ - if the ordertrack form does not contain order number, email, or postal code information, redirects to
 * {@link module:controllers/Login~Show|Login controller Show function}. If the order information exists, searches for the order
 * using that information. If the order cannot be found, renders the LoginView. Otherwise, renders the order details page
 * (account/orderhistory/orderdetails template).
 * - __error__ - renders the LoginView.
 */
function handleLoginForm () {
    var loginForm = app.getForm('login');

    loginForm.handleAction({
        login: function () {
            // Check to see if the number of attempts has exceeded the session threshold
            if (RateLimiter.isOverThreshold('FailedLoginCounter')) {
                RateLimiter.showCaptcha();
            }

            var success = Customer.login(loginForm.getValue('username'), loginForm.getValue('password'), loginForm.getValue('rememberme'));
            var CustomerMgr =require('dw/customer/CustomerMgr'); 
            var customerEmail = loginForm.getValue('username');
    		var customerByLogin = CustomerMgr.getCustomerByLogin(customerEmail);
    		
    		var newPasswordReset = false;   
    	    if(customerByLogin){
    			newPasswordReset = customerByLogin.profile.custom.IsPasswordReset ;
    	    }       	   
        		
            if (!success) {
                loginForm.get('loginsucceeded').invalidate();
                loginForm.object.password.clearFormElement();
                if(newPasswordReset == true){
                	response.redirect(URLUtils.url('Account-FirstTimeLogin'));
                    return;
                }
                if(request.httpParameterMap.scope == 'checkout') {
                    response.redirect(URLUtils.url('COCustomer-Start', 'emailExists', true));
                    return;
                }
                app.getView('Login').render();
                return;
            } else {
                loginForm.clear();
            }

            RateLimiter.hideCaptcha();            
       
            // mParticle Handle Login event
        	if(Site.getCurrent().getCustomPreferenceValue('mParticleEnabled')) {
        		session.privacy.loginEvent = true;
        		//get wishlist
        	    var ProductList = app.getModel('ProductList');
        	    var productList = ProductList.get();
        	    var wishlistContent = new dw.util.ArrayList(productList.object.items);
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
        			LOGGER.info('Mparticle wishlist error', e.toString());
        		}
        	}

            if(Site.getCurrent().getCustomPreferenceValue('EnableRSCADC')) {
        		session.privacy.loginEventRSC = true;
        		//get wishlist
        	    var ProductList = app.getModel('ProductList');
        	    var productList = ProductList.get();
        	    var wishlistContent = new dw.util.ArrayList(productList.object.items);
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

            // In case of successful login            
            //Sync newsletter subscription status
            try {
            	Tatcha.syncSubscriptionStatus();
            } catch (e) {
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
            
            // Redirects to the original controller that triggered the login process or to express checkout if user qualifies.
            if (!empty(customerByLogin.profile.addressBook.preferredAddress) && !empty(customerByLogin.profile.wallet.paymentInstruments) &&(request.httpParameterMap.scope == 'checkout')){
            	response.redirect(URLUtils.https('ExpressCheckout-Start').append('checkouttype', 'expresscheckout'));
            } else {
                if(request.httpParameterMap.scope == 'checkout') {
                    response.redirect(URLUtils.https('COShipping-Start'));
                } else {
                    response.redirect(getTargetUrl());
                }                
            }
            return;
        },
        register: function () {
            response.redirect(URLUtils.https('AccountSfra-StartRegister'));
            return;
        },
        continuelogin:function () {
        	var Customer = app.getModel('Customer');
        	var loginForm = app.getForm('login');
        	var CustomerMgr = require('dw/customer/CustomerMgr');
        	
        	
        	var customerEmail = loginForm.getValue('username');
        	
        	var customerByLogin = CustomerMgr.getCustomerByLogin('customerEmail');
        	            
      	  if (customerByLogin) {
      	  response.redirect(URLUtils.https('COCustomer-Start').append('scope', 'checkout'));
      	  }
         
      },
        findorder: function () {
            var orderTrackForm = app.getForm('ordertrack');
            var orderNumber = orderTrackForm.getValue('orderNumber');
            var orderFormEmail = orderTrackForm.getValue('orderEmail');
           
            if (!orderNumber || !orderFormEmail) {
                response.redirect(URLUtils.https('Login-Show'));
                return;
            }

            // Check to see if the number of attempts has exceeded the session threshold
            if (RateLimiter.isOverThreshold('FailedOrderTrackerCounter')) {
                RateLimiter.showCaptcha();
            }

            var orders = OrderMgr.searchOrders('orderNo={0} AND status!={1}', 'creationDate desc', orderNumber,
                dw.order.Order.ORDER_STATUS_REPLACED);

            if (empty(orders)) {
                app.getView('Login', {
                    OrderNotFound: true
                }).render();
                return;
            }

            var foundOrder = orders.next();

            if (foundOrder.customerEmail !== orderFormEmail) {
                app.getView('Login', {
                    OrderNotFound: true
                }).render();
                return;
            }

            // Reset the error condition on exceeded attempts
            RateLimiter.hideCaptcha();

            app.getView({
                Order: foundOrder
            }).render('account/orderhistory/orderdetails');
        },
        search: function (form, action) {
            var ProductList = require('dw/customer/ProductList');
            var ProductListModel = app.getModel('ProductList');
            var context = {};
            var searchForm, listType, productLists, template;
            if (action.htmlName.indexOf('wishlist_search') !== -1) {
                searchForm = action.parent;
                listType = ProductList.TYPE_WISH_LIST;
                template = 'account/wishlist/wishlistresults';
                productLists = ProductListModel.search(searchForm, listType);
                Transaction.wrap(function () {
                    session.forms.wishlist.productlists.copyFrom(productLists);
                    searchForm.clearFormElement();
                });
                context.SearchFirstName = searchForm.firstname.value;
                context.SearchLastName = searchForm.lastname.value;
                context.SearchEmail = searchForm.email.value;
            } else if (action.htmlName.indexOf('giftregistry_search') !== -1) {
                searchForm = action.parent.simple;
                listType = ProductList.TYPE_GIFT_REGISTRY;
                template = 'account/giftregistry/giftregistryresults';
                productLists = ProductListModel.search(searchForm, listType);
                context.ProductLists = productLists;
            }
            app.getView(context).render(template);
        },
        error: function () {
            app.getView('Login').render();
            return;
        }
    });
}

/**
 * Form handler for the oauthlogin form. Handles the following actions:
 * - __login__ - Starts the process of authentication via an external OAuth2 provider.
 * Uses the OAuthProvider property in the httpParameterMap to determine which provider to initiate authentication with.
 * Redirects to the provider web page where the customer initiates the actual user authentication.
 * If no provider page is available, renders the LoginView.
 * - __error__ - renders the LoginView.
 */
function handleOAuthLoginForm() {
    var oauthLoginForm = app.getForm('oauthlogin');
    oauthLoginForm.handleAction({
        login: function () {
            if (request.httpParameterMap.OAuthProvider.stringValue) {
                session.custom.RememberMe = request.httpParameterMap.rememberme.booleanValue || false;
                
                if(request.httpParameterMap.redirectUrl.stringValue) {
                	session.custom.TargetLocation = request.httpParameterMap.redirectUrl.stringValue;
                } else if(request.httpParameterMap.originalUrl.stringValue) {
                	var original = request.httpParameterMap.originalUrl.stringValue
                	original = require('app_storefront_core/cartridge/scripts/util/Redirect').validateOriginalURL(original);
                	session.custom.TargetLocation = original;
                } else if(request.httpParameterMap.scope == 'checkout') {
                    session.custom.TargetLocation = URLUtils.url('COShipping-Start').toString();
                } else {}
                
                var OAuthProviderID = request.httpParameterMap.OAuthProvider.stringValue;
                var initiateOAuthLoginResult = OAuthLoginFlowMgr.initiateOAuthLogin(OAuthProviderID);

                if (!initiateOAuthLoginResult) {
                    oauthLoginForm.get('loginsucceeded').invalidate();

                    // Show login page with error.
                    app.getView('Login').render();
                    return;

                }
                response.redirect(initiateOAuthLoginResult.location);
            }
            return;
        },
        error: function () {
            app.getView('Login').render();
            return;
        }
    });
}

/**
 * Determines whether the request has an OAuth provider set. If it does, calls the
 * {@link module:controllers/Login~handleOAuthLoginForm|handleOAuthLoginForm} function,
 * if not, calls the {@link module:controllers/Login~handleLoginForm|handleLoginForm} function.
 */
function processLoginForm () {
    if (request.httpParameterMap.OAuthProvider.stringValue) {
        handleOAuthLoginForm();
    } else {
        handleLoginForm();
    }
}

/**
 * Invalidates the oauthlogin form.
 * Calls the {@link module:controllers/Login~finishOAuthLogin|finishOAuthLogin} function.
*/
function oAuthFailed() {
    app.getForm('oauthlogin').get('loginsucceeded').invalidate();
    session.privacy.facebookLoginFailedEvent = true;
    finishOAuthLogin();
}
/**
 * Clears the oauthlogin form.
 * Calls the {@link module:controllers/Login~finishOAuthLogin|finishOAuthLogin} function.
*/
function oAuthSuccess() {
    app.getForm('oauthlogin').clear();
    session.privacy.facebookLoginEvent = true;
    if(Site.getCurrent().getCustomPreferenceValue('EnableRSCADC')) {
    	session.privacy.facebookLoginEventRSC = true;
    }
    finishOAuthLogin();
}
/**
 * This function is called after authentication by an external oauth provider.
 * If the user is successfully authenticated, the provider returns an authentication code,
 * this function exchanges the code for a token and with that token requests  the user information specified by
 *  the configured scope (id, first/last name, email, etc.) from the provider.
 * If the token exchange succeeds, calls the {@link module:controllers/Login~oAuthSuccess|oAuthSuccess} function.
 * If the token exchange fails, calls the {@link module:controllers/Login~oAuthFailed|oAuthFailed} function.
 * The function also handles multiple error conditions and logs them.
*/
function handleOAuthReentry() {
    var finalizeOAuthLoginResult = OAuthLoginFlowMgr.finalizeOAuthLogin();
    if (!finalizeOAuthLoginResult || !finalizeOAuthLoginResult.userInfoResponse) {
        oAuthFailed();
        return;
    }
    var responseText = finalizeOAuthLoginResult.userInfoResponse.userInfo;
    var oAuthProviderID = finalizeOAuthLoginResult.accessTokenResponse.oauthProviderId;
    var accessToken = finalizeOAuthLoginResult.accessTokenResponse.accessToken;

    if (!oAuthProviderID) {
        LOGGER.warn('OAuth provider id is null.');
        oAuthFailed();
        return;
    }

    if (!responseText) {
        LOGGER.warn('Response from provider is empty');
        oAuthFailed();
        return;
    }

    //whether to drop the rememberMe cookie (preserved in the session before InitiateOAuthLogin)
    var rememberMe = session.custom.RememberMe;
    delete session.custom.RememberMe;

    // LinkedIn returns XML.
    var extProfile = {};
    if (oAuthProviderID === 'LinkedIn') {
        var responseReader = new dw.io.Reader(responseText);
        var xmlStreamReader = new dw.io.XMLStreamReader(responseReader);
        while (xmlStreamReader.hasNext()) {
            if (xmlStreamReader.next() === dw.io.XMLStreamConstants.START_ELEMENT) {
                var localElementName = xmlStreamReader.getLocalName();
                // Ignore the top level person element and read the rest into a plain object.
                if (localElementName !== 'person') {
                    extProfile[localElementName] = xmlStreamReader.getElementText();
                }
            }
        }
        xmlStreamReader.close();
        responseReader.close();
    } else {
        // All other providers return JSON.
        extProfile = JSON.parse(responseText);
        if (!extProfile) {
            LOGGER.warn('Data could not be extracted from the response:\n{0}', responseText);
            oAuthFailed();
            return;
        }
        if (oAuthProviderID === 'VKontakte') {
            // They use JSON, but thought it would be cool to add some extra top level elements
            extProfile = extProfile.response[0];
        }
    }

    // This is always id or uid for all providers.
    var userId = extProfile.id;
    if (!userId) {
        LOGGER.warn('Undefined user identifier - make sure you are mapping the correct property from the response.' +
            ' We are mapping "id" which is not available in the response: \n', extProfile);
        oAuthFailed();
        return;
    }
    LOGGER.debug('Parsed UserId "{0}" from response: {1}', userId, JSON.stringify(extProfile));

    if (oAuthProviderID === 'SinaWeibo') {
        // requires additional requests to get the info
        extProfile = getSinaWeiboAccountInfo(accessToken, userId);
    }

    var extEmailAddress = extProfile.email;
    if(empty(extEmailAddress)){
    	 session.custom.oAuthError = 'FB Login Invalid';
    	LOGGER.debug('Email: ' + extEmailAddress + ' Email address empty.');
    	oAuthFailed();
    	return;
    }
    var profile = dw.customer.CustomerMgr.getExternallyAuthenticatedCustomerProfile(oAuthProviderID, userId);
    var existingCustomer = dw.customer.CustomerMgr.getCustomerByLogin(extEmailAddress);
    var customer;
    var password = 'January11th!@#'
    
    	if (!profile && !existingCustomer) {
        Transaction.wrap(function () {
            LOGGER.debug('User id: ' + userId + ' not found, creating a new profile.');
            customer = dw.customer.CustomerMgr.createCustomer(extEmailAddress, password);
            customer.createExternalProfile(oAuthProviderID, userId)
            profile = customer.getProfile();
            var firstName, lastName, email;

            // Google comes with a 'name' property that holds first and last name.
            if (typeof extProfile.name === 'object') {
                firstName = extProfile.name.givenName;
                lastName = extProfile.name.familyName;
            } else {
                // The other providers use one of these, GitHub & SinaWeibo have just a 'name'.
                firstName = extProfile['first-name'] || extProfile.first_name || extProfile.name;
                lastName = extProfile['last-name'] || extProfile.last_name || extProfile.name;
            }
            // Simple email addresses.
            email =  extProfile['email-address'] || extProfile.email;
            if (!email) {
                var emails = extProfile.emails;
                // Google comes with an array
                if (emails && emails.length) {
                    //First element of the array is the account email according to Google.
                    profile.setEmail(extProfile.emails[0].value);
                // While MS comes with an object.
                } else {
                	if(emails) {
                		email = emails.preferred || extProfile['emails.account'] || extProfile['emails.personal'] || extProfile['emails.business'];
                	}  
                }
            }
            LOGGER.debug('Updating profile with "{0} {1} - {2}".',firstName, lastName,email);
            profile.setFirstName(firstName);
            profile.setLastName(lastName);
            profile.setEmail(email);
        });
    } else {
    	// Was an existing customer found?
    	       if (existingCustomer) {
    	 
    	           // Attempt to retrieve the existing customer profile for this user
    	           var existingCustomerExtProfile = existingCustomer.getExternalProfile(oAuthProviderID, userId);
    	 
    	             // Was an existing customer profile found that matches the current one?
    	             if (!existingCustomerExtProfile) {
    	
    	                 // If not, then create / link the external profile to the existing user account
    	                 Transaction.wrap(function () {
    	                     existingCustomer.createExternalProfile(oAuthProviderID, userId);
    	                 });
    	 
    	             }
    	 
    	             // Retrieve the profile for the existing user (vs. the oAuth version)
    	             profile = existingCustomer.getProfile();
    	 
    	         }
    }
    var credentials = profile.getCredentials();
    if (credentials.isEnabled()) {
        Transaction.wrap(function () {
            dw.customer.CustomerMgr.loginExternallyAuthenticatedCustomer(oAuthProviderID, userId, rememberMe);
        });
        LOGGER.debug('Logged in external customer with id: {0}', userId);
    } else {
        LOGGER.warn('Customer attempting to login into a disabled profile: {0} with id: {1}',
            profile.getCustomer().getCustomerNo(), userId);
        oAuthFailed();
        return;
    }


    oAuthSuccess();
}

/**
 * Get Sina Weibo account via additional requests.
 * Also handles multiple error conditions and logs them.
 * @param  {String} accessToken The OAuth access token.
 * @param  {String} userId      The OAuth user ID.
 * @return {Object}             Account information.
 * @todo Migrate httpClient calls to dw.svc.*
 */
function getSinaWeiboAccountInfo(accessToken, userId) {
    var name, email;
    if (null === accessToken) {
        LOGGER.warn('Exiting because the AccessToken input parameter is null.');
        return null;
    }
    var accessTokenSuffix = '?access_token=' + accessToken;
    var http = new dw.net.HTTPClient();
    http.setTimeout(30000); //30 secs

    //Obtain the name:
    //http://open.weibo.com/wiki/2/users/show/en -> https://api.weibo.com/2/users/show.json
    var urlUser = 'https://api.weibo.com/2/users/show.json' + accessTokenSuffix +
        '&uid=' + userId;
    http.open('GET', urlUser);
    http.send();
    var resultName  = http.getText();
    if (200 !== http.statusCode) {
        LOGGER.warn('Got an error calling:' + urlUser +
            '. The status code is:' + http.statusCode + ' ,the text is:' + resultName +
            ' and the error text is:' + http.getErrorText());
        return null;
    } else {
        var weiboUser = JSON.parse(resultName);
        if (null === weiboUser) {
            LOGGER.warn('Name could not be extracted from the response:' + resultName);
            return null;
        } else {
            name = weiboUser.name;
        }
    }

    //Obtain the email:
    //http://open.weibo.com/wiki/2/account/profile/email -> https://api.weibo.com/2/account/profile/email.json
    var urlEmail  = 'https://api.weibo.com/2/account/profile/email.json' + accessTokenSuffix;
    http.open('GET', urlEmail);
    http.send();
    var resultEmail  = http.getText();
    if (200 !== http.statusCode) {//!
        LOGGER.warn('Email could not be retrieved. Got an error calling:' + urlUser +
            '. The status code is:' + http.statusCode + ' ,the text is:' + resultEmail +
            ' and the error text is:' + http.getErrorText() +
            '. Make sure your application is authorized by Weibo to request email info (usually need to be successfully audited by them.)');
    } else {
        var weiboEmail  = JSON.parse(resultEmail);// in the format: ('[{"Email": "weibo_api_tech@sina.com"}]');
        if (null === weiboEmail) {
            LOGGER.warn('Email could not be extracted from the response:' + resultEmail);
        } else {
            var emails  = weiboEmail;
            if (emails && 0 < emails.length) {
                //first element of the array would be the account email according to Google:
                email = emails[0].Email;
            }
        }
    }
    return {name: name, email: email};
}

/**
 * Internal helper function to finish the OAuth login.
 * Redirects user to the location set in either the
 * {@link module:controllers/Login~handleOAuthLoginForm|handleOAuthLoginForm} function
 */
function finishOAuthLogin() {
    // To continue to the destination that is already preserved in the session.
    var location = getTargetUrl().toString();
    if(location.indexOf('checkout/shipping') != -1) {
    	if(customer.authenticated && customer.addressBook.preferredAddress) {
    		session.custom.checkoutState = 'review'; 
    		var location = URLUtils.url('ExpressCheckout-Start').toString();
    	} 
    	else {
    		session.custom.checkoutState = 'shipping'; 
    		var location = URLUtils.url('SinglePageCheckout-Start').toString();
    	}
    }
    response.redirect(location);
}
/**
 * Logs the customer out and clears the login and profile forms.
 * Calls the {@link module:controllers/Account~Show|Account controller Show function}.
 */
function Logout() {
    Customer.logout();

    app.getForm('login').clear();
    app.getForm('profile').clear();


    //Cart.get().calculate();

    response.redirect(URLUtils.https('Account-Show'));
}

function loginModal() {
    try{
        var browsing = require('app_storefront_controllers/cartridge/scripts/util/Browsing');
        var originalUrl = browsing.lastUrl().toString();
        var mParticleData = {};
        if(Site.getCurrent().getCustomPreferenceValue('mParticleEnabled')){
            var mParticle_comp = require("int_mParticle/cartridge/controllers/MParticle");
            mParticleData = mParticle_comp.BuildMParticleData();
        }
        var rscData = {};
        if(Site.getCurrent().getCustomPreferenceValue('EnableRSCADC')){
            var rsc_comp = require("int_rsc_gpds/cartridge/controllers/RSCGPDS");
            rscData = rsc_comp.BuildRSCData();
        }
        if(Site.getCurrent().getCustomPreferenceValue('skip_email_gate') && (request.httpParameterMap.scope == 'checkout' || request.httpParameterMap.scope == 'spcheckout')) {
            app.getView({
                scope: request.httpParameterMap.scope,
                originalUrl: originalUrl,
                mParticleData : mParticleData,
                rscData : rscData
            }).render('account/login/loginmodal');
        } else {
            app.getView({
                originalUrl: originalUrl,
                mParticleData : mParticleData,
                rscData : rscData
            }).render('account/login/loginmodal');
        }
    }catch (e) {

    }
}

function handleLoginModal() {
	
	var isBot = false;
    // Check to see if the number of attempts has exceeded the session threshold
    if (RateLimiter.isOverThreshold('FailedLoginCounter')) {
        RateLimiter.showCaptcha();  
        isBot = true;
    }
	
	var status, redirectUrl, errorMsgCode;
	let r = require('~/cartridge/scripts/util/Response');
	var username = request.httpParameterMap.dwfrm_login_username.stringValue;
	var password = request.httpParameterMap.dwfrm_login_password.stringValue;
	
	var success = Customer.login(username, password, null);
    var CustomerMgr =require('dw/customer/CustomerMgr');
	var customerByLogin = CustomerMgr.getCustomerByLogin(username);
	
	var newPasswordReset = false;   
    if(customerByLogin){
		newPasswordReset = customerByLogin.profile.custom.IsPasswordReset ;
    }       	   
		
    if (!success) {
        status = 'error';
        errorMsgCode = 'account.login.logininclude.loginerror';
        
        // Single Page Checkout : ERROR 
        if(Site.getCurrent().getCustomPreferenceValue('enableSinglePageCheckout')) {
        	if(request.httpParameterMap.scope == 'spcheckout') {
        		session.custom.checkoutState = 'shipping';  		
    	    	session.custom.checkoutMode = 'edit';
    	        /*app.getView({
                    responseCode: 'INVALID-LOGIN',
                    responseMsg: Resource.msg(errorMsgCode, 'account', null)
                }).render('singlepagecheckout/rendercheckoutcontainer');*/

				 r.renderJSON({
		            status: status,
		            isBot:isBot,
		            errorMsg: Resource.msg(errorMsgCode, 'account', null)
		        });
				return;
        	}
        }
        
        if(newPasswordReset == true){
        	redirectUrl = URLUtils.url('Account-FirstTimeLogin').toString();
        }
        r.renderJSON({
            status: status,
            isBot:isBot,
            errorMsg: Resource.msg(errorMsgCode, 'account', null),
            redirectUrl: redirectUrl
        });
    	return;
    }
    
    try {
    	Tatcha.syncSubscriptionStatus();
    } catch (e) {
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
    
    RateLimiter.hideCaptcha();
    
    //Add item to wishlist
    var callBackAction = request.httpParameterMap.callBackAction.stringValue;
    if(callBackAction == 'wishlist') {
    	var wishlist = require('app_storefront_controllers/cartridge/controllers/Wishlist.js');
    	wishlist.AddProduct();
    }
    if(callBackAction == 'wishlist-addall') {
    	var wishlist = require('app_storefront_controllers/cartridge/controllers/Wishlist.js');
    	wishlist.AddAllItem();
    }
    
    
    
    // mParticle Handle Login event
	if(Site.getCurrent().getCustomPreferenceValue('mParticleEnabled')) {
		session.privacy.loginEvent = true;
		//get wishlist
		var ProductList = app.getModel('ProductList');
	    var productList = ProductList.get();
	    var wishlistContent = new dw.util.ArrayList(productList.object.items);
	    var wishlistPids = [];
	    try {
	    	for (var i = 0; i < wishlistContent.length; i++) {
	    		if(wishlistContent[i] && wishlistContent[i].product) {
					wishlistPids.push(wishlistContent[i].product.name);
				}
			}
		    session.privacy.wishlistPids = JSON.stringify(wishlistPids);
            //Get subscribed Product lists
            var mParticleUtil = require('int_mParticle/cartridge/scripts/mParticleUtils.js');
            mParticleUtil.getCustomersActiveSubscriptions();
		} catch (e) {
			LOGGER.info('Mparticle wishlist error', e.toString());
		}
	}
	
    // Single Page Checkout : SUCCESS
    if(Site.getCurrent().getCustomPreferenceValue('enableSinglePageCheckout')) {
    	if(request.httpParameterMap.scope == 'spcheckout') {
    		 if(Site.getCurrent().getCustomPreferenceValue('skip_email_gate')) {
    		if (!empty(customerByLogin.profile.addressBook.preferredAddress) && !empty(customerByLogin.profile.wallet.paymentInstruments)){
    			session.custom.checkoutState = 'review';  		
    	    	redirectUrl = URLUtils.https('ExpressCheckout-Start').append('checkouttype', 'expresscheckout').toString();
    	    }else if(!empty(customerByLogin.profile.addressBook.preferredAddress) && empty(customerByLogin.profile.wallet.paymentInstruments)){
    	    	session.custom.checkoutState = 'billing'; 
    	    	session.custom.checkoutMode = 'edit';
    	    	redirectUrl = URLUtils.url('ExpressCheckout-Start').toString();
    	    }else {
    	    	session.custom.checkoutState = 'shipping';
    	    	session.custom.checkoutMode = 'edit';
    	    	redirectUrl = URLUtils.url('COShipping-Start').toString();
    	    }
    	}	
	       // app.getView().render('singlepagecheckout/rendercheckoutcontainer');
			r.renderJSON({
		        status: 'success',
		        redirectUrl: redirectUrl
		    });
    		return;
    	}
    }
    
    
    
    
    //Handling checkout page redirection
    if(Site.getCurrent().getCustomPreferenceValue('skip_email_gate')) {
	    if (!empty(customerByLogin.profile.addressBook.preferredAddress) && !empty(customerByLogin.profile.wallet.paymentInstruments) 
	    		&&(request.httpParameterMap.scope == 'checkout')){
	    	redirectUrl = URLUtils.https('ExpressCheckout-Start').append('checkouttype', 'expresscheckout').toString();
	    }else if(!empty(customerByLogin.profile.addressBook.preferredAddress) && empty(customerByLogin.profile.wallet.paymentInstruments)
	    		&& request.httpParameterMap.scope == 'checkout'){
	    	redirectUrl = URLUtils.url('COBilling-Start', 'skip_email', true).toString();
	    }else if(request.httpParameterMap.scope == 'checkout') {
	    	redirectUrl = URLUtils.url('COShipping-Start').toString();
	    }
    }
    
    //Handle Confirmation Page 
    var originalUrl = (request.httpParameterMap.originalUrl)?request.httpParameterMap.originalUrl.toString():'';
    if((originalUrl) && (originalUrl.indexOf('/checkout/confirmation') != -1)){
    	redirectUrl = URLUtils.abs('Home-Show').toString();
    }
    status = 'success';
    r.renderJSON({
        status: status,
        errorMsg: Resource.msg(errorMsgCode, 'account', null),
        redirectUrl: redirectUrl
    });
    return;
}

/*
 * Web exposed methods
 */
/** Contains the login page preparation and display.
 * @see module:controllers/Login~show */
exports.Show                    = guard.ensure(['https'], show);
/** Determines whether the request has an OAuth provider set.
 * @see module:controllers/Login~processLoginForm */
exports.LoginForm               = guard.ensure(['https','post', 'csrf'], processLoginForm);
/** Form handler for the oauthlogin form.
 * @see module:controllers/Login~handleOAuthLoginForm */
exports.OAuthLoginForm          = guard.ensure(['https','post', 'csrf'], handleOAuthLoginForm);
/** Exchanges a user authentication code for a token and requests user information from an OAUTH provider.
 * @see module:controllers/Login~handleOAuthReentry */
exports.OAuthReentry            = guard.ensure(['https','get'], handleOAuthReentry);
/** @deprecated This is only kept for compatibility reasons, use {@link module:controllers/Login~handleOAuthReentry|handleOAuthReentry} instead */
exports.OAuthReentryLinkedIn    = guard.ensure(['https','get'], handleOAuthReentry);
/** @deprecated This is only kept for compatibility reasons, use {@link module:controllers/Login~handleOAuthReentry|handleOAuthReentry} instead */
exports.OAuthReentryGoogle      = guard.ensure(['https','get'], handleOAuthReentry);
/** @deprecated This is only kept for compatibility reasons, use {@link module:controllers/Login~handleOAuthReentry|handleOAuthReentry} instead */
exports.OAuthReentryGooglePlus  = guard.ensure(['https','get'], handleOAuthReentry);
/** @deprecated This is only kept for compatibility reasons, use {@link module:controllers/Login~handleOAuthReentry|handleOAuthReentry} instead */
exports.OAuthReentryMicrosoft   = guard.ensure(['https','get'], handleOAuthReentry);
/** @deprecated This is only kept for compatibility reasons, use {@link module:controllers/Login~handleOAuthReentry|handleOAuthReentry} instead */
exports.OAuthReentryFacebook    = guard.ensure(['https','get'], handleOAuthReentry);
/** @deprecated This is only kept for compatibility reasons, use {@link module:controllers/Login~handleOAuthReentry|handleOAuthReentry} instead */
exports.OAuthReentryGitHub      = guard.ensure(['https','get'], handleOAuthReentry);
/** @deprecated This is only kept for compatibility reasons, use {@link module:controllers/Login~handleOAuthReentry|handleOAuthReentry} instead */
exports.OAuthReentrySinaWeibo   = guard.ensure(['https','get'], handleOAuthReentry);
/** @deprecated This is only kept for compatibility reasons, use {@link module:controllers/Login~handleOAuthReentry|handleOAuthReentry} instead */
exports.OAuthReentryVKontakte   = guard.ensure(['https','get'], handleOAuthReentry);
/** Contains the login page preparation and display.
 * @see module:controllers/Login~show */
exports.Logout                  = guard.all(Logout);

exports.LoginModal              = guard.ensure(['get'], loginModal);

exports.HandleLoginModal        = guard.ensure(['https','post', 'csrf'], handleLoginModal);
