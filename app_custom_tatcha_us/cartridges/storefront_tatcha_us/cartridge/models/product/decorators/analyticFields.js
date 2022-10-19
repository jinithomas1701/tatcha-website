/* eslint-disable no-undef */
'use strict';

var productCartTaggingDetails = require('*/cartridge/models/product/productCartTaggingDetails');

module.exports = function (object, product) {
    Object.defineProperty(object, 'cartButtonTaggingData', {
        enumerable: true,
        value: productCartTaggingDetails(product)
    });
};

// product.ID product:name decimalPrice
// {"sku":product.ID,"productname":product:name,"price":105,"masterSku":"MASTER-ESSENCE-NEW-2021","variant":"Full Size","category":"Face Mists + Essence"}
