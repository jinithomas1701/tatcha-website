/**
 * Initializes the BM reconciliation module
 */
'use strict';

// Script Modules
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var OrderMgr = require('dw/order/OrderMgr');
var dwsystem = require('dw/system');
var dworder = require('dw/order');
var avhelper = require('~/cartridge/scripts/avhelper');

var avaTaxClient = require('*/cartridge/scripts/avaTaxClient');

// Logger includes
var LOGGER = dw.system.Logger.getLogger('Avalara', 'AvaTax');

// Global variables
var avataxHelper = avhelper.avataxHelperExported;
var companyCode = '';
var params = request.httpParameterMap;

// AvaTax setting preference
var settingsObject = JSON.parse(dwsystem.Site.getCurrent().getCustomPreferenceValue('ATSettings'));

/**
 * Gets the site information and settings for the current site
 * @returns {*} site info
 */
function getSiteInfo() {
	return avhelper.getSiteInfo();
}

/**
 * Utility method to be used on client side
 * @returns {*} site info for ajax methods
 */
function getSiteInfoAJAX() {
	return avhelper.getSiteInfoAJAX();
}

/**
 * Displays the reconiliation page
 */
function start() {
	var currentMenuItemId = params.CurrentMenuItemId.value;
	var menuname = params.menuname.value;
	var mainmenuname = params.mainmenuname.value;

	session.privacy.currentMenuItemId = currentMenuItemId;
	session.privacy.menuname = menuname;
	session.privacy.mainmenuname = mainmenuname;
	// Preserve the dates
	session.privacy.fromdate = '';
	session.privacy.todate = '';
	var viewObj = {
		CurrentMenuItemId: currentMenuItemId,
		menuname: menuname,
		mainmenuname: mainmenuname
	};
	try {
		var siteInfo = avhelper.getSiteInfo();
		viewObj.siteInfo = siteInfo;
		var avataxEnabled = settingsObject.taxCalculation;
		if (!avataxEnabled) {
			viewObj.errormsg = "AvaTax tax calculation is not enabled. Some features won't work. Please enable it by navigating to 'Merchants Tools > AvaTax > AvaTax Settings', and try again.";
		} else if (!settingsObject.saveTransactions) {
			viewObj.errormsg = "'Save transactions to AvaTax' is not enabled.  Some features won't work. Please enable it by navigating to 'Merchants Tools > AvaTax > AvaTax Settings', and try again.";
		}
	} catch (e) {
		viewObj.errormsg = 'No Site selected. Please select a site from the dropdown, and try again.';
	}
	app.getView(viewObj).render('/avatax/ordersreconcile');
}


var amountMisMatch = 'Amount Mismatch';
var taxMisMatch = 'Tax Mismatch';
var missingInAvaTax = 'Missing In AvaTax';
var missingInSFCC = 'Missing In B2C';

/**
 * Reconciles the order documents from SFCC and AvaTax
 * @param {*} sfccOrders sfccOrders
 * @param {*} avaTax avaTax
 * @returns {*} reconciled transaction
 */
