'use strict';

/**
 * @module controllers/Yotpo
 *
 * This is the main script called by the Job Schedule to export orders to Yotpo.
 * It delegates the request to ExportOrderModel for processing.
 */

/**
 * This function exports orders to yotpo.
 * @returns {Object} Status
 */
function execute() {
    var Status = require('dw/system/Status');
    var ExportOrderModel = require('~/cartridge/scripts/yotpo/model/orderexport/ExportOrderModel.js');
    var YotpoLogger = require('~/cartridge/scripts/yotpo/utils/YotpoLogger');
    var YotpoUtils = require('~/cartridge/scripts/yotpo/utils/YotpoUtils');

    var logLocation = 'Yotpo~ExportOrders';

    if (!YotpoUtils.isCartridgeEnabled()) {
        return new Status(Status.ERROR);
    }

    try {
        ExportOrderModel.exportOrder();
    } catch (ex) {
        YotpoLogger.logMessage('Something went wrong while exporting orders, Exception code is: ' + ex, 'error', logLocation);
        return new Status(Status.ERROR);
    }
    return new Status(Status.OK);
}

/* Module Exports */
exports.execute = execute;
