var Transaction = require('dw/system/Transaction');
var HookMgr = require('dw/system/HookMgr');
var PaymentInstrument = require('dw/order/PaymentInstrument');

var prefs = require('~/cartridge/config/braintreePreferences');
var braintreeConstants = require('~/cartridge/scripts/util/braintreeConstants');
var { clearDefaultProperty } = require('~/cartridge/scripts/braintree/helpers/customerHelper');
var { getApplicableCreditCardPaymentInstruments, getLogger } = require('~/cartridge/scripts/braintree/helpers/paymentHelper');
var BasketMgr = require('dw/order/BasketMgr');

/**
 * Parse customer name from single string
 * @param {string} name name string
 * @return {Object} name object
 */
function createFullName(name) {
    var nameNoLongSpaces = name.trim().replace(/\s+/g, ' ').split(' ');

    if (nameNoLongSpaces.length === 1) {
        return {
            firstName: name,
            secondName: null,
            lastName: null
        };
    }
    var firstName = nameNoLongSpaces.shift();
    var lastName = nameNoLongSpaces.pop();
    var secondName = nameNoLongSpaces.join(' ');

    return {
        firstName: firstName,
        secondName: secondName.length ? secondName : null,
        lastName: lastName
    };
}

/**
 * Returns a prepared custom fields string
 * @param {dw.order.Order} order Order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Order payment instrument
 * @return {string} custom fields string
 */
function getCustomFields(order, paymentInstrument) {
    var paymentProcessorId = paymentInstrument.getPaymentTransaction().getPaymentProcessor().ID;
    var prefsCustomFields = prefs.customFields;
    var hookMethodName = paymentProcessorId.split('_')[1].toLowerCase();
    var resultStr = '';
    var cfObject = {};

    for (var fName in prefsCustomFields) {
        var fArr = prefsCustomFields[fName].split(':');
        cfObject[fArr[0]] = fArr[1];
    }

    if (HookMgr.hasHook('braintree.customFields')) {
        var cfs = HookMgr.callHook('braintree.customFields', hookMethodName, { order: order, paymentInstrument: paymentInstrument });
        for (var field in cfs) {
            cfObject[field] = cfs[field];
        }
    }

    for (var field2 in cfObject) {
        resultStr += '<' + field2 + '>' + cfObject[field2] + '</' + field2 + '>';
    }

    return resultStr;
}

/**
 * Return boolean Token Exists value
 * @param  {boolean} isCustomerExistInVault customer vault
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument current payment instrument
 * @returns {boolean} Token Exist
 */
function isTokenExists(isCustomerExistInVault, paymentInstrument) {
    var isTokenAllowed = isCustomerExistInVault &&
        paymentInstrument.creditCardToken &&
        !paymentInstrument.custom.braintreeIs3dSecureRequired;

    return isTokenAllowed || !paymentInstrument.custom.braintreePaymentMethodNonce;
}

/** Returns a three-letter abbreviation for this Locale's country, or an empty string if no country has been specified for the Locale
 *
 * @param {string} localeId locale id
 * @return {string} a three-letter abbreviation for this lLocale's country, or an empty string
 */
function getISO3Country(localeId) {
    return require('dw/util/Locale').getLocale(localeId).getISO3Country();
}

/**
 * Create customer data for API call
 * @param {dw.order.Order} order Order object
 * @return {Object} Customer data for request
 */
function createGuestCustomerData(order) {
    var billingAddress = order.getBillingAddress();
    var shippingAddress = order.getDefaultShipment().getShippingAddress();

    return {
        id: null,
        firstName: billingAddress.getFirstName(),
        lastName: billingAddress.getLastName(),
        email: order.getCustomerEmail(),
        phone: billingAddress.getPhone() || shippingAddress.getPhone(),
        company: '',
        fax: ''
    };
}

/**
 * Create customer data for API call
 * @param {dw.order.Order} order Order object
 * @return {Object} Customer data for request
 */
function createRegisteredCustomerData(order) {
    var billingAddress = order.getBillingAddress();
    var shippingAddress = order.getDefaultShipment().getShippingAddress();
    var profile = customer.getProfile();
    var {
        createCustomerId,
        getPhoneFromProfile
    } = require('~/cartridge/scripts/braintree/helpers/customerHelper');

    return {
        id: createCustomerId(customer),
        firstName: profile.getFirstName(),
        lastName: profile.getLastName(),
        email: profile.getEmail(),
        phone: getPhoneFromProfile(profile) || billingAddress.getPhone() || shippingAddress.getPhone(),
        company: profile.getCompanyName(),
        fax: profile.getFax()
    };
}

