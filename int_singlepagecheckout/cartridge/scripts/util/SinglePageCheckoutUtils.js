
/* Script Modules */
var Site = require('dw/system/Site');
var app = require('app_storefront_controllers/cartridge/scripts/app');
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var Transaction = require('dw/system/Transaction');
var URLUtils = require('dw/web/URLUtils');
var securityHeader = require('app_storefront_controllers/cartridge/scripts/util/SecurityHeaders');
var PaymentMgr = require('dw/order/PaymentMgr');
var PaymentInstrument = require('dw/order/PaymentInstrument');
var Countries = require('app_storefront_core/cartridge/scripts/util/Countries');

importScript("app_storefront_core:cart/CartUtils.ds");

function getCurrentBasket() {
	var cart = app.getModel('Cart').get();
	return cart.object;
}
/*
 * Init method that is invoked on checkout load
 */
function getCheckoutSummary() {
		
	var checkoutSummary = {};		
	var cart = app.getModel('Cart').get();
	
	// Redirect to BAG page if empty cart
	if(!cart){
		response.redirect(URLUtils.abs('Cart-Show'));
	}
	
	// Redirect to BAG page if empty cart
	var basketSize = getCartQty(cart);	
	if(basketSize == 0 || (cart.getDefaultShipment().getShippingMethod() == null)){
		response.redirect(URLUtils.abs('Cart-Show'));
	}
	

	// Session state
	var checkoutState = (session.custom.checkoutState)?session.custom.checkoutState:'';
	var checkoutMode = (session.custom.checkoutMode)?session.custom.checkoutMode:'';
	

   	var hasAutoDeliveryProduct = CartUtils.hasAutoDeliveryProductInBag(cart);
	var usersCountry = CartUtils.checkUserSavedAddress();
	var showAdWarning = hasAutoDeliveryProduct && usersCountry;

	
	var appliedCoupons = getAppliedCoupons(cart);
	var orderType = getOrderType(cart);
	var orderTotal = cart.getTotalGrossPrice();

	//var t = session.forms.singleshipping;

	// Customer Info 
	var currentCustomer = cart.getCustomer();
	var customerInfo = getCustomerInfo(cart,currentCustomer);
	
	// Get shipping info 
	var shippingInfo = getShippingInfo(cart,session.forms.singleshipping,customerInfo, orderType);
	

	
	// Show AD Warning 
	var showAdWarning = false;
	if((!empty(shippingInfo.shippingAddress.country) && (shippingInfo.shippingAddress.country !='US'))){
		showAdWarning = hasAutoDeliveryProduct && true;
	}
	
	//todo - billinginfo
	var billingInfo = getBillingInfo(cart, shippingInfo);
	//todo - paymentinfo
	var paymentInfo = getPaymentInfo(cart, session.forms.billing);
	
	var paymentInfoAvailable = false;
	if(!paymentInfo.paymentInstruments.empty) {
		paymentInfoAvailable = true;
		if(session.custom.isAfterPayFailed && (paymentInfo.paymentInstruments.length == 1 && paymentInfo.paymentInstruments[0].paymentMethod == 'AFTERPAY_PBI')) {
			paymentInfoAvailable = false;
		}
		if(paymentInfo.paymentInstruments[0].paymentMethod == 'AFTERPAY_PBI' && checkoutState == 'shipping'){
			session.custom.apAddressEdit = true;
		}
	}
	
	// Calculate tax if the shipping mode is in summary 
//	if(shippingInfo.showSummary == true) {
//    	//session.custom.NoCall = false;
//        Transaction.wrap(function () {
//            cart.calculate();
//          });
//	}
	

	
	return checkoutSummary = {
			checkoutState : checkoutState,  //Possible values (shipping/billing/review)
			checkoutMode : checkoutMode,
			customerInfo:customerInfo,
			shippingInfo:shippingInfo,
			orderType: orderType,
			isInternational:false,
			hasGiftWrap: false,
			basket: cart.object,
			basketSize:basketSize,
			appliedCoupons:appliedCoupons,
			hasADitems: hasAutoDeliveryProduct,
			showAdWarning: showAdWarning,
			billingInfo: billingInfo,
			paymentInfo: paymentInfo,
			orderTotal: orderTotal,
			paymentInfoAvailable: paymentInfoAvailable
     };
		
}

function getCheckoutBillingSummary() {
	var billingObj = {};
	
	
	return billingObj;
}


