'use strict';

var util = require('../../util');
var shipping = require('./shipping');
var account = require('../account');

var defStateField = $('select[name$="_addressFields_states_state"]').first();
var defStateFieldName = defStateField.attr('name');
var stateDropDown = defStateField.clone();
var stateTextBox = '<input type="text" name="'+defStateFieldName+'" id="'+defStateFieldName+'" class="input-text form-control required">';

function switchStateField(parentForm) {
	var form = $('.address');

	if (typeof parentForm !== "undefined" || parentForm !='') {
		form = $('#'+parentForm);
	}	
	
	form.find('[name$="_addressFields_states_state"]').parents('.form-group').removeClass('has-error');
	form.find('[id$="_addressFields_states_state-error"]').remove();
	var country = form.find('select[name$="_addressFields_country"]').val();
	if(country != 'US') {
		form.find('[name$="_addressFields_states_state"]').replaceWith(stateTextBox);
		form.find('[name$="_addressFields_states_state"]').parents('.form-group').find('.control-label span').html('Province*');
		
	} else {
		form.find('[name$="_addressFields_states_state"]').replaceWith(stateDropDown);
		form.find('[name$="_addressFields_states_state"]').parents('.form-group').find('.control-label span').html('State*');
		
	}
}

function switchStateFieldWithValue() {
	var form = $('.address');
	var defStateFieldValue = form.find('[name$="_addressFields_states_state"]').attr('data-selectedValue');
	form.find('[name$="_addressFields_states_state"]').parents('.form-group').removeClass('has-error');
	form.find('[id$="_addressFields_states_state-error"]').remove();
	var country = form.find('select[name$="_addressFields_country"]').val();
	if(country != 'US') {
		form.find('[name$="_addressFields_states_state"]').replaceWith(stateTextBox);
		form.find('[name$="_addressFields_states_state"]').parents('.form-group').find('.control-label span').html('Province*');
	} else {
		form.find('[name$="_addressFields_states_state"]').replaceWith(stateDropDown);
		form.find('[name$="_addressFields_states_state"]').parents('.form-group').find('.control-label span').html('State*');
	}
	form.find('[name$="_addressFields_states_state"]').val(defStateFieldValue);
}

var zipCodValidation = function(event){
	if(event.target.type==="tel"){
		if(!event.target.value.match(/^\d+$/)){
			$(event.target).val($(event.target).val().substr(0, event.target.value.length-1));
		}
	}
}

function clearPrefillData(formData) {
	if(formData) {
		formData.find('[name$="_addressFields_city"]').val('');
		formData.find('input[name$="_addressFields_states_state"]').val('');
		formData.find('select[name$="_addressFields_states_state"]').val('');
	}
}

function selectAddress(selectedAddress) {
	
	if($('.address').length > 0 ) {
		var $form = $('.address');	
		$form.find('[name$="_addressFields_country"]').val(selectedAddress.countryCode).trigger('change');
		switchStateField();
	    util.fillAddressFields(selectedAddress, $form);
	    
	    if(selectedAddress.countryCode !== 'US') {
	    	shipping.updateShippingMethodList();
	    }    
	    // re-validate the form
	    $form.validate().form();
	}
    
}

function hasBraintreeError() {
	$('#addCardModal').modal('show');
}


/**
 * State field swap for Loqate Shipping page Add Address profile form
 * Swap the field and set the state value to the field
 * **/

var defProfileStateField = $('select[name$="_address_states_state"]');
var stateProfileDropDown = defProfileStateField.clone();
var stateProfileTextBox = '<input type="text" placeholder=" " name="dwfrm_profile_address_states_state" data-selectedValue="" id="dwfrm_profile_address_states_state" class="floating__input input-text form-control required">';

