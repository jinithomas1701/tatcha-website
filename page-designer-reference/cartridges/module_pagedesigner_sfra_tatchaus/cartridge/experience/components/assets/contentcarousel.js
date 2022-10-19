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
    var images = ['image1', 'image2', 'image3'];
    for (var key in content) {
        if (content[key]) {
            model[key] = images.includes(key) ? ImageTransformation.disurl(content[key], { device: 'desktop'}) : content[key];
        }
    } 
    return new Template('experience/components/assets/contentcarousel').render(model).text;
};
