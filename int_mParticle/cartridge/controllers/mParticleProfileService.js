"use strict";

/* API Includes */
var LocalServiceRegistry = require("dw/svc/LocalServiceRegistry");
var Result = require("dw/svc/Result");
var Site = require("dw/system/Site");
var Encoding = require("dw/crypto/Encoding");


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