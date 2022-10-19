/* eslint-disable require-jsdoc */
'use strict';

var OrderMgr = require('dw/order/OrderMgr');
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');

var {
    deleteBraintreePaymentInstruments,
    getAmountPaid,
    handleErrorCode,
    getLogger
} = require('~/cartridge/scripts/braintree/helpers/paymentHelper');
var {
    saveGeneralTransactionData,
    createBaseSaleTransactionData,
    verifyTransactionStatus
} = require('~/cartridge/scripts/hooks/payment/processor/processorHelper');
var prefs = require('~/cartridge/config/braintreePreferences');

var BTGraphQLSdk = require('*/cartridge/models/btGraphQLSdk');
var btGraphQLSdk = new BTGraphQLSdk();

/**
 * Perform API call to create new(sale) transaction
 * @param {dw.order.Order} order Current order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Used payment instrument
 * @return {Object} Response data from API call
 */
function createSaleTransactionData(order, paymentInstrument) {
    if (empty(paymentInstrument.custom.braintreePaymentMethodNonce)) {
        throw new Error('paymentInstrument.custom.braintreePaymentMethodNonce');
    }

    var data = createBaseSaleTransactionData(order, paymentInstrument, prefs);
    data.deviceData = paymentInstrument.custom.braintreeFraudRiskData;

    return data;
}

/**
 * Write info about failed order into payment instrument, and mark customer as Braintree customer
 * @param {dw.order.Order} orderRecord Current order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrumentRecord Used payment instrument
 * @param {string} braintreeError Error text
 * @returns {Object} object which indicates error
 */
function authorizeFailedFlow(orderRecord, paymentInstrumentRecord, braintreeError) {
    Transaction.wrap(function () {
        orderRecord.custom.isBraintree = true;
        paymentInstrumentRecord.custom.braintreeFailReason = braintreeError;
    });

    handleErrorCode(braintreeError);

    return { error: true };
}

/**
 * Create Braintree payment instrument
 * @param {Basket} basket Basket object
 * @returns {Object} success object
 */
function Handle(basket) {
    var httpParameterMap = request.httpParameterMap;
    var paymentProcessor = PaymentMgr.getPaymentMethod(prefs.paymentMethods.BRAINTREE_APPLEPAY.paymentMethodId).getPaymentProcessor();
    var applePayPaymentInstrument = null;

    // Creating ApplePay payment processor
    Transaction.wrap(function () {
        var methodName = session.forms.billing.paymentMethod.value;

        deleteBraintreePaymentInstruments(basket);

        applePayPaymentInstrument = basket.createPaymentInstrument(methodName, getAmountPaid(basket));
        applePayPaymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
    });

    if (!httpParameterMap.braintreeApplePayNonce || httpParameterMap.braintreeApplePayNonce.stringValue === '') {
        return { error: true };
    }

    // Setting Data for Unauthenticated & Authenticated scenario
    Transaction.wrap(function () {
        applePayPaymentInstrument.custom.braintreePaymentMethodNonce = httpParameterMap.braintreeApplePayNonce.stringValue;
        applePayPaymentInstrument.custom.braintreeFraudRiskData = httpParameterMap.braintreeApplePayDeviceDataInput.stringValue;
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

            Transaction.wrap(function () {
                saveGeneralTransactionData(order, paymentInstrument, responseData);
                // Save token for lightning order managment
                if (!empty(responseData.paymentMethod)) {
                    paymentInstrument.creditCardToken = responseData.paymentMethod.legacyId;
                }
            });
        } catch (error) {
            getLogger().error(error);

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
