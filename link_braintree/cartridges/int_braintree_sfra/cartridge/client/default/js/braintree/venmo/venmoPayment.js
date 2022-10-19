'use strict';
var braintreeVenmo = require('../braintreeVenmo');
var venmoHelper = require('./venmoHelper');
var loaderInstance = require('../loaderHelper');
var helper = require('../helper');

var $venmoButton = document.querySelector('.js_braintree_venmo_button');
var $btVermoAccountsList = document.querySelector('#braintreeVenmoAccountsList');
var $braintreeVenmoNonce = document.querySelector('#braintreeVenmoNonce');
var $braintreeVenmoUserId = document.querySelector('#braintreeVenmoUserId');
var $submitShippingBtn = document.querySelector('.button, .submit-shipping');
var $contactEmail = document.querySelector('.contact-info-block [name=dwfrm_billing_contactInfoFields_email]');
var $hideVenmoButton = document.querySelector('.braintree-venmo-pay-button');
var $billingForm = document.querySelector('.card-body [id=dwfrm_billing]');
var $venmoContent = document.querySelector('.js_braintree_venmoContent');

function makeVenmoPayment(continueButton) {
    var config = JSON.parse($venmoButton.getAttribute('data-braintree-config'));

    if (typeof config !== 'object' || config === null) {
        // eslint-disable-next-line no-console
        console.error($venmoButton, 'not valid data-braintree-config');
    }

    if (JSON.parse($hideVenmoButton.getAttribute('data-is-hide-venmo-button')) && $btVermoAccountsList !== 'newaccount') {
        $venmoButton.style.display = 'none';
    }

    if ($btVermoAccountsList) {
        $btVermoAccountsList.addEventListener('change', function () {
            venmoHelper.hideShowButtons();
        });
        venmoHelper.hideShowButtons();
    }

    config.onClick = function () {
        if ($billingForm.checkValidity()) {
            /**
                * Setting current customer Billing address to form
                *  For the case when SFCC redirects customer from payment stage to shipping stage
                *  after successful Venmo app response
            */
            document.querySelector('#braintreeVenmoBilling').value = JSON.stringify(helper.getBillingAddressFormValues());

            return true;
        }
        $contactEmail.classList.add('is-invalid');
        return false;
    };
    config.deviceNotSupportVenmo = function () {
        venmoHelper.hideVenmoButton();
    };
    config.onTokenizePayment = function (data) {
        var $loaderContainer = venmoHelper.createLoaderContainter(document.querySelector('.page'));
        loaderInstance($loaderContainer).show();
        helper.removeActiveSessionPayment();

        $braintreeVenmoNonce.value = data.nonce;
        $braintreeVenmoUserId.value = data.details.username;

        if (window.history.state !== 'shipping') {
            continueButton.click();
            document.querySelector('.venmo-braintree-loader').remove();
            return true;
        }

        venmoHelper.updateBillingAddressFormValues(JSON.parse(document.querySelector('#braintreeVenmoBilling').value));

        // move to stage payment
        $submitShippingBtn.click();
        $venmoButton.setAttribute('data-is-valid-stage', true);
        $venmoButton.setAttribute('data-user-email', $contactEmail.value);
        document.querySelector('.venmo-braintree-loader').remove();
    };

    /**
        *  Init Venmo app with correct URL fragment (hash) to prevent Browser from opening the URL in a new tab.
        *  Braintree JS SDK is preserving the URL in its entirety and modifies the URL fragment (hash)
        *  to send back the results from Venmo (e.g. nonce, error message, etc.)
        *
    */
    var hashChange = new MutationObserver(function (mutations) {
        var correlationId = document.querySelector('#braintreeVenmoDeviceData').value || null;
        var mutation = mutations.find(function (element) {
            return element.attributeName === 'data-checkout-stage' && element.target.dataset.checkoutStage === 'payment';
        });

        if (!mutation) {
            return false;
        }
        if (!correlationId) {
            braintreeVenmo.init(config, $venmoButton);
            return true;
        }

        if ($braintreeVenmoNonce.value && JSON.parse($venmoButton.getAttribute('data-is-valid-stage'))) {
            $contactEmail.value = $venmoButton.getAttribute('data-user-email') || '';
            $venmoButton.setAttribute('data-is-valid-stage', false);
            continueButton.click();

            return true;
        }
        if ($venmoContent.classList.contains('active') && mutation.oldValue === 'placeOrder') {
            venmoHelper.showVenmoAccount();
            $venmoContent.setAttribute('data-paypal-is-hide-continue-button', false);
            $hideVenmoButton.setAttribute('data-is-hide-venmo-button', true);
        }
    });

    hashChange.observe(document.querySelector('#checkout-main'), { attributeOldValue: true });
}

module.exports = {
    makeVenmoPayment
};
