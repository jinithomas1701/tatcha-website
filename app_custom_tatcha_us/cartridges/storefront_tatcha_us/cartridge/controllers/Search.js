'use strict';

var server = require('server');

var cache = require('*/cartridge/scripts/middleware/cache');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var pageMetaData = require('*/cartridge/scripts/middleware/pageMetaData');
var TagManagerUtils = require('*/cartridge/scripts/util/GoogleTagManager.js');
var securityHeader = require('~/cartridge/scripts/middleware/SecurityHeaders');
var Site = require('dw/system/Site');
var URLUtils = require('dw/web/URLUtils');

/**
 * Search-Show : This endpoint is called when a shopper type a query string in the search box
 * @name Base/Search-Show
 * @function
 * @memberof Search
 * @param {middleware} - cache.applyShortPromotionSensitiveCache
 * @param {middleware} - consentTracking.consent
 * @param {querystringparameter} - q - query string a shopper is searching for
 * @param {querystringparameter} - search-button
 * @param {querystringparameter} - lang - default is en_US
 * @param {querystringparameter} - cgid - Category ID
 * @param {category} - non-sensitive
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
server.get('Show', cache.applyShortPromotionSensitiveCache, securityHeader.setSecurityHeaders, function (req, res, next) {

    var ContentMgr = require('dw/content/ContentMgr');
    var searchHelper = require('*/cartridge/scripts/helpers/searchHelpers');
    var productUtils = require('*/cartridge/scripts/product/ProductUtilsSfra');

    var params = req.httpParameterMap;

    if (req.querystring.cgid) {
        var pageLookupResult = searchHelper.getPageDesignerCategoryPage(req.querystring.cgid);

        if ((pageLookupResult.page && pageLookupResult.page.hasVisibilityRules()) || pageLookupResult.invisiblePage) {
            // the result may be different for another user, do not cache on this level
            // the page itself is a remote include and can still be cached
            res.cachePeriod = 0; // eslint-disable-line no-param-reassign
        }

        if (pageLookupResult.page) {
            res.page(pageLookupResult.page.ID, {}, pageLookupResult.aspectAttributes);
            return next();
        }
    }

    var template = 'search/searchResults';

    var result = searchHelper.search(req, res);

    if (result.searchRedirect) {
    	res.redirect(result.searchRedirect);
    	return next();
    }

    var contentResults = searchHelper.setupContentSearch(req.querystring);
    var productSearch = result.productSearch;

    var categoryHeaderFont = (productSearch.category != null && !empty(productSearch.category.catHeaderFontColor)) ? productSearch.category.catHeaderFontColor : Site.getCurrent().getCustomPreferenceValue('defaultCatHeaderFontColor');

    if(productSearch.emptyQuery && contentResults.contentCount == 0){
        res.redirect(URLUtils.url('Home-Show'));
        return next();
    }else if(productSearch.count > 0 || (contentResults.contentCount > 0 && contentResults.queryPhrase != null)){

        /*var seoAsset = ContentMgr.getContent('searchresultsseo');
        var pageMeta = require('~/cartridge/scripts/meta');
        pageMeta.update(seoAsset);*/

        if (result.category && result.categoryTemplate) {
            template = result.categoryTemplate;
        }

        if (result.apiProductSearch && result.apiProductSearch.searchPhrase) {
            template = 'rendering/category/categoryproducthits';
        }

        //setting session values
        if(productSearch && !empty(req.querystring.q)){
            session.custom.searchParam = req.querystring.q.toLowerCase();
            session.custom.productCount = (productSearch && productSearch.count)? productSearch.count : 0;
        }
        if(session.custom.catPromoBannerAssetsArray){
            delete session.custom.catPromoBannerAssetsArray;
        }

        if (result.category && result.categoryTemplate) {
            template = result.categoryTemplate;
        }

        if (result.apiProductSearch && result.apiProductSearch.searchPhrase) {
            template = 'rendering/category/categoryproducthits';
        }

        if (result.apiProductSearch && (result.apiProductSearch.refinedCategorySearch || result.apiProductSearch.refinedSearch)) {
            if (req.querystring.format == 'ajax') {
                template = 'rendering/category/categoryproducthits_v1';
            }else if(result.category && result.categoryTemplate && (result.category.ID == 'about_auto_delivery')){
            	template = result.categoryTemplate;
            } else{
                template = 'rendering/category/categoryproducthits';
            }
        }

        if ((params && params.is_gc && params.is_gc.stringValue === 'true') || (!empty(result.category) && result.category.ID == 'gift_certificate_products')) {
            // template = 'rendering/category/categoryproducthits_giftcertificate';
            var giftLandingUrl = URLUtils.url('Page-Show', 'cid', 'gift-recipient', 'view', params.view.stringValue, 'is_gc', params.is_gc.stringValue);
            res.redirect(giftLandingUrl);
        }

		//Commented for RDMP-4610: Category>Filter Bug issue
       /* var redirectGridUrl = searchHelper.backButtonDetection(req.session.clickStream);
        if (redirectGridUrl) {
            res.redirect(redirectGridUrl);
        }*/

        //get compare products list
        var compareProductList, attributegroups, comparisonProductsSize, isCompareEnabled;
        if(typeof(productSearch.category) !== 'undefined' && productSearch.category){
            isCompareEnabled = productUtils.isCompareEnabled(productSearch.category.id);
            if(isCompareEnabled){
                compareProductList = productUtils.getCompareProductList(productSearch.category.id);
                var compareUtils = require('*/cartridge/scripts/util/CompareUtils');
                var comparison = compareUtils.get();
                comparison.setCategory(productSearch.category.id);
                attributegroups = comparison.findComparisonAttributeGroups();
                comparisonProductsSize = compareProductList.size();
            }
        }

        <!-- GTM for category page view -->
        var gtmData = TagManagerUtils.getCategoryPageDataLayer();
        var gtmCategoryView;
        if (!empty(gtmData)) {
            gtmCategoryView = JSON.stringify(gtmData);
        }

        res.render(template, {
            productSearch: productSearch,
            maxSlots: result.maxSlots,
            reportingURLs: result.reportingURLs,
            refineurl: result.refineurl,
            category: result.category ? result.category : null,
            canonicalUrl: result.canonicalUrl,
            schemaData: result.schemaData,
            apiProductSearch: result.apiProductSearch,
            ContentSearchResult: contentResults,
            compareEnabled: isCompareEnabled,
            productList: compareProductList,
            attributegroups: attributegroups,
            comparisonProductsSize: comparisonProductsSize,
            enablelazyLoad: false,
            gtmCategoryView: gtmCategoryView,
            categoryHeaderFont: categoryHeaderFont
        });
    }else {
        //no search results
        /*var seoAsset = ContentMgr.getContent('searchresultsseo');
        var pageMeta = require('~/cartridge/scripts/meta');
        pageMeta.update(seoAsset);*/

        var template = 'search/nohits';
        if(empty(productSearch.category) && !empty(req.querystring.q)){
            session.custom.searchParam = req.querystring.q.toLowerCase();
            session.custom.productCount = 0;
        }
        res.render(template, {
            productSearch: productSearch,
            ContentSearchResult: contentResults
        });
    }

    return next();

}, pageMetaData.computedPageMetaData);

