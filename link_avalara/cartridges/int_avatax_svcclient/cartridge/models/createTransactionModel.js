'use strict';
/* eslint-disable require-jsdoc */
function lineItemModel() {
	this.number = null;
	this.quantity = null;
	this.amount = null;
	this.addresses = null;
	this.taxCode = null;
	this.customerUsageType = null;
	this.itemCode = null;
	this.exemptionCode = null;
	this.discounted = null;
	this.taxIncluded = null;
	this.revenueAccount = null;
	this.ref1 = null;
	this.ref2 = null;
	this.description = null;
	this.businessIdentificationNo = null;
	this.taxOverride = null;
	this.parameters = [];

	return this;
}

function addressLocationInfo() {
	this.locationCode = '';
	this.line1 = '';
	this.line2 = '';
	this.line3 = '';
	this.city = '';
	this.region = '';
	this.country = '';
	this.postalCode = '';
	this.latitude = '';
	this.longitude = '';

	return this;
}

function addressesModel() {
	this.singleLocation = null;
	this.shipFrom = null;
	this.shipTo = null;
	this.pointOfOrderOrigin = null;
	this.pointOfOrderAcceptance = null;

	return this;
}

function taxOverrideModel() {
	this.type = Object.freeze({
		C_NONE: 'None',
		C_TAXAMOUNT: 'TaxAmount',
		C_EXEMPTION: 'Exemption',
		C_TAXDATE: 'TaxDate',
		C_ACCRUEDTAXAMOUNT: 'AccruedTaxAmount',
		C_DERIVETAXABLE: 'DeriveTaxable'
	});
	this.taxAmount = null;
	this.taxDate = null;
	this.reason = '';

	return this;
}

function createTransactionModel() {
	this.code = '';
	this.lines = [];
	this.type = Object.freeze({
		C_SALESORDER: 'SalesOrder',
		C_SALESINVOICE: 'SalesInvoice',
		C_PURCHASEORDER: 'PurchaseOrder',
		C_PURCHASEINVOICE: 'PurchaseInvoice',
		C_RETURNORDER: 'ReturnOrder',
		C_RETURNINVOICE: 'ReturnInvoice',
		C_INVENTORYTRANSFERORDER: 'InventoryTransferOrder',
		C_INVENTORYTRANSFERINVOICE: 'InventoryTransferInvoice',
		C_REVERSECHARGEORDER: 'ReverseChargeOrder',
		C_REVERSECHARGEINVOICE: 'ReverseChargeInvoice',
		C_ANY: 'Any'
	});
	this.companyCode = '';
	this.date = '';
	this.salespersonCode = '';
	this.customerCode = '';
	this.customerUsageType = '';
	this.discount = '';
	this.purchaseOrderNo = '';
	this.exemptionNo = '';
	this.addresses = null;
	this.parameters = null;
	this.referenceCode = '';
	this.reportingLocationCode = '';
	this.commit = false;
	this.batchCode = '';
	this.taxOverride = null;
	this.currencyCode = null;
	this.serviceMode = Object.freeze({
		C_AUTOMATIC: 'Automatic',
		C_LOCAL: 'Local',
		C_REMOTE: 'Remote'
	});
	this.exchangeRate = null;
	this.exchangeRateEffectiveDate = null;
	this.posLaneCode = null;
	this.businessIdentificationNo = null;
	this.isSellerImporterOfRecord = null;
	this.description = '';
	this.email = '';
	this.debugLevel = Object.freeze({
		C_NORMAL: 'Normal',
		C_DIAGNOSTIC: 'Diagnostic'
	});

	return this;
}


module.exports = {
	LineItemModel: lineItemModel,
	AddressLocationInfo: addressLocationInfo,
	AddressesModel: addressesModel,
	TaxOverrideModel: taxOverrideModel,
	CreateTransactionModel: createTransactionModel
};