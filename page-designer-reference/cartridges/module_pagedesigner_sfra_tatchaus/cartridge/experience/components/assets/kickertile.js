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

    if (content.header) {
        model.header = content.header;
    }
    
    if (content.description) {
        model.description = content.description;
    }
    
    if (content.buttonLink) {
        model.buttonLink = content.buttonLink;
    }
    
    if (content.buttonText) {
        model.buttonText = content.buttonText;
    }
    
    if (content.image) {
    	model.image = {
                src: {
                    desktop : ImageTransformation.disurl(content.image, { device: 'desktop' })
                }
    	};
    }
    
    if (content.imageAlt) {
        model.imageAlt = content.imageAlt;
    }
	
	if(content.buttonAriaLabel) {
		model.buttonAriaLabel = content.buttonAriaLabel;
	}

    return new Template('experience/components/assets/kickertile').render(model).text;
};
