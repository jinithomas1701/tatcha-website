'use strict';

/**
 * Controller that renders product detail pages and snippets or includes used on product detail pages.
 * Also renders product tiles for product listings.
 *
 * @module controllers/Product
 */

var params = request.httpParameterMap;

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var Site = require('dw/system/Site');
var URLUtils = require('dw/web/URLUtils');

/**
 * Renders the product page.
 *
 * If the product is online, gets a ProductView and updates the product data from the httpParameterMap.
 * Renders the product page (product/product template). If the product is not online, sets the response status to 401,
 * and renders an error page (error/notfound template).
 */
function show() {

    const Product = app.getModel('Product');
    let product = Product.get(params.pid.stringValue);
    const currentVariationModel = product.updateVariationSelection(params);
    product = product.isVariationGroup() ? product : getSelectedProduct(product);
    require('~/cartridge/scripts/util/SecurityHeaders').setSecurityHeaders();
    if(product.object.custom.giftSetId){
    	response.redirect(URLUtils.url('Page-Show', 'cid', product.object.custom.giftSetId));
    	return;
    }
    if (product.isVisible()) {
    	//Afterpay changes start
		var sitePreferences =require("int_afterpay_core/cartridge/scripts/util/afterpayUtilities.js").getSitePreferencesUtilities();
		var afterpayEnable = sitePreferences.isAfterpayEnabled();
		if(afterpayEnable){
		require("int_afterpay_core/cartridge/scripts/util/afterpayCallThreshold.js").SetThreshold();
		}
		//Afterpay changes end
        require('~/cartridge/scripts/meta').update(product);
        app.getView('Product', {
            product: product,
            DefaultVariant: product.getVariationModel().getDefaultVariant(),
            CurrentOptionModel: product.updateOptionSelection(params),
            CurrentVariationModel: currentVariationModel
        }).render(product.getTemplate() || 'product/product');
    } else {
        // @FIXME Correct would be to set a 404 status code but that breaks the page as it utilizes
        // remote includes which the Web Adapter won't resolve.
        response.setStatus(404);
        app.getView().render('error/notfound');
    }

}

/**
 * Renders the product detail page.
 *
 * If the product is online, gets a ProductView and updates the product data from the httpParameterMap.
 * Renders the product detail page (product/productdetail template). If the product is not online, sets the response status to 401,
 * and renders an error page (error/notfound template).
 */
function detail() {

    const Product = app.getModel('Product');
    const product = Product.get(params.pid.stringValue);
    var productImgVideo = product.object.custom.autoplayVideoSource.value;
    var videoThumbnailUrl='';

    //getting vimeo thumbnail url
    if (productImgVideo == 'vimeo' && !empty(product.object.custom.vimeoVideoThumbnailUrl)){
    	videoThumbnailUrl = product.object.custom.vimeoVideoThumbnailUrl;
    }

    //Yotpo rich snippet - aggregate ratings
    var yotpoReviewResponse = {};
    if(!empty(product.object.custom.yotpoAggregateRating)){
        var yotpoResponse = product.object.custom.yotpoAggregateRating.split(',');
        yotpoReviewResponse.average_score = yotpoResponse[0];
        yotpoReviewResponse.total_reviews = yotpoResponse[1];
    }
    
    if (product.isVisible()) {
        app.getView('Product', {
            product: product,
            DefaultVariant: product.getVariationModel().getDefaultVariant(),
            CurrentOptionModel: product.updateOptionSelection(params),
            CurrentVariationModel: product.updateVariationSelection(params),
            VideoThumbnailUrl: videoThumbnailUrl,
            YotpoReviewResponse: yotpoReviewResponse
        }).render(product.getTemplate() || 'product/productdetail');
    } else {
        // @FIXME Correct would be to set a 404 status code but that breaks the page as it utilizes
        // remote includes which the WA won't resolve
        response.setStatus(404);
        app.getView().render('error/notfound');
    }

}

/**
 * Returns product availability data as a JSON object.
 *
 * Gets a ProductModel and gets the product ID from the httpParameterMap. If the product is online,
 * renders product availability data as a JSON object.
 * If the product is not online, sets the response status to 401,and renders an error page (error/notfound template).
 */
