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

    if (content.header1) {
        model.header1 = content.header1;
    }

    if (content.description1) {
        model.description1 = content.description1;
    }

    if (content.buttonLink1) {
        model.buttonLink1 = content.buttonLink1;
    }

    if (content.buttonText1) {
        model.buttonText1 = content.buttonText1;
    }

    if (content.image1) {
        model.image1 = {
            src: {
                desktop : ImageTransformation.disurl(content.image1, { device: 'desktop' })
            }
        };
    }

    if (content.imageAlt1) {
        model.imageAlt1 = content.imageAlt1;
    }

    if(content.buttonAriaLabel1) {
        model.buttonAriaLabel1 = content.buttonAriaLabel1;
    }

    if (content.header2) {
        model.header2 = content.header2;
    }

    if (content.description2) {
        model.description2 = content.description2;
    }

    if (content.buttonLink2) {
        model.buttonLink2 = content.buttonLink2;
    }

    if (content.buttonText2) {
        model.buttonText2 = content.buttonText2;
    }

    if (content.image2) {
        model.image2 = {
            src: {
                desktop : ImageTransformation.disurl(content.image2, { device: 'desktop' })
            }
        };
    }

    if (content.imageAlt2) {
        model.imageAlt2 = content.imageAlt2;
    }

    if(content.buttonAriaLabel2) {
        model.buttonAriaLabel2 = content.buttonAriaLabel2;
    }
    if (content.topMargin) {
        model.topMargin = content.topMargin;
    }

    if (content.bottomMargin) {
        model.bottomMargin = content.bottomMargin;
    }
    return new Template('experience/components/assets/twouppromo').render(model).text;
};
