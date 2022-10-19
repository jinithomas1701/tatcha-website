'use strict';

/**
 * This script provides helper functions
 * for the Linc Cancellation API
 */

var Logger = require('dw/system/Logger');
var LincShipmentHelper = require('int_linc_sfra/cartridge/scripts/helpers/lincShipmentHelper');


exports.SendOrderShipmentInfoLincJob = function (pdict) {
	var logger = Logger.getLogger('LincMigration','SendOrderShipmentInfoLincJob');
	var OrderMgr = require('dw/order/OrderMgr');

	var orderList = pdict.orderList;
	if(!empty(orderList)) {
		var orderListSplits = orderList.split(',');
		if(!empty(orderListSplits)) {
			for(var i = 0; i < orderListSplits.length; i++) {
				var orderObj = OrderMgr.getOrder(orderListSplits[i]);
				LincShipmentHelper.callLincShipmentJob(orderObj);
				logger.info('Processed order: ' +  orderObj.getOrderNo());
			}
		}
	} else {
		logger.warn('No orders for processing');
	}
}