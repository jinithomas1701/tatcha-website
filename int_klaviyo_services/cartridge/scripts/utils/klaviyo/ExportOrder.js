/**
*
*  	@input startDate : String
*   @input endDate : String
*
*/

function execute( pdict : PipelineDictionary )
{
	var io = require( 'dw/io' );
	var system = require( 'dw/system' );
	var OrderMgr = require('dw/order/OrderMgr');
	var ExportUtils = require('~/cartridge/scripts/utils/klaviyo/ExportUtils');
	
	var orderFilePath = 'src/klaviyo/export/order';
	var impexFilePath = io.File.IMPEX + "//" + orderFilePath;
	var limitPerFile = 500;
	var orderList;
	var fileWriter;
	var xsw;
	
	try {
		(new io.File(impexFilePath)).mkdirs();
		var file = new io.File(impexFilePath + "//" + 'orderexport' + new Date().toISOString() + '.xml');
		fileWriter = new io.FileWriter(file);
		xsw = new io.XMLStreamWriter(fileWriter);

		var startDate = pdict.startDate;
		var endDate = pdict.endDate;

		if(!empty(startDate) && !empty(endDate)) {
			orderList = OrderMgr.searchOrders("creationDate >= {0} and creationDate <= {1} and status != {2} and status != {3}","orderNo asc", startDate, endDate, '0', '8');
		} else {
			var date = lastExportDate = ExportUtils.getLastExportDate('order');
			orderList = OrderMgr.searchOrders("creationDate > {0} and status != {1} and status != {2}","orderNo asc", date, '0', '8');
			var currentDate = new Date();
			ExportUtils.updateExportDate('order',currentDate);
		}



		xsw.writeStartDocument();
		var counter = 1;
		xsw.writeRaw("<orders xmlns='http://www.demandware.com/xml/impex/order/2006-10-31'>");

		while (orderList.hasNext()) {

			if(counter > limitPerFile) {
				xsw.writeRaw("</orders>");
				xsw.close();

				//Create New File
				file = new io.File(impexFilePath + "//" + 'orderexport' + new Date().toISOString() + '.xml');
				fileWriter = new io.FileWriter(file);
				xsw = new io.XMLStreamWriter(fileWriter);
				xsw.writeStartDocument();
				counter = 1;
				xsw.writeRaw("<orders xmlns='http://www.demandware.com/xml/impex/order/2006-10-31'>");
			}

			var order = orderList.next();
			var orderXmlAsString = order.getOrderExportXML(null, null);
			var xml = new XML(orderXmlAsString);
			xsw.writeRaw(xml.toString());
			counter++;
		}
		
		xsw.writeRaw("</orders>");
		xsw.close();
		
		return PIPELET_NEXT;
		
	} catch(e)  {
		var exportErrorFile : io.File;
		var writerError : io.FileWriter;
		var logFilePath = impexFilePath + "//" + "log";
		(new io.File(logFilePath)).mkdirs();
		exportErrorFile = new io.File(logFilePath + "//" + "order_exportError.log"); 		 
		writerError = new io.FileWriter(exportErrorFile, false);
		writerError.write(e.message);
		writerError.close();
		
		return PIPELET_ERROR;
	}
	finally {
		if (orderList) orderList.close();
		if (fileWriter) fileWriter.close();
		if (xsw) xsw.close();
	}

}
