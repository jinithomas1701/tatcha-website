'use strict';

var giftcert = require('../giftcert'),
    tooltip = require('../tooltip'),
    util = require('../util'),
    image = require('./product/image'),
    dialog = require('../dialog'),
    page = require('../page'),
    login = require('../login'),
    validator = require('../validator'),
    progress = require('../progress'),
    addToCart = require('../pages/product/addToCart'),
    minicart = require('../minicart'),
    ajax = require('../ajax');


var intlLoaded;
/**
 * @function
 * @description Initializes the events on the address form (apply, cancel, delete)
 * @param {Element} form The form which will be initialized
 */
function initializeAddressForm() {

    var $form = $('#edit-address-form');

    $form.find('input[name="format"]').remove();
    tooltip.init();
    //$("<input/>").attr({type:"hidden", name:"format", value:"ajax"}).appendTo(form);

    $form.on('click', '.apply-button', function (e) {
        e.preventDefault();
        if (!$form.valid()) {
            return false;
        }
        var url = util.appendParamToURL($form.attr('action'), 'format', 'ajax');
        var applyName = $form.find('.apply-button').attr('name');
        var options = {
            url: url,
            data: $form.serialize() + '&' + applyName + '=x',
            type: 'POST'
        };
        $.ajax(options).done(function (data) {
            if (typeof(data) !== 'string') {
                if (data.success) {
                    dialog.close();
                    page.refresh();
                } else if (data.error) {
                    page.redirect(Urls.csrffailed);
                } else {
                    window.alert(data.message);
                    return false;
                }
            } else {
                $('#dialog-container').html(data);
                account.init();
                tooltip.init();
            }
        });
    })
    .on('click', '.cancel-button, .close-button', function (e) {
        e.preventDefault();
        dialog.close();
    })
    .on('click', '.delete-button', function (e) {
        e.preventDefault();
        if (window.confirm(String.format(Resources.CONFIRM_DELETE, Resources.TITLE_ADDRESS))) {
            var url = util.appendParamsToUrl(Urls.deleteAddress, {
                AddressID: $form.find('#addressid').val(),
                format: 'ajax'
            });
            $.ajax({
                url: url,
                method: 'POST',
                dataType: 'json'
            }).done(function (data) {
                if (data.status.toLowerCase() === 'ok') {
                    dialog.close();
                    page.refresh();
                } else if (data.message.length > 0) {
                    window.alert(data.message);
                    return false;
                } else {
                    dialog.close();
                    page.refresh();
                }
            });
        }
    });

    validator.init();
}
/**
 * @private
 * @function
 * @description Toggles the list of Orders
 */
function toggleFullOrder () {
    $('.order-items')
        .find('li.hidden:first')
        .prev('li')
        .append('<a class="toggle">View All</a>')
        .children('.toggle')
        .click(function () {
            $(this).parent().siblings('li.hidden').show();
            $(this).remove();
        });
}
/**
 * @private
 * @function
 * @description Binds the events on the address form (edit, create, delete)
 */
function initAddressEvents() {

	//Fix for restricting non-alphabatic symbols for Fname and Lname while creating new account
    $('#RegistrationForm #dwfrm_profile_customer_firstname, #RegistrationForm #dwfrm_profile_customer_lastname').on('keyup', function (event) {
    	if(event.keyCode != 16) {
	    	if($(this).val() != '' && !$(this).val().match(/^[a-zA-Z-]+$/)){
	    		$(this).val($(this).val().substr(0, event.target.value.length-1));
	    		if($(this).parent().find('.val-error').length > 0) {
	    			$(this).parent().addClass('has-error');
	    			$(this).parent().find('.help-block').css('display', 'none');
	    			$(this).parent().find('.val-error').css('display', 'block');
	    		} else {
	    			$(this).parent().addClass('has-error');
	    			$(this).parent().find('.help-block').css('display', 'none');
	    			$(this).after('<span class="help-block val-error" style="display: inline;">Please enter valid name</span>');
	    		}
			} else if($(this).parent().find('.val-error').length > 0) {
				$(this).parent().removeClass('has-error');
				$(this).parent().find('.val-error').css('display', 'none');
			}
    	}
    });

    $('#RegistrationForm #dwfrm_profile_customer_firstname, #RegistrationForm #dwfrm_profile_customer_lastname').on('blur', function (event) {
    	if($(this).val()) {
    		if(!$(this).val().match(/^[a-zA-Z-]+$/)) {
	    		$(this).parent().addClass('has-error');
	    		$(this).parent().find('.help-block').css('display', 'none');
	    		$(this).parent().find('.val-error').css('display', 'block');
			} else if($(this).parent().hasClass('has-error') || $(this).parent().find('.val-error').length > 0) {
				$(this).parent().removeClass('has-error');
				$(this).parent().find('.val-error').css('display', 'none');
			}
		} else if($(this).parent().find('.val-error').length > 0){
			$(this).parent().find('.val-error').css('display', 'none');
		}
    });

    $('#RegistrationForm #dwfrm_profile_customer_firstname, #RegistrationForm #dwfrm_profile_customer_lastname').on('focus', function (event) {
    	if($(this).val()) {
    		if(!$(this).val().match(/^[a-zA-Z-]+$/)) {
	    		$(this).parent().addClass('has-error');
	    		$(this).parent().find('.help-block').css('display', 'none');
	    		$(this).parent().find('.val-error').css('display', 'block');
			} else if($(this).parent().hasClass('has-error') || $(this).parent().find('.val-error').length > 0) {
				$(this).parent().removeClass('has-error');
				$(this).parent().find('.val-error').css('display', 'none');
			}
		} else if($(this).parent().find('.help-block').length > 0){
			$(this).parent().removeClass('has-error');
			$(this).parent().find('.help-block').css('display', 'none');
		}
    });

    var addresses = $('#addresses');
    if (addresses.length === 0) { return; }

    addresses.on('click', '.address-edit, .address-create', function (e) {
        e.preventDefault();
        dialog.open({
            url: this.href,
            options: {
                open: initializeAddressForm
            }
        });
    }).on('click', '.delete', function (e) {
        e.preventDefault();
        if (window.confirm(String.format(Resources.CONFIRM_DELETE, Resources.TITLE_ADDRESS))) {
            $.ajax({
                url: util.appendParamToURL($(this).attr('href'), 'format', 'ajax'),
                dataType: 'json'
            }).done(function (data) {
                if (data.status.toLowerCase() === 'ok') {
                    page.redirect(Urls.addressesList);
                } else if (data.message.length > 0) {
                    window.alert(data.message);
                } else {
                    page.refresh();
                }
            });
        }
    });
}
/**
 * @private
 * @function
 * @description Binds the events of the payment methods list (delete card)
 */
function initPaymentEvents() {
    $('.add-card').on('click', function (e) {
        e.preventDefault();
        dialog.open({
            url: $(e.target).attr('href'),
            options: {
                open: initializePaymentForm
            }
        });
    });

    var paymentList = $('.payment-list');
    if (paymentList.length === 0) { return; }

    util.setDeleteConfirmation(paymentList, String.format(Resources.CONFIRM_DELETE, Resources.TITLE_CREDITCARD));

    $('form[name="payment-remove"]').on('submit', function (e) {
        e.preventDefault();
        // override form submission in order to prevent refresh issues
        var button = $(this).find('.delete');
        $('<input/>').attr({
            type: 'hidden',
            name: button.attr('name'),
            value: button.attr('value') || 'delete card'
        }).appendTo($(this));
        var data = $(this).serialize();
        $.ajax({
            type: 'POST',
            url: $(this).attr('action'),
            data: data
        })
        .done(function () {
            page.redirect(Urls.paymentsList);
        });
    });
}

function initializePaymentForm() {
    $('#CreditCardForm').on('click', '.cancel-button', function (e) {
        e.preventDefault();
        dialog.close();
    });

}

var zipCodValidation = function(event){
	if(event.target.type==="tel"){
		if(!event.target.value.match(/^\d+$/)){
			$(event.target).val($(event.target).val().substr(0, event.target.value.length-1));
		}
	}
}

function stateDropDownNonUSOptions(){
	var stateDropDown = '';
	if(window.location.href.indexOf("account/payment") > -1){
		stateDropDown = '<select class="form-control form-control-lg input-select floating__input  required" id="dwfrm_billing_billingAddress_addressFields_states_state" name="dwfrm_billing_billingAddress_addressFields_states_state" data-msg-required="Please select a state.">';
	} else {
		stateDropDown = '<select class="form-control form-control-lg input-select floating__input  required" id="dwfrm_profile_address_states_state" name="dwfrm_profile_address_states_state" data-msg-required="Please select a state.">';
	}
	var provinceList = JSON.parse($('#provinceListNonUS').val());
	var options = [];
	for ( var province in provinceList) {
		var provinceCountry = provinceList[province].country;
		if(provinceCountry == 'CA'){
			var pstates = provinceList[province].states;
			for ( var state in pstates) {
				options.push('<option class="select-option" label="' + pstates[state].label + '" value="' + pstates[state].value + '">' + pstates[state].label + '</option>')
			}
		}
	}
	stateDropDown += options.join('');
	stateDropDown += '</select>';
	return stateDropDown;
}

