'use strict';
/* global dw request empty session */

var BraintreeHelper = require('*/cartridge/scripts/braintree/helpers/paymentHelper');

var Transaction = require('dw/system/Transaction');

var BasketMgr = require('dw/order/BasketMgr');
var ShippingMgr = require('dw/order/ShippingMgr');
var HashMap = require('dw/util/HashMap');
var CustomerMgr = require('dw/customer/CustomerMgr');
var Site = require('dw/system/Site');
var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
var shippingHelpers = require('*/cartridge/scripts/checkout/shippingHelpers');


/**
 * Create Braintree payment instrument and update shipping and billing address, if the new one was given
 * @param {Basket} basket Basket object
 * @param {boolean} fromCart indicator for cart checkout
 * @returns {Object} success object
 */
function handle(basket, fromCart, afterpayResponse, parameterMap) {   
    var afterPayPaymentInstrument = null;
    if (fromCart) {
        BraintreeHelper.addDefaultShipping(basket);
    }

    Transaction.wrap(function () {
        if (fromCart) {
            var paymentInstruments = basket.getPaymentInstruments();
            var iterator = paymentInstruments.iterator();
            var instument = null;
            while (iterator.hasNext()) {
                instument = iterator.next();
                if(instument) {
                	basket.removePaymentInstrument(instument);
                }
            }
        } else {
            BraintreeHelper.deleteBraintreePaymentInstruments(basket);
        }

        afterPayPaymentInstrument = basket.createPaymentInstrument('AFTERPAY_PBI', BraintreeHelper.getAmountPaid(basket));
    });

    if (!afterpayResponse.token || afterpayResponse.token == '') {
        return { error: true };
    }

    if (!basket) {
        return { error: true };
    }
    
    var consumer = afterpayResponse.consumer;
    var newShipping = afterpayResponse.shipping;
    var selectedShippingMethod = afterpayResponse.shippingOptionIdentifier;
    
    
    if (basket.getProductLineItems().size() > 0) {    	    	
    	var fullName = newShipping.name;
        var firstName = '';
        firstName = newShipping.name;
        var lastName = ' '; 
        var nameArray = fullName.split(' ');
        if(nameArray.length > 0){        	
        	firstName = nameArray[0];
        	lastName = fullName.replace(firstName,'');
        }

        Transaction.wrap(function () {
        	var shipping = basket.getDefaultShipment().getShippingAddress() || basket.getDefaultShipment().createShippingAddress();
            shipping.setCountryCode(newShipping.countryCode ? newShipping.countryCode.toUpperCase() : ' ');
            shipping.setCity(newShipping.area1 || ' ');
            shipping.setAddress1(newShipping.line1 || ' ');
            shipping.setAddress2(newShipping.line2 || '');
            shipping.setPostalCode(newShipping.postcode || ' ');
            shipping.setStateCode(newShipping.region || ' ');
            shipping.setPhone(newShipping.phoneNumber || '');
            shipping.setFirstName(firstName || lastName);
            shipping.setLastName(lastName || firstName);         
            
            //Update Shipping method selection
			var address = {}, applicableShippingMethods, currentShippingMethod;
		    address.countryCode = shipping.countryCode.value.toUpperCase();
		    address.stateCode = shipping.stateCode;
		    address.postalCode = shipping.postalCode;
		    address.city = shipping.city;
		    address.address1 = shipping.address1;
		    address.address2 = shipping.address2;
		    address.phone = shipping.phone;
		 
		    session.custom.fedPostalCode = shipping.postalCode;
			session.custom.fedCountryCode = shipping.countryCode.value;

            applicableShippingMethods = shippingHelpers.getApplicableShippingMethods(basket.getDefaultShipment(),address);
			var selectedShipping = '';
			for (var i = 0; i < applicableShippingMethods.length; i++) {
				var shippingMethod = applicableShippingMethods[i];
				if(shippingMethod.ID == selectedShippingMethod) {
					selectedShipping = shippingMethod; 
				} 
			}


		    if(address.countryCode == 'US') {  	
		    	currentShippingMethod = selectedShipping;
		    } else {
		    	currentShippingMethod = applicableShippingMethods[0] || ShippingMgr.getDefaultShippingMethod();
		    }
		    

		    session.custom.NoCall = false;
		    
	        shippingHelpers.selectShippingMethod(basket.getDefaultShipment(),currentShippingMethod.ID);
            basketCalculationHelpers.calculateTotals(basket);
		    session.forms.singleshipping.shippingAddress.shippingMethodID.value = basket.getDefaultShipment().getShippingMethodID();
            //setting afterpay token
            if(session.privacy.afterpaytoken){
                delete session.privacy.afterpaytoken;
            }
            session.privacy.afterpaytoken = afterpayResponse.token;
		    session.custom.afterpayamount = basket.getTotalGrossPrice().value;
        });
    }

    if (fromCart) {
    	var newBilling = !empty(newShipping) ? newShipping : afterpayResponse.shipping;
    	var fullname = newBilling.name;
    	var firstName = '';
    	firstName = newBilling.name;
        var lastName = ' ';  
        var nameArray = fullname.split(' ');
        if(nameArray.length > 0){        	
        	firstName = nameArray[0];
        	lastName = nameArray[1];
        }
        
        Transaction.wrap(function () {
        	var billing = basket.getBillingAddress() || basket.createBillingAddress();
            billing.setFirstName(firstName || lastName );
            billing.setLastName(lastName || firstName);
            billing.setCountryCode(newBilling.countryCode ? newBilling.countryCode.toUpperCase() : ' ');
            billing.setCity(newBilling.area1 || ' ');
            billing.setAddress1(newBilling.line1 || ' ');
            billing.setAddress2(newBilling.line2 || '');
            billing.setPostalCode(newBilling.postcode || ' ');
            billing.setStateCode(newBilling.region || ' ');
            billing.setPhone(consumer.phoneNumber || '');
            if(customer.authenticated && customer.profile.email !== null) {
            	basket.setCustomerEmail(customer.profile.email); 
            } else {
            	basket.setCustomerEmail(consumer.email);
            }    	
        });
    }
    
    //Check user exists or not 
	var cartEmail = basket.getCustomerEmail();
	if(cartEmail) {
		var existingCustomer = CustomerMgr.getCustomerByLogin(cartEmail);
		if(existingCustomer) {
			session.custom.userExist = true;
		}
	}
       
    if(parameterMap.status.value=='SUCCESS') {
		
		var  PreapprovalResult = require('*/cartridge/scripts/checkout/afterpayUpdatePreapprovalStatus').getPreApprovalResult(basket, parameterMap);
		 
	}
    

    return { success: true };
}

/*
 * Module exports
 */
exports.handle = handle;
