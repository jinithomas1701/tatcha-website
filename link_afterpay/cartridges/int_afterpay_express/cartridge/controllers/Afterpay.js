"use strict";

/* API Includes */
var server = require('server');

var CustomerMgr = require('dw/customer/CustomerMgr');
var HashMap = require('dw/util/HashMap');
var Resource = require('dw/web/Resource');
var ShippingMgr = require('dw/order/ShippingMgr');
var Site = require('dw/system/Site');
var Transaction = require('dw/system/Transaction');
var URLUtils = require('dw/web/URLUtils');
var BasketMgr = require('dw/order/BasketMgr');

var Logger = require('dw/system/Logger');

/* Afterpay Includes */
var AfterpayApiContext = require('int_afterpay_core/cartridge/scripts/context/afterpayApiContext');
var AfterpayHttpService = require('int_afterpay_custom_tatcha_us/cartridge/scripts/logic/services/afterpayHttpService');
var OrderRequestBuilder = require('int_afterpay_custom_tatcha_us/cartridge/scripts/order/orderRequestBuilder');
var ExpressUtil    = require('*/cartridge/scripts/util/ExpressUtil.js');

/* Script Modules */
var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
var shippingHelpers = require('*/cartridge/scripts/checkout/shippingHelpers');

var basket = BasketMgr.getCurrentBasket();

//Function to generate Afterpay Express token
server.post('AfterpayExpressGetToken', server.middleware.https, function (req, res, next) {

	var formatedTotal = basket.getGiftCertificateTotalGrossPrice().value + basket.getAdjustedMerchandizeTotalPrice().value;
	formatedTotal = formatedTotal.toFixed(2);
	var currencyCode = basket.getCurrencyCode();
	var totalTax = basket.getMerchandizeTotalTax();
	var dataParam = request.httpParameterMap;
	var params = {
			"amount": {
				"currency": currencyCode
			},
			"mode": "express", 
			"requestMethod":"POST",
			"merchant": {
				"popupOriginUrl": dataParam.currentUrl.value
			}
		  };	
	params.amount.amount = formatedTotal.toString();
	var afterpayHttpService = new AfterpayHttpService();
    var afterpayApiContext = new AfterpayApiContext();
	var requestUrl = afterpayApiContext.getFlowApiUrls().get('checkouts');
	var response = afterpayHttpService.call(requestUrl, 'CREATE_ORDER', params,'','createToken');
	var token = response.token;

	res.json({
		response:{
			afterpaytoken: token
		}
	});
	return next();
});

