/**
* Description of the Controller and the logic it provides
*
* @module  controllers/Export
*/

'use strict';

var app = require('app_storefront_controllers/cartridge/scripts/app');
var io = require( 'dw/io' );
var system = require( 'dw/system' );
var OrderMgr = require('dw/order/OrderMgr');
var CustomerMgr = require('dw/customer/CustomerMgr');
var CatalogMgr = require('dw/catalog/CatalogMgr');
var ProductMgr = require('dw/catalog/ProductMgr');
var Pipelet = require('dw/system/Pipelet');
var URLUtils = require('dw/web/URLUtils');
importScript("int_tatcha_dis:common/GetImageUrl.ds");

/*
* Exposed methods.
*/

exports.ExportOrder = function(pdict) {
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
			var date = lastExportDate = getLastExportDate('order');
			orderList = OrderMgr.searchOrders("creationDate > {0} and status != {1} and status != {2}","orderNo asc", date, '0', '8');
			var currentDate = new Date();
			updateExportDate('order',currentDate);
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
	} catch(e)  {
		var exportErrorFile : io.File;
		var writerError : io.FileWriter;
		var logFilePath = impexFilePath + "//" + "log";
		(new io.File(logFilePath)).mkdirs();
		exportErrorFile = new io.File(logFilePath + "//" + "order_exportError.log"); 		 
		writerError = new io.FileWriter(exportErrorFile, false);
		writerError.write(e.message);
		writerError.close();
		throw e;
	}
	finally {
		if (orderList) orderList.close();
		if (fileWriter) fileWriter.close();
		if (xsw) xsw.close();
	}
}

exports.ExportCustomer = function(pdict) {
	var customerFilePath = 'src/klaviyo/export/customer';
	var impexFilePath = io.File.IMPEX + "//" + customerFilePath;
	var limitPerFile = 500;
	var profileList;
	var fileWriter;
	var xsw;
	try {
		(new io.File(impexFilePath)).mkdirs();

		var startDate = pdict.startDate;
		var endDate = pdict.endDate;

		if(!empty(startDate) && !empty(endDate)) {
			profileList = CustomerMgr.searchProfiles("creationDate >= {0} and creationDate <= {1}","customerNo asc", startDate, endDate);
		} else {
			var date = lastExportDate = getLastExportDate('customer');
			profileList = CustomerMgr.searchProfiles("creationDate > {0}","customerNo asc", date);
			var currentDate = new Date();
			updateExportDate('customer',currentDate);
		}
		
		if (empty(profileList) || profileList.getCount() == 0) {
			system.Logger.error("No profiles for export.");
			return;
		}
		
		var file = new io.File(impexFilePath + "//" + 'customerexport' + new Date().toISOString() + '.xml');
		fileWriter = new io.FileWriter(file);
		xsw = new io.XMLStreamWriter(fileWriter);

		xsw.writeStartDocument();
		xsw.writeStartElement("customers");
		var counter = 1;

		while (profileList.hasNext()) {

			if(counter > limitPerFile) {
				xsw.writeEndElement();
				xsw.close();

				//Create New File
				file = new io.File(impexFilePath + "//" + 'customerexport' + new Date().toISOString() + '.xml');
				fileWriter = new io.FileWriter(file);
				xsw = new io.XMLStreamWriter(fileWriter);

				xsw.writeStartDocument();
				xsw.writeStartElement("customers");
				var counter = 1;
			}

			var profile = profileList.next();
			xsw.writeStartElement("customer");
			xsw.writeAttribute("customer-no", profile.customerNo);
				xsw.writeStartElement("profile");
						xsw.writeStartElement("first-name");
						xsw.writeCharacters(profile.firstName);
						xsw.writeEndElement();
						xsw.writeStartElement("second-name");
						xsw.writeCharacters(profile.secondName);
						xsw.writeEndElement();
						xsw.writeStartElement("last-name");
						xsw.writeCharacters(profile.lastName);
						xsw.writeEndElement();
						xsw.writeStartElement("email");
						xsw.writeCharacters(profile.email);
						xsw.writeEndElement();
						xsw.writeStartElement("phone-mobile");
						xsw.writeCharacters(profile.phoneMobile);
						xsw.writeEndElement();
						xsw.writeStartElement("creation-date");
						xsw.writeCharacters(profile.creationDate);
						xsw.writeEndElement();
						xsw.writeStartElement("last-login-time");
						xsw.writeCharacters(profile.lastLoginTime);
						xsw.writeEndElement();
						xsw.writeStartElement("last-visit-time");
						xsw.writeCharacters(profile.lastVisitTime);
						xsw.writeEndElement();
						xsw.writeStartElement("preferred-locale");
						xsw.writeCharacters(profile.preferredLocale);
						xsw.writeEndElement();
						xsw.writeStartElement("custom-attributes");
						xsw.writeStartElement("custom-attribute");
						xsw.writeAttribute("attribute-id", "newsletterFrequency");
						xsw.writeCharacters(profile.custom.newsletterFrequency);
						xsw.writeEndElement();
						xsw.writeStartElement("custom-attribute");
						xsw.writeAttribute("attribute-id", "newsletterSubscription");
						xsw.writeCharacters(profile.custom.newsletterSubscription);
						xsw.writeEndElement();
				xsw.writeEndElement();
			xsw.writeEndElement();
			xsw.writeEndElement();

			counter++;
		}

		xsw.writeEndElement();
		xsw.close();

	} catch(e)  {
		var exportErrorFile : io.File;
		var writerError : io.FileWriter;
		system.Logger.error("Unable to export customer: "+e.message);
		var logFilePath = impexFilePath + "//" + "log";
		(new io.File(logFilePath)).mkdirs();
		exportErrorFile = new io.File(logFilePath + "//" + "customer_exportError.log"); 			 
		writerError = new io.FileWriter(exportErrorFile, false);
		writerError.write(e.message);
		writerError.close();
		
		throw e;
	}
	finally {
		if (profileList) profileList.close();
		if (fileWriter) fileWriter.close();
		if (xsw) xsw.close();
	} 
}

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


exports.ExportProduct = function(pdict) {
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
			var date = getLastExportDate('product');
			productList = ProductMgr.queryAllSiteProducts();
			var currentDate = new Date();
			updateExportDate('product',currentDate);
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
				categoryPath = this.getCategoryPath(category);
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
 	
	} catch(e)  {
		var exportErrorFile : io.File;
		var writerError : io.FileWriter;
		var logFilePath = impexFilePath + "//" + "log";
		(new io.File(logFilePath)).mkdirs();
		exportErrorFile = new io.File(logFilePath + "//" + "product_exportError.log"); 		 
		writerError = new io.FileWriter(exportErrorFile, false);
		writerError.write(e.message);
		writerError.close();
		throw e;
	}
	finally {
		if (productList) productList.close();
		if (fileWriter) fileWriter.close();
		if (xsw) xsw.close();
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