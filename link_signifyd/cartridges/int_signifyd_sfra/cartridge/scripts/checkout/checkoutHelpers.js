'use strict';

var base = module.superModule || {};

/**
 * Attempts to place the order
 * @param {dw.order.Order} order - The order object to be placed
 * @param {Object} fraudDetectionStatus - an Object returned by the fraud detection hook
 * @returns {Object} an error object
 */
 function placeOrder(order, fraudDetectionStatus) {
    var Transaction = require('dw/system/Transaction');
    var OrderMgr = require('dw/order/OrderMgr');
    var Status = require('dw/system/Status');
    var Order = require('dw/order/Order');
    var result = { error: false };

    try {
        Transaction.begin();
        var placeOrderStatus = OrderMgr.placeOrder(order);
        if (placeOrderStatus === Status.ERROR) {
            throw new Error();
        }

        if (fraudDetectionStatus.status === 'flag') {
            order.setConfirmationStatus(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
        } else {
            order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
        }


        /* Signifyd Modification Start */
        var signifyEnabled = dw.system.Site.getCurrent().getCustomPreferenceValue('SignifydEnableCartridge');
        var signifydHoldOrderEnable = dw.system.Site.getCurrent().getCustomPreferenceValue('SignifydHoldOrderEnable');

        if (signifyEnabled) {
            if (signifydHoldOrderEnable === true) {
                order.setExportStatus(Order.EXPORT_STATUS_NOTEXPORTED);
            } else {
                order.setExportStatus(Order.EXPORT_STATUS_READY);
            }
        } else {
            order.setExportStatus(Order.EXPORT_STATUS_READY);
        }
         /* Signifyd Modification End */

        Transaction.commit();
    } catch (e) {
        Transaction.wrap(function () { OrderMgr.failOrder(order); });
        result.error = true;
    }

    return result;
}

base.placeOrder = placeOrder;

module.exports = base;
