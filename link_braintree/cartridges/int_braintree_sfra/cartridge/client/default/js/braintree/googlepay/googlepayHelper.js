'use strict';
var helper = require('../helper');

var $googlepayContent = document.querySelector('.js_braintree_googlepayContent');
var $btGooglepayAccountsList = document.querySelector('#braintreeGooglepayAccountsList');
var $googlepayButton = document.querySelector('.js_braintree_googlepay_button');
var $saveGooglePayAccountCheckbox = document.querySelector('#braintreeSaveGooglepayAccount');
var $googlepayTab = document.querySelector('.googlepay-tab');

function showGooglepayAccount() {
    var $sessionAccount = document.querySelector('#sessionGPAccount');
    $sessionAccount.classList.remove('used-googlepay-account-hide');
    $sessionAccount.classList.add('used-googlepay-account');

    var $gpAccount = document.querySelector('.form-group.braintree_used_googlepay_account');
    $gpAccount.classList.remove('used-googlepay-account-hide');
    $gpAccount.classList.add('used-googlepay-account');

    $googlepayButton.style.display = 'none';
    $googlepayContent.setAttribute('data-paypal-is-hide-continue-button', false);
    helper.continueButtonToggle(false);
}

function hideShowButtons() {
    if ($btGooglepayAccountsList.value === 'newaccount') {
        $googlepayButton.style.display = 'block';
        if ($googlepayTab.classList.contains('active')) {
            helper.continueButtonToggle(true);
        }
        $googlepayContent.setAttribute('data-paypal-is-hide-continue-button', true);
        if ($saveGooglePayAccountCheckbox) {
            $saveGooglePayAccountCheckbox.checked = true;
        }
    } else {
        $googlepayButton.style.display = 'none';
        helper.continueButtonToggle(false);
        $googlepayContent.setAttribute('data-paypal-is-hide-continue-button', false);
        if ($saveGooglePayAccountCheckbox) {
            $saveGooglePayAccountCheckbox.checked = JSON.parse(document.querySelector('#sessionGPAccount').getAttribute('data-save'));
        }
    }
}

function createGooglepayBillingAddressData(data) {
    var billingData = data.paymentMethodData.info.billingAddress;
    var billingAddress = {};
    var recipientName = billingData.name.split(' ');

    billingAddress.firstName = recipientName[0];
    billingAddress.lastName = recipientName[1];
    billingAddress.phone = billingData.phoneNumber;
    billingAddress.countryCodeAlpha2 = billingData.countryCode;
    billingAddress.streetAddress = billingData.address1;
    billingAddress.extendedAddress = billingData.address2;
    billingAddress.locality = billingData.locality;
    billingAddress.stateCode = billingData.administrativeArea;
    billingAddress.postalCode = billingData.postalCode;
    billingAddress.email = data.email;

    return billingAddress;
}

function createGooglepayShippingAddressData(shippingData) {
    var shippingAddress = {};
    var recipientName = shippingData.name.split(' ');

    shippingAddress.firstName = recipientName[0];
    shippingAddress.lastName = recipientName[1];
    shippingAddress.phone = shippingData.phoneNumber;
    shippingAddress.countryCodeAlpha2 = shippingData.countryCode;
    shippingAddress.streetAddress = shippingData.address1;
    shippingAddress.extendedAddress = shippingData.address2;
    shippingAddress.locality = shippingData.locality;
    shippingAddress.region = shippingData.administrativeArea;
    shippingAddress.postalCode = shippingData.postalCode;

    return shippingAddress;
}

/*
    Remove method was used and change appearance of googlepay tab
**/
function removeSessionNonce() {
    var $gpAccount = document.querySelector('.form-group.braintree_used_googlepay_account');
    $gpAccount.classList.remove('used-googlepay-account');
    $gpAccount.classList.add('used-googlepay-account-hide');

    var $sessionAccount = document.querySelector('#sessionGPAccount');
    $sessionAccount.classList.add('used-googlepay-account-hide');
    $sessionAccount.classList.remove('used-googlepay-account');
    $sessionAccount.value = '';
    $sessionAccount.text = '';
    $sessionAccount.setAttribute('data-session-account', false);
    $sessionAccount.setAttribute('data-save', false);

    document.querySelector('#braintreeGooglePayNonce').value = '';
    document.querySelector('#braintreeGooglePayBillingAddress').value = '';
    document.querySelector('#braintreeGooglepayPaymentType').value = '';
    document.querySelector('#braintreeGooglePayDeviceData').value = '';

    document.querySelector('#newGPAccount').selected = true;
    hideShowButtons();
}

module.exports = {
    showGooglepayAccount,
    createGooglepayBillingAddressData,
    createGooglepayShippingAddressData,
    removeSessionNonce,
    hideShowButtons
};
