'use strict';

var collections = require('*/cartridge/scripts/util/collections');
var URLUtils = require('dw/web/URLUtils');
importScript("int_tatcha_dis:common/GetImageUrl.ds");

/**
 * @constructor
 * @classdesc Returns images for a given product
 * @param {dw.catalog.Product} product - product to return images for
 * @param {Object} imageConfig - configuration object with image types
 */
function Images(product, imageConfig) {
    imageConfig.types.forEach(function (type) {
        var images = product.getImages(type);
        var result = {};

        if (images) {
            if (imageConfig.quantity === 'single') {
                var firstImage = collections.first(images);
                if (firstImage) {
                    result = [{
                        alt: firstImage.alt,
                        url: firstImage.URL.toString(),
                        title: firstImage.title,
                        index: '0',
                        absURL: firstImage.absURL.toString(),
                        lineItemImageURL: firstImage.getAbsImageURL({ scaleWidth: 100, scaleHeight: 100 }),
                        tileItemImageURL: firstImage.getAbsImageURL({ scaleWidth: 300, scaleHeight: 300 }),
                        heroImageURL: firstImage.getAbsImageURL({ scaleWidth: 750, scaleHeight: 750 }),
                        bonusItemImageURL: firstImage.getAbsImageURL({ scaleWidth: 150, scaleHeight: 150 }),
                        categoryItemImageURL: getImageUrl(product, 'category','0','false','category')
                    }];
                }
            } else {
                result = collections.map(images, function (image, index) {
                    return {
                        alt: image.alt,
                        url: image.URL.toString(),
                        index: index.toString(),
                        title: image.title,
                        absURL: image.absURL.toString(),
                        lineItemImageURL: image.getAbsImageURL({ scaleWidth: 100, scaleHeight: 100 }),
                        tileItemImageURL: image.getAbsImageURL({ scaleWidth: 300, scaleHeight: 300 }),
                        heroImageURL: image.getAbsImageURL({ scaleWidth: 750, scaleHeight: 750 }),
                        bonusItemImageURL: image.getAbsImageURL({ scaleWidth: 150, scaleHeight: 150 }),
                        categoryItemImageURL: getImageUrl(product, 'category','0','false','category')
                    };
                });
            }
        }
        if (images && images.length === 0) {
			var noImage = URLUtils.imageURL('/images/noimagelarge.png', { scaleWidth: 750, scaleHeight: 750 });
			result = [{
                alt: product.hasOwnProperty('name') ? product.name : '',
                url: noImage.toString(),
                title: product.hasOwnProperty('name') ? product.name : '',
                index: '0',
                absURL: noImage.abs.toString()
            }];
		}

        this[type] = result;
    }, this);
}

module.exports = Images;
