'use strict';

/**
 * Returns Products
 * @param {string} productID productID
 * @param {string} duuid product uuid
 * @returns {Object} Product
 */
function getProducts(productID, duuid) {
    var ProductFactory = require('*/cartridge/scripts/factories/product');
    var product = ProductFactory.get({
        pid: productID,
        pview: 'bonus',
        duuid: duuid
    });

    return product;
}

/**
 * Gets BonusProducts for lineItems
 * @param {Object} bonusDiscountLineItem bonusDiscountLineItem
 * @param {string} duuid product uuid
 * @param {string} pStart page start
 * @returns {Object} an array products
 */
function getBonusProducts(bonusDiscountLineItem, duuid, pStart) {
    var collections = require('*/cartridge/scripts/util/collections');
    var pagingModel;
    var products = [];
    var bonusProductCount = bonusDiscountLineItem.bonusProducts.length;

    if (!bonusProductCount) {
        var PagingModel = require('dw/web/PagingModel');
        var pageStart = parseInt(pStart, 10);

        var ProductSearchModel = require('dw/catalog/ProductSearchModel');
        var apiProductSearch = new ProductSearchModel();
        var productSearchHit;
        apiProductSearch.setPromotionID(bonusDiscountLineItem.promotionID);
        apiProductSearch.setPromotionProductType('bonus');
        apiProductSearch.search();
        pagingModel = new PagingModel(apiProductSearch.getProductSearchHits(), apiProductSearch.count);
        pagingModel.setStart(pageStart);
        pagingModel.setPageSize(pagingModel.count);

        var iter = pagingModel.pageElements;
        while (iter !== null && iter.hasNext()) {
            productSearchHit = iter.next();
            products.push(getProducts(productSearchHit.getProduct().ID, duuid));
        }
    } else {
        collections.forEach(bonusDiscountLineItem.bonusProducts, function (bonusProducts) {
            products.push(getProducts(bonusProducts.ID, duuid));
        });
    }
    return products;
}

module.exports = {
    getBonusProducts: getBonusProducts
};
