'use strict';

/* global require, exports*/

/**
 * @module scripts/mParticleUtils
 */

var Site = require('dw/system/Site');
var Logger = require('dw/system/Logger');
var ServiceRegistry = require('dw/svc/LocalServiceRegistry');
var authorizationHeader = Site.getCurrent().getCustomPreferenceValue('mParticleHttpAuthorizationHeader');
var mParticleConfig = JSON.parse(Site.getCurrent().getCustomPreferenceValue('mParticleConfig'));
var ProductListMgr = require('dw/customer/ProductListMgr');
var Transaction = require('dw/system/Transaction');
var SORLogger = require("dw/system/Logger").getLogger("SORLogger", "SORLogger");
var BasketMgr = require('dw/order/BasketMgr');



/*
 * Build data to support mParticle rendering
 */
function buildMParticleData () {
	var mParticleData = {};
	var httpParameterMap = request.httpParameterMap;
	var pageContext = httpParameterMap.pagecontexttype;
	var checkoutState = httpParameterMap.checkoutState;
	var checkoutMode = httpParameterMap.checkoutMode;
	var paymentMethod = httpParameterMap.paymentMethod;
	mParticleData.pageContext = pageContext;
	mParticleData.pageTitle = httpParameterMap.pagecontexttitle;
	if(pageContext == 'checkout') {
		mParticleData.profileData = buildCheckoutProfileData();
	} else {
		mParticleData.profileData = buildProfileData();
	}
	mParticleData.authenticated = (!empty(session.customer)) ? session.customer.authenticated : false;
	mParticleData.checkoutState = checkoutState;
	mParticleData.checkoutMode = checkoutMode;
	mParticleData.paymentMethod = paymentMethod;
	return mParticleData;
}

function buildProfileData () {

	var profileData = {};

	var customer = session.customer;

	if (!empty(customer) && customer.authenticated) {
		profileData = buildCustomer(customer)
	}
	return JSON.stringify(profileData);

}

function buildCustomer(customer) {

	var profileData = {};
	var profileAttributes = {}

	profileData.email = customer.profile.email;
	profileData.customerNo = customer.profile.customerNo;

	if(customer.externallyAuthenticated) {
		if(!empty(customer.externalProfiles)) {
			profileData.facebookID = customer.externalProfiles[0].getExternalID();
		}
	}

	profileAttributes.$FirstName = customer.profile.firstName;
	profileAttributes.$LastName = customer.profile.lastName;

	if(!empty(customer.profile.custom.skinType)) {
		profileAttributes['Skin Type'] = customer.profile.custom.skinType.displayValue;
	}

	if(!empty(customer.profile.phoneMobile)) {
		profileAttributes.$Mobile = !empty(customer.profile.custom.countryCode) ? customer.profile.custom.countryCode + customer.profile.phoneMobile : customer.profile.phoneMobile;
	}

	if(!empty(session.privacy.wishlistPids)){
		profileAttributes.$Wishlist = session.privacy.wishlistPids;
	}
	//Update Auto Delivery status
	//var mParticleUtil = require('int_mParticle/cartridge/scripts/mParticleUtils.js');

	var autoDelivery = getCustomersActiveSubscriptions();
	if (autoDelivery === undefined || autoDelivery.length == 0) {
		autoDelivery = '';
	}
	profileAttributes['Auto Delivery'] = autoDelivery;

	if (!empty(customer.profile.addressBook.preferredAddress)) {
		profileAttributes.$Address = customer.profile.addressBook.preferredAddress.address1;
		profileAttributes.$City = customer.profile.addressBook.preferredAddress.city;
		profileAttributes.$State = customer.profile.addressBook.preferredAddress.stateCode;
		profileAttributes.$Zip = customer.profile.addressBook.preferredAddress.postalCode;
		profileAttributes.$Country = customer.profile.addressBook.preferredAddress.countryCode.displayValue;
	} else if (!empty(customer.profile.addressBook.addresses) && (customer.profile.addressBook.addresses.length > 0)) {
		profileAttributes.$Address = customer.profile.addressBook.addresses[0].address1;
		profileAttributes.$City = customer.profile.addressBook.addresses[0].city;
		profileAttributes.$State = customer.profile.addressBook.addresses[0].stateCode;
		profileAttributes.$Zip = customer.profile.addressBook.addresses[0].postalCode;
		profileAttributes.$Country = customer.profile.addressBook.addresses[0].countryCode.displayValue;
	}

	profileData.profileAttributes = profileAttributes;

	return profileData;

}

