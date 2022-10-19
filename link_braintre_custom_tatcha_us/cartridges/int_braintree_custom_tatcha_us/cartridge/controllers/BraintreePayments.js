'use strict';

var server = require('server');
var URLUtils = require('dw/web/URLUtils');
var Resource = require('dw/web/Resource');
var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
var site = require('dw/system/Site').getCurrent();
var middleware = require('*/cartridge/scripts/braintree/middleware');
var braintreeUtil = require('*/cartridge/scripts/util/braintreeUtil.js');

var {
    getDefaultCustomerPaypalPaymentInstrument } = require('*/cartridge/scripts/braintree/helpers/customerHelper');
var {
    isPaypalButtonEnabled,
    getAccountFormFields,
    createBillingFormFields
} = require('*/cartridge/scripts/braintree/helpers/paymentHelper');
var {
    createAccountVenmoButtonConfig,
    createAccountSrcButtonConfig,
    createAccountGooglePayButtonConfig,
    createPaypalAccountButtonConfig
} = require('*/cartridge/scripts/braintree/helpers/accountButtonConfigHelper');
var {
    createBraintreeSrcButtonConfig,
    createBraintreePayPalButtonConfig,
    createBraintreeGooglePayButtonConfig,
    createBraintreeApplePayButtonConfig
} = require('*/cartridge/scripts/braintree/helpers/buttonConfigHelper');

var btBusinessLogic = require('*/cartridge/scripts/braintree/braintreeAPI/braintreeBusinessLogic');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var prefs = require('*/cartridge/config/braintreePreferences');
var braintreeConstants = require('*/cartridge/scripts/util/braintreeConstants');
var { deletePaymentMethod } = require('*/cartridge/scripts/braintree/braintreeAPI/braintreeBusinessLogic');
var {
    setAndReturnNewDefaultCard
} = require('*/cartridge/scripts/braintree/helpers/paymentHelper');
var {
    saveCustomerCreditCard,
    saveSrcAccount,
    saveGooglePayAccount,
    savePaypalAccount,
    saveVenmoAccount
} = require('*/cartridge/scripts/hooks/payment/processor/processorHelper');

function getSFRACheckoutFormFields() {
    return getAccountFormFields(createBillingFormFields(), {
        firstName: '',
        lastName: '',
        address1: '',
        address2: '',
        city: '',
        postalCode: '',
        stateCode: '',
        country: '',
        email: '',
        phone: '',
        paymentMethod: ''
    });
}

