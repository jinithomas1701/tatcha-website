'use strict';

var Resource = require('dw/web/Resource');
var Logger = require('dw/system/Logger');
var HookMgr = require('dw/system/HookMgr');
var ShippingMgr = require('dw/order/ShippingMgr');
var Money = require('dw/value/Money');
var Transaction = require('dw/system/Transaction');

var paymentHelper = {};
var braintreeConstants = require('~/cartridge/scripts/util/braintreeConstants');

const allowedProcessorsIds = [
    braintreeConstants.PAYMENT_PROCCESSOR_ID_BRAINTREE_CREDIT,
    braintreeConstants.PAYMENT_PROCCESSOR_ID_BRAINTREE_PAYPAL,
    braintreeConstants.PAYMENT_PROCCESSOR_ID_BRAINTREE_APPLEPAY,
    braintreeConstants.PAYMENT_PROCCESSOR_ID_BRAINTREE_VENMO,
    braintreeConstants.PAYMENT_PROCCESSOR_ID_BRAINTREE_SRC,
    braintreeConstants.PAYMENT_PROCCESSOR_ID_BRAINTREE_LOCAL,
    braintreeConstants.PAYMENT_PROCCESSOR_ID_BRAINTREE_GOOGLEPAY
];

/**
 * Calculate amount of gift certificates in the order
 * @param {dw.order.Order} order Order object
 * @return {dw.value.Money} Certificates total
 */
paymentHelper.calculateAppliedGiftCertificatesAmount = function (order) {
    var amount = new Money(0, order.getCurrencyCode());
    var paymentInstruments = order.getGiftCertificatePaymentInstruments();

    var iterator = paymentInstruments.iterator();
    var paymentInstrument = null;

    while (iterator.hasNext()) {
        paymentInstrument = iterator.next();
        amount = amount.add(paymentInstrument.getPaymentTransaction().getAmount());
    }

    return amount;
};

/**
 * Calculate order amount
 * @param {dw.order.Order} order Order object
 * @return {dw.value.Money} New Amount value
 */
paymentHelper.getAmountPaid = function (order) {
    var appliedGiftCertificatesAmount = paymentHelper.calculateAppliedGiftCertificatesAmount(order);
    var amount = order.getTotalGrossPrice().subtract(appliedGiftCertificatesAmount);

    return amount;
};

/**
 * Returns whether basket has only giftCertificates
 * @param {dw.order.Basket} basket - user's basket
 * @returns {boolean}  true or false
 */
paymentHelper.hasOnlyGiftCertificates = function (basket) {
    return (basket && basket.giftCertificateLineItems.length > 0 && basket.productLineItems.length === 0);
};

/**
 * Creates or get logger
 *
 * @returns {Object} Object with logger for API operation
 */
paymentHelper.getLogger = function () {
    var prefs = require('~/cartridge/config/braintreePreferences');
    var errorMode = prefs.loggingMode !== 'none' && prefs.loggingMode;
    var logger = Logger.getLogger('Braintree', 'Braintree_General');

    return {
        error: function (msg) {
            if (errorMode) logger.error(msg);
        },
        info: function (msg) {
            if (errorMode && errorMode !== 'errors') logger.info(msg);
        },
        warn: function (msg) {
            if (errorMode && errorMode !== 'errors') logger.warn(msg);
        }
    };
};

/**
 * Check if Paypal button is enabled
 * @param {string} targetPage prefs value
 * @return {boolean} disabled or enabled
 */
paymentHelper.isPaypalButtonEnabled = function (targetPage) {
    var prefs = require('~/cartridge/config/braintreePreferences');
    var displayPages = prefs.paypalButtonLocation.toLowerCase();

    if (displayPages === 'none' || !targetPage) {
        return false;
    }

    return displayPages.indexOf(targetPage) !== -1;
};

/**
 * Create address data
 * @param {dw.order.OrderAddress} address Address data from order
 * @return {Object} transformed data object
 */
