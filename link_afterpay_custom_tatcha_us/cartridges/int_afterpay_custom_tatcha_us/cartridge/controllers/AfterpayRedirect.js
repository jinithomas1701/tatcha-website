'use strict';

var server = require('server');
server.extend(module.superModule);

var BasketMgr = require('dw/order/BasketMgr');
var URLUtils = require('dw/web/URLUtils');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');

/** saves afterpay payment method in payment instrument */
server.prepend('IsAfterpay',
    server.middleware.https,
    function (req, res, next) {
        //removing other PIs
        var currentBasket = BasketMgr.getCurrentBasket();
        removeAfterPayPI(currentBasket);
        next();
});

/**
 * processes the response returned by afterpay once the payment is done
 */
server.replace('HandleResponse', server.middleware.https, function (req, res, next) {
    var Order = require('dw/order/Order');
    var productExists;
    var orderPlacementStatus;
    var paymentStatusUpdated;
    var paymentStatus = req.querystring.status;
    var currentBasket = BasketMgr.getCurrentBasket();
    switch (paymentStatus) {
        case 'SUCCESS':
            productExists = require('*/cartridge/scripts/checkout/afterpayTokenConflict').checkTokenConflict(currentBasket, req.querystring.orderToken);
            require('*/cartridge/scripts/checkout/afterpayUpdatePreapprovalStatus').getPreApprovalResult(currentBasket, req.querystring);
            if (!productExists || productExists.error) {
                res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'afterpayErrorMessage', Resource.msg('apierror.token.conflict', 'afterpay', null)));
            } else {
                if(session.privacy.afterpaytoken){
                    delete session.privacy.afterpaytoken;
                }
                session.privacy.afterpaytoken = req.querystring.orderToken;
                res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'placeOrder'));
            }
            break;
        case 'CANCELLED':
            removeAfterPayPI(currentBasket);
            res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'afterpayErrorMessage', Resource.msg('afterpay.api.cancelled', 'afterpay', null)));
            break;
        default:
            res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'afterpayErrorMessage', Resource.msg('apierror.flow.default', 'afterpay', null)));
    }
    next();
});

/**
 * @description method to remove other PIs from basket
 * @param basket
 */
function removeAfterPayPI(basket){
    Transaction.wrap(function () {
        var paymentInstruments = basket.getPaymentInstruments();
        var iterator = paymentInstruments.iterator();
        var instument = null;
        while (iterator.hasNext()) {
            instument = iterator.next();
            if(instument) {
                basket.removePaymentInstrument(instument);
            }
        }
    });
}


module.exports = server.exports();