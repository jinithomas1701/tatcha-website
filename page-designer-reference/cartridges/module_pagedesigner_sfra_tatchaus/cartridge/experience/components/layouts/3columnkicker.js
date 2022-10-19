'use strict';

var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');
var PageRenderHelper = require('~/cartridge/experience/utilities/PageRenderHelper.js');

/**
 * Render logic for the layouts.3column.
 */
module.exports.render = function (context) {
    var model = new HashMap();
    var component = context.component;
    
    var content = context.content;
    
    if(content.topMargin) {
    	model.topMargin = content.topMargin;
    }
    
    if(content.bottomMargin) {
    	model.bottomMargin = content.bottomMargin;
    }
    
    // automatically register configured regions
    model.regions = PageRenderHelper.getRegionModelRegistry(component);

    return new Template('experience/components/layouts/3columnkicker').render(model).text;
};
