
var Site = require('dw/system/Site');
var ServiceRegistry = require('dw/svc/LocalServiceRegistry');
var pixelID = Site.getCurrent().getCustomPreferenceValue('fbPixelID');
var apiVersion = Site.getCurrent().getCustomPreferenceValue('fbAPIVersion');
var apiToken = Site.getCurrent().getCustomPreferenceValue('fbAccessToken');
var apiEventCode = Site.getCurrent().getCustomPreferenceValue('fbTestEventCode');
var enableDebugMode = Site.getCurrent().getCustomPreferenceValue('fbDebugMode');
var Encoding = require('dw/crypto/Encoding');
var MessageDigest = require('dw/crypto/MessageDigest');
var Bytes = require('dw/util/Bytes');
var LOGGER = require('dw/system/Logger');


function facebookEventTrigger(params){

	var eventName = params.eventName.value;
	
	var requestData = {};
	
	if(enableDebugMode){
		requestData = {
			test_event_code: apiEventCode,
			data:[]
		};
	}else{
		requestData = {
			data:[]
		};
	}

	var rData = {};
	try{
		if(!empty(eventName)) {
			switch(eventName) {
				/*case 'PageView':
					rData = pageViewEventPayload(params);
					break;*/
				case 'View Content':
					rData = productViewEventPayload(params);
					break;
				case 'AddToCart':
					rData = addToCartEventPayload(params);
					break;
				case 'InitiateCheckout':
					rData = initiateCheckoutEventPayload(params);
					break;
				case 'Purchase':
					rData = purchaseEventPayload(params);
					break;
				default:
					break;
			}
		}
		
		requestData.data.push(rData);
		var strData = JSON.stringify(requestData);
		var result = FacebookConversionService.call(strData);
		var resultObj = JSON.parse(result.object);
		return resultObj;
	} catch(e){
		LOGGER.error('Facebook API Helper - facebookEventTrigger - error - '+ e.toString());
	}
}

function purchaseEventPayload(params){
	
	var productInfo = JSON.parse(params.eventData);
	
	var currentDate = new Date();
	var currentTime = Math.floor(currentDate.getTime()/1000).toString();
	var rData = {
			event_name: params.eventName.value,
			event_time: currentTime,
			event_id: productInfo.orderNo+'-'+currentTime,
			event_source_url: params.sourceurl.value,
			action_source: "website",
			user_data : {
				client_ip_address: request.httpRemoteAddress,
				client_user_agent: request.httpUserAgent,
				em: productInfo.email
			},
			custom_data: {
				value: productInfo.price,
				currency: 'USD',
				content_ids: productInfo.productList,
				content_type: "product"
			},
			opt_out: true
	}
	
	return rData;
}


/*
 * function pageViewEventPayload(params){
	
	var currentDate = new Date();
	var currentTime = Math.floor(currentDate.getTime()/1000).toString();
	var rData = {
			event_name: params.eventName.value,
			event_time: currentTime,
			event_id: request.requestID,
			event_source_url: params.sourceurl.value,
			action_source: "website",
			user_data : {
				client_ip_address: request.httpRemoteAddress,
				client_user_agent: request.httpUserAgent,
			},
			opt_out: true
	}
	
	return rData;
}
*/
function productViewEventPayload(params){
	
	var productInfo = JSON.parse(params.eventData);
	var productList = [];
	productList.push(productInfo.sku);
	var currentDate = new Date();
	var currentTime = Math.floor(currentDate.getTime()/1000).toString();
	
	var rData = {
			event_name: params.eventName.value,
			event_time: currentTime,
			event_id: productInfo.sku+'-'+currentTime,
			event_source_url: params.sourceurl.value,
			action_source: "website",
			user_data : {
				client_ip_address: request.httpRemoteAddress,
				client_user_agent: request.httpUserAgent,
			},
			custom_data: {
				content_type: 'product',
				content_ids: productList,
				content_name: productInfo.productname,
				content_category: productInfo.category,
				value: productInfo.price,
				currency: 'USD'
			},
			opt_out: true
	}
	
	return rData;
	
}

