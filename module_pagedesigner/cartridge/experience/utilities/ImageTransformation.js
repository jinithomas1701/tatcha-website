var ImageTransformation = {};
var BREAKPOINTS = require('*/cartridge/experience/breakpoints.json');
var Image = require('dw/experience/image/Image');
var MediaFile = require('dw/content/MediaFile');

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
    var pdImageQuality = dw.system.Site.getCurrent().getCustomPreferenceValue('pdImgQlty')
    if (metaData && device) {
        var targetWidth = BREAKPOINTS[device];
        // only downscale if image is larger than desired width
        if (targetWidth && targetWidth < metaData.width  && pdImageQuality) {
            transformObj = {
                scaleWidth : targetWidth,
                format     : 'jpg',
                quality    : parseInt(pdImageQuality),
                scaleMode  : 'fit'
            };
        }
        else {
        	transformObj = {
                    quality : parseInt(pdImageQuality)
                };
        } 
    }
    
    return transformObj;
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


/**
 * Creates a cleaned up transformation object
 * @param {*} options the paarmaters object which may hold additional properties not suppoerted by DIS e.g. option.device == 'mobile'
 * @param {*} transform a preconstructed transformation object
 */
function constructTransformationObject(options, transform) {
    var result = transform || {};
    Object.keys(options).forEach(function (element) {
        if (transformationCapabilities.indexOf(element)) {
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

    if (image instanceof Image && options.device) {
        transform = ImageTransformation.scaleQuality(image.metaData, options.device);
    }
    transform = constructTransformationObject(options, transform);

    if (transform && Object.keys(transform).length) {
        return mediaFile.getImageURL(transform);
    }

    return mediaFile.getAbsURL();
};

module.exports = ImageTransformation;
