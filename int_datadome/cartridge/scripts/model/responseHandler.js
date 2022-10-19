"use strict";

/* eslint-disable no-plusplus */
/* global response */

/* API Includes */
var HashMap = require("dw/util/HashMap");
var Cookie = require("dw/web/Cookie");
var Response = require("dw/system/Response");
var StringUtils = require("dw/util/StringUtils");

var ddLogger = require("*/cartridge/scripts/util/ddLogger.js");

/**
 * This method is used to handle errors returned from Data Dome API and according
 * to that redirect request to specific page to show result.
 * @param {Object} responseParams - it contains responseHeaders and Result object retrieved from DataDome API.
 * @param {String} ddResponseStatus - status code with which DataDome decided to answer the client.
 * @returns {Object} ddResponse
 */
function handleError(responseParams, ddResponseStatus) {
    var ddResponse = { invalid: false };
    var locationHeaderName = "Location";
    var responseHeadersMap = responseParams.serviceResponseHeaders;
    var serviceResponse = responseParams.serviceResponse;

    if (serviceResponse.getError() === 400) {
        ddLogger.log("API responded with 400 error code which means you have provided wrong API key", "error", null);
    }
    else {
        switch (ddResponseStatus) {
            case "401":
            case "403":
                ddResponse.invalid = true;
                ddResponse.redirectInternal = true;
                ddResponse.errorHtml = serviceResponse.getObject();
                break;
            case "301":
            case "302":
                if (responseHeadersMap.contains(locationHeaderName)) {
                    ddResponse.invalid = true;
                    ddResponse.redirectExternal = true;
                    ddResponse.location = responseHeadersMap.get(locationHeaderName);
                }
                break;
            default:
                break;
        }
    }
    return ddResponse;
}

/**
 * This method is used build cookies Map based on values returned from Data Dome aPI.
 * @param {Object} cookieEntries - cookie header returned from data dome API.
 * @returns {HashMap} - cookie values hashmap
 */
function buildCookiesMap(cookieEntries) {
    var cookieNameValueSeparator = "=";
    var cookieValuesMap = new HashMap();
    for (var i = 0; i < cookieEntries.length; i++) {
        var cookieNameValue = String.split(cookieEntries[i], cookieNameValueSeparator);
        // trim the name to avoid any issues with cookie separator (ex: supporting ";" and "; ").
        var cookieName = StringUtils.trim(cookieNameValue[0]);
        var cookieValue = cookieNameValue[1];
        cookieValuesMap.put(cookieName, cookieValue);
    }

    return cookieValuesMap;
}
/**
 * This method is used to set http cookie to response object.
 * @param {Object} cookieHeader - cookie header returned from data dome API.
 */
function setCookie(cookieHeader) {
    var cookieEntrySparator = ";";

    var cookieEntries = String.split(cookieHeader, cookieEntrySparator);
    var cookieValuesMap = buildCookiesMap(cookieEntries);
    var cookie = new Cookie("datadome", cookieValuesMap.get("datadome"));

    var path = cookieValuesMap.get("Path");
    if (path !== null) {
        cookie.setPath(path);
    }

    var domain = cookieValuesMap.get("Domain");
    if (domain !== null) {
        cookie.setDomain(domain);
    }

    var maxAge = cookieValuesMap.get("Max-Age");
    if (maxAge !== null) {
        cookie.setMaxAge(maxAge);
    }

    var cookieKeySet = cookieValuesMap.keySet();
    if (cookieKeySet.contains("HttpOnly")) {
        cookie.setHttpOnly(true);
    }

    if (cookieKeySet.contains("Secure")) {
        cookie.setSecure(true);
    }

    response.addHttpCookie(cookie);
}

/**
 * This method is used to set http headers to response object.
 * @param {string} headerName - header name
 * @param {string} headerValue - header value
 */
