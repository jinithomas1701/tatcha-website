'use strict';

/* global braintreeUtils braintree $ */

braintreeUtils.creditCard = (function () {
    var bu = braintreeUtils;
    var er = null;
    var loader = null;
    var console = bu.console; // eslint-disable-line no-unused-vars
    var params = {
        hostedFieldsInstance: null
    };

    function createHostedFields() {
        if (params.isFraudToolsEnabled) {
            loader.show();
            braintree.dataCollector.create({
                authorization: bu.clientToken,
                kount: true,
                paypal: false
            }, function (error, data) {
                loader.hide();
                if (error) {
                    console.log(error);
                    return;
                }
                $('#braintreeDeviceData').val(data.deviceData);
            });
        }
        loader.show();

        braintree.hostedFields.create({
            authorization: bu.clientToken,
            styles: params.hostedFieldsStyles,
            fields: params.hostedFieldsConfig,
            onFieldEvent: function (event) {}
        }, function (error, hostedFieldsInstance) {
            loader.hide();
            if (error) {
                er.show(error);
                return;
            }
            
            // Remove all the error classes
            hostedFieldsInstance.on('focus', function(event) {
                var field = event.fields[event.emittedBy];
                $(field.container).removeClass('is-invalid');
                $(field.container).removeClass('braintree-hosted-fields-invalid');
              });
            
            
            hostedFieldsInstance.on('blur', function(event) {
                var field = event.fields[event.emittedBy];
                $(field.container).removeClass('is-invalid');
                if (field.isValid) {
                  $(field.container).removeClass('is-invalid');
                  $(field.container).removeClass('braintree-hosted-fields-invalid');
                } else if (field.isEmpty) {
                  $(field.container).addClass('is-invalid');
                  $(field.container).addClass('braintree-hosted-fields-invalid');
                } else {
                  $(field.container).addClass('is-invalid');
                  $(field.container).addClass('braintree-hosted-fields-invalid');
                }
              });
            hostedFieldsInstance.on('fieldStateChange', function(event) {
              });
            
            hostedFieldsInstance.on('empty', function (event) {
                $('.card-image').removeClass().addClass("card-image");
              });
            
            hostedFieldsInstance.on('cardTypeChange', function (event) {
                // Change card bg depending on card type
                if (event.cards.length === 1) {
                	$('.card-image').removeClass().addClass("card-image "+event.cards[0].type);                	
                }
            });
            
            params.hostedFieldsInstance = hostedFieldsInstance;

            //Fix for Mozzila 70\71 and IE 11, SDK 3.54.0, (SDK create extra inputs for hosted fields)
            var focusInterceptInput = $('.js_braintree_creditCardFields').find(':input.focus-intercept');
            if (focusInterceptInput.length) {
                focusInterceptInput.val('true');
            }
        });
    }

    function setupBankFrame(error, iframe) {
        if (error) {
            er.show(error);
            return;
        }
        $('#braintreeCreditCardFieldsContainer').hide();
        $('#braintreeSaveCardAndDefaultContainer').hide();
        $('#braintree3DSecureContainer').show();
        loader.hide();

        var $bankFrame = $('#braintree3DSecureIframe');
        $bankFrame.html('').append(iframe);
        $('body').trigger('braintree:3dSecure_content_shown');
    }

    function removeBankFrame() {
        $('body').trigger('braintree:3dSecure_content_removed');
    }

    function check3dSecureAndSubmit(nonce, startTokenizeCb, form) {
        if (!nonce || nonce === 'null') {
            $(form).find('#braintreePaymentMethodNonce').val('null');
            startTokenizeCb({
                error: true,
                errorCode: 'nonce_is_null'
            });
            return;
        }
        if (!params.is3dSecureEnabled) {
            $(form).find('#braintreePaymentMethodNonce').val(nonce);
            startTokenizeCb({
                error: false,
                errorCode: 'ok'
            });
            return;
        }

        loader.show();

        braintree.threeDSecure.create({
            authorization: bu.clientToken,
        }, function (error, threeDSecure) {
            loader.hide();
            if (error) {
                er.show(error);
                startTokenizeCb({
                    error: true,
                    errorCode: 'bt_3dsecure_create_error',
                    btError: error
                });
                return;
            } else {
                er.show('');
            }
            bu.threeDSecure = threeDSecure;
            loader.show();
            threeDSecure.verifyCard({
                amount: params.amount,
                nonce: nonce,
                addFrame: setupBankFrame,
                removeFrame: removeBankFrame
            }, function (err, data) {
                loader.hide();
                if (err || !$('form[id$="billing"]').valid()) {
                    err = err || 'invalid billing data';
                    er.show(err);
                    startTokenizeCb({
                        error: true,
                        errorCode: 'bt_3dsecure_verify_error',
                        btError: err
                    });
                    loader.hide();
                    $('#braintreeCreditCardFieldsContainer').show();
                    $('#braintreeSaveCardAndDefaultContainer').show();
                    $('#braintree3DSecureContainer').hide();
                    $('button[name$="billing_save"]:last').parent().show();
                    return;
                }
                if (data.liabilityShifted || params.isSkip3dSecureLiabilityResult) {
                    $('#braintreeIs3dSecureRequired').val('true');
                    $('#braintreePaymentMethodNonce').val(data.nonce);
                    startTokenizeCb({
                        error: false,
                        result: 'ok'
                    });
                    return;
                }
                er.show(params.messages.secure3DFailed);
                startTokenizeCb({
                    error: false,
                    result: 'secure3DFailed'
                });
                return;
            });
        });
    }

    function convertCardTypeToDwFormat(braintreeType) {
        switch (braintreeType) {
            case 'American Express':
                return 'Amex';
            case 'MasterCard':
                return 'Master';
            default:
                return braintreeType;
        }
    }

    function cardOwnerUpdateClasses($cardOwner) {
        if(!$cardOwner) {
            $cardOwner = $('#braintreeCardOwner');
        }
        var value = $cardOwner.val();
        if (value.length <= parseInt($cardOwner.attr('maxlength'), 10) && value.length !== 0) {
            $cardOwner.removeClass('braintree-hosted-fields-invalid');
            $cardOwner.addClass('braintree-hosted-fields-valid');
        } else {
            $cardOwner.removeClass('braintree-hosted-fields-valid');
            $cardOwner.removeClass('braintree-hosted-fields-invalid');
        }
    }

    function isFormValid(form) {
        var $cardOwnerEl = $(form).find('#braintreeCardOwner');
        if ($cardOwnerEl.val().length === 0) {
            $cardOwnerEl.addClass('braintree-hosted-fields-invalid');
            er.show(params.messages.validation);
            return false;
        }
        return true;
    }
    
    function getBillingAddressFromCheckout() {
    	var isCheckoutPage = $('input[name="isCheckoutAddCard"]').val();
    	var isAccountAddCard = $('input[name="isAccountAddCard"]').val();
    	var billingAddress = {};
    	if(isCheckoutPage && isCheckoutPage === 'true') {
    		var addrs = {};
    		if($('.checkout-add-card-modal .same-as-shipping').is(':checked')) {
    			addrs = $('.checkout-add-card-modal .same-as-shipping').data('address');
    			addrs = addrs.replace(/'/g, '\"');
    			addrs = addrs.replace(/\\/g, '');
    			addrs = JSON.parse(addrs);
    		} else {
    			var addressFieldWrap = $('.checkout-add-card-modal').length > 0 ? $('.checkout-add-card-modal') : $('.checkout-billing-address');
    			
    			var selectedAddr =  {
	    			'firstName': addressFieldWrap.find('#dwfrm_billing_billingAddress_addressFields_firstName').val(),
	    			'lastName': addressFieldWrap.find('#dwfrm_billing_billingAddress_addressFields_lastName').val(),
	    			'address1': addressFieldWrap.find('#dwfrm_billing_billingAddress_addressFields_address1').val(),
	    			'address2': addressFieldWrap.find('#dwfrm_billing_billingAddress_addressFields_address2').val(),
	    			'city': addressFieldWrap.find('#dwfrm_billing_billingAddress_addressFields_city').val(),
	    			'stateCode': addressFieldWrap.find('#dwfrm_billing_billingAddress_addressFields_states_state').val(),
	    			'countryCode': addressFieldWrap.find('#dwfrm_billing_billingAddress_addressFields_country').val(),
	    			'postalCode': addressFieldWrap.find('#dwfrm_billing_billingAddress_addressFields_postal').val()
	    		};
    			if(selectedAddr) {
    				addrs = selectedAddr;
    			}
    		}
    		
    		if(addrs) {
    			if(addrs.postal) {
    				addrs.postalCode = addrs.postal;
    			}
    			
    			billingAddress = {
	    			'firstName': addrs.firstName ? addrs.firstName : '',
	    			'lastName': addrs.lastName ? addrs.lastName : '',
	    			'streetAddress': addrs.address1 ? addrs.address1 : '',
	    			'extendedAddress': addrs.address2 ? addrs.address2 : '',
	    			'locality': addrs.city ? addrs.city : '',
	    			'region': addrs.stateCode ? addrs.stateCode : '',
	    			'countryCodeAlpha2': addrs.countryCode ? addrs.countryCode : '',
	    			'postalCode': addrs.postalCode ? addrs.postalCode : ''
	    		};
    		}
    	}
    	
    	if(isAccountAddCard && isAccountAddCard === 'true') {
    		billingAddress =  {
    			'firstName': $('.braintree-account-add-credit-card-content #dwfrm_billing_billingAddress_addressFields_firstName').val(),
    			'lastName': $('.braintree-account-add-credit-card-content #dwfrm_billing_billingAddress_addressFields_lastName').val(),
    			'streetAddress': $('.braintree-account-add-credit-card-content #dwfrm_billing_billingAddress_addressFields_address1').val(),
    			'extendedAddress': $('.braintree-account-add-credit-card-content #dwfrm_billing_billingAddress_addressFields_address2').val(),
    			'locality': $('.braintree-account-add-credit-card-content #dwfrm_billing_billingAddress_addressFields_city').val(),
    			'region': $('.braintree-account-add-credit-card-content #dwfrm_billing_billingAddress_addressFields_states_state').val(),
    			'countryCodeAlpha2': $('.braintree-account-add-credit-card-content #dwfrm_billing_billingAddress_addressFields_country').val(),
    			'postalCode': $('.braintree-account-add-credit-card-content #dwfrm_billing_billingAddress_addressFields_postal').val()
    		};
    	}
    	return billingAddress;
    }

    function startTokenize(cb, nonce, form) {
        if (nonce) {
            check3dSecureAndSubmit(nonce, cb, form);
            return;
        }
        if (!isFormValid(form)) {
            cb({
                error: true,
                errorCode: 'fields_not_valid'
            });
            return;
        }
        loader.show();
        // set the selected billing address
        var billingAddress = getBillingAddressFromCheckout();
        params.hostedFieldsInstance.tokenize({
        	billingAddress: billingAddress
        }, function (error, data) {
            loader.hide();
            if (error) {
                er.show(error);
                cb({
                    error: true,
                    errorCode: 'bt_tokenize_error',
                    btError: error
                });
                return;
            }
            if(billingAddress) {
            	var isCheckoutPage = $('input[name="isCheckoutAddCard"]').val();
            	var isAccountAddCard = $('input[name="isAccountAddCard"]').val();
            	
            	if(isCheckoutPage && isCheckoutPage === 'true') {
            		$('.js_braintree_creditCardFields #firstName').val(billingAddress.firstName);
                	$('.js_braintree_creditCardFields #lastName').val(billingAddress.lastName);
                	$('.js_braintree_creditCardFields #streetAddress').val(billingAddress.streetAddress);
                	$('.js_braintree_creditCardFields #extendedAddress').val(billingAddress.extendedAddress);
                	$('.js_braintree_creditCardFields #locality').val(billingAddress.locality);
                	$('.js_braintree_creditCardFields #region').val(billingAddress.region);
                	$('.js_braintree_creditCardFields #countryCodeAlpha2').val(billingAddress.countryCodeAlpha2);
                	$('.js_braintree_creditCardFields #postalCode').val(billingAddress.postalCode);
                	
                	
            	} else if(isAccountAddCard && isAccountAddCard === 'true') {
            		$('.braintree-account-add-credit-card-content #firstName').val(billingAddress.firstName);
                	$('.braintree-account-add-credit-card-content #lastName').val(billingAddress.lastName);
                	$('.braintree-account-add-credit-card-content #streetAddress').val(billingAddress.streetAddress);
                	$('.braintree-account-add-credit-card-content #extendedAddress').val(billingAddress.extendedAddress);
                	$('.braintree-account-add-credit-card-content #locality').val(billingAddress.locality);
                	$('.braintree-account-add-credit-card-content #region').val(billingAddress.region);
                	$('.braintree-account-add-credit-card-content #countryCodeAlpha2').val(billingAddress.countryCodeAlpha2);
                	$('.braintree-account-add-credit-card-content #postalCode').val(billingAddress.postalCode);
            	}
            	
            }
            if($('#braintreeCreditCardMakeDefault').length > 0) {
        		var isCardDefault = $('#braintreeCreditCardMakeDefault').is(':checked');
            	$('#braintreeCreditCardMakeDefault').val(isCardDefault);
        	}
            
            if (data.type === 'CreditCard') {
                $('#braintreeCardType').val(convertCardTypeToDwFormat(data.details.cardType));
                $('#braintreeCardMaskNumber').val('**************' + data.details.lastTwo);
            }
            check3dSecureAndSubmit(data.nonce, cb, form);
        });
    }

    function initCardListAndSaveFunctionality() {
        var $creditCardList = $('#braintreeCreditCardList');
        var $cardOwnerPh = $('#braintreeCardOwnerPh');
        var $cardOwner = $('#braintreeCardOwner');
        var $cardNumbeber = $('#braintreeCardNumber');
        var $cardNumbeberPh = $('#braintreeCardNumberPh');
        var $cardCvv = $('#braintreeCvv');
        var $cardCvvPh = $('#braintreeCvvPh');
        var $cardExpiration = $('#braintreeExpirationDate');
        var $cardExpirationPh = $('#braintreeExpirationPh');
        var $braintreeSaveCardContainer = $('#braintreeSaveCardContainer');
        var $creditCardMakeDefault = $('#braintreeCreditCardMakeDefault');
        var $saveCreditCard = $('#braintreeSaveCreditCard');

        $saveCreditCard.change(function () {
            if ($saveCreditCard[0].checked) {
                $creditCardMakeDefault[0].disabled = false;
                //$creditCardMakeDefault[0].checked = true;
            } else {
                $creditCardMakeDefault[0].disabled = true;
                $creditCardMakeDefault[0].checked = false;
            }
        });

        function cardListChange() {
            $('#braintreeCreditCardFieldsContainer').show();
            $('#braintree3DSecureContainer').hide();
            er.show('');
            if (!$creditCardList.length || $creditCardList.val() === 'newcard') {
                $('#braintreeSaveCardAndDefaultContainer').show();
                $cardNumbeberPh.hide();
                $cardExpirationPh.hide();
                $cardCvvPh.hide();
                $cardOwnerPh.hide();
                $cardOwner.val($cardOwner[0].attributes['data-init-value'].value);
                $cardOwner[0].attributes['data-init-value'].value = '';
                $cardOwner.trigger('change');
                $cardOwner.show();
                $cardOwner.removeClass('braintree-hosted-fields-invalid');
                $cardNumbeber.removeClass('braintree-hosted-fields-invalid');
                $cardCvv.removeClass('braintree-hosted-fields-invalid');
                $cardExpiration.removeClass('braintree-hosted-fields-invalid');
                $cardOwner[0].disabled = false;
                $cardCvv.show();
                $cardNumbeber.show();
                $cardExpiration.show();
                if ($braintreeSaveCardContainer.length) {
                    $braintreeSaveCardContainer.show();
                    $saveCreditCard[0].checked = true;
                    $saveCreditCard[0].disabled = false;
                }
                if ($creditCardMakeDefault.length) {
                    $creditCardMakeDefault[0].disabled = false;
                }
                cardOwnerUpdateClasses();
            } else {
                var selectedCard = bu.getSelectedData($creditCardList[0]);
                $cardNumbeberPh.html(selectedCard['data-number'].value);
                $cardCvvPh.html('***');
                $cardExpirationPh.html(selectedCard['data-expiration'].value);
                $cardOwnerPh.html(selectedCard['data-owner'].value);
                $cardOwner.val(selectedCard['data-owner'].value);
                $cardOwner.trigger('change');
                $('#braintreeCardType').val(selectedCard['data-type'].value);
                $('#braintreeCardMaskNumber').val(selectedCard['data-number'].value);
                $cardNumbeberPh.show();
                $cardExpirationPh.show();
                $cardCvvPh.show();
                $cardOwnerPh.show();
                $cardOwner.hide();
                if ($creditCardMakeDefault.length) {
                    if (selectedCard['data-default'].value === 'true') {
                        $creditCardMakeDefault[0].disabled = true;
                    } else {
                        $creditCardMakeDefault[0].disabled = false;
                    }
                    //$creditCardMakeDefault[0].checked = true;
                }
                $cardOwner[0].disabled = true;
                $cardCvv.hide();
                $cardNumbeber.hide();
                $cardExpiration.hide();
                if ($braintreeSaveCardContainer.length) {
                    $saveCreditCard[0].checked = false;
                    $braintreeSaveCardContainer.hide();
                }
            }
        }
        $creditCardList.change(cardListChange);
        cardListChange();
    }

    function init(initParams) {
        params = initParams;
        bu.clientToken = params.clientToken;
    }

    function initFields(initParams, $container) {
        params = initParams;
        params.$container = $container;
        
    	er = bu.createErrorInstance($container.find('#braintreeCreditCardErrorContainer')[0], function (errorIns, errorData) {
            var error = errorData;
            $('.loader-preventive').hide();
            if (error.details && error.details.invalidFieldKeys) {
                for (var i = 0; i < error.details.invalidFieldKeys.length; i++) {
                    var key = error.details.invalidFieldKeys[i];
                    if (key === 'number') {
                    	$container.find('#braintreeCardNumber').addClass('braintree-hosted-fields-invalid');
                    }
                    if (key === 'cvv') {
                    	$container.find('#braintreeCvv').addClass('braintree-hosted-fields-invalid');
                    }
                    if (key === 'expirationDate') {
                    	$container.find('#braintreeExpirationDate').addClass('braintree-hosted-fields-invalid');
                    }
                }
            }
            if (error.code === 'HOSTED_FIELDS_FIELDS_EMPTY') {
            	$container.find('#braintreeCardNumber, #braintreeCvv, #braintreeExpirationDate').addClass('braintree-hosted-fields-invalid');
            }
        });
        loader = bu.createLoaderInstance($container.find('#braintreeCreditCardLoader')[0]);

        bu.clientToken = params.clientToken;
        $.extend(bu.messages, params.messages);

        var $cardOwner = $container.find('#braintreeCardOwner');
        $cardOwner.focus(function () {
            $cardOwner.parent().addClass('braintree-hosted-fields-focused');
        });
        $cardOwner.blur(function () {
            $cardOwner.parent().removeClass('braintree-hosted-fields-focused');
        });
        $cardOwner.keyup(function () { 
            cardOwnerUpdateClasses($(this));
        });
        $cardOwner.change(function () { 
            cardOwnerUpdateClasses($(this));
        });

        if (!params.hostedFieldsStyles) {
            params.hostedFieldsStyles = {
                input: {
                    'font-size': '12px',
                    color: '#b7802a'
                },
                ':focus': {
                    color: 'blue'
                },
                '.valid': {
                    color: 'green'
                },
                '.invalid': {
                    color: 'red'
                }
            };
        }

        params.hostedFieldsConfig = {
            number: {
                selector: '#braintreeCardNumber'
            },
            cvv: {
                selector: '#braintreeCvv'
            },
            expirationDate: {
                selector: '#braintreeExpirationDate'
            }
        };

        $.extend(params.hostedFieldsConfig, params.hostedFieldsAdvancedOptions);
        
        //Overwrite field id based on parent form
        var containerId = $container.parents('form').attr('id');
        params.hostedFieldsConfig = {
            number: {
                selector: '#'+containerId+' #braintreeCardNumber',
                placeholder: "Card Number*"
            },
            cvv: {
                selector: '#'+containerId+' #braintreeCvv',
                placeholder: "Security Code*"
            },
            expirationDate: {
                selector: '#'+containerId+' #braintreeExpirationDate',
                placeholder: "(MM/YY)*"
            }
        };

        createHostedFields();
    }

    return {
        init: init,
        initFields: initFields,
        initCardListAndSaveFunctionality: initCardListAndSaveFunctionality,
        startTokenize: startTokenize,
        config: params,
        updateAmount: function (amount) {
            params.amount = amount;
        }
    };
}());
