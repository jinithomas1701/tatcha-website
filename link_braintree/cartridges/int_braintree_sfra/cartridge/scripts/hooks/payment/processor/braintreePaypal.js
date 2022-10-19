'use strict';

var OrderMgr = require('dw/order/OrderMgr');
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');

var {
    getPaypalCustomerPaymentInstrumentByEmail,
    getCustomerPaymentInstruments,
    setBraintreeDefaultCard,
    clearDefaultProperty,
    getSavedPayPalPaymentInstrumentByUUID
} = require('~/cartridge/scripts/braintree/helpers/customerHelper');
var {
    saveGeneralTransactionData,
    createBaseSaleTransactionData,
    verifyTransactionStatus,
    savePaypalAccount,
    isSessionPayPalAccountUsed
} = require('~/cartridge/scripts/hooks/payment/processor/processorHelper');
var {
    getAmountPaid,
    deleteBraintreePaymentInstruments,
    getLogger,
    handleErrorCode
} = require('~/cartridge/scripts/braintree/helpers/paymentHelper');
var btBusinessLogic = require('~/cartridge/scripts/braintree/braintreeAPI/braintreeBusinessLogic');
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
    data.descriptor = { name: prefs.paypalDescriptorName || '' };
    // flag to recognize PayPal transaction
    data.isPaypal = true;

    if (prefs.isPaypalFraudToolsEnabled) {
        data.deviceData = paymentInstrument.custom.braintreeFraudRiskData;
    }

    return data;
}

/**
 * Create billing address for  PayPal account
 * @param {dw.order.Order} order Current order
 * @return {Object} Object with billing address
 */
function createPaypalBillingAddress(order) {
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

    return billingAddressObject;
}

/**
 * Save result of the success sale transaction
 * @param {dw.order.Order} orderRecord Current order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrumentRecord Current payment instrument
 * @param {Object} response Response data from API call
 */
function saveTransactionData(orderRecord, paymentInstrumentRecord, response) {
    var paypalTransactionData = response.transaction;
    var paypalPaymentMethodData = paypalTransactionData.paymentMethod || response.billingAgreementWithPurchasePaymentMethod;

    Transaction.wrap(function () {
        // Save token for lightning order managment
        if (!empty(paypalPaymentMethodData) && empty(paymentInstrumentRecord.creditCardToken)) {
            paymentInstrumentRecord.creditCardToken = paypalPaymentMethodData.legacyId;
        }

        saveGeneralTransactionData(orderRecord, paymentInstrumentRecord, paypalTransactionData);
    });
}

/**
 * Perform API call to create new(sale) transaction
 * @param {dw.order.Order} order Current order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Used payment instrument
 * @return {Object} Paypal data
 */
function mainFlow(order, paymentInstrument) {
    var saleTransactionRequestData = createSaleTransactionData(order, paymentInstrument);
    var paypalData = btGraphQLSdk.createTransaction(saleTransactionRequestData);
    var paypalTransactionData = paypalData.transaction;
    var paypalPaymentMethodData = paypalTransactionData.paymentMethod || paypalData.billingAgreementWithPurchasePaymentMethod;

    // throw error in case of unsuccessful status
    verifyTransactionStatus(paypalTransactionData, paymentInstrument, order);
    saveTransactionData(order, paymentInstrument, paypalData);

    if (customer.authenticated && prefs.vaultMode) {
        var сustomerPaymentInstrument = getPaypalCustomerPaymentInstrumentByEmail(paypalTransactionData.paymentMethodSnapshot.payer.email);

        if (paymentInstrument.custom.braintreeSaveCreditCard && !сustomerPaymentInstrument) {
            var token = paypalPaymentMethodData.legacyId;
            savePaypalAccount(paypalData, JSON.stringify(createPaypalBillingAddress(order)), token);
            clearDefaultProperty(getCustomerPaymentInstruments(prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId));
            setBraintreeDefaultCard(token);
        }
    }

    Transaction.wrap(function () {
        paymentInstrument.custom.braintreeSaveCreditCard = null;
    });

    return { paypalData: paypalData };
}

