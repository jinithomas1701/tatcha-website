/**
* This script cleanup abandonned basket custom object and call Selligent push webservice to remove the abandoned basket info
*   @input currentCustomer : dw.customer.Customer
*
*/
var System = require('dw/system');
var Object = require('dw/object');
var Customer = require('dw/customer');
var Util = require('dw/util');
var Svc = require('dw/svc');
var SelligentExportAbandonedBasket = require('~/cartridge/scripts/models/selligentExportAbandonedBasketModel');
var SelligentExportBaseModel = require('~/cartridge/scripts/models/selligentExportBaseModel');
var Transaction = require('dw/system/Transaction');
/**
* Main function of the script.
*
* @param The current basket
*/

exports.execute = function(currentCustomer) : Number
{
    var allSAB : Util.SeekableIterator;	
	try
	{
		
		var custUUID = "";
    	var custNo= "";	
	    if (currentCustomer != null && currentCustomer.profile != null)
	    {
	   		custUUID = currentCustomer.profile.UUID;
	   		custNo = currentCustomer.profile.customerNo;
	    }
	    // build json string		
	    // Call the removeAbandonedBasket WS 	
	    var jsonToSend : String = Util.StringUtils.format("'{'\"custNo\":\"{0}\",\"custUUID\":\"{1}\",\"basketUUID\":\"\",\"content\":\"\",\"deleted\":\"1\"'}'", custNo,custUUID ); 	   

	    var result : Result = Svc.ServiceRegistry.get("SelligentRemoveAbandonedBasket").call(jsonToSend);
		if(result.status == "ERROR") {

			Transaction.begin();
			if (currentCustomer && currentCustomer.profile )
			{
				allSAB = Object.CustomObjectMgr.queryCustomObjects("SAB","custom.custNo = {0}", "custom.custNo asc", currentCustomer.profile.customerNo);
				while (allSAB.hasNext()) 
				{	
					var currentSAB : Object.CustomObject = allSAB.next();					
					//Flag the custom object as deleted after check out
					currentSAB.custom.deleted = 1;				
				}

			}
			Transaction.commit();
			throw result.errorMessage;
		}
	}
	catch(e) 
	{
		System.Logger.error("Selligent Error: Unable to push abandoned basket: "+e.message);
	}
	finally 
	{
		if (allSAB) allSAB.close();
	} 
   	
}

/**
* Get the properties list to export from the config file 
*
* @returns an array of properties to export 
*/
function getAbandonedBasketFieldsToExport() : Array
{
	var fielsToExport : Array;
	if (SelligentExportBaseModel.ConfigFileExist("abandonedbasket") === false)
	{
		var result : Svc.Result = Svc.ServiceRegistry.get("SelligentGetSettings").call();
		if(result.status == "ERROR") {
		   throw result.errorMessage;
		}	
	}
	fielsToExport = SelligentExportBaseModel.GetFieldsToExport("abandonedbasket");
	return fielsToExport;
}

/* Exports */
module.exports.Execute = exports.execute;