function setResponseHeaders(headerName, headerValue) {
    var httpHeaderNamePrefix = "X-SF-CC-";

    switch (headerName) {
        case Response.ACCESS_CONTROL_ALLOW_CREDENTIALS:
            response.setHttpHeader(Response.ACCESS_CONTROL_ALLOW_CREDENTIALS, headerValue);
            break;
        case Response.ACCESS_CONTROL_ALLOW_HEADERS:
            response.setHttpHeader(Response.ACCESS_CONTROL_ALLOW_HEADERS, headerValue);
            break;
        case Response.ACCESS_CONTROL_ALLOW_METHODS:
            response.setHttpHeader(Response.ACCESS_CONTROL_ALLOW_METHODS, headerValue);
            break;
        case Response.ACCESS_CONTROL_ALLOW_ORIGIN:
            response.setHttpHeader(Response.ACCESS_CONTROL_ALLOW_ORIGIN, headerValue);
            break;
        case Response.ACCESS_CONTROL_EXPOSE_HEADERS:
            response.setHttpHeader(Response.ACCESS_CONTROL_EXPOSE_HEADERS, headerValue);
            break;
        case Response.ALLOW:
            response.setHttpHeader(Response.ALLOW, headerValue);
            break;
        case Response.CONTENT_DISPOSITION:
            response.setHttpHeader(Response.CONTENT_DISPOSITION, headerValue);
            break;
        case Response.CONTENT_LANGUAGE:
            response.setHttpHeader(Response.CONTENT_LANGUAGE, headerValue);
            break;
        case Response.CONTENT_LOCATION:
            response.setHttpHeader(Response.CONTENT_LOCATION, headerValue);
            break;
        case Response.CONTENT_MD5:
            response.setHttpHeader(Response.CONTENT_MD5, headerValue);
            break;
        case Response.CONTENT_SECURITY_POLICY:
            response.setHttpHeader(Response.CONTENT_SECURITY_POLICY, headerValue);
            break;
        case Response.CONTENT_TYPE:
            response.setHttpHeader(Response.CONTENT_TYPE, headerValue);
            break;
        case Response.LOCATION:
            response.setHttpHeader(Response.LOCATION, headerValue);
            break;
        case Response.PLATFORM_FOR_PRIVACY_PREFERENCES_PROJECT:
            response.setHttpHeader(Response.PLATFORM_FOR_PRIVACY_PREFERENCES_PROJECT, headerValue);
            break;
        case Response.REFERRER_POLICY:
            response.setHttpHeader(Response.REFERRER_POLICY, headerValue);
            break;
        case Response.REFRESH:
            response.setHttpHeader(Response.REFRESH, headerValue);
            break;
        case Response.RETRY_AFTER:
            response.setHttpHeader(Response.RETRY_AFTER, headerValue);
            break;
        case Response.VARY:
            response.setHttpHeader(Response.VARY, headerValue);
            break;
        case Response.X_CONTENT_TYPE_OPTIONS:
            response.setHttpHeader(Response.X_CONTENT_TYPE_OPTIONS, headerValue);
            break;
        case Response.X_FRAME_OPTIONS:
            response.setHttpHeader(Response.X_FRAME_OPTIONS, headerValue);
            break;
        case Response.X_FRAME_OPTIONS_ALLOW_FROM:
            response.setHttpHeader(Response.X_FRAME_OPTIONS_ALLOW_FROM, headerValue);
            break;
        case Response.X_FRAME_OPTIONS_DENY_VALUE:
            response.setHttpHeader(Response.X_FRAME_OPTIONS_DENY_VALUE, headerValue);
            break;
        case Response.X_FRAME_OPTIONS_SAMEORIGIN_VALUE:
            response.setHttpHeader(Response.X_FRAME_OPTIONS_SAMEORIGIN_VALUE, headerValue);
            break;
        case Response.X_ROBOTS_TAG:
            response.setHttpHeader(Response.X_ROBOTS_TAG, headerValue);
            break;
        case Response.X_XSS_PROTECTION:
            response.setHttpHeader(Response.X_XSS_PROTECTION, headerValue);
            break;
        default:
            response.setHttpHeader(httpHeaderNamePrefix + headerName, headerValue);
            break;
    }
}

/**
 * This method is used to parse response from object coming from web service response.
 * It also used to set headers in request/response according to headers returned from
 * Data Dome API, it handle errors from API and redirect user to specific page based on
 * error codes.
 * @param {Object} responseParams - it contains responseHeaders and Result object retrieved from Data Dome API.
 * @returns {Object} ddResponse
 */
function handleResponse(responseParams) {
    var ddResponse = { invalid: false };
    var ddResponseHeadersName = "X-DataDome-headers";
    var emptySpaceSeparator = " ";
    var setCookieHeaderName = "X-Set-Cookie";
    var responseStatusHeaderName = "X-DataDomeResponse";

    var serviceResponse = responseParams.serviceResponse;
    try {
        var responseHeadersMap = responseParams.serviceResponseHeaders;
        var ddResponseStatus = null;

        if (responseHeadersMap.get(responseStatusHeaderName)
            && responseHeadersMap.get(responseStatusHeaderName).iterator().hasNext()) {
            ddResponseStatus = responseHeadersMap.get(responseStatusHeaderName).iterator().next()
        }

        if (responseHeadersMap.get(setCookieHeaderName)
            && responseHeadersMap.get(setCookieHeaderName).iterator().hasNext()) {
            setCookie(responseHeadersMap.get(setCookieHeaderName).iterator().next());
        }

        if (serviceResponse.isOk() && ddResponseStatus === "200") {
            if (responseHeadersMap.containsKey(ddResponseHeadersName)) {
                var responseHeaderString = responseHeadersMap.get(ddResponseHeadersName).iterator().next();
                var responseHeaderListToAdd = String.split(responseHeaderString, emptySpaceSeparator);
                for (var i = 0; i < responseHeaderListToAdd.length; i++) {
                    var headerKey = responseHeaderListToAdd[i];
                    if (headerKey !== setCookieHeaderName) {
                        setResponseHeaders(headerKey, responseHeadersMap.get(headerKey).iterator().next());
                    }
                }
            }
        } else {
            ddResponse = handleError(responseParams, ddResponseStatus);
        }
    } catch (e) {
        ddLogger.log("Error occured while trying to set response headers " + e, "error", null);
    }

    return ddResponse;
}

/* Module Exports */
exports.handleResponse = handleResponse;
