'use strict';

/* eslint no-console: 'off' */

(function () {
    if (pageContext.ns === 'checkout') {
        $('.braintree-minicart-paypal-buttons-wrap').hide();
    }

   if (window.braintreeUtils) {
       var $braintreePDPButton = $('.braitnree-pdp-paypal-button-wrap');
       $braintreePDPButton.hide();
       
       initMiniCartButton();
       $('.braintree-minicart-paypal-buttons-wrap .braintree-paypal-buttons-wrap').css({"text-align": "center"});
    }
}());