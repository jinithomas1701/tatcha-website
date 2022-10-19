"use strict";
/**
 *  Property of OSF Global Services, Inc., (with its brand OSF Commerce). OSF remains the sole owner of all right, title and interest in the software.
 *  Do not copy, sell, reverse engineer or otherwise attempt to derive or obtain information about the functioning, manufacture or operation therein.
 */
/**
 * @module RefillAddress
 */
/**
 * Model for Smart Order Refill Address for RefillOrder and RefillSubscription
 * @typedef {RefillAddress} RefillAddress
 * @property {String} address1
 * @property {String|null} address2
 * @property {String} city
 * @property {String} firstName
 * @property {String} lastName
 * @property {String} fullName
 * @property {String} phone
 * @property {String} postalCode
 * @property {String} stateCode
 * @property {Object} countryCode
 * @property {String} countryCode.value
 * @property {String} type
 */

/**
 * @description constructor for RefillAddress
 * @constructor RefillAddress
 * @param {Object} addressObject - Plain object that matches the model properties
 */
function RefillAddress(addressObject) {
    this.address1 = addressObject.address1;
    this.address2 = addressObject.address2;
    this.city = addressObject.city;
    this.firstName = addressObject.firstName;
    this.lastName = addressObject.lastName;
    this.fullName = addressObject.fullName;
    this.phone = addressObject.phone;
    this.postalCode = addressObject.postalCode;
    this.stateCode = addressObject.stateCode;
    this.countryCode = {
        value: addressObject.countryCode.value
    };
    Object.defineProperty(this, "type", {
        enumerable: false,
        writable: true,
        value: null
    });
}

Object.defineProperties(RefillAddress, {
    /**
     * @property {String} TYPE_SHIPPING
     * @memberof RefillAddress
     * @static
     * @readonly
     */
    TYPE_SHIPPING: {
        value: "shipping",
        writable: false
    },
    /**
     * @property {String} TYPE_BILLING
     * @memberof RefillAddress
     * @static
     * @readonly
     */
    TYPE_BILLING: {
        value: "billing",
        writable: false
    }
});

/**
 * @description Methode parses the change address form and generates a RefillAddress object
 * @function getAddressFromForm
 * @memberof RefillAddress
 * @static
 * @param {dw.web.FormElement} addressForm SFCC form object
 * @returns {RefilAddress} RefilAddress object generated from form
 */
RefillAddress.getAddressFromForm = function (addressForm) {
    var addressObj = {
        address1: addressForm.address1.htmlValue,
        address2: addressForm.address2.htmlValue,
        city: addressForm.city.htmlValue,
        countryCode: { value: addressForm.country.htmlValue },
        firstName: addressForm.firstName.htmlValue,
        fullName: addressForm.firstName.htmlValue + " " + addressForm.lastName.htmlValue,
        lastName: addressForm.lastName.htmlValue,
        phone: addressForm.phone.htmlValue,
        postalCode: addressForm.postal.htmlValue,
        stateCode: addressForm.states.state.htmlValue
    };
    return new RefillAddress(addressObj);
};

RefillAddress.getSelectedAddress = function(address) {
	var addressObj = {
        address1: address.address1,
        address2: address.address2,
        city: address.city,
        countryCode: {value: address.countryCode.value},
        firstName: address.firstName,
        fullName: address.firstName + " " + address.lastName,
        lastName: address.lastName,
        phone: address.phone,
        postalCode: address.postalCode,
        stateCode: address.stateCode
    };
    return new RefillAddress(addressObj);
}

/**
 * @description Methode parses OrderAddress object and generates a RefillAddress object
 * @function getAddressFromLineItem
 * @memberof RefillAddress
 * @static
 * @param {dw.order.OrderAddress} orderAddress SFCC order address object
 * @returns {RefillAddress} RefilAddress object generated from order address
 */
RefillAddress.getAddressFromLineItem = function (orderAddress) {
    var addressObj = {
        address1: orderAddress.address1,
        address2: orderAddress.address2,
        city: orderAddress.city,
        countryCode: { value: orderAddress.countryCode.value },
        firstName: orderAddress.firstName,
        fullName: orderAddress.fullName,
        lastName: orderAddress.lastName,
        phone: orderAddress.phone,
        postalCode: orderAddress.postalCode,
        stateCode: orderAddress.stateCode
    };
    return new RefillAddress(addressObj);
};

/**
 * @description Methode populates OrderAddress object with RefillAddress values
 * @function setOrderAddressValues
 * @memberof RefillAddress
 * @static
 * @param {dw.order.OrderAddress} orderAddress SFCC order address object to be set
 * @param {RefillAddress} refillAddress RefillAddress object
 */
RefillAddress.setOrderAddressValues = function (orderAddress, refillAddress) {
    orderAddress.setFirstName(refillAddress.firstName);
    orderAddress.setLastName(refillAddress.lastName);
    orderAddress.setPhone(refillAddress.phone);
    orderAddress.setAddress1(refillAddress.address1);
    orderAddress.setAddress2(refillAddress.address2);
    orderAddress.setCity(refillAddress.city);
    orderAddress.setStateCode(refillAddress.stateCode);
    orderAddress.setPostalCode(refillAddress.postalCode);
    orderAddress.setCountryCode(refillAddress.countryCode.value ? refillAddress.countryCode.value : 'US');
};

/**
 * @description methode initializes the change address form with infomation from a RefillAddress object
 * @function initChangeAddressForm
 * @memberof RefillAddress
 * @static
 * @param {dw.web.FormElement} addressForm SFCC forn to initialize
 * @param {RefilAddress} refillAddressArg RefillAddress object
 */
RefillAddress.initChangeAddressForm = function (addressForm, refillAddressArg) {
    var refillAddress = refillAddressArg;
    refillAddress.countryCode.value = refillAddress.countryCode.value.toLowerCase();
    addressForm.clearFormElement();
    addressForm.copyFrom(refillAddress);
    addressForm.states.copyFrom(refillAddress);
};

module.exports = RefillAddress;
