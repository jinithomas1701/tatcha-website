/* eslint-disable block-scoped-var */
'use strict';
var braintreeUtils = require('./braintreeUtils');
var loaderInstance = require('./loaderHelper');
var creditcardHelper = require('./creditcard/creditcardHelper');

/* global braintreeUtils braintree $ */

var bu = braintreeUtils;
var er = null;
var loader;
var params;

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
    });
}

function isFormValid() {
    if (params.data && params.data.amount === 0) {
        er.show('Order total 0 is not allowed for Credit Card');
        return false;
    }
    var $cardOwnerEl = document.querySelector('#braintreeCardOwner');
    if ($cardOwnerEl.value.length === 0) {
        $cardOwnerEl.parentNode.classList.add('braintree-hosted-fields-invalid');
        er.show(params.messages.validation);
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
            firstName: billingData.firstName,
            lastName: billingData.lastName,
            streetAddress: billingData.address1.split('%20').join(' '),
            extendedAddress: billingData.address2 ? billingData.address2.split('%20').join(' ') : billingData.address2,
            locality: billingData.city.includes('%20') ? billingData.city.split('%20').join(' ') : billingData.city,
            region: billingData.stateCode,
            postalCode: billingData.postalCode,
            countryCodeAlpha2: billingData.country.includes('$20') ? billingData.country.split('%20').join(' ') : billingData.country
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
        cb({
            error: true,
            errorCode: 'fields_not_valid'
        });
        return;
    }
    loader.show();

    if ($('#dwfrm_billing').length > 0) {
        tokenizationOptions = createTokenizationOptions();
    } else {
        tokenizationOptions = {};
    }

    params.hostedFieldsInstance.tokenize(tokenizationOptions, function (error, data) {
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
        if (data.type === 'CreditCard') {
            document.querySelector('#braintreeCardType').value = creditcardHelper.convertCardTypeToDwFormat(data.details.cardType);
            document.querySelector('#braintreeCardMaskNumber').value = '************' + data.details.lastFour;
            document.querySelector('#braintreeCardExpirationMonth').value = data.details.expirationMonth;
            document.querySelector('#braintreeCardExpirationYear').value = data.details.expirationYear.substr(2);
            var creditCardFieldsCardNumber = document.querySelector('input[name=dwfrm_billing_creditCardFields_cardNumber]');
            if (creditCardFieldsCardNumber) {
                creditCardFieldsCardNumber.value = '************' + data.details.lastFour;
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
