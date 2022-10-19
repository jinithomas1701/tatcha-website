'use strict';

/**
 * Venmo form processor:
 * Adding paymentMethod & email to viewData
 *
 * @param {Object} req the request object
 * @param {Object} paymentForm - the payment form
 * @param {Object} viewFormData - object contains billing form data
 * @returns {Object} an object that has payment information
 */
function processForm(req, paymentForm, viewFormData) {
    var viewData = viewFormData;
    var usingMultiShipping = false; // Current integration support only single shpping
    req.session.privacyCache.set('usingMultiShipping', usingMultiShipping);

    viewData.paymentMethod = {
        value: paymentForm.paymentMethod.value,
        htmlName: paymentForm.paymentMethod.htmlName
    };
    viewData.email = {
        value: paymentForm.contactInfoFields.email.value
    };

    return {
        error: false,
        viewData: viewData
    };
}

exports.processForm = processForm;
