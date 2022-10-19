/* eslint-disable no-undef */
/**
 * Helps connect SF B2C to AvaTax services
 */

'use strict';

var Status = require('dw/system/Status');
var dworder = require('dw/order');
var dwStringUtils = require('dw/util').StringUtils;
var dwvalue = require('dw/value');
var dwlogger = require('dw/system/Logger');
var dwsite = require('dw/system/Site');
var SortedMap = require('dw/util/SortedMap');
var Decimal = require('dw/util/Decimal');
// script includes
var avaTaxClient = require('*/cartridge/scripts/avaTaxClient');

// Model includes
var AddressValidationInfo = require('*/cartridge/models/addressValidationInfo');
var CreateTransactionModel = require('*/cartridge/models/createTransactionModel');

// utility
var murmurhash = require('./murmurhash');

// Logger includes
var LOGGER = dwlogger.getLogger('Avalara', 'AvaTax');

// var atHelper = null;

// AvaTax setting preference
var settingsObject = JSON.parse(dwsite.getCurrent().getCustomPreferenceValue('ATSettings'));

// Log entries data - to be modified with builds
var authInfo = !empty(avaTaxClient.getAuthInfo()) ? avaTaxClient.getAuthInfo() : {
	url: '',
	user: '',
	le_url: ''
};
var authUser = !empty(authInfo.user) ? authInfo.user.toString() : '';
// eslint-disable-next-line no-nested-ternary
var serviceUrl = !empty(authInfo.url) ? (avaTaxClient.getAuthInfo().url.toString().toLowerCase().indexOf('sandbox') === -1 ? 'Production' : 'Sandbox') : '';
var connectorName = (session.privacy.sitesource && session.privacy.sitesource == 'sgjc') ? 'SF B2C/SGJC' : 'SF B2C/SFRA';
var connectorVersion = '20.1.0';

var uuidLineNumbersMap;
var lineIdShipmentIdMap;
var counter;
var jsonLog;

/**
 * Utility class and methods to retrieve merchant settings related to AvaTax
 */
function avataxHelper() {}

avataxHelper.prototype = {
	// Get the Line item by its UUID
	getLineItemByUUID: function (basket, uuid) {
		var allLineItemsIterator = basket.allLineItems.iterator();
		while (allLineItemsIterator.hasNext()) {
			var li = allLineItemsIterator.next();
			if (li.UUID === uuid) {
				return li;
			} else if ('shippingLineItem' in li && !empty(li.shippingLineItem) && li.shippingLineItem.UUID === uuid) {
				return li.shippingLineItem;
			}
		}
		return null;
	},
	getCustomCustomerAttribute: function () {
		return settingsObject.customCustomerAttribute;
	},
	getCustomerCodePreference: function () {
		return settingsObject.useCustomCustomerCode;
	},
	saveTransactionsToAvatax: function () {
		return settingsObject.saveTransactions;
	},
	commitTransactionsToAvatax: function () {
		return settingsObject.commitTransactions;
	},
	getDefaultShippingMethodTaxCode: function () {
		return settingsObject.defaultShippingMethodTaxCode;
	},
	getDefaultProductTaxCode: function () {
		return 'P0000000';
	},
	getShipFromLocationCode: function () {
		return settingsObject.locationCode;
	},
	getShipFromLine1: function () {
		return settingsObject.line1;
	},
	getShipFromLine2: function () {
		return settingsObject.line2;
	},
	getShipFromLine3: function () {
		return settingsObject.line3;
	},
	getShipFromLatitude: function () {
		return '';
	},
	getShipFromLongitude: function () {
		return '';
	},
	getShipFromCity: function () {
		return settingsObject.city;
	},
	getShipFromStateCode: function () {
		return settingsObject.state;
	},
	getShipFromZipCode: function () {
		return settingsObject.zipCode;
	},
	getShipFromCountryCode: function () {
		return settingsObject.countryCode;
	},
	getCompanyCode: function () {
		return settingsObject.companyCode;
	},
	getFormattedDate: function () {
		var date = new Date();
		return dwStringUtils.format('{0}-{1}-{2}', date.getUTCFullYear().toString(), this.insertLeadingZero(date.getUTCMonth() + 1), this.insertLeadingZero(date.getUTCDate()));
	},
	insertLeadingZero: function (nb) {
		if (nb < 10) {
			return '0' + nb;
		}
		return '' + nb;
	}
};

