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

    if(content.linkurl1) {
    	model.linkurl1 = content.linkurl1;
        model.linktext1 = content.linktext1;
    }
    
	if(content.linkurl2) {
		model.linkurl2 = content.linkurl2;
	    model.linktext2 = content.linktext2;
	}
	
	if(content.linkurl3) {
		model.linkurl3 = content.linkurl3;
        model.linktext3 = content.linktext3;
	}
	
	if(content.linkurl4) {
		model.linkurl4 = content.linkurl4;
        model.linktext4 = content.linktext4;
	}

    if(content.topMargin) {
    	model.topMargin = content.topMargin;
    }
    
    if(content.bottomMargin) {
    	model.bottomMargin = content.bottomMargin;
    }

    return new Template('experience/components/assets/inpagenavigation').render(model).text;
};
