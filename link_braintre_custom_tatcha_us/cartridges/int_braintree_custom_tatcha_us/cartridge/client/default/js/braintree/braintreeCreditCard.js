/* eslint-disable block-scoped-var */
'use strict';
var braintreeUtils = require('./braintreeUtils');
var loaderInstance = require('braintree_base/braintree/loaderHelper');
var creditcardHelper = require('./creditcard/creditcardHelper');

/* global braintreeUtils braintree $ */

var bu = braintreeUtils;
var er = null;
var loader;
var params;
var formId;

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
                return;
            }
            document.querySelector('#braintreeDeviceData').value = data.deviceData;
        });
    }
    loader.show();

    braintree.hostedFields.create({
        authorization: bu.clientToken,
        styles: params.hostedFieldsStyles,
        fields: params.hostedFieldsConfig
    }, function (error, hostedFieldsInstance) {
        loader.hide();
        if (error) {
            er.show(error);
            return;
        }
        params.hostedFieldsInstance = hostedFieldsInstance;
        hostedFieldsInstance.on('validityChange', function () {
            if (params.continueButton && JSON.parse(params.continueButton.getAttribute('data-is-allow-submit-form'))) {
                params.continueButton.setAttribute('data-is-allow-submit-form', false);
            }
        });

        // Remove all the error classes
        hostedFieldsInstance.on('focus', function(event) {
            var field = event.fields[event.emittedBy];
            $(field.container).removeClass('is-invalid');
            $(field.container).removeClass('braintree-hosted-fields-invalid');
            if ($('.checkout-add-card-modal').hasClass('opened')) {
                $('#addCreditCardForm'+' '+'#'+field.container.id).parents('.form-group').find('#invalid-feedback').addClass('d-none');
            } else {
                $('#'+field.container.id).parents('.form-group').find('.invalid-feedback').hide();
            }
            field.container.classList.remove('error-text');
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
                if ($('.checkout-add-card-modal').hasClass('opened')) {
                    $('#addCreditCardForm'+' '+'#'+field.container.id).parents('.form-group').find('#invalid-feedback').removeClass('d-none');
                    $('#addCreditCardForm'+' '+'#'+field.container.id).parents('.form-group').find('.invalid-feedback').show();
                } else {
                    $('#'+field.container.id).parents('.form-group').find('.invalid-feedback').show();
                }
                field.container.classList.add('error-text');
            } else {
                $(field.container).addClass('is-invalid');
                $(field.container).addClass('braintree-hosted-fields-invalid');
                if ($('.checkout-add-card-modal').hasClass('opened')) {
                    $('#addCreditCardForm'+' '+'#'+field.container.id).parents('.form-group').find('#invalid-feedback').removeClass('d-none');
                }
                $('#'+field.container.id).parents('.form-group').find('.invalid-feedback').show();
                field.container.classList.add('error-text');
            }
        });

        hostedFieldsInstance.on('fieldStateChange', function(event) {
        });

        hostedFieldsInstance.on('empty', function (event) {
            if (event.cards.length !== 1) {
                $('.card-image').removeClass().addClass('card-image');
            }
        });

        hostedFieldsInstance.on('cardTypeChange', function (event) {
            // Change card bg depending on card type
            if (event.cards.length === 1) {
                $('.card-image').removeClass().addClass("card-image "+event.cards[0].type);
            }
        });
    });
}