server.get('MiniCartShow', csrfProtection.generateToken, function (req, res, next) {
    var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
	var TotalsModel = require('*/cartridge/models/totals');

    var BasketMgr = require('dw/order/BasketMgr');
    var basket = BasketMgr.getCurrentBasket();
	var totals = new TotalsModel(basket);
    //check for AD products in bag
    var hasRefillProducts = cartHelper.hasAutoDeliveryProductInBag();

    if (!basket || hasRefillProducts) {
        next();
        return;
    }

    var clientToken = btBusinessLogic.getClientToken(basket.getCurrencyCode());
    var payPalButtonConfig = null;
    var paypalBillingAgreementFlow = null;
    var defaultPaypalAddress = null;
    var braintreePaypalAccountData = null;
    var applePayButtonConfig = null;

    if (prefs.paymentMethods.BRAINTREE_PAYPAL.isActive) {
        payPalButtonConfig = createBraintreePayPalButtonConfig(basket, clientToken, braintreeConstants.FLOW_MINICART);
        var customerPaypalInstruments = getDefaultCustomerPaypalPaymentInstrument();
        if (customerPaypalInstruments) {
            defaultPaypalAddress = customer.getAddressBook().getPreferredAddress();
            if (!empty(defaultPaypalAddress)) {
                paypalBillingAgreementFlow = true;
                braintreePaypalAccountData = {
                    address: customerPaypalInstruments.custom.braintreePaypalAccountAddresses,
                    paymentMethod: prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId,
                    email: customerPaypalInstruments.custom.braintreePaypalAccountEmail,
                    uuid: customerPaypalInstruments.getUUID()
                };
            }
        }
    } else {
        next();
        return;
    }

    if (prefs.paymentMethods.BRAINTREE_APPLEPAY.isActive && prefs.applepayVisibilityOnCart) {
        applePayButtonConfig = createBraintreeApplePayButtonConfig(basket, clientToken, braintreeConstants.FLOW_CART);
    }
    //Getting Afterpay threshold
    var afterPayEligible = cartHelper.isAfterpayEligible(basket);
    //check for giftcertificate in bag
    var hasOnlyGiftCertificate = cartHelper.hasOnlyGiftCertificateItem(basket);

    res.render('braintree/minicart/minicartPaymentButtons', {
        braintree: {
            payPalButtonConfig: payPalButtonConfig,
            paypalBillingAgreementFlow: paypalBillingAgreementFlow,
            staticImageLink: prefs.staticImageLink,
            sfraCheckoutFormFields: getSFRACheckoutFormFields(),
            checkoutFromCartUrl: prefs.checkoutFromCartUrl,
            placeOrdeUrl: prefs.placeOrdeUrl,
            braintreePaypalAccountData: braintreePaypalAccountData || {},
            applePayButtonConfig: applePayButtonConfig
        },
        addressForm: server.forms.getForm('address'),
        afterPayEligible: afterPayEligible,
        hasOnlyGiftCertificate: hasOnlyGiftCertificate,
        hasRefillProducts: hasRefillProducts,
        totals :totals
    });
    next();
});

/**
* Creates config for hosted fields
* @param {Object} cardForm The string to repeat.
* @returns {Object} configuration object
*/
function createHostedFieldsConfig(cardForm) {
    var isEnable3dSecure = prefs.is3DSecureEnabled;

    return {
        paymentMethodName: prefs.paymentMethods.BRAINTREE_CREDIT.paymentMethodId,
        is3dSecureEnabled: isEnable3dSecure,
        isFraudToolsEnabled: prefs.isFraudToolsEnabled,
        isSkip3dSecureLiabilityResult: prefs.is3DSecureSkipClientValidationResult,
        clientToken: btBusinessLogic.getClientToken(site.getDefaultCurrency()),
        messages: {
            validation: Resource.msg('braintree.creditcard.error.validation', 'locale', null),
            secure3DFailed: Resource.msg('braintree.creditcard.error.secure3DFailed', 'locale', null),
            HOSTED_FIELDS_FIELDS_EMPTY: Resource.msg('braintree.creditcard.error.HOSTED_FIELDS_FIELDS_EMPTY', 'locale', null),
            HOSTED_FIELDS_FIELDS_INVALID: Resource.msg('braintree.creditcard.error.HOSTED_FIELDS_FIELDS_INVALID', 'locale', null),
            HOSTED_FIELDS_FAILED_TOKENIZATION: Resource.msg('braintree.creditcard.error.HOSTED_FIELDS_FAILED_TOKENIZATION', 'locale', null),
            HOSTED_FIELDS_TOKENIZATION_NETWORK_ERROR: Resource.msg('braintree.creditcard.error.HOSTED_FIELDS_TOKENIZATION_NETWORK_ERROR', 'locale', null),
            CLIENT_REQUEST_TIMEOUT: Resource.msg('braintree.error.CLIENT_REQUEST_TIMEOUT', 'locale', null),
            CLIENT_GATEWAY_NETWORK: Resource.msg('braintree.error.CLIENT_GATEWAY_NETWORK', 'locale', null),
            CLIENT_REQUEST_ERROR: Resource.msg('braintree.error.CLIENT_REQUEST_ERROR', 'locale', null),
            CLIENT_MISSING_GATEWAY_CONFIGURATION: Resource.msg('braintree.error.CLIENT_MISSING_GATEWAY_CONFIGURATION', 'locale', null)
        },
        amount: 1,
        fieldsConfig: {
            initOwnerValue: '',
            ownerHtmlName: cardForm.cardOwner.htmlName,
            typeHtmlName: cardForm.cardType.htmlName,
            numberHtmlName: cardForm.cardNumber.htmlName,
            expirationMonth: cardForm.expirationMonth.htmlName,
            expirationYear: cardForm.expirationYear.htmlName
        }
    };
}

