'use strict';

var braintreeUtils = require('../braintreeUtils');
var creditCard = require('../braintreeCreditCard');
var helper = require('../helper');
var creditcardHelper = require('../creditcard/creditcardHelper');

var $continueButton = document.querySelector('button.submit-payment');
var $creditCardList = document.querySelector('#braintreeCreditCardList');

function doNotAllowSubmitForm() {
    helper.continueButtonToggle(false);
    $continueButton.setAttribute('data-is-allow-submit-form', false);
}

function hide3DSecureContainer() {
    document.querySelector('#braintreeCreditCardFieldsContainer').style.display = '';
    document.querySelector('#braintreeSaveCardContainer').style.display = '';
    document.querySelector('#braintree3DSecureContainer').style.display = 'none';
    doNotAllowSubmitForm();
}

function updateAccountsList() {
    var sessionAccount = document.querySelector('#braintreeSessionCreditAccount');
    var defaultOption = helper.getOptionByDataDefault('#braintreeCreditCardList');
    if ($creditCardList && $creditCardList.value !== 'newcard') {
        if (!sessionAccount.selected) {
            creditcardHelper.updateSessionAccount();
        }
        return;
    }

    var creditCardAccount = document.querySelector('.form-group.braintree_used_creditcard_account');
    var newCCAccount = document.getElementById('newCardAccount');
    if (!creditCardAccount.classList.contains('used-creditcard-account')) {
        creditCardAccount.classList.remove('used-creditcard-account-hide');
        creditCardAccount.classList.add('used-creditcard-account');
        sessionAccount.classList.remove('used-creditcard-account-hide');
        sessionAccount.classList.add('used-creditcard-account');
    } else {
        sessionAccount.classList.remove('used-creditcard-account-hide');
        sessionAccount.classList.add('used-creditcard-account');
    }

    if (newCCAccount.selected) {
        var isSavedCard = document.querySelector('#braintreeSaveCreditCard') ? document.querySelector('#braintreeSaveCreditCard').checked : false;
        sessionAccount.setAttribute('data-session-account', true);
        sessionAccount.setAttribute('data-save-card', isSavedCard);
        sessionAccount.textContent = sessionAccount.getAttribute('data-type') + ' ' +
            sessionAccount.getAttribute('data-number') + ' ' +
            sessionAccount.getAttribute('data-expiration') + ' ' +
            document.querySelector('#braintreeCardOwner').getAttribute('data-new-cart-value');
        sessionAccount.setAttribute('data-nonce', document.querySelector('#braintreeCreditCardNonce').value);

        newCCAccount.removeAttribute('selected');
        sessionAccount.selected = true;
    }

    if (!defaultOption) {
        var selectedCard = braintreeUtils.getSelectedData($creditCardList);
        var cardFieldsPH = {
            cardOwnerPh: document.querySelector('#braintreeCardOwnerPh'),
            cardNumbeberPh: document.querySelector('#braintreeCardNumberPh'),
            cardCvvPh: document.querySelector('#braintreeCvvPh'),
            cardExpirationPh: document.querySelector('#braintreeExpirationPh')
        };
        creditcardHelper.setCardFields(selectedCard, cardFieldsPH);
    }

    creditCard.clearHostedFields();
    creditcardHelper.showCardElements(creditcardHelper.getCardFieldsPH());
    creditcardHelper.hideCardElements(creditcardHelper.getCardFields());
    helper.continueButtonToggle(false);
}

function allowSubmitForm(event) {
    $continueButton.setAttribute('data-is-allow-submit-form', true);
    updateAccountsList();
    event.target.click();
}

function isActiveCreditCardTab() {
    return document
        .querySelector('.payment-options[role=tablist] a[data-toggle="tab"][href="#creditcard-content"]')
        .classList
        .contains('active');
}

function makeCreditCardPayment(event) {
    if (JSON.parse($continueButton.getAttribute('data-is-allow-submit-form')) && creditCard.isFormValid()) {
        return;
    }

    if ($creditCardList) {
        var is3dSecureEnabled = JSON.parse(document.querySelector('.js_braintree_creditCardFields').getAttribute('data-braintree-config')).is3dSecureEnabled;
        if ($creditCardList && $creditCardList.value !== 'newcard') {
            if (!is3dSecureEnabled) {
                allowSubmitForm(event);
                return;
            }

            if ($creditCardList.value === 'sessioncard') {
                allowSubmitForm(event);
                return;
            }

            var selectedCard = braintreeUtils.getSelectedData($creditCardList);
            var getNonceUrl = $creditCardList.getAttribute('data-get-payment-nonce-url');
            var cardUUID = selectedCard['data-id'].value;
            $.get(`${getNonceUrl}?id=${cardUUID}`, function (response) {
                creditCard.startTokenize(function (result) {
                    if (!result.error) {
                        allowSubmitForm(event);
                    }
                }, response);
            });
            event.preventDefault();
            event.stopPropagation();
            return;
        }
    }
    creditCard.startTokenize(function (result) {
        if (!result.error) allowSubmitForm(event);
    });
    event.preventDefault();
    event.stopPropagation();
}

module.exports = {
    doNotAllowSubmitForm,
    hide3DSecureContainer,
    makeCreditCardPayment
};
