'use strict';

var braintreeUtils = require('../braintreeUtils');
var loaderInstance = require('braintree_base/braintree/loaderHelper');
var {
    showPDPButton,
    hidePDPButton,
    showCartErrorMsg } = require('./paypalHelper');
var { createPaymentFormData } = require('../helper');

var $braintreePDPButton = document.querySelector('.braintree_pdp_button');

function staticImageHandler() {
    var $loaderContainter = document.querySelector('.braintreePayPalLoader');
    var loader = loaderInstance($loaderContainter);
    var $staticPaypalButton = document.querySelector('.braintree-static-paypal-button');
    var checkoutFromCartUrl = $staticPaypalButton.getAttribute('data-checkout-from-cart-url');
    var placeOrderUrl = $staticPaypalButton.getAttribute('data-paypal-placeorder-url');

    var ppAccountData = JSON.parse($staticPaypalButton.getAttribute('data-paypal-account-data'));
    var ppAccountAddressData = JSON.parse(ppAccountData.address);
    var paypalCheckoutFormFields = document.querySelector('.braintree-cart-paypal-buttons-wrap').getAttribute('data-paypal-checkout-form-fields');
    var paypalCheckoutFormData = createPaymentFormData(paypalCheckoutFormFields, {
        firstName: ppAccountAddressData.firstName,
        lastName: ppAccountAddressData.lastName,
        address1: ppAccountAddressData.streetAddress,
        address2: ppAccountAddressData.extendedAddress || '',
        city: ppAccountAddressData.locality,
        postalCode: ppAccountAddressData.postalCode,
        stateCode: ppAccountAddressData.state,
        country: ppAccountAddressData.countryCodeAlpha2,
        email: ppAccountData.email,
        phone: ppAccountAddressData.phone.replace('-', ''),
        paymentMethod: ppAccountData.paymentMethod
    });
    paypalCheckoutFormData.append('braintreeSavePaypalAccount', true);
    paypalCheckoutFormData.append('paymentMethodUUID', ppAccountData.uuid);
    var csrfToken = document.querySelector('.braintree-cart-paypal-buttons-wrap #csrf_token');
    paypalCheckoutFormData.append(csrfToken.name, csrfToken.value);

    loader.show();
    if ($braintreePDPButton && $braintreePDPButton.style.display === '') {
        var res = braintreeUtils.pdpOnlickForAsignedPaypalPayment();
        if (res.error) {
            loader.hide();
            // eslint-disable-next-line no-unused-expressions
            window.location.reload;
            return;
        }
    }

    return $.ajax({
        url: checkoutFromCartUrl,
        type: 'POST',
        data: paypalCheckoutFormData,
        contentType: false,
        processData: false,
        success: function (data) {
            loader.hide();
            if (data.error) {
                var errorMessage = '';
                if (data.fieldErrors.length) {
                    data.fieldErrors.forEach(function (error, index) {
                        var keys = Object.keys(error);
                        if (keys.length) {
                            errorMessage += `${keys[index].replace('dwfrm_billing_', '').replace('_', ' ')} ${data.fieldErrors[index][keys[index]]}. `;
                        }
                    });
                    showCartErrorMsg(errorMessage);
                }

                if (data.serverErrors.length) {
                    data.serverErrors.forEach(function (error) {
                        errorMessage += `${error}. `;
                    });
                    showCartErrorMsg(errorMessage);
                }

                if (data.cartError) {
                    window.location.href = data.redirectUrl;
                }
                return;
            }

            sessionStorage.setItem('pageState', 'cart');
            window.location.href = placeOrderUrl;
        },
        error: function (err) {
            loader.hide();
            if (err && err.redirectUrl) {
                window.location.href = err.redirectUrl;
            }
        }
    });
}

function paypalStaticPdpButtonHandler() {
    if ($braintreePDPButton) {
        var $price = document.querySelector('.price .sales .value');
        var isZeroAmount = false;
        var $miniCartQuantity = document.querySelector('.minicart-quantity');
        var $addToCartButton = document.querySelector('.add-to-cart') || document.querySelector('.add-to-cart-global');

        // Check minicart quantity and hide PDPbutton if it is not empty
        if (($miniCartQuantity && parseInt($miniCartQuantity.textContent, 0) > 0)
            || ($price && $price.getAttribute('content') === '0.00')) {  // Check if product price is zero
            hidePDPButton($braintreePDPButton);
        }

        if ($addToCartButton.disabled) {
            hidePDPButton($braintreePDPButton);
        }

        $('body').on('product:afterAddToCart', function () {
            hidePDPButton($braintreePDPButton);
        });

        $('body').on('cart:update', function () {
            $miniCartQuantity = parseInt(document.querySelector('.minicart-quantity').textContent, 0);
            if ($addToCartButton.disabled) {
                hidePDPButton($braintreePDPButton);
            }
            if ($miniCartQuantity === 0 && !$addToCartButton.disabled) {
                showPDPButton($braintreePDPButton);
            }
        });

        $('body').on('product:statusUpdate', function () {
            $miniCartQuantity = parseInt(document.querySelector('.minicart-quantity').textContent, 0);
            $price = document.querySelector('.price .sales .value');
            isZeroAmount = false;
            if ($price) {
                isZeroAmount = $price.getAttribute('content') === '0.00';
            }

            if ($miniCartQuantity === 0) {
                if ($addToCartButton.disabled || isZeroAmount) {
                    hidePDPButton($braintreePDPButton);
                }
                if (!$addToCartButton.disabled && !isZeroAmount) {
                    showPDPButton($braintreePDPButton);
                }
            }
        });
    }
}

module.exports = {
    staticImageHandler,
    paypalStaticPdpButtonHandler
};
