'use strict';

const ProductUtils = require('~/cartridge/scripts/product/ProductUtilsSfra.js');
const ProductMgr = require('dw/catalog/ProductMgr');
const URLUtils = require('dw/web/URLUtils');
const Resource = require('dw/web/Resource');

const attrsWithSwatches = ['color', 'size', 'width', 'waist', 'length', 'skinTypeVariation'];

module.exports = {
    getContext: getContext,
	checkVariationAttributes: checkVariationAttributes,
	showValuePriceOverVariant: showValuePriceOverVariant
};

/**
 * Generates context to populate template values.
 *
 * @param {dw.system.PipelineDictionary} pdict - Pipeline Dictionary / Global namespace
 * @return {Object} Context variables used to populate template placeholders
 */
function getContext (pdict) {
    const product = pdict.Product;
    const variationMaster = pdict.CurrentVariationModel == null
        ? pdict.Product.getVariationModel()
        : pdict.CurrentVariationModel;

    const selectedAttrs = product.isVariant() || product.isVariationGroup()
        ? ProductUtils.getSelectedAttributes(variationMaster)
        : {};

    const context = {
        attrs: [],
        isValidProductType: product.isVariant() || product.isVariationGroup() || product.isMaster(),
        selectedAttrs: JSON.stringify(selectedAttrs)
    };

    const variationAttrs = variationMaster.getProductVariationAttributes();
    const variationAttrsLength = variationAttrs.getLength();

	var hasVariantOtherThanSize = false;
    for (let i = 0; i < variationAttrsLength; i++) {
        let attr = variationAttrs[i];
        let attrAttributeId = attr.getAttributeID();
        let hasSwatch = _getHasSwatch(attrAttributeId);

        let processedAttr = {
            displayName: attr.getDisplayName(),
            attributeId: attrAttributeId,
            hasSwatch: hasSwatch,
            values: _getAttrValues({
                pdict: pdict,
                variationMaster: variationMaster,
                attr: attr
            })
        };

        if (hasSwatch) {
            processedAttr.selectedValue = _getSelectedValue(processedAttr.values);
            processedAttr.plpAttrSelectedValue = _getPlpAttrSelectedValue(processedAttr.values);
            processedAttr.sizeChart = _getSizeChart({
                attrAttributeId: attrAttributeId,
                product: product,
                processedAttr: processedAttr
            });
        } else {
            processedAttr.masterId = pdict.Product.getVariationModel().getMaster().getID();
            processedAttr.uuid = pdict.CurrentHttpParameterMap.get('uuid');
            processedAttr.uuidStringValue = processedAttr.uuid.getStringValue();
        }

        processedAttr.resourceGlobalSelect = Resource.msg('global.select','locale',null);
		
		if(attrAttributeId !== 'size' && processedAttr.values.length > 0) {
			hasVariantOtherThanSize = true;
		}
		
		processedAttr.hasVariantOtherThanSize = hasVariantOtherThanSize;
		

        context.attrs.push(processedAttr);
    }

    return context;
}

function checkVariationAttributes(context) {
	var hasVariantOtherThanSize = false;
	if(context && context.attrs && context.attrs.length > 0) {
		for(var i=0;i<context.attrs.length;i++) {
			if(context.attrs[i].hasVariantOtherThanSize) {
				hasVariantOtherThanSize = true;
			}
		}
	}
	return hasVariantOtherThanSize;
}

function showValuePriceOverVariant(context) {
	var hasGiftSetVariant = false;
	if(context && context.attrs && context.attrs.length > 0) {
		for(var i=0;i<context.attrs.length;i++) {
			if(context.attrs[i].values && context.attrs[i].values.length > 0) {
				for(var j=0;j<context.attrs[i].values.length;j++) {
					if(context.attrs[i].values[j].plpAttrDisplay === 'Gift Set') {
						hasGiftSetVariant = true;
						break;
					}
				}
			}
		}
	}
	return hasGiftSetVariant;
}

