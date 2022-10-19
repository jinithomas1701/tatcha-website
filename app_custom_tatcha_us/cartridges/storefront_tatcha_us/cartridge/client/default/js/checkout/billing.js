'use strict';

var addressHelpers = require('./address');
var cleave = require('base/components/cleave');

 function updateAddressValueForSameAsShipping(shipping, selected, order, options) {
    var safeOptions = options || {};
    var isBilling = safeOptions.type && safeOptions.type === 'billing';
    var className = safeOptions.className || '';
    var isSelected = selected;
    var isNew = !shipping;
    if (typeof shipping === 'string') {
        return $('<option class="' + className + '" disabled>' + shipping + '</option>');
    }
    var safeShipping = shipping || {};
    var shippingAddress = safeShipping.shippingAddress || {};

    if (isBilling && isNew && !order.billing.matchingAddressId) {
        shippingAddress = order.billing.billingAddress.address || {};
        isNew = false;
        isSelected = true;
        safeShipping.UUID = 'manual-entry';
    }


    var uuid = safeShipping.UUID ? safeShipping.UUID : 'new';
    var optionEl = $('<option class="' + className + '" />');
    optionEl.val(uuid);

    var title;

    /*if (isNew) {
        title = order.resources.addNewAddress;
    } else {
        title = [];
        if (shippingAddress.firstName) {
            title.push(shippingAddress.firstName);
        }
        if (shippingAddress.lastName) {
            title.push(shippingAddress.lastName);
        }
        if (shippingAddress.address1) {
            title.push(shippingAddress.address1);
        }
        if (shippingAddress.address2) {
            title.push(shippingAddress.address2);
        }
        if (shippingAddress.city) {
            if (shippingAddress.state) {
                title.push(shippingAddress.city + ',');
            } else {
                title.push(shippingAddress.city);
            }
        }
        if (shippingAddress.stateCode) {
            title.push(shippingAddress.stateCode);
        }
        if (shippingAddress.postalCode) {
            title.push(shippingAddress.postalCode);
        }
        if (!isBilling && safeShipping.selectedShippingMethod) {
            title.push('-');
            title.push(safeShipping.selectedShippingMethod.displayName);
        }

        if (title.length > 2) {
            title = title.join(' ');
        } else {
            title = order.resources.newAddress;
        }
    }
    optionEl.text(title);*/

    var rsData = {};

    var keyMap = {
        'data-first-name': 'firstName',
        'data-last-name': 'lastName',
        'data-address1': 'address1',
        'data-address2': 'address2',
        'data-city': 'city',
        'data-state-code': 'stateCode',
        'data-postal-code': 'postalCode',
        'data-country-code': 'countryCode',
        'data-phone': 'phone'
    };
    $.each(keyMap, function (key) {
        var mappedKey = keyMap[key];
        var mappedValue = shippingAddress[mappedKey];
        // In case of country code
        if (mappedValue && typeof mappedValue === 'object') {
            mappedValue = mappedValue.value;
        }
        rsData[key] = mappedValue;
        optionEl.attr(key, mappedValue || '');
    });

    var giftObj = {
        'data-is-gift': 'isGift',
        'data-gift-message': 'giftMessage'
    };

    $.each(giftObj, function (key) {
        var mappedKey = giftObj[key];
        var mappedValue = safeShipping[mappedKey];
        rsData[key] = mappedValue;
        optionEl.attr(key, mappedValue || '');
    });

    if (isSelected) {
        optionEl.attr('selected', true);
    }

    return rsData;
}

/**
 * updates the billing address selector within billing forms
 * @param {Object} order - the order model
 * @param {Object} customer - the customer model
 */