/**
 * isCountryCodesUpperCase()
 * true - if SiteGenesis uses uppercase for country code values
 * false - if SiteGenesis uses lowercase for country code values
 *
 * @returns {boolean} is country upper case
 */
function isCountryCodesUpperCase() {
    var countryOptions = null;
    var billingForm = session.forms.billing;
    var isCountryUpperCase = true;

    if (billingForm && billingForm.billingAddress && billingForm.billingAddress.addressFields && billingForm.billingAddress.addressFields.country) {
        countryOptions = billingForm.billingAddress.addressFields.country.getOptions();

        for (var optionName in countryOptions) {
            var option = countryOptions[optionName];

            if (option.value && option.value.trim() !== '' && option.value === option.value.toLowerCase()) {
                isCountryUpperCase = false;
                break;
            }
        }
    }

    return isCountryUpperCase;
}

/**
 * Update Shipping Address
 * @param  {Object} braintreeShippingAddress - shipping address
 * @param  {dw.order.Basket} orderShippingAddress basket - Current users's basket Default Shipment
 */
function updateShippingAddress(braintreeShippingAddress, orderShippingAddress) {
    var fullName = {};
    var customerEmail = '';
    var shipping;
    var currentBasket = BasketMgr.getCurrentBasket();
    var newShipping = typeof braintreeShippingAddress === 'string' ? JSON.parse(braintreeShippingAddress) : braintreeShippingAddress;
    var countryCode = isCountryCodesUpperCase() ?
        newShipping.countryCodeAlpha2.toUpperCase() :
        newShipping.countryCodeAlpha2.toLowerCase();

    if (newShipping.recipientName) {
        fullName = createFullName(newShipping.recipientName);
    } else if (newShipping.firstName && newShipping.lastName) {
        fullName.firstName = newShipping.firstName;
        fullName.lastName = newShipping.lastName;
    }
    customerEmail = currentBasket.getCustomer().profile ? currentBasket.getCustomer().profile.email: newShipping.email;

    try {
        getLogger().warn('Customer email from UpdateShipping:' + customerEmail);
    } catch (e) {}

    Transaction.wrap(function () {
        shipping = orderShippingAddress.getShippingAddress() || orderShippingAddress.createShippingAddress();
        shipping.setCountryCode(countryCode);
        shipping.setCity(newShipping.locality || '');
        shipping.setAddress1(newShipping.streetAddress || '');
        shipping.setAddress2(newShipping.extendedAddress || '');
        shipping.setPostalCode(newShipping.postalCode || '');
        shipping.setStateCode(newShipping.region || '');
        shipping.setPhone(newShipping.phone || '');

        if(!empty(customerEmail)) {
            currentBasket.setCustomerEmail(customerEmail || '');
        }

        if (!empty(fullName.firstName)) {
            shipping.setFirstName(fullName.firstName || '');
        }
        if (!empty(fullName.secondName)) {
            shipping.setSecondName(fullName.secondName || '');
        }
        if (!empty(fullName.lastName)) {
            shipping.setLastName(fullName.lastName || '');
        }
    });
}

/**
 * Save General Transaction Data
 * @param  {dw.order.Order} order Order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Order payment instrument
 * @param  {Object} responseTransaction - response transaction
 */
function saveGeneralTransactionData(order, paymentInstrument, responseTransaction) {
    var Money = require('dw/value/Money');
    var PT = require('dw/order/PaymentTransaction');
    var paymentTransaction = paymentInstrument.getPaymentTransaction();
    var transaction = responseTransaction.transaction || responseTransaction;
    var transactionStatus = transaction.status;

    paymentTransaction.setTransactionID(transaction.legacyId);
    paymentTransaction.setAmount(new Money(transaction.amount.value, order.getCurrencyCode()));

    order.custom.isBraintree = true;
    order.custom.braintreePaymentStatus = transactionStatus;

    paymentInstrument.custom.braintreePaymentMethodNonce = null;

    if (!prefs.isSettle && transactionStatus === braintreeConstants.TRANSACTION_STATUS_AUTHORIZED) {
        paymentTransaction.setType(PT.TYPE_AUTH);
    } else if (prefs.isSettle &&
        (transactionStatus === braintreeConstants.TRANSACTION_STATUS_SETTLING ||
            transactionStatus === braintreeConstants.TRANSACTION_STATUS_SUBMITTED_FOR_SETTLEMENT)) {
        paymentTransaction.setType(PT.TYPE_CAPTURE);
    }
}

