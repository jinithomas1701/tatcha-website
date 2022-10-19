'use strict';

/**
 * Controller that creates an order from the current basket. It's a pure processing controller and does
 * no page rendering. The controller is used by checkout and is called upon the triggered place order action.
 * It contains the actual logic to authorize the payment and create the order. The controller communicates the result
 * of the order creation process and uses a status object PlaceOrderError to set proper error states.
 * The calling controller is must handle the results of the order creation and evaluate any errors returned by it.
 *
 * @module controllers/COPlaceOrder
 */

/* API Includes */
var OrderMgr = require('dw/order/OrderMgr');
var PaymentMgr = require('dw/order/PaymentMgr');
var Status = require('dw/system/Status');
var Transaction = require('dw/system/Transaction');

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');

var Cart = app.getModel('Cart');
var Order = app.getModel('Order');
var PaymentProcessor = app.getModel('PaymentProcessor');
var BraintreeHelper = require('int_braintree/cartridge/scripts/braintree/braintreeHelper.js');
var Customer = app.getModel('Customer');
var Site = require('dw/system/Site');

/**
 * Responsible for payment handling. This function uses PaymentProcessorModel methods to
 * handle payment processing specific to each payment instrument. It returns an
 * error if any of the authorizations failed or a payment
 * instrument is of an unknown payment method. If a payment method has no
 * payment processor assigned, the payment is accepted as authorized.
 *
 * @transactional
 * @param {dw.order.Order} order - the order to handle payments for.
 * @return {Object} JSON object containing information about missing payments, errors, or an empty object if the function is successful.
 */
function handlePayments(order) {

    if (order.getTotalNetPrice() !== 0.00 && order.getTotalNetPrice().value !== 0) {

        var paymentInstruments = order.getPaymentInstruments();

        if (paymentInstruments.length === 0) {
            return {
                missingPaymentInfo: true
            };
        }
        /**
         * Sets the transaction ID for the payment instrument.
         */
        var handlePaymentTransaction = function () {
            paymentInstrument.getPaymentTransaction().setTransactionID(order.getOrderNo());
        };

        for (var i = paymentInstruments.length-1; i >= 0; i--) {
            var paymentInstrument = paymentInstruments[i];

            if (PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod()).getPaymentProcessor() === null) {

                Transaction.wrap(handlePaymentTransaction);

            } else {

                var authorizationResult = PaymentProcessor.authorize(order, paymentInstrument);

                if (authorizationResult.not_supported || authorizationResult.error) {
                    return {
                        error: true
                    };
                }
                
                //After Pay Changes Start
                if (authorizationResult.not_supported || authorizationResult.error) {
                	return {
                	authorizeError : authorizationResult.authorizationResponse,
                	error: true
                	};
                	}
                //After Pay Changes End
            }
        }
    }

    return {};
}

/**
 * The entry point for order creation. This function is not exported, as this controller must only
 * be called by another controller.
 *
 * @transactional
 * @return {Object} JSON object that is empty, contains error information, or PlaceOrderError status information.
 */