function isFormValid() {
    var $billingAddressBlock;
    if ($('.checkout-add-card-modal').hasClass('opened')) {
        formId = 'addCreditCardForm';
        $billingAddressBlock = $('#addCreditCardForm .billing-address');
    } else {
        formId = 'dwfrm_billing';
        $billingAddressBlock = $('.billing-address-block .billing-address');
    }
    if ($('#addCreditCardFormAccount').length > 0) {
        if(!document.querySelector("#addCreditCardFormAccount").checkValidity()){
           return false;
        }
        $('.loader-preventive').show();
		formId = 'addCreditCardFormAccount';
	}

    if (params && params.data && params.data.amount === 0) {
        er.show('Order total 0 is not allowed for Credit Card');
        return false;
    }

    var hasHostedFieldError = false;
    var $cardOwnerEl = document.querySelector('#'+formId+' ' +'#braintreeCardOwner');
    if ($cardOwnerEl.value.length === 0) {
        $cardOwnerEl.parentNode.classList.add("braintree-hosted-fields-invalid", "has-error", "is-invalid");
       // er.show(params.messages.validation);
        $('#'+formId+' ' +'#braintreeCardOwner').parents().eq(1).next('.invalid-feedback').show();
        hasHostedFieldError = true;
    }

    var $cardNumberEl = $('#'+formId+' ' +'#braintreeCardNumber');
    var $cardExpiryEl = $('#'+formId+' ' +'#braintreeExpirationDate');
    var $cardCvvEl = $('#'+formId+' ' +'#braintreeCvv');

    if(($cardNumberEl.length > 0) && ($cardExpiryEl.length > 0) && ($cardCvvEl.length > 0)){

        if(!$cardNumberEl.hasClass('braintree-hosted-fields-valid')){
            $cardNumberEl.addClass('braintree-hosted-fields-invalid');
            $cardNumberEl.addClass('is-invalid');
            $cardNumberEl.parent().next('.invalid-feedback').show();
            hasHostedFieldError = true;
        }

        if(!$cardExpiryEl.hasClass('braintree-hosted-fields-valid')){
            $cardExpiryEl.addClass('braintree-hosted-fields-invalid');
            $cardExpiryEl.addClass('is-invalid');
            $cardExpiryEl.parent().next('.invalid-feedback').show();
            hasHostedFieldError =  true;
        }

        if(!$cardCvvEl.hasClass('braintree-hosted-fields-valid')){
            $cardCvvEl.addClass('braintree-hosted-fields-invalid');
            $cardCvvEl.addClass('is-invalid');
            $cardCvvEl.parent().next('.invalid-feedback').show();
            hasHostedFieldError =  true;
        }
    }

    var isValidForm = true;
    if(formId == 'dwfrm_billing'){
        var billingform = $('.billing-payment-sec');
        isValidForm = billingform[0].checkValidity();
        if(!isValidForm){
            $('.enter-billing-address-link').hide();
            $('#billingaddressCollapse').addClass('show');
            $('.stateFieldWrapper').find('select:visible').trigger('focusout');
            $('.stateFieldWrapper').find('input:visible').trigger('focusout');
            $('.loader-preventive').hide();
        }
    }

    if(hasHostedFieldError || !isValidForm){
        $('.loader-preventive').hide();
        return false;
    }

    $cardOwnerEl.parentNode.classList.remove('braintree-hosted-fields-invalid');
    er.hide();

    return true;
}

function clearHostedFields() {
    params.hostedFieldsInstance.clear('number');
    params.hostedFieldsInstance.clear('cvv');
    params.hostedFieldsInstance.clear('expirationDate');
}

function check3dSecureAndSubmit(response, startTokenizeCb) {
    if (!response.nonce || response.nonce === 'null') {
        document.querySelector('#braintreeCreditCardNonce').value = 'null';
        startTokenizeCb({
            error: true,
            errorCode: 'nonce_is_null'
        });
        return;
    }
    if (!params.is3dSecureEnabled) {
        document.querySelector('#braintreeCreditCardNonce').value = response.nonce;
        startTokenizeCb({
            error: false,
            errorCode: 'ok'
        });
        return;
    }

    loader.show();

    var billingData = require('./helper').getBillingAddressFormValues();

    braintree.threeDSecure.create({
        authorization: bu.clientToken,
        version: 2
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
        }
        bu.threeDSecure = threeDSecure;
        loader.show();
        threeDSecure.verifyCard({
            amount: params.data.amount,
            nonce: response.nonce,
            bin: response.details ? response.details.bin : '',
            email: document.querySelector('#email').value,
            billingAddress: {
                givenName: billingData.firstName,
                surname: billingData.lastName,
                phoneNumber: billingData.phone,
                streetAddress: billingData.address1,
                extendedAddress: billingData.address2,
                locality: billingData.city,
                region: billingData.stateCode,
                postalCode: billingData.postalCode,
                countryCodeAlpha2: billingData.country
            },
            additionalInformation: params.data.shippingAdditionalInfo,
            onLookupComplete: function (data, next) {
                next();
            }
        }, function (err, data) {
            loader.hide();
            if (err) {
                er.show(err);
                startTokenizeCb({
                    error: true,
                    errorCode: 'bt_3dsecure_verify_error',
                    btError: err
                });
                return;
            }
            if (data.liabilityShifted || params.isSkip3dSecureLiabilityResult) {
                document.querySelector('#braintreeIs3dSecureRequired').value = 'true';
                document.querySelector('#braintreeCreditCardNonce').value = data.nonce;
                startTokenizeCb({
                    error: false,
                    result: 'ok'
                });
                return;
            }
            er.show(params.messages.secure3DFailed);
            startTokenizeCb({
                error: true,
                result: 'secure3DFailed'
            });
            return;
        });
    });
}
/**
 * Creates tokenization options for 'tokenize' function.
 * @returns {Object} Object with tokenization options.
 */
