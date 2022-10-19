'use strict';
var braintreeUtils = require('../braintreeUtils');
var bu = braintreeUtils;
var helper = require('../helper');
var braintreeCustomHelper = require('../braintreeCustomHelper');

var $creditCardList = document.querySelector('#braintreeCreditCardList');
var $saveCreditCard = document.querySelector('#braintreeSaveCreditCard');
var $cardOwner = document.querySelector('#braintreeCardOwner');
var formId;

function creditcardErrorContainer(errorIns, errorData) {
    var error = errorData;

    if ($('.checkout-add-card-modal').hasClass('opened')) {
        formId = 'addCreditCardForm';
    } else {
        formId = 'dwfrm_billing';
    }

    if (error.details && error.details.invalidFieldKeys) {
        for (var i = 0; i < error.details.invalidFieldKeys.length; i++) {
            var key = error.details.invalidFieldKeys[i];
            if (key === 'number') {
                document.querySelector('#'+formId+' ' +'#braintreeCardNumber').classList.add('braintree-hosted-fields-invalid');
            }
            if (key === 'cvv') {
                document.querySelector('#'+formId+' ' +'#braintreeCvv').classList.add('braintree-hosted-fields-invalid');
            }
            if (key === 'expirationDate') {
                document.querySelector('#'+formId+' ' +'#braintreeExpirationDate').classList.add('braintree-hosted-fields-invalid');
            }
        }
    }
    if (error.code === 'HOSTED_FIELDS_FIELDS_EMPTY') {
        document.querySelector('#braintreeCardNumber, #braintreeCvv, #braintreeExpirationDate').classList.add('braintree-hosted-fields-invalid');
    }
}

function convertCardTypeToDwFormat(braintreeType) {
    switch (braintreeType) {
        case 'American Express':
            return 'Amex';
        case 'MasterCard':
            return 'Master';
        default:
            return braintreeType;
    }
}

function cardOwnerUpdateClasses() {
    var value = $cardOwner.value;
    if (value.length <= parseInt($cardOwner.getAttribute('maxlength'), 10) && value.length !== 0) {
        $cardOwner.parentNode.classList.add('braintree-hosted-fields-valid');
    } else {
        $cardOwner.parentNode.classList.remove('braintree-hosted-fields-valid');
        $cardOwner.parentNode.classList.remove('braintree-hosted-fields-invalid');
    }
}

function setCardFields(selectedCard, cacheCardFields) {
    cacheCardFields.cardNumbeberPh.innerHTML = selectedCard['data-number'].value;
    cacheCardFields.cardCvvPh.innerHTML = '***';
    cacheCardFields.cardExpirationPh.innerHTML = selectedCard['data-expiration'].value;
    cacheCardFields.cardOwnerPh.innerHTML = selectedCard['data-owner'].value;
    $cardOwner.value = selectedCard['data-owner'].value;
    document.querySelector('#braintreeCardType').value = selectedCard['data-type'].value;
    document.querySelector('#braintreeCardMaskNumber').value = selectedCard['data-number'].value;
}

function showCardElements(cardFields) {
    cardFields.forEach(function (el) {
        el.style.display = '';
    });
}

function hideCardElements(cardFields) {
    cardFields.forEach(function (el) {
        el.style.display = 'none';
    });
}

function getCardFieldsPH() {
    if ($('.checkout-add-card-modal').hasClass('opened')) {
        formId = 'addCreditCardForm';
    } else {
        formId = 'dwfrm_billing';
    }
    return [
        document.querySelector('#'+formId+' ' +'#braintreeCardOwnerPh'),
        document.querySelector('#'+formId+' ' +'#braintreeCardNumberPh'),
        document.querySelector('#'+formId+' ' +'#braintreeExpirationPh'),
        document.querySelector('#'+formId+' ' +'#braintreeCvvPh')
    ];
}

function getCardFields() {
    if ($('.checkout-add-card-modal').hasClass('opened')) {
        formId = 'addCreditCardForm';
    } else {
        formId = 'dwfrm_billing';
    }
    return [
        document.querySelector('#'+formId+' ' +'#braintreeCardOwner'),
        document.querySelector('#'+formId+' ' +'#braintreeExpirationDate'),
        document.querySelector('#'+formId+' ' +'#braintreeCardNumber'),
        document.querySelector('#'+formId+' ' +'#braintreeCvv')
    ];
}

