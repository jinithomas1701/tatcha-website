'use strict';
var base = module.superModule;
var URLUtils = require('dw/web/URLUtils');
var endpoints = require('*/cartridge/config/oAuthRenentryRedirectEndpoints');
var ProductListMgr = require('dw/customer/ProductListMgr');
var Transaction = require('dw/system/Transaction');

/**
 *
 * @param {string} email - customer email address
 * @param {string} password - customer password
 * @param {boolean} rememberMe - remember me setting
 * @returns {Object} customerLoginResult
 */
base.loginCustomer = function (email, password, rememberMe) {
    var Transaction = require('dw/system/Transaction');
    var CustomerMgr = require('dw/customer/CustomerMgr');
    var Resource = require('dw/web/Resource');
    return Transaction.wrap(function () {
        var authenticateCustomerResult = CustomerMgr.authenticateCustomer(email, password);

        if (authenticateCustomerResult.status !== 'AUTH_OK') {
            var errorCodes = {
                ERROR_CUSTOMER_DISABLED: 'account.login.logininclude.loginerror',
                ERROR_CUSTOMER_LOCKED: 'account.login.logininclude.locked',
                ERROR_CUSTOMER_NOT_FOUND: 'account.login.logininclude.loginerror',
                ERROR_PASSWORD_EXPIRED: 'account.login.logininclude.loginerror',
                ERROR_PASSWORD_MISMATCH: 'account.login.logininclude.loginerror',
                ERROR_UNKNOWN: 'account.login.logininclude.loginerror',
                default: 'account.login.logininclude.loginerror'
            };

            var errorMessageKey = errorCodes[authenticateCustomerResult.status] || errorCodes.default;
            var errorMessage = Resource.msg(errorMessageKey, 'account', null);

            return {
                error: true,
                errorMessage: errorMessage,
                status: authenticateCustomerResult.status,
                authenticatedCustomer: null
            };
        }

        return {
            error: false,
            errorMessage: null,
            status: authenticateCustomerResult.status,
            authenticatedCustomer: CustomerMgr.loginCustomer(authenticateCustomerResult, rememberMe)
        };
    });
}

/**
 * Get wishlist IDs
 * @returns {*}
 */
base.getWishlistIds = function () {
    var obj = ProductListMgr.getProductLists(customer, dw.customer.ProductList.TYPE_WISH_LIST);
    if (obj.empty) {
        Transaction.wrap(function () {
            obj = ProductListMgr.createProductList(customer, dw.customer.ProductList.TYPE_WISH_LIST);
        });
    } else {
        obj = obj[0];
    }
    return obj;
}

/**
 * Gets the password reset token of a customer
 * @param {Object} customer - the customer requesting password reset token
 * @returns {string} password reset token string
 */
function getPasswordResetToken(customer) {
    var Transaction = require('dw/system/Transaction');

    var passwordResetToken;
    Transaction.wrap(function () {
        passwordResetToken = customer.profile.credentials.createResetPasswordToken();
    });
    return passwordResetToken;
}

/**
 * Sends the email with password reset instructions
 * @param {string} email - email for password reset
 * @param {Object} resettingCustomer - the customer requesting password reset
 */
base.sendPasswordResetEmail = function (email, resettingCustomer) {
    var Resource = require('dw/web/Resource');
    var Site = require('dw/system/Site');
    var emailHelpers = require('*/cartridge/scripts/helpers/emailHelpers');
    var klaviyoUtils = require('*/cartridge/scripts/utils/klaviyo/klaviyoUtils');

    var passwordResetToken = getPasswordResetToken(resettingCustomer);
    var url = URLUtils.https('AccountSfra-SetNewPassword', 'Token', passwordResetToken);
    var klaviyoEnabled = Site.getCurrent().getCustomPreferenceValue('klaviyo_enabled');
	var klaviyoResetPwdMailEnabled = Site.getCurrent().getCustomPreferenceValue('klaviyo_reset_pwd_transactional_enabled');
	
	if (klaviyoEnabled && klaviyoResetPwdMailEnabled) {
		var resetPasswordDetails = {};
	    resetPasswordDetails['RESET_URL'] = url.toString(); 
		klaviyoUtils.sendEmail(resettingCustomer.profile.email, resetPasswordDetails, 'reset password');
	} else {
		var objectForEmail = {
	        ResetPasswordToken: passwordResetToken,
	        Customer: resettingCustomer.profile.customer
	    };
	    var emailObj = {
	        to: email,
	        subject: Resource.msg('resource.passwordassistance', 'email', null),
	        from: Site.current.getCustomPreferenceValue('customerServiceEmail') || 'no-reply@tatcha.com',
	        type: emailHelpers.emailTypes.passwordChanged
	    };
	    emailHelpers.sendEmail(emailObj, 'mail/resetpasswordemail', objectForEmail);
	}
}

/**
 * Creates an account model for the current customer
 * @param {string} redirectUrl - rurl of the req.querystring
 * @param {string} privacyCache - req.session.privacyCache
 * @param {boolean} newlyRegisteredUser - req.session.privacyCache
 * @returns {string} a redirect url
 */
base.getLoginRedirectURL = function (redirectUrl, privacyCache, newlyRegisteredUser) {
    var endpoint = 'Account-Show';
    var result;
    var targetEndPoint = redirectUrl
        ? parseInt(redirectUrl, 10)
        : 1;

    var registered = newlyRegisteredUser ? 'submitted' : 'false';

    var argsForQueryString = privacyCache.get('args');

    if (targetEndPoint && endpoints[targetEndPoint]) {
        endpoint = endpoints[targetEndPoint];
    }

    if (argsForQueryString) {
        result = URLUtils.url(endpoint, 'registration', registered, 'args', argsForQueryString).relative().toString();
    } else {
        result = URLUtils.url(endpoint, 'registration', registered).relative().toString();
    }

    return result;
}

module.exports = base;