function createTokenizationOptions() {
    var billingData = require('./helper').getBillingAddressFormValues();
    return {
        billingAddress: {
            firstName: decodeURIComponent(billingData.firstName),
            lastName: decodeURIComponent(billingData.lastName),
            streetAddress: decodeURIComponent(billingData.address1),
            extendedAddress: decodeURIComponent(billingData.address2),
            locality: decodeURIComponent(billingData.city),
            region: decodeURIComponent(billingData.stateCode),
            postalCode: decodeURIComponent(billingData.postalCode),
            countryCodeAlpha2: decodeURIComponent(billingData.country)
        }
    };
}

function startTokenize(cb, response) {
    var tokenizationOptions;
    if (response && response.nonce) {
        check3dSecureAndSubmit(response, cb);
        return;
    }
    if (!isFormValid()) {
        $('.loader-preventive').hide();
        cb({
            error: true,
            errorCode: 'fields_not_valid'
        });
        return;
    }
    loader.show();

    tokenizationOptions = createTokenizationOptions();

    params.hostedFieldsInstance.tokenize(tokenizationOptions, function (error, data) {
        loader.hide();
        if (error) {
            $('.loader-preventive').hide();
            er.show(error);
            cb({
                error: true,
                errorCode: 'bt_tokenize_error',
                btError: error
            });
            return;
        }
        if (data.type === 'CreditCard') {
            if ($('.checkout-add-card-modal').hasClass('opened')) {
                formId = 'addCreditCardForm';
            }else {
                formId = 'dwfrm_billing';
            }
            if ($('#addCreditCardFormAccount').length > 0) {
				formId = 'addCreditCardFormAccount';
			}

            document.querySelector('#'+formId+' ' +'#braintreeCardType').value = creditcardHelper.convertCardTypeToDwFormat(data.details.cardType);
            document.querySelector('#'+formId+' ' +'#braintreeCardMaskNumber').value = '************' + data.details.lastFour;
            document.querySelector('#'+formId+' ' +'#braintreeCardExpirationMonth').value = data.details.expirationMonth;
            document.querySelector('#'+formId+' ' +'#braintreeCardExpirationYear').value = data.details.expirationYear.substr(2);
            document.querySelector('#'+formId+' ' +'#braintreeCreditCardNonce').value = data.nonce;
            if (formId === 'addCreditCardForm' || formId === 'addCreditCardFormAccount') {
                document.querySelector('#'+formId+' ' +'#cardOwnerName').value = document.querySelector('#'+formId+' ' +'#braintreeCardOwner').value;
            }

            var creditCardFieldsCardNumber = document.querySelector('input[name=dwfrm_billing_creditCardFields_cardNumber]');
            if (creditCardFieldsCardNumber) {
                creditCardFieldsCardNumber.value = '************' + data.details.lastFour;
            }
            var creditCardFieldsCardNumberAccount = document.querySelector('input[name=dwfrm_creditCard_cardNumber]');
            if (creditCardFieldsCardNumberAccount) {
                creditCardFieldsCardNumberAccount.value = '************' + data.details.lastFour;
            }

            if($('#braintreeCreditCardMakeDefault') && $('#braintreeCreditCardMakeDefault').length > 0) {
                if ($('#braintreeCreditCardMakeDefault').is(':checked')) {
                    $('#braintreeDefaultCard').val(true);
                } else {
                    $('#braintreeDefaultCard').val(false);
                }
            }
            if($('.modal-billing-sec') && $('.modal-billing-sec').length > 0) {
                if ($('.spc-billing-same-as-shipping-modal').is(':checked')) {
                    $('#addCardModal #sameAsShipping').val(true);
                } else {
                    $('#addCardModal #sameAsShipping').val(false);
                }
            }
            /*if($('#addCardModal') && $('#addCardModal').length > 0 && $('#addCardModal .phone') && $('#addCardModal .phone').val().length > 0) {
                var phone = $('#addCardModal .phone').val();
                $('#billingPhoneNo').val(phone);
            }*/


            if($('#braintreeCreditCardMakeDefault') && $('#braintreeCreditCardMakeDefault').length > 0) {
                if ($('#braintreeCreditCardMakeDefault').is(':checked')) {
                    $('#braintreeDefaultCard').val(true);
                } else {
                    $('#braintreeDefaultCard').val(false);
                }
        	}
            if (document.querySelector('.form-group.braintree_used_creditcard_account')) {
                var $cardOwner = document.querySelector('#braintreeCardOwner').getAttribute('data-new-cart-value');
                document.querySelector('#braintreeCardOwnerPh').textContent = $cardOwner;
                document.querySelector('#braintreeCardNumberPh').textContent = '************' + data.details.lastFour;
                document.querySelector('#braintreeCvvPh').textContent = '***';
                document.querySelector('#braintreeExpirationPh').textContent = data.details.expirationMonth + '/' + data.details.expirationYear.substr(2);

                var selectedCard = document.querySelector('#braintreeSessionCreditAccount');
                selectedCard.classList.remove('used-creditcard-account-hide');
                selectedCard.setAttribute('data-number', '************' + data.details.lastFour);
                selectedCard.setAttribute('data-expiration', data.details.expirationMonth + '/' + data.details.expirationYear.substr(2));
                selectedCard.setAttribute('data-type', creditcardHelper.convertCardTypeToDwFormat(data.details.cardType));
                selectedCard.setAttribute('data-owner', $cardOwner);
                selectedCard.setAttribute('data-nonce', data.nonce);
            }
        }
        check3dSecureAndSubmit(data, cb);
    });
}

