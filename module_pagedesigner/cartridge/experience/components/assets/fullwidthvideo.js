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
    
    if(content.anchorid){
    	model.anchorid = content.anchorid;
    }
    
    if(content.videoplayer){
    	model.videoplayer = content.videoplayer;
    	if(content.videoplayer == 'youtube'){
    		model.videourl = content.videourl+"?controls=0&rel=0";
    	}
    	else if(content.videoplayer == 'vimeo'){
    		model.videourl = content.videourl;
    	}
    }
    
    if(content.videotitle){
    	model.videotitle = content.videotitle;
    }
            
    if(content.topMargin) {
    	model.topMargin = content.topMargin;
    }
    
    if(content.bottomMargin) {
    	model.bottomMargin = content.bottomMargin;
    }

    return new Template('experience/components/assets/fullwidthvideo').render(model).text;
};
