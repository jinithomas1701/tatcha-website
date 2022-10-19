/**
* Description of the Controller and the logic it provides
*
* @module  controllers/Tatcha
*/

'use strict';

/* Script Modules */
var Site = require('dw/system/Site');
var io = require( 'dw/io' );
var utils = require( 'dw/util' );
var productMgr = require('dw/catalog/ProductMgr');
var URLUtils = require('dw/web/URLUtils');
var CustomerMgr = require('dw/customer/CustomerMgr');
var Transaction = require('dw/system/Transaction');
var app = require('app_storefront_controllers/cartridge/scripts/app');
var customObjectMgr = require('dw/object/CustomObjectMgr');

/*
* Exposed methods.
*/
exports.GoDataFeed = function(pdict) {
	var site = Site.current.preferences.custom;
	var filePath = Site.current.preferences.custom.GoDataFilePath;
	var fileName = Site.current.getCustomPreferenceValue('GoDataFileName');
	(new io.File(io.File.IMPEX + "//" + filePath)).mkdirs();
	// the feed file is created under the IMPEX WebDab directory
	var file = new io.File(io.File.IMPEX + "//" + filePath + "//" + fileName);
	
	var fileWriter = new io.FileWriter(file);
	var xsw = new io.XMLStreamWriter(fileWriter);
	
	//Get Products
	var products = productMgr.queryAllSiteProductsSorted();	

	xsw.writeStartDocument();
	xsw.writeStartElement("GoDataFeed");
		xsw.writeStartElement("Paging");
	 		xsw.writeStartElement("Start");
	 			xsw.writeCharacters("1");
 			xsw.writeEndElement();
 			xsw.writeStartElement("Count");
 				xsw.writeCharacters(products.getCount());
			xsw.writeEndElement();
			xsw.writeStartElement("Total");
				xsw.writeCharacters(products.getCount());
			xsw.writeEndElement();
	 	xsw.writeEndElement(); //End Paging
	 		
	 	xsw.writeStartElement("Fields");
	 		xsw.writeStartElement("Field");
	 			xsw.writeAttribute("name","sku");
	 		xsw.writeEndElement();
	 		xsw.writeStartElement("Field");
	 			xsw.writeAttribute("name","name");
	 		xsw.writeEndElement();
	 		xsw.writeStartElement("Field");
	 			xsw.writeAttribute("name","price");
	 		xsw.writeEndElement();
	 		xsw.writeStartElement("Field");
				xsw.writeAttribute("name","google_description");
			xsw.writeEndElement();
	 		xsw.writeStartElement("Field");
				xsw.writeAttribute("name","shippingprice");
			xsw.writeEndElement();
	 		xsw.writeStartElement("Field");
				xsw.writeAttribute("name","gtin");
			xsw.writeEndElement();
	 		xsw.writeStartElement("Field");
				xsw.writeAttribute("name","qty");
			xsw.writeEndElement();
	 		xsw.writeStartElement("Field");
				xsw.writeAttribute("name","keywords");
			xsw.writeEndElement();
	 		xsw.writeStartElement("Field");
				xsw.writeAttribute("name","parentsku");
			xsw.writeEndElement();
			xsw.writeStartElement("Field");
				xsw.writeAttribute("name","weight");
			xsw.writeEndElement();
			xsw.writeStartElement("Field");
				xsw.writeAttribute("name","isSaleable");
			xsw.writeEndElement();
			xsw.writeStartElement("Field");
				xsw.writeAttribute("name","is_in_stock");
			xsw.writeEndElement();
			xsw.writeStartElement("Field");
				xsw.writeAttribute("name","manufacturer_name");
			xsw.writeEndElement();
			xsw.writeStartElement("Field");
				xsw.writeAttribute("name","status");
			xsw.writeEndElement();
	 		xsw.writeStartElement("Field");
				xsw.writeAttribute("name","short_description");
			xsw.writeEndElement();
			xsw.writeStartElement("Field");
				xsw.writeAttribute("name","description");
			xsw.writeEndElement();
	 		xsw.writeStartElement("Field");
				xsw.writeAttribute("name","visibility");
			xsw.writeEndElement();
			xsw.writeStartElement("Field");
				xsw.writeAttribute("name","category_breadcrumb");
			xsw.writeEndElement();
	 		xsw.writeStartElement("Field");
				xsw.writeAttribute("name","google_product_category");
			xsw.writeEndElement();
	 		xsw.writeStartElement("Field");
				xsw.writeAttribute("name","google_product_type");
			xsw.writeEndElement();
			xsw.writeStartElement("Field");
				xsw.writeAttribute("name","absolute_url");
			xsw.writeEndElement();
	 		xsw.writeStartElement("Field");
				xsw.writeAttribute("name","image_product_one");
			xsw.writeEndElement();
	 		xsw.writeStartElement("Field");
				xsw.writeAttribute("name","absolute_image_url");
			xsw.writeEndElement();
	 	xsw.writeEndElement(); //End Fields
	 		
	 	xsw.writeStartElement("Products");
		 	while(products.hasNext()) {
				var product = products.next();
				if (product.isMaster()) {
					continue;
				}
				
				var stockModel = product.getAvailabilityModel();
				var qty = !empty(stockModel.getInventoryRecord()) ? stockModel.getInventoryRecord().getATS() : '0';
				
				if(qty == '0' || !stockModel.isOrderable() || !stockModel.isInStock() || !product.onlineFlag) {
					continue;
				}
				
				var isSaleable = stockModel.isOrderable();
				var isInStock = stockModel.isInStock();

				var imageUrl = !empty(product.getImage('large')) ? product.getImage('large').getAbsURL() : '';
				var productUrl = !empty(URLUtils.http('Product-Show', 'pid', product.ID)) ? URLUtils.abs('Product-Show', 'pid', product.ID) : '';
				var shippingCost = '0.00';
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
				
				xsw.writeStartElement("Product");
		 			xsw.writeStartElement("sku");
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
		 			xsw.writeStartElement("google_description");
						xsw.writeCData(product.custom.googleDescription ? product.custom.googleDescription : '');
					xsw.writeEndElement();
					xsw.writeStartElement("shippingprice");
						xsw.writeCharacters(shippingCost);
					xsw.writeEndElement();
					xsw.writeStartElement("gtin");
						xsw.writeCharacters(!empty(product.custom.gtin) ? product.custom.gtin : '');
					xsw.writeEndElement();
		 			xsw.writeStartElement("qty");
						xsw.writeCharacters(qty);
					xsw.writeEndElement();
					xsw.writeStartElement("keywords");
						xsw.writeCData(product.pageKeywords ? product.pageKeywords : '');
					xsw.writeEndElement();
		 			xsw.writeStartElement("parentsku");
						xsw.writeCharacters(masterID);
					xsw.writeEndElement();
					xsw.writeStartElement("weight");
						xsw.writeCharacters(product.custom.weight);
					xsw.writeEndElement();
					xsw.writeStartElement("isSaleable");
						xsw.writeCharacters(isSaleable);
					xsw.writeEndElement();
					xsw.writeStartElement("is_in_stock");
						xsw.writeCharacters(isInStock);
					xsw.writeEndElement();
					xsw.writeStartElement("manufacturer_name");
						xsw.writeCharacters(product.manufacturerName ? product.manufacturerName : 'Tatcha');
					xsw.writeEndElement();
					xsw.writeStartElement("status");
						xsw.writeCharacters(product.onlineFlag);
					xsw.writeEndElement();
					xsw.writeStartElement("short_description");
						xsw.writeCData(product.shortDescription ? product.shortDescription : product.name);
					xsw.writeEndElement();
					xsw.writeStartElement("description");
						xsw.writeCData(product.longDescription ? product.longDescription : product.name);
					xsw.writeEndElement();
					xsw.writeStartElement("visibility");
						xsw.writeCharacters(product.onlineFlag);
					xsw.writeEndElement();
					xsw.writeStartElement("category_breadcrumb");
						xsw.writeCData(categoryPath);
					xsw.writeEndElement();
		 			xsw.writeStartElement("google_product_category");
						xsw.writeCData(product.custom.googleProductCategory ? product.custom.googleProductCategory : '');
					xsw.writeEndElement();
		 			xsw.writeStartElement("google_product_type");
						xsw.writeCData(product.custom.googleProductType ? product.custom.googleProductType : '');
					xsw.writeEndElement();
		 			xsw.writeStartElement("absolute_url");
						xsw.writeCData(productUrl ? productUrl : '');
					xsw.writeEndElement();
		 			xsw.writeStartElement("image_product_one");
						xsw.writeCData(imageUrl ? imageUrl : '');
					xsw.writeEndElement();
		 			xsw.writeStartElement("absolute_image_url");
						xsw.writeCData(imageUrl ? imageUrl : '');
					xsw.writeEndElement();
					
				xsw.writeEndElement();//End Product
			}	 		
	 	xsw.writeEndElement(); //End Products
 	xsw.writeEndElement(); //End GoDataFeed
 	xsw.close();
}

