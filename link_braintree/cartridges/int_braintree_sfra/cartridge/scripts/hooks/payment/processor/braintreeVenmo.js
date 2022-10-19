'use strict';
/* global dw request empty session */

var OrderMgr = require('dw/order/OrderMgr');
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');

var {
    getVenmoCustomerPaymentInstrumentByUserID,
    getCustomerPaymentInstrument,
    setBraintreeDefaultCard,
    clearDefaultProperty,
    getCustomerPaymentInstruments
} = require('~/cartridge/scripts/braintree/helpers/customerHelper');
var {
    createBaseSaleTransactionData,
    saveGeneralTransactionData,
    verifyTransactionStatus
} = require('~/cartridge/scripts/hooks/payment/processor/processorHelper');
var {
    deleteBraintreePaymentInstruments,
    getAmountPaid,
    handleErrorCode
} = require('~/cartridge/scripts/braintree/helpers/paymentHelper');

var prefs = require('~/cartridge/config/braintreePreferences');
var braintreeConstants = require('~/cartridge/scripts/util/braintreeConstants');

var BTGraphQLSdk = require('*/cartridge/models/btGraphQLSdk');
var btGraphQLSdk = new BTGraphQLSdk();

/**
 * Perform API call to create new(sale) transaction
 * @param {dw.order.Order} order Current order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Used payment instrument
 * @return {Object} Response data from API call
 */
function createSaleTransactionData(order, paymentInstrument) {
    if (empty(paymentInstrument.custom.braintreePaymentMethodNonce) && empty(paymentInstrument.creditCardToken)) {
        throw new Error('paymentInstrument.custom.braintreePaymentMethodNonce or paymentInstrument.creditCardToken are empty');
    }

    var data = createBaseSaleTransactionData(order, paymentInstrument, prefs);
    data.descriptor = { name: prefs.BRAINTREE_VENMO_Descriptor_Name || '' };
    data.deviceData = paymentInstrument.custom.braintreeFraudRiskData;

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
    var paymentProcessor = PaymentMgr.getPaymentMethod(prefs.paymentMethods.BRAINTREE_VENMO.paymentMethodId).getPaymentProcessor();

    Transaction.wrap(function () {
        paymentTransaction.setPaymentProcessor(paymentProcessor);
        orderRecord.custom.isBraintree = true;
        paymentInstrumentRecord.custom.braintreeFailReason = braintreeError;
    });

    handleErrorCode(braintreeError);

    return { error: true };
}

/**
 * Save result of the success sale transaction
 * @param {dw.order.Order} order Current order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Current payment instrument
 * @param {Object} saleTransactionResponseData Response data from API call
 */
function saveTransactionData(order, paymentInstrument, saleTransactionResponseData) {
    var paymentProcessor = PaymentMgr.getPaymentMethod(prefs.paymentMethods.BRAINTREE_VENMO.paymentMethodId).getPaymentProcessor();

    Transaction.wrap(function () {
        saveGeneralTransactionData(order, paymentInstrument, saleTransactionResponseData);
        paymentInstrument.getPaymentTransaction().setPaymentProcessor(paymentProcessor);
        // Save token for lightning order managment
        if (!empty(saleTransactionResponseData.paymentMethod) && empty(paymentInstrument.creditCardToken)) {
            paymentInstrument.creditCardToken = saleTransactionResponseData.paymentMethod.legacyId;
        }
    });
}

/**
 * Save Venmo account as Customer Payment Instrument for the current customer
 * @param {Object} transactionResponseData Response data from API call
 * @returns {Object} Result object
 */
function saveVenmoAccount(transactionResponseData) {
    var customerPaymentInstrument = null;

    try {
        Transaction.begin();
        customerPaymentInstrument = customer.getProfile().getWallet().createPaymentInstrument(prefs.paymentMethods.BRAINTREE_VENMO.paymentMethodId);
        customerPaymentInstrument.setCreditCardType(braintreeConstants.CREDIT_CARD_TYPE_VISA); // hack for MFRA account.js line 99 (paymentInstrument.creditCardType.toLowerCase())
        customerPaymentInstrument.custom.braintreeVenmoUserId = transactionResponseData.paymentMethodSnapshot.venmoUserId;
        customerPaymentInstrument.creditCardToken = transactionResponseData.paymentMethod.legacyId;
        Transaction.commit();
    } catch (error) {
        Transaction.rollback();
        return {
            error: error.customMessage || error.message
        };
    }

    return {
        token: customerPaymentInstrument.creditCardToken
    };
}

