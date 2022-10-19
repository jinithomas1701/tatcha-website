'use strict';

/* global dw request response session customer empty */

/* Braintree Includes */
var BraintreeHelper = require('~/cartridge/scripts/braintree/braintreeHelper');
var braintreeLogger = BraintreeHelper.getLogger();
var prefs = BraintreeHelper.getPrefs();

/* API Includes */
var Transaction = require('dw/system/Transaction');
var URLUtils = require('dw/web/URLUtils');
var BasketMgr = require('dw/order/BasketMgr');

/* Script Modules */
var app = require('app_storefront_controllers/cartridge/scripts/app');
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var responseUtil = require('app_storefront_controllers/cartridge/scripts/util/Response');
var Site = require('dw/system/Site');

/**
 * Get payment method nonce from saved payment instrument by the given UUID
 */
function getPaymentMethodNonceByUUID() {
    var nonce = require('~/cartridge/scripts/braintree/controllerBase').getPaymentMethodNonceByUUID(request.httpParameterMap.id.stringValue);

    responseUtil.renderJSON({
        nonce: nonce
    });
}

/**
 * Removes a product in the cart, on PDP pages    
 */
function removeLineItem (){
    var currentBasket = BasketMgr.getCurrentBasket();
    var productLineItem = currentBasket.getProductLineItems()[0];
    
    Transaction.wrap(function () {
        currentBasket.removeProductLineItem(productLineItem);
    });
}

/**
 * Adds a product in the cart, on PDP pages
 * @param  {Object} args HTTP Call arguments
 * @return {Object}      
 */
function addProduct() {
    var cart = app.getModel('Cart').goc();
    var renderInfo = cart.addProductToCart();

    if (renderInfo.format === 'ajax') {
        var r = require('*/cartridge/scripts/util/Response');
        var currentBasket = dw.order.BasketMgr. getCurrentBasket();
        BraintreeHelper.addDefaultShipping(currentBasket);

        r.renderJSON({
            quantity: currentBasket.getProductQuantityTotal(),
            amount: BraintreeHelper.getAmount(currentBasket).getValue(),
            id: currentBasket.getProductLineItems()[0].getProductID()
        });
    } else {
        request.custom.isBraintreeCustomError = true;
        app.getController('Product').Show(); // eslint-disable-line new-cap
    }
}
/**
 * Trigger Braintree PayPal checkout from cart flow
 * @param  {Object} args HTTP Call arguments
 */
function checkoutFromCart() {
    var processorHandle;
    try {
        var basket = BasketMgr.getCurrentBasket();
        processorHandle = require('~/cartridge/scripts/braintree/processorPaypal').handle(basket, true);
    } catch (error) {
        BraintreeHelper.getLogger().error(error);
    }
    if (processorHandle && processorHandle.success === true) {
		// SinglePage checkout
		if(Site.getCurrent().getCustomPreferenceValue('enableSinglePageCheckout')) {
			session.custom.checkoutState = 'review';
        	require('int_singlepagecheckout/cartridge/controllers/SinglePageCheckout').Start();
        } else {
        	app.getController('COSummary').Start(); // eslint-disable-line new-cap
        }
    } else {
		// Error case for singlepage checkout has to be handled
        request.custom.isBraintreeCustomError = true;
        app.getController('Cart').Show(); // eslint-disable-line new-cap
    }
}

/**
 * Trigger Braintree ApplePay checkout from cart flow
 * @param  {Object} args HTTP Call arguments
 */
function appleCheckoutFromCart() {
    var processorHandle;
    try {
        var basket = BasketMgr.getCurrentBasket();
        processorHandle = require('~/cartridge/scripts/braintree/processorApplepay').handle(basket, true);
    } catch (error) {
        braintreeLogger.error(error);
    }
    if (processorHandle && processorHandle.success === true) {
	
		// SinglePage checkout
		if(Site.getCurrent().getCustomPreferenceValue('enableSinglePageCheckout')) {
			session.custom.checkoutState = 'review';
        	require('int_singlepagecheckout/cartridge/controllers/SinglePageCheckout').Start();
        } else {
        	app.getController('COSummary').Start(); // eslint-disable-line new-cap
        	response.redirect(URLUtils.https('COSummary-Start').toString());
        }
        
    } else {
		// Error case for singlepage checkout has to be handled
        request.custom.isBraintreeCustomError = true;
        app.getController('Cart').Show(); // eslint-disable-line new-cap
    }
}

