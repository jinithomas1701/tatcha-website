var autocomplete, placeSearch;
var componentForm = {
  street_number: 'short_name',
  route: 'long_name',
  locality: 'long_name',
  administrative_area_level_1: 'short_name',
  country: 'short_name',
  postal_code: 'short_name'
};

var customFields = {
  street_number: 'dwfrm_singleshipping_shippingAddress_addressFields_address1',
  route: 'dwfrm_singleshipping_shippingAddress_addressFields_address2',
  locality: 'dwfrm_singleshipping_shippingAddress_addressFields_city',
  administrative_area_level_1: 'dwfrm_singleshipping_shippingAddress_addressFields_states_state',
  country: 'dwfrm_singleshipping_shippingAddress_addressFields_country',
  postal_code: 'dwfrm_singleshipping_shippingAddress_addressFields_postal'
}

function fillInAddress() {
  // Get the place details from the autocomplete object.
  var place = autocomplete.getPlace();
 

  for (var component in componentForm) {
    document.getElementById(customFields[component]).value = '';
  }

  // Get each component of the address from the place details
  // and fill the corresponding field on the form.
  for (var i = 0; i < place.address_components.length; i++) {
    var addressType = place.address_components[i].types[0];
    if (componentForm[addressType]) {
      var val = place.address_components[i][componentForm[addressType]];
      if(addressType === 'country' && val) {
        val = val.toLowerCase();
      } 
      document.getElementById(customFields[addressType]).value = val;
    }
  }
}

// Bias the autocomplete object to the user's geographical location,
// as supplied by the browser's 'navigator.geolocation' object.
function geolocate() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var geolocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      var circle = new google.maps.Circle({
        center: geolocation,
        radius: position.coords.accuracy
      });
      autocomplete.setBounds(circle.getBounds());
    });
  }
}
var gmautocomplete = {
	init: function() {
	// Create the autocomplete object, restricting the search to geographical
	  // location types.
	  if(window.google.maps.places) {
		  autocomplete = new google.maps.places.Autocomplete(
		  /** @type {!HTMLInputElement} */(document.getElementById('dwfrm_singleshipping_shippingAddress_addressFields_address1')),
		  {
			  types: ['geocode'],
		      componentRestrictions: {country: 'us'},
		      language: 'en'
		  });
		
		  // When the user selects an address from the dropdown, populate the address
		  // fields in the form.
		  autocomplete.addListener('place_changed', fillInAddress);
	  }
	}
};
module.exports = gmautocomplete;