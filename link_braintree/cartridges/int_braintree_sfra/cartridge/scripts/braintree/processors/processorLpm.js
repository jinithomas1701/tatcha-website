'use strict';

var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');
var Resource = require('dw/web/Resource');

var {
    getAmountPaid,
    deleteBraintreePaymentInstruments,
    getLogger
} = require('~/cartridge/scripts/braintree/helpers/paymentHelper');
var prefs = require('~/cartridge/config/braintreePreferences');
var {
    createBaseSaleTransactionData,
    saveGeneralTransactionData,
    verifyTransactionStatus
} = require('~/cartridge/scripts/hooks/payment/processor/processorHelper');
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
    data.options.submitForSettlement = true;
    data.deviceData = paymentInstrument.custom.braintreeFraudRiskData;

    return data;
}

/**
 * Save result of the success sale transaction
 * @param {dw.order.Order} order Current order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Current payment instrument
 * @param {Object} responseTransaction Response data from API call
 */
function saveTransactionData(order, paymentInstrument, responseTransaction) {
    var PT = require('dw/order/PaymentTransaction');
    var paymentTransaction = paymentInstrument.getPaymentTransaction();
    var transactionStatus = responseTransaction.transaction.status;

    Transaction.wrap(function () {
        if (transactionStatus === braintreeConstants.TRANSACTION_STATUS_SETTLING ||
            transactionStatus === braintreeConstants.TRANSACTION_STATUS_SUBMITTED_FOR_SETTLEMENT) {
            paymentTransaction.setType(PT.TYPE_CAPTURE);
        }

        saveGeneralTransactionData(order, paymentInstrument, responseTransaction);
    });
}

/**
 * Create Braintree payment instrument
 * @param {dw.order.Order} order Order object
 * @param {Object} responseData Local Payment Method Response, includes (nonce, lpmName, deviceData)
 * @returns {Object} success object with Payment Instrument
 */
function createLpmPaymentInstrument(order, responseData) {
    var lpmPaymentInstrument = null;

    if (Array.indexOf(prefs.paymentMethods.BRAINTREE_LOCAL.paymentMethodIds, responseData.lpmName) === -1) {
        return {
            error: true,
            message: Resource.msg('braintree.error.lpm_unconfigured_method', 'locale', null)
        };
    }

    var paymentProcessor = PaymentMgr.getPaymentMethod(responseData.lpmName).getPaymentProcessor();

    Transaction.wrap(function () {
        deleteBraintreePaymentInstruments(order);

        lpmPaymentInstrument = order.createPaymentInstrument(responseData.lpmName, getAmountPaid(order));
        lpmPaymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
        lpmPaymentInstrument.custom.braintreeFraudRiskData = responseData.deviceData;
    });

    return {
        success: true,
        lpmPaymentInstrument: lpmPaymentInstrument
    };
}

/**
 * Transaction sale call to confirm LPM transaction.
 * @param {dw.order.Order} order Order
 * @param {Object} responseData Local Payment Method Response, includes (nonce, lpmName, deviceData)
 * @returns {Object} success object
 */
function setLpmTransactionSale(order, responseData) {
    var lmpPIHandle = null;

    try {
        lmpPIHandle = createLpmPaymentInstrument(order, responseData);
        if (lmpPIHandle.error) {
            return {
                error: true,
                message: lmpPIHandle.message
            };
        }

        var paymentInstrument = lmpPIHandle.lpmPaymentInstrument;

        Transaction.wrap(function () {
            paymentInstrument.custom.braintreePaymentMethodNonce = responseData.nonce;
        });

        var saleTransactionRequestData = createSaleTransactionData(order, paymentInstrument);
        var responseTransaction = btGraphQLSdk.createTransaction(saleTransactionRequestData);
        // throw error in case of unsuccessful status
        verifyTransactionStatus(responseTransaction, paymentInstrument, order);
        saveTransactionData(order, paymentInstrument, responseTransaction);
    } catch (error) {
        getLogger().error(error);

        return {
            error: true,
            message: error.message
        };
    }

    return { success: true };
}

/*
 * Module exports
 */
exports.setLpmTransactionSale = setLpmTransactionSale;
