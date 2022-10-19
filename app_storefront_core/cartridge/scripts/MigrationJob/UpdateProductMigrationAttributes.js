/**
*
* This is the main script called by the pipeline to update migration attributes
*
*/
importPackage( dw.system );
importPackage( dw.catalog );
importPackage( dw.io );
var Site = require('dw/system/Site');
function execute() {
	try{
		var fileLocation = new File(File.IMPEX + File.SEPARATOR + 'MigrationFiles' + File.SEPARATOR +'CatalogProducts.csv');
	if (!fileLocation.exists())
	{
		Logger.error("CatalogProducts.csv file not found in the source");
		return;
	} else {
			var updateFile = new File(File.IMPEX + File.SEPARATOR + 'MigrationFiles' + File.SEPARATOR + "UpdatedProducts.csv");
			var fileReader = new FileReader(fileLocation);
			var csvStreamReader = new CSVStreamReader(fileReader);
			var csvWriter = new CSVStreamWriter(new FileWriter(updateFile));
			csvWriter.writeNext( [ 'ID','c__productContentslot'] );
			var line;
			while ( line = csvStreamReader.readNext() ) {
				var prodId = line[0];
				var product  = ProductMgr.getProduct(prodId);
				if(product != null) {
					var productContentSlotSec = '<style type="text/css">' + '</style>';
					csvWriter.writeNext([ prodId, productContentSlotSec]);
				}
			}
		csvWriter.close();
		csvStreamReader.close();
		fileReader.close();
	}
}
catch(e) {
	Logger.error("Error occured while updating the migration attributes "+e);
}
}

/* Module Exports */
exports.execute = execute;
