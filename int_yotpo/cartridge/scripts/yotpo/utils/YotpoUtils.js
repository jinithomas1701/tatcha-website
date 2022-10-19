'use strict';

/**
 * @module scripts/yotpo/utils/YotpoUtils
 *
 * This script provides utility functions shared across other Yotpo scripts.
 * Reused script components for Yotpo should be contained here, while this
 * script is imported into the requiring script.
 */

/**
 * Validates the mandatory data in yotpoConfiguration, it returns false if that is missing.
 *
 * @param {Object} yotpoConfiguration - yotpo configuration object
 *
 * @returns {boolean} boolean
 */
function validateMandatoryConfigData(yotpoConfiguration) {
    var appKey = yotpoConfiguration.custom.appKey;
    var clientSecretKey = yotpoConfiguration.custom.clientSecretKey;

    if (empty(appKey) || empty(clientSecretKey)) {
        return false;
    }

    return true;
}

/**
 * Validates the mandatory data in yotpoConfiguration for Swell,
 * it returns false if that is missing.
 *
 * @param {Object} yotpoConfiguration - yotpo configuration object
 *
 * @returns {boolean} boolean
 */
function validateMandatorySwellConfigData(yotpoConfiguration) {
    var swellGUID = yotpoConfiguration.custom.swellGUID;
    var swellAPIKey = yotpoConfiguration.custom.swellAPIKey;

    if (empty(swellAPIKey) || empty(swellGUID)) {
        return false;
    }

    return true;
}

/**
 * Validates the mandatory data related to order feed job configuraiton, it returns false if that is missing.
 *
 * @param {Object} orderFeedJobLastExecutionDateTime - last job execution time
 *
 * @returns {boolean} boolean
 */
function validateOrderFeedJobConfiguration(orderFeedJobLastExecutionDateTime) {
    if (empty(orderFeedJobLastExecutionDateTime)) {
        return false;
    }
    return true;
}

/**
 * Retrieves the appKey based on the current locale
 *
 * @param {string} currentLocaleID - current locale id
 *
 * @returns {string} yotpo appKey
 */
function getAppKeyForCurrentLocale(currentLocaleID) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var Constants = require('./Constants');
    var YotpoLogger = require('./YotpoLogger');

    var logLocation = 'YotpoUtils~getAppKeyForCurrentLocale';

    if (empty(currentLocaleID)) {
        YotpoLogger.logMessage('The current LocaleID is missing, therefore cannot proceed.', 'error', logLocation);
        return '';
    }

    YotpoLogger.logMessage('The current LocaleID is : ' + currentLocaleID, 'debug', logLocation);

    var yotpoConfiguration = CustomObjectMgr.getCustomObject(Constants.YOTPO_CONFIGURATION_OBJECT, currentLocaleID);

    if (yotpoConfiguration == null) {
        YotpoLogger.logMessage('The yotpo configuration does not exist for ' + currentLocaleID + ', cannot proceed.', 'error', logLocation);
        return '';
    }

    var appKey = yotpoConfiguration.custom.appKey;

    if (empty(appKey)) {
        YotpoLogger.logMessage('The app key couldnt found for current locale.', 'error', logLocation);
    }

    return appKey;
}

/**
 * Retrieves the current locale from request, if not found then revert to 'default' locale.
 *
 * @param {Object} request - request object
 *
 * @returns {string} current locale id
 */
function getCurrentLocale(request) {
    var currentLocaleID = request.getLocale();

    if (empty(currentLocaleID)) {
        currentLocaleID = request.getHttpLocale();
    }

    if (empty(currentLocaleID)) {
        currentLocaleID = 'default'; // Default to default locale
    }

    return currentLocaleID;
}

/**
 * Retrieves the current locale from request for MFRA sites, if not found then revert to 'default' locale.
 *
 * @param {string} currentLocaleID - current locale id
 *
 * @returns {string} localeID
 */
function getCurrentLocaleMFRA(currentLocaleID) {
    var localeID = currentLocaleID;

    if (empty(localeID) || localeID === 'undefined') {
        localeID = 'default'; // Default to default locale
    }

    return localeID;
}

/**
 * Retrieves if the reviews are enabled for current locale.
 *
 * @param {string} currentLocaleID - current locale id
 *
 * @returns {boolean} reviewsEnabled
 */