function getAvailability() {

    var Product = app.getModel('Product');
    var product = Product.get(params.pid.stringValue);

    if (product.isVisible()) {
        let r = require('~/cartridge/scripts/util/Response');

        r.renderJSON(product.getAvailability(params.Quantity.stringValue));
    } else {
        // @FIXME Correct would be to set a 404 status code but that breaks the page as it utilizes
        // remote includes which the WA won't resolve
        response.setStatus(410);
        app.getView().render('error/notfound');
    }

}

function getProductAvailability(product) {
 	var ats = null;
 	var avm = product.object.availabilityModel;
    var invRecordEmpty = !avm.inventoryRecord || avm.inventoryRecord === {};
    ats = invRecordEmpty ? 0 : avm.inventoryRecord.ATS.value.toFixed();
    return ats;
}

function getAvailableProductVariant(product) {
	var Product = app.getModel('Product');
 	var data = null;
    var ats = getProductAvailability(product);
    
    if(ats == 0) {
    	var variationMaster = product.getVariationModel();
    	
    	var variants = variationMaster.getVariants();
    	var variantItr =  variants.iterator();

    	while (variantItr.hasNext()) {
            var prd = variantItr.next();
            if(product.object.ID !== prd.ID) {
            	var prdObject = Product.get(prd.ID);
	    		var prdAts = getProductAvailability(prdObject);
		 		if(prdAts > 0) {
		    		data = prdObject;
            		break;
		    	}
            }
        }
    }
    return data;
}

/**
 * Renders a product tile. This is used within recommendation and search grid result pages.
 * * Gets a ProductModel and gets a product using the product ID in the httpParameterMap.
 * If the product is online, renders a product tile (product/producttile template), used within family and search result pages.
 */
function hitTile() {

    var Product = app.getModel('Product');
    var product = Product.get(params.pid.stringValue);
    var currentHttpParameterMap = request.httpParameterMap;
    
    var prdObj = null;
    
    // If the current product variant is out of stock, get the available variant option.
    //check whether current product variant is OOS & not coming soon
    /*var ats = getProductAvailability(product);
    if(ats == 0 && product.object && product.object.custom.oosProductStatus.value !== 'comingsoon') {
        prdObj = getAvailableProductVariant(product);
    }
    if(prdObj !== null) {
    	product = prdObj;
    }*/
    
    var tileTemplate = '';
    
    if(currentHttpParameterMap && currentHttpParameterMap.isUpdatedProductTile && currentHttpParameterMap.isUpdatedProductTile.stringValue === 'true') {
       tileTemplate = 'product/producttilev1_bs';
    } else {
       tileTemplate = 'product/producttile';
    }

    var minimalView = params.minimalView.stringValue;
    if(minimalView == 'true'){
    	tileTemplate = 'product/producttileminimal';
    }
    
    var cgid = currentHttpParameterMap.cgid ? currentHttpParameterMap.cgid.value : '';

	var isGiftLanding = currentHttpParameterMap.isGiftLanding ? currentHttpParameterMap.isGiftLanding.stringValue : false;
	
	var showCompare = true;
	
	if(isGiftLanding === 'true') {
		showCompare = false;
	}
	
	//for gift finder tiles
	var showVarient = true;
	var isGiftfinder = currentHttpParameterMap.isGiftfinder ? currentHttpParameterMap.isGiftfinder.stringValue : false;
	if(isGiftfinder === 'true') {
		showVarient = false;
	}
    
    if (product.isVisible()) {
        var productView = app.getView('Product', {
            product: product,
            showswatches: true,
            showpricing: true,
            showpromotion: true,
            showrating: true,
            showcompare: showCompare,
            showvarient: showVarient,
            categoryId: cgid
        });

        productView.product = product.object;
        productView.render(product.getTemplate() || tileTemplate);
    }

}


/**
 * Renders a product tile. This is used within size and color changes in PLP pages.
 *
 * Gets a ProductModel and gets a product using the product ID in the httpParameterMap.
 * If the product is online, renders a product tile (product/producttile template), used within family and search result pages.
 */
function hitPLPTile() {

    var Product = app.getModel('Product');
    let product = Product.get(params.pid.stringValue);
    	
    let currentVariationModel = product.updateVariationSelection(params);
    product = product.isVariationGroup() ? product : getSelectedProduct(product);
    
    var tileTemplate = 'product/producthittilev1';

    var minimalView = params.minimalView.stringValue;
    if(minimalView == 'true'){
    	tileTemplate = 'product/producttileminimal';
    }
    
    var showCompare = true;
    
    if(params.showCompare) {
    	showCompare = params.showCompare.booleanValue;
    }
    
    if (product.isVisible()) {
        var productView = app.getView('Product', {
            product: product,
            showswatches: true,
            showpricing: true,
            showpromotion: true,
            showrating: true,
            showcompare: showCompare,
            showvarient: true,
            categoryId: params.cgid.value            
        });

        productView.product = product.object;
        productView.render(product.getTemplate() || tileTemplate);
    }

}


