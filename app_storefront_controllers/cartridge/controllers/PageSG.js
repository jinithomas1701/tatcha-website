'use strict';

/**
 * Controller for rendering a content page or a content include.
 * @module controllers/Page
 */

/* API Includes */
var Logger = require('dw/system/Logger');

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');

/**
 * Renders a content page based on the rendering template configured for the page or a default rendering template.
 *
 *  It uses the content ID in the httpParameterMap to find the content asset, updates the page metadata, and renders it using the
 *  content/content/contentpage template. If there is no content ID, it logs a warning and sets the response status to 410.
 */
function show() {

    var Content = app.getModel('Content');
    var content = Content.get(request.httpParameterMap.cid.stringValue);

    if (!content) {
        Logger.warn('Content page for asset ID {0} was requested but asset not found',request.httpParameterMap.cid.stringValue);
        // @FIXME Correct would be to set a 404 status code but that breaks the page as it utilizes
        // remote includes which the WA won't resolve
        response.setStatus(410);
        app.getView().render('error/notfound');
    } else {
        var Search = app.getModel('Search');
        var contentSearchModel = Search.initializeContentSearchModel(request.httpParameterMap);
        contentSearchModel.setContentID(null);
        contentSearchModel.search();

        require('~/cartridge/scripts/meta').update(content);
        require('~/cartridge/scripts/util/SecurityHeaders').setSecurityHeaders();
        app.getView({
            Content: content.object,
            ContentSearchResult: contentSearchModel
        }).render(content.object.template || 'content/content/contentpage');
    }

}


/**
 * Renders a content asset in order to include it into other pages via remote include.
 * If there is no content ID in the httpParameterMap, it logs a warning.
 */
function include() {

    var Content = app.getModel('Content');
    var content = Content.get(request.httpParameterMap.cid.stringValue);

    if (content) {
        app.getView({
            Content: content.object
        }).render(content.object.template || 'content/content/contentassetinclude');
    } else {
        Logger.warn('Content asset with ID {0} was included but not found',request.httpParameterMap.cid.stringValue);
    }
}

/*
 * Export the publicly available controller methods
 */
/** @see module:controllers/Page~show */
exports.Show = guard.ensure(['get'], show);
/** @see module:controllers/Page~include */
exports.Include = guard.ensure(['include'], include);
