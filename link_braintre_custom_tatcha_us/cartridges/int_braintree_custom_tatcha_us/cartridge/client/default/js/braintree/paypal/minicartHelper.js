'use strict';

var paypalHelper = require('./paypalHelper');
var payPal = require('../braintreePaypal');
var paypalSavedAccountHandler = require('./paypalSavedAccountHandler');
var helper = require('../helper');

var $paypalMinicartButton;

function miniCartButton() {
    document.querySelectorAll('.js_braintree_paypal_cart_button').forEach(function (el) {
        var $btn = el;
        if (JSON.parse($btn.getAttribute('data-is-inited'))) {
            return;
        }
        var config = JSON.parse($btn.getAttribute('data-braintree-config'));
        if (typeof config !== 'object' || config === null) {
            // eslint-disable-next-line no-console
            console.error(el, 'not valid data-braintree-config');
            return;
        }
        $paypalMinicartButton = document.querySelector('.paypalMinicartButton');
        if ($paypalMinicartButton && config.options.amount === 0) {
            $paypalMinicartButton.style.display = 'none';
        }
        config.paypalConfig = config.paypalConfig || {};

        config.onTokenizePayment = function (payload, btnInstance) {
            var that = btnInstance;
            var params = btnInstance.params;
            var paypalCheckoutFormFields = document.querySelector('.braintree-cart-paypal-buttons-wrap').getAttribute('data-paypal-checkout-form-fields');
            var details = payload.details;
            if (!details.billingAddress) {
                /*that.er.show('Merchant PayPal account does not support the Billing Address retrieving. Contact PayPal for details on eligibility and enabling this feature.');
                return;*/
                details.billingAddress = details.shippingAddress;
            }
            var billingAddressData = paypalHelper.createBillingAddressData(details.billingAddress, details);

            try {
                if((typeof billingAddressData.phone === "undefined") || !billingAddressData.phone) {
                    billingAddressData.phone = '0000000000';
                }

                if((typeof details.shippingAddress.phone === "undefined") || !details.shippingAddress.phone) {
                    details.shippingAddress.phone = '0000000000';
                }
            } catch (err) {
                console.log('phone number not valid');
            }
            
            var paypalCheckoutFormData = helper.createPaymentFormData(paypalCheckoutFormFields, {
                firstName: billingAddressData.firstName,
                lastName: billingAddressData.lastName,
                address1: billingAddressData.streetAddress,
                address2: billingAddressData.extendedAddress || '',
                city: billingAddressData.locality,
                postalCode: billingAddressData.postalCode,
                stateCode: billingAddressData.state,
                country: billingAddressData.countryCodeAlpha2,
                email: billingAddressData.email,
                phone: billingAddressData.phone,
                paymentMethod: params.paymentMethodName
            });

            var csrfToken = document.querySelector('.braintree-cart-paypal-buttons-wrap #csrf_token');
            paypalCheckoutFormData.append(csrfToken.name, csrfToken.value);
            paypalCheckoutFormData.append('braintreePaypalNonce', payload.nonce);
            paypalCheckoutFormData.append('braintreePaypalRiskData', (params || {}).riskData);
            paypalCheckoutFormData.append('braintreeSavePaypalAccount', true);
            paypalCheckoutFormData.append('braintreePaypalShippingAddress',
                details.shippingAddress ?
                    paypalHelper.createShippingAddressData(details.shippingAddress, details) :
                    '{}'
            );
            paypalCheckoutFormData.append('braintreePaypalBillingAddress', JSON.stringify(billingAddressData));
            $('.loader-preventive').show();
            $.ajax({
                type: 'POST',
                url: params.paypalHandle,
                data: paypalCheckoutFormData,
                contentType: false,
                processData: false,
                success: function (data) {

                    if (data.error) {
                        $('.loader-preventive').hide();
                        var errorMessage = '';
                        if (data.fieldErrors.length) {
                            data.fieldErrors.forEach(function (error, index) {
                                var keys = Object.keys(error);
                                if (keys.length) {
                                    errorMessage += `${keys[index].replace('dwfrm_billing_', '').replace('_', ' ')} ${data.fieldErrors[index][keys[index]]}. `;
                                }
                            });
                            helper.showCartErrorMsg(errorMessage);
                        }

                        if (data.serverErrors.length) {
                            data.serverErrors.forEach(function (error) {
                                errorMessage += `${error}. `;
                            });
                            helper.showCartErrorMsg(errorMessage);
                        }

                        if (data.cartError) {
                            window.location.href = data.redirectUrl;
                        }
                        return;
                    }

                    window.location.href = params.redirectUrl;
                },
                error: function (err) {
                    if (err && err.redirectUrl) {
                        window.location.href = err.redirectUrl;
                    }
                }
            });
        };

        var paypalIns = payPal.init(config, $btn);

        function updateCartPaypalAmount() { // eslint-disable-line require-jsdoc
            paypalIns.loader.show();
            $.ajax({
                url: config.getOrderInfoUrl,
                type: 'get',
                dataType: 'json',
                success: function (data) {
                    paypalIns.loader.hide();
                    paypalIns.updateAmount(data.amount);
                },
                error: function () {
                    window.location.reload();
                }
            });
        }
        $('body').on('cart:update', function () {
            $paypalMinicartButton = document.querySelector('.paypalMinicartButton');
            var $totalPrice = document.querySelector('.sub-total');
            if ($paypalMinicartButton && $totalPrice) {
                var isZeroAmount = $totalPrice.innerHTML.substring(1) === '0.00';
                $paypalMinicartButton.style.display = isZeroAmount ? 'none' : '';
            }
        });

        $('body').on('braintree:updateCartTotals', updateCartPaypalAmount);
        $btn.setAttribute('data-is-inited', true);
    });
}

var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
        if (mutation.addedNodes.length < 2) {
            return;
        }
        miniCartButton();
        var $staticPaypalButton = document.querySelector('.braintree-static-paypal-button');
        if ($staticPaypalButton) {
            $staticPaypalButton.addEventListener('click', paypalSavedAccountHandler.staticImageHandler);
        }
    });
});
window.miniCartButton = miniCartButton;
module.exports = {
    miniCartButton,
    observer
};
