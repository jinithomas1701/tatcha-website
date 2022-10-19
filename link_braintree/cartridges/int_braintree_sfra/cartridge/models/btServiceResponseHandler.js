/**
 * Validates whether error from graphQL call exists and throws error if yes
 * @param {Object} response graphQL response
 */
function generalResponseValidation(response) {
    if (response.error) {
        session.privacy.braintreeErrorCode = response.errorCode;

        throw new Error(response.errorMsg);
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
 * Validates searchTransactionsByIds response
 * @param {Object} response graphQL response
 * @returns {Object} with found transactions data
 */
btServiceResponseHandler.prototype.validateSearchTransactionsByIdsResponse = function (response) {
    generalResponseValidation(response);

    return response.data.search.transactions.edges;
};

/**
 * Validates createClientToken response
 * @param {Object} response graphQL response
 * @returns {string} client token
 */
btServiceResponseHandler.prototype.validateCreateClientTokenResponse = function (response) {
    generalResponseValidation(response);

    return response.data.createClientToken.clientToken;
};

/**
 * Validates vaultPaymentMethod response
 * @param {Object} response graphQL response
 * @returns {Object} with payment method data
 */
btServiceResponseHandler.prototype.validateVaultPaymentMethodResponse = function (response) {
    generalResponseValidation(response);

    return response.data.vaultPaymentMethod;
};

/**
 * Validates deletePaymentMethodFromVault response
 * @param {Object} response graphQL response
 * @returns {Object} response
 */
btServiceResponseHandler.prototype.validateDeletePaymentMethodFromVaultResponse = function (response) {
    generalResponseValidation(response);

    return response;
};

/**
 * Validates findCustomer response
 * @param {Object} response graphQL response
 * @returns {Object} response with customer data
 */
btServiceResponseHandler.prototype.validateFindCustomerResponse = function (response) {
    generalResponseValidation(response);

    return response.data.search.customers.edges;
};

/**
 * Validates createCustomer response
 * @param {Object} response graphQL response
 * @returns {string} customer's id
 */
btServiceResponseHandler.prototype.validateCreateCustomerResponse = function (response) {
    generalResponseValidation(response);

    return response.data.createCustomer.customer.legacyId;
};

/**
 * Validates createTransaction response
 * @param {Object} response graphQL response
 * @returns {Object} response with created transaction data
 */
btServiceResponseHandler.prototype.validateCreateTransactionResponse = function (response) {
    generalResponseValidation(response);

    var responseData = response.data;

    return responseData.chargePaymentMethod || responseData.authorizePaymentMethod ||
        // PayPal transaction cases
        responseData.chargePayPalAccount || responseData.authorizePayPalAccount;
};

module.exports = btServiceResponseHandler;
