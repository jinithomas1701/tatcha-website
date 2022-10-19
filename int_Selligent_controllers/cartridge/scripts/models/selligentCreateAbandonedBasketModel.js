/**
* This script create an new abandoned basket custom object and call Selligent push webservice to add the abandoned basket info
*   @input currentBasket : dw.order.Basket 
*   @input currentCustomer : dw.customer.Customer
*
*/
var System = require('dw/system');
var Object = require('dw/object');
var Order = require('dw/order');
var Customer = require('dw/customer');
var Svc = require('dw/svc');
var Util = require('dw/util');
var SelligentExportAbandonedBasket = require('~/cartridge/scripts/models/selligentExportAbandonedBasketModel');
var SelligentExportBaseModel = require('~/cartridge/scripts/models/selligentExportBaseModel');
var Transaction = require('dw/system/Transaction');
/**
* Main function of the script.
*
*  @param The current basket and the current customer
*/
exports.execute = function( currentBasket : Order.Basket, currentCustomer : Customer.Customer ) : Number
{
 
	try
	{
 		
		var basket : Order.Basket = currentBasket;	
		var customer : Customer.Customer = currentCustomer;
	    var content : String = "";
	    var i : Number = 0;
	    var custUUID : String = "";
	    var custNo : String = "";	
	    var registered = false;
	    
	    if (customer != null) 
	    {
	    	registered  = customer.registered;
	    }
	     
	    if(registered == true)
		{
			custUUID = customer.profile.UUID;
			custNo =  customer.profile.customerNo;
		}
		
		if (basket != null && basket.productLineItems.length > 0)
		{
			for(i=0; i < basket.productLineItems.length; i++)
			{			
				content +=  basket.productLineItems[i].productID + "|";				
			}
			if(content.length > 1)
				content = content.substring(0,content.length - 1);
			 
		}
		
		var deleted = 0;
		if (content.length == 0) 
		{
			deleted = 1;		
		}
				
		// stringify the object		
		var jsonToSend : String = Util.StringUtils.format("'{'\"custNo\":\"{0}\",\"custUUID\":\"{1}\",\"basketUUID\":\"{2}\",\"content\":\"{3}\",\"deleted\":\"{4}\"'}'", custNo,custUUID, basket.UUID, content, deleted ); 	   

		// push the abandoned basket			
		var result : Result = Svc.ServiceRegistry.get("SelligentAddAbandonedBasket").call(jsonToSend);	
		
		// if the web service returns an error save the informations.	
		if(result.status == "ERROR") {
	  		Transaction.begin();
			var fielsToExport = null;
			var json = "";
			var sab = Object.CustomObjectMgr.getCustomObject("SAB", basket.UUID);
			if( sab == null)				
			{
				sab = Object.CustomObjectMgr.createCustomObject("SAB",basket.UUID);
			}
	
			sab.custom.content = content;
			sab.custom.basketUUID = basket.UUID;
			sab.custom.custUUID = custUUID;	
			sab.custom.custNo = custNo;
			
			if (content.length > 1) 
			{
				sab.custom.deleted = 0;
			}
			else
			{
				sab.custom.deleted = 1;
			}
			Transaction.commit();
			throw result.errorMessage;
		 }		 

	}
	catch(e) 
	{
		System.Logger.error("Selligent Error: Unable to push abandoned basket: "+e.message );						
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