function updateBillingAddressSelector(order, customer) {
    var shippings = order.shipping;

    var form = $('form[name$=billing]')[0];
    var $billingAddressSelector = $('.addressSelector', form);
    var hasSelectedAddress = false;

    if ($billingAddressSelector && $billingAddressSelector.length === 1) {
        $billingAddressSelector.empty();
        // Add New Address option
       /* $billingAddressSelector.append(addressHelpers.methods.optionValueForAddress(
            null,
            false,
            order,
            { type: 'billing' }));

        // Separator -
        $billingAddressSelector.append(addressHelpers.methods.optionValueForAddress(
            order.resources.shippingAddresses, false, order, {
                // className: 'multi-shipping',
                type: 'billing'
            }
        ));*/

        shippings.forEach(function (aShipping) {
            var isSelected = order.billing.matchingAddressId === aShipping.UUID;
            hasSelectedAddress = hasSelectedAddress || isSelected;
            // Shipping Address option
           var billingAddressData = updateAddressValueForSameAsShipping(aShipping, isSelected, order, {
                // className: 'multi-shipping',
                type: 'billing'
            });

            $billingAddressSelector.attr('data-address', JSON.stringify(billingAddressData));
            /*$billingAddressSelector.append(
                addressHelpers.methods.optionValueForAddress(aShipping, isSelected, order,
                    {
                        // className: 'multi-shipping',
                        type: 'billing'
                    }
                )
            );*/
        });

        if (customer.addresses && customer.addresses.length > 0) {
            $billingAddressSelector.append(addressHelpers.methods.optionValueForAddress(
                order.resources.accountAddresses, false, order));
            customer.addresses.forEach(function (address) {
                var isSelected = order.billing.matchingAddressId === address.ID;
                hasSelectedAddress = hasSelectedAddress || isSelected;
                // Customer Address option
                $billingAddressSelector.append(
                    addressHelpers.methods.optionValueForAddress({
                        UUID: 'ab_' + address.ID,
                        shippingAddress: address
                    }, isSelected, order, { type: 'billing' })
                );
            });
        }
    }

    if (hasSelectedAddress
        || (!order.billing.matchingAddressId && order.billing.billingAddress.address)) {
        // show
        $(form).attr('data-address-mode', 'edit');
    } else {
        $(form).attr('data-address-mode', 'new');
    }

    $billingAddressSelector.show();
}

/**
 * Updates the billing address form values within payment forms without any payment instrument validation
 * @param {Object} order - the order model
 */
function updateBillingAddress(order) {
    var billing = order.billing;
    if (!billing.billingAddress || !billing.billingAddress.address) return;

    var form = $('form[name=dwfrm_billing]');
    if (!form) return;

    $('input[name$=_firstName]', form).val(billing.billingAddress.address.firstName);
    $('input[name$=_lastName]', form).val(billing.billingAddress.address.lastName);
    $('input[name$=_address1]', form).val(billing.billingAddress.address.address1);
    $('input[name$=_address2]', form).val(billing.billingAddress.address.address2);
    $('input[name$=_city]', form).val(billing.billingAddress.address.city);
    $('input[name$=_postalCode]', form).val(billing.billingAddress.address.postalCode);
    $('select[name$=_stateCode],input[name$=_stateCode]', form)
        .val(billing.billingAddress.address.stateCode);
    var country = billing.billingAddress.address.countryCode.value;
    var stateCode = billing.billingAddress.address.stateCode;
    var addCardModalForm = $('#addCreditCardForm');
    var countryWithState = form.find('#countryWithState').val();
    $('select[name$=_country]', form).val(country).trigger('change');
    addCardModalForm.find('#billingCountry').val(country).trigger('change');

    if (country === 'US') {
        form.find('#billingStateUS').val(stateCode);
        addCardModalForm.find('#billingStateUS').val(stateCode);
    } else if (country === 'CA') {
        form.find('#billingStateNonUS').val(stateCode);
        addCardModalForm.find('#billingStateNonUS').val(stateCode);
    } else {
        if (countryWithState.indexOf(country) > -1) {
            form.find('#billingStateText').val(stateCode);
            addCardModalForm.find('#billingStateText').val(stateCode);
        } else {
            form.find('#billingStatedefault').val('');
            addCardModalForm.find('#billingStatedefault').val('');
        }
    }
    $('select[name$=_country]', form).val(billing.billingAddress.address.countryCode.value);
    $('input[name$=_phone]', form).val(billing.billingAddress.address.phone);
    $('input[name$=_email]', form).val(order.orderEmail);
}

/**
 * Validate and update payment instrument form fields
 * @param {Object} order - the order model
 */
