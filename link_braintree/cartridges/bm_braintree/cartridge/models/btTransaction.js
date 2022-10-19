var Money = require('dw/value/Money');

var { getLogger } = require('*/cartridge/scripts/braintree/bmBraintreeHelper');
var btConstants = require('*/cartridge/scripts/util/braintreeConstants');
var BTTransactionMgrModel = require('*/cartridge/models/btTransactionMgr');
var btTransactionMgr = new BTTransactionMgrModel();

/**
 * BT Transaction Model
 * @param {dw.order.orderMgr} order current order
 * @param {Object} transactionObject transaction data
 */
function TransactionModel(order, transactionObject) {
    try {
        var currency = transactionObject.amount.currencyCode;
        var transactionAmount = new Money(parseFloat(transactionObject.amount.value), currency);

        var initialOrderTransactionId = btTransactionMgr.getInitialOrderTransactionId(order);
        var transactions = btTransactionMgr.getDetailedTransactionsList(order, initialOrderTransactionId);

        var isEmptyRefunds = empty(transactionObject.refunds);
        var refundTransactions = isEmptyRefunds ? [] : btTransactionMgr.getRefundTransactionsDetails(transactionObject.refunds);
        var refundedAmount = isEmptyRefunds ? new Money(0, currency) : btTransactionMgr.calculateTransactionsAmountValue(refundTransactions, currency);

        var initialOrderTransactionAmount = btTransactionMgr.getInitialOrderTransactionAmount(initialOrderTransactionId, transactions, currency);
        var settledAmount = btTransactionMgr.calculateTransactionsAmountValue(transactions, currency);
        var transactionsRefundedAmount = btTransactionMgr.calculateTotalRefund(transactions, currency);
        var leftToSettle = btTransactionMgr.calculateLeftAmount(initialOrderTransactionAmount, settledAmount).add(transactionsRefundedAmount);
        var leftToRefund = btTransactionMgr.calculateLeftAmount(transactionAmount, refundedAmount);

        var isFullCaptured = leftToSettle.getValue() === 0;
        var isInitialOrderTransactionIdEqualToCurrentTransactionId = initialOrderTransactionId === transactionObject.legacyId;
        var isAbleToCapture = !isFullCaptured && isInitialOrderTransactionIdEqualToCurrentTransactionId;
        // if payment token exists (paymentMethod.legacyId) partial settlement for non-PayPal payment methods is available
        var isPaymentTokenExist = !empty(transactionObject.paymentMethod) && transactionObject.paymentMethod.legacyId;

        for (var property in transactionObject) {
            this[property] = transactionObject[property];
        }

        // amount related
        this.currency = currency;
        this.initialOrderTransactionAmount = initialOrderTransactionAmount;
        this.settledAmount = settledAmount;
        this.transactionsRefundedAmount = transactionsRefundedAmount;
        this.leftToSettle = leftToSettle;
        this.refundedAmount = refundedAmount;
        this.leftToRefund = leftToRefund;

        // transaction history
        this.transactionHistoryList = btTransactionMgr.getTransactionHistoryList(transactions);

        // flags
        // isDataUpdateRequired - flag for void action
        this.isDataUpdateRequired = isInitialOrderTransactionIdEqualToCurrentTransactionId;
        this.isAbleToCapture = isAbleToCapture;
        this.isAbleToCaptureByNewTransaction = isAbleToCapture && isPaymentTokenExist;
        this.isAbleToRefund = refundedAmount !== transactionAmount;
        // isPaypal flag - to identify PayPal transaction to determine possible actions for such transaction
        this.isPaypal = order.getPaymentInstruments(btConstants.PAYMENT_METHOD_ID_PAYPAL).length;
        this.paymentMethodName = btTransactionMgr.getPaymentMethodName(order);
    } catch (error) {
        getLogger().error(error);

        throw error;
    }
}

module.exports = TransactionModel;
