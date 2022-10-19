'use strict';

var base = module.superModule;

// prepare viewed product event's data for klaviyo

base.prepareViewedProductObject = function prepareViewedProductObject(klData) {
    var viewedProductObj = {};
    viewedProductObj['Product Name'] = klData.viewedProductName;
    viewedProductObj['Product Image URL'] = (klData.viewedProductImage != null) ? klData.viewedProductImage.toString() : '';
    viewedProductObj['Product ID'] = klData.viewedProductID.toString();
    viewedProductObj['Product Alternate Image URL'] = !empty(klData.viewedProductAlternateImage) ? klData.viewedProductAlternateImage.toString() : '';
    viewedProductObj['Product Description'] = klData.viewedProductDesc;
    viewedProductObj['Price'] = klData.viewedProductPrice.toString();
    viewedProductObj['Product Page URL'] = klData.viewedProductPageURL;
    viewedProductObj['Product UPC'] = klData.viewedProductUPC;
    viewedProductObj["Product Availability Model"] = klData.viewedProductAvailability;
    viewedProductObj["Categories"] = klData.viewedProductCategories;
    viewedProductObj['Primary Category'] = klData.viewedProductPrimaryCategory;
    return viewedProductObj;
};

module.exports = base;