/**
 * Render template for save credit cart feature
 * @param  {boolean} clearForm  Flag, that indicates if form must be cleared
 * @param  {string}  error      Displayed error
 */
function accountAddCreditCard(clearForm, error) {
    var paymentForm = app.getForm('paymentinstruments');
    var billingForm = app.getForm('billing.billingAddress.addressFields');
    billingForm.clear();
    
    if(session.customer.authenticated) {
        app.getForm('billing').object.billingAddress.addressFields.firstName.value = session.customer.profile.firstName;
        app.getForm('billing').object.billingAddress.addressFields.lastName.value = session.customer.profile.lastName;
    }
    
    var Content = require('app_storefront_controllers/cartridge/scripts/app').getModel('Content');
    var sorAsset = Content.get('myaccount');

    var pageMeta = require('app_storefront_controllers/cartridge/scripts/meta');
    pageMeta.update(sorAsset);
    
    if (clearForm !== false) {
        paymentForm.clear();
    }
    
    BraintreeHelper.getLogger().error(error);
    
    require('app_storefront_controllers/cartridge/scripts/util/SecurityHeaders').setSecurityHeaders();
    
    app.getView({
        continueURL: URLUtils.https('Braintree-AccountAddCreditCardHandle').toString(),
        BraintreeError: error
    }).render('braintree/account/addcreditcard');
}

/**
 * Renders billing page in case of any error on braintree while adding credit card from billing page
 * @param {string}  error      Displayed error
 * **/
function billingAddCreditCardError(clearForm, error) {
	try {
		var paymentForm = app.getForm('paymentinstruments');
	    var billingForm = app.getForm('billing.billingAddress.addressFields');
	    billingForm.clear();
	    paymentForm.clear();
	    BraintreeHelper.getLogger().error(error);
	    session.custom.braintreeError = error;
	    response.redirect(URLUtils.https('COBilling-Start', 'braintreeError', 'true'));
	}catch(err) {}
	
}

/**
 * Save billing address submitted through add credit card from
 * ***/
function saveBillingAddress(httpParameterMap) {
	Transaction.wrap(function () {
		var cart = app.getModel('Cart').get();
		var billingForm = app.getForm('billing.billingAddress.addressFields');
		try {
			var billingAddress = cart.getBillingAddress() || cart.createBillingAddress();
			var firstName = '', lastName = '';
			if(!empty(httpParameterMap.dwfrm_creditcard_owner.stringValue)) {
				var nameList = httpParameterMap.dwfrm_creditcard_owner.stringValue.split(' ');
				
				if(nameList.length > 0) {
					firstName = nameList[0];
					if(nameList.length > 2) {
						nameList.forEach(function(name, index) {
							if(index > 0) {
								lastName += ' '+name;
							}
						})
					} else if(nameList.length === 2) {
						lastName = nameList[1];
					} else {
						lastName = 'NA';
					}
				}
			}
			
			var billingAddressLine1 = billingForm.object.address1.value;
			var billingPostal = billingForm.object.postal.value;
			
			billingAddress.setFirstName(firstName ? firstName : billingForm.object.firstName.value);
			billingAddress.setLastName(lastName? lastName : billingForm.object.lastName.value);
			billingAddress.setAddress1(billingAddressLine1);
			billingAddress.setAddress2(billingForm.object.address2.value);
			billingAddress.setCity(billingForm.object.city.value);
	        billingAddress.setPostalCode(billingPostal);
	        billingAddress.setStateCode(billingForm.object.states.state.value);
	        billingAddress.setCountryCode(billingForm.object.country.value);
	        billingAddress.setPhone(billingForm.object.phone.value);
	        
	        session.custom.braintreeError = '';
	        var shippingAddress = cart.getDefaultShipment().getShippingAddress();
	        if(shippingAddress && !empty(shippingAddress)) {
	        	 if((shippingAddress.address1 !== billingAddressLine1) || (shippingAddress.postalCode !== billingPostal)) {
	        		 session.custom.sameasshipping = false;
	        	 }
	        }
		}catch(err) {}
    });
}