function cardListChange() {
    if ($('.checkout-add-card-modal').hasClass('opened')) {
        formId = 'addCreditCardForm';
    } else {
        formId = 'dwfrm_billing';
    }

    var $cardOwnerPh = document.querySelector('#'+formId+' ' +'#braintreeCardOwnerPh');
    var $cardNumbeber = document.querySelector('#'+formId+' ' +'#braintreeCardNumber');
    var $cardNumbeberPh = document.querySelector('#'+formId+' ' +'#braintreeCardNumberPh');
    var $cardCvv = document.querySelector('#'+formId+' ' +'#braintreeCvv');
    var $cardCvvPh = document.querySelector('#'+formId+' ' +'#braintreeCvvPh');
    var $cardExpiration = document.querySelector('#'+formId+' ' +'#braintreeExpirationDate');
    var $cardExpirationPh = document.querySelector('#'+formId+' ' +'#braintreeExpirationPh');
    var $braintreeSaveCardContainer = document.querySelector('#'+formId+' ' +'#braintreeSaveCardContainer');
    var $creditCardFieldsContainer = document.querySelector('#'+formId+' ' +'#braintreeCreditCardFieldsContainer');
    var $braintree3DSecureContainer = document.querySelector('#'+formId+' ' +'#braintree3DSecureContainer');
    var changeCardOwnerInput;
    var selectedCard;
    var isSaveCard;
    var cacheCardFields = {
        cardNumbeberPh: $cardNumbeberPh,
        cardCvvPh: $cardCvvPh,
        cardExpirationPh: $cardExpirationPh,
        cardOwnerPh: $cardOwnerPh
    };
    var nonce;
    if ($cardOwner) {
        if (typeof (Event) === 'function') {
            changeCardOwnerInput = new Event('changeCardOwnerInput');
            $cardOwner.addEventListener('changeCardOwnerInput', function () {
                'change';
            }, false);
        } else {
            changeCardOwnerInput = document.createEvent('Event');
            changeCardOwnerInput.initEvent('changeCardOwnerInput', true, true);
        }
    }

    if ($creditCardFieldsContainer) {
        $creditCardFieldsContainer.style.display = '';
    }
    if ($braintree3DSecureContainer) {
        $braintree3DSecureContainer.style.display = 'none';
    }

    document.querySelector('#braintreeCreditCardErrorContainer').textContent = '';

    if ($creditCardList.value === 'newcard') {
        hideCardElements(getCardFieldsPH());
        $cardOwner.value = $cardOwner.getAttribute('data-new-cart-value');
        $cardOwner.dispatchEvent(changeCardOwnerInput);
        $cardOwner.parentNode.classList.remove('braintree-hosted-fields-invalid');
        $cardNumbeber.parentNode.classList.remove('braintree-hosted-fields-invalid');
        $cardCvv.parentNode.classList.remove('braintree-hosted-fields-invalid');
        $cardExpiration.parentNode.classList.remove('braintree-hosted-fields-invalid');
        $cardOwner.disabled = false;
        showCardElements(getCardFields());
        cardOwnerUpdateClasses();
        if ($braintreeSaveCardContainer) {
            $braintreeSaveCardContainer.style.display = 'block';
            $saveCreditCard.checked = true;
        }

        document.querySelector('#braintreeCreditCardNonce').value = '';
        document.querySelector('#braintreeCardPaymentMethod').value = $creditCardList[0].getAttribute('data-payment-method');
    } else if ($creditCardList.selectedOptions[0].id === 'braintreeSessionCreditAccount') {
        selectedCard = bu.getSelectedData($creditCardList);
        nonce = selectedCard['data-nonce'].value;
        if ($braintreeSaveCardContainer) {
            $braintreeSaveCardContainer.style.display = 'block';
            isSaveCard = JSON.parse(selectedCard['data-save-card'].value);
            $braintreeSaveCardContainer.checked = isSaveCard;
            $saveCreditCard.checked = isSaveCard;
        }

        if (nonce) {
            document.querySelector('#braintreeCreditCardNonce').value = nonce;
        }

        setCardFields(selectedCard, cacheCardFields);
        $cardOwner.dispatchEvent(changeCardOwnerInput);
        $cardOwner.style.display = 'none';
        showCardElements(getCardFieldsPH());
        document.querySelector('#braintreeCardPaymentMethod').value = selectedCard['data-payment-method'].value.toUpperCase();
    } else {
        // case for saved card
        selectedCard = bu.getSelectedData($creditCardList);
        setCardFields(selectedCard, cacheCardFields);
        $cardOwner.dispatchEvent(changeCardOwnerInput);
        showCardElements(getCardFieldsPH());
        hideCardElements(getCardFields());
        $cardOwner.disabled = true;
        if ($braintreeSaveCardContainer) {
            $braintreeSaveCardContainer.style.display = 'none';
            $saveCreditCard.checked = false;
        }

        document.querySelector('#braintreeCreditCardNonce').value = '';
        document.querySelector('#braintreeCardPaymentMethod').value = selectedCard['data-payment-method'].value.toUpperCase();
    }
}

