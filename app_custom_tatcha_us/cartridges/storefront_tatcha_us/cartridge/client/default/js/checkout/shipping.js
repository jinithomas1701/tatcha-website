'use strict';

/* eslint-env jquery */

var shippingHelpers = require('base/checkout/shipping');
var addressHelpers = require('./address');
var formValidation = require('base/components/formValidation');
var createErrorNotification = require('base/components/errorNotification');
var loqate = require('loqate-custom/loqate');
var summaryHelpers = require('base/checkout/summary');
var util = require('../util');


/**
 * Update the hidden form values that associate shipping info with product line items
 * @param {Object} productLineItem - the productLineItem model
 * @param {Object} shipping - the shipping (shipment model) model
 */
function updateProductLineItemShipmentUUIDs (productLineItem, shipping) {
    $('input[value=' + productLineItem.UUID + ']').each(function (key, pli) {
        var form = pli.form;
        $('[name=shipmentUUID]', form).val(shipping.UUID);
        $('[name=originalShipmentUUID]', form).val(shipping.UUID);

        $(form).closest('.shipping-section').attr('data-shipment-uuid', shipping.UUID);
    });

    $('body').trigger('shipping:updateProductLineItemShipmentUUIDs', {
        productLineItem: productLineItem,
        shipping: shipping
    });
}

/**
 * updates the shipping method radio buttons within shipping forms
 * @param {Object} shipping - the shipping (shipment model) model
 */
 function updateShippingMethods(shipping, order) {
    var uuidEl = $('input[value=' + shipping.UUID + ']');
    var adjustShippingCost = order.totals.getShippingPrices.adjustedShippingTotalPriceFormatted;
    if (uuidEl && uuidEl.length > 0) {
        $.each(uuidEl, function (shipmentIndex, el) {
            var form = el.form;
            if (!form) return;

            var $shippingMethodList = $('.shipping-method-list', form);

            if ($shippingMethodList && $shippingMethodList.length > 0) {
                $shippingMethodList.empty();
                var shippingMethods = shipping.applicableShippingMethods;
                var selected = shipping.selectedShippingMethod || {};
                var shippingMethodFormID = form.name + '_shippingAddress_shippingMethodID';
                //
                // Create the new rows for each shipping method
                //
                $.each(shippingMethods, function (methodIndex, shippingMethod) {
                    var tmpl = $('#shipping-method-template').clone();
                    // set input
                    $('input', tmpl)
                        .prop('id', 'shippingMethod-' + shippingMethod.ID + '-' + shipping.UUID)
                        .prop('name', shippingMethodFormID)
                        .prop('value', shippingMethod.ID)
                        .prop('class', 'd-none')
                        .attr('checked', shippingMethod.ID === selected.ID);

                    $('label', tmpl)
                        .prop('class', 'shipping-method-option shipping-selector')
                        .prop('for', 'shippingMethod-' + shippingMethod.ID + '-' + shipping.UUID);
                    // set shipping method name
                    $('.type', tmpl).text(shippingMethod.displayName);
                    // set or hide arrival time
                    if (shippingMethod.estimatedDate) {
                		var estimatedTempl = 'Estimated Arrival: '+ ("0" + (+shippingMethod.estimatedMonth + 1)).slice(-2) + '/' +  ("0" + (shippingMethod.estimatedDay)).slice(-2);
                        $('.estimate-date', tmpl)
                            .text(estimatedTempl)
                            .show();
                    }

                    // set shipping cost
                    if (shippingMethod.ID === selected.ID) {
                        $('.shipping-price', tmpl).text(adjustShippingCost);
                    } else {
                        $('.shipping-price', tmpl).text(shippingMethod.shippingCost);
                    }
                    $shippingMethodList.append(tmpl.html());
                });
            }
        });
    }

    $('body').trigger('shipping:updateShippingMethods', { shipping: shipping, order: order });
}

