'use strict';

var KlaviyoSubscriptionUtils = require('~/cartridge/scripts/utils/klaviyo/KlaviyoSubscriptionUtils');
/* Script Modules */
var app = require('app_storefront_controllers/cartridge/scripts/app');
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var Logger = require('dw/system/Logger');
var Site = require('dw/system/Site');
/**
 * Gets a ContentModel object that wraps the myaccount-home content asset,
 * updates the page metadata, and renders the account/accountoverview template.
 */
function subscribe() {
	
	var email = app.getForm('subscribe.email').value();
	var source = !empty(request.httpParameterMap.source) ? request.httpParameterMap.source.stringValue : '';
	let r = require('app_storefront_controllers/cartridge/scripts/util/Response');
	
	if(KlaviyoSubscriptionUtils.subscribeToList(email,source)) {
	    r.renderJSON({status: 'success'});
	} else {
		r.renderJSON({status: 'alreadyconfirmed'});
	}
	
}

function subscribeFromSPCheckout() {
	
	var params = request.httpParameterMap;
	var email = params.email.value;
	var source = !empty(params.source) ? params.source.stringValue : '';
	let r = require('app_storefront_controllers/cartridge/scripts/util/Response');
	
	if(KlaviyoSubscriptionUtils.subscribeToList(email,source)) {
	    r.renderJSON({status: 'success'});
	} else {
		r.renderJSON({status: 'alreadyconfirmed'});
	}
}


function resendKlaviyoOrderEmailsJob() {
	var logger = Logger.getLogger('KlaviyoJobs', 'Klaviyo - sendMailsJob()');
	var OrderMgr = require('dw/order/OrderMgr');
	var orderList = OrderMgr.searchOrders("custom.resendOrderEmail = {0}","orderNo asc", true);
	orderList = orderList.asList();

	if(!empty(orderList)) {
		for(var i in orderList) {
			var order = orderList[i];
			try {
				require('*/cartridge/scripts/utils/klaviyo/emailUtils').sendOrderEmail(myOrderObj, 'Placed Order');
				Transaction.wrap(function () {
					order.custom.resendOrderEmail = false;
				});
			} catch (e) {
				logger.error('resendKlaviyoOrderEmailsJob failed for order: ' + order.getOrderNo() + '. Error: ' +  e.message);
				return;
			}
		}
	}

}

function resendKlaviyoShipmentEmailsJob() {
	var logger = Logger.getLogger('KlaviyoJobs', 'Klaviyo - sendMailsJob()');
	var OrderMgr = require('dw/order/OrderMgr');
	var orderList = OrderMgr.searchOrders("custom.resendShipmentEmail = {0}","orderNo asc", true);
	orderList = orderList.asList();

	if(!empty(orderList)) {
		for(var i in orderList) {
			var order = orderList[i];
			try {
				require('*/cartridge/scripts/utils/klaviyo/emailUtils').sendOrderEmail(myOrderObj, 'Shipping Confirmation');
				Transaction.wrap(function () {
					order.custom.resendShipmentEmail = false;
				});
			} catch (e) {
				logger.error('resendKlaviyoShipmentEmailsJob failed for order: ' + order.getOrderNo() + '. Error: ' +  e.message);
				return;
			}
		}
	}

}

function comingsoonsubscribe() {
	var email = request.httpParameterMap.comingsoonemail.value;
	var productId = request.httpParameterMap.comingsoonpid.value;
	let r = require('app_storefront_controllers/cartridge/scripts/util/Response');
	
	if(!empty(email) && !empty(productId) && validateEmail(email)) {
		var comingsoonUtils = require("~/cartridge/scripts/utils/klaviyo/KlaviyoComingSoonUtils");
		var result = comingsoonUtils.addUsertoComingSoonList(email, productId);		
		if(request.httpParameterMap.hasOwnProperty('issubscribe') && request.httpParameterMap.issubscribe.value){
			var source='';
			KlaviyoSubscriptionUtils.subscribeToList(email,source)
		}
	}
	
		r.renderJSON({result:result});
	
}

