
importPackage( dw.system );
importPackage( dw.util );
importPackage( dw.web );
importPackage( dw.net );
importPackage( dw.io );
var app = require('app_storefront_controllers/cartridge/scripts/app');
var Site = require('dw/system/Site');

/**
 * @input address data
 * The method verifies the given address
 * @output response object has verification status and suggested address
 * **/
function verifyAddress(address) {
	var apiAddress : String = 'https://api.addressy.com/Cleansing/International/Batch/v1.00/json4.ws' 
	var apiKey : String = Site.getCurrent().getCustomPreferenceValue('LOQATE_API_Key');

	if (!apiAddress || !apiKey || !address) {
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
		var response : String = '';		
		var param =  {"Key":apiKey,"Addresses": requestData};
		params = JSON.stringify(param); 			
		var httpClient = new dw.net.HTTPClient();
		httpClient.setTimeout(5000);
		httpClient.open('POST', apiAddress);
		httpClient.setRequestHeader('Content-Type', 'application/json');
		httpClient.setRequestHeader('Accept', 'application/json');
		httpClient.send(params); 			
	    if (httpClient.statusCode == 200){
	    	response = httpClient.text;
	    	 return response;
	     }
     	return false;
	} 
	catch(e){
		return false;
	}
}


module.exports.verifyAddress = verifyAddress;