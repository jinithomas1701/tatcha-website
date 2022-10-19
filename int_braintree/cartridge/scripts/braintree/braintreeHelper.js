'use strict';
/* global dw empty customer session */

var svc = require('dw/svc');
var system = require('dw/system');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');

var getPreference = require('~/cartridge/config/braintreePreferences.js');
var braintreeApi = require('~/cartridge/scripts/braintree/braintreeApi');
var Countries = require('app_storefront_core/cartridge/scripts/util/Countries');

var BraintreeHelper = {
    prefs: getPreference()
};
var prefs = BraintreeHelper.prefs;

/**
 * Parse error from API call
 * @param {Object} errorResponse error response from braintree
 * @returns {string} Parsed error
 */
function createErrorMessage(errorResponse) {
    var result = [];
    var errorMsg = null;

    /**
     * Parse error from API call
     * @param {Object} objectToBeParsed error response from braintree
     */
    function parseErrors(objectToBeParsed) {
        var obj = objectToBeParsed;
        for (var name in obj) { // eslint-disable-line no-restricted-syntax
            if (String(name) === 'processorResponseText') {
                if (!obj.processorResponseCode) {
                    obj.processorResponseCode = 'unknown';
                }
                errorMsg = Resource.msg('braintree.server.processor.error.' + obj.processorResponseCode, 'locale', 'none');
                if (String(errorMsg) === 'none') {
                    errorMsg = obj.processorResponseText;
                }
                BraintreeHelper.getLogger().error(Resource.msgf('braintree.server.error.forlogger', 'locale', null, obj.processorResponseCode, obj.processorResponseText));
                result.push(errorMsg);
            }
            if (String(name) === 'errors' && obj[name] instanceof Array) {
                obj[name].forEach(function (error) { // eslint-disable-line no-loop-func
                    errorMsg = Resource.msg('braintree.server.error.' + error.code, 'locale', 'none');
                    if (String(errorMsg) === 'none') {
                        errorMsg = error.message;
                    }
                    BraintreeHelper.getLogger().error(Resource.msgf('braintree.server.error.forlogger', 'locale', null, error.code, error.message));
                    result.push(errorMsg);
                });
            } else {
                parseErrors(obj[name]);
            }
        }
    }

    if (!empty(errorResponse.message)) {
        result.push(errorResponse.message);
    }

    var filteredResult = result.filter(function (item, pos) {
        return result.indexOf(item) === pos;
    });

    parseErrors(errorResponse);

    return filteredResult.join('\n');
}

/**
 * All preferences of Braintree integration
 *
 * @returns {Object} Object with preferences
 */
BraintreeHelper.getPrefs = function () {
    return prefs;
};

/**
 * Check if Paypal button is enabled
 * @param targetPage prefs value
 * @return {boolean} disabled or enabled
 */

BraintreeHelper.isPaypalButtonEnabled = function (targetPage) {
    var displayPages = prefs.BRAINTREE_PAYPAL_Button_Location.toLowerCase();
    if (displayPages === 'none' || !targetPage) {
        return false;
    }
    return displayPages.indexOf(targetPage) !== -1;
};

/**
 * Generate client token
 * @return {string} Client token value
 */
BraintreeHelper.getClientToken = function () {
    var currencyCode = require('dw/system/Site').getCurrent().getDefaultCurrency();
    var responseData = null;
    if (prefs.BRAINTREE_Tokenization_Key && prefs.BRAINTREE_Tokenization_Key !== '') {
        return prefs.BRAINTREE_Tokenization_Key;
    }
    try {
        responseData = BraintreeHelper.call({
            xmlType: 'client_token',
            requestPath: 'client_token',
            currencyCode: currencyCode
        });
    } catch (error) {
        return responseData;
    }
    return responseData.clientToken.value;
};

/**
 * Search transactions by ids
 * @param {Array} ids transactions by ids
 * @return {Object} Search object
 */
BraintreeHelper.searchTransactionsByIds = function (ids) {
    var responseData = {};
    try {
        responseData = BraintreeHelper.call({
            xmlType: 'search_transactions_by_ids',
            requestPath: 'transactions/advanced_search',
            ids: ids
        });
    } catch (error) {
        return responseData;
    }
    return responseData;
};

/**
 * Calculate amount of gift certificates in the order
 * @param {dw.order.Order} order Order object
 * @return {dw.value.Money} Certificates total
 */
function calculateAppliedGiftCertificatesAmount(order) {
    var amount = new dw.value.Money(0, order.getCurrencyCode());
    var paymentInstruments = order.getGiftCertificatePaymentInstruments();

    var iterator = paymentInstruments.iterator();
    var paymentInstrument = null;
    while (iterator.hasNext()) {
        paymentInstrument = iterator.next();
        amount = amount.add(paymentInstrument.getPaymentTransaction().getAmount());
    }

    return amount;
}

/**
 * Calculate order amount
 * @param {dw.order.Order} order Order object
 * @return {dw.value.Money} New Amount value
 */
BraintreeHelper.getAmount = function (order) {
    var appliedGiftCertificatesAmount = calculateAppliedGiftCertificatesAmount(order);
    var amount = order.getTotalGrossPrice().subtract(appliedGiftCertificatesAmount);
    return amount;
};

