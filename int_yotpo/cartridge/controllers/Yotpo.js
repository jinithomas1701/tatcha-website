'use strict';

/**
 * @module controllers/Yotpo
 *
 * This is the controller called by the Reviews widget to load reviews from Yotpo in real time.
 */

var Constants = require('~/cartridge/scripts/yotpo/utils/Constants');
var app = require(Constants.SITEGENESIS_CARTRIDGE_NAME + '/cartridge/scripts/app');
var guard = require(Constants.SITEGENESIS_CARTRIDGE_NAME + '/cartridge/scripts/guard.js');

/**
 * This is the function invoked, when the import reviews controller is called.
 * @returns {Object} it renders util/yotporeviewsresponse
 */
function importReviews() {
    var ImportReviewModel = require('~/cartridge/scripts/yotpo/model/reviewspayload/ImportReviewModel.js');
    var YotpoLogger = require('~/cartridge/scripts/yotpo/utils/YotpoLogger');
    var YotpoUtils = require('~/cartridge/scripts/yotpo/utils/YotpoUtils');
    var logLocation = 'Yotpo~ImportReviews';

    if (!YotpoUtils.isCartridgeEnabled()) {
        return app.getView({
            yotpoReviewsHTML: ''
        }).render('util/yotporeviewsresponse');
    }

    var map = request.httpParameterMap;
    var yotpoResponseHTML = '';

    try {
        yotpoResponseHTML = ImportReviewModel.importReviewsAndRatings(map.productid.getStringValue(), map.yotporeviewspage.getStringValue(), map.isreview.booleanValue, request.getHttpLocale());
    } catch (ex) {
        YotpoLogger.logMessage('Something went wrong while importing reviews and ratings, Exception code is: ' + ex, 'error', logLocation);
    }

    return app.getView({
        yotpoReviewsHTML: yotpoResponseHTML
    }).render('util/yotporeviewsresponse');
}

/**
 * This is the function invoked to track logged in customer and basket for Yotpo Swell loyalty
 *
 * @returns {Object} it renders tracking/yotposwelltracking
 */
function includeSwellTracking() {
    var CommonModel = require('~/cartridge/scripts/yotpo/model/common/CommonModel');

    var currentLocaleID = request.getHttpLocale();

    var customerDetails = {
        customerExists: false
    };

    var basketDetails = {
        basketExists: false
    };

    if (customer.isAuthenticated()) {
        customerDetails = CommonModel.getLoggedInCustomerDetails(customer.profile.customerNo);
        basketDetails = CommonModel.getCurrentBasketDetails(currentLocaleID);
    }

    return app.getView({
        customerDetails: customerDetails,
        basketDetails: basketDetails
    }).render('/tracking/yotposwelltracking');
}

/* Module Exports */
exports.ImportReviews = guard.ensure(['get'], importReviews);
exports.IncludeSwellTracking = guard.ensure(['get'], includeSwellTracking);
