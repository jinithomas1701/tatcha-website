'use strict';

var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');
var ImageTransformation = require('~/cartridge/experience/utilities/ImageTransformation.js');

/**
 * Render logic for the assets.headlinebanner.
 */
module.exports.render = function (context) {
    var model = new HashMap();
    var content = context.content;

    if(content.html) {
    	model.html = content.html;
    }
    
    if(content.topMargin) {
    	model.topMargin = content.topMargin;
    }
    
    if(content.bottomMargin) {
    	model.bottomMargin = content.bottomMargin;
    }
    
    if(content.textalignment){
    	model.textalignment = content.textalignment;
    }
    return new Template('experience/components/assets/editor').render(model).text;
};
