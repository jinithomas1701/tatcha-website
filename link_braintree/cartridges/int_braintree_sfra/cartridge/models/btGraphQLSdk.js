var Resource = require('dw/web/Resource');

var prefs = require('~/cartridge/config/braintreePreferences');
var obj = require('*/cartridge/scripts/query/queries');
var btConstants = require('*/cartridge/scripts/util/braintreeConstants');
var braintreeApiCalls = require('~/cartridge/scripts/braintree/braintreeAPI/braintreeApiCalls');
var braintreeConstants = require('~/cartridge/scripts/util/braintreeConstants');
var paymentHelper = require('~/cartridge/scripts/braintree/helpers/paymentHelper');

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
 * Validates whether data object is not empty
 * @param {Object} data data object
 * @return {Object} data object or error
 */
function validateReqData(data) {
    if (empty(Object.keys(data))) {
        throw new Error(Resource.msg('braintree.error.empty.data', 'locale', null));
    }

    return data;
}

/**
 * BT graphQL sdk model
 */
function btGraphQLSdk() { }

/**
 * Converts legacy id into graphQL id
 * @param {string} legacyId legacy id
 * @param {string} type type of legacy id
 * @return {string} converted id
 */
btGraphQLSdk.prototype.legacyIdConverter = function (legacyId, type) {
    var requestDataObj = {
        legacyId: legacyId,
        type: type
    };

    var graphQLRequestData = createGraphQLCallRequest(btConstants.QUERY_NAME_LEGACY_ID_CONVERTER, requestDataObj);
    var btServiceRepsonse = braintreeApiCalls.call(graphQLRequestData);
    var validatedResponse = btServiceResponseHandler.validateLegacyIdConverterResponse(btServiceRepsonse);

    return validatedResponse;
};

/**
 * Searches transactions by ids (used for UpdatePaymentStatuses job)
 * @param {Object} data request data
 * @return {Object} response - transactions arrays
 */
btGraphQLSdk.prototype.searchTransactionsByIds = function (data) {
    var reqData = validateReqData(data);
    var requestDataObj = {
        input: {
            id: {
                in: reqData.ids
            }
        }
    };

    var graphQLRequestData = createGraphQLCallRequest(braintreeConstants.QUERY_NAME_SEARCH_TRANSACTION, requestDataObj);
    var btServiceRepsonse = braintreeApiCalls.call(graphQLRequestData);
    var validatedResponse = btServiceResponseHandler.validateSearchTransactionsByIdsResponse(btServiceRepsonse);

    return validatedResponse;
};

/**
 * Creates client token
 * @param {Object} data request data
 * @return {string} client token
 */
btGraphQLSdk.prototype.createClientToken = function (data) {
    var reqData = validateReqData(data);
    var requestDataObj = {
        input: {
            clientToken: {
                merchantAccountId: reqData.accId
            }
        }
    };

    var graphQLRequestData = createGraphQLCallRequest(braintreeConstants.QUERY_NAME_CLIENT_ID, requestDataObj);
    var btServiceRepsonse = braintreeApiCalls.call(graphQLRequestData);
    var validatedResponse = btServiceResponseHandler.validateCreateClientTokenResponse(btServiceRepsonse);

    return validatedResponse;
};

/**
 * Vaults payment method
 * @param {Object} data request data
 * @return {Object} response with payment method data
 */
btGraphQLSdk.prototype.vaultPaymentMethod = function (data) {
    var reqData = validateReqData(data);
    var requestDataObj = {
        input: {
            paymentMethodId: reqData.paymentMethodNonce,
            customerId: this.legacyIdConverter(reqData.customerId, braintreeConstants.LEGACY_ID_TYPE_CUSTOMER)
        }
    };

    var graphQLRequestData = createGraphQLCallRequest(braintreeConstants.QUERY_NAME_VAULT_PAYMENT_METHOD, requestDataObj);
    var btServiceRepsonse = braintreeApiCalls.call(graphQLRequestData);
    var validatedResponse = btServiceResponseHandler.validateVaultPaymentMethodResponse(btServiceRepsonse);

    return validatedResponse;
};

/**
 * Deletes payment method from vault on BT side
 * @param {Object} data request data
 * @return {Object} response
 */
btGraphQLSdk.prototype.deletePaymentMethodFromVault = function (data) {
    var reqData = validateReqData(data);
    var requestDataObj = {
        input: {
            paymentMethodId: this.legacyIdConverter(reqData.creditCardToken, braintreeConstants.LEGACY_ID_TYPE_PAYMENT_METHOD)
        }
    };

    var graphQLRequestData = createGraphQLCallRequest(braintreeConstants.QUERY_NAME_DELETE_PAYMENT_METHOD, requestDataObj);
    var btServiceRepsonse = braintreeApiCalls.call(graphQLRequestData);
    var validatedResponse = btServiceResponseHandler.validateDeletePaymentMethodFromVaultResponse(btServiceRepsonse);

    return validatedResponse;
};

