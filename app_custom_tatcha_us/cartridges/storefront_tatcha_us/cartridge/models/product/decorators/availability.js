'use strict';

var Resource = require('dw/web/Resource');

module.exports = function (object, quantity, minOrderQuantity, availabilityModel) {
    Object.defineProperty(object, 'availability', {
        enumerable: true,
        value: (function () {
            var availability = {};
            availability.messages = [];
            availability.stockValue = null;
            availability.inStock = null;

            var productQuantity = quantity ? parseInt(quantity, 10) : minOrderQuantity;
            var availabilityModelLevels = availabilityModel.getAvailabilityLevels(productQuantity);
            var inventoryRecord = availabilityModel.inventoryRecord;

            if (inventoryRecord && inventoryRecord.inStockDate) {
                availability.inStockDate = inventoryRecord.inStockDate.toDateString();
            } else {
                availability.inStockDate = null;
            }

            if (availabilityModelLevels.inStock.value > 0) {
                if (availabilityModelLevels.inStock.value === productQuantity) {
                    availability.messages.push(Resource.msg('label.instock', 'common', null));
                    availability.inStock = 'In-Stock';
                } else {
                    availability.messages.push(
                        Resource.msgf(
                            'label.quantity.in.stock',
                            'common',
                            null,
                            availabilityModelLevels.inStock.value
                        )
                    );
                    availability.inStock = 'Partially-In-Stock';
                }
                availability.stockValue = availabilityModelLevels.inStock.value;
            }

            if (availabilityModelLevels.preorder.value > 0) {
                availability.inStock = 'OOS';
                if (availabilityModelLevels.preorder.value === productQuantity) {
                    availability.messages.push(Resource.msg('label.preorder', 'common', null));
                } else {
                    availability.messages.push(
                        Resource.msgf(
                            'label.preorder.items',
                            'common',
                            null,
                            availabilityModelLevels.preorder.value
                        )
                    );
                }
            }

            if (availabilityModelLevels.backorder.value > 0) {
                availability.inStock = 'OOS';
                if (availabilityModelLevels.backorder.value === productQuantity) {
                    availability.messages.push(Resource.msg('label.back.order', 'common', null));
                } else {
                    availability.messages.push(
                        Resource.msgf(
                            'label.back.order.items',
                            'common',
                            null,
                            availabilityModelLevels.backorder.value
                        )
                    );
                }
            }

            if (availabilityModelLevels.notAvailable.value > 0) {
                availability.inStock = 'OOS';
                if (availabilityModelLevels.notAvailable.value === productQuantity) {
                    availability.messages.push(Resource.msg('label.not.available', 'common', null));
                } else {
                    availability.messages.push(Resource.msg('label.not.available.items', 'common', null));
                }
            }

            return availability;
        }())
    });
    Object.defineProperty(object, 'available', {
        enumerable: true,
        value: availabilityModel.isOrderable(parseFloat(quantity) || minOrderQuantity)
    });
};