/**
 * Handle action for template with save credit cart feature
 */
function accountAddCreditCardHandle() {
    var paymentForm = app.getForm('paymentinstruments');
    paymentForm.handleAction({
        create: function () {
            var httpParameterMap = request.httpParameterMap;
            session.custom.braintreeError = '';
            if (!BraintreeHelper.isCustomerExist(customer)) {
                var createCustomerOnBraintreeSideData = BraintreeHelper.createCustomerOnBraintreeSide();
                if (createCustomerOnBraintreeSideData.error) {
                    accountAddCreditCard(false, createCustomerOnBraintreeSideData.error);
                    return;
                }
            }
            var pageScope = httpParameterMap.scope ? httpParameterMap.scope.value : '';
            var createPaymentMethodResponseData = BraintreeHelper.createPaymentMethodOnBraintreeSide(httpParameterMap.braintreePaymentMethodNonce.stringValue, httpParameterMap.braintreeCreditCardMakeDefault.booleanValue);
            if (createPaymentMethodResponseData.error) {
            	pageScope == 'billing' ? billingAddCreditCardError(false, createPaymentMethodResponseData.error) : accountAddCreditCard(false, createPaymentMethodResponseData.error);
                return;
            }
            var creditCardForm = app.getForm('creditcard');
            
            var cardDWType;
            if(createPaymentMethodResponseData.creditCard.cardType === 'American Express') {
            	cardDWType = 'Amex';
            } else if(createPaymentMethodResponseData.creditCard.cardType === 'MasterCard') {
            	cardDWType = 'Master';
            } else {
            	cardDWType = createPaymentMethodResponseData.creditCard.cardType;
            }
            
            var isDefaultCard = httpParameterMap.braintreeCreditCardMakeDefault ? httpParameterMap.braintreeCreditCardMakeDefault.booleanValue : false;
            var card = BraintreeHelper.saveCustomerCreditCard(createPaymentMethodResponseData, cardDWType, creditCardForm.get('owner').value());
            if (card.error) {
            	pageScope == 'billing' ? billingAddCreditCardError(false, card.error) : accountAddCreditCard(false, card.error);
                return;
            }
            if (isDefaultCard) {
                BraintreeHelper.saveDefaultCard(card.paymentMethodToken);
            }
            paymentForm.clear();
            require('app_storefront_controllers/cartridge/scripts/util/SecurityHeaders').setSecurityHeaders();
            if(pageScope == 'billing') {
            	saveBillingAddress(httpParameterMap);
            	if(Site.getCurrent().getCustomPreferenceValue('enableSinglePageCheckout')) {
			    	session.custom.checkoutState = 'billing';
			    	session.custom.checkoutMode = 'edit';
					response.redirect(URLUtils.https('SinglePageCheckout-Start'));
			    } else {
			    	response.redirect(URLUtils.https('COBilling-Start', 'triggerEvent', 'selectCard', 'id', card.UUID));
			    }
				return;
			}
			if(request.httpParameterMap.scope.value == 'auto-delivery') {
				var token = card.paymentMethodToken;
				var expirationDate = new Date(card.expirationYear, card.expirationMonth-1, 1);
                var lastDayOfMonth = new dw.util.Calendar(expirationDate);
                lastDayOfMonth.set(dw.util.Calendar.DAY_OF_MONTH, lastDayOfMonth.getActualMaximum(dw.util.Calendar.DAY_OF_MONTH));
                expirationDate = lastDayOfMonth.getTime();
                Transaction.wrap(function () {
	                customer.profile.custom.OsfSorCreditCardExpirationDate = expirationDate;
	            	customer.profile.custom.OsfSorSubscriptionToken = token;
                });
				response.redirect(URLUtils.https('SmartOrderRefillController-Manage'));
				return;
			}
            response.redirect(URLUtils.https('PaymentInstruments-List').toString());
        },
        error: function () {
            accountAddCreditCard(false);
        }
    });
}

