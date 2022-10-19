'use strict';

function handleSelection($selectedOption) {
    $('.guid-error').hide();
    $('.api-key-error').hide();

    var guid = $selectedOption.data('guid');
    var apiKey = $selectedOption.data('api-key');

    $('.guid-input').val(guid);
    $('.api-key-input').val(apiKey);

    if (!guid || !apiKey) {
        $('.swell-login-btn').attr('disabled', 'disabled');

        if (!guid) {
            $('.guid-error').show();
        }

        if (!apiKey) {
            $('.api-key-error').show();
        }
     } else {
         $('.swell-login-btn').removeAttr('disabled');
     }
}

function initialize() {
    var $selectedOption = $('.locale-id-select').find(':selected');
    if( $selectedOption.length > 0 ) {
        handleSelection($selectedOption);
    }
}

$( document ).ready(function() {

    $('.locale-id-select').on('change', function() {
        var $selectedOption = $(this).find(':selected');
        handleSelection($selectedOption);
    });

    $('.swell-login-btn').on('click', function() {
        var guid = $('.guid-input').val();
        var apiKey = $('.api-key-input').val();
        if (guid && apiKey) {
            var url = 'https://app.swellrewards.com/login/' + guid + '/' + apiKey;
            window.open(url, '_blank'); 
        }
    });
    
    initialize();
});