function reconcileTransactions(sfccOrders, avaTax) {
	var countReport = {};
	var amountOrTaxMisMatchCount = 0;
	var missingInAvaTaxCount = 0;
	var missingInSFCCCount = 0;
	var result = [];
	var mapSFCCOrders = new dw.util.SortedMap();
	for (var i = 0; i < sfccOrders.size(); i++) {
		mapSFCCOrders.put(sfccOrders[i].orderNo, sfccOrders[i]);
		var avaTrans = avaTax.get(sfccOrders[i].orderNo);
		var rStatus = '';
		var avTotalAmt;
		var avTotalTax;
		var avCurrency;

		if (avaTrans) {
			if (sfccOrders[i].totalNetPrice.value !== avaTrans.totalAmount) {
				rStatus = amountMisMatch;
				amountOrTaxMisMatchCount++;
			} else if (sfccOrders[i].totalTax.value !== avaTrans.totalTax) {
				rStatus = taxMisMatch;
				amountOrTaxMisMatchCount++;
			}
			avTotalAmt = avaTrans.totalAmount;
			avTotalTax = avaTrans.totalTax;
			avCurrency = avaTrans.currencyCode;
		} else {
			rStatus = missingInAvaTax;
			missingInAvaTaxCount++;
			avTotalAmt = '';
			avTotalTax = '';
		}
		if (rStatus !== '') {
			result.push({
				orderNo: sfccOrders[i].orderNo,
				orderDate: sfccOrders[i].creationDate,
				orderStatus: sfccOrders[i].status,
				orderTotalAmt: sfccOrders[i].totalNetPrice.value,
				orderTax: sfccOrders[i].totalTax.value,
				avTotalAmt: avTotalAmt,
				avTotalTax: avTotalTax,
				avCurrencyCode: avCurrency,
				reconciliationStatus: rStatus
			});
		}
	}
	for (i = 0; i < avaTax.keySet().toArray().length; i++) {
		var docCode = avaTax.keySet().toArray()[i];
		var avataxDoc = avaTax.get(docCode);
		var order = mapSFCCOrders.get(docCode);
		if (!order) {
			result.push({
				orderNo: avataxDoc.code,
				orderDate: avataxDoc.date,
				orderStatus: '-',
				orderTotalAmt: '-',
				orderTax: '-',
				avTotalAmt: avataxDoc.totalAmount,
				avTotalTax: avataxDoc.totalTax,
				avCurrencyCode: avataxDoc.currencyCode,
				reconciliationStatus: missingInSFCC
			});
			missingInSFCCCount++;
		}
	}
	countReport = {
		amountOrTaxMisMatchCount: amountOrTaxMisMatchCount,
		missingInAvaTaxCount: missingInAvaTaxCount,
		missingInSFCCCount: missingInSFCCCount
	};
	return {
		orders: result,
		countReport: countReport
	};
}

/**
 * Fetches order documents from SFCC and AvaTax
 * @param {*} params collection of orders
 */
