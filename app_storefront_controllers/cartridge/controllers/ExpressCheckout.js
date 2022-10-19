/**
* This controller provides expresscheckout functionality
*
* @module  controllers/ExpressCheckout
*/

'use strict';

/* API Includes */
var CustomerMgr = require('dw/customer/CustomerMgr');
var HashMap = require('dw/util/HashMap');
var Resource = require('dw/web/Resource');
var Status = require('dw/system/Status');
var ShippingMgr = require('dw/order/ShippingMgr');
var Site = require('dw/system/Site');
var Transaction = require('dw/system/Transaction');
var URLUtils = require('dw/web/URLUtils');
var StringUtils = require('dw/util/StringUtils');
var dwcontent = require('dw/content');
var GiftCertificate = require('dw/order/GiftCertificate');
var GiftCertificateMgr = require('dw/order/GiftCertificateMgr');
var GiftCertificateStatusCodes = require('dw/order/GiftCertificateStatusCodes');
var PaymentInstrument = require('dw/order/PaymentInstrument');
var PaymentMgr = require('dw/order/PaymentMgr');
var ProductListMgr = require('dw/customer/ProductListMgr');
var Countries = require('app_storefront_core/cartridge/scripts/util/Countries');
var OrderMgr = require('dw/order/OrderMgr');

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');