exports.BISCustomObject = function(pdict) {
	var fileDirPath = dw.io.File.IMPEX + dw.io.File.SEPARATOR + '/Selligent/NotifyMe';
	var fileDir     = new dw.io.File(fileDirPath);
   
	if (!fileDir.exists()) {
		fileDir.mkdir();
	}
	
	var rows = customObjectMgr.getAllCustomObjects('BackInStockNotification');
	
	if (!empty(rows)) {
		
		var fileName = getExportFileName('selligent-bisn');
		var filePath = fileDirPath + dw.io.File.SEPARATOR + fileName;
		var file =	new dw.io.File(filePath);		
		file.createNewFile();
	
		var customObject = customObjectMgr.getAllCustomObjects('BackInStockNotification');
		var writer    = new dw.io.FileWriter(file);
	    var csvWriter = new dw.io.CSVStreamWriter(writer);
	    
	    var csvArray  = ["Pid", "Email", "Creation Date"];
		csvWriter.writeNext(csvArray);
		
		Transaction.wrap(function () {
			while(rows.hasNext()) {
				var row = rows.next();
				csvArray  = [row.custom.backInStockItemID, row.custom.backInStockEmail, row.creationDate];	 
				csvWriter.writeNext(csvArray);
				customObjectMgr.remove(row);
			}		
		});
		 
		csvWriter.close();
		writer.close();
	}
}

