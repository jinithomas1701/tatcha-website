/**
* Export AbandonedBaskets
*/
var System = require('dw/system');
var Object = require('dw/object');
var SelligentJsonSerializer = require('~/cartridge/scripts/models/selligentJsonSerializerModel');
var SelligentExportBase = require('~/cartridge/scripts/models/selligentExportBaseModel');

/**
* Create an abandonned basket object based on the export fields definition
*
* @param {CustomAttributes} Custom Attributes of the abandoned basket object
* @param {Array} Array of the fields to export
* @returns a json string with the object description
*/
exports.exportAbandonedBasket = function(customs : Object.CustomAttributes, fieldsToExport : Array) : String
{
	var abandonedBasketData = SelligentExportBase.ExportObject(customs, fieldsToExport);
	return SelligentJsonSerializer.Serialize(abandonedBasketData);
}

/* Exports */
module.exports.ExportAbandonedBasket = exports.exportAbandonedBasket;