/**
 * Process values for a variation attribute that is displayed through a pull-down menu
 *
 * @param {Object} params
 * @param {dw.system.PipelineDictionary} params.pdict
 * @param {dw.catalog.ProductVariationAttribute} params.attr
 * @param {dw.catalog.ProductVariationModel} params.variationMaster - Product Variation Model
 * @return {Object []}
 */
function _getAttrValues (params) {
    const pdict = params.pdict;
    const attr = params.attr;
    const variationMaster = params.variationMaster;
    const attrValues = variationMaster.getAllValues(attr);
    
    let results = [];
    for (let i = 0; i < attrValues.size(); i++) {
        let attrValue = attrValues[i];
        let attrAttributeId = attr.getAttributeID();
        let hasSwatch = _getHasSwatch(attrAttributeId);
        
        const isQuickView = pdict.CurrentHttpParameterMap.source.stringValue == 'quickview' || pdict.CurrentHttpParameterMap.source.stringValue == 'cart' || pdict.CurrentHttpParameterMap.source.stringValue == 'giftregistry' || pdict.CurrentHttpParameterMap.source.stringValue == 'wishlist';

        // Set common values between attributes with swatch and pull-down values
        let processedValue = _setCommonAttrValues({
            pdict: pdict,
            attr: attr,
            attrValue: attrValue,
            variationMaster: variationMaster,
            isQuickView: isQuickView
        });


        
        // Set additional properties needed by attributes that display values in a swatch
        if (hasSwatch) {
            processedValue = _setAttrValuesWithSwatch({
                processedValue: processedValue,
                variationMaster: variationMaster,
                attr: attr,
                attrValue: attrValue,
                isQuickView: isQuickView
            });
            

            let qs = ProductUtils.getQueryString(pdict.CurrentHttpParameterMap, ['source', 'uuid']);
            processedValue.linkUrl += qs.length == 0 ? '' : ('&' + qs);

            if (processedValue.isSelected) {
                processedValue.swatchClass += ' selected';
            }

            processedValue = _handleVariationGroup({
                attr: attr,
                pdict: pdict,
                processedValue: processedValue,
                variationMaster: variationMaster,
                isQuickView: isQuickView
            });


        // Set additional properties needed by attributes that display values in a pull-down menu
        } else {
            let linkUrl = variationMaster.urlSelectVariationValue('Product-Variation', attr, attrValue);
            let source = pdict.CurrentHttpParameterMap.get('source').getStringValue();

            processedValue.selected = variationMaster.isSelectedAttributeValue(attr, attrValue) ? 'selected="selected"' : '';
            processedValue.optionValue = linkUrl + '&source=' + (source || 'detail');
        }

        results.push(processedValue);
    }

    return results;
}

/**
 * Retrieves selected value of an attribute if one has been selected
 *
 * @param {Object []} attrValues
 * @param {Boolean} attrValues[].isSelected
 * @param {String} attrValues[].displayValue
 * @return {String} - Selected value
 */
function _getSelectedValue (attrValues) {
    for (let i = 0; i < attrValues.length; i++) {
        let value = attrValues[i];
        if (value.isSelected) {
            return value.description;
        }
    }
}

/**
 * Retrieves selected value of an attribute if one has been selected
 *
 * @param {Object []} attrValues
 * @param {Boolean} attrValues[].isSelected
 * @param {String} attrValues[].displayValue
 * @return {String} - Selected value
 */
function _getPlpAttrSelectedValue (attrValues) {
    for (let i = 0; i < attrValues.length; i++) {
        let value = attrValues[i];
        if (value.isSelected) {
            return value.displayName + ' ('+value.description.replace("|","/") + ')' ;
        }
    }
}

/**
 * Check for Size Chart
 *
 * We are assuming that a custom attribute, sizeChartID, has been defined for a Catalog Category system
 * object in Business Manager > Administration > System Object Definitions > Category > Attribute Definitions
 *
 * The value assigned to this object maps to a Content Asset.
 *
 * @param {Object} params
 * @param {String} params.attrAttributeId - Attribute attributeID value
 * @param {dw.catalog.Product} params.product - Product being examined for whether a size chart should be displayed
 * @param {Object} params.processedAttr - Proxy object representing dw.catalog.ProductVariationAttribute data in a template
 * @returns {Object}
 */