var Cart = app.getModel('Cart');
var Order = app.getModel('Order');
var PaymentProcessor = app.getModel('PaymentProcessor');
var BraintreeHelper = require('int_braintree/cartridge/scripts/braintree/braintreeHelper.js');
var Customer = app.getModel('Customer');
var Tatcha = require('app_storefront_core/cartridge/scripts/util/Tatcha');
/**
* Description of the function
*
* @return {String} The string 'myFunction'
*/
function start() {
    var cart = Cart.get();
    var physicalShipments, pageMeta, homeDeliveries;

    // Checks whether all payment methods are still applicable. Recalculates all existing non-gift certificate payment
    // instrument totals according to redeemed gift certificates or additional discounts granted through coupon
    // redemptions on this page.
    
    // Get Shipment / Shipping Address
    if (!cart) {
        app.getController('Cart').Show();
        return;
    } else {
    	app.getController('Cart').RevalidateGiftCertificatePayment();
    }
    
    physicalShipments = cart.getPhysicalShipments();
    
    if (customer.authenticated && customer.registered && customer.addressBook.preferredAddress) {
    	if (session.custom.expresshippingaddressid) {
    		for (var j = 0; j < customer.addressBook.addresses.length; j++) {
    			if (customer.addressBook.addresses[j].ID == session.custom.expresshippingaddressid) {
    				app.getForm('singleshipping').object.shippingAddress.addressFields.firstName.value = customer.addressBook.addresses[j].firstName;
    				app.getForm('singleshipping').object.shippingAddress.addressFields.lastName.value = customer.addressBook.addresses[j].lastName;
    				app.getForm('singleshipping').object.shippingAddress.addressFields.address1.value = customer.addressBook.addresses[j].address1;
    				app.getForm('singleshipping').object.shippingAddress.addressFields.address2.value = customer.addressBook.addresses[j].address2;
    				app.getForm('singleshipping').object.shippingAddress.addressFields.city.value = customer.addressBook.addresses[j].city;
    				app.getForm('singleshipping').object.shippingAddress.addressFields.postal.value = customer.addressBook.addresses[j].postalCode;
    				app.getForm('singleshipping').object.shippingAddress.addressFields.states.state.value = customer.addressBook.addresses[j].stateCode;
    				app.getForm('singleshipping').object.shippingAddress.addressFields.country.value = customer.addressBook.addresses[j].countryCode.value;
    				app.getForm('singleshipping').object.shippingAddress.addressFields.phone.value = customer.addressBook.addresses[j].phone;
    			}
    		}	
    	} else {
        	app.getForm('singleshipping.shippingAddress.addressFields').copyFrom(customer.addressBook.preferredAddress);
        	app.getForm('singleshipping.shippingAddress.addressFields.states').copyFrom(customer.addressBook.preferredAddress);
    	}
    } else {
    	 app.getController('Cart').Show();
         return;
    }
    
    
    if(customer.authenticated && customer.registered 
    		&& app.getForm('singleshipping.shippingAddress.addressFields.firstName').value() == null 
    		&& app.getForm('singleshipping.shippingAddress.addressFields.lastName').value() == null) {
    	var values = {
		  'firstName': session.customer.profile.firstName, 
		  'lastName': session.customer.profile.lastName
	    };
    	app.getForm('singleshipping.shippingAddress.addressFields').copyFrom(values);
    }
    
    getapplicableshippingmethod();
    // Save Shipping Address to Basket
    
    // Prepare shipments
    homeDeliveries = prepareShipments();

    Transaction.wrap(function () {
        cart.calculate();
    });
    
    if(session.customer.authenticated) {
    	var profileForm = session.forms.profile;
        var values = {
    	  'firstName': session.customer.profile.firstName, 
    	  'lastName': session.customer.profile.lastName
        };
        app.getForm(profileForm.address).copyFrom(values);
    }
    
    handleShippingSettings(cart);
    
 // Attempts to save the used shipping address in the customer address book.
    if (customer.authenticated && session.forms.singleshipping.shippingAddress.addToAddressBook.value) {
        app.getModel('Profile').get(customer.profile).addAddressToAddressBook(cart.getDefaultShipment().getShippingAddress());
    }
    // Binds the store message from the user to the shipment.
    if (Site.getCurrent().getCustomPreferenceValue('enableStorePickUp')) {
        if (!app.getForm(session.forms.singleshipping.inStoreShipments.shipments).copyTo(cart.getShipments())) {
            require('./Cart').Show();
            return;
        }
    }

    // Mark step as fulfilled.
    session.forms.singleshipping.fulfilled.value = true;
    
    //Get Billing Address from users profile
    app.getForm('singleshipping').object.shippingAddress.useAsBillingAddress.value = true;
    initAddressForm(cart);
    initEmailAddress(cart);
    
    //test
    var creditCardList = initCreditCardList(cart);
    var applicablePaymentMethods = creditCardList.ApplicablePaymentMethods;

    var billingForm = app.getForm('billing').object;
    var paymentMethods = billingForm.paymentMethods;
    if (paymentMethods.valid) {
        paymentMethods.selectedPaymentMethodID.setOptions(applicablePaymentMethods.iterator());
    } else {
        paymentMethods.clearFormElement();
    }

    app.getForm('billing.couponCode').clear();
    app.getForm('billing.giftCertCode').clear();
    
  // startExpress(cart, {ApplicableCreditCards: creditCardList.ApplicableCreditCards});
    
    app.getController('COShipping').PrepareShipments();

    Transaction.wrap(function () {
        cart.calculate();
    });
    
    app.getForm('profile').clear();

    if(session.customer.authenticated) {
    	var profileForm = session.forms.profile;
        var values = {
    	  'firstName': session.customer.profile.firstName, 
    	  'lastName': session.customer.profile.lastName
        };
        app.getForm(profileForm.address).copyFrom(values);
    }
    
    //end
    handleBillingAddress(cart);
    // Get Payment instrument from user
    
    
    // Save payment instrument to Basket
    
    
    // Calculate taxes
     updateCreditCardSelection();
    // Summary page
    require('~/cartridge/scripts/util/SecurityHeaders').setSecurityHeaders();
    if (!resetPaymentForms() || !validateBilling() || !handleBillingAddress(cart) || // Performs validation steps, based upon the entered billing address
            // and address options.
            handlePaymentSelection(cart).error) {// Performs payment method specific checks, such as credit card verification.
                returnToForm(cart);
            } else {

                if (customer.authenticated && app.getForm('billing').object.billingAddress.addToAddressBook.value) {
                    app.getModel('Profile').get(customer.profile).addAddressToAddressBook(cart.getBillingAddress());
                }

                // Mark step as fulfilled
                app.getForm('billing').object.fulfilled.value = true;
                
                if(request.httpParameterMap.dwfrm_billing_addressList) {
                	session.custom.selectedBillingAddress = request.httpParameterMap.dwfrm_billing_addressList.value;
                }
                
                //Calculate Tax for Express checkout 
                /*Transaction.wrap(function () {
	            	session.custom.NoCall = false;
	                cart.calculate();
	            });*/

                // A successful billing page will jump to the next checkout step.
                app.getController('COSummary').Start();
                
                return;
            }
        
}




