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
    
    if(content.title) {
    	model.title = content.title;
    }
	if(content.overline){
		model.overline = content.overline;
	}
	if(content.body){
		model.body = content.body;	
	}  
    if(content.anchorid) {
    	model.anchorid = content.anchorid;
    }
    
    if(content.topMargin) {
    	model.topMargin = content.topMargin;
    }
    
    if(content.bottomMargin) {
    	model.bottomMargin = content.bottomMargin;
    }

    return new Template('experience/components/assets/textonlytitle').render(model).text;
};