/**
 * Remove saved credit cart from customers payment methods
 */
function accountDeleteCreditCard() {
    var paymentForm = app.getForm('paymentinstruments');
    paymentForm.handleAction({
        remove: function (formGroup, action) {
            var token = action.object.custom.braintreePaymentMethodToken;
            Transaction.wrap(function () {
                var wallet = customer.getProfile().getWallet();
                wallet.removePaymentInstrument(action.object);
            });
            
            var osfToken = customer.profile.custom.OsfSorSubscriptionToken;
            if(token == osfToken) {
            	var ProductListMgr = require('dw/customer/ProductListMgr');
            	var ProductLists = ProductListMgr.getProductLists(customer, dw.customer.ProductList.TYPE_CUSTOM_3, "subscription");
            	
            	for (var i in ProductLists) {
                    var ProductList = ProductLists[i];
	            	if(!empty(ProductList)){
	                    Transaction.wrap(function () {
	                        ProductList.setEventState("updated");
	                        ProductList.setEventCity("canceled");
	                    });
	                }
            	}
            	
            	var result = new dw.system.Pipelet('RunJobNow').execute({
                    JobName : 'SORScheduleOrders'
                });

                Transaction.wrap(function () {
                	customer.profile.custom.hasOsfSmartOrderRefill = false;
                	customer.profile.custom.OsfSorSubscriptionToken = null;
                	customer.profile.custom.OsfSorCreditCardExpirationDate = null;
                });
            }
            
            try {
                BraintreeHelper.callApiMethod('deletePaymentMethod', {
                    token: token
                });
            } catch (error) {} // eslint-disable-line no-empty
        }
    });
    response.redirect(URLUtils.https('PaymentInstruments-List').toString());
}

/**
 * Render template for add Venmo account feature
 * @param  {boolean} clearForm  Flag, that indicates if form must be cleared
 * @param  {string}  error      Displayed error
 */
function accountAddVenmoAccount(clearForm, error) {
    var paymentForm = app.getForm('braintreevenmoaccount');
    if (clearForm !== false) {
        paymentForm.clear();
    }
    app.getView({
        continueURL: URLUtils.https('Braintree-AccountAddVenmoAccountHandleForm').toString(),
        BraintreeError: error
    }).render('braintree/account/addvenmoaccount');
}

/**
 * Handle action for template with add Venmo account feature
 */
function accountAddVenmoAccountHandleForm() {
    var paymentForm = app.getForm('braintreevenmoaccount');
    paymentForm.handleAction({
        add: function () {
            var venmo = {
                nonce: paymentForm.get('nonce').value(),
                makeDefault: paymentForm.get('default').value()
            };
            if (!BraintreeHelper.isCustomerExist(customer)) {
                var createCustomerOnBraintreeSideData = BraintreeHelper.createCustomerOnBraintreeSide();
                if (createCustomerOnBraintreeSideData.error) {
                    accountAddVenmoAccount(false, createCustomerOnBraintreeSideData.error);
                    return;
                }
            }
            var createPaymentMethodResponseData = BraintreeHelper.createPaymentMethodOnBraintreeSide(venmo.nonce, venmo.makeDefault);
            if (createPaymentMethodResponseData.error) {
                accountAddVenmoAccount(false, createPaymentMethodResponseData.error);
                return;
            }
            var venmoAccount = saveVenmoAccount(createPaymentMethodResponseData);
            if (venmoAccount.error) {
                accountAddVenmoAccount(false, venmoAccount.error);
                return;
            }
            if (venmo.makeDefault) {
                var makeDefaultCreditCardData = BraintreeHelper.makeDefaultVenmoAccount(venmoAccount.token);
                if (makeDefaultCreditCardData.error) {
                    accountAddVenmoAccount(false, makeDefaultCreditCardData.error);
                    return;
                }
            }
            paymentForm.clear();
            response.redirect(URLUtils.https('PaymentInstruments-List').toString());
        },
        error: function () {
            accountAddVenmoAccount(false);
        }
    });
}

