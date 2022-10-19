'use strict';

function validateAddress (addressToValidate) {

	//var deferred = $.Deferred();
	var showModal = '';
	if($('#loqateVerificationEnabled').length > 0) {
		var url = $('#loqateAddressVerifyUrl').val();
		$.ajax({
	        type: 'POST',
	        url: url,
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
				return showModal;
	        },
	        error: function(err) {
	        	showModal = '';
				return showModal;
	        }
	    });
	}
	return showModal;
};

/*
 * Init Loqate
 */
function initPCAAddressForm () {
	if (typeof pca != "undefined") {
		try{
			pca.on('data', function(source, key, address, variations) {
				if(address && ((address.ProvinceName && address.ProvinceName.length > 0) || (address.ProvinceCode && address.ProvinceCode.length > 0))) {
						if (document.getElementById('addressModal')) {
							var country = document.getElementById('address-modal-country').value;
							if (country === 'US') {
								document.getElementById('addressmodal-stateUS').value = address.ProvinceCode;
								document.getElementById('shippingStatedefault').value = address.ProvinceCode;
							} else if (country === 'CA') {
								document.getElementById('addressmodal-stateNonUS').value = address.ProvinceCode;
								document.getElementById('shippingStatedefault').value = address.ProvinceCode;
							} else {
								document.getElementById('addressmodal-stateText').value = address.ProvinceCode;
								document.getElementById('shippingStatedefault').value = address.ProvinceCode;
							}
							$('#addressModal .enter-addaddress-link').hide();
							$('#addaddressModalCollapse').addClass('show');
					}
				}
			});
		} catch(e) {}
	}
};

/**
 * Set input address to the verification modal
 * **/
function setAddressToModal (inputAddress, suggestedAddress) {

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
function setLoqateSuggestedAddress (address) {

	// Address form
	var originAddressForm = $('#addressOriginForm').val();

	//address-modal
	var $form = $('.shipping-address-block');
	var suggestedAddr = {
			'Country': address['Country'],
			'Address1': address['Address1'],
			'Address2': address['Address2'],
			'PostalCode': address['PostalCode'],
			'AdministrativeArea': address['AdministrativeArea'],
			'Locality': address['Locality']
	};

	var countryField = '.shippingCountry';
	var address1Field = '.shippingAddressOne';
	var postalField = '.shippingZipCode';
	var stateField = '.shippingState';
	var cityField = '.shippingAddressCity';

	 if($('#addressModal').hasClass('show')) {
		// add new address handle
		$form = $('#checkoutAddNew');

		countryField = '#address-modal-country';
		address1Field = '#address1';
		postalField = '#postal';
		stateField = '#addressmodal-stateUS';
		cityField = '#city';
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

				if(stateField && (stateField.trim().charAt(0) === '#' || stateField.trim().charAt(0) === '.')) {
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

$('.edit-link').on('click',function(){
    $('#addressSuggestionModal').modal('hide');
	$('body').trigger('checkout:enableButton', '.next-step-cta button');
});

/**
 * Address suggestion modal (Loqate), save address CTA click
 * */
$('#maincontent').on('click', '.save-loqate-suggested-address', function() {
	// Address form
	var originAddressForm = $('#addressOriginForm').val();
	//address-modal
	var selectedAddressOption = $("input[name='selectAddress']:checked").val();
	if(selectedAddressOption === 'suggestedAddress' && $('#loqateSuggestedAddress').val().length > 0) {
		var suggestedAddress = JSON.parse($('#loqateSuggestedAddress').val());
		setLoqateSuggestedAddress(suggestedAddress);

		if(originAddressForm === '') {
			$('.contact-shipping #validAddress').val(true);
			$('body').trigger('checkout:enableButton', '.next-step-cta button');
			$('.submit-shipping').trigger('click');
		} else if (originAddressForm === 'address-modal') {
         	$('#addressSuggestionModal').modal('hide');
			$('#addressModal #validAddress').val(true);
			$('.add-shipping-address').trigger('click');
		}
	} else {
		if(originAddressForm === '') {
			$('.contact-shipping #validAddress').val(true);
			$('body').trigger('checkout:enableButton', '.next-step-cta button');
			$('.submit-shipping').trigger('click');
		} else if (originAddressForm === 'address-modal') {
         	$('#addressSuggestionModal').modal('hide');
			$('#addressModal #validAddress').val(true);
			$('.add-shipping-address').trigger('click');
		}
	}
});

$('#maincontent').on('change', 'input[type=radio][name=selectAddress]',function() {
    if (this.value == 'enteredAddress') {
        $('.entered-address-container .address-warning').show();
    }
    else if (this.value == 'suggestedAddress') {
    	$('.entered-address-container .address-warning').hide();
    }
});

exports.validateAddress = validateAddress;
exports.initPCAAddressForm = initPCAAddressForm;
