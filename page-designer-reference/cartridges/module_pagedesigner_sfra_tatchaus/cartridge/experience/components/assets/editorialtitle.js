'use strict';

var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');
var ImageTransformation = require('~/cartridge/experience/utilities/ImageTransformation.js');

/**
 * Render logic for richtext component
 */
module.exports.render = function (context) {
    var model = new HashMap();
    var content = context.content;
    
    if (content.mobileImage) {
    	model.mobileImage = {
                src: {
                    mobile : ImageTransformation.disurl(content.mobileImage, { device: 'mobile' })
                }
    	};
    }
    
    if (content.desktopImage) {
    	model.desktopImage = {
                src: {
                    desktop : ImageTransformation.disurl(content.desktopImage, { device: 'desktop' })
                }
    	};
    }
    
    if(content.anchorid) {
    	model.anchorid = content.anchorid;
    }
         
    if (content.imageAlt) {
        model.imageAlt = content.imageAlt;
    }
    
    if (content.title) {
        model.title = content.title;
    }   
    
    if (content.mainHeading) {
        model.mainHeading = content.mainHeading;
    }    
       
    if (content.textColor) {
        model.textColor = content.textColor;
    }
    
    
    if(content.topMargin) {
    	model.topMargin = content.topMargin;
    }
    
    if(content.bottomMargin) {
    	model.bottomMargin = content.bottomMargin;
    }

    return new Template('experience/components/assets/editorialtitle').render(model).text;
};
