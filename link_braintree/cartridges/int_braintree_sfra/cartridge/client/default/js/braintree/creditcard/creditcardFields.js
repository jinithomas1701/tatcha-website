'use strict';
var creditCard = require('../braintreeCreditCard');

var $continueButton = document.querySelector('button.submit-payment');

/**
 * Gets required Additional shipping info for 3ds
 *
 * @param {Object} orderAddress - User's shipping address
 * @returns {Object} an object with required fields
 */

function getShippingAdditionalInfo(orderAddress) {
    return {
        workPhoneNumber: orderAddress.phone,
        shippingGivenName: orderAddress.recipientName.split(' ').slice(0, -1).join(' '),
        shippingSurname: orderAddress.recipientName.split(' ').slice(-1).join(' '),
        shippingPhone: orderAddress.phone,
        shippingAddress: {
            streetAddress: orderAddress.line1,
            extendedAddress: orderAddress.line2,
            locality: orderAddress.city,
            region: orderAddress.state,
            postalCode: orderAddress.postalCode,
            countryCodeAlpha2: orderAddress.countryCode
        }
    };
}

function updateData() {
    $.ajax({
        url: document.querySelector('.js_braintree_getOrderInfoUrl').value,
        type: 'get',
        dataType: 'json',
        success: function (data) {
            data.shippingAdditionalInfo = data.shippingAddress ? getShippingAdditionalInfo(data.shippingAddress) : null;
            creditCard.updateData(data);
        },
        error: function () {
            window.location.reload();
        }
    });
}

function initCreditCardFields() {
    document.querySelectorAll('.js_braintree_creditCardFields').forEach(function (el) {
        var $container = el;
        if (JSON.parse($container.getAttribute('data-is-inited'))) {
            return;
        }
        var config = JSON.parse($container.getAttribute('data-braintree-config'));
        if (typeof config !== 'object' || config === null) {
            // eslint-disable-next-line no-console
            console.error(el, '.js_braintree_creditCardFields has not valid data-braintree-config');
            return;
        }
        config.continueButton = $continueButton;
        creditCard.initFields(config, $container);
        $container.setAttribute('data-is-inited', true);
    });
}

module.exports = {
    initCreditCardFields,
    getShippingAdditionalInfo,
    updateData
};
