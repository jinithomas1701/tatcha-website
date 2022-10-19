jQuery(document).ready(function ($) {
    main($);
    $('body').css('display', 'block');
});

function main($) {

    $.LoadingOverlaySetup({
        background: "rgba(255, 255, 255, 0.8)",
        image: $('#main-pane').data('img'),
        minSize: 10,
        maxSize: 80,
        imageAnimation: ''
    });

    initEvents($);

    $('#tabs').tabs();

}




function initEvents($) {

    initTooltips($);


    $('#main-pane').on('click', '#submit-btn', function (e) {
        e.preventDefault();
        console.log('submit-btn click enter');

        var $form = $('#settings-form');
        // console.log($('#settings-form').serialize());
        saveFormData($, $form);

    });



    $('#main-pane').on('click', '#reset-btn', function (e) {
        e.preventDefault();
        console.log('reset-btn click enter');

        var $form = $('#settings-form');

        $('#dummy-div').html('<p><span class="ui-icon ui-icon-alert" style="float:left; margin:2px 7px 50px 0;"></span>All the settings will be reset to their default values.</p>');
        $('#dummy-div').dialog({
            title: 'Reset Confirmation',
            resizable: false,
            draggable: false,
            top: '0',
            height: 'auto',
            width: '290px',
            modal: true,
            buttons: {
                'Yes': function () {
                    $(this).dialog("close");
                    $('#dummy-div').dialog('destroy');
                    resetFormData($, $form);
                },
                'Cancel': function () {
                    $(this).dialog("close");
                    $('#dummy-div').dialog('destroy');
                }
            }
        });


    });

    $('#main-pane').on('click', '#test-con-btn', function (e) {
        e.preventDefault();
        $("body").LoadingOverlay("show");
        console.log('test-con-btn click enter');

        var url = $(this).data('url');

        var resolved = function (data) {
            console.log(JSON.stringify(data));

            $('#message').css('color', '#049504');
            $('#message').text(data.message);

            $("body").LoadingOverlay("hide");
        };

        var rejected = function (data) {
            console.log(data.message);

            $('#message').css('color', 'red');
            $('#message').text(data.message);

            $("body").LoadingOverlay("hide");
        };

        var promise = new Promise(function (resolve, reject) {
            $.ajax({
                method: 'GET',
                url: url
            }).done(function (result) {
                if (!result.success) {
                    rejected(result);
                } else {
                    resolved(result);
                }
            });
        });
        promise.then(resolved, rejected);

    });

    $('#void-order-no').on('keypress', function (e) {
        var keycode = (e.keyCode ? e.keyCode : e.which);
        if (keycode == '13') {
            $('#void-btn').trigger('click');
        }

    });

    $('#commit-order-no').on('keypress', function (e) {
        var keycode = (e.keyCode ? e.keyCode : e.which);
        if (keycode == '13') {
            $('#commit-btn').trigger('click');
        }

    });


    $('#validate-order-no').on('keypress', function (e) {
        var keycode = (e.keyCode ? e.keyCode : e.which);
        if (keycode == '13') {
            $('#validate-btn').trigger('click');
        }

    });

    $('#main-pane').on('click', '#void-btn', function (e) {
        e.preventDefault();

        var orderno = $(this).closest('tr').find('#void-order-no').val().trim();

        if (orderno.length <= 0) {
            console.log('order number empty.');

            $('#transaction-msg').css('color', 'red');
            $('#transaction-msg').text('Enter order number to void its transaction.');

            return;
        }

        console.log('order number entered --> ' + orderno);

        voidTransaction($, $(this), orderno);
    });


    $('#main-pane').on('click', '#commit-btn', function (e) {
        e.preventDefault();

        var orderno = $(this).closest('tr').find('#commit-order-no').val().trim();

        if (orderno.length <= 0) {
            console.log('order number empty.');

            $('#transaction-msg').css('color', 'red');
            $('#transaction-msg').text('Enter order number to commit its transaction.');

            return;
        }

        console.log('order number entered --> ' + orderno);

        commitTransaction($, $(this), orderno);
    });

    $('#main-pane').on('click', '#validate-btn', function (e) {
        e.preventDefault();

        var orderno = $(this).closest('tr').find('#validate-order-no').val().trim();

        if (orderno.length <= 0) {
            console.log('order number empty.');

            $('#transaction-msg').css('color', 'red');
            $('#transaction-msg').text('Enter order number to validate its address.');

            return;
        }

        console.log('order number entered --> ' + orderno);

        validateAddress($, $(this), orderno);
    });


    $('#main-pane').on('change', '#select-use-custom-customercode', function (e) {
        e.preventDefault();
        console.log($(this).val());


        if ($(this).val() == 'custom_attribute') {
            $(this).closest('div.td-container').find('input#custom-attr-ip-field').removeAttr('disabled');
            $(this).closest('div.td-container').find('input#custom-attr-ip-field').attr({
                "title": "Enter ID of the attribute under System Object 'Profile'. e.g. If the fax number is expected to be used as customer identifier, use 'fax'. If it's a custom attribute, prepend 'custom.' to it. e.g. custom.fax"
            });
        } else {
            $(this).closest('div.td-container').find('input#custom-attr-ip-field').attr('disabled', 'disabled');
            $(this).closest('div.td-container').find('input#custom-attr-ip-field').removeAttr('title');
        }

    });


    $('#main-pane').on('keypress', '#address-zipcode', function (e) {
        //if the letter is not digit then display error and don't type anything
        var verified = (e.which == 8 || e.which == undefined || e.which == 0) ? null : String.fromCharCode(e.which).match(/[^0-9]/);
        if (verified) {
            // not a number
            e.preventDefault();
        } else {
            if ($(this).val().length == 5) {
                e.preventDefault();
            }
        }
    });


}

