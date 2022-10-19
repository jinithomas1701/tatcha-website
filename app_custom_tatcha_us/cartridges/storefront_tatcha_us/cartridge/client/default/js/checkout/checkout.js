'use strict';

var customerHelpers = require('base/checkout/customer');
var addressHelpers = require('./address');
var shippingHelpers = require('base/checkout/shipping');
var billingHelpers = require('./billing');
var summaryHelpers = require('base/checkout/summary');
var summaryCustomHelpers = require('./summary');
var formHelpers = require('base/checkout/formErrors');
var promoHelpers = require('./promoErrors');
var paymentHelpers = require('./paymentErrors');
var scrollAnimate = require('base/components/scrollAnimate');
var customerCurHelpers = require('./customer');
var loqate = require('loqate-custom/loqate');
var shippingCustomHelpers = require('./shipping');
var mParticleEventHelper = require('./mParticleEvents');
var util = require('../util');

var bonus = require('../product/base');
bonus.selectBonusProduct();
bonus.addBonusProductsToCart();

/**
 * appends params to a url
 * @param {string} url - Original url
 * @param {Object} params - Parameters to append
 * @returns {string} result url with appended parameters
 */
function appendToUrl(url, params) {
    var newUrl = url;
    newUrl += (newUrl.indexOf('?') !== -1 ? '&' : '?') + Object.keys(params)
        .map(function (key) {
            return key + '=' + encodeURIComponent(params[key]);
        })
        .join('&');

    return newUrl;
}

/**
 * Create the jQuery Checkout Plugin.
 *
 * This jQuery plugin will be registered on the dom element in checkout.isml with the
 * id of "checkout-main".
 *
 * The checkout plugin will handle the different state the user interface is in as the user
 * progresses through the varying forms such as shipping and payment.
 *
 * Billing info and payment info are used a bit synonymously in this code.
 *
 */
