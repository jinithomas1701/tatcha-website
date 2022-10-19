'use strict';

var base = module.superModule;
var AddressModel = require('*/cartridge/models/address');

/**
 * Returns a boolean indicating if the address is empty
 * @param {dw.order.Shipment} shipment - A shipment from the current basket
 * @returns {boolean} a boolean that indicates if the address is empty
 */
function emptyAddress(shipment) {
    if (shipment && shipment.shippingAddress) {
        return ['firstName', 'lastName', 'address1', 'address2', 'phone', 'city', 'postalCode', 'stateCode', 'countryCode'].some(function (key) {
            return shipment.shippingAddress[key];
        });
    }
    return false;
}

/**
 * @constructor
 * @classdesc Model that represents shipping information
 *
 * @param {dw.order.Shipment} shipment - the default shipment of the current basket
 * @param {Object} address - the address to use to filter the shipping method list
 * @param {Object} customer - the current customer model
 * @param {string} containerView - the view of the product line items (order or basket)
 */
function ShippingModel(shipment, address, customer, containerView) {
    base.call(this, shipment, address, customer, containerView);
    if (emptyAddress(shipment)) {
        this.shippingAddress = new AddressModel(shipment.shippingAddress).address;
    } else {
        this.shippingAddress = address;
    }
}

module.exports = ShippingModel;
