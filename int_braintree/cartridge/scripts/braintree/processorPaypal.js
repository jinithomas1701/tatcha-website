'use strict';
/* global dw empty request session customer */

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
 * @param {dw.order.Order} inpOrder Current order
 * @param {dw.order.OrderPaymentInstrument} inpPaymentInstrument Used payment instrument
 * @return {Object} Response data from API call
 */
function createSaleTransactionData(inpOrder, inpPaymentInstrument) {
    var order = inpOrder;
    var paymentInstrument = inpPaymentInstrument;
    var data = {
        xmlType: 'transaction',
        requestPath: 'transactions'
    };
    var customer = order.getCustomer();

    if (empty(paymentInstrument.custom.braintreePaymentMethodNonce) && empty(paymentInstrument.custom.braintreePaymentMethodToken)) {
        throw new Error('paymentInstrument.custom.braintreePaymentMethodNonce or paymentInstrument.custom.braintreePaymentMethodToken are empty');
    }
    if (!empty(paymentInstrument.custom.braintreePaymentMethodToken) && (empty(paymentInstrument.custom.braintreePaymentMethodNonce) || paymentInstrument.custom.braintreePaymentMethodNonce === 'null')) {
        data.paymentMethodToken = paymentInstrument.custom.braintreePaymentMethodToken;
    } else {
        data.paymentMethodNonce = paymentInstrument.custom.braintreePaymentMethodNonce;
    }

    data.orderId = order.getOrderNo();
    data.amount = BraintreeHelper.getAmount(order).getValue();
    data.currencyCode = order.getCurrencyCode();
    data.descriptor = {
        name: (!empty(prefs.BRAINTREE_PAYPAL_Descriptor_Name) ? prefs.BRAINTREE_PAYPAL_Descriptor_Name : '')
    };

    if (BraintreeHelper.isCustomerExist(customer)) {
        data.customerId = BraintreeHelper.createCustomerId(customer);
    } else {
        data.customerId = null;
        data.customer = BraintreeHelper.createCustomerData(order);
    }

    data.options = {
        submitForSettlement: prefs.BRAINTREE_PAYPAL_Payment_Model === 'sale'
    };

    if (prefs.BRAINTREE_PAYPAL_Fraud_Tools_Enabled) {
        data.deviceData = paymentInstrument.custom.braintreeFraudRiskData;
    }

    if (prefs.BRAINTREE_PAYPAL_Vault_Mode === 'always') {
        data.options.storeInVault = true;
    } else if (prefs.BRAINTREE_PAYPAL_Vault_Mode === 'success') {
        data.options.storeInVaultOnSuccess = true;
    }

    if (prefs.BRAINTREE_PAYPAL_Vault_Mode !== 'not') {
        data.options.addBillingAddress = true;
    }

    if (!empty(prefs.BRAINTREE_PAYPAL_Payee_Email)) {
        data.options.payeeEmail = prefs.BRAINTREE_PAYPAL_Payee_Email;
    }

    data.shipping = BraintreeHelper.createAddressData(order.getDefaultShipment().getShippingAddress());

    data.customFields = BraintreeHelper.getCustomFields(order);
    
    if (prefs.BRAINTREE_L2_L3) {
        data.level_2_3_processing = data.shipping.level_2_3_processing = true; 
        data.taxAmount = order.getTotalTax().toNumberString();
        if (order.getCustomerLocaleID().split('_')[1].toLowerCase() === data.shipping.countryCodeAlpha2.toLowerCase()) {
            data.shipping.countryCodeAlpha3 = BraintreeHelper.getISO3Country(order.getCustomerLocaleID());
        }
        data.l2_only = true;

        /** Rounding issues due to discounts, removed from scope due to bug on PayPal / BT end. 
         * No ETA on bug fix and not in roadmap. 
         * 
       *
       * data.shippingAmount = order.getShippingTotalPrice();
       * data.discountAmount = BraintreeHelper.getOrderLevelDiscountTotal(order);
       * data.lineItems = BraintreeHelper.getLineItems(order.productLineItems);
       */
    }

    return data;
}

/**
 * Save PayPal account as Customer Payment Instrument for the current customer
 * @param {dw.order.Order} order Current order
 * @param {Object} saleTransactionResponseData Response data from API call
 * @returns {Object} Result object
 */
