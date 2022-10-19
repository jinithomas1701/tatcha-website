'use strict';

var server = require('server');
server.extend(module.superModule);

var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
var Site = require('dw/system/Site');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var LOGGER = dw.system.Logger.getLogger('order');
var braintreeUtil = require('*/cartridge/scripts/util/braintreeUtil.js');


server.replace('PlaceOrder', server.middleware.https, function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var OrderMgr = require('dw/order/OrderMgr');
    var Resource = require('dw/web/Resource');
    var Transaction = require('dw/system/Transaction');
    var URLUtils = require('dw/web/URLUtils');
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    var hooksHelper = require('*/cartridge/scripts/helpers/hooks');
    var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
    var validationHelpers = require('*/cartridge/scripts/helpers/basketValidationHelpers');
    var addressHelpers = require('*/cartridge/scripts/helpers/addressHelpers');
    var SignifydCreateCasePolicy = dw.system.Site.getCurrent().getCustomPreferenceValue('SignifydCreateCasePolicy');
    var UUIDUtils = require('dw/util/UUIDUtils');
    var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');


    var currentBasket = BasketMgr.getCurrentBasket();

    if (!currentBasket) {
        res.json({
            error: true,
            cartError: true,
            fieldErrors: [],
            serverErrors: [],
            redirectUrl: URLUtils.url('Cart-Show').toString()
        });
        return next();
    }

    var validatedProducts = validationHelpers.validateProducts(currentBasket);
    if (validatedProducts.error) {
        res.json({
            error: true,
            cartError: true,
            fieldErrors: [],
            serverErrors: [],
            redirectUrl: URLUtils.url('Cart-Show').toString()
        });
        return next();
    }

    if (req.session.privacyCache.get('fraudDetectionStatus')) {
        res.json({
            error: true,
            cartError: true,
            redirectUrl: URLUtils.url('Error-ErrorCode', 'err', '01').toString(),
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });

        return next();
    }

    var validationOrderStatus = hooksHelper('app.validate.order', 'validateOrder', currentBasket, require('*/cartridge/scripts/hooks/validateOrder').validateOrder);
    if (validationOrderStatus.error) {
        res.json({
            error: true,
            errorMessage: validationOrderStatus.message,
            oosStatus: validationOrderStatus.oosStatus
        });
        return next();
    }

    var orderType = COHelpers.getOrderType(currentBasket);
    // Check to make sure there is a shipping address
    if (currentBasket.defaultShipment.shippingAddress === null && orderType != 'giftcard') {
        res.json({
            error: true,
            errorStage: {
                stage: 'shipping',
                step: 'address'
            },
            errorMessage: Resource.msg('error.no.shipping.address', 'checkout', null)
        });
        return next();
    }

    // Check to make sure billing address exists
    if (!currentBasket.billingAddress) {
        res.json({
            error: true,
            errorStage: {
                stage: 'payment',
                step: 'billingAddress'
            },
            errorMessage: Resource.msg('error.no.billing.address', 'checkout', null)
        });
        return next();
    }

    // Calculate the basket
	session.custom.SkipCall = true;
    Transaction.wrap(function () {
        basketCalculationHelpers.calculateTotals(currentBasket);
    });

	session.custom.SkipCall = false;

    // RETURN ERROR IF TAX SERVICE IS DOWN
    if (session.custom.taxError == true) {
        try {
            var cartEmail = currentBasket.getCustomerEmail();
            LOGGER.warn('TAX ERROR PLACE ORDER: Customer Email - ' + cartEmail);
        } catch (e) {}

        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    }

    // Re-validates existing payment instruments
    var validPayment = COHelpers.validatePayment(req, currentBasket);
    if (validPayment.error) {
        res.json({
            error: true,
            errorStage: {
                stage: 'payment',
                step: 'paymentInstrument'
            },
            errorMessage: Resource.msg('error.payment.not.valid', 'checkout', null)
        });
        return next();
    }

    // Re-calculate the payments.
    var calculatedPaymentTransactionTotal = COHelpers.calculatePaymentTransaction(currentBasket);
    if (calculatedPaymentTransactionTotal.error) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    }

    // GC payement check
    Transaction.wrap(function () {
        if (!cartHelper.calculatePaymentTransactionTotal(currentBasket)) {
            res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment'));
        }
    });

    /**
     * Afterpay checking payment instrument
     * @type {dw.util.Iterator<dw.order.OrderPaymentInstrument>}
     */
    var iter = currentBasket.getPaymentInstruments().iterator();
    var apPaymentInstrument, paymentStatusUpdated, afterPayOrder = false;
    while (iter.hasNext()) {
        apPaymentInstrument = iter.next();
        if (apPaymentInstrument.paymentMethod === 'AFTERPAY_PBI') {
            afterPayOrder = true;
            break;
        }
    }

    if(afterPayOrder && session.custom.apAddressEdit){
        var hasAPErrors = COHelpers.handleAfterpayValidation(currentBasket);
        if(hasAPErrors.error){
            res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'afterpayErrorMessage', Resource.msg('apierror.flow.default', 'afterpay', null)));
        }
    }

    /* Signifyd Modification Start */
    var Signifyd = require('*/cartridge/scripts/service/signifyd');
    var orderSessionID = Signifyd.getOrderSessionId();
    /* Signifyd Modification End */

    // Creates a new order.
	session.custom.NoCall = true;
    var order = COHelpers.createOrder(currentBasket);
	session.custom.NoCall = false;
    if (!order) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    }

    var isGiftShipment = checkGiftShipment(order);
    if (isGiftShipment) {
    	Transaction.wrap(function () {
    		order.custom.isGiftShipment = true;
    	});
    }

    if (order.getGiftCertificateLineItems().size() > 0) {
    	Transaction.wrap(function () {
    		order.custom.hasGiftCertificate = true;
    	});
    }


    if (SignifydCreateCasePolicy == 'PRE_AUTH' && !afterPayOrder) {
        var SignifydPassiveMode = dw.system.Site.getCurrent().getCustomPreferenceValue('SignifydPassiveMode');
        Signifyd.setOrderSessionId(order, orderSessionID);
        var response = Signifyd.Call(order);

        if (!empty(response) && response.declined) {
            Transaction.wrap(function () {
                if (response.declined) {
                    order.custom.SignifydOrderFailedReason = Resource.msg('error.signifyd.order.failed.reason', 'signifyd', null);
                }
                if (!SignifydPassiveMode) {
                    OrderMgr.failOrder(order);
                }
            });
            if (!SignifydPassiveMode) {
                res.json({
                    error: true,
                    errorMessage: Resource.msg('error.technical', 'checkout', null)
                });
                return next();
            }
        }
    }


    // Handles payment authorization
    var handlePaymentResult = COHelpers.handlePayments(order, order.orderNo);

    // Handle custom processing post authorization
    var options = {
        req: req,
        res: res
    };
    var postAuthCustomizations = hooksHelper('app.post.auth', 'postAuthorization', handlePaymentResult, order, options, require('*/cartridge/scripts/hooks/postAuthorizationHandling').postAuthorization);
    if (postAuthCustomizations && Object.prototype.hasOwnProperty.call(postAuthCustomizations, 'error')) {
        res.json(postAuthCustomizations);
        return next();
    }

    if (handlePaymentResult.error) {
        if (SignifydCreateCasePolicy === 'PRE_AUTH') {
            Signifyd.SendTransaction(order);
        }
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    }

    var fraudDetectionStatus = hooksHelper('app.fraud.detection', 'fraudDetection', currentBasket, require('*/cartridge/scripts/hooks/fraudDetection').fraudDetection);
    if (fraudDetectionStatus.status === 'fail') {
        Transaction.wrap(function () { OrderMgr.failOrder(order, true); });

        // fraud detection failed
        req.session.privacyCache.set('fraudDetectionStatus', true);

        res.json({
            error: true,
            cartError: true,
            redirectUrl: URLUtils.url('Error-ErrorCode', 'err', fraudDetectionStatus.errorCode).toString(),
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });

        return next();
    }

    // Places the order
    var placeOrderResult = COHelpers.placeOrder(order, fraudDetectionStatus);
    if (placeOrderResult.error) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    }

    if (req.currentCustomer.addressBook) {
        // save all used shipping addresses to address book of the logged in customer
        var allAddresses = addressHelpers.gatherShippingAddresses(order);
        allAddresses.forEach(function (address) {
            if (!addressHelpers.checkIfAddressStored(address, req.currentCustomer.addressBook.addresses)) {
                addressHelpers.saveAddress(address, req.currentCustomer, UUIDUtils.createUUID());
            }
        });
    }

    /**
     * Seeting auto Delivery attributes
     */
    try {
        if (Site.getCurrent().getCustomPreferenceValue('SorEnabled')) {
            var HasRefillProducts = session.custom.hasSORProducts;
            if (HasRefillProducts) {
                Transaction.wrap(function () {
                    order.custom.OSFUseScheduleJob = true;
                    order.custom.hasSubscriptions = true;
                    order.custom.IsSorOrder = true;
                });
                delete session.custom.hasSORProducts;
            }
        }
    }catch (e) {}

    if (order.getCustomerEmail()) {
        if (!dw.system.Site.getCurrent().getCustomPreferenceValue('klaviyo_enabled')) {
            COHelpers.sendConfirmationEmail(order, req.locale.id); // Reset usingMultiShip after successful Order placement
          }
    }

    // Reset usingMultiShip after successful Order placement
    req.session.privacyCache.set('usingMultiShipping', false);

    /* Signifyd Modification Start */
    if(!afterPayOrder) {
        if (SignifydCreateCasePolicy === 'PRE_AUTH') {
            Signifyd.SendTransaction(order);
        } else {
            Signifyd.setOrderSessionId(order, orderSessionID);
            Signifyd.Call(order, false);
        }
    }

    /* Signifyd Modification End */

    //clearing session variables
    COHelpers.clearSessionVariables();

    // TODO: Exposing a direct route to an Order, without at least encoding the orderID
    //  is a serious PII violation.  It enables looking up every customers orders, one at a
    //  time.
    res.json({
        error: false,
        orderID: order.orderNo,
        orderToken: order.orderToken,
        continueUrl: URLUtils.url('OrderSfra-Confirm').toString()
    });

    return next();
});

