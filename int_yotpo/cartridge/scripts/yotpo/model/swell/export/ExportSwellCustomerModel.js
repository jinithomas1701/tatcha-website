'use strict';

/**
 * @module scripts/yotpo/model/swell/export/ExportSwellCustomerModel
 *
 * The model is used to export customer data to Yotpo
 */

/**
 * This is the main function called by Swell Exporter.
 *
 * @param {Object} params : The parameters containing all mandatory data for export
 * @param {string} params.customerNo : The customer number
 */
function exportCustomer(params) {
    var CustomerMgr = require('dw/customer/CustomerMgr');
    var Site = require('dw/system/Site');

    var Constants = require('~/cartridge/scripts/yotpo/utils/Constants');
    var CommonModel = require('~/cartridge/scripts/yotpo/model/common/CommonModel');
    var SwellCustomerModel = require('~/cartridge/scripts/yotpo/model/swell/common/SwellCustomerModel');
    var SwellService = require('./SwellService');
    var YotpoLogger = require('~/cartridge/scripts/yotpo/utils/YotpoLogger');
    var YotpoUtils = require('~/cartridge/scripts/yotpo/utils/YotpoUtils');

    var logLocation = 'ExportSwellCustomerModel~exportCustomer';

    var localeID = request.locale;

    YotpoLogger.logMessage('\n------ Yotpo Export Order To Swell  --------' +
            '\n Current Site ID: ' + Site.getCurrent().getName() +
            '\n Customer Number: ' + params.customerNo, 'debug', logLocation);

    var yotpoConfiguration = CommonModel.loadYotpoConfigurationsByLocale(localeID);
    var isValid = YotpoUtils.validateMandatorySwellConfigData(yotpoConfiguration);

    if (!isValid) {
        throw Constants.YOTPO_CONFIGURATION_LOAD_ERROR;
    }
    var customerObj = CustomerMgr.getCustomerByCustomerNumber(params.customerNo);
    var profile = customerObj.profile;

    var payload = SwellCustomerModel.prepareCustomerJSON(profile);
    var queryParams = {
        guid: yotpoConfiguration.custom.swellGUID,
        api_key: yotpoConfiguration.custom.swellAPIKey
    };
    SwellService.exportData(payload, queryParams, 'customers');
}

/* Module Exports */
exports.exportCustomer = exportCustomer;