function handleShippingSettings(cart) {
    Transaction.wrap(function () {
        var defaultShipment, shippingAddress;
        defaultShipment = cart.getDefaultShipment();
        shippingAddress = cart.createShipmentShippingAddress(defaultShipment.getID());

        shippingAddress.setFirstName(session.forms.singleshipping.shippingAddress.addressFields.firstName.value);
        shippingAddress.setLastName(session.forms.singleshipping.shippingAddress.addressFields.lastName.value);
        shippingAddress.setAddress1(session.forms.singleshipping.shippingAddress.addressFields.address1.value);
        shippingAddress.setAddress2(session.forms.singleshipping.shippingAddress.addressFields.address2.value);
        shippingAddress.setCity(session.forms.singleshipping.shippingAddress.addressFields.city.value);
        shippingAddress.setPostalCode(session.forms.singleshipping.shippingAddress.addressFields.postal.value);
        shippingAddress.setStateCode(session.forms.singleshipping.shippingAddress.addressFields.states.state.value);
        shippingAddress.setCountryCode(session.forms.singleshipping.shippingAddress.addressFields.country.value);
        shippingAddress.setPhone(session.forms.singleshipping.shippingAddress.addressFields.phone.value);
        
        if(!empty(session.custom.expresshippingmethod)){
        	cart.updateShipmentShippingMethod(cart.getDefaultShipment().getID(), session.custom.expresshippingmethod, null, null);
        } else {
        	cart.updateShipmentShippingMethod(cart.getDefaultShipment().getID(), session.forms.singleshipping.shippingAddress.shippingMethodID.value, null, null);
        }
        
        if(defaultShipment.gift){
            if(!cart.checkCartHasGiftWrap()) {
            	var giftWrapId = Site.getCurrent().getCustomPreferenceValue('GiftWrapId');
                var params = request.httpParameterMap;
                var Product = app.getModel('Product');
                var productOptionModel;
                var previousBonusDiscountLineItems = cart.getBonusDiscountLineItems();

                var productToAdd = Product.get(giftWrapId);
                productOptionModel = productToAdd.updateOptionSelection(params);
                cart.addProductItem(productToAdd.object, 1, productOptionModel);

                var newBonusDiscountLineItem = cart.getNewBonusDiscountLineItem(previousBonusDiscountLineItems);
            }         
           } else {
            var plis = cart.getProductLineItems();
            for (var i = 0, il = plis.length; i < il; i++) {
                   var item = plis[i];
                   if (item.product.ID == giftWrapId) {
                    Transaction.wrap(function () {
                           cart.removeProductLineItem(item);
                       });
                   }
            }
           }
        
        cart.calculate();

        cart.validateForCheckout();
    });
}


// get init form for billing address

/**
 * Initializes the address form. If the customer chose "use as billing
 * address" option on the single shipping page the form is prepopulated with the shipping
 * address, otherwise it prepopulates with the billing address that was already set.
 * If neither address is available, it prepopulates with the default address of the authenticated customer.
 */