function hitTileGift() {

    var Product = app.getModel('Product');
    var product = Product.get(params.pid.stringValue);
    var tileTemplate = 'product/producttilegift';

    if (product.isVisible()) {
        var productView = app.getView('Product', {
            product: product,
            showswatches: true,
            showpricing: true,
            showpromotion: true,
            showrating: true,
            showcompare: false
        });

        productView.product = product.object;
        productView.render(product.getTemplate() || tileTemplate);
    }

}
/**
 * Renders a product carousel tile.

 */
function hitCarousel() {

    var Product = app.getModel('Product');
    var product = Product.get(params.pid.stringValue);
    var tileTemplate = 'product/carouseltile';
    
    if (product.isVisible()) {
        var productView = app.getView('Product', {
            product: product
        });

        productView.product = product.object;
        productView.render(tileTemplate);
    }
}

function hitPPageCarousel() {
	var Product = app.getModel('Product');
    var product = Product.get(params.pid.stringValue);
    var tileTemplate = 'product/components/productv1/carouseltileppage';
    if (product.isVisible()) {
        var productView = app.getView('Product', {
            product: product
        });

        productView.product = product.object;
        productView.render(tileTemplate);
    }
}


/**
 * Renders a navigation include on product detail pages.
 *
 * Gets a ProductModel and gets a product using the product ID in the httpParameterMap.
 * If the product is online, constructs a search and paging model, executes the search,
 * and renders a navigation include on product detail pages (search/productnav template).
 * Also provides next/back links for customers to traverse a product
 * list, such as a search result list.
 */
function productNavigation() {

    var Product = app.getModel('Product');
    var product = Product.get(params.pid.stringValue);

    if (product.isVisible()) {
        var PagingModel;
        var productPagingModel;

        // Construct the search based on the HTTP params and set the categoryID.
        var Search = app.getModel('Search');
        var productSearchModel = Search.initializeProductSearchModel(params);

        // Reset pid in search.
        productSearchModel.setProductID(null);

        // Special handling if no category ID is given in URL.
        if (!params.cgid.value) {
            var category = null;

            if (product.getPrimaryCategory()) {
                category = product.getPrimaryCategory();
            } else if (product.getVariationModel().getMaster()) {
                category = product.getVariationModel().getMaster().getPrimaryCategory();
            }

            if (category && category.isOnline()) {
                productSearchModel.setCategoryID(category.getID());
            }
        }

        // Execute the product searchs
        productSearchModel.search();

        // construct the paging model
        PagingModel = require('dw/web/PagingModel');
        productPagingModel = new PagingModel(productSearchModel.productSearchHits, productSearchModel.count);
        productPagingModel.setPageSize(3);
        productPagingModel.setStart(params.start.intValue - 2);

        app.getView({
            ProductPagingModel: productPagingModel,
            ProductSearchResult: productSearchModel
        }).render('search/productnav');

    } else {
        // @FIXME Correct would be to set a 404 status code but that breaks the page as it utilizes
        // remote includes which the WA won't resolve
        response.setStatus(410);
        app.getView().render('error/notfound');
    }

}

/**
 * Renders variation selection controls for a given product ID, taken from the httpParameterMap.
 *
 * If the product is online, updates variation information and gets the selected variant. If it is an ajax request, renders the
 * product content page (product/productcontent template), otherwise renders the product page (product/product template).
 * If it is a bonus product, gets information about the bonus discount line item and renders the bonus product include page
 * (pageproduct/components/bonusproduct template). If the product is offline, sets the request status to 401 and renders an
 * error page (error/notfound template).
 */