/**
 * Perform API call to create new(sale) transaction
 * @param {dw.order.Order} order Current order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Used payment instrument
 */
function intentOrderFlow(order, paymentInstrument) {
    var paymentMethodToken = paymentInstrument.creditCardToken || btBusinessLogic.createPaymentMethod(paymentInstrument.custom.braintreePaymentMethodNonce, order);

    Transaction.wrap(function () {
        order.custom.isBraintree = true;
        order.custom.isBraintreeIntentOrder = true;
        paymentInstrument.custom.braintreeFraudRiskData = null;
        // Save token for lightning order managment
        if (!paymentInstrument.creditCardToken) {
            paymentInstrument.creditCardToken = paymentMethodToken;
        }
    });
}

/**
 * Write info about failed order into payment instrument, and mark customer as Braintree customer
 * @param {dw.order.Order} order Current order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Used payment instrument
 * @param {string} braintreeError Error text
 * @returns {Object} Error indicator
 */
function authorizeFailedFlow(order, paymentInstrument, braintreeError) {
    Transaction.wrap(function () {
        order.custom.isBraintree = true;
        paymentInstrument.custom.braintreeFailReason = braintreeError;
    });

    handleErrorCode(braintreeError);

    return { error: true };
}

/**
 * Create Braintree payment instrument and update billing address
 * @param {Object} basket Arguments of the HTTP call
 * @returns {Object} handle call result
 */
function Handle(basket) {
    var httpParameterMap = request.httpParameterMap;
    var paymentProcessor = PaymentMgr.getPaymentMethod(prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId).getPaymentProcessor();
    var paypalPaymentInstrument = null;
    var customerPaymentInstrument = null;
    var isSessionAccountUsed = isSessionPayPalAccountUsed(httpParameterMap);
    var isFromCart = httpParameterMap.fromCart.booleanValue;

    // Creating PayPal payment processor
    Transaction.wrap(function () {
        var methodName = session.forms.billing.paymentMethod.value;

        deleteBraintreePaymentInstruments(basket);

        paypalPaymentInstrument = basket.createPaymentInstrument(methodName, getAmountPaid(basket));
        paypalPaymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
    });

    // new or session PP account. scenario for both Unauthenticated & Authenticated buyers
    if (isSessionAccountUsed) {
        Transaction.wrap(function () {
            paypalPaymentInstrument.custom.braintreeFraudRiskData = httpParameterMap.braintreePaypalRiskData.stringValue;
            paypalPaymentInstrument.custom.braintreeSaveCreditCard = isFromCart || httpParameterMap.braintreeSavePaypalAccount.booleanValue;
            paypalPaymentInstrument.custom.braintreePaypalEmail = httpParameterMap.braintreePaypalEmail.stringValue || basket.getCustomerEmail();
            paypalPaymentInstrument.custom.braintreePaymentMethodNonce = httpParameterMap.braintreePaypalNonce.stringValue;
        });

        // scenarios only for authenticated buyers
    } else if (customer.authenticated) {
        // Saved PP account (PDP, Minicart, Cart scenario)
        customerPaymentInstrument = getSavedPayPalPaymentInstrumentByUUID(httpParameterMap);

        if (empty(customerPaymentInstrument.creditCardToken)) {
            return { error: true };
        }

        Transaction.wrap(function () {
            paypalPaymentInstrument.creditCardToken = customerPaymentInstrument.creditCardToken;
            paypalPaymentInstrument.custom.braintreePaypalEmail = customerPaymentInstrument.custom.braintreePaypalAccountEmail;
            paypalPaymentInstrument.custom.braintreeFraudRiskData = httpParameterMap.braintreePaypalRiskData.stringValue;
        });
    } else {
        return { success: false };
    }

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
            if (prefs.paypalOrderIntent) {
                intentOrderFlow(order, paymentInstrument);
            } else {
                mainFlow(order, paymentInstrument);
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