/*
 * Function to return the current cart size
 */

function getCustomerInfo(cart,currentCustomer){
	
	var email = (cart.getCustomerEmail())?cart.getCustomerEmail():'';
	var isAuthenticated = currentCustomer.authenticated;
	
	// Check if email if empty. If yes update with the authenticated email
	if(empty(email) && isAuthenticated) {		
		var profileEmail = currentCustomer.profile.email;
		if(!empty(profileEmail)){
		    Transaction.wrap(function () {
		        cart.setCustomerEmail(profileEmail);
		    });
		    email = profileEmail;
		}
	}
	
	
	
    var shippingAddressList = CartUtils.getAddressList(cart,currentCustomer, true);
	
    var addressBook = [];
    var preferredAddress = [];
    var shipingAddress = [];
    var selectedAddressID = '';
    
    if(isAuthenticated && currentCustomer.getAddressBook().getAddresses().length>0){
    	addressBook = currentCustomer.getAddressBook().getAddresses();
    	
    	var defaultAddressID = !empty(currentCustomer.getAddressBook().preferredAddress) ? currentCustomer.getAddressBook().preferredAddress.ID : '';
    	selectedAddressID = (session.custom.selectedShippingAddress)?session.custom.selectedShippingAddress:'';

		preferredAddress  = !empty(currentCustomer.getAddressBook().preferredAddress) ? currentCustomer.getAddressBook().preferredAddress : [];
    	
    	// Set the selected if exists in session
    	if(empty(selectedAddressID)){
    		selectedAddressID = defaultAddressID;
    	}
    	
    	// Set to default the first one
    	if(empty(selectedAddressID)){
    		selectedAddressID = addressBook[0].ID;
    	}
    	

    	
    	// Copy the selected address to current form
    	for(i=0;i<currentCustomer.getAddressBook().getAddresses().length;i++){
    		if(selectedAddressID == currentCustomer.getAddressBook().getAddresses()[i].ID){
    	         app.getForm('singleshipping.shippingAddress.addressFields').copyFrom(currentCustomer.getAddressBook().getAddresses()[i]);
    	         app.getForm('singleshipping.shippingAddress.addressFields.states').copyFrom(currentCustomer.getAddressBook().getAddresses()[i]);
    	         break;
    		}
    	}
    	
    }

	return customerInfo = {
			customerEmail: email,
			isAuthenticated:isAuthenticated,
			addressBook:addressBook,
			selectedAddressID:selectedAddressID,
			preferredAddress: preferredAddress,
			defaultAddressID:defaultAddressID
			
     };
}

/*
 * To get the cart count
 */
function getCartQty(cart) {
	
	var cartQty : Number = 0;
	var pliIt : dw.util.Iterator = cart.getProductLineItems().iterator();
	while (pliIt.hasNext()) {
		var pli : dw.order.ProductLineItem = pliIt.next();
		cartQty += pli.quantity;
	}
	cartQty += cart.getGiftCertificateLineItems().size();
	return cartQty;
}

/*
 * Get Applied coupons
 */
function getAppliedCoupons(cart) {
	
	var appliedCoupons = [];
	var coupons = cart.getCouponLineItems();
 	if(coupons && coupons.length > 0){
     	for each(var coupon in coupons) {  
     		if(coupon.valid) {
     			var couponItem = {};
     			couponItem.couponCode = coupon.couponCode;
     			couponItem.UUID = coupon.UUID;
     			appliedCoupons.push(couponItem); 
     		}     		
     	}									
 	}
	return appliedCoupons;
}

/*
 * Get Order Type
 */
function getOrderType(cart) {
	
	var orderType = 'regular';
	var hasGiftCardItems = false;
	var hasRegularItems = false;
	
	if (cart.getGiftCertificateLineItems().size() > 0) {
		hasGiftCardItems = true;
	}
	
	if (cart.getProductLineItems().size() > 0) {
		hasRegularItems = true;
	}
	
	if(hasGiftCardItems && !hasRegularItems) {
		orderType = 'giftcard';
	} else if(hasGiftCardItems && hasRegularItems) {
		orderType = 'mixed';
	} else {
		orderType = 'regular';
	}
	
	return orderType;
}

/*
 * return the setDefaultShippingAddress boolean variable as per the payment method
 */
