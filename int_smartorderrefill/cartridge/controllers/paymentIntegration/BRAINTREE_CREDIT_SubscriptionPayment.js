'use strict';

/**
 * Call the API to Authorize CC using details entered by shopper.
 */
function Authorize(args) {
    try {    
    	var paymentProcesser = require('int_braintree_custom_tatcha_us/cartridge/scripts/hooks/payment/processor/braintreeCredit');
    	return paymentProcesser.Authorize(args.OrderNo, args.PaymentInstrument);
    } catch(error) {
    	return false;
   }
}

/**
 * @description retrive stored credit card inforamtion
 * @param {dw.order.PaymentInstrument} paymentInstrument payment instrument of order
 * @param {string} customerID id of subscription customer
 * @param {string} subscriptionToken subscription token
 * @returns {Object} credit card inforamtion
 */
function getCCData(paymentInstrument, customerID, subscriptionToken) {
    var CustomerMgr = require("dw/customer/CustomerMgr");
    var PaymentInstrument = require("dw/order/PaymentInstrument");
    var ret = {
        expDate: null,
        expMonth: null,
        expYear: null,
        number: null,
        type: null,
        token: null
    };
    var customer = CustomerMgr.getCustomerByCustomerNumber(customerID);
    var savedPymentInstruments = customer.profile.wallet.getPaymentInstruments(PaymentInstrument.METHOD_CREDIT_CARD);

    if (!empty(subscriptionToken)) {
        for (var savedPymentInstrumentsIndex in savedPymentInstruments) {
            var savedPymentInstrument = savedPymentInstruments[savedPymentInstrumentsIndex];
            if (!empty(savedPymentInstrument.custom.braintreePaymentMethodToken) && savedPymentInstrument.custom.braintreePaymentMethodToken === subscriptionToken) {
                if (!empty(savedPymentInstrument.creditCardExpirationMonth) && !empty(savedPymentInstrument.creditCardExpirationYear)) {
                    ret.expMonth = parseInt(savedPymentInstrument.creditCardExpirationMonth, 10);
                    ret.expYear = parseInt(savedPymentInstrument.creditCardExpirationYear, 10);
                    ret.expDate = new Date(ret.expYear, ret.expMonth - 1, 1);
                }
                if (!empty(savedPymentInstrument.creditCardNumberLastDigits)) {
                    ret.number = "************" + savedPymentInstrument.creditCardNumberLastDigits;
                }
                if (!empty(savedPymentInstrument.creditCardType)) {
                    ret.type = savedPymentInstrument.creditCardType;
                }
                if (!empty(savedPymentInstrument.creditCardToken)) {
                    ret.token = savedPymentInstrument.creditCardToken;
                }
                break;
            }
        }
    }

    if (!empty(paymentInstrument)) {
        var creditCardExpirationMonth = paymentInstrument.creditCardExpirationMonth;
        var creditCardExpirationYear = paymentInstrument.creditCardExpirationYear;
        var creditCardNumberLastDigits = paymentInstrument.creditCardNumberLastDigits;
        var creditCardType = paymentInstrument.creditCardType;
        creditCardType = creditCardType.replace(/\s/g, "");
        creditCardType = creditCardType.toLowerCase();
        var foundInstruments = [];
        if (!empty(creditCardExpirationMonth)
            && !empty(creditCardExpirationYear)
            && !empty(creditCardNumberLastDigits)
            && !empty(creditCardType)
        ) {
            for (var savedPymentInstrumentsIndex2 in savedPymentInstruments) {
                var savedPymentInstrument2 = savedPymentInstruments[savedPymentInstrumentsIndex2];
                var savedCreditCardType = savedPymentInstrument2.creditCardType;
                if (!empty(savedCreditCardType)) {
                    savedCreditCardType = savedCreditCardType.replace(/\s/g, "");
                    savedCreditCardType = savedCreditCardType.toLowerCase();
                }
                if (savedPymentInstrument2.creditCardExpirationMonth === creditCardExpirationMonth
                    && savedPymentInstrument2.creditCardExpirationYear === creditCardExpirationYear
                    && savedPymentInstrument2.creditCardNumberLastDigits === creditCardNumberLastDigits
                    && savedCreditCardType === creditCardType
                ) {
                    foundInstruments.push(savedPymentInstrument2);
                }
            }
            for (var foundInstrumentsIndex in foundInstruments) {
                var foundInstrument = foundInstruments[foundInstrumentsIndex];
                if (!empty(foundInstrument.creditCardExpirationMonth) && !empty(foundInstrument.creditCardExpirationYear)) {
                    ret.expMonth = parseInt(foundInstrument.creditCardExpirationMonth, 10);
                    ret.expYear = parseInt(foundInstrument.creditCardExpirationYear, 10);
                    ret.expDate = new Date(ret.expYear, ret.expMonth - 1, 1);
                }
                if (!empty(foundInstrument.creditCardNumberLastDigits)) {
                    ret.number = "************" + foundInstrument.creditCardNumberLastDigits;
                }
                if (!empty(foundInstrument.creditCardType)) {
                    ret.type = foundInstrument.creditCardType;
                }
                if (!empty(foundInstrument.creditCardToken)) {
                    ret.token = foundInstrument.creditCardToken;
                } else {
                    var Transaction = require("dw/system/Transaction");
                    var UUIDUtils = require("dw/util/UUIDUtils");
                    Transaction.wrap(function () { // NOSONAR
                        foundInstrument.setCreditCardToken(UUIDUtils.createUUID());
                    });

                    ret.token = foundInstrument.creditCardToken;
                }
                break;
            }
        }
    }
    return ret;
}

/**
 * @description retrive subscription credit card information
 * @param {Object} args parameters
 * @returns {Object} credit card information
 */
function getCreditCardInformation(args) {
    var creditCardInfo = null;
    var serviceResponse;
    if (!empty(args.customerSubscription) && !empty(args.customerSubscription.creditCardToken) && args.customerSubscription.creditCardToken !== args.customerSubscription.STATUS_PENDING) {
        serviceResponse = getCCData(null, args.customerSubscription.customerNo, args.customerSubscription.creditCardToken);
    } else if (!empty(args.paymentInstrument) && !empty(args.customerNo)) {
        serviceResponse = getCCData(args.paymentInstrument, args.customerNo);
    }

    if (!empty(serviceResponse)) {
        if (!empty(serviceResponse.expMonth) &&
            !empty(serviceResponse.expYear) &&
            !empty(serviceResponse.type) &&
            !empty(serviceResponse.number)
        ) {
            creditCardInfo = serviceResponse;
            if (typeof creditCardInfo.expMonth !== "string") {
                creditCardInfo.expMonth = creditCardInfo.expMonth.toFixed(0);
            }
            if (typeof creditCardInfo.expYear !== "string") {
                creditCardInfo.expYear = creditCardInfo.expYear.toFixed(0);
            }
            creditCardInfo.procesor = args.paymentProcessorID;
        }
    }
    return creditCardInfo;
}

exports.authorize = Authorize;
exports.getCreditCardInformation = getCreditCardInformation;
