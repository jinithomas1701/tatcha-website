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

    //  show a maximum of 6 as the grid component style is optimized for 6 items
    model.limit = 6;
    model.recommender = '';
    if (recommender) {
        model.recommender = recommender.value;
    } else {
        throw new Error('No recommender available');
    }
    model.productLoadUrl = dw.web.URLUtils.abs('AsyncComponents-Load');
    model.text_headline = content.text_headline || null;

    return new Template('experience/components/einstein/noanchor-to-productgrid').render(model).text;
};

