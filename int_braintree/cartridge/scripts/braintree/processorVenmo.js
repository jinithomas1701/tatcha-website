'use strict';
/* global dw empty request session customer */

var BraintreeHelper = require('~/cartridge/scripts/braintree/braintreeHelper');
var prefs = BraintreeHelper.getPrefs();

var OrderMgr = require('dw/order/OrderMgr');
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');

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
    
    if (empty(paymentInstrument.custom.braintreePaymentMethodNonce) && empty(paymentInstrument.custom.braintreePaymentMethodToken)) {
        throw new Error('paymentInstrument.custom.braintreePaymentMethodNonce or paymentInstrument.custom.braintreePaymentMethodToken are empty');
    }

    var customer = order.getCustomer();
    var isCustomerExist = BraintreeHelper.isCustomerExist(customer);

    if ((customer.isAuthenticated() && isCustomerExist && paymentInstrument.custom.braintreePaymentMethodToken) || 
            !paymentInstrument.custom.braintreePaymentMethodNonce) {
        data.paymentMethodToken = paymentInstrument.custom.braintreePaymentMethodToken;
    } else {
        data.paymentMethodNonce = paymentInstrument.custom.braintreePaymentMethodNonce;
    }

    if (isCustomerExist) {
        data.customerId = BraintreeHelper.createCustomerId(customer);
    } else {
        data.customerId = null;
        data.customer = BraintreeHelper.createCustomerData(order);
    }
    data.options = {
        submitForSettlement: prefs.BRAINTREE_VENMO_Payment_Model === 'sale'
    };
    
    if (prefs.BRAINTREE_VENMO_Vault_Mode === 'always') {
        data.options.storeInVault = true;
    } else if (prefs.BRAINTREE_VENMO_Vault_Mode === 'success') {
        data.options.storeInVaultOnSuccess = true;
    }
    
    data.orderId = order.getOrderNo();
    data.amount = BraintreeHelper.getAmount(order).getValue();
    data.currencyCode = order.getCurrencyCode();
    data.customFields = BraintreeHelper.getCustomFields(order);
    data.deviceData = paymentInstrument.custom.braintreeFraudRiskData;

    if (prefs.BRAINTREE_L2_L3) {
        data.shipping = BraintreeHelper.createAddressData(order.getDefaultShipment().getShippingAddress());
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
       * data.shipsFromPostalCode = '';
       * data.discountAmount = BraintreeHelper.getOrderLevelDiscountTotal(order);
       * data.lineItems = BraintreeHelper.getLineItems(order.productLineItems);
       */
    }
    return data;
}

/**
 * Save Venmo account as Customer Payment Instrument for the current customer
 * @param {Object} saleTransactionResponseData Response data from API call
 * @returns {Object} Result object
 */
