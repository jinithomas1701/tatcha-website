'use strict';

/* global dw empty customer request session */

var BraintreeHelper = require('~/cartridge/scripts/braintree/braintreeHelper');
var braintreeLogger = BraintreeHelper.getLogger();
var OrderMgr = require('dw/order/OrderMgr');
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');
var CustomerMgr = require('dw/customer/CustomerMgr');

/**
 * Perform API call to create new(sale) transaction
 * @param  {dw.order.Order} order Current order
 * @param  {dw.order.OrderPaymentInstrument} paymentInstrument Used payment instrument
 * @returns {Object} Response data from API call
 */
function createSaleTransactionData(order, paymentInstrument) {
    var prefs = BraintreeHelper.prefs;
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

    if (BraintreeHelper.isCustomerExist(customer)) {
        data.customerId = BraintreeHelper.createCustomerId(customer);
    } else {
        data.customerId = null;
        data.customer = BraintreeHelper.createCustomerData(order);
    }

    data.descriptor = {
        name: (!empty(prefs.BRAINTREE_CREDIT_Descriptor_Name) ? prefs.BRAINTREE_CREDIT_Descriptor_Name : ''),
        phone: (!empty(prefs.BRAINTREE_CREDIT_Descriptor_Phone) ? prefs.BRAINTREE_CREDIT_Descriptor_Phone : ''),
        url: (!empty(prefs.BRAINTREE_CREDIT_Descriptor_Url) ? prefs.BRAINTREE_CREDIT_Descriptor_Url : '')
    };

    if (prefs.BRAINTREE_Fraud_Tools_Enabled) {
        data.deviceData = paymentInstrument.custom.braintreeFraudRiskData;
    }

    data.options = {
        submitForSettlement: prefs.BRAINTREE_Payment_Model === 'sale'
    };
    
    //disable fraud check if device data is empty
	if(prefs.BRAINTREE_Fraud_Tools_Enabled) {
		//var remoteIP = request.getHttpHeaders().get('x-is-remote_addr'); 
		var remoteIP = request.getHttpRemoteAddress();
		var whiteListIps = (prefs.BRAINTREE_Skip_Fraud_Check)?prefs.BRAINTREE_Skip_Fraud_Check:'';
			
		if(typeof(session.custom.autoDeliveryOrder) != 'undefined' && session.custom.autoDeliveryOrder == true) {
			data.options.skipAdvancedFraudChecking = true;
		} else if (!empty(remoteIP) && !empty(whiteListIps) && whiteListIps.indexOf(remoteIP) != -1) {
			data.options.skipAdvancedFraudChecking = true;
			//data.deviceData = '';
		}
	}

    if (prefs.BRAINTREE_Vault_Mode === 'always') {
        data.options.storeInVault = true;
    } else if (prefs.BRAINTREE_Vault_Mode === 'success') {
        data.options.storeInVaultOnSuccess = true;
    }

    if (prefs.BRAINTREE_Vault_Mode !== 'not') {
        data.options.addBillingAddress = true;
    }

    data.billing = BraintreeHelper.createAddressData(order.getBillingAddress());
    data.shipping = BraintreeHelper.createAddressData(order.getDefaultShipment().getShippingAddress());

    data.customFields = BraintreeHelper.getCustomFields(order);

    data.is3dSecuteRequired = paymentInstrument.custom.braintreeIs3dSecureRequired;
    
    if (prefs.BRAINTREE_L2_L3) {
        data.level_2_3_processing = data.shipping.level_2_3_processing = true; 
        data.taxAmount = order.getTotalTax().toNumberString();
        data.shipping.countryCodeAlpha3 = BraintreeHelper.getISO3Country(order.getCustomerLocaleID());
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
 * @return {Object} Error object indicator
 */
function authorizeFailedFlow(order, paymentInstrument, braintreeError) {
    var orderRecord = order;
    var paymentInstrumentRecord = paymentInstrument;
    var paymentTransaction = paymentInstrumentRecord.getPaymentTransaction();
    var paymentProcessor = PaymentMgr.getPaymentMethod(BraintreeHelper.prefs.creditCardMethodName).getPaymentProcessor();
    var customer = orderRecord.getCustomer();
    Transaction.wrap(function () {
        paymentTransaction.setPaymentProcessor(paymentProcessor);
        orderRecord.custom.isBraintree = true;
        paymentInstrumentRecord.custom.braintreeFailReason = braintreeError;
        paymentInstrumentRecord.custom.braintreeSaveCreditCard = null;
        paymentInstrumentRecord.custom.braintreeCreditCardMakeDefault = null;

        if (customer.isRegistered() && BraintreeHelper.isCustomerExist(customer)) {
            customer.getProfile().custom.isBraintree = true;
        }
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
    var paymentProcessor = PaymentMgr.getPaymentMethod(BraintreeHelper.prefs.creditCardMethodName).getPaymentProcessor();
    var customer = orderRecord.getCustomer();

    Transaction.wrap(function () {
        paymentTransaction.setTransactionID(responseTransaction.id);
        paymentTransaction.setPaymentProcessor(paymentProcessor);
        paymentTransaction.setAmount(new dw.value.Money(responseTransaction.amount, order.getCurrencyCode()));

        orderRecord.custom.isBraintree = true;
        orderRecord.custom.braintreePaymentStatus = responseTransaction.status;

        var riskData = responseTransaction.riskData;
        orderRecord.custom.braintreeFraudRiskData = riskData ? riskData.decision : null;
        paymentInstrumentRecord.custom.braintreeFraudRiskData = riskData ? riskData.decision : null;

        var threeDSecureInfo = responseTransaction.threeDSecureInfo;
        paymentInstrumentRecord.custom.braintree3dSecureStatus = threeDSecureInfo ? threeDSecureInfo.status : null;

        paymentInstrumentRecord.custom.braintreePaymentMethodNonce = null;
        paymentInstrumentRecord.custom.braintreeCustomFields = null;

        if (responseTransaction.type === 'sale' && responseTransaction.status === 'authorized') {
            paymentTransaction.setType(PT.TYPE_AUTH);
        } else if (responseTransaction.type === 'sale' && responseTransaction.status === 'submitted_for_settlement') {
            paymentTransaction.setType(PT.TYPE_CAPTURE);
        }

        if (responseTransaction.creditCard) {
            paymentInstrumentRecord.custom.braintreePaymentMethodToken = responseTransaction.creditCard.token;
            paymentInstrumentRecord.setCreditCardNumber(Date.now().toString().substr(0, 11) + responseTransaction.creditCard.last4);
            paymentInstrumentRecord.setCreditCardExpirationMonth(parseInt(responseTransaction.creditCard.expirationMonth, 10));
            paymentInstrumentRecord.setCreditCardExpirationYear(parseInt(responseTransaction.creditCard.expirationYear, 10));
            paymentInstrumentRecord.custom.bin = responseTransaction.creditCard.bin;
            paymentInstrumentRecord.custom.cvvResponseCode = responseTransaction.cvvResponseCode;
            paymentInstrumentRecord.custom.avsPostalCodeResponseCode = responseTransaction.avsPostalCodeResponseCode;
            paymentInstrumentRecord.custom.avsStreetAddressResponseCode = responseTransaction.avsStreetAddressResponseCode;
        }

        if (customer.isRegistered() && BraintreeHelper.isCustomerExist(customer)) {
            customer.getProfile().custom.isBraintree = true;
        }
    });
}

/**
 * Save used credit cart as customers payment method
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Current payment instrument
 * @param {Object} saleTransactionResponseData Response data from API call
 */
function saveCustomerCreditCard(paymentInstrument, saleTransactionResponseData) {
    Transaction.begin();

    var customerWallet = customer.getProfile().getWallet();
    var customerPaymentInstrument = customerWallet.createPaymentInstrument(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);

    var card = {
        expirationMonth: saleTransactionResponseData.transaction.creditCard.expirationMonth,
        expirationYear: saleTransactionResponseData.transaction.creditCard.expirationYear,
        number: Date.now().toString().substr(0, 11) + saleTransactionResponseData.transaction.creditCard.last4,
        type: paymentInstrument.creditCardType,
        owner: paymentInstrument.creditCardHolder,
        paymentMethodToken: saleTransactionResponseData.transaction.creditCard.token
    };

    customerPaymentInstrument.setCreditCardHolder(card.owner);
    customerPaymentInstrument.setCreditCardNumber(card.number);
    customerPaymentInstrument.setCreditCardExpirationMonth(parseInt(card.expirationMonth, 10));
    customerPaymentInstrument.setCreditCardExpirationYear(parseInt(card.expirationYear, 10));
    customerPaymentInstrument.setCreditCardType(card.type);
    customerPaymentInstrument.custom.braintreePaymentMethodToken = card.paymentMethodToken;

    Transaction.commit();
}

/**
 * Create Braintree payment instrument and update shipping and billing address, if the new one was given
 * @param {Basket} basket Basket object
 * @returns {Object} success object
 */
function handle(basket) {
    var httpParameterMap = request.httpParameterMap;

    if (!httpParameterMap.braintreePaymentMethodNonce || httpParameterMap.braintreePaymentMethodNonce.stringValue === '') {
        return { error: true };
    }

    var customerPaymentInstrument = null;
    var selectedCreditCardUuid = null;
    var creditCard = null;
    var creditCardForm = null;

	selectedCreditCardUuid = !empty(httpParameterMap.dwfrm_billing_paymentMethods_creditCardList.stringValue)?httpParameterMap.dwfrm_billing_paymentMethods_creditCardList.stringValue:session.custom.UUID;

    if (selectedCreditCardUuid !== null && selectedCreditCardUuid !== 'newcard') {
        customerPaymentInstrument = BraintreeHelper.getCustomerPaymentInstrument(selectedCreditCardUuid);
    }

    if (customerPaymentInstrument) {
        creditCard = {
            type: customerPaymentInstrument.creditCardType,
            number: customerPaymentInstrument.creditCardNumber,
            owner: customerPaymentInstrument.creditCardHolder,
            token: customerPaymentInstrument.custom.braintreePaymentMethodToken
        };
    } 
    else {
        creditCardForm = session.forms.creditcard;
        creditCard = {
            type: creditCardForm.type.value,
            number: creditCardForm.number.value,
            owner: creditCardForm.owner.value,
            token: null
        };
    }

    var result = { success: true };

    
    //Check user exists or not
	var cartEmail = basket.getCustomerEmail();
	if(cartEmail) {
		var existingCustomer = CustomerMgr.getCustomerByLogin(cartEmail);
		if(existingCustomer) {
			session.custom.userExist = true;
		}
	}
    
    Transaction.wrap(function () {
        try {
            BraintreeHelper.deleteBraintreePaymentInstruments(basket);
            var paymentInstrument = basket.createPaymentInstrument(dw.order.PaymentInstrument.METHOD_CREDIT_CARD, BraintreeHelper.getNonGiftCertificateAmount(basket));

            paymentInstrument.creditCardType = creditCard.type;
            paymentInstrument.creditCardNumber = creditCard.number;
            paymentInstrument.creditCardHolder = creditCard.owner;

            paymentInstrument.custom.braintreeFraudRiskData = httpParameterMap.braintreeDeviceData.stringValue;
            paymentInstrument.custom.braintreeCreditCardMakeDefault = httpParameterMap.braintreeCreditCardMakeDefault.booleanValue;
            paymentInstrument.custom.braintreeSaveCreditCard = httpParameterMap.braintreeSaveCreditCard.booleanValue;
            paymentInstrument.custom.braintreeIs3dSecureRequired = httpParameterMap.braintreeIs3dSecureRequired.booleanValue;
            paymentInstrument.custom.braintreePaymentMethodNonce = httpParameterMap.braintreePaymentMethodNonce.stringValue;
            paymentInstrument.custom.braintreeCustomFields = httpParameterMap.braintreeCardCustomFields.stringValue;

            if (creditCard.token) {
                paymentInstrument.custom.braintreePaymentMethodToken = creditCard.token;
            }

            session.forms.billing.fulfilled.value = true;

        } catch (e) {
            result = { error: true };
        }
    });

    return result;
}

/**
 * Authorize payment function
 * @param {string} orderNo Order Number
 * @param {Object} paymentInstr Instrument
 * @returns {Object} success object
 */
function authorize(orderNo, paymentInstr) {
    var order = OrderMgr.getOrder(orderNo);
    var paymentInstrument = paymentInstr;

    if (paymentInstrument && paymentInstrument.getPaymentTransaction().getAmount().getValue() > 0) {
        var saleTransactionResponseData = null;
        try {
            var saleTransactionRequestData = createSaleTransactionData(order, paymentInstrument);
            saleTransactionResponseData = BraintreeHelper.call(saleTransactionRequestData);
            saveTransactionData(order, paymentInstrument, saleTransactionResponseData);
        } catch (error) {
            return authorizeFailedFlow(order, paymentInstrument, error.customMessage ? error.customMessage : error.message);
        }

        if (paymentInstrument.custom.braintreeSaveCreditCard) {
            try {
                saveCustomerCreditCard(paymentInstrument, saleTransactionResponseData);
            } catch (error) {
                braintreeLogger.error(error);
            }
            Transaction.wrap(function () {
                paymentInstrument.custom.braintreeSaveCreditCard = null;
            });
        }

        if (paymentInstrument.custom.braintreeCreditCardMakeDefault) {
            BraintreeHelper.makeDefaultCreditCard(saleTransactionResponseData.transaction.creditCard.token, paymentInstrument.creditCardHolder);
            Transaction.wrap(function () {
                paymentInstrument.custom.braintreeCreditCardMakeDefault = null;
            });
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