function checkDefaultShippingAddress(cart) {
	var setDefaultShippingAddress = false;
	// Check if After Pay / Paypal / Apple Pay
	var paymentInstruments = cart.getPaymentInstruments();
	for(var i=0; i< paymentInstruments.length; i++) {
		var paymentInstrument = paymentInstruments[i];
		if((paymentInstruments[i].getPaymentMethod() =='AFTERPAY_PBI') || (paymentInstruments[i].getPaymentMethod() =='PayPal') || (paymentInstruments[i].getPaymentMethod() =='ApplePay')){
			setDefaultShippingAddress = true;
			break;
		}
    }
	
	return setDefaultShippingAddress;
}

/*
 * Get Shipping Address and shipping method
 */
function getShippingInfo(cart,shippingAddressObj,customerInfo, orderType) {

	// Check if After Pay / Paypal / ApplePay	
    var setDefaultShippingAddress = checkDefaultShippingAddress(cart);
	
    // Get the shipping address from form
    var shippingAddress = {};    
    if(!setDefaultShippingAddress) {
    	 shippingAddress = {
   			 firstName : (shippingAddressObj.shippingAddress.addressFields.firstName.valid)?shippingAddressObj.shippingAddress.addressFields.firstName.htmlValue:'',
   			 lastName : (shippingAddressObj.shippingAddress.addressFields.lastName.valid)?shippingAddressObj.shippingAddress.addressFields.lastName.htmlValue:'',
   			 address1 : (shippingAddressObj.shippingAddress.addressFields.address1.valid)?shippingAddressObj.shippingAddress.addressFields.address1.htmlValue:'',
   			 address2 : (shippingAddressObj.shippingAddress.addressFields.address2.valid)?shippingAddressObj.shippingAddress.addressFields.address2.htmlValue:'',
   			 country : (shippingAddressObj.shippingAddress.addressFields.country.valid)?shippingAddressObj.shippingAddress.addressFields.country.htmlValue:'',
   			 city : (shippingAddressObj.shippingAddress.addressFields.city.valid)?shippingAddressObj.shippingAddress.addressFields.city.htmlValue:'',
   			 postal : (shippingAddressObj.shippingAddress.addressFields.postal.valid)?shippingAddressObj.shippingAddress.addressFields.postal.htmlValue:'',
   			 state : (shippingAddressObj.shippingAddress.addressFields.states.state.valid)?shippingAddressObj.shippingAddress.addressFields.states.state.htmlValue:'',
   			 phone : (shippingAddressObj.shippingAddress.addressFields.phone.valid)?shippingAddressObj.shippingAddress.addressFields.phone.htmlValue:''
    	 };    	
    }


	// Additional check for pull from cart if not present in the session form
	if(empty(shippingAddress.firstName) && empty(shippingAddress.lastName) && empty(shippingAddress.address1) && empty(shippingAddress.country) && empty(shippingAddress.city) 
			&& empty(shippingAddress.postal) && empty(shippingAddress.state)){
		
		if((cart.getDefaultShipment()) && (cart.getDefaultShipment().getShippingAddress())) {
			shippingAddress = {
					'firstName': cart.getDefaultShipment().getShippingAddress().firstName ? cart.getDefaultShipment().getShippingAddress().firstName : '',
					'lastName': cart.getDefaultShipment().getShippingAddress().lastName ? cart.getDefaultShipment().getShippingAddress().lastName : '',
					'country': cart.getDefaultShipment().getShippingAddress().countryCode ? cart.getDefaultShipment().getShippingAddress().countryCode.value.toUpperCase() : '',
					'address1': cart.getDefaultShipment().getShippingAddress().address1 ? cart.getDefaultShipment().getShippingAddress().address1 : '',
					'address2': cart.getDefaultShipment().getShippingAddress().address2 ? cart.getDefaultShipment().getShippingAddress().address2 :'',
					'postal': cart.getDefaultShipment().getShippingAddress().postalCode ? cart.getDefaultShipment().getShippingAddress().postalCode : '',
					'state': cart.getDefaultShipment().getShippingAddress().stateCode ? cart.getDefaultShipment().getShippingAddress().stateCode : '',
					'city': cart.getDefaultShipment().getShippingAddress().city ? cart.getDefaultShipment().getShippingAddress().city : '',
					'phone': cart.getDefaultShipment().getShippingAddress().phone ? cart.getDefaultShipment().getShippingAddress().phone :''
				};	
			
			//TODO : After Pay not returning phone
			if(!empty(shippingAddress.firstName) && !empty(shippingAddress.lastName) && !empty(shippingAddress.address1) && !empty(shippingAddress.postal) && !empty(shippingAddress.state) && !empty(shippingAddress.city)) {
				if(empty(shippingAddress.phone)){
					shippingAddress.phone = '0000000000';
				}
			}
		}

	}
	
	var selectedMethodID = (session.forms.singleshipping.shippingAddress.shippingMethodID.value)?session.forms.singleshipping.shippingAddress.shippingMethodID.value:'';
	
    //Update Giftwrap Options
//    Transaction.wrap(function () {
//    	cart.calculate();
//    });
    
    
	var shippingMethodName = (cart.getDefaultShipment() && cart.getDefaultShipment().getShippingMethod().getDisplayName())?cart.getDefaultShipment().getShippingMethod().getDisplayName():'';
	var selectedMethodID = (cart.getDefaultShipment() && cart.getDefaultShipment().getShippingMethod().getID())?cart.getDefaultShipment().getShippingMethod().getID():'';
	var shippingPrice = '';
	if(cart.getShippingTotalPrice().value != 0 && cart.getAdjustedShippingTotalPrice().value != 0) {
		shippingPrice = cart.getShippingTotalPrice().value;
	} else {
		shippingPrice = '';
	}
	
	// Get gift Message 
	var giftMessage = (cart.getDefaultShipment().giftMessage)?cart.getDefaultShipment().giftMessage:'';
	
	// Check if giftwrap is there 	
	var hasGiftWrap = cart.checkCartHasGiftWrap();
	
	var showSummary = false;
	
	
	if(!customerInfo.isAuthenticated) {
		if(!empty(customerInfo.customerEmail) && !empty(shippingAddress.firstName) && !empty(shippingAddress.lastName) && !empty(shippingAddress.address1) && !empty(shippingAddress.country) && !empty(shippingAddress.city) 
				&& !empty(shippingAddress.postal) && !empty(shippingAddress.state) && !empty(shippingAddress.phone)) {
			showSummary = true;
		}
	} else {
		if(!empty(shippingAddress.firstName) && !empty(shippingAddress.lastName) && !empty(shippingAddress.address1) && !empty(shippingAddress.country) && !empty(shippingAddress.city) 
				&& !empty(shippingAddress.postal) && !empty(shippingAddress.state) && !empty(shippingAddress.phone)) {
			showSummary = true;
		}
	}
	
	if(orderType === 'giftcard') {
		showSummary = true;
	}

	
	// Estimated days 
	var estimatedDate = getEstimatedDays(cart,selectedMethodID);
	
	
	// Open in the edit mode
	if((session.custom.checkoutState == 'shipping') && (session.custom.checkoutMode == 'edit')) {
		session.custom.checkoutMode = '';
		showSummary = false;
	}
	
	return shippingInfo = {
			showSummary: showSummary,
			selectedMethodID:selectedMethodID,
			estimatedDate:estimatedDate,
			shippingMethodName:shippingMethodName,
			giftMessage:giftMessage,
			hasGiftWrap:hasGiftWrap,
			shippingPrice:shippingPrice,
			shippingAddress: shippingAddress
     };
}
/*
 * Save shipping method
 */

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

