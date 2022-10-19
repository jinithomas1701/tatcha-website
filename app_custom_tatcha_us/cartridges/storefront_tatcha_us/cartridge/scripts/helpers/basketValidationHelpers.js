'use strict';

var base = module.superModule || {};

var collections = require('*/cartridge/scripts/util/collections');
var ProductInventoryMgr = require('dw/catalog/ProductInventoryMgr');
var StoreMgr = require('dw/catalog/StoreMgr');

base.validateProducts = function (basket){
    var result = {
        error: false,
        hasInventory: true
    };

    // Redirect to BAG page if empty cart
    if(!basket){
        result.error = true;
        return result;
    }

    // Redirect to BAG page if empty cart
    var basketSize = getCartQty(basket);
    if(basketSize == 0 || (basket.getDefaultShipment().getShippingMethod() == null)){
        result.error = true;
        return result;
    }

    var productLineItems = basket.productLineItems;

    collections.forEach(productLineItems, function (item) {
        if (item.product === null || !item.product.online) {
            result.error = true;
            return;
        }

        if (Object.hasOwnProperty.call(item.custom, 'fromStoreId')
            && item.custom.fromStoreId) {
            var store = StoreMgr.getStore(item.custom.fromStoreId);
            var storeInventory = ProductInventoryMgr.getInventoryList(store.custom.inventoryListId);

            result.hasInventory = result.hasInventory
                && (storeInventory.getRecord(item.productID)
                    && storeInventory.getRecord(item.productID).ATS.value >= item.quantityValue);
        } else {
            var availabilityLevels = item.product.availabilityModel
                .getAvailabilityLevels(item.quantityValue);
            result.hasInventory = result.hasInventory
                && (availabilityLevels.notAvailable.value === 0);
        }
    });

    return result;
}

/*
 * To get the cart count
 */
function getCartQty(basket) {

    var cartQty : Number = 0;
    var pliIt : dw.util.Iterator = basket.getProductLineItems().iterator();
    while (pliIt.hasNext()) {
        var pli : dw.order.ProductLineItem = pliIt.next();
        cartQty += pli.quantity;
    }
    cartQty += basket.getGiftCertificateLineItems().size();
    return cartQty;
}

module.exports = base;
