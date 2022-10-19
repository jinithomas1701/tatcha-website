var Transaction = require('dw/system/Transaction');
var SystemObjectMgr = require('dw/object/SystemObjectMgr');
var ArrayList = require('dw/util/ArrayList');
var OrderMgr = require('dw/order/OrderMgr');
var Money = require('dw/value/Money');

var { getLogger } = require('*/cartridge/scripts/braintree/bmBraintreeHelper');
var btConstants = require('*/cartridge/scripts/util/braintreeConstants');
var BTGraphQLSdkModel = require('*/cartridge/models/btGraphQLSdk');
var btGraphQLSdk = new BTGraphQLSdkModel();

/**
 * @param {orderNo} orderNo order number
 * @returns {Array} orders list
 */
function createOrdersListByOrderNo(orderNo) {
    return SystemObjectMgr.querySystemObjects('Order', 'orderNo LIKE {0} AND custom.isBraintree = {1}', 'orderNo desc', orderNo, true);
}

/**
 * @param {string} paymentMethodName payment method name
 * @returns {ArrayList} list of filtered orders by payment method
 */
function filterOrdersByPaymentMethod(paymentMethodName) {
    var orders = SystemObjectMgr.querySystemObjects('Order', 'custom.isBraintree = {0}', 'orderNo desc', true);
    var filteredOrders = new ArrayList();
    var order = null;

    while (orders.hasNext()) {
        order = orders.next();
        if (order.getPaymentInstruments(paymentMethodName).length) {
            filteredOrders.push(order);
        }
    }

    return filteredOrders;
}

/**
 * BT Order Mgr Model
 */
function OrderMgrModel() { }

/**
 * @param {string} transactionId transaction id
 * @returns {Array} orders list
 */
OrderMgrModel.prototype.getOrdersByTransactionId = function (transactionId) {
    var ordersList;

    try {
        // find transaction data
        var transactionResponse = btGraphQLSdk.searchTransactionById({
            transactionId: transactionId
        });
        // if transaction data is available use its order number or set empty array
        ordersList = !empty(transactionResponse) ?
            createOrdersListByOrderNo(transactionResponse.node.orderId) : [];
    } catch (error) {
        getLogger().error(error.message);
    }

    return ordersList;
};

/**
 * @param {string} paymentMethodName payment method name
 * @returns {Array} orders list
 */
OrderMgrModel.prototype.getOrdersByPaymentMethod = function (paymentMethodName) {
    return filterOrdersByPaymentMethod(paymentMethodName);
};

/**
 * @param {string} orderNo order number
 * @returns {Array} orders list
 */
OrderMgrModel.prototype.getOrdersByOrderNo = function (orderNo) {
    return createOrdersListByOrderNo(orderNo);
};

/**
 * @returns {Array} orders list
 */
OrderMgrModel.prototype.getAllOrders = function () {
    return createOrdersListByOrderNo('*');
};

/**
 * @param {dw.order.OrderMgr} order current order
 * @param {string} transactionStatus transaction status
 * @param {string} transactionId transaction id
 */
OrderMgrModel.prototype.updateBtPaymentStatusOfOrder = function (order, transactionStatus, transactionId) {
    var partialTransactions = order.custom.partialTransactions || [];
    var isBtPaymentStatusUpdateRequired = empty(partialTransactions) ||
        ((partialTransactions.indexOf(transactionId) === -1) && order.custom.braintreePaymentStatus !== transactionStatus);

    if (isBtPaymentStatusUpdateRequired) {
        this.updateBraintreePaymentStatus(order, transactionStatus);
    }
};

/**
 * @param {dw.order.OrderMgr} order current order
 * @param {string} partialTransactionId transaction id
 */
OrderMgrModel.prototype.updatePartialTransactionsList = function (order, partialTransactionId) {
    var transactionIds = order.custom.partialTransactions.slice().toString();
    var updatedPartialTransactionsList = transactionIds.length ? transactionIds.split(',') : [];

    if (updatedPartialTransactionsList.indexOf(partialTransactionId) === -1) {
        updatedPartialTransactionsList.push(partialTransactionId);
        Transaction.wrap(function () {
            order.custom.partialTransactions = updatedPartialTransactionsList;
        });
    }
};

/**
 * Updates order.custom.braintreePaymentStatus
 * @param {dw.order.OrderMgr} order current order
 * @param {string} transactionStatus transaction status
 */
OrderMgrModel.prototype.updateBraintreePaymentStatus = function (order, transactionStatus) {
    Transaction.wrap(function () {
        order.custom.braintreePaymentStatus = transactionStatus;
    });
};

/**
 * Updates order.custom.braintreePaymentStatus in submitForSettelment case
 * @param {Object} transaction transaction object
 * @param {Object} orderToken Order token
 */
OrderMgrModel.prototype.updateBtPaymentStatusfterSettlement = function (transaction, orderToken) {
    var order = OrderMgr.getOrder(transaction.orderId, orderToken);
    var partialTransactions = order.custom.partialTransactions || [];

    if (empty(partialTransactions) && order.custom.braintreePaymentStatus !== transaction.status) {
        this.updateBraintreePaymentStatus(order, transaction.status);
    }
};

/**
 * Updates order.custom.braintreePaymentStatus in submitForPartialSettlement case
 * @param {Object} transaction transaction object
 * @param {string} orderToken Order token
 */
OrderMgrModel.prototype.updateBtPaymentStatusAfterPartialSettlement = function (transaction, orderToken) {
    var order = OrderMgr.getOrder(transaction.orderId, orderToken);
    var partialTransactions = order.custom.partialTransactions || [];

    if (empty(partialTransactions) && order.custom.braintreePaymentStatus !== transaction.status) {
        this.updateBraintreePaymentStatus(order, btConstants.STATUS_SETTLEMENT_PENDING);
    }
};

/**
 * Updates some order.custom data for intent order and sets id and amount for it's payment transaction
 * @param {dw.order.orderMgr} order currrent order
 * @param {Object} paymentTransaction payment transaction
 * @param {Object} transaction current transaction
 */
OrderMgrModel.prototype.updateIntentOrderData = function (order, paymentTransaction, transaction) {
    Transaction.wrap(function () {
        order.custom.isBraintreeIntentOrder = false;
        order.custom.braintreePaymentStatus = transaction.status;
        paymentTransaction.setTransactionID(transaction.legacyId);
        paymentTransaction.setAmount(new Money(parseFloat(transaction.amount.value), paymentTransaction.getAmount().getCurrencyCode()));
    });
};

module.exports = OrderMgrModel;
