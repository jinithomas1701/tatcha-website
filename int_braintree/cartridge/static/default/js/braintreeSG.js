'use strict';

/* global braintreeUtils braintree pageContext $ */
var initbraintreeSG = function() {
	var console = braintreeUtils.console;

	function handleBillingAgreementFlow(config) {
	    if (config.isShippingAddressExist === true) {
	        window.location.href = config.startBillingAgreementCheckoutUrl;
	        return;
	    }
	    var startBillingAgreementCheckoutUrl = config.startBillingAgreementCheckoutUrl;
	    function initEditDefaultShippingAddressForm() {
	        var $form = $('#braintreePaypalEditDefaultShippingAddress');
	        $form.on('click', '.apply-button', function () {
	            if (!$form.valid()) {
	                return false;
	            }
	            var $braintreePDPButton = $('.braitnree-pdp-paypal-button-wrap');
	
	            if ($braintreePDPButton.length && $braintreePDPButton.is(':visible')) {
	                var res = braintreeUtils.pdpOnlickForAsignedPaypalPayment();
	                if (!res) {
	                    throw new Error(res.message || 'Error occurs');
	                }
	            }
	            var applyName = $form.find('.apply-button').attr('name');
	            var options = {
	                url: $form.attr('action'),
	                data: $form.serialize() + '&' + applyName + '=true',
	                type: 'POST'
	            };
	            $.ajax(options).done(function (data) {
	                if (typeof (data) !== 'string') {
	                    if (data.success) {
	                        window.sgDialog.close();
	                        window.location = startBillingAgreementCheckoutUrl;
	                    } else {
	                        return false;
	                    }
	                } else {
	                    $('#dialog-container').html(data);
	                    initEditDefaultShippingAddressForm();
	                }
	                return true;
	            });
	            return false;
	        });
	        $form.on('click', '.cancel-button, .close-button', function () {
	            window.sgDialog.close();
	            return false;
	        });
	        $('#braintreePaypalSelectSavedAddress').change(function () {
	            var data = $(this).val();
	            try {
	                data = JSON.parse(data);
	                for (var name in data) { // eslint-disable-line guard-for-in, no-restricted-syntax
	                    var val = data[name];
	                    if (typeof val === 'string') {
	                        val = val.replace(/\^/g, "'");
	                    }
	                    $('#dwfrm_profile_address_' + name).val(val);
	                }
	            } catch (e) {
	                $form.find('input:text').val('');
	                $form.find('select').val('');
	            }
	        });
	    }
	    window.sgDialog.open({
	        url: config.editShppingAddressUrl,
	        options: {
	            title: config.editShppingAddressPopupTitle,
	            open: initEditDefaultShippingAddressForm
	        }
	    });
	}
	
	function showPdpPaypalButton() {
	    var $miniCartQuantity = parseInt($('.minicart-quantity').text(), 0);
	    var $addToCartButton = $('#add-to-cart');
	    var $braintreePDPButton = $('.braitnree-pdp-paypal-button-wrap');
	
	    if ($addToCartButton.prop('disabled') || $miniCartQuantity > 0) {
	        $braintreePDPButton.hide()
	    } else if(!$braintreePDPButton.is(':visible')) {
	        $braintreePDPButton.show();
	    }
	}
	
	function initCreditCardFields() {
	    $('.js_braintree_creditCardFields').each(function () {
	        var $container = $(this);
	        if ($container.data('isInited')) {
	            return;
	        }
	        var config = $container.data('braintreeConfig');
	        if (typeof config !== 'object' || config === null) {
	            console.error(this, '.js_braintree_creditCardFields has not valid data-braintree-config');
	            return;
	        }
	        braintreeUtils.creditCard.initFields(config, $container);
	        $container.data('isInited', true);
	    });
	}
	
	function initDeviceData() {
	    $('.js_braintree_creditCardFields').each(function () {
	        var $container = $(this);
	        if ($container.data('isInited')) {
	            return;
	        }
	        var config = $container.data('braintreeConfig');
	        if (typeof config !== 'object' || config === null) {
	            console.error(this, '.js_braintree_creditCardFields has not valid data-braintree-config');
	            return;
	        }
	        braintreeUtils.creditCard.initFields(config, $container);
	        $container.data('isInited', true);
	    });
	}
	
	var $applepayElmnt = $(document).find('.js_braintree_applepay_button');
	if($applepayElmnt.length === 0){
		/*
		 * Show paypal btn in 100% width if applepay and afterpay not eligible/not supported
		 * isPaypalOnlyVisible:- this will be false if, afterpay not eligible, bag has only GC
		 * or bag has AD products
		 * **/
		var isPaypalOnlyVisible = $('#isPaypalOnlyVisible').val();
		if(isPaypalOnlyVisible === 'true') {
			$('.braintree-minicart-paypal-buttons-wrap').addClass('minibag-mob-w-100');
		}
	}
	$applepayElmnt.each(function () {
	    var $btn = $(this);
	    if ($btn.data('isInited')) {
	        return;
	    }
	    var config = $btn.data('braintreeConfig');
	    if (typeof config !== 'object' || config === null) {
	        console.error(this, 'not valid data-braintree-config');
	        return;
	    }


	    $btn.on('braintree:deviceNotSupportApplePay', function () {
	        $btn.parents('.js_braintree_applepayButtonsWrap:first').hide();
			console.log('device not support apple pay--');
	        /**
			 * Minicart specific changes for hiding the apple pay button for mobile
			 * **/
	        if($('.minicart-payment-buttons').length > 0) {
	        	$('.minicart-aple-pay-btn').css('display', 'none');
				/*
				 * Show paypal btn in 100% width if applepay and afterpay not eligible/not supported
				 * isPaypalOnlyVisible:- this will be false if, afterpay not eligible, bag has only GC
				 * or bag has AD products
				 * **/
				var isPaypalOnlyVisible = $('#isPaypalOnlyVisible').val();
				if(isPaypalOnlyVisible === 'true') {
					$('.braintree-minicart-paypal-buttons-wrap').addClass('minibag-mob-w-100');
				}

				//$('.minicart-payment-btn-afterpay').addClass('minicart-without-applepay');
				//$('.minicart-payment-btn-paypal').addClass('minicart-without-applepay');

				//$('.braintree-minicart-paypal-buttons-wrap').addClass('minicart-wrap-without-applepay');
				//$('.afterpay-express-button-minibag').addClass('minicart-wrap-without-applepay');

			}
	    });
	    $btn.on('braintree:deviceSupportApplePay', function () {
	        $btn.parents('.js_braintree_applepayButtonsWrap').show();
	        /**Minibag apply pay**/
			$btn.parents('.js_braintree_applepayButtonsWrap').css('display', 'block');
	    });
	    $btn.on('braintree:ApplePayCanNotMakePaymentWithActiveCard', function () {
	        $btn.addClass('js_braintree_applepay_button_disabled');
	    });
	
	    config.isRequiredBillingContactFields = true;
	    config.isRequiredShippingContactFields = true;
	    var applePayIns = braintreeUtils.applePay.init(config, $btn);
	
	    $btn.click(function () {
	        applePayIns.startPayment();
	    });
	
	    $btn.on('braintree:ApplePayPaymentAuthorized', function (e, data) {
	        var postData = {
	            braintreeApplePayBillingAddress: JSON.stringify(data.billingAddress),
	            braintreeApplePayShippingAddress: JSON.stringify(data.shippingAddress),
	            braintreeApplePayNonce: data.nonce
	        };
	        if (config.customFields) {
	            postData.braintreeApplePayCustomFields = JSON.stringify(config.customFields);
	        }
	        applePayIns.loader.show();
	        braintreeUtils.postData(config.returnUrl, postData);
	    });
	
	    $btn.data('isInited', true);
	});
	
	
	function initMiniCartButton (){
	        var $btn = $('.js_braintree_paypal_cart_button');
	        if ($btn.data('isInited')) {
	            return;
	        }
	        var config = $btn.data('braintreeConfig');
	        if (typeof config !== 'object' || config === null) {
	            console.error(this, 'not valid data-braintree-config');
	            return;
	        }
	
	        config.paypalConfig = config.paypalConfig || {};
	
	        if (config.billingAgreementFlow) {
	            var billingAgreementFlowConfig = {
	                isShippingAddressExist: config.billingAgreementFlow.isShippingAddressExist,
	                startBillingAgreementCheckoutUrl: config.billingAgreementFlow.startBillingAgreementCheckoutUrl,
	                editShppingAddressUrl: config.billingAgreementFlow.editShppingAddressUrl,
	                editShppingAddressPopupTitle: config.billingAgreementFlow.editShppingAddressPopupTitle
	            };
	            config.paypalConfig.payment = function () {};
	            if (!config.paypalConfig.style) {
	                config.paypalConfig.style = {
	                    layout: 'horizontal',
	                    label: 'paypal',
	                    maxbuttons: 1,
	                    fundingicons: false,
	                    shape: 'rect',
	                    size: 'medium',
	                    tagline: false
	                };
	            }
	            config.paypalConfig.style.maxbuttons = 1;
	            config.paypalConfig.onAuthorize = function () {};
	            config.paypalConfig.validate = function (actions) {
	                return actions.disable();
	            };
	            config.paypalConfig.onClick = function () {
	                handleBillingAgreementFlow(billingAgreementFlowConfig);
	            };
	            delete config.billingAgreementFlow;
	        }
	
	        config.onTokenizePayment = function (payload, resolve, reject, actions, btnInstance) {
	            var that = btnInstance;
	            var params = btnInstance.params;
	            var postData = {
	                braintreePaypalNonce: payload.nonce
	            };
	
	            if (params.riskData) {
	                postData.riskData = params.riskData;
	            }
	
	            if (payload.details) {
	                var details = payload.details;
	                if (!details.billingAddress) {
	                that.er.show('Merchant PayPal account does not support the Billing Address retrieving. Contact PayPal for details on eligibility and enabling this feature.');
	                reject();
	                return;
	            	details.billingAddress = details.shippingAddress;
	                }
	                var billingAddressData = braintreeUtils.payPal.createBillingAddressData(details.billingAddress, details);
	                postData.braintreePaypalBillingAddress = billingAddressData;
	                var shippingAddressData = details.shippingAddress ? braintreeUtils.payPal.createShippingAddressData(details.shippingAddress, details) : '{}';
	                postData.braintreePaypalShippingAddress = shippingAddressData;
	            }
	
	            if (params.options.flow === 'vault') {
	                postData.braintreeSavePaypalAccount = 'true';
	            }
	
	            if (params.options.offerCredit) {
	                postData.braintreeIsPaypalCredit = 'true';
	            }
	
	            if (params.customFields) {
	                postData.braintreePaypalCustomFields = JSON.stringify(params.customFields);
	            }
	
	            braintreeUtils.postData(params.paypalHandle, postData);
	        };
	
	        braintreeUtils.payPal.init(config, $btn);
	
	        $btn.data('isInited', true);
	}
	
	function initPaypalCartButton () {
	    $('.js_braintree_paypal_cart_button').each(function () {
	        var $btn = $(this);
	        if ($btn.data('isInited')) {
	            return;
	        }
	        var config = $btn.data('braintreeConfig');
	        if (typeof config !== 'object' || config === null) {
	            console.error(this, 'not valid data-braintree-config');
	            return;
	        }
	    
	        config.paypalConfig = config.paypalConfig || {};
	    
	        if (config.billingAgreementFlow) {
	            var billingAgreementFlowConfig = {
	                isShippingAddressExist: config.billingAgreementFlow.isShippingAddressExist,
	                startBillingAgreementCheckoutUrl: config.billingAgreementFlow.startBillingAgreementCheckoutUrl,
	                editShppingAddressUrl: config.billingAgreementFlow.editShppingAddressUrl,
	                editShppingAddressPopupTitle: config.billingAgreementFlow.editShppingAddressPopupTitle
	            };
	            config.paypalConfig.payment = function () {};
	            if (!config.paypalConfig.style) {
	                config.paypalConfig.style = {
	                    layout: 'horizontal',
	                    label: 'paypal',
	                    maxbuttons: 1,
	                    fundingicons: false,
	                    shape: 'rect',
	                    size: 'medium',
	                    tagline: false
	                };
	            }
	            config.paypalConfig.style.maxbuttons = 1;
	            config.paypalConfig.onAuthorize = function () {};
	            config.paypalConfig.validate = function (actions) {
	                return actions.disable();
	            };
	            config.paypalConfig.onClick = function () {
	                handleBillingAgreementFlow(billingAgreementFlowConfig);
	            };
	            delete config.billingAgreementFlow;
	        }
	    
	        config.onTokenizePayment = function (payload, resolve, reject, actions, btnInstance) {
	            var that = btnInstance;
	            var params = btnInstance.params;
	            var postData = {
	                braintreePaypalNonce: payload.nonce
	            };
	    
	            if (params.riskData) {
	                postData.riskData = params.riskData;
	            }
	    
	            if (payload.details) {
	                var details = payload.details;
	                if (!details.billingAddress) {
	                /*that.er.show('Merchant PayPal account does not support the Billing Address retrieving. Contact PayPal for details on eligibility and enabling this feature.');
	                reject();
	                return;*/
	            	details.billingAddress = details.shippingAddress;
	                }
	                var billingAddressData = braintreeUtils.payPal.createBillingAddressData(details.billingAddress, details);
	                postData.braintreePaypalBillingAddress = billingAddressData;
	                var shippingAddressData = details.shippingAddress ? braintreeUtils.payPal.createShippingAddressData(details.shippingAddress, details) : '{}';
	                postData.braintreePaypalShippingAddress = shippingAddressData;
	            }
	    
	            if (params.options.flow === 'vault') {
	                postData.braintreeSavePaypalAccount = 'true';
	            }
	    
	            if (params.options.offerCredit) {
	                postData.braintreeIsPaypalCredit = 'true';
	            }
	    
	            if (params.customFields) {
	                postData.braintreePaypalCustomFields = JSON.stringify(params.customFields);
	            }
	    
	            braintreeUtils.postData(params.paypalHandle, postData);
	        };
	    
	        braintreeUtils.payPal.init(config, $btn);
	    
	        $btn.data('isInited', true);
	    });
	};
	initPaypalCartButton();
	
	if (pageContext.ns === 'checkout') {
	    var $form = $('form[id$="billing"]');
	    var $continueButton = $('button[name$="billing_save"]:last');
	    var $continueButtonWrap = $continueButton.parent();
	    var $selectPaymentMethods = $('[name$="billing_paymentMethods_selectedPaymentMethodID"]');
	
	    if ($('.js_braintree_paypalContent')[0]) {
	        var $paypalContent = $('.js_braintree_paypalContent');
	        var $paypalButton = $('.js_braintree_paypal_billing_button');
	
	        var config = $paypalButton.data('braintreeConfig');
	        if (typeof config !== 'object' || config === null) {
	            console.error($paypalButton[0], 'not valid data-braintree-config');
	        }
	
	        $('#braintreePaypalAccountsList').change(function () {
	            if ($('#braintreePaypalAccountsList').val() === 'newaccount') {
	                $paypalContent.data('paypalIsHideContinueButton', true);
	                $continueButtonWrap.hide();
	                $paypalButton.show();
	            } else {
	                $paypalContent.data('paypalIsHideContinueButton', false);
	                $continueButtonWrap.show();
	                $paypalButton.hide();
	            }
	        });
	
	        braintreeUtils.payPal.initAccountListAndSaveFunctionality();
	
	        config.onTokenizePayment = function (data, resolve, reject, actions, btnInstance) {
	            var params = btnInstance.params;
	            $('input[name=braintreePaypalNonce]').val(data.nonce);
	            $('#braintreePaypalNonce').val(data.nonce);
	            if (data.details) {
	                var details = data.details;
	                $('#braintreePaypalEmail').val(data.details.email);
	                //Show used paypal account and hide paypal button
	                $('#braintreePaypalAccount > option').val(data.details.email).text(data.details.email);
	                $('.js_braintree_paypalContent').data('paypalIsHideContinueButton', false);
	                $('#billingSubmitButton').show();
	
	                if (details.billingAddress && (params.isOverrideBillingAddress || params.isAccountPage)) {
	                    var billingAddressData = braintreeUtils.payPal.createBillingAddressData(details.billingAddress, details);
	                    $('input[name=braintreePaypalBillingAddress]').val(billingAddressData);
	                    $('#braintreePaypalBillingAddress').val(billingAddressData);
	                }
	                if (details.shippingAddress) {
	                    var shippingAddressData = braintreeUtils.payPal.createShippingAddressData(details.shippingAddress, details);
	                    $('input[name=braintreePaypalShippingAddress]').val(shippingAddressData);
	                }
	            }
	            
	            //Update Payment method selection
	            $('.braintree-radio-box').removeClass('selected');
				$('input[name="dwfrm_billing_paymentMethods_selectedPaymentMethodID"]').prop('checked', false);
				$('#is-PayPal').prop('checked', true);
	            
	            HTMLFormElement.prototype.submit.call($form[0]);
	            resolve();
	        };
	
	        var formValidationConrol = function (validateActions, isInitFormChangeEvent) {
	            if ($continueButton.is(':disabled')) {
	                validateActions.disable();
	            } else {
	                validateActions.enable();
	            }
	            if (isInitFormChangeEvent) {
	                $form.on('change keyup focusout', ':input, textarea', function () {
	                    formValidationConrol(validateActions);
	                });
	            }
	        };
	
	        config.paypalConfig = config.paypalConfig || {};
	
	        config.paypalConfig.validate = function (validateActions) {
	            formValidationConrol(validateActions, true);
	        };
	        config.paypalConfig.onClick = function () {
	            if (!$form.valid()) {
	                $('html, body').animate({
	                    scrollTop: $('input.error:first, textarea.error:first').offset().top - 50
	                }, 200);
	            }
	        };
	
	        braintreeUtils.payPal.init(config, $paypalButton);
	    }
	
	    if ($('.js_braintree_venmoContent')[0]) {
	        var $venmoButton = $('.js_braintree_venmo_button');
	        var config = $venmoButton.data('braintreeConfig');
	        var $btVermoAccountsList = $('#braintreeVenmoAccountsList');
	        var $hideVenmoButton = $('.braintree-venmo-pay-button').data('isHideVenmoButton');
	        
	        if (typeof config !== 'object' || config === null) {
	            console.error($venmoButton[0], 'not valid data-braintree-config');
	        }
	        if ($hideVenmoButton && $btVermoAccountsList.val() !== 'newaccount') {
	            $venmoButton.hide();
	        }
	
	        $btVermoAccountsList.change(function () {
	            if ($btVermoAccountsList.val() === 'newaccount') {
	                $continueButtonWrap.hide();
	                $venmoButton.show();
	            } else {
	                $continueButtonWrap.show();
	                $venmoButton.hide();
	            }
	        });
	
	        config.deviceNotSupportVenmo = function () {          
	            $venmoButton.parents('.js_braintree_venmoButtonsWrap:first').hide();
	            $('#is-Venmo').parent().parent().hide(); // Remove the Venmo select payment method radiobutton
	        };
	        config.onTokenizePayment = function (data) {
	            $('#braintreeVenmoNonce').val(data.nonce);
	            $('#braintreeVenmoUserId').val(data.details.username);
	
	            HTMLFormElement.prototype.submit.call($form[0]);
	        };
	
	        config.onClick = function () {
	            if (!$form.valid()) {
	                $('html, body').animate({
	                    scrollTop: $('input.error:first, textarea.error:first').offset().top - 50
	                }, 200);
	                return false;
	            }
	            return true;
	        };
	
	        braintreeUtils.venmo.initAccountListAndSaveFunctionality();
	        braintreeUtils.venmo.init(config, $venmoButton)
	    }
	
	    
	    if ($('.js_braintree_creditCardContent')[0]) {
	        initCreditCardFields();
	        braintreeUtils.creditCard.initCardListAndSaveFunctionality();
	
	        // special fix for jQuery Validation Plugin, which uses property 'form' from an input DOM element for getting access to parent form
	        var formIframes = $form[0].getElementsByTagName('iframe');
	        for (var i = 0; i < formIframes.length; i++) {
	            var iframe = formIframes[i];
	            if (!iframe.form) {
	                iframe.form = $form[0];
	            }
	        }
	
	        $('#braintreeCreditCardList').change(function () {
	            $continueButtonWrap.show();
	        });
	        $('body').on('braintree:3dSecure_content_shown', function () {
	            $continueButtonWrap.hide();
	        });
	
	        $form.submit(function () {
	            var form = this;
	            if ($('[name$="billing_paymentMethods_selectedPaymentMethodID"]:checked').val() !== 'CREDIT_CARD') {
	                return true;
	            }
	            var $creditCardList = $('#braintreeCreditCardList');
	            if ($creditCardList[0] && $creditCardList.val() !== 'newcard') {
	                var selectedCard = braintreeUtils.getSelectedData($creditCardList[0]);
	                $.post($creditCardList.data('getPaymentNonceUrl'), { id: selectedCard['data-id'].value }, function (responce) {
	                    braintreeUtils.creditCard.startTokenize(function (result) {
	                        if (!result.error) {
	                        	if($form.valid() || $form.find('input[name="dwfrm_billing_billingAddress_sameasshipping"]').is(':checked')) {
	                        		$form.find('input[name="dwfrm_billing_save"]').removeAttr('disabled');
	                        		HTMLFormElement.prototype.submit.call(form);
	                        	}
	                        }
	                    }, responce.nonce, form);
	                });
	                return false;
	            }
	            braintreeUtils.creditCard.startTokenize(function (result) {
	                if (!result.error) {
	                	if($form.valid() || $form.find('input[name="dwfrm_billing_billingAddress_sameasshipping"]').is(':checked')) {
	                		$form.find('input[name="dwfrm_billing_save"]').removeAttr('disabled');
	                		HTMLFormElement.prototype.submit.call(form);
	                	}
	                }
	            }, '', form);
	            return false;
	        });
	    }
	    
	    if ($('.js_braintree_devicedataContent')[0]) {
	    	initDeviceData();
	    }
	
	    if ($('.js_braintree_applepayContent')[0]) {
	        var $applePayContent = $('.js_braintree_applepayContent'); // eslint-disable-line no-unused-vars
	
	        var applepayConfig = $applePayButton.data('braintreeConfig');
	        if (typeof applepayConfig !== 'object' || applepayConfig === null) {
	            console.error($applePayButton[0], 'not valid data-braintree-config');
	        }
	
	        $applePayButton.on('braintree:deviceNotSupportApplePay', function () {
	            $applePayButton.parents('.js_braintree_applepayButtonsWrap:first').hide();
	            $('#is-ApplePay').parent().parent().hide(); // Remove the ApplePay select payment method radiobutton
	        });
	        $applePayButton.on('braintree:deviceSupportApplePay', function () {
	            $applePayButton.parents('.js_braintree_applepayButtonsWrap:first').show();
	            $('#is-ApplePay').parent().parent().show(); // Show the ApplePay select payment method radiobutton
	        });
	        $applePayButton.on('braintree:ApplePayCanNotMakePaymentWithActiveCard', function () {
	            $applePayButton.addClass('js_braintree_applepay_button_disabled');
	        });
	
	        var applePayIns = braintreeUtils.applePay.init(applepayConfig, $applePayButton);
	
	        $applePayButton.click(function () {
	            applePayIns.startPayment();
	        });
	
	        $applePayButton.on('braintree:ApplePayPaymentAuthorized', function (e, data) {
	            $('#braintreeApplePayNonce').val(data.nonce);
	            if (applepayConfig.customFields) {
	                $('#braintreeApplePayCustomFields').val(JSON.stringify(applepayConfig.customFields));
	            }
	            $form.submit();
	            applePayIns.loader.show();
	        });
	    }
	
	    function resolvButtonsVisibility(paymentMethodName) { // eslint-disable-line no-inner-declarations
	        var $currentTabContent = $('.js_braintree_paymentContent[data-braintree-method="' + paymentMethodName + '"]');
	        if ($currentTabContent.length) {
	            $continueButtonWrap.toggle(!$currentTabContent.data('paypalIsHideContinueButton'));
	        } else {
	            $continueButtonWrap.show();
	        }
	    }
	    $selectPaymentMethods.change(function (e) {
	        resolvButtonsVisibility($(e.target).val());
	    });
	    resolvButtonsVisibility($('[name$="billing_paymentMethods_selectedPaymentMethodID"]:checked').val());
	}
	
	if (pageContext.ns === 'account' || pageContext.ns === 'checkout') {
	    function initAccountAddCreditCard() { // eslint-disable-line no-inner-declarations
	        initCreditCardFields();
	        $('.js_braintree_addCreditCardForm').submit(function () {
	            var form = this;
	            braintreeUtils.creditCard.startTokenize(function (result) {
	                if (!result.error) {
	                    HTMLFormElement.prototype.submit.call(form);
	                }
	            }, '', form);
	            return false;
	        });
	    }
	    $('.js_braintree_addCreditCartBtn').click(function () {
	        var $btn = $(this);
	        window.sgDialog.open({
	            url: $btn.attr('href'),
	            options: {
	                title: $btn.attr('title'),
	                open: function () {
	                    initAccountAddCreditCard();
	                }
	            }
	        });
	        return false;
	    });
	    if ($('.js_braintree_addCreditCardForm')[0]) {
	        initAccountAddCreditCard();
	    }
	
	    function initAccountAddPaypal() { // eslint-disable-line no-inner-declarations
	        $('.js_braintree_accountPaypalButton').each(function () {
	            var $btn = $(this);
	            if ($btn.data('isInited')) {
	                return;
	            }
	            var config = $btn.data('braintreeConfig'); // eslint-disable-line no-shadow
	            if (typeof config !== 'object' || config === null) {
	                console.error($btn[0], 'not valid data-braintree-config');
	                return;
	            }
	            config.$loaderContainer = $('#braintreePaypalLoader');
	            config.$errorContainer = $('#braintreeFormErrorContainer');
	            config.onTokenizePayment = function (data, resolve, reject, actions, btnInstance) {
	                var params = btnInstance.params; // eslint-disable-line no-unused-vars
	                $('input[name=braintreePaypalNonce]').val(data.nonce);
	                $('#braintreePaypalNonce').val(data.nonce);
	
	                if (data.details) {
	                    var details = data.details;
	                    $('#braintreePaypalEmail').val(data.details.email);
	
	                    if (details.billingAddress) {
	                        var billingAddressData = braintreeUtils.payPal.createBillingAddressData(details.billingAddress, details);
	                        $('input[name=braintreePaypalBillingAddress]').val(billingAddressData);
	                        $('#braintreePaypalBillingAddress').val(billingAddressData);
	                    }
	                    if (details.shippingAddress) {
	                        var shippingAddressData = braintreeUtils.payPal.createShippingAddressData(details.shippingAddress, details);
	                        $('input[name=braintreePaypalShippingAddress]').val(shippingAddressData);
	                    }
	                }
	                if (data.details.email) {
	                    $('.js_braintree_accountPaypalButton').attr('style', 'display: none');
	                    $('.paypal-account-email').text(data.details.email).show();
	                    $('.add-pp-account-btn').removeAttr('disabled');
	                }
	                resolve();
	            };
	            braintreeUtils.payPal.init(config, $btn);
	            $btn.data('isInited', true);
	        });
	    }
	    $('.js_braintree_addPaypalAccountBtn').click(function () {
	        var $btn = $(this);
	        window.sgDialog.open({
	            url: $btn.attr('href'),
	            options: {
	                title: $btn.attr('title'),
	                open: function () {
	                    initAccountAddPaypal();
	                }
	            }
	        });
	        return false;
	    });
	    if ($('.js_braintree_addPaypalAccountForm')[0]) {
	        $('.paypal-account-email').attr('style', 'margin: 10px 0');
	        $('.form-row').attr('style', 'margin: 0');
	        initAccountAddPaypal();
	    }
	
	    if ($('.js_braintree_addVenmoAccountForm')[0]) {
	        initAccountAddVenmo();
	    }
	
	    function initAccountAddVenmo() { // eslint-disable-line no-inner-declarations
	        $('.js_braintree_accountVenmoButton').each(function () {
	            var $btn = $(this);
	            var $btVenmoLoader = $('#braintreeVenmoLoader');
	            var $btFormErrorContainer = $('#braintreeFormErrorContainer');
	            var $buttonSave = $('button[name=save');
	
	            if ($btn.data('isInited')) {
	                return;
	            }
	            var config = $btn.data('braintreeConfig'); // eslint-disable-line no-shadow
	            if (typeof config !== 'object' || config === null) {
	                console.error($btn[0], 'not valid data-braintree-config');
	                return;
	            }
	            config.$loaderContainer = $btVenmoLoader;
	            config.$errorContainer = $btFormErrorContainer;
	            config.deviceNotSupportVenmo = function () {
	                $btFormErrorContainer.text(config.messages.VENMO_BROWSER_NOT_SUPPORTED).show();
	            };
	            config.onTokenizePayment = function (data) {
	                $('.braintree_accountVenmoButton').attr('style', 'filter: grayscale(70%)');
	                $buttonSave.removeAttr('style');
	                $btn.attr('style', 'pointer-events:none');
	
	                $('#braintreeVenmoNonce').val(data.nonce);
	                $btFormErrorContainer.text('').hide();
	                $('#venmoUsername').text(data.details.username);
	
	                $buttonSave.removeAttr('disabled');
	                $('input[type=checkbox]').removeAttr('disabled');
	                $btVenmoLoader.hide();
	            };
	
	            braintreeUtils.venmo.init(config, $btn);
	            $buttonSave.attr('style', 'filter: grayscale(70%)');
	            $btn.data('isInited', true);
	        });
	    }
	    $('.js_braintree_addVenmoAccountBtn').click(function () {
	        var $btn = $(this);
	        window.sgDialog.open({
	            url: $btn.attr('href'),
	            options: {
	                title: $btn.attr('title'),
	                open: function () {
	                    initAccountAddVenmo();
	                }
	            }
	        });
	        return false;
	    });
	}
	
	
	if($('#braintreePaypalNonce').val() !== '') {
	    $('#is-PayPal').click();
	}
}

initbraintreeSG();

window.initbraintreeSG = initbraintreeSG;


