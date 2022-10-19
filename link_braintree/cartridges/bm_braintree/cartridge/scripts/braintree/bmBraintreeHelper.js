'use strict';

var system = require('dw/system');
var PaymentMgr = require('dw/order/PaymentMgr');

var BraintreeHelper = {};
var prefs = require('~/cartridge/config/bmBraintreePreferences');
var btConstants = require('~/cartridge/scripts/util/braintreeConstants');

/**
 * Creates or get logger
 *
 * @returns {Object} Object with logger for API operation
 */
BraintreeHelper.getLogger = function () {
    var errorMode = prefs.loggingMode === 'none' ? false : prefs.loggingMode;
    var logger = system.Logger.getLogger('Braintree', 'Braintree_General');

    return {
        error: function (msg) {
            if (errorMode) {
                logger.error(msg);
            }
        },
        info: function (msg) {
            if (errorMode && errorMode !== 'errors') {
                logger.info(msg);
            }
        },
        warn: function (msg) {
            if (errorMode && errorMode !== 'errors') {
                logger.warn(msg);
            }
        }
    };
};

/**
 * Remove underscore and capitalize first letter in payment status
 * @param {string} paymentStatus payment status
 * @return {string} Formatted payment status
 */
BraintreeHelper.parseStatus = function (paymentStatus) {
    var result = null;
    var status = paymentStatus.toLowerCase();

    try {
        var firstLetter = status.charAt(0);
        result = status.replace(/_/g, ' ').replace(firstLetter, firstLetter.toUpperCase());
    } catch (error) {
        BraintreeHelper.getLogger().error(error);
    }

    return result;
};

/**
 * Get braintree payment instrument from array of payment instruments
 * @param {dw.order.LineItemCtnr} lineItemContainer Order object
 * @return {dw.order.OrderPaymentInstrument} Braintree Payment Instrument
 */
BraintreeHelper.getBraintreePaymentInstrument = function (lineItemContainer) {
    var paymentInstruments = lineItemContainer.getPaymentInstruments();
    var braintreePaymentInstrument = null;
    var paymentProcessors = [
        btConstants.PROCESSOR_NAME_BT_CREDIT,
        btConstants.PROCESSOR_NAME_BT_PAYPAL,
        btConstants.PROCESSOR_NAME_BT_APPLEPAY,
        btConstants.PROCESSOR_NAME_BT_VENMO,
        btConstants.PROCESSOR_NAME_BT_LOCAL,
        btConstants.PROCESSOR_NAME_BT_GOOGLEPAY,
        btConstants.PROCESSOR_NAME_BT_SRC
    ];

    var iterator = paymentInstruments.iterator();
    var paymentInstrument = null;

    while (iterator.hasNext()) {
        paymentInstrument = iterator.next();
        var paymentProcessorId = PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod()).getPaymentProcessor().getID();

        if (paymentProcessors.indexOf(paymentProcessorId) !== -1) {
            braintreePaymentInstrument = paymentInstrument;
            break;
        }
    }

    return braintreePaymentInstrument;
};

/**
 * Returns Applicable Active Payment Methods
 * @returns {Object} an object with active payment Methods
 */
BraintreeHelper.getApplicablePaymentMethods = function () {
    const activePaymentMethods = PaymentMgr.getActivePaymentMethods();

    var braintreePaymentInstruments = [];
    var paymentProcessors = [
        btConstants.PROCESSOR_NAME_BT_CREDIT,
        btConstants.PROCESSOR_NAME_BT_PAYPAL,
        btConstants.PROCESSOR_NAME_BT_APPLEPAY,
        btConstants.PROCESSOR_NAME_BT_VENMO,
        btConstants.PROCESSOR_NAME_BT_LOCAL,
        btConstants.PROCESSOR_NAME_BT_GOOGLEPAY,
        btConstants.PROCESSOR_NAME_BT_SRC
    ];

    var iterator = activePaymentMethods.iterator();
    var paymentInstrument = null;

    while (iterator.hasNext()) {
        paymentInstrument = iterator.next();
        var paymentProcessorId = paymentInstrument.paymentProcessor ? paymentInstrument.paymentProcessor.ID : '';

        if (paymentProcessors.indexOf(paymentProcessorId) !== -1) {
            braintreePaymentInstruments.push(paymentInstrument);
        }
    }

    return braintreePaymentInstruments;
};

/**
 * Returns boolean value whether search query inputs are empty or not
 * @param {string} transactionId transaction Id
 * @param {string} paymentMethod payment Method
 * @param {string} orderNo order No
 * @returns {boolean} value
 */
BraintreeHelper.isSearchQueryEmpty = function (transactionId, paymentMethod, orderNo) {
    return empty(transactionId.value) && empty(paymentMethod.stringValue) && empty(orderNo.stringValue);
};

/**
 * Gets search type based on submitted search query
 * @param {string} transactionId transaction Id
 * @param {string} paymentMethod payment Method
 * @returns {string} search type
 */
BraintreeHelper.getSearchType = function (transactionId, paymentMethod) {
    var searchType = btConstants.SEARCH_BY_ORDER_NUMBER;
    var isSearchByTransactionId = transactionId.submitted;
    var isSearchByPaymentMethod = paymentMethod.submitted && !empty(paymentMethod.stringValue);

    if (isSearchByTransactionId) {
        searchType = btConstants.SEARCH_BY_TRANSACTION_ID;
    } else if (isSearchByPaymentMethod) {
        searchType = btConstants.SEARCH_BY_PAYMENT_METHOD;
    }

    return searchType;
};

/**
 * Format date string in to the M/dd/yy h:mm format
 * @param {string} isoString date string
 * @return {Date} Date object
 */
BraintreeHelper.convertToDate = function (isoString) {
    var date = isoString.replace('000000Z', '000Z');

    return new Date(date);
};

module.exports = BraintreeHelper;
