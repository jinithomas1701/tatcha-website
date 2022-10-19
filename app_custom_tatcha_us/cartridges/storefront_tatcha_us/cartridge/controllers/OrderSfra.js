'use strict';

/**
 * @namespace Order
 */

var server = require('server');


var Resource = require('dw/web/Resource');
var URLUtils = require('dw/web/URLUtils');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var Site = require('dw/system/Site');
var CustomerMgr = require('dw/customer/CustomerMgr');
var Cookie = require('dw/web/Cookie');
var tatchaUtil = require('*/cartridge/scripts/util/TatchaSfra');
/**
 * OrderSfra-Confirm : This endpoint is invoked when the shopper's Order is Placed and Confirmed
 * @name Base/Order-Confirm
 * @function
 * @memberof Order
 * @param {middleware} - consentTracking.consent
 * @param {middleware} - server.middleware.https
 * @param {middleware} - csrfProtection.generateToken
 * @param {querystringparameter} - ID - Order ID
 * @param {querystringparameter} - token - token associated with the order
 * @param {category} - sensitive
 * @param {serverfunction} - get
 */
server.post(
    'Confirm',
    consentTracking.consent,
    server.middleware.https,
    csrfProtection.generateToken,
    function (req, res, next) {
        var reportingUrlsHelper = require('*/cartridge/scripts/reportingUrls');
        var OrderMgr = require('dw/order/OrderMgr');
        var OrderModel = require('*/cartridge/models/order');
        var Locale = require('dw/util/Locale');

        var order;

        if (!req.form.orderToken || !req.form.orderID) {
            res.render('/error', {
                message: Resource.msg('error.confirmation.error', 'confirmation', null)
            });

            return next();
        }

            order = OrderMgr.getOrder(req.form.orderID, req.form.orderToken);

        if (!order || order.customer.ID !== req.currentCustomer.raw.ID
        ) {
            res.render('/error', {
                message: Resource.msg('error.confirmation.error', 'confirmation', null)
            });

            return next();
        }
        var lastOrderID = Object.prototype.hasOwnProperty.call(req.session.raw.custom, 'orderID') ? req.session.raw.custom.orderID : null;
        if (lastOrderID === req.querystring.ID) {
            res.redirect(URLUtils.url('Home-Show'));
            return next();
        }

        var config = {
            numberOfLineItems: '*'
        };

        var currentLocale = Locale.getLocale(req.locale.id);

        var orderModel = new OrderModel(
            order,
            { config: config, countryCode: currentLocale.country, containerView: 'basket' }
        );
        var passwordForm;

        var reportingURLs = reportingUrlsHelper.getOrderReportingURLs(order);

        var mParticleEnabled = Site.getCurrent().getCustomPreferenceValue('mParticleEnabled') ? true : false;
        var rscEnabled = Site.getCurrent().getCustomPreferenceValue('EnableRSCADC') ? true : false;
        var mParticleOrderJson = {};
        if(mParticleEnabled || rscEnabled) {
            var mParticleHelper = require('int_mParticle/cartridge/scripts/mParticleUtils.js');
            mParticleOrderJson = JSON.stringify(mParticleHelper.preparePurchaseData(order));
        }
        var shippingAddress = null;
        if(orderModel.shipping && orderModel.shipping.length > 0 && orderModel.shipping[0]){
            shippingAddress = orderModel.shipping[0].shippingAddress;
        }

        var billingSameAsShipping = false;
        if(server.forms.getForm('billing').shippingAddressUseAsBillingAddress.value && !orderModel.hasOnlyGiftCertificate) {
            billingSameAsShipping = true;
        }
        var customer = CustomerMgr.getCustomerByLogin(orderModel.orderEmail);
        var hasShippingItems = order.productLineItems && order.productLineItems.length>0;
        var currentStage = req.querystring.stage;
        var gcPaymentItems = tatchaUtil.getGiftcertificateFromOrder(orderModel);

        // Get the GTM data
        if (Site.getCurrent().getCustomPreferenceValue('enableGTM')) {
            var gtmManager = require('~/cartridge/scripts/util/GoogleTagManager');
            var viewData = res.getViewData();
            viewData.gtmOrderData = gtmManager.getOrderConfirmationDataLayer(order.orderNo);
        }

        //setting order cookie
        try {
            var LOGGER = dw.system.Logger.getLogger('order');
            LOGGER.warn('Before show confirmation - '+order.orderNo);
            var orderCookie = new  Cookie("dw_order_placed", "1");
            orderCookie.path = "/";
            orderCookie.maxAge = 62000000;
            orderCookie.secure = true;
            response.addHttpCookie(orderCookie);
        } catch (e) {}

        if (customer && customer.isRegistered()) {
            res.render('checkout/confirmation/confirmation', {
                order: orderModel,
                returningCustomer: true,
                reportingURLs: reportingURLs,
                orderUUID: order.getUUID(),
                customer: order.customer.profile,
                mParticleOrderJson: mParticleOrderJson,
                hasShippingItems:hasShippingItems,
                billingSameAsShipping: billingSameAsShipping,
                currentStage: currentStage,
                gcPaymentItems: gcPaymentItems,
                CheckoutType: session.custom.checkoutType
            });

        } else {
            passwordForm = server.forms.getForm('newPasswords');
            passwordForm.clear();
            res.render('checkout/confirmation/confirmation', {
                order: orderModel,
                returningCustomer: false,
                passwordForm: passwordForm,
                reportingURLs: reportingURLs,
                orderUUID: order.getUUID(),
                mParticleOrderJson: mParticleOrderJson,
                hasShippingItems:hasShippingItems,
                billingSameAsShipping: billingSameAsShipping,
                currentStage: currentStage,
                gcPaymentItems: gcPaymentItems,
                CheckoutType: session.custom.checkoutType
            });
        }
        delete session.custom.checkoutType;
        req.session.raw.custom.orderID = req.querystring.ID; // eslint-disable-line no-param-reassign
        return next();
    }
);


