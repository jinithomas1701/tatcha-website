var Value = require('dw/value');
var Util = require('dw/util');
var Io = require('dw/io');
var Rpc = require('dw/rpc');
var Ws = require('dw/ws');

/**
* Construct an object based on the export field definition 
*
* @param {Object} The object to export
* @param {Array} Array of the fields to export
* @returns an object with his properties 
*/
exports.exportObject = function(objectToExport : Object, fieldsToExport : Array) : Object
{
	var resultData = null;
	if(objectToExport != null && fieldsToExport != null)
	{
		for each(var fieldToExport in fieldsToExport)
		{
			resultData = exportObjectProperties(objectToExport, fieldToExport, resultData, 0);
		}
	}
	return resultData;
}


/**
* Construct the properties of an object 
*
* @param {Object} The object to export
* @param {Object} Array of the fields to export
* @param {Object} Result object
* @param {Number} The level of the properties 
* @returns an object with his properties 
*/
function exportObjectProperties(objectToExport : Object, fieldToExport : Object, objectData : Object, level : Number) : Object
{

	if(objectToExport.constructor === Util.Collection || objectToExport.constructor === Util.List)
	{
		var itemsData : Array = new Array();
		for each(var obj in objectToExport)
			itemsData.push(exportObjectProperties(obj,fieldToExport, null, level));
		return itemsData;
	}
	if(fieldToExport.Level == level)
	{
		if(objectData == null)
			objectData = new Object;
		for each(var field : String in fieldToExport.Fields)
			objectData = exportObjectProperty(objectToExport, field, objectData);
	}
	else
	{
		var subFieldExport = new Object;
		if(objectData == null)
			objectData = new Object;		
		subFieldExport.Level = fieldToExport.Level;
		subFieldExport.Fields = fieldToExport.Fields.slice(1,fieldToExport.Fields.length);
		objectData[fieldToExport.Fields[0]] = exportObjectProperties(objectToExport[fieldToExport.Fields[0]], subFieldExport, null, level + 1);
	}
	return objectData;
}

/**
* Construct the property of an object 
*
* @param {Object} The object to export
* @param {String} Property name to export
* @param {Object} Result object
* @returns an object with his properties 
*/
function exportObjectProperty(objectToExport : Object, field : String, objectData : Object) : Object
{
	if(field.indexOf(".") >= 0)
	{
		var subFields : Array = field.split(".");
		var subValue;
		subValue = objectToExport[subFields[0]];
		if(subValue != null)
		{
			var subObject = objectData[subFields[0]];
			if(subObject == null)
				subObject = new Object;
			objectData[subFields[0]] = exportObjectProperty(subValue,  getSubProperties(subFields) , subObject);
		}	
		
	}
	else
	{
	 	getObjectPropertyValue(objectToExport , field , objectData );
	}

	return objectData;
}

/**
* Construct a string with sub object properties
*
* @param {Array} The object property to export with sublevels
* @returns a string with properties separated by a point 
*/
function getSubProperties(subFields : Array) : String
{
	var returnValue : String = ""; 
	if (subFields.length == 2)
		returnValue = subFields[1];
	else
	{
		var subArray : Array = subFields.slice(1, subFields.length);		
		returnValue =  subArray.join(".");
	}
	return returnValue;
}