/**
 * Resolve an address against Avalara's address-validation system
 * @param {string} address dw.order address object
 * @returns {*} A response object that contains information about the validated address
 */
function validateShippingAddress(address) {
	try {
		var svcResponse = null;
		// build an addressvalidationinfo object
		var validateAddress = new AddressValidationInfo();
		validateAddress.textCase = 'Mixed';
		validateAddress.line1 = address.address1 || '';
		validateAddress.line2 = address.address2 || '';
		validateAddress.city = address.city || '';
		validateAddress.region = address.stateCode || '';
		validateAddress.postalCode = address.postalCode || '';
		if (!empty(address.countryCode.value)) {
			validateAddress.country = address.countryCode.value || 'us';
		} else {
			validateAddress.country = address.countryCode || 'us';
		}
		// Make sure an address was provided
		if (empty(validateAddress)) {
			LOGGER.warn('AvaTax | No address provided. File - AvaTax.js');
			// Log to logentries //
			jsonLog = {
				CallerAccuNum: authUser,
				LogType: 'Debug',
				LogLevel: 'Informational',
				ConnectorName: connectorName,
				ConnectorVersion: connectorVersion,
				Operation: 'ResolveAddress',
				ServiceURL: serviceUrl,
				FunctionName: 'avaTax.js-validateShippingAddress',
				EventBlock: '',
				Error: true,
				ErrorType: 'Data',
				LogMessageType: 'ValidateAddress_Error',
				Message: 'Can not validate address since Address object is empty.'
			};
			avaTaxClient.leLog(jsonLog);
			// ------------------------------- //
			return new Status(Status.ERROR);
		}
		var country = !empty(validateAddress.country) ? validateAddress.country : '';
		// countries for address validation - to be changed for Global implementation
		var countries = ['us', 'usa', 'canada'];
		if (countries.indexOf(country.toString().toLowerCase()) === -1) {
			LOGGER.warn('AvaTax | Can not validate address for this country {0}. File - AvaTax.js', country);
			// Log to logentries //
			jsonLog = {
				CallerAccuNum: authUser,
				LogType: 'Debug',
				LogLevel: 'Informational',
				ConnectorName: connectorName,
				ConnectorVersion: connectorVersion,
				Operation: 'ResolveAddress',
				ServiceURL: serviceUrl,
				FunctionName: 'avaTax.js-validateShippingAddress',
				EventBlock: '',
				Error: true,
				ErrorType: 'Configuration',
				LogMessageType: 'ValidateAddress_Error',
				Message: 'Can not validate address since country - \'' + country + '\' not configured in site preferences.'
			};
			avaTaxClient.leLog(jsonLog);
			// ------------------------------- //
			return new Status(Status.ERROR);
		}
		// Service call
		svcResponse = avaTaxClient.resolveAddressPost(validateAddress);
		return svcResponse;
	} catch (e) {
		LOGGER.warn('AvaTax | AvaTax Can not validate address at the moment. AvaTax.js~validateShippingAddress');
		// Log to logentries //
		jsonLog = {
			CallerAccuNum: authUser,
			LogType: 'Debug',
			LogLevel: 'Exception',
			ConnectorName: connectorName,
			ConnectorVersion: connectorVersion,
			Operation: 'ResolveAddress',
			ServiceURL: serviceUrl,
			FunctionName: 'avaTax.js-validateShippingAddress',
			EventBlock: '',
			Error: true,
			ErrorType: 'Exception',
			LogMessageType: 'ValidateAddress_Error',
			Message: 'ValidateAddress failed. ' + e.message
		};
		avaTaxClient.leLog(jsonLog);
		// ------------------------------- //
		return {
			statusCode: 'validateShippingAddressMethodFailed',
			message: e.message,
			error: true
		};
	}
}


/**
 * Updates the taxes at line item level and updates the current basket
 * @param {*} basket basket
 * @param {*} svcResponse svcResponse
 */
