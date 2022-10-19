'use strict';

var klaviyoEmailUtils = null;
var klaviyoUtils = null;

var count=0;

function callback(order: Order) {
	count++;
	dw.system.Logger.info("order found: " + order.orderNo);

	try {
		
		if(empty(order.customerEmail)) {	
			dw.system.Logger.error("klaviyo event service call failed for livescale order. Error: no email for order: " + order.orderNo);
			return;
		}
		
        var tatchaOrder = klaviyoEmailUtils.prepareOrderPayload(order, false, 'orderConfirmation');
		
        klaviyoUtils.sendEmail(order.customerEmail, tatchaOrder, "Placed Order");
        
		// Update Order Export Flag
		require('dw/system/Transaction').wrap(function () {
			order.exportStatus = dw.order.Order.EXPORT_STATUS_READY;
			order.custom.preferredLocation = 'TATCHA-Rollins'
		});
		dw.system.Logger.info("klaviyo event service call sent for livescale order: " + order.orderNo);
	} catch (e) {
		var error = e;
		dw.system.Logger.error("klaviyo event service call failed for livescale order. Error: " + e.toString());
	}
}




/**
 *
 * @module  SendEmailLivescaleOrders
 */
'use strict';
//Date Format: 2020/07/03
/* Script Modules */

exports.SendEmailLivescaleOrders = function(pdict) {
	
	if (!pdict.fromDate) {
		dw.system.Logger.error("Please set from date for this job for a successful run");
		return;
	}
	
	var fromOrderDate = new Date(pdict.fromDate);
	
	var OrderMgr = require('dw/order/OrderMgr');
	
	var queryString = 'creationDate >= {0} and (status = {1} or status = {2}) and exportStatus = {3} and paymentStatus = {4} and custom.preferredLocation = {5}';
	
	klaviyoEmailUtils = require('*/cartridge/scripts/utils/klaviyo/emailUtils');
	klaviyoUtils = require('*/cartridge/scripts/utils/klaviyo/klaviyoUtils');
	
	OrderMgr.processOrders(callback, queryString, fromOrderDate, dw.order.Order.ORDER_STATUS_OPEN, dw.order.Order.ORDER_STATUS_NEW, dw.order.Order.EXPORT_STATUS_NOTEXPORTED, dw.order.Order.PAYMENT_STATUS_PAID, null);
	
	dw.system.Logger.info("found "+count+" orders for given condition");

}