paymentHelper.createAddressData = function (address) {
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
 * Create shipping address data for request
 * @param {dw.order.OrderAddress} address Address data from order
 * @return {Object} transformed data object
 */
paymentHelper.createShippingAddressData = function (address) {
    return {
        company: address.getCompanyName(),
        countryCode: address.getCountryCode().getValue().toUpperCase(),
        countryName: address.getCountryCode().getDisplayValue(),
        firstName: address.getFirstName(),
        lastName: address.getLastName(),
        locality: address.getCity(),
        postalCode: address.getPostalCode(),
        region: address.getStateCode(),
        streetAddress: address.getAddress1(),
        extendedAddress: address.getAddress2()
    };
};

/**
 * Get braintree payment instrument from array of payment instruments
 * @param {dw.order.LineItemCtnr} lineItemContainer Order object
 * @return {dw.order.OrderPaymentInstrument} Braintree Payment Instrument
 */
paymentHelper.getBraintreePaymentInstrument = function (lineItemContainer) {
    var paymentInstruments = lineItemContainer.getPaymentInstruments();
    var iterator = paymentInstruments.iterator();

    while (iterator.hasNext()) {
        var paymentInstrument = iterator.next();
        var paymentProcessorId = paymentInstrument.getPaymentTransaction().getPaymentProcessor().ID;

        if (allowedProcessorsIds.indexOf(paymentProcessorId) !== -1) {
            return paymentInstrument;
        }
    }

    return null;
};

/**
 * Delete all braintree payment instruments from the lineItemContainer
 * @param {dw.order.LineItemCtnr} lineItemContainer Order object
 */
paymentHelper.deleteBraintreePaymentInstruments = function (lineItemContainer) {
    var braintreePaymentInstrument = paymentHelper.getBraintreePaymentInstrument(lineItemContainer);

    if (braintreePaymentInstrument) {
        lineItemContainer.removePaymentInstrument(braintreePaymentInstrument);
    }
};

/**
 * Apply default shipping method for current cart
 * @param {dw.order.Basket} basket Active basket
 */
paymentHelper.addDefaultShipping = function (basket) {
    if (basket.getDefaultShipment().shippingMethod) {
        return;
    }

    var shippingMethod = ShippingMgr.getDefaultShippingMethod();

    Transaction.wrap(function () {
        basket.getDefaultShipment().setShippingMethod(shippingMethod);
        ShippingMgr.applyShippingCost(basket);
        HookMgr.callHook('dw.order.calculate', 'calculate', basket);
    });
};

paymentHelper.getNonGiftCertificateAmount = function (basket) {
    // The total redemption amount of all gift certificate payment instruments in the basket.
    var giftCertTotal = new Money(0.0, basket.getCurrencyCode());

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
 * Gets the order discount amount by subtracting the basket's total including the discount from
 * the basket's total excluding the order discount.
 *
 * @param {dw.order.LineItemCtnr} lineItemContainer - Current users's basket
 * @returns {string} string that contains the value order discount
 */
paymentHelper.getOrderLevelDiscountTotal = function (lineItemContainer) {
    return lineItemContainer.getAdjustedMerchandizeTotalPrice(false).subtract(lineItemContainer.getAdjustedMerchandizeTotalPrice(true)).getDecimalValue().toString();
};

/**
 * Gets required Level3 line items
 *
 * @param {dw.order.Order} order Current users's order object
 * @returns {Object} an object with required fields
 */
paymentHelper.getLineItems = function (order) {
    var productsData = [];
    var gcData = [];
    var productLineItems = order.productLineItems;
    var gcLineItems = order.giftCertificateLineItems;

    if (!empty(productLineItems)) {
        productsData = productLineItems.toArray().map(function (value) {
            return {
                name: value.getProductName().substring(0, 30),
                kind: braintreeConstants.LINE_ITEMS_KIND,
                quantity: value.getQuantityValue(),
                unitAmount: value.getProduct().getPriceModel().getPrice().toNumberString(),
                unitOfMeasure: value.getProduct().custom.unitOfMeasure || '',
                totalAmount: value.getPrice().toNumberString(),
                taxAmount: value.getTax().toNumberString(),
                discountAmount: value.getPrice().subtract(value.getProratedPrice()).getDecimalValue().toString(),
                productCode: value.getProduct().getUPC(),
                commodityCode: value.getProduct().custom.commodityCode || ''
            };
        });
    }
    if (!empty(gcLineItems)) {
        gcData = gcLineItems.toArray().map(function (value) {
            return {
                name: ('Gift - ' + value.recipientEmail).substring(0, 30),
                kind: braintreeConstants.LINE_ITEMS_KIND,
                quantity: 1,
                unitAmount: value.getPrice().toNumberString(),
                unitOfMeasure: '',
                totalAmount: value.getPrice().toNumberString(),
                taxAmount: value.getTax().toNumberString(),
                discountAmount: '',
                productCode: '',
                commodityCode: ''
            };
        });
    }

    return productsData.concat(gcData);
};

/**
 * Deletes payment method from customer's payment instrument (wallet)
 * @param {string} creditCardToken token of payment method which must be removed
 * @param {dw.customer.CustomerMgr} customerProfile Customer profile. Used when billing agreement was revoked
 */
paymentHelper.deletePaymentInstrumentFromDwCustomer = function (creditCardToken, customerProfile) {
    var { find } = require('*/cartridge/scripts/util/array');
    var profile = customer.profile || customerProfile;
    var customerPaymentInstruments = profile.wallet.getPaymentInstruments();

    if (empty(customerPaymentInstruments)) {
        return;
    }

    try {
        Transaction.wrap(function () {
            profile.getWallet().removePaymentInstrument(find(customerPaymentInstruments, function (paymentInst) {
                return creditCardToken === paymentInst.creditCardToken;
            }));
        });
    } catch (error) {
        throw new Error(error);
    }
};

/**
 * Returns Active Payment Methods
 *
 * Setting isActive to true
 * Saves paymentMethodId to refs.paymentMethods
 *
 * @returns {Object} an object with active payment Methods
 */
paymentHelper.getActivePaymentMethods = function () {
    const activePaymentMethods = require('dw/order/PaymentMgr').getActivePaymentMethods();
    var paymentMethods = {
        BRAINTREE_CREDIT: {},
        BRAINTREE_PAYPAL: {},
        BRAINTREE_APPLEPAY: {},
        BRAINTREE_VENMO: {},
        BRAINTREE_LOCAL: {},
        BRAINTREE_GOOGLEPAY: {},
        BRAINTREE_SRC: {}
    };

    Array
        .filter(activePaymentMethods, function (paymentMethod) {
            return paymentMethod.paymentProcessor && allowedProcessorsIds.indexOf(paymentMethod.paymentProcessor.ID) !== -1;
        })
        .forEach(function (paymentMethod) {
            const processorId = paymentMethod.paymentProcessor.ID;
            if (processorId === braintreeConstants.PAYMENT_PROCCESSOR_ID_BRAINTREE_LOCAL) {
                if (!paymentMethods[processorId].isActive) {
                    paymentMethods[processorId] = {
                        isActive: true,
                        paymentMethodIds: [paymentMethod.ID]
                    };
                } else {
                    paymentMethods[processorId].paymentMethodIds.push(paymentMethod.ID);
                }
            } else {
                paymentMethods[processorId] = {
                    isActive: true,
                    paymentMethodId: paymentMethod.ID
                };
            }
        });

    return paymentMethods;
};

/**
 * Returns Applicable Local Payment Methods
 *
 * All parameters are optional, and if not specified, the respective restriction won't be validated.
 * For example, if a method is restricted by billing country, but no country code is specified,
 * this method will be returned, unless it is filtered out by customer group or payment amount.
 *
 * @param {Object} parameters - paymentMethodIds, applicablePaymentMethods
 * @returns {Array} array of applicable payment methods ID's of current site
 */
paymentHelper.getApplicableLocalPaymentMethods = function (parameters) {
    var applicablePM = parameters.applicablePaymentMethods
        .map(function (paymentMethod) {
            return paymentMethod.ID;
        });

    return parameters.paymentMethodIds.filter(function (paymentMethod) {
        return applicablePM.indexOf(paymentMethod) !== -1;
    });
};

/**
 * Return Active Local Payment Method
 *
 * @param {dw.order.Order} order Order object
 * @returns {string} id of active payment method
 */
paymentHelper.getActiveLocalPaymentMethod = function (order) {
    var paymentInstruments = order.getPaymentInstruments();
    var iterator = paymentInstruments.iterator();

    while (iterator.hasNext()) {
        var paymentInstrument = iterator.next();
        var paymentProcessorId = paymentInstrument.getPaymentTransaction().getPaymentProcessor().ID;

        if (paymentProcessorId === braintreeConstants.PAYMENT_PROCCESSOR_ID_BRAINTREE_LOCAL) {
            return paymentInstrument.getPaymentMethod();
        }
    }

    return null;
};

/**
 * Return GooglePay Card Description
 *
 * @param {dw.order.Order} order Order object
 * @returns {string} card number or null
 */
paymentHelper.getGooglepayCardDescriprionFromOrder = function (order) {
    var paymentInstruments = order.getPaymentInstruments();
    var iterator = paymentInstruments.iterator();
    var gpCardDescription = null;

    while (iterator.hasNext()) {
        var paymentInstrument = iterator.next();
        var paymentProcessorId = paymentInstrument.getPaymentTransaction().getPaymentProcessor().ID;

        if (paymentProcessorId === braintreeConstants.PAYMENT_PROCCESSOR_ID_BRAINTREE_GOOGLEPAY) {
            gpCardDescription = paymentInstrument.custom.braintreeGooglePayCardDescription;
        }
    }

    var gpCardDescriptionData = gpCardDescription && gpCardDescription.split(' ');

    return !empty(gpCardDescriptionData) ? gpCardDescriptionData[0] + '....' + gpCardDescriptionData[1] : null;
};

/**
* Update Billing Address for order
* @param {dw.order.Order} order Order object
* @param  {Object} billingDetails user's billing address
*/
paymentHelper.updateOrderBillingAddress = function (order, billingDetails) {
    const { firstName, lastName, phone, countryCode, email } = billingDetails;

    Transaction.wrap(function () {
        var billing = order.getBillingAddress() || order.createBillingAddress();
        billing.setFirstName(firstName || billing.firstName);
        billing.setLastName(lastName || billing.lastName);
        billing.setCountryCode(countryCode || billing.countryCode.value);

        if (empty(billing.phone)) {
            billing.setPhone(phone || billing.phone);
        }
        if (empty(order.customerEmail)) {
            order.setCustomerEmail(email);
        }
    });
};

/**
 * Gets current Wallet selected payment instrument
 *
 * @param {dw.util.Collection}  paymentInstruments customers current basket profile wallet payment instruments
 * @param {string}  paymentMethod selected payment method
 * @returns {Object} selected instrument
 */
paymentHelper.getWalletPaymentInstrument = function (paymentInstruments, paymentMethod) {
    return Array.filter(paymentInstruments, function (paymentInstrument) {
        return paymentInstrument.paymentMethod.indexOf(paymentMethod) !== -1;
    });
};

/**
 * Saves error text to session based on error code or status
 * @param {string} errorStatus status of transaction which should be handled as error case
 */
paymentHelper.handleErrorCode = function (errorStatus) {
    var declinedPaymentErrorMessage = Resource.msg('braintree.error.2000', 'locale', 'null');
    var networkIssueErrorMessage = Resource.msg('braintree.error.3000', 'locale', 'null');

    if (session.privacy.braintreeErrorCode) {
        var firstLetter = session.privacy.braintreeErrorCode.charAt(0);

        if (firstLetter === '2') {
            session.privacy.braintreeErrorMsg = declinedPaymentErrorMessage;
        } else if (firstLetter === '3') {
            session.privacy.braintreeErrorMsg = networkIssueErrorMessage;
        } else if (session.privacy.braintreeErrorCode === '91564') {
            session.privacy.braintreeErrorMsg = Resource.msg('braintree.error.91564', 'locale', 'null');
        }

        session.privacy.braintreeErrorCode = null;
    }

    if (errorStatus) {
        var unsuccessfulStatuses = ['PROCESSOR_DECLINED', 'GATEWAY_REJECTED', 'FAILED'];

        if (unsuccessfulStatuses.indexOf(errorStatus) !== -1) {
            session.privacy.braintreeErrorMsg = declinedPaymentErrorMessage;
        }
    }
};

/**
 * Get Account Form Fields
 * @param {Object} paymentForm billing Form
 * @param {Object} data array of form keys
 * @return {Object} of form fields with names and values
 */
paymentHelper.getAccountFormFields = function (paymentForm, data) {
    paymentForm.clear();

    return Array.reduce(
        Object.keys(data),
        function (fields, key) {
            if (Object.prototype.hasOwnProperty.call(paymentForm, key)) {
                fields[key] = {
                    name: paymentForm[key].htmlName,
                    value: data[key] !== null ? data[key] : ''
                };
            }

            return fields;
        }, {});
};

/**
 * Returns Applicable Credit Card Payment Instruments
 * Allowed Credit Card Processors Ids:
 *  -BRAINTREE_CREDIT
 *  -BRAINTREE_GOOGLEPAY
 *  -BRAINTREE_SRC
 *
 ** Use allowedCreditCardProcessorsIds to add more Credit Card Processors
 * @returns {Array} array of applicable Credit Card Payment Instruments of current site
 */
paymentHelper.getApplicableCreditCardPaymentInstruments = function () {
    if (!customer.authenticated) return [];

    var customerWalletPaymentInstruments = customer.getProfile().getWallet().getPaymentInstruments();
    var activePaymentMethods = paymentHelper.getActivePaymentMethods();
    const allowedCreditCardProcessorsIds = [
        activePaymentMethods.BRAINTREE_CREDIT.paymentMethodId,
        activePaymentMethods.BRAINTREE_GOOGLEPAY.paymentMethodId,
        activePaymentMethods.BRAINTREE_SRC.paymentMethodId
    ];

    return Array
        .filter(customerWalletPaymentInstruments, function (paymentInstrument) {
            return allowedCreditCardProcessorsIds.indexOf(paymentInstrument.paymentMethod) !== -1;
        });
};

/** Return string of Secure Remote Commerce url and add params to base url
 * @param {string} baseUrl base url of Secure Remote Commerce image
 * @param {Object} params object of url params
 * @returns {string} string of Secure Remote Commerce image url
 */
paymentHelper.createSRCImageUrl = function (baseUrl, params) {
    if (empty(params)) return baseUrl;

    var queryString = Object.keys(params).map(function (key) {
        return key + '=' + params[key];
    }).join('&');

    return baseUrl + '?' + queryString;
};

/** Creates Checkout Billing Form fields obj + include following xml files:
 *  -'addressFields' => address.xml
 *  -'contactInfoFields' => contactInfo.xml
 * USE [] to add new form id's
 * Please Note: newly added files must be include in billing.xml
 * @returns {Object} object with billing form fields
 */
paymentHelper.createBillingFormFields = function () {
    var billingForm = require('server').forms.getForm('billing');
    var formsObj = {};

    ['addressFields', 'contactInfoFields'].forEach(function (item) {
        if (billingForm[item]) {
            Object.assign(formsObj, billingForm[item]);
            delete billingForm[item];
        }
    });

    // states handle
    formsObj.stateCode = formsObj.states.stateCode;
    delete formsObj.states;
    Object.assign(formsObj, billingForm);

    return formsObj;
};

/**
 * Get Account Name Fields
 * @param {Object} paymentForm billing Form
 * @param {Object} data array of form keys
 * @return {Object} of Account fields names
 */
paymentHelper.getAccountNameFields = function (paymentForm, data) {
    paymentForm.clear();

    return Array.reduce(
        Object.keys(data),
        function (fields, key) {
            if (Object.prototype.hasOwnProperty.call(paymentForm, key)) {
                fields[paymentForm[key].htmlName] = '';
            }

            return fields;
        }, {});
};

/**
 * Checks if current payment method is Saved Paypal Method
 * @param {Request} httpParameterMap dw.web.HttpParameterMap
 * @returns {boolean} true\false saved Paypal Method
 */
paymentHelper.isSavedPaypalMethod = function (httpParameterMap) {
    var selectedPaypalAccountUuid = httpParameterMap.braintreePaypalAccountList.value;
    var paymentMethodFromCart = httpParameterMap.paymentMethodUUID.stringValue;

    if (!customer.authenticated) {
        return false;
    }

    return (selectedPaypalAccountUuid || paymentMethodFromCart) && selectedPaypalAccountUuid !== braintreeConstants.NEW_ACCOUNT && (!httpParameterMap.braintreePaypalNonce || httpParameterMap.braintreePaypalNonce.stringValue === '');
};

/**
 * Return merchant id for passed currency code
 * @param {string} currencyCode - Currency Code
 * @return {string} Merchant id
 */
paymentHelper.getMerchantAccountID = function (currencyCode) {
    var prefs = require('~/cartridge/config/braintreePreferences');
    var merchantAccounts = {};
    var code = currencyCode.toUpperCase();

    for (var fieldName in prefs.merchantAccountIDs) {
        var fieldArr = prefs.merchantAccountIDs[fieldName].split(':');
        merchantAccounts[fieldArr[0].toUpperCase()] = fieldArr[1];
    }

    return merchantAccounts[code].replace(/\s/g, '');
};

/**
 * Sets and returns new default card
 * @param {string} paymentMethodId Payment Method id
 * @param {dw.customer.CustomerMgr} customerProfile Customer Profile. Use when a billing agreement was revoked
 * @returns {CustomerPaymentInstrument} New default account
 */
paymentHelper.setAndReturnNewDefaultCard = function (paymentMethodId, customerProfile) {
    var braintreePrefs = require('~/cartridge/config/braintreePreferences');
    var profile = customer.profile || customerProfile;
    /**
        * Allowed Credit Card Processors Ids:
        *  -BRAINTREE_CREDIT
        *  -BRAINTREE_GOOGLEPAY
        *  -BRAINTREE_SRC
    */
    const allowedCardProcessorsIds = [
        require('dw/order/PaymentInstrument').METHOD_CREDIT_CARD,
        braintreePrefs.paymentMethods.BRAINTREE_GOOGLEPAY.paymentMethodId,
        braintreePrefs.paymentMethods.BRAINTREE_SRC.paymentMethodId
    ];
    var newDefaultAccount = allowedCardProcessorsIds.indexOf(paymentMethodId) !== -1 ?
        paymentHelper.getApplicableCreditCardPaymentInstruments() :
        profile.getWallet().getPaymentInstruments(paymentMethodId);

    if (!empty(newDefaultAccount)) {
        Transaction.wrap(function () {
            newDefaultAccount[0].custom.braintreeDefaultCard = true;
        });
    }

    return newDefaultAccount;
};

/** Defines query name for transaction creating graphQL call
 * @param {Object} data data object with parameters
 * @returns {string} sale/authorization or in case of PayPal transaction: chargePaypal/authorizePaypal
 */
paymentHelper.defineCreateTransactionQueryName = function (data) {
    if (data.isPaypal) {
        return data.options.submitForSettlement ? braintreeConstants.QUERY_NAME_PAYPAL_SALE : braintreeConstants.QUERY_NAME_PAYPAL_AUTHORIZATION;
    }

    return data.options.submitForSettlement ? braintreeConstants.QUERY_NAME_SALE : braintreeConstants.QUERY_NAME_AUTHORIZATION;
};

module.exports = paymentHelper;
