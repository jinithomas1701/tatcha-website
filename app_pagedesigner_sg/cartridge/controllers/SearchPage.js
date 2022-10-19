'use strict';

/**
 * Controller handling search, category, and suggestion pages.
 *
 * @module controllers/Search
 */

/* API Includes */
var PagingModel = require('dw/web/PagingModel');
var URLUtils = require('dw/web/URLUtils');
var SearchModel = require('dw/catalog/SearchModel');

/* Script Modules */
var app = require('*/cartridge/scripts/app');
var guard = require('*/cartridge/scripts/guard');
var meta = require('*/cartridge/scripts/meta');

/**
 * Renders a full-featured product search result page.
 * If the httpParameterMap format parameter is set to "ajax" only the product grid is rendered instead of the full page.
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
    var redirectUrl = SearchModel.getSearchRedirect(params.q.value);

    if (redirectUrl) {
        module.superModule.Show();
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
    } else if (productSearchModel.count > 0) {
        module.superModule.Show();
    } else {
        app.getView({
            ProductSearchResult : productSearchModel,
            ContentSearchResult : contentSearchModel
        }).render('search/nohits');
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

    if (productSearchModel.emptyQuery && contentSearchModel.emptyQuery) {
        response.redirect(URLUtils.abs('Home-Show'));
    } else if (contentSearchModel.count > 0) {
        if (contentSearchModel.folder) {
            meta.update(contentSearchModel.folder);
        }
        meta.updatePageMetaTags(contentSearchModel);

        var contentPagingModel = new PagingModel(contentSearchModel.content, contentSearchModel.count);
        contentPagingModel.setPageSize(16);
        if (params.start.submitted) {
            contentPagingModel.setStart(params.start.intValue);
        }

        if (contentSearchModel.folderSearch && !contentSearchModel.refinedFolderSearch && contentSearchModel.folder.template) {
            // Renders a dynamic template
            app.getView({
                ProductSearchResult : productSearchModel,
                ContentSearchResult : contentSearchModel,
                ContentPagingModel  : contentPagingModel
            }).render(contentSearchModel.folder.template);
        } else {
            app.getView({
                ProductSearchResult : productSearchModel,
                ContentSearchResult : contentSearchModel,
                ContentPagingModel  : contentPagingModel
            }).render('rendering/folder/foldercontenthits');
        }
    } else {
        app.getView({
            ProductSearchResult : productSearchModel,
            ContentSearchResult : contentSearchModel
        }).render('search/nohits');
    }
}

/*
 * Web exposed methods
 */
/** Renders a full featured product search result page.
 * @see module:controllers/Search~show
 * */
exports.Show = guard.ensure(['get'], show);

/** Renders a full featured content search result page.
 * @see module:controllers/Search~showContent
 * */
exports.ShowContent = guard.ensure(['get'], showContent);

/** Determines search suggestions based on a given input and renders the JSON response for the list of suggestions.
 * @see module:controllers/Search~getSuggestions */
exports.GetSuggestions = module.superModule.GetSuggestions;