/**
 * Call API request
 *
 * @param {Object} requestData Request data
 * @returns {Object} Response data
 */
BraintreeHelper.call = function (requestData) {
    var createService = require('~/cartridge/scripts/service/braintreeCreateService.js');
    var service = null;
    var result = null;

    try {
        service = createService();
    } catch (error) {
        throw new Error('Service int_braintree.http.xml.payment.Braintree is undefined. Need to add this service in Administration > Operations > Services');
    }

    try {
        result = service.setThrowOnError().call(requestData);
    } catch (error) {
        BraintreeHelper.getLogger().error(error);
        error.customMessage = Resource.msg('braintree.server.error.parse', 'locale', null);
        throw error;
    }

    if (result.getStatus() === 'ERROR' && result.getError() === 404) {
        var error = new Error(Resource.msg('braintree.server.error.custom', 'locale', null));
        error.status = '404';
        throw error;
    }

    if (!result.isOk()) {
        var braintreeError;
        var errorObj = null;
        try {
            errorObj = braintreeApi.parseXml(result.getErrorMessage());
        } catch (err) {
            err.customMessage = Resource.msg('braintree.server.error.parse', 'locale', null);
            throw err;
        }

        if (Object.prototype.hasOwnProperty.call(errorObj, 'apiErrorResponse')) {
            braintreeError = createErrorMessage(errorObj.apiErrorResponse);
        } else {
            braintreeError = Resource.msg('braintree.server.error', 'locale', null);
            BraintreeHelper.getLogger().error(braintreeError);
        }
        throw new Error(braintreeError);
    }

    return service.getResponse();
};

/**
 * Call Braintree API methods with specific data
 * @param {string} methodName Method name
 * @param {Object} dataObject Data for call
 * @return {Object} Responce data from API call
 */
BraintreeHelper.callApiMethod = function (methodName, dataObject) {
    var createRequestDataContainer = require('~/cartridge/scripts/braintree/requestDataContainer');
    var updateData = require('~/cartridge/scripts/braintree/updateData');
    var responseData = null;
    try {
        var data = createRequestDataContainer(methodName, dataObject);
        responseData = BraintreeHelper.call(data);
        updateData(methodName, dataObject, responseData);
    } catch (error) {
        BraintreeHelper.getLogger().error(error);
        throw new Error(error);
    }

    return responseData;
};

/**
 * Call Braintree API methods with specific data
 * @param {string} methodName Method name
 * @param {Object} dataObject Data for call
 * @return {Object} Responce data from API call
 */
BraintreeHelper.callApiMethodWithoutError = function (methodName, dataObject) {
    try {
        return BraintreeHelper.callApiMethod(methodName, dataObject);
    } catch (error) {
        return null;
    }
};

/**
 * Creates or get logger
 *
 * @returns {Object} Object with logger for API operation
 */
BraintreeHelper.getLogger = function () {
    var errorMode = prefs.BRAINTREE_Logging_Mode === 'none' ? false : prefs.BRAINTREE_Logging_Mode;
    var logger = system.Logger.getLogger('Braintree', 'Braintree_General');

    return {
        error: function (msg) {
            if (errorMode) {
                logger.error(msg);
            }
        },
        info: function (msg) {
            if (errorMode && errorMode !== 'errors') {
                logger.info(msg);
            }
        },
        warn: function (msg) {
            if (errorMode && errorMode !== 'errors') {
                logger.warn(msg);
            }
        }
    };
};

/**
 * Create address data
 * @param {dw.order.OrderAddress} address Address data from order
 * @return {Object} transformed data object
 */
BraintreeHelper.createAddressData = function (address) {
    return {
        company: address.getCompanyName(),
        countryCodeAlpha2: address.getCountryCode().getValue().toUpperCase(),
        countryName: address.getCountryCode().getDisplayValue(),
        firstName: address.getFirstName(),
        lastName: address.getLastName(),
        locality: address.getCity(),
        postalCode: address.getPostalCode(),
        region: address.getStateCode(),
        streetAddress: address.getAddress1(),
        extendedAddress: address.getAddress2(),
        phoneNumber: address.getPhone()
    };
};

/**
 * Create customer data for API call
 * @param {dw.order.Order} order Order object
 * @return {Object} Customer data for request
 */
BraintreeHelper.createCustomerData = function (order) {
    var customer = order.getCustomer();
    var result = null;
    var billingAddress = order.getBillingAddress();
    var shippingAddress = order.getDefaultShipment().getShippingAddress();
    if (customer.isRegistered()) {
        var profile = customer.getProfile();
        result = {
            id: BraintreeHelper.createCustomerId(customer),
            firstName: profile.getFirstName(),
            lastName: profile.getLastName(),
            email: profile.getEmail(),
            phone: profile.getPhoneMobile() || profile.getPhoneHome() || profile.getPhoneBusiness() || billingAddress.getPhone() || shippingAddress.getPhone(),
            company: profile.getCompanyName(),
            fax: profile.getFax()
        };
    } else {
        result = {
            id: null,
            firstName: billingAddress.getFirstName(),
            lastName: billingAddress.getLastName(),
            email: order.getCustomerEmail(),
            phone: billingAddress.getPhone() || shippingAddress.getPhone(),
            company: '',
            fax: ''
        };
    }

    return result;
};

