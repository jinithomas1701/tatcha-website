'use strict';

/**
 * @module scripts/yotpo/model/importreviewpayload/ImportReviewModel
 *
 * This is a model used to import ratings and reviews.
 */

/**
 * It validates if the reviews or ratings should be imported for current locale in Yotop Configuration object.
 * It throws error if the mandatory data is missing. It will also throw error, if both ratings and reviews disabled
 * for current locale in configuration.
 *
 * @param {Object} yotpoConfiguration : The Yotpo configuration object holding all necessary configuration data.
 */
function validateConfigData(yotpoConfiguration) {
    var Constants = require('~/cartridge/scripts/yotpo/utils/Constants');
    var YotpoLogger = require('~/cartridge/scripts/yotpo/utils/YotpoLogger');
    var YotpoUtils = require('~/cartridge/scripts/yotpo/utils/YotpoUtils');

    var logLocation = 'ImportReviewModel~validateConfigData';
    var validationResult = YotpoUtils.validateMandatoryConfigData(yotpoConfiguration);

    if (!validationResult) {
        YotpoLogger.logMessage('The current locale missing mandatory data therefore aborting the process.', 'error', logLocation);
        throw Constants.RATINGS_REVIEW_CONFIG_VALIDATION_ERROR;
    }

    if (!(yotpoConfiguration.custom.enableReviews || yotpoConfiguration.custom.enableBottomLine)) {
        YotpoLogger.logMessage('Skipping Reviews and BottomLine for current locale' +
            'Locale ID - ' + yotpoConfiguration.custom.localeID +
            'Reviews Flag - ' + yotpoConfiguration.custom.enableReviews +
            'Bottomline Flag - ' + yotpoConfiguration.custom.enableBottomLine, 'debug', logLocation);

        throw Constants.RATINGS_OR_REVIEW_DISABLED_ERROR;
    }
}

/**
 * This function sends the request to Yotpo for importing reviews and ratings.
 *
 * @param {Object} payloadJSON : The rating and review request JSON
 *
 * @returns {Object} payloadResponse : The reviews and rating response from Yotpo
 */
function sendRequestToYotpo(payloadJSON) {
    var Result = require('dw/svc/Result');
    var Constants = require('~/cartridge/scripts/yotpo/utils/Constants');
    var ImportReviewServiceRegistry = require('~/cartridge/scripts/yotpo/serviceregistry/ImportReviewServiceRegistry');
    var YotpoLogger = require('~/cartridge/scripts/yotpo/utils/YotpoLogger');

    var logLocation = 'ImportReviewModel~sendRequestToYotpo';
    var payloadResponse;

    try {
        var result = ImportReviewServiceRegistry.yotpoImportReviewSvc.call(payloadJSON);

        if (result.status === Result.OK) {
            YotpoLogger.logMessage('Reviews and ratings imported successfully.', 'debug', logLocation);
            payloadResponse = result.object;
        } else {
            YotpoLogger.logMessage('Could not import reviews and ratings from Yotpo - HTTP Status Code is: ' + result.error +
                ', Error Text is: ' + result.msg + ' ' + result.errorMessage +
                '\n Payload is: ' + payloadJSON, 'error', logLocation);
            throw Constants.IMPORT_REVIEW_SERVICE_ERROR;
        }
    } catch (e) {
        YotpoLogger.logMessage('Error occured while trying to import payload - ' + e, 'error', logLocation);
        throw Constants.IMPORT_REVIEW_SERVICE_ERROR;
    }

    return payloadResponse;
}

/**
 * This function prepares the JSON to import review from Yotpo in real-time.
 *
 * @param {string} productID - current product id
 * @param {string} yotpoReviewsPage - review page number for yotpo
 * @param {Object} yotpoConfiguration - yotpo configuration object
 *
 * @returns {Object} JSON object
 */