/**
 * updates the order shipping summary for an order shipment model
 * @param {Object} shipping - the shipping (shipment model) model
 * @param {Object} order - the order model
 */
 shippingHelpers.methods.updateShippingSummaryInformation = function (shipping, order) {
    var shippingTotal = '';
    var totals = order.totals;
    if (totals.getShippingPrices && totals.getShippingPrices.shippingTotalPrice != 0 && totals.getShippingPrices.adjustedShippingTotalPrice != 0) {
        shippingTotal = totals.getShippingPrices.shippingTotalPriceFormatted;
        if (totals.getShippingPrices.shippingTotalPrice != totals.getShippingPrices.adjustedShippingTotalPrice) {
            shippingTotal = totals.getShippingPrices.shippingTotalPriceFormatted + '(' + totals.getShippingPrices.adjustedShippingTotalPriceFormatted +')';
        }
    } else {
        shippingTotal = 'Free';
    }
    $('[data-shipment-summary=' + shipping.UUID + ']').each(function (i, el) {
        var $container = $(el);
        var $shippingAddressLabel = $container.find('.shipping-addr-label');
        var $addressContainer = $container.find('.address-summary');
        var $shippingPhone = $container.find('.shipping-phone');
        var $methodArrivalDate = $container.find('.estimate-date');
        var $methodNamePrice = $container.find('.shipping-method-selected');
        var $shippingSummaryLabel = $container.find('.shipping-method-label');
        var $summaryDetails = $container.find('.row.summary-details');
        var giftMessageSummary = $container.find('.gift-summary');

        var address = shipping.shippingAddress;
        var selectedShippingMethod = shipping.selectedShippingMethod;
        //var isGift = shipping.isGift;
        var isGiftMsg = shipping.giftMessage;

        addressHelpers.methods.populateAddressSummary($addressContainer, address);

        if (address && address.phone) {
            $shippingPhone.text(address.phone);
        } else {
            $shippingPhone.empty();
        }

        if (selectedShippingMethod) {
            $('body').trigger('shipping:updateAddressLabelText',
                { selectedShippingMethod: selectedShippingMethod, resources: order.resources, shippingAddressLabel: $shippingAddressLabel });
            $shippingSummaryLabel.show();
            $summaryDetails.show();
            if (selectedShippingMethod.estimatedDate) {
                var estimatedTempl = 'Estimated Arrival: '+ ("0" + (+selectedShippingMethod.estimatedMonth + 1)).slice(-2) + '/' +  ("0" + (selectedShippingMethod.estimatedDay)).slice(-2);
                $methodArrivalDate.text(estimatedTempl);
            }
            $methodNamePrice.text(selectedShippingMethod.displayName + '-' + shippingTotal);
        }

        if (isGiftMsg) {
            giftMessageSummary.find('.gift-message-summary').text(shipping.giftMessage);
            giftMessageSummary.removeClass('d-none');
        } else {
            giftMessageSummary.addClass('d-none');
        }
    });

    $('body').trigger('shipping:updateShippingSummaryInformation', { shipping: shipping, order: order });
}

/**
 * Update the shipping UI for a single shipping info (shipment model)
 * @param {Object} shipping - the shipping (shipment model) model
 * @param {Object} order - the order/basket model
 * @param {Object} customer - the customer model
 * @param {Object} [options] - options for updating PLI summary info
 * @param {Object} [options.keepOpen] - if true, prevent changing PLI view mode to 'view'
 */
 shippingHelpers.methods.updateShippingInformation = function (shipping, order, customer, options) {
    // First copy over shipmentUUIDs from response, to each PLI form
    order.shipping.forEach(function (aShipping) {
        aShipping.productLineItems.items.forEach(function (productLineItem) {
            shippingHelpers.methods.updateProductLineItemShipmentUUIDs = updateProductLineItemShipmentUUIDs(productLineItem, aShipping);
        });
    });

    // Now update shipping information, based on those associations
    shippingHelpers.methods.updateShippingMethods = updateShippingMethods(shipping, order);
    shippingHelpers.methods.updateShippingAddressFormValues(shipping);
    shippingHelpers.methods.updateShippingSummaryInformation(shipping, order);

    // And update the PLI-based summary information as well
    shipping.productLineItems.items.forEach(function (productLineItem) {
        shippingHelpers.methods.updateShippingAddressSelector(productLineItem, shipping, order, customer);
        shippingHelpers.methods.updatePLIShippingSummaryInformation(productLineItem, shipping, order, options);
    });

    $('body').trigger('shipping:updateShippingInformation', {
        order: order,
        shipping: shipping,
        customer: customer,
        options: options
    });
}

/**
 * Update list of available shipping methods whenever user modifies shipping address details.
 * @param {jQuery} $shippingForm - current shipping form
 */