/**
 * Order-CreateAccount : This endpoint is invoked when a shopper has already placed an Order as a guest and then tries to create an account
 * @name Base/Order-CreateAccount
 * @function
 * @memberof Order
 * @param {middleware} - server.middleware.https
 * @param {middleware} - csrfProtection.validateAjaxRequest
 * @param {querystringparameter} - ID: Order ID
 * @param {httpparameter} - dwfrm_newPasswords_newpassword - Password
 * @param {httpparameter} - dwfrm_newPasswords_newpasswordconfirm - Confirm Password
 * @param {httpparameter} - csrf_token - CSRF token
 * @param {category} - sensitive
 * @param {serverfunction} - post
 */
server.post(
    'CreateAccount',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        var OrderMgr = require('dw/order/OrderMgr');

        var formErrors = require('*/cartridge/scripts/formErrors');

        var passwordForm = server.forms.getForm('newPasswords');
        var newPassword = passwordForm.newpassword.htmlValue;
        //Customization done for removing confirm password
        // var confirmPassword = passwordForm.newpasswordconfirm.htmlValue;
        // if (newPassword !== confirmPassword) {
        //     passwordForm.valid = false;
        //     passwordForm.newpasswordconfirm.valid = false;
        //     passwordForm.newpasswordconfirm.error =
        //         Resource.msg('error.message.mismatch.newpassword', 'forms', null);
        // }

        var order = OrderMgr.getOrder(req.querystring.ID);
        if (!order || order.customer.ID !== req.currentCustomer.raw.ID || order.getUUID() !== req.querystring.UUID) {
            res.json({ error: [Resource.msg('error.message.unable.to.create.account', 'login', null)] });
            return next();
        }

        res.setViewData({ orderID: req.querystring.ID });
        var registrationObj = {
            firstName: order.billingAddress.firstName,
            lastName: order.billingAddress.lastName,
            phone: order.billingAddress.phone,
            email: order.customerEmail,
            password: newPassword
        };

        if (passwordForm.valid) {
            res.setViewData(registrationObj);
            res.setViewData({ passwordForm: passwordForm });

            this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
                var CustomerMgr = require('dw/customer/CustomerMgr');
                var Transaction = require('dw/system/Transaction');
                var accountHelpers = require('*/cartridge/scripts/helpers/accountHelpers');
                var addressHelpers = require('*/cartridge/scripts/helpers/addressHelpers');
                var UUIDUtils = require('dw/util/UUIDUtils');

                var registrationData = res.getViewData();

                var login = registrationData.email;
                var password = registrationData.password;
                var newCustomer;
                var authenticatedCustomer;
                var newCustomerProfile;
                var errorObj = {};

                delete registrationData.email;
                delete registrationData.password;

                // attempt to create a new user and log that user in.
                try {
                    Transaction.wrap(function () {
                        var error = {};
                        newCustomer = CustomerMgr.createCustomer(login, password);

                        var authenticateCustomerResult = CustomerMgr.authenticateCustomer(login, password);
                        if (authenticateCustomerResult.status !== 'AUTH_OK') {
                            error = { authError: true, status: authenticateCustomerResult.status };
                            throw error;
                        }

                        authenticatedCustomer = CustomerMgr.loginCustomer(authenticateCustomerResult, false);

                        if (!authenticatedCustomer) {
                            error = { authError: true, status: authenticateCustomerResult.status };
                            throw error;
                        } else {
                            var mParticleEnabled = Site.getCurrent().getCustomPreferenceValue('mParticleEnabled') ? true : false;
                            var rscEnabled = Site.getCurrent().getCustomPreferenceValue('EnableRSCADC') ? true : false;

                            if(mParticleEnabled){
                                session.privacy.registrationEvent = true;
                            }
                            if(rscEnabled){
                                session.privacy.registrationEventRSC = true;
                            }

                            // assign values to the profile
                            newCustomerProfile = newCustomer.getProfile();

                            newCustomerProfile.firstName = registrationData.firstName;
                            newCustomerProfile.lastName = registrationData.lastName;
                            newCustomerProfile.phoneHome = registrationData.phone;
                            newCustomerProfile.email = login;

                            order.setCustomer(newCustomer);

                            // save all used shipping addresses to address book of the logged in customer
                            var allAddresses = addressHelpers.gatherShippingAddresses(order);
                            allAddresses.forEach(function (address) {
                                addressHelpers.saveAddress(address, { raw: newCustomer }, UUIDUtils.createUUID());
                            });

                            res.setViewData({ newCustomer: newCustomer });
                            res.setViewData({ order: order });
                        }
                    });
                } catch (e) {
                    errorObj.error = true;
                    errorObj.errorMessage = e.authError
                        ? Resource.msg('error.message.unable.to.create.account', 'login', null)
                        : Resource.msg('error.message.account.create.error', 'forms', null);
                }

                delete registrationData.firstName;
                delete registrationData.lastName;
                delete registrationData.phone;

                if (errorObj.error) {
                    res.redirect(URLUtils.url('Login-Show'));
                    return;
                }

                //commenting since we dont need account creation email
                //accountHelpers.sendCreateAccountEmail(authenticatedCustomer.profile);

                 // customization done to change ajax to form redirect
                // res.json({
                //     success: true,
                //     redirectUrl: URLUtils.url('Account-Show', 'registration', 'submitted').toString()
                // });
                res.redirect(URLUtils.url('Account-Show'));
            });
            //Add new email to klaviyo Newsletter Subscription List from confirmation page- Start
            try{
            	var addtoemaillistYN = req.form.addtoemaillist;
				if(addtoemaillistYN){
  					var statusMessage = null;
        			var klaviyoSubscriptionUtils = require('*/cartridge/scripts/utils/klaviyo/klaviyoSubscriptionUtils');
       				if (klaviyoSubscriptionUtils.subscribeToList(order.customerEmail, "confirmation")) {
            			statusMessage = 'success';
        			} else {
           				statusMessage = 'alreadyconfirmed';
        			}
				}
			}catch (e) {

    		}
            //Add new email to klaviyo Newsletter Subscription List from confirmation page- End
        } else {
            // res.json({
            //     fields: formErrors.getFormErrors(passwordForm)
            // });
            res.redirect(URLUtils.url('Login-Show'));
        }

        return next();
    }
);


module.exports = server.exports();