function switchProfileStateField(stateName, stateCode) {
	
	var form = $('form[name="dwfrm_profile_address"]');
	
	form.find('[name$="_address_states_state"]').parents('.form-group').removeClass('has-error');
	form.find('[id$="_address_states_state-error"]').remove();
	var country = form.find('select[name$="_address_country"]').val();
	if(country != 'US') {
		form.find('[name$="_address_states_state"]').replaceWith(stateProfileTextBox);
		form.find('[name$="_address_states_state"]').parents('.form-group').find('.control-label span').html('Province*');
		form.find('[name$="_address_states_state"]').val(stateName ? stateName : '');
	} else {
		form.find('[name$="_address_states_state"]').replaceWith(stateProfileDropDown);
		form.find('[name$="_address_states_state"]').parents('.form-group').find('.control-label span').html('State*');
		form.find('[name$="_address_states_state"]').val(stateCode ? stateCode : '').trigger('change');
	}
}

/**
 * State field swap for Loqate Shipping Address form
 * Swap the field and set the state value to the field
 * **/
var defShippingStateField = $('select[name$="_addressFields_states_state"]').first();
var stateShippingDropDown = defShippingStateField.clone();
var stateShippingTextBox = '<input type="text" placeholder=" " name="dwfrm_singleshipping_shippingAddress_addressFields_states_state" data-selectedValue="" id="dwfrm_singleshipping_shippingAddress_addressFields_states_state" class="floating__input input-text form-control required">';

function switchShippingStateField(stateName, stateCode) {
	
	var form = $('.address');

	form.find('[name$="_addressFields_states_state"]').parents('.form-group').removeClass('has-error');
	form.find('[id$="_addressFields_states_state-error"]').remove();
	var country = form.find('select[name$="_addressFields_country"]').val();
	if(country != 'US') {
		form.find('[name$="_addressFields_states_state"]').replaceWith(stateShippingTextBox);
		form.find('[name$="_addressFields_states_state"]').parents('.form-group').find('.control-label span').html('Province*');
		form.find('[name$="_addressFields_states_state"]').val(stateName ? stateName : '');
		
	} else {
		form.find('[name$="_addressFields_states_state"]').replaceWith(stateShippingDropDown);
		form.find('[name$="_addressFields_states_state"]').parents('.form-group').find('.control-label span').html('State*');
		form.find('[name$="_addressFields_states_state"]').val(stateCode ? stateCode : '').trigger('change');
	}
}


/**
 * @function
 * @description Selects the first address from the list of addresses
 */
