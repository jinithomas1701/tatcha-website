'use strict';
var helper = require('../helper');

var $accountsList = document.querySelector('#braintreeVenmoAccountsList');
var $saveVenmoAccountCountainerEl = document.querySelector('#braintreeSaveVenmoAccountContainer');
var $saveVenmoAccountEl = document.querySelector('#braintreeSaveVenmoAccount');

var $venmoButton = document.querySelector('.js_braintree_venmo_button');
var $braintreeVenmoAccount = document.getElementById('braintreeVenmoAccount');
var $venmoAccount = document.querySelector('.js_braintree_used_venmo_account');
var $braintreeVenmoUserId = document.querySelector('#braintreeVenmoUserId');

var $venmoContent = document.querySelector('.js_braintree_venmoContent');

var $addVenmoAccountBtn = document.querySelector('.add-venmo-account');
var $venmoAccountWrapper = document.querySelector('.js_braintree_accountVenmoButton_wrapper');

function showVenmoAccount() {
    if (!$accountsList) {
        $venmoAccount.classList.remove('used-venmo-account-hide');
        $braintreeVenmoAccount.options[0].text = $braintreeVenmoUserId.value;
    }

    $venmoButton.style.display = 'none';
    helper.continueButtonToggle(false);
}

function hideShowButtons() {
    if ($accountsList.value === 'newaccount') {
        $venmoButton.style.display = 'block';
        helper.continueButtonToggle(true);
        $venmoContent.setAttribute('data-paypal-is-hide-continue-button', true);
    } else {
        $venmoButton.style.display = 'none';
        helper.continueButtonToggle(false);
        $venmoContent.setAttribute('data-paypal-is-hide-continue-button', false);
        if ($saveVenmoAccountCountainerEl) {
            $saveVenmoAccountEl.checked = false;
            $saveVenmoAccountCountainerEl.style.display = 'none';
        }
    }
}

function createLoaderContainter($target) {
    var $loaderContainter = document.createElement('div');
    $loaderContainter.className = 'venmo-braintree-loader';
    helper.continueButtonToggle(true);

    return $target.parentNode.insertBefore($loaderContainter, $target);
}

function hideVenmoButton() {
    $venmoButton.parentElement.firstElementChild.style.display = 'none';
    document.querySelector('.payment-options[role=tablist] .nav-item[data-method-id="Venmo"]').style.display = 'none'; // Remove the venmo select payment method radiobutton
}

/**
 * updates the billing address form values within saved billing
 * @param {Object} billingAddress - the billing Address
 */
function updateBillingAddressFormValues(billingAddress) {
    var form = $('form[name=dwfrm_billing]');
    var inputNames = ['firstName', 'lastName', 'address1', 'address2', 'city', 'postalCode', 'country'];
    if (!form) return;

    $.each(inputNames, function (index, value) {
        $(`input[name$=_${value}]`, form).val(decodeURIComponent(billingAddress[value]));
    });
    $('select[name$=_stateCode],input[name$=_stateCode]', form)
        .val(billingAddress.stateCode);
}

function showVenmoAccountBtn() {
    $addVenmoAccountBtn.style.display = 'none';
    $venmoAccountWrapper.style.display = 'block';
}
function hideVenmoAccountBtn() {
    $addVenmoAccountBtn.style.display = 'block';
    $venmoAccountWrapper.style.display = 'none';
}
function showVenmoAccountError() {
    $addVenmoAccountBtn.style.display = 'none';
    $venmoAccountWrapper.style.display = 'block';
    [].slice.call($venmoAccountWrapper.children).forEach(function (item) {
        if (!item.classList.contains('error')) {
            item.style.display = 'none';
        }
    });
}

/*
    Remove method was used and change appearance of venmo tab
**/
function removeSessionNonce() {
    var defaultOption = helper.getOptionByDataDefault('#braintreeVenmoAccountsList');
    document.querySelector('#braintreeVenmoNonce').value = '';
    document.querySelector('#braintreeVenmoBilling').value = '';
    if (defaultOption) {
        defaultOption.selected = true;
        hideShowButtons();
    } else {
        $venmoAccount.classList.remove('used-venmo-account');
        $venmoAccount.classList.add('used-venmo-account-hide');
        $venmoButton.style.display = 'block';
    }
}

module.exports = {
    showVenmoAccount,
    hideShowButtons,
    createLoaderContainter,
    hideVenmoButton,
    updateBillingAddressFormValues,
    showVenmoAccountBtn,
    hideVenmoAccountBtn,
    showVenmoAccountError,
    removeSessionNonce
};