function buildCheckoutProfileData () {

	var profileData = {};
	var profileAttributes = {};
	//var cart = app.getModel('Cart').get();
	var cart = BasketMgr.getCurrentBasket();

	var customer = session.customer;

	if (!empty(customer) && customer.authenticated) {

		profileData = buildCustomer(customer);

	} else if(cart && !empty(cart.getCustomerEmail())) {

		profileData.email = cart.getCustomerEmail();
		profileData.authenticated = false;

		if (!empty(cart.getCustomerNo())) {
			profileData.customerNo = cart.getCustomerNo();
		}

		var customer = cart.getCustomer();

		var billingAddress = cart.getBillingAddress();
		if (!empty(billingAddress)) {
			profileAttributes.$FirstName = billingAddress.firstName;
			profileAttributes.$LastName = billingAddress.lastName;
			profileAttributes.$Address = billingAddress.address1;
			profileAttributes.$City = billingAddress.city;
			profileAttributes.$State = billingAddress.stateCode;
			profileAttributes.$Zip = billingAddress.postalCode;
			profileAttributes.$Country = billingAddress.countryCode.displayValue;
		}
		//Update auto delivery status
		//var mParticleUtil = require('int_mParticle/cartridge/scripts/mParticleUtils.js');
		profileAttributes['Auto Delivery'] = getCustomersActiveSubscriptions();
		profileData.profileAttributes = profileAttributes;

	}

	return JSON.stringify(profileData);

}