/*
 * Get Estimated Days for given shipment
 */
function getEstimatedDays(cart,shipmentID) {
	
	var estimatedDate = '';
	
	if(shipmentID){
		var shipment : dw.order.Shipment = cart.getDefaultShipment();
		var shippingModel : dw.order.ShipmentShippingModel = dw.order.ShippingMgr.getShipmentShippingModel( shipment );
		var selectedShipment = '';
		
		for(i=0;i<shippingModel.getApplicableShippingMethods().length;i++){
			if(shipmentID == shippingModel.getApplicableShippingMethods()[i].ID){
				selectedShipment = shippingModel.getApplicableShippingMethods()[i];
				break;
			}
		}
		
		if(selectedShipment) {
			var Calendar = require('dw/util/Calendar');
			var StringUtils = require('dw/util/StringUtils');
			var stringHelper = require('*/cartridge/scripts/util/StringHelpers');
			pstCal = new Calendar();
			pstCal.setTimeZone('PST');
			var estimated_days = selectedShipment.custom.estimatedDays;
			var order_cutoffTime = selectedShipment.custom.order_cutoffTime;						
			var currentdate = StringUtils.formatCalendar(pstCal, "MM/dd/yyyy HH:mm:ss"); 
			estimatedDate = stringHelper.GetEstimatedDate(currentdate, estimated_days);
			var datetime =  StringUtils.formatCalendar(pstCal, "HH");
			
			if(datetime > order_cutoffTime) {
				estimated_days = estimated_days + 1;
				estimatedDate = stringHelper.GetEstimatedDate(currentdate, estimated_days);
			}
		}
	}
	
	return estimatedDate;
}

