'use strict';

var Transaction = require('dw/system/Transaction');
var PaymentMgr = require('dw/order/PaymentMgr');

var prefs = require('~/cartridge/config/braintreePreferences');
var {
    deleteBraintreePaymentInstruments,
    getAmountPaid,
    handleErrorCode,
    getLogger
} = require('~/cartridge/scripts/braintree/helpers/paymentHelper');
var {
    saveGeneralTransactionData,
    createBaseSaleTransactionData,
    saveGooglePayAccount,
    verifyTransactionStatus
} = require('~/cartridge/scripts/hooks/payment/processor/processorHelper');
var {
    setBraintreeDefaultCard
} = require('~/cartridge/scripts/braintree/helpers/customerHelper');

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
    var paymentProcessor = PaymentMgr.getPaymentMethod(prefs.paymentMethods.BRAINTREE_GOOGLEPAY.paymentMethodId).getPaymentProcessor();
    var googlePayPaymentInstrument = null;
    var nonce = httpParameterMap.braintreeGooglePayNonce.stringValue;

    if (empty(nonce)) {
        return { error: true };
    }

    // Creating GooglePay payment processor
    Transaction.wrap(function () {
        var paymentMethodName = session.forms.billing.paymentMethod.value;

        deleteBraintreePaymentInstruments(basket);

        googlePayPaymentInstrument = basket.createPaymentInstrument(paymentMethodName, getAmountPaid(basket));
        googlePayPaymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
    });

    // GooglePay payment type (AndroidPayCard or PayPalAccount)
    session.privacy.googlepayPaymentType = httpParameterMap.braintreeGooglepayPaymentType.stringValue;

    Transaction.wrap(function () {
        googlePayPaymentInstrument.custom.braintreePaymentMethodNonce = nonce;
        googlePayPaymentInstrument.custom.braintreeGooglePayCardDescription = httpParameterMap.braintreeGooglePayCardDescription.stringValue || '';
        googlePayPaymentInstrument.custom.braintreeSaveCreditCard = httpParameterMap.braintreeSaveGooglepayAccount.booleanValue;
        googlePayPaymentInstrument.custom.braintreeFraudRiskData = httpParameterMap.braintreeGooglePayDeviceDataInput.stringValue;
    });

    return { success: true };
}

/**
 * Authorize payment function
 * @param {string} orderNumber Order Number
 * @param {Object} paymentInstrument Payment Instrument
 * @param {Object} paymentProcessor Payment Processor
 * @returns {Object} success object
 */
function Authorize(orderNumber, paymentInstrument, paymentProcessor) {
    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(orderNumber);

    if (paymentInstrument && paymentInstrument.getPaymentTransaction().getAmount().getValue() > 0) {
        try {
            var saleTransactionRequestData = createSaleTransactionData(order, paymentInstrument);
            var responseData = btGraphQLSdk.createTransaction(saleTransactionRequestData).transaction;
            // throw error in case of unsuccessful status
            verifyTransactionStatus(responseData, paymentInstrument, order);

            Transaction.wrap(function () {
                saveGeneralTransactionData(order, paymentInstrument, responseData);
                paymentInstrument.getPaymentTransaction().setPaymentProcessor(paymentProcessor);
                // Save token for lightning order managment
                if (prefs.vaultMode && empty(paymentInstrument.creditCardToken) && !empty(responseData.paymentMethod)) {
                    paymentInstrument.creditCardToken = responseData.paymentMethod.legacyId;
                }
            });

            if (customer.authenticated && prefs.vaultMode && session.privacy.googlepayPaymentType === 'AndroidPayCard') {
                if (paymentInstrument.custom.braintreeSaveCreditCard) {
                    saveGooglePayAccount(responseData);
                    setBraintreeDefaultCard(responseData.paymentMethod.legacyId);

                    Transaction.wrap(function () {
                        paymentInstrument.custom.braintreeSaveCreditCard = null;
                    });
                }
            }

            delete session.privacy.googlepayPaymentType;
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

exports.Handle = Handle;
exports.Authorize = Authorize;