function savePaypalAccount(order, saleTransactionResponseData) {
    var customerPaymentInstrument = null;
    try {
        Transaction.begin();

        customerPaymentInstrument = customer.getProfile().getWallet().createPaymentInstrument(prefs.paypalMethodName);

        var billingAddress = order.getBillingAddress();
        var billingAddressObject = {
            firstName: billingAddress.getFirstName(),
            lastName: billingAddress.getLastName(),
            countryCodeAlpha2: billingAddress.getCountryCode().value,
            locality: billingAddress.getCity(),
            streetAddress: billingAddress.getAddress1(),
            extendedAddress: billingAddress.getAddress2(),
            postalCode: billingAddress.getPostalCode(),
            region: billingAddress.getStateCode(),
            phone: billingAddress.getPhone()
        };

        customerPaymentInstrument.setCreditCardType('visa'); // hack for MFRA account.js line 99 (paymentInstrument.creditCardType.toLowerCase())
        customerPaymentInstrument.custom.braintreePaypalAccountEmail = saleTransactionResponseData.transaction.paypal.payerEmail;
        customerPaymentInstrument.custom.braintreePaypalAccountAddresses = JSON.stringify(billingAddressObject);
        customerPaymentInstrument.custom.braintreePaymentMethodToken = saleTransactionResponseData.transaction.paypal.token;


        Transaction.commit();
    } catch (error) {
        return {
            error: error.customMessage ? error.customMessage : error.message
        };
    }
    return {
        token: customerPaymentInstrument.custom.braintreePaymentMethodToken
    };
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
    var paymentProcessor = PaymentMgr.getPaymentMethod(prefs.paypalMethodName).getPaymentProcessor();
    var riskData = responseTransaction.riskData;
    var customer = orderRecord.getCustomer();

    Transaction.wrap(function () {
        paymentTransaction.setTransactionID(responseTransaction.id);
        paymentTransaction.setPaymentProcessor(paymentProcessor);
        paymentTransaction.setAmount(new dw.value.Money(responseTransaction.amount, order.getCurrencyCode()));
        paymentInstrumentRecord.custom.braintreeFraudRiskData = riskData ? riskData.decision : null;

        orderRecord.custom.isBraintree = true;
        orderRecord.custom.braintreePaymentStatus = responseTransaction.status;
        orderRecord.custom.braintreeFraudRiskData = riskData ? riskData.decision : null;

        paymentInstrumentRecord.custom.braintreePaymentMethodNonce = null;
        paymentInstrumentRecord.custom.braintreeCustomFields = null;

        if (responseTransaction.type === 'sale' && responseTransaction.status === 'authorized') {
            paymentTransaction.setType(PT.TYPE_AUTH);
        } else if (responseTransaction.type === 'sale' && responseTransaction.status === 'settling') {
            paymentTransaction.setType(PT.TYPE_CAPTURE);
        }

        if (responseTransaction.paypal) {
            paymentInstrumentRecord.custom.braintreePaymentMethodToken = responseTransaction.paypal.token;
        }

        if (customer.isRegistered() && BraintreeHelper.isCustomerExist(customer)) {
            customer.getProfile().custom.isBraintree = true;
        }
    });
}

/**
 * Perform API call to create new(sale) transaction
 * @param {dw.order.Order} inpOrder Current order
 * @param {dw.order.OrderPaymentInstrument} inpPaymentInstrument Used payment instrument
 */
function mainFlow(inpOrder, inpPaymentInstrument) {
    var order = inpOrder;
    var paymentInstrument = inpPaymentInstrument;
    var saleTransactionRequestData = createSaleTransactionData(order, paymentInstrument);
    var saleTransactionResponseData = BraintreeHelper.call(saleTransactionRequestData);
    saveTransactionData(order, paymentInstrument, saleTransactionResponseData);

    var existCustomerPaymentInstrument = BraintreeHelper.getPaypalCustomerPaymentInstrumentByEmail(saleTransactionResponseData.transaction.paypal.payerEmail);
    if (paymentInstrument.custom.braintreeSaveCreditCard && !existCustomerPaymentInstrument) {
        savePaypalAccount(order, saleTransactionResponseData);
        Transaction.wrap(function () {
            paymentInstrument.custom.braintreeSaveCreditCard = null;
        });
    }

    if (paymentInstrument.custom.braintreeCreditCardMakeDefault) {
        BraintreeHelper.makeDefaultPaypalAccount(existCustomerPaymentInstrument ? existCustomerPaymentInstrument.custom.braintreePaymentMethodToken : saleTransactionResponseData.transaction.paypal.token);
        Transaction.wrap(function () {
            paymentInstrument.custom.braintreeCreditCardMakeDefault = null;
        });
    }
}

/**
 * Perform API call to create new(sale) transaction
 * @param {dw.order.Order} inpOrder Current order
 * @param {dw.order.OrderPaymentInstrument} inpPaymentInstrument Used payment instrument
 */
