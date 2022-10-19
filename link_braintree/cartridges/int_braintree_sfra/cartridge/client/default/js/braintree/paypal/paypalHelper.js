'use strict';
var helper = require('../helper');

var $addPaypalAccountBtn = document.querySelector('.add-paypal-account');
var $paypalAccountWrapper = document.querySelector('.js_braintree_accountPaypalButton_wrapper');
var $savePaypalAccountCountainer = document.querySelector('#braintreeSavePaypalAccountContainer');
var $savePaypalAccountCheckbox = document.querySelector('#braintreeSavePaypalAccount');
var $braintreePayPalNonce = document.querySelector('#braintreePayPalNonce');
var $continueButton = document.querySelector('.submit-payment');

var formValidationConrol = function (validateActions) {
    var isFormValid = true;
    if (isFormValid) {
        validateActions.enable();
    } else {
        validateActions.disable();
    }
};

function getOptionByEmail() {
    var sessionEmail = document.getElementById('braintreePaypalAccount').value || null;
    return Array.apply(null, document.querySelector('#braintreePaypalAccountsList').options).find(function (el) {
        return el.getAttribute('data-id') && sessionEmail && sessionEmail === el.text;
    });
}

function setSessionAccountOptionDefault() {
    var savedDefaultOption = helper.getOptionByDataDefault('#braintreePaypalAccountsList');
    if (!savedDefaultOption) return;

    savedDefaultOption.selected = '';
    helper.getSessionAccountOption({
        querySelector: '#braintreePaypalAccountsList',
        id: 'braintreePaypalAccount'
    }).selected = 'selected';
}

/*
    Check if paypal method was used and change appearance of paypal tab
**/
function removeSessionNonce() {
    var sessionOption = helper.getSessionAccountOption({
        querySelector: '#braintreePaypalAccountsList',
        id: 'braintreePaypalAccount'
    });
    if (sessionOption) {
        var $paypalContent = document.querySelector('.js_braintree_paypalContent');
        document.querySelector('#braintreePayPalNonce').value = '';
        document.querySelector('#braintreePaypalAccount').selected = false;
        sessionOption.classList.add('used-paypal-account-hide');
        sessionOption.classList.remove('used-paypal-account');
        sessionOption.value = '';
        sessionOption.text = '';
        sessionOption.setAttribute('data-session-account', false);
        sessionOption.setAttribute('data-save', false);

        var defaultOption = helper.getOptionByDataDefault('#braintreePaypalAccountsList');
        if (defaultOption) {
            defaultOption.selected = true;
            document.querySelector('#braintreeSavePaypalAccountContainer').style.display = 'none';
            document.querySelector('.js_braintree_paypal_billing_button').style.display = 'none';
            $paypalContent.setAttribute('data-paypal-is-hide-continue-button', false);
        } else {
            $paypalContent.setAttribute('data-paypal-is-hide-continue-button', true);
            document.querySelector('.js_braintree_paypal_billing_button').style.display = 'block';
            var paypalAccount = document.querySelector('.form-group.braintree_used_paypal_account');
            paypalAccount.classList.remove('used-paypal-account');
            paypalAccount.classList.add('used-paypal-account-hide');
        }

        [].forEach.call(document.querySelector('#braintreePaypalAccountsList'), function (el) {
            if (el.style.display === 'none') el.style.display = 'block';
        });
    }
}

function initAccountListAndSaveFunctionality() {
    var $accountsList = document.querySelector('#braintreePaypalAccountsList');
    var $alertInfo = document.getElementById('paypal-content').querySelectorAll('.alert-info')[0];

    function accountsListChange() { // eslint-disable-line require-jsdoc
        var isSameSessionAccount = getOptionByEmail();
        $continueButton.removeEventListener('click', removeSessionNonce);

        if ($accountsList.value === 'newaccount') {
            $alertInfo.style.display = 'block';
            if ($savePaypalAccountCountainer) {
                $savePaypalAccountCountainer.style.display = 'block';
                $savePaypalAccountCheckbox.checked = true;
            }
        } else if ($accountsList.selectedOptions[0].id === 'braintreePaypalAccount') {
            // Case when Session Email already saved under account
            $braintreePayPalNonce.value = $accountsList.selectedOptions[0].getAttribute('data-nonce');
            if (isSameSessionAccount) {
                $savePaypalAccountCountainer.style.display = 'none';
                $savePaypalAccountCheckbox.checked = false;
            } else if ($savePaypalAccountCountainer) {
                $savePaypalAccountCountainer.style.display = 'block';
                $savePaypalAccountCheckbox.checked = JSON.parse(document.querySelector('#braintreePaypalAccount').getAttribute('data-save'));
            }
        } else {
            $continueButton.addEventListener('click', removeSessionNonce);
            $braintreePayPalNonce.value = '';
            $alertInfo.style.display = 'none';
            if ($savePaypalAccountCountainer) {
                $savePaypalAccountCheckbox.checked = false;
                $savePaypalAccountCountainer.style.display = 'none';
            }
        }
    }

    if ($accountsList) {
        $accountsList.addEventListener('change', accountsListChange);
        accountsListChange();
    }
}

