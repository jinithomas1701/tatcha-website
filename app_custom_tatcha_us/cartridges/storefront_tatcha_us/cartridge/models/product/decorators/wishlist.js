'use strict';

var ProductListMgr = require('dw/customer/ProductListMgr');
var Transaction = require('dw/system/Transaction');
var collections = require('*/cartridge/scripts/util/collections');


function isWishlistItem(pId) {
    var available = false;
    var obj = ProductListMgr.getProductLists(customer, dw.customer.ProductList.TYPE_WISH_LIST);
    if (obj.empty) {
        Transaction.wrap(function () {
            obj = ProductListMgr.createProductList(customer, dw.customer.ProductList.TYPE_WISH_LIST);
        });
    } else {
        obj = obj[0];
    }

    collections.forEach(obj.productItems, function (item) {
        if (pId === item.productID) {
            available = true;
        }
    });
    return available;
}

module.exports = function (object, id) {
    Object.defineProperty(object, 'isWishlistItem', {
        enumerable: true,
        value: isWishlistItem(id)
    });
};
