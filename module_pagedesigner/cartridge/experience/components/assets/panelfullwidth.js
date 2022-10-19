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
                mobile  : ImageTransformation.url(content.desktopImage, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.desktopImage, { device: 'desktop' })
            },
            alt         : content.desktopImage.file.getAlt()
        };
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
    
    if(content.url) {
    	model.url = content.url;
    }
    
    if(content.bgColor) {
    	model.bgColor = content.bgColor;
    }
    
    if(content.desktopLayout) {
    	model.desktopLayout = content.desktopLayout;
    }
    
    
    model.ispanelproduct = content.ispanelproduct;
    model.ispanelquotation = content.ispanelquotation;
    model.ispanelinformation = content.ispanelinformation;
    model.ispanelfeature = content.ispanelfeature;
    
    if(content.topMargin) {
    	model.topMargin = content.topMargin;
    }
    
    if(content.bottomMargin) {
    	model.bottomMargin = content.bottomMargin;
    }

    return new Template('experience/components/assets/panelfullwidth').render(model).text;
};
