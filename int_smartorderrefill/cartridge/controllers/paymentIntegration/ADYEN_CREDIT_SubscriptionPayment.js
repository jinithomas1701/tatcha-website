
/* eslint-disable no-param-reassign, no-restricted-syntax, guard-for-in */
"use strict";

/* Call the  ADYEN_CREDIT API to Authorize CC using details entered by shopper */

/* global empty*/

var AdyenHelper = require("int_adyen_overlay/cartridge/scripts/util/AdyenHelper");
var RefillSubscription = require("*/cartridge/models/smartOrderRefill/refillSubscription");
var Transaction = require("dw/system/Transaction");
var Site = require("dw/system/Site");
var Logger = require("dw/system/Logger");
var SORLogger = Logger.getLogger("SORLogger", "SORLogger");
var AdyenLogger = Logger.getLogger("Adyen");

/**
 * @description service call execution
 * @param {string} serviceType service name
 * @param {Object} requestObject request object
 * @returns {Object} service response
 */
function executeCall(serviceType, requestObject) {
    var service = AdyenHelper.getService(serviceType);
    if (service == null) {
        return { error: true };
    }
    var apiKey = AdyenHelper.getAdyenApiKey();
    service.addHeader("Content-type", "application/json");
    service.addHeader("charset", "UTF-8");
    service.addHeader("X-API-KEY", apiKey);
    var callResult = service.call(JSON.stringify(requestObject));
    return callResult;
}

/**
 * @description payment service call
 * @param {Object} args card info parameters
 * @param {Object} requestObject request object
 * @returns {Object} response status
 */
function doGetCardInfoCall(args, requestObject) {
    try {
        var callResult = executeCall(AdyenHelper.SERVICE.RECURRING, requestObject);
        if (callResult.isOk() === false) {
            SORLogger.error("Adyen: Call error code" + callResult.getError().toString() + " Error => ResponseStatus: " + callResult.getStatus() + " | ResponseErrorText: " + callResult.getErrorMessage() + " | ResponseText: " + callResult.getMsg());
            return {
                error: true
            };
        }
        var resultObject = callResult.object;

        var resultText = ("text" in resultObject && !empty(resultObject.text) ? resultObject.text : null);
        if (resultText == null) {
            return { error: true };
        }
        var responseObj;
        try {
            responseObj = JSON.parse(resultText);
            if (!empty(responseObj) && !empty(responseObj.details)) {
                args.card = {};
                args.cardFound = false;
                for (var detailsIndex in responseObj.details) {
                    var cardDetails = responseObj.details[detailsIndex].RecurringDetail;
                    if (cardDetails.recurringDetailReference === args.token) {
                        args.card.expMonth = cardDetails.card.expiryMonth;
                        args.card.expYear = cardDetails.card.expiryYear;
                        args.card.number = cardDetails.card.number;
                        args.card.type = cardDetails.variant;
                        args.cardFound = true;
                        break;
                    }
                }
                return args;
            }
            return { error: true };
        } catch (ex) {
            SORLogger.error("Adyen error parsing response object " + ex.message);
            return { error: true };
        }
    } catch (error) {
        AdyenLogger.fatal("Adyen: " + error.toString() + " in " + error.fileName + ":" + error.lineNumber);
        return { error: true };
    }
}

/**
 * @description extract information from credit service call
 * @param {Object} args parametrs
 * @returns {Object} parsed credit card information
 */