exports.ComingSoonCustomObject = function(pdict) {
	var fileDirPath = dw.io.File.IMPEX + dw.io.File.SEPARATOR + '/Selligent/NotifyMe';
	var fileDir     = new dw.io.File(fileDirPath);
   
	if (!fileDir.exists()) {
		fileDir.mkdir();
	}
	
	var rows = customObjectMgr.getAllCustomObjects('comingSoon');
	
	if (!empty(rows)) {
	
		var fileName = getExportFileName('selligent-comingsoon');
		var filePath = fileDirPath + dw.io.File.SEPARATOR + fileName;
		var file =	new dw.io.File(filePath);		
		file.createNewFile();
	
		var customObject = customObjectMgr.getAllCustomObjects('comingSoon');
		var writer    = new dw.io.FileWriter(file);
	    var csvWriter = new dw.io.CSVStreamWriter(writer);
	    
	    var csvArray  = ["Pid", "Email", "Creation Date"];
		csvWriter.writeNext(csvArray);
	
		
		Transaction.wrap(function () {
			while(rows.hasNext()) {
				var row = rows.next();
				csvArray  = [row.custom.comingSoonPid, row.custom.comingSoonEmail, row.creationDate];	 
				csvWriter.writeNext(csvArray);
				customObjectMgr.remove(row);
			}		
		});
		 
		csvWriter.close();
		writer.close();
	}
}


