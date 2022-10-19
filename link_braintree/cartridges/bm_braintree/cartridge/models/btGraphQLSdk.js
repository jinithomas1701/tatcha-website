var Resource = require('dw/web/Resource');

var prefs = require('~/cartridge/config/bmBraintreePreferences');
var obj = require('*/cartridge/scripts/query/queries');
var btConstants = require('*/cartridge/scripts/util/braintreeConstants');
var braintreeApiCalls = require('~/cartridge/scripts/braintree/bmBraintreeApiCalls');
var BTServiceResponseHandlerModel = require('*/cartridge/models/btServiceResponseHandler');
var btServiceResponseHandler = new BTServiceResponseHandlerModel();

/**
 * Creates graphQl request data
 * @param {string} queryName query name
 * @param {Object} requestDataObj request data
 * @return {Object} prepared request data for graphQL call
 */
function createGraphQLCallRequest(queryName, requestDataObj) {
    return obj.addVariables(queryName, requestDataObj);
}

/**
 * Return merchant id for passed currency code
 * @param {string} currencyCode currency code
 * @return {string} Merchant id
 */
function getMerchantAccountID(currencyCode) {
    var merchantAccounts = {};
    var code = currencyCode.toUpperCase();
    for (var fieldName in prefs.merchantAccountIDs) {
        var fieldArr = prefs.merchantAccountIDs[fieldName].split(':');
        merchantAccounts[fieldArr[0].toUpperCase()] = fieldArr[1];
    }

    return merchantAccounts[code].replace(/\s/g, '');
}

/**
 * Defines query name based on provided submitForSettlement value
 * @param {boolean} submitForSettlement submitForSettlement value
 * @return {boolean} query name
 */
function defineQueryName(submitForSettlement) {
    var isSubmitForSettlement = submitForSettlement === undefined ? prefs.isSettle : submitForSettlement;

    return isSubmitForSettlement ? btConstants.QUERY_NAME_SALE : btConstants.QUERY_NAME_AUTHORIZATION;
}

/**
 * Converts legacy id into graphQL id
 * @param {string} legacyId legacy id
 * @param {string} type type of legacy id
 * @return {string} converted id
 */
function legacyIdConverter(legacyId, type) {
    var requestDataObj = {
        legacyId: legacyId,
        type: type
    };

    var graphQLRequestData = createGraphQLCallRequest(btConstants.QUERY_NAME_LEGACY_ID_CONVERTER, requestDataObj);
    var btServiceRepsonse = braintreeApiCalls.call(graphQLRequestData);
    var validatedResponse = btServiceResponseHandler.validateLegacyIdConverterResponse(btServiceRepsonse);

    return validatedResponse;
}

/**
 * Validates whether data object is not empty
 * @param {Object} data data object
 * @return {Object} data object or error
 */
function validateReqData(data) {
    if (empty(Object.keys(data))) {
        throw Object.assign(
            new Error(Resource.msg('braintree.error.empty.data', 'braintreebm', null)),
            { isBusinessLogic: true }
        );
    }

    return data;
}

/**
 * BT graphQL sdk model
 */
function btGraphQLSdk() { }

/**
 * searchTransactionById action
 * @param {Object} data data object
 * @return {Object} response
 */
btGraphQLSdk.prototype.searchTransactionById = function (data) {
    var reqData = validateReqData(data);
    var requestDataObj = {
        input: {
            id: {
                in: [legacyIdConverter(reqData.transactionId, btConstants.TYPE_TRANSACTION)]
            }
        }
    };

    var graphQLRequestData = createGraphQLCallRequest(btConstants.QUERY_NAME_SEARCH, requestDataObj);
    var btServiceRepsonse = braintreeApiCalls.call(graphQLRequestData);
    var validatedResponse = btServiceResponseHandler.validateSearchTransactionByIdResponse(btServiceRepsonse);

    return validatedResponse;
};

/**
 * searchRefundTransactionById action
 * @param {Object} data data object
 * @return {Object} response
 */
btGraphQLSdk.prototype.searchRefundTransactionById = function (data) {
    var reqData = validateReqData(data);
    var requestDataObj = {
        input: {
            id: {
                in: [legacyIdConverter(reqData.transactionId, btConstants.TYPE_REFUND)]
            }
        }
    };

    var graphQLRequestData = createGraphQLCallRequest(btConstants.QUERY_NAME_SEARCH_REFUND, requestDataObj);
    var btServiceRepsonse = braintreeApiCalls.call(graphQLRequestData);
    var validatedResponse = btServiceResponseHandler.validateSearchRefundTransactionByIdResponse(btServiceRepsonse);

    return validatedResponse;
};