function preparePurchaseData(order) {
	
    var orderData = {};
    
    if(order && order !== null) {
    	
		var merchTotalExclOrderDiscounts = order.getAdjustedMerchandizeTotalPrice(false);
		var merchTotalInclOrderDiscounts = order.getAdjustedMerchandizeTotalPrice(true);
		var orderDiscount = merchTotalExclOrderDiscounts.subtract( merchTotalInclOrderDiscounts );
		
		orderData.discount = (orderDiscount.value)?orderDiscount.value:0;		
		orderData.transactionId = order.orderNo ? order.orderNo : '';
		orderData.revenue = order.totalGrossPrice ? order.totalGrossPrice.value : '';
		orderData.tax = order.totalTax ? order.totalTax.value : '';
				
		// Payment Details 
		var paymentMethod = '';
		var paymentMethods = [];
		if(order.paymentInstruments && order.paymentInstruments.length > 0) {
			
			for(var j in order.paymentInstruments) {				
				paymentMethods.push(order.paymentInstruments[j].paymentMethod);
			}
			
			paymentMethod = paymentMethods.toString();
		}
		orderData.paymentMethod = paymentMethod;
		
		// Coupon code and shipping methods
		var shippingMethod = '';
		var discountCoupon = '';
		if(order.shipments && order.shipments.length > 0){	
			
			shippingMethod = (order.shipments[0].shippingMethod && order.shipments[0].shippingMethod.displayName)? order.shipments[0].shippingMethod.displayName:'';
			orderData.shippingMethod = shippingMethod;
			orderData.shippingPrice = (order.shipments[0].adjustedShippingTotalPrice)? order.shipments[0].adjustedShippingTotalPrice.value:'';
			
			var shippingLineItems = order.shipments[0].shippingLineItems;
			if(shippingLineItems && shippingLineItems.length > 0){
				if(shippingLineItems[0].lineItemCtnr){
					var couponLineItems = shippingLineItems[0].lineItemCtnr.couponLineItems;
					if(couponLineItems && couponLineItems.length > 0){
						var couponLineItem = {};
						for(var j in couponLineItems) {
							if(couponLineItems[j].statusCode == 'APPLIED'){
								discountCoupon = couponLineItems[j].couponCode;
								break;
							}							
						}
					}	
				}				
			} else {
				discountCoupon = '';
			}	
			orderData.discountCoupon = discountCoupon;
			
			
			var productLineItems = order.shipments[0].productLineItems;
			var productInfo = {};
			var items = [];
			if(productLineItems && productLineItems.length > 0){
				for(var j in productLineItems) {
					var productLineItem = productLineItems[j];
					let masterId = productLineItem.product.isVariant() || productLineItem.product.isVariationGroup() ? productLineItem.product.getMasterProduct().getID() : productLineItem.product.getID();
					let primaryCategory = !empty(productLineItem.product.getPrimaryCategory()) ? productLineItem.product.getPrimaryCategory().displayName : '';
					let quantity= productLineItem.quantity ? productLineItem.quantity.value : '';
					
				    //Variation values
				    var variationValues = getVariation(productLineItem.product);
				    
					productInfo = {
							sku: productLineItem.product.ID,
							productname: productLineItem.product.name,
							price: productLineItem.product.priceModel.getPrice().value,
							masterSku: masterId,
							category: primaryCategory,
							quantity:quantity,
							variation:variationValues
						};
					
					if(productLineItem.custom.hasSmartOrderRefill && productLineItem.custom.SorMonthInterval > 0) {
						productInfo.autoDelivery = productLineItem.custom.hasSmartOrderRefill;
						productInfo.autoDeliveryInterval = productLineItem.custom.SorMonthInterval;
					}
					items.push(productInfo);
				}
			}
			
			var giftCertificateLineItems = order.giftCertificateLineItems;
			if(giftCertificateLineItems && giftCertificateLineItems.length > 0){
				for(var j in giftCertificateLineItems) {
					var giftCertificateLineItem = giftCertificateLineItems[j];
					
					productInfo = {
							sku: Site.getCurrent().getCustomPreferenceValue('EgiftProduct-ID'),
							productname : giftCertificateLineItem.lineItemText,
							quantity : 1,
							price : giftCertificateLineItem.price.value,
							recipientEmail : giftCertificateLineItem.recipientEmail,
							recipientName : giftCertificateLineItem.recipientName,
							senderName : giftCertificateLineItem.senderName,
							category: 'Gift cards'
					}
					
					items.push(productInfo);
				}
			}
			
			
			orderData.items = items;
		}

    }
    
	return orderData;
}

