'use strict';

var CatalogMgr = require('dw/catalog/CatalogMgr');
var HashMap = require('dw/util/HashMap');
var Money = require('dw/value/Money');
var ProductAvailabilityModel = require('dw/catalog/ProductAvailabilityModel');
var Promotion = require('dw/campaign/Promotion');
var PromotionMgr = require('dw/campaign/PromotionMgr');
var Resource = require('dw/web/Resource');
var Site = require('dw/system/Site');
var StringUtils = require('dw/util/StringUtils');
var sanitize = require('~/cartridge/scripts/util/StringHelpers').sanitize;
var app = require('app_storefront_controllers/cartridge/scripts/app');
var cart = app.getModel('Cart').goc();


/**
 * Product Utilities object
 *
 * @param {dw.system.PipelineDictionary} pdict
 */
function ProductUtils (pdict) {
    var _product = pdict.Product || null;
    var _httpMap = pdict.CurrentHttpParameterMap;
    var _variationModel = pdict.hasOwnProperty('CurrentVariationModel') && pdict.CurrentVariationModel ?
        (_product === null ? null : _product.variationModel) :
        pdict.CurrentVariationModel;
    var _variantHierarchy = null;

    /**
     * Gets a Simple Product
     *
     * @param {dw.catalog.Product} item
     * @returns {Object}
     */
    var getSimpleProduct = function (item) {
        var pm = item.isVariant() ? item.masterProduct : item;
        var p = {
            source: _httpMap.source.stringValue,
            start: _httpMap.start.intValue,
            cgid: _httpMap.cgid.stringValue,
            srule: _httpMap.srule.stringValue,
            name: item.name,
            ID: item.ID,
            productSet: item.productSet,
            bundle: item.bundle,
            bundled: item.bundled,
            productSetProduct: item.productSetProduct,
            master: item.isMaster(),
            isOption: item.optionProduct,
            variant: item.isVariant(),
            masterID: pm.ID
        };

        try {
            p.variations = getVariationAttributes(item);
            p.pricing = ProductUtils.getPricing(item);
            p.images = {
                large: getImages(item, 'large'),
                small: getImages(item, 'small')
            };
            p.availability = ProductUtils.getAvailability(item, _httpMap.Quantity.stringValue);
            p.variants = ProductUtils.getVariants(item, _variationModel, _httpMap.Quantity.stringValue);
        }
        catch (error) {
            p.error = error;
        }

        return p;
    };

    var getVariantHierarchy = function () {
        if (_product === null) { return null; }
        var vh = {};
        if (!_variantHierarchy) {
            _variantHierarchy = ProductUtils.getVariantHierarchy(_product, _variationModel, _httpMap.Quantity.stringValue);
        }
        vh = _variantHierarchy;
        return vh;
    };

    /**
     * Gets Variant Availability
     *
     * @param {String} current
     * @param {array} selected
     */
    var getVariantAvailability = function (current, selected) {
        var arr = [], att = null;

        var vh = getVariantHierarchy();
        if (selected.length === 0) {
            for (att in vh.attributes) {
                if (att.selected) {	break; }
            }
            arr.push(att.id + '-' + att.value);
        } else {
            arr = selected;
        }

        if (current) {
            arr.push(current);
        }
        var atts = vh.attributes;
        var attribute = {};
        for (var i = 0,len = arr.length; i < len; i++) {
            attribute = atts[arr[i]];
            if (!attribute) {
                if (current) { arr.pop(); }
                 return false;
            }
            if (!attribute.attributes) { break; }
            atts = attribute.attributes;
        }
        if (current) { arr.pop(); }
        return getAttributeAvailability(attribute);
    };

    var getAttributeAvailability = function (attribute) {
        var available = false;
        if (attribute.attributes) {
            for (var a in attribute.attributes) {
                var att = attribute.attributes[a];
                available = getAttributeAvailability(att);
                if (available) {
                    break;
                }
            }
        } else {
            available = attribute.availability.availableForSale;
        }
        return available;

    };

    var getVariationAttributes = function (item) {

        var variations = {attributes: []};

        if (!item.isVariant() && !item.isMaster()) {
            return variations;
        }

        // get product variations
        // pvm and masterPvm are dw.catalog.ProductVariationModel instances
        var pvm = pdict.CurrentVariationModel ? pdict.CurrentVariationModel : item.variationModel;
        var masterPvm = item.isVariant() ? item.masterProduct.variationModel : item.variationModel;
        var attrIter = pvm.productVariationAttributes.iterator();

        while (attrIter.hasNext()) {
            var attr = attrIter.next();
            var pva = {
                id: attr.getAttributeID(),
                name: attr.getDisplayName(),
                vals: []
            };

            var attValIterator = pvm.getAllValues(attr).iterator();
            while (attValIterator.hasNext()) {
                var attrValue = attValIterator.next();
                if (!masterPvm.hasOrderableVariants(attr, attrValue)) { continue; }
                var pvaVal = {
                    id: attrValue.ID,
                    val: attrValue.displayValue ? attrValue.displayValue : attrValue.value
                };

                if (pva.id === 'color') {
                    // get images for variation
                    pvaVal.images = {
                        swatch: {},
                        large: getImages(attrValue, 'large'),
                        small: getImages(attrValue, 'small')
                    };
                    // get swatch image
                    var swatch = attrValue.getImage('swatch');
                    if (swatch) {

                        pvaVal.images.swatch = {
                            url:swatch.getURL(),
                            alt:swatch.alt,
                            title:swatch.title
                        };
                    }
                }
                // add the product variation attribute value
                pva.vals.push(pvaVal);

            } /* END pvm.getAllValues(v_att) */

            // add the product variation attribute
            variations.attributes.push(pva);
        } /* END pvm.productVariationAttributes */
        return variations;
    };

    var getImages = function (o, viewtype) {
        var imgs = o.getImages(viewtype);
        var imgArray = [];
        for (var i = 0, len = imgs.length; i < len; i++) {
            imgArray.push({
                url:imgs[i].getURL().toString(),
                alt:imgs[i].alt,
                title:imgs[i].title
            });
        }
        return imgArray;
    };

    return {
        getSimpleProduct: getSimpleProduct,
        getImages: getImages,
        getPricing: ProductUtils.getPricing,
        getVariationAttributes: getVariationAttributes,
        isVariantAvailable: getVariantAvailability
    };
}