(function ($) {
    $.fn.checkout = function () { // eslint-disable-line
        var plugin = this;

        //
        // Collect form data from user input
        //
        var formData = {

            // Shipping Address
            shipping: {},

            // Billing Address
            billing: {},

            // Payment
            payment: {},

            // Gift Codes
            giftCode: {}
        };

        //
        // The different states/stages of checkout
        //
        var checkoutStages = [
            'customer',
            'shipping',
            'payment',
            'placeOrder',
            'submitted'
        ];

        /**
         * Updates the URL to determine stage
         * @param {number} currentStage - The current stage the user is currently on in the checkout
         */
        function updateUrl(currentStage) {
            history.pushState(
                checkoutStages[currentStage],
                document.title,
                location.pathname
                + '?stage='
                + checkoutStages[currentStage]
                + '#'
                + checkoutStages[currentStage]
            );
        }

        //
        // Local member methods of the Checkout plugin
        //
        var members = {

            // initialize the currentStage variable for the first time
            currentStage: 0,

            /**
             * Set or update the checkout stage (AKA the shipping, billing, payment, etc... steps)
             * @returns {Object} a promise
             */
            updateStage: function () {
                var stage = checkoutStages[members.currentStage];
                var defer = $.Deferred(); // eslint-disable-line
                var isValidForm = true;

                // Clear Previous Promo Errors
                promoHelpers.clearPreviousErrors();

                if (stage === 'shipping') {
                    $('.loader-preventive').show();
                    //
                    // Clear Previous Errors
                    //
                    formHelpers.clearPreviousErrors('.shipping-form');

                    //
                    // Submit the Shipping Address Form
                    //
                    var isMultiShip = $('#checkout-main').hasClass('multi-ship');
                    var formSelector = isMultiShip ?
                        '.multi-shipping .active form' : '.single-shipping .shipping-form';
                    var form = $(formSelector);
                    if ($('#addGift:checked').length != 0 && $('.modal-tatcha-gift-message .giftmessage').val().length != 0){
                        $("#giftMessage").val($('.modal-tatcha-gift-message .giftmessage').val());
                    }
                    if (isMultiShip && form.length === 0) {
                        // disable the next:Payment button here
                        $('body').trigger('checkout:disableButton', '.next-step-cta button');
                        // in case the multi ship form is already submitted
                        var url = $('#checkout-main').attr('data-checkout-get-url');
                        $.ajax({
                            url: url,
                            method: 'GET',
                            success: function (data) {
                                // enable the next:Payment button here
                                $('.loader-preventive').hide();
                                $('body').trigger('checkout:enableButton', '.next-step-cta button');
                                if (!data.error) {
                                    $('body').trigger('checkout:updateCheckoutView',
                                        { order: data.order, customer: data.customer });
                                    defer.resolve();
                                } else if (data.message && $('.shipping-error .alert-danger').length < 1) {
                                    var errorMsg = data.message;
                                    var errorHtml = '<div class="alert alert-danger alert-dismissible valid-cart-error ' +
                                        'fade show" role="alert">' +
                                        '<button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
                                        '<span aria-hidden="true">&times;</span>' +
                                        '</button>' + errorMsg + '</div>';
                                    $('.shipping-error').append(errorHtml);
                                    scrollAnimate($('.shipping-error'));
                                    defer.reject();
                                } else if (data.redirectUrl) {
                                    window.location.href = data.redirectUrl;
                                }
                            },
                            error: function () {
                                $('.loader-preventive').hide();
                                // enable the next:Payment button here
                                $('body').trigger('checkout:enableButton', '.next-step-cta button');
                                // Server error submitting form
                                defer.reject();
                            }
                        });
                    } else {
                        if (!$('.login-modal-container').hasClass('show')) {
                            $('.shipping-address-block').find('input, select').each(function () {
                                if (!this.validity.valid) {
                                    $(this).trigger('invalid', this.validity);
                                } else {
                                    $(this).removeClass('is-invalid');
                                    $(this).parent().removeClass('has-error');
                                }
                            });
                            $('.shipping-address-block #shippingStatedefault').removeAttr('required');
                            $('.shipping-address-block #shippingStatedefault').removeClass('is-invalid');
                            if ($('.shipping-address-block').find('.is-invalid') && $('.shipping-address-block').find('.is-invalid').length > 0) {
                                isValidForm = false;
                                $('.enter-address-link').hide();
        		                $('#addressCollapse').addClass('show');
                                $('.loader-preventive').hide();
                            }
                            if ($('.shippingAddressTwo').val() === 'undefined') {
                                $('.shippingAddressTwo').val('');
                            }
                            if (isValidForm) {
                                var country = $('.shippingCountry').val();
                                var stateSelected = '';
                                if(country == 'US'){
                                    stateSelected = $('.shipping-address-block #stateUS').val();
                                } else {
                                    if(country == 'CA'){
                                        stateSelected = $("#stateNonUS").val();
                                    }else{
                                        var countryWithStateInput = $('#countryWithState').val();
                                        if (countryWithStateInput.indexOf(country) > -1) {
                                            stateSelected = $("#stateText").val();
                                        } else {
                                            stateSelected = '';
                                        }
                                    }
                                }
                                $('.shipping-address-block #shippingStatedefault').val(stateSelected);
                                if (country !== 'US') {
                                    $('.contact-shipping #validAddress').val(true);
                                }

                                if ($('.contact-shipping #validAddress') && $('.contact-shipping #validAddress').val() === 'false' && country === 'US') {
                                    var res= loqate.validateAddress({
                                            "Address1": $('.shippingAddressOne').val(),
                                            "Address2": $('.shippingAddressTwo').val(),
                                            "Country": $('.shippingCountry').val(),
                                            "PostalCode": $('.shippingZipCode').val(),
                                            "State": stateSelected,
                                            "City": $('.shippingAddressCity').val()
                                        });
                                        if(res.length > 0) {
                                            $('.loader-preventive').hide();
                                            $('#addressOriginForm').val('');
                                            $(res).modal('show');
                                            $('body').trigger('checkout:disableButton', '.next-step-cta button');
                                            //defer.resolve();
                                        } else {
                                            $('.loader-preventive').hide();
                                            $('.contact-shipping #validAddress').val(true);
                                            $('body').trigger('checkout:enableButton', '.next-step-cta button');
                                            $('.submit-shipping').trigger('click');
                                        }
                                } else if ($('.contact-shipping #validAddress') && $('.contact-shipping #validAddress').val() === 'true') {
                                    var shippingFormData = form.serialize();

                                    $('body').trigger('checkout:serializeShipping', {
                                        form: form,
                                        data: shippingFormData,
                                        callback: function (data) {
                                            shippingFormData = data;
                                        }
                                    });
                                    // disable the next:Payment button here
                                    $('body').trigger('checkout:disableButton', '.next-step-cta button');
                                    $.ajax({
                                        url: form.attr('action'),
                                        type: 'post',
                                        data: shippingFormData,
                                        success: function (data) {
                                             // enable the next:Payment button here
                                            $('.loader-preventive').hide();
                                            if (data.editMode && data.editMode === 'true') {
                                                window.location.href = data.redirectUrl;
                                            } else {
                                                $('body').trigger('checkout:enableButton', '.next-step-cta button');
                                                shippingHelpers.methods.shippingFormResponse(defer, data);
                                                summaryCustomHelpers.updateTaxTBD(data.order.totals);
                                                $('.payment-container .enter-billing-address-link').show();
                                                $('.payment-container #billingaddressCollapse').removeClass('show');
                                                $('.checkout-section .login-text').addClass('d-none');
                                                $('.payment-buttons').addClass('d-none');
                                                if(data.address && data.address.countryCode && data.address.countryCode !="US"){
                                                    $(".customs-warning").removeClass('d-none');
                                                    $(".place-order").removeAttr("disabled");
                                                    $('.afterpay-container').addClass('d-none');
                                                } else {
                                                    $('.afterpay-container').removeClass('d-none');
                                                    $(".customs-warning").addClass('d-none');
                                                    $(".place-order").attr("disabled",true);
                                                    //Update afterpay widget
                                                    $('#current-stage').empty().val('shipping');
                                                    if(data.showAfterpayPayment && (data.order && data.order.priceTotal)){
                                                        var grandTotalSum = data.order.priceTotal.replace(/\$/g, '').trim();
                                                        $('#afterpay-widget-amount').val(grandTotalSum);

                                                        if ('afterpayWidget' in window) {
                                                            afterpayWidget.update({
                                                                amount: {amount: grandTotalSum, currency: 'USD'}
                                                            });
                                                        }
                                                        $('.afterpay-container').removeClass('d-none');
                                                    }else{
                                                        $('.afterpay-container').addClass('d-none');
                                                    }
                                                }

                                                if ($('#isRegistered').val() === 'false') {
                                                    $('.payment-sec').find('.braintree-hosted-fields-iframe-container').show();
                                                    $('.payment-sec').find('#braintreeCardOwner').show();
                                                    $('.payment-sec').find('.braintree-hosted-fields-ph').hide();
                                                }
                                                if ($('.data-checkout-stage').data('customer-type') === 'registered') {
													if ($('.checkout-page #braintreeCreditCardData:checked').length > 0 && $('.checkout-page .radio-payment').hasClass('selected')) {
														$('.checkout-page .radio-payment.selected .checkout-radio').trigger('click');
													}
												}
                                            }
                                        },
                                        error: function (err) {
                                            // enable the next:Payment button here
                                            $('body').trigger('checkout:enableButton', '.next-step-cta button');
                                            if (err.responseJSON && err.responseJSON.redirectUrl) {
                                                window.location.href = err.responseJSON.redirectUrl;
                                            }
                                            // Server error submitting form
                                            defer.reject(err.responseJSON);
                                        }
                                    });
                                } else if ($('.contact-shipping #validCustomer') && $('.contact-shipping #validCustomer').val() === 'true') {
									var shippingFormData = form.serialize();

                                    $('body').trigger('checkout:serializeShipping', {
                                        form: form,
                                        data: shippingFormData,
                                        callback: function (data) {
                                            shippingFormData = data;
                                        }
                                    });
                                    // disable the next:Payment button here
                                    $('body').trigger('checkout:disableButton', '.next-step-cta button');
                                    $.ajax({
                                        url: form.attr('action'),
                                        type: 'post',
                                        data: shippingFormData,
                                        success: function (data) {
                                             // enable the next:Payment button here
                                            $('.loader-preventive').hide();
                                            if (data.editMode && data.editMode === 'true') {
                                                window.location.href = data.redirectUrl;
                                            } else {
                                                $('body').trigger('checkout:enableButton', '.next-step-cta button');
                                                $('.contact-email').text(data.email);
                                                $('.payment-buttons').addClass('d-none');
                                                $('.checkout-section .login-text').addClass('d-none');
                                                $('.afterpay-container').removeClass('d-none');
                                                $(".customs-warning").addClass('d-none');
                                                $(".place-order").attr("disabled",true);
                                                //Update afterpay widget
                                                $('#current-stage').empty().val('shipping');
                                                scrollAnimate($('.payment-form'));
												defer.resolve(data);
												$('#billingCountry').val('US').trigger('change');
												if ($('.data-checkout-stage').data('customer-type') === 'registered') {
													$('.checkout-page #is-CREDIT_CARD').prop('checked', true);
													if ($('.checkout-page #braintreeCreditCardData:checked').length > 0 && $('.checkout-page .radio-payment').hasClass('selected')) {
														$('.checkout-page .radio-payment.selected .checkout-radio').trigger('click');
													}
												}
                                            }
                                        },
                                        error: function (err) {
                                            // enable the next:Payment button here
                                            $('body').trigger('checkout:enableButton', '.next-step-cta button');
                                            if (err.responseJSON && err.responseJSON.redirectUrl) {
                                                window.location.href = err.responseJSON.redirectUrl;
                                            }
                                            // Server error submitting form
                                            defer.reject(err.responseJSON);
                                        }
                                    });
								}

                            	//Add new email to klaviyo Newsletter Subscription List from Checkout start
							   	var addtoemaillistYN = document.getElementById('addtoemaillist');
							    if (addtoemaillistYN.checked == true){
							    	var shippingFormData = form.serialize();
							    	var newsLetterKlaviyoSubscribtionUrl = document.getElementById('newsLetterKlaviyoSubscribtionUrl').value;
							    	$.ajax({
										type: 'post',
										url: newsLetterKlaviyoSubscribtionUrl,
										data: shippingFormData,
										success:function(response) {
										}
									});
							    }
                                // Add new email to klaviyo Newsletter Subscription List from Checkout end

                            }
                        }
                        return defer;
                    }
                } else if (stage === 'payment') {
                    $('.loader-preventive').show();
                    if($('.afterpay-error').length){
                        $('.afterpay-error').hide();
                    }
                    //
                    // Submit the Billing Address Form
                    //
                    var stateField = $('#billingStatedefault').val();


					// International countries with no state needed
                    var billingCountry = $('#billingCountry').val();
                    var stateNeeded = true;
                    if(billingCountry !='US') {
                        var countriesWithState = $('#countryWithState').val();
                        if (countriesWithState.indexOf(billingCountry) == -1) {
                            stateNeeded = false;
                        }
                    }

                    if (stateNeeded && (typeof stateField == 'undefined' || stateField == '')) {
						$('.enter-billing-address-link').hide();
			            $('#billingaddressCollapse').addClass('show');
						$('.stateFieldWrapper').find('select:visible').trigger('focusout');
						$('.stateFieldWrapper').find('input:visible').trigger('focusout');
						$('.loader-preventive').hide();
						paymentHelpers.clearPaymentForm();
						return defer;
					}

                    formHelpers.clearPreviousErrors('.payment-form');

                    var billingAddressForm = $('#dwfrm_billing .billing-address-block :input').serialize();

                    $('body').trigger('checkout:serializeBilling', {
                        form: $('#dwfrm_billing .billing-address-block'),
                        data: billingAddressForm,
                        callback: function (data) {
                            if (data) {
                                billingAddressForm = data;
                            }
                        }
                    });
                    if (!$('#sameasshippingselector').is(':checked')) {
						billingAddressForm += '&' + $('#sameasshippingselector').attr('name') + '=' + false;
					}

                    var activeTabId = $('.tab-pane.active').attr('id');
                    var paymentInfoSelector = '#dwfrm_billing .' + activeTabId + ' .payment-form-fields :input';
                    var paymentInfoForm = $(paymentInfoSelector).serialize();

                    $('body').trigger('checkout:serializeBilling', {
                        form: $(paymentInfoSelector),
                        data: paymentInfoForm,
                        callback: function (data) {
                            if (data) {
                                paymentInfoForm = data;
                            }
                        }
                    });

                    var paymentForm = billingAddressForm + '&' + paymentInfoForm;

                    if ($('.data-checkout-stage').data('customer-type') === 'registered') {
                        // if payment method is credit card
                        if ($('.payment-information').data('payment-method-id') === 'CREDIT_CARD') {
                            if (!($('.payment-information').data('is-new-payment'))) {
                                var cvvCode = $('.saved-payment-instrument.' +
                                    'selected-payment .saved-payment-security-code').val();

                                if (cvvCode === '') {
                                    var cvvElement = $('.saved-payment-instrument.' +
                                        'selected-payment ' +
                                        '.form-control');
                                    cvvElement.addClass('is-invalid');
                                    scrollAnimate(cvvElement);
                                    defer.reject();
                                    return defer;
                                }

                                var $savedPaymentInstrument = $('.saved-payment-instrument' +
                                    '.selected-payment'
                                );

                                paymentForm += '&storedPaymentUUID=' +
                                    $savedPaymentInstrument.data('uuid');

                                paymentForm += '&securityCode=' + cvvCode;
                            }
                        }
                    }
                     // disable the next:Place Order button here
                    $('body').trigger('checkout:disableButton', '.next-step-cta button');

                    $.ajax({
                        url: $('#dwfrm_billing').attr('action'),
                        method: 'POST',
                        data: paymentForm,
                        success: function (data) {
                            $('.loader-preventive').hide();
                             // enable the next:Place Order button here
                            $('body').trigger('checkout:enableButton', '.next-step-cta button');
                            // look for field validation errors
                            if (data.error) {
                                if (data.fieldErrors && data.fieldErrors.length) {
                                    data.fieldErrors.forEach(function (error) {
                                        if (Object.keys(error).length) {
                                            formHelpers.loadFormErrors('.payment-form', error);
                                        }
                                    });
                                }

                                if (data.serverErrors.length) {
                                    data.serverErrors.forEach(function (error) {
                                        $('.error-message').show();
                                        $('.error-message-text').text(error);
                                        scrollAnimate($('.error-message'));
                                    });
                                }

                                if (data.cartError) {
                                    window.location.href = data.redirectUrl;
                                }

                                if ($('.billing-address-block').find('.is-invalid') && $('.billing-address-block').find('.is-invalid').length > 0) {
			                        $('.enter-billing-address-link').hide();
					                $('#billingaddressCollapse').addClass('show');
			                    }

			                    paymentHelpers.clearPaymentForm();

			                    if ($('.data-checkout-stage').data('customer-type') === 'registered') {
									if ($('.checkout-page #braintreeCreditCardData:checked').length > 0 && $('.checkout-page .radio-payment').hasClass('selected')) {
										$('.checkout-page .radio-payment.selected .checkout-radio').trigger('click');
									}
								}

								$('.billing-address').find('input,select').focusout();

                                defer.reject();
                            } else {
                                //
                                // Populate the Address Summary
                                //
                                $('body').trigger('checkout:updateCheckoutView',
                                    { order: data.order, customer: data.customer });

                                if (data.renderedPaymentInstruments) {
                                    $('.stored-payments').empty().html(
                                        data.renderedPaymentInstruments
                                    );
                                }

                                //warning messages
                                if (data.showInternationShipmentMsg === true) {
                                    $('body').trigger('checkout:disableButton', '.next-step-cta button');
                                    $('inter-shipping-msg customs-warning mb-3').removeClass('d-none');
                                } else {
                                    $('body').trigger('checkout:enableButton', '.next-step-cta button');
                                    $('inter-shipping-msg customs-warning mb-3').addClass('d-none');
                                }

                                //AD warning messages
                                if (data.showAdWarning === true) {
                                    $('ad-warning-msg rounded danger-spec').removeClass('d-none');
                                } else {
                                    $('ad-warning-msg rounded danger-spec').addClass('d-none');
                                }

                                if (data.customer.registeredUser
                                    && data.customer.customerPaymentInstruments.length
                                ) {
                                    $('.cancel-new-payment').removeClass('checkout-hidden');
                                }
                                if (!$('.payment-buttons').hasClass('d-none')) {
                                    $('.payment-buttons').addClass('d-none');
                                }

                                //hide promo-code containter for review page
                                $('.promocode-container').addClass('d-none');

                                scrollAnimate();
                                defer.resolve(data);
                                $(".review-summary").removeClass('d-none');
                            }
                        },
                        error: function (err) {
                            $('.loader-preventive').hide();
                            // enable the next:Place Order button here
                            $('body').trigger('checkout:enableButton', '.next-step-cta button');
                            if (err.responseJSON && err.responseJSON.redirectUrl) {
                                window.location.href = err.responseJSON.redirectUrl;
                            }
                        }
                    });

                    return defer;
                } else if (stage === 'placeOrder') {
                    $('.loader-preventive').show();
                    // disable the placeOrder button here
                    $('body').trigger('checkout:disableButton', '.next-step-cta button');
                    $.ajax({
                        url: $('.place-order').data('action'),
                        method: 'POST',
                        success: function (data) {
                         //   $('.loader-preventive').hide();
                            // enable the placeOrder button here
                            $('body').trigger('checkout:enableButton', '.next-step-cta button');

                            //mParticle Event
                            $('body').trigger('checkout:mParticleEvent',
                                { order: data.order, customer: data.customer });

                            if (data.error) {
                                $('.loader-preventive').hide();
                                if (data.cartError) {
                                    window.location.href = data.redirectUrl;
                                    defer.reject();
                                } else if (data.oosStatus) {
                                    window.location.href = '/bag';
                                } else {
                                    // go to appropriate stage and display error message
                                    defer.reject(data);
                                }
                            } else {
                                var redirect = $('<form>')
                                    .appendTo(document.body)
                                    .attr({
                                        method: 'POST',
                                        action: data.continueUrl
                                    });

                                $('<input>')
                                    .appendTo(redirect)
                                    .attr({
                                        name: 'orderID',
                                        value: data.orderID
                                    });

                                $('<input>')
                                    .appendTo(redirect)
                                    .attr({
                                        name: 'orderToken',
                                        value: data.orderToken
                                    });

                                redirect.submit();
                                defer.resolve(data);
                                // var continueUrl = data.continueUrl;
                                // var urlParams = {
                                //     ID: data.orderID,
                                //     token: data.orderToken
                                // };
                                //
                                // continueUrl += (continueUrl.indexOf('?') !== -1 ? '&' : '?') +
                                //     Object.keys(urlParams).map(function (key) {
                                //         return key + '=' + encodeURIComponent(urlParams[key]);
                                //     }).join('&');
                                //
                                // window.location.href = continueUrl;
                                // defer.resolve(data);
                            }
                        },
                        error: function () {
                            $('.loader-preventive').hide();
                            // enable the placeOrder button here
                            $('body').trigger('checkout:enableButton', $('.next-step-cta button'));
                        }
                    });

                    return defer;
                }
                var p = $('<div>').promise(); // eslint-disable-line
                setTimeout(function () {
                    p.done(); // eslint-disable-line
                }, 500);
                return p; // eslint-disable-line
            },

            /**
             * Initialize the checkout stage.
             *
             * TODO: update this to allow stage to be set from server?
             */
            initialize: function () {
                // set the initial state of checkout
                members.currentStage = checkoutStages
                    .indexOf($('.data-checkout-stage').data('checkout-stage'));
                $(plugin).attr('data-checkout-stage', checkoutStages[members.currentStage]);
                $(document).on('change','#internationalDutiesNotification',function(){
                    if($(this).is(':checked') && $('.ad-warning-msg').hasClass('d-none')){
                        $('.place-order').removeAttr('disabled');
                    }
                    else{
                        $('.place-order').attr('disabled','true');
                    }
                });
                if ($('#checkout-main') && $('#checkout-main').attr('data-checkout-stage') && ($('#checkout-main').attr('data-checkout-stage') === 'payment')) {
                    $('.contact-info-submitted.shipping-summary').show();
                    $('.shipping-section.indent-container').hide();
                    $('.payment-sec').show();
                    $('.checkout-page #is-CREDIT_CARD').prop('checked', true);
                }
                /*if ($('#checkout-main') && $('#checkout-main').attr('data-checkout-stage') === 'shipping') {
                    if ($('.after-express-btn') && $('.after-express-btn').hasClass('d-none')) {
                        $('.after-express-btn').removeClass('d-none');
                    }
                }*/

                $('body').on('click', '.submit-customer-login', function (e) {
                    e.preventDefault();
                    members.nextStage();
                });

                $('body').on('click', '.submit-customer', function (e) {
                    e.preventDefault();
                    members.nextStage();
                });

                $('.contact-info-submitted .edit-contact-section', plugin).on('click', function () {
                    $('.loader-preventive').show();
                    promoHelpers.clearPreviousErrors();
                    if (($('.data-checkout-stage') && $('.data-checkout-stage').data('checkout-stage') === 'placeOrder') || window.location.href.indexOf('placeOrder') > -1) {
                        $('#editMode').val('true');
                        $('.submit-shipping').html('Save and Review').attr("aria-label", "Save and Review");
                    }
                    members.gotoStage('shipping');

                    if (!$('.contactCollapseItem').is('visible')) {
                        $('.contactCollapseItem').show();
                        $('#contactCollapse').show();
                    }
                    if ($('.paymentCollapseItem').is('visible')) {
                        $('.paymentCollapseItem').hide();
                    }
                    $('.payment-buttons').removeClass('d-none');
                    $('.checkout-section .login-text').removeClass('d-none');
                    $('.promocode-container').removeClass('d-none');

                    //updating totals
                    var url = $(this).attr('data-action-url');
                    $.ajax({
                        url: url,
                        type: 'get',
                        dataType: 'json',
                        success: function (data) {
                            summaryHelpers.updateTotals(data.order.totals);
                            summaryCustomHelpers.updateTaxTBD(data.order.totals);

                            //afterpay threshold check
                            if(data.showAfterpayPayment){
                                $('.after-express-btn').removeClass('d-none');
                            }else{
                                $('.after-express-btn').addClass('d-none');
                            }

                            //hiding shipping section for paypal orders
                            if(data.order.billing.payment.selectedPaymentInstruments.length == 1 &&
                                (data.order.billing.payment.selectedPaymentInstruments[0].paymentMethod === 'PayPal' || data.order.billing.payment.selectedPaymentInstruments[0].paymentMethod === 'ApplePay')){
                                $('.shipping-form .section-title').addClass('d-none');
                                $('.contact-info-container').addClass('d-none');
                                $('.contact-shipping #validAddress').val(true); //for skipping loqate
                                $('.payment-buttons').addClass('d-none');
                                $('.checkout-section .login-text').addClass('d-none');
                                $('.shipping-address .saved-shipping-details').addClass('d-none');
                                $('.braintree-checkout-buttons-wrap').addClass('d-none');
                            }else{
                                $('.shipping-form .section-title').removeClass('d-none');
                                $('.contact-shipping #validAddress').val(false);
                                $('.contact-info-container').removeClass('d-none');
                                $('.payment-buttons').removeClass('d-none');
                                $('.checkout-section .login-text').removeClass('d-none');
                                $('.shipping-address .saved-shipping-details').removeClass('d-none');
                                $('.braintree-checkout-buttons-wrap').removeClass('d-none');
                            }
                            $('.loader-preventive').hide();
                        }
                    });
                    $('body').trigger('checkout:enableButton', '.next-step-cta button');
                    return false;
                });

                $('.payment-summary .edit-payment-section', plugin).on('click', function () {
                    $('#editMode').val('false');
                    promoHelpers.clearPreviousErrors();
                    $('.submit-shipping').html('CONTINUE TO PAYMENT');
                    $('.promocode-container').removeClass('d-none');
                    $('.checkout-page #is-CREDIT_CARD').prop('checked', true);

                    $('body').trigger('checkout:enableButton', '.next-step-cta button');
                    if ($('.data-checkout-stage').data('customer-type') === 'registered') {
						if ($('.checkout-page #braintreeCreditCardData:checked').length > 0 && $('.checkout-page .radio-payment').hasClass('selected')) {
							setTimeout(function () {
			                    $('.checkout-page .radio-payment .checkout-radio.selected').trigger('click');
                                var selectedVal = $('.checkout-page #braintreeCreditCardData:checked').val();
                                if(selectedVal){
                                    $('#braintreeCreditCardList option[value="'+selectedVal+'"]').prop("selected", true);
                                }
			                }, 0);
						}
					}
                });

                $('input, select').focusout(function() {
                    if ($(this).is(':visible')) {
                        if (!this.validity.valid) {
                            $(this).trigger('invalid', this.validity);
                        } else {
                            $(this).removeClass('is-invalid');
                            $(this).parent().removeClass('invalid-field');
                            $(this).parent().removeClass('has-error');
                            if($(this).hasClass("emailaddress")){
	                            if($('#euCountryYN').val() === 'false'){
									document.getElementById("addtoemaillist").checked = true;
								}
	        				}
                        }
                    }
                });

                $('input, select').focusin(function() {
                    if ($(this).is(':visible')) {
                        $(this).removeClass('is-invalid');
                        $(this).parent().removeClass('invalid-field');
                        $(this).parent().removeClass('has-error');
                        $(this).find('.invalid-feedback').html('');
                    }
                });

                /*
                * Shipping Gift Wrap and Message
                */
                $('#giftMessageModal').on('click', '.modal-tatcha-gift-message-save', function(e){
                    var form  = $('#giftmsg-form');
                    var giftMessage = form.find('textarea').val();
                    var isGiftWrpChecked = $("#addGift").is(":checked");
                    if(!isGiftWrpChecked && ((giftMessage.includes("<script") || (giftMessage.length > 0 && giftMessage.replace(/\s/g, '').length<=0)))) {
                        $('.special-character-validation').show();
                        $('.form-control giftmessage border rounded').addClass('has-error');
                        e.preventDefault();
                    } else {
                        $.ajax({
                            url: $('#giftmsg-form').attr('action'),
                            type: 'post',
                            data: $('#giftmsg-form').serialize(),
                            success: function (data) {
                                if (data.success === true) {

                                    if(data.order.totals && (data.order.totals.totalTax == '$0.00')) {
                                        data.order.totals.totalTax = 'TBD';
                                    }

                                    if(data.order.items.totalQuantity > 1){
                                        	$('#order').text('View Order Summary ('+data.order.items.totalQuantity+ ' items)');
                                        	$('#ordersummary .mobile-order-total-qty').text('View Order Summary ('+data.order.items.totalQuantity+ ' items)');
                                    }else{
                                        	$('#order').text('View Order Summary ('+data.order.items.totalQuantity+ ' item)');
                                        	$('#ordersummary .mobile-order-total-qty').text('View Order Summary ('+data.order.items.totalQuantity+ ' item)');
                                    }
                                    if (($('#addGift:checked').length == 0) && ($('.modal-tatcha-gift-message .giftmessage').val() == '')) {
                                        $('.add-link').html('<u>Add Tatcha Gift Options</u>');
                                        $('.delivery-container .gift-message-container').hide();
                                        $('#giftMessage').val('');
                                        summaryHelpers.updateTotals(data.order.totals);
                                        summaryCustomHelpers.updateOrderProductSummaryInformation(data.order, data.options);
                                    } else if($('.modal-tatcha-gift-message .giftmessage').val() == '') {
                                        $('.add-link').html('<u>Edit Tatcha Gift Options</u>');
                                        $('.delivery-container .gift-message-container').hide();
                                        $('#giftMessage').val('');
                                        summaryHelpers.updateTotals(data.order.totals);
                                        summaryCustomHelpers.updateOrderProductSummaryInformation(data.order, data.options);
                                    } else {
                                        $('.add-link').html('<u>Edit Tatcha Gift Options</u>');
                                        if(giftMessage!='') {
                                            $('#isGift').val(true);
                                            $('#giftMessage').val(giftMessage);
                                            $('.gift-message-container').show();
                                            $('.gift-message-container').find($('.message')).text(giftMessage);
                                        }
                                        summaryHelpers.updateTotals(data.order.totals);
                                        summaryCustomHelpers.updateOrderProductSummaryInformation(data.order, data.options);
                                    }
                                }
                            }
                        });
                        $('#giftMessageModal').modal('hide');
                    }
                });

                var $giftCertCode = $('#giftCertCode');

                $('.checkout-page').on('keyup', '#giftCertCode', function(e) {
                    pasted(e);
                    if($giftCertCode && $giftCertCode.val().length > 0) {
                        $('#add-giftcert').prop('disabled', false);
                        $('#check-giftcert').prop('disabled', false);
                    } else {
                        $('#add-giftcert').prop('disabled', true);
                        $('#check-giftcert').prop('disabled', true);
                    }
                });

                $('.checkout-page').on('paste onpaste', 'input[name$="_giftCertCode"]', function(e) {
                    pasted(e);
                    $('#add-giftcert').prop('disabled', false);
                    $('#check-giftcert').prop('disabled', false);
                  });

                  $(".checkout-page ").bind("paste", 'input[name$="_giftCertCode"]', function(e){
                    pasted(e);
                    $('#add-giftcert').prop('disabled', false);
                    $('#check-giftcert').prop('disabled', false);
                });

                function pasted(e){
                    setTimeout(function(){
                        if(e.target.value){
                            $('#add-giftcert').prop('disabled', false);
                            $('#check-giftcert').prop('disabled', false);
                        }
                    },0);
                }

                $(document).on('show.bs.modal', '#modalCheckoutGiftCertificate' , function () {
                    $('#modalCheckoutGiftCertificate').find('.gift-cert-alert').remove();
                    $('#modalCheckoutGiftCertificate').find('.gift-cert-error').remove();
                    $('#modalCheckoutGiftCertificate').find('input').val('');

                    $('#check-giftcert, #add-giftcert').attr('disabled','true')

                    $('#modalCheckoutGiftCertificate').find('.has-error').removeClass('has-error');
                    $('#modalCheckoutGiftCertificate #dwfrm_billing_giftCertCode-error').remove();
                });

                $(document).on('hide.bs.modal', '#modalCheckoutGiftCertificate' , function () {
                    $('#modalCheckoutGiftCertificate').find('label.input--filled').removeClass('input--filled');
                });

                $('.checkout-page').on('click', '#check-giftcert', function (e) {
                    $.spinner().start();
                    e.preventDefault();
                    $('#modalCheckoutGiftCertificate').find('.gift-cert-error').remove();
                    var $balance = $('.balance')
                    if ($('#giftCertCode').length === 0 || $('#giftCertCode').val().length === 0) {
                        var error = $balance.find('span.error');
                        if (error.length === 0) {
                            error = $('<span>').addClass('error').appendTo($balance);
                        }
                        error.html('<div class="gift-cert-alert alert-text gift-cert-error"><i class="fal fa-exclamation-circle mr-2"></i> <span>'+Resources.GIFT_CERT_MISSING+'</span></div>');
                        $('.gift-cert-alert').show();
                        $.spinner().stop();
                        return;
                    }
                    var url = $('#modalCheckoutGiftCertificate').data('balance');
                    url = url+'?giftCertificateID='+$('#giftCertCode').val();
                    $.ajax({
                        type: 'GET',
                        url: url,
                        success:function(data) {
                            if (!data || !data.giftCertificate) {
                                $balance.html('<div class="gift-cert-alert alert-text gift-cert-error"><i class="fal fa-exclamation-circle mr-2"></i> <span>' + 'Invalid gift certificate code.' + '</span></div>');
                                $('.gift-cert-alert').show();
                                $.spinner().stop();
                                return;
                            }
                            if(data.giftCertificate && data.giftCertificate.balance && data.giftCertificate.balance.indexOf('$')> -1 ){
                              var giftBalance = data.giftCertificate.balance.replace('$', '');
                              $balance.html('<div class="gift-cert-alert success-text gift-cert-success"><i class="fal fa-check-circle"></i> <span>'+ 'This card has '+ giftBalance + ' available.'+'</span></div>');
                              $('.gift-cert-alert').show();
                              $.spinner().stop();
                            }
                        }
                     });
                });

                $('.checkout-page').on('click', '#add-giftcert', function (e) {
                    e.preventDefault();
                    $('.loader-preventive').show();
                    $('#modalCheckoutGiftCertificate').find('.gift-cert-alert').remove();
                    var code = $('#giftCertCode').val(),
                    $error = $('#modalCheckoutGiftCertificate').find('.giftcert-error');
                    if (code.length === 0) {
                        $error.html('<div class="gift-cert-alert alert-text gift-cert-error"><i class="fal fa-exclamation-circle mr-2"></i> <span>'+ 'Please enter a gift certificate code.' +'</span></div>');
                        $('.gift-cert-alert').show();
                        $('.loader-preventive').hide();
                        return;
                    }
                    var url = $('#modalCheckoutGiftCertificate').data('redeem');
                    url = url+'?giftCertCode='+code;
                    var params = {
                            url: url,
                            method: 'GET'
                        };

                    var fail = false;
                    $.ajax(params).done(function (response) {
                        var msg = '';
                        if (!response) {
                            msg = 'Bad response - parser error!';
                            fail = true;
                        } else if (response.success === false) {
                            msg = response.message.split('<').join('&lt;').split('>').join('&gt;');
                            fail = true;
                        }
                        if (fail) {
                            $error.html('<div class="gift-cert-alert alert-text gift-cert-error"><i class="fal fa-exclamation-circle mr-2"></i><span>'+msg+'</span></div>');
                            $('.gift-cert-error').show();
                            $('.loader-preventive').hide();
                        } else {
                            //$.spinner().stop();
                            location.reload();
                        }
                    });
                });

                $('.checkout-page').on('click', '#remove-giftcert', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    $('.loader-preventive').show();
                    var url = $(this).data('url');
                     $.ajax({
                        type: 'GET',
                        url: url,
                        success:function(res) {
                            location.reload();
                        }
                     });
                });

                $('.checkout-page').on('click', '.close-message', function() {
                     var url = $("#removeGiftMessageFromCheckoutUrl").val();
                     $.ajax({
                        type: 'GET',
                        url: url,
                        data: $('#giftmsg-form').serialize(),
                        success:function(res) {
                            $('.gift-message-container').find($('.message')).text('');
                            $('#giftmsg-form').find('textarea').val('');
                            $("#giftMessage").val('');
                            $('.gift-message-container').hide();
                            if ($('#addGift:checked').length == 0 && $('.modal-tatcha-gift-message .giftmessage').val() == '') {
								$('.add-link').html('<u>Add Tatcha Gift Options</u>');
							} else {
								$('.add-link').html('<u>Edit Tatcha Gift Options</u>');
							}
                        }
                     });
                 });

                  //update char count in gift wrap message
                $('#giftMessageModal').on('keydown', 'textarea[data-character-limit]', function (e) {
                    var text = $.trim($(this).val()),
                    charsLimit = $(this).data('character-limit'),
                    charsUsed = text.length;
                    var controlKeys = ['8', '13', '46', '45', '36', '35', '38', '37', '40', '39'];

                    if ((charsUsed >= charsLimit) && (controlKeys.indexOf(e.which.toString()) < 0)) {
                        e.preventDefault();
                    }
                }).on('change keyup mouseup', 'textarea[data-character-limit]', function () {
                    var text = $.trim($(this).val()),
                        charsLimit = $(this).data('character-limit'),
                        charsUsed = text.length,
                        charsRemain = charsLimit - charsUsed;

                    if (charsRemain < 0) {
                        $(this).val(text.slice(0, charsRemain));
                        charsRemain = 0;
                    }

                    $(this).next('div.char-count').find('.char-remain-count').html(charsRemain);
                    $('.ea-char-remain-count').html('you have '+charsRemain+'characters left out of 210');
                    if($('#giftmsg-char-length').length){
                        var charcounttext= $(this).next('div.char-count').text();
                        $('#giftmsg-char-length').text(charcounttext);
                    }
                });

                /*
                * Shipping form Country Change
                */
                $(document).on('change', '#shippingCountrydefault', function(){
                    $('body').trigger('checkout:updateCountry');
                });

                $('.checkout-page').on('click', "a[href='#addressCollapse']", function() {
                    $('.enter-address-link').hide();
                });

                $('.checkout-page').on('click', "a[href='#billingaddressCollapse']", function() {
                    $('.payment-container .enter-billing-address-link').hide();
                });

                $(document).on('change', '#stateUS, #stateNonUS', function(e) {
                    var curId = $(this).attr('id');
                    var stateVal = $('#'+curId).val();
                    $('select[id=curId] option').removeAttr('selected');
                    $('#'+curId).find('option[value="' + stateVal + '"]').attr('selected','selected');
                    $('.shipping-address-block #shippingStatedefault').val(stateVal);
                    shippingHelpers.methods.updateShippingMethodList($(e.currentTarget.form));
                });

                //
                // Handle Payment option selection
                //
                $('input[name$="paymentMethod"]', plugin).on('change', function () {
                    $('.credit-card-form').toggle($(this).val() === 'CREDIT_CARD');
                });

                //
                // Handle Next State button click
                //
                $(plugin).on('click', '.next-step-cta button', function (e) {
                    e.preventDefault();
                    members.nextStage();
                });

                //
                // Handle Edit buttons on shipping and payment summary cards
                //
                $('.customer-summary .edit-button', plugin).on('click', function () {
                    members.gotoStage('customer');
                });

                $('.shipping-summary .edit-button', plugin).on('click', function () {
                    $('.contact-shipping #validAddress').val(false);
                    $('#addressModal #validAddress').val(false);
                    $('.shipping-address-block #editMode').val(true);
                    if (!$('#checkout-main').hasClass('multi-ship')) {
                        $('body').trigger('shipping:selectSingleShipping');
                    }

                    members.gotoStage('shipping');
                    $(".review-summary").addClass('d-none');
                });

                $('.payment-summary .edit-button', plugin).on('click', function () {
                    paymentHelpers.clearPaymentForm();
                    members.gotoStage('payment');
                    $(".review-summary").addClass('d-none');
                });

                //
                // remember stage (e.g. shipping)
                //
                updateUrl(members.currentStage);

                //
                // Listen for foward/back button press and move to correct checkout-stage
                //
                $(window).on('popstate', function (e) {
                    //
                    // Back button when event state less than current state in ordered
                    // checkoutStages array.
                    //
                    if (e.state === null ||
                        checkoutStages.indexOf(e.state) < members.currentStage) {
                        members.handlePrevStage(false);
                    } else if (checkoutStages.indexOf(e.state) > members.currentStage) {
                        // Forward button  pressed
                        members.handleNextStage(false);
                    }
                });

                //
                // Set the form data
                //
                plugin.data('formData', formData);
                var editMode = sessionStorage.getItem("EditMode");
                if (editMode) {
                    $('#editMode').val(editMode);
                    sessionStorage.removeItem('EditMode');
                }
            },

            /**
             * The next checkout state step updates the css for showing correct buttons etc...
             */
            nextStage: function () {
                var promise = members.updateStage();

                promise.done(function () {
                    // Update UI with new stage
                    $('.error-message').hide();
                    members.handleNextStage(true);
                });

                promise.fail(function (data) {
                    // show errors
                    $('.loader-preventive').hide();
                    if (data) {
                        if (data.errorStage) {
                            members.gotoStage(data.errorStage.stage);

                            if (data.errorStage.step === 'billingAddress') {
                                var $billingAddressSameAsShipping = $(
                                    'input[name$="_shippingAddressUseAsBillingAddress"]'
                                );
                                if ($billingAddressSameAsShipping.is(':checked')) {
                                    $billingAddressSameAsShipping.prop('checked', false);
                                }
                            }
                        }

                        if (data.errorMessage) {
                            $('.error-message').show();
                            $('.error-message-text').text(data.errorMessage);
                        }
                    }
                });
            },

            /**
             * The next checkout state step updates the css for showing correct buttons etc...
             *
             * @param {boolean} bPushState - boolean when true pushes state using the history api.
             */
            handleNextStage: function (bPushState) {
                if (members.currentStage < checkoutStages.length - 1) {
                    // move stage forward
                    members.currentStage++;

                    //
                    // show new stage in url (e.g.payment)
                    //
                    if (bPushState) {
                        updateUrl(members.currentStage);
                    }
                }

                // Set the next stage on the DOM
                $(plugin).attr('data-checkout-stage', checkoutStages[members.currentStage]);
            },

            /**
             * Previous State
             */
            handlePrevStage: function () {
                if (members.currentStage > 0) {
                    // move state back
                    members.currentStage--;
                    updateUrl(members.currentStage);
                }

                $(plugin).attr('data-checkout-stage', checkoutStages[members.currentStage]);
            },

            /**
             * Use window history to go to a checkout stage
             * @param {string} stageName - the checkout state to goto
             */
            gotoStage: function (stageName) {
                members.currentStage = checkoutStages.indexOf(stageName);
                updateUrl(members.currentStage);
                $(plugin).attr('data-checkout-stage', checkoutStages[members.currentStage]);
            }
        };

        //
        // Initialize the checkout
        //
        members.initialize();

        return this;
    };
}(jQuery));