server.replace('SubmitPayment',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        var PaymentManager = require('dw/order/PaymentMgr');
        var HookManager = require('dw/system/HookMgr');
        var Resource = require('dw/web/Resource');
        var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
        var BasketMgr = require('dw/order/BasketMgr');

        var viewData = {};
        var paymentForm = server.forms.getForm('billing');

         /**
         * Afterpay execution code
         */
        var paymentMethodID = paymentForm.paymentMethod.value;
        if (paymentMethodID === 'AFTERPAY_PBI') {
            res.json({
                afterpayEnabled: true
            })
            return next();
        }

        // verify billing form data
        var billingFormErrors = COHelpers.validateBillingForm(paymentForm.addressFields);
        var contactInfoFormErrors = COHelpers.validateFields(paymentForm.contactInfoFields);

        var formFieldErrors = [];
        if (Object.keys(billingFormErrors).length) {
            formFieldErrors.push(billingFormErrors);
        } else {
            viewData.address = {
                firstName: { value: paymentForm.addressFields.firstName.value },
                lastName: { value: paymentForm.addressFields.lastName.value },
                address1: { value: paymentForm.addressFields.address1.value },
                address2: { value: paymentForm.addressFields.address2.value },
                city: { value: paymentForm.addressFields.city.value },
                postalCode: { value: paymentForm.addressFields.postalCode.value },
                countryCode: { value: paymentForm.addressFields.country.value }
            };

            if (Object.prototype.hasOwnProperty.call(paymentForm.addressFields, 'states')) {
                viewData.address.stateCode = { value: paymentForm.addressFields.states.stateCode.value };
            }
        }

        if (Object.keys(contactInfoFormErrors).length) {
            formFieldErrors.push(contactInfoFormErrors);
        } else {
            viewData.phone = { value: paymentForm.contactInfoFields.phone.value };
        }

        var currentBasket = BasketMgr.getCurrentBasket();
        var nonGcAmount = COHelpers.getNonGiftCertificateAmount(currentBasket);

        var paymentMethodIdValue = paymentForm.paymentMethod.value;
        if (paymentMethodIdValue === 'GIFT_CERTIFICATE' && nonGcAmount === 0) {
            viewData.paymentMethod = { value: paymentMethodIdValue };
            res.setViewData(viewData);
        }

        if (!PaymentManager.getPaymentMethod(paymentMethodIdValue).paymentProcessor) {
            throw new Error(Resource.msg(
                'error.payment.processor.missing',
                'checkout',
                null
            ));
        }

        var paymentProcessor = PaymentManager.getPaymentMethod(paymentMethodIdValue).getPaymentProcessor();

        var paymentFormResult = '';

        // GC is handled separately
        if (paymentMethodIdValue !== 'GIFT_CERTIFICATE' && nonGcAmount !== 0) {
            if (HookManager.hasHook('app.payment.form.processor.' + paymentProcessor.ID.toLowerCase())) {
                paymentFormResult = HookManager.callHook('app.payment.form.processor.' + paymentProcessor.ID.toLowerCase(),
                    'processForm',
                    req,
                    paymentForm,
                    viewData
                );
            } else {
                paymentFormResult = HookManager.callHook('app.payment.form.processor.default_form_processor', 'processForm');
            }
        }

        if (paymentFormResult && paymentFormResult.error && paymentFormResult.fieldErrors) {
            formFieldErrors.push(paymentFormResult.fieldErrors);
        }

        if (formFieldErrors.length || paymentFormResult.serverErrors) {
            // respond with form data and errors
            res.json({
                form: paymentForm,
                fieldErrors: formFieldErrors,
                serverErrors: paymentFormResult.serverErrors ? paymentFormResult.serverErrors : [],
                error: true
            });
            return next();
        }

        res.setViewData(paymentFormResult.viewData);

        this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
            var BasketMgr = require('dw/order/BasketMgr');
            var HookMgr = require('dw/system/HookMgr');
            var PaymentMgr = require('dw/order/PaymentMgr');
            var Transaction = require('dw/system/Transaction');
            var AccountModel = require('*/cartridge/models/account');
            var OrderModel = require('*/cartridge/models/order');
            var URLUtils = require('dw/web/URLUtils');
            var Locale = require('dw/util/Locale');
            var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
            var hooksHelper = require('*/cartridge/scripts/helpers/hooks');
            var validationHelpers = require('*/cartridge/scripts/helpers/basketValidationHelpers');

            var currentBasket = BasketMgr.getCurrentBasket();

            var billingData = res.getViewData();

            if (!currentBasket) {
                delete billingData.paymentInformation;

                res.json({
                    error: true,
                    cartError: true,
                    fieldErrors: [],
                    serverErrors: [],
                    redirectUrl: URLUtils.url('Cart-Show').toString()
                });
                return;
            }

            var validatedProducts = validationHelpers.validateProducts(currentBasket);
            if (validatedProducts.error) {
                delete billingData.paymentInformation;

                res.json({
                    error: true,
                    cartError: true,
                    fieldErrors: [],
                    serverErrors: [],
                    redirectUrl: URLUtils.url('Cart-Show').toString()
                });
                return;
            }

            var billingAddress = currentBasket.billingAddress;
            var billingForm = server.forms.getForm('billing');
            var paymentMethodID = typeof billingData.paymentMethod != "undefined" ? billingData.paymentMethod.value : '';

            var result;

            billingForm.creditCardFields.cardNumber.htmlValue = '';
            billingForm.creditCardFields.securityCode.htmlValue = '';

            Transaction.wrap(function () {
                if (!billingAddress) {
                    billingAddress = currentBasket.createBillingAddress();
                }

                billingAddress.setFirstName(billingData.address.firstName.value);
                billingAddress.setLastName(billingData.address.lastName.value);
                billingAddress.setAddress1(billingData.address.address1.value);
                billingAddress.setAddress2(billingData.address.address2.value);
                billingAddress.setCity(billingData.address.city.value);
                billingAddress.setPostalCode(billingData.address.postalCode.value);
                if (Object.prototype.hasOwnProperty.call(billingData.address, 'stateCode')) {
                    billingAddress.setStateCode(billingData.address.stateCode.value);
                }
                billingAddress.setCountryCode(billingData.address.countryCode.value);
                if (billingData.phone.value) {
					billingAddress.setPhone(billingData.phone.value);
				}
            });


            // if there is no selected payment option and balance is greater than zero
            if (!paymentMethodID && currentBasket.totalGrossPrice.value > 0 && paymentMethodID !== 'GIFT_CERTIFICATE') {
                var noPaymentMethod = {};

                noPaymentMethod[billingData.paymentMethod.htmlName] =
                    Resource.msg('error.no.selected.payment.method', 'payment', null);

                delete billingData.paymentInformation;

                res.json({
                    form: billingForm,
                    fieldErrors: [noPaymentMethod],
                    serverErrors: [],
                    error: true
                });
                return;
            }

            var processor = PaymentMgr.getPaymentMethod(paymentMethodID).getPaymentProcessor();

            // check to make sure there is a payment processor
            if (!processor) {
                throw new Error(Resource.msg(
                    'error.payment.processor.missing',
                    'checkout',
                    null
                ));
            }

            if (paymentMethodIdValue !== 'GIFT_CERTIFICATE' && nonGcAmount !== 0) {
                if (HookMgr.hasHook('app.payment.processor.' + processor.ID.toLowerCase())) {
                    result = HookMgr.callHook('app.payment.processor.' + processor.ID.toLowerCase(),
                        'Handle',
                        currentBasket,
                        billingData.paymentInformation,
                        paymentMethodID,
                        req
                    );
                } else {
                    result = HookMgr.callHook('app.payment.processor.default', 'Handle');
                }
            }

            // need to invalidate credit card fields
            if (result && result.error) {
                delete billingData.paymentInformation;

                res.json({
                    form: billingForm,
                    fieldErrors: result.fieldErrors,
                    serverErrors: result.serverErrors,
                    error: true
                });
                return;
            }

            if (paymentMethodIdValue !== 'GIFT_CERTIFICATE' && nonGcAmount !== 0) {
                if (HookMgr.hasHook('app.payment.form.processor.' + processor.ID.toLowerCase())) {
                    HookMgr.callHook('app.payment.form.processor.' + processor.ID.toLowerCase(),
                        'savePaymentInformation',
                        req,
                        currentBasket,
                        billingData
                    );
                } else {
                    HookMgr.callHook('app.payment.form.processor.default', 'savePaymentInformation');
                }
            }

            // Calculate the basket
            Transaction.wrap(function () {
                session.custom.NoCall = false;
                basketCalculationHelpers.calculateTotals(currentBasket);
            });

            // Re-calculate the payments.
            var calculatedPaymentTransaction = COHelpers.calculatePaymentTransaction(
                currentBasket
            );

            if (calculatedPaymentTransaction.error) {
                res.json({
                    form: paymentForm,
                    fieldErrors: [],
                    serverErrors: [Resource.msg('error.technical', 'checkout', null)],
                    error: true
                });
                return;
            }

            var usingMultiShipping = req.session.privacyCache.get('usingMultiShipping');
            if (usingMultiShipping === true && currentBasket.shipments.length < 2) {
                req.session.privacyCache.set('usingMultiShipping', false);
                usingMultiShipping = false;
            }

            hooksHelper('app.customer.subscription', 'subscribeTo', [paymentForm.subscribe.checked, currentBasket.customerEmail], function () {});

            var currentLocale = Locale.getLocale(req.locale.id);

            var basketModel = new OrderModel(
                currentBasket,
                { usingMultiShipping: usingMultiShipping, sameAsShipping: paymentForm.shippingAddressUseAsBillingAddress.value, countryCode: currentLocale.country, containerView: 'basket' }
            );

            var accountModel = new AccountModel(req.currentCustomer);
            var renderedStoredPaymentInstrument = COHelpers.getRenderedPaymentInstruments(
                req,
                accountModel
            );

            // Check for AD product
            var showAdWarning = false;
            if (customer.authenticated && customer.registered) {
                var hasAutoDeliveryProduct = COHelpers.hasAutoDeliveryProductInBag();
	            var usersCountry = COHelpers.checkUserSavedAddress();
	            showAdWarning = hasAutoDeliveryProduct && usersCountry;

                if (!empty(currentBasket.getDefaultShipment()) && !empty(currentBasket.getDefaultShipment().shippingAddress) && !empty(currentBasket.getDefaultShipment().shippingAddress.countryCode)) {
                    if (currentBasket.getDefaultShipment().shippingAddress.countryCode.value != 'US' && hasAutoDeliveryProduct) {
                        showAdWarning = true;
                    } else {
                        showAdWarning = false;
                    }
                }
            }

            var orderType = COHelpers.getOrderType(currentBasket);
            var showInternationShipmentMsg = false;
            if (orderType !== 'giftcard' && currentBasket.getDefaultShipment().shippingAddress.countryCode.value != 'US') {
                showInternationShipmentMsg = true;
            }
            delete billingData.paymentInformation;

            res.json({
                renderedPaymentInstruments: renderedStoredPaymentInstrument,
                customer: accountModel,
                order: basketModel,
                form: billingForm,
                showAdWarning: showAdWarning,
                showInternationShipmentMsg: showInternationShipmentMsg,
                error: false
            });
        });

        return next();
    });