/**
 * Provides Product availability status
 *
 * @param {dw.catalog.Product} item - Product instance
 * @param {String|Number} quantity - Quantity to evaluate
 * @returns {Object}
 */
ProductUtils.getAvailability = function (item, quantity) {
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
};

/**
 * Jsonifies a Product instance
 *
 * @param {dw.catalog.Product} item
 * @param {dw.system.PipelineDictionary} args
 * @returns {String}
 */
ProductUtils.getProductJson = function (item, args) {
    var pu = new ProductUtils(args);
    var sp = pu.getSimpleProduct(item);
    var json = JSON.stringify(sp);
    return json;
};

/**
 * Gets pricing
 *
 * @param {dw.catalog.Product} item
 * @returns {Object}
 */
ProductUtils.getPricing = function (item) {
    /* product pricing
    *
    * There is currently no way to check if the list pricebook is actually
    * assigned to the site.  Therefore, we do a sanity check:  If the
    * product has no price according to standard price lookup rules,
    * then we know the list price book is not assigned to the site.
    * (The converse is not true so this check is not perfect.)
    *
    * Todo:  Improve this logic.
    *
    * The check after the '||' above is to only consider standard prices for cases where the site and
    * the session currencies are the same. This is because currently the "listPriceDefault" property
    * can not be set per currency.
    */

    var priceModel = item.getPriceModel();
    var standardPrice = null;

    if ((!priceModel.getPrice().available) || (!Site.getCurrent().getDefaultCurrency().equals(session.getCurrency().getCurrencyCode()))) {
        standardPrice = Money.NOT_AVAILABLE;
    } else if (('listPriceDefault' in Site.current.preferences.custom) && Site.current.preferences.custom.listPriceDefault) {
        standardPrice = priceModel.getPriceBookPrice(Site.current.preferences.custom.listPriceDefault);
    } else {
        standardPrice = priceModel.getPriceBookPrice('list-prices');
    }

    var salesPrice = priceModel.getPrice();
    var showStdPrice = standardPrice.available && salesPrice.available && standardPrice.compareTo(salesPrice) === 1;
    var promoPrice = Money.NOT_AVAILABLE;
    var isPromoPrice = false;

    var promos = PromotionMgr.activeCustomerPromotions.getProductPromotions(item);
    if (promos && promos.length) {
        var promo = promos[0];
        var promoClass = promo.getPromotionClass();
        if (promoClass && promoClass.equals(Promotion.PROMOTION_CLASS_PRODUCT)) {
            if (item.optionProduct) {
                promoPrice = (pdict.CurrentOptionModel) ?
                     promo.getPromotionalPrice(item, pdict.CurrentOptionModel) :
                     promo.getPromotionalPrice(item, item.getOptionModel());
            } else {
                promoPrice = promo.getPromotionalPrice(item);
            }
        }

        if (promoPrice.available && salesPrice.compareTo(promoPrice) !== 0) {
            showStdPrice = true;
            isPromoPrice = true;
            standardPrice = salesPrice;
            salesPrice = promoPrice;
        }
    }

    var pricing = {
        showStandardPrice: showStdPrice,
        isPromoPrice: isPromoPrice,
        standard: standardPrice.value,
        formattedStandard: StringUtils.formatMoney(standardPrice),
        sale: salesPrice.value,
        formattedSale: StringUtils.formatMoney(salesPrice),
        salePriceMoney: salesPrice,
        standardPriceMoney: standardPrice,
        quantities: []
    };

    var priceTable = priceModel.getPriceTable();
    for (var qty in priceTable.getQuantities()) {
        pricing.quantities.push({
            unit: !(qty.unit) ? '' : qty.unit,
            value: !qty.value ? 0 : qty.value.toFixed()
        });
    }

    return pricing;
};

