"use strict";

/**
 * @module scripts/util/ddLogger
 *
 * This is a common script used for Logging purpose.
 * The log is written based on message type like debug, info or error.
 */

/**
 * This is a custom logger to log messages of all levels.
 *
 * @param {string} message : message to be logged
 * @param {string} severityLevel : level of message
 * @param {string} logLocation : location of class when error occured.
 */
function log(message, severityLevel, logLocation) {
    var Site = require("dw/system/Site");
    var Logger = require("dw/system/Logger");

    var loggerClass = "int_datadome";

    switch (severityLevel) {
        case "debug":
            var ddDebugLogEnabled = Site.getCurrent().getPreferences().custom.ddDebugLogEnabled;
            if (ddDebugLogEnabled) {
                Logger.getLogger(loggerClass).debug(logLocation + " : " + message);
            }
            break;

        case "info":
            var ddInfoLogEnabled = Site.getCurrent().getPreferences().custom.ddInfoLogEnabled;
            if (ddInfoLogEnabled) {
                Logger.getLogger(loggerClass).info(logLocation + " : " + message);
            }
            break;

        case "error":
            Logger.getLogger(loggerClass).error(logLocation + " : " + message);
            break;
        default:
    }
}

/* Module Exports */
exports.log = log;