/**
 * Creates customer on Braintree side if customer doesn't exist in Braintree
 */
function createCustomerOnBraintreeSide() {
    var customerVaultData = btBusinessLogic.isCustomerInVault(customer);

    if (!customerVaultData.isCustomerInVault && !customerVaultData.error) {
        btBusinessLogic.createCustomerOnBraintreeSide();
    }
}
server.get('List', csrfProtection.generateToken,
	    consentTracking.consent,
	    userLoggedIn.validateLoggedIn, function (req, res, next) {
	var { getCustomerPaymentInstruments } = require('~/cartridge/scripts/braintree/helpers/customerHelper');
    var AccountModel = require('*/cartridge/models/account');
    var URLUtils = require('dw/web/URLUtils');
    var Resource = require('dw/web/Resource');
    var CREDIT_CARD = require('dw/order/PaymentInstrument').METHOD_CREDIT_CARD;

    var creditCardPaymentInstruments = AccountModel.getCustomerPaymentInstruments(getCustomerPaymentInstruments(CREDIT_CARD));
    var googlePayPaymentInstruments = AccountModel.getCustomerPaymentInstruments(getCustomerPaymentInstruments(prefs.paymentMethods.BRAINTREE_GOOGLEPAY.paymentMethodId));
    var paypalPaymentInstruments = AccountModel.getCustomerPaymentInstruments(getCustomerPaymentInstruments(prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId));
    var venmoPaymentInstruments = AccountModel.getCustomerPaymentInstruments(getCustomerPaymentInstruments(prefs.paymentMethods.BRAINTREE_VENMO.paymentMethodId));
    var srcPaymentInstruments = AccountModel.getCustomerPaymentInstruments(getCustomerPaymentInstruments(prefs.paymentMethods.BRAINTREE_SRC.paymentMethodId));

    var customerSavedCreditCards = [];
    if (!empty(creditCardPaymentInstruments)) {
        creditCardPaymentInstruments.map(function (el) {
            return customerSavedCreditCards.push(el);
        });
    }
    if (!empty(googlePayPaymentInstruments)) {
        googlePayPaymentInstruments.map(function (el) {
            return customerSavedCreditCards.push(el);
        });
    }
    if (!empty(srcPaymentInstruments)) {
        srcPaymentInstruments.map(function (el) {
            return customerSavedCreditCards.push(el);
        });
    }

    var formKeys = {
        email: '',
        nonce: '',
        addresses: '',
        shippingAddress: ''
    };

    res.render('account/payment/paymentinstrumentlist', {
        braintree: {
            customerSavedCreditCards: customerSavedCreditCards,
            paypalPaymentInstruments: paypalPaymentInstruments,
            venmoPaymentInstruments: venmoPaymentInstruments,
            prefs: prefs,
            deletePaymentUrl: URLUtils.url('BraintreePayments-DeletePayment').toString(),

            creditcardPaymentForm: server.forms.getForm('creditCard'),
            googlepayPaymentForm: server.forms.getForm('braintreegooglepayaccount'),
            srcPaymentForm: server.forms.getForm('braintreesecureremotecommerceaccount'),
            accountGooglePayButtonConfig: createAccountGooglePayButtonConfig(),
            hostedFieldsConfig: createHostedFieldsConfig(server.forms.getForm('creditCard')),
            accountSrcButtonConfig: createAccountSrcButtonConfig(),
            isCreditCardSavingAllowed: prefs.paymentMethods.BRAINTREE_CREDIT && prefs.paymentMethods.BRAINTREE_CREDIT.isActive && prefs.vaultMode && !prefs.is3DSecureEnabled,
            isSrcSavingAllowed: prefs.paymentMethods.BRAINTREE_SRC && prefs.paymentMethods.BRAINTREE_SRC.isActive && prefs.vaultMode,
            isSRCBlockShown: prefs.paymentMethods.BRAINTREE_SRC && prefs.paymentMethods.BRAINTREE_SRC.isActive && (prefs.vaultMode || !empty(srcPaymentInstruments)),
            isCreditCardBlockShown: prefs.paymentMethods.BRAINTREE_CREDIT && prefs.paymentMethods.BRAINTREE_CREDIT.isActive && (prefs.vaultMode || !empty(creditCardPaymentInstruments)),
            isGooglePayBlockShown: prefs.paymentMethods.BRAINTREE_GOOGLEPAY && prefs.paymentMethods.BRAINTREE_GOOGLEPAY.isActive && (prefs.vaultMode || !empty(googlePayPaymentInstruments)),
            makePaymentMethodDefaultUrl: URLUtils.https('Braintree-MakePaymentMethodDefault').toString()
        }
    });
	next();
});