/**
 * Gets Simple Bonus Product
 *
 * @param {dw.catalog.Product} item
 * @param {dw.order.ProductLineItem} lineItem
 * @returns {Object}
 */
ProductUtils.getSimpleBonusProduct = function (item, lineItem) {
    var p = {
        name: item.name,
        ID: item.ID,
        qty: lineItem.quantityValue,
        lineItemCtnrUUID: lineItem.lineItemCtnr.UUID,
        variations: {attributes: []},
        options: {attributes: []}
    };

    // if product is variant or master, get selected  attribute definitions
    if (item.isVariant() || item.isMaster()) {
        var attDefs = item.variationModel.getProductVariationAttributes();
        for (var i = 0; i < attDefs.length; i++) {
            var attDef = attDefs[i];
            var selectedValue = item.variationModel.getSelectedValue(attDef);
            // push variation attributes to simple object
            p.variations.attributes.push({
                displayID: attDef.ID,
                displayName: attDef.displayName,
                selectedDisplayValue: selectedValue.displayValue,
                selectedValue: selectedValue.value});
        }
    }

    // if lineItem or optionProductLineItems is empty, return simple object
    if (!lineItem || !lineItem.optionProductLineItems) {
        return p;
    }

    // otherwise get option product line items
    var optionLineItems = lineItem.optionProductLineItems;
    for (var j = 0; j < optionLineItems.length; j++) {
        var optionLineItem = optionLineItems[j];
        var option = item.optionModel.getOption(optionLineItem.optionID);
        // push option attributes to simple object
        p.options.attributes.push({
            displayID: optionLineItem.optionID,
            htmlName: !option ? '' : option.htmlName,
            selectedDisplayValue: optionLineItem.lineItemText,
            selectedValue: optionLineItem.optionValueID
        });
    }

    // return simple object
    return p;
};

