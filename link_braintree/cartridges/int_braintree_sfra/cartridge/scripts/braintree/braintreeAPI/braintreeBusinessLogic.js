'use strict';
var Transaction = require('dw/system/Transaction');

var prefs = require('~/cartridge/config/braintreePreferences');
var paymentHelper = require('~/cartridge/scripts/braintree/helpers/paymentHelper');
var customerHelper = require('~/cartridge/scripts/braintree/helpers/customerHelper');
var processorHelper = require('~/cartridge/scripts/hooks/payment/processor/processorHelper');
var btConstants = require('~/cartridge/scripts/util/braintreeConstants');

var BTGraphQLSdk = require('*/cartridge/models/btGraphQLSdk');
var btGraphQLSdk = new BTGraphQLSdk();

var braintreeBusinessLogic = {};

/**
 * Generate client token
 * @param {string} currencyCode currency code
 * @return {string} Client token value
 */
braintreeBusinessLogic.getClientToken = function (currencyCode) {
    var clientToken = null;

    if (prefs.tokenizationKey && prefs.tokenizationKey !== '') {
        return prefs.tokenizationKey;
    }

    try {
        clientToken = btGraphQLSdk.createClientToken({
            accId: paymentHelper.getMerchantAccountID(currencyCode)
        });
    } catch (error) {
        return clientToken;
    }

    return clientToken;
};

/**
 * Make API call, to get customer data if it exists in braintree
 * @param {dw.customer.Customer} customer Customer object
 * @return {Object} Customer Data with customer id and error flag
 */
braintreeBusinessLogic.getBraintreeCustomer = function (customer) {
    var response = {
        error: false,
        customerData: null
    };

    try {
        response.customerData = btGraphQLSdk.findCustomer({
            customerId: customerHelper.getCustomerId(customer)
        });
    } catch (error) {
        paymentHelper.getLogger().error(error);

        response.error = true;
    }

    return response;
};

/**
 * Defines whether customer is already vaulted on BT side
 * @param {dw.customer.Customer} customer Customer object
 * @return {Object} with isCustomerInVault and error flags
 */
braintreeBusinessLogic.isCustomerInVault = function (customer) {
    var braintreeCustomer = null;
    var response = {
        error: true,
        isCustomerInVault: false
    };

    braintreeCustomer = braintreeBusinessLogic.getBraintreeCustomer(customer);

    response.isCustomerInVault = !empty(braintreeCustomer.customerData);
    response.error = braintreeCustomer.error;

    return response;
};

/**
 * Create customer on Braintree side and mark current demandware customer with isBraintree flag
 * @returns {boolean} result
 */
braintreeBusinessLogic.createCustomerOnBraintreeSide = function () {
    try {
        var profile = customer.getProfile();
        var customerId = btGraphQLSdk.createCustomer({
            firstName: profile.getFirstName(),
            lastName: profile.getLastName(),
            email: profile.getEmail(),
            company: profile.getCompanyName(),
            phone: customerHelper.getPhoneFromProfile(profile)
        });

        Transaction.wrap(function () {
            profile.custom.braintreeCustomerId = customerId;
        });
    } catch (error) {
        paymentHelper.getLogger().error(error);

        return {
            error: error.customMessage || error.message
        };
    }

    return true;
};

/**
 * Manually create braintree payment method(on braintree side) for current customer
 * @param {string} nonce Payment method nonce
 * @return {Object} Response data from API call
 */
braintreeBusinessLogic.createPaymentMethodOnBraintreeSide = function (nonce) {
    var responseData = null;

    try {
        responseData = btGraphQLSdk.vaultPaymentMethod({
            customerId: customerHelper.getCustomerId(customer),
            paymentMethodNonce: nonce
        });
    } catch (error) {
        paymentHelper.getLogger().error(error);

        responseData = {
            error: error.customMessage || error.message
        };
    }

    return responseData;
};

/**
 * Creates payment method
 * @param {string} braintreePaymentMethodNonce BT payment method nonce
 * @param {dw.order.OrderMgr} order current order
 * @return {string} payment method id
 */
braintreeBusinessLogic.createPaymentMethod = function (braintreePaymentMethodNonce, order) {
    var customerId;

    if (customer.isRegistered()) {
        customerId = customerHelper.getCustomerId(customer);
    } else {
        var customerData = processorHelper.createGuestCustomerData(order);
        customerId = btGraphQLSdk.createCustomer(customerData);
    }

    var createPaymentMethodResponseData = btGraphQLSdk.vaultPaymentMethod({
        customerId: customerId,
        paymentMethodNonce: braintreePaymentMethodNonce
    });

    return createPaymentMethodResponseData.paymentMethod.legacyId;
};

/**
 * Deletes payment method from vault on BT side and from customer profile
 * @param {Object} paymentToDelete Payment Method details
 * @param {dw.customer.CustomerMgr} customerProfile Used for updating a customer when paypal billing agreement was canceled (webHook)
 */
braintreeBusinessLogic.deletePaymentMethod = function (paymentToDelete, customerProfile) {
    // Used for creating a graphQL request and for updating a customer
    var creditCardToken = paymentToDelete.payment.creditCardToken;

    try {
        btGraphQLSdk.deletePaymentMethodFromVault({
            creditCardToken: creditCardToken
        });

        paymentHelper.deletePaymentInstrumentFromDwCustomer(creditCardToken, customerProfile);
    } catch (error) {
        paymentHelper.getLogger().error(error);
    }
};

/**
 * Search transactions by converted ids
 * @param {Array} orders Braintree orders
 * @return {Object} Search object
 */
braintreeBusinessLogic.searchTransactionsByIds = function (orders) {
    var responseData = {};

    var convertedTransactionsIds = Object.keys(orders).map(function (transactionsId) {
        return btGraphQLSdk.legacyIdConverter(transactionsId, btConstants.LEGACY_ID_TYPE_TRANSACTION);
    }).map(function (convertedTransactionsId) {
        return convertedTransactionsId;
    });

    try {
        responseData = btGraphQLSdk.searchTransactionsByIds({
            ids: convertedTransactionsIds
        });
    } catch (error) {
        return responseData;
    }
    return responseData;
};


module.exports = braintreeBusinessLogic;
