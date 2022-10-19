/* eslint-disable consistent-return,  new-cap, no-param-reassign, no-restricted-syntax,  no-array-constructor  */
"use strict";

/**
 * Call the  CyberSource API to Authorize CC using details entered by shopper.
 */
/* global webreferences, session, empty */

var libCybersource = require("int_cybersource/cartridge/scripts/cybersource/libCybersource");
var CommonHelper = require("int_cybersource/cartridge/scripts/helper/CommonHelper");
var csReference = webreferences.CyberSourceTransaction;
var CybersourceHelper = libCybersource.getCybersourceHelper();
var OrderMgr = require("dw/order/OrderMgr");
var SORLogger = require("dw/system/Logger").getLogger("SORLogger", "SORLogger");
var Site = require("dw/system/Site");
var StringUtils = require("dw/util/StringUtils");


// Helper Functions
/**
 * @description Add Card Info
 * @param {RequestMessage} serviceRequest service request
 * @param {dw.web.Form} creditCardForm SmartOrderRefill credit card update form
 * @returns {RequestMessage} updated request message
 */
function addCardInfo(serviceRequest, creditCardForm) {
    serviceRequest.card = new csReference.Card();
    if (typeof creditCardForm.expiration !== "undefined") {
        serviceRequest.card.expirationMonth = StringUtils.formatNumber(creditCardForm.expiration.month.htmlValue, "00");
        serviceRequest.card.expirationYear = creditCardForm.expiration.year.value;
    } else {
        serviceRequest.card.expirationMonth = StringUtils.formatNumber(creditCardForm.month.htmlValue, "00");
        serviceRequest.card.expirationYear = creditCardForm.year.value;
    }

    if (creditCardForm.number.value.indexOf("X") === -1) {
        serviceRequest.card.accountNumber = creditCardForm.number.value;
    }

    switch (creditCardForm.type.htmlValue) {
        case "Visa":
            serviceRequest.card.cardType = "001";
            break;
        case "Master Card":
        case "MasterCard":
            serviceRequest.card.cardType = "002";
            break;
        case "Amex":
            serviceRequest.card.cardType = "003";
            break;
        case "Discover":
            serviceRequest.card.cardType = "004";
            break;
        case "Maestro":
            serviceRequest.card.cardType = "042";
            break;
        default:
            break;
    }
    return serviceRequest;
}

/**
 * @description  Set Card Info
 * @param {dw.order.Order} order order object
 * @returns {Object} card info
 */
function setCard(order) {
    var card = new csReference.Card();

    card.expirationMonth = StringUtils.formatNumber(order.paymentInstruments[0].creditCardExpirationMonth, "00");
    card.expirationYear = order.paymentInstruments[0].creditCardExpirationYear;

    return card;
}

/**
 * @description Set Bill To
 * @param {dw.order.Order} order order object
 * @returns {Object} billing address
 */
function setBillTo(order) {
    var billTo = new csReference.BillTo();
    var names = order.customerName.split(" ");

    billTo.firstName = names[0];
    billTo.lastName = (names.length > 1) ? names[1] : "";
    billTo.email = order.customerEmail;
    billTo.phoneNumber = order.billingAddress.phone;
    billTo.street1 = order.billingAddress.address1;
    billTo.city = order.billingAddress.city;
    billTo.state = order.billingAddress.stateCode;
    billTo.country = order.billingAddress.countryCode;
    billTo.postalCode = order.billingAddress.postalCode;

    return billTo;
}

/**
 * @description Set Client Data
 * @param {RequestMessage} serviceRequest service request
 * @param {string} refCode original orderNo
 * @param {string} fingerprint session id
 */
function setClientData(serviceRequest, refCode, fingerprint) {
    serviceRequest.merchantReferenceCode = refCode;
    serviceRequest.partnerSolutionID = CybersourceHelper.getPartnerSolutionID();

    var developerID = CybersourceHelper.getDeveloperID();

    if (!empty(developerID)) {
        serviceRequest.developerID = developerID;
    }

    serviceRequest.clientLibrary = "Salesforce Commerce Cloud";
    serviceRequest.clientLibraryVersion = "17.2.0";
    serviceRequest.clientEnvironment = "Linux";

    if (fingerprint) {
        serviceRequest.deviceFingerprintID = fingerprint;
    }
}