function getCardInfo(args) {
    var merchantCode = Site.getCurrent().getCustomPreferenceValue("Adyen_merchantCode");
    var customerID = args.customerID;
    var expDate;
    var ccNumber;
    var expMonth;
    var expYear;
    var cctype;

    var callObject = {
        shopperReference: customerID,
        merchantAccount: merchantCode
    };
    var result = doGetCardInfoCall(args, callObject);

    if (!result.error && result.cardFound) {
        if (!empty(result.card.expMonth) && !empty(result.card.expYear)) {
            expMonth = parseInt(result.card.expMonth, 10);
            expYear = parseInt(result.card.expYear, 10);
            expDate = new Date(expYear, expMonth - 1, 1);
        }
        if (!empty(result.card.number)) {
            ccNumber = "************" + result.card.number;
        }
        if (!empty(result.card.type)) {
            cctype = AdyenHelper.getSFCCCardType(result.card.type);
        }
        var ret = {
            expDate: expDate,
            expMonth: expMonth,
            expYear: expYear,
            number: ccNumber,
            type: cctype,
            token: args.token
        };
        return { error: false, result: ret };
    }
    return { error: true };
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

    var token;
    var AdyenLog;
    if (!empty(paymentInstrument)) {
        AdyenLog = JSON.parse(paymentInstrument.getPaymentTransaction().getCustom().Adyen_log);
    }

    var ret = {
        expDate: null,
        expMonth: null,
        expYear: null,
        number: null,
        type: null,
        token: null
    };

    if (!empty(AdyenLog) && !empty(AdyenLog["additionalData.recurring.recurringDetailReference"])) {
        token = AdyenLog["additionalData.recurring.recurringDetailReference"];
    }

    if (!empty(paymentInstrument) && !empty(paymentInstrument.creditCardToken)) {
        token = paymentInstrument.creditCardToken;
    }

    if (!empty(subscriptionToken)) {
        token = subscriptionToken;
    }

    if (!empty(token)) {
        var serviceResult = getCardInfo({
            customerID: customerID,
            token: token
        });
        if (!serviceResult.error) {
            ret = serviceResult.result;
        }
    } else if (!empty(paymentInstrument)) {
        var customer = CustomerMgr.getCustomerByCustomerNumber(customerID);
        require("int_adyen_overlay/cartridge/scripts/UpdateSavedCards").updateSavedCards({ CurrentCustomer: customer });
        var savedPymentInstruments = customer.profile.wallet.getPaymentInstruments(PaymentInstrument.METHOD_CREDIT_CARD);
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
            for (var savedPymentInstrumentsIndex in savedPymentInstruments) {
                var savedPymentInstrument = savedPymentInstruments[savedPymentInstrumentsIndex];
                var savedCreditCardType = savedPymentInstrument.creditCardType;
                savedCreditCardType = savedCreditCardType.replace(/\s/g, "");
                savedCreditCardType = savedCreditCardType.toLowerCase();
                if (savedPymentInstrument.creditCardExpirationMonth === creditCardExpirationMonth
                    && savedPymentInstrument.creditCardExpirationYear === creditCardExpirationYear
                    && savedPymentInstrument.creditCardNumberLastDigits === creditCardNumberLastDigits
                    && savedCreditCardType === creditCardType
                    && !empty(savedPymentInstrument.creditCardToken)
                ) {
                    foundInstruments.push(savedPymentInstrument);
                }
            }
            for (var foundInstrumentsIndex in foundInstruments) {
                var foundInstrument = foundInstruments[foundInstrumentsIndex];
                var serviceResult2 = getCardInfo({
                    customerID: customerID,
                    token: foundInstrument.creditCardToken
                });
                if (!serviceResult2.error) {
                    ret = serviceResult2.result;
                    break;
                }
            }
        }
    }
    return ret;
}

/**
 * @description payment service call
 * @param {Object} args authorization parameters
 * @param {Object} requestObject request object
 * @returns {Object} response status
 */
