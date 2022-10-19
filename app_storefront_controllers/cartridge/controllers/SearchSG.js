'use strict';

/**
 * Controller handling search, category, and suggestion pages.
 *
 * @module controllers/Search
 */

/* API Includes */
var PagingModel = require('dw/web/PagingModel');
var URLUtils = require('dw/web/URLUtils');
var ContentMgr = require('dw/content/ContentMgr');
var SearchModel = require('dw/catalog/SearchModel');
var PropertyComparator = require('dw/util/PropertyComparator');

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');

/**
 * Renders a full-featured product search result page.
 * If the httpParameterMao format parameter is set to "ajax" only the product grid is rendered instead of the full page.
 *
 * Checks for search redirects configured in Business Manager based on the query parameters in the
 * httpParameterMap. If a search redirect is found, renders the redirect (util/redirect template).
 * Constructs the search based on the HTTP params and sets the categoryID. Executes the product search and then the
 * content asset search.
 *
 * If no search term, search parameter or refinement was specified for the search and redirects
 * to the Home controller Show function. If there are any product search results
 * for a simple category search, it dynamically renders the category page for the category searched.
 *
 * If the search query included category refinements, or is a keyword search it renders a product hits page for the category
 * (rendering/category/categoryproducthits template).
 * If only one product is found, renders the product detail page for that product.
 * If there are no product results found, renders the nohits page (search/nohits template).
 * @see {@link module:controllers/Search~showProductGrid|showProductGrid} function}.
 */
