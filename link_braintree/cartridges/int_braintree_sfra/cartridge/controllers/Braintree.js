'use strict';
var server = require('server');
var URLUtils = require('dw/web/URLUtils');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');

var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var middleware = require('~/cartridge/scripts/braintree/middleware');

var {
    getLogger,
    createAddressData,
    getAmountPaid,
    updateOrderBillingAddress,
    getApplicableCreditCardPaymentInstruments
} = require('~/cartridge/scripts/braintree/helpers/paymentHelper');
var {
    getCustomerPaymentInstruments,
    setBraintreeDefaultCard,
    clearDefaultProperty
} = require('~/cartridge/scripts/braintree/helpers/customerHelper');
var {
    saveCustomerCreditCard,
    saveSrcAccount,
    saveGooglePayAccount,
    savePaypalAccount,
    saveVenmoAccount
} = require('~/cartridge/scripts/hooks/payment/processor/processorHelper');

var btBusinessLogic = require('~/cartridge/scripts/braintree/braintreeAPI/braintreeBusinessLogic');
var prefs = require('~/cartridge/config/braintreePreferences');
var braintreeConstants = require('~/cartridge/scripts/util/braintreeConstants');

server.get('GetPaymentMethodNonceByUUID',
    server.middleware.https,
    userLoggedIn.validateLoggedIn,
    function (req, res, next) {
        var uuid = request.httpParameterMap.id.stringValue;

        if (!uuid) {
            res.setStatusCode(400);
            return;
        }

        var nonce = require('~/cartridge/scripts/braintree/controllerBase').getPaymentMethodNonceByUUID(uuid);

        if (!nonce) {
            res.setStatusCode(400);
            return;
        }

        res.json({
            nonce: nonce
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

        try {
            var createPaymentMethodResponseData = btBusinessLogic.createPaymentMethodOnBraintreeSide(paymentMethodNonce);

            if (createPaymentMethodResponseData.error) {
                throw createPaymentMethodResponseData.error;
            }

            var card = saveCustomerCreditCard(createPaymentMethodResponseData, paymentForm.cardOwner.value);

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
            redirectUrl: URLUtils.https('Account-Show').toString()
        });

        return next();
    });

server.get('MakePaymentMethodDefault',
    userLoggedIn.validateLoggedIn,
    function (req, res, next) {
        var array = require('*/cartridge/scripts/util/array');

        var UUID = req.querystring.UUID;
        var paymentMethodIds = req.querystring.pmID;
        var savedPaymentInstruments = paymentMethodIds === 'CARD' ?
            getApplicableCreditCardPaymentInstruments() :
            customer.getProfile().getWallet().getPaymentInstruments(paymentMethodIds);
        var newDefaultProperty = array.find(savedPaymentInstruments, function (payment) {
            return UUID === payment.UUID;
        });
        var toRemoveDefaultProperty = clearDefaultProperty(savedPaymentInstruments);

        Transaction.wrap(function () {
            newDefaultProperty.custom.braintreeDefaultCard = true;
        });

        res.json({
            newDefaultProperty: newDefaultProperty.UUID,
            toRemoveDefaultProperty: toRemoveDefaultProperty.UUID
        });

        next();
    });

server.post('AccountAddPaypalHandle',
    csrfProtection.validateAjaxRequest,
    userLoggedIn.validateLoggedIn,
    middleware.validateBraintreePaypalAccountForm,
    middleware.validatePaypalCustomerEmail,
    function (req, res, next) {
        var paypalAccount;
        var paymentForm = server.forms.getForm('braintreepaypalaccount');
        var paypal = {
            email: paymentForm.email.value,
            nonce: paymentForm.nonce.value,
            billingAddress: paymentForm.addresses.value,
            shippingAddress: paymentForm.shippingAddress.value
        };

        var responseObject = {
            renderAccountsUrl: URLUtils.url('Braintree-RenderAccountsList', 'paymentType', 'paypal').toString()
        };

        try {
            var createPaymentMethodResponseData = btBusinessLogic.createPaymentMethodOnBraintreeSide(paypal.nonce);

            if (createPaymentMethodResponseData.error) {
                throw createPaymentMethodResponseData.error;
            }

            paypalAccount = savePaypalAccount(createPaymentMethodResponseData.paymentMethod, paypal.billingAddress);

            if (paypalAccount.error) {
                throw paypalAccount.error;
            }
        } catch (err) {
            responseObject.success = false;
            responseObject.error = err;

            res.json(responseObject);
            res.setStatusCode(500);

            return next();
        }

        // Makes paypal account as default payment method
        clearDefaultProperty(customer.getProfile().getWallet().getPaymentInstruments(prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId));
        setBraintreeDefaultCard(paypalAccount.token);
        paymentForm.clear();

        responseObject.success = true;
        res.json(responseObject);

        return next();
    });

server.get(
    'RenderAccountsList',
    csrfProtection.generateToken,
    consentTracking.consent,
    userLoggedIn.validateLoggedIn,
    function (req, res, next) {
        var paymentType = req.querystring.paymentType.toLowerCase();
        var paymentTypeConstant = 'BRAINTREE_' + paymentType.toUpperCase();
        var paymentMethodId = prefs.paymentMethods[paymentTypeConstant].paymentMethodId;
        var AccountModel = require('*/cartridge/models/account');
        var paymentInstruments = AccountModel.getCustomerPaymentInstruments(getCustomerPaymentInstruments(paymentMethodId));
        var paymentTypeKey = paymentType + 'PaymentInstruments';

        var renderData = {
            braintree: {
                deletePaymentUrl: URLUtils.url('PaymentInstruments-DeletePayment').toString(),
                makePaymentMethodDefaultUrl: URLUtils.https('Braintree-MakePaymentMethodDefault').toString()
            }
        };
        renderData.braintree[paymentTypeKey] = paymentInstruments;
        res.render('braintree/account/' + paymentType + 'AccountsLoop', renderData);

        next();
    }
);

server.post('AccountAddVenmoHandle',
    csrfProtection.validateAjaxRequest,
    userLoggedIn.validateLoggedIn,
    middleware.validateFormField,
    function (req, res, next) {
        var venmoAccount;
        var paymentForm = server.forms.getForm('braintreevenmoaccount');
        var venmo = {
            nonce: paymentForm.nonce.value
        };

        var responseObject = {
            renderAccountsUrl: URLUtils.url('Braintree-RenderAccountsList', 'paymentType', 'venmo').toString()
        };

        try {
            var createPaymentMethodResponseData = btBusinessLogic.createPaymentMethodOnBraintreeSide(venmo.nonce);

            if (createPaymentMethodResponseData.error) {
                throw createPaymentMethodResponseData.error;
            }

            venmoAccount = saveVenmoAccount(createPaymentMethodResponseData);

            if (venmoAccount.error) {
                throw venmoAccount.error;
            }
        } catch (err) {
            responseObject.success = false;
            responseObject.error = err;

            res.json(responseObject);
            res.setStatusCode(500);

            return next();
        }

        // Makes venmo account as default payment method
        clearDefaultProperty(customer.getProfile().getWallet().getPaymentInstruments(prefs.paymentMethods.BRAINTREE_VENMO.paymentMethodId));
        setBraintreeDefaultCard(venmoAccount.token);

        responseObject.success = true;
        res.json(responseObject);

        return next();
    });

server.get('GetOrderInfo', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var basket = BasketMgr.getCurrentBasket();
    var basketShippingAddress = basket.getDefaultShipment().getShippingAddress();
    var shippingAddress = null;

    if (!empty(basketShippingAddress)) {
        var shippingInfo = createAddressData(basketShippingAddress);
        var firstName = shippingInfo.firstName || '';
        var lastName = shippingInfo.lastName || '';
        shippingAddress = {
            recipientName: firstName + ' ' + lastName,
            line1: shippingInfo.streetAddress || '',
            line2: shippingInfo.extendedAddress || '',
            city: shippingInfo.locality || '',
            countryCode: (shippingInfo.countryCodeAlpha2).toUpperCase() || '',
            postalCode: shippingInfo.postalCode || '',
            state: shippingInfo.region || '',
            phone: shippingInfo.phoneNumber || ''
        };
    }
    res.json({
        amount: getAmountPaid(basket).getValue(),
        shippingAddress: shippingAddress
    });

    next();
});