/**
 * Handle make default and remove actions on saved Venmo account
 */
function accountVenmoAccountActionHandle() {
    var paymentForm = app.getForm('braintreevenmoaccount');
    paymentForm.handleAction({
        deletepayment: function () {
            var instrument = BraintreeHelper.getCustomerPaymentInstrument(paymentForm.get('uuid').value());
            var token = instrument.custom.braintreePaymentMethodToken;
            try {
                Transaction.wrap(function () {
                    var wallet = customer.getProfile().getWallet();
                    wallet.removePaymentInstrument(instrument);
                });
                BraintreeHelper.callApiMethod('deletePaymentMethod', {
                    token: token
                });
            } catch (error) {}  // eslint-disable-line no-empty
            response.redirect(URLUtils.https('PaymentInstruments-List').toString());
        },
        makedefault: function () {
            var instrument = BraintreeHelper.getCustomerPaymentInstrument(paymentForm.get('uuid').value());
            BraintreeHelper.makeDefaultVenmoAccount(instrument.custom.braintreePaymentMethodToken);
            response.redirect(URLUtils.https('PaymentInstruments-List').toString());
        },
        error: function () {
            paymentForm.clear();
            response.redirect(URLUtils.https('PaymentInstruments-List').toString());
        }
    });
}

/**
* Saves Venmo account
* @param {boolean} createPaymentMethodResponseData payment method response data
* @returns {Object} Object with token
*/
function saveVenmoAccount(createPaymentMethodResponseData) {
    try {
        Transaction.begin();

        var customerPaymentInstrument = customer.getProfile().getWallet().createPaymentInstrument(BraintreeHelper.prefs.venmoMethodName);
        customerPaymentInstrument.custom.braintreeVenmoUserId = createPaymentMethodResponseData.venmoAccount.venmoUserId;
        customerPaymentInstrument.custom.braintreePaymentMethodToken = createPaymentMethodResponseData.venmoAccount.token;

        Transaction.commit();
    } catch (error) {
        return {
            error: error.customMessage ? error.customMessage : error.message
        };
    }
    return {
        token: createPaymentMethodResponseData.venmoAccount.token
    };
}

/**
 * Render template for add PayPal account feature
 * @param  {boolean} clearForm  Flag, that indicates if form must be cleared
 * @param  {string}  error      Displayed error
 */
function accountAddPaypalAccount(clearForm, error) {
    var paymentForm = app.getForm('braintreepaypalaccount');
    if (clearForm !== false) {
        paymentForm.clear();
    }
    app.getView({
        continueURL: URLUtils.https('Braintree-AccountAddPaypalAccountHandleForm').toString(),
        BraintreeError: error
    }).render('braintree/account/addpaypalaccount');
}

/**
 * Save PayPal account as customer payment method
 * @param  {Object} createPaymentMethodResponseData Responce data from createPaymentMethod API call
 * @return {Object}                                 Object with cart data
 */
function savePaypalAccount(createPaymentMethodResponseData) {
    try {
        Transaction.begin();

        var customerPaymentInstrument = customer.getProfile().getWallet().createPaymentInstrument(BraintreeHelper.prefs.paypalMethodName);
        var paymentForm = app.getForm('braintreepaypalaccount');

        customerPaymentInstrument.custom.braintreePaypalAccountEmail = createPaymentMethodResponseData.paypalAccount.email;
        customerPaymentInstrument.custom.braintreePaypalAccountAddresses = paymentForm.get('addresses').value();
        customerPaymentInstrument.custom.braintreePaymentMethodToken = createPaymentMethodResponseData.paypalAccount.token;

        Transaction.commit();
    } catch (error) {
        return {
            error: error.customMessage ? error.customMessage : error.message
        };
    }
    return {
        token: createPaymentMethodResponseData.paypalAccount.token
    };
}

