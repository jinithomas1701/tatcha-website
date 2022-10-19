/**
* 
*
*   @input newCustomer : dw.customer.Customer 
*
*/

/*
* Model to Push a customer object in json format to the Selligent Web Service  
* @module models/StartSelligentExportModel
*/
var System = require('dw/system');
var Customer = require('dw/customer');
var CustomerMgr = require('dw/customer/CustomerMgr');
var Svc = require('dw/svc');
var SelligentExportCustomers = require('~/cartridge/scripts/models/selligentExportCustomersModel');
var SelligentExportBase = require('~/cartridge/scripts/models/selligentExportBaseModel');

/**
* Main function of the script.
*
* @param { dw.customer.Customer} customer contains the new customer
*/
exports.push = function ( login: String) : Number
{
	try
	{
		
		var newCustomer : Customer = CustomerMgr.getCustomerByLogin(login);
		var profile : Profile = newCustomer.profile;
		var fielsToExport : Array = getCustomerFieldsToExport();
		var json : String = SelligentExportCustomers.ExportCustomer(profile, fielsToExport);
		// push the customer	
		
		var result : Result = Svc.ServiceRegistry.get("SelligentAddCustomer").call(json);
		if(result.status == "ERROR") {
		   throw result.errorMessage;
		}
		 
	}
	catch(e) 
	{
		System.Logger.error("Selligent Error : Unable to create customer in SIM User list :" + e.message);	
	}
}


/**
* Get the properties list to export from the config file 
*
* @returns an array of properties to export 
*/
function getCustomerFieldsToExport() : Array
{
	var fielsToExport : Array;
	if (SelligentExportBase.ConfigFileExist("customer") === false)
	{	
		var result : Svc.Result = Svc.ServiceRegistry.get("SelligentGetSettings").call();
		if(result.status == 'ERROR') {
		   throw result.errorMessage;
		}	
	}
	fielsToExport = SelligentExportBase.GetFieldsToExport("customer");
	return fielsToExport;
}

/* Exports */
module.exports.Push = exports.push;