function initAddressForm(cart) {
	if (app.getForm('singleshipping').object.shippingAddress.useAsBillingAddress.value === true) {
        app.getForm('billing').object.billingAddress.addressFields.firstName.value = app.getForm('singleshipping').object.shippingAddress.addressFields.firstName.value;
        app.getForm('billing').object.billingAddress.addressFields.lastName.value = app.getForm('singleshipping').object.shippingAddress.addressFields.lastName.value;
        app.getForm('billing').object.billingAddress.addressFields.address1.value = app.getForm('singleshipping').object.shippingAddress.addressFields.address1.value;
        app.getForm('billing').object.billingAddress.addressFields.address2.value = app.getForm('singleshipping').object.shippingAddress.addressFields.address2.value;
        app.getForm('billing').object.billingAddress.addressFields.city.value = app.getForm('singleshipping').object.shippingAddress.addressFields.city.value;
        app.getForm('billing').object.billingAddress.addressFields.postal.value = app.getForm('singleshipping').object.shippingAddress.addressFields.postal.value;
        app.getForm('billing').object.billingAddress.addressFields.phone.value = app.getForm('singleshipping').object.shippingAddress.addressFields.phone.value;
        app.getForm('billing').object.billingAddress.addressFields.states.state.value = app.getForm('singleshipping').object.shippingAddress.addressFields.states.state.value;
        app.getForm('billing').object.billingAddress.addressFields.country.value = app.getForm('singleshipping').object.shippingAddress.addressFields.country.value;
        app.getForm('billing').object.billingAddress.addressFields.phone.value = app.getForm('singleshipping').object.shippingAddress.addressFields.phone.value;
    } else if (cart.getBillingAddress() !== null) {
        app.getForm('billing.billingAddress.addressFields').copyFrom(cart.getBillingAddress());
        app.getForm('billing.billingAddress.addressFields.states').copyFrom(cart.getBillingAddress());
    } else if (customer.authenticated && customer.profile.addressBook.preferredAddress !== null) {
        app.getForm('billing.billingAddress.addressFields').copyFrom(customer.profile.addressBook.preferredAddress);
        app.getForm('billing.billingAddress.addressFields.states').copyFrom(customer.profile.addressBook.preferredAddress);
    }
	
}


/**
 * Initializes the email address form field. If there is already a customer
 * email set at the basket, that email address is used. If the
 * current customer is authenticated the email address of the customer's profile
 * is used.
 */
function initEmailAddress(cart) {
    if (cart.getCustomerEmail() !== null) {
        app.getForm('billing').object.billingAddress.email.emailAddress.value = cart.getCustomerEmail();
    } else if (customer.authenticated && customer.profile.email !== null) {
        app.getForm('billing').object.billingAddress.email.emailAddress.value = customer.profile.email;
    }
}

//Billing function

function handleBillingAddress(cart) {

    var billingAddress = cart.getBillingAddress();
    Transaction.wrap(function () {
    	
        if (!billingAddress) {
            billingAddress = cart.createBillingAddress();
        }
        
        var values = {
		  'sameasshipping': true
	    };
	    app.getForm('billing.billingAddress').copyFrom(values);
        session.custom.sameasshipping = app.getForm('billing.billingAddress.sameasshipping').value();
        app.getForm('billing.billingAddress.addressFields').copyTo(billingAddress);
        app.getForm('billing.billingAddress.addressFields.states').copyTo(billingAddress);

        cart.setCustomerEmail(app.getForm('billing').object.billingAddress.email.emailAddress.value);
    });

    return true;
}


function startExpress(cart, params) {

    app.getController('COShipping').PrepareShipments();

    Transaction.wrap(function () {
        cart.calculate();
    });
    
    app.getForm('profile').clear();

    if(session.customer.authenticated) {
    	var profileForm = session.forms.profile;
        var values = {
    	  'firstName': session.customer.profile.firstName, 
    	  'lastName': session.customer.profile.lastName
        };
        app.getForm(profileForm.address).copyFrom(values);
    }

   /* var pageMeta = require('~/cartridge/scripts/meta');
    pageMeta.update({
        pageTitle: Resource.msg('billing.meta.pagetitle', 'checkout', 'SiteGenesis Checkout')
    });*/
    returnToForm(cart, params);
}

