'use strict';

/**
 * This controller implements the last step of the checkout. A successful handling
 * of billing address and payment method selection leads to this controller. It
 * provides the customer with a last overview of the basket prior to confirm the
 * final order creation.
 *
 * @module controllers/COSummary
 */

/* API Includes */
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');
var URLUtils = require('dw/web/URLUtils');
var Site = require('dw/system/Site');

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');

var Cart = app.getModel('Cart');
var Order = app.getModel('Order');
var dwutil = require('dw/util');
var Cookie = require('dw/web/Cookie');
var Tatcha = require('app_storefront_core/cartridge/scripts/util/Tatcha');
var securityHeader = require('~/cartridge/scripts/util/SecurityHeaders');
var CustomerMgr = require('dw/customer/CustomerMgr');

/**
 * Renders the summary page prior to order creation.
 * @param {Object} context context object used for the view
 */
function start(context) {
    var cart = Cart.get();

	var cartEmail = cart.getCustomerEmail();
	if(cartEmail) {
		var existingCustomer = CustomerMgr.getCustomerByLogin(cartEmail);
		if(existingCustomer) {
			session.custom.userExist = true;
		}
	}

    // Checks whether all payment methods are still applicable. Recalculates all existing non-gift certificate payment
    // instrument totals according to redeemed gift certificates or additional discounts granted through coupon
    // redemptions on this page.

    //Check applicable Shipping method
    try {
    	Tatcha.filterApplicableShippingMethods(cart);
    	    	var shippingCost = cart.getDefaultShipment().adjustedShippingTotalPrice;
    	    	var cartShipping = cart.getDefaultShipment().getShippingMethod();
    	    	if(cartShipping.custom.isFedex && session.custom.allowZeroFedex != true && shippingCost.value <= 0) {
    	    		Transaction.wrap(function () {
    	    			cart.getDefaultShipment().setShippingMethod(null);
    	            });   
    	    		 response.redirect(URLUtils.https('COShipping-Start'));
    	    		return;
    	    	}
    	   	} catch(err){
    	   		var e = err;
    	   	}
    /*
     * Sets gift card shipment method if the cart/order contains only gift cards.
     */
   	if(!empty(cart)) {
   		setGiftCardShipmentMethod(cart);
   	}
   	
   	
   	/**
   	 * Set firstName and lastName for billingAddress
   	 * If cardholder name is present in paymentInstrument that will be taken
   	 * If not name will be taken from selected shipping address
   	 * **/
   	if(!empty(cart)) {
   		setCustomerBillingName();
   	}
   	 
   	
    var COBilling = app.getController('COBilling');
    securityHeader.setSecurityHeaders();
    if (!COBilling.ValidatePayment(cart)) {
    	
    	if(Site.getCurrent().getCustomPreferenceValue('enableSinglePageCheckout')) {
    		response.redirect(URLUtils.https('COBilling-Start'));
    	} else {
    		COBilling.Start();
    	}

        return;
    } else {
        Transaction.wrap(function () {
            if (!cart.calculatePaymentTransactionTotal()) {
                COBilling.Start();
            }
        });
        
        Transaction.wrap(function () {
        	session.custom.NoCall = false;
            cart.calculate();
        });
        var pageMeta = require('~/cartridge/scripts/meta');
        var viewContext = require('app_storefront_core/cartridge/scripts/common/extend').immutable(context, {
            Basket: cart.object
        });
        pageMeta.update({pageTitle: Resource.msg('summary.meta.pagetitle', 'checkout', 'Tatcha Checkout')});


		var isAfterPayEnabled = Site.getCurrent().getCustomPreferenceValue('enableAfterpay');
		var httpParameterMap = request.httpParameterMap;
		
		if(!isAfterPayEnabled) {
			
	        /* Single Page Checkout*/
	        if(Site.getCurrent().getCustomPreferenceValue('enableSinglePageCheckout')) {
				if(httpParameterMap && httpParameterMap.spcCTAClick.stringValue === 'true') {
					session.custom.checkoutState = 'review';
				} else {
					session.custom.checkoutState = session.custom.checkoutState ? session.custom.checkoutState : 'review';
				}
				session.custom.checkoutMode = '';
	            app.getView().render('singlepagecheckout/singlepagecheckout');
	        } else {
	        	app.getView(viewContext).render('checkout/summary/summary');
	        }
			
		} else {
			var iter = cart.object.getPaymentInstruments().iterator();
		 	var hasAfterPayPaymentInstrument = false;
		    while (iter.hasNext()) {
		       var apPaymentInstrument = iter.next();
		
		        if (apPaymentInstrument.paymentMethod === 'AFTERPAY_PBI') {
					hasAfterPayPaymentInstrument = true;
					break;
		        }
		    }
	
			if(hasAfterPayPaymentInstrument) {
				if(session.custom.apAddressEdit){
					if(cart.getDefaultShipment().shippingAddress.countryCode.value !== 'US' || cart.getTotalGrossPrice().value < Site.getCurrent().getCustomPreferenceValue('apMinThresholdAmount')
							|| cart.getTotalGrossPrice().value > Site.getCurrent().getCustomPreferenceValue('apMaxThresholdAmount')){
						response.redirect(URLUtils.https('COBilling-Start'));
					}else{
						/* Afterpay Includes */
						afterPayAddressEdit(cart, httpParameterMap, viewContext);
					}
				}else{
					require("int_afterpay_core/cartridge/scripts/util/afterpayUtilities.js").disableSummaryForAfterpay(cart, viewContext);
				}
			} else {
				
		        /* Single Page Checkout*/
		        if(Site.getCurrent().getCustomPreferenceValue('enableSinglePageCheckout')) {
		        	
		        	if(httpParameterMap && (httpParameterMap.spcCTAClick.stringValue === 'true' || httpParameterMap.paymentInfoAvailable)) {
						session.custom.checkoutState = 'review';
					} else {
						session.custom.checkoutState = session.custom.checkoutState ? session.custom.checkoutState : 'review';
					}
		        	
		            app.getView().render('singlepagecheckout/singlepagecheckout');
		        } else {
		        	app.getView(viewContext).render('checkout/summary/summary');
		        }
				
				
			}
		}
    }
}