function getOrders() {
	var currentMenuItemId = session.privacy.currentMenuItemId;
	var menuname = session.privacy.menuname;
	var mainmenuname = session.privacy.mainmenuname;
	var siteInfo = null;
	var orders = null;
	var ordersList = null;
	var ordersOnAccount = null;
	var reconcileResults = null;
	var countReport = null;
	var errormsg = null;
	var reconciledOrders = null;
	var viewObj = null;

	var success = true;

	siteInfo = getSiteInfo();

	try {
		var avataxEnabled = settingsObject.taxCalculation;
		companyCode = settingsObject.companyCode;
		if (!avataxEnabled) {
			success = false;
			viewObj = {
				errormsg: "AvaTax tax calculation is not enabled. Some features won't work. Please enable it by navigating to 'Merchants Tools > AvaTax > AvaTax Settings', and try again.",
				CurrentMenuItemId: currentMenuItemId,
				menuname: menuname,
				mainmenuname: mainmenuname
			};
		} else if (!settingsObject.saveTransactions) {
			success = false;
			viewObj = {
				errormsg: "'Save transactions to AvaTax' is not enabled.  Some features won't work. Please enable it by navigating to 'Merchants Tools > AvaTax > AvaTax Settings', and try again.",
				CurrentMenuItemId: currentMenuItemId,
				menuname: menuname,
				mainmenuname: mainmenuname
			};
		} else {
			siteInfo = getSiteInfo();
		}
	} catch (e) {
		success = false;
		viewObj = {
			errormsg: 'There was a problem processing this request. Please try again.',
			CurrentMenuItemId: currentMenuItemId,
			menuname: menuname,
			mainmenuname: mainmenuname
		};
	}
	if (success) {
		try {
			// Retrieve selected dates
			var fromdate = params.fromdate.value.toString();
			var todate = params.todate.value.toString();

			if (empty(fromdate) && empty(todate)) {
				var date = new Date();

				var today = date;
				var todayMonth = today.getUTCMonth() + 1;
				var todayDate = today.getUTCDate();
				var todayYear = today.getUTCFullYear();
				var todayDate = todayMonth + '/' + todayDate + '/' + todayYear;

				// 30 days back
				var frDay = new Date(new Date() - (30 * 24 * 60 * 60 * 1000)); // date 30 days ago
				var frMonth = frDay.getUTCMonth() + 1;
				var frDate = frDay.getUTCDate();
				var frYear = frDay.getUTCFullYear();
				var frDate = frMonth + '/' + frDate + '/' + frYear;

				fromdate = frDate;
				todate = todayDate;

			}
			// save dates to make them accessible on ISML
			session.privacy.fromdate = fromdate;
			session.privacy.todate = todate;
			if (empty(fromdate) && empty(todate)) {
				// AvaTax getTransactions API has changed to display only last 30 days transactions. Still keeping this piece
				orders = OrderMgr.queryOrders('orderNo != {0}', 'creationDate desc', '*');
				ordersOnAccount = avaTaxClient.getTransactions(companyCode); // yyyy-mm-dd
				ordersList = orders.asList();
				orders.close();
				if (!ordersOnAccount.ERROR) {
					reconcileResults = reconcileTransactions(ordersList, ordersOnAccount.values);
					reconciledOrders = reconcileResults.orders;
					countReport = reconcileResults.countReport;
				} else {
					errormsg = 'Error occured while contacting AvaTax services. If the problem persists, check service configuration settings and try again.';
				}
			} else if (empty(fromdate) || empty(todate)) {
				errormsg = 'Please select appropriate date range and try again.';
			} else {
				var fromDateArray = [fromdate.split('/')[0], fromdate.split('/')[1], fromdate.split('/')[2]];
				var toDateArray = [todate.split('/')[0], todate.split('/')[1], todate.split('/')[2]];
				var fdStr = fromDateArray[2] + '-' + fromDateArray[0] + '-' + fromDateArray[1]; // yyyy-mm-dd
				var tdStr = toDateArray[2] + '-' + toDateArray[0] + '-' + toDateArray[1]; // yyyy-mm-dd
				var td1 = new Date((new Date(toDateArray[2], toDateArray[0], toDateArray[1])).getTime() + (1 * 24 * 60 * 60 * 1000));
				var tdStrSFCC = td1.getYear() + '-' + td1.getMonth() + '-' + td1.getDate();
				orders = OrderMgr.queryOrders('creationDate >= {0} AND creationDate <= {1} AND status != {2} AND status != {3}', 'creationDate desc', fdStr, tdStrSFCC, 8, 6);
				ordersList = orders.asList();
				orders.close();
				ordersOnAccount = avaTaxClient.getTransactions(companyCode, fdStr, tdStr); // yyyy-mm-dd
				if (!ordersOnAccount.ERROR) {
					reconcileResults = reconcileTransactions(ordersList, ordersOnAccount.values);
					reconciledOrders = reconcileResults.orders;
					countReport = reconcileResults.countReport;
				} else {
					errormsg = 'Error occured while contacting AvaTax services. If the problem persists, check service configuration settings and try again.';
				}
			}
			viewObj = {
				orders: reconciledOrders,
				siteInfo: siteInfo,
				CurrentMenuItemId: currentMenuItemId,
				menuname: menuname,
				mainmenuname: mainmenuname,
				countReport: countReport,
				errormsg: errormsg
			};
		} catch (e) {
			LOGGER.warn('Problem while contacting AvaTax. Please check the logs for error details. ' + e.message);
			viewObj = {
				errormsg: 'Problem while contacting AvaTax. Please check the logs for error details.',
				CurrentMenuItemId: currentMenuItemId,
				siteInfo: siteInfo,
				menuname: menuname,
				mainmenuname: mainmenuname
			};
		}
	}
	app.getView(viewObj).render('/avatax/ordersreconcile');
}


var CreateTransactionModel = require('*/cartridge/models/createTransactionModel');
var uuidLineNumbersMap = new dw.util.SortedMap();
var counter = 0;

/**
 * Reconcile selected orders
 */