function isReviewsEnabledForCurrentLocale(currentLocaleID) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var Constants = require('./Constants');
    var YotpoLogger = require('./YotpoLogger');

    var logLocation = 'YotpoUtils~isReviewsEnabledForCurrentLocale';

    if (empty(currentLocaleID)) {
        YotpoLogger.logMessage('The current LocaleID is missing, therefore cannot proceed.', 'error', logLocation);
        return false;
    }

    YotpoLogger.logMessage('The current LocaleID is : ' + currentLocaleID, 'debug', logLocation);

    var yotpoConfiguration = CustomObjectMgr.getCustomObject(Constants.YOTPO_CONFIGURATION_OBJECT, currentLocaleID);

    if (yotpoConfiguration == null) {
        YotpoLogger.logMessage('The yotpo configuration does not exist for ' + currentLocaleID + ', cannot proceed.', 'error', logLocation);
        return false;
    }

    var reviewsEnabled = yotpoConfiguration.custom.enableReviews;
    return reviewsEnabled;
}
/**
 * Retrieves the GUID of Swell based on the current locale
 *
 * @param {string} currentLocaleID - current locale id
 *
 * @returns {string} yotpo GUID
 */
function getGUIDForCurrentLocale(currentLocaleID) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var Constants = require('./Constants');
    var YotpoLogger = require('./YotpoLogger');

    var logLocation = 'YotpoUtils~getGUIDForCurrentLocale';

    if (empty(currentLocaleID)) {
        YotpoLogger.logMessage('The current LocaleID is missing, therefore cannot proceed.', 'error', logLocation);
        return '';
    }

    YotpoLogger.logMessage('The current LocaleID is : ' + currentLocaleID, 'debug', logLocation);

    var yotpoConfiguration = CustomObjectMgr.getCustomObject(Constants.YOTPO_CONFIGURATION_OBJECT, currentLocaleID);

    if (yotpoConfiguration == null) {
        YotpoLogger.logMessage('The yotpo configuration does not exist for ' + currentLocaleID + ', cannot proceed.', 'error', logLocation);
        return '';
    }

    var swellGuid = yotpoConfiguration.custom.swellGUID;

    if (empty(swellGuid)) {
        YotpoLogger.logMessage('The swell GUID couldnt found for current locale.', 'error', logLocation);
    }

    return swellGuid;
}
/**
 * Retrieves if the bottomline are enabled for current locale.
 *
 * @param {string} currentLocaleID - current locale id
 *
 * @returns {boolean} bottomLineEnabled
 */
function isBottomLineEnabledForCurrentLocale(currentLocaleID) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var Constants = require('./Constants');
    var YotpoLogger = require('./YotpoLogger');

    var logLocation = 'YotpoUtils~isBottomLineEnabledForCurrentLocale';

    if (empty(currentLocaleID)) {
        YotpoLogger.logMessage('The current LocaleID is missing, therefore cannot proceed.', 'error', logLocation);
        return false;
    }

    YotpoLogger.logMessage('The current LocaleID is : ' + currentLocaleID, 'debug', logLocation);

    var yotpoConfiguration = CustomObjectMgr.getCustomObject(Constants.YOTPO_CONFIGURATION_OBJECT, currentLocaleID);

    if (yotpoConfiguration == null) {
        YotpoLogger.logMessage('The yotpo configuration does not exist for ' + currentLocaleID, 'error', logLocation);
        return false;
    }

    var bottomLineEnabled = yotpoConfiguration.custom.enableBottomLine;
    return bottomLineEnabled;
}


/**
 * This function escapes specific characters from the text based on the regular expression.
 *
 * @param {string} text - string to be escaped
 * @param {string} regex - regular expression
 * @param {string} replacement - replacement character
 *
 * @returns {string} escapedText
 */
function escape(text, regex, replacement) {
    if (!text) {
        return text;
    }

    var regExp = new RegExp(regex, 'gi');
    var escapedText = text.replace(regExp, replacement);
    return escapedText;
}

/**
*	This functions return the large image of a product.
*
* @param {Object} inProduct - product object to get image from.
*
* @returns {string} imageURL
*/
function getImageLink(inProduct) {
    var imageURL = '';
    if(!empty(inProduct)) {
        var image = inProduct.getImage('large', 0);
        if (!empty(image)) {
            imageURL = image.getAbsURL();
        }
    }
    return imageURL;
}

/**
*	This functions return the primary category path of a product.
*
* @param {Object} product - product object to get category path from.
* @param {string} separator - category path separator or null
*
* @returns {string} categoryPath
*/
function getCategoryPath(product, separator) {
    var ArrayList = require('dw/util/ArrayList');

    var categoryPath = '';
    var topProduct = product;

    if (topProduct.isVariant()) {
        topProduct = product.getVariationModel().master;
    }

    var theCategory = topProduct.getPrimaryCategory();

    if (empty(theCategory)) {
        var categories = topProduct.categories;
        if (!empty(categories)) {
            theCategory = categories[0];
        }
    }

    var cat = theCategory;
    var path = new ArrayList();
    
    if(!empty(cat)) {
    	while (!empty(cat.parent)) {
            if (cat.online) {
                path.addAt(0, cat.getDisplayName());
            }
            cat = cat.parent;
        }
    }

    categoryPath = separator ? path.join(separator) : path.join();
    return categoryPath;
}