// Custom Billing functions
var $billingAddressSameAsShipping = $('input[name$="_shippingAddressUseAsBillingAddress"]');
if ($billingAddressSameAsShipping.is(':checked')) {
    $billingAddressSameAsShipping.parents('form').find('.billing-address').addClass('d-none');
}
$(document).on('click', '#sameasshippingselector', function() {
    var billingAddressDiv = $(this).parents('form').find('.billing-address');
    if($(this).is(':checked')) {
		$('#newAddress').val(false);
        $(billingAddressDiv).addClass('d-none');
    } else {
		$('#newAddress').val(true);
        $(billingAddressDiv).removeClass('d-none');
    }
})

/*
                * Shipping Methods Listeners
                */
$(document).on('click', '#checkout-main .delivery-type input', function(){
    if ($(this).is(':checked')) {
        var shippingMethodName = $(this).val();
        var shippingMethodID = $(this).attr("id");
        $(".shipping-method-option[aria-checked='true']").parents('li').attr('aria-checked',false);
        $(".shipping-method-option[aria-checked='true']").attr('aria-checked',false);
        $(this.nextElementSibling).attr('aria-checked', true);
        $(this.nextElementSibling).parent().attr('aria-checked', true);
        if(shippingMethodName) {
            $(shippingMethodID).attr('checked', true);
        }

    }
});