function reconcile() {
	var r = require('~/cartridge/scripts/util/Response');
	var orderNo = params.orderno.value;
	if (!settingsObject.taxCalculation) {
		LOGGER.warn('AvaTax | AvaTax not enabled for this site. File - avaTax.js~calculateTax');
		r.renderJSON({
			ERROR: true,
			fatalmsg: 'AvaTax is disabled for this site.'
		});
		return;
	}
	if (!orderNo) {
		r.renderJSON({
			ERROR: true
		});
		return;
	}
	try {
		var basket = OrderMgr.getOrder(orderNo.toString());
		uuidLineNumbersMap = new dw.util.SortedMap();
		counter = 0;
		var svcResponse = {};
		var transactionModel = new CreateTransactionModel.CreateTransactionModel();
		var customerTaxId = !empty(customer.profile) ? customer.profile.taxID : null; // Tax ID of the customer
		// Lines array
		var lines = [];
		var defaultProductTaxCode = avataxHelper.prototype.getDefaultProductTaxCode();
		var defaultShippingMethodTaxCode = avataxHelper.prototype.getDefaultShippingMethodTaxCode() ? avataxHelper.prototype.getDefaultShippingMethodTaxCode() : 'FR';
		var taxIncluded = (dworder.TaxMgr.taxationPolicy === dworder.TaxMgr.TAX_POLICY_GROSS);
		// Save transaction preference in custom preferences
		var saveTransactionsToAvatax = avataxHelper.prototype.saveTransactionsToAvatax();
		// Commit transactions preference
		var commitTransactionsToAvatax = avataxHelper.prototype.commitTransactionsToAvatax();
		// Construct a shipFrom addressLocationInfo object from preferences
		var shipFromLocationCode = avataxHelper.prototype.getShipFromLocationCode();
		var shipFromLine1 = avataxHelper.prototype.getShipFromLine1();
		var shipFromLine2 = avataxHelper.prototype.getShipFromLine2();
		var shiFromLine3 = avataxHelper.prototype.getShipFromLine3();
		var shipFromCity = avataxHelper.prototype.getShipFromCity();
		var shipFromStateCode = avataxHelper.prototype.getShipFromStateCode();
		var shipFromZipCode = avataxHelper.prototype.getShipFromZipCode();
		var shipFromCountryCode = avataxHelper.prototype.getShipFromCountryCode();
		var shipFromLatitude = avataxHelper.prototype.getShipFromLatitude();
		var shipFromLongitude = avataxHelper.prototype.getShipFromLongitude();
		var aliShipFrom = new CreateTransactionModel.AddressLocationInfo();
		aliShipFrom.locationCode = !empty(shipFromLocationCode) ? shipFromLocationCode : '';
		aliShipFrom.line1 = !empty(shipFromLine1) ? shipFromLine1 : '';
		aliShipFrom.line2 = !empty(shipFromLine2) ? shipFromLine2 : '';
		aliShipFrom.line3 = !empty(shiFromLine3) ? shiFromLine3 : '';
		aliShipFrom.city = !empty(shipFromCity) ? shipFromCity : '';
		aliShipFrom.region = !empty(shipFromStateCode) ? shipFromStateCode : '';
		aliShipFrom.postalCode = !empty(shipFromZipCode) ? shipFromZipCode : '';
		aliShipFrom.country = !empty(shipFromCountryCode) ? shipFromCountryCode : '';
		aliShipFrom.latitude = !empty(shipFromLatitude) ? shipFromLatitude : '';
		aliShipFrom.longitude = !empty(shipFromLongitude) ? shipFromLongitude : '';
		var productLineItems = basket.productLineItems;
		var pliIterator = productLineItems.iterator();
		while (pliIterator.hasNext()) {
			var li = pliIterator.next();
			if (!empty(li.shipment.shippingAddress)) {
				// create a line item and push it to lines array
				var line = new CreateTransactionModel.LineItemModel();
				var shippingAddress = li.shipment.shippingAddress;
				var shipToAddress;
				var shipFromAddress = aliShipFrom;
				// Construct a shipTo addressLocationInfo object from shippingAddress
				var aliShipTo = new CreateTransactionModel.AddressLocationInfo();
				aliShipTo.locationCode = '';
				aliShipTo.line1 = shippingAddress.address1;
				aliShipTo.line2 = shippingAddress.address2;
				aliShipTo.line3 = '';
				aliShipTo.city = shippingAddress.city;
				aliShipTo.region = shippingAddress.stateCode;
				aliShipTo.country = shippingAddress.countryCode.getDisplayValue().toString();
				aliShipTo.postalCode = shippingAddress.postalCode;
				aliShipTo.latitude = '';
				aliShipTo.longitude = '';
				shipToAddress = aliShipTo;
				// ------------------------ //
				uuidLineNumbersMap.put((++counter).toString(), li.UUID); // assign an integer value
				line.number = counter;
				line.quantity = li.quantityValue;
				line.amount = li.proratedPrice.value;
				// addresses model
				line.addresses = new CreateTransactionModel.AddressesModel();
				line.addresses.shipFrom = shipFromAddress;
				line.addresses.shipTo = shipToAddress;
				line.taxCode = !empty(li.getProduct().taxClassID) ? li.getProduct().taxClassID : defaultProductTaxCode;
				line.customerUsageType = null;
				line.itemCode = (!empty(li.product.UPC) ? ('UPC:' + li.product.UPC) : li.productName.toString()).substring(0, 50);
				line.exemptionCode = null;
				line.discounted = false;
				line.taxIncluded = taxIncluded;
				line.revenueAccount = null;
				line.ref1 = null;
				line.ref2 = null;
				line.description = !empty(li.product.shortDescription) ? (!empty(li.product.shortDescription.source) ? li.product.shortDescription.source.toString().substring(0, 255) : '') : '';
				line.businessIdentificationNo = customerTaxId;
				line.taxOverride = null;
				line.parameters = null;
				lines.push(line);
				var oliIterator = li.optionProductLineItems.iterator();
				while (oliIterator.hasNext()) {
					// create a line item and push it to lines array
					var oli = oliIterator.next();
					line = new CreateTransactionModel.LineItemModel();
					uuidLineNumbersMap.put((++counter).toString(), oli.UUID); // assign an integer value
					line.number = counter;
					line.quantity = oli.quantityValue;
					line.amount = oli.proratedPrice.value;
					// Addresses model
					line.addresses = new CreateTransactionModel.AddressesModel();
					line.addresses.shipFrom = shipFromAddress;
					line.addresses.shipTo = shipToAddress;
					line.taxCode = !empty(oli.taxClassID) ? oli.taxClassID : defaultProductTaxCode;
					line.customerUsageType = null;
					line.itemCode = !empty(oli.productName) ? oli.productName.toString().substring(0, 50) : '';
					line.exemptionCode = null;
					line.discounted = false;
					line.taxIncluded = taxIncluded;
					line.revenueAccount = null;
					line.ref1 = null;
					line.ref2 = null;
					line.description = !empty(oli.productName) ? oli.productName.substring(0, 50) : '';
					line.businessIdentificationNo = customerTaxId;
					line.taxOverride = null;
					line.parameters = null;
					lines.push(line);
				}
				if (!empty(li.shippingLineItem)) {
					// create a line item and push it to lines array
					var sli = li.shippingLineItem;
					line = new CreateTransactionModel.LineItemModel();
					uuidLineNumbersMap.put((++counter).toString(), sli.UUID); // assign an integer value
					line.number = counter;
					line.quantity = 1;
					line.amount = sli.adjustedPrice.value;
					// Addresse model
					line.addresses = new CreateTransactionModel.AddressesModel();
					line.addresses.shipFrom = shipFromAddress;
					line.addresses.shipTo = shipToAddress;
					line.taxCode = !empty(sli.taxClassID) ? sli.taxClassID.toString() : defaultShippingMethodTaxCode;
					line.customerUsageType = null;
					line.itemCode = !empty(sli.lineItemText) ? sli.lineItemText.toString().substring(0, 50) : 'shipping-line-item';
					line.exemptionCode = null;
					line.discounted = false;
					line.taxIncluded = taxIncluded;
					line.revenueAccount = null;
					line.ref1 = null;
					line.ref2 = null;
					line.description = !empty(sli.lineItemText) ? sli.lineItemText.toString().substring(0, 255) : 'shipping-line-item';
					line.businessIdentificationNo = customerTaxId;
					line.taxOverride = null;
					line.parameters = null;
					lines.push(line);
				}
			}
		}
		// Create shipping line items
		var shipmentsIterator = basket.shipments.iterator();
		while (shipmentsIterator.hasNext()) {
			var shipment = shipmentsIterator.next();
			if (!empty(shipment.shippingAddress)) {
				var shippingLineItemsIterator = shipment.shippingLineItems.iterator();
				while (shippingLineItemsIterator.hasNext()) {
					li = shippingLineItemsIterator.next();
					line = new CreateTransactionModel.LineItemModel();
					uuidLineNumbersMap.put((++counter).toString(), li.UUID); // assign an integer value
					line.number = counter;
					line.quantity = 1;
					line.amount = li.adjustedPrice.value;
					// Addresse model
					shippingAddress = shipment.shippingAddress;
					line.addresses = new CreateTransactionModel.AddressesModel();
					line.addresses.shipFrom = aliShipFrom;
					// Construct a shipTo addressLocationInfo object from shippingAddress
					aliShipTo = new CreateTransactionModel.AddressLocationInfo();
					aliShipTo.locationCode = '';
					aliShipTo.line1 = shippingAddress.address1;
					aliShipTo.line2 = shippingAddress.address2;
					aliShipTo.line3 = '';
					aliShipTo.city = shippingAddress.city;
					aliShipTo.region = shippingAddress.stateCode;
					aliShipTo.country = shippingAddress.countryCode.getDisplayValue().toString();
					aliShipTo.postalCode = shippingAddress.postalCode;
					aliShipTo.latitude = '';
					aliShipTo.longitude = '';
					line.addresses.shipTo = aliShipTo;
					line.taxCode = !empty(li.taxClassID) ? li.taxClassID : defaultShippingMethodTaxCode;
					line.customerUsageType = null;
					line.itemCode = !empty(li.ID) ? li.ID.toString().substring(0, 50) : 'shipping-line-item';
					line.exemptionCode = null;
					line.discounted = false;
					line.taxIncluded = taxIncluded;
					line.revenueAccount = null;
					line.ref1 = null;
					line.ref2 = null;
					line.description = !empty(li.lineItemText) ? li.lineItemText.toString().substring(0, 255) : 'shipping-line-item';
					line.businessIdentificationNo = customerTaxId;
					line.taxOverride = null;
					line.parameters = null;
					lines.push(line);
				}
			}
		}
		// gift cert lines
		var giftCertLinesIterator = basket.giftCertificateLineItems.iterator();
		while (giftCertLinesIterator.hasNext()) {
			var giftCert = giftCertLinesIterator.next();
			var gs = giftCert.shipment;
			if (!empty(gs.shippingAddress)) {
				line = new CreateTransactionModel.LineItemModel();
				uuidLineNumbersMap.put((++counter).toString(), giftCert.UUID); // assign an integer value
				line.number = counter;
				line.quantity = 1;
				line.amount = giftCert.getPriceValue();
				// Addresse model
				line.addresses = new CreateTransactionModel.AddressesModel();
				line.addresses.shipFrom = aliShipFrom;
				// Construct a shipTo addressLocationInfo object from shippingAddress
				var gsShipTo = new CreateTransactionModel.AddressLocationInfo();
				gsShipTo.locationCode = '';
				gsShipTo.line1 = gs.shippingAddress.address1;
				gsShipTo.line2 = gs.shippingAddress.address2;
				gsShipTo.line3 = '';
				gsShipTo.city = gs.shippingAddress.city;
				gsShipTo.region = gs.shippingAddress.stateCode;
				gsShipTo.country = gs.shippingAddress.countryCode.getDisplayValue().toString();
				gsShipTo.postalCode = gs.shippingAddress.postalCode;
				gsShipTo.latitude = '';
				gsShipTo.longitude = '';
				line.addresses.shipTo = gsShipTo;
				line.taxCode = !empty(giftCert.taxClassID) ? giftCert.taxClassID : 'PG050000'; // PG050000
				line.customerUsageType = null;
				line.itemCode = !empty(giftCert.getLineItemText()) ? giftCert.getLineItemText().toString().substring(0, 50) : gs.giftCertificateID.toString() || 'gift-certificate';
				line.exemptionCode = null;
				line.discounted = false;
				line.taxIncluded = taxIncluded;
				line.revenueAccount = null;
				line.ref1 = null;
				line.ref2 = null;
				line.description = !empty(giftCert.lineItemText) ? giftCert.lineItemText.toString().substring(0, 255) : 'gift-certificate';
				line.businessIdentificationNo = customerTaxId;
				line.taxOverride = null;
				line.parameters = null;
				lines.push(line);
			} else if (!empty(basket.billingAddress)) {
				line = new CreateTransactionModel.LineItemModel();
				shipToAddress = basket.billingAddress;
				uuidLineNumbersMap.put((++counter).toString(), giftCert.UUID); // assign an integer value
				line.number = counter;
				line.quantity = 1;
				line.amount = giftCert.getPriceValue();
				// Addresse model
				line.addresses = new CreateTransactionModel.AddressesModel();
				line.addresses.shipFrom = aliShipFrom;
				// Construct a shipTo addressLocationInfo object from shippingAddress
				gsShipTo = new CreateTransactionModel.AddressLocationInfo();
				gsShipTo.locationCode = '';
				gsShipTo.line1 = shipToAddress.address1;
				gsShipTo.line2 = shipToAddress.address2;
				gsShipTo.line3 = '';
				gsShipTo.city = shipToAddress.city;
				gsShipTo.region = shipToAddress.stateCode;
				gsShipTo.country = shipToAddress.countryCode.getDisplayValue().toString();
				gsShipTo.postalCode = shipToAddress.postalCode;
				gsShipTo.latitude = '';
				gsShipTo.longitude = '';
				line.addresses.shipTo = gsShipTo;
				line.taxCode = !empty(giftCert.taxClassID) ? giftCert.taxClassID : 'PG050000'; // PG050000
				line.customerUsageType = null;
				line.itemCode = !empty(giftCert.lineItemText) ? giftCert.lineItemText.toString().substring(0, 50) : gs.giftCertificateID.toString() || 'gift-certificate';
				line.exemptionCode = null;
				line.discounted = false;
				line.taxIncluded = taxIncluded;
				line.revenueAccount = null;
				line.ref1 = null;
				line.ref2 = null;
				line.description = !empty(giftCert.lineItemText) ? giftCert.lineItemText.toString().substring(0, 255) : 'gift-certificate';
				line.businessIdentificationNo = customerTaxId;
				line.taxOverride = null;
				line.parameters = null;
				lines.push(line);
			}
		}
		// Lines array - END
		// Construct a transaction object
		if (orderNo) {
			transactionModel.code = orderNo;
			//  If commit document not enabled in site preferences, type is SalesOrder
			if (saveTransactionsToAvatax) {
				transactionModel.type = transactionModel.type.C_SALESINVOICE;
			} else {
				transactionModel.type = transactionModel.type.C_SALESORDER;
			}
		} else {
			r.renderJSON({
				ERROR: true,
				msg: 'Order number empty',
				orderno: orderNo
			});
			return;
		}
		transactionModel.lines = lines;
		transactionModel.commit = !!(commitTransactionsToAvatax && orderNo);
		transactionModel.companyCode = avataxHelper.prototype.getCompanyCode();
		transactionModel.date = basket.creationDate;
		transactionModel.salespersonCode = null;
		transactionModel.customerCode = empty(basket.getCustomerEmail()) ? 'so-cust-code' : basket.getCustomerEmail();
		transactionModel.debugLevel = transactionModel.debugLevel.C_NORMAL;
		transactionModel.serviceMode = transactionModel.serviceMode.C_AUTOMATIC;
		transactionModel.businessIdentificationNo = customerTaxId;
		transactionModel.currencyCode = basket.currencyCode;
		// ********* 	Call the tax adjustment service 	********** //
		svcResponse = avaTaxClient.createOrAdjustTransaction('', {
			createTransactionModel: transactionModel
		});
		// If AvaTax returns error, set taxes to Zero
		if (svcResponse.statusCode === 'ERROR') {
			var errormsg = svcResponse.errorMessage.error.details[0].message + ' Details - ' + svcResponse.errorMessage.error.details[0].description;
			// If error code in response is 'missingline', update logs
			if (svcResponse.errorMessage.error.code) {
				LOGGER.warn("AvaTax | AvaTax couldn't calculate taxes. Empty basket or empty shipping address. Basket details - " + basket);
				errormsg = 'Empty basket or empty shipping address';
			}
			r.renderJSON({
				ERROR: true,
				msg: errormsg,
				orderno: orderNo
			});
			return;
		}
		// If taxes cannot be calculated
		if (svcResponse.errorMessage) {
			errormsg = svcResponse.errorMessage.error.details[0].message + ' Details - ' + svcResponse.errorMessage.error.details[0].description;
			r.renderJSON({
				ERROR: true,
				msg: errormsg,
				orderno: orderNo
			});
			return;
		}
		if (!svcResponse.statusCode) {
			r.renderJSON({
				ERROR: false,
				orderno: orderNo,
				taxAmt: svcResponse.totalTax,
				totalAmt: svcResponse.totalAmount
			});
			return;
		}
		errormsg = svcResponse.errorMessage.error.details[0].message + ' Details - ' + svcResponse.errorMessage.error.details[0].description;
		r.renderJSON({
			ERROR: true,
			msg: errormsg,
			orderno: orderNo
		});
		return;
	} catch (e) {
		LOGGER.warn('[Avatax gettax failed - {0}. File - AvataxBM.js]', e.message);
		r.renderJSON({
			ERROR: true,
			msg: e.message
		});
		return;
	}
}

// modules exports
exports.Start = guard.ensure(['https'], start);
exports.GetOrders = guard.ensure(['https'], getOrders);
exports.Reconcile = guard.ensure(['https', 'post'], reconcile);
exports.GetSiteInfoAJAX = guard.ensure(['https'], getSiteInfoAJAX);