function _getSizeChart (params) {
    const attrAttributeId = params.attrAttributeId;
    const product = params.product;
    const processedAttr = params.processedAttr;

    if (attrAttributeId != 'color' && !processedAttr.sizeChart) {
        let category = product.getPrimaryCategory();

        if (!category && (product.isVariant() || product.isVariationGroup())) {
            category = product.getMasterProduct().getPrimaryCategory();
        }

        while (category && !processedAttr.sizeChart) {
            const sizeChartId = category.custom.sizeChartID;

            if (sizeChartId) {
                return {
                    id: sizeChartId,
                    url: URLUtils.url('Page-Show','cid', sizeChartId),
                    title: Resource.msg('product.variations.sizechart.label', 'product', null),
                    label: Resource.msg('product.variations.sizechart', 'product', null)
                };
            }

            category = category.parent;
        }
    }
}

/**
 * Set common properties shared by swatch and pull-down menu attribute values
 *
 * @param {Object} params
 * @param {dw.system.PipelineDictionary} params.pdict
 * @param {dw.catalog.ProductVariationAttribute} params.attr
 * @param {dw.catalog.ProductVariationAttributeValue} params.attrValue
 * @param {dw.catalog.ProductVariationModel} params.variationMaster - Product Variation Model
 * @return {Object}
 */
function _setCommonAttrValues(params) {
    const pdict = params.pdict;
    const attr = params.attr;
    const attrValue = params.attrValue;
    const variationMaster = params.variationMaster;

    const product = pdict.Product;
    const cleanvariationMaster = _getCleanPvm(product);
    const largeImage = variationMaster.getImage('large', attr, attrValue);

    const processedValue = {
        displayValue: attrValue.getDisplayValue() || attrValue.getValue(),
        isAvailable: variationMaster.hasOrderableVariants(attr, attrValue),
        isOrderableInMaster: cleanvariationMaster.hasOrderableVariants(attr, attrValue),
        largeImage: JSON.stringify({
            url: largeImage.getURL().toString(),
            title: largeImage.getTitle(),
            alt: largeImage.getAlt(),
            hires: attrValue.getImage('hi-res') || ''
        })
    };

    return processedValue;
}

/**
 * Set properties on attribute value displayed in a swatch
 *
 * @param {Object} params
 * @param {Object} params.processedValue
 * @param {dw.catalog.ProductVariationAttribute} params.attr
 * @param {dw.catalog.ProductVariationAttributeValue} params.attrValue
 * @param {dw.catalog.ProductVariationModel} params.variationMaster - Product Variation Model
 * @param {dw.catalog.ProductVariationAttribute} params.attr
 * @return {Object}
 */