/**
 * Finds customer
 * @param {Object} data request data
 * @return {Object} response with customer data
 */
btGraphQLSdk.prototype.findCustomer = function (data) {
    var reqData = validateReqData(data);
    var requestDataObj = {
        input: {
            id: {
                in: [this.legacyIdConverter(reqData.customerId, braintreeConstants.LEGACY_ID_TYPE_CUSTOMER)]
            }
        }
    };

    var graphQLRequestData = createGraphQLCallRequest(braintreeConstants.QUERY_NAME_SEARCH_CUSTOMER, requestDataObj);
    var btServiceRepsonse = braintreeApiCalls.call(graphQLRequestData);
    var validatedResponse = btServiceResponseHandler.validateFindCustomerResponse(btServiceRepsonse);

    return validatedResponse;
};

/**
 * Creates customer
 * @param {Object} data request data
 * @return {string} customer's id
 */
btGraphQLSdk.prototype.createCustomer = function (data) {
    var reqData = validateReqData(data);
    var requestDataObj = {
        input: {
            customer: {
                firstName: reqData.firstName,
                lastName: reqData.lastName,
                email: reqData.email,
                company: reqData.company,
                phoneNumber: reqData.phone
            }
        }
    };

    var graphQLRequestData = createGraphQLCallRequest(braintreeConstants.QUERY_NAME_CREATE_CUSTOMER, requestDataObj);
    var btServiceRepsonse = braintreeApiCalls.call(graphQLRequestData);
    var validatedResponse = btServiceResponseHandler.validateCreateCustomerResponse(btServiceRepsonse);

    return validatedResponse;
};

/**
 * Creates transaction based on passed parameters
 * @param {Object} data request data
 * @return {Object} response with created transaction data
 */
btGraphQLSdk.prototype.createTransaction = function (data) {
    var reqData = validateReqData(data);
    // define which business logic will be executed
    var queryName = paymentHelper.defineCreateTransactionQueryName(reqData);
    var requestDataObj = {
        paymentMethodId: reqData.paymentMethodNonce || this.legacyIdConverter(reqData.paymentMethodToken, braintreeConstants.LEGACY_ID_TYPE_PAYMENT_METHOD),
        transaction: {
            amount: reqData.amount,
            merchantAccountId: reqData.merchantAccountId,
            orderId: reqData.orderId,
            riskData: {
                deviceData: reqData.deviceData
            },
            tax: {},
            shipping: {},
            channel: prefs.braintreeChannel
        }
    };

    if (!empty(reqData.customerId)) {
        requestDataObj.transaction.customerId = reqData.customerId;
    }
    if (!empty(reqData.vaultPaymentMethodAfterTransacting)) {
        requestDataObj.transaction.vaultPaymentMethodAfterTransacting = reqData.vaultPaymentMethodAfterTransacting;
    }
    if (!empty(reqData.shipping)) {
        requestDataObj.transaction.shipping.shippingAddress = reqData.shipping;
    }
    if (!empty(reqData.shippingAmount)) {
        requestDataObj.transaction.shipping.shippingAmount = reqData.shippingAmount;
    }
    if (!empty(reqData.descriptor)) {
        requestDataObj.transaction.descriptor = reqData.descriptor;
    }

    if (!empty(reqData.customerDetails)) {
        requestDataObj.transaction.customerDetails = reqData.customerDetails;
    }

    if (!empty(reqData.customFields)) {
        requestDataObj.transaction.customFields = reqData.customFields;
    }
    if (!empty(reqData.taxAmount)) {
        requestDataObj.transaction.tax.taxAmount = reqData.taxAmount;
    }
    if (!empty(reqData.discountAmount)) {
        requestDataObj.transaction.discountAmount = reqData.discountAmount;
    }
    if (!empty(reqData.lineItems)) {
        requestDataObj.transaction.lineItems = reqData.lineItems;
    }

    var graphQLRequestData = createGraphQLCallRequest(queryName, { input: requestDataObj });
    var btServiceRepsonse = braintreeApiCalls.call(graphQLRequestData);
    var validatedResponse = btServiceResponseHandler.validateCreateTransactionResponse(btServiceRepsonse);

    return validatedResponse;
};

module.exports = btGraphQLSdk;