// get default shipment address
function getDefaultShipmentAddress(cart,shippingInfo) {
	var basket = cart.object;
	var defaultShipment = {};
	if(basket.defaultShipment !== null && !empty(basket.defaultShipment) && !empty(basket.defaultShipment.shippingAddress)) {
		defaultShipment = {
			'firstName': basket.defaultShipment.shippingAddress.firstName ? basket.defaultShipment.shippingAddress.firstName : '',
			'lastName': basket.defaultShipment.shippingAddress.lastName ? basket.defaultShipment.shippingAddress.lastName : '',
			'country': basket.defaultShipment.shippingAddress.countryCode ? basket.defaultShipment.shippingAddress.countryCode.value.toUpperCase() : '',
			'address1': basket.defaultShipment.shippingAddress.address1 ? basket.defaultShipment.shippingAddress.address1 : '',
			'address2': basket.defaultShipment.shippingAddress.address2 ? basket.defaultShipment.shippingAddress.address2 :'',
			'postal': basket.defaultShipment.shippingAddress.postalCode ? basket.defaultShipment.shippingAddress.postalCode : '',
			'state': basket.defaultShipment.shippingAddress.stateCode ? basket.defaultShipment.shippingAddress.stateCode : '',
			'city': basket.defaultShipment.shippingAddress.city ? basket.defaultShipment.shippingAddress.city : '',
			'phone': basket.defaultShipment.shippingAddress.phone ? basket.defaultShipment.shippingAddress.phone :''
		};
	} else if(shippingInfo !== null && !empty(shippingInfo) && !empty(shippingInfo.shippingAddress)) {
		defaultShipment = {
				'firstName': shippingInfo.shippingAddress.firstName ? shippingInfo.shippingAddress.firstName : '',
				'lastName': shippingInfo.shippingAddress.lastName ? shippingInfo.shippingAddress.lastName : '',
				'country': shippingInfo.shippingAddress.country ? shippingInfo.shippingAddress.country.toUpperCase() : '',
				'address1': shippingInfo.shippingAddress.address1 ? shippingInfo.shippingAddress.address1 : '',
				'address2': shippingInfo.shippingAddress.address2 ? shippingInfo.shippingAddress.address2 :'',
				'postal': shippingInfo.shippingAddress.postal ? shippingInfo.shippingAddress.postal : '',
				'state': shippingInfo.shippingAddress.state ? shippingInfo.shippingAddress.state : '',
				'city': shippingInfo.shippingAddress.city ? shippingInfo.shippingAddress.city : '',
				'phone': shippingInfo.shippingAddress.phone ? shippingInfo.shippingAddress.phone :''
			};
	}
	
	return defaultShipment;
	
}