function validateAndUpdateBillingPaymentInstrument(order) {
    var billing = order.billing;
    if (!billing.payment || !billing.payment.selectedPaymentInstruments
        || billing.payment.selectedPaymentInstruments.length <= 0) return;

    var form = $('form[name=dwfrm_billing]');
    if (!form) return;

    var instrument = billing.payment.selectedPaymentInstruments[0];
    $('select[name$=expirationMonth]', form).val(instrument.expirationMonth);
    $('select[name$=expirationYear]', form).val(instrument.expirationYear);
    // Force security code and card number clear
    $('input[name$=securityCode]', form).val('');
    if ($('input[name$=cardNumber]').data('cleave')){
        // Cleave throwing error in Safari (Temporary fix until new version is updated)
        try {
            $('input[name$=cardNumber]').data('cleave').setRawValue('');
        } catch (e) {}
    }
}

/**
 * Updates the billing address form values within payment forms
 * @param {Object} order - the order model
 */
function updateBillingAddressFormValues(order) {
    module.exports.methods.updateBillingAddress(order);
    module.exports.methods.validateAndUpdateBillingPaymentInstrument(order);
}

/**
 * clears the billing address form values
 */
function clearBillingAddressFormValues() {
    updateBillingAddressFormValues({
        billing: {
            billingAddress: {
                address: {
                    countryCode: {}
                }
            }
        }
    });
}

/**
 * update billing address summary and contact information
 * @param {Object} order - checkout model to use as basis of new truth
 */
function updateBillingAddressSummary(order) {
    // update billing address summary
    addressHelpers.methods.populateAddressSummary('.billing .address-summary',
        order.billing.billingAddress.address);
    if (!order.sameAsShipping) {
		$('.payment-address-wrap').addClass('d-none');
		$('.billing-address-summary').removeClass('d-none');
	} else {
		$('.billing-address-summary').addClass('d-none');
		$('.payment-address-wrap').removeClass('d-none');
	}

    // update billing parts of order summary
    $('.order-summary-email').text(order.orderEmail);

    if (order.billing.billingAddress.address) {
        $('.order-summary-phone').text(order.billing.billingAddress.address.phone);
    }
}

/**
 * Updates the billing information in checkout, based on the supplied order model
 * @param {Object} order - checkout model to use as basis of new truth
 * @param {Object} customer - customer model to use as basis of new truth
 * @param {Object} [options] - options
 */
function updateBillingInformation(order, customer) {
    updateBillingAddressSelector(order, customer);

    // update billing address form
    updateBillingAddressFormValues(order);

    // update billing address summary and billing parts of order summary
    updateBillingAddressSummary(order);
}

/**
 * Updates the payment information in checkout, based on the supplied order model
 * @param {Object} order - checkout model to use as basis of new truth
 */
function updatePaymentInformation(order) {
    // update payment details
    var $paymentSummary = $('.card-payment-summary');
    $paymentSummary.empty();
    $('.payment-info-submitted .no-gutters').find('.giftcert-payment-type').remove();
    var selectedPIs = order.billing.payment.selectedPaymentInstruments;
    var tmpl = $('.payment-summary-sec').clone();
    var hasCreditCard = false;
    var hasGCPI = false;

    selectedPIs.forEach(function (selectedPI) {
        var cardType ='';
        var selectedCardImg = '';
        if (selectedPI.paymentMethod === 'CREDIT_CARD') {
            hasCreditCard = true;
            var lastFour = selectedPI.lastFour;
            var cardEnding = 'ending in '+lastFour;
            if(selectedPI.type){
                cardType = selectedPI.type;
               if (cardType === 'American express' || cardType === 'Amex') {
                   cardType = 'American-express';
               } else if (cardType === 'JCB') {
                   cardType = 'Jcb';
               } else if (cardType === 'Master') {
                   cardType = 'Mastercard';
               }else if (cardType === 'Visa') {
                   cardType = 'Visa';
               }
               var selectedCardImg = $('.'+cardType+'-img').html();
           }
           $('.img-sec', tmpl)
                .html(selectedCardImg);
           $('.ending-in', tmpl)
            .html(cardEnding);
            $paymentSummary.append(tmpl);
        } else if (selectedPI.paymentMethod === 'GIFT_CERTIFICATE') {
            hasGCPI = true;
            var giftHtml1 = '<div class="col-md-6 giftcert-payment-type"><div class="payment-type-title"> Gift Card </div>';
            var giftHtml2 = '<div class="checkout-summary-data">' +'$'+ selectedPI.amount + ' from a gift card has been applied.<br> </div></div>';
            var giftPaymentHtml = giftHtml1+giftHtml2;
            $('.payment-info-submitted .no-gutters').prepend(giftPaymentHtml);
        }
    });
    if (order.totals.nonGcAmount !== 0) {
        $paymentSummary.find('.payment-summary-sec').removeClass('d-none');
    } else if (order.totals.nonGcAmount === 0) {
        $('.payment-info-submitted').find('.card-payment-summary').remove();
    }
}

