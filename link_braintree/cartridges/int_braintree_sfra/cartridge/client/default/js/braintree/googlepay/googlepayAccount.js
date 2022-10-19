'use strict';

var googlepay = require('../braintreeGooglepay');
var loaderInstance = require('../loaderHelper');

function submitAddGooglePayAccountForm() {
    $('.js_braintree_addGooglePayAccountForm').submit(function () {
        var $form = $(this);
        var $btFormErrorContainer = document.querySelector('#braintreeFormErrorContainer');
        $form.spinner().start();

        $.post($form.attr('action'), $form.serialize())
            .done(function (data) {
                $form.spinner().stop();
                if (!data.success) {
                    $btFormErrorContainer.style.display = 'block';
                    $btFormErrorContainer.textContent = data.error;
                } else {
                    location.href = data.redirectUrl;
                }
            })
            .fail(function (err) {
                if (err.responseJSON.redirectUrl) {
                    window.location.href = err.responseJSON.redirectUrl;
                }
                $form.spinner().stop();
            });
        return false;
    });
}

function initAddGooglePayAccount() {
    var $btn = document.querySelector('.js_braintree_accountgooglepay_button');
    var $googlepayNonce = document.querySelector('#braintreeGooglePayNonce');
    var $btGooglePayLoader = document.querySelector('.braintreeGooglepayLoader');
    var googlepayIns;
    var loader = loaderInstance($btGooglePayLoader);

    if (JSON.parse($btn.getAttribute('data-is-inited'))) {
        return;
    }
    var config = JSON.parse($btn.getAttribute('data-braintree-config'));

    if (typeof config !== 'object' || config === null) {
        // eslint-disable-next-line no-console
        console.error($btn, 'not valid data-braintree-config');
        return;
    }
    loader.show();

    config.onTokenizePayment = function (data, result) {
        var $btFormErrorContainer = document.querySelector('#braintreeFormErrorContainer');
        if ($btFormErrorContainer.style.display === 'block') {
            $btFormErrorContainer.style.display = 'none';
            $btFormErrorContainer.textContent = '';
        }
        if (result.type === 'PayPalAccount') {
            $btFormErrorContainer.style.display = 'block';
            $btFormErrorContainer.textContent = config.messages.saving_paypal_account_error;

            return;
        }

        $googlepayNonce.value = result.nonce;

        document.querySelector('.braintreeGooglePayBtn').click();
    };
    googlepayIns = googlepay.init(config, $btn);
    googlepayIns.createGooglepay();
    $btn.setAttribute('data-is-inited', true);
    submitAddGooglePayAccountForm();
}

module.exports = {
    initAddGooglePayAccount
};
/* eslint no-use-before-define: 2 */  // --> ON