shippingHelpers.methods.updateShippingMethodList = function ($shippingForm, $selectedAddressId, countryChangeUpdate) {
    // delay for autocomplete!
    setTimeout(function () {
        var $shippingMethodList = $shippingForm.find('.shipping-method-list');
        var urlParams = addressHelpers.methods.getAddressFieldsFromUI($shippingForm);
        var shipmentUUID = $shippingForm.find('[name=shipmentUUID]').val();
        var url = $shippingMethodList.data('actionUrl');
        urlParams.shipmentUUID = shipmentUUID;

        if ($selectedAddressId) {
            urlParams.selectedAddressId = $selectedAddressId;
        }
        $('.loader-preventive').show();
        $.ajax({
            url: url,
            type: 'post',
            dataType: 'json',
            data: urlParams,
            success: function (data) {
                if (data.error) {
                    $('.loader-preventive').hide();
                    window.location.href = data.redirectUrl;
                } else {
                    if (countryChangeUpdate) {
                        data.order.shipping.forEach(function (shipping) {
                            updateShippingMethods(shipping, data.order);
                            summaryHelpers.updateTotals(data.order.totals);
                        });
                    } else {
                        $('body').trigger('checkout:updateCheckoutView',
                        {
                            order: data.order,
                            customer: data.customer,
                            continueDisable: data.continueDisable,
                            options: { keepOpen: true }
                        });
                    }
                    //updating tax value as TBD
                    summaryHelpers.updateTaxTBD(data.order.totals);

                    $('.loader-preventive').hide();
                }
            }
        });
    }, 300);
}

/**
 * Does Ajax call to select shipping method
 * @param {string} url - string representation of endpoint URL
 * @param {Object} urlParams - url params
 * @param {Object} el - element that triggered this call
 */
shippingHelpers.methods.selectShippingMethodAjax = function (url, urlParams, el){
    $('.loader-preventive').show();
    $('body').trigger('checkout:beforeShippingMethodSelected');
    $.ajax({
        url: url,
        type: 'post',
        dataType: 'json',
        data: urlParams
    })
        .done(function (data) {
            if (data.error) {
                window.location.href = data.redirectUrl;
            } else {
                $('body').trigger('checkout:updateCheckoutView',
                    {
                        order: data.order,
                        customer: data.customer,
                        continueDisable: data.continueDisable,
                        options: { keepOpen: true },
                        urlParams: urlParams
                    }
                );
                $('body').trigger('checkout:postUpdateCheckoutView',
                    {
                        el: el
                    }
                );
            }
            $('body').trigger('checkout:shippingMethodSelected', data);
            $('.loader-preventive').hide();
        })
        .fail(function () {
            $('.loader-preventive').hide();
        });
}

function setAddressFormFields($selectedAddr) {
    $('#checkoutAddNew').find('#firstname').val($selectedAddr.data('first-name'));
    $('#checkoutAddNew').find('#lastname').val($selectedAddr.data('last-name'));
    $('#checkoutAddNew').find('#address1').val($selectedAddr.data('address1'));
    $('#checkoutAddNew').find('#address2').val($selectedAddr.data('address2'));
    $('#checkoutAddNew').find('#city').val($selectedAddr.data('city'));
    $('#checkoutAddNew').find('#postal').val($selectedAddr.data('postal-code'));
    $('#checkoutAddNew').find('#phone').val($selectedAddr.data('phone'));
    if ($selectedAddr.data('country-code') === 'United States') {
        $('#checkoutAddNew').find('#address-modal-country').val('US').trigger('change');
    } else {
        $('#checkoutAddNew').find('#address-modal-country').val($selectedAddr.data('country-code')).trigger('change');
    }
    if ($selectedAddr.data('country-code') === 'US') {
        $('#checkoutAddNew').find('#addressmodal-stateUS').val($selectedAddr.data('state-code'));
    } else if ($selectedAddr.data('country-code') === 'CA') {
        $('#checkoutAddNew').find('#addressmodal-stateNonUS').val($selectedAddr.data('state-code'));
    } else {
        $('#checkoutAddNew').find('#addressmodal-stateText').val($selectedAddr.data('state-code'));
    }
    $('#checkoutAddNew').find('#shippingStateModal').val($selectedAddr.data('state-code'));
    var addrId = $('.edit-shipping-address').data('address-id');
    addrId = '?addressId='+addrId;
    var actionUrl = $('.addressformfields').attr('action');
    actionUrl = actionUrl+addrId;
    $('.addressformfields').attr('action', actionUrl);
}

