'use strict';

var Resource = require('dw/web/Resource');

module.exports = function (object, product) {
    Object.defineProperty(object, 'travelProductVariant', {
        enumerable: true,
        value: (function () {
            var variants = product.getVariationModel().getVariants();
            var variantProduct = {};

            if (!empty(variants) && !product.custom.isTravelSize) {
                for (var i = 0, len = variants.length; i < len; i++) {
                    var variant = variants[i];

                    if (!empty(variant) && !empty(variant.custom.isTravelSize) && variant.custom.isTravelSize) {
                        var travelAvailability = variant.getAvailabilityModel().isInStock();
                        if (!empty(travelAvailability) && travelAvailability) {
                            variantProduct.id = variant.ID;
                            variantProduct.available = travelAvailability;
                            variantProduct.price = variant.getPriceModel().getPrice();
                        } else {
                            variantProduct = [];
                        }
                    }
                }
            }
            return variantProduct;
        }())
    });
};
