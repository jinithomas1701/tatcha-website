var Money = require('dw/value/Money');

var {
    getLogger,
    getBraintreePaymentInstrument
} = require('*/cartridge/scripts/braintree/bmBraintreeHelper');
var btConstants = require('*/cartridge/scripts/util/braintreeConstants');
var BTGraphQLSdkModel = require('*/cartridge/models/btGraphQLSdk');
var btGraphQLSdk = new BTGraphQLSdkModel();

/**
 * Transaction Mgr Model
 */
function TransactionMgrModel() { }

/**
 * Defines transaction type
 * @param {string} transactionType transaction type
 * @returns {string} transaction type
 */
function defineTransactionType(transactionType) {
    return !empty(transactionType) ? transactionType.toUpperCase() : btConstants.TYPE_TRANSACTION;
}

/**
 * Pull data object for requested transaction
 * @param {string} id transaction id
 * @returns {Object} transaction response object
 */
function findTransactionById(id) {
    var transactionResponse = btGraphQLSdk.searchTransactionById({
        transactionId: id
    });

    return transactionResponse;
}

/**
 * Pull data object for requested refund transaction
 * @param {string} id transaction id
 * @returns {Object} refund transaction response object
 */
function findRefundTransactionById(id) {
    var transactionResponse = btGraphQLSdk.searchRefundTransactionById({
        transactionId: id
    });

    return transactionResponse;
}

/**
 * Create array of all transaction ids related to the order
 * @param {dw.order.OrderMgr} order current order
 * @param {string} initialOrderTransactionId id of order initial transaction
 * @return {Array} all transactions ids related to the order
 */
function getFullOrderTransactionIdsList(order, initialOrderTransactionId) {
    var partialTransactionsIds = order.custom.partialTransactions.slice().toString();
    var transactionIdsList = partialTransactionsIds.length ? partialTransactionsIds.split(',') : [];

    // add to the ids list initial order transaction id
    transactionIdsList.unshift(initialOrderTransactionId);

    return transactionIdsList;
}

/**
 * Calculate amount of the refund transactions that was settled
 * @param {Array} refundTransactions refund transactions details
 * @param {string} currency order currency
 * @return {dw.value.Money} total refund transactions amount
 */
function calculateSettleRefundValue(refundTransactions, currency) {
    var refundedAmount = new Money(0, currency);

    refundTransactions.forEach(function (transaction) {
        if (transaction.status === btConstants.STATUS_SETTLED) {
            refundedAmount = refundedAmount.add(new Money(parseFloat(transaction.amount.value), currency));
        }
    });

    return refundedAmount;
}

/**
 * Finds transaction
 * @param {string} type transaction type
 * @param {string} transactionId  transaction id
 * @return {Object} transaction details
 */
TransactionMgrModel.prototype.findTransaction = function (type, transactionId) {
    var transaction;
    var transactionType = defineTransactionType(type);

    try {
        // find transaction data based on type
        if (transactionType === btConstants.TYPE_TRANSACTION) {
            transaction = findTransactionById(transactionId).node;
        } else {
            transaction = findRefundTransactionById(transactionId);
        }
        // mark transaction type if transaction data exists
        if (!empty(transaction)) {
            transaction.isTransactionRefund = transactionType === btConstants.TYPE_REFUND;
        }
    } catch (error) {
        getLogger().error(error.message);

        throw error;
    }

    return transaction;
};

/**
 * Get transaction details for each order transaction based on array with transaction ids
 * @param {Array} transactionIdsList full order transaction ids list
 * @return {Array} with each transaction details
 */
TransactionMgrModel.prototype.getTransactionsDetails = function (transactionIdsList) {
    var transactionsDetailsList = [];

    transactionIdsList.forEach(function (transactionId) {
        try {
            var orderTransaction = findTransactionById(transactionId);

            transactionsDetailsList.push(orderTransaction.node);
        } catch (error) {
            getLogger().error(error);
        }
    });

    return transactionsDetailsList;
};

/**
 * Get transactions details based on array with refund transactions
 * @param {Array} refundTransactionsList refund transactions list
 * @return {Array} transaction details
 */
TransactionMgrModel.prototype.getRefundTransactionsDetails = function (refundTransactionsList) {
    var refundTransactionsDetails = [];

    refundTransactionsList.forEach(function (transaction) {
        try {
            var orderTransaction = findRefundTransactionById(transaction.legacyId);

            refundTransactionsDetails.push(orderTransaction);
        } catch (error) {
            getLogger().error(error);
        }
    });

    return refundTransactionsDetails;
};

/**
 * Return calculated transactions amount
 * @param {Array} transactions transactions
 * @param {string} currency currency of the main transaction
 * @return {dw.value.Money} amount
 */
