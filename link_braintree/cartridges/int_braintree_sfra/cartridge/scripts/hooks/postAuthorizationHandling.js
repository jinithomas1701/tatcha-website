'use strict';

/**
 * This function is to handle the post payment authorization customizations
 * @param {Object} result - Authorization Result
 * @param {Order} order - order
 * @param {Object} options - Handle custom processing post authorization req, res
 * @returns {Object} response Braintree Error response or {}
 */
function postAuthorization(result, order, options) { // eslint-disable-line no-unused-vars
    if (result.error && session.privacy.braintreeErrorMsg) {
        var response = {
            error: true,
            errorStage: {
                stage: 'payment',
                step: 'paymentInstrument'
            },
            errorMessage: session.privacy.braintreeErrorMsg
        };

        session.privacy.braintreeErrorMsg = null;

        return response;
    }

    return {};
}

exports.postAuthorization = postAuthorization;