server.post('AccountAddCreditCardHandle',
	    csrfProtection.validateAjaxRequest,
	    userLoggedIn.validateLoggedIn,
	    middleware.validateFormField,
	    middleware.validateBraintreePaymentMethodNonce,
	    function (req, res, next) {
	        var httpParameterMap = request.httpParameterMap;
	        var paymentMethodNonce = httpParameterMap.braintreePaymentMethodNonce.stringValue;
	        var paymentForm = server.forms.getForm('creditCard');
	        var isDefaultCard = httpParameterMap.braintreeDefaultCard.stringValue;

            /**
             * Create customer on braintree end, if not already created
             * User will be created only if registered and the profile field(braintreeCustomerId) is empty
             */
            try {
                braintreeUtil.checkAndCreateCustomer();
            } catch (e) {

            }

	        try {
	            var createPaymentMethodResponseData = btBusinessLogic.createPaymentMethodOnBraintreeSide(paymentMethodNonce);

	            if (createPaymentMethodResponseData.error) {
	                throw createPaymentMethodResponseData.error;
	            }
	            var card = saveCustomerCreditCard(createPaymentMethodResponseData, paymentForm.cardOwner.value, isDefaultCard);

	            if (card.error) {
	                throw card.error;
	            }
	        } catch (err) {
	            res.json({
	                success: false,
	                error: err
	            });

	            return next();
	        }

	        paymentForm.clear();
	        res.json({
	            success: true,
	            redirectUrl: URLUtils.https('BraintreePayments-List').toString()
	        });

	        return next();
	    });

/**
 * BraintreePayments-DeletePayment : The PaymentInstruments-DeletePayment is the endpoint responsible for deleting a shopper's saved payment instrument from their account
 * @name Base/PaymentInstruments-DeletePayment
 * @function
 * @memberof PaymentInstruments
 * @param {middleware} - userLoggedIn.validateLoggedInAjax
 * @param {querystringparameter} - UUID - the universally unique identifier of the payment instrument to be removed from the shopper's account
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - get
 */