/**
 * @description Add On Demand payment service to request.
 * @param {string} subscriptionID subscription code
 * @param {RequestMessage} serviceRequest service request
 * @param {PurchaseTotals} purchase purches information
 * @param {string} refCode original orderNo
 * @param {dw.util.ArrayList} itemsCybersource items
 */
function addOnDemandSubscriptionInfo(subscriptionID, serviceRequest, purchase, refCode, itemsCybersource) {
    serviceRequest.merchantID = CybersourceHelper.getMerchantID();
    var fingerprint = null;

    if (CybersourceHelper.getDigitalFingerprintEnabled()) {
        fingerprint = session.sessionID;
    }

    setClientData(serviceRequest, refCode, fingerprint);

    var requestPurchaseTotals = new csReference.PurchaseTotals();
    var purchaseValue;
    for (var purchaseName in purchase) {
        if (purchaseName.indexOf("set") === -1 && purchaseName.indexOf("get") === -1) {
            purchaseValue = purchase[purchaseName];
            if (purchaseValue !== "") {
                requestPurchaseTotals[purchaseName] = purchaseValue;
            }
        }
    }

    serviceRequest.purchaseTotals = requestPurchaseTotals;

    var requestRecurringSubscriptionInfo = new csReference.RecurringSubscriptionInfo();
    requestRecurringSubscriptionInfo.subscriptionID = subscriptionID;
    serviceRequest.recurringSubscriptionInfo = requestRecurringSubscriptionInfo;

    var items = new Array();
    if (itemsCybersource != null) {
        var iter = itemsCybersource.iterator();
        while (iter.hasNext()) {
            var item = iter.next();
            var requestItem = new csReference.Item();
            var value;
            for (var itemName in item) {
                if (itemName.indexOf("set") === -1 && itemName.indexOf("get") === -1) {
                    value = item[itemName];
                    if (value !== "") {
                        requestItem[itemName] = value;
                    }
                }
            }
            items.push(requestItem);
        }
    }

    serviceRequest.item = items;

    serviceRequest.ccAuthService = new csReference.CCAuthService();
    serviceRequest.ccAuthService.run = true;
}

/**
 * @description service configuration handler
 * @returns {dw.svc.Service} service configuration
 */
function CreateService() {
    var SOAPUtil = require("dw/rpc/SOAPUtil");
    var HashMap = require("dw/util/HashMap");

    return require("dw/svc/LocalServiceRegistry").createService("cybersource.soap.transactionprocessor.generic", {
        initServiceClient: function (svcArg) {
            var svc = svcArg;
            svc.serviceClient = csReference.getDefaultService();
            return svc.serviceClient;
        },
        execute: function (svc, parameter) {
            var userName = svc.getConfiguration().getCredential().getUser();
            var password = Site.getCurrent().getCustomPreferenceValue("CsSecurityKey");
            var secretsMap = new HashMap();
            var requestCfg = new HashMap();
            var responseCfg = new HashMap();

            secretsMap.put(userName, password);

            requestCfg.put(SOAPUtil.WS_ACTION, SOAPUtil.WS_USERNAME_TOKEN);
            requestCfg.put(SOAPUtil.WS_USER, userName);
            requestCfg.put(SOAPUtil.WS_PASSWORD_TYPE, SOAPUtil.WS_PW_TEXT);
            requestCfg.put(SOAPUtil.WS_SECRETS_MAP, secretsMap);

            responseCfg.put(SOAPUtil.WS_ACTION, SOAPUtil.WS_TIMESTAMP);

            SOAPUtil.setWSSecurityConfig(svc.serviceClient, requestCfg, responseCfg);

            return svc.serviceClient.runTransaction(parameter);
        },
        parseResponse: function (service, response) {
            return response;
        }
    });
}

/**
 * @description Credit card authorization
 * @param {Object} args parameters
 * @returns {Object} success status
 */
