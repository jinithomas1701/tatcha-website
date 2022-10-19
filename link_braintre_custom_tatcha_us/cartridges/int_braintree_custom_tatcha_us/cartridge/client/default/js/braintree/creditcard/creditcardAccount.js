'use strict';
var creditCard = require('../braintreeCreditCard');
var creditCardFields = require('./creditcardFields');

function submitCreditCardForm() {
    $('.js_braintree_addCreditCardForm').submit(function (e) {
        var addCreditCardForm = $(this);
        creditCard.startTokenize(function (result) {
            if (result.error) {
                e.preventDefault();
                return;
            }
            $.ajax({
                url: addCreditCardForm.attr('action'),
                type: 'post',
                dataType: 'json',
                data: addCreditCardForm.serialize(),
                success: function (data) {
                    if (!data.success) {
                        document.querySelector('#braintreeCreditCardErrorContainer').textContent = data.error;
                    } else {
                        location.href = data.redirectUrl;
                    }
                },
                error: function (err) {
                    if (err.responseJSON.redirectUrl) {
                        window.location.href = err.responseJSON.redirectUrl;
                    }
                }
            });
        });
        return false;
    });
}

function initAccountAddCreditCard() {
    creditCardFields.initCreditCardFields();
    submitCreditCardForm();
}

module.exports = {
    initAccountAddCreditCard
};