/**
 * Handle action for template with add PayPal account feature
 */
function accountAddPaypalAccountHandleForm() {
    var paymentForm = app.getForm('braintreepaypalaccount');
    paymentForm.handleAction({
        add: function () {
            var paypal = {
                email: paymentForm.get('email').value(),
                nonce: paymentForm.get('nonce').value(),
                makeDefault: paymentForm.get('default').value()
            };
            if (!BraintreeHelper.isCustomerExist(customer)) {
                var createCustomerOnBraintreeSideData = BraintreeHelper.createCustomerOnBraintreeSide();
                if (createCustomerOnBraintreeSideData.error) {
                    accountAddPaypalAccount(false, createCustomerOnBraintreeSideData.error);
                    return;
                }
            }
            if (BraintreeHelper.getPaypalCustomerPaymentInstrumentByEmail(paypal.email)) {
                accountAddPaypalAccount(false, dw.web.Resource.msgf('braintree.paypal.addaccount.error.existAccount', 'locale', null, paypal.email));
                return;
            }
            var createPaymentMethodResponseData = BraintreeHelper.createPaymentMethodOnBraintreeSide(paypal.nonce, paypal.makeDefault);
            if (createPaymentMethodResponseData.error) {
                accountAddPaypalAccount(false, createPaymentMethodResponseData.error);
                return;
            }
            var paypalAccount = savePaypalAccount(createPaymentMethodResponseData);
            if (paypalAccount.error) {
                accountAddPaypalAccount(false, paypalAccount.error);
                return;
            }
            if (paypal.makeDefault) {
                var makeDefaultCreditCardData = BraintreeHelper.makeDefaultPaypalAccount(paypalAccount.token);
                if (makeDefaultCreditCardData.error) {
                    accountAddPaypalAccount(false, makeDefaultCreditCardData.error);
                    return;
                }
            }
            paymentForm.clear();
            response.redirect(URLUtils.https('PaymentInstruments-List').toString());
        },
        error: function () {
            accountAddPaypalAccount(false);
        }
    });
}

/**
 * Handle make default and remove actions on saved PayPal account
 */
function accountPaypalAccountActionHandle() {
    var paymentForm = app.getForm('braintreepaypalaccount');
    paymentForm.handleAction({
        deletepayment: function () {
            var instrument = BraintreeHelper.getCustomerPaymentInstrument(paymentForm.get('uuid').value());
            var token = instrument.custom.braintreePaymentMethodToken;
            try {
                Transaction.wrap(function () {
                    var wallet = customer.getProfile().getWallet();
                    wallet.removePaymentInstrument(instrument);
                });
                BraintreeHelper.callApiMethod('deletePaymentMethod', {
                    token: token
                });
            } catch (error) {}  // eslint-disable-line no-empty
            response.redirect(URLUtils.https('PaymentInstruments-List').toString());
        },
        makedefault: function () {
            var instrument = BraintreeHelper.getCustomerPaymentInstrument(paymentForm.get('uuid').value());
            BraintreeHelper.makeDefaultPaypalAccount(instrument.custom.braintreePaymentMethodToken);
            response.redirect(URLUtils.https('PaymentInstruments-List').toString());
        },
        error: function () {
            paymentForm.clear();
            response.redirect(URLUtils.https('PaymentInstruments-List').toString());
        }
    });
}

/**
 *    Edit Default Shipping Address for PayPal checkout from the cart with a saved PayPal account
 */
function editDefaultShippinAddress() {
    app.getForm('profile').clear();

    var address = customer.profile.addressBook.getPreferredAddress();
    var profileForm = session.forms.profile;

    app.getForm(profileForm.address).copyFrom(address);
    app.getForm(profileForm.address.states).copyFrom(address);
    app.getView({
        Action: 'edit',
        ContinueURL: URLUtils.https('Braintree-EditDefaultShippinAddressHandle').toString()
    }).render('braintree/account/editdefaultshippingaddress');
}

