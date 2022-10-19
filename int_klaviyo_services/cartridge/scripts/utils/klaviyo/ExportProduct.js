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
	var ExportUtils = require('~/cartridge/scripts/utils/klaviyo/ExportUtils');
	var ProductMgr = require('dw/catalog/ProductMgr');
	var URLUtils = require('dw/web/URLUtils');
	importScript("int_tatcha_dis:common/GetImageUrl.ds");
	
	var productFilePath = 'src/klaviyo/export/product';
	var impexFilePath = io.File.IMPEX + "//" + productFilePath;
	var limitPerFile = 500;
	var productList;
	var fileWriter;
	var xsw;
	
	try {
		(new io.File(impexFilePath)).mkdirs();
		//var file = new io.File(impexFilePath + "//" + 'productexport' + new Date().toISOString() + '.xml');
		
		var startDate = pdict.startDate;
		var endDate = pdict.endDate;
		
		if(!empty(startDate) && !empty(endDate)) {
			productList = ProductMgr.queryAllSiteProducts();
		} else {
			var date = ExportUtils.getLastExportDate('product');
			productList = ProductMgr.queryAllSiteProducts();
			var currentDate = new Date();
			ExportUtils.updateExportDate('product',currentDate);
		}
		
		var file = new io.File(impexFilePath + "//" + 'productexport' + new Date().toISOString() + '.xml');
		fileWriter = new io.FileWriter(file);
		xsw = new io.XMLStreamWriter(fileWriter);

		xsw.writeStartDocument();
		
	 	xsw.writeStartElement("products");
	 	while(productList.hasNext()) {
			var product = productList.next();
			if (product.isMaster()) {
				continue;
			}
			
			var stockModel = product.getAvailabilityModel();
			var qty = !empty(stockModel.getInventoryRecord()) ? stockModel.getInventoryRecord().getATS() : '0';
			
			if(!stockModel.isOrderable() || !product.onlineFlag) {
				continue;
			}
			
			var isSaleable = stockModel.isOrderable();
			var isInStock = stockModel.isInStock();

			var imageUrl = getImageUrl(product,'medium').toString();
			var productUrl = !empty(URLUtils.http('Product-Show', 'pid', product.ID)) ? URLUtils.abs('Product-Show', 'pid', product.ID) : '';
			var categoryPath = '';
			if(product.isCategorized()) {
				var category = product.getClassificationCategory();
				categoryPath = ExportUtils.getCategoryPath(category);
			}
			
			var masterID = '';
			if(product.isVariant()) {
				var masterProduct = product.getMasterProduct();
				masterID = masterProduct.ID;
			}
			
			xsw.writeStartElement("product");
	 			xsw.writeStartElement("ID");
	 				xsw.writeCharacters(product.ID);
	 			xsw.writeEndElement();
	 			xsw.writeStartElement("name");
	 				xsw.writeCharacters(product.name);
	 			xsw.writeEndElement();
	 			xsw.writeStartElement("price");
	 				xsw.writeCharacters(product.priceModel.price.value);		 				
	 			xsw.writeEndElement();
		 			xsw.writeStartElement("special_price");
	 				xsw.writeCharacters(product.custom.specialPrice);
	 			xsw.writeEndElement();
	 			xsw.writeStartElement("qty");
					xsw.writeCharacters(qty);
				xsw.writeEndElement();
	 			xsw.writeStartElement("parentsku");
					xsw.writeCharacters(masterID);
				xsw.writeEndElement();
				xsw.writeStartElement("category_breadcrumb");
					xsw.writeCharacters(categoryPath);
				xsw.writeEndElement();
	 			xsw.writeStartElement("absolute_url");
					xsw.writeCharacters(productUrl ? productUrl : '');
				xsw.writeEndElement();
	 			xsw.writeStartElement("image_url");
					xsw.writeCharacters(imageUrl ? imageUrl : '');
				xsw.writeEndElement();
				xsw.writeStartElement("short_description");
					xsw.writeCharacters(product.custom.benefitsSection1 ? product.custom.benefitsSection1 : '');
				xsw.writeEndElement();
				xsw.writeStartElement("product_status");
					xsw.writeCharacters(product.custom.oosProductStatus ? product.custom.oosProductStatus : '');
				xsw.writeEndElement();
				
			xsw.writeEndElement();//End Product
		}	 		
	 	xsw.writeEndElement(); //End Products
	 	xsw.close();
	 	
	 	return PIPELET_NEXT;
 	
	} catch(e)  {
		var exportErrorFile : io.File;
		var writerError : io.FileWriter;
		var logFilePath = impexFilePath + "//" + "log";
		(new io.File(logFilePath)).mkdirs();
		exportErrorFile = new io.File(logFilePath + "//" + "product_exportError.log"); 		 
		writerError = new io.FileWriter(exportErrorFile, false);
		writerError.write(e.message);
		writerError.close();
		
		return PIPELET_ERROR;
	}
	finally {
		if (productList) productList.close();
		if (fileWriter) fileWriter.close();
		if (xsw) xsw.close();
	}

}