function updateTaxes(basket, svcResponse) {
	try {
		var lines = svcResponse.lines;
		var count;
		var len = lines.length;
		for (count = 0; count < len; count++) {
			var resItem = lines[count];
			var lineUUID = uuidLineNumbersMap.get(resItem.lineNumber);
			var lineItem = avataxHelper.prototype.getLineItemByUUID(basket, lineUUID);
			if (lineItem != null) {
				var taxable = new dwvalue.Money(resItem.taxableAmount, basket.currencyCode);
				var tax = new dwvalue.Money(resItem.tax, basket.currencyCode);
				var liTotalTax = new dwvalue.Money(0, basket.currencyCode);
				var taxRate = 0;
				if (resItem.taxableAmount > 0) {
					taxRate = resItem.tax / resItem.taxableAmount;
				}
				if (tax.available && taxable.available && taxable.value > 0) {
					liTotalTax = tax;
				}

				lineItem.setTax(liTotalTax);

				if (lineItem instanceof dw.order.ProductLineItem) {
					if (!lineItem.bonusProductLineItem) {
						if (!empty(lineItem.proratedPrice) && lineItem.proratedPrice.value !== 0) {
							taxRate = liTotalTax / lineItem.proratedPrice.value;
						}
						lineItem.updateTax(taxRate, lineItem.proratedPrice);
					} else {
						// tax is not calculated for bonus product which is updating bonus line item's tax as /NA. it has the direct impact on basket totals.
						// Resolution - update line item tax with 0 which will resolve the tax calculation N/A for bonus line items.
						lineItem.updateTax(0);
					}
				} else if (lineItem instanceof dw.order.ShippingLineItem) {
					if (!empty(lineItem.adjustedNetPrice) && lineItem.adjustedNetPrice.value !== 0) {
						taxRate = liTotalTax / lineItem.adjustedNetPrice.value;
					}
					lineItem.updateTax(taxRate, lineItem.adjustedNetPrice);
				} else {
					if (!empty(lineItem.netPrice) && lineItem.netPrice.value !== 0) {
						taxRate = liTotalTax / lineItem.netPrice.value;
					}
					lineItem.updateTax(taxRate, lineItem.netPrice);
				}

				var pa = null;
				var paIterator = null;
				if (lineItem instanceof dworder.ProductLineItem || lineItem instanceof dworder.ProductShippingLineItem) {
					paIterator = lineItem.priceAdjustments.iterator();
					while (paIterator.hasNext()) {
						pa = paIterator.next();
						pa.updateTax(0);
					}
				} else if (lineItem instanceof dworder.ShippingLineItem) {
					paIterator = lineItem.shippingPriceAdjustments.iterator();
					while (paIterator.hasNext()) {
						pa = paIterator.next();
						pa.updateTax(0);
					}
				}
			}
		}
		var allPriceAdjustments = basket.getPriceAdjustments();
		allPriceAdjustments.addAll(basket.shippingPriceAdjustments);

		for (var i = 0; i < allPriceAdjustments.length; i++) {
			var basketPriceAdjustment = allPriceAdjustments[i];
			basketPriceAdjustment.updateTax(0);
		}

		basket.updateTotals();
	} catch (e) {
		LOGGER.warn('[AvaTax | Tax update failed with error - {0}. File - AvaTax.js~updateTaxes]', e.message);
		// get the hash for exceptionHash
		var exceptionHash = murmurhash.hashBytes(e.message.toString(), e.message.toString().length, 523);
		// If the exceptionHash doesn't change, no service call
		if (session.privacy.exceptionHash && session.privacy.exceptionHash === exceptionHash) {
			return;
		}
		// Log to logentries //
		jsonLog = {
			CallerAccuNum: authUser,
			LogType: 'Debug',
			LogLevel: 'Exception',
			ConnectorName: connectorName,
			ConnectorVersion: connectorVersion,
			DocCode: basket.UUID,
			DocType: 'SalesOrder',
			Operation: 'CreateTransaction',
			ServiceURL: serviceUrl,
			FunctionName: 'avaTax.js-updateTax',
			EventBlock: '',
			Error: true,
			ErrorType: 'Exception',
			LogMessageType: 'UpdateTaxes_Error',
			Message: 'UpdateTax failed. avaTax.js~updateTaxes ' + e.message
		};
		avaTaxClient.leLog(jsonLog);
		// store the hash of exceptionHash in session
		session.privacy.exceptionHash = exceptionHash;
		// ------------------------------- //
		return;
	}
}