/**
 *    Edit Default Shipping Address Form Handle
 */
function editDefaultShippinAddressHandle() {
    var success;
    var addressForm = app.getForm('profile.address');

    addressForm.handleAction({
        cancel: function () {
            success = false;
        },
        edit: function () {
            if (!session.forms.profile.address.valid) {
                success = false;
                return;
            }
            var addressForm = session.forms.profile.address; // eslint-disable-line no-shadow
            var basket = BasketMgr.getCurrentBasket();
            Transaction.wrap(function () {
                var address = basket.defaultShipment.createShippingAddress();
                address.setFirstName(addressForm.firstname.value);
                address.setLastName(addressForm.lastname.value);
                address.setAddress1(addressForm.address1.value);
                address.setAddress2(addressForm.address2.value);
                address.setCity(addressForm.city.value);
                address.setPostalCode(addressForm.postal.value);
                address.setStateCode(addressForm.states.state.value);
                address.setCountryCode(addressForm.country.value);
                address.setPhone(addressForm.phone.value);
            });
            success = true;
        },
        error: function () {
            success = false;
        }
    });

    responseUtil.renderJSON({
        success: success
    });
}

//Additional Actions

/**
 * Set Default Card
 */
function makeDefault() {	
	var paymentMethodToken = request.httpParameterMap.Token.value;
	var makeDefaultCreditCardData = BraintreeHelper.makeDefaultCreditCard(paymentMethodToken);	
	response.redirect(URLUtils.https('PaymentInstruments-List'));
}

exports.GetPaymentMethodNonceByUUID = guard.ensure(['https', 'post'], getPaymentMethodNonceByUUID);

exports.CheckoutFromCart = guard.ensure(['https'], checkoutFromCart);

exports.AccountAddCreditCard = guard.ensure(['https', 'get', 'loggedIn'], accountAddCreditCard);
exports.AccountAddCreditCardHandle = guard.ensure(['https', 'post', 'loggedIn'], accountAddCreditCardHandle);
exports.AccountDeleteCreditCard = guard.ensure(['https', 'loggedIn'], accountDeleteCreditCard);

exports.AccountAddPaypalAccount = guard.ensure(['https', 'get', 'loggedIn'], accountAddPaypalAccount);
exports.AccountAddPaypalAccountHandleForm = guard.ensure(['https', 'post', 'loggedIn'], accountAddPaypalAccountHandleForm);
exports.AccountPaypalAccountActionHandle = guard.ensure(['https', 'post', 'loggedIn'], accountPaypalAccountActionHandle);

exports.AccountAddVenmoAccount = guard.ensure(['https', 'get', 'loggedIn'], accountAddVenmoAccount);
exports.AccountAddVenmoAccountHandleForm = guard.ensure(['https', 'post', 'loggedIn'], accountAddVenmoAccountHandleForm);
exports.AccountVenmoAccountActionHandle = guard.ensure(['https', 'post', 'loggedIn'], accountVenmoAccountActionHandle);

exports.EditDefaultShippinAddress = guard.ensure(['https', 'get', 'loggedIn'], editDefaultShippinAddress);
exports.EditDefaultShippinAddressHandle = guard.ensure(['https', 'post', 'loggedIn'], editDefaultShippinAddressHandle);
exports.EditDefaultShippinAddress = guard.ensure(['get', 'loggedIn'], editDefaultShippinAddress);
exports.EditDefaultShippinAddressHandle = guard.ensure(['post', 'loggedIn'], editDefaultShippinAddressHandle);

exports.AppleCheckoutFromCart = guard.ensure(['https', 'post'], appleCheckoutFromCart);

exports.callApiMethod = BraintreeHelper.callApiMethod;
exports.callApiMethodWithoutError = BraintreeHelper.callApiMethodWithoutError;

exports.AddProduct = guard.ensure(['post'], addProduct);
exports.RemoveLineItem = guard.ensure(['post'], removeLineItem);
exports.MakeDefault = guard.ensure(['https', 'get', 'loggedIn'], makeDefault)
