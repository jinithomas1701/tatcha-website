'use strict';
var applePay = require('../braintreeApplepay');
var {
    isValidInputField,
    removeActiveSessionPayment,
    createPaymentFormData,
    showCartErrorMsg,
    updateBillingFormValues
} = require('./../helper');


var $applePayButton = document.querySelector('.js_braintree_applepay_button');
var $applepayButtonsWrap = document.querySelector('.js_braintree_applepayButtonsWrap');
var $applepayDataMethod = document.querySelector('.payment-options[role=tablist] .nav-item[data-method-id="ApplePay"]');
var $emailField = document.querySelector('.contact-info-block [name=dwfrm_billing_contactInfoFields_email]');
var $phoneField = document.querySelector('.contact-info-block [name=dwfrm_billing_contactInfoFields_phone]');

function makeApplePayButtonDisabled() {
    $applePayButton.classList.add('js_braintree_applepay_button_disabled');
}

function hideApplePayButton() {
    $applepayButtonsWrap.style.display = 'none'; // Remove the ApplePay select payment method radiobutton
    if ($applepayDataMethod) {
        $applepayDataMethod.style.display = 'none';
    }
}

function showApplePayButton() {
    $applepayButtonsWrap.style.display = 'block'; // Show the ApplePay select payment method radiobutton
    if ($applepayDataMethod) {
        $applepayDataMethod.style.display = 'block';
    }
}

function initApplepayButton() {
    document.querySelectorAll('.js_braintree_applepay_button').forEach(function (el) {
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

        $btn.addEventListener('braintree:deviceNotSupportApplePay', function () {
            hideApplePayButton();
        }, false);
        $btn.addEventListener('braintree:deviceSupportApplePay', function () {
            showApplePayButton();
        }, false);
        $btn.addEventListener('braintree:ApplePayCanNotMakePaymentWithActiveCard', function () {
            makeApplePayButtonDisabled();
        }, false);

        config.isRequiredBillingContactFields = true;
        config.isRequiredShippingContactFields = true;
        var applePayIns = applePay.init(config, $btn);

        $btn.addEventListener('click', function () {
            applePayIns.startPayment();
        });

        function updateCartApplepayAmount() {
            if (!applePayIns) {
                return;
            }
            applePayIns.loader.show();
            $.ajax({
                url: config.getOrderInfoUrl,
                type: 'get',
                dataType: 'json',
                success: function (data) {
                    applePayIns.loader.hide();
                    applePayIns.updateAmount(data.amount);
                },
                error: function () {
                    window.location.reload();
                }
            });
            return;
        }
        $('body').on('braintree:updateCartTotals', updateCartApplepayAmount);

        $btn.addEventListener('braintree:ApplePayPaymentAuthorized', function (e) {
            applePayIns.loader.show();
            var responseData = e.detail.data;
            var billingAddressData = responseData.billingAddress;

            var paymentMethodName = JSON.parse($applePayButton.getAttribute('data-braintree-config')).paymentMethodName;
            var $braintreeCartButtons = document.querySelector('.braintree-cart-buttons-wrap');
            var placeOrderUrl = $braintreeCartButtons.getAttribute('data-checkout-placeorder-url');
            var checkoutFromCartUrl = $braintreeCartButtons.getAttribute('data-checkout-from-cart-url');
            var checkoutFormFields = $braintreeCartButtons.getAttribute('data-checkout-form-fields');
            var applePayCheckoutFormData = createPaymentFormData(checkoutFormFields, {
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
                paymentMethod: paymentMethodName
            });

            var csrfToken = document.querySelector('.braintree-cart-buttons-wrap  #csrf_token');
            applePayCheckoutFormData.append(csrfToken.name, csrfToken.value);
            applePayCheckoutFormData.append('braintreeApplePayNonce', responseData.nonce);
            applePayCheckoutFormData.append('braintreeApplePayDeviceDataInput', responseData.deviceData);
            applePayCheckoutFormData.append('braintreeApplePayShippingAddress',
            JSON.stringify(responseData.shippingAddress) || '{}'
            );

            $.ajax({
                type: 'POST',
                url: checkoutFromCartUrl,
                data: applePayCheckoutFormData,
                contentType: false,
                processData: false,
                success: function (data) {
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

                    window.location.href = placeOrderUrl;
                },
                error: function (err) {
                    if (err && err.redirectUrl) {
                        window.location.href = err.redirectUrl;
                    }
                }
            });
        }, false);

        $btn.setAttribute('data-is-inited', true);
    });
}

