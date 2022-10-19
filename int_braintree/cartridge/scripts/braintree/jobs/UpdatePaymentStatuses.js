'use strict';
/* global dw */

/**
 * It's job, which synchronize transaction statuses on Braintree side with related orders transactions
 */

var System = require('dw/system');
var Transaction = require('dw/system/Transaction');

/**
 * Update payment status of Braintree orders
 * @param {Array} orders orders Braintree orders
 * @param {Object} BraintreeHelper BraintreeHelper object
 */
function updateOrders(orders, BraintreeHelper) {
    var transactionsIds = Object.keys(orders);
    var response = BraintreeHelper.searchTransactionsByIds(transactionsIds);
    if (response.creditCardTransactions) {
        Transaction.wrap(function () {
            for (var i = 0; i < response.creditCardTransactions.length; i++) {
                var transaction = response.creditCardTransactions[i];
                var order = orders[transaction.id];
                if (order) {
                    order.custom.braintreePaymentStatus = transaction.status;
                }
            }
        });
    }
}

function execute() { // eslint-disable-line require-jsdoc
    var BraintreeHelper = require('~/cartridge/scripts/braintree/braintreeHelper');
    var searchQuery = 'custom.isBraintree = {0} AND status != {1} AND custom.braintreePaymentStatus != {2} AND custom.braintreePaymentStatus != {3}';
    var orders = require('dw/object/SystemObjectMgr').querySystemObjects('Order', searchQuery, 'orderNo desc', true, dw.order.Order.ORDER_STATUS_FAILED, 'voided', 'settled');
    var orderIndex = 1;
    var partSize = 30;
    var ordersPart = {};

    while (orders.hasNext()) {
        var order = orders.next();
        var paymentInstrument = BraintreeHelper.getBraintreePaymentInstrument(order);
        var transactionId = paymentInstrument.getPaymentTransaction().getTransactionID();
        if (orderIndex % partSize === 0) {
            ordersPart[transactionId] = order;
            updateOrders(ordersPart, BraintreeHelper);
            ordersPart = {};
        } else {
            ordersPart[transactionId] = order;
        }
        orderIndex++;
    }
    updateOrders(ordersPart, BraintreeHelper);
    return new System.Status(System.Status.OK);
}

exports.execute = execute;