$(document).on('keydown', '#shipping-method-template .shipping-method-option', function(e){
    if(e.keyCode === 13){
        e.preventDefault();
        $('#shippingMethodRadioButton').trigger('click');

    }
});

$(document).on('click','.address-collapse', function(){
    if ($('.shipping-address').find('.is-invalid') && $('.shipping-address').find('.is-invalid').length > 0) {
        $('.enter-address-link').hide();
        $('#addressCollapse').addClass('show');
    }
});

$(document).on('click','#addaddressModalCollapseLink', function(){
    $(this).hide();
});

function isInViewport() {
    var elem = document.querySelector('.place-order');
    if (elem) {
        var bounding = elem.getBoundingClientRect();
          return (
              bounding.left >= 0 &&
              bounding.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
              bounding.right <= (window.innerWidth || document.documentElement.clientWidth)
          );
    }
}

window.onscroll = function() {
    if (isInViewport()) {
        $('.sticky-place-order-btn').css("opacity",0);
        $('.sticky-place-order-btn').css("z-index",0);
    } else {
        $('.sticky-place-order-btn').css("opacity",1);
        $('.sticky-place-order-btn').css("z-index",1005);
    }
};


$(document).on('keydown', '#checkout-main .delivery-type', function(e){
    if(e.keyCode === 13){
        $(this).find('input').trigger('click');
    }
});