function selectCreditCard() {
    var cart, applicableCreditCards, selectedCreditCard, instrumentsIter, creditCardInstrument;
    cart = app.getModel('Cart').get();

    applicableCreditCards = initCreditCardList(cart).ApplicableCreditCards;
    selectedCreditCard = null;

    // ensure mandatory parameter 'CreditCardUUID' and 'CustomerPaymentInstruments'
    // in pipeline dictionary and collection is not empty
    if (request.httpParameterMap.creditCardUUID.value && applicableCreditCards && !applicableCreditCards.empty) {

        // find credit card in payment instruments
        instrumentsIter = applicableCreditCards.iterator();
        while (instrumentsIter.hasNext()) {
            creditCardInstrument = instrumentsIter.next();
            if (request.httpParameterMap.creditCardUUID.value.equals(creditCardInstrument.UUID)) {
                selectedCreditCard = creditCardInstrument;
            }
        }

        if (selectedCreditCard) {
            app.getForm('billing').object.paymentMethods.creditCard.number.value = selectedCreditCard.getCreditCardNumber();
        }
    }

    app.getView({
        SelectedCreditCard: selectedCreditCard
    }).render('checkout/billing/creditcardjson');
}


function updateCreditCardSelection() {
    var cart, applicableCreditCards, UUID, selectedCreditCard, instrumentsIter, creditCardInstrument;
    cart = app.getModel('Cart').get();

    applicableCreditCards = initCreditCardList(cart).ApplicableCreditCards;
    if(!empty(applicableCreditCards)){
    	for (var i = 0; i < applicableCreditCards.length; i++) {
            var payInstr = applicableCreditCards[i];
            if (payInstr.custom.braintreeDefaultCard == true ){
            	 UUID = payInstr.UUID;
            	 break;
              } 
           
        }
    	if (empty(UUID)){
    		UUID = applicableCreditCards[0].UUID;
    	}
    	
    } else {
    	response.redirect(URLUtils.https('Cart-Show'));
        return;
    }


    session.custom.UUID = UUID;
    selectedCreditCard = null;
    if (UUID && applicableCreditCards && !applicableCreditCards.empty) {

        // find credit card in payment instruments
        instrumentsIter = applicableCreditCards.iterator();
        while (instrumentsIter.hasNext()) {
            creditCardInstrument = instrumentsIter.next();
            if (UUID.equals(creditCardInstrument.UUID)) {
                selectedCreditCard = creditCardInstrument;
            }
        }

        if (selectedCreditCard) {
            app.getForm('billing').object.paymentMethods.creditCard.number.value = selectedCreditCard.creditCardNumber;
        } else {
        	app.getController('COBilling').Start();
        }
    } else {
    	app.getController('COBilling').Start();
    }

    app.getForm('billing.paymentMethods.creditCard').copyFrom(selectedCreditCard);
    
    initCreditCardList(cart);
    //start(cart);
}

function handlePaymentSelection(cart) {
    var result;
    if (empty(app.getForm('billing').object.paymentMethods.selectedPaymentMethodID.value)) {
        if (cart.getTotalGrossPrice() > 0) {
            result = {
                error: true
            };
        } else {
            result = {
                ok: true
            };
        }
    }

    // skip the payment handling if the whole payment was made using gift cert
    if (app.getForm('billing').object.paymentMethods.selectedPaymentMethodID.value.equals(PaymentInstrument.METHOD_GIFT_CERTIFICATE)) {
        result = {
            ok: true
        };
    }

    if (empty(PaymentMgr.getPaymentMethod(app.getForm('billing').object.paymentMethods.selectedPaymentMethodID.value).paymentProcessor)) {
        result = {
            error: true,
            MissingPaymentProcessor: true
        };
    }
    if (!result) {    	
        result = app.getModel('PaymentProcessor').handle(cart.object, app.getForm('billing').object.paymentMethods.selectedPaymentMethodID.value);
    }
    return result;
}


function prepareShipments() {
    var cart, homeDeliveries;
    cart = app.getModel('Cart').get();

    homeDeliveries = Transaction.wrap(function () {
        var homeDeliveries = false;

        cart.updateGiftCertificateShipments();
        cart.removeEmptyShipments();

        if (Site.getCurrent().getCustomPreferenceValue('enableStorePickUp')) {
            homeDeliveries = cart.consolidateInStoreShipments();

            session.forms.singleshipping.inStoreShipments.shipments.clearFormElement();
            app.getForm('singleshipping.inStoreShipments.shipments').copyFrom(cart.getShipments());
        } else {
            homeDeliveries = true;
        }

        return homeDeliveries;
    });

    return homeDeliveries;
}

