'use strict';

var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');
var PageRenderHelper = require('~/cartridge/experience/utilities/PageRenderHelper.js');

/**
 * Render logic for the assets.einsteinproductrecommendation.
 */
module.exports.render = function (context) {
    var model = new HashMap();
    var content = context.content;

    var category = content.category;
    var recommender = content.recommender;
    model.limit = parseInt(content.count) || 1;

    if (recommender) {
        model.recommender = recommender.value;
    } else {
        throw new Error('No recommender available');
    }
    model.productLoadUrl = dw.web.URLUtils.abs('AsyncComponents-Load');

    if (model.limit > 1) {
        model.id = 'carousel-' + PageRenderHelper.safeCSSClass(context.component.getID());
        return new Template('experience/components/einstein/noanchor-to-productcarousel').render(model).text;
    }
    return new Template('experience/components/einstein/noanchor-to-producttile').render(model).text;
};

