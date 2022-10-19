'use strict';
/* global dw request empty session */

var BraintreeHelper = require('~/cartridge/scripts/braintree/braintreeHelper');
var prefs = BraintreeHelper.getPrefs();

var OrderMgr = require('dw/order/OrderMgr');
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');

var app = require('app_storefront_controllers/cartridge/scripts/app');
var BasketMgr = require('dw/order/BasketMgr');
var ShippingMgr = require('dw/order/ShippingMgr');
var HashMap = require('dw/util/HashMap');
var CustomerMgr = require('dw/customer/CustomerMgr');
var Site = require('dw/system/Site');

/**
 * Perform API call to create new(sale) transaction
 * @param {dw.order.Order} order Current order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Used payment instrument
 * @return {Object} Response data from API call
 */
function createSaleTransactionData(order, paymentInstrument) {
    var data = {
        xmlType: 'transaction',
        requestPath: 'transactions'
    };
    var customer = order.getCustomer();

    if (empty(paymentInstrument.custom.braintreePaymentMethodNonce)) {
        throw new Error('paymentInstrument.custom.braintreePaymentMethodNonce');
    }

    data.paymentMethodNonce = paymentInstrument.custom.braintreePaymentMethodNonce;
    data.orderId = order.getOrderNo();
    data.amount = BraintreeHelper.getAmount(order).getValue();
    data.currencyCode = order.getCurrencyCode();

    if (BraintreeHelper.isCustomerExist(customer)) {
        data.customerId = BraintreeHelper.createCustomerId(customer);
    } else {
        data.customerId = null;
        data.customer = BraintreeHelper.createCustomerData(order);
    }

    data.options = {
        submitForSettlement: 'authorization'
    };

    data.customFields = BraintreeHelper.getCustomFields(order);

    return data;
}

/**
 * Write info about failed order into payment instrument, and mark customer as Braintree customer
 * @param {dw.order.Order} order Current order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Used payment instrument
 * @param {string} braintreeError Error text
 * @returns {Object} object which indicates error
 */
function authorizeFailedFlow(order, paymentInstrument, braintreeError) {
    var orderRecord = order;
    var paymentInstrumentRecord = paymentInstrument;
    var paymentTransaction = paymentInstrumentRecord.getPaymentTransaction();
    var paymentProcessor = PaymentMgr.getPaymentMethod('GooglePay').getPaymentProcessor();
    Transaction.wrap(function () {
        paymentTransaction.setPaymentProcessor(paymentProcessor);
        orderRecord.custom.isBraintree = true;
        paymentInstrumentRecord.custom.braintreeFailReason = braintreeError;
    });
    return { error: true };
}

/**
 * Save result of the success sale transaction
 * @param {dw.order.Order} order Current order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Current payment instrument
 * @param {Object} saleTransactionResponseData Response data from API call
 */
function saveTransactionData(order, paymentInstrument, saleTransactionResponseData) {
    var orderRecord = order;
    var paymentInstrumentRecord = paymentInstrument;
    var responseTransaction = saleTransactionResponseData.transaction;
    var paymentTransaction = paymentInstrumentRecord.getPaymentTransaction();
    var paymentProcessor = PaymentMgr.getPaymentMethod('GooglePay').getPaymentProcessor();

    Transaction.wrap(function () {
        paymentTransaction.setTransactionID(responseTransaction.id);
        paymentTransaction.setPaymentProcessor(paymentProcessor);
        paymentTransaction.setAmount(new dw.value.Money(responseTransaction.amount, prefs.currencyCode));

        orderRecord.custom.isBraintree = true;
        orderRecord.custom.braintreePaymentStatus = responseTransaction.status;

        paymentInstrumentRecord.custom.braintreePaymentMethodNonce = null;
        paymentInstrumentRecord.custom.braintreeCustomFields = null;
    });
}

/**
 * Create Braintree payment instrument and update shipping and billing address, if the new one was given
 * @param {Basket} basket Basket object
 * @param {boolean} fromCart indicator for cart checkout
 * @returns {Object} success object
 */