function createShippingAddressData(inpShippingAddress, details) {
    var shippingAddress = inpShippingAddress;
    if (!shippingAddress.recipientName) {
        shippingAddress.firstName = details.firstName;
        shippingAddress.lastName = details.lastName;
        shippingAddress.recipientName = details.firstName + ' ' + details.lastName;
    }
    shippingAddress.email = details.email;
    shippingAddress.phone = details.phone;
    shippingAddress.countryCodeAlpha2 = shippingAddress.countryCode;
    shippingAddress.streetAddress = shippingAddress.line1;
    shippingAddress.extendedAddress = shippingAddress.line2;
    shippingAddress.locality = shippingAddress.city;
    shippingAddress.region = shippingAddress.state;
    shippingAddress.postalCode = shippingAddress.postalCode;
    return JSON.stringify(shippingAddress);
}

function createBillingAddressData(inpBillingAddress, details) {
    var billingAddress = inpBillingAddress;
    billingAddress.firstName = details.firstName;
    billingAddress.lastName = details.lastName;
    billingAddress.email = details.email;
    billingAddress.phone = details.phone;
    billingAddress.countryCodeAlpha2 = billingAddress.countryCode;
    billingAddress.streetAddress = billingAddress.line1;
    billingAddress.extendedAddress = billingAddress.line2;
    billingAddress.locality = billingAddress.city;
    billingAddress.region = billingAddress.state;
    return billingAddress;
}

function appendToUrl(url, param) {
    var newUrl = url;
    newUrl += (newUrl.indexOf('?') !== -1 ? '&' : '?') + Object.keys(param).map(function (key) {
        return key + '=' + encodeURIComponent(param[key]);
    }).join('&');

    return newUrl;
}

function showPayPalAccount(braintreePaypalEmail, braintreePaypalNonce) {
    var braintreePaypalAccount = document.getElementById('braintreePaypalAccount');
    var paypalAccount = document.querySelector('.form-group.braintree_used_paypal_account');
    var $paypalContent = document.querySelector('.js_braintree_paypalContent');
    var $braintreePaypalAccountsList = document.getElementById('braintreePaypalAccountsList');
    var customerAuthenticated = JSON.parse($braintreePaypalAccountsList.dataset.customerAuthenticated);

    if (customerAuthenticated || (braintreePaypalEmail && braintreePaypalAccount.text !== 'PayPal')) {
        if (braintreePaypalNonce && $braintreePaypalAccountsList) {
            return true;
        }

        document.querySelectorAll('.js_braintree_paypalContent .custom-checkbox').forEach((el) => { el.style.display = 'none'; });
    }

    braintreePaypalAccount.text = braintreePaypalEmail;
    if (!paypalAccount.classList.contains('used-paypal-account')) {
        paypalAccount.classList.remove('used-paypal-account-hide');
        paypalAccount.classList.add('used-paypal-account');
    }

    document.querySelector('.js_braintree_paypal_billing_button').style.display = 'none';
    $paypalContent.setAttribute('data-paypal-is-hide-continue-button', false);
}

function showCheckoutErrorMsg(message) {
    document.querySelector('.error-message-text').textContent = '';
    document.querySelector('.error-message').style.display = 'block';
    document.querySelector('.error-message-text').append(message);
    window.scrollTo(0, 0);
}

function showPDPButton($braintreePDPButton) {
    $braintreePDPButton.style.display = '';
}

function hidePDPButton($braintreePDPButton) {
    $braintreePDPButton.style.display = 'none';
}

function showPaypalAccountBtn() {
    $addPaypalAccountBtn.style.display = 'none';
    $paypalAccountWrapper.style.display = 'block';
}
function hidePaypalAccountBtn() {
    $addPaypalAccountBtn.style.display = 'block';
    $paypalAccountWrapper.style.display = 'none';
}

module.exports = {
    formValidationConrol,
    initAccountListAndSaveFunctionality,
    createShippingAddressData,
    createBillingAddressData,
    appendToUrl,
    showPayPalAccount,
    showCheckoutErrorMsg,
    showPDPButton,
    hidePDPButton,
    getOptionByEmail,
    removeSessionNonce,
    setSessionAccountOptionDefault,
    showPaypalAccountBtn,
    hidePaypalAccountBtn
};