function afterPayAddressEdit(cart, httpParameterMap, viewContext){
	var BasketMgr = require('dw/order/BasketMgr');
	var BraintreeHelper = require('*/cartridge/scripts/braintree/braintreeHelper');
	var braintreeLogger = BraintreeHelper.getLogger();
	try {
		var Logger = dw.system.Logger.getLogger('order');
		var basket = BasketMgr.getCurrentBasket();
		var AfterpayUtilities = require('*/cartridge/scripts/util/afterpayUtilities.js').getAfterpayCheckoutUtilities();
		var paymentTransaction = AfterpayUtilities.getPaymentTransaction(basket);

	    if (empty(paymentTransaction)) {
	        throw new InternalError('Can not find payment transaction');
	    }

	    Logger.debug('Payment status after token generation : ' + session.privacy.afterpaytoken);
	    Transaction.wrap(function () {
	    paymentTransaction.custom.apInitialStatus = "SUCCESS";
	    paymentTransaction.custom.apToken = session.privacy.afterpaytoken;
	    });
	    
	    //setting phone number incase customer updated in shipping page
	    if(!empty(cart.getDefaultShipment().getShippingAddress())){
	    	var billingAddress = cart.getBillingAddress();
	    	if(!empty(billingAddress)){
	    		Transaction.wrap(function () {
	    			billingAddress.setPhone(cart.getDefaultShipment().getShippingAddress().getPhone());
	    		});
	    	}
	    }
	    session.custom.afterpayamount = cart.getTotalGrossPrice().value;
	   
    } catch (error) {
        braintreeLogger.error(error);
    }

	/* Single Page Checkout*/
	if(Site.getCurrent().getCustomPreferenceValue('enableSinglePageCheckout')) {
		if(httpParameterMap && (httpParameterMap.spcCTAClick.stringValue === 'true' || httpParameterMap.paymentInfoAvailable)) {
			session.custom.checkoutState = 'review';
		} else {
			session.custom.checkoutState = session.custom.checkoutState ? session.custom.checkoutState : 'review';
		}
		response.redirect(URLUtils.https('SinglePageCheckout-Start'));
	} else {
		app.getView(viewContext).render('checkout/summary/summary');
	}
}
    