/**
 * Updates PriceAdjustments in the Basket
 * for product, shipping and order level promotions
 * @param {*} basket  dw.order.basket
 * @returns {*} OK
 */
function updateAllPriceAdjustments(basket) {
	var lineItem = null;
	var pa = null;
	var paIterator = null;
	var allLineItemsIterator = basket.allLineItems.iterator();
	while (allLineItemsIterator.hasNext()) {
		lineItem = allLineItemsIterator.next();

		if ('shippingLineItem' in lineItem && !empty(lineItem.shippingLineItem)) {
			var shippingLineItem = lineItem.shippingLineItem;

			if (shippingLineItem instanceof dworder.ProductLineItem || shippingLineItem instanceof dworder.ProductShippingLineItem) {
				paIterator = shippingLineItem.priceAdjustments.iterator();
				while (paIterator.hasNext()) {
					pa = paIterator.next();
					pa.updateTax(0);
				}
			} else if (shippingLineItem instanceof dworder.ShippingLineItem) {
				paIterator = shippingLineItem.shippingPriceAdjustments.iterator();
				while (paIterator.hasNext()) {
					pa = paIterator.next();
					pa.updateTax(0);
				}
			}
		}

		if (lineItem instanceof dworder.ProductLineItem || lineItem instanceof dworder.ProductShippingLineItem) {
			paIterator = lineItem.priceAdjustments.iterator();
			while (paIterator.hasNext()) {
				pa = paIterator.next();
				pa.updateTax(0);
			}
		} else if (lineItem instanceof dworder.ShippingLineItem) {
			paIterator = lineItem.shippingPriceAdjustments.iterator();
			while (paIterator.hasNext()) {
				pa = paIterator.next();
				pa.updateTax(0);
			}
		}
	}

	var allPriceAdjustments = basket.getPriceAdjustments();
	allPriceAdjustments.addAll(basket.shippingPriceAdjustments);

	for (var i = 0; i < allPriceAdjustments.length; i++) {
		var basketPriceAdjustment = allPriceAdjustments[i];
		basketPriceAdjustment.updateTax(0);
	}

	return {
		OK: true
	};
}

/**
 * Records and calculates a new transaction in AvaTax and updates the tax details.
 * @param {*} basket DW Basket object
 * @param {string} orderNo DW order number
 * @returns {*} void
 */
