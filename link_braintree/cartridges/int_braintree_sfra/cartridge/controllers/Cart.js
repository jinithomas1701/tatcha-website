'use strict';

var page = module.superModule;
var server = require('server');

var {
    getDefaultCustomerPaypalPaymentInstrument } = require('~/cartridge/scripts/braintree/helpers/customerHelper');
var {
    isPaypalButtonEnabled,
    getAccountFormFields,
    createBillingFormFields
} = require('~/cartridge/scripts/braintree/helpers/paymentHelper');

var {
    createBraintreeSrcButtonConfig,
    createBraintreePayPalButtonConfig,
    createBraintreeGooglePayButtonConfig,
    createBraintreeApplePayButtonConfig
} = require('~/cartridge/scripts/braintree/helpers/buttonConfigHelper');

var btBusinessLogic = require('~/cartridge/scripts/braintree/braintreeAPI/braintreeBusinessLogic');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var prefs = require('~/cartridge/config/braintreePreferences');
var braintreeConstants = require('~/cartridge/scripts/util/braintreeConstants');

/**
* Gets object with SFRA Checkout, Form Fields
* @returns {Function} object with valid checkout fields
*/
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

server.extend(page);
server.append('Show',
    csrfProtection.generateToken,
    function (req, res, next) {
        var BasketMgr = require('dw/order/BasketMgr');
        var basket = BasketMgr.getCurrentBasket();

        if (!basket) {
            next();
            return;
        }
        var clientToken = btBusinessLogic.getClientToken(basket.getCurrencyCode());
        var payPalButtonConfig = null;
        var paypalBillingAgreementFlow = null;
        var applePayButtonConfig = null;
        var googlepayButtonConfig = null;
        var srcButtonConfig = null;
        var defaultPaypalAddress = null;
        var braintreePaypalAccountData = null;

        if (prefs.paymentMethods.BRAINTREE_PAYPAL.isActive && isPaypalButtonEnabled(braintreeConstants.FLOW_CART)) {
            payPalButtonConfig = createBraintreePayPalButtonConfig(basket, clientToken, braintreeConstants.FLOW_CART);
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
        }

        if (prefs.paymentMethods.BRAINTREE_APPLEPAY.isActive && prefs.applepayVisibilityOnCart) {
            applePayButtonConfig = createBraintreeApplePayButtonConfig(basket, clientToken, braintreeConstants.FLOW_CART);
        }

        if (prefs.paymentMethods.BRAINTREE_GOOGLEPAY.isActive && prefs.googlepayVisibilityOnCart) {
            googlepayButtonConfig = createBraintreeGooglePayButtonConfig(basket, clientToken, braintreeConstants.FLOW_CART);
        }

        if (prefs.paymentMethods.BRAINTREE_SRC.isActive && prefs.srcVisibilityOnCart) {
            srcButtonConfig = createBraintreeSrcButtonConfig(basket, clientToken, braintreeConstants.FLOW_CART);
        }

        res.setViewData({
            braintree: {
                prefs: prefs,
                payPalButtonConfig: payPalButtonConfig,
                paypalBillingAgreementFlow: paypalBillingAgreementFlow,
                applePayButtonConfig: applePayButtonConfig,
                googlepayButtonConfig: googlepayButtonConfig,
                srcButtonConfig: srcButtonConfig,
                staticImageLink: prefs.staticImageLink,
                checkoutFromCartUrl: prefs.checkoutFromCartUrl,
                placeOrdeUrl: prefs.placeOrdeUrl,
                sfraCheckoutFormFields: getSFRACheckoutFormFields(),
                braintreePaypalAccountData: braintreePaypalAccountData || {}
            },
            addressForm: server.forms.getForm('address')
        });

        next();
    });
server.extend(page);
server.append('MiniCartShow', csrfProtection.generateToken, function (req, res, next) {
    if (!isPaypalButtonEnabled(braintreeConstants.FLOW_MINICART)) {
        next();
        return;
    }

    var BasketMgr = require('dw/order/BasketMgr');
    var basket = BasketMgr.getCurrentBasket();

    if (!basket) {
        next();
        return;
    }

    var clientToken = btBusinessLogic.getClientToken(basket.getCurrencyCode());
    var payPalButtonConfig = null;
    var paypalBillingAgreementFlow = null;
    var defaultPaypalAddress = null;
    var braintreePaypalAccountData = null;

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

    res.setViewData({
        braintree: {
            payPalButtonConfig: payPalButtonConfig,
            paypalBillingAgreementFlow: paypalBillingAgreementFlow,
            staticImageLink: prefs.staticImageLink,
            sfraCheckoutFormFields: getSFRACheckoutFormFields(),
            checkoutFromCartUrl: prefs.checkoutFromCartUrl,
            placeOrdeUrl: prefs.placeOrdeUrl,
            braintreePaypalAccountData: braintreePaypalAccountData || {}
        },
        addressForm: server.forms.getForm('address')
    });

    next();
});

module.exports = server.exports();