function initCreditCardList(cart) {
    var paymentAmount = cart.getNonGiftCertificateAmount();
    var countryCode;
    var applicablePaymentMethods;
    var applicablePaymentCards;
    var applicableCreditCards;

    countryCode = Countries.getCurrent({
        CurrentRequest: {
            locale: request.locale
        }
    }).countryCode;

    applicablePaymentMethods = PaymentMgr.getApplicablePaymentMethods(customer, countryCode, paymentAmount.value);
    applicablePaymentCards = PaymentMgr.getPaymentMethod(PaymentInstrument.METHOD_CREDIT_CARD).getApplicablePaymentCards(customer, countryCode, paymentAmount.value);

    app.getForm('billing').object.paymentMethods.creditCard.type.setOptions(applicablePaymentCards.iterator());

    applicableCreditCards = null;

    if (customer.authenticated) {
        var profile = app.getModel('Profile').get();
        if (profile) {
            applicableCreditCards = profile.validateWalletPaymentInstruments(countryCode, paymentAmount.getValue()).ValidPaymentInstruments;
        }
    }

    return {
        ApplicablePaymentMethods: applicablePaymentMethods,
        ApplicableCreditCards: applicableCreditCards
    };
}

function returnToForm(cart, params) {
    var pageMeta = require('~/cartridge/scripts/meta');

    // if the payment method is set to gift certificate get the gift certificate code from the form
    if(cart && cart.getPaymentInstruments()){    	
		var paymentInstruments = cart.getPaymentInstruments();
		for(var i=0; i< paymentInstruments.length; i++) {
			if((paymentInstruments[i].getPaymentMethod() == PaymentInstrument.METHOD_GIFT_CERTIFICATE)){
		        app.getForm('billing').copyFrom({
		            giftCertCode: paymentInstruments[i].getGiftCertificateCode()
		        });
				break;
			}
	    }
    }
    

    pageMeta.update({
        pageTitle: Resource.msg('billing.meta.pagetitle', 'checkout', 'Tatcha Checkout')
    });

    if (params) {
        app.getView(require('~/cartridge/scripts/object').extend(params, {
            Basket: cart.object,
            ContinueURL: URLUtils.https('COBilling-Billing')
        })).render('checkout/billing/billing');
    } else {
        app.getView({
            Basket: cart.object,
            ContinueURL: URLUtils.https('COBilling-Billing')
        }).render('checkout/billing/billing');
    }
}

function resetPaymentForms() {

    var cart = app.getModel('Cart').get();

    var status = Transaction.wrap(function () {
        if (app.getForm('billing').object.paymentMethods.selectedPaymentMethodID.value.equals('PayPal')) {
            app.getForm('billing').object.paymentMethods.creditCard.clearFormElement();
            app.getForm('billing').object.paymentMethods.bml.clearFormElement();

            cart.removePaymentInstruments(cart.getPaymentInstruments(PaymentInstrument.METHOD_CREDIT_CARD));
            cart.removePaymentInstruments(cart.getPaymentInstruments(PaymentInstrument.METHOD_BML));
        } else if (app.getForm('billing').object.paymentMethods.selectedPaymentMethodID.value.equals(PaymentInstrument.METHOD_CREDIT_CARD)) {
            app.getForm('billing').object.paymentMethods.bml.clearFormElement();

            cart.removePaymentInstruments(cart.getPaymentInstruments(PaymentInstrument.METHOD_BML));
            cart.removePaymentInstruments(cart.getPaymentInstruments('PayPal'));
        } else if (app.getForm('billing').object.paymentMethods.selectedPaymentMethodID.value.equals(PaymentInstrument.METHOD_BML)) {
            app.getForm('billing').object.paymentMethods.creditCard.clearFormElement();

            if (!app.getForm('billing').object.paymentMethods.bml.ssn.valid) {
                return false;
            }

            cart.removePaymentInstruments(cart.getPaymentInstruments(PaymentInstrument.METHOD_CREDIT_CARD));
            cart.removePaymentInstruments(cart.getPaymentInstruments('PayPal'));
        }
        return true;
    });

    return status;
}
function validateBilling() {
    if (!app.getForm('billing').object.billingAddress.valid) {
        return false;
    }

    if (!empty(request.httpParameterMap.noPaymentNeeded.value)) {
        return true;
    }

    if (!empty(app.getForm('billing').object.paymentMethods.selectedPaymentMethodID.value) && app.getForm('billing').object.paymentMethods.selectedPaymentMethodID.value.equals(PaymentInstrument.METHOD_CREDIT_CARD)) {
        if (!app.getForm('billing').object.valid) {
            return false;
        }
    }

    return true;
}

