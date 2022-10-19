'use strict';

/**
 * @constructor
 * @classdesc Returns analystical data
 * @param {dw.catalog.Product} productAPI - product to return images for
 */
function productCartTaggingDetails(productAPI) {
    var productCartTaggingDetailsData = {};
    var priceModalOfProduct = productAPI.getPriceModel();
    var variationModalOfProduct = productAPI.getVariationModel();
    var category = productAPI.getPrimaryCategory();
    // eslint-disable-next-line no-undef
    if (!empty(productAPI)) {
        productCartTaggingDetailsData.sku = productAPI.ID;
        productCartTaggingDetailsData.productname = productAPI.name;
        if (productAPI.isVariant()) {
            productCartTaggingDetailsData.masterSku = productAPI.masterProduct.ID;
        }
        if (priceModalOfProduct && priceModalOfProduct.getPrice().decimalValue) {
            productCartTaggingDetailsData.price = priceModalOfProduct.getPrice().decimalValue.toString();
        }
        if (category) {
            productCartTaggingDetailsData.category = category.ID;
        }

        if (variationModalOfProduct && variationModalOfProduct.productVariationAttributes.length > 0) {
            var selectedValue = variationModalOfProduct.getSelectedValue(variationModalOfProduct.productVariationAttributes[0]);
            if (selectedValue) {
                productCartTaggingDetailsData.variant = selectedValue.displayValue;
            }
        }
        productCartTaggingDetailsData.dataProductInfo = JSON.stringify(productCartTaggingDetailsData);
    }
    return productCartTaggingDetailsData;
}
module.exports = productCartTaggingDetails;
