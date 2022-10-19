"use strict";

/* global request */


/* API Includes */
var Site = require("dw/system/Site");
var URLUtils = require("dw/web/URLUtils");

/* Script Includes */
var DataDomeService = require("*/cartridge/scripts/service/dataDomeService.js");
var RequestHandler = require("*/cartridge/scripts/model/requestHandler.js");
var ResponseHandler = require("*/cartridge/scripts/model/responseHandler.js");
var ddLogger = require("*/cartridge/scripts/util/ddLogger.js");
var CaptchaPipeline = "DDUser-Challenge";

/**
 * This method will act as an entry point for any request which needs to be validated
 * through DataDome API.
 * @returns {Object} ddResponse
 */
function validate() {
    var ddResponse = { invalid: false };
    var captchaPageRelativeUrl = null;

    try {
        captchaPageRelativeUrl = URLUtils.https(CaptchaPipeline).relative().toString();
    }
    catch (e) {
        ddLogger.log("CaptchaPageRelativeUrl is not available" + e, "error", "DataDomeAPI~validate");
        // Switch to permissive test.
        var errorResponsePipelineMatches = request.getHttpPath().search(CaptchaPipeline);

        if (errorResponsePipelineMatches >= 0) {
            return ddResponse;
        }
    }

    // Catpcha page is displayed
    if (request.getHttpPath() === captchaPageRelativeUrl)
    {
        return ddResponse;
    }

    try {
        var customSitePreferences = Site.getCurrent().getPreferences().custom;
        var ddInclusionRegex = customSitePreferences.ddInclusionRegex;
        var ddExclusionRegex = customSitePreferences.ddExclusionRegex;

        if (customSitePreferences.ddCartridgeEnabled) {
            // Get only path to avoid receiving paramaters matching the regex.
            var requestURL = request.getHttpPath();
            var isExcludedRequest = (!ddExclusionRegex) ? false : new RegExp(ddExclusionRegex).test(requestURL);
            var isIncludedRequest = (!ddInclusionRegex) ? true : new RegExp(ddInclusionRegex).test(requestURL);

            if (!isExcludedRequest && isIncludedRequest) {
                var requestParamsMap = RequestHandler.buildRequestParams(request);
                var ddApiResponse = DataDomeService.callProtectionAPI(requestParamsMap);
                ddResponse = ResponseHandler.handleResponse(ddApiResponse);
            }
        }
    } catch (e) {
        ddLogger.log("An error occured while trying to validate request through Data Dome API " + e, "error", "DataDomeAPI~validate");
    }

    return ddResponse;
}

/* Module Exports */
exports.validate = validate;
