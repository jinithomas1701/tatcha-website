/* eslint-disable no-undef */
'use strict';

module.exports = function (object, product, view, options) {
    if (view === 'productLineItem') {
        Object.defineProperty(object, 'pairsWith', {
            enumerable: true,
            value: product.custom.pairsWith && !empty(product.custom.pairsWith.toString()) ? product.custom.pairsWith.toString() : null
        });
        Object.defineProperty(object, 'why', {
            enumerable: true,
            value: product.custom.why && !empty(product.custom.why.toString()) ? product.custom.why.toString() : null
        });
        Object.defineProperty(object, 'upsellDisplay', {
            enumerable: true,
            value: product.custom.upsellDisplay && !empty(product.custom.upsellDisplay.getValue()) ? product.custom.upsellDisplay.getValue() : null
        });
        Object.defineProperty(object, 'customDescription', {
            enumerable: true,
            value: product.custom.benefitsSection1 && !empty(product.custom.benefitsSection1.toString()) ? product.custom.benefitsSection1.toString() : null
        });
        Object.defineProperty(object, 'sordeliveryoption', {
            enumerable: true,
            value: (options.lineItem && options.lineItem.custom)? options.lineItem.custom.sordeliveryoption : ''
        });
        Object.defineProperty(object, 'sorMonthInterval', {
            enumerable: true,
            value: (options.lineItem && options.lineItem.custom)? options.lineItem.custom.SorMonthInterval : ''
        });
        Object.defineProperty(object, 'sorPeriodicity', {
            enumerable: true,
            value: (options.lineItem && options.lineItem.custom)? options.lineItem.custom.SorPeriodicity : ''
        });
        Object.defineProperty(object, 'isEligibleForGiftWrap', {
            enumerable: true,
            value: (product.custom && !empty(product.custom.isEligibleForGiftWrap)) ? product.custom.isEligibleForGiftWrap.toString() : ''
        });
    }
    Object.defineProperty(object, 'secondaryName', {
        enumerable: true,
        value: product.custom.secondaryName && !empty(product.custom.secondaryName) ? product.custom.secondaryName.toString().substring(0,44) : ''
    });
    Object.defineProperty(object, 'uuid', {
        enumerable: true,
        value: product.UUID || ''
    });
    Object.defineProperty(object, 'enableReviewsRatings', {
        enumerable: true,
        value: product.custom.enableReviewsRatings || false
    });
    Object.defineProperty(object, 'giftSetId', {
        enumerable: true,
        value: product.custom.giftSetId || false
    });
    Object.defineProperty(object, 'skinTypeVariation', {
        enumerable: true,
        value: product.custom.skinTypeVariation || ''
    });
    Object.defineProperty(object, 'specialPrice', {
        enumerable: true,
        value: product.custom.specialPrice || ''
    });
    Object.defineProperty(object, 'oosProductStatus', {
        enumerable: true,
        value: product.custom.oosProductStatus && product.custom.oosProductStatus.value ? product.custom.oosProductStatus.value : 'notifyme'
    });
    Object.defineProperty(object, 'productCustomName', {
        enumerable: true,
        value: product.name && product.custom.skinTypeVariation ? product.name + ' - ' + product.custom.skinTypeVariation : ''
    });
    Object.defineProperty(object, 'yotpoAggregateRating', {
        enumerable: true,
        value: product.custom.yotpoAggregateRating ? product.custom.yotpoAggregateRating : ''
    });
    Object.defineProperty(object, 'masterProductID', {
        enumerable: true,
        value: product.variant ? product.variationModel.master.ID : ''
    });
    Object.defineProperty(object, 'isVariantProduct', {
        enumerable: true,
        value: product.variant || false
    });
    Object.defineProperty(object, 'isVariantGroupProduct', {
        enumerable: true,
        value: product.variationGroup || false
    });
    Object.defineProperty(object, 'primaryCategoryName', {
        enumerable: true,
        value: product.primaryCategory && !empty(product.primaryCategory) ? product.primaryCategory.displayName : ''
    });
    Object.defineProperty(object, 'specialCategory', {
        enumerable: true,
        value: (function () {
			var specialCategory = dw.system.Site.current.getCustomPreferenceValue('AddToCartCategory');
			var categories = product.allCategories;
			categories = categories.iterator();
			var hasCategory = false;
		    while (categories.hasNext()) {
		        var category = categories.next();
		        if(category.ID == specialCategory) {
		        	hasCategory = true;
		        	break;
		        }
		    }
		    return hasCategory;
        }())
    });
};
