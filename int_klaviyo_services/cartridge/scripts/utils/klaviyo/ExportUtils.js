'use strict';

var io = require( 'dw/io' );
var system = require( 'dw/system' );

function getLastExportDate(exportType) {
	try
	{
		var lastExportDate = new Date(0);
		var dateFile = new io.File(io.File.IMPEX + "/src/klaviyo/export/" + exportType + "/" + exportType + "_exportdates.json");
		if (dateFile.exists())
		{
			var reader = new io.FileReader(dateFile);
			var lastExportDates = reader.readLines();	 	 
			reader.close();
			if (lastExportDates.length > 0)
			{
		 		lastExportDate = new Date(lastExportDates[lastExportDates.length - 1]);
		 	}
		}
		return lastExportDate;
	}
	catch(e) 
	{
		system.Logger.error("Unable to get last export date: "+e.message);
		throw e;
	} 
}

function updateExportDate(exportType, currentDate) {
	var writerDate;
	try 
	{
		var exportFileDates = new io.File(io.File.IMPEX + "/src/klaviyo/export/" + exportType + "/" + exportType + "_exportdates.json");
		writerDate = new io.FileWriter(exportFileDates, true);
		writerDate.writeLine(currentDate);
	}
	catch(e) 
	{		
		system.Logger.error("Unable to update date file: "+e.message);
		throw e;
	}
	finally 
	{
		if (writerDate) writerDate.close();
	} 
}

function getCategoryPath(category) {
	var path = '';
	if(!empty(category) && category.getParent()) {
		path = category.getDisplayName();
		var parent = this.getCategoryPath(category.getParent());
		path = (parent) ? parent + ' >> ' + path : path;
	}
	return path.toString();
}

module.exports = {
	getLastExportDate: getLastExportDate,
	updateExportDate: updateExportDate,
	getCategoryPath: getCategoryPath
};