function saveVenmoAccount(saleTransactionResponseData) {
    var customerPaymentInstrument = null;

    try {
        Transaction.begin();
        
        customerPaymentInstrument = customer.getProfile().getWallet().createPaymentInstrument(prefs.venmoMethodName);
        customerPaymentInstrument.custom.braintreeVenmoUserId = saleTransactionResponseData.transaction.venmoAccount.venmoUserId;
        customerPaymentInstrument.custom.braintreePaymentMethodToken = saleTransactionResponseData.transaction.venmoAccount.token;
        
        Transaction.commit();
    } catch (error) {
        Transaction.rollback();
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
    var orderRecord = order;
    var paymentInstrumentRecord = paymentInstrument;
    var responseTransaction = saleTransactionResponseData.transaction;
    var paymentTransaction = paymentInstrumentRecord.getPaymentTransaction();
    var paymentProcessor = PaymentMgr.getPaymentMethod(prefs.venmoMethodName).getPaymentProcessor();
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

        if (responseTransaction.venmoAccount) {
            paymentInstrumentRecord.custom.braintreePaymentMethodToken = responseTransaction.venmoAccount.token;
        }

        if (customer.isRegistered() && BraintreeHelper.isCustomerExist(customer)) {
            customer.getProfile().custom.isBraintree = true;
        }
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
    var paymentProcessor = PaymentMgr.getPaymentMethod(prefs.venmoMethodName).getPaymentProcessor();
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
 * @returns {Object} success object
 */
function handle(basket) {
    var httpParameterMap = request.httpParameterMap;
    var venmoPaymentInstrument = null;
    var customerPaymentInstrument = null;
    var selectedVenmoAccountUuid = httpParameterMap.braintreeVenmoAccountList.stringValue;

    Transaction.wrap(function () {
        var methodName;
        BraintreeHelper.deleteBraintreePaymentInstruments(basket);

        methodName = session.forms.billing.paymentMethods.selectedPaymentMethodID.value;
        session.forms.billing.fulfilled.value = true;
        session.forms.billing.fulfilled.value = true;
        session.forms.billing.paymentMethods.creditCard.saveCard.value = false;

        venmoPaymentInstrument = basket.createPaymentInstrument(methodName, BraintreeHelper.getAmount(basket));
    });

    if (selectedVenmoAccountUuid !== null && selectedVenmoAccountUuid !== 'newaccount') {
        customerPaymentInstrument = BraintreeHelper.getCustomerPaymentInstrument(selectedVenmoAccountUuid);
        if (!customerPaymentInstrument) {
            return { error: true };
        }
        Transaction.wrap(function () {
            venmoPaymentInstrument.custom.braintreePaymentMethodToken = customerPaymentInstrument.custom.braintreePaymentMethodToken;
            venmoPaymentInstrument.custom.braintreeCreditCardMakeDefault = httpParameterMap.braintreeVenmoAccountMakeDefault.booleanValue;
        });
        return { success: true };
    }

    if (!httpParameterMap.braintreeVenmoNonce || httpParameterMap.braintreeVenmoNonce.stringValue === '' || !basket) {
        return { error: true };
    }

    Transaction.wrap(function () {
        venmoPaymentInstrument.custom.braintreePaymentMethodNonce = httpParameterMap.braintreeVenmoNonce.stringValue;
        venmoPaymentInstrument.custom.braintreeFraudRiskData = httpParameterMap.braintreeVenmoRiskData.stringValue;
        venmoPaymentInstrument.custom.braintreeCreditCardMakeDefault = httpParameterMap.braintreeVenmoAccountMakeDefault.booleanValue;
        venmoPaymentInstrument.custom.braintreeSaveCreditCard = httpParameterMap.braintreeSaveVenmoAccount.booleanValue;
        venmoPaymentInstrument.custom.braintreeVenmoUserId = httpParameterMap.braintreeVenmoUserId.stringValue;
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
            var existCustomerPaymentInstrument = BraintreeHelper.getVenmoCustomerPaymentInstrumentByUserID(saleTransactionResponseData.transaction.venmoAccount.venmoUserId);
            
            if (paymentInstrument.custom.braintreeSaveCreditCard && !existCustomerPaymentInstrument) {
                saveVenmoAccount(saleTransactionResponseData);
                Transaction.wrap(function () {
                    paymentInstrument.custom.braintreeSaveCreditCard = null;
                });
            }
        
            if (paymentInstrument.custom.braintreeCreditCardMakeDefault) {
                BraintreeHelper.makeDefaultVenmoAccount(existCustomerPaymentInstrument ? existCustomerPaymentInstrument.custom.braintreePaymentMethodToken : saleTransactionResponseData.transaction.venmoAccount.token);
                Transaction.wrap(function () {
                    paymentInstrument.custom.braintreeCreditCardMakeDefault = null;
                });
            }
        } 
        catch (error) {
            return authorizeFailedFlow(order, paymentInstrument, error.customMessage ? error.customMessage : error.message);
        }
    } 
    else {
        Transaction.wrap(function () {
            order.removePaymentInstrument(paymentInstrument);
        });
    }
    return { authorized: true };
}

exports.handle = handle;
exports.authorize = authorize;