$(document).on('click','#checkout-main .order-summary-heading', function(){
    var newWindowWidth = $(window).width();
        if (newWindowWidth < 1024) {
            $(this).toggleClass('icon-switch')
            $('#orderCollapse').toggleClass('show');
            if($('#orderCollapse').hasClass('show')){
                $('.order-summary-heading').attr('aria-label' ,'expanded')
            }
            else{
                $('.order-summary-heading').attr('aria-label' ,'collapsed')
            }
        }
});

$(document).on('keydown','#checkout-main .order-summary-heading', function(e){
    if(e.keyCode === 13){
        $(this).trigger('click');
    }
});

$(document).on('focusout', '#shipping-sec .phone-tooltip, #addressModal .phone-tooltip', function(e) {
			$(this).tooltip('hide');
});

$(document).on('click', '#is-CREDIT_CARD', function() {
    $('.creditcard-pay').show();
    $('#creditcard-content').addClass('active');
    $('#braintreeCreditCardFieldsContainer #braintreeCardOwner').attr('required', true);
    $("#containerAfterPay").hide();
    $('#afterpay_pbi-content').removeClass('active');
    $("#checkout-gift-card-block").removeClass("afterpay-disabledbutton");
});

$(document).on('click', '#is-AFTERPAY_PBI', function() {
    $("#containerAfterPay").show();
    $('#afterpay_pbi-content').addClass('active');
    $('.creditcard-pay').hide();
    $('#creditcard-content').removeClass('active');
    $('#braintreeCreditCardFieldsContainer #braintreeCardOwner').attr('required', false);
    $("#checkout-gift-card-block").addClass("afterpay-disabledbutton");
});