server.get('GetGiftCertificateBalance', server.middleware.https, function (req, res, next) {
    var GiftCertificateMgr = require('dw/order/GiftCertificateMgr');
    var StringUtils = require('dw/util/StringUtils');
    var Resource = require('dw/web/Resource');

    var gcCode = req.httpParameterMap.giftCertificateID.value;
    var giftCertificate = GiftCertificateMgr.getGiftCertificateByCode(gcCode);

    if (giftCertificate && giftCertificate.isEnabled()) {
        res.json({
            giftCertificate: {
                ID: giftCertificate.getGiftCertificateCode(),
                balance: StringUtils.formatMoney(giftCertificate.getBalance())
            }
        });
    } else {
        res.json({
            error: Resource.msg('billing.giftcertinvalid', 'checkout', null)
        });
    }
    return next();
});

/**
 * Redeems a gift certificate. If the gift certificate was not successfully
 * redeemed, the form field is invalidated with the appropriate error message.
 * If the gift certificate was redeemed, the form gets cleared. This function
 * is called by an Ajax request and generates a JSON response.
 * @param {String} giftCertCode - Gift certificate code entered into the giftCertCode field in the billing form.
 * @returns {object} JSON object containing the status of the gift certificate.
 */
 function redeemGiftCertificate(giftCertCode) {
    var Status = require('dw/system/Status');
    var BasketMgr = require('dw/order/BasketMgr');
    var GiftCertificate = require('dw/order/GiftCertificate');
    var GiftCertificateMgr = require('dw/order/GiftCertificateMgr');
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
    var Transaction = require('dw/system/Transaction');
    var GiftCertificateStatusCodes = require('dw/order/GiftCertificateStatusCodes');

    var currentBasket = BasketMgr.getCurrentBasket();
    var  gc, newGCPaymentInstrument, gcPaymentInstrument, status, result;

    if (currentBasket) {
        // fetch the gift certificate
        gc = GiftCertificateMgr.getGiftCertificateByCode(giftCertCode);

        if (!gc) {// make sure exists
            result = new Status(Status.ERROR, GiftCertificateStatusCodes.GIFTCERTIFICATE_NOT_FOUND);
        } else if (!gc.isEnabled()) {// make sure it is enabled
            result = new Status(Status.ERROR, GiftCertificateStatusCodes.GIFTCERTIFICATE_DISABLED);
        } else if (gc.getStatus() === GiftCertificate.STATUS_PENDING) {// make sure it is available for use
            result = new Status(Status.ERROR, GiftCertificateStatusCodes.GIFTCERTIFICATE_PENDING);
        } else if (gc.getStatus() === GiftCertificate.STATUS_REDEEMED) {// make sure it has not been fully redeemed
            result = new Status(Status.ERROR, GiftCertificateStatusCodes.GIFTCERTIFICATE_INSUFFICIENT_BALANCE);
        } else if (gc.balance.currencyCode !== currentBasket.getCurrencyCode()) {// make sure the GC is in the right currency
            result = new Status(Status.ERROR, GiftCertificateStatusCodes.GIFTCERTIFICATE_CURRENCY_MISMATCH);
        } else {
            newGCPaymentInstrument = Transaction.wrap(function () {
                gcPaymentInstrument = cartHelper.createGiftCertificatePaymentInstrument(gc, currentBasket);
                basketCalculationHelpers.calculateTotals(currentBasket);
                return gcPaymentInstrument;
            });

            status = new Status(Status.OK);
            status.addDetail('NewGCPaymentInstrument', newGCPaymentInstrument);
            result = status;
        }
    } else {
        result = new Status(Status.ERROR, 'BASKET_NOT_FOUND');
    }
    return result;
}