var defStateField = $('select[name$="_address_states_state"]');
var defStateFieldName = defStateField.attr('name');
var stateDropDown = defStateField.clone();
var stateTextBox = '<input type="text" name="'+defStateFieldName+'" id="'+defStateFieldName+'" placeholder=" " class="floating__input input-text form-control form-control-lg required" autocorrect="off">';

function switchStateField() {
	var form = $('form[name="dwfrm_profile_address"]');

	form.find('[name$="_address_states_state"]').parents('.form-group').removeClass('has-error');
	form.find('[id$="_address_states_state-error"]').remove();
	var country = form.find('select[name$="_address_country"]').val();
	if(country != 'US') {
		if(country == 'CA'){
			var stateDropDownNonUS = stateDropDownNonUSOptions();
			form.find('[name$="_address_states_state"]').replaceWith(stateDropDownNonUS);
			if ($('[name$="_address_postal"]').closest('div.col-sm-12').length > 0) {
				$('[name$="_address_postal"]').closest('div.col-sm-12').removeClass('col-sm-12').addClass('col-sm-6');
			}
			form.find('[name$="_address_states_state"]').closest('.form-group').parent().show();
			form.find('[name$="_address_states_state"]').parents('.form-group').find('.control-label span').html('State*');
		} else {
			//hiding state filed
			var countryWithState = $('#countryWithState').val();
			if (countryWithState && countryWithState.indexOf(country) > -1) {
				form.find('[name$="_address_states_state"]').replaceWith(stateTextBox);
				form.find('[name$="_address_states_state"]').parents('.form-group').find('.control-label span').html('Province*');
				if ($('[name$="_address_postal"]').closest('div.col-sm-12').length > 0) {
					$('[name$="_address_postal"]').closest('div.col-sm-12').removeClass('col-sm-12').addClass('col-sm-6');
				}
				form.find('[name$="_address_states_state"]').closest('.form-group').parent().show();
			} else {
				form.find('[name$="_address_states_state"]').closest('.form-group').parent().hide();
				if ($('[name$="_address_postal"]').closest('div.col-sm-6').length > 0) {
					$('[name$="_address_postal"]').closest('div.col-sm-6').removeClass('col-sm-6').addClass('col-sm-12');
				}
				form.find('[name$="_address_states_state"]').removeClass('required');
			}
		}
	} else {
		form.find('[name$="_address_states_state"]').closest('.form-group').parent().show();
		form.find('[name$="_address_states_state"]').replaceWith(stateDropDown);
		if ($('[name$="_address_postal"]').closest('div.col-sm-12').length > 0) {
			$('[name$="_address_postal"]').closest('div.col-sm-12').removeClass('col-sm-12').addClass('col-sm-6');
		}
		form.find('[name$="_address_states_state"]').parents('.form-group').find('.control-label span').html('State*');
	}
}


var defAddCardStateField = $('select[name$="_addressFields_states_state"]').first();
var defAddCardStateFieldName = defAddCardStateField.attr('name');
var stateAddCardDropDown = defAddCardStateField.clone();
var stateAddCardTextBox = '<input type="text" name="'+defAddCardStateFieldName+'" id="'+defAddCardStateFieldName+'" placeholder=" " class="floating__input form-control-lg input-text form-control required">';

function switchAddCardStateField(parentForm) {

	var form = $('.address');

	if (typeof parentForm !== "undefined" || parentForm !='') {
		form = $('#'+parentForm);
	}

	form.find('[name$="_addressFields_states_state"]').parents('.form-group').removeClass('has-error');
	form.find('[id$="_addressFields_states_state-error"]').remove();
	var country = form.find('select[name$="_addressFields_country"]').val();
	if(country != 'US') {
		if(country == 'CA'){
			if ($('[name$="_addressFields_postalCode"]').closest('div.col-12').length > 0) {
				$('[name$="_addressFields_postalCode"]').closest('div.col-12').removeClass('col-12').addClass('col-6 pr-1');
			}
			form.find('#stateText').closest('.form-group').parent().show();
			var stateDropDownNonUS = stateDropDownNonUSOptions();
			form.find('[name$="_addressFields_states_state"]').replaceWith(stateDropDownNonUS);
			form.find('[name$="_addressFields_states_state"]').parents('.form-group').find('.control-label span').html('State');
		} else {
			//hiding state filed
			var countryWithState = $('#countryWithState').val();
			if (countryWithState && countryWithState.indexOf(country) > -1) {
				form.find('[name$="_addressFields_states_state"]').replaceWith(stateAddCardTextBox);
				form.find('[name$="_addressFields_states_state"]').parents('.form-group').find('.control-label span').html('Province');
				if ($('[name$="_addressFields_postalCode"]').closest('div.col-12').length > 0) {
					$('[name$="_addressFields_postalCode"]').closest('div.col-12').removeClass('col-12').addClass('col-6 pr-1');
				}
				form.find('#stateText').closest('.form-group').parent().show();
			} else {
				form.find('#stateText').closest('.form-group').parent().hide();
				if ($('[name$="_addressFields_postalCode"]').closest('div.col-6').length > 0) {
					$('[name$="_addressFields_postalCode"]').closest('div.col-6').removeClass('col-6 pr-1').addClass('col-12');
				}
				form.find('#stateText').removeClass('required');
			}
		}
	} else {
		form.find('#stateText').closest('.form-group').parent().show();
		form.find('[name$="_addressFields_states_state"]').replaceWith(stateAddCardDropDown);
		form.find('[name$="_addressFields_states_state"]').parents('.form-group').find('.control-label span').html('State');
		if ($('[name$="_addressFields_postalCode"]').closest('div.col-12').length > 0) {
			$('[name$="_addressFields_postalCode"]').closest('div.col-12').removeClass('col-12').addClass('col-6 pr-1');
		}
	}
}

function switchStateFieldWithValue() {
	var form = $('form[name="dwfrm_profile_address"]');
	var defStateFieldValue = form.find('[name$="_address_states_state"]').attr('data-selectedValue');
	form.find('[name$="_address_states_state"]').parents('.form-group').removeClass('has-error');
	form.find('[id$="_address_states_state-error"]').remove();
	var country = form.find('select[name$="_address_country"]').val();
	if(country != 'US') {
		if(country == 'CA'){
			var stateDropDownNonUS = stateDropDownNonUSOptions();
			form.find('[name$="_address_states_state"]').replaceWith(stateDropDownNonUS);
			form.find('[name$="_address_states_state"]').parents('.form-group').find('.control-label span').html('State*');
			if ($('[name$="_address_postal"]').closest('div.col-sm-12').length > 0) {
				$('[name$="_address_postal"]').closest('div.col-sm-12').removeClass('col-sm-12').addClass('col-sm-6');
			}
			form.find('[name$="_address_states_state"]').closest('.form-group').parent().show();
		} else {
			//hiding state filed
			var countryWithState = $('#countryWithState').val();
			if (countryWithState && countryWithState.indexOf(country) > -1) {
				form.find('[name$="_address_states_state"]').replaceWith(stateTextBox);
				form.find('[name$="_address_states_state"]').parents('.form-group').find('.control-label span').html('Province*');
				if ($('[name$="_address_postal"]').closest('div.col-sm-12').length > 0) {
					$('[name$="_address_postal"]').closest('div.col-sm-12').removeClass('col-sm-12').addClass('col-sm-6');
				}
				form.find('[name$="_address_states_state"]').closest('.form-group').parent().show();
			} else {
				form.find('[name$="_address_states_state"]').closest('.form-group').parent().hide();
				if ($('[name$="_address_postal"]').closest('div.col-sm-6').length > 0) {
					$('[name$="_address_postal"]').closest('div.col-sm-6').removeClass('col-sm-6').addClass('col-sm-12');
				}
				form.find('[name$="_address_states_state"]').removeClass('required');
			}
		}
	} else {
		form.find('[name$="_address_states_state"]').closest('.form-group').parent().show();
		form.find('[name$="_address_states_state"]').replaceWith(stateDropDown);
		if ($('[name$="_address_postal"]').closest('div.col-sm-12').length > 0) {
			$('[name$="_address_postal"]').closest('div.col-sm-12').removeClass('col-sm-12').addClass('col-sm-6');
		}
		form.find('[name$="_address_states_state"]').parents('.form-group').find('.control-label span').html('State*');
	}
	form.find('[name$="_address_states_state"]').val(defStateFieldValue);
}

function clearPrefillFormData() {
	$('#dwfrm_profile_address_city').val('');
	$('input#dwfrm_profile_address_states_state').val('');
	$('select#dwfrm_profile_address_states_state').val('');
}