$(document).on('keydown', '.afterpay-container .afterpay-payment-selector', function(e){
    if(e.keyCode === 13){
        e.preventDefault();
        $('#is-AFTERPAY_PBI').trigger('click');

    }
});

$(document).on('keydown', '.credit-payment .creditcard-payment-selector', function(e){
    if(e.keyCode === 13){
        e.preventDefault();
        $('#is-CREDIT_CARD').trigger('click');

    }
});

$(document).on('click', '.checkout-card-radio-label', function(e) {
   // $('#checkout-container input[name="dwfrm_billing_paymentMethods_selectedPaymentMethodID"]').prop('checked', false);
    //$('#checkout-container #is-CREDIT_CARD').prop('checked', true);
    e.preventDefault();
    $('#checkout-main .creditcard-list-item').prop('checked', false);
    $(this).parent().find('.creditcard-list-item').prop('checked', true);
    $(".radio.checkout-radio-block.radio-payment").removeClass("selected");
    if(!$(this).closest('.radio-payment').hasClass("selected")){
        $(this).closest('.radio-payment').addClass("selected");
    }
    paymentHelpers.clearPaymentForm($(this).attr('data-val'));
});

$(document).on('keydown', '.checkout-card-radio-label', function(e) {
    if(e.keyCode === 13){
        $(this).trigger('click');
    }
});

$('#checkout-main').on('click','.braintree-addcard', function(e) {

    //$('.creditcard-list-item').removeAttr('checked');
    $('.checkout-add-card-modal').addClass('opened');
    paymentHelpers.clearPaymentForm();
    $('#checkout-main #addCardModal').modal('show');

    // $('#addCreditCardForm .invalid-feedback').addClass('d-none');
    $('#addCreditCardForm .braintree-hosted-fields-iframe-container').removeClass('error-text');
    $('#addCreditCardForm .braintree-text-input').removeClass('error-text');
    $('.submit-payment').removeAttr('data-is-allow-submit-form');
});

$(document).on('blur', '#braintreeCardOwner', function(){
    var braintreeCreditCardOwner = $(this).val().trim();
    var regex = /^[A-Za-z ]+$/;
    if ((braintreeCreditCardOwner == '') || (!regex.test(braintreeCreditCardOwner))) {
        if ($('.checkout-add-card-modal').hasClass('opened')) {
            $('.card-owner .invalid-feedback').removeClass('d-none');
            $('.card-owner .invalid-feedback').show();
            if ((braintreeCreditCardOwner !== '') && !regex.test(braintreeCreditCardOwner)) {
                $('.card-owner .invalid-feedback').html('Enter a valid name, Special characters & numbers not allowed');
            } else {
                $('.card-owner .invalid-feedback').html('Please enter your name.');
            }
            $('.card-owner .braintree-text-input').addClass('has-error');
        } else {
            $('.cardowner .invalid-feedback').removeClass('d-none');
            $('.cardowner .invalid-feedback').show();
            if ((braintreeCreditCardOwner !== '') && !regex.test(braintreeCreditCardOwner)) {
                $('.cardowner .invalid-feedback').html('Enter a valid name, Special characters & numbers not allowed');
            } else {
                $('.cardowner .invalid-feedback').html('Please enter your name.');
            }
            $('.cardowner .braintree-text-input').addClass('has-error');
        }
    }
    else{
        $('.card-owner .invalid-feedback').hide();
        $('.card-owner .braintree-text-input').removeClass('error-text');
        $('.cardowner .invalid-feedback').hide();
        $('.cardowner .braintree-text-input').removeClass('error-text');
    }
});

$(document).on('change', '#braintreeCardOwner', function(){
    var braintreeCreditCardOwner=$(this).val().trim();
    if (braintreeCreditCardOwner && braintreeCreditCardOwner != '') {
		var firstName = braintreeCreditCardOwner;
		var lastName = firstName;
		if (firstName && firstName.length > 0 && firstName.split(' ').length > 1) {
		    var a = firstName;
		    var b = a.split(' ');
		    var c = b[0];
		    firstName = c;
		    lastName = a.split(c)[1].trim();
		}
        $('#billingFirstName').val(firstName);
        $('#billingLastName').val(lastName);
    }
});

$('.checkout-add-card-modal .close, .checkout-add-card-modal .cancel-card').on('click', function () {
    var preCard = $('.selected-icon').parent().attr('data-val');
    paymentHelpers.clearPaymentForm(preCard);
});

$(document).on('input','.contact-shipping .shippingPhoneNumber',function(e){
    var countryCode = $('.contact-shipping .shippingCountry').val();
    var phone = $(this).val();
    triggerPhoneEnter('.contact-shipping .shippingPhoneNumber', countryCode, phone )
});
$(document).on('input','.address-content .addModalPhoneNo',function(e){
    var countryCode = $('.address-content .country').val();
    var phone = $(this).val();
    triggerPhoneEnter('.address-content .addModalPhoneNo', countryCode, phone )
});