server.post('AfterpayExpressGetShippingMethods', server.middleware.https, function (req, res, next) {

	var i, address = {}, applicableShippingMethods, shippingCosts, currentShippingMethod, method, shippingMethod;
	var params = request.httpParameterMap;
	address.countryCode = params.countryCode.value ? params.countryCode.value : ' ';
    address.stateCode = params.state.value ? params.state.value : ' ';
    address.postalCode = params.postcode.value ? params.postcode.value : ' ';
    address.city = params.suburb.value ? params.suburb.value : ' ';
    address.address1 = params.address1.value ? params.address1.value : ' ';
    address.address2 = params.address2.value ? params.address2.value : '';
	if (!address.countryCode) {
		address.countryCode = 'US';
	}
	if (!address.stateCode) {
		address.stateCode = 'NY';
	}
    var fullName = params.name.value;
    var firstName = '';
    firstName = params.name.value;
    var lastName = ' '; 
    var nameArray = fullName.split(' ');
    if(nameArray.length > 0){        	
    	firstName = nameArray[0];
    	lastName = fullName.replace(firstName,'');
    }

	var shipment = basket.defaultShipment;
	var shippingAddress = shipment.shippingAddress;
    Transaction.wrap(function () {
    	// Setting afterpay given shipping address to cart

		if (shippingAddress === null) {
			shippingAddress = shipment.createShippingAddress();
		}
        shippingAddress.setFirstName(firstName);
        shippingAddress.setLastName(lastName);
        shippingAddress.setAddress1(params.address1.value ? params.address1.value : ' ');
        shippingAddress.setAddress2(params.address2.value ? params.address2.value : '');
        shippingAddress.setCity(params.suburb.value ? params.suburb.value : ' ');
        shippingAddress.setPostalCode(params.postcode.value ? params.postcode.value : ' ');
        shippingAddress.setStateCode(params.state.value ? params.state.value : ' ');
        shippingAddress.setCountryCode(params.countryCode.value ? params.countryCode.value : ' ');
        shippingAddress.setPhone(params.phoneNumber.value ? params.phoneNumber.value : '');
		session.custom.NoCall = true;
		basketCalculationHelpers.calculateTotals(basket);
	});

    // Taking cart total
    var cartTotal = basket.getAdjustedMerchandizeTotalPrice();
	cartTotal = cartTotal.value.toFixed(2);
	var currencyCode = basket.getCurrencyCode();
	var giftCardTotal : dw.value.Money = basket.getGiftCertificateTotalGrossPrice();
	applicableShippingMethods = ShippingMgr.getShipmentShippingModel(shipment).getApplicableShippingMethods(address);
    shippingCosts = new HashMap();
    currentShippingMethod = basket.getDefaultShipment().getShippingMethod() || ShippingMgr.getDefaultShippingMethod();
    // Updating shipping cost
    for (i = 0; i < applicableShippingMethods.length; i++) {
        method = applicableShippingMethods[i];
        Transaction.wrap(function () {
			shippingHelpers.selectShippingMethod(shipment,method.ID);
			basketCalculationHelpers.calculateTotals(basket);
			shippingCosts.put(method.getID(), shippingHelpers.preCalculateShipping(method));
        });
    }
    session.custom.NoCall = false;

    Transaction.wrap(function () {
       	shippingHelpers.selectShippingMethod(shipment,currentShippingMethod.getID());
		basketCalculationHelpers.calculateTotals(basket);
    });

    var orderTot, s1;
    var totalTax = basket.getMerchandizeTotalTax();
    var taxValue = totalTax.value;
    var displayShippingMethods = [];

    // Extracting shipping methods which should be given back to afterpay
    for (i = 0; i < applicableShippingMethods.length; i++) {

    	shippingMethod = applicableShippingMethods[i];
    	var max_value = shippingMethod.custom.orderValue;
		var min_value = shippingMethod.custom.minOrderValue;
		var freeShippingEnabled = dw.system.Site.current.preferences.custom.OsfSorEnableFreeShipping;

		if(!empty(min_value) && (cartTotal < min_value)) {
			continue;
		}

		if(!empty(max_value) && (cartTotal > max_value)) {
			continue;
		}

		if(shippingMethod.custom.storePickupEnabled) {
			continue;
		}

		if(shippingMethod.getID() == 'OR_Shipping_method') {
			if(!session.custom.hasSORProducts || !session.custom.HasSORProducts || !freeShippingEnabled) {
				continue;
			}
		}

		var shippingCost = shippingCosts.get(shippingMethod.ID);

		if(shippingMethod.custom.isFedex == true && (!shippingCost.baseShipping || shippingCost.baseShipping.value <= 0) && session.custom.allowZeroFedex != true) {
			continue;
		}

		var methodDetails = new shippingRequest();
    	methodDetails.id = shippingMethod.ID;
    	methodDetails.name = shippingMethod.displayName;
    	methodDetails.description = ExpressUtil.getEstimatedArrival(shippingMethod);
    	var shipAmount = new Amount();

		if(shippingCost.shippingPriceAdjustmentsTotal.value == 0) {
			var shpAmnt = shippingCost.baseShipping.value.toFixed(2);
			shpAmnt = shpAmnt.toString();
			shipAmount.amount = shpAmnt;
			s1 = parseFloat(shippingCost.baseShipping.value);
			orderTot = s1 + parseFloat(cartTotal) + parseFloat(taxValue) + parseFloat(giftCardTotal.value);
		} else {
			var shpAmnt = shippingCost.baseShippingAdjusted.value.toFixed(2);
			shpAmnt = shpAmnt.toString();
			shipAmount.amount = shpAmnt;
			s1 = parseFloat(shippingCost.baseShippingAdjusted.value);
			orderTot = s1 + parseFloat(cartTotal) + parseFloat(taxValue) + parseFloat(giftCardTotal.value);
		}

		shipAmount.currency = currencyCode;
    	methodDetails.shippingAmount = shipAmount;
    	var ordrAmt = new Amount();
    	ordrAmt.amount = orderTot.toFixed(2).toString();
    	ordrAmt.currency = currencyCode;
    	methodDetails.orderAmount = ordrAmt;
    	displayShippingMethods.push(methodDetails);				
    }

	res.json({
		response:{
			shippingMethods: displayShippingMethods
		}
	});
	return next();
});

function shippingRequest() {
	var id = '';
	var name = '';
	var description = '';
	var shippingAmount = new Amount();
	var orderAmount = new Amount();
}

function Amount() {
	var amount = '';
	var currency = '';
}

server.post('AfterpayExpressFromCart', server.middleware.https, function (req, res, next) {
	var params = request.httpParameterMap;
	var status = params.status.value;
	var token = params.token.value;
	var processorHandle;

	try {
		var params = {
						"token": token 
					 };		
		var afterpayHttpService = new AfterpayHttpService();
	    var afterpayApiContext = new AfterpayApiContext();
		var requestUrl = afterpayApiContext.getFlowApiUrls().get('checkouts');		
		var afterpayResponse = afterpayHttpService.call(requestUrl, 'GET_ORDER', params,'','getOrder');
		var verifyToken = afterpayResponse.token;
		// Verify the order token
		if(token == verifyToken) {
			var basket = BasketMgr.getCurrentBasket();
			processorHandle = require('int_afterpay_express/cartridge/scripts/express/processAfterpay').handle(basket, true, afterpayResponse, request.httpParameterMap);
		}
		else {
			return { error: true };
		}
    } catch (error) {
		var err = error;
		Logger.error(error);
    }
	
    if (processorHandle && processorHandle.success === true) {
    	return {success : true};	
    } else {
        request.custom.isBraintreeCustomError = true;
		res.redirect(URLUtils.url('Cart-Show'));
    }
	return next();
});

server.post('AfterPayPaymentChecksum', server.middleware.https, function (req, res, next) {
	session.privacy.apchecksum = null;
	var params = request.httpParameterMap;
	var apchecksum = params.apchecksum.value;
	session.privacy.apchecksum = apchecksum;

	res.json({
		response:{
			apchecksum: apchecksum
		}
	});
	return next();
});

module.exports = server.exports();

