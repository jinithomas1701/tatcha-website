var System = require('dw/system');
var Io = require('dw/io');
var Content = require('dw/content');
var Catalog = require('dw/catalog');
var Util = require('dw/util');
var Order = require('dw/order');
var SelligentExportBase = require('~/cartridge/scripts/models/selligentExportBaseModel');
var SelligentJsonSerializer = require('~/cartridge/scripts/models/selligentJsonSerializerModel');


/**
* Export an order 
*
* @param {Order} The order
* @param {Array} The list of properties to export
* @returns order in json.   
*/
exports.exportOrder = function(order : Order.Order, fieldsToExport : Array) : String
{
	var orderData = SelligentExportBase.ExportObject(order, fieldsToExport);
	return SelligentJsonSerializer.Serialize(orderData);

}

/* Exports */
module.exports.ExportOrder = exports.exportOrder;