function doPaymentCall(args, requestObject) {
    var Resource = require("dw/web/Resource");
    var Order = require("dw/order/Order");

    var errorMessage = "";
    try {
        var callResult = executeCall("AdyenCheckoutPayment", requestObject);
        if (callResult.isOk() === false) {
            SORLogger.error("Adyen: Call error code" + callResult.getError().toString() + " Error => ResponseStatus: " + callResult.getStatus() + " | ResponseErrorText: " + callResult.getErrorMessage() + " | ResponseText: " + callResult.getMsg());
            args.AdyenErrorMessage = Resource.msg("confirm.error.declined", "checkout", null);
            return {
                error: true,
                args: args
            };
        }
        var resultObject = callResult.object;
        var resultObj = {
            statusCode: resultObject.getStatusCode(),
            statusMessage: resultObject.getStatusMessage(),
            text: resultObject.getText(),
            errorText: resultObject.getErrorText(),
            timeout: resultObject.getTimeout()
        };

        var resultText = ("text" in resultObj && !empty(resultObj.text) ? resultObj.text : null);
        if (resultText == null) {
            return { error: true };
        }

        // build the response object
        var responseObj;
        try {
            responseObj = JSON.parse(resultText);
        } catch (ex) {
            SORLogger.error("Adyen error parsing response object " + ex.message);
            return { error: true };
        }

        // return the AVS result code
        args.AVSResultCode = (!empty(responseObj.avsResultRaw) ? responseObj.avsResultRaw : "");

        // if the card is enrolled in the 3-D Secure programme the response should contain these 4 fields
        if ("redirect" in responseObj) { args.RedirectObject = responseObj.redirect; } // issuerUrl
        args.ResultCode = responseObj.resultCode; // resultCode
        args.PspReference = ("pspReference" in responseObj && !empty(responseObj.pspReference) ? responseObj.pspReference : "");
        args.PaymentStatus = resultObj.errorText;
        args.AuthorizationAmount = args.amount.getValue().toFixed(2);
        args.AdyenAmount = requestObject.amount.value;
        args.Decision = "ERROR";

        var resultCode = args.ResultCode;
        var order = args.Order;

        if (responseObj.resultCode.indexOf("Authorised") !== -1 || (responseObj.resultCode.indexOf("RedirectShopper") !== -1)) {
            args.Decision = "ACCEPT";
            args.PaymentStatus = resultCode;
            args.PaymentData = responseObj.paymentData;
            // if 3D Secure is used, the statuses will be updated later
            if (responseObj.resultCode.indexOf("Authorised") !== -1) {
                order.setPaymentStatus(Order.PAYMENT_STATUS_PAID);
                order.setExportStatus(Order.EXPORT_STATUS_READY);
            }
            AdyenLogger.info("Payment result: Authorised");
            AdyenLogger.info("Decision: " + args.Decision);

            if (args.RedirectObject === "") { // if is not 3DSecure
                AdyenLogger.debug("Adyen: " + resultObj.statusCode + " Error => " + resultObj.statusMessage + " | " + resultObj.errorText);
            }
        } else if (responseObj.resultCode.indexOf("Received") !== -1) {
            args.Decision = "PENDING";
            args.PaymentStatus = resultCode;
            if (responseObj.additionalData["bankTransfer.owner"]) {
                var bankTransferData = [{ key: "bankTransfer.description", value: "bankTransfer.description" }];
                for (var data in responseObj.additionalData) {
                    if (data.indexOf("bankTransfer.") !== -1) {
                        bankTransferData.push({
                            key: data,
                            value: responseObj.additionalData[data]
                        });
                    }
                }
                args.PaymentInstrument.custom.adyenAdditionalPaymentData = JSON.stringify(bankTransferData);
            }

            if (responseObj.additionalData["comprafacil.entity"]) {
                var multiBancoData = [{ key: "comprafacil.description", value: "comprafacil.description" }];
                for (var data2 in responseObj.additionalData) {
                    if (data2.indexOf("comprafacil.") !== -1) {
                        multiBancoData.push({
                            key: data2,
                            value: responseObj.additionalData[data2]
                        });
                    }
                }
                args.PaymentInstrument.custom.adyenAdditionalPaymentData = JSON.stringify(multiBancoData);
            }

            order.setPaymentStatus(Order.PAYMENT_STATUS_NOTPAID);
            order.setExportStatus(Order.EXPORT_STATUS_NOTEXPORTED);
        } else {
            args.PaymentStatus = "Refused";
            args.Decision = "REFUSED";

            order.setPaymentStatus(Order.PAYMENT_STATUS_NOTPAID);
            order.setExportStatus(Order.EXPORT_STATUS_NOTEXPORTED);

            errorMessage = Resource.msg("confirm.error.declined", "checkout", null);
            if ("refusalReason" in responseObj && !empty(responseObj.refusalReason)) {
                errorMessage += " (" + responseObj.refusalReason + ")";
            }
            args.AdyenErrorMessage = errorMessage;
            AdyenLogger.info("Payment result: Refused");
        }
        return args;
    } catch (e) {
        AdyenLogger.fatal("Adyen: " + e.toString() + " in " + e.fileName + ":" + e.lineNumber);
        return { error: true };
    }
}