function triggerPhoneEnter( current , countryCode, phone) {
    if (countryCode == 'US'){
        $(current).val(util.formatUSPhoneNumber(phone));
    }else{
        var currPhone;
        if (phone.charAt(0) === '(') {
            currPhone = phone.substr(1, 3) + phone.substr(5, 3) + phone.substr(9, 4);
        } else {
            currPhone = phone;
        }
        $(current).val(currPhone);
    }
}

$(document).ready(function(e){
    var $phoneEle = $('.confirm-phone');
    $phoneEle.each(function(index){
        $(this).html(util.formatUSPhoneNumber($(this).text().trim()));
    })
});

$(document).on('keydown','.contact-shipping .shippingPhoneNumber, .address-content .addModalPhoneNo',function(e){
    if(e.keyCode == 8){
        var value = $(this).val();
        var myArr = String(value).split("").map((value)=>{
            return Number(value)
        })
        if(!myArr.pop()){
            myArr = value.substring(0, value.length - 1)
            $(this).val(myArr);
        }
    }
});

$(document).on('hide.bs.modal','#addressSuggestionModal',function(){
    $('body').trigger('checkout:enableButton', '.next-step-cta button');
    if($('#addressModal').hasClass('show')){
        $("body").css("overflow","hidden");
        $("#addressModal").css("overflow","auto")
    }
});

$(document).on('hide.bs.modal','#addressModal',function(){
    $("body").css("overflow","auto");
});
/**
 * Function to remove Gwp CouponLineItem
 */
function removeGwpCouponLineItem() {
    var url = $('#gwpbonusModal').data('removecouponlineitem');
    var queryString = '?uuid=' + $('#gwpbonusModal').data('couponlineitemuuid');
    $('.loader-preventive').show();
    $.ajax({
        url: url + queryString,
        method: 'GET',
        dataType: 'json',
        success: function (data) {
            location.reload();
        },
        error: function () {
            $('.loader-preventive').hide();
        }
    });
}

