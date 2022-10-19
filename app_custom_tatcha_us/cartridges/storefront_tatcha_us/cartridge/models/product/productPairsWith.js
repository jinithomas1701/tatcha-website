'use strict';

var decorators = require('*/cartridge/models/product/decorators/index');
var promotionCache = require('*/cartridge/scripts/util/promotionCache');


/**
 * Decorate product with product tile information
 * @param {Object} product - Product Model to be decorated
 * @param {dw.catalog.Product} apiProduct - Product information returned by the script API
 * @param {string} productType - Product type information
 *
 * @returns {Object} - Decorated product model
 */
module.exports = function productPairsWith(product, apiProduct, productType) {
    var productHelper = require('*/cartridge/scripts/helpers/productHelpers');
    var productSearchHit = productHelper.getProductSearchHit(apiProduct);

    if (productSearchHit) {
        decorators.searchPrice(product, productSearchHit, promotionCache.promotions, productHelper.getProductSearchHit);
        decorators.variationAttributes(product, productSearchHit.product.variationModel, {
            attributes: '*',
            endPoint: 'Variation'
        });
    }
    decorators.base(product, apiProduct, productType);
    decorators.images(product, apiProduct, { types: ['large'], quantity: 'single' });
    decorators.availability(product, 1, apiProduct.minOrderQuantity.value, apiProduct.availabilityModel);
    decorators.online(product, apiProduct);
    decorators.travelProductVariant(product, apiProduct);
    decorators.analyticFields(product, apiProduct);

    return product;
};
