'use strict';

/* API Includes */
var GiftCertificateMgr = require('dw/order/GiftCertificateMgr');
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');

/**
 * Authorizes a payment using a gift certificate. The payment is authorized by redeeming the gift certificate and
 * simply setting the order no as transaction ID.
 */
function Authorize(args) {
    var orderNo = args.OrderNo;
    var paymentInstrument = args.PaymentInstrument;
    var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod()).getPaymentProcessor();
    
    var CustomerMgr = require('dw/customer/CustomerMgr');
    //Check user exists or not
    if(args && args.Order){
   	var cartEmail = args.Order.getCustomerEmail();
   	if(cartEmail) {
   		var existingCustomer = CustomerMgr.getCustomerByLogin(cartEmail);
   		if(existingCustomer) {
   			session.custom.userExist = true;
   		}
   	  }
    }

    Transaction.begin();

    paymentInstrument.paymentTransaction.transactionID = orderNo;
    paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;

    var status = GiftCertificateMgr.redeemGiftCertificate(paymentInstrument);

    Transaction.commit();

    if (status.isError()) {
        return {error: true};
    } else {
        return {authorized: true};
    }
}

/*
 * Module exports
 */

/*
 * Local methods
 */
exports.Authorize = Authorize;