function init(initParams) {
    params = initParams;
    bu.clientToken = params.clientToken;
}

function initFields(initParams, $container) {
    params = initParams;
    params.$container = $container;

    er = bu.createErrorInstance(document.querySelector('#braintreeCreditCardErrorContainer'), creditcardHelper.creditcardErrorContainer);
    loader = loaderInstance(document.querySelector('#braintreeCreditCardLoader'));
    bu.clientToken = params.clientToken;
    $.extend(bu.messages, params.messages);

    creditcardHelper.cardOwnerEvents();

    function getHostedFieldsStyles() {
        return {
            input: {
                "font-size": "16px",
                "font-weight": "300",
                "font-family": "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue'\", Arial, \"Noto Sans\", sans-serif",
                "line-height": "1.5",
                "color": "#495257",
                "background-color": "#fff",
            },
            "display": "block",
            "width": "100%",
            "line-height": "1.5",
            "color": "#495257",
            "background-color": "#fff",
            "::-webkit-input-placeholder": {"color": "#495257"},
            ":-moz-placeholder": {"color": "#495257"},
            "::-moz-placeholder": {"color": "#495257"},
            ":-ms-input-placeholder": {"color": "#495257"},
            "::placeholder": {"color": "#495257"},
            ':focus': {
                color: 'black'
            },
            '.valid': {
                color: 'black'
            },
            '.invalid': {
                color: '#495257'
            }
        };
    }

    function getHostedFieldsConfig() {
        return {
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
    }

    if (!params.hostedFieldsStyles) {
        params.hostedFieldsStyles = getHostedFieldsStyles();
    }

    params.hostedFieldsConfig = getHostedFieldsConfig();

    $.extend(params.hostedFieldsConfig, params.hostedFieldsAdvancedOptions);

    /*
    * Custom
    * **/
    var containerId = $($container).parents('form').attr('id');
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

module.exports = {
    init,
    initFields,
    startTokenize,
    isFormValid,
    getHostedFieldInstance: function () {
        return params ? params.hostedFieldsInstance : null;
    },
    updateData: function (data) {
        params.data = data;
    },
    clearHostedFields
};
