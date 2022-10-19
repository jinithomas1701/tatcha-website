"use strict";

/* API Includes */
var LocalServiceRegistry = require("dw/svc/LocalServiceRegistry");
var Result = require("dw/svc/Result");
var Site = require("dw/system/Site");
var Encoding = require("dw/crypto/Encoding");

var ddLogger = require("*/cartridge/scripts/util/ddLogger.js");

/**
* Create and configure service.
*
* @param {string} serviceID - The service ID
* @param {Object} serviceConfig - The service configuration object
* @returns {Service} - The configured service
*/
function getService(serviceID, serviceConfig) {
    var dataDomeService = LocalServiceRegistry.createService(serviceID, serviceConfig);
    return dataDomeService;
}

/**
 * Service configurations for validating request.
 *
 * @returns {Object} serviceConfig - The service configuration
 */
function getValidateRequestServiceConfigs() {
    var serviceConfig = {
        createRequest: function (svc, args) {
            svc.setRequestMethod("POST");
            svc.addHeader("User-Agent", "DataDome");
            svc.addHeader("Content-Type", "application/x-www-form-urlencoded");
            svc.addHeader("X-DataDome-X-Set-Cookie", "true");
            svc.addHeader("X-DataDome-OK-On-Blocking", "true");
            return args;
        },

        filterLogMessage: function (msg) {
            var message = msg;
            if (message) {
                message = message.replace(/Key=.*?&/, "Key=************&");
                message = message.replace(/IP=.*?&/, "IP=************&");
                message = message.replace(/UserAgent=.*?&/, "UserAgent=************&");
                message = message.replace(/XForwaredForIP=.*?&/, "XForwaredForIP=************&");
                message = message.replace(/X-Real-IP=.*?&/, "X-Real-IP=************&");
                message = message.replace(/TrueClientIP=.*?&/, "TrueClientIP=************&");
            }

            return message;
        }
    };
    return serviceConfig;
}

/**
 * This method is used to create a request body sent to DataDome API.
 *
 * @param {HashMap} requestParamsMap - request parameters
 * @returns {String} requestBody - request body sent to DataDome API
 */
function createServiceRequestBody(requestParamsMap) {
    var requestBody = new String();
    var requestParamKeysSet = requestParamsMap.keySet();

    // eslint-disable-next-line no-plusplus
    for (var i = 0; i < requestParamKeysSet.getLength(); i++) {
        var requestParamKey = requestParamKeysSet[i];
        var requestParamValue = requestParamsMap.get(requestParamKey);
        if (requestBody.length > 0){
            requestBody = requestBody.concat('&');
        }
        requestBody = requestBody.concat(Encoding.toURI(requestParamKey, "UTF-8"), '=', requestParamValue === null ? '' : Encoding.toURI(requestParamValue, "UTF-8"));
    }

    return requestBody;
}

/**
* This method is used to make actual call to Data Dome service.
*
* @param {string} requestParamsMap - request parameters
* @returns {Result} ddServiceResponse - service result
*/
function callProtectionAPI(requestParamsMap) {
    var ddServiceResponse;
    var dataDomeService = getService("int_datadome.http.protection.api", getValidateRequestServiceConfigs());

    var ddServiceProtocol = Site.getCurrent().getPreferences().custom.ddServiceProtocol;
    var ddEndpoint = ddServiceProtocol + "://" + dataDomeService.getURL() + "/validate-request/";

    dataDomeService.setURL(ddEndpoint);

    try {
        var requestBody = createServiceRequestBody(requestParamsMap);
        ddServiceResponse = dataDomeService.call(requestBody);
        if (!ddServiceResponse.isOk()) {
            var responseStatus = ddServiceResponse.getStatus();

            if (Result.UNAVAILABLE_TIMEOUT.equals(responseStatus) || Result.SERVICE_UNAVAILABLE.equals(responseStatus)) {
                ddLogger.log("A real call was made to Data Dome API but there are issues with remote server like timeout, rate limits etc", "error", null);
            }
        }
    } catch (e) {
        ddLogger.log("An error occured while trying to validate request through Data Dome API " + e, "error", null);
    }

    var ddResponse = {
        serviceResponse: ddServiceResponse,
        serviceResponseHeaders: dataDomeService.getClient().getResponseHeaders()
    };

    return ddResponse;
}

/* Module Exports */
exports.callProtectionAPI = callProtectionAPI;