/**
 * This function is called when the "Place Order" action is triggered by the
 * customer.
 */
function submit() {
	//Signifyd Code
	var Signifyd = require('int_signifyd/cartridge/scripts/service/signifyd');
	var orderSessionID = Signifyd.getOrderSessionId();

    // Calls the COPlaceOrder controller that does the place order action and any payment authorization.
    // COPlaceOrder returns a JSON object with an order_created key and a boolean value if the order was created successfully.
    // If the order creation failed, it returns a JSON object with an error key and a boolean value.
	var cart = app.getModel('Cart').get();
	var Customer = app.getModel('Customer');
	var email = app.getForm('login.username').value();
    var password = app.getForm('profile.login.password').value();
    var passwordConfirmation = app.getForm('profile.login.passwordconfirm').value();
   
    var createAccount = app.getForm('billing.billingAddress.createaccount').value();
	if (dw.system.Site.getCurrent().getCustomPreferenceValue('SorEnabled')) {
		var hasSORProducts = session.custom.hasSORProducts;
	}
  
    var customer= session.customer;
    var profileValidation = true;
    var afterPayOrder=false;
        
    if(empty(email)) {
    	email = cart.getCustomerEmail();
    }
    
    //Save Device Data
    if(!empty(request.httpParameterMap.braintreeDeviceData)) {
    	var paymentInstruments = cart.getPaymentInstruments();
    	Transaction.wrap(function() {
    		for(var i=0; i< paymentInstruments.length; i++) {
        		var paymentInstrument = paymentInstruments[i];
        		if(paymentInstrument.getPaymentMethod() == dw.order.PaymentInstrument.METHOD_CREDIT_CARD) {
        			paymentInstrument.custom.braintreeFraudRiskData = request.httpParameterMap.braintreeDeviceData;
        		}
        		if(paymentInstrument.getPaymentMethod() =='AFTERPAY_PBI'){
        			afterPayOrder=true;
        		}
        	}
    	});
    }
    
    if(!customer.authenticated) {
    	Transaction.wrap(function () {
			if(email) {
				cart.setCustomerEmail(email);
			}
		});
    
    	if(createAccount == true) {
            if (password !== passwordConfirmation) {
                app.getForm('profile.login.passwordconfirm').invalidate();
                profileValidation = false;
            }
            var existingCustomer = Customer.retrieveCustomerByLogin(email);
            if (existingCustomer !== null) {
            	app.getForm('login.username').invalidate();
                profileValidation = false;
            }
    	} else {
    		if (hasSORProducts){
    			app.getForm('profile.login.password').invalidate();
                profileValidation = false;
    		}
    	}
    	if(!profileValidation) {
        	start();
        	return;
        }
    }
    
    //Place Order
    securityHeader.setSecurityHeaders();
	var placeOrderResult = app.getController('COPlaceOrder').Start();
	
    if (placeOrderResult.error) {
    	
    	//Temporary code
        try {
        	var LOGGER = dw.system.Logger.getLogger('order');
        	LOGGER.warn('Order failed - '+placeOrderResult.Order.orderNo);
        } catch (e) {}
        
       /* start({
            PlaceOrderError: placeOrderResult.PlaceOrderError
        });*/
        if(afterPayOrder){
        	 var error = !empty(placeOrderResult.afterpayOrderAuthorizeError) ? placeOrderResult.afterpayOrderAuthorizeError : Resource.msg('apierror.flow.default', 'afterpay', null);
        	 if(Site.getCurrent().getCustomPreferenceValue('enableSinglePageCheckout')) {
             	session.custom.checkoutState = 'billing';
             	session.custom.checkoutMode = 'edit';
             	response.redirect(URLUtils.https('SinglePageCheckout-Start', 'afterpay', error));
             }else{
        	 response.redirect(URLUtils.https('COBilling-Start', 'afterpay', error));
             }
        }
        else{
        	response.redirect(URLUtils.https('COSummary-Start','PlaceOrderError',true));	
        }
        
    } else if (placeOrderResult.order_created) {
    	
    	//Temporary code
        try {
        	var LOGGER = dw.system.Logger.getLogger('order');
        	LOGGER.warn('Order success - '+placeOrderResult.Order.orderNo);
        } catch (e) {}
        
    	session.custom.selectedShippingAddress = null;
    	session.custom.selectedBillingAddress = null;
    	session.custom.expresshippingaddressid = null;
    	
    	if(!afterPayOrder){
    	//Signifyd API Call
        Signifyd.setOrderSessionId(placeOrderResult.Order, orderSessionID);
        Signifyd.Call(placeOrderResult.Order,false);
    	}

        showConfirmation(placeOrderResult.Order);

    }
}