function initializeAddAddressForm() {
	$('#dwfrm_profile_address_postal').on('keydown',function(e){
		zipCodValidation(e,"tel")
	});
    //Initial state field
	switchStateFieldWithValue();
	if($('[name$="_address_country"]').val() != 'US') {
		var zipField = $('[name$="_address_postal"]');
		if(zipField.length) {
			zipField.rules('remove', 'minlength');
			zipField.rules('add', {minlength: 3});
		}
		zipField.attr('minlength','3');
   		zipField.attr('maxlength','15');
   		zipField.attr('type','text');
	  	zipField.on('keydown',zipCodValidation);
	} else {
		var zipField = $('[name$="_address_postal"]');
		if(zipField.length) {
			zipField.rules('remove', 'minlength');
			zipField.rules('add', {minlength: 5});
		}
		zipField.attr('minlength','5');
		zipField.attr('maxlength','10');
		zipField.attr('type','text');
		zipField.on('keydown',zipCodValidation);
    }

	//auto-correct for city filed
	var cityField = $('[name$="_address_city"]');
	cityField.attr('autocorrect','off');
	cityField.attr('data-msg-required','Please enter a valid city.');
	cityField.attr('data-msg-minlength','Please enter a valid city.');

	//Change Event
    $('select[name$="_address_country"]').on('change', function() {
    	switchStateField();
    	var form = $(this).parents('form');
    	var zipField = form.find('[name$="_address_postal"]');
    	if($(this).val() != 'US') {
    		if(zipField.length) {
    			zipField.rules('remove', 'minlength');
    			zipField.rules('add', {minlength: 3});
    		};
    		zipField.attr('minlength','3');
       		zipField.attr('maxlength','15');
       		zipField.attr('type','text');
    	  	zipField.val('');
    	  	zipField.on('keydown',zipCodValidation);
    	  	zipField.removeAttr('inputmode');
    	  	zipField.removeAttr('pattern');
    	  	if($(this).val() == 'CA'){
				form.find('[name$="_address_states_state"]').attr('data-msg-required' , 'Please select a state.');
			} else {
				form.find('[name$="_address_states_state"]').attr('data-msg-required' , 'Please enter a valid state.');
			}
		} else {
			if(zipField.length) {
				zipField.rules('remove', 'minlength');
				zipField.rules('add', {minlength: 5});
			}
			zipField.attr('maxlength','10');
			zipField.attr('type','text');
			zipField.attr('inputmode','decimal');
			zipField.attr('pattern','[0-9]*');
			form.find('[name$="_address_states_state"]').attr('data-msg-required' , 'Please select a state.');
			zipField.val('');
			zipField.on('keydown',zipCodValidation);
	    }
	});

$('select[name$="_addressFields_country"]').on('change', function() {
	var parentForm = $(this).parents("form").attr("id");
	switchAddCardStateField(parentForm);
	var form = $(this).parents('form');
	var zipField = form.find('[name$="_addressFields_postal"]');
	if($(this).val() != 'US') {
		zipField.parents('.form-group').find('.control-label span').html('Postal Code');

		if(zipField.length) {
			zipField.rules('remove', 'minlength');
			zipField.rules('add', {minlength: 3});
		}
		zipField.attr('minlength','3');
   		zipField.attr('maxlength','15');
   		zipField.attr('type','text');
	  	zipField.val('');
	  	zipField.removeAttr('inputmode');
	  	zipField.removeAttr('pattern');
	  	if($(this).val() == 'CA'){
	  		form.find('[name$="_addressFields_states_state"]').attr('data-msg-required' , 'Please select a state.');
	  	} else {
	  		form.find('[name$="_addressFields_states_state"]').attr('data-msg-required' , 'Please enter a valid state.');
	  	}
	  	zipField.on('keydown', zipCodValidation);
	} else {
		zipField.parents('.form-group').find('.control-label span').html('ZIP Code');

		if(zipField.length) {
			zipField.rules('remove', 'minlength');
			zipField.rules('add', {minlength: 5});
		}
		zipField.attr('minlength','5');
		zipField.attr('maxlength','10');
		zipField.attr('type','text');
		zipField.val('');
		zipField.attr('inputmode','decimal');
		zipField.attr('pattern','[0-9]* ');
		form.find('[name$="_addressFields_states_state"]').attr('data-msg-required' , 'Please select a state.');
		zipField.on('keydown', zipCodValidation);
    }
});

    function isUSzipcode(code) {
    	var countryCodes = ['US', 'AS', 'PR', 'FM', 'GU', 'MP', 'VI'];
    	for(var i=0;i<countryCodes.length;i++) {
    		if(code === countryCodes[i]){
    			return true;
    		}
    	}
    	return false;
    }

    //Fill city from zipcode
    $('#dwfrm_profile_address_postal').on('keyup', function (e) {
		var zip = $("#dwfrm_profile_address_postal").val();
	    var city = '';
	    var selectedCountry = $('#dwfrm_profile_address_country').val();
	    var state_shortname = '';
	    var state_longname = '';

	    if(!zip){
	    	return false;
	    }

	    /*if(isUSzipcode(selectedCountry) && zip.length > 4) {
	    	//make a request to the google geocode api
		    $.getJSON('https://maps.googleapis.com/maps/api/geocode/json?components=postal_code:'+zip+'&key='+SitePreferences.GOOGLE_API_KEY).success(function(response){
		    	//find the city and state
		    	if(response.results.length == 0){
		    		clearPrefillFormData();
		    		return;
		    	}
	  	  		var zipCountry = '';
	  	  		for(var i=0; i<response.results[0].address_components.length; i++) {
	  	  			if(response.results[0].address_components[i].types[0] === 'country') {
	  	  				zipCountry = response.results[0].address_components[i].short_name;
	  	  			}
	  	  		}
	  	  		if(isUSzipcode(zipCountry)) {
		  	  		var address_components = response.results[0].address_components;
			    	$.each(address_components, function(index, component){
			    	    var types = component.types;
			    	    $.each(types, function(index, type){
			    	    	if(zipCountry !== 'VI' && (type == 'locality' || type == 'neighborhood')) {
  			  	    			city = component.long_name;
  			  	    		} else if(zipCountry === 'VI' && type == 'administrative_area_level_1'){
  			  	    			city = component.long_name;
  			  	    		}

				    	    if(zipCountry === 'US' && type == 'administrative_area_level_1') {
				    	    	state_shortname = component.short_name;
					        	state_longname = component.long_name;
				    	    } else if(zipCountry !== 'US' && type === 'country') {
				    	    	state_shortname = component.short_name;
				  	        	state_longname = component.long_name;
				    	    }
			    	    });
			    	});
			    	//pre-fill the city and state
			    	$('#dwfrm_profile_address_city').val(city);
			    	$('input#dwfrm_profile_address_states_state').val(state_longname);
			    	$('select#dwfrm_profile_address_states_state').val(state_shortname);
	  	  		} else {
	  	  			clearPrefillFormData();
	  	  		}
		    });
  	  	}*/
	});

    $('.switch-card-form .checkout-radio-block').on('click', function(){
    	var form = $(this).parents('form');
    	form.find('.checkout-radio-block').removeClass('selected');
    	$(this).addClass('selected');
    });


	/*$('select#dwfrm_singleshipping_shippingAddress_addressFields_country').on('change', function() {
		var zipField = $('#dwfrm_singleshipping_shippingAddress_addressFields_postal');
		if($('#dwfrm_singleshipping_shippingAddress_addressFields_country').val()==='US') {
			zipField.attr('maxlength','5');
			zipField.attr('type','tel');
			zipField.val('');
			zipField.on('keyup',zipCodValidation);
		}
		else{
			zipField.attr('minlength','3');
			zipField.attr('maxlength','15');
			zipField.attr('type','text');
			zipField.val('');
			zipField.on('keyup',zipCodValidation);
		}
	});

	$('select#dwfrm_billing_billingAddress_addressFields_country').on('change', function() {
		var zipField = $('#dwfrm_billing_billingAddress_addressFields_postal');
		if($('#dwfrm_billing_billingAddress_addressFields_country').val()==='US'){
			zipField.attr('maxlength','5');
			zipField.attr('type','tel');
			zipField.val('');
			zipField.on('keyup',zipCodValidation);
		}
		else{
			zipField.attr('minlength','3');
			zipField.attr('maxlength','15');
			zipField.attr('type','text');
			zipField.val('');
			zipField.on('keyup',zipCodValidation);
		}
	});

	if($('select#dwfrm_profile_address_country').val() === 'US') {
		var zipField = $('#dwfrm_profile_address_postal');
		zipField.attr('maxlength','5');
		zipField.attr('type','tel');
	} else {
		var zipField = $('#dwfrm_profile_address_postal');
		zipField.attr('maxlength','15');
		zipField.attr('type','text');
	}

	if($('select#dwfrm_singleshipping_shippingAddress_addressFields_country').val() === 'US') {
		var zipField = $('#dwfrm_singleshipping_shippingAddress_addressFields_postal');
		zipField.attr('maxlength','5');
		zipField.attr('type','tel');
	} else {
		var zipField = $('#dwfrm_singleshipping_shippingAddress_addressFields_postal');
		zipField.attr('maxlength','15');
		zipField.attr('type','text');
	}

	if($('select#dwfrm_billing_billingAddress_addressFields_country').val() === 'US') {
		var zipField = $('#dwfrm_billing_billingAddress_addressFields_postal');
		zipField.attr('maxlength','5');
		zipField.attr('type','tel');
	} else {
		var zipField = $('#dwfrm_billing_billingAddress_addressFields_postal');
		zipField.attr('maxlength','15');
		zipField.attr('type','text');
	} */



    /*$('#dwfrm_singleshipping_shippingAddress_addressFields_postal').on('blur', function (e) {
    	var zip = $("#dwfrm_singleshipping_shippingAddress_addressFields_postal").val();
  	  	var city = '';
  	  	var state_shortname = '';
  	  	var state_longname = '';

  	  	if(!zip){
  	  		return false;
  	  	}

  	  	//make a request to the google geocode api
  	  	$.getJSON('https://maps.googleapis.com/maps/api/geocode/json?address='+zip).success(function(response){
	  	    //find the city and state
	  	    var address_components = response.results[0].address_components;
	  	    $.each(address_components, function(index, component){
	  	    	var types = component.types;
	  	    	$.each(types, function(index, type){
	  	    		if(type == 'locality') {
	  	    			city = component.long_name;
	  	    		}
	  	    		if(type == 'administrative_area_level_1') {
		  	        	state_shortname = component.short_name;
		  	        	state_longname = component.long_name;
	  	    		}
	  	    	});
	  	    });
	  	    //pre-fill the city and state
	  	    $('#dwfrm_singleshipping_shippingAddress_addressFields_city').val(city);
	  	    $('input#dwfrm_singleshipping_shippingAddress_addressFields_states_state').val(state_longname);
	  	    $('select#dwfrm_singleshipping_shippingAddress_addressFields_states_state').val(state_shortname);
  	  	});
    });

    $('#dwfrm_billing_billingAddress_addressFields_postal').on('blur', function (e) {
    	var zip = $("#dwfrm_billing_billingAddress_addressFields_postal").val();
  	  	var city = '';
  	  	var state_shortname = '';
  	  	var state_longname = '';

  	  	if(!zip){
  	  		return false;
  	  	}

  	  	//make a request to the google geocode api
  	  	$.getJSON('https://maps.googleapis.com/maps/api/geocode/json?address='+zip).success(function(response){
	  	    //find the city and state
	  	    var address_components = response.results[0].address_components;
	  	    $.each(address_components, function(index, component){
	  	    	var types = component.types;
	  	    	$.each(types, function(index, type){
	  	    		if(type == 'locality') {
	  	    			city = component.long_name;
	  	    		}
	  	    		if(type == 'administrative_area_level_1') {
		  	        	state_shortname = component.short_name;
		  	        	state_longname = component.long_name;
	  	    		}
	  	    	});
	  	    });
	  	    //pre-fill the city and state
	  	    $('#dwfrm_billing_billingAddress_addressFields_city').val(city);
	  	    $('input#dwfrm_billing_billingAddress_addressFields_states_state').val(state_longname);
	  	    $('select#dwfrm_billing_billingAddress_addressFields_states_state').val(state_shortname);
  	  	});
    });
    */
}