function authorize(args) {
    var serviceRequest = new csReference.RequestMessage();
    var currencyCode = args.Order.currencyCode;
    var totalPrice = args.Order.getTotalGrossPrice().getValue();
    var orderNo = args.Order.orderNo;
    var subscriptionID = args.SubscriptionID;
    var purchaseTotal = CommonHelper.CreateCyberSourcePurchaseTotalsObject_UserData(currencyCode, totalPrice).purchaseTotals;
    var items = CommonHelper.CreateCybersourceItemObject(args.Basket).items;

    addOnDemandSubscriptionInfo(subscriptionID, serviceRequest, purchaseTotal, orderNo, items);

    var originalOrder = OrderMgr.getOrder(args.OriginalOrder);

    serviceRequest.billTo = setBillTo(originalOrder);
    serviceRequest.card = setCard(originalOrder);

    var serviceResponse = null;
    // send request
    try {
        var service = CreateService();
        serviceResponse = service.call(serviceRequest);
    } catch (e) {
        return {
            error: true,
            errorMsg: e.message
        };
    }

    if (serviceResponse && serviceResponse.status === "OK" && serviceResponse.object && serviceResponse.object.decision === "ACCEPT") {
        SORLogger.info("CyberSource response: {0}", JSON.stringify({
            success: true,
            transactionID: serviceResponse.object.requestID,
            amount: serviceResponse.object.ccAuthReply.amount,
            authorizationCode: serviceResponse.object.ccAuthReply.authorizationCode,
            reasonCode: serviceResponse.object.reasonCode
        }));

        return {
            success: true,
            transactionID: serviceResponse.object.requestID,
            requestToken: serviceResponse.object.requestToken,
            amount: serviceResponse.object.ccAuthReply.amount,
            authorizationCode: serviceResponse.object.ccAuthReply.authorizationCode,
            reasonCode: serviceResponse.object.reasonCode
        };
    }
    return { error: true };
}

/**
 * @description Charge a Cancelation Fee
 * @param {RefillOrder} subsList RefillOrder object
 * @param {number} cancelationFee amount to charge
 * @returns {Object} response information
 */
function chargeFee(subsList, cancelationFee) {
    var serviceRequest = new csReference.RequestMessage();
    var ArrayList = require("dw/util/ArrayList");
    var Resource = require("dw/web/Resource");
    var PurchaseTotals = require("int_cybersource/cartridge/scripts/cybersource/Cybersource_PurchaseTotals_Object");
    var purchaseTotal = new PurchaseTotals();
    var CybersourceItemObject = require("int_cybersource/cartridge/scripts/cybersource/Cybersource_Item_Object");
    var itemObject = new CybersourceItemObject();
    var items = new ArrayList();
    var feeValue = StringUtils.formatNumber(cancelationFee, "000000.00", "en_US");
    var originalOrder = OrderMgr.getOrder(subsList.originalOrder);

    serviceRequest.billTo = setBillTo(originalOrder);
    serviceRequest.card = setCard(originalOrder);

    purchaseTotal.setCurrency(Site.getCurrent().getDefaultCurrency());
    purchaseTotal.setGrandTotalAmount(feeValue);

    itemObject.setId(1);
    itemObject.setUnitPrice(feeValue);
    itemObject.setQuantity(1);
    itemObject.setProductCode(Resource.msg("account.addressbook.addressinclude.default", "account", null));
    itemObject.setProductSKU(Resource.msg("smartorderrefill.subscription.cancelationfee", "smartorderrefill", null));
    itemObject.setProductName(Resource.msg("smartorderrefill.subscription.cancelationfee", "smartorderrefill", null));
    items.add(itemObject);

    addOnDemandSubscriptionInfo(subsList.creditCardToken, serviceRequest, purchaseTotal, subsList.originalOrder, items);

    var service = CreateService();
    var serviceResponse = service.call(serviceRequest);

    if (serviceResponse && serviceResponse.status === "OK" && serviceResponse.object && serviceResponse.object.decision === "ACCEPT") {
        return {
            success: true,
            transactionID: serviceResponse.object.requestID,
            requestToken: serviceResponse.object.requestToken,
            amount: serviceResponse.object.ccAuthReply.amount,
            authorizationCode: serviceResponse.object.ccAuthReply.authorizationCode,
            reasonCode: serviceResponse.object.reasonCode
        };
    }
}

/**
 * @description verify that order paymetn was approved
 * @param {dw.order.Order} initialOrder SFCC initail order object
 * @returns {boolean} success status
 */