/**
 * Validate shipping modal form
 * @returns {boolean} - boolean value
 */
 function validateModalForm() {
    var validForm = true;
    var cntry =  $('#checkoutAddNew').find('#address-modal-country').val();
    if (cntry === 'US') {
        $('#checkoutAddNew').find('#shippingStatedefault').val($('#checkoutAddNew').find('#addressmodal-stateUS').val());
    } else if (cntry === 'CA') {
        $('#checkoutAddNew').find('#shippingStatedefault').val($('#checkoutAddNew').find('#addressmodal-stateNonUS').val());
    } else {
        var countryWithStateInput = $('#countryWithState').val();
        if (countryWithStateInput.indexOf(cntry) > -1) {
            $('#checkoutAddNew').find('#shippingStatedefault').val($('#checkoutAddNew').find('#addressmodal-stateText').val());
        } else {
            $('#checkoutAddNew').find('#shippingStatedefault').val('');
        }
    }
    $('#addressModal input, #addressModal select').each(function () {
        if (!this.validity.valid) {
            $(this).trigger('invalid', this.validity);
        } else {
            $(this).removeClass('is-invalid');
            $(this).parent().removeClass('invalid-field');
            $(this).parent().addClass('valid-field');
        }
    });
    if ($('#addressModal .is-invalid') && $('#addressModal .is-invalid').length > 0) {
        validForm = false;
        $('#addressModal .enter-addaddress-link').hide();
        $('#addaddressModalCollapse').addClass('show');
    }
    if ($('#makeDefault').is(':checked')) {
        $('#addressModal #isDefault').val(true);
    }
    return validForm;
}

function updateShippingAddress($newAddr) {
    $('.contact-info-container').find('.shippingFirstName').val($newAddr.data('first-name'));
    $('.contact-info-container').find('.shippingLastName').val($newAddr.data('last-name'));
    $('.contact-info-container').find('.shippingAddressOne').val($newAddr.data('address1'));
    if ($newAddr.data('address2') !== '') {
        $('.contact-info-container').find('.shippingAddressTwo').val($newAddr.data('address2'));
    } else {
        $('.contact-info-container').find('.shippingAddressTwo').val('');
    }
    $('.contact-info-container').find('.shippingAddressCity').val($newAddr.data('city'));
    $('.contact-info-container').find('.shippingZipCode').val($newAddr.data('postal-code'));
    $('.contact-info-container').find('.shippingPhoneNumber').val($newAddr.data('phone'));
    if ($newAddr.data('country-code') === 'United States') {
        $('.contact-info-container').find('.shippingCountry').val('US').trigger('change');
    } else {
        $('.contact-info-container').find('.shippingCountry').val($newAddr.data('country-code')).trigger('change');
    }
    var country = $newAddr.data('country-code');
    var state = $newAddr.data('state-code');
    if (country === 'US' || country === 'United States') {
        $('.contact-info-container').find('#stateUS').val(state).trigger('change');
        $('#stateText').removeAttr('required');
        $('#stateNonUS').removeAttr('required');
        $('.contact-info-container').find('#shippingStatedefault').val(state);
    } else if (country === 'CA') {
        $('.contact-info-container').find('#stateNonUS').val(state).trigger('change');
        $('#stateText').removeAttr('required');
        $('#stateUS').removeAttr('required');
        $('.contact-info-container').find('#shippingStatedefault').val(state);
    } else {
        $('#stateUS').removeAttr('required');
        $('#stateNonUS').removeAttr('required');
        var countryWithStateInput = $('#countryWithState').val();
        if (countryWithStateInput.indexOf(country) > -1) {
            $('.contact-info-container').find('#stateText').val(state);
            $('.contact-info-container').find('#shippingStatedefault').val(state);
        } else {
            $('.contact-info-container').find('#stateText').val('');
            $('.contact-info-container').find('#shippingStatedefault').val('');
        }
    }
}

function clearAddressModal () {
    $('#checkoutAddNew').find('#firstname').val('');
    $('#checkoutAddNew').find('#lastname').val('');
    $('#checkoutAddNew').find('#address1').val('');
    $('#checkoutAddNew').find('#address2').val('');
    $('#checkoutAddNew').find('#city').val('');
    $('#checkoutAddNew').find('#postal').val('');
    $('#checkoutAddNew').find('#phone').val('');
    $('#checkoutAddNew').find('#addressmodal-stateUS').val('');
    $('#checkoutAddNew').find('#addressmodal-stateNonUS').val('');
    $('#checkoutAddNew').find('#addressmodal-stateText').val('');
}