server.get('RedeemGiftCertificateJson', server.middleware.https, function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    var Transaction = require('dw/system/Transaction');
    var Resource = require('dw/web/Resource');
    var giftCertCode, giftCertStatus;

    giftCertCode = req.httpParameterMap.giftCertCode.stringValue;
    giftCertStatus = redeemGiftCertificate(giftCertCode);

     // Reprice if giftcard was success
     if(!giftCertStatus.error) {
        var currentBasket = BasketMgr.getCurrentBasket();
        Transaction.wrap(function () {
            basketCalculationHelpers.calculateTotals(currentBasket);
        });
    }
    if (giftCertStatus.error)  {
        res.json({
            status: giftCertStatus.code,
            success: !giftCertStatus.error,
            message: Resource.msgf('billing.' + giftCertStatus.code, 'checkout', null, giftCertCode),
            code: giftCertCode
        });
    } else {
        res.json({
            success: true
        });
    }
    return next();
});

server.get('RemoveGiftCertificate', server.middleware.https, function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    var Transaction = require('dw/system/Transaction');
    var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
    var giftCertCode = req.httpParameterMap.giftCertificateID.stringValue;

    var currentBasket = BasketMgr.getCurrentBasket();
    if (!empty(giftCertCode)) {
        Transaction.wrap(function () {
            cartHelper.removeGiftCertificatePaymentInstrument(giftCertCode, currentBasket);
            basketCalculationHelpers.calculateTotals(currentBasket);
        });
    }

    return next();
});

