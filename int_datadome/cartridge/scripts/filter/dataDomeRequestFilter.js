"use strict";

/* global request, session, response */

/* Script Includes */
var DataDomeAPI = require("*/cartridge/scripts/api/dataDomeAPI");

/* API Includes */
var Status = require("dw/system/Status");
var URLUtils = require("dw/web/URLUtils");

/**
 * This method will intercept all incoming requests in the storefront and will only validate requests
 * that meets certain criteria via DataDomeAPI. The method will skip remote includes and non HTTP requests.
 * If the request has to be validated then will invoke DataDomeAPI to perform validation. It will redirect
 * incoming requests if DataDome Protection API decides to block invalid requests.
 * @returns {Object} ddResponse
 */
function validate() {
    if (!request.includeRequest && request.httpRequest) {
        try {
            var ddResponse = DataDomeAPI.validate();

            if (ddResponse.invalid) {
                var redirectUrl;
                if (ddResponse.redirectExternal) {
                    redirectUrl = ddResponse.location;
                } else {
                    session.privacy.ddResponseHTML = ddResponse.errorHtml;

                    var requestPath = request.getHttpPath();
                    var requestQueryString = request.getHttpQueryString();
                    redirectUrl = URLUtils.https("DDUser-Challenge").toString() + "?redirect=" + encodeURIComponent(requestPath + (requestQueryString ? "?" + requestQueryString : ""));
                }

                response.redirect(redirectUrl);
            }
        } catch (e) {
            var ddLogger = require("*/cartridge/scripts/util/ddLogger.js");
            ddLogger.log("An error occured while trying to parse DataDome response" + e, "error", "DataDomeRequestFilter~validate");
        }
    }

    return new Status(Status.OK);
}

/* Module Exports */
module.exports = {
    onRequest: validate
};
