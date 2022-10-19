'use strict';

var StringUtils = require('dw/util/StringUtils');

module.exports = function (object, product) {
    Object.defineProperty(object, 'marketingFlag', {
        enumerable: true,
        value: (function () {
			var marketingFlag ='';
            var excludedCategory=dw.catalog.CatalogMgr.getCategory("excluded_from_sale");
			var hasExcludeCategory = false;
			var onlineCategories=product.getOnlineCategories();
			var catIterator = onlineCategories.iterator();
		    while (catIterator.hasNext()) {
		        var category = catIterator.next();
		        if(category.ID == "excluded_from_sale") {
		        	hasExcludeCategory = true;
		        	break;
		        }
		    }
			if (hasExcludeCategory) {
				marketingFlag = '<span class="product-marketing-flag">'+excludedCategory.displayName +'</span>';
			}
			if((dw.util.StringUtils.trim(product.custom.marketingFlag1) != '' || dw.util.StringUtils.trim(product.custom.marketingFlag2) != '') && !hasExcludeCategory){
				if(dw.util.StringUtils.trim(product.custom.marketingFlag1) !='' ){
					marketingFlag = '<span class="product-marketing-flag">'+product.custom.marketingFlag1+'</span>';
				}
				var hasLowStockWarning = false;
				if(dw.util.StringUtils.trim(product.custom.marketingFlag1) != '' && (dw.util.StringUtils.trim(product.custom.marketingFlag2) != '' || hasLowStockWarning)){
					marketingFlag = marketingFlag + '<span class="separator">•</span>';
				}
				if(hasLowStockWarning) {
					marketingFlag = marketingFlag + '<span class="product-marketing-flag">Low in stock</span>';
				} else if(dw.util.StringUtils.trim(product.custom.marketingFlag2) !=''){
					marketingFlag = marketingFlag + '<span class="product-marketing-flag">'+product.custom.marketingFlag2+'</span>';
				}
			}
            return marketingFlag;
        }())
    });
};
