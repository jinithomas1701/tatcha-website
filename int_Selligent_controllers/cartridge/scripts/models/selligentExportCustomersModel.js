/**
* Demandware Script File
*/
var Customer = require('dw/customer');
var SelligentJsonSerializer = require('~/cartridge/scripts/models/selligentJsonSerializerModel');
var SelligentExportBase = require('~/cartridge/scripts/models/selligentExportBaseModel');

/**
* Export a customer(profile) 
*
* @param {Profile} The customer profile
* @param {Array} The list of properties to export
* @returns customer (profile) in json.   
*/
exports.exportCustomer = function(profile : Customer.Profile, fieldsToExport : Array) : String
{
	var customerData = SelligentExportBase.ExportObject(profile, fieldsToExport);
	var json = SelligentJsonSerializer.Serialize(customerData);
	return json;	
}

/* Exports */
module.exports.ExportCustomer = exports.exportCustomer;