/**
 * Create customer ID for braintree based on the customer number
 * @param {dw.customer.Customer} customer  Customer object
 * @return {string} Customer ID
 */
BraintreeHelper.createCustomerId = function (customer) {
    if (customer.isRegistered()) {
        if (session.custom.customerId ) {
            return session.custom.customerId;
        }

        var id = customer.getProfile().getCustomerNo();
        /*var siteName = system.Site.getCurrent().getID().toLowerCase();
        var allowNameLength = 31 - id.length;
        if (siteName.length > allowNameLength) {
            siteName = siteName.slice(0, allowNameLength);
        }
        return siteName + '_' + id;*/
        return id;
    }
    return null;
};

/**
 * Get details about address using address id
 * @param {string} customerId Braintree customer id
 * @param {string} addressId Braintree address id
 * @return {Object} response data
 */
BraintreeHelper.getAddressDetails = function (customerId, addressId) {
    var responseData = null;
    try {
        responseData = BraintreeHelper.call({
            xmlType: 'empty',
            requestPath: 'customers/' + customerId + '/addresses/' + addressId,
            requestMethod: 'GET'
        });
    } catch (error) {
        responseData = error;
    }

    return responseData;
};

/**
 * Make API call, to check if customer exist in braintree
 * @param {dw.customer.Customer} customer Customer object
 * @return {boolean} Exist or not exist status
 */
BraintreeHelper.isCustomerExist = function (customer) {
    if (session.custom.isCustomerExist) {
        return true;
    }
    var customerId = BraintreeHelper.createCustomerId(customer);
    if (!customerId) {
        return false;
    }

    try {
        BraintreeHelper.call({
            xmlType: 'empty',
            requestPath: 'customers/' + customerId,
            requestMethod: 'GET'
        });
        
        session.custom.isCustomerExist = true;
        return true;
    } catch (error) {
        session.custom.isCustomerExist = false;
        return false;
    }
};

/**
 * Remove billing address from payment method
 * @param {string} customerId Customer ID
 * @param {string} addressId Address ID
 * @return {boolean} Call result
 */
BraintreeHelper.deleteBillingAddress = function (customerId, addressId) {
    try {
        BraintreeHelper.call({
            xmlType: 'empty',
            requestPath: 'customers/' + customerId + '/addresses/' + addressId,
            requestMethod: 'DELETE'
        });
        return true;
    } catch (error) {
        return false;
    }
};

/**
 * Remove underscore and capitalize first letter in payment status
 * @param {string} status payment status
 * @return {string} Formatted payment status
 */
BraintreeHelper.parseStatus = function (status) {
    var result = null;
    try {
        var firstLetter = status.charAt(0);
        result = status.replace(/_/g, ' ').replace(firstLetter, firstLetter.toUpperCase());
    } catch (error) {
        BraintreeHelper.getLogger().error(error);
    }

    return result;
};

/**
 * Get braintree payment instrument from array of payment instruments
 * @param {dw.order.LineItemCtnr} lineItemContainer Order object
 * @return {dw.order.OrderPaymentInstrument} Braintree Payment Instrument
 */
BraintreeHelper.getBraintreePaymentInstrument = function (lineItemContainer, deleteBraintreePaymentInstruments) {
    var paymentInstruments = lineItemContainer.getPaymentInstruments();
    var paymentProcessorIds = {
        'BRAINTREE_CREDIT': true, 
        'BRAINTREE_PAYPAL': true, 
        'BRAINTREE_APPLEPAY': true,
        'BRAINTREE_GOOGLEPAY': true,
        'BRAINTREE_VENMO': false
    }

    var iterator = paymentInstruments.iterator();
    var paymentInstrument = null;
    while (iterator.hasNext()) {
        paymentInstrument = iterator.next();

        var paymentProcessorId = dw.order.PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod()).getPaymentProcessor().getID();

        if (paymentProcessorIds[paymentProcessorId] ) {
            if (typeof deleteBraintreePaymentInstruments === "function") {
                deleteBraintreePaymentInstruments(paymentInstrument);
            }
            else {
                return paymentInstrument;
            }
        }
    }
};

/**
 * Delete all braintree payment instruments from the lineItemContainer
 * @param {dw.order.LineItemCtnr} lineItemContainer Order object
 */
BraintreeHelper.deleteBraintreePaymentInstruments = function (lineItemContainer) {
    BraintreeHelper.getBraintreePaymentInstrument(lineItemContainer, function(paymentInstrument) {
        lineItemContainer.removePaymentInstrument(paymentInstrument);
    })
};

/**
 * Parse customer name from single string
 * @param {string} name name string
 * @return {Object} name object
 */
