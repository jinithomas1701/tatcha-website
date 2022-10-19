'use strict';

/**
 * @module scripts/yotpo/model/swell/export/SwellService
 *
 * The script is used to export payload for Swell Loyalty to Yotpo.
 */

/**
 * This function sends JSON payload to Yotpo. It makes HTTP request and reads the response and logs it.
 * It returns error in case of some problem in data submission.
 *
 * @param {Object} payload : The data in JSON format to be exported to Yotpo.
 * @param {Object} queryParams : The query string parameters appended to endpoint.
 * @param {string} endpoint : The endpoint to send data to.
 *
 * @returns {boolean} status: The flag to indicate the export status
 */
function exportData(payload, queryParams, endpoint) {
    var Result = require('dw/svc/Result');
    var SwellExportServiceRegistry = require('~/cartridge/scripts/yotpo/serviceregistry/SwellExportServiceRegistry');
    var Constants = require('~/cartridge/scripts/yotpo/utils/Constants');
    var YotpoLogger = require('~/cartridge/scripts/yotpo/utils/YotpoLogger');
    var YotpoUtils = require('~/cartridge/scripts/yotpo/utils/YotpoUtils');

    var logLocation = 'SwellService~exportData';

    try {
        var swellService = SwellExportServiceRegistry.swellService;
        var swellCredentials = swellService.getConfiguration().getCredential();
        var baseURL = swellCredentials.getURL();

        if (empty(baseURL)) {
            YotpoLogger.logMessage('The URL is empty for int_yotpo.https.post.swell.api', 'error', logLocation);
            throw Constants.EXPORT_ORDER_CONFIG_ERROR;
        }

        var serviceEndpoint = YotpoUtils.appendParamsToUrl(baseURL + endpoint, queryParams);
        swellService.setURL(serviceEndpoint);

        var requestJSON = JSON.stringify(payload);
        swellService.addHeader('Content-Length', requestJSON.length);
        var result = swellService.call(requestJSON);

        if (result.status === Result.OK) {
            YotpoLogger.logMessage('The data sumbitted successfully to Yotpo.', 'debug', logLocation);
        } else {
            YotpoLogger.logMessage('Could not export data to Yotpo ' +
                '- HTTP Status Code is: ' + result.error +
                '\n Error Text is: ' + result.errorMessage +
                '\n Swell Endpoint is: ' + serviceEndpoint, 'error', logLocation);
            throw Constants.EXPORT_SWELL_SERVICE_ERROR;
        }
    } catch (e) {
        YotpoLogger.logMessage('Error occured while trying to export data - ' + e, 'error', logLocation);
        throw Constants.EXPORT_SWELL_SERVICE_ERROR;
    }

    return true;
}

/* Module Exports */
exports.exportData = exportData;
