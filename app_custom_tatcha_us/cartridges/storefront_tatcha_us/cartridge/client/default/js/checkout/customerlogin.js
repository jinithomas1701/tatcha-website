'use strict';

var customerHelpers = require('base/checkout/customer');

//
// Clear Previous Errors
//

$('.js-login-customer').on('click', function () {
    customerHelpers.methods.clearErrors();
});

customerHelpers.methods.clearErrors();

$('#submit-customer-login').on('click', function (e) {
    e.preventDefault();
    var isValid = validateModalForm();
    var defer = $.Deferred();
    if ($('form#registered-customer').find('.is-invalid') && $('form#registered-customer').find('.is-invalid').length > 0) {
        isValid = false;
        return false;
    }
    if (isValid) {
        $('.loader-preventive').show();
        $('#emailInvalidMessage').hide();
        $('#passwordInvalidMessage').hide();
        // Submit the Customer Form
        var customerFormSelector = customerHelpers.methods.isGuestFormActive() ? customerHelpers.vars.GUEST_FORM : customerHelpers.vars.REGISTERED_FORM;
        var customerForm = $(customerFormSelector);

        //clearning existing errors
        customerHelpers.methods.clearErrors();

        $.ajax({
            url: customerForm.attr('action'),
            type: 'post',
            data: customerForm.serialize(),
            success: function (data) {
                if (data.redirectUrl) {
                    window.location.href = data.redirectUrl;
                } else {
                    $('.loader-preventive').hide();
                    customerHelpers.methods.customerFormResponse(defer, data);
                    //mParticle events
                    if(data.error){
                        if (SitePreferences.MPARTICLE_ENABLED) {
                            window.mParticle.logError('Login failed');
                        }
                    }
                }
            },
            error: function (err) {
                if (SitePreferences.MPARTICLE_ENABLED) {
                    window.mParticle.logError('Login failed');
                }
                $('.loader-preventive').hide();
                if (err.responseJSON && err.responseJSON.redirectUrl) {
                    window.location.href = err.responseJSON.redirectUrl;
                }
            }
        });
    }
});

function validateModalForm() {
    var validForm = true;
    $('#registered-customer input').each(function () {
        if ($(this).is(':visible')) {
            if (!this.validity.valid) {
                $(this).trigger('invalid', this.validity);
            } else {
                $(this).removeClass('is-invalid');
                $(this).parent().removeClass('has-error');
            }
        }
    });
    if ($('#registered-customer') && $('#registered-customer .has-error').length > 0) {
        validForm = false;
    }
    return validForm;
}

$('form#registered-customer').submit();

$('#loginModal').on('show.bs.modal', function () {
    var container = $('#loginModal');
    container.find('input[name="dwfrm_coRegisteredCustomer_password"]').val('');
    container.find('.form-group').removeClass('has-error');
    container.find('.form-group .invalid-feedback').html('');
    container.find('#customer-error').html('');
    container.find('#customer-error').hide();
});

$('#loginModal').on('hidden.bs.modal', function () {
    var container = $('#loginModal');
    container.find('input[name="redirectUrl"]').val('');
    container.find('input[name="callBackAction"]').val('');
    container.find('input[name="pid"]').val('');
    container.find('input[name="dwfrm_coRegisteredCustomer_email"]').val('');
    container.find('input[name="dwfrm_coRegisteredCustomer_password"]').val('');
    container.find('.form-group').removeClass('has-error');
    container.find('.form-group .invalid-feedback').html('');
    container.find('#customer-error').html('');
    container.find('#customer-error').hide();
    container.find('#ad-warning').hide();
    container.find('input[name="scope"]').val('');
});