BraintreeHelper.createFullName = function (name) {
    var names = name.trim().replace(/\s\s+/g, ' ').split(' ');
    var firstName = names[0];
    var secondName = null;
    var lastName = null;

    if (names.length === 3) {
        secondName = names[1];
        lastName = names[2];
    } else if (names.length === 2) {
        lastName = names[1];
    } else {
        firstName = name;
    }

    return {
        firstName: firstName,
        secondName: secondName,
        lastName: lastName
    };
};

/**
 * Make default credit card payment instrument for current user
 * @param {string} paymentMethodToken payment method token from braintree
 * @return {Object} default card call or error response.
 */
BraintreeHelper.makeDefaultCreditCard = function (paymentMethodToken, owner) {
    var data = null;
    try {
        var customerPaymentInstruments = BraintreeHelper.getCustomerCrditCardPaymentInstruments();
        var iterator = customerPaymentInstruments.iterator();
        var paymentInst = null;
        var httpParameterMap = request.httpParameterMap;
        var cardHolderName = null;
        if(!empty(owner)) {
        	cardHolderName = owner;
        } else {
        	cardHolderName = httpParameterMap.dwfrm_creditcard_owner.value;
        }

        Transaction.wrap(function () {
            while (iterator.hasNext()) {
                paymentInst = iterator.next();
                paymentInst.custom.braintreeDefaultCard = paymentMethodToken === paymentInst.custom.braintreePaymentMethodToken;
            }
        });

        data = BraintreeHelper.call({
            xmlType: 'payment_method',
            requestPath: 'payment_methods/any/' + paymentMethodToken,
            requestMethod: 'PUT',
            makeDefault: true,
            cardHolderName: cardHolderName
        });
    } catch (error) {
        return {
            error: error.customMessage ? error.customMessage : error.message
        };
    }
    return data;
};

/**
 * Make default PayPal payment instrument for current user
 * @param {string} paymentMethodToken Token from Braintree
 * @return {Object} make dafault call result
 */
BraintreeHelper.makeDefaultPaypalAccount = function (paymentMethodToken) {
    var data = null;
    try {
        var customerPaymentInstruments = BraintreeHelper.getCustomerPaypalPaymentInstruments();
        var iterator = customerPaymentInstruments.iterator();
        var paymentInst = null;

        Transaction.wrap(function () {
            while (iterator.hasNext()) {
                paymentInst = iterator.next();
                paymentInst.custom.braintreeDefaultCard = paymentMethodToken === paymentInst.custom.braintreePaymentMethodToken;
            }
        });

        data = BraintreeHelper.call({
            xmlType: 'payment_method',
            requestPath: 'payment_methods/any/' + paymentMethodToken,
            requestMethod: 'PUT',
            makeDefault: true
        });
    } catch (error) {
        return {
            error: error.customMessage ? error.customMessage : error.message
        };
    }
    return data;
};

/**
 * Make default Venmo payment instrument for current user
 * @param {string} paymentMethodToken Token from Braintree
 * @return {Object} make dafault call result
 */
BraintreeHelper.makeDefaultVenmoAccount = function (paymentMethodToken) {
    try {
        var customerPaymentInstruments = BraintreeHelper.getCustomerVenmoPaymentInstruments();
        var iterator = customerPaymentInstruments.iterator();
        var paymentInst = null;

        Transaction.wrap(function () {
            while (iterator.hasNext()) {
                paymentInst = iterator.next();
                paymentInst.custom.braintreeDefaultCard = paymentMethodToken === paymentInst.custom.braintreePaymentMethodToken;
            }
        });
    } catch (error) {
        return {
            error: error.customMessage ? error.customMessage : error.message
        };
    }
    return true;
};

/**
* Creates config for Venmo button on Profile page
* @returns {Object} configuration object
*/
BraintreeHelper.createAccountVenmoButtonConfig = function () {
    var config = {
        paymentMethodName: prefs.venmoMethodName,
        clientToken: BraintreeHelper.getClientToken(),
        options: {
            flow: 'vault',
            displayName: empty(prefs.BRAINTREE_VENMO_Display_Name) ? '' : prefs.BRAINTREE_VENMO_Display_Name
        },
        messages: {
            CLIENT_REQUEST_TIMEOUT: Resource.msg('braintree.error.CLIENT_REQUEST_TIMEOUT', 'locale', null),
            CLIENT_GATEWAY_NETWORK: Resource.msg('braintree.error.CLIENT_GATEWAY_NETWORK', 'locale', null),
            CLIENT_REQUEST_ERROR: Resource.msg('braintree.error.CLIENT_REQUEST_ERROR', 'locale', null),
            CLIENT_MISSING_GATEWAY_CONFIGURATION: Resource.msg('braintree.error.CLIENT_MISSING_GATEWAY_CONFIGURATION', 'locale', null),
            VENMO_ACCOUNT_TOKENIZATION_FAILED: Resource.msg('braintree.error.VENMO_ACCOUNT_TOKENIZATION_FAILED', 'locale', null),
            VENMO_BROWSER_NOT_SUPPORTED: Resource.msg('braintree.error.VENMO_BROWSER_NOT_SUPPORTED', 'locale', null)
        }
    };
    return config;
};
    