/**
 * Validates the given form and creates response JSON if there are errors.
 * @param {string} form - the customer form to validate
 * @return {Object} validation result
 */
function validateCustomerForm(form) {
    var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');

    var result = COHelpers.validateCustomerForm(form);

    if (result.formFieldErrors.length) {
        result.customerForm.clear();
        // prepare response JSON with form data and errors
        result.json = {
            form: result.customerForm,
            fieldErrors: result.formFieldErrors,
            serverErrors: [],
            error: true
        };
    }

    return result;
}

/**
 * Handles the route:BeforeComplete for a customer form submission.
 * @param {Object} req - request
 * @param {Object} res - response
 * @param {Object} accountModel - Account model object to include in response
 * @param {string} redirectUrl - redirect URL to send back to client
 */
function handleCustomerRouteBeforeComplete(req, res, accountModel, redirectUrl) {
    var URLUtils = require('dw/web/URLUtils');
    var BasketMgr = require('dw/order/BasketMgr');
    var Locale = require('dw/util/Locale');
    var Transaction = require('dw/system/Transaction');
    var OrderModel = require('*/cartridge/models/order');

    var customerData = res.getViewData();
    var currentBasket = BasketMgr.getCurrentBasket();
    if (!currentBasket) {
        res.json({
            error: true,
            cartError: true,
            fieldErrors: [],
            serverErrors: [],
            redirectUrl: URLUtils.url('Cart-Show').toString()
        });
        return;
    }

    Transaction.wrap(function () {
        currentBasket.setCustomerEmail(customerData.customer.email.value);
    });

    var usingMultiShipping = req.session.privacyCache.get('usingMultiShipping');
    if (usingMultiShipping === true && currentBasket.shipments.length < 2) {
        req.session.privacyCache.set('usingMultiShipping', false);
        usingMultiShipping = false;
    }

    var currentLocale = Locale.getLocale(req.locale.id);
    var basketModel = new OrderModel(
        currentBasket,
        { usingMultiShipping: usingMultiShipping, countryCode: currentLocale.country, containerView: 'basket' }
    );

    res.json({
        customer: accountModel,
        error: false,
        order: basketModel,
        csrfToken: customerData.csrfToken,
        redirectUrl: redirectUrl
    });
}

