var $srcContent = document.querySelector('.js_braintree_srcContent');
var $srcSessionAccount = document.querySelector('#sessionSrcAccount');
var $srcAccountList = document.querySelector('#braintreeSrcAccountsList');
var $srcButton = document.querySelector('.js_braintree_src_button');
var $accoutnListBlock = document.querySelector('.braintree_used_src_account');
var $alertInfo = document.getElementById('src-content') && document.getElementById('src-content').querySelectorAll('.alert-info')[0];
var helper = require('../helper');
var $saveSRCAccountCheckbox = document.querySelector('#braintreeSaveSRCAccount');


function srcUpdateAmount(srcIns, config) { // eslint-disable-line require-jsdoc
    srcIns.loader.show();
    $.ajax({
        url: config.getOrderInfoUrl,
        type: 'get',
        dataType: 'json',
        success: function (data) {
            srcIns.loader.hide();
            srcIns.updateAmount(data.amount);
        },
        error: function () {
            window.location.reload();
        }
    });
}

function setSessionAccountData(cardDescrition) {
    $srcSessionAccount.value = cardDescrition;
    $srcSessionAccount.text = cardDescrition;
    $srcSessionAccount.selected = true;
    $accoutnListBlock.style.display = 'block';
    $srcButton.style.display = 'none';
    $srcContent.setAttribute('data-paypal-is-hide-continue-button', false);
    helper.continueButtonToggle(false);
}

function updateSessionAccountDropdown() {
    if ($srcAccountList.value === 'newaccount') {
        $srcButton.style.display = 'block';
        $alertInfo.style.display = 'block';
        helper.continueButtonToggle(true);
        $srcContent.setAttribute('data-paypal-is-hide-continue-button', true);

        if ($saveSRCAccountCheckbox) {
            $saveSRCAccountCheckbox.checked = true;
        }
    } else {
        $srcButton.style.display = 'none';
        $alertInfo.style.display = 'none';
        helper.continueButtonToggle(false);
        $srcContent.setAttribute('data-paypal-is-hide-continue-button', false);

        if ($saveSRCAccountCheckbox) {
            $saveSRCAccountCheckbox.checked = JSON.parse($srcSessionAccount.getAttribute('data-save'));
        }
    }
}

function initSessionAccountDropdownState() {
    if ($srcAccountList.value === 'newaccount') {
        $alertInfo.style.display = 'block';
        $accoutnListBlock.style.display = 'none';
    } else {
        helper.continueButtonToggle(false);
        $srcContent.setAttribute('data-paypal-is-hide-continue-button', false);
        $srcButton.style.display = 'none';
        $alertInfo.style.display = 'none';
    }
}

/*
    Remove method was used and change appearance of googlepay tab
**/
function removeSessionNonce() {
    var $sessionAccount = document.querySelector('#sessionSrcAccount');
    $sessionAccount.value = '';
    $sessionAccount.text = '';
    $sessionAccount.setAttribute('data-save', false);
    $accoutnListBlock.style.display = 'none';

    document.querySelector('#braintreeSRCNonce').value = '';
    document.querySelector('#braintreeSrcBillingAddress').value = '';
    document.querySelector('#braintreeSrcCardDescription').value = '';

    document.querySelector('#newSrcAccount').selected = true;
    updateSessionAccountDropdown();
}

function createSrcShippingAddressData(shippingData) {
    var shippingAddress = {};
    shippingAddress.recipientName = shippingData.firstName + ' ' + shippingData.lastName;
    shippingAddress.phone = shippingData.phoneNumber;
    shippingAddress.countryCodeAlpha2 = shippingData.countryCode;
    shippingAddress.streetAddress = shippingData.streetAddress;
    shippingAddress.extendedAddress = shippingData.extendedAddress;
    shippingAddress.locality = shippingData.locality;
    shippingAddress.region = shippingData.region;
    shippingAddress.postalCode = shippingData.postalCode;
    return JSON.stringify(shippingAddress);
}

module.exports = {
    srcUpdateAmount,
    setSessionAccountData,
    updateSessionAccountDropdown,
    initSessionAccountDropdownState,
    removeSessionNonce,
    createSrcShippingAddressData
};