function prepareHistoricalPurchaseData(order) {
	
    var orderData = {};
    
    if(order && order !== null) {
    	
		var merchTotalExclOrderDiscounts = order.getAdjustedMerchandizeTotalPrice(false);
		var merchTotalInclOrderDiscounts = order.getAdjustedMerchandizeTotalPrice(true);
		var orderDiscount = merchTotalExclOrderDiscounts.subtract( merchTotalInclOrderDiscounts );
		
		orderData.discount = (orderDiscount.value)?orderDiscount.value:0;		
		orderData.transactionId = order.orderNo ? order.orderNo : '';
		orderData.revenue = order.totalGrossPrice ? order.totalGrossPrice.value : '';
		orderData.tax = order.totalTax ? order.totalTax.value : '';
				
		// Payment Details 
		var paymentMethod = '';
		var paymentMethods = [];
		if(order.paymentInstruments && order.paymentInstruments.length > 0) {
			
			for(var j in order.paymentInstruments) {				
				paymentMethods.push(order.paymentInstruments[j].paymentMethod);
			}
			
			paymentMethod = paymentMethods.toString();
		}
		orderData.paymentMethod = paymentMethod;
		
		// Coupon code and shipping methods
		var shippingMethod = '';
		var discountCoupon = '';
		if(order.shipments && order.shipments.length > 0){	
			
			shippingMethod = (order.shipments[0].shippingMethod && order.shipments[0].shippingMethod.displayName)? order.shipments[0].shippingMethod.displayName:'';
			orderData.shippingMethod = shippingMethod;
			orderData.shippingPrice = (order.shipments[0].adjustedShippingTotalPrice)? order.shipments[0].adjustedShippingTotalPrice.value:'';
			
			var shippingLineItems = order.shipments[0].shippingLineItems;
			if(shippingLineItems && shippingLineItems.length > 0){
				if(shippingLineItems[0].lineItemCtnr){
					var couponLineItems = shippingLineItems[0].lineItemCtnr.couponLineItems;
					if(couponLineItems && couponLineItems.length > 0){
						var couponLineItem = {};
						for(var j in couponLineItems) {
							if(couponLineItems[j].statusCode == 'APPLIED'){
								discountCoupon = couponLineItems[j].couponCode;
								break;
							}							
						}
					}	
				}				
			} else {
				discountCoupon = '';
			}	
			orderData.discountCoupon = discountCoupon;
			
			
			var productLineItems = order.shipments[0].productLineItems;
			var productInfo = {};
			var items = [];
			if(productLineItems && productLineItems.length > 0){
				for(var j in productLineItems) {
					var productLineItem = productLineItems[j];
					var productID = productLineItem.productID;
					var product = dw.catalog.ProductMgr.getProduct(productID);
					let masterId = (product.isVariant() || product.isVariationGroup()) ? product.getMasterProduct().getID() : product.getID();
					let primaryCategory = !empty(product.getPrimaryCategory()) ? product.getPrimaryCategory().displayName : '';
					let quantity= productLineItem.quantity ? productLineItem.quantity.value : '';
					
				    //Variation values
				    var variationValues = getVariation(product);
				    
					productInfo = {
							sku: productID,
							productname: product.name,
							price: product.priceModel.getPrice().value,
							masterSku: masterId,
							category: primaryCategory,
							quantity:quantity,
							variation:variationValues
						};
					
					if(productLineItem.custom.hasSmartOrderRefill && productLineItem.custom.SorMonthInterval > 0) {
						productInfo.autoDelivery = productLineItem.custom.hasSmartOrderRefill;
						productInfo.autoDeliveryInterval = productLineItem.custom.SorMonthInterval;
					}
					items.push(productInfo);
				}
			}
			
			var giftCertificateLineItems = order.giftCertificateLineItems;
			if(giftCertificateLineItems && giftCertificateLineItems.length > 0){
				for(var j in giftCertificateLineItems) {
					var giftCertificateLineItem = giftCertificateLineItems[j];
					
					productInfo = {
							sku: Site.getCurrent().getCustomPreferenceValue('EgiftProduct-ID'),
							productname : giftCertificateLineItem.lineItemText,
							quantity : 1,
							price : giftCertificateLineItem.price.value,
							recipientEmail : giftCertificateLineItem.recipientEmail,
							recipientName : giftCertificateLineItem.recipientName,
							senderName : giftCertificateLineItem.senderName,
							category: 'Gift cards'
					}
					
					items.push(productInfo);
				}
			}
			
			
			orderData.items = items;
		}

    }
    
	return orderData;
}

function getVariation(product){
	var variationValues = '';
    if(product.isVariant()) {
    	var variationAttrs = product.variationModel.getProductVariationAttributes();
    	for(var i = 0; i < variationAttrs.length; i++) {
    		var VA = variationAttrs[i];
    		var selectedValue = product.variationModel.getSelectedValue(VA);
    		if(selectedValue) {
    			variationValues = variationValues + selectedValue.displayValue;
	    		if(i < (variationAttrs.length - 1)) {
	    			variationValues = variationValues + ' | ';
				}
    		}			    		
    	}
    }
    return variationValues;
}

