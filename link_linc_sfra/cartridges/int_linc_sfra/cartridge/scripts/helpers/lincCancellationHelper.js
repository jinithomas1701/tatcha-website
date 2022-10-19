/**
 * This script provides helper functions
 * for the Linc Cancellation API
 */

var Logger = require('dw/system/Logger');
var Site = require('dw/system/Site');

/**
 * Calls the Linc Delete order API for cancellation
 *
 * @param {Date} orderCreationDate
 * @returns {Number}
 */
function callLincCancellationAPI(orderNo) {
	try {
		var logger = Logger.getLogger('LincCancel','LincCancellationHelper');
		var useLinc = Site.getCurrent().getCustomPreferenceValue('LincEnabled');
		if(useLinc) {
			var lincService = require('int_linc_sfra/cartridge/scripts/service/lincCancelService');
			lincService.callLincCancel(orderNo);
		}
	} catch (e) {
		logger.error('Error calling cancellation for order: ' + orderNo + '. Error: ' + e.message);
	}
}

module.exports = {
	callLincCancellationAPI : callLincCancellationAPI
}