/**
 * Create Base Sale Transaction Data
 * @param  {dw.order.Order} order Order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Order payment instrument
 * @param {Object} prefsData preferencies data settings
 * @returns {Object} data fields
 */
function createBaseSaleTransactionData(order, paymentInstrument, prefsData) {
    var { createCustomerId } = require('~/cartridge/scripts/braintree/helpers/customerHelper');
    var {
        getAmountPaid,
        createShippingAddressData,
        getOrderLevelDiscountTotal,
        getLineItems,
        getMerchantAccountID
    } = require('~/cartridge/scripts/braintree/helpers/paymentHelper');
    var customer = order.getCustomer();
    var isUsedAlreadySavedPaymentMethod = false;

    var data = {
        orderId: order.getOrderNo(),
        amount: getAmountPaid(order).getValue(),
        currencyCode: order.getCurrencyCode(),
        customFields: getCustomFields(order, paymentInstrument),
        options: {
            submitForSettlement: prefsData.isSettle
        },
        merchantAccountId: getMerchantAccountID(order.getCurrencyCode())
    };

    if (customer.isRegistered()) {
        data.customerId = customer.profile.custom.braintreeCustomerId || createCustomerId(customer);
    } else {
        data.customerId = null;
        data.customer = customer.isRegistered() ?
            createRegisteredCustomerData(order) :
            createGuestCustomerData(order);
    }

    if (isTokenExists(customer.isRegistered(), paymentInstrument)) {
        data.paymentMethodToken = paymentInstrument.creditCardToken;
        isUsedAlreadySavedPaymentMethod = true;
    } else {
        data.paymentMethodNonce = paymentInstrument.custom.braintreePaymentMethodNonce;
    }

    if (prefsData.isL2L3) {
        var shipping = createShippingAddressData(order.getDefaultShipment().getShippingAddress());
        if (order.getCustomerLocaleID().split('_')[1].toLowerCase() === shipping.countryCode.toLowerCase()) {
            shipping.countryCode = getISO3Country(order.getCustomerLocaleID());
        }

        data.shipping = shipping;
        data.taxAmount = order.getTotalTax().toNumberString();

        if (paymentInstrument.paymentMethod === braintreeConstants.PAYMENT_METHOD_ID_PAYPAL) {
            /** Rounding issues due to discounts, removed from scope due to bug on PayPal / BT end.
             * No ETA on bug fix and not in roadmap.
             *
             * data.shippingAmount = order.getShippingTotalPrice().value;
             * data.discountAmount = getOrderLevelDiscountTotal(order);
             * data.lineItems = getLineItems(order.productLineItems);
             */
        } else {
            data.shippingAmount = order.getShippingTotalPrice().toNumberString();
            data.discountAmount = getOrderLevelDiscountTotal(order);
            data.lineItems = getLineItems(order);
        }
    }

    if (isUsedAlreadySavedPaymentMethod) {
        data.customerId = null;
    }

    var isUsedGooglepayPaymentMehtod = paymentInstrument.paymentMethod === braintreeConstants.PAYMENT_METHOD_ID_GOOGLEPAY;
    var isVaultingAllowed = !isUsedGooglepayPaymentMehtod ||
        (isUsedGooglepayPaymentMehtod &&
            session.privacy.googlepayPaymentType === braintreeConstants.GOOGLEPAY_TYPE_ANDROID_PAY_CARD);

    if (prefsData.vaultMode && isVaultingAllowed && !isUsedAlreadySavedPaymentMethod) {
        data.vaultPaymentMethodAfterTransacting = {
            when: braintreeConstants.TRANSACTION_VAULT_ON_SUCCESS
        };
    }

    return data;
}

/**
 * @param {Object} createPaymentMethodResponseData Payment method response data from Braintree response
 * @returns {Object} Card name
 */