/**
 * Method to check whether the order is eligible for gift shipment or not.
 *
 */
function checkGiftShipment(order) {

    if (!empty(order.defaultShipment.giftMessage)) {
    	return true;
    }

    if ((order.billingAddress.firstName != order.defaultShipment.shippingAddress.firstName || order.billingAddress.lastName != order.defaultShipment.shippingAddress.lastName) && (order.paymentInstruments.length > 0 && order.paymentInstruments[0].paymentMethod != 'AFTERPAY_PBI')) {
    	return true;
    }

	var productLineItems = order.allProductLineItems;
    var giftWrapId = Site.getCurrent().getCustomPreferenceValue('GiftWrapId');
    for(var i = 0; i < productLineItems.length; i++) {
    	var lineItem  = productLineItems[i];
        if (giftWrapId == lineItem.product.ID) {
        	return true;
        }
    }

    return false;

}

/**
 * Handle Ajax registered customer form submit.
 */
server.replace(
    'LoginCustomer',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        var apiCsrfProtection = require('dw/web/CSRFProtection');
        var Resource = require('dw/web/Resource');
        var accountHelpers = require('*/cartridge/scripts/helpers/accountHelpers');

        // validate registered customer form
        var coRegisteredCustomerForm = server.forms.getForm('coRegisteredCustomer');
        var result = validateCustomerForm(coRegisteredCustomerForm);
        if (result.json) {
            res.json(result.json);
            return next();
        }

        // login the registered customer
        var viewData = result.viewData;
        var customerForm = result.customerForm;
        var formFieldErrors = result.formFieldErrors;

        viewData.customerLoginResult = accountHelpers.loginCustomer(customerForm.email.value, customerForm.password.value, false);
        if (viewData.customerLoginResult.error) {
            // add customer error message for invalid password
            res.json({
                form: customerForm,
                fieldErrors: formFieldErrors,
                serverErrors: [],
                customerErrorMessage: Resource.msg('error.message.login.wrong', 'checkout', null),
                error: true
            });
            return next();
        }

        // on login the session transforms so we need to retrieve new tokens
        viewData.csrfToken = apiCsrfProtection.generateToken();

        if(Site.getCurrent().getCustomPreferenceValue('mParticleEnabled')){
            session.privacy.loginEvent = true;
            //Get Wishlist
            var productList = accountHelpers.getWishlistIds();
            var wishlistContent = new dw.util.ArrayList(productList.items);
            var wishlistPids = [];
            try {
                for (var i = 0; i < wishlistContent.length; i++) {
                    if(wishlistContent[i] && wishlistContent[i].product) {
                        wishlistPids.push(wishlistContent[i].product.name);
                    }
                }
                session.privacy.wishlistPids = JSON.stringify(wishlistPids);
                //Get the Subscribed Products List
                var mParticleUtil = require('int_mParticle/cartridge/scripts/mParticleUtils.js');
                mParticleUtil.getCustomersActiveSubscriptions();
            } catch (e) {
                LOGGER.info('mParticle wishlist error', e.toString());
            }
        }

        if(Site.getCurrent().getCustomPreferenceValue('EnableRSCADC')){
            session.privacy.loginEventRSC = true;
            //Get Wishlist
            var productList = accountHelpers.getWishlistIds();
            var wishlistContent = new dw.util.ArrayList(productList.items);
            var wishlistPids = [];
            try {
                for (var i = 0; i < wishlistContent.length; i++) {
                    if(wishlistContent[i] && wishlistContent[i].product) {
                        wishlistPids.push(wishlistContent[i].product.name);
                    }
                }
                session.privacy.wishlistPids = JSON.stringify(wishlistPids);
                //Get the Subscribed Products List
                var rscUtils = require('int_rsc_gpds/cartridge/scripts/rscUtils.js');
                rscUtils.getCustomersActiveSubscriptions();
            } catch (e) {
                LOGGER.info('RSC wishlist error', e.toString());
            }
        }

        /*
        * Patch for handling customer registration on braintree end
        * Once Login and registration is moved to SFRA, default braintree customizations in Account.js can be used
        * for this functionality
        */
        try {
            braintreeUtil.createCustomerOnBraintreeSide();
        } catch (e) {
            LOGGER.warn('Create user on braintree end failed - '+ e.toString());
        }


        res.setViewData(viewData);

        this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
            var AccountModel = require('*/cartridge/models/account');
            var URLUtils = require('dw/web/URLUtils');

            var accountModel = new AccountModel(viewData.customerLoginResult.authenticatedCustomer);
            var redirectUrl = URLUtils.https('Checkout-Begin', 'stage', 'shipping').abs().toString();
            var authCustomer = viewData.customerLoginResult.authenticatedCustomer;
            if (authCustomer && authCustomer.authenticated && authCustomer.registered && authCustomer.profile.addressBook.preferredAddress) {
				redirectUrl = URLUtils.https('Checkout-Begin', 'stage', 'shipping', 'type', 'expresscheckout').abs().toString();
			}
            handleCustomerRouteBeforeComplete(req, res, accountModel, redirectUrl);
        });
        return next();
    }
);

module.exports = server.exports();
