'use strict';

var OrderMgr = require('dw/order/OrderMgr');
var Logger   = require('dw/system/Logger');
var Order    = require('dw/order/Order');
var Transaction = require('dw/system/Transaction');
var Site = require('dw/system/Site');

/**
 * Get Gift Mail Delay Days
  * @param {Object} args - Arguments to filter the search
 */
function getGiftDelayDays(args){
    var data = {};
    //Consider the timezone
	var cal = new dw.util.Calendar(new Date());
	cal.setTimeZone('PST');
	var date = new Date(dw.util.StringUtils.formatCalendar(cal));
	
	if(args.date) {
	    var pdate = args.date.split('-');
	    date = new Date(pdate[0], (pdate[1]-1), pdate[2]);
	}

	var giftMailDelayDays = 0;
	if(Site.current.getCustomPreferenceValue('klaviyo_giftmail_interval')) {
		giftMailDelayDays = Site.current.getCustomPreferenceValue('klaviyo_giftmail_interval');
	}
	
	var from = new Date(date.toUTCString());
	var to = new Date(date.toUTCString());
	from.setDate(from.getDate() - giftMailDelayDays);
	
	dw.system.Logger.info("Date Interval From: "+from.toUTCString()+" To: "+to.toUTCString());

    data = {
		from : from,
		to : to
	}
    return data;
}
/**
 * Iterates over each gift certificate order and sending card
 * @param {*} orders 
 * @param {Object} args - Arguments to filter the search
 */
 function processOrders(orders,args) {
    var emailUtils = require('*/cartridge/scripts/utils/klaviyo/emailUtils');
    var GiftCertificate = require('*/cartridge/scripts/helpers/giftCertHelpers');
    var intervel = getGiftDelayDays(args);
    while (orders.hasNext()) {
		var order = orders.next();
		
		var count = 0;
		var shipments = order.getShipments().iterator();
		while (shipments.hasNext()) {
			var shipment = shipments.next();
			var giftCertificateLineItems = shipment.getGiftCertificateLineItems().iterator();
			
			while (giftCertificateLineItems.hasNext()) {
				var giftCertificateLineItem = giftCertificateLineItems.next();
				var dateString = !empty(giftCertificateLineItem.custom.giftCertificateDeliveryDate) ? new Date(giftCertificateLineItem.custom.giftCertificateDeliveryDate) : '';
				
				if((!giftCertificateLineItem.custom.hasOwnProperty('isGiftMailSent') || giftCertificateLineItem.custom.isGiftMailSent != true)
						&& dateString >= intervel.from && dateString <= intervel.to) {
					
					dw.system.Logger.info("Sending card for "+order.getOrderNo());
					
					Transaction.wrap(function () {
						var giftCertificate = GiftCertificate.createGiftCertificateFromLineItem(giftCertificateLineItem, order.getOrderNo());
						emailUtils.sendGiftCertificateEmail(giftCertificate, order.getOrderNo());
						giftCertificateLineItem.custom.isGiftMailSent = true;
					});
				}
				
				if(giftCertificateLineItem.custom.hasOwnProperty('isGiftMailSent') && giftCertificateLineItem.custom.isGiftMailSent == true) {
					count++;
				}		
			}
		}
		
		if(order.getGiftCertificateLineItems().size() == count) {
			Transaction.wrap(function () {
				order.custom.isGiftMailSent = true;
			});
		}
	}
 }
/**
 * Main entry point for the Job call
 * @param {Object} pdict - Arguments to filter the search
 */
 function execute(pdict) {
    var orders = OrderMgr.searchOrders('custom.hasGiftCertificate={0} AND custom.isGiftMailSent={1} AND (exportStatus={2} OR exportStatus={3})', 'creationDate desc', 
    true, null, dw.order.Order.EXPORT_STATUS_READY, dw.order.Order.EXPORT_STATUS_EXPORTED);
    processOrders(orders,pdict);
}

exports.execute = execute;