'use strict';
var braintreeLocal = require('../braintreeLocal');
var $lpmButton = document.querySelectorAll('.lpmButton');

$lpmButton.forEach(function (el) {
    var $btn = el;
    var config = JSON.parse($btn.getAttribute('data-braintree-config'));
    var localIns = braintreeLocal.init(config, $btn);
    localIns.createLocalPayment();

    function updateAmountData() { // eslint-disable-line require-jsdoc
        $.ajax({
            url: config.getOrderInfoUrl,
            type: 'get',
            dataType: 'json',
            success: function (data) {
                localIns.updateAmount(data.amount);
            },
            error: function () {
                window.location.reload();
            }
        });
    }

    $('body').on('checkout:updateCheckoutView', updateAmountData);
});
