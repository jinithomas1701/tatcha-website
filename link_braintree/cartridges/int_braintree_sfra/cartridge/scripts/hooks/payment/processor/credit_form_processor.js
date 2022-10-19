'use strict';

var braintreeConstants = require('~/cartridge/scripts/util/braintreeConstants');

/**
 * Gets email
 *
 * @param {Object} paymentForm - the payment form
 * @returns {string}  Current email
 */
function getEmail(paymentForm) {
    var selectedCreditCardUuid = request.httpParameterMap.braintreeCreditCardList.value;
    var isUsedSavedCardMethod = selectedCreditCardUuid && selectedCreditCardUuid !== braintreeConstants.SESSION_CARD;
    var email = paymentForm.contactInfoFields.email ? paymentForm.contactInfoFields.email.value: null;

    if (isUsedSavedCardMethod && customer.authenticated) {
        email = customer.getProfile().getEmail();
    }

    return email;
}

/**
 * Credit Card form processor:
 * Adding paymentMethod & email to viewData
 *
 * @param {Object} req the request object
 * @param {Object} paymentForm - the payment form
 * @param {Object} viewFormData - object contains billing form data
 * @returns {Object} an object that has payment information
 */
function processForm(req, paymentForm, viewFormData) {
    var usingMultiShipping = false; // Current integration support only single shpping
    req.session.privacyCache.set('usingMultiShipping', usingMultiShipping);

    var viewData = viewFormData;
    viewData.paymentMethod = {
        value: paymentForm.paymentMethod.value,
        htmlName: paymentForm.paymentMethod.value
    };
    viewData.email = {
        value: getEmail(paymentForm)
    };

    return {
        error: false,
        viewData: viewData
    };
}

exports.processForm = processForm;
