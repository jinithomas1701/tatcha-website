'use strict';
var src = require('../braintreeSrc');
var srcHelper = require('./srcHelper');

var {
    createPaymentFormData,
    showCartErrorMsg,
    updateBillingFormValues
} = require('./../helper');

var $srcButton = document.querySelector('.js_braintree_src_button');
var $srcNonce = document.querySelector('#braintreeSRCNonce');
var $srcCardDescription = document.querySelector('#braintreeSrcCardDescription');
var $srcBillingAddress = document.querySelector('#braintreeSrcBillingAddress');
var $srcAccountList = document.querySelector('#braintreeSrcAccountsList');
var $srcOnCart = document.querySelector('.braintree-cart-src-button');

function initSrcButton(continueButton) {
    var srcIns;
    var config = JSON.parse($srcButton.getAttribute('data-braintree-config'));
    if (typeof config !== 'object' || config === null) {
        // eslint-disable-next-line no-console
        console.error($srcButton, 'not valid data-braintree-config');
    }

    if ($srcAccountList) {
        srcHelper.initSessionAccountDropdownState();
        $srcAccountList.addEventListener('change', srcHelper.updateSessionAccountDropdown);
    }

    config.onTokenizePayment = function (response) {
        require('../helper').removeActiveSessionPayment();
        var cardDescription = response.details.cardType + ' ' + response.description;
        var deviceData = document.querySelector('input[name=braintreeSrcDeviceDataInput]').value;

        // Billing Checkout
        if (!$srcOnCart) {
            $srcNonce.value = response.nonce;
            $srcCardDescription.value = cardDescription;
            srcHelper.setSessionAccountData(cardDescription);

            // Updating Storefront Billing Form data with SRC Billing
            var scrPayBillingData = response.billingAddress;
            var storeFrontBillingData = JSON.parse(document.querySelector('.braintree-billing-payment-wrap').getAttribute('data-billing-form-fields-names'));
            storeFrontBillingData.dwfrm_billing_addressFields_firstName = scrPayBillingData.firstName;
            storeFrontBillingData.dwfrm_billing_addressFields_lastName = scrPayBillingData.lastName;
            storeFrontBillingData.dwfrm_billing_addressFields_address1 = scrPayBillingData.streetAddress;
            storeFrontBillingData.dwfrm_billing_addressFields_address2 = scrPayBillingData.extendedAddress || '';
            storeFrontBillingData.dwfrm_billing_addressFields_city = scrPayBillingData.locality;
            storeFrontBillingData.dwfrm_billing_addressFields_postalCode = scrPayBillingData.postalCode;
            storeFrontBillingData.dwfrm_billing_addressFields_states_stateCode = scrPayBillingData.region;
            storeFrontBillingData.dwfrm_billing_addressFields_country = scrPayBillingData.countryCode;
            storeFrontBillingData.dwfrm_billing_contactInfoFields_email = response.userData.userEmail;
            storeFrontBillingData.dwfrm_billing_contactInfoFields_phone = scrPayBillingData.phoneNumber;

            scrPayBillingData.email = response.userData.userEmail;
            $srcBillingAddress.value = JSON.stringify(scrPayBillingData);

            updateBillingFormValues(storeFrontBillingData);

            continueButton.click();
            return;
        }

        // Cart Checkout
        var shippingAddressData = srcHelper.createSrcShippingAddressData(response.shippingAddress);
        var paymentMethodName = JSON.parse($srcButton.getAttribute('data-braintree-config')).paymentMethodName;
        var $braintreeCartButtons = document.querySelector('.braintree-cart-buttons-wrap');
        var placeOrderUrl = $braintreeCartButtons.getAttribute('data-checkout-placeorder-url');
        var checkoutFromCartUrl = $braintreeCartButtons.getAttribute('data-checkout-from-cart-url');
        var checkoutFormFields = $braintreeCartButtons.getAttribute('data-checkout-form-fields');
        var srcCheckoutFormData = createPaymentFormData(checkoutFormFields, {
            firstName: response.userData.userFirstName,
            lastName: response.userData.userLastName,
            address1: response.billingAddress.streetAddress,
            address2: response.billingAddress.extendedAddress || '',
            city: response.billingAddress.locality,
            postalCode: response.billingAddress.postalCode,
            stateCode: response.billingAddress.region,
            country: response.billingAddress.countryCode,
            email: response.userData.userEmail,
            phone: response.billingAddress.phoneNumber,
            paymentMethod: paymentMethodName
        });

        var csrfToken = document.querySelector('.braintree-cart-buttons-wrap  #csrf_token');
        srcCheckoutFormData.append(csrfToken.name, csrfToken.value);
        srcCheckoutFormData.append('braintreeSrcNonce', response.nonce);
        srcCheckoutFormData.append('braintreeSrcDeviceDataInput', deviceData);
        srcCheckoutFormData.append('braintreeSaveSRCAccount', true);
        srcCheckoutFormData.append('braintreeSrcShippingAddress',
            shippingAddressData || '{}'
        );
        srcCheckoutFormData.append('braintreeSrcCardDescription', cardDescription);

        $.ajax({
            type: 'POST',
            url: checkoutFromCartUrl,
            data: srcCheckoutFormData,
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

                sessionStorage.setItem('pageState', 'cart');
                srcIns.loader.hide();
                window.location.href = placeOrderUrl;
            },
            error: function (err) {
                if (err && err.redirectUrl) {
                    window.location.href = err.redirectUrl;
                }
            }
        });
    };

    srcIns = src.init(config, $srcButton);
    srcIns.loadSrcButton();

    $('body').on('checkout:updateCheckoutView', srcHelper.srcUpdateAmount.bind(null, srcIns, config));
    $('body').on('braintree:updateCartTotals', srcHelper.srcUpdateAmount.bind(null, srcIns, config));
    srcHelper.srcUpdateAmount(srcIns, config);
}

module.exports = {
    initSrcButton
};