/**
* Creates config button object for Venmo
* @param {Basket} basket Basket object
* @param {string} clientToken Braintree clientToken
* @returns {Object} button config object
*/
BraintreeHelper.createBraintreeVenmoButtonConfig = function (basket, clientToken) {
    var amount = BraintreeHelper.getAmount(basket);

    var venmoButtonConfig = {
        clientToken: clientToken,
        paymentMethodName: prefs.venmoMethodName,
        messages: {
            CLIENT_REQUEST_TIMEOUT: Resource.msg('braintree.error.CLIENT_REQUEST_TIMEOUT', 'locale', null),
            CLIENT_GATEWAY_NETWORK: Resource.msg('braintree.error.CLIENT_GATEWAY_NETWORK', 'locale', null),
            CLIENT_REQUEST_ERROR: Resource.msg('braintree.error.CLIENT_REQUEST_ERROR', 'locale', null),
            CLIENT_MISSING_GATEWAY_CONFIGURATION: Resource.msg('braintree.error.CLIENT_MISSING_GATEWAY_CONFIGURATION', 'locale', null)
        },
        options: {
            amount: parseFloat(amount.getValue()),
            currency: amount.getCurrencyCode(),
            displayName: prefs.BRAINTREE_VENMO_Display_Name
        }
    };

    return venmoButtonConfig;
};

/**
* Creates config object for venmo
* @param {Array} paymentMethods Payment methods list
* @returns {Object} venmo config object
*/
BraintreeHelper.createVenmoConfig = function (basket) {
    var paymentMethods = basket.getPaymentInstruments(prefs.venmoMethodName);
    var customerVenmoPaymentInstruments = BraintreeHelper.getCustomerVenmoPaymentInstruments();
    var isAllowedAddAccount = prefs.BRAINTREE_VENMO_Vault_Mode !== 'not';
    var newAccountSelected = true;
    var isNeedHideContinueButton = true;
    var isNeedHideVenmoButton = false;
    var braintreeVenmoUserId = '';
    var braintreePaymentMethodNonce = '';

    if (!empty(paymentMethods) && paymentMethods[0].custom.braintreePaymentMethodNonce) {
        braintreePaymentMethodNonce = paymentMethods[0].custom.braintreePaymentMethodNonce;
        braintreeVenmoUserId = paymentMethods[0].custom.braintreeVenmoUserId;
        isNeedHideContinueButton = false;
        isNeedHideVenmoButton = true;
    }
    else if (customer.authenticated && !empty(customerVenmoPaymentInstruments)) {
        var iterator = customerVenmoPaymentInstruments.iterator();
        var instrument = null;

        while (iterator.hasNext()) {
            instrument = iterator.next();

            if (instrument.custom.braintreeDefaultCard) {
                isNeedHideContinueButton = false;
                newAccountSelected = false;
                break;
            }
        }
    }
    return {
        customerVenmoPaymentInstruments: customerVenmoPaymentInstruments,
        isAllowedAddAccount: isAllowedAddAccount,
        newAccountSelected: newAccountSelected,
        isNeedHideContinueButton: isNeedHideContinueButton,
        braintreePaymentMethodNonce: braintreePaymentMethodNonce,
        braintreeVenmoUserId: braintreeVenmoUserId,
        isNeedHideVenmoButton: isNeedHideVenmoButton
    };
};

/**
 * Get saved Venmo customer payment method instrument
 * @param {string} venmo userID
 * @return {dw.util.Collection} payment instruments
 */
BraintreeHelper.getVenmoCustomerPaymentInstrumentByUserID = function (userId) {
    var customerPaymentInstruments = BraintreeHelper.getCustomerVenmoPaymentInstruments();
    if (customerPaymentInstruments) {
        var iterator = customerPaymentInstruments.iterator();
        var paymentInst = null;
        while (iterator.hasNext()) {
            paymentInst = iterator.next();
            if (paymentInst.custom.braintreeVenmoUserId === userId) {
                return paymentInst;
            }
        }
    }

    return null;
};

/**
 * Get customer venmo payment instruments
 * @param {string} customerId Braintree customer id or dw cusomer id. If customer id is null, returns  of current customer
 * @return {dw.util.Collection} payment instruments
 */
BraintreeHelper.getCustomerVenmoPaymentInstruments = function (customerId) {
    return getCustomerPaymentInstruments(customerId, prefs.venmoMethodName);
};

/**
 * Get customer payment instrument by uuid
 * @param {string} uuid uuid for PI
 * @return {dw.customer.CustomerPaymentInstrument} cutomet payment indstrument
 */
BraintreeHelper.getCustomerPaymentInstrument = function (uuid) {
    if (!customer.authenticated) {
        return false;
    }
    var customerPaymentInstruments = customer.getProfile().getWallet().getPaymentInstruments();
    var instrument = null;
    if (uuid === null || customerPaymentInstruments === null || customerPaymentInstruments.size() < 1) {
        return false;
    }
    var instrumentsIter = customerPaymentInstruments.iterator();
    while (instrumentsIter.hasNext()) {
        instrument = instrumentsIter.next();
        if (uuid.equals(instrument.UUID)) {
            return instrument;
        }
    }
    return false;
};