/**
 * @description Credit card authorization
 * @param {Object} args parameters
 * @returns {Object} success status
 */
function authorize(args) {
    var order = args.Order;
    var merchantCode = Site.getCurrent().getCustomPreferenceValue("Adyen_merchantCode");
    var amount = args.Order.getTotalGrossPrice();
    var token = "LATEST";

    args.amount = amount;

    var instrumentsIterator = order.getPaymentInstruments().iterator();

    while (instrumentsIterator.hasNext()) {
        var paymentInstrument = instrumentsIterator.next();
        if (paymentInstrument.paymentMethod.equals("CREDIT_CARD")) {
            break;
        }
    }
    var customerID = null;
    try {
        customerID = order.getCustomer().getProfile().getCustomerNo();
    } catch (e) {
        SORLogger.error("Cann't get customerID: {0}", e.toString());
        return {
            authorized: false,
            error: true
        };
    }

    Transaction.begin();
    if (!empty(args.Token) && args.Token !== RefillSubscription.STATUS_PENDING) {
        token = args.Token;
    }
    var callObject = {
        recurringProcessingModel: "Subscription ",
        shopperReference: customerID,
        merchantAccount: merchantCode,
        reference: order.orderNo,
        shopperInteraction: "ContAuth",
        recurring: {
            contract: "RECURRING"
        },
        amount: {
            value: amount.getValue() * 100,
            currency: amount.getCurrencyCode()
        },
        paymentMethod: {
            recurringDetailReference: token
        }
    };

    var result = doPaymentCall(args, callObject);

    if (result.error) {
        return {
            authorized: false,
            error: true
        };
    }

    if (result.Decision !== "ACCEPT") {
        Transaction.rollback();
        return {
            error: true,
            PlaceOrderError: ("AdyenErrorMessage" in result && !empty(result.AdyenErrorMessage) ? result.AdyenErrorMessage : "")
        };
    }

    Transaction.commit();

    return { authorized: true, error: false, result: result };
}

/**
 * @description verify that order paymetn was approved
 * @returns {boolean} success status
 */
function checkInitialPaymentApproval() {
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
 * @param {Object} serviceResponse authorization serviceresponse
 * @param {dw.order.Order} order SFCC order
 */
function updatePaymentInstrument(paymentInstrument, serviceResponse, order) {
    var result = serviceResponse.result;
    order.custom.Adyen_eventCode = "AUTHORISATION";
    if ("PspReference" in result && !empty(result.PspReference)) {
        paymentInstrument.paymentTransaction.transactionID = result.PspReference;
        order.custom.Adyen_pspReference = result.PspReference;
    }

    if ("AuthorizationCode" in result && !empty(result.AuthorizationCode)) {
        paymentInstrument.paymentTransaction.custom.authCode = result.AuthorizationCode;
    }

    if ("AdyenAmount" in result && !empty(result.AdyenAmount)) {
        order.custom.Adyen_value = result.AdyenAmount;
    }

    if ("AdyenCardType" in result && !empty(result.AdyenCardType)) {
        order.custom.Adyen_paymentMethod = result.AdyenCardType;
    }

    paymentInstrument.paymentTransaction.custom.Adyen_log = JSON.stringify(result);
    paymentInstrument.paymentTransaction.transactionID = result.PspReference;
}
/**
 * @description Update a Card Account Number.
 * @param {dw.web.Form} creditCardForm SmartOrderRefill credit card update form
 * @returns {string} subscription token
 */
function updateCard(creditCardForm) {
    return creditCardForm.token.value;
}

exports.authorize = authorize;
exports.checkInitialPaymentApproval = checkInitialPaymentApproval;
exports.getCreditCardInformation = getCreditCardInformation;
exports.updatePaymentInstrument = updatePaymentInstrument;
exports.updateCard = updateCard;

