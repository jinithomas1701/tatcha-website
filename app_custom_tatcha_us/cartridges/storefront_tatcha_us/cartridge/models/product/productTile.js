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
module.exports = function productTile(product, apiProduct, productType) {
    var productHelper = require('*/cartridge/scripts/helpers/productHelpers');
    var productSearchHit = productHelper.getProductSearchHit(apiProduct);

    if (productSearchHit) {
		product.selectedQuantity = 1;
        decorators.searchPrice(product, productSearchHit, promotionCache.promotions, productHelper.getProductSearchHit);
        decorators.variationAttributes(product, productSearchHit.product.variationModel, {
            attributes: '*',
            endPoint: 'Show',
            selectedOptionsQueryParams: 'updateTile=true&format=ajax'
        });
    }
    decorators.base(product, apiProduct, productType);
    decorators.images(product, apiProduct, { types: ['large'], quantity: 'single' });
   // decorators.ratings(product);
    if (productType === 'set') {
        decorators.setProductsCollection(product, apiProduct);
    }
    decorators.quantity(product, apiProduct, 1);

    decorators.availability(product, 1, apiProduct.minOrderQuantity.value, apiProduct.availabilityModel);
    decorators.online(product, apiProduct);
    decorators.customFields(product, apiProduct, 'tile');
    decorators.marketingFlag(product, apiProduct);
    decorators.wishlist(product, apiProduct.ID);
    
    return product;
};