function checkInitialPaymentApproval(initialOrder) {
    var decision = initialOrder.paymentTransaction.custom.decision;
    if (decision === "ACCEPT") {
        return true;
    }
    return false;
}

/**
 * @description retrive subscription credit card information
 * @param {Object} args parameters
 * @returns {Object} credit card information
 */
function getCreditCardInformation(args) {
    var creditCardInfo = null;
    var serviceRequest = new csReference.RequestMessage();
    if (!empty(args.customerSubscription)) {
        CybersourceHelper.addPaySubscriptionRetrieveService(serviceRequest, args.customerSubscription.originalOrder, args.customerSubscription.creditCardToken);
        var service = CreateService();
        var serviceResponse = service.call(serviceRequest);

        if (serviceResponse && serviceResponse.status === "OK" && serviceResponse.object && serviceResponse.object.decision === "ACCEPT") {
            var CardHelper = require("int_cybersource/cartridge/scripts/helper/CardHelper");
            var cardType = CardHelper.getCardType(serviceResponse.object.paySubscriptionRetrieveReply.cardType);

            creditCardInfo = {
                number: serviceResponse.object.paySubscriptionRetrieveReply.cardAccountNumber,
                expMonth: serviceResponse.object.paySubscriptionRetrieveReply.cardExpirationMonth,
                expYear: serviceResponse.object.paySubscriptionRetrieveReply.cardExpirationYear,
                type: cardType
            };
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
 */
function updatePaymentInstrument(paymentInstrument, serviceResponse) {
    paymentInstrument.paymentTransaction.transactionID = serviceResponse.transactionID;
    paymentInstrument.paymentTransaction.custom.requestId = serviceResponse.transactionID;
    paymentInstrument.paymentTransaction.custom.requestToken = serviceResponse.requestToken;
    paymentInstrument.paymentTransaction.custom.authAmount = serviceResponse.amount;
    paymentInstrument.paymentTransaction.custom.authCode = serviceResponse.authorizationCode;
    paymentInstrument.paymentTransaction.custom.approvalStatus = serviceResponse.reasonCode;
}

/**
 * @description Update a Card Account Number.
 * @param {dw.web.Form} creditCardForm SmartOrderRefill credit card update form
 * @param {RefillSubscription} customerSubscription SmartOrderRefill subscription
 * @returns {string} subscription token
 */
function updateCard(creditCardForm, customerSubscription) {
    var orderNo = customerSubscription.originalOrder;
    var subscriptionID = customerSubscription.creditCardToken;
    var serviceRequest = new csReference.RequestMessage();
    serviceRequest.merchantID = CybersourceHelper.getMerchantID();

    setClientData(serviceRequest, orderNo);

    var order = OrderMgr.getOrder(orderNo);

    serviceRequest.billTo = setBillTo(order);

    if (creditCardForm != null) {
        addCardInfo(serviceRequest, creditCardForm);
    }
    var requestRecurringSubscriptionInfo = new csReference.RecurringSubscriptionInfo();
    requestRecurringSubscriptionInfo.subscriptionID = subscriptionID;
    serviceRequest.recurringSubscriptionInfo = requestRecurringSubscriptionInfo;

    serviceRequest.paySubscriptionUpdateService = new csReference.PaySubscriptionUpdateService();
    serviceRequest.paySubscriptionUpdateService.run = true;
    var service = CreateService();
    var serviceResponse = service.call(serviceRequest);

    if (serviceResponse && serviceResponse.status === "OK" && serviceResponse.object && serviceResponse.object.decision === "ACCEPT") {
        subscriptionID = (serviceResponse.object.paySubscriptionUpdateReply.subscriptionIDNew) ? serviceResponse.object.paySubscriptionUpdateReply.subscriptionIDNew : serviceResponse.object.paySubscriptionUpdateReply.subscriptionID;
    }
    return subscriptionID;
}

exports.authorize = authorize;
exports.chargeFee = chargeFee;
exports.checkInitialPaymentApproval = checkInitialPaymentApproval;
exports.getCreditCardInformation = getCreditCardInformation;
exports.updatePaymentInstrument = updatePaymentInstrument;
exports.updateCard = updateCard;
