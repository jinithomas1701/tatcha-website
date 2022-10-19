'use strict';

/**
 * @module scripts/yotpo/common/CommonModel
 *
 * This is a common model for Yotpo cartridge.
 */

/**
 * It reads the Yotpo configurations from Custom Objects.
 *
 * @returns  {Object} YotpoConfigurationList : The list of CustomObject holding Yotpo configurations.
 */
function loadAllYotpoConfigurations() {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var YotpoLogger = require('~/cartridge/scripts/yotpo/utils/YotpoLogger');
    var Constants = require('~/cartridge/scripts/yotpo/utils/Constants');

    var logLocation = 'CommonModel~loadAllYotpoConfigurations';
    var yotpoConfigurations = CustomObjectMgr.getAllCustomObjects(Constants.YOTPO_CONFIGURATION_OBJECT);

    if (yotpoConfigurations == null || !yotpoConfigurations.hasNext()) {
        YotpoLogger.logMessage('The Yotpo configuration does not exist, therefore cannot proceed further.', 'error', logLocation);
        throw Constants.YOTPO_CONFIGURATION_LOAD_ERROR;
    }

    YotpoLogger.logMessage('Yotpo Configurations count - ' + yotpoConfigurations.count, 'debug', logLocation);

    var yotpoConfigurationList = yotpoConfigurations.asList();
    yotpoConfigurations.close();// closing list...

    return yotpoConfigurationList;
}

/**
 * It loads the Yotpo configuration by locale ID from Custom Objects.
 *
 * @param {string} localeID - current locale id
 * @returns {Object} YotpoConfiguration The CustomObject holding Yotpo configuration.
 */
function loadYotpoConfigurationsByLocale(localeID) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var YotpoLogger = require('~/cartridge/scripts/yotpo/utils/YotpoLogger');
    var Constants = require('~/cartridge/scripts/yotpo/utils/Constants');

    var logLocation = 'CommonModel~loadYotpoConfigurationsByLocale';
    var yotpoConfiguration = CustomObjectMgr.getCustomObject(Constants.YOTPO_CONFIGURATION_OBJECT, localeID);

    if (yotpoConfiguration == null) {
        YotpoLogger.logMessage('The Yotpo configuration does not exist for Locale, cannot proceed further. Locale ID is: ' + localeID, 'error', logLocation);
        throw Constants.YOTPO_CONFIGURATION_LOAD_ERROR;
    }

    return yotpoConfiguration;
}

/**
 * It reads the Yotpo job configurations from Custom Objects and read the last execution date time of job.
 *
 * @returns {Object} : The last execution and current date time.
 */
function loadYotpoJobConfigurations() {
    var Calendar = require('dw/util/Calendar');
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var YotpoLogger = require('~/cartridge/scripts/yotpo/utils/YotpoLogger');
    var Constants = require('~/cartridge/scripts/yotpo/utils/Constants');

    var logLocation = 'CommonModel~loadYotpoJobConfigurations';
    var yotpoJobConfiguration = CustomObjectMgr.getCustomObject(Constants.YOTPO_JOBS_CONFIGURATION_OBJECT, Constants.YOTPO_JOB_CONFIG_ID);

    if (yotpoJobConfiguration == null) {
        YotpoLogger.logMessage('The Yotpo job configuration does not exist, cannot proceed.', 'error', logLocation);
        return false;
    }

    var orderFeedJobLastExecutionTime = yotpoJobConfiguration.custom.orderFeedJobLastExecutionDateTime;
    var	helperCalendar = new Calendar();
    var currentDateTime = helperCalendar.getTime();

    return {
        orderFeedJobLastExecutionTime: orderFeedJobLastExecutionTime,
        currentDateTime: currentDateTime
    };
}

/**
 * This function is used to get customer by its customer number
 *
 * @param {string} customerNo: The customer number to retrieve customer information
 *
 * @return {boolean} result.customerExists : The flag to indicate if customer exists
 * @return {string} result.customerEmail : The customer email address
 * @return {string} result.customerNo : current customer no
 * @return {string} result.customerGroups : The customer Groups associate with customer
 */
function getLoggedInCustomerDetails(customerNo) {
    var CustomerMgr = require('dw/customer/CustomerMgr');

    var result = {
        customerExists: false
    };

    var customerObj = CustomerMgr.getCustomerByCustomerNumber(customerNo);

    if (!customerObj) {
        return result;
    }

    var customerGroupArray = new Array();
    var customerGroupIterator = customerObj.getCustomerGroups().iterator();

    while (customerGroupIterator.hasNext()) {
        var customerGroup = customerGroupIterator.next();
        customerGroupArray.push('\'' + customerGroup.ID + '\'');
    }

    result.customerExists = true;
    result.customerEmail = customerObj.profile.email;
    result.customerNo = customerNo;
    result.customerGroups = '[' + customerGroupArray.join(',') + ']';

    return result;
}