/**
 * @private
 * @function
 * @description Binds the events of the order, address and payment pages
 */
function initializeEvents() {
    toggleFullOrder();
    initAddressEvents();
    initPaymentEvents();
    login.init();
    initializeAddAddressForm();
}
function clearContactUsForm(){
	if($('.contact-us').length){
		$('.contact-us').find('.input-text,.input-textarea').val('');
	}
}
var account = {
    init: function () {
        initializeEvents();
        giftcert.init();
        addToCart();
        clearContactUsForm();
    },
    initajax: function () {
        initializeEvents();
        giftcert.init();
        clearContactUsForm();
    },
    initCartLogin: function () {
        login.init();
    }
};


$(document).on('click', '.orders-see-more-ajax-btn', function(event) {
	event.preventDefault();
	$(this).addClass('loading-btn');
	var api_url = $(this).attr('data-api-url');
	$.ajax({
        type: 'GET',
        url: api_url,
        success: function (response) {
        	var row = $(".orders-stack-unit").last();
        	$('.orders-see-more-ajax-btn').remove();
        	$(response).insertAfter(row);
        	account.initajax();
        }
    });
})

/*
 * Reorder
 */
$(document).on('click','.reorder-more', function(event) {
	event.preventDefault();
	//progress.show();
	$(this).addClass('loading-btn');
	var api_url = $(this).attr('data-api-url');
	$.ajax({
        type: 'GET',
        url: api_url,
        success: function (response) {
        	var row = $(".product-stack-list-unit").last();
        	$(".reorder-see-more").remove();
        	$(response).insertAfter(row);
        	account.initajax();
        	//progress.hide();
        }
    });
});

/*
 * Pagination
 */
$(document).on('click', '.reorder-prd-add-qv', function (e) {
	e.preventDefault();
	var productUrl = $(this).attr('data-url');
	var productId = $(this).attr('data-pid');
	var price = $(this).attr('data-price');
	var productname = $(this).attr('data-productname');
	var button = $(this);
	button.addClass('loading-btn');
	$.ajax({
        type: 'POST',
        url: util.ajaxUrl(Urls.addProduct),
        data: {'Quantity':'1',
    		   'uuid':'',
    		   'cartAction':'update',
    		   'pid': productId,
    		   'page':'account',
    		   'pageInfo': 'addToBag'
        },
        success:function(response) {
    		button.removeClass("loading-btn");
    		sendAddToCartGAData(productId, '1', price, productname,'');
    		showAddToBagModal(response, productId);
        }
    });
});

/**
 * @description Make the dataLayer push to send item data to GA
 * @param product ID and price
 * **/
var sendAddToCartGAData = function(productId, quantity, price, productname,source) {
	try {
		if(!source){
			source = '';
		}

    	if (!window.dataLayer) {
			window.dataLayer = [];
		}
    	dataLayer.push({
    		"event": "tatcha_add_to_cart",
    		"prodID": productId,
    		"prodName": productname,
    		"sourceButton": source,
    		"prodPrice": price
    	});
	} catch (e) {
		throw e;
	}
}

/*
 * QV modal and add to cart
 *
 */

$(document).on('click','#quickviewModal .auto-delivery-toggle', function (e) {
	if ($('input.auto-delivery-toggle').prop('checked')) {

		if($('#select-everydelivery').length > 0){
			$('#select-everydelivery').show();
		} else {
            $('select[name=OsfSorDeliveryWeekInterval],.OsfSorDeliveryInterval-help').show();
            $('select[name=OsfSorDeliveryInterval],.OsfSorDeliveryInterval-help').show();
		}

	} else {
		$('#select-everydelivery').hide();
        $('select[name=OsfSorDeliveryWeekInterval],.OsfSorDeliveryInterval-help').hide();
        $('select[name=OsfSorDeliveryInterval],.OsfSorDeliveryInterval-help').hide();
	}

});


var updateQVContent = function (href) {
    var $pdpForm = $('.pdpForm');
    var qty = $pdpForm.find('input[name="Quantity"]').first().val();
    var params = {
        Quantity: isNaN(qty) ? '1' : qty,
        format: 'ajax',
        productlistid: $pdpForm.find('input[name="productlistid"]').first().val()
    };

    progress.show($('#pdpMain'));

	var link = $('a[href="'+href+'"]');
	if(link.data("vtype") == 'skinTypeVariation') {
		var target = $('#quickviewModal-content');
	} else {
		var target = $('#product-content');
	}

    ajax.load({
        url: util.appendParamsToUrl(href, params),
        target: target,
        callback: function () {
            image.replaceImages();
            tooltip.init();
        }
    });
};

$(document).on('click', '.product-detail .swatchanchor', function (e) {
    e.preventDefault();
    if ($(this).hasClass("active")) {
    	return;
    }
    updateQVContent(this.href);


});


//Password reset changes
$(document).on('click', '#sms-verify-code', function (e) {
	e.preventDefault();
	$("#verifysmscode  .alert-danger").hide();

	if(!$('#verifyCodeUrl').val() ||  !$('#smsverifycode').val() ){
		return;
	}

	$.ajax({
		type: 'POST',
		url: $('#verifyCodeUrl').val(),
		data: {
			"phoneNumber": $('#modalResetPhone').val(),
			"verificationCode": $('#smsverifycode').val(),
			"resetPassword" : true,

		},
		success:function(r) {
			if(r.response.redirectUrl){
				$(location).attr('href',r.response.redirectUrl);
			} else {
				$("#verifysmscode  .alert-danger").show();
			}
		}
	 });
});

$(document).on('change', '#dwfrm_requestpassword_resetType', function (e) {
	$('#resetEmail').val('');
	$('#resetPhone').val('');
	$('.alert-danger').remove();

    if($(this).val()!='email'){
    	$('#phoneblock').show();
    	$('#emailblock').hide();
    	if($(this).val()=='sms'){
    		$("#resetbutton").text('Send Text');
    	} else {
    		$("#resetbutton").text('Send Call');
    	}

    } else {
    	$('#phoneblock').hide();
    	$('#emailblock').show();
    	$("#resetbutton").text('Send Email');
    }

 });