/**
 * Clear all the saved address shipping modal error and valid classes
 */
 function clearErrorShippingAddressModalForm() {
    $('#addressModal input, #addressModal select').each(function () {
        $(this).removeClass('is-invalid');
        $(this).find('.invalid-feedback').html('');
        $(this).parent().removeClass('has-error');
    });
}

function updateAddressModalState () {
    switch ($('#address-modal-country').val()) {
        case "US":
            $('#addressmodal-stateUS').attr('required','');
            $('#addressmodal-stateText').removeAttr('required');
            $('#addressmodal-stateNonUS').removeAttr('required');
            $('.state-modal-label').removeClass('d-none');
            if ($('#postal').parent().hasClass('col-12')) {
                $('#postal').parent().removeClass('col-12').addClass('col-md-6');
            }
            $('#addressmodal-stateUS').show();
            $('#addressmodal-stateText').hide();
            $('#addressmodal-stateNonUS').hide();
            $(".addModalPhoneNo").attr("pattern","^[\\+]?1?[\\s-]?\\(?([2-9][0-9][0-9])\\)?[\\-\\. ]?([0-9][0-9]{2})[\\-\\. ]?([0-9]{4})(\\s*x[0-9]+)?$");
            $(".addModalPhoneNo").blur();
            $(".addModalZipcode").attr("pattern","^\\d{5}(?:[-\\s]\\d{4})?$");
            break;
        case "CA":
            $('#addressmodal-stateText').removeAttr('required');
            $('#addressmodal-stateUS').removeAttr('required');
            $('#addressmodal-stateText').hide();
            $('.state-modal-label').removeClass('d-none');
            if ($('#postal').parent().hasClass('col-12')) {
                $('#postal').parent().removeClass('col-12').addClass('col-md-6');
            }
            $('#addressmodal-stateUS').hide();
            $('#addressmodal-stateNonUS').attr('required','');
            $('#addressmodal-stateNonUS').show();
            $(".addModalPhoneNo").attr("pattern","^[\\+]?1?[\\s-]?\\(?([2-9][0-9][0-9])\\)?[\\-\\. ]?([0-9][0-9]{2})[\\-\\. ]?([0-9]{4})(\\s*x[0-9]+)?$");
            $(".addModalPhoneNo").blur();
            $(".addModalZipcode").attr("pattern","^[ABCEGHJKLMNPRSTVXY]{1}\\d{1}[A-Z]{1} *(?:\\d{1}[A-Z]{1}\\d{1})?$");
            break;
        default:
            var selectedCnty = $('#address-modal-country').val();
            var countryWithState = $('#countryWithState').val();
            $('#addressModal #shippingStatedefault').val('');

            if (countryWithState.indexOf(selectedCnty) > -1) {
                $('#addressmodal-stateText').show();
                $('#addressmodal-stateText').attr('required','');
                $('.state-modal-label').removeClass('d-none');
                if ($('#postal').parent().hasClass('col-12')) {
                    $('#postal').parent().removeClass('col-12').addClass('col-md-6');
                }
            } else {
                $('#addressmodal-stateText').hide();
                $('#addressmodal-stateText').removeAttr('required');
                $('.state-modal-label').addClass('d-none');
                $('.invalid-feedback.modal-state').html('');
                if ($('#postal').parent().hasClass('col-md-6')) {
                    $('#postal').parent().removeClass('col-md-6').addClass('col-12');
                }
            }
            $('#addressmodal-stateUS').removeAttr('required');
            $('#addressmodal-stateNonUS').removeAttr('required');
            $('#addressmodal-stateNonUS').hide();
            $('#addressmodal-stateUS').hide();
            $(".addModalPhoneNo").removeAttr("pattern");
            $(".addModalZipcode").removeAttr("pattern");
        }
}