exports.ImportCards = function(pdict) {
	var site = Site.current.preferences.custom;
	var filePath = 'src/customer';
	var fileName = 'tatcha_customer_info.csv';
	(new io.File(io.File.IMPEX + "//" + filePath)).mkdirs();
	// the feed file is created under the IMPEX WebDab directory
	var file = new io.File(io.File.IMPEX + "//" + filePath + "//" + fileName);
	
	var fileReader = new io.FileReader(file);
	var csvReader = new io.CSVStreamReader(fileReader);
	var line;
	var i = 0;

	while ((line = csvReader.readNext()) != null ) {
		if(i > 0) {
			Transaction.wrap(function () {
				var customer = CustomerMgr.getCustomerByCustomerNumber(line[0]);
				if(customer) {
					var wallet = customer.getProfile().getWallet();
					var cardList = wallet.getPaymentInstruments(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);
					var customerPaymentInstrument = wallet.createPaymentInstrument(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);
					var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
					
					var ownerName = line[1]+' '+line[2];
					var cardNo = Date.now().toString().substr(0,11) + line[8];
					var token = line[4];
					var cardType = line[6];
					var expiryDate = line[10].split('-');
					var expirymonth = parseInt(months.indexOf(expiryDate[0])+1);
					var expiryYear = parseInt('20'+expiryDate[1]);
					var isDefault = (line[12] == 'Yes') ? true : false;
					
					for(var i = 0; i < cardList.length; i++) {
						if(cardList[i].custom.braintreePaymentMethodToken == token) {
							wallet.removePaymentInstrument(cardList[i]);
						}
					}
					
					customerPaymentInstrument.setCreditCardHolder(ownerName);
					customerPaymentInstrument.setCreditCardNumber(cardNo);
					customerPaymentInstrument.setCreditCardExpirationMonth(expirymonth);
					customerPaymentInstrument.setCreditCardExpirationYear(expiryYear);
					customerPaymentInstrument.setCreditCardType(cardType);
					customerPaymentInstrument.custom.braintreePaymentMethodToken = token;
					customerPaymentInstrument.custom.braintreeDefaultCard = isDefault;
					customer.profile.custom.isBraintree = true;
				}
			});
		}
		i++;
	}	
	return true;
}

exports.RemoveEmptyCard = function(pdict) {
	var site = Site.current.preferences.custom;
	var filePath = 'src/customer';
	var fileName = 'tatcha_customer_empty_vault.csv';
	(new io.File(io.File.IMPEX + "//" + filePath)).mkdirs();
	// the feed file is created under the IMPEX WebDab directory
	var file = new io.File(io.File.IMPEX + "//" + filePath + "//" + fileName);
	
	var fileReader = new io.FileReader(file);
	var csvReader = new io.CSVStreamReader(fileReader);
	var line;
	var lineCount = 0;
	while ((line = csvReader.readNext()) != null) {
		if(lineCount > 0) {
			try {
				Transaction.wrap(function() {
					var customer = CustomerMgr.getCustomerByCustomerNumber(line[0]);
					if(customer) {
						var wallet = customer.getProfile().getWallet();
						var paymentInstruments = wallet.getPaymentInstruments(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);
						for(var j=0; j< paymentInstruments.length; j++) {
							var paymentInstrument = paymentInstruments[j];
							if(empty(paymentInstrument.custom.braintreePaymentMethodToken)) {
								wallet.removePaymentInstrument(paymentInstrument);
								dw.system.Logger.info("Empty card deleted for the customer "+line[0]);
							}
						}
					}
				});
			} catch(e) {
				dw.system.Logger.error(e.toString());
		        return false;
		    }
		}
		lineCount++;
		if(lineCount > 600){
			break;
		}
	}
	return true;
}

exports.RemovePaypalCard = function(pdict) {
	var site = Site.current.preferences.custom;
	var filePath = 'src/customer';
	var fileName = 'tatcha_customer_paypal_vault.csv';
	(new io.File(io.File.IMPEX + "//" + filePath)).mkdirs();
	// the feed file is created under the IMPEX WebDab directory
	var file = new io.File(io.File.IMPEX + "//" + filePath + "//" + fileName);
	
	var fileReader = new io.FileReader(file);
	var csvReader = new io.CSVStreamReader(fileReader);
	var line;
	var lineCount = 0;
	while ((line = csvReader.readNext()) != null) {
		if(lineCount > 0) {
			try {
				Transaction.wrap(function() {
					var customer = CustomerMgr.getCustomerByCustomerNumber(line[0]);
					if(customer) {
						var wallet = customer.getProfile().getWallet();
						var token = line[8];
						var paymentInstruments = wallet.getPaymentInstruments("PayPal");
						for(var j=0; j< paymentInstruments.length; j++) {
							var paymentInstrument = paymentInstruments[j];
							if(paymentInstrument.custom.braintreePaymentMethodToken == token ) {
								wallet.removePaymentInstrument(paymentInstrument);
								dw.system.Logger.info("Empty card deleted for the customer "+line[0]);
							}
						}
					}
				});
			} catch(e) {
				dw.system.Logger.error(e.toString());
		        return false;
		    }
		}
		lineCount++;
		if(lineCount > 40){
			break;
		}
	}
	return true;
}

