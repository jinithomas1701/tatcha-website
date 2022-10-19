'use strict';

/**
 * @module scripts/yotpo/swell/export/SwellExporter
 *
 * The script is used to export data to Yotpo for Swell Loyalty.
 */

/**
 * This is the main function called to Export Order for Swell Loyalty to Yotpo.
 *
 * @param {Object} params : The parameters containing all mandatory data for export
 * @param {string} params.orderNo : The order number
 * @param {string} params.orderState : The order state e.g created, updated, refunded
 *
 * @return {boolean} true | false : Return true if mandatory params are present other wise return false
 */
function exportOrder(params) {
    var YotpoLogger = require('~/cartridge/scripts/yotpo/utils/YotpoLogger');
    var YotpoUtils = require('~/cartridge/scripts/yotpo/utils/YotpoUtils');
    var logLocation = 'SwellExporter~exportOrder';

    if (!YotpoUtils.isCartridgeEnabled() || !YotpoUtils.isSwellLoyaltyEnabled()) {
        return false;
    }

    try {
        if (!params.orderNo || !params.orderState || !(params.orderState === 'created' ||
            params.orderState === 'updated' || params.orderState === 'refunded')) {
            YotpoLogger.logMessage('The parameters missing mandatory data therefore aborting the process.',
                    'error', logLocation);
            return false;
        }

        var ExportSwellOrderModel = require('~/cartridge/scripts/yotpo/model/swell/export/ExportSwellOrderModel');
        ExportSwellOrderModel.exportOrder(params);
    } catch (ex) {
        YotpoLogger.logMessage('Something went wrong while exporting order number: ' + params.orderNo +
                ', Exception is: ' + ex, 'error', logLocation);
        return false;
    }

    return true;
}

/**
 * This is the main function called to Export Customer for Swell Loyalty to Yotpo.
 * This is triggerred in both account creation or update cases.
 *
 * @param {Object} params : The parameters containing all mandatory data for export
 * @param {string} params.customerNo : The customer number
 *
 * @return {boolean} true | false : Return true if mandatory params are present other wise return false
 */
function exportCustomer(params) {
    var YotpoLogger = require('~/cartridge/scripts/yotpo/utils/YotpoLogger');
    var YotpoUtils = require('~/cartridge/scripts/yotpo/utils/YotpoUtils');
    var logLocation = 'SwellExporter~exportCustomer';

    if (!YotpoUtils.isCartridgeEnabled() || !YotpoUtils.isSwellLoyaltyEnabled()) {
        return false;
    }

    try {
        if (!params.customerNo) {
            YotpoLogger.logMessage('The customer number is missing therefore aborting the process.',
                    'error', logLocation);
            return false;
        }

        var ExportSwellCustomerModel = require('~/cartridge/scripts/yotpo/model/swell/export/ExportSwellCustomerModel');
        ExportSwellCustomerModel.exportCustomer(params);
    } catch (ex) {
        YotpoLogger.logMessage('Something went wrong while exporting customer: ' + params.customerNo +
                ', Exception is: ' + ex, 'error', logLocation);
        return false;
    }

    return true;
}

/* Module Exports */
exports.exportOrder = exportOrder;
exports.exportCustomer = exportCustomer;