$(document).on('click', '#modalTextAgain, #modalCallAgain', function (e) {

	e.preventDefault();
	$("#verifysmscode  .alert-danger").hide();
	var resetType = 'sms';
	if($(this).attr('id') == 'modalCallAgain') {
		resetType = 'call';
	} else {

	}

	if(!$('#resendCodeUrl').val() || !$('#modalResetPhone').val() ){
		return;
	}

	$.ajax({
		type: 'POST',
		url: $('#resendCodeUrl').val(),
		data: {
			"phoneNumber": $('#modalResetPhone').val(),
			"resetType": resetType
		},
		success:function(r) {
			if(r.response.success){
				alert('Code sent');
			}
		}
	 });
});

function focusElement(e) {
	var container = document.querySelector("#minibag-container-wrap");
	var focusableEls = container.querySelectorAll('div.close-bag, h2, a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled])');
    var firstFocusableEl = focusableEls[0];
    var lastFocusableEl = focusableEls[focusableEls.length - 1];

	var KEYCODE_TAB = 9;
	var isTabPressed = (e.key === 'Tab' || e.keyCode === KEYCODE_TAB);

    if (!isTabPressed) {
        return;
    }

    if ( e.shiftKey ) /* shift + tab */ {
        if (document.activeElement === firstFocusableEl) {
            lastFocusableEl.focus();
            e.preventDefault();
        }
    } else /* tab */ {
        if (document.activeElement === lastFocusableEl) {
            firstFocusableEl.focus();
            e.preventDefault();
        }
    }
}

// Trap focus on mini bag when open for tab events
function trapMiniBagFocus() {
	var container = document.querySelector("#minibag-container-wrap");
	container.addEventListener('keydown', focusElement);

    // Close mini bag
	$('.close-bag').on('keypress',function(e) {
	    if(e.which == 13 || e.which == 32) {
	    	$(this).trigger("click");
	    }
	});
}

var showAddToBagModal = function (bagData, pid) {
	$('.mini-bag-container').empty();
    //appending the response to minicart container div
    $('.mini-bag-container').append(bagData);

    // Call after pay if eligible
    if ( $( "#afterpay-express-button" ).length ) {
    	initAfterpay();
    }
    if($('.mini-bag #minibag-pid').length >0) {
    	$('.mini-bag #minibag-pid').val(pid);
    }

    /**
	 * To show the minibag drawer
	 * */
    /*$('.mini-bag').removeClass("hide-minibag");
    $('.minibag-mask').show();*/
    $('body').css("overflow","hidden");
   setTimeout(function() {
	   /*$('.mini-bag').addClass("show-minibag");*/
		minicart.showMinibag();
	   $('body').tooltip({
   	    selector: '[data-toggle="tooltip"]'
   	});
	$('#minibag-container-wrap .add-to-bag-status').text('Product added to your bag')
   	$("#minibag-container-wrap .close-bag").focus();
	trapMiniBagFocus();
   }, 100);
   if(pid) {
	   sendAddToCartGlobalGA(pid);
   }
};

var sendAddToCartGlobalGA = function(pid) {
	try {

		var prodId = pid || '';
		if (!window.dataLayer) {
			window.dataLayer = [];
		}

		dataLayer.push({
			'event': 'add_to_cart_global',
			'prodID': prodId
    	});

	} catch(e) {

	}
}
$(".modal-quickview").on("hidden.bs.modal", function () {
	$('.reorder-prd-add-qv').removeClass('loading-btn');
});

function getUrlParam(name) {
	var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
	if(results) {
		return results[1] || 0;
	}
	return false;
}

var reqEvent = getUrlParam('triggerEvent');
if(reqEvent && reqEvent === 'unsubscribe') {
	$('.alert-email-unsub').show();
}

// Account - add phone number
$(function() {
	if($('.my-account-phone-add').length) {
		$('#dwfrm_login_password').val('');
		var phoneValidator = window.intlTelInput(document.querySelector("#customer_phone"), {
			initialCountry: 'us',
			separateDialCode: true,
			utilsScript: $("#validatorScript").val()
		});



		$('#modalDeletePhone').on('hidden.bs.modal', function () {
			$('#delete-current-password').val('');
			$('#delete-current-password').closest('.form-group').removeClass('has-error');
		    $('#delete-current-password').closest('.form-group').find('.help-block').hide();
		})

		$('#addPhone').on('hidden.bs.modal', function () {
			location.reload();
		})

		$('#addPhone').on('shown.bs.modal', function (e) {
			var phoneNumber = document.querySelector("#customer_phone").value.trim();
			$('#registeredNumber').text(phoneNumber);

		})

		function resetPhoneField() {
			$('#customer_phone').closest('.form-group').removeClass('has-error');
			$('#customer_phone').closest('.form-group').find('.help-block').hide();
		}

		function resetPasswordField() {
			$('#current-password').closest('.form-group').removeClass('has-error');
			$('#current-password').closest('.form-group').find('.help-block').hide();
		}

		function showPhoneValidation() {
			$('#customer_phone').closest('.form-group').addClass('has-error');
		    $('#customer_phone').closest('.form-group').find('.help-block').show();
		}

		function showPasswordValidation() {
			$('#current-password').closest('.form-group').addClass('has-error');
		    $('#current-password').closest('.form-group').find('.help-block').show();
		}

		$('#delete-current-password').focusin(function() {
			$('#delete-current-password').closest('.form-group').removeClass('has-error');
		    $('#delete-current-password').closest('.form-group').find('.help-block').hide();
		});

		$('#customer_phone').focusin(function() {
			resetPhoneField();
		})

		$('#current-password').focusin(function() {
			resetPasswordField();
		})

		$(document).on('click', '#accountAddPhoneBtn', function() {
			var phoneNumber = document.querySelector("#customer_phone").value.trim();
			var countryCode = phoneValidator.getSelectedCountryData().dialCode;
			var userPassword = document.querySelector("#current-password").value.trim();
			var formattedNumber = phoneValidator.getNumber(2);

			if(phoneNumber.length && userPassword.length) {
				resetPhoneField();
			    resetPasswordField();
				sendVerificationCode(phoneNumber,formattedNumber, countryCode, true, 'sms', userPassword);
			} else {
				if(phoneNumber.length === 0) {
					showPhoneValidation();
				}
				if(userPassword.length === 0) {
					showPasswordValidation();
				}

			}
		})

		$(document).on('click', '.phone-verify #account-phone-verify', function () {
			  $('.alert-incorrect-code').hide();
		  	  var phoneNumber = document.querySelector("#customer_phone").value.trim();
		  	  var countryCode = phoneValidator.getSelectedCountryData().dialCode;
		  	  var verificationCode = document.querySelector("#verification").value.trim();
		  	  if(verificationCode.length) {
			  		$('#verification').closest('.form-group').removeClass('has-error');
				    $('#verification').closest('.form-group').find('.help-block').hide();
			  		$.ajax({
			  			type: 'POST',
			  			url: $('#verifyPhoneNumber').val(),
			  			data: {
			  				"phoneNumber": phoneNumber,
			  				"verificationCode":verificationCode,
			  				"countryCode": countryCode,
			  				"updateProfile": true
			  			},
			  			success:function(r) {
			  				if(r.response.success){
			  					$('.phone-verify').hide();
			  					$('.phone-confirm').show();
			  				} else {
			  					$('.alert-incorrect-code').show();
			  					$('.alert-resend').hide();
			  				}
			  			}
			  		});
		  	  }	else {
		  		$('.alert-incorrect-code').hide();
		  		$('#verification').closest('.form-group').addClass('has-error');
			    $('#verification').closest('.form-group').find('.help-block').show();
		  	  }



		})

		$(document).on('click', '.btn-edit-phone', function() {
			var countryShortCode;
			var dialCode = $(this).attr('data-dial');
			window.intlTelInputGlobals.getCountryData().find(function(el){
				if(el.dialCode === dialCode) {
					countryShortCode = el.iso2;
				}
			});

			phoneValidator.setCountry(countryShortCode);
			$('.phone-add-title').hide();
			$('.phone-edit-title').show();
			$('#addPhone').modal('show');

		});

		$(document).on('click', '.edit-phone-continue', function() {
			$('.phone-verify').show();
			$('.phone-capture').hide();
			$('#addPhone').modal('show');
		});

		$(document).on('click', '.btn-phone-delete-continue', function(e) {
			var password = document.querySelector("#delete-current-password").value.trim();
			e.preventDefault();
			if(password.length > 0) {
				$('#delete-current-password').closest('.form-group').removeClass('has-error');
			    $('#delete-current-password').closest('.form-group').find('.help-block').hide();
				$.ajax({
		  			type: 'POST',
		  			url: $('#deletePhoneNumber').val(),
		  			data: {
		  				"password": password,
		  				'csrf_token': $('.confirm-phone-delete input[name="csrf_token"]').val()
		  			},
		  			success:function(r) {
		  				if(r.response.success){
		  					$('.confirm-phone-delete .alert-password-incorrect').hide();
		  					location.reload();
		  				} else {
		  					if(r.response.msg === 'authentication_failed') {
								$('.confirm-phone-delete .alert-password-incorrect').show();
								$('#delete-current-password').closest('.form-group').addClass('has-error');
							    $('#delete-current-password').closest('.form-group').find('.help-block').show();
							}
		  				}
		  			}
				});
			} else {
				$('#delete-current-password').closest('.form-group').addClass('has-error');
			    $('#delete-current-password').closest('.form-group').find('.help-block').show();
			}
		});

		$(document).on('click', '.btn-account-phone-resend', function() {
			$('.alert-incorrect-code').hide();
			var resetType = $(this).attr("data-type");
		  	var mobileNumber = $(this).attr("data-phone");
		  	var formattedNumber = phoneValidator.getNumber(2);
		  	var countryCode = $(this).attr("data-dial");

		  	sendVerificationCode(mobileNumber,formattedNumber, countryCode, false, resetType);
		});

		function sendVerificationCode(mobileNumber,formattedNumber, dialCode, showModal, resetType, userPassword){

	  		if (typeof resetType === 'undefined' || resetType =='') {
	  			resetType = 'sms';
	  		}

	  		if(typeof userPassword === 'undefined') {
	  			userPassword = '';
	  		}

	  		$.ajax({
	  			type: 'POST',
	  			url: $('#AddProfilePhoneNumber').val(),
	  			data: {
	  				"phoneNumber": mobileNumber,
	  				"countryCode": dialCode,
	  				"updateProfile": true,
	  				"resetType": resetType,
	  				"password": userPassword
	  			},
	  			success:function(r) {
	  				if(r.response.success){
	  					if(showModal){
	  						$("#modalphone").text(formattedNumber);
	  						$('.phone-capture').hide();
	  						$('#registeredNumber').text(mobileNumber);
	  	  					$('.phone-verify').show();
	  	  					$('#verification').val('');
	  					} else {
							$('.alert-resend').show();
	  					}
	  				} else {
	  					if(r.response.msg === 'authentication_failed') {
	  						$('.alert-resend').hide();
							$('.alert-password-incorrect').show();
							showPasswordValidation();
						    resetPhoneField();
						} else {
							resetPasswordField();
						    $('.alert-password-incorrect').hide();
						}

	  					if(!r.response.is_cellphone && r.response.msg !== 'authentication_failed') {
	  						showPhoneValidation();
						}
	  				}
	  			}
			});
		}
	}
});