/**
 * Provides JSON string of a Simple Bonus Product
 *
 * @param {dw.catalog.Product} item
 * @param {dw.order.ProductLineItem} lineItem
 * @returns {String}
 */
ProductUtils.getBonusProductJson = function (item, lineItem) {
    var o = {data: ProductUtils.getSimpleBonusProduct(item, lineItem)};
    return JSON.stringify(o);
};

/**
 * Gets selected color
 *
 * @param {dw.catalog.Product} product
 * @param {dw.catalog.ProductVariationModel} pvm
 * @returns {dw.catalog.ProductVariationAttributeValue}
 */
ProductUtils.getSelectedColor = function (product, pvm) {
    if (product === null) { return null; }
    var vm = pvm === null ? product.variationModel : pvm;
    var cvm = product.isVariant() ? product.masterProduct.variationModel : product.variationModel;

    var selectedColor = null;
    var colorVA = vm.getProductVariationAttribute('color');
    if (colorVA === null) { return null; }

    selectedColor = vm.getSelectedValue(colorVA);

    if (selectedColor) {
        return selectedColor;
    } else {
        var variant = product;
        if (!product.isVariant()) {
            if (vm.defaultVariant) {
                variant = vm.defaultVariant;
            } else if (vm.variants.length > 0) {
                variant = vm.variants[0];
            }
        }

        var cv = vm.getVariationValue(variant, colorVA);
        if (!cvm.hasOrderableVariants(colorVA, cv)) {
            var found = false;
            for (var i = 0, il = vm.variants.length; i < il; i++) {
                cv = cvm.getVariationValue(vm.variants[i], colorVA);
                if (cvm.hasOrderableVariants(colorVA, cv)) {
                    found = true;
                    break;
                }
            }
        }
        return cv;
    }
};

/**
 * Gets a Product Variant by color
 *
 * @param {dw.catalog.Product} prod
 * @param {String} colorId
 * @returns {dw.catalog.Product}
 */
ProductUtils.getVariantForColor = function (prod, colorId) {
    var newProduct = prod;
    var variants = prod.getVariants();

    if (variants === null || variants.length === 0) {
        return newProduct;
    }

    for (var i = 0, il = variants.length; i < il; i++) {
        var p = variants[i];
        if (p.onlineFlag && (!colorId || p.custom.color === colorId)) {
            newProduct = p;
        }
    }

    return newProduct;
};

/**
 * Gets query string
 *
 * @param {dw.web.HttpParameterMap} map
 * @param {Array} fields
 * @returns {String}
 */
ProductUtils.getQueryString = function (map, fields) {
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
};

/**
 * Indicates whether the Compare checkbox field is enabled
 *
 * @param {String} catId
 * @returns {Boolean}
 */