var exports = {
    initialize: function () {
        $('#checkout-main').checkout();
        $('#checkout-main [data-toggle="tooltip"]').tooltip();

        // Call after pay if eligible
        if ( $( "#afterpay-express-button" ).length ) {
            try {
                initAfterpay();
            } catch(err){}
        }

        //initializing afterpay widget
        if ( $( "#afterpay-widget-amount" ).length ) {
            try {
                createAfterpayWidget();
            } catch(err){}
        }
        if ($('#selectedCountry') && $('#selectedCountry').val() && $('#selectedCountry').val().length > 0) {
            $('.shippingCountry').val($('#selectedCountry').val()).trigger('change');
        }
        $('body').trigger('checkout:updateCountry');

        if ($('#checkout-main').attr('data-checkout-stage') === 'payment' && $('#isRegistered').val() === 'false') {
            $('.payment-sec').find('.braintree-hosted-fields-iframe-container').show();
            $('.payment-sec').find('#braintreeCardOwner').show();
            $('.payment-sec').find('.braintree-hosted-fields-ph').hide();
        }
    },

    updateCheckoutView: function () {
        $('body').on('checkout:updateCheckoutView', function (e, data) {
            if (data.csrfToken) {
                $("input[name*='csrf_token']").val(data.csrfToken);
            }
            customerCurHelpers.methods.updateCustomerInformation(data.customer, data.order);
            shippingHelpers.methods.updateMultiShipInformation(data.order);
            summaryHelpers.updateTotals(data.order.totals);
            data.order.shipping.forEach(function (shipping) {
                shippingCustomHelpers.methods.updateShippingInformation(
                    shipping,
                    data.order,
                    data.customer,
                    data.options
                );
            });

            billingHelpers.methods.updatepaymentView();
            billingHelpers.methods.updateBillingInformation(
                data.order,
                data.customer,
                data.options
            );
            billingHelpers.methods.updatePaymentInformation(data.order, data.options);
            summaryCustomHelpers.updateOrderProductSummaryInformation(data.order, data.options);

            //disable continue button if AD is shipping outside US
            if(data.continueDisable){
                $('.ad-warning-shipping').removeClass('d-none');
                $('body').trigger('checkout:disableButton', '.next-step-cta button');
            }else{
                $('.ad-warning-shipping').addClass('d-none');
            }

            //update tax as TBD
            summaryCustomHelpers.updateTaxTBD(data.order.totals);
            //mParticle Event
            $('body').trigger('checkout:mParticleEvent',
                { order: data.order });
        });
    },

    mParticleEvent: function (){
        $('body').on('checkout:mParticleEvent', function (e, data) {
            //mParticle Events populate
            var currentStage = document.getElementById('checkout-main').getAttribute('data-checkout-stage');
            try {
                //getting mParticle data
                var url = $('#mParticleDataUrl').val();
                $.ajax({
                    url: url,
                    method: 'POST',
                    data:{
                        pageContext: 'checkout',
                        pageContextTitle: 'Checkout',
                        checkoutState: currentStage,
                        checkoutMode: 'edit',
                        paymentMethod: (data.order && data.order.billing && data.order.billing.payment && data.order.billing.payment.selectedPaymentInstruments.length) ? data.order.billing.payment.selectedPaymentInstruments[0].paymentMethod : ''
                    },
                    success: function (data) {
                        mParticleEventHelper.methods.populatemParticleEvents(data, currentStage);
                    }
                });
            }catch (err) {
                var error = err;
                console.log(error);
            }
        });
    },
    updateCountry: function () {
        $('body').on('checkout:updateCountry', function (e) {
            switch ($('.shippingCountry').val()) {
                case "US":
                    $('#stateUS').attr('required','');
                    $('#stateText').removeAttr('required');
                    $('#stateNonUS').removeAttr('required');

                    $('#stateUS').show();
                    $('#stateText').hide();
                    $('#stateNonUS').hide();
                    $('.state-label').removeClass('d-none');
                    if ($('.shippingZipCode').parent().hasClass('col-12')) {
                        $('.shippingZipCode').parent().removeClass('col-12').addClass('col-md-6');
                    }
                    $(".shippingPhoneNumber").attr("pattern","^[\\+]?1?[\\s-]?\\(?([2-9][0-9][0-9])\\)?[\\-\\. ]?([0-9][0-9]{2})[\\-\\. ]?([0-9]{4})(\\s*x[0-9]+)?$");
                    $(".shippingZipCode").attr("pattern","^\\d{5}(?:[-\\s]\\d{4})?$");
                    break;
                case "CA":
                    $('#stateText').removeAttr('required');
                    $('#stateUS').removeAttr('required');
                    $('#stateText').hide();
                    $('#stateUS').hide();
                    $('#stateNonUS').attr('required','');
                    $('#stateNonUS').show();
                    $('.state-label').removeClass('d-none');
                    if ($('.shippingZipCode').parent().hasClass('col-12')) {
                        $('.shippingZipCode').parent().removeClass('col-12').addClass('col-md-6');
                    }
                    $(".shippingPhoneNumber").attr("pattern","^[\\+]?1?[\\s-]?\\(?([2-9][0-9][0-9])\\)?[\\-\\. ]?([0-9][0-9]{2})[\\-\\. ]?([0-9]{4})(\\s*x[0-9]+)?$");
                    $(".shippingZipCode").attr("pattern","^[ABCEGHJKLMNPRSTVXY]{1}\\d{1}[A-Z]{1} *(?:\\d{1}[A-Z]{1}\\d{1})?$");
                    break;
                default:
                    var selectedCntry = $('.shippingCountry').val();
                    var countryWithState = $('#countryWithState').val();
                    $('.shipping-address-block #shippingStatedefault').val('');
                    if (countryWithState.indexOf(selectedCntry) > -1) {
                        $('#stateText').show();
                        $('#stateText').attr('required','');
                        $('.state-label').removeClass('d-none');
                        if ($('.shippingZipCode').parent().hasClass('col-12')) {
                            $('.shippingZipCode').parent().removeClass('col-12').addClass('col-md-6');
                        }
                    } else {
                        $('#stateText').hide();
                        $('#stateText').removeAttr('required');
                        $('.state-label').addClass('d-none');
                        $('.invalid-feedback.state-field').html('');
                        if ($('.shippingZipCode').parent().hasClass('col-md-6')) {
                            $('.shippingZipCode').parent().removeClass('col-md-6').addClass('col-12');
                        }
                    }
                    $('#stateUS').removeAttr('required');
                    $('#stateNonUS').removeAttr('required');
                    $('#stateUS').hide();
                    $('#stateNonUS').hide();
                    $(".shippingPhoneNumber").removeAttr("pattern");
                    $(".shippingZipCode").removeAttr("pattern");

                }
                var countryChangeUpdate = true;
                shippingHelpers.methods.updateShippingMethodList($('#shipping-sec'), null, countryChangeUpdate);
        });
    },

    disableButton: function () {
        $('body').on('checkout:disableButton', function (e, button) {
            $(button).prop('disabled', true);
        });
    },

    enableButton: function () {
        $('body').on('checkout:enableButton', function (e, button) {
            $(button).prop('disabled', false);
        });
    },

    checkoutPromoRewards: function () {
        if ($('.promocode-applied').length > 0) {
            $('.promocode-link').hide();
        } else {
            $('.promocode-link').show();
        }
        $('body').on('click', '.promocode-link', function () {
            $(this).hide();
            $(this).closest('form').find('.promocode-form').show();
        });
        $('body').on('keydown', '.promocode-link', function (e) {
            if(e.keyCode === 13){
                $(this).trigger('click');
            }
        });
        $('body').on('submit', '.promo-code-form', function (e) {
            e.preventDefault();
            $('.loader-preventive').show();
	        $('.coupon-missing-error').hide();
	        $('.coupon-error-message').hide();
            var editMode = false;
            if($("body").children(".shipping-address-block")){
                editMode = $(".shipping-address-block").find("input[name=editMode]").val();
                sessionStorage.setItem('EditMode', editMode);
            }
	        if (!$('#promocode').val()) {
	            $('.coupon-missing-error').show();
	            //$.spinner().stop();
                $('.loader-preventive').hide();
	            return false;
	        }
	        var $form = $('.promo-code-form');
	        $.ajax({
	            url: $form.attr('action'),
	            type: 'GET',
	            dataType: 'json',
	            data: $form.serialize(),
	            success: function (data) {
	                if (data.error || (data.valid && data.valid.error)) {
                        $('.loader-preventive').hide();
						$('#promocode').val('');
	                    $('.coupon-error-message .error-text').text(data.errorMessage?data.errorMessage:'This promo code is invalid.');
	                    $('.coupon-error-message').show();
	                } else if (data.gwpPromotion) {
                        $('.loader-preventive').hide();
		                var lidata = {
		                    uuid: data.promotionUUID,
		                    maxItems: data.maxGwpBonusItem
		                };
		                $('#gwpbonusModal #bonus-product-list-options').attr('data-options', JSON.stringify(lidata));
		                $('#gwpbonusModal .modal-title').append(data.promotionName);
		                $('#gwpbonusModal .samples-modal').attr('data-uuid', data.bonusUUID);

		                for (var i = 0; i < data.gwpPromotionHtml.length; i++) {
		                    $('#gwpbonusModal .modal-body-content').append(data.gwpPromotionHtml[i]);
		                }
		                $('#gwpbonusModal .gwp-max-select').append(data.maxGwpBonusItem);

		                $('#gwpbonusModal').data('uuid', data.editGwpProducts.uuid);
		                $('#gwpbonusModal').data('removecouponlineitem', data.actionUrls.removeCouponLineItem);
		                $('#gwpbonusModal').data('couponlineitemuuid', data.editGwpProducts.gwpCouponUUID);

		                $('#gwpbonusModal').modal('show');
		                $('#gwpbonusModal .gwp-max-select').html(data.maxGwpBonusItem);

		                $('#gwpbonusModal').on('hide.bs.modal', function (e) {
		                    removeGwpCouponLineItem();
		                });

		                $('#gwpSampleModal .close').on('click', function (e) {
		                    removeGwpCouponLineItem();
		                });
		            } else {
                        location.reload();
                        var editModeSession = sessionStorage.getItem("EditMode");
                        if($("body").children(".shipping-address-block")){
                            $(".shipping-address-block").find("input[name=editMode]").val(editModeSession);
                        }
                        /*$('.promo-code-form').append(data.totals.checkoutDiscountsHtml);
	                    $('.merc-disc').append(data.totals.checkoutDiscountsTotalHtml);
	                    $('#promocode').val('');
	                    $('.promocode-form').hide();
	                    summaryHelpers.updateTotals(data.totals);
	                    summaryHelpers.updateProductDiscountPrice(data.items);
                        summaryCustomHelpers.updateTaxTBD(data.totals);

                        //afterpay threshold check
                        if(data.showAfterpayPayment){
                            $('.after-express-btn').removeClass('d-none');
                            $('.afterpay-container').removeClass('d-none');
                        }else{
                            $('.after-express-btn').addClass('d-none');
                            $('.afterpay-container').addClass('d-none');
                        }

                        //reloading incase of GC PI
                        if(data.totals && data.totals.gcPIs && data.totals.gcPIs.length){
                            location.reload();
                        }else {
                            $('.loader-preventive').hide();
                        }
                        */
	                }
	            }
	        });
	        return false;
        });
        $('body').on('click', '.promo-close', function (e) {
            e.preventDefault();
            var editMode = false;
            if($("body").children(".shipping-address-block")){
                editMode = $(".shipping-address-block").find("input[name=editMode]").val();
                sessionStorage.setItem('EditMode', editMode);
            }
            var url = $(this).data('action');
            var uuid = $(this).data('uuid');
            var couponCode = $(this).data('code');
            var gwpProduct = $('.edit-gwp').length > 0 ? true : false;
            var urlParams = {
                code: couponCode,
                uuid: uuid
            };
            url = appendToUrl(url, urlParams);
            $('.loader-preventive').show();
            $.ajax({
                url: url,
                type: 'get',
                dataType: 'json',
                success: function (data) {
                    location.reload();
                    var editModeSession = sessionStorage.getItem("EditMode");
                    if($("body").children(".shipping-address-block")){
                        $(".shipping-address-block").find("input[name=editMode]").val(editModeSession);
                    }
                    /*$('.promocode-applied').remove();
                    $('.merc-disc').html('');
                    $('.promocode-link').show();
                    summaryHelpers.updateTotals(data.totals);
                    summaryHelpers.updateProductDiscountPrice(data.items);
                    summaryCustomHelpers.updateTaxTBD(data.totals);

                    //afterpay threshold check
                    if(data.showAfterpayPayment){
                        $('.after-express-btn').removeClass('d-none');
                        $('.afterpay-container').removeClass('d-none');
                    }else{
                        $('.after-express-btn').addClass('d-none');
                        $('.afterpay-container').addClass('d-none');
                    }

                    //reloading incase of GC PI
                    if(data.totals && data.totals.gcPIs && data.totals.gcPIs.length){
                        location.reload();
                    }else {
                        $('.loader-preventive').hide();
                    }

                    if ($('.checkout-page#maincontent').length > 0 && gwpProduct) {
                        var editMode = $('#editMode').val();
                        if (editMode) {
                            sessionStorage.setItem('EditMode', editMode);
                        }
		                location.reload();
		            }*/
                }
            });
        });
        $('body').on('click', '.edit-gwp', function (e) {
		    e.preventDefault();
		    $('.loader-preventive').show();

		    var pids = [];
		    var queryString = '?pids=';
		    $.each($('.gwpProductItem'), function () {
		        pids.push($(this).data('pid'));
		    });

		    queryString += JSON.stringify(pids);
		    queryString += '&gwpUUID=' + $(this).data('uuid');

		    var url = $(this).data('actionurl');

		    $('.loader-preventive').show();
		    $.ajax({
		        url: url + queryString,
		        method: 'POST',
		        success: function (data) {
		            if (data.error) {
		                $('#gwpbonusModal').modal('hide');
		                if ($('.add-to-cart-messages').length === 0) {
		                    $('body').append('<div class="add-to-cart-messages"></div>');
		                }
		                $('.add-to-cart-messages').append(
		                    '<div class="alert alert-danger add-to-basket-alert text-center"'
		                    + ' role="alert">'
		                    + data.errorMessage + '</div>'
		                );
		                setTimeout(function () {
		                    $('.add-to-basket-alert').remove();
		                    location.reload();
		                }, 3000);
		            } else {
		                $('#gwpbonusModal .modal-body-content').children().remove();
		                for (var i = 0; i < data.gwpPromotionHtml.length; i++) {
		                    $('#gwpbonusModal .modal-body-content').append(data.gwpPromotionHtml[i]);
		                }
		                var lidata = {
		                    uuid: data.promotionUUID,
		                    maxItems: data.maxGwpBonusItem
		                };
		                $('#gwpbonusModal #bonus-product-list-options').attr('data-options', JSON.stringify(lidata));
		                $('#gwpbonusModal .modal-title').empty().append(data.promotionName);
		                $('#gwpbonusModal .samples-modal').attr('data-uuid', data.bonusUUID);

		                $('#gwpbonusModal').data('uuid', data.editGwpProducts.uuid);
		                $('#gwpbonusModal').data('removecouponlineitem', data.actionUrls.removeCouponLineItem);
		                $('#gwpbonusModal').data('couponlineitemuuid', data.editGwpProducts.gwpCouponUUID);

		                $('#gwpbonusModal').modal('show');
		                $('#gwpbonusModal .gwp-selected').html(data.editGwpProducts.selectedGwpCount);
		                $('#gwpbonusModal .gwp-max-select').html(data.maxGwpBonusItem);

		                if (data.editGwpProducts.selectedGwpCount >= data.maxGwpBonusItem) {
		                    $('#gwpbonusModal .add-product:not(.active)').addClass('disabled');
		                }
		            }
		            $('.loader-preventive').hide();
		        },
		        error: function () {
		            $('.loader-preventive').hide();
		        }
		    });
		});
    }


};

[customerHelpers, billingHelpers, shippingHelpers, addressHelpers].forEach(function (library) {
    Object.keys(library).forEach(function (item) {
        if (typeof library[item] === 'object') {
            exports[item] = $.extend({}, exports[item], library[item]);
        } else {
            exports[item] = library[item];
        }
    });
});

module.exports = exports;