// Account - Registration page
$(function(){
	  if($('main').is('.my-account-register')){

		  $("#recoveryPhone").on("btn-phone-cancel-verify", function () {
			  let isSetPassword = $('#isSetpassword').length ? $('#isSetpassword').val() : null;
			  if($("#skipPhoneValidation").val() == 0) {
				  $("#skipPhoneValidation").val(1);
				  if(isSetPassword !== null) {
			  		  $('#setNewPasswordbtn').trigger("click");
			  	  } else {
			  		$("#registerBtn").trigger("click");
			  	  }
			  }
		  });

		  $("#recoveryPhone").on("hidden.bs.modal", function () {
			  let isSetPassword = $('#isSetpassword').length ? $('#isSetpassword').val() : null;
			  if($("#skipPhoneValidation").val() == 0) {
				  $("#skipPhoneValidation").val(1);
				  if(isSetPassword !== null) {
			  		  $('#setNewPasswordbtn').trigger("click");
			  	  } else {
			  		$("#registerBtn").trigger("click");
			  	  }
			  }
		  });

		  $('#dwfrm_profile_customer_phoneMobile').focusin(function() {
			  $('#dwfrm_profile_customer_phoneMobile').closest('.form-row').removeClass('has-phoneMobile-error-border');
  			  $('#dwfrm_profile_customer_phoneMobile').closest('.form-row').find('.help-block').hide();
			})

		  $(document).on('click', '.btn-phone-verify', function (e) {
		  	  $('.alert-incorrect-code').hide();
		  	  $('.alert-resend').hide();
		  	  $('.register-otp-verification-wrap').removeClass('has-error');
		  	  $('.help-block-register-verification').hide();
		  	  var phoneNumber = document.querySelector("#dwfrm_profile_customer_phoneMobile").value.trim();
		  	  var countryCode = document.querySelector("#dwfrm_profile_customer_countryCode").value.trim();
		  	  var verificationCode = document.querySelector("#verification").value.trim();
		  	  let resetToken = $('#Token').length > 0 ? $('#Token').val() : null;

		  	  if(!verificationCode) {

		  		$('.register-otp-verification-wrap').addClass('has-error');
		  		$('.help-block-register-verification').show();

		  	  } else {
				  	 $.ajax({
				  			type: 'POST',
				  			url: $('#verifyCodeUrl').val(),
				  			data: {
				  				"phoneNumber": phoneNumber,
				  				"verificationCode":verificationCode,
				  				"countryCode": countryCode,
				  				"resetToken": resetToken
				  			},
				  			success:function(r) {
				  				if(r.response.success){
				  					$('.phone-verify').hide();
				  					$('.phone-confirm').show();
				  				} else {
				  					$('.alert-incorrect-code').show();
				  				}
				  			}
				  	 });
		  	  }
		  });

		  $(document).on('click', '.verify-register', function (e) {
			  e.preventDefault();
			  let isSetPassword = $('#isSetpassword').length ? $('#isSetpassword').val() : null;
			  $('#recoveryPhone').modal('hide');
		  	  $("#skipPhoneValidation").val(1);
		  	  if(isSetPassword !== null) {
		  		  $('#setNewPasswordbtn').trigger("click");
		  	  } else {
		  		$("#registerBtn").trigger("click");
		  	  }

		  });

		  // Form submit
		  var phoneValidator = '';
		  if($('#dwfrm_profile_customer_phoneMobile').length){
			  phoneValidator = window.intlTelInput(document.querySelector("#dwfrm_profile_customer_phoneMobile"), {
				  initialCountry: 'us',
				  separateDialCode: true,
				  utilsScript: $("#validatorScript").val()
			  });
			  $('label[for="dwfrm_profile_customer_phoneMobile"]').attr('title', 'Phone number (Optional)');
		  }



		  $(document).on('click', '.btn-phone-resend', function (e) {
			$('.alert-incorrect-code').hide();
		  	var resetType = $(this).attr("data-type");
		  	var mobileNumber = document.querySelector("#dwfrm_profile_customer_phoneMobile").value.trim();
		  	var formattedNumber = phoneValidator.getNumber(1);

		  	sendVerificationCode(mobileNumber,formattedNumber,phoneValidator.getSelectedCountryData().dialCode,false,resetType);
		  });


		  $( "#RegistrationForm, #NewPasswordForm" ).submit(function( event ) {

		  	  var mobileNumber = document.querySelector("#dwfrm_profile_customer_phoneMobile").value.trim();
		  	  var skipPhoneValidation = document.querySelector("#skipPhoneValidation").value.trim();
		  	  if(mobileNumber!='' && skipPhoneValidation == "0"){
		  		  if(phoneValidator.isValidNumber()){
		  			  // Set the country code to DW form
		  			  document.getElementById("dwfrm_profile_customer_countryCode").value = phoneValidator.getSelectedCountryData().dialCode;
		  			  try{
		  				document.querySelector("#dwfrm_profile_customer_phoneMobile").value = phoneValidator.getNumber().replace("+"+phoneValidator.getSelectedCountryData().dialCode, "");
		    		  } catch(err){}
		  			  // Call the api and show the modal
		    		  let resetToken = $('#Token').length > 0 ? $('#Token').val() : null;
		  			  var formattedNumber = phoneValidator.getNumber(1);
		  			  sendVerificationCode(mobileNumber,formattedNumber,phoneValidator.getSelectedCountryData().dialCode,true,"sms", resetToken);

		  		  } else {
		  			  if ($('#dwfrm_profile_customer_phoneMobile').closest('.form-row').length) {
						  $('#dwfrm_profile_customer_phoneMobile').closest('.form-row').addClass('has-phoneMobile-error-border')
			  			  if($('.reg-mobile-error').length === 0) {
			  				$('#dwfrm_profile_customer_phoneMobile').closest('.form-row').append('<div class="help-block reg-mobile-error">Please enter valid phone</div>');
			  			  }
			  			  $('#dwfrm_profile_customer_phoneMobile').closest('.form-row').find('.help-block').show();
		  			  } else {
		  				$('#dwfrm_profile_customer_phoneMobile').closest('.form-group').addClass('has-phoneMobile-error-border')
			  			  if($('.reg-mobile-error').length === 0) {
			  				$('#dwfrm_profile_customer_phoneMobile').closest('.form-group').append('<div class="help-block reg-mobile-error">Please enter valid phone</div>');
			  			  }
			  			  $('#dwfrm_profile_customer_phoneMobile').closest('.form-group').find('.help-block').show();
		  			  }
		  		  }
		  		  event.preventDefault();
		  	  }
		  });


		  //Functions
		  function sendVerificationCode(mobileNumber,formattedNumber,dialCode,showModal,resetType, resetToken){

		  		if (typeof resetType === 'undefined' || resetType =='') {
		  			resetType = 'sms';
		  		}

		  		$.ajax({
		  			type: 'POST',
		  			url: $('#sendVerificationCodeUrl').val(),
		  			data: {
		  				"phoneNumber": mobileNumber,
		  				"resetType": resetType,
		  				"countryCode": dialCode,
		  				"resetToken": resetToken
		  			},
		  			success:function(r) {
		  				if(r.response.success){
		  					if(showModal){
		  						$("#modalphone").text(formattedNumber);
			  					$('.phone-verify').show();
			  					$('.phone-confirm').hide();
			  					$('#verification').val('');
		  						$('#recoveryPhone').modal('show');
		  					} else {
		  						$('.alert-resend').show();
		  					}
		  				}
		  			}
		  		 });
		  }
	  }

	  // End of account registration
});

