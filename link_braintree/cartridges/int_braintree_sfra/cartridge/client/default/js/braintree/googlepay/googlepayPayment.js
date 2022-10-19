'use strict';
var googlepay = require('../braintreeGooglepay');
var { hideShowButtons, createGooglepayBillingAddressData, createGooglepayShippingAddressData, showGooglepayAccount } = require('./googlepayHelper');
var { removeActiveSessionPayment, createPaymentFormData, showCartErrorMsg, updateBillingFormValues } = require('../helper');

var $googlepayButton = document.querySelector('.js_braintree_googlepay_button');
var $btGooglepayAccountsList = document.querySelector('#braintreeGooglepayAccountsList');
var $googlepayOnCart = document.querySelector('.braintree-cart-google-button');
var $googlepayNonce = document.querySelector('#braintreeGooglePayNonce');
var $googlepayCardDescription = document.querySelector('#braintreeGooglePayCardDescription');
var $braintreeGooglepayPaymentType = document.querySelector('#braintreeGooglepayPaymentType');
var $googlePayBillingAddress = document.querySelector('#braintreeGooglePayBillingAddress');

function makeGooglepayPayment(continueButton) {
    var googlepayIns;
    var config = JSON.parse($googlepayButton.getAttribute('data-braintree-config'));
    if (typeof config !== 'object' || config === null) {
        // eslint-disable-next-line no-console
        console.error($googlepayButton, 'not valid data-braintree-config');
    }

    if ($btGooglepayAccountsList) {
        $btGooglepayAccountsList.addEventListener('change', function () {
            hideShowButtons();
        });
        hideShowButtons();

        if ($googlepayCardDescription.value === 'GooglePay') {
            $googlepayCardDescription.value = $btGooglepayAccountsList.selectedOptions[0].label;
        }
    }

    config.onTokenizePayment = function (data, result) {
        var deviceData = document.querySelector('input[name=braintreeGooglePayDeviceDataInput]').value;
        var googlepayNonce = result.nonce;
        var googlepayPaymentType = result.type;
        var googlepayCardDescription = result.details.cardType + ' ' + result.details.lastFour;

        removeActiveSessionPayment();

        if (data) {
            var billingAddressData = createGooglepayBillingAddressData(data);

            if ($googlepayOnCart) {
                var $braintreeCartButtons = document.querySelector('.braintree-cart-buttons-wrap');
                var placeOrderUrl = $braintreeCartButtons.getAttribute('data-checkout-placeorder-url');
                var checkoutFromCartUrl = $braintreeCartButtons.getAttribute('data-checkout-from-cart-url');
                var checkoutFormFields = $braintreeCartButtons.getAttribute('data-checkout-form-fields');
                var csrfToken = document.querySelector('.braintree-cart-buttons-wrap  #csrf_token');
                var shippingAddressData = createGooglepayShippingAddressData(data.shippingAddress);
                var googlepayCheckoutFormData = createPaymentFormData(checkoutFormFields, {
                    firstName: billingAddressData.firstName,
                    lastName: billingAddressData.lastName,
                    address1: billingAddressData.streetAddress,
                    address2: billingAddressData.extendedAddress || '',
                    city: billingAddressData.locality,
                    postalCode: billingAddressData.postalCode,
                    stateCode: billingAddressData.stateCode,
                    country: billingAddressData.countryCodeAlpha2,
                    email: billingAddressData.email,
                    phone: billingAddressData.phone,
                    paymentMethod: config.paymentMethodName
                });

                googlepayCheckoutFormData.append(csrfToken.name, csrfToken.value);
                googlepayCheckoutFormData.append('braintreeGooglePayNonce', googlepayNonce);
                googlepayCheckoutFormData.append('braintreeGooglePayDeviceData', deviceData);
                googlepayCheckoutFormData.append('braintreeGooglePayCardDescription', googlepayCardDescription);
                googlepayCheckoutFormData.append('braintreeGooglepayPaymentType', googlepayPaymentType);
                googlepayCheckoutFormData.append('braintreeSaveGooglepayAccount', true);
                googlepayCheckoutFormData.append('braintreeGooglePayShippingAddress', JSON.stringify(shippingAddressData) || '{}');

                $.ajax({
                    type: 'POST',
                    url: checkoutFromCartUrl,
                    data: googlepayCheckoutFormData,
                    contentType: false,
                    processData: false,
                    success: function (res) {
                        if (res.error) {
                            var errorMessage = '';
                            if (res.fieldErrors.length) {
                                res.fieldErrors.forEach(function (error, index) {
                                    var keys = Object.keys(error);
                                    if (keys.length) {
                                        errorMessage += `${keys[index].replace('dwfrm_billing_', '').replace('_', ' ')} ${res.fieldErrors[index][keys[index]]}. `;
                                    }
                                });
                                showCartErrorMsg(errorMessage);
                            }

                            if (res.serverErrors.length) {
                                res.serverErrors.forEach(function (error) {
                                    errorMessage += `${error}. `;
                                });
                                showCartErrorMsg(errorMessage);
                            }

                            if (res.cartError) {
                                window.location.href = res.redirectUrl;
                            }
                            return;
                        }

                        sessionStorage.setItem('pageState', 'cart');
                        googlepayIns.loader.hide();
                        window.location.href = placeOrderUrl;
                    },
                    error: function (err) {
                        if (err && err.redirectUrl) {
                            window.location.href = err.redirectUrl;
                        }
                    }
                });

                return;
            }

            $googlepayNonce.value = googlepayNonce;
            $googlepayCardDescription.value = googlepayCardDescription;
            $braintreeGooglepayPaymentType.value = googlepayPaymentType;

            // Updating Storefront Billing Form data with GooglePay Billing
            var storeFrontBillingData = JSON.parse(document.querySelector('.braintree-billing-payment-wrap').getAttribute('data-billing-form-fields-names'));
            storeFrontBillingData.dwfrm_billing_addressFields_firstName = billingAddressData.firstName;
            storeFrontBillingData.dwfrm_billing_addressFields_lastName = billingAddressData.lastName;
            storeFrontBillingData.dwfrm_billing_addressFields_address1 = billingAddressData.streetAddress;
            storeFrontBillingData.dwfrm_billing_addressFields_address2 = billingAddressData.extendedAddress || '';
            storeFrontBillingData.dwfrm_billing_addressFields_city = billingAddressData.locality;
            storeFrontBillingData.dwfrm_billing_addressFields_postalCode = billingAddressData.postalCode;
            storeFrontBillingData.dwfrm_billing_addressFields_states_stateCode = billingAddressData.stateCode;
            storeFrontBillingData.dwfrm_billing_addressFields_country = billingAddressData.countryCodeAlpha2;
            storeFrontBillingData.dwfrm_billing_contactInfoFields_email = billingAddressData.email;
            storeFrontBillingData.dwfrm_billing_contactInfoFields_phone = billingAddressData.phone;

            $googlePayBillingAddress.value = JSON.stringify(billingAddressData);

            updateBillingFormValues(storeFrontBillingData);
        }

        // selector "new GooglePay account" in dropdown list
        var newGPAccount = document.getElementById('newGPAccount');
        var sessionGPAccount = document.querySelector('#sessionGPAccount');

        // Selecting Google Pay Session Account
        sessionGPAccount.text = $googlepayCardDescription.value;
        newGPAccount.removeAttribute('selected');
        sessionGPAccount.selected = true;
        sessionGPAccount.setAttribute('data-session-account', 'true');

        showGooglepayAccount();
        continueButton.click();
    };

    googlepayIns = googlepay.init(config, $googlepayButton);
    googlepayIns.createGooglepay();

    function googlepayUpdateAmount() { // eslint-disable-line require-jsdoc
        googlepayIns.loader.show();
        $.ajax({
            url: config.getOrderInfoUrl,
            type: 'get',
            dataType: 'json',
            success: function (data) {
                googlepayIns.loader.hide();
                googlepayIns.updateAmount(data.amount);
            },
            error: function () {
                window.location.reload();
            }
        });
    }

    $('body').on('checkout:updateCheckoutView', googlepayUpdateAmount);
    $('body').on('braintree:updateCartTotals', googlepayUpdateAmount);
    googlepayUpdateAmount();
}

module.exports = {
    makeGooglepayPayment
};