/**
* get the property value of a property 
*
* @param {Object} The object to export
* @param {String} Property name to export
* @param {Object} Result object
*/
function getObjectPropertyValue(objectToExportValue : Object, field : String, objectData : Object)
{
	var value;
	if(field == "source")
		value = Util.StringUtils.encodeString(objectToExportValue[field], StringUtils.ENCODE_TYPE_HTML);
	else if(field == "pictureURL")
	{
		var pictureType = getPictureType();
		if(objectToExportValue.getImage(pictureType) != null)
			value = objectToExportValue.getImage(pictureType).absURL.toString();
	}
	else if (field == "price")
	{
		if(objectToExportValue.priceModel != null && objectToExportValue.priceModel.priceInfo != null && objectToExportValue.priceModel.priceInfo.price != null)
		{
			value = objectToExportValue.priceModel.priceInfo.price.decimalValue.get();
			objectData["currencyCode"] = objectToExportValue.priceModel.priceInfo.price.currencyCode;
		}
		else
		{
			value = 0;
		}
	}
	else if (field == "avgOrderValue" || field == "discountValueWithCoupon"	|| field == "discountValueWithoutCoupon" || field == "giftOrders" || field == "giftUnits" || field == "orders" || field == "orderValue" || field == "orderValueMonth" || field == "returns" || field == "returnValue"  || field == "sourceCodeOrders"  || field == "visitsMonth" || field == "visitsWeek" || field == "visitsYear")
	{
		if (objectToExportValue === null || objectToExportValue[field] == null)
			value = 0;
		else
			value = objectToExportValue[field];
	}
	else if (field == "productsViewedMonth" || field == "productsAbandonedMonth" || field == "productMastersOrdered" || field == "productsOrdered" || field == "topCategoriesOrdered")
	{
		value = "";
		var productsID : String = "";
		if (field == "productsViewedMonth")
		{
			if (objectToExportValue.getProductsViewedMonth().length > 0)
			{			
				for each (var product in objectToExportValue.getProductsViewedMonth())
				{
					productsID = productsID + product + "|";
				}			
			}
		}
		if (field == "productsAbandonedMonth")
		{
			if (objectToExportValue.getProductsAbandonedMonth().length > 0)
			{			
				for each (var product in objectToExportValue.getProductsAbandonedMonth())
				{
					productsID = productsID + product + "|";
				}			
			}
		}
		if (field == "productMastersOrdered")
		{
			productsID = "";
		}
		if (field == "productsOrdered")
		{
			if (objectToExportValue.getProductsOrdered().length > 0)
			{			
				for each (var product in objectToExportValue.getProductsOrdered())
				{
					productsID = productsID + product + "|";
				}			
			}
		}
		if (field == "topCategoriesOrdered")
		{
			if (objectToExportValue.getTopCategoriesOrdered().length > 0)
			{			
				for each (var product in objectToExportValue.getTopCategoriesOrdered())
				{
					productsID = productsID + product + "|";
				}			
			}
		}
		if (productsID.length > 0 ) productsID = productsID.substring(0, productsID.length - 1);
		value = productsID;

	}
	else if (field == "registered")
	{
		if (objectToExportValue.registered == true)
			value = 1;
		else
			value = 0;
	}
	else if (field == "enabled")
	{
		if (objectToExportValue.enabled == true)
			value = 1;
		else
			value = 0;
	}
	else 
	{		
		try		
		{

				value = objectToExportValue[field];
		}
		catch(e)
		{}

	}	
	if(value != null)
	{
		if(value.constructor === Date)
			value = getDate(value);
		if(value.constructor === Value.EnumValue)
			value = value.displayValue;
	}
	
	objectData[field] = value;
}
/**
* Get the properties list to export from the config file 
*
* @param {String} The export type
* @returns an array of properties to export 
*/
exports.getFieldsToExport = function(type : String) : Array
{
	var fields : Array = new Array();
	var configFile : Io.File = new Io.File(Io.File.IMPEX + "/Selligent/" + type + "_config.txt");
	if (configFile.exists())
	{
		var line: String = null;
		var reader : Io.FileReader = new Io.FileReader(configFile);
		var lines : Array = reader.readLines();
		reader.close();
				
		for each(line in lines)
		{
			if(line.indexOf("Fields(") == 0)
			{
				var field = new Object;
				var length : Number = 0;
				var pos : Number = line.indexOf("=");
				var level : Number = 0;
				var subFields : Array;
				if(pos > 7)
					length = pos - 8;
				level = new Number(line.substr(7,  length));
				field.Level = level;
				subFields = line.substr(pos + 1).split(",");
				field.Fields = subFields;
				fields.push(field);
			}
		} 
	}
	return fields;
}

/**
* Returns the specific object uuid to export from the config file
*
* @returns the uuid of the object to export
*/
exports.getCustomObjectID = function(type : String) : String
{
	var configFile : Io.File = new Io.File(Io.File.IMPEX + "/Selligent/" + type + "_config.txt");
	var customUUID : String = "";
	if (configFile.exists())
	{
		var reader : Io.FileReader = new Io.FileReader(configFile);
		var lines : Array = reader.readLines();
		var line: String = null;
		
		reader.close();		
		for each(line in lines)
		{
			if(line.indexOf("UUID=") == 0)
				customUUID = line.replace("UUID=","").split(",");
		} 
		
	}
	return customUUID;
}
/**
* check if the config file exists 
*
* @param {String} The export type
* @returns a boolean  
*/
exports.configFileExist = function(type : String) : Boolean
{
	var returnValue : Boolean = false;
	var configFile : Io.File = new Io.File(Io.File.IMPEX + "/Selligent/" + type + "_config.txt");
	if (configFile.exists())
	{
		returnValue = true;
	}
	else
	{
		returnValue = false;
	}
	return returnValue;
}
/**
* Get the range defined in the config file to export 
*
* @param {String} The export type
* @returns the range number
*/
exports.getRange = function(type : String) : Number
{
	var configFile : Io.File = new Io.File(Io.File.IMPEX + "/Selligent/" + type + "_config.txt");
	var range : Number = 200;
	
	if (configFile.exists())
	{
		var reader : Io.FileReader = new Io.FileReader(configFile);
		var lines : Array = reader.readLines();		
		var line: String = null;
		
		reader.close();
		for each(line in lines)
		{
			if(line.indexOf("Range=") == 0)
				range = new Number(line.replace("Range=",""));
		} 
	}
	return range;
}

/**
* Get the piture type in the config file to export 
*
* @returns the picture type (Default is medium)
*/
function getPictureType() : String
{
	var configFile : Io.File = new Io.File(Io.File.IMPEX + "/Selligent/product_config.txt");
	var pictureType : String = "medium";
	if (configFile.exists())
	{
		var reader : Io.FileReader = new Io.FileReader(configFile);
		var lines : Array = reader.getLines();
		var line: String = null;
		
		reader.close();
		for each(line in lines)
		{
			if(line.indexOf("ImageType=") == 0)
				pictureType = line.replace("ImageType=","");
		} 
	}
	return pictureType;
}

/**
* Get a date formatted in yyyy-MM-dd HH:mm:ss format  
*
* @returns the date formated
*/
function getDate(item : Date) : String
{
	var result : String = "";
	if(item != null)
	{
		result = Util.StringUtils.formatCalendar(new Util.Calendar(item), "yyyy-MM-dd HH:mm:ss");
	}
	return result;
}

/* Exports */
module.exports.ExportObject = exports.exportObject;
module.exports.GetRange= exports.getRange;
module.exports.ConfigFileExist= exports.configFileExist;
module.exports.GetCustomObjectID= exports.getCustomObjectID;
module.exports.GetFieldsToExport = exports.getFieldsToExport;