/**
 * Renders the order confirmation page after successful order
 * creation. If a nonregistered customer has checked out, the confirmation page
 * provides a "Create Account" form. This function handles the
 * account creation.
 */
function showConfirmation(order) {
	var customerForm = app.getForm('profile.customer');
    customerForm.setValue('firstname', order.billingAddress.firstName);
    customerForm.setValue('lastname', order.billingAddress.lastName);
    customerForm.setValue('email', order.customerEmail);
    customerForm.setValue('orderNo', order.orderNo);
    
    app.getForm('profile.login.passwordconfirm').clear();
    app.getForm('profile.login.password').clear();
    //reset the session variable for express checkout
    session.custom.expresshippingmethod = null;
    
    
    /* Single Page Checkout*/
    if(Site.getCurrent().getCustomPreferenceValue('enableSinglePageCheckout')) {
    	session.custom.checkoutState = '';
    	session.custom.checkoutMode = '';
    	delete session.custom.isAfterPayFailed;
    	delete session.privacy.apchecksum;
    	delete session.privacy.afterpaytoken;
    	delete session.custom.afterpayamount;
    	delete session.custom.apAddressEdit;
    }
    
    
    var pageMeta = require('~/cartridge/scripts/meta');
    pageMeta.update({pageTitle: Resource.msg('confirmation.meta.pagetitle', 'checkout', 'Tatcha Checkout Confirmation')});

	//Temporary code
    try {
    	var LOGGER = dw.system.Logger.getLogger('order');
        LOGGER.warn('Before show confirmation - '+order.orderNo);
        var customer=session.customer;
        var orderCookie = new  Cookie("dw_order_placed", "1");
        orderCookie.path = "/";
        orderCookie.maxAge = 62000000;
        orderCookie.secure = true;
        response.addHttpCookie(orderCookie);
    } catch (e) {}
    
    app.getView({
        Order: order,
        CheckoutType : (request.httpParameterMap) ? request.httpParameterMap.checkoutType : "", //gtm change
        ContinueURL: URLUtils.https('Account-RegistrationForm') // needed by registration form after anonymous checkouts
    }).render('checkout/confirmation/confirmation');
}

function setCustomerBillingName() {
	
	try {
		var cart = app.getModel('Cart').get();
		var paymentInstruments = cart.getPaymentInstruments();
		var billingAddress = cart.getBillingAddress() || cart.createBillingAddress();
		Transaction.wrap(function () {
			if(!empty(paymentInstruments) && paymentInstruments.length > 0) {
				var firstName='', lastName='';
				for(var i=0; i< paymentInstruments.length; i++) {
	        		var paymentInstrument = paymentInstruments[i];
	        		if(paymentInstrument.getPaymentMethod() == dw.order.PaymentInstrument.METHOD_CREDIT_CARD) {
	        			if(!empty(paymentInstrument.creditCardHolder)) {
	    					var nameList = paymentInstrument.creditCardHolder.toString().split(' ');
	    					
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
	    							lastName = firstName;
	    						}
	    					}
	    					
	    					billingAddress.setFirstName(firstName);
	    					billingAddress.setLastName(lastName);
	    					
	    				}
	        		}
	        	}
			}
		})
	} catch(err) {}
}

