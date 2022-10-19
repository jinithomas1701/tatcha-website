'use strict';

var page = module.superModule;
var server = require('server');

var {
    getDefaultCustomerPaypalPaymentInstrument
} = require('~/cartridge/scripts/braintree/helpers/customerHelper');
var {
    isPaypalButtonEnabled,
    getAccountFormFields,
    createBillingFormFields
} = require('~/cartridge/scripts/braintree/helpers/paymentHelper');

var {
    createBraintreePayPalButtonConfig
} = require('~/cartridge/scripts/braintree/helpers/buttonConfigHelper');
var btBusinessLogic = require('~/cartridge/scripts/braintree/braintreeAPI/braintreeBusinessLogic');
var prefs = require('~/cartridge/config/braintreePreferences');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
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
server.append('Show', csrfProtection.generateToken, function (req, res, next) {
    var isSetProductType = !empty(res.getViewData().product.individualProducts);
    if (!isPaypalButtonEnabled('pdp') || isSetProductType) {
        next();
        return;
    }
    var BasketMgr = require('dw/order/BasketMgr');
    var basket = BasketMgr.getCurrentOrNewBasket();

    var clientToken = btBusinessLogic.getClientToken(basket.getCurrencyCode());
    var payPalButtonConfig = null;
    var paypalBillingAgreementFlow = null;
    var defaultPaypalAddress = null;
    var braintreePaypalAccountData = null;

    if (prefs.paymentMethods.BRAINTREE_PAYPAL.isActive) {
        payPalButtonConfig = createBraintreePayPalButtonConfig(basket, clientToken, braintreeConstants.FLOW_PDP);
        if (res.getViewData().product.price.sales) {
            payPalButtonConfig.options.amount = parseFloat(res.getViewData().product.price.sales.decimalPrice);
        }

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
    var braintree = {
        prefs: prefs,
        payPalButtonConfig: payPalButtonConfig,
        paypalBillingAgreementFlow: paypalBillingAgreementFlow,
        cartQuantity: basket.productQuantityTotal,
        staticImageLink: prefs.staticImageLink,
        sfraCheckoutFormFields: getSFRACheckoutFormFields(),
        checkoutFromCartUrl: prefs.checkoutFromCartUrl,
        braintreePaypalAccountData: braintreePaypalAccountData || {}
    };
    res.setViewData({
        braintree: braintree,
        addressForm: server.forms.getForm('address')
    });

    next();
});


module.exports = server.exports();
