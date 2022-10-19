'use strict';
var shipping = require('./shipping');
var util = require('./util');
/*
 * Init Loqate
 */
var initPCA = function () {
	
	  if (typeof pca != "undefined") {
	  		try{
	  			 pca.load();
	  		} catch(e) {}      		
	  	}
};


var initPCAAddressForm = function () {
  if (typeof pca != "undefined") {
		try{
	    	 pca.on("load", function(type, id, control) {
	    		// Set the language to english
	    		control.setCulture('en'); 
	    		if((control !== undefined || control !== null)) {
	    			if($("#country").val()) {
	    				if($('#addressmodal-country').length > 0){
	    					control.setCountry($("#addressmodal-country").val());
	    				} else {
	    					control.setCountry($("#country").val());
	    				}	    				
	    			}
	    		}
  		 });
			 pca.on('data', function(source, key, address, variations) {
				 
				 if($('#addressmodal-country').length > 0){
					
					//Swtch Country field
					 if(address.CountryIso2.length > 0) {
						$('#checkout-container #addressmodal-country').val(address.CountryIso2).trigger('change');
					 }
			
					 if(address && ((address.ProvinceName && address.ProvinceName.length > 0) || (address.ProvinceCode && address.ProvinceCode.length > 0))) {
						 $(".enter-addaddress-link").hide();
						 $("#addaddressModalCollapse").addClass("show");
						 
						 if(address.CountryIso2.length > 0) {
							if(address.CountryIso2 === 'US') {
								$("#addressmodal-stateText").val(address.ProvinceCode);
								$("#addressmodal-state").val(address.ProvinceCode);
							} else {
								if(address.CountryIso2 === 'CA'){
									$("#addressmodal-stateText").val(address.ProvinceCode);
									$("#addressmodal-stateNonUS").val(address.ProvinceCode);
								}else {
									$("#addressmodal-stateText").val(address.ProvinceName);
								}
							}
						}
					 }					 
				 } else {
					
					//Swtch Country field
					 if(address.CountryIso2.length > 0) {
						$('.contact-shipping #country').val(address.CountryIso2).trigger('change');
					 }
				
					 if(address && ((address.ProvinceName && address.ProvinceName.length > 0) || (address.ProvinceCode && address.ProvinceCode.length > 0))) {
						 $(".enter-address-link").hide();
						 $("#addressCollapse").addClass("show");
					
						if(address.CountryIso2.length > 0) {
							if(address.CountryIso2 === 'US') {
								$("#state").val(address.ProvinceCode);
						 		$("#stateText").val(address.ProvinceCode);
							} else {
								if(address.CountryIso2 === 'CA'){
									$("#stateNonUS").val(address.ProvinceCode);
							 		$("#stateText").val(address.ProvinceCode);
								}else{
									$("#stateText").val(address.ProvinceName);
								}
							}
						}
					 }					 
				 }
				 
				 

			 });
		} catch(e) {}
		
	}
  
};


/**
* Hide 'enter address manually' link when address taken from loqate suggestions
**/
var initBillingLoqateForm = function() {
	$(".spc-billing-address .enter-baddr-manually").show();
	if (typeof pca != "undefined") {
		try {
			pca.on('data', function(source, key, address, variations) {
				if(address && address.CountryIso2 && address.CountryIso2.length > 0) {
					
					$('#dwfrm_billing_billingAddress_addressFields_country').val(address.CountryIso2).trigger('change');
					if(address.ProvinceName && address.ProvinceName.length > 0) {
						if($('#dwfrm_billing_billingAddress_addressFields_country').val().toUpperCase() !== 'US') {
							$('#billingStateText').val(address.ProvinceName);
						}
					}
					
					if(address.ProvinceCode && address.ProvinceCode.length > 0) {
						if($('#dwfrm_billing_billingAddress_addressFields_country').val().toUpperCase() === 'US') {
							$('#billingStateSelect').val(address.ProvinceCode);
						}else if ($('#dwfrm_billing_billingAddress_addressFields_country').val().toUpperCase() === 'CA') {
							$('#billingStateSelectNonUS').val(address.ProvinceCode);
						}
					}
				}
				
				if($('.spc-billing-address').length > 0) {
					$(".spc-billing-address .enter-baddr-manually").hide();
					$('#billingaddressCollapse').addClass('show');
					if($('#gCAddressModal').is(':visible')) {
						$('#checkout-container #addCardModal .enter-billing-address-link').hide();
						$('#checkout-container #addCardModal #gCAddressModal').addClass('show');
					} else {
						selectorField = '#checkout-container ';	
					}
				}
			 });
			
		} catch(e) {}
	}
};