function variation() {

    const Product = app.getModel('Product');
    const resetAttributes = false;
    let product = Product.get(params.pid.stringValue);

    let currentVariationModel = product.updateVariationSelection(params);
    product = product.isVariationGroup() ? product : getSelectedProduct(product);

    if (product.isVisible()) {
        if (params.source.stringValue === 'bonus') {
            const Cart = app.getModel('Cart');
            const bonusDiscountLineItems = Cart.get().getBonusDiscountLineItems();
            let bonusDiscountLineItem = null;

            for (let i = 0; i < bonusDiscountLineItems.length; i++) {
                if (bonusDiscountLineItems[i].UUID === params.bonusDiscountLineItemUUID.stringValue) {
                    bonusDiscountLineItem = bonusDiscountLineItems[i];
                    break;
                }
            }

            app.getView('Product', {
                product: product,
                CurrentVariationModel: currentVariationModel,
                BonusDiscountLineItem: bonusDiscountLineItem
            }).render('product/components/bonusproduct');
        } else if (params.format.stringValue === 'skinTypeVariation') {
            app.getView('Product', {
                product: product,
                GetImages: true,
                updateVariantContent: true,
                resetAttributes: resetAttributes,
                CurrentVariationModel: currentVariationModel
            }).render('product/productcontent');
        } else if (params.format.stringValue) {
            app.getView('Product', {
                product: product,
                GetImages: true,
                resetAttributes: resetAttributes,
                CurrentVariationModel: currentVariationModel
            }).render('product/productcontent');
        } else {
            app.getView('Product', {
                product: product,
                CurrentVariationModel: currentVariationModel
            }).render('product/product');
        }
    } else {
        // @FIXME Correct would be to set a 404 status code but that breaks the page as it utilizes
        // remote includes which the WA won't resolve
        response.setStatus(410);
        app.getView().render('error/notfound');
    }

}

/**
 * Renders variation selection controls for the product set item identified by a given product ID, taken from the httpParameterMap.
 *
 * If the product is online, updates variation information and gets the selected variant. If it is an ajax request, renders the
 * product set page (product/components/productsetproduct template), otherwise renders the product page (product/product template).
 *  If the product is offline, sets the request status to 401 and renders an error page (error/notfound template).
 *
 */
function variationPS() {

    var Product = app.getModel('Product');
    var product = Product.get(params.pid.stringValue);

    if (product.isVisible()) {

        var productView = app.getView('Product', {
            product: product
        });

        var productVariationSelections = productView.getProductVariationSelections(params);
        product = Product.get(productVariationSelections.SelectedProduct);

        if (product.isMaster()) {
            product = Product.get(product.getVariationModel().getDefaultVariant());
        }

        if (params.format.stringValue) {
            app.getView('Product', {product: product}).render('product/components/productsetproduct');
        } else {
            app.getView('Product', {product: product}).render('product/product');
        }
    } else {
        // @FIXME Correct would be to set a 404 status code but that breaks the page as it utilizes
        // remote includes which the WA won't resolve
        response.setStatus(410);
        app.getView().render('error/notfound');
    }

}

/**
 * Renders the last visited products based on the session information (product/lastvisited template).
 */
function includeLastVisited() {
    app.getView({
        LastVisitedProducts: app.getModel('RecentlyViewedItems').getRecentlyViewedProducts(3)
    }).render('product/lastvisited');
}

/**
 * Renders a list of bonus products for a bonus discount line item (product/bonusproductgrid template).
 */
function getBonusProducts() {
    var Cart = app.getModel('Cart');
    var getBonusDiscountLineItemDS = require('app_storefront_core/cartridge/scripts/cart/GetBonusDiscountLineItem');
    var currentHttpParameterMap = request.httpParameterMap;
    var bonusDiscountLineItems = Cart.get().getBonusDiscountLineItems();
    var bonusDiscountLineItem;

    bonusDiscountLineItem = getBonusDiscountLineItemDS.getBonusDiscountLineItem(bonusDiscountLineItems, currentHttpParameterMap.bonusDiscountLineItemUUID);
    var bpCount = bonusDiscountLineItem.bonusProducts.length;
    var bpTotal;
    var bonusDiscountProducts;
    if (currentHttpParameterMap.pageSize && !bpCount) {

        var BPLIObj = getBonusDiscountLineItemDS.getBonusPLIs(currentHttpParameterMap.pageSize, currentHttpParameterMap.pageStart, bonusDiscountLineItem);

        bpTotal = BPLIObj.bpTotal;
        bonusDiscountProducts = BPLIObj.bonusDiscountProducts;
    } else {
        bpTotal = -1;
    }
    
    var template = 'product/bonusproductgrid';
    if (currentHttpParameterMap.usetatchamodal == 'true') {
    	template = 'product/bonusproductlistmodal';
    }

    // Single Page Checkout
    if(require('dw/system/Site').getCurrent().getCustomPreferenceValue('enableSinglePageCheckout')) {
    	if (request.httpParameterMap.format.stringValue === 'spcheckout') {
    		template = 'product/bonuscheckoutproductgrid';
    	}    	
    } 
    
    
    app.getView({
        BonusDiscountLineItem: bonusDiscountLineItem,
        BPTotal: bpTotal,
        BonusDiscountProducts: bonusDiscountProducts
    }).render(template);

}

