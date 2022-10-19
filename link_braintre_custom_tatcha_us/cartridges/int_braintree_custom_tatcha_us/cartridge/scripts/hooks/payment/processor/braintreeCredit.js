'use strict';
var base = module.superModule;
var Transaction = require('dw/system/Transaction');
var OrderMgr = require('dw/order/OrderMgr');
var PaymentMgr = require('dw/order/PaymentMgr');
var PaymentInstrument = require('dw/order/PaymentInstrument');

var prefs = require('*/cartridge/config/braintreePreferences');
var {
    deleteBraintreePaymentInstruments,
    getNonGiftCertificateAmount,
    getLogger,
    handleErrorCode,
    getApplicableCreditCardPaymentInstruments
} = require('*/cartridge/scripts/braintree/helpers/paymentHelper');
var {
    saveGeneralTransactionData,
    createBaseSaleTransactionData,
    verifyTransactionStatus,
    saveCustomerCreditCard,
    isUsedSessionCreditCard,
    isUsedSavedCardMethod,
    isSessionCardAlreadyUsed,
    getUsedCreditCardFromForm
} = require('*/cartridge/scripts/hooks/payment/processor/processorHelper');
var {
    clearDefaultProperty,
    setBraintreeDefaultCard,
    getCustomerPaymentInstrument
} = require('*/cartridge/scripts/braintree/helpers/customerHelper');

var BTGraphQLSdk = require('*/cartridge/models/btGraphQLSdk');
var btGraphQLSdk = new BTGraphQLSdk();

/**
 * Perform API call to create new(sale) transaction
 * @param  {dw.order.Order} order Current order
 * @param  {dw.order.OrderPaymentInstrument} paymentInstrument Used payment instrument
 * @returns {Object} Response data from API call
 */
function createSaleTransactionData(order, paymentInstrument) {
    /*
    * For old saved cards(SG), the token was stored in : paymentInstrument.custom.braintreePaymentMethodToken,
    * the same is  copied to the new field :paymentInstrument.creditCardToken, as SFRA uses this field
    * **/
    if((empty(paymentInstrument.creditCardToken) || paymentInstrument.creditCardToken == null) && !empty(paymentInstrument.custom.braintreePaymentMethodToken)) {
        Transaction.wrap(function () {
            paymentInstrument.creditCardToken = paymentInstrument.custom.braintreePaymentMethodToken;
        });
    }
    if (empty(paymentInstrument.custom.braintreePaymentMethodNonce) && empty(paymentInstrument.creditCardToken)) {
        throw new Error('paymentInstrument.custom.braintreePaymentMethodNonce or paymentInstrument.creditCardToken are empty');
    }
    var data = createBaseSaleTransactionData(order, paymentInstrument, prefs);

    data.descriptor = {
        name: prefs.creditCardDescriptorName || '',
        phone: prefs.creditCardDescriptorPhone || '',
        url: prefs.creditCardDescriptorUrl || ''
    };

    if (prefs.isFraudToolsEnabled) {
        data.deviceData = paymentInstrument.custom.braintreeFraudRiskData;
    }

    return data;
}

/**
 * Write info about failed order into payment instrument, and mark customer as Braintree customer
 * @param {dw.order.Order} orderRecord Current order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrumentRecord Used payment instrument
 * @param {string} braintreeError Error text
 * @return {Object} Error object indicator
 */
function authorizeFailedFlow(orderRecord, paymentInstrumentRecord, braintreeError) {
    Transaction.wrap(function () {
        orderRecord.custom.isBraintree = true;
        paymentInstrumentRecord.custom.braintreeFailReason = braintreeError;
        paymentInstrumentRecord.custom.braintreeSaveCreditCard = null;
        paymentInstrumentRecord.custom.braintreeCreditCardMakeDefault = null;
    });

    handleErrorCode(braintreeError);

    return { error: true };
}

/**
 * Save result of the success sale transaction
 * @param {dw.order.Order} orderRecord Current order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrumentRecord Current payment instrument
 * @param {Object} responseTransaction Response data from API call
 */
function saveTransactionData(orderRecord, paymentInstrumentRecord, responseTransaction) {
    var threeDSecureInfo = responseTransaction.paymentMethodSnapshot.threeDSecure;

    Transaction.wrap(function () {
        // Save token for lightning order managment
        if (!empty(responseTransaction.paymentMethod) && empty(paymentInstrumentRecord.creditCardToken)) {
            paymentInstrumentRecord.creditCardToken = responseTransaction.paymentMethod.legacyId;
        }

        saveGeneralTransactionData(orderRecord, paymentInstrumentRecord, responseTransaction);

        paymentInstrumentRecord.custom.braintree3dSecureStatus = threeDSecureInfo.authenticationStatus || null;
    });
}

/**
 * Authorize payment function
 * @param {string} orderNumber Order Number
 * @param {Object} paymentInstrument Payment Instrument
 * @returns {Object} success object
 */
base.Authorize = function (orderNumber, paymentInstrument) {
    var order = OrderMgr.getOrder(orderNumber);

    if (paymentInstrument && paymentInstrument.getPaymentTransaction().getAmount().getValue() > 0) {
        try {
            var saleTransactionRequestData = createSaleTransactionData(order, paymentInstrument);
            var responseData = btGraphQLSdk.createTransaction(saleTransactionRequestData).transaction;
            // throw error in case of unsuccessful status
            verifyTransactionStatus(responseData, paymentInstrument, order);
            saveTransactionData(order, paymentInstrument, responseData);

            if (paymentInstrument.custom.braintreeSaveCreditCard) {
                saveCustomerCreditCard(responseData, paymentInstrument.creditCardHolder);
                clearDefaultProperty(getApplicableCreditCardPaymentInstruments());
                setBraintreeDefaultCard(responseData.paymentMethod.legacyId);

                Transaction.wrap(function () {
                    paymentInstrument.custom.braintreeSaveCreditCard = null;
                });
            }
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

exports.Handle = base.Handle;
exports.Authorize = base.Authorize;
