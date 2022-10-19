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
    
    /*
     * Set 1 content
     * **/
    
    
    if (content.set1desktopimage) {
    	model.set1desktopimage = {
                src: {
                    desktop : ImageTransformation.disurl(content.set1desktopimage, { device: 'desktop' })
                }
    	};
    }
    
    if(content.set1imageAlt) {
    	model.set1imageAlt = content.set1imageAlt;
    }
    
    if(content.set1heading) {
    	model.set1heading = content.set1heading;
    }
    
    if(content.set1body) {
    	model.set1body = content.set1body;
    }
    
    if(content.set1linktext) {
    	model.set1linktext = content.set1linktext;
    }
    
    if(content.set1linkurl) {
    	model.set1linkurl = content.set1linkurl;
    }
    
    /*
     * Set 2 content
     * **/
    
    if (content.set2desktopimage) {
    	model.set2desktopimage = {
                src: {
                    desktop : ImageTransformation.disurl(content.set2desktopimage, { device: 'desktop' })
                }
    	};
    }
    
    if(content.set2imageAlt) {
    	model.set2imageAlt = content.set2imageAlt;
    }
    
    if(content.set2heading) {
    	model.set2heading = content.set2heading;
    }
    
    if(content.set2body) {
    	model.set2body = content.set2body;
    }
    
    if(content.set2linktext) {
    	model.set2linktext = content.set2linktext;
    }
    
    if(content.set2linkurl) {
    	model.set2linkurl = content.set2linkurl;
    }
    
    /*
     * Set 3 content
     * **/
    
    if (content.set3desktopimage) {
    	model.set3desktopimage = {
                src: {
                    desktop : ImageTransformation.disurl(content.set3desktopimage, { device: 'desktop' })
                }
    	};
    }
    
    if(content.set3imageAlt) {
    	model.set3imageAlt = content.set3imageAlt;
    }
    
    if(content.set3heading) {
    	model.set3heading = content.set3heading;
    }
    
    if(content.set3body) {
    	model.set3body = content.set3body;
    }
    
    if(content.set3linktext) {
    	model.set3linktext = content.set3linktext;
    }
    
    if(content.set3linkurl) {
    	model.set3linkurl = content.set3linkurl;
    }
    
    
    /*
     * Set 4 content
     * **/
    
    if (content.set4desktopimage) {
    	model.set4desktopimage = {
                src: {
                    desktop : ImageTransformation.disurl(content.set4desktopimage, { device: 'desktop' })
                }
    	};
    }
    
    if(content.set4imageAlt) {
    	model.set4imageAlt = content.set4imageAlt;
    }
    
    if(content.set4heading) {
    	model.set4heading = content.set4heading;
    }
    
    if(content.set4body) {
    	model.set4body = content.set4body;
    }
    
    if(content.set4linktext) {
    	model.set4linktext = content.set4linktext;
    }
    
    if(content.set4linkurl) {
    	model.set4linkurl = content.set4linkurl;
    }
    
    if(content.topMargin) {
    	model.topMargin = content.topMargin;
    }
    
    if(content.bottomMargin) {
    	model.bottomMargin = content.bottomMargin;
    }
    

    return new Template('experience/components/assets/featureset4').render(model).text;
};