function handle(basket, fromCart) {
    var httpParameterMap = request.httpParameterMap;
    var braintreeGooglePayBillingAddress = httpParameterMap.braintreeGooglePayBillingAddress.stringValue;
    var braintreeGooglePayShippingAddress = httpParameterMap.braintreeGooglePayShippingAddress.stringValue;
    var phoneNumber = httpParameterMap.phoneNumber.stringValue;
    var googlePayEmail = httpParameterMap.email.stringValue;
    var onceObj = JSON.parse(httpParameterMap.braintreeGooglePayNonce);
    var braintreeNonce = onceObj.androidPayCards[0].nonce;
    var googlePayPaymentInstrument = null;
    if (fromCart) {
        BraintreeHelper.addDefaultShipping(basket);
    }

    Transaction.wrap(function () {
        if (fromCart) {
            var paymentInstruments = basket.getPaymentInstruments();
            var iterator = paymentInstruments.iterator();
            var instument = null;
            while (iterator.hasNext()) {
                instument = iterator.next();
                if(instument.paymentMethod != dw.order.PaymentInstrument.METHOD_GIFT_CERTIFICATE) {
                	basket.removePaymentInstrument(instument);
                }
            }
        } else {
            BraintreeHelper.deleteBraintreePaymentInstruments(basket);
        }
        
        if (!prefs.isMFRA) {
            session.forms.billing.fulfilled.value = true;
        }        

        googlePayPaymentInstrument = basket.createPaymentInstrument('GooglePay', BraintreeHelper.getAmount(basket));
    });

    if (!httpParameterMap.braintreeGooglePayNonce || httpParameterMap.braintreeGooglePayNonce.stringValue === '') {
        return { error: true };
    }

    if (!basket) {
        return { error: true };
    }

    if (basket.getProductLineItems().size() > 0) {
        var newShipping = JSON.parse(braintreeGooglePayShippingAddress);
        var fullName = newShipping.name;
        var firstName = '';
        firstName = newShipping.name;
        var lastName = ' ';
        
        var nameArray = fullName.split(' ');
        if(nameArray.length > 0){        	
        	firstName = nameArray[0];
        	lastName = fullName.replace(firstName,'');
        }
        
        
        Transaction.wrap(function () {
            var shipping = basket.getDefaultShipment().getShippingAddress() || basket.getDefaultShipment().createShippingAddress();
            shipping.setCountryCode(newShipping.countryCode ? newShipping.countryCode.toUpperCase() : ' ');
            shipping.setCity(newShipping.locality || ' ');
            shipping.setAddress1(newShipping.address1 || ' ');
            shipping.setAddress2(newShipping.address2 || '');
            shipping.setPostalCode(newShipping.postalCode || ' ');
            shipping.setStateCode(newShipping.administrativeArea || ' ');
            shipping.setPhone(phoneNumber || '');
            shipping.setFirstName(firstName || lastName);
            shipping.setLastName(lastName || firstName);            
            
            //Update Shipping method selection
			var address, applicableShippingMethods, shippingCosts, currentShippingMethod;
			var cart = app.getModel('Cart').get();
			var TransientAddress = app.getModel('TransientAddress');
			address = new TransientAddress();
		    address.countryCode = shipping.countryCode.value.toUpperCase();
		    address.stateCode = shipping.stateCode;
		    address.postalCode = shipping.postalCode;
		    address.city = shipping.city;
		    address.address1 = shipping.address1;
		    address.address2 = shipping.address2;
		 
		    session.custom.fedPostalCode = shipping.postalCode;
			session.custom.fedCountryCode = shipping.countryCode.value;
		    
			applicableShippingMethods = cart.getApplicableShippingMethods(address);
			shippingCosts = new HashMap();
		    if(address.countryCode == 'US') {
		    	currentShippingMethod = ShippingMgr.getDefaultShippingMethod() || applicableShippingMethods[0];    	
		    } else {
		    	currentShippingMethod = applicableShippingMethods[0] || ShippingMgr.getDefaultShippingMethod();
		    }
		    
		    //Avalara change: assign the NoCall variable to true 
		    session.custom.NoCall = true;
		    for (i = 0; i < applicableShippingMethods.length; i++) {
		        method = applicableShippingMethods[i];

		        cart.updateShipmentShippingMethod(cart.getDefaultShipment().getID(), method.getID(), method, applicableShippingMethods);
		        cart.calculate();
		        shippingCosts.put(method.getID(), cart.preCalculateShipping(method));
		    }
		    session.custom.NoCall = false;
		    
	        cart.updateShipmentShippingMethod(cart.getDefaultShipment().getID(),currentShippingMethod.getID(), currentShippingMethod,applicableShippingMethods);
	        cart.calculate();
		    session.forms.singleshipping.shippingAddress.shippingMethodID.value = cart.getDefaultShipment().getShippingMethodID();
            
        });
    }

    if (fromCart) {
    	var newBilling = !empty(newShipping) ? newShipping : JSON.parse(braintreeGooglePayBillingAddress);
    	var billingRequired = Site.getCurrent().getCustomPreferenceValue('GP_BillingRequired');
		var billingConfig = JSON.parse(Site.getCurrent().getCustomPreferenceValue('GP_BillingConfig'));
    	if(billingRequired == true && billingConfig.format == 'FULL') {
    		newBilling = JSON.parse(braintreeGooglePayBillingAddress);
    	}
    	
    	var fullname = newBilling.name;
    	var firstName = '';
    	firstName = newBilling.name;
        var lastName = ' ';
        
        var nameArray = fullname.split(' ');
        if(nameArray.length > 0){        	
        	firstName = nameArray[0];
        	lastName = nameArray[1];
        }
        
        Transaction.wrap(function () {
            var billing = basket.getBillingAddress() || basket.createBillingAddress();
            billing.setFirstName(firstName || lastName );
            billing.setLastName(lastName || firstName);
            billing.setCountryCode(newBilling.countryCode ? newBilling.countryCode.toUpperCase() : ' ');
            billing.setCity(newBilling.locality || ' ');
            billing.setAddress1(newBilling.address1 || ' ');
            billing.setAddress2(newBilling.address2 || '');
            billing.setPostalCode(newBilling.postalCode || ' ');
            billing.setStateCode(newBilling.administrativeArea || ' ');
            billing.setPhone(phoneNumber || '');
            basket.setCustomerEmail(googlePayEmail);
        });
    }
    
    //Check user exists or not
	var cartEmail = basket.getCustomerEmail();
	if(cartEmail) {
		var existingCustomer = CustomerMgr.getCustomerByLogin(cartEmail);
		if(existingCustomer) {
			session.custom.userExist = true;
		}
	}

    Transaction.wrap(function () {
    	googlePayPaymentInstrument.custom.braintreePaymentMethodNonce = braintreeNonce;
    });

    return { success: true };
}

/**
 * Authorize payment function
 * @param {string} orderNo Order Number
 * @param {Object} paymentInstrument Intrument
 * @returns {Object} success object
 */
function authorize(orderNo, paymentInstrument) {
    var order = OrderMgr.getOrder(orderNo);

    if (paymentInstrument && paymentInstrument.getPaymentTransaction().getAmount().getValue() > 0) {
        try {
            var saleTransactionRequestData = createSaleTransactionData(order, paymentInstrument);
            var saleTransactionResponseData = BraintreeHelper.call(saleTransactionRequestData);
            saveTransactionData(order, paymentInstrument, saleTransactionResponseData);
        } catch (error) {
            return authorizeFailedFlow(order, paymentInstrument, error.customMessage ? error.customMessage : error.message);
        }
    } else {
        Transaction.wrap(function () {
            order.removePaymentInstrument(paymentInstrument);
        });
    }
    return { authorized: true };
}

/*
 * Module exports
 */
exports.handle = handle;
exports.authorize = authorize;
