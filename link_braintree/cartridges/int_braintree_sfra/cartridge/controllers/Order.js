'use strict';

var page = module.superModule;
var server = require('server');

var {
    getActiveLocalPaymentMethod,
    getGooglepayCardDescriprionFromOrder
} = require('~/cartridge/scripts/braintree/helpers/paymentHelper');

server.extend(page);

server.append('Confirm', function (req, res, next) {
    var OrderMgr = require('dw/order/OrderMgr');
    var orderID = req.querystring.ID;
    var orderToken = req.querystring.token;

    // FIXING oob braintree code SFRA

    if(!orderID){
        orderID = req.form.orderID;
    }
    if(!orderToken){
        orderToken = req.form.orderToken;
    }

    var order = OrderMgr.getOrder(orderID, orderToken);
    if (order) {
        res.setViewData({
            braintree: {
                summaryEmail: null,
                currency: order.getCurrencyCode(),
                lpmActivePaymentMethod: getActiveLocalPaymentMethod(order),
                googlepayCardDescription: getGooglepayCardDescriprionFromOrder(order)
            }
        });
    }
    next();
});

server.append('Details', function (req, res, next) {
    res.setViewData({
        braintree: {
            summaryEmail: null
        }
    });
    next();
});

module.exports = server.exports();
