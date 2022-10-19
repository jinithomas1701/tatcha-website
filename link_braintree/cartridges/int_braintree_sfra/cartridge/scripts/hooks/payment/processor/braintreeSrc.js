/* eslint-disable require-jsdoc */
'use strict';

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
    saveSrcAccount,
    verifyTransactionStatus
} = require('~/cartridge/scripts/hooks/payment/processor/processorHelper');
var {
    setBraintreeDefaultCard
} = require('~/cartridge/scripts/braintree/helpers/customerHelper');
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
    if (empty(paymentInstrument.custom.braintreePaymentMethodNonce) && empty(paymentInstrument.creditCardToken)) {
        throw new Error('paymentInstrument.custom.braintreePaymentMethodNonce or paymentInstrument.creditCardToken are empty');
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

        if (braintreeError) {
            paymentInstrumentRecord.custom.braintreeFailReason = braintreeError;
        }
    });

    handleErrorCode(braintreeError);

    return { error: true };
}

/**
 * Create Braintree payment instrument
 * @param {Object} basket Arguments of the HTTP call
 * @returns {Object} handle call result
 */
function Handle(basket) {
    var httpParameterMap = request.httpParameterMap;
    var srcPayPaymentInstrument = null;
    var methodName = session.forms.billing.paymentMethod.value;
    var paymentProcessor = PaymentMgr.getPaymentMethod(methodName).getPaymentProcessor();

    // Creating SRC payment processor
    Transaction.wrap(function () {
        deleteBraintreePaymentInstruments(basket);

        srcPayPaymentInstrument = basket.createPaymentInstrument(methodName, getAmountPaid(basket));
        srcPayPaymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
    });

    // Setting Data for Unauthenticated & Authenticated scenario
    Transaction.wrap(function () {
        srcPayPaymentInstrument.custom.braintreePaymentMethodNonce = httpParameterMap.braintreeSrcNonce.stringValue;
        srcPayPaymentInstrument.custom.braintreeSrcCardDescription = httpParameterMap.braintreeSrcCardDescription.stringValue;
        srcPayPaymentInstrument.custom.braintreeSaveCreditCard = httpParameterMap.braintreeSaveSRCAccount.booleanValue;
        srcPayPaymentInstrument.custom.braintreeFraudRiskData = httpParameterMap.braintreeSrcDeviceDataInput.stringValue;
    });

    return { success: true };
}

/**
 * Authorize payment function
 * @param {string} orderNo Order Number
 * @param {Object} paymentInstrument Instrument
 * @param {Object} paymentProcessor Payment Processor
 * @returns {Object} success object
 */
function Authorize(orderNo, paymentInstrument, paymentProcessor) {
    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(orderNo);

    if (paymentInstrument && paymentInstrument.getPaymentTransaction().getAmount().getValue() === 0) {
        Transaction.wrap(function () {
            order.removePaymentInstrument(paymentInstrument);
        });

        return { error: true };
    }

    try {
        var saleTransactionRequestData = createSaleTransactionData(order, paymentInstrument);
        var responseData = btGraphQLSdk.createTransaction(saleTransactionRequestData).transaction;
        var paymentTokenData = responseData.paymentMethod;
        // throw error in case of unsuccessful status
        verifyTransactionStatus(responseData, paymentInstrument, order);

        if (customer.authenticated && prefs.vaultMode && paymentInstrument.custom.braintreeSaveCreditCard) {
            saveSrcAccount(responseData);
            setBraintreeDefaultCard(paymentTokenData.legacyId);
        }

        Transaction.wrap(function () {
            saveGeneralTransactionData(order, paymentInstrument, responseData);
            paymentInstrument.getPaymentTransaction().setPaymentProcessor(paymentProcessor);
            // Save token for lightning order managment
            if (prefs.vaultMode && empty(paymentInstrument.creditCardToken) && !empty(paymentTokenData)) {
                paymentInstrument.creditCardToken = paymentTokenData.legacyId;
            }

            paymentInstrument.custom.braintreeSaveCreditCard = null;
        });

        return { error: false };
    } catch (error) {
        getLogger().error(error);

        var err = error.customMessage || error.message;

        return authorizeFailedFlow(order, paymentInstrument, err);
    }
}

/*
 * Module exports
 */
exports.Handle = Handle;
exports.Authorize = Authorize;