/**
* Get Billing details
**/
function getBillingInfo(cart, shippingObj) {

	
	var billingAddress = cart.getBillingAddress() || null;
	if(billingAddress) {
		
		var firstName = billingAddress.firstName ? billingAddress.firstName : '';
		var lastName = billingAddress.lastName ? billingAddress.lastName : '';
		var address1 = billingAddress.address1 ? billingAddress.address1 : '';
		var address2 = billingAddress.address2 ? billingAddress.address2 : '';
		var country = billingAddress.countryCode ? billingAddress.countryCode.value : '';
		var city = billingAddress.city ? billingAddress.city : '';
		var postal = billingAddress.postalCode ? billingAddress.postalCode : '';
		var state = billingAddress.stateCode ? billingAddress.stateCode : '';
		var phone = billingAddress.phone ? billingAddress.phone : '';

		var billingAddress = {
			firstName:  firstName,
			lastName: lastName,
			address1: address1,
			address2: address2,
			country: country,
			city: city,
			postal: postal,
			state: state,
			phone: phone
		}
	}
		
	//show billing summary section
	var showBillingSummary = false;
	if(session.custom.checkoutState == 'review') {
		showBillingSummary = true;
	}
	
	// get default shipment 
	var defaultShipment = getDefaultShipmentAddress(cart,shippingInfo);
	
	//Whether to use the same shipping address as billing address
	var isSameAsShipping = false;
	
	if(cart.getProductLineItems().size() > 0) {
		var billingfrm = session.forms.billing.billingAddress;
		isSameAsShipping = billingfrm && billingfrm.sameasshipping && billingfrm.sameasshipping.htmlValue === 'true' ? true : false;
	}
	
	// Open in the edit mode
	if((session.custom.checkoutState == 'billing') && (session.custom.checkoutMode == 'edit')) {
		showBillingSummary = false;
	}

	return {
		billingAddress: billingAddress,
		showBillingSummary: showBillingSummary,
		defaultShipment: defaultShipment,
		isSameAsShipping: isSameAsShipping
	}
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

/***
* Get Payment Info
**/
function getPaymentInfo(cart, billingForm) {
	var paymentInfo = {};
	var creditCardList = initCreditCardList(cart);
    var applicablePaymentMethods = creditCardList.ApplicablePaymentMethods;
    var billingForm = app.getForm('billing').object;
    var paymentMethods = billingForm.paymentMethods;
    if (paymentMethods.valid) {
        paymentMethods.selectedPaymentMethodID.setOptions(applicablePaymentMethods.iterator());
    } else {
        paymentMethods.clearFormElement();
    }
    
	var paymentOptions = billingForm.paymentMethods ? billingForm.paymentMethods.selectedPaymentMethodID: null;
	var Basket = cart.object;
	
	paymentInfo.paymentOptions = paymentOptions;
	paymentInfo.paymentInstruments = (Basket && Basket.paymentInstruments) ? Basket.paymentInstruments : null;
	return paymentInfo;	
}

/*
 * Check if eligible to start billing
 */

function checkIfShippingInfoSet(cart) {
	
	var showBilling = false;
	var shippingAddress = {};    
	var email = (cart.getCustomerEmail())?cart.getCustomerEmail():'';
	
	if(email) {
	    if((cart.getDefaultShipment()) && (cart.getDefaultShipment().getShippingAddress())) {
			shippingAddress = {
					'firstName': cart.getDefaultShipment().getShippingAddress().firstName ? cart.getDefaultShipment().getShippingAddress().firstName : '',
					'lastName': cart.getDefaultShipment().getShippingAddress().lastName ? cart.getDefaultShipment().getShippingAddress().lastName : '',
					'country': cart.getDefaultShipment().getShippingAddress().countryCode ? cart.getDefaultShipment().getShippingAddress().countryCode.value.toUpperCase() : '',
					'address1': cart.getDefaultShipment().getShippingAddress().address1 ? cart.getDefaultShipment().getShippingAddress().address1 : '',
					'address2': cart.getDefaultShipment().getShippingAddress().address2 ? cart.getDefaultShipment().getShippingAddress().address2 :'',
					'postal': cart.getDefaultShipment().getShippingAddress().postalCode ? cart.getDefaultShipment().getShippingAddress().postalCode : '',
					'state': cart.getDefaultShipment().getShippingAddress().stateCode ? cart.getDefaultShipment().getShippingAddress().stateCode : '',
					'city': cart.getDefaultShipment().getShippingAddress().city ? cart.getDefaultShipment().getShippingAddress().city : '',
					'phone': cart.getDefaultShipment().getShippingAddress().phone ? cart.getDefaultShipment().getShippingAddress().phone :''
				};	
		}


	    var selectedMethodID = (cart.getDefaultShipment().getShippingMethod().getID())?cart.getDefaultShipment().getShippingMethod().getID():'';
    
	    if(!empty(selectedMethodID) && !empty(shippingAddress.firstName) && !empty(shippingAddress.lastName) && !empty(shippingAddress.address1) && !empty(shippingAddress.country) && !empty(shippingAddress.city) 
			&& !empty(shippingAddress.postal) && !empty(shippingAddress.state) && !empty(shippingAddress.phone)) {
	    	showBilling = true;
	    }
		
	}
	
	return showBilling;	
}


/*
 * Exposed methods
 */
module.exports = {
		checkIfShippingInfoSet: checkIfShippingInfoSet,
		getCheckoutSummary : getCheckoutSummary,
		getCurrentBasket: getCurrentBasket,
		getCustomerInfo: getCustomerInfo
	}