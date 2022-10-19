'use strict';

var page = module.superModule;
var server = require('server');

var URLUtils = require('dw/web/URLUtils');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');

var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var middleware = require('*/cartridge/scripts/braintree/middleware');

var {
    getLogger,
    createAddressData,
    getAmountPaid,
    updateOrderBillingAddress,
    getApplicableCreditCardPaymentInstruments
} = require('*/cartridge/scripts/braintree/helpers/paymentHelper');
var {
    getCustomerPaymentInstruments,
    setBraintreeDefaultCard,
    clearDefaultProperty
} = require('*/cartridge/scripts/braintree/helpers/customerHelper');
var {
    saveCustomerCreditCard,
    saveSrcAccount,
    saveGooglePayAccount,
    savePaypalAccount,
    saveVenmoAccount
} = require('*/cartridge/scripts/hooks/payment/processor/processorHelper');

var btBusinessLogic = require('*/cartridge/scripts/braintree/braintreeAPI/braintreeBusinessLogic');
var prefs = require('*/cartridge/config/braintreePreferences');
var braintreeConstants = require('*/cartridge/scripts/util/braintreeConstants');

server.extend(page);
server.replace('AccountAddCreditCardHandle',
    csrfProtection.validateAjaxRequest,
    userLoggedIn.validateLoggedIn,
    function (req, res, next) {
        var httpParameterMap = request.httpParameterMap;
        var paymentMethodNonce = httpParameterMap.braintreePaymentMethodNonce.stringValue;
        var isCheckoutCard = httpParameterMap.isCheckoutCard.stringValue;
        var paymentForm = server.forms.getForm('creditCard');
        var cardOwner = httpParameterMap.cardOwnerName.stringValue;
        var isDefaultCard = httpParameterMap.braintreeCreditCardMakeDefault.stringValue;
        var isSameAsShipping = httpParameterMap.sameAsShipping.stringValue;

        try {

            if (isSameAsShipping === 'false') {
                saveBillingAddress(httpParameterMap);
            } else if (isSameAsShipping === 'true') {
                session.custom.sameasshipping = true;
            }
            var createPaymentMethodResponseData = btBusinessLogic.createPaymentMethodOnBraintreeSide(paymentMethodNonce);

            if (createPaymentMethodResponseData.error) {
                throw createPaymentMethodResponseData.error;
            }

            var card = saveCustomerCreditCard(createPaymentMethodResponseData, cardOwner, isDefaultCard);

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
        if (isCheckoutCard === 'true') {
            res.json({
                success: true,
                currentStage: 'payment',
                redirectUrl: URLUtils.https('Checkout-Begin').toString()
            });
        } else {
            res.json({
                success: true,
                redirectUrl: URLUtils.https('BraintreePayments-List').toString()
            });
        }

        return next();
    });

server.append('MakePaymentMethodDefault', function (req, res, next) {
    var viewData = res.getViewData();
    viewData.redirectUrl = URLUtils.https('BraintreePayments-List').toString();
    res.setViewData(viewData);
    next();
});

/**
 * Save billing address submitted through add credit card from
 * ***/
function saveBillingAddress(httpParameterMap) {
    var BasketMgr = require('dw/order/BasketMgr');
    Transaction.wrap(function () {
        var cart = BasketMgr.getCurrentBasket();
        var billingForm = server.forms.getForm('billing');
        billingForm = billingForm.addressFields;
        var phone = httpParameterMap.billingPhoneNo.value;
        try {
            var billingAddress = cart.getBillingAddress() || cart.createBillingAddress();
            var billingAddressLine1 = billingForm.address1.value;
            var billingPostal = billingForm.postalCode.value;

            billingAddress.setFirstName(billingForm.firstName.value);
            billingAddress.setLastName(billingForm.lastName.value);
            billingAddress.setAddress1(billingAddressLine1);
            billingAddress.setCity(billingForm.city.value);
            billingAddress.setPostalCode(billingPostal);
            billingAddress.setStateCode(billingForm.states.stateCode.value);
            billingAddress.setCountryCode('GB');
            if (!empty(phone)) {
                billingAddress.setPhone(phone);
            }

            var shippingAddress = cart.getDefaultShipment().getShippingAddress();
            if(shippingAddress && !empty(shippingAddress)) {
                if((shippingAddress.address1 !== billingAddressLine1) || (shippingAddress.postalCode !== billingPostal)) {
                    session.custom.sameasshipping = false;
                }
            }
        } catch(err) {
            var error = err;
        }
    });
}

module.exports = server.exports();

