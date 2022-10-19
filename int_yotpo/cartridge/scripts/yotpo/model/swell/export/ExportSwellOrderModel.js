'use strict';

/**
 * @module scripts/yotpo/model/swell/export/ExportSwellOrderModel
 *
 * The model is used to export order to Yotpo.
 */

/**
 * This is the main function called by Swell Exporter.
 *
 * @param {Object} params : The parameters containing all mandatory data for export
 * @param {string} params.orderNo : The order number
 * @param {string} params.orderState : The order state e.g created, updated, refunded
 */
function exportOrder(params) {
    var OrderMgr = require('dw/order/OrderMgr');
    var Site = require('dw/system/Site');

    var Constants = require('~/cartridge/scripts/yotpo/utils/Constants');
    var CommonModel = require('~/cartridge/scripts/yotpo/model/common/CommonModel');
    var SwellService = require('./SwellService');
    var SwellOrderModel = require('~/cartridge/scripts/yotpo/model/swell/common/SwellOrderModel');
    var YotpoLogger = require('~/cartridge/scripts/yotpo/utils/YotpoLogger');
    var YotpoUtils = require('~/cartridge/scripts/yotpo/utils/YotpoUtils');

    var localeID = request.locale;
    var logLocation = 'ExportSwellOrderModel~exportOrder';

    YotpoLogger.logMessage('\n------ Yotpo Export Order To Swell  --------' +
            '\n Current Site ID: ' + Site.getCurrent().getName() +
            '\n Date format for the Yotpo data: ' + Constants.DATE_FORMAT_FOR_YOTPO_DATA +
            '\n Current Locale: ' + localeID +
            '\n Order Number: ' + params.orderNo +
            '\n Order State: ' + params.orderState, 'debug', logLocation);

    var yotpoConfiguration = CommonModel.loadYotpoConfigurationsByLocale(localeID);
    var isValid = YotpoUtils.validateMandatorySwellConfigData(yotpoConfiguration);

    if (!isValid) {
        throw Constants.YOTPO_CONFIGURATION_LOAD_ERROR;
    }

    var order = OrderMgr.getOrder(params.orderNo);
    order = SwellOrderModel.saveUserInfoInOrder(order);
    var payload = SwellOrderModel.prepareOrderJSON(order);
    var queryParams = {
        guid: yotpoConfiguration.custom.swellGUID,
        api_key: yotpoConfiguration.custom.swellAPIKey
    };
    SwellService.exportData(payload, queryParams, 'orders');
}

/* Module Exports */
exports.exportOrder = exportOrder;