function preparePayload(productID, yotpoReviewsPage, yotpoConfiguration) {
    var Constants = require('~/cartridge/scripts/yotpo/utils/Constants');
    var YotpoLogger = require('~/cartridge/scripts/yotpo/utils/YotpoLogger');
    var YotpoUtils = require('~/cartridge/scripts/yotpo/utils/YotpoUtils');

    var logLocation = 'ImportReviewModel~preparePayload';
    var reviewsEnabled = yotpoConfiguration.custom.enableReviews;
    var bottomLineEnabled = yotpoConfiguration.custom.enableBottomLine;

    YotpoLogger.logMessage('Reviews and BottomLine flags for current Locale ID - ' + yotpoConfiguration.custom.localeID +
        'Reviews Flag - ' + reviewsEnabled +
        'Bottomline Flag - ' + bottomLineEnabled, 'debug', logLocation);

    var payloadJSON = '{"methods":';
    var methodsJSON = '[';
    var productId = productID;
    productId = YotpoUtils.escape(productId, Constants.REGEX_FOR_IMPORT_REVIEW, '-');

    if (reviewsEnabled) {
        methodsJSON += '' +
            '{' +
            '"method":"' + Constants.MAIN_WIDGET_METHOD + '",' +
                '"params": {' +
                    '"pid": "' + productId + '",' +
                    '"page": "' + yotpoReviewsPage + '"' +
                '}' +
            '}';
    }

    if (bottomLineEnabled) {
        if (reviewsEnabled) {
            methodsJSON += ',';
        }

        methodsJSON += '' +
            '{' +
                '"method":"' + Constants.BOTTOM_LINE_METHOD + '",' +
                    '"params": {' +
                        '"pid": "' + productId + '"' +
                    '},' +
                '"format": "' + Constants.BOTTOM_LINE_FORMAT + '"' +
            '}';
    }

    methodsJSON += ']';
    payloadJSON += methodsJSON;
    payloadJSON += ',"app_key":"' + yotpoConfiguration.custom.appKey + '"';
    payloadJSON += '}';

    return payloadJSON;
}

/**
 * It parses the response to retrieve rating or review.
 *
 * @param {Object} payloadResponse : The response from Yotpo
 * @param {Object} yotpoConfiguration : The Yotpo configuration
 * @param {boolean} isReview : The flag to indicate if review is required otherwise rating will be returned
 *
 * @returns {Object} The ratings or review HTML
 */
function processPayloadResponse(payloadResponse, yotpoConfiguration, isReview) {
    var Constants = require('~/cartridge/scripts/yotpo/utils/Constants');

    var reviewsEnabled = yotpoConfiguration.custom.enableReviews;
    var bottomLineEnabled = yotpoConfiguration.custom.enableBottomLine;

    var responseHTML = '';
    var method = '';

    var payloadJSON = JSON.parse(payloadResponse);

    if (reviewsEnabled && isReview) {
        method = payloadJSON[0].method;
        if (method.equals(Constants.MAIN_WIDGET_METHOD)) {
            responseHTML = payloadJSON[0].result;
        }
    }

    if (bottomLineEnabled && !isReview) {
        method = payloadJSON[1].method;
        if (method.equals(Constants.BOTTOM_LINE_METHOD)) {
            responseHTML = payloadJSON[1].result;
        }
    }

    return responseHTML;
}

/**
 * This is the main function used to import reviews from yotpo in real-time.
 *
 * @param {string} productID : The product ID to retrive reviews or ratings
 * @param {string} yotpoReviewsPage : The reviews page number
 * @param {boolean} isReview : review flag
 * @param {string} localeID : The locale ID
 *
 * @returns {Object} responseJSON
 */
function importReviewsAndRatings(productID, yotpoReviewsPage, isReview, localeID) {
    var Site = require('dw/system/Site');
    var Constants = require('~/cartridge/scripts/yotpo/utils/Constants');
    var CommonModel = require('../common/CommonModel');
    var YotpoLogger = require('~/cartridge/scripts/yotpo/utils/YotpoLogger');

    var logLocation = 'ImportReviewModel~importReviewsAndRatings';
    var importReviewsRealtime = Site.getCurrent().preferences.custom.importReviewsRealtime;
    if (!importReviewsRealtime) {
        YotpoLogger.logMessage('Importing reviews in realtime is disabled, cannot proceed further.', 'debug', logLocation);
        var Logger = require('dw/system/Logger');
        Logger.warn("Importing reviews in realtime is disabled : " + Constants.IMPORT_REVIEWS_REALTIME_DISABLED_ERROR);
    }
    var reviewPage = yotpoReviewsPage;
    if (empty(reviewPage)) {
        reviewPage = Constants.YOTPO_REVIEWS_PAGE_DEFAULT;
    }

    var yotpoConfiguration = CommonModel.loadYotpoConfigurationsByLocale(localeID);
    validateConfigData(yotpoConfiguration);

    var requestJSON = preparePayload(productID, reviewPage, yotpoConfiguration);
    var responseJSON = sendRequestToYotpo(requestJSON);
    var responseHTML = processPayloadResponse(responseJSON, yotpoConfiguration, isReview);

    return responseHTML;
}

/* Module Exports */
exports.importReviewsAndRatings = importReviewsAndRatings;