function getVariationSFRA(product){
	var variationValues = '';
    if (product.isVariantProduct) {
    	var variationAttrs = product.variationAttributes;
    	for(var i = 0; i < variationAttrs.length; i++) {
    		var variationAttr = variationAttrs[i];
    		for(var j = 0; j < variationAttr.values.length; j++) {
				var variationVal = variationAttr.values[j];
				if (variationVal.selected) {
					variationValues = variationValues + variationVal.displayValue;
					if (j < (variationAttrs.values.length - 1)) {
		    			variationValues = variationValues + ' | ';
					}
				}
			}
    	}
    }
    return variationValues;
}

function getProductInfo(product){
	var productInfo = {};
	try {
		if(!empty(product)){
			var masterId = product.isVariant() || product.isVariationGroup() ? product.getMasterProduct().getID() : product.getID();	
			var variant = getVariation(product);
			productInfo = {
				sku: product.ID,
				productname: product.name,
				price: product.priceModel.getPrice().value,
				masterSku: masterId,
				variant:variant
			};
			var primaryCategory = !empty(product.getPrimaryCategory()) ? product.getPrimaryCategory().displayName : '';
			if (primaryCategory && typeof(primaryCategory) != 'undefined') {
				productInfo["category"] = primaryCategory;
			}
		}
	} catch(e) {}
	
	return productInfo;
}

function getProductInfoSFRA(product){
	var productInfo = {};
	try {
		if(!empty(product)){
			var masterId = product.isVariantProduct || product.isVariantGroupProduct ? product.masterProductID : product.id;	
			var variant = getVariationSFRA(product);
			productInfo = {
				sku: product.id,
				productname: product.productName,
				price: product.price.sales.value,
				masterSku: masterId,
				variant: variant,
				category: product.primaryCategoryName
			};
		}
	} catch(e) {}
	
	return productInfo;
}

function getCustomerInfo(order) {
	
	var userData = {};
	var userIdentities = {};
	var userAttributes = {};
	
	var customer = order.getCustomer();
	
	if (!empty(customer) && customer.profile) {
		
		userIdentities.email = customer.profile.email;
		userIdentities.customerid = customer.profile.customerNo;
		
		if(customer.externallyAuthenticated) {
			if(!empty(customer.externalProfiles)) {
				userIdentities.facebook = customer.externalProfiles[0].getExternalID();
			}
		}
		
		userAttributes.$FirstName = customer.profile.firstName;
		userAttributes.$LastName = customer.profile.lastName;
		
		if(!empty(customer.profile.custom.skinType)) {
			userAttributes['Skin Type'] = customer.profile.custom.skinType.displayValue;
		}
		
		if(!empty(customer.profile.phoneMobile)) {
			userAttributes.$Mobile = !empty(customer.profile.custom.countryCode) ? customer.profile.custom.countryCode + customer.profile.phoneMobile : customer.profile.phoneMobile;
		}
		
		//get wishlist
		userAttributes.$Wishlist = getWishlist(customer);

		//Update auto delivery status
		
		//Fix for RDMP-3142
		var activeSubscriptions = getCustomersActiveSubscriptions();
		
		if(!empty(activeSubscriptions)) {
			userAttributes['Auto Delivery'] = activeSubscriptions;
		}
		
		if (!empty(customer.profile.addressBook.preferredAddress)) {
			userAttributes.$Address = customer.profile.addressBook.preferredAddress.address1;
			userAttributes.$City = customer.profile.addressBook.preferredAddress.city;
			userAttributes.$State = customer.profile.addressBook.preferredAddress.stateCode;
			userAttributes.$Zip = customer.profile.addressBook.preferredAddress.postalCode;
			userAttributes.$Country = customer.profile.addressBook.preferredAddress.countryCode.displayValue;
		} else if (!empty(customer.profile.addressBook.addresses) && (customer.profile.addressBook.addresses.length > 0)) {
			userAttributes.$Address = customer.profile.addressBook.addresses[0].address1;
			userAttributes.$City = customer.profile.addressBook.addresses[0].city;
			userAttributes.$State = customer.profile.addressBook.addresses[0].stateCode;
			userAttributes.$Zip = customer.profile.addressBook.addresses[0].postalCode;
			userAttributes.$Country = customer.profile.addressBook.addresses[0].countryCode.displayValue;
		}
		
		userData.userAttributes = userAttributes;
		
	} else {
		
		userIdentities.email = order.getCustomerEmail();
		
	}
	
	userData.userIdentities = userIdentities;
	
	return userData;
	
}