/**
 * Return specific payment method from customers payment methods list
 * @param {string} customerId Customer id
 * @param {string} paymentMethodName Name of the payment method
 * @return {Object} Payment method from customers payment methods list
 */
function getCustomerPaymentInstruments(customerId, paymentMethodName) {
    var profile = null;

    if (customerId) {
        profile = dw.customer.CustomerMgr.getProfile(customerId.indexOf('_') >= 0 ? customerId.split('_')[1] : customerId);
    } else {
        profile = customer.authenticated ? customer.getProfile() : null;
    }
    if (!profile) {
        return null;
    }
    return profile.getWallet().getPaymentInstruments(paymentMethodName);
}

/**
 * Get customer credit card payment instruments
 * @param {string} customerId Braintree customer id or dw cusomer id. If customer id is null, returns payment instruments of current customer
 * @return {dw.util.Collection} payment instruments
 */
BraintreeHelper.getCustomerCrditCardPaymentInstruments = function (customerId) {
    return getCustomerPaymentInstruments(customerId, dw.order.PaymentInstrument.METHOD_CREDIT_CARD);
};

/**
 * Get customer PayPal payment instruments
 * @param {string} customerId Braintree customer id or dw cusomer id. If customer id is null, returns  of current customer
 * @return {dw.util.Collection} payment instruments
 */
BraintreeHelper.getCustomerPaypalPaymentInstruments = function (customerId) {
    return getCustomerPaymentInstruments(customerId, prefs.paypalMethodName);
};

/**
 * Get default customer PayPal payment instrument
 * @param {string} customerId Braintree customer id or dw cusomer id. If customer id is null, returns payment instruments of current customer
 * @return {dw.customer.CustomerPaymentInstrument} payment instrument
 */
BraintreeHelper.getDefaultCustomerPaypalPaymentInstrument = function (customerId) {
    var instruments = getCustomerPaymentInstruments(customerId, prefs.paypalMethodName);
    if (instruments) {
        var iterator = instruments.iterator();
        var instrument = null;
        while (iterator.hasNext()) {
            instrument = iterator.next();
            if (instrument.custom.braintreeDefaultCard) {
                return instrument;
            }
        }
    }
    return instruments && instruments.length ? instruments[0] : null;
};

/**
 * Get saved PayPal customer payment method instrument
 * @param {string} email PayPal account email
 * @return {dw.util.Collection} payment instruments
 */
BraintreeHelper.getPaypalCustomerPaymentInstrumentByEmail = function (email) {
    var customerPaymentInstruments = BraintreeHelper.getCustomerPaypalPaymentInstruments();
    if (customerPaymentInstruments) {
        var iterator = customerPaymentInstruments.iterator();
        var paymentInst = null;
        while (iterator.hasNext()) {
            paymentInst = iterator.next();
            if (paymentInst.custom.braintreePaypalAccountEmail === email) {
                return paymentInst;
            }
        }
    }

    return null;
};

/**
 * isCountryCodesUpperCase()
 * true - if SiteGenesis uses uppercase for country code values
 * false - if SiteGenesis uses lowercase for country code values
 *
 * @returns {boolean} is country upper case
 */
BraintreeHelper.isCountryCodesUpperCase = function () {
    var countryOptions = null;
    var billingForm = session.forms.billing;
    var isCountryUpperCase = true;
    if (billingForm && billingForm.billingAddress && billingForm.billingAddress.addressFields && billingForm.billingAddress.addressFields.country) {
        countryOptions = billingForm.billingAddress.addressFields.country.getOptions();
        for (var optionName in countryOptions) { // eslint-disable-line no-restricted-syntax, guard-for-in
            var option = countryOptions[optionName];
            if (option.value && option.value.trim() !== '' && option.value === option.value.toLowerCase()) {
                isCountryUpperCase = false;
                break;
            }
        }
    }
    //return isCountryUpperCase;
    return true; //Country code is uppercase
};

/**
 * Apply default shipping method for current cart
 * @param {dw.order.Basket} basket Active basket
 */
BraintreeHelper.addDefaultShipping = function (basket) {
    if (!basket.getDefaultShipment().shippingMethod) {
        try {
            var shippingMethod = dw.order.ShippingMgr.getDefaultShippingMethod();
            Transaction.wrap(function () {
                basket.getDefaultShipment().setShippingMethod(shippingMethod);
                dw.order.ShippingMgr.applyShippingCost(basket);
                dw.system.HookMgr.callHook('dw.order.calculate', 'calculate', basket);
            });
        } catch (e) {

        }

    }
};

/**
 * Returns a prepared custom fields string
 * @param {dw.order.Order} order Order
 * @return {string} custom fields string
 */
