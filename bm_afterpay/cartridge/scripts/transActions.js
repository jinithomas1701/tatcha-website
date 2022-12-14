/**
* AfterPay Transaction Actions
*
* @input Action: String
* @input OrderNo: String
* @input Amount: String
*
*/

/* API Includes */
var OrderMgr = require('dw/order/OrderMgr');
var Transaction = require('dw/system/Transaction');
var Resource = require('dw/web/Resource');

/* Script Modules */
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('TransActions');

/**
 * updates the order status
 * @param {string} orderNo - orderNo
 * */
function updateOrderStatus(orderNo) {
    var Order = OrderMgr.getOrder(orderNo);

    try {
        Transaction.begin();
        Order.setPaymentStatus(Order.PAYMENT_STATUS_NOTPAID);
        Order.setStatus(Order.ORDER_STATUS_CANCELLED);
        Transaction.commit();
        
    } catch (e) {
        Transaction.rollback();
        Logger.error('Exception occured while updating the order status after Refund Transaction' + e);
    }
}

/**
 * generate Refund Request
 * @param {string} orderNo - orderNo
 * @param {number} amount - amount
 * @param {string} currency - currency
 * @param {string} paymentID - paymentID
 * @returns {Object} data- data
 * */
function makeRefundRequest(orderNo, amount, currency, paymentID) {
    var data = {
        paymentID: paymentID,
        amount: {
            amount: amount,
            currency: currency
        },
        orderNo: orderNo
    };

    return data;
}

/**
 * call action
 * @param {Object} request - request
 * @returns {Object} response - response
 * */
function callAction(request) {
    var refundUtil = require('bm_afterpay/cartridge/scripts/util/refundUtilities.js');
    var response;

    if (refundUtil && !(refundUtil.error)) {
        response = refundUtil.createRefund(request);
    }

    return response;
}

/**
 * Refund action
 * @param {string} orderNo - orderNo
 * @param {string} amountString - amount as string value
 * @returns {Object} status
 * */
function refund(orderNo, amountString) {
    var order = OrderMgr.getOrder(orderNo);
    var paymentInstrument;
    var apPaymentInstrument;
    var paymentTransaction;
    var status = false;
    var amountArray = amountString.split(' ');
    var currency = amountArray[0];
    var amount = amountArray[1];
    var response;
    var paymentID;
    var request;
    var error;

    var iter = order.getPaymentInstruments().iterator();

    while (iter.hasNext()) {
        apPaymentInstrument = iter.next();
        if (apPaymentInstrument.paymentMethod === 'AFTERPAY_PBI') {
            paymentInstrument = apPaymentInstrument;
        }
    }

    paymentTransaction = paymentInstrument.getPaymentTransaction();
    paymentID = paymentTransaction.custom.apPaymentID;
    amount = parseFloat(amount, 10);

    request = makeRefundRequest(orderNo, amount, currency, paymentID);

    dw.system.Logger.info('Refund request: ' + JSON.stringify(request));

    response = callAction(request);

    dw.system.Logger.info('Refund response: ' + JSON.stringify(response));

    if (response === null || (response && response.refundId === undefined)) {
        error = Resource.msg('transaction.unknown', 'afterpay', null);
    }

    if (response != null || (response && response.refundId)) {
        status = true;

        Transaction.begin();
        paymentTransaction.custom.apRefundID = response.refundId;
        Transaction.commit();
        dw.system.Logger.info('Refund successful for afterpay order {0}',order)
        updateOrderStatus(orderNo);
    }

    return {
        status: status,
        error: error
    };
}

/**
 * Internal methods
 * @param {string} orderNo - orderNo
 * @param {number} amount - amount
 * @param {string} action - action
 * @returns {Object} result - result
 */
exports.refund = function (orderNo, amount, action) {
    return refund(orderNo, amount, action);
};