function getapplicableshippingmethod() {
    var i, address, applicableShippingMethods, shippingCosts, currentShippingMethod, method;
    var cart = app.getModel('Cart').get();
    var TransientAddress = app.getModel('TransientAddress');

    if (!cart) {
        app.getController('Cart').Show();
        return;
    }
    address = new TransientAddress();
    address.countryCode = session.forms.singleshipping.shippingAddress.addressFields.country.value;
    address.stateCode = session.forms.singleshipping.shippingAddress.addressFields.states.state.value;
    address.postalCode =session.forms.singleshipping.shippingAddress.addressFields.postal.value;
    address.city = session.forms.singleshipping.shippingAddress.addressFields.city.value;
    address.address1 = session.forms.singleshipping.shippingAddress.addressFields.address1.value;
    address.address2 = session.forms.singleshipping.shippingAddress.addressFields.address2.value;

    applicableShippingMethods = cart.getApplicableShippingMethods(address);
    shippingCosts = new HashMap();
    if(address.countryCode == 'US') {
    	currentShippingMethod = ShippingMgr.getDefaultShippingMethod() || applicableShippingMethods[0];    	
    } else {
    	currentShippingMethod = applicableShippingMethods[0] || ShippingMgr.getDefaultShippingMethod();
    }    

    // Transaction controls are for fine tuning the performance of the data base interactions when calculating shipping methods
    Transaction.begin();
    //Avalara change: assign the NoCall variable to true 
    session.custom.NoCall = true;

    for (i = 0; i < applicableShippingMethods.length; i++) {
        method = applicableShippingMethods[i];

        cart.updateShipmentShippingMethod(cart.getDefaultShipment().getID(), method.getID(), method, applicableShippingMethods);
        cart.calculate();
        shippingCosts.put(method.getID(), cart.preCalculateShipping(method));
    }
    session.custom.NoCall = true;
    Transaction.rollback();

    Transaction.wrap(function () {
        cart.updateShipmentShippingMethod(cart.getDefaultShipment().getID(),currentShippingMethod.getID(), currentShippingMethod,applicableShippingMethods);
        cart.calculate();
    });

    session.forms.singleshipping.shippingAddress.shippingMethodID.value = cart.getDefaultShipment().getShippingMethodID();

 }
/** Starting point for billing.
 * @see module:controllers/ExpressCheckout~publicStart */
exports.Start = guard.ensure(['https'], start);
/** Redeems gift certificates.*/
exports.StartExpress = guard.ensure(['https'], startExpress);
 /** @see module:controllers/ExpressCheckout~redeemGiftCertificateJson */
exports.SelectCreditCard = guard.ensure(['https', 'get'], selectCreditCard);
/** Adds the currently selected credit card to the billing form and initializes the credit card selection list.
 * @see module:controllers/ExpressCheckout~updateCreditCardSelection */
exports.UpdateCreditCardSelection = guard.ensure(['https', 'get'], updateCreditCardSelection);
/** Handles the selection of the payment method and performs payment method specific validation and verification upon the entered form fields.
 * @see module:controllers/ExpressCheckout~handlePaymentSelection */
exports.HandlePaymentSelection = handlePaymentSelection;

exports.PrepareShipments = prepareShipments;
exports.Getapplicableshippingmethod = getapplicableshippingmethod;