/**
 * Renders a set item view for a given product ID, taken from the httpParameterMap pid parameter.
 * If the product is online, get a ProductView and renders the product set page (product/components/productsetproduct template).
*  If the product is offline, sets the request status to 401 and renders an error page (error/notfound template).
*/
function getSetItem() {
    var currentVariationModel;
    var Product = app.getModel('Product');
    var product = Product.get(params.pid.stringValue);
    product = getSelectedProduct(product);
    currentVariationModel = product.updateVariationSelection(params);

    if (product.isVisible()) {
        app.getView('Product', {
            product: product,
            CurrentVariationModel: currentVariationModel,
            isSet: true
        }).render('product/components/productsetproduct');
    } else {
        // @FIXME Correct would be to set a 404 status code but that breaks the page as it utilizes
        // remote includes which the WA won't resolve
        response.setStatus(410);
        app.getView().render('error/notfound');
    }

}

/**
 * Checks whether a given product has all required attributes selected, and returns the selected variant if true
 *
 * @param {dw.catalog.Product} product
 * @returns {dw.catalog.Product} - Either input product or selected product variant if all attributes selected
 */
function getSelectedProduct (product) {
    const currentVariationModel = product.updateVariationSelection(params);
    let selectedVariant;

    if (currentVariationModel) {
        selectedVariant = currentVariationModel.getSelectedVariant();
        if (selectedVariant) {
            product = app.getModel('Product').get(selectedVariant);
        }
    }

    return product;
}

/**
 * Renders the product detail page within the context of a category.
 * Calls the {@link module:controllers/Product~show|show} function.
 * __Important:__ this function is not obsolete and must remain as it is used by hardcoded platform rewrite rules.
 */
function showInCategory() {
    show();
}

/**
 * Renders a product based on the tatcha css tile. 
 *
 * Gets a ProductModel and gets a product using the product ID in the httpParameterMap.
 * If the product is online, renders a product tile (product/producttile template), used within family and search result pages.
 */
function productTile() {
	    
    var pid = params.pid.stringValue;
    var parentpid = params.parentpid.stringValue;
    var page = params.page.stringValue;
    
    if(!empty(pid)){
    	
    	try {    		
        	var Product = app.getModel('Product');
    		var product = Product.get(pid);
    		var parentProduct = Product.get(parentpid);
    		var template = 'product/producttile';
    		if(!empty(page) && page =='productuseitwith'){
    			template = 'product/productuseitwith';
    		} else if(!empty(page) && page =='P-PageProductuseitwith'){
                template = 'product/components/productv1/productuseitwith_v1';
            }
            if (!empty(product) && product.isVisible()) {
                var productView = app.getView('Product', {
                    product: product,
                    parentProduct: parentProduct,
                    showswatches: true,
                    showpricing: true,
                    showpromotion: true,
                    showrating: true,
                    showcompare: true
                });
                
                productView.product = product.object;
                productView.parentProduct = parentProduct.object;
                productView.render(product.getTemplate() || template);
            }   
    	} catch(err){}
    	
 	
    }
}

/**
 * Renders a product's content area. 
 *
 * Gets a ProductModel and gets a product using the product ID in the httpParameterMap.
 * If the product is online, renders a product tile (product/components/productcontentblocks template), used within family and search result pages.
 */
function getProductContent() {
	    
    var pid = params.pid.stringValue;
    
    if(!empty(pid)){    	
    	try {    		
        	var Product = app.getModel('Product');
    		var product = Product.get(pid);
            if (!empty(product) && product.isVisible()) {                
                app.getView('Product', {
                    product: product,
                    ignoreVariantCheck: true
                }).render('product/components/productcontentblocks');
                
            }   
    	} catch(err){}

    }
}


