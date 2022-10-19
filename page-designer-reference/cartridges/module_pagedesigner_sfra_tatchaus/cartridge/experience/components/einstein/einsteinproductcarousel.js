'use strict';

var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');
var PageRenderHelper = require('~/cartridge/experience/utilities/PageRenderHelper.js');

/**
 * Render logic for the einstein.einstein-product-carousel.
 */
module.exports.render = function (context) {
    var model = new HashMap();
    var content = context.content;

    var recommender = content.recommender;

    //  show a maximum of 5 as the grid component style is optimized for 5 items
    model.limit = 5;
    model.recommender = '';
    if (recommender) {
        model.recommender = recommender.value;
    } else {
        throw new Error('No recommender available');
    }
    model.productLoadUrl = dw.web.URLUtils.abs('AsyncComponents-LoadRecommProducts');

    if(content.topMargin) {
        model.topMargin = content.topMargin;
    }

    if(content.bottomMargin) {
        model.bottomMargin = content.bottomMargin;
    }
    if(content.title) {
        model.title = content.title;
    }
    return new Template('experience/components/einstein/einstein-product-carousel').render(model).text;
};

