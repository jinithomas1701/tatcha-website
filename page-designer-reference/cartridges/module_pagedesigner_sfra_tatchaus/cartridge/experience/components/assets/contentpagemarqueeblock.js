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
                    mobile  : ImageTransformation.disurl(content.mobileImage, { device: 'mobile' })
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
    
    if (content.video) {
    	model.video = content.video;
    }
    
    if (content.mobileVideo) {
    	model.mobileVideo = content.mobileVideo;
    }
    
    if (content.url) {
        model.url = content.url;
    }    
        
    if (content.imageAlt) {
        model.imageAlt = content.imageAlt;
    }
    
    if (content.overline) {
        model.overline = content.overline;
    }   
    
    if (content.mainHeading) {
        model.mainHeading = content.mainHeading;
    }    
    
    if (content.body) {
        model.body = content.body;
    }
    
    if (content.textColor) {
        model.textColor = content.textColor;
    }
    
    if (content.ctaType) {
    	if(content.ctaType == 'text link') {
    		model.btnStyle = 'btn btn-link';
    	} else if (content.ctaType == 'normal button') {
    		model.btnStyle = 'btn';
    	} else if (content.ctaType == 'large button') {
    		model.btnStyle = 'btn btn-lg';
    	}

    }
    
    if (content.buttonText) {
        model.buttonText = content.buttonText;
    }
    
    if(content.blockPositionVertical) {
    	model.blockPositionVertical = content.blockPositionVertical;
    }
    
    if(content.blockPositionHorizontal) {
    	model.blockPositionHorizontal = content.blockPositionHorizontal;
    }
    
    if(content.topMargin) {
    	model.topMargin = content.topMargin;
    }
    
    if(content.bottomMargin) {
    	model.bottomMargin = content.bottomMargin;
    }
    
    if(content.anchorId) {
    	model.anchorId = content.anchorId;
    }
    
    if(content.isVideoEnabled) {
    	model.isVideoEnabled = content.isVideoEnabled;
    }



    return new Template('experience/components/assets/contentpagemarqueeblock').render(model).text;
};