server.post('PaymentConfirm', server.middleware.https, function (req, res, next) {
    var basket = require('dw/order/BasketMgr').getCurrentBasket();
    var technicalErrorMsg = Resource.msg('error.technical', 'checkout', null);
    var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
    var { copyCustomerAddressToShipment } = require('*/cartridge/scripts/checkout/checkoutHelpers');

    var lpmTransactionSale = null;
    var { nonce, details, lpmName, deviceData } = req.body && JSON.parse(req.body);

    updateOrderBillingAddress(basket, details);

    if (basket.giftCertificateLineItems.length >= 1 &&
        basket.productLineItems.length === 0 &&
        basket.billingAddress &&
        empty(basket.defaultShipment.shippingAddress)) {
        copyCustomerAddressToShipment(basket.billingAddress);
    }

    var order = COHelpers.createOrder(basket);

    if (!order) {
        res.setStatusCode(500);
        res.print(technicalErrorMsg);

        return next();
    }

    try {
        lpmTransactionSale = require('~/cartridge/scripts/braintree/processors/processorLpm').setLpmTransactionSale(order, {
            nonce: nonce,
            lpmName: lpmName,
            deviceData: deviceData
        });
    } catch (error) {
        getLogger().error(error);

        res.setStatusCode(500);
        res.print(error.message);

        return next();
    }

    if (!lpmTransactionSale || lpmTransactionSale.error) {
        res.setStatusCode(500);
        res.print(lpmTransactionSale.message);

        return next();
    }

    var fraudDetectionStatus = { status: 'success' };
    // Need to use COHelpers.placeOrder because it exists in plugin_giftcertificate cartridge.
    var placeOrderResult = COHelpers.placeOrder(order, fraudDetectionStatus);

    if (placeOrderResult.error) {
        res.setStatusCode(500);
        res.print(technicalErrorMsg);

        return next();
    }

    if (order.getCustomerEmail()) {
        COHelpers.sendConfirmationEmail(order, req.locale.id);
    }

    res.json({
        redirectUrl: URLUtils.url('Order-Confirm', 'ID', order.orderNo, 'token', order.orderToken).toString()
    });

    return next();
});