TransactionMgrModel.prototype.calculateTransactionsAmountValue = function (transactions, currency) {
    var amount = new Money(0, currency);
    var notAllowedStatuses = [btConstants.STATUS_VOIDED, btConstants.STATUS_AUTHORIZED, btConstants.STATUS_SETTLEMENT_PENDING];

    transactions.forEach(function (transaction) {
        if (notAllowedStatuses.indexOf(transaction.status) === -1) {
            amount = amount.add(new Money(parseFloat(transaction.amount.value), currency));
        }
    });

    return amount;
};


/**
 * Return amount that is available to refund/settle
 * @param {dw.value.Money} amount orders total amount
 * @param {dw.value.Money} refundedOrSettledAmount amount that was refunded/settle
 * @return {dw.value.Money} left amount
 */
TransactionMgrModel.prototype.calculateLeftAmount = function (amount, refundedOrSettledAmount) {
    return amount.subtract(refundedOrSettledAmount);
};

/**
 * Calculate amount that was refunded in scope of the order
 * @param {Array} orderTransactions order transaction details
 * @param {string} currency orders currency
 * @return {dw.value.Money} amount
 */
TransactionMgrModel.prototype.calculateTotalRefund = function (orderTransactions, currency) {
    var totalRefund = new Money(0, currency);
    var that = this;

    orderTransactions.forEach(function (transaction) {
        if (!empty(transaction.refunds)) {
            // get details for each refund transaction
            var refundTransactions = that.getRefundTransactionsDetails(transaction.refunds);
            var refundedAmount = calculateSettleRefundValue(refundTransactions, currency);
            totalRefund = totalRefund.add(refundedAmount);
        }
    });

    return totalRefund;
};

/**
 * Get order authorized amount
 * @param {string} initialOrderTransactionId order initial transaction id
 * @param {Array} orderTransactions orders transactions array
 * @param {string} currency orders currency
 * @return {dw.value.Money} amount
 */
TransactionMgrModel.prototype.getInitialOrderTransactionAmount = function (initialOrderTransactionId, orderTransactions, currency) {
    var authAmount = 0;

    orderTransactions.forEach(function (transaction) {
        if (transaction.legacyId === initialOrderTransactionId) {
            transaction.statusHistory.forEach(function (historyTransaction) {
                if (historyTransaction.status === btConstants.STATUS_AUTHORIZED) {
                    authAmount = parseFloat(historyTransaction.amount.value);
                }
            });
        }
    });

    return new Money(authAmount, currency);
};

/**
 * Get initial transaction id from order
 * @param {dw.order.OrderMgr} order current order
 * @return {string} transaction id
 */
TransactionMgrModel.prototype.getInitialOrderTransactionId = function (order) {
    var paymentInstrument = getBraintreePaymentInstrument(order);

    return paymentInstrument.getPaymentTransaction().getTransactionID();
};

/**
 * Get list of order transactions with details for each transaction
 * @param {dw.order.OrderMgr} order current order
 * @param {string} initialOrderTransactionId id of initial order transaction
 * @return {Array} with each transactions details
 */
TransactionMgrModel.prototype.getDetailedTransactionsList = function (order, initialOrderTransactionId) {
    // create list of all transaction ids related to the order
    var transactionIdsList = getFullOrderTransactionIdsList(order, initialOrderTransactionId);
    // get details for each transaction from list
    var transactionsDetailsList = this.getTransactionsDetails(transactionIdsList);

    return transactionsDetailsList;
};

/**
 * Create ids array for history dropdown
 * @param {Array} orderTransactions Transaction ids
 * @return {Array} with transaction/transaction refund ids
 */
TransactionMgrModel.prototype.getTransactionHistoryList = function (orderTransactions) {
    var transactionIds = [];

    orderTransactions.forEach(function (transaction) {
        transactionIds.push({
            type: 'Transaction',
            id: transaction.legacyId
        });

        var refunds = transaction.refunds;

        if (!empty(refunds)) {
            refunds.forEach(function (refundTransaction) {
                transactionIds.push({
                    type: 'Refund',
                    id: refundTransaction.legacyId
                });
            });
        }
    });

    return transactionIds;
};

/**
 * Gets payment method name from payment instrument
 * @param {Array} order dw.order.OrderMgr
 * @return {string} payment method name
 */
TransactionMgrModel.prototype.getPaymentMethodName = function (order) {
    var paymentInstruments = order.getPaymentInstruments();
    var paymentMethodName = null;

    Array.some(paymentInstruments, function (paymentInstrument) {
        if (paymentInstrument.paymentMethod !== 'Gift Certificate') {
            paymentMethodName = paymentInstrument.paymentMethod;
        }
    });

    return paymentMethodName;
}

module.exports = TransactionMgrModel;
