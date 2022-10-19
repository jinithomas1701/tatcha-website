'use strict';

var BasketMgr = require('dw/order/BasketMgr');
var collections = require('*/cartridge/scripts/util/collections');

/**
 * returns the price of the bonus product line item
 * @param {dw.order.ProductLineItem} lineItem - API ProductLineItem instance of the embedded bonus product line item
 * @param {dw.catalog.Product} product - qualifying product.
 * @returns {string} result the price of the bonus product
 */
function getBonusUnitPrice(lineItem, product) {
    var currentBasket = BasketMgr.getCurrentBasket();
    if (!currentBasket) {
        return '';
    }
    var bonusDisconutLineItem;

    for (var i = 0; i < currentBasket.getBonusDiscountLineItems().length; i++) {
        var bonusLineitem = currentBasket.getBonusDiscountLineItems()[i];
        var bonusLineItemProducts = bonusLineitem.getBonusProducts();
        for (var j = 0; j < bonusLineItemProducts.length; j++) {
            if (bonusLineItemProducts[j].ID === product.ID) {
                bonusDisconutLineItem = bonusLineitem;
                break;
            }
        }
    }
    if (!product || !bonusDisconutLineItem) {
        return '';
    }
    return bonusDisconutLineItem.getBonusProductPrice(product).toFormattedString();
}

module.exports = function (object, lineItem, product) {
    Object.defineProperty(object, 'bonusUnitPrice', {
        enumerable: true,
        value: getBonusUnitPrice(lineItem, product)
    });
};