function bissubscribe() {
	var logger = Logger.getLogger('KlaviyoBIS', 'Klaviyo - bissubscribe()');
	var email = request.httpParameterMap.bisnemail.value;
	var productId = request.httpParameterMap.bisnpid.value;
	let r = require('app_storefront_controllers/cartridge/scripts/util/Response');
	var sitePrefs = Site.getCurrent().getPreferences();
	var customBackInStockEnabled = 'custom_back_in_stock_enabled' in sitePrefs.getCustom() && sitePrefs.getCustom()["custom_back_in_stock_enabled"] ? sitePrefs.getCustom()["custom_back_in_stock_enabled"] : null;

	if (!empty(email) && !empty(productId) && validateEmail(email)) {
		var comingsoonUtils = require("~/cartridge/scripts/utils/klaviyo/KlaviyoBackinStockUtils");
		if (customBackInStockEnabled) {
			comingsoonUtils = require("~/cartridge/scripts/utils/klaviyo/KlaviyoCustomBackinStockUtils");
			//Adding suffix to point to Klaviyo custom catalog product ID
			productId = productId + '_CCBIS';
		}
		logger.info('Subscribing to Back in Stock - email, product: ' + email + ',' + productId);
		var result = comingsoonUtils.addUsertoBackInStockList(email, productId);
		if(request.httpParameterMap.hasOwnProperty('issubscribe') && request.httpParameterMap.issubscribe.value){
			var source='';
			KlaviyoSubscriptionUtils.subscribeToList(email,source)
		}
	}

	r.renderJSON({ result: result });

}

function bisform() {
	var pid = request.httpParameterMap.pid.stringValue;
	var product = app.getModel('Product').get(pid);
	app.getView({
		pid: pid,
		Product: product
	}).render('product/bisform_v1');
}

function whatsnextmail() {
	let r = require('app_storefront_controllers/cartridge/scripts/util/Response');
	var params = request.httpParameterMap;
	var productData = params.productData
	var email = params.email.stringValue;
	var addtoemaillist = params.addtoemaillist.stringValue;
	var mailType = 'Whatsnext mail';
	var source = '';
	
	if(!empty(productData) && !empty(email)) {
		var payloadData = prepareWhatsnextData(productData);
		require('int_klaviyo_services/cartridge/scripts/utils/klaviyo/KlaviyoUtils').sendEmail(email, payloadData, mailType);		
		if(addtoemaillist == 'true') {
			var result = KlaviyoSubscriptionUtils.subscribeToList(email,source)
		}
		r.renderJSON({status: 'success'});
		return;
	}
	r.renderJSON({status: 'error'});
	return;
}

function prepareWhatsnextData(productData) {
	var whatsnextData = {};
	productData = JSON.parse(productData);
	whatsnextData['sensitivity'] = productData['sensitivity'];
	whatsnextData['AMRotine'] = productData['AM'];
	whatsnextData['PMRoutine'] = productData['PM'];
	whatsnextData['skinType'] = productData['skinType'];
	whatsnextData['skinAndEyeConcern'] = (!empty(productData['skinandEyeConcern']))?productData['skinandEyeConcern'].split(','):[];
	whatsnextData['resultPage'] = productData['resultPage'];
	
	return whatsnextData;
}

/**
 * Method to validate email.
 * 
 * @param email
 * @returns
 */
function validateEmail(email) {
	var regex = /^[\w.%+-]+@[\w.-]+\.[\w]{2,6}$/;
    if(regex.test(email)) {
    	return true;
    } else {
    	return false;
    }
}


function gfResultsMail() {
	
	let r = require('app_storefront_controllers/cartridge/scripts/util/Response');
	var params = request.httpParameterMap;
	var productData = params.productData;
	var email = params.email.stringValue;
	var addtoemaillistGF = params.addtoemaillistGF.stringValue;
	var mailType = 'Gift finder mail';
	var source = '';
	
	if(!empty(productData) && !empty(email)) {
		var payloadData = prepareGiftFinderResultData(productData);
		require('int_klaviyo_services/cartridge/scripts/utils/klaviyo/KlaviyoUtils').sendEmail(email, payloadData, mailType);		
		if(addtoemaillistGF == 'true') {
			var result = KlaviyoSubscriptionUtils.subscribeToList(email,source)
		}
		r.renderJSON({status: 'success'});
		return;
	}
	r.renderJSON({status: 'error'});
	return;
}

function prepareGiftFinderResultData(productData) {
	var gfResultData = {};
	productData = JSON.parse(productData);
	gfResultData['name'] = productData['name']
	gfResultData['personaName'] = productData['persona'];
	gfResultData['priceRange'] = productData['priceRange'];
	gfResultData['products'] = productData['products'];
	
	return gfResultData;
	
	
}

/** Handles the form submission for subscription.
 * @see {@link module:controllers/Klaviyo~Subscribe} */
exports.Subscribe = guard.ensure(['post', 'https', 'csrf'], subscribe);
exports.SubscribeFromSPCheckout = guard.ensure(['post', 'https', 'csrf'], subscribeFromSPCheckout);
exports.ComingSoonSubscribe = guard.ensure(['post', 'https', 'csrf'], comingsoonsubscribe);
exports.BISSubscribe = guard.ensure(['post', 'https', 'csrf'], bissubscribe);
exports.BISForm = guard.ensure(['get'], bisform);
exports.WhatsnextMail = guard.ensure(['post'], whatsnextmail);
exports.GFResultsMail = guard.ensure(['post'], gfResultsMail);