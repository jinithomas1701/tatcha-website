'use strict';

/**
 * Controller that push customers, orders to Selligent WS
 *
 * @module controllers/SelligentPush
 */
var app = require('~/cartridge/scripts/app');
var SelligentPushCustomer = app.getModel('selligentPushCustomer');
var SelligentPushOrder = app.getModel('selligentPushOrder');
var Site = require('dw/system/Site');

/*
 * Entry point used by the Selligent Windows Service to launch exports of Products, customers, orders and abandoned baskets
 * 
 */
function pushCustomer (email : String ) {
	var UseSelligent = Site.getCurrent().getCustomPreferenceValue('UseSelligentPushCustomer');
	if(UseSelligent == true) {
		SelligentPushCustomer.Push(email);
	}
}

function pushOrder (order : dw.order.Order ) {
	var UseSelligent = Site.getCurrent().getCustomPreferenceValue('UseSelligentPushOrder');
	if(UseSelligent == true) {
		SelligentPushOrder.Push(order);
	}
}

/*
* Exposed methods.
*/
/** Push customer into Selligent Web Service **/
exports.PushCustomer = pushCustomer;
/** Push an order into Selligent Web Service **/
exports.PushOrder = pushOrder; 
