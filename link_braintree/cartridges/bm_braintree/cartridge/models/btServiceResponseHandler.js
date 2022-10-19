var Resource = require('dw/web/Resource');

var btConstants = require('*/cartridge/scripts/util/braintreeConstants');

/**
 * Validates whether error from graphQL call exists and throws error if yes
 * @param {Object} response graphQL response
 */
function generalResponseValidation(response) {
    if (response.error) {
        throw Object.assign(
            new Error(response.message),
            { isBusinessLogic: true }
        );
    }
}
/**
 * BT Service Response Handler Model
 */
function btServiceResponseHandler() { }

/**
 * Validates legacyIdConverter response
 * @param {Object} response graphQL response
 * @returns {string} converted id
 */
btServiceResponseHandler.prototype.validateLegacyIdConverterResponse = function (response) {
    generalResponseValidation(response);

    return response.data.idFromLegacyId;
};

/**
 * Validates searchTransactionById response
 * @param {Object} response graphQL response
 * @returns {Object} with found transaction data
 */
btServiceResponseHandler.prototype.validateSearchTransactionByIdResponse = function (response) {
    generalResponseValidation(response);

    return response.data.search.transactions.edges[0];
};

/**
 * Validates searchRefundTransactionById response
 * @param {Object} response graphQL response
 * @returns {Object} with found refund transaction data
 */
btServiceResponseHandler.prototype.validateSearchRefundTransactionByIdResponse = function (response) {
    generalResponseValidation(response);

    return response.data.search.refunds.edges[0].node;
};

/**
 * Validates transaction's refund action response
 * @param {Object} response graphQL response
 * @returns {Object} refund data
 */
btServiceResponseHandler.prototype.validateTransactionRefundResponse = function (response) {
    generalResponseValidation(response);

    return response.data.refundTransaction.refund;
};

/**
 * Validates transaction's void action response
 * @param {Object} response graphQL response
 * @returns {Object} void data
 */
btServiceResponseHandler.prototype.validateTransactionVoidResponse = function (response) {
    generalResponseValidation(response);

    return response.data.reverseTransaction.reversal;
};

/**
 * Validates transaction's submit for settlement action response
 * @param {Object} response graphQL response
 * @returns {Object} submit for settlement data
 */
btServiceResponseHandler.prototype.validateSubmitForSettlementResponse = function (response) {
    generalResponseValidation(response);

    var transaction = response.data.captureTransaction.transaction;
    // if settlement was declined throw error
    if (transaction.status === btConstants.STATUS_SETTLEMENT_DECLINED) {
        throw Object.assign(
            new Error(Resource.msg('transaction.detail.error.capture.exceed', 'braintreebm', null)),
            { isBusinessLogic: true }
        );
    }

    return transaction;
};

/**
 * Validates transaction's submit for partial settlement action response
 * @param {Object} response graphQL response
 * @returns {Object} submit for partial settlement data
 */
btServiceResponseHandler.prototype.validateSubmitForPartialSettlementResponse = function (response) {
    generalResponseValidation(response);

    var transaction = response.data.partialCaptureTransaction.capture;
    // if settlement was declined throw error
    if (transaction.status === btConstants.STATUS_SETTLEMENT_DECLINED) {
        throw Object.assign(
            new Error(Resource.msg('transaction.detail.error.capture.exceed', 'braintreebm', null)),
            { isBusinessLogic: true }
        );
    }

    return transaction;
};

/**
 * Validates new transaction response
 * @param {Object} response graphQL response
 * @returns {Object} transaction data
 */
btServiceResponseHandler.prototype.validateTransactionFromVaultResponse = function (response) {
    generalResponseValidation(response);

    var transactionData = response.data.authorizePaymentMethod || response.data.chargePaymentMethod;
    // if transaction was declined throw error
    if (transactionData.transaction.status === btConstants.STATUS_PROCESSOR_DECLINED) {
        throw Object.assign(
            new Error(Resource.msg('transaction.detail.error.transaction.declined', 'braintreebm', null)),
            { isBusinessLogic: true }
        );
    }

    return transactionData.transaction;
};

module.exports = btServiceResponseHandler;
