'use strict';

var server = require('server');
var OrderMgr = require('dw/order/OrderMgr');

var base = module.superModule;


/**
 * authorizes the payment processor
 * @returns {Object} - errors
 */
base.Authorize = function (orderNumber, paymentInstrument){

    var order = OrderMgr.getOrder(orderNumber);
    var paymentStatusUpdated = require('*/cartridge/scripts/checkout/updatePaymentStatus').handlePaymentStatus(order);
    if (paymentStatusUpdated.authorized) {
        return { authorized: true };
    }else {
        return {
            orderErrorMessage: paymentStatusUpdated.AfterpayOrderErrorMessage,
            error: true
        };
    }
}

exports.Authorize = base.Authorize;
