'use strict';

var StringUtils = dw.util.StringUtils;
var CatalogMgr = require('dw/catalog/CatalogMgr');
var Resource = require('dw/web/Resource');
var ProductAvailabilityModel = require('dw/catalog/ProductAvailabilityModel');

/**
 * Gets query string
 *
 * @param {dw.web.HttpParameterMap} map
 * @param {Array} fields
 * @returns {String}
 */
function getQueryString(map, fields) {
    var parms = [];
    for (var i = 0, il = fields.length; i < il; i++) {
        var key = fields[i];
        if (!key || !map.isParameterSubmitted(key)) { continue; }

        var parm = map.get(key);
        if (!parm || parm.stringValue.length === 0) { continue; }

        // only get here if we have a match
        parms.push(sanitize(key) + '=' + sanitize(parm.stringValue));
    }
    return parms.length ? parms.join('&') : '';
}
/**
 * Gets Benefits Content for product detail page
 *
 * @param {dw.catalog.Product} item
 * @returns {Object}
 */
 function getBenefits(product,ignoreVariantCheck) {

	var benefits = {};
	var skinTypeIcons = [];
	var skinConcernsIcons = [];
	var totalIcons = [];
	var benefitsSection2 = '';
	var benefitsSection2Image = '';
	var benefitsSection2Heading = '';
	var benefitsSection3 = '';
	if(!ignoreVariantCheck) ignoreVariantCheck = false;

	if (!empty(product)) {

		if((product.master || product.isVariant()) && !ignoreVariantCheck){

			var prd = getDefaultContentVariant(product);
			if(!empty(prd)){
				benefitsSection2 = prd.custom.benefitsSection2;
				benefitsSection2Image = prd.custom.benefitsSection2Image;
				benefitsSection2Heading = prd.custom.benefitsSection2Heading;
				benefitsSection3 = prd.custom.benefitsSection3;

				for(var i=0;i < prd.custom.skinTypeIcons.length;i++){
					skinTypeIcons.push(prd.custom.skinTypeIcons[i]);
				}
				for(var i=0;i < prd.custom.skinConcernsIcons.length;i++){
					skinConcernsIcons.push(prd.custom.skinConcernsIcons[i]);
				}
			}

		} else {
			    benefitsSection2Heading = product.custom.benefitsSection2Heading;
				benefitsSection2 = product.custom.benefitsSection2;
				benefitsSection2Image = product.custom.benefitsSection2Image;
				benefitsSection3 = product.custom.benefitsSection3;
				for(var i=0;i < product.custom.skinTypeIcons.length;i++){
					skinTypeIcons.push(product.custom.skinTypeIcons[i]);
				}
				for(var i=0;i < product.custom.skinConcernsIcons.length;i++){
					skinConcernsIcons.push(product.custom.skinConcernsIcons[i]);
				}
		}

		if(skinTypeIcons.length > 0) {
			totalIcons = skinTypeIcons.concat(skinConcernsIcons);
		} else {
			totalIcons = totalIcons.concat(skinConcernsIcons);
		}

	}

	benefits = {
			totalIcons: totalIcons,
			skinTypeIconslength: skinTypeIcons.length,
			benefitsSection2Heading: benefitsSection2Heading,
			benefitsSection2: benefitsSection2,
			benefitsSection2Image: benefitsSection2Image,
			benefitsSection3: benefitsSection3
        };

	return benefits;

}
function getDefaultContentVariant(product) {
	var defaultVarient = {};

	if (!empty(product)) {

		if(product.master || product.isVariant()){
			if(product.master) {
				if (!empty(product.variationModel.defaultVariant)) {
					defaultVarient = product.variationModel.defaultVariant;
				} else {
					defaultVarient = product.variationModel.variants[0];
				}
			} else {
				if (!empty(product.masterProduct.variationModel.defaultVariant)) {
					defaultVarient = product.masterProduct.variationModel.defaultVariant;
				} else {
					defaultVarient = product.masterProduct.variationModel.variants[0];
				}


			}
		}

	}
	return defaultVarient;
}
function getSelectedAttributes(pvm) {
    var atts = {},
        attDefs = pvm.getProductVariationAttributes();

    for (var l = 0; l < attDefs.length; l++) {
        var attribute = attDefs[l];
        var selectedValue = pvm.getSelectedValue(attribute);
        atts[attribute.ID] = {
            displayName: attribute.displayName,
            value: selectedValue ? selectedValue.value : '',
            displayValue: selectedValue ? selectedValue.displayValue : ''
        };
    }
    return atts;
}
function isSkinTypeVariant (product) {
	var skinTypeVariant = false;

	if (!empty(product)) {
		// If its variation or variation check if skinTypeVariation
		if((product.master || product.isVariant())){
			if(product.master) {
				if(!empty(product.getVariationModel()) && !empty(product.getVariationModel().getProductVariationAttributes())) {
				    for (let i = 0; i < product.getVariationModel().getProductVariationAttributes().getLength(); i++) {
				        if(product.getVariationModel().getProductVariationAttributes()[i].attributeID === 'skinTypeVariation'){
				        	skinTypeVariant = true;
				        	break;
				        }
				    }
				}
			} else {
				if(!empty(product.masterProduct.getVariationModel()) && !empty(product.masterProduct.getVariationModel().getProductVariationAttributes())) {
				    for (let i = 0; i < product.getVariationModel().getProductVariationAttributes().getLength(); i++) {
				        if(product.masterProduct.getVariationModel().getProductVariationAttributes()[i].attributeID === 'skinTypeVariation'){
				        	skinTypeVariant = true;
				        	break;
				        }
				    }
				}
			}
		}
	}
	return skinTypeVariant;
}
/**
 * Gets How to use Content for product detail page
 *
 * @param {product} product
 * @returns {Object}
 */
 function getHowToUseContent(product,ignoreVariantCheck) {
	var howToUseContent = {};
	var howToUseVideoSource = '';
	var howToUse = '';
	var suggestedUsage = '';	
	var dosage = '';
	var dosageImage = '';
	var texture = '';
	var textureImage = '';
	if(!ignoreVariantCheck) ignoreVariantCheck = false;
	
	if (!empty(product)) {
						
		if((product.master || product.isVariant()) && !ignoreVariantCheck){	
			var prd = getDefaultContentVariant(product);
			if(!empty(prd)){
				howToUseVideoSource = prd.custom.howToUseSource; 
				howToUse = prd.custom.howToUse;
				suggestedUsage = prd.custom.suggestedUsage;
				dosage = prd.custom.dosage;
				dosageImage = prd.custom.dosageImage;
				texture = prd.custom.texture;
				textureImage = prd.custom.textureImage;
				
			}
			
		} else {
			howToUseVideoSource = product.custom.howToUseSource;
			howToUse = product.custom.howToUse;
			suggestedUsage = product.custom.suggestedUsage;
			dosage = product.custom.dosage;
			dosageImage = product.custom.dosageImage;
			texture = product.custom.texture;
			textureImage = product.custom.textureImage;
		}						
		
	}
	
	if(!empty(dosage)) dosage = StringUtils.pad(dosage,100);
	if(!empty(texture)) texture = StringUtils.pad(texture,50);
	
	howToUseContent = {
			howToUseVideoSource: howToUseVideoSource,
			howToUse: howToUse,
			suggestedUsage: suggestedUsage,
			dosage: dosage,
			dosageImage: dosageImage,
			texture : texture,
			textureImage : textureImage
        };
		
	return howToUseContent;
	
}
function getFullSizeProduct(product) {
	var fullSizeProduct = dw.catalog.ProductMgr.getProduct(product.custom.relatedFullSizeProduct);
    return fullSizeProduct;
}
/**
 * Gets Suggested Routine Content for product detail page
 *
 * @param {product} product
 * @returns {Object}
 */
 function getSuggestedRoutine(product,ignoreVariantCheck) {
	var suggestedRoutine = {};
	var recProducts : dw.util.Collection = new dw.util.ArrayList();
	var recProductShortDesc : dw.util.Collection = new dw.util.ArrayList();
	var maxRecs = 5, counter = 0;
	var position = 0;
	var parentAdded = false;
	if(product.custom.suggestedUsageStep && product.custom.suggestedUsageStep>0){
		if(product.custom.suggestedUsageStep >= maxRecs){
			position = product.custom.suggestedUsageStep - 2; 
		}else{
			position = product.custom.suggestedUsageStep-1;
		}
	}
	
	
	if (!empty(product)) {
		
		if((product.master || product.isVariant()) && !ignoreVariantCheck){	
			var prd = getDefaultContentVariant(product);
			if(!empty(prd)){
				var recommendations : dw.util.Iterator = prd.getRecommendations(4).iterator();
				while( recommendations.hasNext() ){
					if(counter == position){
						if(product.custom.isTravelSize){
							var fullSizeProduct = getFullSizeProduct(product);
							recProducts.add( fullSizeProduct );
						}else{
							recProducts.add( product );
						}
						counter++;
						parentAdded = true;
					}
					var recommendation : dw.catalog.Recommendation = recommendations.next();
					var recommendedProduct : dw.catalog.Product = recommendation.getRecommendedItem();
					recProducts.add( recommendedProduct );
					recProductShortDesc.add(recommendation.shortDescription);
					if(++counter >= maxRecs) break;
				}
				if(!parentAdded){
					if(product.custom.isTravelSize){
						var fullSizeProduct = getFullSizeProduct(product);
						recProducts.add( fullSizeProduct );
					}else{
						recProducts.add( product );
					}
				}
				
			}
			
		} else {
			var recommendations : dw.util.Iterator = product.getRecommendations(4).iterator();
			while( recommendations.hasNext() ){
				if(counter == position){
					if(product.custom.isTravelSize){
						var fullSizeProduct = getFullSizeProduct(product);
						recProducts.add( fullSizeProduct );
					}else{
						recProducts.add( product );
					}
					counter++;
					parentAdded = true;
				}
				var recommendation : dw.catalog.Recommendation = recommendations.next();
				var recommendedProduct : dw.catalog.Product = recommendation.getRecommendedItem();
				recProducts.add( recommendedProduct );
				recProductShortDesc.add(recommendation.shortDescription);
				if(++counter >= maxRecs) break;
			}
			if(!parentAdded){
				if(product.custom.isTravelSize){
					var fullSizeProduct = getFullSizeProduct(product);
					recProducts.add( fullSizeProduct );
				}else{
					recProducts.add( product );
				}
			}
		}						
		
	}
	return suggestedRoutine = {
			recProducts: recProducts,
			recProductShortDesc: recProductShortDesc
        };
			
}
function pdpDatas(product){
	var maxQty = 0;
	var productUnitPrice = 0;
	var datas = {};
	var Site = require('dw/system/Site');
	if(!empty(Site.current.getCustomPreferenceValue('maxOrderQuantity')) && (Site.current.getCustomPreferenceValue('maxOrderQuantity') > 0)){
		maxQty = Site.current.getCustomPreferenceValue('maxOrderQuantity');
	}
	if(!empty(product.custom.maxOrderQuantity) && product.custom.maxOrderQuantity > 0){
		maxQty = product.custom.maxOrderQuantity;
	}
	if(product && product.priceModel) {
		productUnitPrice = product.priceModel.getPrice().value;
	}
	datas = {
		maxQty : maxQty,
		productUnitPrice : productUnitPrice
	}
	return datas;
}
function getAvailability(item, quantity){
	var qty = isNaN(quantity) ? 1 : (parseInt(quantity)).toFixed();
    /* product availability */
    var avm = item.availabilityModel;
    var invRecordEmpty = !avm.inventoryRecord || avm.inventoryRecord === {};
    var ats = invRecordEmpty ? 0 : avm.inventoryRecord.ATS.value.toFixed();
    var inStockDate = invRecordEmpty || !avm.inventoryRecord.inStockDate ? '' :
        avm.inventoryRecord.inStockDate.toDateString();
    var availability = {
        status: avm.availabilityStatus,
        statusQuantity: qty,
        inStock: avm.inStock,
        ats: ats,
        inStockDate: inStockDate,
        availableForSale: avm.availability > 0,
        levels: {}
    };

    var avmLevels = avm.getAvailabilityLevels((qty < 1) ? 1 : qty);
    availability.isAvailable = avmLevels.notAvailable.value === 0;
    availability.inStockMsg = Resource.msgf('global.quantityinstock', 'locale', '', avmLevels.inStock.value.toFixed());
    availability.preOrderMsg = Resource.msgf('global.quantitypreorder', 'locale', '', avmLevels.preorder.value.toFixed());
    availability.backOrderMsg = Resource.msgf('global.quantitybackorder', 'locale', '', avmLevels.backorder.value.toFixed());
    if (avm && avm.inventoryRecord && avm.inventoryRecord.inStockDate) {
        availability.inStockDateMsg = Resource.msgf('global.inStockDate', 'locale', '', avm.inventoryRecord.inStockDate.toDateString());
    }

    availability.levels[ProductAvailabilityModel.AVAILABILITY_STATUS_IN_STOCK] = avmLevels.inStock.value;
    availability.levels[ProductAvailabilityModel.AVAILABILITY_STATUS_PREORDER] = avmLevels.preorder.value;
    availability.levels[ProductAvailabilityModel.AVAILABILITY_STATUS_BACKORDER] = avmLevels.backorder.value;
    availability.levels[ProductAvailabilityModel.AVAILABILITY_STATUS_NOT_AVAILABLE] = avmLevels.notAvailable.value;

    return availability;
}


