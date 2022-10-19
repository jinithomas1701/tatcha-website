
/**
 * @input address data
 * The method verifies the given address
 * @output response object has verification status and suggested address
 * **/
function verifyAddress (address) {
    var Site = require('dw/system/Site');
    var apiKey : String = Site.getCurrent().getCustomPreferenceValue('LOQATE_API_Key');

    if (!apiKey || !address) {
		return;
	}

    try
	{
		var requestData = [{
			  "Address1": address.Address1,
	          "Address2": address.Address2,
	          "Country": address.Country,
	          "SuperAdministrativeArea":"",
	          "AdministrativeArea": address.State,
	          "SubAdministrativeArea":"",
	          "Locality": address.City,
	          "DependentLocality":"",
	          "DoubleDependentLocality":"",
	          "Thoroughfare":"",
	          "DependentThoroughfare":"",
	          "Building":"",
	          "Premise":"",
	          "SubBuilding":"",
	          "PostalCode": address.PostalCode,
	          "Organization":"",
	          "PostBox":""
		}];
		var response = '';
		var param =  {"Key":apiKey,"Addresses": requestData};
		var params = JSON.stringify(param);

		var LoqateAddressvalidationService = createLoqateAddressValidationService();
        var result = LoqateAddressvalidationService.call(params);

	    if (result.status === 'OK'){
	    	var resultObj = JSON.parse(result.object);
	    	 return resultObj;
	     }
     	return false;
	}
	catch(e){
		return false;
	}
}

//HTTP Services
function createLoqateAddressValidationService() {
    var ServiceRegistry = require('dw/svc/LocalServiceRegistry');
	return ServiceRegistry.createService('LoqateAddressValidationService', {
		/**
	     * Create the service request
	     * - Set request method to be the HTTP POST method
	     * - Construct request URL
	     * - Append the request HTTP query string as a URL parameter
	     *
	     * @param {dw.svc.HTTPService} svc - HTTP Service instance
	     * @param {Object} params - Additional paramaters
	     * @returns {void}
	     */
		createRequest: function(svc, params) {
			//Set HTTP Method
			svc = svc.setRequestMethod("POST");
			svc = svc.addHeader('Content-Type','application/json');
            svc = svc.addHeader('Accept','application/json');
			return params;

		},
		/**
	     * JSON parse the response text and return it in configured retData object
	     *
	     * @param {dw.svc.HTTPService} svc - HTTP Service instance
	     * @param {dw.net.HTTPClient} client - HTTPClient class instance of the current service
	     * @returns {Object} retData - Service response object
	     */
		parseResponse: function(svc, client) {
			return client.text;
		}

	});
}

module.exports = {
    verifyAddress: verifyAddress
};