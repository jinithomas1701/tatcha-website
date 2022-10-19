'use strict';
/**
* Push an order object in json format to the Selligent Web Service 
*
*   @input newOrder : dw.order.Order 
*
*/
var System = require('dw/system');
var Order = require('dw/order');
var Svc = require('dw/svc');
var SelligentExportOrders = require('~/cartridge/scripts/models/selligentExportOrdersModel');
var SelligentExportBase = require('~/cartridge/scripts/models/selligentExportBaseModel');

/**
* Main function of the script.
*
* @param {PipelineDictionary} pdict contains the new order
*/
exports.push = function (order : dw.customer.Order ) : Number
{
	try
	{
		var fielsToExport : Array = getOrderFieldsToExport();
		var json : String = SelligentExportOrders.ExportOrder(order, fielsToExport);

		var result : Result = Svc.ServiceRegistry.get("SelligentAddOrder").call(json);
		if(result.status == "ERROR") {
		   throw result.errorMessage;
		}	 	
	}
	catch(e) 
	{
		System.Logger.error("Selligent Error: Unable to create order in SIM order list :" + e.message);	
	}
}

/**
* Get the properties list to export from the config file 
*
* @returns an array of properties to export 
*/
function getOrderFieldsToExport() : Array
{
	var fielsToExport : Array;
	if (SelligentExportBase.ConfigFileExist("order") === false)
	{
	
		var result : Svc.Result = Svc.ServiceRegistry.get("SelligentGetSettings").call();
		if(result.status == "ERROR") {
		   throw result.errorMessage;
		}	
	}
	fielsToExport = SelligentExportBase.GetFieldsToExport("order");
	return fielsToExport;
}

/* Exports */
module.exports.Push = exports.push;