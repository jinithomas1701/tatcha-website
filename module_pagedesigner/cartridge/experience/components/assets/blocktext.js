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
                	desktop : ImageTransformation.disurl(content.desktopImage, { device: 'desktop'})
                }
    	};
    }
    
    if(content.imageAlt) {
    	model.imageAlt = content.imageAlt;
    }
    
    if(content.anchorid) {
    	model.anchorid = content.anchorid;
    }
    
    if(content.contentbody) {
    	model.contentbody = content.contentbody;
    }
    
    if(content.linkurl) {
    	model.linkurl = content.linkurl;
    }
    
    if(content.linktext) {
    	model.linktext = content.linktext;
    }
    return new Template('experience/components/assets/blocktext').render(model).text;
};