function createOwnerName(createPaymentMethodResponseData) {
    var { firstName, lastName } = createPaymentMethodResponseData.customer;

    return (firstName || '') + ' ' + (lastName || '');
}

/**
 * Saves parameters of the credit card
 * @param {Object} createPaymentMethodResponseData Payment method response data from Braintree response
 * @param {string} paymentMethodId Payment method id
 * @param {string} creditOwner Credit card owner
 * @returns {Object} Object with token
 */
function saveGeneralPaymentMethodParameters(createPaymentMethodResponseData, paymentMethodId, creditOwner) {
    var customerPaymentInstrumentObject;
    var paymentMethodData = createPaymentMethodResponseData.paymentMethod;
    var response = createPaymentMethodResponseData.paymentMethodSnapshot || paymentMethodData.details;
    var customerWallet = customer.getProfile().getWallet();
    // modify card type to appropriate format
    var type = response.brandCode.toLowerCase();
    var cardType = type.replace(/_/g, ' ').replace(type.charAt(0), (type.charAt(0)).toUpperCase());

    var card = {
        expirationMonth: response.expirationMonth,
        expirationYear: response.expirationYear,
        number: Date.now().toString().substr(0, 11) + response.last4,
        type: cardType,
        paymentMethodToken: paymentMethodData.legacyId,
        owner: creditOwner || createOwnerName(paymentMethodData)
    };

    clearDefaultProperty(getApplicableCreditCardPaymentInstruments());

    Transaction.wrap(function () {
        var customerPaymentInstrument = customerWallet.createPaymentInstrument(paymentMethodId);
        customerPaymentInstrument.setCreditCardHolder(card.owner);
        customerPaymentInstrument.setCreditCardNumber(card.number);
        customerPaymentInstrument.setCreditCardExpirationMonth(parseInt(card.expirationMonth, 10));
        customerPaymentInstrument.setCreditCardExpirationYear(parseInt(card.expirationYear, 10));
        customerPaymentInstrument.setCreditCardType(card.type);
        customerPaymentInstrument.creditCardToken = card.paymentMethodToken;
        customerPaymentInstrument.custom.braintreeDefaultCard = true;
        customerPaymentInstrumentObject = customerPaymentInstrument;
    });

    return {
        customerPaymentInstrument: customerPaymentInstrumentObject,
        error: false
    };
}

/**
 * Saves GooglePay account
 * @param {Object} createPaymentMethodResponseData Response from BT API
 * @returns {Object} Object
 */
function saveGooglePayAccount(createPaymentMethodResponseData) {
    var googlePayAccount = saveGeneralPaymentMethodParameters(createPaymentMethodResponseData, prefs.paymentMethods.BRAINTREE_GOOGLEPAY.paymentMethodId);
    var braintreeGooglePayCustomerId = createPaymentMethodResponseData.customer ? createPaymentMethodResponseData.customer.legacyId : createPaymentMethodResponseData.paymentMethod.customer.legacyId;

    Transaction.wrap(function () {
        googlePayAccount.customerPaymentInstrument.custom.braintreeGooglePayCustomerId = braintreeGooglePayCustomerId;
    });

    return googlePayAccount;
}

/**
 * Saves SRC account
 * @param {Object} createPaymentMethodResponseData Response from BT API
 * @returns {Object} Object
 */
function saveSrcAccount(createPaymentMethodResponseData) {
    return saveGeneralPaymentMethodParameters(createPaymentMethodResponseData, prefs.paymentMethods.BRAINTREE_SRC.paymentMethodId);
}

/**
 * Save credit cart as customer payment method
 * @param {Object} createPaymentMethodResponseData Response from BT API
 * @param {string} creditOwner Credit card owner.
 * @returns {Object} Object with token
 */
function saveCustomerCreditCard(createPaymentMethodResponseData, creditOwner) {
    return saveGeneralPaymentMethodParameters(createPaymentMethodResponseData, PaymentInstrument.METHOD_CREDIT_CARD, creditOwner);
}

/**
 * Saves PayPal account
 * @param {Object} createPaymentMethodResponseData payment method response data
 * @param  {string} accountAddresses Braintree paypal account addresses
 * @param  {string} paypalToken token - is passed from PP processor in case of checkout from PDP/minicart/cart
 * @returns {Object} Object with token
 */