server.get('UpdateGrid', cache.applyShortPromotionSensitiveCache, securityHeader.setSecurityHeaders, function (req, res, next) {
	var searchHelper = require('*/cartridge/scripts/helpers/searchHelpers');
    var isScrollTop = req.querystring.scrollToTop ? req.querystring.scrollToTop : null;
    var isSCrollBottom = req.querystring.scrollBottom ? req.querystring.scrollBottom : null;
    var noOfPromoUnits = req.querystring.noOfPromoUnits ? req.querystring.noOfPromoUnits : 0;
	var initialPromoOnLazyLoad = req.querystring.initialPromoOnLazyLoad ? req.querystring.initialPromoOnLazyLoad : null;
	var currentPromoPos = req.querystring.currentPromoPoition ? req.querystring.currentPromoPoition : false;
	var autoDelivery = req.querystring.ad;
    var isGiftLanding = (req.querystring.isGiftLanding && req.querystring.isGiftLanding) === 'true' ? 'true' : 'false';
    var scrollType = '';
    if (isScrollTop !== null) {
    	scrollType = isScrollTop;
    } else if (isSCrollBottom !== null) {
    	scrollType = isSCrollBottom;
    }
    var result = searchHelper.gridSearch(req, res);

    if (dw.system.Site.getCurrent().getCustomPreferenceValue('enableInfiniteScroll') && req.querystring.format === 'page-element') {
        res.render('search/productgridv1', {
            productSearch: result.productSearch,
            apiProductSearch: result.apiProductSearch ? result.apiProductSearch : null,
	        ScrollType: scrollType,
	        pageInfo: autoDelivery && autoDelivery === 'true' ? 'about_auto_delivery' : '',
	        isGiftLanding: isGiftLanding,
	        NoOfPromoUnits: noOfPromoUnits,
	        initialPromoOnLazyLoad: initialPromoOnLazyLoad,
	        currentPromoPos: currentPromoPos,
            enablelazyLoad: true
        });
    } else {
        res.render('rendering/category/categoryproducthits_v1', {
            productSearch: result.productSearch,
            initialPromoOnLazyLoad: initialPromoOnLazyLoad,
            category: (result.productSearch && result.productSearch.category) ? result.productSearch.category : null,
            apiProductSearch: result.apiProductSearch ? result.apiProductSearch : null
        });
    }

    next();
});

module.exports = server.exports();
