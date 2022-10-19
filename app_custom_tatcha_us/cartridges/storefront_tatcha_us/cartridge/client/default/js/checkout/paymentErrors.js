'use strict';

/**
 * Clear the payment form.
 */
function clearPaymentForm(val) {
    // Clear credit card payment form
    $('#braintreeCreditCardList').val(val ? val : 'newcard');
    var event = new Event('change');
    var element = document.getElementById("braintreeCreditCardList");
    if (element){
        element.dispatchEvent(event);
    }
}

module.exports = {
    clearPaymentForm: clearPaymentForm
};