function intentOrderFlow(inpOrder, inpPaymentInstrument) {
    var order = inpOrder;
    var paymentInstrument = inpPaymentInstrument;
    var customerId = BraintreeHelper.createCustomerId(customer);
    if (!BraintreeHelper.isCustomerExist(customer)) {
        var customerData = BraintreeHelper.createCustomerData(order);
        if (!empty(prefs.BRAINTREE_PAYPAL_Payee_Email)) {
            customerData.paypalPayeeEmail = prefs.BRAINTREE_PAYPAL_Payee_Email;
        }
        var createCustomerResponseData = BraintreeHelper.callApiMethod('createCustomer', customerData);
        customerId = createCustomerResponseData.customer.id;
    }
    var paymentMethodToken = paymentInstrument.custom.braintreePaymentMethodToken;
    if (!paymentMethodToken) {
        var createPaymentMethodResponseData = BraintreeHelper.callApiMethod('createPaymentMethod', {
            customerId: customerId,
            paymentMethodNonce: paymentInstrument.custom.braintreePaymentMethodNonce
        });
        paymentMethodToken = createPaymentMethodResponseData.paypalAccount.token;
    }
    Transaction.wrap(function () {
        order.custom.isBraintree = true;
        order.custom.isBraintreeIntentOrder = true;
        paymentInstrument.custom.braintreeFraudRiskData = null;
        paymentInstrument.custom.braintreePaymentMethodToken = paymentMethodToken;
        paymentInstrument.custom.braintreeCustomFields = JSON.stringify(BraintreeHelper.getCustomFields(order));
        var paymentTransaction = paymentInstrument.getPaymentTransaction();
        var paymentProcessor = PaymentMgr.getPaymentMethod(prefs.paypalMethodName).getPaymentProcessor();
        paymentTransaction.setPaymentProcessor(paymentProcessor);
    });
}

/**
 * Write info about failed order into payment instrument, and mark customer as Braintree customer
 * @param {dw.order.Order} inpOrder Current order
 * @param {dw.order.OrderPaymentInstrument} inpPaymentInstrument Used payment instrument
 * @param {string} braintreeError Error text
 * @returns {Object} Error indicator
 */
function authorizeFailedFlow(inpOrder, inpPaymentInstrument, braintreeError) {
    var order = inpOrder;
    var paymentInstrument = inpPaymentInstrument;
    var paymentTransaction = paymentInstrument.getPaymentTransaction();
    var paymentProcessor = PaymentMgr.getPaymentMethod(prefs.paypalMethodName).getPaymentProcessor();
    var customer = order.getCustomer();
    Transaction.wrap(function () {
        paymentTransaction.setPaymentProcessor(paymentProcessor);
        order.custom.isBraintree = true;
        paymentInstrument.custom.braintreeFailReason = braintreeError;

        if (customer.isRegistered() && BraintreeHelper.isCustomerExist(customer)) {
            customer.getProfile().custom.isBraintree = true;
        }
    });
    return { error: true };
}

/**
 * Create Braintree payment instrument and update shipping and billing address, if the new one was given
 * @param {Basket} basket Basket object
 * @param {Basket} fromCart from cart checkout indicator
 * @returns {Object} success object
 */
