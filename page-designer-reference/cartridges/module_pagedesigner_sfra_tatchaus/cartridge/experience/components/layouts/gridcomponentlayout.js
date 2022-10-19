'use strict';

var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');
var PageRenderHelper = require('~/cartridge/experience/utilities/PageRenderHelper.js');

/**
 * Render logic for the layouts.gridcomponentlayout.
 */
module.exports.render = function (context) {
    var model = new HashMap();
    var component = context.component;

    var content = context.content;
    if (content.text_headline) {
        model.text_headline = content.text_headline;
    }

    // automatically register configured regions
    model.regions = PageRenderHelper.getRegionModelRegistry(component);

    return new Template('experience/components/layouts/gridcomponentlayout').render(model).text;
};