function savePaypalAccount(createPaymentMethodResponseData, accountAddresses, paypalToken) {
    // token passed from processor || token taken from response in case of saving on account page
    var token = paypalToken || createPaymentMethodResponseData.legacyId;
    var paypalEmail = createPaymentMethodResponseData.details ? createPaymentMethodResponseData.details.email :
        createPaymentMethodResponseData.transaction.paymentMethodSnapshot.payer.email;

    Transaction.wrap(function () {
        var customerPaymentInstrument = customer.getProfile().getWallet().createPaymentInstrument(prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId);
        customerPaymentInstrument.setCreditCardType(braintreeConstants.CREDIT_CARD_TYPE_VISA); // hack for MFRA account.js line 99 (paymentInstrument.creditCardType.toLowerCase())
        customerPaymentInstrument.creditCardToken = token;
        customerPaymentInstrument.custom.braintreePaypalAccountEmail = paypalEmail;
        customerPaymentInstrument.custom.braintreePaypalAccountAddresses = accountAddresses;
    });

    return {
        token: token
    };
}

/**
 * Extract passed billing address from httpParamMap
 * @param {string} newBillingAddressAsString httpParameterMap.{billing address}.stringValue
 * @returns {Object} object or false in case if no new billing address
 */
function getBillingAddressFromStringValue(newBillingAddressAsString) {
    try {
        if (newBillingAddressAsString && newBillingAddressAsString !== '{}') {
            return JSON.parse(newBillingAddressAsString);
        }
    } catch (error) {
        return false;
    }
}

/**
 * Identify if session paypal account is used.
 * @param {dw.web.HttpParameterMap} httpParameterMap needed for extracting of braintreePaypalNonce value
 * @returns {boolean} true in case we have nonce on paramMap. false otherwise
 */
function isSessionPayPalAccountUsed(httpParameterMap) {
    var nonce = httpParameterMap.braintreePaypalNonce.stringValue;

    return nonce && nonce.length !== 0;
}

/**
 * Saves Venmo account
 * @param {Object} createPaymentMethodResponseData payment method response data
 * @returns {Object} Object with token
 */
function saveVenmoAccount(createPaymentMethodResponseData) {
    var paymentMethodResponseData = createPaymentMethodResponseData.paymentMethodSnapshot || createPaymentMethodResponseData.paymentMethod.details;
    var paymentMethodData = createPaymentMethodResponseData.paymentMethod;

    Transaction.wrap(function () {
        var customerPaymentInstrument = customer.getProfile().getWallet().createPaymentInstrument(prefs.paymentMethods.BRAINTREE_VENMO.paymentMethodId);
        customerPaymentInstrument.setCreditCardType(braintreeConstants.CREDIT_CARD_TYPE_VISA); // hack for MFRA account.js line 99 (paymentInstrument.creditCardType.toLowerCase())
        customerPaymentInstrument.creditCardToken = paymentMethodData.legacyId;
        customerPaymentInstrument.custom.braintreeVenmoUserId = paymentMethodResponseData.venmoUserId;
    });

    return {
        token: paymentMethodData.legacyId
    };
}

/**
 * Create Preferred Address object from CustomerAddress Class
 * @param  {dw.customer.CustomerAddress} customerAddress - Current customer's address that has been defined as the customer's preferred address.
 * @returns {Object} Preferred Address obj
 */
function createPreferredAddressObj(customerAddress) {
    return {
        recipientName: customerAddress.getFullName(),
        firstName: customerAddress.getFirstName(),
        secondName: customerAddress.getSecondName(),
        lastName: customerAddress.getLastName(),
        countryCodeAlpha2: customerAddress.getCountryCode().value,
        locality: customerAddress.getCity(),
        streetAddress: customerAddress.getAddress1(),
        extendedAddress: customerAddress.getAddress2(),
        postalCode: customerAddress.getPostalCode(),
        region: customerAddress.getStateCode(),
        phone: customerAddress.getPhone()
    };
}

/**
 * Verifies if transaction status refers to successful
 * @param {Object} responseTransaction transaction response
 * @param {Object} paymentInstrument Payment instrument
 * @param {Object} order current order
 */