/**
 * clears the credit card form
 */
function clearCreditCardForm() {
    $('input[name$="_cardNumber"]').data('cleave').setRawValue('');
    $('select[name$="_expirationMonth"]').val('');
    $('select[name$="_expirationYear"]').val('');
    $('input[name$="_securityCode"]').val('');
}

/*
* Update payment section view , if the selected stage is payment
* default payment: credit card
* default billing address: same as shipping
* **/
function updatepaymentView() {
    var paymentElm = $('.payment-form');
    if(paymentElm.length > 0) {

        //Select default payment option
        $('#is-CREDIT_CARD').attr('checked', true);
        $('#is-AFTERPAY_PBI').attr('checked', false);
        $('.creditcard-pay').show();
        $("#containerAfterPay").hide();

    }
}

module.exports = {
    methods: {
        updateBillingAddressSelector: updateBillingAddressSelector,
        updateBillingAddressFormValues: updateBillingAddressFormValues,
        clearBillingAddressFormValues: clearBillingAddressFormValues,
        updateBillingInformation: updateBillingInformation,
        updatePaymentInformation: updatePaymentInformation,
        clearCreditCardForm: clearCreditCardForm,
        updateBillingAddress: updateBillingAddress,
        validateAndUpdateBillingPaymentInstrument: validateAndUpdateBillingPaymentInstrument,
        updateBillingAddressSummary: updateBillingAddressSummary,
        updatepaymentView: updatepaymentView
    },

    showBillingDetails: function () {
        $('.btn-show-billing-details').on('click', function () {
            $(this).parents('[data-address-mode]').attr('data-address-mode', 'new');
        });
    },

    hideBillingDetails: function () {
        $('.btn-hide-billing-details').on('click', function () {
            $(this).parents('[data-address-mode]').attr('data-address-mode', 'shipment');
        });
    },

    selectBillingAddress: function () {
        $('.payment-form .addressSelector').on('click', function () {
            var form = $(this).parents('form')[0];

            if($(this).is(':checked')) {
                $(form).attr('data-address-mode', 'shipment');
            } else {
                $(form).attr('data-address-mode', 'new');
            }

            // Copy fields
            var attrs = $(this).attr('data-address');

            if(attrs.length > 0) {
                var attrData = JSON.parse(attrs);
                var element;
                var value;
                Object.keys(attrData).forEach(function (attr) {
                    element = attr === 'countryCode' ? 'country' : attr;
                    value = attr === 'countryCode' ? attrData[attr].value : attrData[attr];
                    if(element.indexOf('data-') > -1) {
                        element = element.split('data-')[1];
                    }
                    if (element === 'cardNumber') {
                        $('.cardNumber').data('cleave').setRawValue(value);
                    } else {
                        $('[name$=' + element + ']', form).val(value);
                    }
                });
            }

        }),

        /*
        * Billing form Country Change
        */
        $(document).on('change', '#billingCountry', function() {
            var $form = $(this).closest('form');
            switch ($form.find('#billingCountry').val()) {
                case "US":
                    $form.find('#billingStateUS').attr('required','');
                    $form.find('#billingStateText').removeAttr('required');
                    $form.find('#billingStateNonUS').removeAttr('required');
                    $form.find('#billingStateUS').show();
                    $form.find('#billingStateText').hide();
                    $form.find('#billingStateNonUS').hide();
                    $form.find('.billing-state-label').removeClass('d-none');
                    if ($form.find('.billingZipCode').parent().hasClass('col-12')) {
                        $form.find('.billingZipCode').parent().removeClass('col-12').addClass('col-md-6');
                    }
                    $(".billingZipCode").attr("pattern","^\\d{5}(?:[-\\s]\\d{4})?$");
                    break;
                case "CA":
                    $form.find('#billingStateText').removeAttr('required');
                    $form.find('#billingStateUS').removeAttr('required');
                    $form.find('#billingStateText').hide();
                    $form.find('#billingStateUS').hide();
                    $form.find('#billingStateNonUS').attr('required','');
                    $form.find('#billingStateNonUS').show();
                    $form.find('.billing-state-label').removeClass('d-none');
                    if ($form.find('.billingZipCode').parent().hasClass('col-12')) {
                        $form.find('.billingZipCode').parent().removeClass('col-12').addClass('col-md-6');
                    }
                    $(".billingZipCode").attr("pattern","^[ABCEGHJKLMNPRSTVXY]{1}\\d{1}[A-Z]{1} *(?:\\d{1}[A-Z]{1}\\d{1})?$");
                    break;
                default:
                    var selectedCntry = $form.find('#billingCountry').val();
                    var countryWithState = $form.find('#countryWithState').val();
                    $form.find('#billingStatedefault').val('');
                    if (countryWithState.indexOf(selectedCntry) > -1) {
                        $form.find('#billingStateText').show();
                        $form.find('#billingStateText').attr('required','');
                        $form.find('.billing-state-label').removeClass('d-none');
                        if ($form.find('.billingZipCode').parent().hasClass('col-12')) {
                            $form.find('.billingZipCode').parent().removeClass('col-12').addClass('col-md-6');
                        }
                    } else {
                        $form.find('#billingStateText').hide();
                        $form.find('#billingStateText').removeAttr('required');
                        $form.find('.billing-state-label').addClass('d-none');
                        $form.find('.invalid-feedback.billing-state').html('');
                        if ($form.find('.billingZipCode').parent().hasClass('col-md-6')) {
                            $form.find('.billingZipCode').parent().removeClass('col-md-6').addClass('col-12');
                        }
                    }
                    $form.find('#billingStateUS').removeAttr('required');
                    $form.find('#billingStateNonUS').removeAttr('required');
                    $form.find('#billingStateUS').hide();
                    $form.find('#billingStateNonUS').hide();
                    // $form.find(".stateFieldWrapper").hide();
                    $(".billingZipCode").removeAttr("pattern");
                }
        })
    },

    handleCreditCardNumber: function () {
        cleave.handleCreditCardNumber('.cardNumber', '#cardType');
    },

    santitizeForm: function () {
        $('body').on('checkout:serializeBilling', function (e, data) {
            var serializedForm = cleave.serializeData(data.form);

            data.callback(serializedForm);
        });
    },

    selectSavedPaymentInstrument: function () {
        $(document).on('click', '.saved-payment-instrument', function (e) {
            e.preventDefault();
            $('.saved-payment-security-code').val('');
            $('.saved-payment-instrument').removeClass('selected-payment');
            $(this).addClass('selected-payment');
            $('.saved-payment-instrument .card-image').removeClass('checkout-hidden');
            $('.saved-payment-instrument .security-code-input').addClass('checkout-hidden');
            $('.saved-payment-instrument.selected-payment' +
                ' .card-image').addClass('checkout-hidden');
            $('.saved-payment-instrument.selected-payment ' +
                '.security-code-input').removeClass('checkout-hidden');
        });
    },

    addNewPaymentInstrument: function () {
        $('.btn.add-payment').on('click', function (e) {
            e.preventDefault();
            $('.payment-information').data('is-new-payment', true);
            clearCreditCardForm();
            $('.credit-card-form').removeClass('checkout-hidden');
            $('.user-payment-instruments').addClass('checkout-hidden');
        });
    },

    cancelNewPayment: function () {
        $('.cancel-new-payment').on('click', function (e) {
            e.preventDefault();
            $('.payment-information').data('is-new-payment', false);
            clearCreditCardForm();
            $('.user-payment-instruments').removeClass('checkout-hidden');
            $('.credit-card-form').addClass('checkout-hidden');
        });
    },

    clearBillingForm: function () {
        $('body').on('checkout:clearBillingForm', function () {
            clearBillingAddressFormValues();
        });
    },

    paymentTabs: function () {
        $('.payment-options .nav-item').on('click', function (e) {
            e.preventDefault();
            var methodID = $(this).data('method-id');
            $('.payment-information').data('payment-method-id', methodID);
        });
    }
};
