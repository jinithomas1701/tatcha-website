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

    if(content.anchorid) {
    	model.anchorid = content.anchorid;
    }
    
    if(content.desktoplayout) {
    	model.desktoplayout = content.desktoplayout;
    }
    
    if (content.desktopImage) {
    	model.desktopImage = {
                src: {
                    desktop : ImageTransformation.disurl(content.desktopImage, { device: 'desktop' })
                }
    	};
    }
    
    if (content.imageAlt) {
        model.imageAlt = content.imageAlt;
    }
    
    if(content.mainheading) {
    	model.mainheading = content.mainheading;
    }
    
    if(content.body) {
    	model.body = content.body;
    }
    
    
    if(content.topMargin) {
    	model.topMargin = content.topMargin;
    }
    
    if(content.bottomMargin) {
    	model.bottomMargin = content.bottomMargin;
    }

    return new Template('experience/components/assets/imagetextsidebyside').render(model).text;
};