BraintreeHelper.getCustomFields = function (order) {
    var paymentInstrument = BraintreeHelper.getBraintreePaymentInstrument(order);
    var paymentProcessorId = dw.order.PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod()).getPaymentProcessor().getID();
    var prefsCustomFields = [];
    var hookMethodName = 'credit';

    switch (paymentProcessorId) {
        case 'BRAINTREE_PAYPAL':
            prefsCustomFields = prefs.BRAINTREE_PAYPAL_Custom_Fields;
            hookMethodName = 'paypal';
            break;
        case 'BRAINTREE_APPLEPAY':
            prefsCustomFields = prefs.BRAINTREE_APPLEPAY_Custom_Fields;
            hookMethodName = 'applepay';
            break;
        case 'BRAINTREE_GOOGLEPAY':
            prefsCustomFields = prefs.BRAINTREE_APPLEPAY_Custom_Fields;
            hookMethodName = 'googlepay';
            break;            
        default: // as 'BRAINTREE_CREDIT'
            prefsCustomFields = prefs.BRAINTREE_CREDIT_Custom_Fields;
            hookMethodName = 'credit';
            break;
    }

    var cfObject = {};
    var piCfs = null;
    for (var fName in prefsCustomFields) { // eslint-disable-line no-restricted-syntax, guard-for-in
        var f = prefsCustomFields[fName];
        var fArr = f.split(':');
        cfObject[fArr[0]] = fArr[1];
    }
    if (dw.system.HookMgr.hasHook('braintree.customFields')) {
        var cfs = dw.system.HookMgr.callHook('braintree.customFields', hookMethodName, { order: order, paymentInstrument: paymentInstrument });
        for (var field in cfs) { // eslint-disable-line no-restricted-syntax, guard-for-in
            cfObject[field] = cfs[field];
        }
    }
    try {
        piCfs = JSON.parse(paymentInstrument.custom.braintreeCustomFields);
    } catch (error) {
        piCfs = {};
    }
    for (var field1 in piCfs) { // eslint-disable-line no-restricted-syntax, guard-for-in
        if (cfObject[field1] === undefined) {
            cfObject[field1] = piCfs[field1];
        }
    }
    var resultStr = '';
    for (var field2 in cfObject) { // eslint-disable-line no-restricted-syntax, guard-for-in
        resultStr += '<' + field2 + '>' + cfObject[field2] + '</' + field2 + '>';
    }
    return resultStr;
};

BraintreeHelper.getNonGiftCertificateAmount = function (basket) {
  // The total redemption amount of all gift certificate payment instruments in the basket.
    var giftCertTotal = new dw.value.Money(0.0, basket.getCurrencyCode());

  // Gets the list of all gift certificate payment instruments
    var gcPaymentInstrs = basket.getGiftCertificatePaymentInstruments();
    var iter = gcPaymentInstrs.iterator();
    var orderPI = null;

  // Sums the total redemption amount.
    while (iter.hasNext()) {
        orderPI = iter.next();
        giftCertTotal = giftCertTotal.add(orderPI.getPaymentTransaction().getAmount());
    }

  // Gets the order total.
    var orderTotal = basket.getTotalGrossPrice();

  // Calculates the amount to charge for the payment instrument.
  // This is the remaining open order total that must be paid.
    var amountOpen = orderTotal.subtract(giftCertTotal);

  // Returns the open amount to be paid.
    return amountOpen;
};

/**
 * Create customer on Braintree side and mark current demandware customer with isBraintree flag
 * @returns {boolean} result
 */
BraintreeHelper.createCustomerOnBraintreeSide = function () {
    try {
        var profile = customer.getProfile();
        BraintreeHelper.callApiMethod('createCustomer', {
            customerId: BraintreeHelper.createCustomerId(customer),
            firstName: profile.getFirstName(),
            lastName: profile.getLastName(),
            email: profile.getEmail(),
            company: profile.getCompanyName(),
            phone: profile.getPhoneMobile() || profile.getPhoneHome() || profile.getPhoneBusiness(),
            fax: profile.getFax()
        });
        Transaction.wrap(function () {
            profile.custom.isBraintree = true;
        });
    } catch (error) {
        return {
            error: error.customMessage ? error.customMessage : error.message
        };
    }
    return true;
};

/**
 * Get billing address from braintree add credit card form
 * **/
BraintreeHelper.getBillingAddress = function(httpParameterMap) {
	var billingAddress = {};
	try {
    	if(httpParameterMap.countryCodeAlpha2) {
    		var countryName = Countries.getCountryNameFromCode(httpParameterMap.countryCodeAlpha2.stringValue);
    	}
    	
    	billingAddress = {
			'firstName': httpParameterMap.firstName ? httpParameterMap.firstName.stringValue : '',
			'lastName': httpParameterMap.lastName ? httpParameterMap.lastName.stringValue: '',
			'streetAddress': httpParameterMap.streetAddress ? httpParameterMap.streetAddress.stringValue : '',
			'extendedAddress': httpParameterMap.extendedAddress ? httpParameterMap.extendedAddress.stringValue : '',
			'locality': httpParameterMap.locality ? httpParameterMap.locality.stringValue: '',
			'region': httpParameterMap.region ? httpParameterMap.region.stringValue : '',
			'countryName': countryName,
			'countryCodeAlpha2': httpParameterMap.countryCodeAlpha2 ? httpParameterMap.countryCodeAlpha2.stringValue : '',
			'postalCode': httpParameterMap.postalCode ? httpParameterMap.postalCode.stringValue : ''
    	};
	}catch(err) {}
	return billingAddress;
}

