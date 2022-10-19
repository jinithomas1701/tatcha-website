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
        submitForSettlement: prefs.BRAINTREE_APPLEPAY_Payment_Model === 'sale'
    };

    data.customFields = BraintreeHelper.getCustomFields(order);
    
    if (prefs.BRAINTREE_L2_L3) {
        data.shipping = BraintreeHelper.createAddressData(order.getDefaultShipment().getShippingAddress());
        data.level_2_3_processing = data.shipping.level_2_3_processing = true; 
        data.taxAmount = order.getTotalTax().toNumberString();
        if (order.getCustomerLocaleID().split('_')[1].toLowerCase() === data.shipping.countryCodeAlpha2.toLowerCase()) {
            data.shipping.countryCodeAlpha3 = BraintreeHelper.getISO3Country(order.getCustomerLocaleID());
        }
        data.shippingAmount = order.getShippingTotalPrice();
        data.discountAmount = BraintreeHelper.getOrderLevelDiscountTotal(order);
        data.lineItems = BraintreeHelper.getLineItems(order.productLineItems);
    }
    
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
    var paymentProcessor = PaymentMgr.getPaymentMethod(prefs.applePayMethodName).getPaymentProcessor();
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
    var PT = require('dw/order/PaymentTransaction');
    var orderRecord = order;
    var paymentInstrumentRecord = paymentInstrument;
    var responseTransaction = saleTransactionResponseData.transaction;
    var paymentTransaction = paymentInstrumentRecord.getPaymentTransaction();
    var paymentProcessor = PaymentMgr.getPaymentMethod(prefs.applePayMethodName).getPaymentProcessor();

    Transaction.wrap(function () {
        paymentTransaction.setTransactionID(responseTransaction.id);
        paymentTransaction.setPaymentProcessor(paymentProcessor);
        paymentTransaction.setAmount(new dw.value.Money(responseTransaction.amount, order.getCurrencyCode()));

        orderRecord.custom.isBraintree = true;
        orderRecord.custom.braintreePaymentStatus = responseTransaction.status;

        paymentInstrumentRecord.custom.braintreePaymentMethodNonce = null;
        paymentInstrumentRecord.custom.braintreeCustomFields = null;

        if (responseTransaction.type === 'sale' && responseTransaction.status === 'authorized') {
            paymentTransaction.setType(PT.TYPE_AUTH);
        } else if (responseTransaction.type === 'sale' && responseTransaction.status === 'submitted_for_settlement') {
            paymentTransaction.setType(PT.TYPE_CAPTURE);
        }
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
    var braintreeApplePayBillingAddress = httpParameterMap.braintreeApplePayBillingAddress.stringValue;
    var braintreeApplePayShippingAddress = httpParameterMap.braintreeApplePayShippingAddress.stringValue;
    var isNewBilling = !empty(braintreeApplePayBillingAddress) && braintreeApplePayBillingAddress !== '{}';
    var isNewShipping = !empty(braintreeApplePayShippingAddress) && braintreeApplePayShippingAddress !== '{}';
    var isCountryCodesUpperCase = BraintreeHelper.isCountryCodesUpperCase();

    var applePayPaymentInstrument = null;

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
        
        session.forms.billing.fulfilled.value = true;
        applePayPaymentInstrument = basket.createPaymentInstrument(prefs.applePayMethodName, BraintreeHelper.getAmount(basket));
    });

    if (!httpParameterMap.braintreeApplePayNonce || httpParameterMap.braintreeApplePayNonce.stringValue === '') {
        return { error: true };
    }

    if (!basket) {
        return { error: true };
    }

    if (isNewShipping && !!basket.getProductLineItems().size()) {
        var newShipping = JSON.parse(braintreeApplePayShippingAddress);
        var fullName = newShipping.recipientName ? BraintreeHelper.createFullName(newShipping.recipientName) : null;
        Transaction.wrap(function () {
            var shipping = basket.getDefaultShipment().getShippingAddress() || basket.getDefaultShipment().createShippingAddress();
            shipping.setCountryCode(isCountryCodesUpperCase ? newShipping.countryCodeAlpha2.toUpperCase() : newShipping.countryCodeAlpha2.toLowerCase());
            shipping.setCity(newShipping.locality || ' ');
            shipping.setAddress1(newShipping.streetAddress || '');
            shipping.setAddress2(newShipping.extendedAddress || '');
            shipping.setPostalCode(newShipping.postalCode || '');
            shipping.setStateCode(newShipping.region || ' ');
            shipping.setPhone(newShipping.phone || '');
            if (fullName) {
                shipping.setFirstName(fullName.firstName || '');
                if (!empty(fullName.secondName)) {
                    shipping.setSecondName(fullName.secondName || '');
                }
                if (!empty(fullName.lastName)) {
                    shipping.setLastName(fullName.lastName || fullName.firstName);
                    shipping.setFirstName(fullName.firstName || fullName.lastName);
                }
            } else {
                shipping.setFirstName(newShipping.firstName || newShipping.lastName);
                shipping.setLastName(newShipping.lastName || newShipping.firstName);
            }
            
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

    if (isNewBilling || fromCart) {
        var newBilling = JSON.parse(braintreeApplePayBillingAddress);
        Transaction.wrap(function () {
            var billing = basket.getBillingAddress() || basket.createBillingAddress();
            billing.setFirstName(newBilling.firstName || newBilling.lastName);
            billing.setLastName(newBilling.lastName || newBilling.firstName);
            billing.setCountryCode(isCountryCodesUpperCase ? newBilling.countryCodeAlpha2.toUpperCase() : newBilling.countryCodeAlpha2.toLowerCase());
            billing.setCity(newBilling.locality || ' ');
            billing.setAddress1(newBilling.streetAddress || '');
            billing.setAddress2(newBilling.extendedAddress || '');
            billing.setPostalCode(newBilling.postalCode || '');
            billing.setStateCode(newBilling.region || ' ');
            billing.setPhone(newBilling.phone || '');
            basket.setCustomerEmail(newBilling.email);
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
        applePayPaymentInstrument.custom.braintreePaymentMethodNonce = httpParameterMap.braintreeApplePayNonce.stringValue;
        applePayPaymentInstrument.custom.braintreeCustomFields = httpParameterMap.braintreeApplePayCustomFields.stringValue;
    });

    return { success: true };
}

/**
 * Authorize payment function
 * @param {string} orderNo Order Number
 * @param {Object} paymentInstrument Instrument
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
