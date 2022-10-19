'use strict';

var base = module.superModule;

var collections = require('*/cartridge/scripts/util/collections');
var preferences = require('*/cartridge/config/preferences');
var DEFAULT_PAGE_SIZE = preferences.defaultPageSize ? preferences.defaultPageSize : 12;

function getPagingModel(productHits, count, pageSize, startIndex) {
    var PagingModel = require('dw/web/PagingModel');
    var paging = new PagingModel(productHits, count);

    paging.setStart(startIndex || 0);
    paging.setPageSize(pageSize || DEFAULT_PAGE_SIZE);

    return paging;
}

function getShowMoreUrl(productSearch, httpParams, paging) {
    var showMoreEndpoint = 'Search-UpdateGrid';
    var pageSize = httpParams.sz || DEFAULT_PAGE_SIZE;
    var hitsCount = productSearch.count;
    var nextStart;

    if (pageSize >= hitsCount) {
        return '';
    } else if (pageSize > DEFAULT_PAGE_SIZE) {
        nextStart = pageSize;
    } else {
        var endIdx = paging.getEnd();
        nextStart = endIdx + 1 <= hitsCount ? endIdx + 1 : null;

        if (!nextStart) {
            return '';
        }
    }

    paging.setStart(nextStart);

    var baseUrl = productSearch.url(showMoreEndpoint);
    var finalUrl = paging.appendPaging(baseUrl).append('format', 'page-element').append('ad', false).append('isGiftLanding', false);
    if (paging.currentPage !== paging.start) {
        finalUrl = paging.appendPaging(baseUrl, ((paging.currentPage - 1) * DEFAULT_PAGE_SIZE) - DEFAULT_PAGE_SIZE).append('format', 'page-element').append('ad', false).append('isGiftLanding', false);
    }
    var finalUrl1 = paging.appendPaging(baseUrl).append('format', 'page-element').append('ad', false).append('isGiftLanding', false);
    var topUrl = finalUrl.append('scrollToTop', 'top');
    var bottomUrl = finalUrl1.append('scrollBottom', 'bottom').append('noOfPromoUnits', '0');
    return {
        topUrl: topUrl,
        bottomUrl: bottomUrl
    };
}

/**
 *
 * @param {dw.catalog.ProductSearchModel} productSearch - Product search object
 * @param {Object} httpParams - HTTP query parameters
 * @param {string} sortingRule - Sorting option rule ID
 * @param {dw.util.ArrayList.<dw.catalog.SortingOption>} sortingOptions - Options to sort search
 *     results
 * @param {dw.catalog.Category} rootCategory - Search result's root category if applicable
 */
function ProductSearch(productSearch, httpParams, sortingRule, sortingOptions, rootCategory) {
	base.call(this, productSearch, httpParams, sortingRule, sortingOptions, rootCategory);
	this.isRefinedByAttribute = productSearch.isRefinedByAttribute();
    this.refinedSearch = productSearch.refinedSearch;
    this.emptyQuery = productSearch.emptyQuery;
	var currentStart = httpParams.start || 0;
	if (httpParams.page && !httpParams.sz && !httpParams.start) {
		currentStart = (DEFAULT_PAGE_SIZE * httpParams.page) - DEFAULT_PAGE_SIZE;
	}
	var hitsCount = productSearch.count;
	var paging = getPagingModel(productSearch.productSearchHits, hitsCount, DEFAULT_PAGE_SIZE, currentStart);
    this.start = paging.start;
    this.maxPage = paging.maxPage;
    this.pageNumber = paging.currentPage;
    this.productIds = collections.map(paging.pageElements, function (item) {
        return {
            productID: item.productID,
            productSearchHit: item
        };
    });
    this.showMoreUrl = getShowMoreUrl(productSearch, httpParams, paging);
    if (productSearch.category) {
        this.category.categoryDescription = productSearch.category.custom.categoryDescription;
        this.category.catHeaderFontColor = productSearch.category.custom.catHeaderFontColor;
        this.category.defaultSortingRuleID = (productSearch.category.defaultSortingRule) ? productSearch.category.defaultSortingRule.ID : (sortingOptions.length? sortingOptions[0].ID : null);
    }
}

module.exports = ProductSearch;