/**
 * Manually create braintree payment method(on braintree side) for current customer
 * @param {string} nonce Payment method nonce
 * @param {boolean} makeDefault Flag, that indicates if new method is the new default method
 * @return {Object} Responce data from API call
 */
BraintreeHelper.createPaymentMethodOnBraintreeSide = function (nonce, makeDefault) {
    var responseData = null;

    try {
    	var httpParameterMap = request.httpParameterMap;
    	var billingAddress = BraintreeHelper.getBillingAddress(httpParameterMap);
    	responseData = BraintreeHelper.callApiMethod('createPaymentMethod', {
            customerId: BraintreeHelper.createCustomerId(customer),
            paymentMethodNonce: nonce,
            makeDefault: makeDefault,
            cardHolderName: httpParameterMap.dwfrm_creditcard_owner.value,
            billingAddress: billingAddress
        }); 	
    	
    } catch (error) {
        responseData = {
            error: error.customMessage ? error.customMessage : error.message
        };
    }
    return responseData;
};

/**
 * Mark default card for customer
 * **/
BraintreeHelper.saveDefaultCard = function(paymentMethodToken) {
	try {
		var customerPaymentInstruments = BraintreeHelper.getCustomerCrditCardPaymentInstruments();
	    var iterator = customerPaymentInstruments.iterator();
	    var paymentInst = null;

	    Transaction.wrap(function () {
	        while (iterator.hasNext()) {
	            paymentInst = iterator.next();
	            paymentInst.custom.braintreeDefaultCard = (paymentMethodToken === paymentInst.custom.braintreePaymentMethodToken) ? true : false;
	        }
	    });
	} catch(err) {}
}

/**
 * Save credit cart as customer payment method
 * @param {Object} createPaymentMethodResponseData Responce data from createPaymentMethod API call
 * @param {string} creditType card type
 * @param {string} creditOwner Credit card owner
 * @return {Object} Object with cart data
 */
BraintreeHelper.saveCustomerCreditCard = function (createPaymentMethodResponseData, creditType, creditOwner) {
    var card = null;
    try {
        Transaction.begin();

        var customerPaymentInstrument = customer.getProfile().getWallet().createPaymentInstrument(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);

        card = {
            expirationMonth: createPaymentMethodResponseData.creditCard.expirationMonth,
            expirationYear: createPaymentMethodResponseData.creditCard.expirationYear,
            number: Date.now().toString().substr(0, 11) + createPaymentMethodResponseData.creditCard.last4,
            type: creditType,
            owner: creditOwner,
            paymentMethodToken: createPaymentMethodResponseData.creditCard.token
        };

        customerPaymentInstrument.setCreditCardHolder(card.owner);
        customerPaymentInstrument.setCreditCardNumber(card.number);
        customerPaymentInstrument.setCreditCardExpirationMonth(parseInt(card.expirationMonth, 10));
        customerPaymentInstrument.setCreditCardExpirationYear(parseInt(card.expirationYear, 10));
        customerPaymentInstrument.setCreditCardType(card.type);
        customerPaymentInstrument.custom.braintreePaymentMethodToken = card.paymentMethodToken;

        Transaction.commit();
    } catch (error) {
        card = {
            error: error.customMessage ? error.customMessage : error.message
        };
    }
    return card;
};

/**
 * Returns a three-letter abbreviation for this Locale's country, or an empty string if no country has been specified for the Locale
 * 
 * @param {string} localeId
 * @return {string} a three-letter abbreviation for this lLocale's country, or an empty string
 */
BraintreeHelper.getISO3Country = function (localeId) {
    return require('dw/util/Locale').getLocale(localeId).getISO3Country();
};

/**
 * Gets the order discount amount by subtracting the basket's total including the discount from
 * the basket's total excluding the order discount.
 * 
 * @param {dw.order.LineItemCtnr} lineItemContainer - Current users's basket
 * @returns {String} string that contains the value order discount
 */
BraintreeHelper.getOrderLevelDiscountTotal = function (lineItemContainer) {
   return lineItemContainer.getAdjustedMerchandizeTotalPrice(false).subtract(lineItemContainer.getAdjustedMerchandizeTotalPrice(true)).getDecimalValue().toString();
};

/**
 * Gets required Level3 line items 
 * 
 * @param {dw.order.LineItemCtnr} lineItemContainer - Current users's basket
 * @returns {Object} an object with required fields 
 */
BraintreeHelper.getLineItems = function (dataLineItems) {
    return dataLineItems.toArray().map(function(value) {
        return {
            "name": value.getProductName().substring(0, 30),
            "kind": "debit",
            "quantity": value.getQuantityValue(),
            "unitAmount": value.getProduct().getPriceModel().getPrice().toNumberString(),
            "unitOfMeasure": value.getProduct().custom.unitOfMeasure || "",
            "totalAmount": value.getPrice().toNumberString(),
            "taxAmount": value.getTax().toNumberString(),
            "discountAmount": value.getPrice().subtract(value.getProratedPrice()).getDecimalValue().toString(),
            "productCode": value.getProduct().getUPC(),
            "commodityCode": value.getProduct().custom.commodityCode || ""
        };
    });
};

module.exports = BraintreeHelper;