function initCardListAndSaveFunctionality() {
    if ($creditCardList) {
        $creditCardList.addEventListener('change', function () {
            cardListChange();
        });
    }
    cardListChange();
}

function cardOwnerEvents() {
    $cardOwner.addEventListener('focus', function () {
        $cardOwner.parentNode.classList.add('braintree-hosted-fields-focused');
    });
    $cardOwner.addEventListener('blur', function () {
        $cardOwner.parentNode.classList.remove('braintree-hosted-fields-focused');
    });
    $cardOwner.addEventListener('keyup', function () {
        document.querySelector('#braintreeCardOwner').setAttribute('data-new-cart-value', $cardOwner.value);
        cardOwnerUpdateClasses();
    });
    $cardOwner.addEventListener('change', function () {
        cardOwnerUpdateClasses();
    });
}

/*
    Update Session account
**/
function updateSessionAccount() {
    var sessionOption = helper.getSessionAccountOption({
        querySelector: '#braintreeCreditCardList',
        id: 'braintreeSessionCreditAccount'
    });
    if (!sessionOption) { return; }

    sessionOption.selected = false;
    sessionOption.classList.add('used-creditcard-account-hide');
    sessionOption.classList.remove('used-creditcard-account');
    sessionOption.text = '';
    sessionOption.setAttribute('data-session-account', false);
    sessionOption.setAttribute('data-owner', false);
    sessionOption.setAttribute('data-expiration', false);
    sessionOption.setAttribute('data-number', false);
    sessionOption.setAttribute('data-nonce', false);
    sessionOption.setAttribute('data-type', false);
    sessionOption.setAttribute('data-save-card', false);
}

/*
    Check if creditcard method was used and change appearance of creditcard tab
**/
function removeSessionNonce() {
    updateSessionAccount();
    document.querySelector('#braintreeCreditCardNonce').value = '';
    document.querySelector('#cardNumber').value = '';
    document.querySelector('#braintreeCardMaskNumber').value = '';
    document.querySelector('#braintreeCardExpirationYear').value = '';
    document.querySelector('#braintreeCardExpirationMonth').value = '';

    var defaultOption = helper.getOptionByDataDefault('#braintreeCreditCardList');
    if (defaultOption) {
        defaultOption.selected = true;
        var selectedCard = bu.getSelectedData($creditCardList);
        var cardFieldsPH = {
            cardNumbeberPh: document.querySelector('#braintreeCardNumberPh'),
            cardCvvPh: document.querySelector('#braintreeCvvPh'),
            cardExpirationPh: document.querySelector('#braintreeExpirationPh'),
            cardOwnerPh: document.querySelector('#braintreeCardOwnerPh')
        };
        setCardFields(selectedCard, cardFieldsPH);
        $cardOwner.disabled = true;
        $saveCreditCard.checked = false;
        document.querySelector('#braintreeSaveCardContainer').style.display = 'none';
    } else {
        hideCardElements(getCardFieldsPH());
        showCardElements(getCardFields());
        var ccAccount = document.querySelector('.form-group.braintree_used_creditcard_account');
        ccAccount.classList.remove('used-creditcard-account');
        ccAccount.classList.add('used-creditcard-account-hide');
    }

    [].forEach.call(document.querySelector('#braintreeCreditCardList'), function (el) {
        if (el.style.display === 'none') el.style.display = 'block';
    });
}

module.exports = {
    creditcardErrorContainer,
    convertCardTypeToDwFormat,
    cardOwnerEvents,
    initCardListAndSaveFunctionality,
    removeSessionNonce,
    showCardElements,
    hideCardElements,
    setCardFields,
    getCardFieldsPH,
    getCardFields,
    updateSessionAccount
};