function applepayPayment(continueButton) {
    var config = JSON.parse($applePayButton.getAttribute('data-braintree-config'));
    if (typeof config !== 'object' || config === null) {
        // eslint-disable-next-line no-console
        console.error($applePayButton, 'not valid data-braintree-config');
    }
    var applepayButton = $('.js_braintree_applepay_button');
    applepayButton.on('braintree:deviceNotSupportApplePay', function () {
        hideApplePayButton();
    });
    applepayButton.on('braintree:deviceSupportApplePay', function () {
        showApplePayButton();
    });
    applepayButton.on('braintree:ApplePayCanNotMakePaymentWithActiveCard', function () {
        makeApplePayButtonDisabled();
    });

    config.isRequiredBillingContactFields = true;
    var applePayIns = applePay.init(config, $applePayButton);

    function authorizedApplePayPayment(e) {
        removeActiveSessionPayment();
        applePayIns.loader.show();
        document.querySelector(('#braintreeApplePayNonce')).value = e.detail.data.nonce;

        // Updating Storefront Billing Form data with ApplePay Billing
        var applePayBillingData = e.detail.data.billingAddress;
        var storeFrontBillingData = JSON.parse(document.querySelector('.braintree-billing-payment-wrap').getAttribute('data-billing-form-fields-names'));
        storeFrontBillingData.dwfrm_billing_addressFields_firstName = applePayBillingData.firstName;
        storeFrontBillingData.dwfrm_billing_addressFields_lastName = applePayBillingData.lastName;
        storeFrontBillingData.dwfrm_billing_addressFields_address1 = applePayBillingData.streetAddress;
        storeFrontBillingData.dwfrm_billing_addressFields_address2 = applePayBillingData.extendedAddress || '';
        storeFrontBillingData.dwfrm_billing_addressFields_city = applePayBillingData.locality;
        storeFrontBillingData.dwfrm_billing_addressFields_postalCode = applePayBillingData.postalCode;
        storeFrontBillingData.dwfrm_billing_addressFields_states_stateCode = applePayBillingData.state;
        storeFrontBillingData.dwfrm_billing_addressFields_country = applePayBillingData.countryCodeAlpha2;
        storeFrontBillingData.dwfrm_billing_contactInfoFields_email = applePayBillingData.email;
        storeFrontBillingData.dwfrm_billing_contactInfoFields_phone = applePayBillingData.phone;

        updateBillingFormValues(storeFrontBillingData);
        continueButton.click();
    }

    if (!applePayIns) return;
    $applePayButton.addEventListener('click', function () {
        if (isValidInputField($emailField) && isValidInputField($phoneField)) {
            return applePayIns.startPayment();
        }
    });

    applepayButton.on('braintree:ApplePayPaymentAuthorized', authorizedApplePayPayment);

    function appleUpdateAmountData() { // eslint-disable-line no-inner-declarations
        applePayIns.loader.show();
        $.ajax({
            url: config.getOrderInfoUrl,
            type: 'get',
            dataType: 'json',
            success: function (data) {
                applePayIns.loader.hide();
                applePayIns.updateAmount(data.amount);
            },
            error: function () {
                window.location.reload();
            }
        });
    }
    $('body').on('checkout:updateCheckoutView', appleUpdateAmountData);
    appleUpdateAmountData();
}

/*
    Remove method was used and change appearance of applepay tab
**/
function removeSessionNonce() {
    document.querySelector('#braintreeApplePayNonce').value = '';
    document.querySelector('#braintreeApplePayDeviceData').value = '';
}

module.exports = {
    initApplepayButton,
    applepayPayment,
    removeSessionNonce
};