exports.OutOfStockProducts = function(pdict) {
    var currentoositems = [];
    var lastoositems = [];
    var clearCache = false;

    //Get current OOS items 
	var product;
	var products = dw.catalog.ProductMgr.queryAllSiteProducts();
	
	//Get the current OOS items
	while (products.hasNext()) {
		product = products.next();			
		if(product.isMaster() || product.getAvailabilityModel().isInStock() || !product.onlineFlag) {
			continue;
		}			
		if(!product.getAvailabilityModel().isInStock()){
			dw.system.Logger.info("OOS product ID  "+product.ID);
			currentoositems.push(product.ID);
		}
	} 

	//Get oos file
	var lastOOSItemsCSV = dw.io.File.IMPEX + dw.io.File.SEPARATOR + '/tatcha/oosproducts/last_oosproducts.csv';
	var lastOOSItemsFile	= new dw.io.File(lastOOSItemsCSV); 	
	
	// Check if the file exists
	if (!lastOOSItemsFile.exists()) {
		lastOOSItemsFile.createNewFile();
		clearCache = true;
	}
	
	//Read the current file skus
	var fileReader = new io.FileReader(lastOOSItemsFile);
	var csvReader = new io.CSVStreamReader(fileReader);
	var line;
	while ((line = csvReader.readNext()) != null) {
		lastoositems.push(line[0]);
	}	

	var lastOOSLength = lastoositems.length;
	var currentOOSLength = currentoositems.length;

	// compare the 2 lists
	if(JSON.stringify(lastoositems)==JSON.stringify(currentoositems)){
		dw.system.Logger.info("Cache Flush not needed ");
		clearCache = false;
	} else {
		dw.system.Logger.info("Cache Flush needed ");
		clearCache = true;
	}
	
	
	//Write the new list to file
    let writer    = new dw.io.FileWriter(lastOOSItemsFile);
    var csvWriter = new dw.io.CSVStreamWriter(writer);
	for (var i = 0; i < currentOOSLength; i++) {
		csvWriter.writeNext([currentoositems[i]]);
	}
	csvWriter.close();
	writer.close();
	
	if(clearCache) {
		let Pipeline = require('dw/system/Pipeline');
		let pdict = Pipeline.execute('InvalidateCache-FlushProductCache');
		var alertEmail = Site.getCurrent().getCustomPreferenceValue('technicalAlert');
		if(alertEmail) {
			var calendar = new dw.util.Calendar();
			calendar.timeZone = "PST";		
			var mail = new dw.net.Mail();
		    mail.addTo(alertEmail);
		    mail.setFrom("donotreply@demandware.com");
		    mail.setSubject("Cache Flush Started "+require('dw/util/StringUtils').formatCalendar(calendar, "yyyy-MM-dd HH-mm-ss" ));
		    mail.setContent("Current OOS Items : "+JSON.stringify(currentoositems)+"\n Last OOS Items : "+JSON.stringify(lastoositems));
		    mail.send();						
		}

	}


	return true;
}

function getCategoryPath(category) {
	var path = '';
	if(!empty(category) && category.getParent()) {
		path = category.getDisplayName();
		var parent = this.getCategoryPath(category.getParent());
		path = (parent) ? parent + ' >> ' + path : path;
	}
	return path;
}


/**
* Return the export file name based on the export type and the current date
*
* @param {String} the export type
* @param {String} the current date
* @returns the file name
*/
function getExportFileName(filePrefix) {
	//var exportFileTimestamp : String = "";
	//var currentDt : Date = new Date();
	//exportFileTimestamp = utils.StringUtils.formatNumber(currentDt.getFullYear(), "0000") + utils.StringUtils.formatNumber(currentDt.getMonth() + 1, "00") + utils.StringUtils.formatNumber(currentDt.getDate(), "00") + utils.StringUtils.formatNumber(currentDt.getHours(), "00") + utils.StringUtils.formatNumber(currentDt.getMinutes(), "00") + utils.StringUtils.formatNumber(currentDt.getSeconds(), "");
	return filePrefix + '.csv';     
}