function getWishlist(customer){
	
	var wishlistitems = null;
    var wishlistPids = [];
    
	wishlistitems = ProductListMgr.getProductLists(customer, dw.customer.ProductList.TYPE_WISH_LIST);
    if (wishlistitems.empty) {
        Transaction.wrap(function () {
        	wishlistitems = ProductListMgr.createProductList(customer, dw.customer.ProductList.TYPE_WISH_LIST);
        });
    } else {
    	wishlistitems = wishlistitems[0];
    }
    
    if(!empty(wishlistitems.items)){
    	var wishlistContent = new dw.util.ArrayList(wishlistitems.items);
        try {
        	for (var i = 0; i < wishlistContent.length; i++) {
        		if(wishlistContent[i] && wishlistContent[i].product) {
    				wishlistPids.push(wishlistContent[i].product.name);
    			}
    		}
    	} catch (e) {
    		Logger.info('Mparticle wishlist error', e.toString());
    	}
    }
    return wishlistPids.toString();
}

/*
 * Klaviyo event
 */
function klaviyoEventTrigger(eventName, eventAttributes){
	
	var requestData = {};
	
	requestData = {				
		events : [
		   {				        	
		       data : {
		    	   event_name: eventName,
		    	   custom_event_type: "other",
		    	   custom_attributes : JSON.parse(eventAttributes)
		       },
		       event_type : "custom_event"				            
			}
		 ],
		 user_identities : {
		 	email : (customer && customer.profile.email) ? customer.profile.email : "",
		 	customer_id : (customer && customer.profile.customerNo) ? customer.profile.customerNo : ""		 	
		 }
		};

	
	try{		
		//var strData = JSON.stringify(requestData);
		callmParticleService(requestData);
		//return resultObj;
	} catch(e){
		Logger.error('Mpartcile Util - klaviyoEventTrigger - error - '+ e.toString());
	}
}

/**
 * mPartcile service call
 * @param payload
 * @returns
 */
function callmParticleService(requestData){
	try{
		var payload = preparePayload(requestData);
		Logger.info('mParticle Util - service call - payload - '+ JSON.stringify(payload));
		var result = mParticleEventsAPIService.call(JSON.stringify(payload));
		Logger.info('mParticle Util - service call - result - '+ result.status);
		return result;
	}catch (e) {
		Logger.error('mParticle Util - service call - error - '+ e.toString());
	}
}

function getCustomersActiveSubscriptions () {
var RefillCustomerModel = require("int_smartorderrefill/cartridge/models/smartOrderRefill/refillCustomer.js");
	var refillCustomer = new RefillCustomerModel({
		customer: customer
	});
	var subscriptionsList = [];
	subscriptionsList = refillCustomer.getActiveSubscriptions();
	var subscriptionProds = [];
	if(!empty(subscriptionsList) && subscriptionsList.length > 0){
		for each(var subscription in subscriptionsList){
			var products = subscription.products;
			 for each(var prod in products){
				var prodName = dw.catalog.ProductMgr.getProduct(prod.ID);
				subscriptionProds.push(prodName.name);
			}
		}
		subscriptionProds = subscriptionProds.toString();
		session.privacy.subscriptionProds = subscriptionProds;
	}
	return subscriptionProds;
}
/**
 * mPartcile historical event service call
 * @param payload
 * @returns
 */