var validateAddress = function (addressToValidate) {
		
	var deferred = $.Deferred();
	
	var showModal = '';
	if($('#loqateVerificationEnabled').length > 0 ) {
		$.ajax({
	        type: 'POST',
	        url: Urls.verifyAddress,
	        async: false,
	        data: {
	        	Address: JSON.stringify(addressToValidate)
	        },
	        success:function(res) {
	        	console.log(res);
	        	if(res && res.response) {
	        		var response =  res.response;
	        		if(res.response.success && res.response.hasAddressSuggetion) {
	        			var addressData = response.data;
	        			
	        			if(addressData) {
		
							var addressMatchLevel = response.postProcessMatch ? response.postProcessMatch : 0;
							try {
								addressMatchLevel = addressMatchLevel.length === 3 ? parseInt(addressMatchLevel.charAt(1)) : 0;
							} catch(e) {
								addressMatchLevel = 0;
							}
	        				
							
							if(response.verificationStatus && response.verificationStatus === 'verified' && 
									response.matchScore && response.matchScore === '100' && addressMatchLevel && addressMatchLevel >= 4) {
								showModal = '';
							}  else {
								
								setAddressToModal(addressData.inputAddress,addressData.suggestedAddress);
								var suggestedAddress = addressData.suggestedAddress;
								
		        				//if the input address is not verified, we will be showing the address which user entered with a warning
		        				if(response.verificationStatus && response.verificationStatus === 'unverified') {
		        					$('.suggested-address-title, .suggested-address-container').hide();
				        			$('#enteredAddress').prop("checked", true);
									$('#selectedAddress').prop("checked", false);
									$('#addressSuggestionModal .address-warning').show();
			        			} else {
		        					$('.suggested-address-title, .suggested-address-container').show();
				        			$('#selectedAddress').prop("checked", true);
		        					$('#enteredAddress').prop("checked", false);
				        			$('.alert-text').hide();			        				
			        			} 
		        				$('#loqateSuggestedAddress').val(JSON.stringify(suggestedAddress));
		        				showModal = '#addressSuggestionModal';							
							}
	        			}
	        		}      			
	        	}
				deferred.resolve(showModal);
	        },
	        error: function(err) {
	        	showModal = '';

	        }
	    });
	
	}
	
	return deferred.promise();
	
};

/**
 * Set input address to the verification modal
 * **/
var setAddressToModal = function (inputAddress,suggestedAddress) {
	
	if(inputAddress) {
		var addrline1 = inputAddress.Address1 ? inputAddress.Address1 : '';
		addrline1 += inputAddress.Address2 ? ( ' ' + inputAddress.Address2) : '';
		
		var locality = inputAddress.Locality ? inputAddress.Locality : '';
		locality += inputAddress.AdministrativeArea ? ( ' ' + inputAddress.AdministrativeArea) : '';
		locality += inputAddress.PostalCode ? ( ' ' + inputAddress.PostalCode) : '';
		
		if(addrline1) {
			$('#entered-address1').text(addrline1);
		}
		
		if(locality) {
			$('#entered-locality').text(locality);
		}	
	}
	
	if(suggestedAddress) {
		var addrline1suggested = suggestedAddress.Address1 ? suggestedAddress.Address1 : '';
		
		var localitysuggested = suggestedAddress.Locality ? suggestedAddress.Locality : '';
		localitysuggested += suggestedAddress.AdministrativeArea ? ( ' ' + suggestedAddress.AdministrativeArea) : '';
		localitysuggested += suggestedAddress.PostalCode ? ( ' ' + suggestedAddress.PostalCode) : '';
		
		if(addrline1) {
			$('#suggested-address1').text(addrline1suggested);
		}
		
		if(locality) {
			$('#suggested-locality').text(localitysuggested);
		}	
	}
};


/**
 * Set Loqate suggested address to shipping form
 * **/
