'use strict';

/**
 * @namespace Login
 */

var server = require('server');

var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var Site = require('dw/system/Site');
var productMgr = require('dw/catalog/ProductMgr');
var Logger = require('dw/system/Logger');
var URLUtils = require('dw/web/URLUtils');

/**
 * Login-Show : This endpoint is called to load the login page
 * @name Base/Login-Show
 * @function
 * @memberof Login
 * @param {middleware} - consentTracking.consent
 * @param {middleware} - server.middleware.https
 * @param {middleware} - csrfProtection.generateToken
 * @param {querystringparameter} - rurl - Redirect URL
 * @param {querystringparameter} - action - Action on submit of Login Form
 * @param {category} - sensitive
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
 server.get(
    'LoginModal',
    consentTracking.consent,
    server.middleware.https,
    csrfProtection.generateToken,
    function (req, res, next) {
        try{
            var browsing = require('*/cartridge/scripts/util/Browsing');
			var originalUrl = browsing.lastUrl().toString();
            var Encoding = require("dw/crypto/Encoding");
            var loginRedirectUrl;
			if(originalUrl.indexOf('password-reset') != -1 || originalUrl.indexOf('AccountSfra-PasswordReset') != -1 || originalUrl.indexOf('setpassword') != -1 || originalUrl.indexOf('Account-RegistrationForm') != -1 || originalUrl.indexOf('confirmednewpassword') != -1 || originalUrl.indexOf('AccountSfra-SaveNewPassword') != -1) {
				originalUrl = URLUtils.url('Account-Show').toString();
			}else if(originalUrl.indexOf('Cart-SubmitForm') != -1){
				originalUrl = URLUtils.url('CartSFRA-Show').toString();
			}else if(originalUrl.indexOf('confirmation') != -1 || originalUrl.indexOf('OrderSfra-Confirm') != -1 || originalUrl.indexOf('MParticleSFRA-BuildMParticleData') != -1) {
				loginRedirectUrl = URLUtils.url('Home-Show').toString();
			}
			originalUrl = Encoding.fromURI(originalUrl);
            loginRedirectUrl = Encoding.fromURI(loginRedirectUrl);

			originalUrl = Encoding.fromURI(originalUrl);

            var loginForm = server.forms.getForm('login');
            var mParticleData = {};
            if(Site.getCurrent().getCustomPreferenceValue('mParticleEnabled')){
                    var mParticle_comp = require("int_mParticle/cartridge/scripts/mParticleUtils");
                    mParticleData = mParticle_comp.buildMParticleData();
                }
            var rscData = {};
            if(Site.getCurrent().getCustomPreferenceValue('EnableRSCADC')){
                var rsc_comp = require("int_rsc_gpds/cartridge/controllers/RSCGPDS");
                rscData = rsc_comp.BuildRSCData();
            }

            res.render('/account/login/loginmodalnew', {
                    originalUrl: originalUrl,
                    mParticleData: mParticleData,
                    rscData: rscData,
                    loginForm : loginForm,
                    loginRedirectUrl : loginRedirectUrl
                });
                next();

        }catch (e) {
            Logger.error(e.toString());
        }
    }
);


/**
 * Login-Logout : This endpoint is called to log shopper out of the session
 * @name Base/Login-Logout
 * @function
 * @memberof Login
 * @param {category} - sensitive
 * @param {serverfunction} - get
 */
server.get('Logout', function (req, res, next) {
    var URLUtils = require('dw/web/URLUtils');
    var CustomerMgr = require('dw/customer/CustomerMgr');

    CustomerMgr.logoutCustomer(false);
    res.redirect(URLUtils.url('Account-Show'));
    next();
});

module.exports = server.exports();