function verifyTransactionStatus(responseTransaction, paymentInstrument, order) {
    var successfulStatuses = [
        braintreeConstants.TRANSACTION_STATUS_AUTHORIZED,
        braintreeConstants.TRANSACTION_STATUS_SETTLED,
        braintreeConstants.TRANSACTION_STATUS_SETTLEMENT_PENDING,
        braintreeConstants.TRANSACTION_STATUS_SETTLING,
        braintreeConstants.TRANSACTION_STATUS_SUBMITTED_FOR_SETTLEMENT
    ];

    var transaction = responseTransaction.transaction || responseTransaction;
    var legacyId = transaction.legacyId;
    var transactionStatus = transaction.status;

    if (successfulStatuses.indexOf(transactionStatus) === -1) {
        if (legacyId) {
            Transaction.wrap(function () {
                var paymentTransaction = paymentInstrument.getPaymentTransaction();
                paymentTransaction.setTransactionID(legacyId);
                order.custom.braintreePaymentStatus = transactionStatus;
            });
        }

        throw new Error(transactionStatus);
    }
}

/**
 * Checks if used card is session (new) card
 * @param {string} selectedCreditCardUuid card value
 * @returns {boolean} value whether used card is session (new) card
 */
function isUsedSessionCreditCard(selectedCreditCardUuid) {
    return selectedCreditCardUuid && selectedCreditCardUuid === braintreeConstants.SESSION_CARD;
}

/**
 * Checks if used card is already saved card
 * @param {string} selectedCreditCardUuid card value
 * @returns {boolean} value whether used card is saved card
 */
function isUsedSavedCardMethod(selectedCreditCardUuid) {
    return !isUsedSessionCreditCard(selectedCreditCardUuid);
}

/**
 * Checks if used session card is already saved to basket's payment instrument
 * @param {Object} braintreePaymentMethodNonce request.httpParameterMap.braintreePaymentMethodNonce
 * @param {dw.order.PaymentInstrument} creditCardBasketPaymentInstrument basket.getPaymentInstruments(PaymentInstrument.METHOD_CREDIT_CARD)
 * @returns {boolean} whether used session card is already saved to basket PI
 */
function isSessionCardAlreadyUsed(braintreePaymentMethodNonce, creditCardBasketPaymentInstrument) {
    return !empty(creditCardBasketPaymentInstrument) && creditCardBasketPaymentInstrument[0].custom.braintreePaymentMethodNonce === braintreePaymentMethodNonce;
}

/**
 * Returns object with data from credit card form
 * @param {Object} creditCardForm session.forms.billing.creditCardFields
 * @returns {Object} credit card data
 */
function getUsedCreditCardFromForm(creditCardForm) {
    return {
        creditCardType: creditCardForm.cardType.value,
        creditCardNumber: creditCardForm.cardNumber.value,
        creditCardHolder: creditCardForm.cardOwner.value,
        creditCardExpirationMonth: parseInt(creditCardForm.expirationMonth.htmlValue, 10),
        creditCardExpirationYear: parseInt(new Date().getFullYear().toString().substr(0, 2) + creditCardForm.expirationYear.htmlValue, 10)
    };
}

module.exports = {
    updateShippingAddress: updateShippingAddress,
    saveGeneralTransactionData: saveGeneralTransactionData,
    createBaseSaleTransactionData: createBaseSaleTransactionData,
    createGuestCustomerData: createGuestCustomerData,
    isCountryCodesUpperCase: isCountryCodesUpperCase,
    saveSrcAccount: saveSrcAccount,
    saveCustomerCreditCard: saveCustomerCreditCard,
    savePaypalAccount: savePaypalAccount,
    saveVenmoAccount: saveVenmoAccount,
    saveGooglePayAccount: saveGooglePayAccount,
    createPreferredAddressObj: createPreferredAddressObj,
    verifyTransactionStatus: verifyTransactionStatus,
    isSessionPayPalAccountUsed: isSessionPayPalAccountUsed,
    getBillingAddressFromStringValue: getBillingAddressFromStringValue,
    isUsedSessionCreditCard: isUsedSessionCreditCard,
    isUsedSavedCardMethod: isUsedSavedCardMethod,
    isSessionCardAlreadyUsed: isSessionCardAlreadyUsed,
    getUsedCreditCardFromForm: getUsedCreditCardFromForm
};