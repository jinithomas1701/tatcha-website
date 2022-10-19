'use strict';

module.exports = function () {
    /* global braintreeUtils braintree $ */
    var helper = require('./helper');
    var applepayHelper = require('./applepay/applepayHelper');
    var creditcardHelper = require('./creditcard/creditcardHelper');
    var creditcardPayment = require('./creditcard/creditcardPayment');
    var creditCardFields = require('./creditcard/creditcardFields');
    var creditCard = require('./braintreeCreditCard');
    var creditCardAccount = require('./creditcard/creditcardAccount');
    var minicartHelper = require('./paypal/minicartHelper');
    var paypalAccount = require('./paypal/paypalAccount');
    var paypalPayment = require('./paypal/paypalPayment');
    var paypalSavedAccountHandler = require('./paypal/paypalSavedAccountHandler');
    var local = require('braintree_base/braintree/local/localPayment'); // eslint-disable-line no-unused-vars
    var orderStage = document.getElementById('checkout-main');
    var pageState = sessionStorage.getItem('pageState');

    var $form = document.querySelector('#dwfrm_billing'); // eslint-disable-line no-unused-vars
    var $cartPage = document.querySelectorAll('.cart-page');
 	var $minicartPage = document.querySelectorAll('.minibagSfra');
    var $continueButton = document.querySelector('button.submit-payment');
    var $summaryDetails = document.querySelector('.summary-details .payment-details');
    var $addCreditCardForm = document.querySelector('.js_braintree_addCreditCardForm');
    var $paypalContent = document.querySelector('.js_braintree_paypalContent');
    var $creditCardContent = document.querySelector('.js_braintree_creditCardContent');
    var $creditCardContentModal = document.querySelector('#addCardModal .js_braintree_creditCardContent');
    var $applepayContent = document.querySelector('.js_braintree_applepayContent');
    var $braintreePaypalNonce = document.querySelector('#braintreePayPalNonce');
    var $minicartPopover = document.querySelector('.minicart .popover');
    var $creditCardList = document.querySelector('#braintreeCreditCardList');
    var $staticPaypalButton = document.querySelector('.braintree-static-paypal-button');
    var $checkoutShippingPage = document.querySelectorAll('#checkout-main');

    var venmoAccount = require('braintree_base/braintree/venmo/venmoAccount');
    var venmoPayment = require('braintree_base/braintree/venmo/venmoPayment');
    var $venmoContent = document.querySelector('.js_braintree_venmoContent');

    var googlePayAccount = require('braintree_base/braintree/googlepay/googlepayAccount');
    var googlepayPayment = require('braintree_base/braintree/googlepay/googlepayPayment');
    var $googlepayContent = document.querySelector('.js_braintree_googlepayContent');
    var $googlepayOnCart = document.querySelector('.braintree-cart-google-button');
    var $addGooglePayAccountForm = document.querySelector('.js_braintree_addGooglePayAccountForm');
    var $braintreeGooglePayNonce = document.querySelector('#braintreeGooglePayNonce');

    var braintreeSrc = require('braintree_base/braintree/src/srcPayment');
    var srcAccount = require('braintree_base/braintree/src/srcAccount');
    var $addSrcAccountForm = document.querySelector('.js_braintree_addSrcAccountForm');
    var $srcContent = document.querySelector('.js_braintree_srcContent');
    var $braintreeSrcNonce = document.querySelector('#braintreeSRCNonce');
    var $srcOnCart = document.querySelector('.braintree-cart-src-button');

    if (window.NodeList && !NodeList.prototype.forEach) {
        NodeList.prototype.forEach = Array.prototype.forEach;
    }

    (function () {
        if (typeof window.CustomEvent === 'function') return false; // If not IE

        function CustomEvent(event, params) {
            // eslint-disable-next-line no-param-reassign
            params = params || { bubbles: false, cancelable: false, detail: undefined };
            var evt = document.createEvent('CustomEvent');
            evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
            return evt;
        }

        CustomEvent.prototype = window.Event.prototype;

        window.CustomEvent = CustomEvent;
    }());

    if ($cartPage) {
        helper.initWathcherCartUpdate();
    }

    if ($addCreditCardForm) {
        creditCardAccount.initAccountAddCreditCard();
    }

    if ($addGooglePayAccountForm) {
        googlePayAccount.initAddGooglePayAccount();
    }
    if ($addSrcAccountForm) {
        srcAccount.initAddSrcAccount();
    }

    document.addEventListener('DOMContentLoaded', function () {
        minicartHelper.miniCartButton();
    });

    if ($minicartPopover) {
        minicartHelper.observer.observe($minicartPopover, { childList: true });
    }

    helper.paymentMethodChangeHandle(document.querySelector('.payment-options[role=tablist] a.active[data-toggle="tab"]'));

    if ($cartPage.length || $checkoutShippingPage.length || $minicartPage.length) {
        applepayHelper.initApplepayButton();
    }

    if ($paypalContent) {
        paypalPayment.makePaypalPayment($continueButton);
    }

    if ($creditCardContent) {
        creditCardFields.initCreditCardFields(); 
        creditcardHelper.initCardListAndSaveFunctionality();
        $('body').on('checkout:updateCheckoutView', creditCardFields.updateData);

        creditCardFields.updateData();

        if ($creditCardList) {
            $creditCardList.addEventListener('change', function () {
                creditcardPayment.doNotAllowSubmitForm();
            });
        }
        $('body').on('braintree:3dSecure_content_shown', function () {
            helper.continueButtonToggle(false);
        });

        $('body').on('braintree:3dSecure_content_removed', function () {
            setTimeout(function () {
                creditcardPayment.hide3DSecureContainer();
            }, 2000);
        });

        $continueButton.addEventListener('click', function (event) {
            if (!event.isTrusted) {
                return;
            }
            helper.removeActiveSessionPayment();
            creditcardPayment.makeCreditCardPayment(event);
        });
    }

    $('#addNewCardModal').on('click', function () {
        $('.saved-credit-card-list-item').removeAttr('checked');
        $('.checkout-add-card-modal').addClass('opened');
        $('#braintreeCreditCardList').val('newcard');
        var event = new Event('change');
        var element = document.getElementById("braintreeCreditCardList");
        element.dispatchEvent(event);
        $('#checkout-main #addCardModal').modal('show');
        if ($('.spc-billing-same-as-shipping-modal:checkbox:checked').length > 0) {
            if (!$('#addCardModal .billing-address').hasClass('d-none')) {
                $('#addCardModal .billing-address').addClass('d-none');
            }
        }
        $('#addCreditCardForm .invalid-feedback').addClass('d-none');
        $('#addCreditCardForm .braintree-hosted-fields-iframe-container').removeClass('error-text');
        $('#addCreditCardForm .braintree-text-input').removeClass('error-text');
        $('.submit-payment').removeAttr('data-is-allow-submit-form');
    });

    $('.checkout-add-card-modal .close, .checkout-add-card-modal .cancel-card').on('click', function () {
        var preCard = $('.selected-icon').parent().attr('data-val');
        $('#braintreeCreditCardList').val(preCard);
        var event = new Event('change');
        var element = document.getElementById("braintreeCreditCardList");
        element.dispatchEvent(event);
    });

    $('#addCardModal .billingZipCode').on('keyup', function () {
        if ($(this).val() &&  $(this).val().length > 1) {
            var formatedVal = $(this).val().replace(/(\w)\s+(\w)/, '$1-$2');
            $(this).val(formatedVal);
        }
    });

   $('.checkout-add-card-modal').on('click', '.submit-newcard', function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        $('.loader-preventive').show();
        var addCreditCardForm = $(this).closest('form');
        var country = addCreditCardForm.find('#billingCountry').val();
        if (country === 'US') {
            addCreditCardForm.find('#billingStatedefault').val(addCreditCardForm.find('#billingStateUS').val());
        } else if (country === 'CA') {
            addCreditCardForm.find('#billingStatedefault').val(addCreditCardForm.find('#billingStateNonUS').val());
        } else {
            var countryWithState = addCreditCardForm.find('#countryWithState').val();
            if (countryWithState.indexOf(country) > -1) {
                addCreditCardForm.find('#billingStatedefault').val(addCreditCardForm.find('#billingStateText').val());
            } else {
                addCreditCardForm.find('#billingStatedefault').val('');
            }
        }
        creditCard.startTokenize(function (result) {
            if (result.error) {
                e.preventDefault();
                $('.loader-preventive').hide();
                return;
            }
            if ($('.spc-billing-same-as-shipping-modal:checkbox:checked').length === 0) {
                updateBillingForm();
            }
            $.ajax({
                url: addCreditCardForm.attr('action'),
                type: 'post',
                dataType: 'json',
                data: addCreditCardForm.serialize(),
                success: function (data) {
                    $('.loader-preventive').hide();
                    if (!data.success) {
                        document.querySelector('#braintreeCreditCardErrorContainer').textContent = data.error;
                    } else {
                        $('#addCardModal').modal('hide');
                        location.reload();
                    }
                },
                error: function (err) {
                    $('.loader-preventive').hide();
                    if (err.responseJSON.redirectUrl) {
                        window.location.href = err.responseJSON.redirectUrl;
                    }
                }
            });
        });
   });

   function updateBillingForm() {
       $('.billing-address-block .billing-address').find('.billingFirstName').val($('#addCardModal .billingFirstName').val());
       $('.billing-address-block .billing-address').find('.billingLastName').val($('#addCardModal .billingLastName').val());
       $('.billing-address-block .billing-address').find('.billingZipCode').val($('#addCardModal .billingZipCode').val());
       $('.billing-address-block .billing-address').find('.billingState').val($('#addCardModal .billingState').val());
       $('.billing-address-block .billing-address').find('.billingAddressCity').val($('#addCardModal .billingAddressCity').val());
       $('.billing-address-block .billing-address').find('.billingAddressOne').val($('#addCardModal .billingAddressOne').val());
       $('.billing-address-block .billing-address').find('.phone').val($('#addCardModal .phone').val());
   }

    if ($applepayContent) {
        applepayHelper.applepayPayment($continueButton);
    }

    if ($venmoContent) {
        venmoPayment.makeVenmoPayment($continueButton);
    }

    if ($googlepayContent || $googlepayOnCart) {
        googlepayPayment.makeGooglepayPayment($continueButton);
    }

    if ($srcContent || $srcOnCart) {
        braintreeSrc.initSrcButton($continueButton);
    }

    $('.payment-options[role=tablist] a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        helper.paymentMethodChangeHandle(e.target);
        const cardList = document.getElementById('braintreeCreditCardList');
        const paypalList = document.getElementById('braintreePaypalAccountsList');
        var changeEvent;

        if (e.target.hash === '#creditcard-content' && cardList) {
            if (typeof (Event) === 'function') {
                changeEvent = new Event('changeEvent');
                cardList.addEventListener('changeEvent', function () {
                    'change';
                }, false);
            } else {
                changeEvent = document.createEvent('Event');
                changeEvent.initEvent('changeEvent', true, true);
            }
            cardList.dispatchEvent(changeEvent);
        } else if (e.target.hash === '#paypal-content' && paypalList) {
            if (typeof (Event) === 'function') {
                changeEvent = new Event('changeEvent');
                paypalList.addEventListener('changeEvent', function () {
                    'change';
                }, false);
            } else {
                changeEvent = document.createEvent('Event');
                changeEvent.initEvent('changeEvent', true, true);
            }
            paypalList.dispatchEvent(changeEvent);
        }
    });

    $('#paymentAccordion').on('click', '.braintreeradios', function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        $('.list-unstyled.card-list').find('.selected-icon').remove();
        $(this).parent().find('.braintreeradios').removeClass('selected');
        $(this).addClass('selected');
        $(this).find('.saved-card-title').append('<span class="selected-icon float-right"><i class="fal fa-check-circle"></i></span>');
        $('#paymentAccordion #braintreeCreditCardList').val($(this).attr('data-val'));
        $('#paymentAccordion .saved-credit-card-list-item').prop('checked', false);
        $(this).parent().find('.saved-credit-card-list-item').prop('checked', true);
        var curVal = $(this).attr('data-val');
        var event = new Event('change');
        var element = document.getElementById("braintreeCreditCardList");
        element.dispatchEvent(event);
        $('#braintreeCreditCardList').find('#'+curVal).attr('selected','selected');
    });


    if ($summaryDetails) {
        $summaryDetails.classList.add('braintree-payment-details');
        //$summaryDetails.classList.remove('payment-details');
    }

   // $('body').on('checkout:updateCheckoutView', helper.updateCheckoutView);

    if ((pageState && pageState === 'cart') &&
        orderStage && orderStage.getAttribute('data-checkout-stage') === 'placeOrder') {
        helper.updatePaymentMethodTab();
        sessionStorage.removeItem('pageState');
    }

    if ($braintreePaypalNonce && $braintreePaypalNonce.value !== '') {
        document.querySelector('.paypal-tab').click();
    }

    if ($braintreeGooglePayNonce && $braintreeGooglePayNonce.value !== '') {
        document.querySelector('.googlepay-tab').click();
    }

    if ($braintreeSrcNonce && $braintreeSrcNonce.value !== '') {
        document.querySelector('.src-tab').click();
    }

    if ($staticPaypalButton) {
        paypalSavedAccountHandler.paypalStaticPdpButtonHandler();
        $staticPaypalButton.addEventListener('click', paypalSavedAccountHandler.staticImageHandler);
    }

    // My account page
    if (document.querySelector('.add-paypal-account')) {
        paypalAccount.initPayPalEvents();
    }
    if (document.querySelector('.add-venmo-account')) {
        venmoAccount.initVenmoEvents();
    }
    if (document.querySelector('.creditCard-accounts')) {
        helper.initCardEvents();
    }

    if (document.querySelector('.paypal-accounts')) {
        paypalAccount.initPaypalButtonsEvents();
    }
    if (document.querySelector('.venmo-accounts')) {
        venmoAccount.initVenmoButtonsEvents();
    }
};