(function ($) {
    $.fn.serializeFormJSON = function () {

        var o = {};
        var a = this.serializeArray();
        $.each(a, function () {
            if (o[this.name]) {
                if (!o[this.name].push) {
                    o[this.name] = [o[this.name]];
                }
                o[this.name].push(this.value || '');
            } else {
                o[this.name] = this.value || '';
            }
        });
        return o;
    };
})(jQuery);



//Loqate address verification module

/**
 * Address suggestion modal (Loqate), save address CTA click
 * */
$('.my-account-bs .save-loqate-suggested-address').on('click', function() {
	progress.showFull();
	var selectedAddressOption = $("input[name='selectAddress']:checked").val();

	if(selectedAddressOption === 'suggestedAddress' && $('#loqateSuggestedAddress').val().length > 0) {
		var suggestedAddress = JSON.parse($('#loqateSuggestedAddress').val());
		var $form = $('#edit-address-form');
		var shippingAddressFields = ['dwfrm_profile_address_country',
			'dwfrm_profile_address_address1',
			'dwfrm_profile_address_address2',
			'dwfrm_profile_address_postal',
			'dwfrm_profile_address_states_state',
			'dwfrm_profile_address_city',
			'dwfrm_profile_address_phone'];

		var addrFields = {
			'Country': suggestedAddress['Country'],
			'Address1': suggestedAddress['Address1'],
			'Address2': suggestedAddress['Address2'],
			'PostalCode': suggestedAddress['PostalCode'],
			'AdministrativeArea': suggestedAddress['AdministrativeArea'],
			'Locality': suggestedAddress['Locality']
		};

		for(var key in addrFields) {
			if(key === 'Country') {
				$form.find('#dwfrm_profile_address_country').val(addrFields[key]).trigger('change');
			} else if(key === 'Address1') {
				$form.find('#dwfrm_profile_address_address1').val(addrFields[key]);
			} else if(key === 'Address2') {
				//$form.find('#dwfrm_profile_address_address2').val(suggestedAddress[key]);
			} else if(key === 'AdministrativeArea') {
				$form.find('#dwfrm_profile_address_states_state').val(addrFields[key]);
				$form.find('#dwfrm_profile_address_states_state').attr('data-selectedValue', addrFields[key]);
			} else if(key === 'Locality') {
				$form.find('#dwfrm_profile_address_city').val(addrFields[key]);
			} else if(key === 'PostalCode') {
				$form.find('#dwfrm_profile_address_postal').val(addrFields[key]);
			}
		}

	    // re-validate the form
	    $form.validate().form();

	    $('.account-add-address-submit').trigger('click');
	} else {

		$('.account-add-address-submit').trigger('click');
	}
});

function formatUSPhoneNumber (phone) {
	var hasPlusSign = phone.substring(0, 2) === '+1',
		n = hasPlusSign ? phone.replace(/[()-/\s]/g,'') : phone.replace(/[+()-/\s]/g,''),
		plusSign= '';

		if (hasPlusSign || phone.charAt(0) === '1') {
			plusSign = '+1'
			n = n.charAt(0) === '1' ? n.substring(1, 11) : n.substring(2, 12)
		}
	if (n.length >= 3) {
		var dash = n.length > 6 ? '-' : '';
		phone = `${plusSign}(${n.substring(0, 3)})${n.substring(3, 6)}${dash}${n.substring(6, 10)}`;
	}
	return phone;
}


$(document).ready(function(e){
    var $phoneEle = $('.confirm-phone');
    $phoneEle.each(function(index){
        $(this).html(formatUSPhoneNumber($(this).text().trim()));
    })
});

/**
 * Set input address to the verification modal
 * **/
function setInputDatatoModal(inputAddress) {
	var addrline1 = inputAddress.Address1 ? inputAddress.Address1 : '';
	addrline1 += inputAddress.Address2 ? ( ' ' + inputAddress.Address2) : '';

	var locality = inputAddress.Locality ? inputAddress.Locality : '';
	locality += inputAddress.AdministrativeArea ? ( ' ' + inputAddress.AdministrativeArea) : '';
	locality += inputAddress.PostalCode ? ( ' ' + inputAddress.PostalCode) : '';

	if(addrline1) {
		$('.entered-address-data .addressline').text(addrline1);
	}

	if(locality) {
		$('.entered-address-data .address-locality').text(locality);
	}
}

$('input[type=radio][name=selectAddress]').change(function() {
    if (this.value == 'enteredAddress') {
        $('.text-danger-checkout').show();
    }
    else if (this.value == 'suggestedAddress') {
    	$('.text-danger-checkout').hide();
    }
});


$("#loqateAddressVerification").on("hidden.bs.modal", function () {
	$('.text-danger-checkout').hide();
});



/**
 * Save address button CTA implementation
 * Reads the form fields and sent to back-end service for address verification
 * **/
$('.my-account-bs .account-add-address-btn').on('click', function(e) {
	progress.showFull();
	var addressForm = $(this).closest('form').serializeFormJSON();
	if(addressForm) {

		var countryWithState = $('#countryWithState').val();
		if (countryWithState && countryWithState.indexOf(addressForm['dwfrm_profile_address_address1'].value) > -1 || addressForm['dwfrm_profile_address_address1'].value == 'US' || addressForm['dwfrm_profile_address_address1'].value == 'CA') {
			if($.trim(addressForm['dwfrm_profile_address_address1']).length === 0 || $.trim(addressForm['dwfrm_profile_address_country']).length === 0 ||
				$.trim(addressForm['dwfrm_profile_address_postal']).length === 0 || $.trim(addressForm['dwfrm_profile_address_states_state']).length === 0 ||
				$.trim(addressForm['dwfrm_profile_address_city']).length === 0 || $.trim(addressForm['dwfrm_profile_address_phone']).length === 0 ||
				$.trim(addressForm['dwfrm_profile_address_firstname']).length === 0 || $.trim(addressForm['dwfrm_profile_address_lastname']).length === 0) {
				$('.account-add-address-submit').trigger('click');
				progress.hideFull();
				e.preventDefault();
				return;
			}
		} else {
			if($.trim(addressForm['dwfrm_profile_address_address1']).length === 0 || $.trim(addressForm['dwfrm_profile_address_country']).length === 0 ||
				$.trim(addressForm['dwfrm_profile_address_postal']).length === 0 ||
				$.trim(addressForm['dwfrm_profile_address_city']).length === 0 || $.trim(addressForm['dwfrm_profile_address_phone']).length === 0 ||
				$.trim(addressForm['dwfrm_profile_address_firstname']).length === 0 || $.trim(addressForm['dwfrm_profile_address_lastname']).length === 0) {
				$('.account-add-address-submit').trigger('click');
				progress.hideFull();
				e.preventDefault();
				return;
			}
		}


		var requestData = {
				"Address1": addressForm['dwfrm_profile_address_address1'],
				"Address2": addressForm['dwfrm_profile_address_address2'],
				"Country": addressForm['dwfrm_profile_address_country'],
				"PostalCode": addressForm['dwfrm_profile_address_postal'],
				"State": addressForm['dwfrm_profile_address_states_state'],
				"City": addressForm['dwfrm_profile_address_city']
		};

		$.ajax({
	        type: 'POST',
	        url: util.ajaxUrl(Urls.verifyAddress),
	        data: {
	        	Address: JSON.stringify(requestData)
	        },
	        success:function(res) {
	        	if(!res|| !res.response) {
	        		$('.account-add-address-submit').trigger('click');
	        		return;
	        	} else {
	        		var response =  res.response;
	        		if(response.success && response.hasAddressSuggetion) {
	        			var addressData = response.data;
	        			if(addressData) {

							// If address is verfied and has a match score of 100, submit shipping form
							if(response.verificationStatus && response.verificationStatus === 'verified' && response.matchScore && response.matchScore === '100') {
								$('.account-add-address-submit').trigger('click');
		        				progress.hideFull();
		        				return;
							}

	        				//if the inout address is not verified, we will be showing the address which user entered with a warning
	        				if(response.verificationStatus && response.verificationStatus === 'unverified') {
	        					if(addressData.inputAddress) {

	        						//set inout address to verification modal
	        						setInputDatatoModal(addressData.inputAddress);

			        				$('.suggested-address-title, .suggested-address-container').addClass('displaynone');
			        				$('#enteredAddress').prop("checked", true);
			        				$('.text-danger-checkout').show();
			        				$('#loqateAddressVerification').modal('show');
				        			progress.hideFull();

				        			return;
	        					}
		        			}

	        				//set user entered address
		        			if(addressData.inputAddress) {
		        				var inputAddress = addressData.inputAddress;
		        				setInputDatatoModal(inputAddress);

		        			}

	            			//set suggested address
	            			if(addressData.suggestedAddress) {
	            				var suggetedAddress = addressData.suggestedAddress;
	            				$('.suggested-address-title, .suggested-address-container').removeClass('displaynone');

	            				$('#selectedAddress').prop("checked", true);
		        				$('#enteredAddress').prop("checked", false);

	            				$('#loqateSuggestedAddress').val(JSON.stringify(suggetedAddress));
	            				if(suggetedAddress.Address1) {
	            					$('.suggested-address-data .addressline').text(suggetedAddress.Address1);
	            				}

	            				if(suggetedAddress.Address2) {
	            					$('.suggested-address-data .address-locality').text(suggetedAddress.Address2);
	            				}
	            			}
	        			} else {
	        				$('.account-add-address-submit').trigger('click');
	        				progress.hideFull();
	        				return;
	        			}

	        			// show address suggestion modal
	        			$('#loqateAddressVerification').modal('show');
	        			progress.hideFull();
	        		} else {
	        			$('.account-add-address-submit').trigger('click');
	        			progress.hideFull();
	        		}
	        	}


	        },
	        error: function(error) {
	        	$('.account-add-address-submit').trigger('click');
	        	progress.hideFull();
	        }
		});
	}


});