/**
 * Indicates whether the Compare checkbox field is enabled
 *
 * @param {String} catId
 * @returns {Boolean}
 */
function isCompareEnabled (catId) {
    var cat = CatalogMgr.getCategory(catId);
    if ('enableCompare' in cat.custom && cat.custom.enableCompare) {
        return true;
    }
    return false;
};

/**
 * Get product IDs for comparison
 *
 * @param {String} catId
 * @returns {Boolean}
 */
function getCompareProductList (catId) {
    var productList = new dw.util.ArrayList();
    var productSearchModel = new dw.catalog.ProductSearchModel();
    productSearchModel.setCategoryID(catId);
    productSearchModel.search();
    var prodList = productSearchModel.productSearchHits;
    while (prodList.hasNext() && productList.length<5) {
        var prod = prodList.next().product;
        if(prod.custom.enableCompare){
            productList.add(prod);
        }
    }
    return productList;
};
/**
 * Check Product is Visible
 * 
 * @param {*} product 
 */
function isVisible(product){
	if (!product) {
		return false;
	}

	if (!product.isOnline()) {
		return false;
	}

	if (!product.isAssignedToSiteCatalog()) {
		return false;
	}

	if (product.isProductSet() && product.getOnlineProductSetProducts().isEmpty()) {
		return false;
	}
	return true;
}

module.exports = {
    getQueryString: getQueryString,
    getBenefits: getBenefits,
    getDefaultContentVariant: getDefaultContentVariant,
    getSelectedAttributes: getSelectedAttributes,
    isSkinTypeVariant:isSkinTypeVariant,
	getHowToUseContent:getHowToUseContent,
	getSuggestedRoutine:getSuggestedRoutine,
	pdpDatas:pdpDatas,
    getCompareProductList: getCompareProductList,
    isCompareEnabled: isCompareEnabled,
	isVisible:isVisible,
	getAvailability:getAvailability
}