function _setAttrValuesWithSwatch (params) {
    const processedValue = params.processedValue;
    const attr = params.attr;
    const attrValue = params.attrValue;
    const variationMaster = params.variationMaster;

    const attrAttributeId = attr.getAttributeID();
    const attrValueDisplayName = attrValue.getDisplayValue();
    const attrValueDescription = attrValue.getDescription();

    //const isSelectable = variationMaster.hasOrderableVariants(attr, attrValue);
    const isSelectable = true; //oos needs to be selected
    //const swatchImage = attrValue.getImage('swatch');
    let swatchImage = undefined;    
    if(attrAttributeId == 'color') {
    	swatchImage = 'images/product/variants/icons/'+attrValue.getID()+'.png';
    }
    const isSelected = variationMaster.isSelectedAttributeValue(attr, attrValue);
    
    var linkUrl = '';
    var attributeMap = new dw.util.HashMap();
    attributeMap.put(attr.ID,attrValue.ID);
    var variationProducts = variationMaster.getVariants(attributeMap);
    var variationProduct = variationProducts.iterator().next();
    var variationUrl = '';
    const isQuickView = params.isQuickView
    if (!params.isQuickView) {
    	const masterUrl = isSelected
			? variationMaster.urlUnselectVariationValue('Product-Variation', attr)
			: variationMaster.urlSelectVariationValue('Product-Variation', attr, attrValue);
		var masterUrlSplit = masterUrl.split('?');
		var queryString = masterUrlSplit[1];
		
		variationUrl = URLUtils.url('Product-Show','pid',variationProduct.ID);
		var variationURLString = variationUrl.toString() + '&' + queryString;
		linkUrl = variationUrl;
		
		
    } else {
		linkUrl = isSelected
			? variationMaster.urlUnselectVariationValue('Product-Variation', attr)
			: variationMaster.urlSelectVariationValue('Product-Variation', attr, attrValue);
    }

    processedValue.displayName = attrValueDisplayName;
    processedValue.description = attrValueDescription;
    processedValue.plpAttrDisplay = attrValueDisplayName;
    processedValue.compareAttrDisplay = attrValueDisplayName + ' ('+attrValueDescription.replace("|","/") + ')' ;
    processedValue.isSelectable = isSelectable;
    processedValue.isSelected = isSelected;
    processedValue.linkUrl = linkUrl;
    processedValue.plpVariantLinkUrl = variationMaster.urlSelectVariationValue('Product-HitPLPTile', attr, attrValue);
    processedValue.isColorSwatch = swatchImage && attrAttributeId == 'color' ? true : false;
    processedValue.swatchClass = isSelectable ? 'selectable' : 'unselectable';
    processedValue.swatchImageUrl = swatchImage ? swatchImage : undefined;
    processedValue.resourceVariationsLabel = Resource.msgf('product.variations.label', 'product', null, attr.getDisplayName(), attrValueDisplayName);
    processedValue.resourceVariationNotAvailable = Resource.msgf('product.variationnotavailable','product', null, attrAttributeId, attrValueDisplayName);
    processedValue.productID = variationProduct.ID;

    return processedValue;
}

/**
 * Special handling for Variation Group product
 *
 * @param {Object} params
 * @param {dw.catalog.ProductVariationAttribute} params.attr - Variation attribute
 * @param {dw.system.PipelineDictionary} params.pdict
 * @param {Object} params.processedValue - Proxy object representing a variation attribute value
 * @param {dw.catalog.ProductVariationModel} params.variationMaster - Product Variation Model
 * @return {Object}
 */
function _handleVariationGroup (params) {
    const attr = params.attr;
    const pdict = params.pdict;
    const processedValue = params.processedValue;
    const variationMaster = params.variationMaster;

    const product = pdict.Product;
    const variationGroupId = pdict.CurrentHttpParameterMap.vgid;
    const variationGroup = product.isVariationGroup()
        ? product
        : variationGroupId
            ? ProductMgr.getProduct(variationGroupId)
            : undefined;

    if (variationGroup) {
        processedValue.linkUrl += '&vgid=' + variationGroup.getID();

        // variationMaster.getVariationValue returns `null` for attribute that
        // is not assigned to the variation group
        if (variationMaster.getVariationValue(variationGroup, attr) === null) {
            processedValue.swatchClass += ' variation-group-value';
        }
    }

    return processedValue;
}

/**
 * Return a product's variation model or, in the case of a variant, its master product's variation model
 *
 * The "clean" ProductVariationModel of the master without any selected attribute values is used to filter the variants.
 * Otherwise hasOrderableVariants() would use currently selected values resulting in a too narrow selection of variants.
 *
 * @param {dw.catalog.Product} product
 * @return {dw.catalog.ProductVariationModel}
 */
function _getCleanPvm (product) {
    return product.isVariant() ? product.getMasterProduct().getVariationModel() : product.getVariationModel();
}

/**
 * Determines whether an attribute's values are displayed in a swatch
 *
 * @param {String} attrAttributeId - An attribute's attributeID
 * @return {Boolean}
 */
function _getHasSwatch (attrAttributeId) {
    return attrsWithSwatches.indexOf(attrAttributeId) > -1;
}