server.get('DeletePayment', userLoggedIn.validateLoggedInAjax, function (req, res, next) {
	var newDefaultAccount;
	var array = require('*/cartridge/scripts/util/array');
    var accountHelpers = require('*/cartridge/scripts/helpers/accountHelpers');
    var Transaction = require('dw/system/Transaction');

    var data = res.getViewData();
    if (data && !data.loggedin) {
        res.json();
        return next();
    }

    var UUID = req.querystring.UUID;
    var paymentInstruments = req.currentCustomer.wallet.paymentInstruments;
    var paymentToDelete = {
            payment: array.find(paymentInstruments, function (item) {
                return UUID === item.UUID;
            }).raw
        };

        paymentToDelete.paymentMethod = paymentToDelete.payment.paymentMethod;
        paymentToDelete.isDefaultCard = paymentToDelete.payment.custom.braintreeDefaultCard;
        /*
		* For old saved cards(SG), the token was stored in : paymentInstrument.custom.braintreePaymentMethodToken,
		* the same is  copied to the new field :paymentInstrument.creditCardToken, as SFRA uses this field
		* **/
		if((empty(paymentToDelete.payment.creditCardToken) || paymentToDelete.payment.creditCardToken == null) && !empty(paymentToDelete.payment.custom.braintreePaymentMethodToken)) {
		    Transaction.wrap(function () {
		        paymentToDelete.payment.creditCardToken = paymentToDelete.payment.custom.braintreePaymentMethodToken;
		    });
		}
        // Delete Payment Method from Braintree && Customer Payment Instruments
        deletePaymentMethod(paymentToDelete);
        res.setViewData(paymentToDelete);

    this.on('route:BeforeComplete', function () { // eslint-disable-line no-shadow
        var CustomerMgr = require('dw/customer/CustomerMgr');
        var Transaction = require('dw/system/Transaction');
        var Resource = require('dw/web/Resource');

        var payment = res.getViewData();
        var customer = CustomerMgr.getCustomerByCustomerNumber(
            req.currentCustomer.profile.customerNo
        );
        var wallet = customer.getProfile().getWallet();


        // Send account edited email
        //accountHelpers.sendAccountEditedEmail(customer.profile);

        if (wallet.getPaymentInstruments().length === 0) {
            res.json({
                UUID: UUID,
                message: Resource.msg('msg.no.saved.payments', 'payment', null)
            });
        } else {
            res.json({ UUID: UUID });
        }
    });

    return next();
});

/**
 * BraintreePayments-DeletePayment : The PaymentInstruments-DeletePayment is the endpoint responsible for deleting a shopper's saved payment instrument from their account
 * @name Base/PaymentInstruments-Show
 * @function
 * @memberof PaymentInstruments
 * @param {middleware} - userLoggedIn.validateLoggedInAjax
 * @param {querystringparameter} - UUID - the universally unique identifier of the payment instrument to be removed from the shopper's account
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - get
 */
server.get('ShowAddCard',csrfProtection.generateToken,
    consentTracking.consent, userLoggedIn.validateLoggedIn, function (req, res, next) {

    res.render('braintree/account/addCreditCard', {
        braintree: {
            accountGooglePayButtonConfig: createAccountGooglePayButtonConfig(),
            prefs: prefs,
            accountSrcButtonConfig: createAccountSrcButtonConfig(),
            creditcardPaymentForm: server.forms.getForm('creditCard'),
            hostedFieldsConfig: createHostedFieldsConfig(server.forms.getForm('creditCard')),
            isCreditCardSavingAllowed: prefs.paymentMethods.BRAINTREE_CREDIT && prefs.paymentMethods.BRAINTREE_CREDIT.isActive && prefs.vaultMode && !prefs.is3DSecureEnabled,
            isSrcSavingAllowed: prefs.paymentMethods.BRAINTREE_SRC && prefs.paymentMethods.BRAINTREE_SRC.isActive && prefs.vaultMode,
            isSRCBlockShown: prefs.paymentMethods.BRAINTREE_SRC && prefs.paymentMethods.BRAINTREE_SRC.isActive && (prefs.vaultMode || !empty(srcPaymentInstruments)),
            isCreditCardBlockShown: prefs.paymentMethods.BRAINTREE_CREDIT && prefs.paymentMethods.BRAINTREE_CREDIT.isActive && (prefs.vaultMode || !empty(creditCardPaymentInstruments)),
            isGooglePayBlockShown: prefs.paymentMethods.BRAINTREE_GOOGLEPAY && prefs.paymentMethods.BRAINTREE_GOOGLEPAY.isActive && (prefs.vaultMode || !empty(googlePayPaymentInstruments)),
            makePaymentMethodDefaultUrl: URLUtils.https('Braintree-MakePaymentMethodDefault').toString()
        }
    });
    return next();
});


module.exports = server.exports();