function handle(basket, fromCart) {
    var httpParameterMap = request.httpParameterMap;
    var braintreePaypalBillingAddress = httpParameterMap.braintreePaypalBillingAddress.stringValue;
    var braintreePaypalShippingAddress = httpParameterMap.braintreePaypalShippingAddress.stringValue;
    var isNewBilling = !empty(braintreePaypalBillingAddress) && braintreePaypalBillingAddress !== '{}';
    var isNewShipping = !empty(braintreePaypalShippingAddress) && braintreePaypalShippingAddress !== '{}';
    var isCountryCodesUpperCase = BraintreeHelper.isCountryCodesUpperCase();
    var paypalPaymentInstrument = null;
    var customerPaymentInstrument = null;

    if (fromCart) {
        BraintreeHelper.addDefaultShipping(basket);
        customerPaymentInstrument = BraintreeHelper.getDefaultCustomerPaypalPaymentInstrument();
    }

    Transaction.wrap(function () {
        var methodName;
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
            methodName = prefs.paypalMethodName;
        } else {
            BraintreeHelper.deleteBraintreePaymentInstruments(basket);
            methodName = session.forms.billing.paymentMethods.selectedPaymentMethodID.value;
            session.forms.billing.fulfilled.value = true;
        }

        session.forms.billing.fulfilled.value = true;
        session.forms.billing.paymentMethods.creditCard.saveCard.value = false;

        paypalPaymentInstrument = basket.createPaymentInstrument(methodName, BraintreeHelper.getAmount(basket));
    });

    var selectedPaypalAccountUuid = httpParameterMap.braintreePaypalAccountList.stringValue;
    if (selectedPaypalAccountUuid !== null && selectedPaypalAccountUuid !== 'newaccount') {
        customerPaymentInstrument = BraintreeHelper.getCustomerPaymentInstrument(selectedPaypalAccountUuid);
        if (!customerPaymentInstrument) {
            return { error: true };
        }
        Transaction.wrap(function () {
            paypalPaymentInstrument.custom.braintreePaymentMethodToken = customerPaymentInstrument.custom.braintreePaymentMethodToken;
            paypalPaymentInstrument.custom.braintreeCreditCardMakeDefault = httpParameterMap.braintreePaypalAccountMakeDefault.booleanValue;
        });
        return { success: true };
    }

    if (!httpParameterMap.braintreePaypalNonce || httpParameterMap.braintreePaypalNonce.stringValue === '') {
        return { error: true };
    }

    if (!basket) {
        return { error: true };
    }

    var fullName;
    if (isNewShipping && !!basket.getProductLineItems().size()) {
        var newShipping = JSON.parse(braintreePaypalShippingAddress);
        if (newShipping.recipientName) {
            fullName = BraintreeHelper.createFullName(newShipping.recipientName);
        }
        Transaction.wrap(function () {
            var shipping = basket.getDefaultShipment().getShippingAddress() || basket.getDefaultShipment().createShippingAddress();
            shipping.setCountryCode(isCountryCodesUpperCase ? newShipping.countryCodeAlpha2.toUpperCase() : newShipping.countryCodeAlpha2.toLowerCase());
            shipping.setCity(newShipping.locality || ' ');
            shipping.setAddress1(newShipping.streetAddress || '');
            shipping.setAddress2(newShipping.extendedAddress || '');
            shipping.setPostalCode(newShipping.postalCode || '');
            shipping.setStateCode(newShipping.region || ' ');
            shipping.setPhone(newShipping.phone || '0000000000');
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
		    for (var i = 0; i < applicableShippingMethods.length; i++) {
		        var method = applicableShippingMethods[i];

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

    if ((isNewBilling && prefs.BRAINTREE_PAYPAL_Billing_Address_Override) || fromCart) {
        var newBilling;
        if (customerPaymentInstrument) {
            newBilling = JSON.parse(customerPaymentInstrument.custom.braintreePaypalAccountAddresses);
            newBilling.email = customerPaymentInstrument.custom.braintreePaypalAccountEmail;
        } else {
            newBilling = JSON.parse(braintreePaypalBillingAddress);
        }
        var customerEmail = basket.getCustomer().profile ? basket.getCustomer().profile.email: newBilling.email;
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
            billing.setPhone(newBilling.phone || '0000000000');
            basket.setCustomerEmail(customerEmail);
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
        var paypalEmail = empty(httpParameterMap.braintreePaypalEmail.stringValue) ? basket.getCustomerEmail() : httpParameterMap.braintreePaypalEmail.stringValue;
        paypalPaymentInstrument.custom.braintreePaymentMethodToken = customerPaymentInstrument ? customerPaymentInstrument.custom.braintreePaymentMethodToken : null;
        paypalPaymentInstrument.custom.braintreePaymentMethodNonce = httpParameterMap.braintreePaypalNonce.stringValue;
        paypalPaymentInstrument.custom.braintreeFraudRiskData = httpParameterMap.braintreePaypalRiskData.stringValue;
        paypalPaymentInstrument.custom.braintreeCreditCardMakeDefault = httpParameterMap.braintreePaypalAccountMakeDefault.booleanValue;
        paypalPaymentInstrument.custom.braintreeSaveCreditCard = httpParameterMap.braintreeSavePaypalAccount.booleanValue;
        paypalPaymentInstrument.custom.braintreeCustomFields = httpParameterMap.braintreePaypalCustomFields.stringValue;
        paypalPaymentInstrument.custom.braintreePaypalEmail = paypalEmail || '';
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
            if (prefs.BRAINTREE_PAYPAL_Payment_Model === 'order') {
                intentOrderFlow(order, paymentInstrument);
            } else {
                mainFlow(order, paymentInstrument);
            }
        } catch (error) {
            BraintreeHelper.getLogger().error(error);
            return authorizeFailedFlow(order, paymentInstrument, error.customMessage ? error.customMessage : error.message);
        }
    } else {
        Transaction.wrap(function () {
            order.removePaymentInstrument(paymentInstrument);
        });
    }
    return { authorized: true };
}

exports.handle = handle;
exports.authorize = authorize;