function show() {

    var params = request.httpParameterMap;
    require('~/cartridge/scripts/util/SecurityHeaders').setSecurityHeaders();
    if (params.format.stringValue === 'ajax' || params.format.stringValue === 'page-element') {
    	if (params.fdid && params.fdid.value === 'blog') {
    		showBlogGrid();
    		return;
    	} else {
    		showProductGrid();
            return;
    	}
    }

    var redirectUrl = SearchModel.getSearchRedirect(params.q.value);
    var pageNum = params.pageNum ? params.pageNum.intValue : null;
    var page = params.page ? params.page.intValue :  null;
    
    if (redirectUrl){
        app.getView({
            Location: redirectUrl.location,
            CacheTag: true
        }).render('util/redirect');
        return;
    }

    // Constructs the search based on the HTTP params and sets the categoryID.
    var Search = app.getModel('Search');
    var productSearchModel = Search.initializeProductSearchModel(params);
    var contentSearchModel = Search.initializeContentSearchModel(params);

    // execute the product search
    productSearchModel.search();
    contentSearchModel.search();

    if (productSearchModel.emptyQuery && contentSearchModel.emptyQuery) {
        response.redirect(URLUtils.abs('Home-Show'));
    } else if (productSearchModel.count > 0 || (contentSearchModel.count > 0 && contentSearchModel.searchPhrase !== null)) {
    	
        var Content = require('~/cartridge/scripts/app').getModel('Content');
        var seoAsset = Content.get('searchresultsseo');

        var pageMeta = require('~/cartridge/scripts/meta');
        pageMeta.update(seoAsset);

        if ((productSearchModel.count > 1) || productSearchModel.refinedSearch || (contentSearchModel.count > 0)) {
            var productPagingModel = new PagingModel(productSearchModel.productSearchHits, productSearchModel.count);
            if (params.start.submitted) {
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

			if(productSearchModel && !empty(params.q.value)) {
				session.custom.searchParam = params.q.value.toLowerCase();
				session.custom.productCount = (productSearchModel && productSearchModel.count) ? productSearchModel.count : 0;
			}
			if(session.custom.catPromoBannerAssetsArray){
				delete session.custom.catPromoBannerAssetsArray;
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
            	
             	/*if(!empty(productSearchModel.category) && productSearchModel.category.ID == 'gift_certificate_products'){
            		template = 'rendering/category/categoryproducthits_giftcertificate';
            	}*/
            	
            	if((params && params.is_gc && params.is_gc.stringValue === 'true') || (!empty(productSearchModel.category) && productSearchModel.category.ID == 'gift_certificate_products')) {
            		template = 'rendering/category/categoryproducthits_giftcertificate';
            	}
            	
             	if(!empty(productSearchModel.category) && productSearchModel.category.ID == 'product_recommendations'){
             		template = 'rendering/category/categoryproducthits_recommendations';
             	}
            	
                //SearchPromo - for displaying search driven banners above the product grid, provided there is a q parameter in the httpParameterMap
                var searchPromo;
                if (params.q.value) {
                    searchPromo = ContentMgr.getContent('keyword_' + params.q.value.toLowerCase());
					
                }

                app.getView({
                    ProductSearchResult: productSearchModel,
                    ContentSearchResult: contentSearchModel,
                    ProductPagingModel: productPagingModel,
                    SearchPromo: searchPromo,
                    Is_GC: params.is_gc ? params.is_gc : false
                }).render(template);
            }
            
        } else {
            var targetProduct = productSearchModel.getProductSearchHits().next();
            var productID = targetProduct.getProduct().getID();

            // If the target was not a master, simply use the product ID.
            if (targetProduct.getProduct().isMaster()) {

                // In the case of a variation master, the master is the representative for
                // all its variants. If there is only one variant, return the variant's
                // product ID.
                var iter = productSearchModel.getProductSearchHits();
                if (iter.hasNext()) {
                    var productSearchHit = iter.next();
                    if (productSearchHit.getRepresentedProducts().size() === 1) {
                        productID = productSearchHit.getFirstRepresentedProductID();
                    }
                }
            }

            app.getView({
                Location: URLUtils.http('Product-Show', 'pid', productID)
            }).render('util/redirect');

        }
    } else if (params.fdid && params.fdid.value === 'blog' && contentSearchModel.folder && contentSearchModel.folder.onlineContent.length > 0){
    	
    	//creating the date wise sorted list
    	var blogPage = params.blogPage ? params.blogPage.intValue : null;
    	var contentList = new dw.util.ArrayList(contentSearchModel.folder.onlineContent);
    	var propertyComparator = new PropertyComparator("custom.date", false);
    	contentList.sort(propertyComparator);
    	
    	var contentPagingModel = new PagingModel(contentList.iterator(), contentList.size());
    	
    	if (params.start.submitted) {
    		contentPagingModel.setStart(params.start.intValue);
        }

        if (params.sz.submitted) {
        	if(blogPage !== null) {
        		let contentSize = params.sz.intValue * blogPage;
        		contentPagingModel.setPageSize(contentSize);
        	} else {
        		contentPagingModel.setPageSize(params.sz.intValue);
        	}
        	
        } else {
        	if(blogPage !== null) {
        		let blogContentSize = 12 * blogPage;
        		contentPagingModel.setPageSize(blogContentSize);
        	} else {
        		contentPagingModel.setPageSize(12);
        	}
        }
        
        
        var Content = require('~/cartridge/scripts/app').getModel('Content');
        var seoAsset = Content.get('blogseo');

        var pageMeta = require('~/cartridge/scripts/meta');
        pageMeta.update(seoAsset);

        
    	app.getView({
    		ContentSearchResult: contentSearchModel,
    		ContentPagingModel: contentPagingModel
    	}).render('content/blog/blog-home');
    	
    } else {
    	
        var Content = require('~/cartridge/scripts/app').getModel('Content');
        var seoAsset = Content.get('searchresultsseo');

        var pageMeta = require('~/cartridge/scripts/meta');
        pageMeta.update(seoAsset);
        
        var template = 'search/nohits';

		if(!empty(params.q.value) && empty(productSearchModel.category)) {
			session.custom.searchParam = params.q.value.toLowerCase();
			session.custom.productCount = 0;
		}
        
       	if(!empty(productSearchModel.category) && productSearchModel.category.ID == 'gift_certificate_products'){
            		template = 'rendering/category/categoryproducthits_giftcertificate';
        }
        
        app.getView({
            ProductSearchResult: productSearchModel,
            ContentSearchResult: contentSearchModel
        }).render(template);
    }

}


/**
 * Renders a full-featured content search result page.
 *
 * Constructs the search based on the httpParameterMap params and executes the product search and then the
 * content asset search.
 *
 * If no search term, search parameter or refinement was specified for the search, it redirects
 * to the Home controller Show function. If there are any content search results
 * for a simple folder search, it dynamically renders the content asset page for the folder searched.
 * If the search included folder refinements, it renders a folder hits page for the folder
 * (rendering/folder/foldercontenthits template).
 *
 * If there are no product results found, renders the nohits page (search/nohits template).
 */
function showContent() {

    var params = request.httpParameterMap;

    var Search = app.getModel('Search');
    var productSearchModel = Search.initializeProductSearchModel(params);
    var contentSearchModel = Search.initializeContentSearchModel(params);

    // Executes the product search.
    productSearchModel.search();
    contentSearchModel.search();
    require('~/cartridge/scripts/util/SecurityHeaders').setSecurityHeaders();
    if (productSearchModel.emptyQuery && contentSearchModel.emptyQuery) {
        response.redirect(URLUtils.abs('Home-Show'));
    } else if (contentSearchModel.count > 0) {

        var contentPagingModel = new PagingModel(contentSearchModel.content, contentSearchModel.count);
        contentPagingModel.setPageSize(16);
        if (params.start.submitted) {
            contentPagingModel.setStart(params.start.intValue);
        }

        if (contentSearchModel.folderSearch && !contentSearchModel.refinedFolderSearch && contentSearchModel.folder.template) {
            // Renders a dynamic template
            app.getView({
                ProductSearchResult: productSearchModel,
                ContentSearchResult: contentSearchModel,
                ContentPagingModel: contentPagingModel
            }).render(contentSearchModel.folder.template);
        } else {
            app.getView({
                ProductSearchResult: productSearchModel,
                ContentSearchResult: contentSearchModel,
                ContentPagingModel: contentPagingModel
            }).render('rendering/folder/foldercontenthits');
        }
    } else {
        app.getView({
            ProductSearchResult: productSearchModel,
            ContentSearchResult: contentSearchModel
        }).render('search/nohits');
    }

}

/**
 * Renders the search suggestion page (search/suggestions template).
 */
function getSuggestions() {

    //app.getView().render('search/suggestions');
	app.getView().render('search/searchsuggestions_new');	
}

/**
 * Renders the partial content of the product grid of a search result as rich HTML.
 *
 * Constructs the search based on the httpParameterMap parameters and executes the product search and then the
 * content asset search. Constructs a paging model and determines whether the infinite scrolling feature is enabled.
 *
 * If there are any product search results for a simple category search, it dynamically renders the category page
 * for the category searched.
 *
 * If the search query included category refinements or is a keyword search, it renders a product hits page for the category
 * (rendering/category/categoryproducthits template).
 */
function showProductGrid() {

    var params = request.httpParameterMap;
    var isScrollTop = params.scrollToTop ? params.scrollToTop.stringValue : null;
    var isSCrollBottom = params.scrollBottom ? params.scrollBottom.stringValue : null;
    var noOfPromoUnits = params.noOfPromoUnits ? params.noOfPromoUnits.stringValue : 0;
	var initialPromoOnLazyLoad = params.initialPromoOnLazyLoad ? params.initialPromoOnLazyLoad: null;
	var currentPromoPos = params.currentPromoPoition ? params.currentPromoPoition: false;

    // Constructs the search based on the HTTP params and sets the categoryID.
    var Search = app.getModel('Search');
    var productSearchModel = Search.initializeProductSearchModel(params);
    var contentSearchModel = Search.initializeContentSearchModel(params);

    // Executes the product search.
    productSearchModel.search();
    contentSearchModel.search();

    var productPagingModel = new PagingModel(productSearchModel.productSearchHits, productSearchModel.count);
    if (params.start.submitted) {
        productPagingModel.setStart(params.start.intValue);
    }

    if (params.sz.submitted && params.sz.intValue <= 60) {
        productPagingModel.setPageSize(params.sz.intValue);
    } else {
        productPagingModel.setPageSize(12);
    }
    
    var scrollType = '';
    if(isScrollTop !== null) {
    	scrollType = isScrollTop;
    } else if (isSCrollBottom !== null) {
    	scrollType = isSCrollBottom;
    } else {
    	scrollType = '';
    }

    if (dw.system.Site.getCurrent().getCustomPreferenceValue('enableInfiniteScroll') && params.format.stringValue === 'page-element') {
        var autoDelivery = params.ad.stringValue;
        var isGiftLanding = (params.isGiftLanding && params.isGiftLanding.stringValue) === 'true' ? 'true' : 'false';
        var template = 'search/productgridwrapper';

        app.getView({
        	ScrollType: scrollType,
        	pageInfo: autoDelivery && autoDelivery === 'true' ? 'about_auto_delivery' : '',
            ProductSearchResult: productSearchModel,
            ProductPagingModel: productPagingModel,
            NoOfPromoUnits: noOfPromoUnits,
            isGiftLanding: isGiftLanding,
			initialPromoOnLazyLoad: initialPromoOnLazyLoad,
			currentPromoPos: currentPromoPos
        }).render(template);
    } else {
        if (productSearchModel.categorySearch && !productSearchModel.refinedCategorySearch && productSearchModel.category.template) {
            // Renders a dynamic template.
            app.getView({
                ProductSearchResult: productSearchModel,
                ContentSearchResult: contentSearchModel,
                ProductPagingModel: productPagingModel,
                NoOfPromoUnits: noOfPromoUnits,
				initialPromoOnLazyLoad: initialPromoOnLazyLoad,
				currentPromoPos:currentPromoPos
            }).render(productSearchModel.category.template);
        } else {
            app.getView({
                ProductSearchResult: productSearchModel,
                ContentSearchResult: contentSearchModel,
                ProductPagingModel: productPagingModel,
                NoOfPromoUnits: noOfPromoUnits,
				initialPromoOnLazyLoad: initialPromoOnLazyLoad,
				currentPromoPos: currentPromoPos
            }).render('rendering/category/categoryproducthits');
        }
    }

}

/**
 * Renders the partial content of the blog as rich HTML.
 *
 * Constructs the search based on the httpParameterMap parameters and executes the content search and
 * constructs a paging model.
 *
 */
function showBlogGrid() {
	var params = request.httpParameterMap;

    // Constructs the search based on the HTTP params.
    var Search = app.getModel('Search');
    var contentSearchModel = Search.initializeContentSearchModel(params);

    // Executes the content search.
    contentSearchModel.search();
    
    //creating the date wise sorted list
    var contentList = new dw.util.ArrayList(contentSearchModel.folder.onlineContent);
	var propertyComparator = new PropertyComparator("custom.date", false);
	contentList.sort(propertyComparator);
	
	var contentPagingModel = new PagingModel(contentList.iterator(), contentList.size());
	
	if (params.start.submitted) {
		contentPagingModel.setStart(params.start.intValue);
    }

    if (params.sz.submitted) {
    	contentPagingModel.setPageSize(params.sz.intValue);
    } else {
    	contentPagingModel.setPageSize(12);
    }
    
	app.getView({
		ContentSearchResult: contentSearchModel,
		ContentPagingModel: contentPagingModel
	}).render('content/blog/blogwrapper');
}


function blog() {
	var params = request.httpParameterMap;
	
	var Search = app.getModel('Search');
    var contentSearchModel = Search.initializeContentSearchModel(params);

    // execute the product search
    contentSearchModel.search();
    
  //creating the date wise sorted list
	var blogPage = params.blogPage ? params.blogPage.intValue : null;
	var folder = new dw.content.ContentMgr.getFolder('blog');
	var contentList = new dw.util.ArrayList(folder.onlineContent);
	var propertyComparator = new PropertyComparator("custom.date", false);
	contentList.sort(propertyComparator);
	
	var contentPagingModel = new PagingModel(contentList.iterator(), contentList.size());
	
	if (params.start.submitted) {
		contentPagingModel.setStart(params.start.intValue);
    }

    if (params.sz.submitted) {
    	if(blogPage !== null) {
    		let contentSize = params.sz.intValue * blogPage;
    		contentPagingModel.setPageSize(contentSize);
    	} else {
    		contentPagingModel.setPageSize(params.sz.intValue);
    	}
    	
    } else {
    	if(blogPage !== null) {
    		let blogContentSize = 12 * blogPage;
    		contentPagingModel.setPageSize(blogContentSize);
    	} else {
    		contentPagingModel.setPageSize(12);
    	}
    }
    
    
    var Content = require('~/cartridge/scripts/app').getModel('Content');
    var seoAsset = Content.get('blogseo');

    var pageMeta = require('~/cartridge/scripts/meta');
    pageMeta.update(seoAsset);

    
	app.getView({
		ContentSearchResult: contentSearchModel,
		ContentPagingModel: contentPagingModel
	}).render('content/blog/blog-home');
	
}

/*
 * Web exposed methods
 */
/** Renders a full featured product search result page.
 * @see module:controllers/Search~show 
 * */
exports.Show            = guard.ensure(['get'], show);

/** Renders a full featured content search result page.
 * @see module:controllers/Search~showContent 
 * */
exports.ShowContent     = guard.ensure(['get'], showContent);

/** Determines search suggestions based on a given input and renders the JSON response for the list of suggestions.
 * @see module:controllers/Search~getSuggestions */
exports.GetSuggestions = guard.ensure(['get'], getSuggestions);

exports.Blog = guard.ensure(['get'], blog);