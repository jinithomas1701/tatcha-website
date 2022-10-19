'use strict';

var mParticleUtils = null;

var count=0;

function callback(order: Order) {
	count++;
	dw.system.Logger.info("order found: " + order.orderNo);

	var orderData = mParticleUtils.prepareHistoricalPurchaseData(order);
	//dw.system.Logger.info("order data: " + JSON.stringify(orderData));

	var customerData = mParticleUtils.getCustomerInfo(order);
	//dw.system.Logger.info("customer data: " + JSON.stringify(customerData));

	var productItems = [];
	var items = orderData.items;
	for ( var i in items) {
		var item = items[i];
		var product = {
				id : item.sku,
				name : item.productname,
				brand : 'Tatcha',
				category : item.category,
				variant : item.variation,
				position : ++i,
				price : item.price,
				quantity : item.quantity,
				coupon_code : orderData.discountCoupon,
				custom_attributes : {
					originalPrice : item.price,
					mainSKU : item.masterSku,
					type : ''
				}
		};

		productItems.push(product);
	}

	var customAttributes = {
			'Payment Type': orderData.paymentMethod,
			'Shipping Type': orderData.shippingMethod,
			'isGuestCheckout': !empty(order.getCustomerNo()) ? false : true
	}
	var requestData = {
			events: [{
				data: {
					product_action: {
						action: 'purchase',
						checkout_step : 0,
						transaction_id : orderData.transactionId ? orderData.transactionId : '',
								total_amount: orderData.revenue ? orderData.revenue: 0,
										tax_amount: orderData.tax ? orderData.tax : 0,
												shipping_amount : orderData.shippingPrice ? orderData.shippingPrice : 0,
														coupon_code : orderData.discountCoupon ? orderData.discountCoupon : '',
																products : productItems
					},
					custom_attributes: customAttributes,
					timestamp_unixtime_ms : Math.floor(order.getCreationDate())
				},
				event_type: 'commerce_event'
			}],
			user_attributes : customerData.userAttributes,
			user_identities : customerData.userIdentities
	};

	var purchaseEventData = [];
	purchaseEventData.push(requestData);
	//dw.system.Logger.info("purchase event data: " + purchaseEventData);
	try {
		var result = mParticleUtils.callmParticleHistoricalAPIService(purchaseEventData);
		if(result.ok){
			// Update Order Flag
			require('dw/system/Transaction').wrap(function () {
				order.custom.orderHistoryProcessed = true;
			});
		}
		dw.system.Logger.info("purchase event service call: " + result.status);
	} catch (e) {
		var error = e;
		dw.system.Logger.error("purchase event service call error: " + e.toString());
	}
}



/**
 *
 * @module  OrderExport
 */
'use strict';
//Date Format: 2020/07/03
/* Script Modules */

exports.PushOrdersToMParticle = function(pdict) {
	var OrderMgr = require('dw/order/OrderMgr');
	
	if (!pdict.fromDate && !pdict.toDate) {
		return;
	}
	
	fromOrderDate = new Date(pdict.fromDate);
	
	toOrderDate = new Date(pdict.toDate);
	
	dw.system.Logger.info('From Date: ' + fromOrderDate);
			
	dw.system.Logger.info('To Date: ' + toOrderDate);
	
	var queryString = 'creationDate >= {0} and creationDate <= {1} and shippingStatus = {2} and (custom.orderHistoryProcessed = {3} or custom.orderHistoryProcessed = {4})';
	
	mParticleUtils = require('../mParticleUtils');
	
	OrderMgr.processOrders(callback, queryString, fromOrderDate, toOrderDate, dw.order.Order.SHIPPING_STATUS_SHIPPED, null, false);
	
	dw.system.Logger.info("found "+count+" orders for given condition");

}