'use strict';

var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');
var PageRenderHelper = require('~/cartridge/experience/utilities/PageRenderHelper.js');

/**
 * Render logic for the dynamiclayout.
 *
 * @param {dw.experience.PageScriptContext} context The page script context object.
 *
 * @returns
 */
module.exports.render = function (context) {
    var model = new HashMap();
    var page = context.page;
    model.page = page;

    // automatically register configured regions
    model.regions = PageRenderHelper.getRegionModelRegistry(page);

    // determine seo meta data
    model.CurrentPageMetaData = PageRenderHelper.getPageMetaData(page);
    model.decorator = PageRenderHelper.determineDecorator(context);

    //get canonical url
    var canonicalUrl = PageRenderHelper.getCanonicalUrl(page);
    if(canonicalUrl){
        model.canonicalUrl = canonicalUrl;
    }

    if (PageRenderHelper.isInEditMode()) {
        dw.system.HookMgr.callHook('app.experience.editmode', 'editmode');
    }

    // render the page
    var ONE_DAY = new Date().getTime() + 1 * 24 * 60 * 60 * 1000;
    response.setExpires(ONE_DAY);
    return new Template('experience/pages/dynamiclayoutcontenthome').render(model).text;
};