var setLoqateSuggestedAddress = function(address) {
	
	// Address form
	var originAddressForm = $('#addressOriginForm').val();
	//address-modal

	var shippingAddressFields;
	
	var $form = $('.addressformfields');
	var suggestedAddr = {
			'Country': address['Country'],
			'Address1': address['Address1'],
			'Address2': address['Address2'],
			'PostalCode': address['PostalCode'],
			'AdministrativeArea': address['AdministrativeArea'],
			'Locality': address['Locality']
	};
	
	var countryField = '#dwfrm_singleshipping_shippingAddress_addressFields_country';
	var address1Field = '#dwfrm_singleshipping_shippingAddress_addressFields_address1';
	var postalField = '#dwfrm_singleshipping_shippingAddress_addressFields_postal';
	var stateField = '#dwfrm_singleshipping_shippingAddress_addressFields_states_state';
	var cityField = '#dwfrm_singleshipping_shippingAddress_addressFields_city';

	if(originAddressForm == 'address-modal') {
		 countryField = '#addressmodal-country';
		 address1Field = '#dwfrm_profile_address_address1';
		 postalField = '#dwfrm_profile_address_postal';
		 stateField = 'dwfrm_profile_address_states_state';
		 cityField = '#dwfrm_profile_address_city';
	}

	
	for(var key in suggestedAddr) {
		switch(key) {
			case 'Country':
				$form.find(countryField).val(suggestedAddr[key]).trigger('change');
				break;
			case 'Address1':
				$form.find(address1Field).val(suggestedAddr[key]);
				break;
			case 'Address2':
				//$form.find('#dwfrm_singleshipping_shippingAddress_addressFields_address2').val(suggestedAddr[key]);
				break;
			case 'PostalCode':
				$form.find(postalField).val(suggestedAddr[key]);
				break;
			case 'AdministrativeArea':
				$form.find('[name="'+stateField+'"]').val(suggestedAddr[key]);
				$form.find('[name="'+stateField+'"]').attr('data-selectedValue', suggestedAddr[key]);
				
				//Patch Fix for addressing state field issue - loqate -> needs to remove by fixing a common selector for both guest and logged in user
				if(stateField && stateField.trim().charAt(0) === '#') {
					$form.find(stateField).val(suggestedAddr[key]);
					$form.find(stateField).attr('data-selectedValue', suggestedAddr[key]);
				}
				break;
			case 'Locality':
				$form.find(cityField).val(suggestedAddr[key]);
				break;
			default:
				break;
		}
	}
	
}

/**
 * Address suggestion modal (Loqate), save address CTA click
 * */
$('#checkout-container').on('click', '.save-loqate-suggested-address', function() {
	// Address form
	var originAddressForm = $('#addressOriginForm').val();
	//address-modal
	var selectedAddressOption = $("input[name='selectAddress']:checked").val();
	if(selectedAddressOption === 'suggestedAddress' && $('#loqateSuggestedAddress').val().length > 0) {
		var suggestedAddress = JSON.parse($('#loqateSuggestedAddress').val());
		setLoqateSuggestedAddress(suggestedAddress);
		
		if(originAddressForm == '') {
			shipping.submitShippingForm();
		} else {
        	util.updateContainer('#dwfrm_profile_address',$('#dwfrm_profile_address').attr('action'),'POST','#checkout-container', function() {
				window.initbraintreeSG();
			});
        	$('#addressModal').modal('hide');
        	$('#addressSuggestionModal').modal('hide');
		}
		
	} else {
		if(originAddressForm == '') {
			shipping.submitShippingForm();
		} else {
        	util.updateContainer('#dwfrm_profile_address',$('#dwfrm_profile_address').attr('action'),'POST','#checkout-container', function() {
				window.initbraintreeSG();
			});
			$('#addressModal').modal('hide');
        	$('#addressSuggestionModal').modal('hide');
        	
		}
	}
});

$('#checkout-container').on('change', 'input[type=radio][name=selectAddress]',function() {
    if (this.value == 'enteredAddress') {
        $('.entered-address-container .address-warning').show();
    }
    else if (this.value == 'suggestedAddress') {
    	$('.entered-address-container .address-warning').hide();
    }
});


exports.initPCA = initPCA;
exports.validateAddress = validateAddress;
exports.initPCAAddressForm = initPCAAddressForm;
exports.initBillingLoqateForm = initBillingLoqateForm;