/**
 * This method is used to get current basket details for logged in customer.
 *
 * @param {string} currentLocaleID : The current locale id for current request used to get swell API key.
 *
 * @return {boolean} result.basketExists : The flag to indicate if basket exists.
 * @return {string} result.basketTokken : The SHA1 Base64 encrypted basket token which will create with the concatenated
 * value of basketID and swell API Key.
 * @return {string} result.basketID : The UUID of current basket.
 */
function getCurrentBasketDetails(currentLocaleID) {
    var BasketMgr = require('dw/order/BasketMgr');
    var Bytes = require('dw/util/Bytes');
    var Encoding = require('dw/crypto/Encoding');
    var MessageDigest = require('dw/crypto/MessageDigest');
    var YotpoLogger = require('~/cartridge/scripts/yotpo/utils/YotpoLogger');

    var logLocation = 'CommonModel~getCurrentBasketDetails';

    var result = {
        basketExists: false
    };

    var currentBasket = BasketMgr.getCurrentBasket();

    if (!currentBasket || currentBasket.productQuantityTotal === 0) {
        return result;
    }

    var yotpoConfiguration = loadYotpoConfigurationsByLocale(currentLocaleID);
    var encryptedBasketToken;

    if (!yotpoConfiguration) {
        return result;
    }

    try {
        var swellCartTokken = yotpoConfiguration.custom.swellAPIKey + currentBasket.UUID;
        var messageDigest = new MessageDigest(MessageDigest.DIGEST_SHA_1);
        encryptedBasketToken = Encoding.toBase64(messageDigest.digestBytes(new Bytes(swellCartTokken, 'UTF-8')));
    } catch (ex) {
        YotpoLogger.logMessage('Exception occurred while encrypting cart tokken for Locale: ' + currentLocaleID + ' exception is:' + ex, 'error', logLocation);
        return result;
    }

    result.basketExists = true;
    result.basketTokken = encryptedBasketToken;
    result.basketID = currentBasket.UUID;

    return result;
}

/**
 * This function return the bottom line (total reviews and average score) for a specific product.
 *
 * @param {Object} payloadJSON : The rating and review request JSON
 *
 * @returns {Object} payloadResponse : The reviews and rating response from Yotpo
 */
function getReviewRatings(productID) {
    var Result = require('dw/svc/Result');
    //var Constants = require('~/cartridge/scripts/yotpo/utils/Constants');
    var ImportReviewRatingServiceRegistry = require('~/cartridge/scripts/yotpo/serviceregistry/ImportReviewRatingServiceRegistry');
    var YotpoLogger = require('~/cartridge/scripts/yotpo/utils/YotpoLogger');

    var logLocation = 'CommonModel~getBottomlineYotpo';
    var payloadResponse;

    try {
        var result = ImportReviewRatingServiceRegistry.yotpoImportReviewRatingSvc.call(productID);

        if (result.status === Result.OK) {
            YotpoLogger.logMessage('Reviews and ratings imported successfully.', 'debug', logLocation);
            payloadResponse = JSON.parse(result.object);
        } else {
            YotpoLogger.logMessage('Could not get the aggregate reviews and ratings from Yotpo - Error Text is: ' + result.msg + ' ' + result.errorMessage +
                '\n Product id is: ' + productID, 'debug', logLocation);
            //throw Constants.IMPORT_REVIEW_SERVICE_ERROR;
        }
    } catch (e) {
        YotpoLogger.logMessage('Error occured while trying return the aggregate rating - ' + e, 'error', logLocation);
        //throw Constants.IMPORT_REVIEW_SERVICE_ERROR;
    }

    return payloadResponse;
}
/* Module Exports */
exports.getLoggedInCustomerDetails = getLoggedInCustomerDetails;
exports.loadAllYotpoConfigurations = loadAllYotpoConfigurations;
exports.loadYotpoJobConfigurations = loadYotpoJobConfigurations;
exports.loadYotpoConfigurationsByLocale = loadYotpoConfigurationsByLocale;
exports.getCurrentBasketDetails = getCurrentBasketDetails;
exports.getReviewRatings = getReviewRatings;

