/**
* Description of the Controller and the logic it provides
*
* @module  controllers/Tatcha
*/

'use strict';

// HINT: New Controller functions

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var Tatcha = require('app_storefront_core/cartridge/scripts/util/Tatcha');
var securityHeader = require('~/cartridge/scripts/util/SecurityHeaders');

/**
* Show gift finder page
*
*/
function show () {
	var categoryOptions = Tatcha.getGFCategoryOptions();
	var giftFinderMetaAsset, pageMeta, Content;
	
	Content = app.getModel('Content');
	giftFinderMetaAsset = Content.get('giftfindermeta');

    pageMeta = require('~/cartridge/scripts/meta');
    pageMeta.update(giftFinderMetaAsset);
    securityHeader.setSecurityHeaders();
	app.getView({
        CategoryDisplayName : categoryOptions.catergoryDisplayName,
        CategoryDisplayID : categoryOptions.catergoryDisplayID
    }).render('content/giftfinder/giftfinder');
}

/**
* Retrive Products with provided search params
*
*/
function retriveProducts () {
	
	var params = request.httpParameterMap;
	//var giftFinderForm = app.getForm('giftfinderform');
	var CatalogMgr = require('dw/catalog/CatalogMgr');
	var ProductSearchModel = require('dw/catalog/ProductSearchModel');
	var PagingModel = require('dw/web/PagingModel');
	var Site = require('dw/system/Site');
	var ArrayList = require('dw/util/ArrayList');
	var URLUtils = require('dw/web/URLUtils');
	
	var minPrice, maxPrice, productPagingModel, gfPagingModel;
	var productSearchModel = new ProductSearchModel();
	var gfSearchModel = new ProductSearchModel();
	
	
	
	if (params.category.value != "" ) {
		productSearchModel.setCategoryID(params.category.value);	
		if (params.priceRange.value != "" && params.priceRange.value != "anyamount"){
			var priceRange = params.priceRange.value.split('-');
			productSearchModel.setPriceMin(Number(priceRange[0]));
			productSearchModel.setPriceMax(Number(priceRange[1]));
			
			//for giftcard
			var giftCardId =  new ArrayList();
			giftCardId.add(Site.getCurrent().getCustomPreferenceValue('EgiftProduct-ID'));
			gfSearchModel.setProductIDs(giftCardId);
			gfSearchModel.search();
		}
		
		productSearchModel.setRecursiveCategorySearch(true);	
		productSearchModel.search();
		
		if ((productSearchModel.count > 1) || productSearchModel.refinedSearch) {
	        productPagingModel = new PagingModel(productSearchModel.productSearchHits, productSearchModel.count);
	        productPagingModel.setPageSize(productSearchModel.count);
	        /*if (params.start.submitted) {
	            productPagingModel.setStart(params.start.intValue);
	        }
	
	        if (params.sz.submitted && request.httpParameterMap.sz.intValue <= 120) {
	        	if(pageNum !== null) {
	        		let pageSize = pageNum * params.sz.intValue;
	        		productPagingModel.setPageSize(pageSize);
	        	} else {
	                if(params.sz.intValue) {
	                    productPagingModel.setPageSize(params.sz.intValue);
	                }            		
	        	}
	        } else if(page !== null && !params.sz.submitted && !params.start.submitted){
	        	let pageSize = 12;
	        	let pageStart = (pageSize * page) - pageSize;
	        	productPagingModel.setStart(pageStart);
	        	productPagingModel.setPageSize(pageSize);
	        } else {
	        	if(pageNum !== null) {
	        		productPagingModel.setPageSize(12*pageNum);
	        	} else {
	        		productPagingModel.setPageSize(12);
	        	}
	        }
	
	        if (productSearchModel.category) {
	            require('~/cartridge/scripts/meta').update(productSearchModel.category);
	        }
	
	        if (productSearchModel.categorySearch && !productSearchModel.refinedCategorySearch && productSearchModel.category.template) {
	            // Renders a dynamic template.
	            app.getView({
	            	PageLoaded: (page && page > 0) ? page : 0,
	                ProductSearchResult: productSearchModel,
	                ContentSearchResult: contentSearchModel,
	                ProductPagingModel: productPagingModel
	            }).render(productSearchModel.category.template);
	        } else {
	
	        	var cat = productSearchModel;
	        	
	        	var template = 'rendering/category/categoryproducthits';
	         	if(!empty(productSearchModel.category) && productSearchModel.category.ID == 'gift_certificate_products'){
	        		template = 'rendering/category/categoryproducthits_giftcertificate';
	        	}
	         	if(!empty(productSearchModel.category) && productSearchModel.category.ID == 'product_recommendations'){
	         		template = 'rendering/category/categoryproducthits_recommendations';
	         	}
	        	
	            //SearchPromo - for displaying search driven banners above the product grid, provided there is a q parameter in the httpParameterMap
	            var searchPromo;
	            if (params.q.value) {
	                searchPromo = ContentMgr.getContent('keyword_' + params.q.value.toLowerCase());
	            }*/
	
	      //}
	        
	    }
		
		if ((gfSearchModel.count >= 1) || gfSearchModel.refinedSearch) {
			gfPagingModel = new PagingModel(gfSearchModel.productSearchHits, gfSearchModel.count)
		}
		
		// Get the category options
		var categoryOptions = Tatcha.getGFCategoryOptions();
		
		var giftFinderMetaAsset;
		
		var Content = app.getModel('Content');
		giftFinderMetaAsset = Content.get('giftfindermeta');

	    var pageMeta = require('~/cartridge/scripts/meta');
	    pageMeta.update(giftFinderMetaAsset);
	    securityHeader.setSecurityHeaders();
		app.getView({
	        ProductSearchResult: productSearchModel,
	        ProductPagingModel: productPagingModel,
	        gfSearchResult: gfSearchModel,
	        gfPagingModel: gfPagingModel,
	        priceRange : params.priceRange.value,
	        gfname: params.gfname.value,
	        category : params.category.value,
	        CategoryDisplayName : categoryOptions.catergoryDisplayName,
	        CategoryDisplayID : categoryOptions.catergoryDisplayID
	    }).render('content/giftfinder/giftfinderresults');
	} else {
		response.redirect(URLUtils.https('GiftFinder-Show')); 
	}
}


/* Exports of the controller */
/** Renders a gift finder page.
 * @see module:controllers/GiftFinder~show 
 * */
exports.Show = guard.ensure(['get'], show);

/** Renders a full featured product search result page.
 * @see module:controllers/GiftFinder~retriveProducts 
 * */
exports.RetriveProducts = guard.ensure(['get'], retriveProducts);