shippingHelpers.selectSingleShipAddress = function () {
    $(document).on('click', '.shipment-selector-block .edit-shipping-address', function(){
        $('#makeDefault').val(false);
        $("#isDefault").val(false);
        setAddressFormFields($(this));
        $('#addressModal #isEdit').val(true);
        clearErrorShippingAddressModalForm();
        var addrId = $(this).attr('data-address-id');
        $('#addressModal #addressId').val(addrId);
        $('#addressModal .address-title').html('EDIT ADDRESS');
        if ($(this).hasClass('preferred')) {
            $('#makeDefault').prop('checked', true);
            $("#isDefault").prop('checked', true);
        } else {
            $('#makeDefault').prop('checked', false);
            $("#isDefault").prop('checked', false);
        }
        $('#addressModal .enter-addaddress-link').show();
        $('#addaddressModalCollapseLink').show();
        $('#addaddressModalCollapse').removeClass('show');
        $('#addressModal #validAddress').val(false);
    });

    $(document).on('click', 'input.AddrSelector', function(e) {
        $('.loader-preventive').show();
        $('.saved-shipping-details-inner input').removeClass('checked');
        $('.saved-shipping-details-inner input').attr('checked', false);
        $(this).attr('checked', true);
        $(this).find('.fa-circle').addClass('fa-check-circle').removeClass('fa-circle');
        var $addrNew = $(this).parent().parent().find('.edit-shipping-address');
        $('.saved-shipping-details-inner .remove-shipping-address').removeClass('d-none');
        $('.saved-shipping-details-inner .edit-separator').removeClass('d-none');
        $(this).addClass('checked');
        $('.saved-shipping-details-inner .edit-separator').each(function() {
            if (!$(this).hasClass('d-inline-block')) {
                $(this).addClass('d-inline-block');
            }
        });
        $(this).parent().parent().find('.remove-shipping-address').addClass('d-none');
        $(this).parent().parent().find('.edit-separator').addClass('d-none').removeClass('d-inline-block');
        updateShippingAddress($addrNew);
        shippingHelpers.methods.updateShippingMethodList($(e.currentTarget.form), $(this).attr('id'));
        $('.loader-preventive').hide();
    });

    $(document).on('click', '.remove-shipping-address', function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        $('.loader-preventive').show();
        $('#curUrl').val(window.location.href);
        var removeUrl = $(this).data('removeurl');
        var addId = $(this).data('address-id');
        removeUrl = removeUrl+'?addressId='+addId+'&isDefault=false';
        var idTobeRemoved = 'outer-address-id-'+addId;
        var form = $('.addressformfields');
        $.ajax({
            url: removeUrl,
            type: 'get',
            dataType: 'json',
            data: form.serialize(),
            success: function (data) {
                $('.loader-preventive').hide();
                if (data.UUID) {
                    $('#'+idTobeRemoved).remove();
                }
                var curUrl = $('#curUrl').val();
                window.history.pushState({href: curUrl}, '', curUrl);
                $('#checkout-main').attr('data-checkout-stage', 'shipping');
            },
            error: function (err) {
                $('.loader-preventive').hide();
            }
        });
    });

    $('.add-address-link').on('click', function () {
        var addrId = $('#newaddressId').val();
        addrId = '?addressId='+addrId;
        var actionUrl = $('.addressformfields').attr('action');
        actionUrl = actionUrl+addrId;
        $('.addressformfields').attr('action', actionUrl);
        $('#addressModal #addressmodal-stateNonUS').removeAttr('required');
        $('#addressModal #addressmodal-stateNonUS').hide();
        $('#addressId').val($('#newaddressId').val());
        clearAddressModal();
        clearErrorShippingAddressModalForm();
        $('#address-modal-country').val($('#geoLocCountryCode').val());
        updateAddressModalState();
        $('#addressModal .address-title').html('ADD ADDRESS');
        $('#addressModal .enter-addaddress-link').show();
        $('#addaddressModalCollapseLink').show();
        $('#addaddressModalCollapse').removeClass('show');
        $('#makeDefault').prop('checked', false);
        $('#addressModal #isDefault').val(false);
        $('#addressModal #isEdit').val(false);
        $('#addressModal #validAddress').val(false);

        // Init loqate Address form
        loqate.initPCAAddressForm();
    });

    $(document).ready(function () {
        // Init loqate Address form
        loqate.initPCAAddressForm();
    });

    $('.add-shipping-address').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        var validForm = validateModalForm();
        if ($('#addressModal #isEdit').val() === '') {
            $('#addressModal #isEdit').val(false);
        }
        var addrSelected = '';
        if ($('.address-line-item.outer-section-inner') && $('.address-line-item.outer-section-inner').length > 0 && $('.saved-shipping-details-inner input.checked')) {
            addrSelected = $('.saved-shipping-details-inner input.checked').attr('id');
        }
        if($('#addressModal #isEdit').val() === 'true' || $('#addressModal #isEdit').val() === 'false'){
            addrSelected = $(".addressformfields input[name='dwfrm_address_addressId']").val();
        }
        if (validForm === true) {
            if ($('#address-modal-country').val() === 'US' && $('#addressModal #validAddress') && $('#addressModal #validAddress').val() === 'false') {
                var res = loqate.validateAddress({
                    "Address1": $('#addressModal #address1').val(),
                    "Address2": $('#addressModal #address2').val(),
                    "Country": 'US',
                    "PostalCode": $('#addressModal #postal').val(),
                    "State": $('#addressModal #addressmodal-stateUS').val(),
                    "City": $('#addressModal #city').val()
                });
                if(res.length > 0) {
                    $('#addressOriginForm').val('');
                    $('#addressOriginForm').val('address-modal');
                    $(res).modal('show');
                    return false;
                }
            }
            var form = $('.addressformfields');
            var url = $('.addressformfields').attr('action');
            var modalCntry = $('#address-modal-country').val();
            var modalState = '';
            if (modalCntry === 'US') {
                modalState = $('#addressmodal-stateUS').val();
            } else if (modalCntry === 'CA') {
                modalState = $('#addressmodal-stateNonUS').val();
            } else {
                var countryWithStateInput = $('#countryWithState').val();
                if (countryWithStateInput.indexOf(modalCntry) > -1) {
                    modalState = $('#addressmodal-stateText').val();
                } else {
                    modalState = '';
                }
            }
            $('#shippingStateModal').val(modalState);
            $('.loader-preventive').show();

            var value = form.serialize();
            var postData = $('#addressModal #phone').val().toString();
            var phoneNo = '';

            if (postData.charAt(0) === '(' || postData.charAt(0) === '+') {
                phoneNo = postData.replace(/[()-]/g, '');
            } else {
                phoneNo = postData;
            }

            var rest = value.split('&');
            var str = '';
            for (var i = 0; i < rest.length; i++) {
                if ("dwfrm_address_phone" == rest[i].split("=")[0]){
                    str += 'dwfrm_address_phone=' + encodeURIComponent(phoneNo) + '&';
                } else {
                    str += rest[i] + "&";
                }
            }
            $.ajax({
                url: url,
                type: 'post',
                dataType: 'json',
                data: str,
                success: function (data) {
                    $('.loader-preventive').hide();
                    if (!data.success) {
                        formValidation(form, data);
                    } else {
                        var cur = data.address;
                        var currentAddressId = cur.addressId;
                        var newAddressId = currentAddressId ? currentAddressId.replace(/([-,.€~!@#$%^&*()_+=`{}\[\]\|\\:;'<>\s])+/g, '') : currentAddressId;
                        if (cur.isEdit === 'true') {
                            $("span[data-id='"+newAddressId+"']").remove();
                        }
                        var tmpl = $('#duplicate-obj').clone();
                        var modalname = cur.firstName + '  ' + cur.lastName;
                        var modaladdress;
                        if (cur.stateCode != null && cur.address2 != null) {
                            modaladdress = cur.address1 + ', ' + cur.address2 + ', ' + cur.city + ', ' + cur.stateCode + ', ' + cur.postalCode + ', ' + cur.countryDisplayValue;
                        } else if (cur.stateCode != null) {
                            modaladdress = cur.address1 + ', ' + cur.city + ', ' + cur.stateCode + ', ' + cur.postalCode + ', ' + cur.countryDisplayValue;
                        } else if (cur.stateCode == null && cur.address2 != null) {
                            modaladdress = cur.address1 + ', ' + cur.address2 + ', ' + cur.city + ', '  + cur.postalCode + ', ' + cur.countryDisplayValue;
                        } else {
                            modaladdress = cur.address1 + ', ' + cur.city + ', ' + cur.postalCode + ', ' + cur.countryDisplayValue;
                        }
                        // var phoneNo;
                        if (cur.phone != null) {
                            var phoneNumber = cur.phone.toString();
                            if (cur.countryCode == 'US') {
                                if (phoneNumber.split('').includes('(')) {
                                    phoneNo = phoneNumber;
                                } else {
                                    phoneNo = util.formatUSPhoneNumber(phoneNumber);
                                }
                            } else {
                                if (phoneNumber.charAt(0) === '(') {
                                    phoneNo = phoneNumber.substr(1, 3) + phoneNumber.substr(5, 3) + phoneNumber.substr(9, 4);
                                } else {
                                    phoneNo = phoneNumber;
                                }
                            }
                        }
                        $('.modal-name', tmpl).text(modalname);
                        $('.modal-address', tmpl).text(modaladdress);
                        $('.modal-phone', tmpl).text(phoneNo);

                        $('input', tmpl)
                        .prop('id', cur.addressId).attr('data-id', cur.dataId);
                         $('label', tmpl).prop('id', 'label-id-' + cur.addressId).attr('for', cur.addressId);
                        $('.outer-section.address', tmpl).prop('id', 'outer-address-id-'+cur.addressId).attr("data-id",newAddressId);
                        $('.outer-section-inner.remove', tmpl).attr('data-address-id', cur.addressId);
                        $('.edit-shipping-address', tmpl).attr('data-address-id', cur.addressId)
                        .attr('data-first-name', cur.firstName)
                        .attr('data-last-name', cur.lastName)
                        .attr('data-address1', cur.address1)
                        .attr('data-address2', cur.address2 ? cur.address2 : '')
                        .attr('data-city', cur.city)
                        .attr('data-state-code', cur.stateCode)
                        .attr('data-country-code', cur.countryCode)
                        .attr('data-postal-code', cur.postalCode)
                        .attr('data-phone', cur.phone);
                        $('.remove-shipping-address', tmpl).attr('data-address-id', cur.addressId);
                        if (($('#addressModal #isEdit').val() === 'false') || ($('#addressModal #isEdit').val() === 'true' && addrSelected === cur.addressId)) {
                            $('.saved-shipping-details-inner input').removeClass('checked');
                            $('.saved-shipping-details-inner .remove-shipping-address').removeClass('d-none');
                            $('.saved-shipping-details-inner .edit-separator').removeClass('d-none').addClass('d-inline-block');
                            $('.remove-shipping-address', tmpl).addClass('d-none');
                            $('.edit-separator', tmpl).addClass('d-none').removeClass('d-inline-block');
                            $('input', tmpl).addClass('checked').attr('checked', cur.isDefault);
                            if (cur.isDefault === 'true') {
                                $('.saved-shipping-details-inner a.edit-shipping-address').removeClass('preferred');
                                $('.edit-shipping-address', tmpl).addClass('preferred');
                            }
                        }
                        if ($('#addressModal #isEdit').val() === 'true' && addrSelected === cur.addressId) {
                            $('.saved-shipping-details-inner').prepend(tmpl.html());
                            updateShippingAddress($('#outer-address-id-'+cur.addressId).find('.edit-shipping-address'));
                        } else {
                            if (cur.isDefault === 'true') {
                                $('.saved-shipping-details-inner').prepend(tmpl.html());
                            }else{
                                $('.saved-shipping-details-inner').append(tmpl.html());
                            }
                        }
                        $('#addressModal').modal('hide');
                        if ($('#addressModal') && ($('#addressModal #isEdit').val() === 'false' || $('#addressModal #isEdit').val() === 'true' )) {
                            $("input[data-id='"+cur.dataId+"']").trigger('click');
                        }
                    }
                },
                error: function (err) {
                    $('.loader-preventive').hide();
                    if (err.responseJSON.redirectUrl) {
                        window.location.href = err.responseJSON.redirectUrl;
                    }
                }
            });
        } else {
            return false;
        }
    });

    $('#addressModal').on('click', "a[href='#addaddressModalCollapse']", function() {
        $('#addressModal .enter-addaddress-link').hide();
    });
    /*
    * Shipping form Country Change
    */
     $(document).on('change', '#address-modal-country', function() {
        updateAddressModalState();
    });

    $(document).on('click', '#addGift', function(e){
        var eligibility = $(this).data('eligibility');
        var checked = $(this).is(':checked');
        if(checked) {
            if($('#giftbox-message').length){
                $('#giftbox-message').text('Gift box has been added to your bag');
            }
            if(eligibility == 'ineligible') {
                $('#addGift').prop('checked', false);
                $("#giftbox-ineligibile-validation").show();
                $("#giftbox-part-eligible-validation").hide();
            } else if(eligibility == 'part-eligible') {
                $("#giftbox-ineligibile-validation").hide();
                $("#giftbox-part-eligible-validation").show();
            }
        } else {
            if($('#giftbox-message').length){
                $('#giftbox-message').text('Gift box has been removed from your bag');
            }
            $(".giftbox-eligibility").hide();
        }
    });
}

module.exports = shippingHelpers;