exports.RemovePaypalAccount = function(pdict) {
	var profiles = CustomerMgr.queryProfiles("", null, true);
	for each(var profile in profiles) {
		var customer = profile.customer;
		if(customer) {
			var wallet = customer.getProfile().getWallet();
			var paymentInstruments = wallet.getPaymentInstruments("PayPal");
			for(var j=0; j< paymentInstruments.length; j++) {
				var paymentInstrument = paymentInstruments[j];
				wallet.removePaymentInstrument(paymentInstrument);
				dw.system.Logger.info("PayPal Account deleted for the customer "+profile.email);
			}
		}
	}
	return true;
}

exports.SendGifCertificatetMail = function(pdict) {
	var OrderMgr = require('dw/order/OrderMgr');
	var emailUtils = require('*/cartridge/scripts/utils/klaviyo/emailUtils');
	var GiftCertificate = require('app_storefront_controllers/cartridge/scripts/models/GiftCertificateModel');
	
	var orders = OrderMgr.searchOrders('custom.hasGiftCertificate={0} AND custom.isGiftMailSent={1} AND (exportStatus={2} OR exportStatus={3})', 'creationDate desc', 
			true, null, dw.order.Order.EXPORT_STATUS_READY, dw.order.Order.EXPORT_STATUS_EXPORTED);
	
	
	//Consider the timezone
	var cal = new dw.util.Calendar(new Date());
	cal.setTimeZone('PST');
	var date = new Date(dw.util.StringUtils.formatCalendar(cal));
	
	if(pdict.date) {
	    var pdate = pdict.date.split('-');
	    date = new Date(pdate[0], (pdate[1]-1), pdate[2]);
	}

	var giftMailDelayDays = 0;
	if(Site.current.getCustomPreferenceValue('klaviyo_giftmail_interval')) {
		giftMailDelayDays = Site.current.getCustomPreferenceValue('klaviyo_giftmail_interval');
	}
	
	var from = new Date(date.toUTCString());
	var to = new Date(date.toUTCString());
	from.setDate(from.getDate() - giftMailDelayDays);
	
	dw.system.Logger.info("Date Interval From: "+from.toUTCString()+" To: "+to.toUTCString());
	
	while (orders.hasNext()) {
		var order = orders.next();
		
		var count = 0;
		var shipments = order.getShipments().iterator();
		while (shipments.hasNext()) {
			var shipment = shipments.next();
			var giftCertificateLineItems = shipment.getGiftCertificateLineItems().iterator();
			
			while (giftCertificateLineItems.hasNext()) {
				var giftCertificateLineItem = giftCertificateLineItems.next();
				var dateString = !empty(giftCertificateLineItem.custom.giftCertificateDeliveryDate) ? new Date(giftCertificateLineItem.custom.giftCertificateDeliveryDate) : '';
				if((!giftCertificateLineItem.custom.hasOwnProperty('isGiftMailSent') || giftCertificateLineItem.custom.isGiftMailSent != true)
						&& dateString >= from && dateString <= to
						) {
					
					dw.system.Logger.info("Sending card for "+order.getOrderNo());
					
					Transaction.wrap(function () {
						var giftCertificate = GiftCertificate.createGiftCertificateFromLineItem(giftCertificateLineItem, order.getOrderNo());
						emailUtils.sendGiftCertificateEmail(giftCertificate, order.getOrderNo());
						giftCertificateLineItem.custom.isGiftMailSent = true;
					});
				}
				
				if(giftCertificateLineItem.custom.hasOwnProperty('isGiftMailSent') && giftCertificateLineItem.custom.isGiftMailSent == true) {
					count++;
				}		
			}
		}
		
		if(order.getGiftCertificateLineItems().size() == count) {
			Transaction.wrap(function () {
				order.custom.isGiftMailSent = true;
			});
		}
	}
}