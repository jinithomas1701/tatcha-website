'use strict';
const server = require('server');

var { getPaypalCustomerPaymentInstrumentByEmail } = require('~/cartridge/scripts/braintree/helpers/customerHelper');
var Resource = require('dw/web/Resource');
var braintreeConstants = require('~/cartridge/scripts/util/braintreeConstants');
var middleware = {};

/**
 * Gets appropriate form fields according end point
 * @param {string} endpointName endpoint name
 * @return {Object} Object with form fields
 */
function getFormFileds(endpointName) {
    var formFields = {};

    switch (endpointName) {
        case braintreeConstants.ENDPOINT_ACCOUNT_ADD_SRC_HANDLE_NAME:
            formFields.nonce = server.forms.getForm('braintreesecureremotecommerceaccount').nonce;
            break;
        case braintreeConstants.ENDPOINT_ACCOUNT_ADD_GOOGLE_PAY_HANDLE_NAME:
            formFields.nonce = server.forms.getForm('braintreegooglepayaccount').nonce;
            break;
        case braintreeConstants.ENDPOINT_ACCOUNT_ADD_CREDIT_CARD_HANDLE_NAME:
            formFields.cardOwner = server.forms.getForm('creditCard').cardOwner;
            break;
        case braintreeConstants.ENDPOINT_ACCOUNT_ADD_VENMO_HANDLE_NAME:
            formFields.nonce = server.forms.getForm('braintreevenmoaccount').nonce;
            break;
        default:
            break;
    }

    return formFields;
}

/**
 * Renders error
 * @param {Object} res Response object of end's point
 * @param {string} FieldName Name of Field
 */
function renderError(res, FieldName) {
    res.json({
        success: false,
        error: Resource.msgf('braintree.account.formfield.notvalid', 'locale', null, FieldName)
    });
}

/**
 * Validates braintreepaypalaccount form's fields
 * @param {Object} req Request object of AccountAddPaypalHandle end point's
 * @param {Object} res Response object of AccountAddPaypalHandle end point's
 * @param {Function} next Next call in the middleware chain
 * @returns {void}
 */
middleware.validateBraintreePaypalAccountForm = function (req, res, next) {
    var braintreePaypalAccountForm = server.forms.getForm('braintreepaypalaccount');

    if (!braintreePaypalAccountForm.valid) {
        return next(new Error(Resource.msg('braintree.paypal.account.form.notvalid', 'locale', null)));
    }

    return next();
};

/**
 * Checks is payment method already exist on current customer level
 * @param {Object} req Request object of AccountAddPaypalHandle end point's
 * @param {Object} res Response object of AccountAddPaypalHandle end point's
 * @param {Function} next Next call in the middleware chain
 * @returns {void}
 */
middleware.validatePaypalCustomerEmail = function (req, res, next) {
    var email = req.form.dwfrm_braintreepaypalaccount_email;

    if (!getPaypalCustomerPaymentInstrumentByEmail(email)) return next();

    res.json({
        success: false,
        error: Resource.msgf('braintree.paypal.addaccount.error.existAccount', 'locale', null, email)
    });
    res.setStatusCode(500);

    this.emit('route:Complete', req, res);
    return;
};

/**
 * Validates braintree payment method nonce
 * @param {Object} req Request object of AccountAddCreditCardHandle end point's
 * @param {Object} res Response object of AccountAddCreditCardHandle end point's
 * @param {Function} next Next call in the middleware chain
 * @returns {void}
 */
middleware.validateBraintreePaymentMethodNonce = function (req, res, next) {
    var isPaymentMethodNonceValid = req.httpParameterMap.braintreePaymentMethodNonce.submitted;

    if (isPaymentMethodNonceValid) return next();

    renderError(res, braintreeConstants.PARAM_NONCE);

    this.emit('route:Complete', req, res);
    return;
};

/**
 * Validates form's field
 * @param {Object} req Request object of end point's
 * @param {Object} res Response object of end point's
 * @param {Function} next Next call in the middleware chain
 * @returns {void}
 */
middleware.validateFormField = function (req, res, next) {
    var formFields = getFormFileds(this.name);

    for (var filed in formFields) {
        if (!formFields[filed].valid) {
            renderError(res, filed);

            this.emit('route:Complete', req, res);
            return;
        }
    }

    return next();
};

module.exports = middleware;