/**
 * voidTransaction action
 * @param {Object} data data object
 * @return {Object} response
 */
btGraphQLSdk.prototype.voidTransaction = function (data) {
    var reqData = validateReqData(data);
    var requestDataObj = {
        input: {
            transactionId: legacyIdConverter(reqData.transactionId, btConstants.TYPE_TRANSACTION)
        }
    };

    var graphQLRequestData = createGraphQLCallRequest(btConstants.QUERY_NAME_VOID, requestDataObj);
    var btServiceRepsonse = braintreeApiCalls.call(graphQLRequestData);
    var validatedResponse = btServiceResponseHandler.validateTransactionVoidResponse(btServiceRepsonse);

    return validatedResponse;
};

/**
 * refundTransaction action
 * @param {Object} data data object
 * @return {Object} response
 */
btGraphQLSdk.prototype.refundTransaction = function (data) {
    var reqData = validateReqData(data);
    var requestDataObj = {
        input: {
            transactionId: legacyIdConverter(reqData.transactionId, btConstants.TYPE_REFUND),
            refund: {
                amount: reqData.amount || reqData.leftToRefund,
                orderId: reqData.orderNo
            }
        }
    };

    var graphQLRequestData = createGraphQLCallRequest(btConstants.QUERY_NAME_REFUND, requestDataObj);
    var btServiceRepsonse = braintreeApiCalls.call(graphQLRequestData);
    var validatedResponse = btServiceResponseHandler.validateTransactionRefundResponse(btServiceRepsonse);

    return validatedResponse;
};

/**
 * submitForSettlement action
 * @param {Object} data data object
 * @return {Object} response
 */
btGraphQLSdk.prototype.submitForSettlement = function (data) {
    var reqData = validateReqData(data);
    var requestDataObj = {
        input: {
            transactionId: reqData.transactionId,
            transaction: {
                amount: reqData.amount || reqData.leftToSettle,
                orderId: reqData.orderNo
            }
        }
    };

    var graphQLRequestData = createGraphQLCallRequest(btConstants.QUERY_NAME_SUBMIT_FOR_SETTLEMENT, requestDataObj);
    var btServiceRepsonse = braintreeApiCalls.call(graphQLRequestData);
    var validatedResponse = btServiceResponseHandler.validateSubmitForSettlementResponse(btServiceRepsonse);

    return validatedResponse;
};

/**
 * submitForPartialSettlement action
 * @param {Object} data data object
 * @return {Object} response
 */
btGraphQLSdk.prototype.submitForPartialSettlement = function (data) {
    var reqData = validateReqData(data);
    var requestDataObj = {
        input: {
            transactionId: reqData.transactionId,
            transaction: {
                amount: reqData.amount || reqData.leftToSettle,
                orderId: reqData.orderNo
            }
        }
    };

    var graphQLRequestData = createGraphQLCallRequest(btConstants.QUERY_NAME_SUBMIT_FOR_PARTIAL_SETTLEMENT, requestDataObj);
    var btServiceRepsonse = braintreeApiCalls.call(graphQLRequestData);
    var validatedResponse = btServiceResponseHandler.validateSubmitForPartialSettlementResponse(btServiceRepsonse);

    return validatedResponse;
};

/**
 * createTransactionFromVault action
 * @param {Object} data data object
 * @return {Object} response
 */
btGraphQLSdk.prototype.createTransactionFromVault = function (data) {
    var reqData = validateReqData(data);

    if (!reqData.token) {
        throw Object.assign(
            new Error(Resource.msg('braintree.server.error.custom', 'braintreebm', null)),
            { isBusinessLogic: true }
        );
    }

    var queryName = defineQueryName(reqData.isSubmitForSettlement);
    var requestDataObj = {
        paymentMethodId: legacyIdConverter(reqData.token, btConstants.TYPE_PAYMENT_METHOD),
        transaction: {
            amount: reqData.amount,
            merchantAccountId: getMerchantAccountID(reqData.currencyCode),
            tax: {}
        }
    };

    if (!empty(reqData.orderNo)) {
        requestDataObj.transaction.orderId = reqData.orderNo;
    }
    if (!empty(reqData.tax)) {
        requestDataObj.transaction.tax.taxAmount = reqData.tax;
    }
    if (!empty(reqData.customFields)) {
        requestDataObj.transaction.customFields = reqData.customFields;
    }

    var graphQLRequestData = createGraphQLCallRequest(queryName, { input: requestDataObj });
    var btServiceRepsonse = braintreeApiCalls.call(graphQLRequestData);
    var validatedResponse = btServiceResponseHandler.validateTransactionFromVaultResponse(btServiceRepsonse);

    return validatedResponse;
};

module.exports = btGraphQLSdk;
