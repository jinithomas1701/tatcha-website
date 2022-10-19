'use strict';

var customerBaseHelpers = require('base/checkout/customer');
var GUEST_FORM = '#guest-customer';
var REGISTERED_FORM = '#registered-customer';
var ERROR_SECTION = '.customer-error';

/**
 * @param {Object} customerData - data includes checkout related customer information
 * @param {Object} orderData - data includes checkout related order information
 */
 customerBaseHelpers.methods.updateCustomerInformation = function (customerData, orderData) {
    var $container = $('.customer-summary');
    var $summaryDetails = $container.find('.summary-details');
    var email = customerData.profile && customerData.profile.email ? customerData.profile.email : orderData.orderEmail;
    $('.contact-email').text(email);
    if (customerData.registeredUser) {
        $container.find('.edit-button').hide();
    } else {
        $container.find('.edit-button').show();
    }
}

/**
 *
 * @param {boolean} registered - wether a registered login block will be used
 */
 function chooseLoginBlock(registered) {
    $(ERROR_SECTION).find('.alert').remove();
    $('#password').val('');
    if (registered) {
        $(REGISTERED_FORM).removeClass('d-none');
        $(GUEST_FORM).addClass('d-none');
        $('#email').val($('#emailaddress').val());
    } else {
        $(REGISTERED_FORM).addClass('d-none');
        $(GUEST_FORM).removeClass('d-none');
        $('#email').val('');
    }
}

customerBaseHelpers.initListeners = function () {
    // 1. password
    var customerLogin = '.js-login-customer';
    var registered;
    if (customerLogin.length !== 0) {
        $('body').on('click', customerLogin, function (e) {
            registered = true;
            e.preventDefault();
            chooseLoginBlock(registered);
        });
    }
},

module.exports = customerBaseHelpers;
