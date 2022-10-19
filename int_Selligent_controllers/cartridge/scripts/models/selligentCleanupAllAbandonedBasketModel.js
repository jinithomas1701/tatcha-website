/**
* Demandware Script File
* This script cleanup all abandonned basket custom object 
*
*/

var System = require('dw/system');
var Object = require('dw/object');
var Util = require('dw/util');
var Io = require('dw/io');
var Transaction = require('dw/system/Transaction');

exports.execute = function()
{
   var allSAB : Util.SeekableIterator;
   Transaction.begin();

   try
	{
		var gap : Object.Number = getCustomGAPAttribute();

		allSAB = Object.CustomObjectMgr.getAllCustomObjects("SAB");

		var currentCalendar : Util.Calendar = new Util.Calendar();
		currentCalendar.add(Util.Calendar.MINUTE, -gap);
		
		while (allSAB.hasNext()) 
		{	
			var currentSAB : Object.CustomObject = allSAB.next();	
				
			if (currentSAB.lastModified <  currentCalendar.time){
				Object.CustomObjectMgr.remove(currentSAB);				
			}
		}
		Transaction.commit();
	}
	catch(e) 
	{		
		Transaction.rollback();
		System.Logger.error("Selligent Error: Unable to cleanup all adandoned basket: "+e.message);
	}
	finally 
	{
		if (allSAB) allSAB.close();
	} 
   	
}

/**
* Returns the custom attribues list for a product to export from the config file
*
* @returns an array with custom attribues
*/
function getCustomGAPAttribute() : Number
{
	var configFile : Io.File = new Io.File(Io.File.IMPEX + "/Selligent/abandonedbasket_config.txt");
	var readGap : String = "";
	var returnGap  : Number = 2;
	if (configFile.exists())
	{
		var reader : Io.FileReader = new Io.FileReader(configFile);
		var lines : Array = reader.readLines();
		var line: String = null;
		
		reader.close();		
		for each(line in lines)
		{
			if(line.indexOf("CleanUpInterval=") == 0){
				readGap = line.replace("CleanUpInterval=","");
				returnGap = new Number(readGap);
			}
		} 
		
	}
	return returnGap;
}

/* Exports */
module.exports.Execute = exports.execute;