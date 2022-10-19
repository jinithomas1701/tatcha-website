'use strict';
var payPal = require('../braintreePaypal');
var paypalHelper = require('./paypalHelper');
var helper = require('../helper');
var loaderInstance = require('braintree_base/braintree/loaderHelper');
var accountsLoader;

function initAddPaypalAccount() {
    var $btn = document.querySelector('.js_braintree_accountPaypalButton');
    var $paypalErrorContainer = document.querySelector('#paypalAccountErrorContainer');
    var $paypalLoader = document.querySelector('#braintreePayPalAccLoader');

    if (JSON.parse($btn.getAttribute('data-is-inited'))) {
        return;
    }
    var config = JSON.parse($btn.getAttribute('data-braintree-config'));
    if (typeof config !== 'object' || config === null) {
        // eslint-disable-next-line no-console
        console.error($btn, 'not valid data-braintree-config');
        return;
    }

    config.$loaderContainer = $paypalLoader;
    config.$errorContainer = $paypalErrorContainer;
    config.onTokenizePayment = function (data) {
        let accountPaypalButton = document.querySelector('.js_braintree_accountPaypalButton');
        let paypalAddAccountHandler = accountPaypalButton.getAttribute('data-paypal-add-account-handler');
        let paypalAccountFormFields = accountPaypalButton.getAttribute('data-paypal-account-form-fields');
        let paypalBillingAddressData = paypalHelper.createBillingAddressData(data.details.billingAddress, data.details);
        let paypalAccountFormData = helper.createPaymentFormData(paypalAccountFormFields, {
            nonce: data.nonce,
            email: data.details.email,
            addresses: JSON.stringify(paypalBillingAddressData),
            shippingAddress: JSON.stringify(data.details.shippingAddress)
        });
        let csrfToken = document.querySelector('.js_braintree_accountPaypalButton_wrapper #csrf_token');
        paypalAccountFormData.append(csrfToken.name, csrfToken.value);

        let $loaderContainter = document.querySelector('#paypalAccountBtLoader');
        accountsLoader = loaderInstance($loaderContainter);
        accountsLoader.show();
        return $.ajax({
            type: 'POST',
            url: paypalAddAccountHandler,
            data: paypalAccountFormData,
            contentType: false,
            processData: false
        })
            .then((paymentData) => {
                paypalHelper.hidePaypalAccountBtn();
                $paypalLoader.style.display = 'none';
                $paypalErrorContainer.textContent = '';
                $paypalErrorContainer.style.display = 'none';

                $.get(paymentData.renderAccountsUrl)
                    .then((tplData => {
                        accountsLoader.hide();
                        document.querySelector('.paypal-accounts').innerHTML = tplData;
                        document.querySelectorAll('.paypal-accounts .remove-bt-payment').forEach(function (el) {
                            el.addEventListener('click', helper.removeBtPayment);
                        });
                    }));
            })
            .fail(({ responseJSON }) => {
                accountsLoader.hide();
                $paypalLoader.style.display = 'none';
                $paypalErrorContainer.style.display = 'block';
                $paypalErrorContainer.textContent = responseJSON.error;
            });
    };

    payPal.init(config, $btn);
    $btn.setAttribute('data-is-inited', true);
}

function initPayPalEvents() {
    document.querySelector('.add-paypal-account').addEventListener('click', function () {
        paypalHelper.showPaypalAccountBtn();
        initAddPaypalAccount();
    });
}

function initPaypalButtonsEvents() {
    document.querySelector('.paypal-accounts').onclick = function (e) {
        if (e.target.classList.contains('remove-bt-payment')) {
            helper.removeBtPayment(e);
        } else if (e.target.classList.contains('braintree-make-default-card')) {
            var target = e.target;
            var url = target.getAttribute('data-make-default-url');
            var id = target.getAttribute('data-id');
            var paymentMethodID = document.querySelector('.paypal-accounts').getAttribute('data-payment-method-id');
            var $loaderContainter = document.querySelector('#' + target.getAttribute('data-loader'));
            var loader = loaderInstance($loaderContainter);
            loader.show();
            helper.setDefaultProperty({
                url: url,
                id: id,
                paymentMethodID: paymentMethodID,
                loader: loader
            });
        }
    };
}

module.exports = {
    initPayPalEvents,
    initAddPaypalAccount,
    initPaypalButtonsEvents
};
