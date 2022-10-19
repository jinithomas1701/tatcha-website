"use strict";

/* global dw */

/* API Includes */
var Calendar = require("dw/util/Calendar");
var StringUtils = require("dw/util/StringUtils");
var Site = require("dw/system/Site");
var HashMap = require("dw/util/HashMap");

/**
 * This method is used to check the size of provided request parameter, if it's below or equal to limit then
 * It returns the original value but if it's more than limit then it will truncate the value and return that
 * truncated value.
 * @param {string} requestParam - request parameter
 * @Param {number} limit - request param size
 * @returns {string} requestParameter - truncated request parameter
 */
function truncateRequestParam(requestParam, limit) {
    var requestParameter = (requestParam && requestParam.length > limit)
        ? StringUtils.truncate(requestParam, limit, null, null)
        : requestParam;
    return requestParameter;
}

/**
 * This method is used to build request params by providing their limit in bytes, using RequestHandler method to truncate
 * params value if they exceed the provided limit. These limits are encouraged by Data Dome API.
 * @param {Request} request - current request object
 * @returns {HashMap} requestParamsMap - request params in the form of key value pairs
 */
function buildRequestParams(request) {
    var clientID;
    var cookieLength;
    var siteCustomPreferences = Site.getCurrent().getPreferences().custom;
    var requestHeaders = request.getHttpHeaders();
    var requestHeaderNamesCommaSeparated = (!requestHeaders.isEmpty()) ? requestHeaders.keySet().iterator().asList().join() : "";
    var requestParamsMap = new HashMap();
    var originalRequestPath = request.getHttpPath();
    var originalRequestQueryParams = request.getHttpQueryString();
    var originalRequestUrl = originalRequestQueryParams ? originalRequestPath + "?" + originalRequestQueryParams : originalRequestPath;
    var timeRequestMilliSeconds = (new Calendar()).getTime().getTime();
    var timeRequestMicroSeconds = timeRequestMilliSeconds * 1000;
    var httpRequestCookies = request.getHttpCookies();

    // eslint-disable-next-line no-plusplus
    for (var i = 0; i < httpRequestCookies.getCookieCount(); i++) {
        var cookie = httpRequestCookies[i];
        if (cookie.getName() === "datadome") {
            clientID = cookie.getValue();
            cookieLength = clientID.length;
        }
    }

    requestParamsMap.put("Key", siteCustomPreferences.ddApiKey);
    requestParamsMap.put("RequestModuleName", "SFCC");
    requestParamsMap.put("ModuleVersion", "20.1.5");
    requestParamsMap.put("IP", request.getHttpRemoteAddress());
    requestParamsMap.put("TimeRequest", timeRequestMicroSeconds);
    requestParamsMap.put("Protocol", request.getHttpProtocol());
    requestParamsMap.put("Method", request.getHttpMethod());
    requestParamsMap.put("UserAgent", truncateRequestParam(request.getHttpUserAgent(), 768));
    requestParamsMap.put("ServerHostname", truncateRequestParam(request.getHttpHost(), 512));
    requestParamsMap.put("ServerName", truncateRequestParam(dw.system.Site.getCurrent().getHttpHostName(), 512));
    requestParamsMap.put("Host", truncateRequestParam(request.getHttpHost(), 512));
    requestParamsMap.put("HeadersList", truncateRequestParam(requestHeaderNamesCommaSeparated, 512));
    requestParamsMap.put("Referer", truncateRequestParam(request.getHttpReferer(), 1024));
    requestParamsMap.put("Request", truncateRequestParam(originalRequestUrl, 2048));

    if (clientID) {
        requestParamsMap.put("ClientID", truncateRequestParam(clientID, 128));
    }
    if (cookieLength) {
        requestParamsMap.put("CookiesLen", cookieLength);
    }

    if (requestHeaders.get("Accept-Encoding")) {
        requestParamsMap.put("AcceptEncoding", truncateRequestParam(requestHeaders.get("Accept-Encoding"), 128));
    } else if (requestHeaders.get("accept-encoding")) {
        requestParamsMap.put("AcceptEncoding", truncateRequestParam(requestHeaders.get("accept-encoding"), 128));
    }
    if (requestHeaders.get("Accept-Language")) {
        requestParamsMap.put("AcceptLanguage", truncateRequestParam(requestHeaders.get("Accept-Language"), 256));
    } else if (requestHeaders.get("accept-language")) {
        requestParamsMap.put("AcceptLanguage", truncateRequestParam(requestHeaders.get("accept-language"), 256));
    }
    if (requestHeaders.get("Accept")) {
        requestParamsMap.put("Accept", truncateRequestParam(requestHeaders.get("Accept"), 512));
    }
    if (requestHeaders.get("accept")) {
        requestParamsMap.put("Accept", truncateRequestParam(requestHeaders.get("accept"), 512));
    }
    if (requestHeaders.get("Accept-Charset")) {
        requestParamsMap.put("AcceptCharset", truncateRequestParam(requestHeaders.get("Accept-Charset"), 128));
    } else if (requestHeaders.get("accept-charset")) {
        requestParamsMap.put("AcceptCharset", truncateRequestParam(requestHeaders.get("accept-charset"), 128));
    }
    if (requestHeaders.get("Origin")) {
        requestParamsMap.put("Origin", truncateRequestParam(requestHeaders.get("Origin"), 512));
    } else if (requestHeaders.get("origin")) {
        requestParamsMap.put("Origin", truncateRequestParam(requestHeaders.get("origin"), 512));
    }
    if (requestHeaders.get("X-Forwarded-For")) {
        requestParamsMap.put("XForwaredForIP", truncateRequestParam(requestHeaders.get("X-Forwarded-For"), 512));
    } else if (requestHeaders.get("x-forwarded-for")) {
        requestParamsMap.put("XForwaredForIP", truncateRequestParam(requestHeaders.get("x-forwarded-for"), 512));
    }
    if (requestHeaders.get("X-Requested-With")) {
        requestParamsMap.put("X-Requested-With", truncateRequestParam(requestHeaders.get("X-Requested-With"), 128));
    } else if (requestHeaders.get("x-requested-with")) {
        requestParamsMap.put("X-Requested-With", truncateRequestParam(requestHeaders.get("x-requested-with"), 128));
    }
    if (requestHeaders.get("Connection")) {
        requestParamsMap.put("Connection", truncateRequestParam(requestHeaders.get("Connection"), 128));
    } else if (requestHeaders.get("connection")) {
        requestParamsMap.put("Connection", truncateRequestParam(requestHeaders.get("connection"), 128));
    }
    if (requestHeaders.get("Pragma")) {
        requestParamsMap.put("Pragma", truncateRequestParam(requestHeaders.get("Pragma"), 128));
    } else if (requestHeaders.get("pragma")) {
        requestParamsMap.put("Pragma", truncateRequestParam(requestHeaders.get("pragma"), 128));
    }
    if (requestHeaders.get("Cache-Control")) {
        requestParamsMap.put("CacheControl", requestHeaders.get("Cache-Control"));
    } else if (requestHeaders.get("cache-control")) {
        requestParamsMap.put("CacheControl", requestHeaders.get("cache-control"));
    }
    if (requestHeaders.get("From")) {
        requestParamsMap.put("From", requestHeaders.get("From"));
    } else if (requestHeaders.get("from")) {
        requestParamsMap.put("From", requestHeaders.get("from"));
    }
    if (requestHeaders.get("X-Real-IP")) {
        requestParamsMap.put("X-Real-IP", requestHeaders.get("X-Real-IP"));
    } else if (requestHeaders.get("x-real-ip")) {
        requestParamsMap.put("X-Real-IP", requestHeaders.get("x-real-ip"));
    }
    if (requestHeaders.get("Via")) {
        requestParamsMap.put("Via", requestHeaders.get("Via"));
    } else if (requestHeaders.get("via")) {
        requestParamsMap.put("Via", requestHeaders.get("via"));
    }
    if (requestHeaders.get("True-Client-IP")) {
        requestParamsMap.put("TrueClientIP", requestHeaders.get("True-Client-IP"));
    } else if (requestHeaders.get("true-client-ip")) {
        requestParamsMap.put("TrueClientIP", requestHeaders.get("true-client-ip"));
    }

    return requestParamsMap;
}

/* Module Exports */
exports.buildRequestParams = buildRequestParams;
