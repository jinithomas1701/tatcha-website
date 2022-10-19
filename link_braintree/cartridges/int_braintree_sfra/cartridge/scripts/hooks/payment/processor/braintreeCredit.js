'use strict';

var Transaction = require('dw/system/Transaction');
var OrderMgr = require('dw/order/OrderMgr');
var PaymentMgr = require('dw/order/PaymentMgr');
var PaymentInstrument = require('dw/order/PaymentInstrument');

var prefs = require('~/cartridge/config/braintreePreferences');
var {
    deleteBraintreePaymentInstruments,
    getNonGiftCertificateAmount,
    getLogger,
    handleErrorCode,
    getApplicableCreditCardPaymentInstruments
} = require('~/cartridge/scripts/braintree/helpers/paymentHelper');
var {
    saveGeneralTransactionData,
    createBaseSaleTransactionData,
    verifyTransactionStatus,
    saveCustomerCreditCard,
    isUsedSessionCreditCard,
    isUsedSavedCardMethod,
    isSessionCardAlreadyUsed,
    getUsedCreditCardFromForm
} = require('~/cartridge/scripts/hooks/payment/processor/processorHelper');
var {
    clearDefaultProperty,
    setBraintreeDefaultCard,
    getCustomerPaymentInstrument
} = require('~/cartridge/scripts/braintree/helpers/customerHelper');

var BTGraphQLSdk = require('*/cartridge/models/btGraphQLSdk');
var btGraphQLSdk = new BTGraphQLSdk();

/**
 * Perform API call to create new(sale) transaction
 * @param  {dw.order.Order} order Current order
 * @param  {dw.order.OrderPaymentInstrument} paymentInstrument Used payment instrument
 * @returns {Object} Response data from API call
 */
function createSaleTransactionData(order, paymentInstrument) {
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
        paymentInstrumentRecord.custom.braintreeDefaultCard = null;
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
 * Create Braintree payment instrument
 * @param {Object} basket Arguments of the HTTP call
 * @returns {Object} handle call result
 */
function Handle(basket) {
    var paymentInstrument = null;
    var result = { success: true };
    var httpParameterMap = request.httpParameterMap;
    var selectedCreditCardUuid = httpParameterMap.braintreeCreditCardList.stringValue;
    var braintreePaymentMethodNonce = httpParameterMap.braintreePaymentMethodNonce.stringValue;
    var isbraintreePaymentMethodNonceExist = braintreePaymentMethodNonce && braintreePaymentMethodNonce !== '';
    var creditCardBasketPaymentInstrument = basket.getPaymentInstruments(PaymentInstrument.METHOD_CREDIT_CARD);

    session.custom.braintree3dSecureNonce = false;

    var paymentMethodId = prefs.paymentMethods['BRAINTREE_' + httpParameterMap.braintreeCardPaymentMethod].paymentMethodId;
    var paymentProcessor = PaymentMgr.getPaymentMethod(paymentMethodId).getPaymentProcessor();

    // new/session credit card cases
    if (isUsedSessionCreditCard(selectedCreditCardUuid)) {
        if (!isbraintreePaymentMethodNonceExist) {
            return { error: true };
        }
        // when proceed with already used session card (no changes needed for payment instrument, except saving flag)
        if (isSessionCardAlreadyUsed(braintreePaymentMethodNonce, creditCardBasketPaymentInstrument)) {
            // update of braintreeSaveCreditCard property is needed in case when customer is registered and vault mode is enabled
            Transaction.wrap(function () {
                creditCardBasketPaymentInstrument[0].custom.braintreeSaveCreditCard = httpParameterMap.braintreeSaveCreditCard.booleanValue;
            });
        } else { // when proceed with new card
            var creditCard = getUsedCreditCardFromForm(session.forms.billing.creditCardFields);

            Transaction.wrap(function () {
                try {
                    deleteBraintreePaymentInstruments(basket);

                    paymentInstrument = basket.createPaymentInstrument(paymentMethodId, getNonGiftCertificateAmount(basket));
                    paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
                    paymentInstrument.creditCardType = creditCard.creditCardType;
                    paymentInstrument.creditCardNumber = creditCard.creditCardNumber;
                    paymentInstrument.creditCardHolder = creditCard.creditCardHolder;
                    paymentInstrument.setCreditCardExpirationMonth(creditCard.creditCardExpirationMonth);
                    paymentInstrument.setCreditCardExpirationYear(creditCard.creditCardExpirationYear);

                    paymentInstrument.custom.braintreePaymentMethodNonce = braintreePaymentMethodNonce;
                    paymentInstrument.custom.braintreeSaveCreditCard = httpParameterMap.braintreeSaveCreditCard.booleanValue;
                    paymentInstrument.custom.braintreeIs3dSecureRequired = httpParameterMap.braintreeIs3dSecureRequired.booleanValue;
                    paymentInstrument.custom.braintreeFraudRiskData = httpParameterMap.braintreeDeviceData.stringValue;
                } catch (error) {
                    getLogger().error(error);

                    result = { error: true };
                }
            });
        }
        // saved card case (Credit Card/GooglePay Card/SRC Card)
    } else if (isUsedSavedCardMethod(selectedCreditCardUuid)) {
        if (httpParameterMap.braintreeIs3dSecureRequired.booleanValue && !isbraintreePaymentMethodNonceExist) {
            return { error: true };
        }

        session.custom.braintree3dSecureNonce = true;
        var customerPaymentInstrument = getCustomerPaymentInstrument(selectedCreditCardUuid);

        Transaction.wrap(function () {
            deleteBraintreePaymentInstruments(basket);

            paymentInstrument = basket.createPaymentInstrumentFromWallet(customerPaymentInstrument, getNonGiftCertificateAmount(basket));
            paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);

            paymentInstrument.custom.braintreeIs3dSecureRequired = httpParameterMap.braintreeIs3dSecureRequired.booleanValue;
            paymentInstrument.custom.braintreeFraudRiskData = httpParameterMap.braintreeDeviceData.stringValue;
        });
    }

    return result;
}

/**
 * Authorize payment function
 * @param {string} orderNumber Order Number
 * @param {Object} paymentInstrument Payment Instrument
 * @returns {Object} success object
 */
function Authorize(orderNumber, paymentInstrument) {
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

exports.Handle = Handle;
exports.Authorize = Authorize;