server.get('FallbackProcess', server.middleware.https, function (req, res, next) {
    var basket = require('dw/order/BasketMgr').getCurrentBasket();
    var clientToken = btBusinessLogic.getClientToken(basket.currencyCode);
    var paymentConfirmUrl = URLUtils.url('Braintree-PaymentConfirm').toString();
    var lpmName = request.httpParameterMap.lpmName.value;
    var customerEmail = request.httpParameterMap.email.value;

    res.render('/braintree/checkout/lpmFallback', {
        clientToken: clientToken,
        paymentConfirmUrl: paymentConfirmUrl,
        lpmName: lpmName,
        prefs: prefs,
        email: customerEmail
    });

    return next();
});

server.post('AccountAddGooglePayHandle',
    csrfProtection.validateAjaxRequest,
    userLoggedIn.validateLoggedIn,
    middleware.validateFormField,
    function (req, res, next) {
        var googlePayNonce = server.forms.getForm('braintreegooglepayaccount').nonce.value;

        try {
            var createPaymentMethodResponseData = btBusinessLogic.createPaymentMethodOnBraintreeSide(googlePayNonce, true);

            if (createPaymentMethodResponseData.error) {
                throw createPaymentMethodResponseData.error;
            }

            var googlePayAccount = saveGooglePayAccount(createPaymentMethodResponseData);

            if (googlePayAccount.error) {
                throw Resource.msg('braintree.cart.defaulterror', 'locale', null);
            }
        } catch (err) {
            res.json({
                success: false,
                error: err
            });
        }

        res.json({
            success: true,
            redirectUrl: URLUtils.https('Account-Show').toString()
        });

        return next();
    });

server.post('AccountAddSrcHandle',
    csrfProtection.validateAjaxRequest,
    userLoggedIn.validateLoggedIn,
    middleware.validateFormField,
    function (req, res, next) {
        var srcNonce = server.forms.getForm('braintreesecureremotecommerceaccount').nonce.value;

        try {
            var createPaymentMethodResponseData = btBusinessLogic.createPaymentMethodOnBraintreeSide(srcNonce, true);

            if (createPaymentMethodResponseData.error) {
                throw createPaymentMethodResponseData.error;
            }

            var srcAccount = saveSrcAccount(createPaymentMethodResponseData);

            if (srcAccount.error) {
                throw Resource.msg('braintree.cart.defaulterror', 'locale', null);
            }
        } catch (err) {
            res.json({
                success: false,
                error: err
            });
            return next();
        }

        res.json({
            success: true,
            redirectUrl: URLUtils.https('Account-Show').toString()
        });

        return next();
    });

server.post('PaymentMethodHook',
    function (req, res, next) {
        var PaymentMethodWhMgr = require('~/cartridge/models/paymentMethodWhMgr');
        var body = request.httpParameterMap;
        var btPayload = body.bt_payload.value;
        var paymentMethodWhMgr = new PaymentMethodWhMgr();
        var parsedPayload;

        try {
            // Validates signature. In case if signature is not valid an error will be thrown
            paymentMethodWhMgr.validateSignature(body.bt_signature.value, btPayload);

            // Parse payload and return a notification object. In case if payload is not valid an error will be thrown
            parsedPayload = paymentMethodWhMgr.parsePayload(btPayload);

            if (parsedPayload.notification.kind === braintreeConstants.TYPE_PAYMENT_METHOD_REVOKED_BY_CUSTOMER) {
                // Deletes revoked payment method when a customer canceled their PayPal billing agreement
                paymentMethodWhMgr.deleteRevokedPaymentMethod(parsedPayload.notification.subject.paypalAccount);
            } else {
                var error = Resource.msg('braintree.paymentMethod.webhook.notification.type.doesnot.match', 'locale', 'null');
                getLogger().error(error);
            }
        } catch (err) {
            res.json({
                success: false,
                error: err
            });

            getLogger().error(err);

            return next();
        }

        res.json({
            success: true
        });

        return next();
    });

module.exports = server.exports();

