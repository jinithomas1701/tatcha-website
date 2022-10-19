/*
* Model to manage export. 
* @module models/StartSelligentExportModel
*/
var AbstractModel = require('./AbstractModel');
var Pipeline = require('dw/system/Pipeline');
/**
 * SelligentExport helper providing export functionality
 * @class module:models/StartSelligentExportModel~StartSelligentExportModel
 */
var StartSelligentExportModel = AbstractModel.extend({
    /** @lends module:models/StartSelligentExportModel~StartSelligentExportModel.prototype */

})


StartSelligentExportModel.get = function () {
    return new StartSelligentExportModel();
};

/*
 * Model to launch exports of Products, customers, orders and abandoned baskets
 * 
 */

StartSelligentExportModel.execute = function () {	
	var type = request.httpParameterMap.Type;
	var exportAll = request.httpParameterMap.All;
	
	Pipeline.execute('StartSelligentExport-Start', { Type : type, All : exportAll});

}

/** The StartSelligentExport class */
module.exports = StartSelligentExportModel;
module.exports.Execute = StartSelligentExportModel.execute;