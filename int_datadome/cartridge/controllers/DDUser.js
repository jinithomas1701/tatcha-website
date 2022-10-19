"use strict";

/* global session */

var ISML = require("dw/template/ISML");

/**
 * It is used to block incoming requests and render error response returned from DataDome API.
 */
module.exports.Challenge = function () {
    var ddResponseHTML = session.privacy.ddResponseHTML;
    session.privacy.ddResponseHTML = null;

    const queryString = request.getHttpQueryString();
    if (queryString) {
        var match = queryString.match("redirect=([^;&]+)");
    }

    ISML.renderTemplate("error/ddresponse", {
        DDResponseHTML: ddResponseHTML,
        redirect: match && match[1] ? decodeURIComponent(match[1]) : null
    });
};

module.exports.Challenge.public = true;