function start() {
    var cart = Cart.get();
    var subscriptionProductList = null;
    var HasRefillProducts = false; 

    if (!cart) {
        app.getController('Cart').Show();
        return {};
    }

    var COShipping = app.getController('COShipping');

    // Clean shipments.
    COShipping.PrepareShipments(cart);
    
    if(cart.getProductLineItems().size() == 0 && cart.getGiftCertificateLineItems().size() > 1 && cart.getPaymentInstruments().size() > 0 && cart.getPaymentInstruments()[0].paymentMethod == 'PayPal'){
    Transaction.wrap(function () {
        cart.calculate();
    	});
	}

    // Make sure there is a valid shipping address, accounting for gift certificates that do not have one.
    if (cart.getProductLineItems().size() > 0 && cart.getDefaultShipment().getShippingAddress() === null) {
        COShipping.Start();
        return {};
    }
    
    if (!empty(cart)) {
    	setGiftCardShipmentMethod(cart);
    }
    
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

    // Make sure the billing step is fulfilled, otherwise restart checkout.
    if (!session.forms.billing.fulfilled.value) {
        app.getController('COCustomer').Start();
        return {};
    }
    //Avalara Change : line 111-115
    var OrderNo = OrderMgr.createOrderNo();
    session.custom.NoCall = false;
   session.custom.OrderNo = OrderNo;
   session.custom.finalCall = true;
    
    Transaction.wrap(function () {
        cart.calculate();
    });
    
    
    // RETURN ERROR IF TAX SERVICE IS DOWN
    if (session.custom.taxError == true) {
    	
        try {
        	var LOGGER = dw.system.Logger.getLogger('order');
        	LOGGER.warn('TAX ERROR PLACE ORDER: Customer Email - ' + app.getForm('login.username').value());
        } catch (e) {}
        
    	return {
                error: true,
                PlaceOrderError: new Status(Status.ERROR, 'taxError')
            };
    }
    
    
    var basket = dw.order.BasketMgr.currentBasket;
    var COBilling = app.getController('COBilling');

    Transaction.wrap(function () {
        if (!COBilling.ValidatePayment(cart)) {
            COBilling.Start();
            return {};
        }
    });

    // Recalculate the payments. If there is only gift certificates, make sure it covers the order total, if not
    // back to billing page.
    Transaction.wrap(function () {
        if (!cart.calculatePaymentTransactionTotal()) {
            COBilling.Start();
            return {};
        }
    });

    // Handle used addresses and credit cards.
    /*var saveCCResult = COBilling.SaveCreditCard();

    if (!saveCCResult) {
        return {
            error: true,
            PlaceOrderError: new Status(Status.ERROR, 'confirm.error.technical')
        };
    }*/

    // Creates a new order. This will internally ReserveInventoryForOrder and will create a new Order with status
    // 'Created'.
    //Avalara Change: pass OrderNo to the cart.createOrder() function
   
    var order = cart.createOrder(OrderNo);
  
    
    if (!order) {

        app.getController('Cart').Show();

        return {};
    }
        
    //set same-as-shipping true
    Transaction.wrap(function () {
    	session.custom.sameasshipping = true;
    });
    
    //Modified to create customer after order placed
	var email = app.getForm('login.username').value();
    var password = app.getForm('profile.login.password').value();
    var passwordConfirmation = app.getForm('profile.login.passwordconfirm').value();
    var createAccount = app.getForm('billing.billingAddress.createaccount').value();
 if (dw.system.Site.getCurrent().getCustomPreferenceValue('SorEnabled')) {
	  var HasRefillProducts = session.custom.hasSORProducts;
    }
    
    var customer= session.customer;

    if(order.paymentInstruments.length > 0) {
    	var paymentInstrument = order.paymentInstruments[0];
    }
    
    var subscriptionProductList = null;
    
    if(empty(email)) {
    	email = cart.getCustomerEmail();
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
    
    //Create Customer Account
    try {
		if(createAccount) {
	    	app.getForm('profile.customer').setValue('firstname', order.billingAddress.firstName);
			app.getForm('profile.customer').setValue('lastname', order.billingAddress.lastName);
			app.getForm('profile.customer').setValue('email', email);
			app.getForm('profile.customer').setValue('orderNo', order.orderNo);
	    	customer = Customer.createAccount(email, password, app.getForm('profile'));
	    	if(customer) {
	    		Transaction.wrap(function () {
	    			order.setCustomer(customer);
	    			if(paymentInstrument.paymentMethod == dw.order.PaymentInstrument.METHOD_CREDIT_CARD) {
		    			paymentInstrument.custom.braintreeSaveCreditCard = true;
		    			paymentInstrument.custom.braintreeCreditCardMakeDefault = true;
		    		}
	    		});	    		
	    		app.getModel('Profile').get(customer.profile).addAddressToAddressBook(order.getDefaultShipment().getShippingAddress());
	    		session.custom.checkoutRegister = true;
	    	}
		}
    } catch(e) {
    	var LOGGER = dw.system.Logger.getLogger('order');
		LOGGER.warn('Create Customer Account failed for order - '+ order.orderNo);
		LOGGER.warn('Error Detail - '+ e.toString());
    }
    
    var handlePaymentsResult = handlePayments(order);

    if (handlePaymentsResult.error) {
        return Transaction.wrap(function () {
            OrderMgr.failOrder(order, true);
            return {
                error: true,
                PlaceOrderError: new Status(Status.ERROR, 'confirm.error.technical')
            };
        });

    } else if (handlePaymentsResult.missingPaymentInfo) {
        return Transaction.wrap(function () {
            OrderMgr.failOrder(order, true);
            return {
                error: true,
                PlaceOrderError: new Status(Status.ERROR, 'confirm.error.technical')
            };
        });
    }
    
    try {
    	var LOGGER = dw.system.Logger.getLogger('order');
    	LOGGER.warn('Session ID - '+ session.sessionID + ', Customer Email - ' + email + 'Order Number - '+order.orderNo);
    } catch (e) {
    	var LOGGER = dw.system.Logger.getLogger('order');
    	LOGGER.warn('Error - '+ e.toString());
    }
    
    var orderPlacementStatus = Order.submit(order, subscriptionProductList, HasRefillProducts);
	if (!orderPlacementStatus.error) {
		try {
			clearForms();
		} catch (e) {
			var LOGGER = dw.system.Logger.getLogger('order');
			LOGGER.warn('Error - '+ e.toString());
		}
		
	}
	
	try {
		//Uncheck first login customer Promotion
	    if (customer && customer.profile) {
		    Transaction.wrap(function () {
		    	customer.profile.custom.IsPromoCustomer = false;
		    	
		    	//update email preference
		    	var reqmap = request.httpParameterMap;
		    	if(request.httpParameterMap.dwfrm_profile_customer_addtoemaillist && request.httpParameterMap.dwfrm_profile_customer_addtoemaillist.value) {
		    		customer.profile.custom.newsletterSubscription = true;
					customer.profile.custom.newsletterFrequency = 'default';
		    	}
		    });
		}
		
		//Create Subscription
		if (HasRefillProducts) {
	    	//var smartOrderRefillControllers = require('int_smartorderrefill_controllers/cartridge/controllers/SmartOrderRefillController.js');
	    	//var subscriptionProductList = smartOrderRefillControllers.CreateSORSubscription(order);
	    	Transaction.wrap(function () {
	    		order.custom.OSFUseScheduleJob = true;
	    		order.custom.hasSubscriptions = true;
				order.custom.IsSorOrder = true;
	    	});
	    	
	    	/*var result = new dw.system.Pipelet('RunJobNow').execute({
		    	JobName : 'SORScheduleOrders'
			});*/
			delete session.custom.hasSORProducts;
	    }		
		
	} catch (e) {
		var LOGGER = dw.system.Logger.getLogger('order');
		LOGGER.warn('Create Customer Account failed for order - '+ order.orderNo);
		LOGGER.warn('Error Detail - '+ e.toString());
	}
	
	return orderPlacementStatus;
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

function clearForms() {
    // Clears all forms used in the checkout process.
    session.forms.singleshipping.clearFormElement();
    session.forms.multishipping.clearFormElement();
    session.forms.billing.clearFormElement();
}

/**
 * Asynchronous Callbacks for OCAPI. These functions result in a JSON response.
 * Sets the payment instrument information in the form from values in the httpParameterMap.
 * Checks that the payment instrument selected is valid and authorizes the payment. Renders error
 * message information if the payment is not authorized.
 */
function submitPaymentJSON() {
    var order = Order.get(request.httpParameterMap.order_id.stringValue);
    if (!order.object || request.httpParameterMap.order_token.stringValue !== order.getOrderToken()) {
        app.getView().render('checkout/components/faults');
        return;
    }
    session.forms.billing.paymentMethods.clearFormElement();

    var requestObject = JSON.parse(request.httpParameterMap.requestBodyAsString);
    var form = session.forms.billing.paymentMethods;

    for (var requestObjectItem in requestObject) {
        var asyncPaymentMethodResponse = requestObject[requestObjectItem];

        var terms = requestObjectItem.split('_');
        if (terms[0] === 'creditCard') {
            var value = (terms[1] === 'month' || terms[1] === 'year') ?
                Number(asyncPaymentMethodResponse) : asyncPaymentMethodResponse;
            form.creditCard[terms[1]].setValue(value);
        } else if (terms[0] === 'selectedPaymentMethodID') {
            form.selectedPaymentMethodID.setValue(asyncPaymentMethodResponse);
        }
    }

    if (app.getController('COBilling').HandlePaymentSelection('cart').error || handlePayments().error) {
        app.getView().render('checkout/components/faults');
        return;
    }
    app.getView().render('checkout/components/payment_methods_success');
}

/*
 * Asynchronous Callbacks for SiteGenesis.
 * Identifies if an order exists, submits the order, and shows a confirmation message.
 */
function submit() {
    var order = Order.get(request.httpParameterMap.order_id.stringValue);
    var orderPlacementStatus;
    if (order.object && request.httpParameterMap.order_token.stringValue === order.getOrderToken()) {
        orderPlacementStatus = Order.submit(order.object);
        if (!orderPlacementStatus.error) {
            clearForms();
            return app.getController('COSummary').ShowConfirmation(order.object);
        }
      
    }
    app.getController('COSummary').Start();
}

/*
 * Module exports
 */

/*
 * Web exposed methods
 */
/** @see module:controllers/COPlaceOrder~submitPaymentJSON */
exports.SubmitPaymentJSON = guard.ensure(['https'], submitPaymentJSON);
/** @see module:controllers/COPlaceOrder~submitPaymentJSON */
exports.Submit = guard.ensure(['https'], submit);

/*
 * Local methods
 */
exports.Start = start;