function isintlLoaded () {
	if(window.intlTelInputUtils) {
		$('.num-verify-notification').css('display', 'table');
		clearInterval(intlLoaded);
	}
}


/**
 * Loqate Account add address page form, state field swap
 * address form in account page
 * **/
function switchLoqateStateField(stateName, stateCode) {
	var form = $('form[name="dwfrm_profile_address"]');

	form.find('[name$="_address_states_state"]').parents('.form-group').removeClass('has-error');
	form.find('[id$="_address_states_state-error"]').remove();
	var country = form.find('select[name$="_address_country"]').val();
	if(country != 'US') {
		if(country === 'CA'){
			var stateDropDownNonUS = stateDropDownNonUSOptions();
			form.find('[name$="_address_states_state"]').replaceWith(stateDropDownNonUS);
			form.find('[name$="_address_states_state"]').parents('.form-group').find('.control-label span').html('State');
			form.find('[name$="_address_states_state"]').val(stateName ? stateName : '').trigger('change');
			if ($('[name$="_address_postal"]').closest('div.col-sm-12').length > 0) {
				$('[name$="_address_postal"]').closest('div.col-sm-12').removeClass('col-sm-12').addClass('col-sm-6');
			}
			form.find('[name$="_address_states_state"]').closest('.form-group').parent().show();
		}else {
			var countryWithState = $('#countryWithState').val();
			if (countryWithState && countryWithState.indexOf(country) > -1) {
				form.find('[name$="_address_states_state"]').replaceWith(stateTextBox);
				form.find('[name$="_address_states_state"]').parents('.form-group').find('.control-label span').html('Province');
				form.find('[name$="_address_states_state"]').val(stateName ? stateName : '');
				if ($('[name$="_address_postal"]').closest('div.col-sm-12').length > 0) {
					$('[name$="_address_postal"]').closest('div.col-sm-12').removeClass('col-sm-12').addClass('col-sm-6');
				}
				form.find('[name$="_address_states_state"]').closest('.form-group').parent().show();
			} else {
				form.find('[name$="_address_states_state"]').closest('.form-group').parent().hide();
				if ($('[name$="_address_postal"]').closest('div.col-sm-6').length > 0) {
					$('[name$="_address_postal"]').closest('div.col-sm-6').removeClass('col-sm-6').addClass('col-sm-12');
				}
				form.find('[name$="_address_states_state"]').removeClass('required');
			}
		}
	} else {
		form.find('[name$="_address_states_state"]').closest('.form-group').parent().show();
		if ($('[name$="_address_postal"]').closest('div.col-sm-12').length > 0) {
			$('[name$="_address_postal"]').closest('div.col-sm-12').removeClass('col-sm-12').addClass('col-sm-6');
		}
		form.find('[name$="_address_states_state"]').replaceWith(stateDropDown);
		form.find('[name$="_address_states_state"]').parents('.form-group').find('.control-label span').html('State');
		form.find('[name$="_address_states_state"]').val(stateCode ? stateCode : '').trigger('change');
	}
}


/**
 * Loqate Account add address page form, state field swap
 *
 * address form in account - payment
 * **/
function switchLoqateStateFieldCard(stateName, stateCode) {
	var form = $('form[id="addCreditCardForm"]');

	form.find('[name$="_addressFields_states_state"]').parents('.form-group').removeClass('has-error');
	form.find('[id$="_addressFields_states_state-error"]').remove();
	var country = form.find('select[name$="_addressFields_country"]').val();
	if(country != 'US') {
		if(country === 'CA'){
			var stateDropDownNonUS = stateDropDownNonUSOptions();
			form.find('[name$="_addressFields_states_state"]').replaceWith(stateDropDownNonUS);
			form.find('[name$="_addressFields_states_state"]').parents('.form-group').find('.control-label span').html('State');
			form.find('[name$="_addressFields_states_state"]').val(stateName ? stateName : '').trigger('change');
		}else {
			form.find('[name$="_addressFields_states_state"]').replaceWith(stateTextBox);
			form.find('[name$="_addressFields_states_state"]').parents('.form-group').find('.control-label span').html('Province');
			form.find('[name$="_addressFields_states_state"]').val(stateName ? stateName : '');
		}
	} else {
		form.find('[name$="_addressFields_states_state"]').replaceWith(stateAddCardDropDown);
		form.find('[name$="_addressFields_states_state"]').parents('.form-group').find('.control-label span').html('State');
		form.find('[name$="_addressFields_states_state"]').val(stateCode ? stateCode : '').trigger('change');
	}
}


$( document ).ready(function() {
	  try {
		var url = window.location.href;
		if(url.indexOf('skip_email_gate=true') > -1){
			$('#RegistrationForm #skip_email_gate').val(true);
		}
	  } catch (e) {

	  }

	  if($('#dwfrm_profile_customer_phoneMobile').length){
		    var countryCode = $('#dwfrm_profile_customer_countryCode').val();
			if (typeof countryCode != 'undefined' || countryCode != '') {
				window.intlTelInputGlobals.getCountryData().find(function(el){
					if(el.dialCode === countryCode) {
						phoneValidator.setCountry(el.iso2);
					}
				});
			}
	  }


		if($('#profile-update-notification').length > 0) {
			setTimeout(function(){
				$('#profile-update-notification').focus();
			  }, 1000);
		}


	  intlLoaded = setInterval(isintlLoaded, 500);

	  /***
	   * On Loqate data load, swap state field in address form
	   * Dropdown for US and
	   * Textbox for rest of the countries
	   * */
	  if (typeof pca != "undefined") {
  		try{
  			 pca.on('data', function(source, key, address, variations) {
  				 if(address && ((address.ProvinceName && address.ProvinceName.length > 0) || (address.ProvinceCode && address.ProvinceCode.length > 0))) {
  					 	  if($('form[name="dwfrm_profile_address"]').length > 0){
  					 		switchLoqateStateField(address.ProvinceName, address.ProvinceCode);
  					 	  } else {
  					 		switchLoqateStateFieldCard(address.ProvinceName, address.ProvinceCode);
  					 	  }

  				 } else {
					 switchStateField();
				 }
  			 });
  		} catch(e) {

  		}

  	}
});

$(document).on('change', '#country', function(){
	switch ($(country).val()) {
		case "US":
			$("#stateUS").attr( "required","" );
			$("#stateText").removeAttr( "required" );
			$("#stateNonUS").removeAttr( "required" );

			$("#stateUS").show();
			$("#stateText").hide();
			$("#stateNonUS").hide();
			$('#stateText-error').hide();

			$("#zipCode").attr("inputmode","decimal");
			$("#zipCode").attr("pattern","^\\d{5}(?:[-\\s]\\d{4})?$");
			break;
		case "CA":
			$("#stateText").removeAttr( "required" );
			$("#stateUS").removeAttr( "required" );
			$("#stateText").hide();
			$('#stateText-error').hide();
			$('#state-error').hide();
			$("#stateUS").hide();
			$("#stateNonUS").attr( "required","" );
			$("#stateNonUS").show();

			$("#zipCode").removeAttr( "inputmode" );
			$("#zipCode").removeAttr( "pattern" );
			break;
		default:
			$("#stateText").attr( "required","" );
			$("#stateUS").removeAttr( "required" );
			$("#stateNonUS").removeAttr( "required" );
			$("#stateUS").hide();
			$("#stateNonUS").hide();
			$("#stateNonUS-error").hide();
			$("#stateText").show();
			$("#zipCode").removeAttr( "inputmode" );
			$("#zipCode").removeAttr( "pattern" );
	}

	if (typeof pca != "undefined") {
		try{
			pca.on("load", function(type, id, control) {
				if((control !== undefined || control !== null)) {
					if($("#country").val()) {
						control.setCountry($("#country").val());
					}
				}
			});

		} catch(e) {}
	}
});

/*
 * Shipping form Country Change
 */
$(document).on('change', '#stateNonUS', function(){
	var selectedState = $("#stateNonUS").val();
	$("#stateText").val(selectedState);
});

module.exports = account;
