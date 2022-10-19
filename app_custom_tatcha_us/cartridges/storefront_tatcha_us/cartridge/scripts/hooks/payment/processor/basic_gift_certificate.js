'use strict';

/* API Includes */
var GiftCertificateMgr = require('dw/order/GiftCertificateMgr');
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');
var Resource = require('dw/web/Resource');
var Logger = require('dw/system/Logger');

/**
 * Authorizes a payment using a gift certificate. The payment is authorized by redeeming the gift certificate and
 * simply setting the order no as transaction ID.
 */
function Authorize(orderNumber, paymentInstrument, paymentProcessor) {
    var serverErrors = [];
    var fieldErrors = {};
    var error = false;
    var status;

    try {
        Transaction.wrap(function () {
            paymentInstrument.paymentTransaction.setTransactionID(orderNumber);
            paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
            status = GiftCertificateMgr.redeemGiftCertificate(paymentInstrument);
        });
        if (status.isError()) {
            error = true;
        }
    } catch (e) {
        Logger.error('Error in gift certificate authorization (basic_gift_certificate.js) : {0}', e);
        error = true;
        serverErrors.push(
            Resource.msg('error.technical', 'checkout', null)
        );
    }
    return { fieldErrors: fieldErrors, serverErrors: serverErrors, error: error };
}

exports.Authorize = Authorize;
