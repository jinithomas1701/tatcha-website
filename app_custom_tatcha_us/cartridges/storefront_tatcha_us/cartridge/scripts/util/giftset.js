'use strict';

var Transaction = require('dw/system/Transaction');

function checkGiftBuilderItem(Basket)
{
    var plis = Basket.getProductLineItems();
    var uniqueSets = [];
    for (var i = 0, il = plis.length; i < il; i++) {
        var item = plis[i];
        if (item.custom.giftBuilderSku) {
            var giftBuilderSkus = item.custom.giftBuilderSku.split('|');
            if(giftBuilderSkus.length > item.quantityValue) {
                giftBuilderSkus.splice(item.quantityValue);
                Transaction.wrap(function () {
                    item.custom.giftBuilderSku = giftBuilderSkus.join('|');
                });
            }
            for (var index in giftBuilderSkus) {
                var giftBuilderSku = giftBuilderSkus[index];
                if(uniqueSets[giftBuilderSku]) {
                    uniqueSets[giftBuilderSku] = uniqueSets[giftBuilderSku] + 1;
                } else {
                    uniqueSets[giftBuilderSku] = 1;
                }
            }
        }
    }

    var newQtys = [];
    for (var mainItemId in uniqueSets) {
        var existingCount = uniqueSets[mainItemId];
        var values = mainItemId.split('@');
        var mainItemSku = values[0];
        var eligibilityCount = values[1];
        newQtys[mainItemSku] = Math.floor(existingCount / eligibilityCount);
    }

    for (var i = 0, il = plis.length; i < il; i++) {
        var item = plis[i];
        if (newQtys[item.product.ID] !== undefined) {
            var newQty = newQtys[item.product.ID];
            Transaction.wrap(function () {
                if(newQty > 0) {
                    item.setQuantityValue(newQty);
                } else {
                    Basket.removeProductLineItem(item);
                }
            });
        }
    }
}

function deleteGiftBuilderItemNew(Basket, mainItemId) {
    if(mainItemId) {
        var mainItemSku = mainItemId.split('@');
        mainItemSku = mainItemSku[0];
        var plis = Basket.getProductLineItems();
        for (var i = 0, il = plis.length; i < il; i++) {
            var item = plis[i];
            if (item.product.ID == mainItemSku) {
                Transaction.wrap(function () {
                    var quantity = item.quantityValue;
                    var newQty = quantity - 1;
                    if(newQty > 0) {
                        item.setQuantityValue(newQty);
                    } else {
                        Basket.removeProductLineItem(item);
                    }
                });
            }
            if (item.custom.giftBuilderSku == mainItemId) {
                Transaction.wrap(function () {
                    item.custom.giftBuilderSku = '';
                });
            }
        }
    }
}

module.exports = {
    checkGiftBuilderItem: checkGiftBuilderItem
}
