'use strict';

var Site = require('dw/system/Site');
var dwsystem = require('dw/system');
var dwStringUtils = require('dw/util').StringUtils;

var siteInfoObj = {};
// AvaTax setting preference
var settingsObject = JSON.parse(dwsystem.Site.getCurrent().getCustomPreferenceValue('ATSettings'));

/**
 * Utility class and methods to retrieve merchant settings related to AvaTax
 */
function avataxHelper() { }

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

exports.avataxHelperExported = avataxHelper;


/**
 * Gets the site information and settings for the current site
 * @returns {Object} site info object
 */
function getSiteInfo() {
	var avataxEnabled = settingsObject.taxCalculation ? 'Enabled' : 'Disabled';
	var saveTransactionsToAvatax = avataxHelper.prototype.saveTransactionsToAvatax() ? 'Yes' : 'No';
	var commitTransactionsToAvatax = avataxHelper.prototype.commitTransactionsToAvatax() ? 'Yes' : 'No';
	var companyCode = avataxHelper.prototype.getCompanyCode();
	var defaultShippingMethodTaxCode = avataxHelper.prototype.getDefaultShippingMethodTaxCode();
	var siteName = Site.current.name;
	var siteId = Site.current.ID;
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
	var aliShipFrom = {};
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
	siteInfoObj = {
		avataxEnabled: avataxEnabled,
		siteName: siteName,
		siteId: siteId,
		shipFromAddress: aliShipFrom,
		saveTransactionsToAvatax: saveTransactionsToAvatax,
		commitTransactionsToAvatax: commitTransactionsToAvatax,
		companyCode: companyCode,
		defaultShippingMethodTaxCode: defaultShippingMethodTaxCode
	};
	return siteInfoObj;
}

exports.getSiteInfo = getSiteInfo;

exports.getSiteInfoAJAX = function getSiteInfoAJAX() {
	var r = require('~/cartridge/scripts/util/Response');
	siteInfo = getSiteInfo();
	r.renderJSON({
		siteInfo: siteInfoObj
	});
	return;
};