function initTooltips($) {
    $('#main-pane').tooltip();
}



function saveFormData($, $form) {

    $("body").LoadingOverlay("show");

    var url = $form.data('url'),
        formData = {};
    var taxCalculation = $('#select-taxcalculation').val();
    var addressValidation = $('#select-addressvalidation').val();
    var taxationpolicy = $('#select-taxationpolicy').val();
    var saveTransactions = $('#select-savetransactions').val();
    var commitTransactions = $('#select-committransactions').val();
    var companyCode = $('#company-code').val();

    var useCustomCustomerCode = $('#select-use-custom-customercode').val();
    var customCustomerAttribute = useCustomCustomerCode != 'custom_attribute' ? '' : $('#custom-attr-ip-field').val(); // empty if useCustomCustomerCode is not eq to 'custom_attribute'

    var defaultShippingMethodTaxCode = $('#defult-shipping-tax-code').val();

    // Address
    var locationCode = $('#address-location-code').val();
    var line1 = $('#address-line1').val();
    var line2 = $('#address-line2').val();
    var line3 = $('#address-line3').val();
    var city = $('#address-city').val();
    var state = $('#address-state').val();
    var zipcode = $('#address-zipcode').val();
    var countryCode = $('#input-countrycode').val();

    formData = {
        "taxCalculation": taxCalculation,
        "addressValidation": addressValidation,
        "taxationpolicy": taxationpolicy,
        "saveTransactions": saveTransactions,
        "commitTransactions": commitTransactions,
        "companyCode": companyCode,
        "useCustomCustomerCode": useCustomCustomerCode,
        "customCustomerAttribute": customCustomerAttribute,
        "defaultShippingMethodTaxCode": defaultShippingMethodTaxCode,

        "locationCode": locationCode,
        "line1": line1,
        "line2": line2,
        "line3": line3,
        "city": city,
        "state": state,
        "zipCode": zipcode,
        "countryCode": countryCode
    };

    console.log(formData);

    var resolved = function (data) {
        $('#msg').text('');
        $('#msg').removeAttr('title');
        $('#msg').css('color', '#049504');
        $('#msg').text('Settings saved successfully.');


        setTimeout(function () {
            $('#msg').text('');
        }, 5000);

        $("body").LoadingOverlay("hide");
    };


    var rejected = function (data) {
        $('#msg').text('');
        $('#msg').removeAttr('title');
        $('#msg').css('color', 'red');
        $('#msg').text('There was a problem saving the settings.');
        $('#msg').attr('title', 'Please check the logs. If the problem persists, please contact Avalara support. (Error details - ' + data.message + ')');

        $("body").LoadingOverlay("hide");
    };

    var promise = new Promise(function (resolve, reject) {
        $.ajax({
                type: 'POST',
                url: url,
                data: formData

            })
            .done(function (data) {
                if (data.success) {
                    resolve(data);
                } else {
                    reject(data);
                }
            });
    });

    promise.then(resolved, rejected);



}


