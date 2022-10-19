var ImageTransformation = {};
var BREAKPOINTS = require('*/cartridge/experience/breakpoints.json');
var Image = require('dw/experience/image/Image');
var MediaFile = require('dw/content/MediaFile');
var Site = require('dw/system/Site');

var transformationCapabilities = [
    'scaleWidth',
    'scaleHeight',
    'scaleMode',
    'imageX',
    'imageY',
    'imageURI',
    'cropX',
    'cropY',
    'cropWidth',
    'cropHeight',
    'format',
    'quality',
    'strip'
];
/**
 * Calculates the required DIS transformation object based on the given parameters. Currently
 * only downscaling is performed.
 *
 * @param {Object} metaData the image meta data containing image width and height
 * @param {String} device the device the image should be scaled for (supported values: mobile, desktop)
 */
ImageTransformation.scale = function (metaData, device) {
    var transformObj = null;
    if (metaData && device) {
        var targetWidth = BREAKPOINTS[device];
        // only downscale if image is larger than desired width
        if (targetWidth && targetWidth < metaData.width) {
            transformObj = {
                scaleWidth : targetWidth,
                format     : 'jpg',
                scaleMode  : 'fit'
            };
        }
    }
    return transformObj;
};

/**
 * Creates a cleaned up transformation object
 * @param {*} options the paarmaters object which may hold additional properties not suppoerted by DIS e.g. option.device == 'mobile'
 * @param {*} transform a preconstructed transformation object
 */
function constructTransformationObject(options, transform) {
    var result = transform || {};
    Object.keys(options).forEach(function (element) {
        if (transformationCapabilities.indexOf(element) !== -1) {
            result[element] = options[element];
        }
    });
    return result;
}

/**
 * Provides a url to the given media file image. DIS transformation will be applied as given.
 *
 * @param {Image|MediaFile} image the image for which the url should be obtained. In case of an Image type the options may add a device property to scale the image to
 * @param {Object} options the (optional) DIS transformation parameters or option with devices
 */
ImageTransformation.url = function (image, options) {
    var transform = {};
    var mediaFile = image instanceof MediaFile ? image : image.file;

    if (image instanceof Image && options.device) {
        transform = ImageTransformation.scale(image.metaData, options.device);
    }
    transform = constructTransformationObject(options, transform);

    if (transform && Object.keys(transform).length) {
        return mediaFile.getImageURL(transform);
    }

    return mediaFile.getAbsURL();
};

ImageTransformation.disurl = function (image, options) {
    var transform = {};
    var mediaFile = image instanceof MediaFile ? image : image.file;

    /*
    * Page Designer: Cloudinary
    * **/
    var sitePrefs = Site.getCurrent().preferences;
    var cloudinaryEnabled : Boolean = 'cloudinary_enabled' in sitePrefs.getCustom() && sitePrefs.getCustom()["cloudinary_enabled"] ? sitePrefs.getCustom()["cloudinary_enabled"] : null;
    if(cloudinaryEnabled) {
        var cloudinaryBaseUrl : String = 'cloudinary_url' in sitePrefs.getCustom() && sitePrefs.getCustom()["cloudinary_url"] ? sitePrefs.getCustom()["cloudinary_url"] : null;
        if(cloudinaryBaseUrl) {
            var cloudinaryBaseUrl : String = 'cloudinary_url' in sitePrefs.getCustom() && sitePrefs.getCustom()["cloudinary_url"] ? sitePrefs.getCustom()["cloudinary_url"] : null;
            var cloudinaryRegex : String = 'cloudinary_image_split_regex' in sitePrefs.getCustom() && sitePrefs.getCustom()["cloudinary_image_split_regex"] ? sitePrefs.getCustom()["cloudinary_image_split_regex"] : null;
            if(cloudinaryBaseUrl) {
                var relativeUrl = mediaFile.getURL().relative().toString();
                if(cloudinaryRegex) {
                    var regex = new RegExp(cloudinaryRegex);
                    relativeUrl = relativeUrl.split(regex)[1];
                }
                var cloudinaryURL =  cloudinaryBaseUrl + relativeUrl;
                return cloudinaryURL;

            }
        }
    }

    if (image instanceof Image && options.device) {
        transform = ImageTransformation.scaleQuality(image.metaData, options.device);
    }
    transform = constructTransformationObject(options, transform);

    if (transform && Object.keys(transform).length) {
        return mediaFile.getImageURL(transform);
    }

    return mediaFile.getAbsURL();
};

ImageTransformation.scaleQuality = function (metaData, device) {
    var transformObj = null;
    var pdImageQuality = dw.system.Site.getCurrent().getCustomPreferenceValue('pdImgQlty');
    if (metaData && device) {
        if (pdImageQuality) {
            transformObj = {
                quality    : parseInt(pdImageQuality)

            };
        }
    }

    return transformObj;
};

module.exports = ImageTransformation;
