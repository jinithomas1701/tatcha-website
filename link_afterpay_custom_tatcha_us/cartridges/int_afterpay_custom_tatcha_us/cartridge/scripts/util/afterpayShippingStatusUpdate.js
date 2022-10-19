/* API Includes */
var OrderMgr = require('dw/order/OrderMgr');
var Resource = require('dw/web/Resource');


/**
 * generate shipping update Request
 * @param {string} name - courierName
 * @param {string} tracking - trackingNumber
 * @returns {Object} data- data
 * */
function makeShippingUpdateRequest(name, tracking, paymentID) {
    var data = {
    	paymentID: paymentID,
    	name: name,
        tracking:tracking
    };

    return data;
}

/**
 * call action
 * @param {Object} request - request
 * @returns {Object} response - response
 * */
function callAction(request) {
    var shippingUtil = require('*/cartridge/scripts/util/shippingUtilities.js');
    var response;

    if (shippingUtil && !(shippingUtil.error)) {
        response = shippingUtil.sendShippingInfo(request);
    }

    return response;
}

/**
 * Shipping Update action
 * @param {string} orderNo - orderNo
 * @param {string} name - courierName
 * @param {string} tracking - trackingNumber
 * @returns {Object} status
 * */
function shippingUpdate(orderNo, name, tracking) {
	var order = OrderMgr.getOrder(orderNo);
    var status = false;
    var response;
    var request;
    var error;
    var paymentID;
    var paymentInstrument;
    var apPaymentInstrument;
    var paymentTransaction;
    var iter = order.getPaymentInstruments().iterator();

    while (iter.hasNext()) {
        apPaymentInstrument = iter.next();
        if (apPaymentInstrument.paymentMethod === 'AFTERPAY_PBI') {
            paymentInstrument = apPaymentInstrument;
        }
    }

    paymentTransaction = paymentInstrument.getPaymentTransaction();
    paymentID = paymentTransaction.custom.apPaymentID;

    request = makeShippingUpdateRequest( name, tracking, paymentID);

    dw.system.Logger.info('Shipping Update request: ' + JSON.stringify(request));

    response = callAction(request);

    dw.system.Logger.info('Shipping Update response: ' + JSON.stringify(response));

    if (response === null) {
        error = Resource.msg('transaction.unknown', 'afterpay', null);
    }
    
    if (response != null && (response && response.error === true)) {
        dw.system.Logger.info('Shipping update failed for afterpay order {0}',orderNo);
    }

    if (response != null && (response && response.token)) {
        status = true;
        dw.system.Logger.info('Shipping update successful for afterpay order {0}',orderNo);
    }

    return {
        status: status,
        error: error
    };
}

/**
 * Internal methods
 * @param {string} name - courierName
 * @param {string} tracking - trackingNumber
 * @returns {Object} result - result
 */
exports.shippingUpdate = function (orderNo, name, tracking) {
    return shippingUpdate(orderNo, name, tracking);
};
