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
    
    if (content.desktopImage) {
    	model.desktopImage = {
                src: {
                    mobile  : ImageTransformation.disurl(content.desktopImage, { device: 'mobile' }),
                    desktop : ImageTransformation.disurl(content.desktopImage, { device: 'desktop' })
                }
    	};
    }
  //Added for removing alt text from try-tatcha page images-->RDMP-1889
    if(content.imageAlt) {
    	model.imageAlt = "";
    }
    
    if(content.anchorid) {
    	model.anchorid = content.anchorid;
    }
    
    if(content.overline) {
    	model.overline = content.overline;
    }
    
    if(content.mainHeading) {
    	model.mainHeading = content.mainHeading;
    }
    
    if(content.body) {
    	model.body = content.body;
    }
    
    if(content.buttonText) {
    	model.buttonText = content.buttonText;
    }
    
    if(content.textColor) {
    	model.textColor = content.textColor;
    }
    if(content.url) {
    	model.url = content.url;
    }
    
    if(content.bgColor) {
    	model.bgColor = content.bgColor;
    }
    
    if(content.desktopLayout) {
    	model.desktopLayout = content.desktopLayout;
    }

    if(content.topMargin) {
    	model.topMargin = content.topMargin;
    }
    
    if(content.bottomMargin) {
    	model.bottomMargin = content.bottomMargin;
    }

    return new Template('experience/components/assets/panelfullwidthfeature').render(model).text;
};