function resetFormData($, $form) {

    $("body").LoadingOverlay("show");

    $('#select-taxcalculation').val('true');
    $('#select-addressvalidation').val('false');
    $('#select-savetransactions').val('true');
    $('#select-committransactions').val('false');
    $('#company-code').val('default');

    $('#select-use-custom-customercode').val('customer_number');
    $('#custom-attr-ip-field').val(''); // empty if useCustomCustomerCode is not eq to 'custom_attribute'

    $('#defult-shipping-tax-code').val('FR');

    // Address
    $('#address-location-code').val('');
    $('#address-line1').val('');
    $('#address-line2').val('');
    $('#address-line3').val('');
    $('#address-city').val('');
    $('#address-state').val('');
    $('#address-zipcode').val('');
    $('#input-countrycode').val('US');


    $("body").LoadingOverlay("hide");
}



function voidTransaction($, $button, orderno) {
    $("body").LoadingOverlay("show");
    console.log('void-btn click enter');

    var url = $button.data('url');

    $('#response-json').text('');

    var resolved = function (data) {
        console.log(JSON.stringify(data));

        $('#transaction-msg').css('color', '#666');
        $('#transaction-msg').text('Void transaction: ' + data.message);

        $('#response-json').text(JSON.stringify(data.svcResponse));



        $("body").LoadingOverlay("hide");
    };

    var rejected = function (data) {
        console.log(data.message);

        $('#transaction-msg').css('color', 'red');
        $('#transaction-msg').text('Void transaction: ' + data.message);

        $('#response-json').text(data.message);

        $("body").LoadingOverlay("hide");
    };

    var promise = new Promise(function (resolve, reject) {
        $.ajax({
            method: 'POST',
            data: {
                orderno: orderno
            },
            url: url
        }).done(function (result) {
            if (!result.success) {
                rejected(result);
            } else {
                resolved(result);
            }
        });
    });
    promise.then(resolved, rejected);
}


function commitTransaction($, $button, orderno) {
    $("body").LoadingOverlay("show");
    console.log('void-btn click enter');

    $('#response-json').text('');

    var url = $button.data('url');

    var resolved = function (data) {
        console.log(JSON.stringify(data));

        $('#transaction-msg').css('color', '#666');
        $('#transaction-msg').text('Commit transaction: ' + data.message);

        $('#response-json').text(JSON.stringify(data.svcResponse));

        $("body").LoadingOverlay("hide");
    };

    var rejected = function (data) {
        console.log(data.message);

        $('#transaction-msg').css('color', 'red');
        $('#transaction-msg').text('Commit transaction: ' + data.message);

        $('#response-json').text(JSON.stringify(data.message));

        $("body").LoadingOverlay("hide");
    };

    var promise = new Promise(function (resolve, reject) {
        $.ajax({
            method: 'POST',
            data: {
                orderno: orderno
            },
            url: url
        }).done(function (result) {
            if (!result.success) {
                rejected(result);
            } else {
                resolved(result);
            }
        });
    });
    promise.then(resolved, rejected);
}



function validateAddress($, $button, orderno) {
    $("body").LoadingOverlay("show");
    console.log('validate-btn click enter');

    $('#response-json').text('');

    var url = $button.data('url');

    var resolved = function (data) {
        console.log(JSON.stringify(data));

        $('#transaction-msg').css('color', '#666');
        $('#transaction-msg').text('Address validation: ' + data.message);

        $('#response-json').text(JSON.stringify(data.svcResponse));



        $("body").LoadingOverlay("hide");
    };

    var rejected = function (data) {
        console.log(data.message);

        $('#transaction-msg').css('color', 'red');
        $('#transaction-msg').text('Address validation: ' + data.message);

        $('#response-json').text(data.message);

        $("body").LoadingOverlay("hide");
    };

    var promise = new Promise(function (resolve, reject) {
        $.ajax({
            method: 'POST',
            data: {
                orderno: orderno
            },
            url: url
        }).done(function (result) {
            if (!result.success) {
                rejected(result);
            } else {
                resolved(result);
            }
        });
    });
    promise.then(resolved, rejected);
}