function calculateTax(basket, orderNo) {
	if (!settingsObject.taxCalculation) {
		LOGGER.warn('AvaTax | AvaTax not enabled for this site. File - avaTax.js~calculateTax');
		return {
			OK: true
		};
	}
	var enterTime;
	var beforeSvcTime;
	var afterSvcTime;
	var completionTime;
	var connectorTime;
	var latencyTime;
	enterTime = new Date().getTime();
	if (empty(basket)) {
		LOGGER.warn('[AvaTax | Empty basket. File - AvaTax.js~calculateTax]');
		// Log to logentries //
		jsonLog = {
			CallerAccuNum: authUser,
			LogType: 'Debug',
			LogLevel: 'Informational',
			ConnectorName: connectorName,
			ConnectorVersion: connectorVersion,
			DocCode: orderNo || basket.UUID,
			Operation: 'CreateTransaction',
			ServiceURL: serviceUrl,
			DocType: 'SalesOrder',
			LineCount: '', // basket.getAllLineItems().length,
			EventBlock: '',
			FunctionName: 'calculateTax',
			Error: true,
			ErrorType: 'Data',
			LogMessageType: 'CalculateTax_Error',
			Message: 'Unable to proceed with tax calculation as basket is empty.'
		};
		avaTaxClient.leLog(jsonLog);

		return new Status(Status.ERROR);
	}
	try {
		uuidLineNumbersMap = new SortedMap();
		lineIdShipmentIdMap = new SortedMap();
		counter = 0;
		var svcResponse = {};
		var transactionModel = new CreateTransactionModel.CreateTransactionModel();
		var customerTaxId = !empty(customer.profile) ? customer.profile.taxID : null; // Tax ID of the customer
		// Lines array
		var lines = [];
		var taxationpolicy = settingsObject.taxationpolicy.toString();
		var defaultProductTaxCode = avataxHelper.prototype.getDefaultProductTaxCode();
		var defaultShippingMethodTaxCode = avataxHelper.prototype.getDefaultShippingMethodTaxCode() ? avataxHelper.prototype.getDefaultShippingMethodTaxCode() : 'FR';
		var taxIncluded = taxationpolicy === 'net' ? false : true;
		// Save transaction preference in custom preferences
		var saveTransactionsToAvatax = avataxHelper.prototype.saveTransactionsToAvatax();
		// Commit transactions preference
		var commitTransactionsToAvatax = avataxHelper.prototype.commitTransactionsToAvatax();
		var customerCodePref = avataxHelper.prototype.getCustomerCodePreference();
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
				lineIdShipmentIdMap.put(counter.toString(), (li.productID + '|' + li.shipment.ID)); // to store shipment id and tax details
				line.quantity = li.quantityValue || li.quantity;
				line.amount = li.proratedPrice.value;
				// addresses model
				line.addresses = new CreateTransactionModel.AddressesModel();
				line.addresses.shipFrom = shipFromAddress;
				line.addresses.shipTo = shipToAddress;
				line.taxCode = !empty(li.getProduct().taxClassID) ? li.getProduct().taxClassID.toString() : defaultProductTaxCode;
				line.customerUsageType = null;
				line.itemCode = (!empty(li.product.UPC) ? ('UPC:' + li.product.UPC) : li.productName.toString()).substring(0, 50);
				line.exemptionCode = null;
				line.discounted = false;
				line.taxIncluded = taxIncluded;
				line.revenueAccount = null;
				line.ref1 = null;
				line.ref2 = null;
				line.description = !empty(li.product.shortDescription) ? li.product.shortDescription.source.toString().substring(0, 255) : '';
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
					lineIdShipmentIdMap.put(counter.toString(), (oli.optionID + '|' + oli.shipment.ID)); // to store shipment id and tax details
					line.quantity = oli.quantityValue || oli.quantity;
					line.amount = oli.proratedPrice.value;
					// Addresses model
					line.addresses = new CreateTransactionModel.AddressesModel();
					line.addresses.shipFrom = shipFromAddress;
					line.addresses.shipTo = shipToAddress;
					line.taxCode = !empty(oli.taxClassID) ? oli.taxClassID.toString() : defaultProductTaxCode;
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
					lineIdShipmentIdMap.put(counter.toString(), (sli.shipment.ID + '|' + sli.shipment.ID)); // to store shipment id and tax details
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
					lineIdShipmentIdMap.put(counter.toString(), (shipment.ID + '|' + shipment.ID)); // to store shipment id and tax details
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
					line.taxCode = !empty(li.taxClassID) ? li.taxClassID.toString() : defaultShippingMethodTaxCode;
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
		var giftCertLinesIterator = basket.giftCertificateLineItems.iterator();
		while (giftCertLinesIterator.hasNext()) {
			var giftCert = giftCertLinesIterator.next();
			var gs = giftCert.shipment;
			if (!empty(gs.shippingAddress)) {
				line = new CreateTransactionModel.LineItemModel();
				uuidLineNumbersMap.put((++counter).toString(), giftCert.UUID); // assign an integer value
				line.number = counter;
				lineIdShipmentIdMap.put(counter.toString(), (giftCert.giftCertificateID + '|' + giftCert.shipment.ID)); // to store shipment id and tax details
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
				line.taxCode = 'PG050000'; // Default gift card tax code
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
				lineIdShipmentIdMap.put(counter.toString(), (giftCert.giftCertificateID + '|' + giftCert.shipment.ID)); // to store shipment id and tax details
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
				line.taxCode = 'PG050000'; // Default gift card tax code
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
			transactionModel.code = basket.UUID;
			transactionModel.type = transactionModel.type.C_SALESORDER;
		}
		transactionModel.lines = lines;
		transactionModel.commit = !!(orderNo && commitTransactionsToAvatax);
		transactionModel.companyCode = avataxHelper.prototype.getCompanyCode();
		transactionModel.date = avataxHelper.prototype.getFormattedDate();
		transactionModel.salespersonCode = null;
		// customer code
		var customerCode = 'guest-cust-code'; // for salesorder and if no email or other attribute is available
		if (customer.profile && customer && customer.authenticated) {
			// Customer authenticated
			if (customerCodePref === 'customer_number') {
				customerCode = customer.profile.customerNo;
			} else if (customerCodePref === 'customer_email') {
				customerCode = empty(basket.getCustomerEmail()) ? customer.profile.email : basket.getCustomerEmail();
			} else if (customerCodePref === 'custom_attribute') {
				var customAttr = avataxHelper.prototype.getCustomCustomerAttribute();
				if (!empty(customAttr)) {
					try {
						var customValue = customer.profile[customAttr.toString().trim()];
						customerCode = customValue;
					} catch (e) {
						customerCode = customer.profile.customerNo;
						LOGGER.warn('AvaTax - Can\'t find attribute - ' + customAttr + ' - on customer object. Using Customer Number. Error - ' + e.message);
					}
				} else {
					LOGGER.warn('Customer code custom value not provided. Using Customer Number.');
					customerCode = customer.profile.customerNo;
				}
			}
		} else {
			// Customer not authenticated
			customerCode = empty(basket.getCustomerEmail()) ? 'guest-cust-code' : basket.getCustomerEmail();
		}
		transactionModel.customerCode = customerCode;
		transactionModel.debugLevel = transactionModel.debugLevel.C_NORMAL;
		transactionModel.serviceMode = transactionModel.serviceMode.C_AUTOMATIC;
		transactionModel.businessIdentificationNo = customerTaxId;
		transactionModel.currencyCode = basket.currencyCode;

		// get the hash for transactionModel
		var hash = murmurhash.hashBytes(JSON.stringify(transactionModel), JSON.stringify(transactionModel).length, 523);
		// If the transactionModel doesn't change, no service call
		if (session.privacy.avataxtransactionmodel && session.privacy.avataxtransactionmodel === hash) {
			updateAllPriceAdjustments(basket); // update price adjustments
			basket.updateTotals();
			return {
				OK: true
			};
		}
		beforeSvcTime = new Date().getTime();
		// ********* 	Call the tax calculation service 	********** //
		svcResponse = avaTaxClient.createTransaction(transactionModel, '');

		// If AvaTax returns error, set taxes to Zero
		if (svcResponse.statusCode === 'ERROR') {
			var lineItems = basket.getAllLineItems();
			for (var i = 0; i < lineItems.length; i++) {
				var lineItem = lineItems[i];
				lineItem.updateTax(0.00);
			}
			basket.updateTotals();
			// If error code in response is 'missingline', update logs
			if (svcResponse.errorMessage.error.code) {
				LOGGER.warn('AvaTax | AvaTax couldn\'t calculate taxes. Empty basket or empty shippingaddress. Error -  ' + svcResponse.errorMessage.error.message + ' Basket details - ' + basket);
			}
			return {
				OK: true
			};
		}
		afterSvcTime = new Date().getTime();
		// If taxes cannot be calculated
		if (svcResponse.errorMessage) {
			var errorJSON = svcResponse.errorMessage.error.details[0];
			LOGGER.warn('AvaTax | AvaTax couldn\'t calculate taxes for this transaction. Details:' +
				' Error Code: ' + errorJSON.code.toString() + ' Message: ' + errorJSON.message +
				' Description: ' + errorJSON.description +
				' Customer details - ' + (empty(basket.getCustomerEmail()) ? 'Customer not authenticated.' : basket.getCustomerEmail()) +
				' Order details - ' + (empty(orderNo) ? ('Order number is not available. Basket UUID - ' + basket.UUID) : ('Order No. - ' + orderNo))
			);
			jsonLog = {
				CallerAccuNum: authUser,
				LogType: 'Debug',
				LogLevel: 'Error',
				ConnectorName: connectorName,
				ConnectorVersion: connectorVersion,
				DocCode: orderNo || basket.UUID,
				Operation: 'CreateTransaction',
				ServiceURL: serviceUrl,
				DocType: (orderNo && saveTransactionsToAvatax) ? 'SalesInvoice' : 'SalesOrder',
				Source: 'Backend hook - dw.order.calculateTax',
				LineCount: basket.getAllLineItems().length,
				EventBlock: '',
				FunctionName: 'avaTax.js-calculateTax',
				LogMessageType: 'Instrumentation',
				Message: 'CalculateTax failed. Code: ' + errorJSON.code.toString() + ' Message: ' + errorJSON.message +
					' Description: ' + errorJSON.description
			};
			avaTaxClient.leLog(jsonLog);
			return {
				ERROR: true
			};
		}
		// store the hash of transactionModel in session
		session.privacy.avataxtransactionmodel = hash;
		// Update the taxes if the call is successful
		if (!svcResponse.statusCode) {
			if (transactionModel.type !== 'SalesInvoice') {
				updateTaxes(basket, svcResponse);
			}
			// Update tax details in custom atribute - ATTaxDetail
			var taxDetailsJSON = [];
			if (svcResponse.lines) {
				lines = svcResponse.lines;
				var count;
				var len = lines.length;
				for (count = 0; count < len; count++) {
					var resItem = lines[count];
					var jsonObj = {};
					var lineNumber = resItem.lineNumber;
					var itemIdShippingId = lineIdShipmentIdMap.get(lineNumber);
					var itemId = itemIdShippingId.split('|')[0];
					var shipmentId = itemIdShippingId.split('|')[1];
					if (resItem.details) {
						var taxes = [];
						for (i = 0; i < resItem.details.length; i++) {
							var jo = {};
							jo.jurisdictiontype = resItem.details[i].jurisdictionType;
							jo.jurisdiction = resItem.details[i].jurisName;
							jo.exempt = resItem.details[i].exemptAmount;
							jo.nontaxable = resItem.details[i].nonTaxableAmount;
							jo.taxable = resItem.details[i].taxableAmount;
							jo.rate = resItem.details[i].rate;
							jo.tax = resItem.details[i].tax;
							jo.taxName = resItem.details[i].taxName;
							jo.taxSubTypeId = resItem.details[i].taxSubTypeId;
							jo.taxType = resItem.details[i].taxType;
							taxes.push(jo);
						}
						jsonObj.lineitemid = itemId;
						jsonObj.shipmentid = shipmentId;
						jsonObj.taxes = taxes;
					}
					taxDetailsJSON.push(jsonObj);
					// ATTaxDetail
				}
			}

			// VAT Invoice Messages - EU & Cross border
			var invoiceMsgDetails = '';
			var landedCostMessages = '';
			var genericMsgDetails = '';

			if (svcResponse.messages && svcResponse.messages.length) {
				var svcResponseMessages = svcResponse.messages;
				for (i = 0; i < svcResponseMessages.length; i++) {
					var currentMessage = svcResponseMessages[i];
					if (currentMessage.summary.toString().toLowerCase().indexOf('invoice  messages') !== -1) {
						invoiceMsgDetails = currentMessage.details.toString();
						break;
					}
					// landed cost
					if (currentMessage.refersTo.toString().toLowerCase() == 'landedcost' && currentMessage.severity.toString().toLowerCase() == 'success') {
						landedCostMessages += currentMessage.summary.toString() + ' ' + currentMessage.details.toString() + ' ';
					} else {
						genericMsgDetails += currentMessage.details.toString() + ' ';
					}
				}
			}

			var customsDuty = new Decimal();
			var vatgst = new Decimal();
			if (svcResponse.summary && svcResponse.summary.length > 0) {
				for (i = 0; i < svcResponse.summary.length; i++) {
					var curSummaryItem = svcResponse.summary[i];
					if (curSummaryItem.taxType.toString().toLowerCase() === 'landedcost' && curSummaryItem.taxSubType.toString().toLowerCase() === 'importduty') {
						customsDuty = customsDuty.add(curSummaryItem.tax);
					} else {
						vatgst = vatgst.add(curSummaryItem.tax);
					}
				}
			}

			// Persist various values in the objects
			var txn = require('dw/system/Transaction');
			if (orderNo) {
				var orderObj = dw.order.OrderMgr.getOrder(orderNo);
				if (orderObj) {
					txn.wrap(
						function () {
							orderObj.custom.ATInvoiceMessage = invoiceMsgDetails;
							orderObj.custom.ATTaxDetail = JSON.stringify(taxDetailsJSON);
							orderObj.custom.ATLandedCost = landedCostMessages;
							orderObj.custom.ATCustomsDuty = customsDuty.toString();
							orderObj.custom.ATGenericMessage = genericMsgDetails;
							orderObj.custom.ATTax = vatgst.toString();
						}
					);
				}
			} else if (basket) {
				txn.wrap(
					function () {
						basket.custom.ATInvoiceMessage = invoiceMsgDetails;
						basket.custom.ATTaxDetail = JSON.stringify(taxDetailsJSON);
						basket.custom.ATLandedCost = landedCostMessages;
						basket.custom.ATCustomsDuty = customsDuty.toString();
						basket.custom.ATGenericMessage = genericMsgDetails;
						basket.custom.ATTax = vatgst.toString();
					}
				);
			}

			// Connector metrics
			completionTime = new Date().getTime();
			connectorTime = (beforeSvcTime - enterTime) + (completionTime - afterSvcTime);
			latencyTime = afterSvcTime - beforeSvcTime;
			// Log to logentries //
			var message = 'ConnectorMetrics ' +
				'Type - CreateTransaction' +
				' DocCode - ' + (orderNo || basket.UUID) +
				' Line count - ' + (basket.getAllLineItems().length) +
				' Connector time - ' + (connectorTime) +
				' Connector latency - ' + (latencyTime);
			jsonLog = {
				CallerAccuNum: authUser,
				LogType: 'Performance',
				LogLevel: 'Informational',
				ConnectorName: connectorName,
				ConnectorVersion: connectorVersion,
				DocCode: orderNo || basket.UUID,
				Operation: 'CreateTransaction',
				ServiceURL: serviceUrl,
				DocType: (orderNo && saveTransactionsToAvatax) ? 'SalesInvoice' : 'SalesOrder',
				Source: 'Backend hook - dw.order.calculateTax',
				LineCount: basket.getAllLineItems().length,
				EventBlock: 'CreateTransaction',
				FunctionName: 'avaTax.js-calculateTax',
				ConnectorTime: connectorTime,
				ConnectorLatency: latencyTime,
				LogMessageType: 'Instrumentation',
				Message: message
			};
			avaTaxClient.leLog(jsonLog);
			// ------------------------------- //
			return {
				OK: true
			};
		}
		LOGGER.warn('[AvaTax | AvaTax can\'t calculate taxes at the moment | error - {0}. File - AvaTax.js]', svcResponse.errorMessage);
		return {
			ERROR: true
		};
	} catch (e) {
		LOGGER.warn('[AvaTax | Tax calculation failed with error - {0}. File - AvaTax.js~calculateTaxes]', e.message);
		// get the hash for exceptionHash
		var exceptionHash = murmurhash.hashBytes(e.message.toString(), e.message.toString().length, 523);
		// If the exceptionHash doesn't change, no service call
		if (session.privacy.exceptionHash && session.privacy.exceptionHash === exceptionHash) {
			return {
				ERROR: true
			};
		}
		// Log to logentries //
		jsonLog = {
			CallerAccuNum: authUser,
			LogType: 'Debug',
			LogLevel: 'Exception',
			ConnectorName: connectorName,
			ConnectorVersion: connectorVersion,
			DocCode: orderNo || basket.UUID,
			DocType: (orderNo && saveTransactionsToAvatax) ? 'SalesInvoice' : 'SalesOrder',
			Operation: 'CreateTransaction',
			ServiceURL: serviceUrl,
			FunctionName: 'avaTax.js-calculateTax',
			EventBlock: '',
			Error: true,
			ErrorType: 'Exception',
			LogMessageType: 'CalculateTax_Error',
			Message: 'calculateTax failed. ' + e.message
		};
		avaTaxClient.leLog(jsonLog);
		// store the hash of exceptionHash in session
		session.privacy.exceptionHash = exceptionHash;
		// ------------------------------- //
		return {
			ERROR: true
		};
	}
}

// module exports
module.exports = {
	validateShippingAddress: validateShippingAddress,
	calculateTax: calculateTax
};