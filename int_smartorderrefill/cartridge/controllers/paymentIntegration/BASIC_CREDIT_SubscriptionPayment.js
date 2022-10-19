/* eslint-disable no-loop-func */
/* eslint-disable guard-for-in, no-restricted-syntax, no-unused-vars, no-param-reassign */

"use strict";

/**
 * Call the  BasicCredit API to Authorize CC using details entered by shopper.
 */
/* global empty */


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
            if (!empty(savedPymentInstrument.creditCardToken) && savedPymentInstrument.creditCardToken === subscriptionToken) {
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
 * @description Credit card authorization
 * @param {Object} args parameters
 * @returns {Object} success status
 */
function authorize(args) {
    return {
        authorized: true,
        error: false
    };
}
/**
 * @description verify that order paymetn was approved
 * @param {dw.order.Order} initialOrder SFCC initail order object
 * @returns {boolean} success status
 */
function checkInitialPaymentApproval(initialOrder) {
    return true;
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

/**
 * @description update order payment instrument with ransaction inforamtion
 * @param {dw.order.PaymentInstrument} paymentInstrument payment instrument of order
 * @param {dw.order.Order} order SFCC order
 */
function updatePaymentInstrument(paymentInstrument, order) {
    var PaymentMgr = require("dw/order/PaymentMgr");
    var orderNo = order.orderNo;
    var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod()).getPaymentProcessor();
    paymentInstrument.paymentTransaction.transactionID = orderNo;
    paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
}

/**
 * @description Update a Card Account Number.
 * @param {dw.web.Form} creditCardForm SmartOrderRefill credit card update form
 * @param {RefillSubscription} customerSubscription SmartOrderRefill subscription
 * @returns {string} subscription token
 */
function updateCard(creditCardForm, customerSubscription) {
    var customerNo = customerSubscription.customerNo;
    var subscriptionToken = customerSubscription.creditCardToken;
    var CustomerMgr = require("dw/customer/CustomerMgr");
    var Transaction = require("dw/system/Transaction");
    var UUIDUtils = require("dw/util/UUIDUtils");
    var PaymentInstrument = require("dw/order/PaymentInstrument");
    var customer = CustomerMgr.getCustomerByCustomerNumber(customerNo);
    var savedPymentInstruments = customer.profile.wallet.getPaymentInstruments(PaymentInstrument.METHOD_CREDIT_CARD);
    var newToken = UUIDUtils.createUUID();
    for (var savedPymentInstrumentsIndex in savedPymentInstruments) {
        var savedPymentInstrument = savedPymentInstruments[savedPymentInstrumentsIndex];
        if (!empty(savedPymentInstrument.creditCardToken) && savedPymentInstrument.creditCardToken === subscriptionToken) {
            Transaction.wrap(function () { // NOSONAR
                var newPaymentInstrument = customer.profile.wallet.createPaymentInstrument(PaymentInstrument.METHOD_CREDIT_CARD);

                if (typeof creditCardForm.expiration !== "undefined") {
                    newPaymentInstrument.setCreditCardExpirationYear(parseInt(creditCardForm.expiration.year.value, 10));
                    newPaymentInstrument.setCreditCardExpirationMonth(parseInt(creditCardForm.expiration.month.value, 10));
                }
                if (!empty(creditCardForm.number.value)) {
                    newPaymentInstrument.setCreditCardNumber(creditCardForm.number.value);
                }
                if (!empty(creditCardForm.type.value)) {
                    newPaymentInstrument.setCreditCardType(creditCardForm.type.value);
                }
                newPaymentInstrument.setCreditCardToken(newToken);
                customer.profile.wallet.removePaymentInstrument(savedPymentInstrument);
            });
            break;
        }
    }
    return newToken;
}

exports.authorize = authorize;
exports.checkInitialPaymentApproval = checkInitialPaymentApproval;
exports.getCreditCardInformation = getCreditCardInformation;
exports.updatePaymentInstrument = updatePaymentInstrument;
exports.updateCard = updateCard;
