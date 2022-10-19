'use strict';

/**
 * Controller that returns type of coupon for an email.
 *
 * @module controllers/getWinningCouponType
 */

var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var response = require('~/cartridge/scripts/util/Response');
var Tatcha = require('app_storefront_core/cartridge/scripts/util/Tatcha');
var Resource = require('dw/web/Resource');

//var KlaviyoSubscriptionUtils = require('int_klaviyo_services/cartridge/scripts/utils/klaviyo/KlaviyoSubscriptionUtils');
var KlaviyoUtils = require('int_klaviyo_services/cartridge/scripts/utils/klaviyo/KlaviyoUtils');
var roomToReadEndPoint = dw.system.Site.current.getCustomPreferenceValue('roomToReadEndPoint');

/**
 * Returns random wishes.
 */
function getWishes() {
	
	var status = "";
	var httpClient = new dw.net.HTTPClient();
	httpClient.setTimeout(5000);
	httpClient.open('GET', 'https://'+roomToReadEndPoint+'/api/wishes/random');
	httpClient.send();
	if (httpClient.statusCode == 200) {		
		var rsp = JSON.parse(new XML(httpClient.text));
		status = "success";
	} else {
		status = "error";
	}
	
	response.renderJSON({
		   "response" : {
			      "status":status,
			      "wishes": rsp
			   }
			});	

	return;
}

/**
 * Post response to  wish.
 */
function postWishResponse() {
	
	var status = "";
	var params = request.httpParameterMap;    
	var wish_id = params.wish_id.stringValue;
	var inspiration_text = params.inspiration_text.stringValue;

	if(inspiration_text!='' && wish_id!='') {
		
		var postData : String = "";
		postData += ("wish_id="+wish_id);
		postData += ("&inspiration_text="  + encodeURIComponent(inspiration_text));
		
		var httpClient = new dw.net.HTTPClient();
		httpClient.setTimeout(5000);
		httpClient.open('POST', 'https://'+roomToReadEndPoint+'/api/wish-inspirations');
		httpClient.setRequestHeader("Content-type", "application/x-www-form-urlencoded; charset=UTF-8");
		httpClient.setRequestHeader("Content-length", postData.length);
		httpClient.send(postData);	
		
		if (httpClient.statusCode == 200 || httpClient.statusCode == 201) {		
			status = "success";
			var rsp = JSON.parse(httpClient.text); 
		} 
		
	} else {
		status = 'error';
	}
	
	
	response.renderJSON({
		   "response" : {
			      "status":status
			   }
			});	

	return;
}

/**
 * Sign up for newsletter .
 */
function subscribeNewsletter() {
	var status = "";
//	var newsLetterSubscription = false;
	var params = request.httpParameterMap;    
	var subscriptionEmail = params.subscriptionEmail.stringValue;
	var data = {};
	
	try {
		KlaviyoUtils.sendEmail(subscriptionEmail, data, 'R2R');
		status = 'success';
	} catch (e){

	}
	
//	newsLetterSubscription = KlaviyoSubscriptionUtils.subscribeToList(subscriptionEmail,'roomToread');
//	
//	if(newsLetterSubscription){
//		status = 'success';
//	}
	
	response.renderJSON({
		   "response" : {
			      "status":status
			   }
			});	

	return;
}

/*
 * Export the publicly available controller methods
 */
exports.GetWishes = guard.ensure(['get'], getWishes);
exports.PostWishResponse = guard.ensure(['post'], postWishResponse);
exports.SubscribeNewsletter = guard.ensure(['post'], subscribeNewsletter);