exports.init = function () {
    var $form = $('.address');
    
    $(document).ready(function() {
    	var hasBTError = window.location.href.indexOf('braintreeError=true') > -1;
        if(hasBTError) {
        	hasBraintreeError();
        }
        
        var currentCountry = $('select[name$="_addressFields_country"]').val();
       
    	if (typeof(pca) !== "undefined") {
	    	try {
		    	pca.on("load", function(type, id, control) {
		    		if((control !== undefined || control !== null) && (currentCountry !== null || currentCountry !== undefined)) {
		    			if(currentCountry) {
		    				control.setCountry(currentCountry);
		    			}
		    		}
	    		});
	    	} catch(err){
	    		$('.shippingAddressWrap').show();
	    		$('.showShippingAddressFields').hide();
	    	}
    	} else {
    		$('.shippingAddressWrap').show();
    		$('.showShippingAddressFields').hide();
    	}
    	
    	/**
    	 * While loading the date from Loqate, switch the state field to prefill the data
    	 * Dropdown for US and
    	 * Textbox for rest of the countries
    	 * **/
    	if (typeof pca != "undefined") {
    		try{
    			 pca.on('data', function(source, key, address, variations) {
    				 
    				 //parent form
    				 var profileForm = $('form[name="dwfrm_profile_address"]');
    				 var shippingForm = $('form[id="dwfrm_singleshipping_shippingAddress"]');
    				 
    				 if(address && ((address.ProvinceName && address.ProvinceName.length > 0) || (address.ProvinceCode && address.ProvinceCode.length > 0))) {
						 
						 if(profileForm.is(':visible')) {
	    					 switchProfileStateField(address.ProvinceName, address.ProvinceCode);
	    				 } else if(shippingForm.is(':visible')) {
	    					 switchShippingStateField(address.ProvinceName, address.ProvinceCode);
	    				 }
    				 }
    				 // for US and rest of the countries
    				 
    				 $('.shippingAddressWrap').show();
    				 $('.showShippingAddressFields').hide();
    				 $( "#dwfrm_profile_address_phone" ).focus();
    				 $( "#dwfrm_singleshipping_shippingAddress_addressFields_phone" ).focus();
    			 });
    		} catch(e) {
    			
    		}
    		
    	}
      });
    
    var selected = $('input[name$="_addressList"]:checked').first();
	var selectedAddress = $(selected).data('address');
    if(selectedAddress) {
    	selectAddress(selectedAddress);
    }
    
    // select address from list
    $('input[name$="_addressList"]', $form).on('click', function () {        
    	$form.find('.radio-billing-address').removeClass('selected');
    	$(this).parents('.radio-billing-address').addClass('selected');
    	var selectedAddress = $(this).data('address');       
        if (!selectedAddress) { return; }
        selectAddress(selectedAddress);        
    });
    
    //Same as Shipping
    function sameAsShipping(context, form, containerField) {
    	var $form = form;
    	if($(context).is(':checked')) {
    		var address = $(context).data('address');
    		address = address.replace(/'/g, '\"');
    		address = address.replace(/\\/g, '');
    		address = JSON.parse(address);
    		$form.find('[name$="_addressFields_country"]').val(address.countryCode).trigger('change');
        	switchStateField();
        	
			util.fillAddressFields(address, $form);
			$(containerField).hide();
    	} else {
    		/*$form.find('[name=dwfrm_billing_billingAddress_addressFields_country]').val('US').trigger('change');
    		$form.find('[name=dwfrm_billing_billingAddress_addressFields_address1]').val('');
    		$form.find('[name=dwfrm_billing_billingAddress_addressFields_address2]').val('');
    		$form.find('[name=dwfrm_billing_billingAddress_addressFields_postal]').val('');
    		$form.find('[name=dwfrm_billing_billingAddress_addressFields_states_state]').val('');
    		$form.find('[name=dwfrm_billing_billingAddress_addressFields_city]').val('');
    		$form.find('[name=dwfrm_billing_billingAddress_addressFields_phone]').val('');*/
    		//$form.find('[name$="_addressList"]:checked').trigger('click');
    		if($('#saved-billing-addr').length > 0) {
        		var billingAddress = $('#saved-billing-addr').data('baddr');
        		if(billingAddress) {
        			billingAddress = billingAddress.replace(/'/g, '\"');
            		billingAddress = billingAddress.replace(/\\/g, '');
            		billingAddress = JSON.parse(billingAddress);
            		address = billingAddress;
            		util.fillAddressFields(address, $form);
        		}
        	}
    		$(containerField).show();
    	}
    }
    
    $('.checkout-add-card-modal .same-as-shipping').on('click', function() {
    	let that = this;
    	var form = $(that).parents('form');
    	var parentContainer = '.checkout-add-card-modal .checkout-billing-address';
    	sameAsShipping(that, form, parentContainer);
    });
    
    $('.billing-addr-form-wrap .same-as-shipping').on('click', function() {
    	let that = this;
    	var form = $(that).parents('form');
    	var parentContainer = '.billing-addr-form-wrap .checkout-billing-address';
    	sameAsShipping(that, form, parentContainer);
    });
    
    if($('.same-as-shipping').length >0) {
    	var address = $('.same-as-shipping').data('address');
    	address = address.replace(/\\/g, '');
		address = JSON.parse(address);
		$form.find('[name$="_addressFields_country"]').val(address.countryCode).trigger('change');
		
		switchStateField();
		if($('#saved-billing-addr').length > 0 && !$('.same-as-shipping').is(':checked')) {
    		var billingAddress = $('#saved-billing-addr').data('baddr');
    		if(billingAddress) {
    			billingAddress = billingAddress.replace(/'/g, '\"');
        		billingAddress = billingAddress.replace(/\\/g, '');
        		billingAddress = JSON.parse(billingAddress);
        		address = billingAddress;
    		}
    		
    	}
    	
		util.fillAddressFields(address, $form);
    }
    
    //Initialize state field
    switchStateFieldWithValue();
    switchStateField();
    
    //Initialize zipcode Field
    if($('select[name$="_addressFields_country"]').val() != 'US') {
    	var zipField = $('[name$="_addressFields_postal"]');
    	if(zipField.length) {
			zipField.rules('remove', 'minlength');
			zipField.rules('add', {minlength: 3});
		}
    	zipField.attr('minlength','3');
   		zipField.attr('maxlength','15');
   		zipField.attr('type','text');
	  	zipField.on('keydown', zipCodValidation);
    } else {
    	var zipField = $('[name$="_addressFields_postal"]');
    	if(zipField.length) {
			zipField.rules('remove', 'minlength');
			zipField.rules('add', {minlength: 5});
		}
    	zipField.attr('minlength','5');
    	zipField.attr('maxlength','10');
		zipField.attr('type','text');
		zipField.on('keydown', zipCodValidation);
    }

	//Change Event
    $(document).on('change', 'select[name$="_addressFields_country"]', function() {
    	
    	// Activate Loqate only for US and CANADA
    	if (typeof(pca) !== "undefined") {
	    	try {
	    		var country = $('select[name$="_addressFields_country"]').val();
		    	pca.on("load", function(type, id, control) {
		    		if((control !== undefined || control !== null) && (country !== undefined || country !== null)) {
		    			control.setCountry(country);
		    		}
	    		});
	    	} catch(err){
	    		$('.shippingAddressWrap').show();
	    		$('.showShippingAddressFields').hide();
	    	}
    	} else {
    		$('.shippingAddressWrap').show();
    		$('.showShippingAddressFields').hide();
    	}
    	
    	var parentForm = $(this).parents("form").attr("id");
    	switchStateField(parentForm);
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
			zipField.on('keydown', zipCodValidation);
	    }
    	shipping.updateShippingMethodList();
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
    
    if(!$('.select-address').length){
	    if($('[name$="_addressFields_postal"]').val()){
	    		populateAddressBasedOnZip($('[name$="_addressFields_postal"]').val());
	    }
    }
    
    //Zip code state filling
    $('[name$="_addressFields_postal"]').on('keyup', function (e) {
    		populateAddressBasedOnZip($(this).val());
    });
    
    function populateAddressBasedOnZip(zip){
	    	var form = $('form.checkout-shipping-panel');
	    	var zipCountryCode = $('select[name$="_addressFields_country"]').val();
	    	//var zip = $(this).val();
	  	  	var city = '';
	  	  	var state_shortname = '';
	  	  	var state_longname = '';
	   
	  	  	if(!zip){
	  	  		return false;
	  	  	}
	  	  	
	  	  	/*if(isUSzipcode(zipCountryCode) && zip.length > 4) {
	  	  		//make a request to the google geocode api
	  	  		$.getJSON('https://maps.googleapis.com/maps/api/geocode/json?components=postal_code:'+zip+'&key='+SitePreferences.GOOGLE_API_KEY, function (response) {
	  	  			//find the city and state
	  	  	  		if(response.results.length == 0){
	  	  	  			//clearPrefillData(form);
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
	  			  	    form.find('[name$="_addressFields_city"]').val(city);
	  			  	    form.find('input[name$="_addressFields_states_state"]').val(state_longname);
	  			  	    form.find('select[name$="_addressFields_states_state"]').val(state_shortname);
	  	  	  		} else {
	  	  	  			clearPrefillData(form);
	  	  	  		}
	  	  		});

		  	}*/
    	
    }
    
    $('.modal-tatcha-add-address').on('show.bs.modal', function() {
    		var address = $('.modal-tatcha-add-address').find('.has-foreignchar-error').find('input').val();
    		if(!address){
        		$('.modal-tatcha-add-address').find('.has-foreignchar-error').removeClass('has-foreignchar-error');
        		$('.modal-tatcha-add-address').find('.help-block-err').remove();    			
    		}

    });
    
    
   
    
};