ProductUtils.isCompareEnabled = function (catId) {
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
ProductUtils.getCompareProductList = function (catId) {
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
 * Gets Variants
 *
 * @param {dw.catalog.Product} item
 * @param {dw.catalog.ProductVariationModel} pvm
 * @param {String|Number} quantity
 * @returns {Object}
 */
ProductUtils.getVariants = function (item, pvm, quantity) {
    var variants = {};
    if (!item.isVariant() && !item.isMaster()) {
        return variants;
    }

    for (var i = 0,len = pvm.variants.length; i < len; i++) {

        var v = pvm.variants[i];
        var variant = {
            id: v.ID,
            attributes: {},
            availability: ProductUtils.getAvailability(v, quantity),
            pricing: ProductUtils.getPricing(v)
        };
        // attributes
        var attKey = [];
        for (var a = 0, alen = pvm.productVariationAttributes.length; a < alen; a++) {
            var att = pvm.productVariationAttributes[a];
            var variationValue = pvm.getVariationValue(v, att);
            if (!variationValue) { continue; }
            attKey.push(att.ID + '-' + variationValue.value);
            variant.attributes[att.ID] = !variationValue.displayValue ? variationValue.value : variationValue.displayValue;
        }

        variants[attKey.join('|')] = variant;
    }

    return variants;
};

/**
 * Gets Variant Hierarchy
 *
 * @param {dw.catalog.Product} item
 * @param {dw.catalog.ProductVariationModel} productVariationModel
 * @param {String|Number} quantity
 * @returns {Object}
 */
ProductUtils.getVariantHierarchy = function (item, productVariationModel, quantity) {
    var variants = {};
    if (!item.isVariant() && !item.isMaster()) { return variants; }

    var allVariants = productVariationModel.variants;
    var allVariationAttributes = productVariationModel.productVariationAttributes;
    for (var i = 0, numVariants = allVariants.length; i < numVariants; i++) {
        var variant = allVariants[i];
        var target = variants;
        // attributes
        for (var j = 0, numVariationAttributes = allVariationAttributes.length; j < numVariationAttributes; j++) {
            var attribute = allVariationAttributes[j];
            var variationValue = productVariationModel.getVariationValue(variant, attribute);
            if (!variationValue) { continue; }
            var key = attribute.ID + '-' + variationValue.value;
            if (!('attributes' in target)) {
                target.attributes = {};
            }
            if (!(key in target.attributes)) {
                target.attributes[key] = {
                    id: attribute.ID,
                    value: variationValue.value,
                    display: !variationValue.displayValue ? variationValue.value : variationValue.displayValue,
                    selected: productVariationModel.isSelectedAttributeValue(attribute, variationValue)
                };
            }
            target = target.attributes[key];
        }
        target.productId = variant.ID;
        target.availability = ProductUtils.getAvailability(variant, quantity);
        target.pricing = ProductUtils.getPricing(variant);
    }

    return variants;
};

/**
 * Gets Selected Attributes
 *
 * @param {dw.catalog.ProductVariationModel} pvm
 * @returns {Object}
 */
ProductUtils.getSelectedAttributes = function (pvm) {
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
};

/**
 * Gets Default Variant
 *
 * @param {dw.catalog.ProductVariationModel} pvm
 * @returns {dw.catalog.Variant}
 */
ProductUtils.getDefaultVariant = function (pvm) {
    var variant = pvm.selectedVariant;
    if (variant) { return variant; }

    var attDefs = pvm.getProductVariationAttributes();
    var map = new HashMap();

    for (var i = 0, len = attDefs.length; i < len; i++) {
        var attribute = attDefs[i];
        var selectedValue = pvm.getSelectedValue(attribute);
        if (selectedValue && selectedValue.displayValue.length > 0) {
            map.put(attribute.ID,selectedValue.ID);
        }
    }

    var variants = pvm.getVariants(map);
    for (var k = 0; k < variants.length; k++) {
        var p = variants[k];
        if (p.onlineFlag && p.availabilityModel.availability > 0) {
            return p;
        }
    }
    return null;
};

ProductUtils.getProductType = function (product) {
    var productType;
    if (product.master) {
        productType = 'master';
    } else if (product.variant) {
        productType = 'variant';
    } else if (product.variationGroup) {
        productType = 'variationGroup';
    } else if (product.bundle) {
        productType = 'bundle';
    } else if (product.productSet) {
        productType = 'set';
    } else {
        productType = 'standard';
    }
    return productType;
};

/**
 * Gets default content variation for product detail page
 *
 * @param {dw.catalog.Product} item
 * @returns {Object}
 */
ProductUtils.getDefaultContentVariant = function (product) {
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

/**
 * Gets Benefits Content for product detail page
 *
 * @param {dw.catalog.Product} item
 * @returns {Object}
 */
ProductUtils.getBenefits = function (product,ignoreVariantCheck) {
	
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
						
			var prd = ProductUtils.getDefaultContentVariant(product);
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
	
};

/**
 * Gets Ingredients Content for product detail page
 *
 * @param {product} product
 * @returns {Object}
 */
ProductUtils.getIngredients = function (product,ignoreVariantCheck) {
		
	var ingredients = {};
	var whoItsFor = '';
	var formulatedWithout = '';
	var fullIngredientsList = '';
	var showHadasei = false;
	// Business wants this as separate fields.
	var spLightName1 = '';
	var spLightText1 = '';
	var spLightImage1 = '';
	
	var spLightName2 = '';
	var spLightText2 = '';
	var spLightImage2 = '';
	
	var spLightName3 = '';
	var spLightText3 = '';
	var spLightImage3 = '';
	
	var showIngredients = false;
	if(!ignoreVariantCheck) ignoreVariantCheck = false;
	
	if (!empty(product)) {
						
		if((product.master || product.isVariant()) && !ignoreVariantCheck){	
			var prd = ProductUtils.getDefaultContentVariant(product);
			if(!empty(prd)){
				whoItsFor = prd.custom.whoItsFor;
				formulatedWithout = prd.custom.formulatedWithout;
				fullIngredientsList = prd.custom.fullIngredientsList;
				
				spLightName1 = prd.custom.spLightName1;
				spLightText1 = prd.custom.spLightText1;
				spLightImage1 = prd.custom.spLightImage1;
				
				spLightName2 = prd.custom.spLightName2;
				spLightText2 = prd.custom.spLightText2;
				spLightImage2 = prd.custom.spLightImage2;
				
				spLightName3 = prd.custom.spLightName3;
				spLightText3 = prd.custom.spLightText3;
				spLightImage3 = prd.custom.spLightImage3;
				
				if(prd.custom.showHadasei){
					showHadasei = true;
				}
				
			}
			
		} else {
			whoItsFor = product.custom.whoItsFor;
			formulatedWithout = product.custom.formulatedWithout;
			fullIngredientsList = product.custom.fullIngredientsList;
			
			spLightName1 = product.custom.spLightName1;
			spLightText1 = product.custom.spLightText1;
			spLightImage1 = product.custom.spLightImage1;	
			
			spLightName2 = product.custom.spLightName2;
			spLightText2 = product.custom.spLightText2;
			spLightImage2 = product.custom.spLightImage2;
			
			spLightName3 = product.custom.spLightName3;
			spLightText3 = product.custom.spLightText3;
			spLightImage3 = product.custom.spLightImage3;	
			
			if(product.custom.showHadasei){
				showHadasei = true;
			}
		}						
		
	}
	
	
	ingredients = {
			whoItsFor: whoItsFor,
			formulatedWithout: formulatedWithout,
			fullIngredientsList: fullIngredientsList,
			spLightName1 : spLightName1,
			spLightText1 : spLightText1,
			spLightImage1 : spLightImage1,	
			spLightName2 : spLightName2,
			spLightText2 : spLightText2,
			spLightImage2 : spLightImage2,	
			spLightName3 : spLightName3,
			spLightText3 : spLightText3,
			spLightImage3 : spLightImage3,
			showHadasei : showHadasei
        };
	
		for(var key in ingredients){
			if(ingredients[key]){
				showIngredients = true;
			    break;
			} else{
				showIngredients = false;
			}
		}		
	
		ingredients.showIngredients = showIngredients;
	
	return ingredients;
	
};

/**
 * Gets How to use Content for product detail page
 *
 * @param {product} product
 * @returns {Object}
 */
ProductUtils.getHowToUseContent = function (product,ignoreVariantCheck) {
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
			var prd = ProductUtils.getDefaultContentVariant(product);
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
	
};

/**
 * Gets Suggested Routine Content for product detail page
 *
 * @param {product} product
 * @returns {Object}
 */
ProductUtils.getSuggestedRoutine = function (product,ignoreVariantCheck) {
	var suggestedRoutine = {};
	var recProducts : dw.util.Collection = new dw.util.ArrayList();
	var recProductShortDesc : dw.util.Collection = new dw.util.ArrayList();
	var maxRecs = 4, counter = 0;
	var position = 0;
	var parentAdded = false;
	if(product.custom.suggestedUsageStep && product.custom.suggestedUsageStep>0){
		position = product.custom.suggestedUsageStep-1;
	}
	
	
	if (!empty(product)) {
		
		if((product.master || product.isVariant()) && !ignoreVariantCheck){	
			var prd = ProductUtils.getDefaultContentVariant(product);
			if(!empty(prd)){
				var recommendations : dw.util.Iterator = prd.getRecommendations(4).iterator();
				while( recommendations.hasNext() ){
					if(counter == position){
						if(product.custom.isTravelSize){
							var fullSizeProduct = ProductUtils.getFullSizeProduct(product);
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
						var fullSizeProduct = ProductUtils.getFullSizeProduct(product);
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
						var fullSizeProduct = ProductUtils.getFullSizeProduct(product);
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
					var fullSizeProduct = ProductUtils.getFullSizeProduct(product);
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
			
};

/**
 * Gets Suggested Routine Content for product detail page
 *
 * @param {product} product
 * @returns {Object}
 */
ProductUtils.getSuggestedRoutineWithoutSelf = function (product,ignoreVariantCheck) {
	var suggestedRoutine = {};
	var recProducts : dw.util.Collection = new dw.util.ArrayList();
	
	
	if (!empty(product)) {
		
		if((product.master || product.isVariant()) && !ignoreVariantCheck){	
			var prd = ProductUtils.getDefaultContentVariant(product);
			if(!empty(prd)){
				var recommendations : dw.util.Iterator = prd.getRecommendations(4).iterator();
				while( recommendations.hasNext() ){
					var recommendation : dw.catalog.Recommendation = recommendations.next();
					var recommendedProduct : dw.catalog.Product = recommendation.getRecommendedItem();
					recProducts.add( recommendedProduct );
				}
				
			}
			
		} else {
			var recommendations : dw.util.Iterator = product.getRecommendations(4).iterator();
			while( recommendations.hasNext() ){
				var recommendation : dw.catalog.Recommendation = recommendations.next();
				var recommendedProduct : dw.catalog.Product = recommendation.getRecommendedItem();
				recProducts.add( recommendedProduct );
			}
		}						
		
	}

	return suggestedRoutine = {
			recProducts: recProducts,
        };
			
};

ProductUtils.isSampleProduct = function (product) {
	var isSample = false;
	var categories = product.allCategories;
	var catIds = [];
	for each(var category in categories) {
		catIds.push(category.ID);
	}
	if(catIds.indexOf("samples")!=-1){
		isSample = true;
	}
	return isSample;
};

ProductUtils.getFullSizeProduct = function (product) {
	var fullSizeProduct = dw.catalog.ProductMgr.getProduct(product.custom.relatedFullSizeProduct);
    return fullSizeProduct;
};
/**
 * Gets Suggested Routine Content for product detail page
 *
 * @param {product} product
 * @returns {Object}
 */
ProductUtils.getYouMayLikeIt = function (product,ignoreVariantCheck) {
	var youMayLikeIt = {};
	var recProducts : dw.util.Collection = new dw.util.ArrayList();
	var maxRecs = 9, counter = 0;
	
	if (!empty(product)) {
		
		if((product.master || product.isVariant()) && !ignoreVariantCheck){	
			var prd = ProductUtils.getDefaultContentVariant(product);
			if(!empty(prd)){
				var recommendations : dw.util.Iterator = prd.getRecommendations(5).iterator();
				while( recommendations.hasNext() ){
					var recommendation : dw.catalog.Recommendation = recommendations.next();
					var recommendedProduct : dw.catalog.Product = recommendation.getRecommendedItem();
					if(recommendedProduct.isOnline()) {
						recProducts.add( recommendedProduct );
						if(++counter >= maxRecs) break;
					}
				}
				
			}
			
		} else {
			var recommendations : dw.util.Iterator = product.getRecommendations(5).iterator();
			while( recommendations.hasNext() ){
				var recommendation : dw.catalog.Recommendation = recommendations.next();
				var recommendedProduct : dw.catalog.Product = recommendation.getRecommendedItem();
				if(recommendedProduct.isOnline()) {
					recProducts.add( recommendedProduct );
					if(++counter >= maxRecs) break;
				}
			}
		}						
		
	}

	return youMayLikeIt = {
			recProducts: recProducts
        };
			
};


/**
 * Gets Marketng Content for product detail page
 *
 * @param {product} product
 * @returns {Object}
 */
ProductUtils.getMarketingContentUnit = function (product,ignoreVariantCheck) {
	var marketingContent = {};
	var marketingContentUnit = '';
	
	if(!ignoreVariantCheck) ignoreVariantCheck = false;
	
	if (!empty(product)) {
						
		if((product.master || product.isVariant()) && !ignoreVariantCheck){	
			var prd = ProductUtils.getDefaultContentVariant(product);
			if(!empty(prd)){
				marketingContentUnit = prd.custom.marketingContentUnit;
			}
			
		} else {
			marketingContentUnit = product.custom.marketingContentUnit;
		}						
		
	}
	
	
	marketingContent = {
			marketingContentUnit: marketingContentUnit
        };
		
	return marketingContent;
	
};

/**
 * Check if the product is skintype variant
 *
 * @param {product} product
 * @returns {boolean}
 */
ProductUtils.isSkinTypeVariant = function (product) {
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
};

/**
 * Gets product list for Gift builder page
 *
 * @param {product} product
 * @returns {Object}
 */
ProductUtils.giftBuilderProductList = function (product,ignoreVariantCheck) {
	var giftBuilder = {};
	var offerProducts : dw.util.Collection = new dw.util.ArrayList();
	var maxRecs = 32, counter = 0;
	
	if (!empty(product)) {
		if((product.master || product.isVariant()) && !ignoreVariantCheck){	
			var prd = ProductUtils.getDefaultContentVariant(product);
			if(!empty(prd)){
				var recommendations : dw.util.Iterator = prd.getOrderableRecommendations(6).iterator();
				while( recommendations.hasNext() ){
					var recommendation : dw.catalog.Recommendation = recommendations.next();
					var recommendedProduct : dw.catalog.Product = recommendation.getRecommendedItem();
					var qtyStatus = ProductUtils.checkMaximumQuatity(recommendedProduct.ID);
					if(qtyStatus!=true){
						offerProducts.add( recommendedProduct );
					}
					if(++counter >= maxRecs) break;
				}
			}
			
		} else {
			var recommendations : dw.util.Iterator = product.getOrderableRecommendations(6).iterator();
			while( recommendations.hasNext() ){
				var recommendation : dw.catalog.Recommendation = recommendations.next();
				var recommendedProduct : dw.catalog.Product = recommendation.getRecommendedItem();
				var qtyStatus = ProductUtils.checkMaximumQuatity(recommendedProduct.ID);
				if(qtyStatus!=true){
					offerProducts.add( recommendedProduct );
				}
				if(++counter >= maxRecs) break;
			}
		}						
		
	}

	return giftBuilder = {
			offerProducts: offerProducts
     };
			
};

ProductUtils.checkMaximumQuatity = function (productID) {
	var cart = app.getModel('Cart').goc();
	var status = cart.checkMaximumQty(productID);
    return status;
};

module.exports = ProductUtils;