function addToCartEventPayload(params){
	
	var currentDate = new Date();
	var currentTime = Math.floor(currentDate.getTime()/1000).toString();
	var productInfo = JSON.parse(params.eventData);
	var productList = [];
	productList.push(productInfo.sku);
	var rData = {
			event_name: params.eventName.value,
			event_time: currentTime,
			event_id: productInfo.sku+'-'+currentTime,
			event_source_url: params.sourceurl.value,
			action_source: "website",
			user_data : {
				client_ip_address: request.httpRemoteAddress,
				client_user_agent: request.httpUserAgent
			},
			custom_data: {
				content_type: 'product',
				content_ids: productList,
				content_name: productInfo.productname,
				value: productInfo.price,
				currency: 'USD'
			},
			opt_out: true
	}
	
	return rData;
}

function initiateCheckoutEventPayload(params){
	
	var currentDate = new Date();
	var currentTime = Math.floor(currentDate.getTime()/1000).toString();
	var basketInfo = JSON.parse(params.eventData);
	var rData = {
			event_name: params.eventName.value,
			event_time: currentTime,
			event_id: basketInfo.UUID+'-'+currentTime,
			event_source_url: params.sourceurl.value,
			action_source: "website",
			user_data : {
				client_ip_address: request.httpRemoteAddress,
				client_user_agent: request.httpUserAgent,
			},
			custom_data: {
				contents: basketInfo.productList,
				value: basketInfo.value,
				num_items : basketInfo.num_items,
				currency: 'USD'
			},
			opt_out: true
	}
	return rData;
	
}

function getBasketDetails(basket){
	var productList = [];
	var pdata = {};
	for (var i = 0; i < basket.productLineItems.length; i++) {
	var product = basket.productLineItems[i];
	pdata = {
			id : product.productID,
			quantity : product.quantity.value,
			item_price: product.price.value
	}
	productList.push(pdata);
	}
	
	var basketInfo = {
		productList : productList,
		UUID : basket.UUID,
		value : basket.adjustedMerchandizeTotalPrice.value,
		num_items : basket.productLineItems.length
	}
	
	return basketInfo;
}


function preparePurchaseEventData(order){
	var productList = [];
	var orderInfo = {};
	for each(product in order.productLineItems) {
		productList.push(product.product.ID);
	}
	var email = order.getCustomerEmail();
	var messageDigest = new MessageDigest(MessageDigest.DIGEST_SHA_256);  
	var hashedEm = Encoding.toHex(messageDigest.digestBytes(new Bytes(email, "UTF-8")));
	
	orderInfo = {
		productList : productList,
		orderNo : order.orderNo, 
		email : hashedEm,
		price : order.totalGrossPrice ? order.totalGrossPrice.value : ''
	}
	
	return orderInfo;
}

//HTTP Services

var FacebookConversionService = ServiceRegistry.createService('FacebookConversionApi', {
	
	/**
     * Parse object with request data into string line for request
     * @param {dw.svc.HTTPService} service Service, which will be used for the call
     * @param {Object} requestData Object with request data
     * @returns {boolean} String line for request
     */
    createRequest: function (service, args) {
    	service.setRequestMethod('POST');
    	service.addHeader('Content-Type', 'application/json');
    	var serviceCredential = service.getConfiguration().getCredential();
    	var serviceUrl = serviceCredential.getURL();
    	serviceUrl += '/'+ apiVersion + '/' + pixelID + '/events?access_token=' + apiToken;
    	service.setURL(serviceUrl);
    	return args;
    },
    
    /**
     * Parse XML response from API call into object
     * @param {dw.svc.HTTPService} service Service that is used for API call
     * @param {dw.net.HTTPClient} httpClient Demandware http client
     * @return {Object} Response data
     */
    parseResponse: function (service, httpClient) {
    	return httpClient.text;
    }
});


module.exports = {
	facebookEventTrigger : facebookEventTrigger,
	getBasketDetails : getBasketDetails,
	preparePurchaseEventData : preparePurchaseEventData
}