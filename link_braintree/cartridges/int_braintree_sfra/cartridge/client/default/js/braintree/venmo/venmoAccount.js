'use strict';
var braintreeVenmo = require('../braintreeVenmo');
var venmoHelper = require('./venmoHelper');
var helper = require('../helper');
var loaderInstance = require('../loaderHelper');
var accountsLoader;

function initAddVenmoAccount() {
    var $btn = document.querySelector('.js_braintree_accountVenmoButton');
    var $venmoErrorContainer = document.querySelector('#venmoAccountErrorContainer');
    var $venmoLoader = document.querySelector('#braintreeVenmoAccLoader');

    if (JSON.parse($btn.getAttribute('data-is-inited'))) {
        return;
    }
    var config = JSON.parse($btn.getAttribute('data-braintree-config'));

    if (typeof config !== 'object' || config === null) {
        // eslint-disable-next-line no-console
        console.error($btn, 'not valid data-braintree-config');
        return;
    }

    config.$loaderContainer = $venmoLoader;
    config.$errorContainer = $venmoErrorContainer;
    config.deviceNotSupportVenmo = function () {
        venmoHelper.showVenmoAccountError();
        $venmoErrorContainer.textContent = config.messages.VENMO_BROWSER_NOT_SUPPORTED;
    };
    config.onTokenizePayment = function (data) {
        let accountVenmoButton = document.querySelector('.js_braintree_accountVenmoButton');
        let venmoAddAccountHandler = accountVenmoButton.getAttribute('data-venmo-add-account-handler');
        let venmoAccountFormFields = accountVenmoButton.getAttribute('data-venmo-account-form-fields');
        let venmoAccountFormData = helper.createPaymentFormData(venmoAccountFormFields, {
            nonce: data.nonce
        });
        let csrfToken = document.querySelector('.js_braintree_accountVenmoButton_wrapper #csrf_token');
        venmoAccountFormData.append(csrfToken.name, csrfToken.value);

        let $loaderContainter = document.querySelector('#venmoAccountBtLoader');
        accountsLoader = loaderInstance($loaderContainter);
        accountsLoader.show();
        return $.ajax({
            type: 'POST',
            url: venmoAddAccountHandler,
            data: venmoAccountFormData,
            contentType: false,
            processData: false
        })
            .then((paymentData) => {
                venmoHelper.hideVenmoAccountBtn();
                $venmoLoader.style.display = 'none';
                $venmoErrorContainer.textContent = '';
                $venmoErrorContainer.style.display = 'none';

                $.get(paymentData.renderAccountsUrl)
                    .then((tplData => {
                        accountsLoader.hide();
                        document.querySelector('.venmo-accounts').innerHTML = tplData;
                        document.querySelectorAll('.venmo-accounts .remove-bt-payment').forEach(function (el) {
                            el.addEventListener('click', helper.removeBtPayment);
                        });
                    }));
            })
            .fail(({ responseJSON }) => {
                accountsLoader.hide();
                $venmoLoader.style.display = 'none';
                $venmoErrorContainer.style.display = 'block';
                $venmoErrorContainer.textContent = responseJSON.error;
            });
    };

    braintreeVenmo.init(config, $btn);
    $btn.setAttribute('isInited', true);
}

function initVenmoEvents() {
    let $addVenmoAccountBtn = document.querySelector('.add-venmo-account');
    $addVenmoAccountBtn.addEventListener('click', function () {
        venmoHelper.showVenmoAccountBtn();
        initAddVenmoAccount();
    });
}

function initVenmoButtonsEvents() {
    document.querySelector('.venmo-accounts').onclick = function (e) {
        if (e.target.classList.contains('remove-bt-payment')) {
            helper.removeBtPayment(e);
        } else if (e.target.classList.contains('braintree-make-default-card')) {
            var target = e.target;
            var url = target.getAttribute('data-make-default-url');
            var id = target.getAttribute('data-id');
            var paymentMethodID = document.querySelector('.venmo-accounts').getAttribute('data-payment-method-id');
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
    initVenmoEvents,
    initAddVenmoAccount,
    initVenmoButtonsEvents
};
