'use strict';
/**
 * It's job, which synchronize transaction statuses on Braintree side with related orders transactions
 */

var System = require('dw/system');
var Transaction = require('dw/system/Transaction');
var Order = require('dw/order/Order');

/**
 * Update payment status of Braintree orders
 * @param {Array} orders orders Braintree orders
 * @param {Object} PaymentHelper PaymentHelper object
 */
function updateOrders(orders) {
    var btBusinessLogic = require('~/cartridge/scripts/braintree/braintreeAPI/braintreeBusinessLogic');

    var transactions = btBusinessLogic.searchTransactionsByIds(orders);

    if (!transactions.error) {
        Transaction.wrap(function () {
            transactions.forEach(function (transaction) {
                var order = orders[transaction.node.legacyId];

                if (order) {
                    order.custom.braintreePaymentStatus = transaction.node.status;
                }
            });
        });
    }
}

function execute() { // eslint-disable-line require-jsdoc
    var { getBraintreePaymentInstrument } = require('~/cartridge/scripts/braintree/helpers/paymentHelper');
    var searchQuery = 'custom.isBraintree = {0} AND status != {1} AND custom.braintreePaymentStatus != {2} AND custom.braintreePaymentStatus != {3}';
    var orders = require('dw/object/SystemObjectMgr').querySystemObjects('Order', searchQuery, 'orderNo desc', true, Order.ORDER_STATUS_FAILED, 'voided', 'settled');
    var orderIndex = 1;
    var partSize = 30;
    var ordersPart = {};

    while (orders.hasNext()) {
        var order = orders.next();
        var transactionId = getBraintreePaymentInstrument(order).getPaymentTransaction().getTransactionID();

        if (orderIndex % partSize === 0) {
            ordersPart[transactionId] = order;
            updateOrders(ordersPart);
            ordersPart = {};
        } else {
            ordersPart[transactionId] = order;
        }

        orderIndex++;
    }

    updateOrders(ordersPart);

    return new System.Status(System.Status.OK);
}

exports.execute = execute;