/**
 * Method to set the shipment method to gift card 
 * if the order contain only gift cards.
 */
function setGiftCardShipmentMethod(cart) {
    var giftCertificateLineItems = cart.getGiftCertificateLineItems();
	var giftCardMethod = null;
    if (!empty(giftCertificateLineItems) && giftCertificateLineItems.length > 0) {
    	var allMethods = dw.order.ShippingMgr.getAllShippingMethods();
		for (var i = 0; i < allMethods.length; i++) {
			var method = allMethods[i];
			if('productMatrix_GiftCard' == method.ID) {
				giftCardMethod = method;
				break;
			}
		}
		if(giftCardMethod != null) {
			Transaction.wrap(function () {
				for (var s=0; s < giftCertificateLineItems.length; s++) {
					var gcli = giftCertificateLineItems[s];
					gcli.getShipment().setShippingMethod(giftCardMethod);
				}
			});  
		}
    }
}


function createNewAccount(){
	
	var profileValidation = true;
	var Customer = app.getModel('Customer');
	var hm = request.httpParameterMap;
	var email = hm.login_username.value;
	var password = app.getForm('profile.login.password').value();
    var passwordConfirmation = app.getForm('profile.login.passwordconfirm').value();
    var orderNo = hm.orderNo.value;
    var order = dw.order.OrderMgr.getOrder(orderNo);
    var addemail = app.getForm('profile.customer.addtoemaillist').value();
    
    if (password !== passwordConfirmation) {
        app.getForm('profile.login.passwordconfirm').invalidate();
        profileValidation = false;
    }
    var existingCustomer = null;
    if(email !== null){
    	existingCustomer = Customer.retrieveCustomerByLogin(email);
    }
    if (existingCustomer !== null) {
    	app.getForm('login.username').invalidate();
    	profileValidation = false;
    }
    
    if(profileValidation){
	    app.getForm('profile.customer').setValue('firstname', order.billingAddress.firstName);
		app.getForm('profile.customer').setValue('lastname', order.billingAddress.lastName);
		app.getForm('profile.customer').setValue('email', email);
		app.getForm('profile.customer').setValue('orderNo', order.orderNo);
		customer = Customer.createAccount(email, password, app.getForm('profile'));

		//Create Customer Account
	    try {
			if(customer) {
	    		Transaction.wrap(function () {
	    			order.setCustomer(customer);
	    			if(addemail == true){
	    				customer.profile.custom.newsletterSubscription = true;
						customer.profile.custom.newsletterFrequency = 'default';
	    			}
	    		});	    		
	    		app.getModel('Profile').get(customer.profile).addAddressToAddressBook(order.getDefaultShipment().getShippingAddress());
	    		session.custom.checkoutRegister = true;
                if(Site.getCurrent().getCustomPreferenceValue('mParticleEnabled')) {
                	session.privacy.registrationEvent = true;
                }
				if(Site.getCurrent().getCustomPreferenceValue('EnableRSCADC')) {
                	session.privacy.registrationEventRSC = true;
                }
	    	}
		
	    } catch(e) {
	    	var LOGGER = dw.system.Logger.getLogger('order');
			LOGGER.warn('Create Customer Account failed for order - '+ order.orderNo);
			LOGGER.warn('Error Detail - '+ e.toString());
	    }
	    
	    response.redirect(URLUtils.https('Account-Show','Registration','true'));
		
    } else {
    	app.getView({
            ContinueURL: URLUtils.https('Account-RegistrationForm')
        }).render('account/user/registration');
    }
	
}

/*
 * Module exports
 */

/*
 * Web exposed methods
 */
/** @see module:controllers/COSummary~Start */
exports.Start = guard.ensure(['https'], start);
/** @see module:controllers/COSummary~Submit */
exports.Submit = guard.ensure(['https', 'post', 'csrf'], submit);
/** @see module:controllers/COSummary~CreateAccount */
exports.CreateNewAccount = guard.ensure(['https', 'post'], createNewAccount);

/*
 * Local method
 */
exports.ShowConfirmation = showConfirmation;
