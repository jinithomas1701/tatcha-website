'use strict';
/* eslint-disable require-jsdoc */
function addressValidationInfo() {
	this.textCase = Object.freeze({
		C_Upper: 'Upper',
		C_Mixed: 'Mixed'
	});
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


addressValidationInfo.prototype.createAddressValidatioObject = function (addressObject) {
	this.textCase = 'Mixed';
	this.line1 = !empty(addressObject.address1) ? addressObject.address1 : '';
	this.line2 = !empty(addressObject.address2) ? addressObject.address2 : '';
	this.line3 = !empty(addressObject.address3) ? addressObject.address3 : '';
	this.city = !empty(addressObject.city) ? addressObject.city : '';
	this.region = !empty(addressObject.stateCode) ? addressObject.stateCode : '';
	this.country = !empty(addressObject.countryCode) ? addressObject.countryCode : (!empty(addressObject.country) ? addressObject.country : '');
	this.postalCode = !empty(addressObject.postalCode) ? addressObject.postalCode : '';
	this.latitude = !empty(addressObject.latitude) ? addressObject.latitude : '';
	this.longitude = !empty(addressObject.longitude) ? addressObject.longitude : '';

	return this;
};

module.exports = addressValidationInfo;