function showProductTileIcons() {
	var pid = request.httpParameterMap.pid.stringValue;
	var showcompare = request.httpParameterMap.showcompare.stringValue;
	var categoryId = request.httpParameterMap.categoryId.stringValue;
	var uuid = request.httpParameterMap.uuid.stringValue;
	var compareChecked = request.httpParameterMap.compareChecked ? request.httpParameterMap.compareChecked.booleanValue : false;
	
	var Product = app.getModel('Product');
	var product = Product.get(pid);
	app.getView({
		pid: request.httpParameterMap.pid.stringValue,
		product: product,
		showcompare: showcompare,
		categoryId: categoryId,
		uuid: uuid
	}).render('product/components/producttileicons');
}


/**
 * @input pid
 * @output if pid is in 'automat' category footer with Automat script, without zendesk chat will be returned,
 * else normal footer with zendesk chat
 * ***/
function hasAutomatEnabled() {
	
	var hasCategory = false;
	try {
		var pid = request.httpParameterMap.pid.stringValue;
		
		if(pid) {
			var Product = app.getModel('Product');
			var product = Product.get(pid);
			var automatcategory = 'automat';
			   
			var categories = product.getAllCategories();
			categories = categories.iterator();
			   
			while (categories.hasNext()) {
			    var category = categories.next();
			    if(category.ID == automatcategory) {
			           hasCategory = true;
			           break;
			    }
			}
		}
	} catch(e) {
		
	}
	
	if(hasCategory) {
		app.getView().render('product/productautomatvsawidget');
	}
	
	return false;
}

/*
 * Web exposed methods
 */
/**
 * Renders the product template.
 * @see module:controllers/Product~show
 */
exports.Show = guard.ensure(['get'], show);

/**
 * Renders the product detail page within the context of a category.
 * @see module:controllers/Product~showInCategory
 */
exports.ShowInCategory = guard.ensure(['get'], showInCategory);

/**
 * Renders the productdetail template.
 * @see module:controllers/Product~detail
 */
exports.Detail = guard.ensure(['get'], detail);

/**
 * Returns product availability data as a JSON object.
 * @see module:controllers/Product~getAvailability
 */
exports.GetAvailability = guard.ensure(['get'], getAvailability);

/**
 * Renders a product tile, used within family and search result pages.
 * @see module:controllers/Product~hitTile
 */
exports.HitTile = guard.ensure(['get'], hitTile);

/**
 * Renders a product tile, used within PLP page after size or color is changed.
 * @see module:controllers/Product~hitPLPTile
 */
exports.HitPLPTile = guard.ensure(['get'], hitPLPTile);

/**
 * Renders a product tile, used within family and search result pages.
 * @see module:controllers/Product~hitTileGift
 */
exports.HitTileGift = guard.ensure(['get'], hitTileGift);

/**
 * Renders a carousel tile, used within family and search result pages.
 * @see module:controllers/Product~hitTile
 */
exports.HitCarousel = guard.ensure(['get'], hitCarousel);

/**
 * Renders a navigation include on product detail pages.
 * @see module:controllers/Product~productNavigation
 */
exports.Productnav = guard.ensure(['get'], productNavigation);

/**
 * Renders variation selection controls for a given product ID.
 * @see module:controllers/Product~variation
 */
exports.Variation = guard.ensure(['get'], variation);

/**
 * Renders variation selection controls for the product set item identified by the given product ID.
 * @see module:controllers/Product~variationPS
 */
exports.VariationPS = guard.ensure(['get'], variationPS);

/**
 * Renders the last visited products based on the session information.
 * @see module:controllers/Product~includeLastVisited
 */
exports.IncludeLastVisited = guard.ensure(['get'], includeLastVisited);

/**
 * Renders a list of bonus products for a bonus discount line item.
 * @see module:controllers/Product~getBonusProducts
 */
exports.GetBonusProducts = guard.ensure(['get'], getBonusProducts);

/**
 * Renders a set item view for the given product ID.
 * @see module:controllers/Product~getSetItem
 */
exports.GetSetItem = guard.ensure(['get'], getSetItem);

/**
 * Renders a set item view for the given product ID.
 * @see module:controllers/Product~productTile
 */
exports.ProductTile = guard.ensure(['get'], productTile);

/**
 * Renders content  for the given product ID.
 * @see module:controllers/Product~getProductContent
 */
exports.GetProductContent = guard.ensure(['get'], getProductContent);
exports.ShowProductTileIcons = guard.ensure(['get'], showProductTileIcons);
exports.HasAutomatEnabled = guard.ensure(['get'], hasAutomatEnabled);
exports.HitPPageCarousel = guard.ensure(['get'], hitPPageCarousel);
