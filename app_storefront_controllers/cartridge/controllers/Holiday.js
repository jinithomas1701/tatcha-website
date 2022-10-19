'use strict';

/**
 * Controller that returns type of coupon for an email.
 *
 * @module controllers/getWinningCouponType
 */

var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var response = require('~/cartridge/scripts/util/Response');
var Resource = require('dw/web/Resource');

var KlaviyoSubscriptionUtils = require('int_klaviyo_services/cartridge/scripts/utils/klaviyo/KlaviyoSubscriptionUtils');

/**
 * Returns the winning coupon type.
 */
function getWinningCouponType1() {
	    
	var params = request.httpParameterMap;
	var email = params.email.stringValue;	
	response.renderJSON({
	"response" : {
			"status":"success",
			"email":email,
			"coupon_code":"",    
			"coupon_type":"TYPE4",       
			"error" : [
			     {
			            "msg" : ""
			     }
			 ]
		}
	});

}

/**
 * Get offer msg for the response coupon type
 * **/
function getOfferMessage(couponType) {
	var offerMsg = '';
	if(!empty(couponType)) {
		switch(couponType) {
			case 'TYPE1':
				offerMsg = Resource.msg('holiday.offer_msg.type1', 'content', null);
				break;
			case 'TYPE2':
				offerMsg = Resource.msg('holiday.offer_msg.type2', 'content', null);
				break;
			case 'TYPE3':
				offerMsg = Resource.msg('holiday.offer_msg.type3', 'content', null);
				break;
			case 'TYPE4':
				offerMsg = Resource.msg('holiday.offer_msg.type4', 'content', null);
				break;
			default:
				break;
		}
	}
	return offerMsg;
}

/**
 * Returns the winning coupon type.
 */
function getWinningCouponType() {
	    
	var email = request.httpParameterMap.email.stringValue;
	var newsletterSignup = request.httpParameterMap.newsletter_login.stringValue;
	var newsLetterSubscription = false;
	
	
	if(empty(email)){
		response.renderJSON({
			   "response" : {
				      "status":"error",
				      "email":"",
				      "coupon_code":"",    
				      "coupon_type":"",       
				      "error" : [
				         {
				            "msg" : "NO_EMAIL"
				         }
				      ]
				   }
				});
		return;
	}
	
	
	var status = "";
	var winningType = '';
	var msg = '';
	var offerMsg = '';
	var param =  {"email":email};
	params = JSON.stringify(param); 
	
	var httpClient = new dw.net.HTTPClient();
	httpClient.setTimeout(5000);
	httpClient.open('POST', 'https://temari.tatcha.com/api/v1/customer/register');
	httpClient.setRequestHeader('Content-Type', 'application/json');
	httpClient.setRequestHeader('Accept', 'application/json');
	httpClient.setRequestHeader('Authorization', 'Bearer 100-token');
	httpClient.send(params);  
	if (httpClient.statusCode == 200) {		
		var rsp = JSON.parse(httpClient.text); 
		if(rsp.response.status != "error"){		
			status = 'success';
			
			offerMsg = getOfferMessage(rsp.response.coupon_type);
			msg = '';
		} else {
			status = 'error';
			msg = rsp.response.error.msg;
		}

	} else {
		status = 'error';
		msg = 'http error';
	}
	
	
	if(email != rsp.response.email) {
		response.renderJSON({
			   "response" : {
				      "status":"error",
				      "email":"",
				      "coupon_code":"",    
				      "coupon_type":"",       
				      "error" : [
				         {
				            "msg" : "EMAIL MISMATCH"
				         }
				      ]
				   }
				});
		return;		
	}
	
	if(newsletterSignup === 'true') {
		newsLetterSubscription = KlaviyoSubscriptionUtils.subscribeToList(email,'holiday');
	}
	
	response.renderJSON({
		   "response" : {
			      "status":status,
			      "email":email,
			      "coupon_code":rsp.response.coupon_code,    
			      "coupon_type":rsp.response.coupon_type,
			      "newsLetterSubscription": newsLetterSubscription,
			      "offerMsg": offerMsg,
			      "error" : [
			         {
			            "msg" : msg
			         }
			      ]
			   }
			});
	return;

}


/**
 * Returns the winning coupon type.
 */
function sendCouponcode() {
	var params = request.httpParameterMap;    
	var email = params.email.stringValue;
	var coupon_type = params.coupon_type.stringValue;
	

	var status = "";
	var winningType = '';
	var msg = '';
	var param =  {"email":email,"coupon_type":coupon_type};
	params = JSON.stringify(param); 
	
	var httpClient = new dw.net.HTTPClient();
	httpClient.setTimeout(5000);
	httpClient.open('POST', ' https://temari.tatcha.com/api/v1/customer/sendcoupon');
	httpClient.setRequestHeader('Content-Type', 'application/json');
	httpClient.setRequestHeader('Accept', 'application/json');
	httpClient.setRequestHeader('Authorization', 'Bearer 100-token');
	httpClient.send(params);  
	if (httpClient.statusCode == 200) {		
		var rsp = JSON.parse(httpClient.text); 
		winningType = rsp.coupon_type;
		if(winningType!=''){		
			status = 'success';
			msg = '';
		} else {
			status = 'failure';
			msg = 'multiple';
		}

	} else {
		status = 'failure';
		msg = 'http error';
	}
	
	response.renderJSON({
		   "response" : {
			      "status":status,
			      "email":email,
			      "coupon_code":"",    
			      "coupon_type":winningType,       
			      "error" : [
			         {
			            "msg" : msg
			         }
			      ]
			   }
			});
	return;

}

function holidayForm() {
	app.getView().render('content/holiday/token');
}

/*
 * Export the publicly available controller methods
 */
exports.HolidayForm = guard.ensure(['get'], holidayForm);
exports.GetWinningCouponType = guard.ensure(['post','csrf'], getWinningCouponType);
exports.SendCouponcode = guard.ensure(['post'], sendCouponcode);
