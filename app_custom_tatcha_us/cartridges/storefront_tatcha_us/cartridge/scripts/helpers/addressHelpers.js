'use strict';

var base = module.superModule || {};

/**
 * Gather all addresses from shipments and return as an array
 * @param {dw.order.Basket} order - current order
 * @returns {Array} - Array of shipping addresses
 */
function gatherShippingAddresses(order) {
    var collections = require('*/cartridge/scripts/util/collections');
    var allAddresses = [];

    if (order.shipments) {
        collections.forEach(order.shipments, function (shipment) {
            if (shipment.shippingAddress && !empty(shipment.shippingAddress.address1)) {
                allAddresses.push(base.copyShippingAddress(shipment.shippingAddress));
            }
        });
    } else {
		if (order.defaultShipment.shippingAddress && !empty(order.defaultShipment.shippingAddress.address1)) {
			allAddresses.push(order.defaultShipment.shippingAddress);
		}
    }
    return allAddresses;
}

base.gatherShippingAddresses = gatherShippingAddresses;

module.exports = base