/**
 * Create Braintree payment instrument
 * @param {Basket} basket Basket object
 * @returns {Object} success object
 */
function Handle(basket) {
    var httpParameterMap = request.httpParameterMap;
    var venmoPaymentInstrument = null;
    var customerPaymentInstrument = null;
    var selectedVenmoAccountUuid = httpParameterMap.braintreeVenmoAccountList.stringValue;
    var paymentProcessor = PaymentMgr.getPaymentMethod(prefs.paymentMethods.BRAINTREE_VENMO.paymentMethodId).getPaymentProcessor();

    // Creating Venmo payment processor
    Transaction.wrap(function () {
        deleteBraintreePaymentInstruments(basket);

        venmoPaymentInstrument = basket.createPaymentInstrument(prefs.paymentMethods.BRAINTREE_VENMO.paymentMethodId, getAmountPaid(basket));
        venmoPaymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
    });

    // Setting Data for Authenticated scenario (saved account)
    if (selectedVenmoAccountUuid && selectedVenmoAccountUuid !== braintreeConstants.NEW_ACCOUNT) {
        customerPaymentInstrument = getCustomerPaymentInstrument(selectedVenmoAccountUuid);

        if (!customerPaymentInstrument) {
            return { error: true };
        }

        Transaction.wrap(function () {
            venmoPaymentInstrument.creditCardToken = customerPaymentInstrument.creditCardToken;
            venmoPaymentInstrument.custom.braintreeDefaultCard = httpParameterMap.braintreeVenmoAccountMakeDefault.booleanValue;
        });

        return { success: true };
    }

    if (!httpParameterMap.braintreeVenmoNonce || httpParameterMap.braintreeVenmoNonce.stringValue === '' || !basket) {
        return { error: true };
    }

    // Setting Data for Unauthenticated scenario
    Transaction.wrap(function () {
        venmoPaymentInstrument.custom.braintreePaymentMethodNonce = httpParameterMap.braintreeVenmoNonce.stringValue;
        venmoPaymentInstrument.custom.braintreeFraudRiskData = httpParameterMap.braintreeVenmoRiskData.stringValue;
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
function Authorize(orderNo, paymentInstrument) {
    var order = OrderMgr.getOrder(orderNo);

    if (paymentInstrument && paymentInstrument.getPaymentTransaction().getAmount().getValue() > 0) {
        try {
            var saleTransactionRequestData = createSaleTransactionData(order, paymentInstrument);
            var responseData = btGraphQLSdk.createTransaction(saleTransactionRequestData).transaction;
            // throw error in case of unsuccessful status
            verifyTransactionStatus(responseData, paymentInstrument, order);
            saveTransactionData(order, paymentInstrument, responseData);

            var existCustomerPaymentInstrument = getVenmoCustomerPaymentInstrumentByUserID(responseData.paymentMethodSnapshot.venmoUserId);

            if (customer.authenticated && paymentInstrument.custom.braintreeSaveCreditCard && !existCustomerPaymentInstrument) {
                saveVenmoAccount(responseData);
                clearDefaultProperty(getCustomerPaymentInstruments(prefs.paymentMethods.BRAINTREE_VENMO.paymentMethodId));
                setBraintreeDefaultCard(existCustomerPaymentInstrument ? existCustomerPaymentInstrument.creditCardToken : responseData.paymentMethod.legacyId);

                Transaction.wrap(function () {
                    paymentInstrument.custom.braintreeSaveCreditCard = null;
                    paymentInstrument.custom.braintreeDefaultCard = null;
                });
            }
        } catch (error) {
            var err = error.customMessage || error.message;
            return authorizeFailedFlow(order, paymentInstrument, err);
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
exports.Handle = Handle;
exports.Authorize = Authorize;