function callmParticleHistoricalAPIService(requestData){
	try{
		var payloadJson = [];
		for ( var pl in requestData) {
			var payload = preparePayload(requestData[pl]);
			payloadJson.push(payload);
		}
		Logger.info('mParticle Util - service call - payload - '+ JSON.stringify(payloadJson));
		var result = mParticleHistoricalAPIService.call(JSON.stringify(payloadJson));
		Logger.info('mParticle Util - service call - result - '+ result.status);
		return result;
	}catch (e) {
		Logger.error('mParticle Util - service call - error - '+ e.toString());
	}
}

function preparePayload(payload){
	payload.environment = (mParticleConfig.isDevelopmentMode) ? "development" : "production";
	//Set Content
	if (mParticleConfig.dataPlan) {
		var context = {};
		var dataPlan = {};
		dataPlan.plan_id = mParticleConfig.dataPlan.planId;
		dataPlan.plan_version = mParticleConfig.dataPlan.planVersion;
		context.data_plan = dataPlan;
		payload.context = context;
	}
	return payload;
}

function createPurchaseDataJsonForCreateOrder(order){
	try {
		var orderData = preparePurchaseData(order);
    	var customerData = getCustomerInfo(order);

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
			'isGuestCheckout': !empty(order.getCustomerNo()) ? true : false
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
		return requestData;
	} catch(e){
		SORLogger.info("Error found while executing the function createPurchaseDataJsonForCreateOrder: " + order.orderNo);
	}

}
//HTTP Services

var mParticleEventsAPIService = ServiceRegistry.createService('mParticleEventsAPIService', {
	
	/**
     * Parse object with request data into string line for request
     * @param {dw.svc.HTTPService} service Service, which will be used for the call
     * @param {Object} requestData Object with request data
     * @returns {boolean} String line for request
     */
    createRequest: function (service, args) {
    	service.setRequestMethod('POST');
    	service.addHeader('Content-Type', 'application/json');
    	service.addHeader('Authorization', authorizationHeader);
    	var serviceCredential = service.getConfiguration().getCredential();
    	service.setURL(serviceCredential.getURL());
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

var mParticleHistoricalAPIService  = ServiceRegistry.createService('mParticlehistoricalAPIService', {
	
	/**
     * Parse object with request data into string line for request
     * @param {dw.svc.HTTPService} service Service, which will be used for the call
     * @param {Object} requestData Object with request data
     * @returns {boolean} String line for request
     */
    createRequest: function (service, args) {
    	service.setRequestMethod('POST');
    	service.addHeader('Content-Type', 'application/json');
    	service.addHeader('Authorization', authorizationHeader);
    	var serviceCredential = service.getConfiguration().getCredential();
    	service.setURL(serviceCredential.getURL());
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

/* Module Exports */
module.exports = {
	buildMParticleData : buildMParticleData,
	buildProfileData: buildProfileData,
	buildCheckoutProfileData: buildCheckoutProfileData,
	preparePurchaseData : preparePurchaseData,
	getProductInfo : getProductInfo,
	getProductInfoSFRA: getProductInfoSFRA,
	getVariation : getVariation,
	getCustomerInfo : getCustomerInfo,
	klaviyoEventTrigger : klaviyoEventTrigger,
	callmParticleService : callmParticleService,
	callmParticleHistoricalAPIService : callmParticleHistoricalAPIService,
	createPurchaseDataJsonForCreateOrder : createPurchaseDataJsonForCreateOrder,
	getCustomersActiveSubscriptions : getCustomersActiveSubscriptions,
	prepareHistoricalPurchaseData : prepareHistoricalPurchaseData
}