/*
    Event Name: populate
    Once the address fields have been selected, using the following event,
    it will allow you to populate your own fields with your own logic using the address object.
    Following code is setting the Address 2 Field in SFRA, if the user selected address has Line2 empty in the address object.
    Also it is printing the address object in console and alerting the user on the selected address he has chosen.
*/
pca.on("load", function(type, id, control) {
    control.listen("populate", function(address) {
        if (address) {
            var country = document.getElementById('shippingCountrydefault') ? document.getElementById('shippingCountrydefault').value : '';
            var billing = false;
            if (address && address.CountryIso2 && address.CountryIso2.length > 0) {
	            if ($('#checkout-main') && $('#checkout-main').attr('data-checkout-stage') && ($('#checkout-main').attr('data-checkout-stage') === 'payment')) {
	                country = document.getElementById('billingCountry') ? document.getElementById('billingCountry').value : '';
	                billing = true;
	            }
	        }
            if (document.getElementById('newAddress') && document.getElementById('newAddress').value === 'true') {
                if (billing) {
					if(address.ProvinceCode && address.ProvinceCode.length > 0){
						if (country === 'US') {
		                    document.getElementById('billingStateUS').value = address.ProvinceCode;
		                } else if (country === 'CA') {
		                    document.getElementById('billingStateNonUS').value = address.ProvinceCode;
		                } else {
		                    document.getElementById('billingStateText').value = address.ProvinceCode;
		                }
						document.getElementById('billingStatedefault').value = address.ProvinceCode;
					}
					$('.payment-container .enter-billing-address-link').hide();
	                $('.payment-container #billingaddressCollapse').addClass('show');
	                $('#billingCountry').val(address.CountryIso2).trigger('change');
				} else {
					if (address.ProvinceCode && address.ProvinceCode.length > 0) {
						if (country === 'US') {
							document.getElementById('stateUS').value = address.ProvinceCode;
						} else if (country === 'CA') {
							document.getElementById('stateNonUS').value = address.ProvinceCode;
						} else {
							document.getElementById('stateText').value = address.ProvinceCode;
						}
					}
					document.getElementById('shippingStatedefault').value = address.ProvinceCode;
					$('.shipping-address-block .enter-address-link').hide();
                	$('#addressCollapse').addClass('show');
                	$('.shippingCountry').val(address.CountryIso2).trigger('change');
				}
            } else if (document.getElementById('addressModal')) {
                var country = document.getElementById('address-modal-country').value;
				if (address.ProvinceCode && address.ProvinceCode.length > 0) {
					if (country === 'US') {
						document.getElementById('addressmodal-stateUS').value = address.ProvinceCode;
						document.getElementById('shippingStateModal').value = address.ProvinceCode;
					} else if (country === 'CA') {
						document.getElementById('addressmodal-stateNonUS').value = address.ProvinceCode;
						document.getElementById('shippingStateModal').value = address.ProvinceCode;
					} else {
						document.getElementById('addressmodal-stateText').value = address.ProvinceCode;
						document.getElementById('shippingStateModal').value = address.ProvinceCode;
					}
				}
                $('#addressModal .enter-addaddress-link').hide();
                $('#addaddressModalCollapse').addClass('show');
                $('#address-modal-country').val(address.CountryIso2).trigger('change');
            }
        }
    });
});