/**
 * @description appends the parameters to the given url and returns the changed url
 * @param {string} url - the URL
 * @param {Object} params - the parameters to append with URL
 *
 * @returns {string} The URL with appended parameters
 */
function appendParamsToUrl(url, params) {
    var ArrayList = require('dw/util/ArrayList');

    var _params = new ArrayList();
    Object.keys(params).forEach(function (key) {
        _params.push(key + '=' + encodeURIComponent(params[key]));
    });
    var _url = url + '?' + _params.join('&');
    return _url;
}

/**
 * This is a common function to check whether the Yotpo cartridge is disabled or not.
 * @returns {boolean} boolean
 */
function isCartridgeEnabled() {
    var Site = require('dw/system/Site');
    var YotpoLogger = require('./YotpoLogger');

    var logLocation = 'YotpoUtils~isCartridgeEnabled';
    var yotpoCartridgeEnabled = Site.getCurrent().preferences.custom.yotpoCartridgeEnabled;

    if (!yotpoCartridgeEnabled) {
        YotpoLogger.logMessage('The Yotpo cartridge is disabled, please check custom preference (yotpoCartridgeEnabled).', 'info', logLocation);
    }

    return yotpoCartridgeEnabled;
}

/**
 * This function checks whether the Yotpo Swell Loyalty is disabled or not.
 * @returns {boolean} boolean
 */
function isSwellLoyaltyEnabled() {
    var Site = require('dw/system/Site');
    var YotpoLogger = require('./YotpoLogger');

    var logLocation = 'YotpoUtils~isSwellLoyaltyEnabled';
    var yotpoSwellLoyaltyEnabled = Site.getCurrent().preferences.custom.yotpoSwellLoyaltyEnabled;

    if (!yotpoSwellLoyaltyEnabled) {
        YotpoLogger.logMessage('The Yotpo cartridge is disabled, please check custom preference (yotpoSwellLoyaltyEnabled).', 'info', logLocation);
    }

    return yotpoSwellLoyaltyEnabled;
}

/**
 * This function is used to validate Swell API key in Yotpo Config
 *
 * @param {string} swellApiKey : The Swell API key to be validated
 *
 * @return {boolean} valid - Returns true if API Key is found otherwise false
 */
function validateSwellApiKey(swellApiKey) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var Constants = require('./Constants');

    var valid = false;
    var yotpoConfiguration = CustomObjectMgr.queryCustomObject(Constants.YOTPO_CONFIGURATION_OBJECT, 'custom.swellAPIKey={0}', swellApiKey);

    if (yotpoConfiguration) {
        valid = true;
    }

    return valid;
}

/**
 * This function is used to get date of past number of days
 * For example 30 days old date is required then method will
 * subtract 30 days form current date and will return past date
 *
 * @param {Integer} numberOfDays : The number of days from current date
 *
 * @return {Object} pastDate :  The Date object date which is subtracted form current date
 */
function getPastDateFromDays(numberOfDays) {
    var Calendar = require('dw/util/Calendar');

    var calendar = new Calendar();
    var currentTimeMilis = calendar.getTime();
    var numberOfDaysMillis = numberOfDays * 24 * 60 * 60 * 1000;
    var pastDate = new Date(currentTimeMilis - numberOfDaysMillis);
    return pastDate;
}
/**
 * This function is used to convert the price into cents
 *
 * @param {number} price : The price which needs to be convert.
 *
 * @return {number} priceCents : The converted price into cents.
 */
function convertPriceIntoCents(price) {
    var priceCents = 0;
    if (price !== null) {
        priceCents = price * 100;
    }
    return priceCents;
}

/* Module Exports */
exports.escape = escape;
exports.getAppKeyForCurrentLocale = getAppKeyForCurrentLocale;
exports.getCategoryPath = getCategoryPath;
exports.getCurrentLocale = getCurrentLocale;
exports.getCurrentLocaleMFRA = getCurrentLocaleMFRA;
exports.getGUIDForCurrentLocale = getGUIDForCurrentLocale;
exports.getImageLink = getImageLink;
exports.isBottomLineEnabledForCurrentLocale = isBottomLineEnabledForCurrentLocale;
exports.isCartridgeEnabled = isCartridgeEnabled;
exports.isReviewsEnabledForCurrentLocale = isReviewsEnabledForCurrentLocale;
exports.isSwellLoyaltyEnabled = isSwellLoyaltyEnabled;
exports.validateMandatoryConfigData = validateMandatoryConfigData;
exports.validateMandatorySwellConfigData = validateMandatorySwellConfigData;
exports.validateOrderFeedJobConfiguration = validateOrderFeedJobConfiguration;
exports.validateSwellApiKey = validateSwellApiKey;
exports.getPastDateFromDays = getPastDateFromDays;
exports.appendParamsToUrl = appendParamsToUrl;
exports.convertPriceIntoCents = convertPriceIntoCents;

