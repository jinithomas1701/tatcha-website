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

	if (content.set1mobileimage) {
		model.set1mobileimage = {
                src: {
                    mobile : ImageTransformation.disurl(content.set1mobileimage, { device: 'mobile' })
                }
    	};
    }
    
    if(content.set1imageAlt) {
    	model.set1imageAlt = content.set1imageAlt;
    }
    
    if(content.set1heading) {
    	model.set1heading = content.set1heading;
    }
    
    if(content.set1linktext) {
    	model.set1linktext = content.set1linktext;
    }
    
    if(content.set1linkurl) {
    	model.set1linkurl = content.set1linkurl;
    }

	if(content.set1ctaarialabel) {
    	model.set1ctaarialabel = content.set1ctaarialabel;
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

	if (content.set2mobileimage) {
		model.set2mobileimage = {
                src: {
                    mobile : ImageTransformation.disurl(content.set2mobileimage, { device: 'mobile' })
                }
    	};
    }
    
    if(content.set2imageAlt) {
    	model.set2imageAlt = content.set2imageAlt;
    }
    
    if(content.set2heading) {
    	model.set2heading = content.set2heading;
    }
    
    if(content.set2linktext) {
    	model.set2linktext = content.set2linktext;
    }
    
    if(content.set2linkurl) {
    	model.set2linkurl = content.set2linkurl;
    }

	if(content.set2ctaarialabel) {
    	model.set2ctaarialabel = content.set2ctaarialabel;
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

	if (content.set3mobileimage) {
		model.set3mobileimage = {
                src: {
                    mobile : ImageTransformation.disurl(content.set3mobileimage, { device: 'mobile' })
                }
    	};
    }
    
    if(content.set3imageAlt) {
    	model.set3imageAlt = content.set3imageAlt;
    }
    
    if(content.set3heading) {
    	model.set3heading = content.set3heading;
    }
    
    if(content.set3linktext) {
    	model.set3linktext = content.set3linktext;
    }
    
    if(content.set3linkurl) {
    	model.set3linkurl = content.set3linkurl;
    }

	if(content.set3ctaarialabel) {
    	model.set3ctaarialabel = content.set3ctaarialabel;
    }
    
	/**
	* Generic attributes
	**/
    if(content.topMargin) {
    	model.topMargin = content.topMargin;
    }
    
    if(content.bottomMargin) {
    	model.bottomMargin = content.bottomMargin;
    }

	 if (content.textcolor) {
		model.textcolor = content.textcolor;
	}
    
    if (content.textverticalalign) {
		model.textverticalalign = content.textverticalalign;
	}
    

    return new Template('experience/components/assets/imagelinkblock_V2').render(model).text;
};
