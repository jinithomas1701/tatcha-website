
'use strict';

/**
 *
 */

var app = require('app_storefront_controllers/cartridge/scripts/app');
var guard = require('app_storefront_controllers/cartridge/scripts/guard');


/*
 * Build data to support rsc rendering
 */
function buildRSCData () {
	var rscData = {};
	var httpParameterMap = request.httpParameterMap;
	var pageContext = httpParameterMap.pagecontexttype;
	var checkoutState = httpParameterMap.checkoutState;
	var checkoutMode = httpParameterMap.checkoutMode;
	var paymentMethod = httpParameterMap.paymentMethod;
	rscData.pageContext = pageContext;
	rscData.pageTitle = httpParameterMap.pagecontexttitle;
	if(pageContext == 'checkout') {
		rscData.profileData = buildCheckoutProfileData();
	} else {
		rscData.profileData = buildProfileData();
	}
	rscData.authenticated = (!empty(session.customer)) ? session.customer.authenticated : false;
	rscData.checkoutState = checkoutState;
	rscData.checkoutMode = checkoutMode;
	rscData.paymentMethod = paymentMethod;
	return rscData;
}

function buildProfileData () {
	
	var profileData = {};
	
	var customer = session.customer;
	
	if (!empty(customer) && customer.authenticated) {
		profileData = buildCustomer(customer)
	}
	return JSON.stringify(profileData);
	
}

function buildCheckoutProfileData () {

	var profileData = {};
	var profileAttributes = {};
	var cart = app.getModel('Cart').get();
	
	var customer = session.customer;
	
	if (!empty(customer) && customer.authenticated) {
		
		profileData = buildCustomer(customer);
		
	} else if(!empty(cart.getCustomerEmail())) {
		
		profileData.email = cart.getCustomerEmail();
		profileData.authenticated = false;

		if (!empty(cart.getCustomerNo())) {
			profileData.customerNo = cart.getCustomerNo();
		}

		var customer = cart.getCustomer();

		var billingAddress = cart.getBillingAddress();
		if (!empty(billingAddress)) {
			profileAttributes.$FirstName = billingAddress.firstName;
			profileAttributes.$LastName = billingAddress.lastName;
			profileAttributes.$Address = billingAddress.address1;
			profileAttributes.$City = billingAddress.city;
			profileAttributes.$State = billingAddress.stateCode;
			profileAttributes.$Zip = billingAddress.postalCode;
			profileAttributes.$Country = billingAddress.countryCode.displayValue;		
		}
		//Update auto delivery status
		var mParticleUtil = require('int_mParticle/cartridge/scripts/mParticleUtils.js');
		profileAttributes['Auto Delivery'] = mParticleUtil.getCustomersActiveSubscriptions();
		profileData.profileAttributes = profileAttributes;

	}
}

function buildCustomer(customer) {
	
	var profileData = {};
	var profileAttributes = {}
	
	profileData.email = customer.profile.email;
	profileData.customerNo = customer.profile.customerNo;
	
	if(customer.externallyAuthenticated) {
		if(!empty(customer.externalProfiles)) {
			profileData.facebookID = customer.externalProfiles[0].getExternalID();
		}
	}
	
	profileAttributes.$FirstName = customer.profile.firstName;
	profileAttributes.$LastName = customer.profile.lastName;
	
	if(!empty(customer.profile.custom.skinType)) {
		profileAttributes['Skin Type'] = customer.profile.custom.skinType.displayValue;
	}
	
	if(!empty(customer.profile.phoneMobile)) {
		profileAttributes.$Mobile = !empty(customer.profile.custom.countryCode) ? customer.profile.custom.countryCode + customer.profile.phoneMobile : customer.profile.phoneMobile;
	}
	
	if(!empty(session.privacy.wishlistPids)){
		profileAttributes.$Wishlist = session.privacy.wishlistPids;
	}
	//Update Auto Delivery status
	var rscUtils = require('int_rsc_gpds/cartridge/scripts/rscUtils.js');
	
	var autoDelivery = rscUtils.getCustomersActiveSubscriptions();
	if (autoDelivery === undefined || autoDelivery.length == 0) {
		autoDelivery = '';
	}	
	profileAttributes['Auto Delivery'] = autoDelivery;

	if (!empty(customer.profile.addressBook.preferredAddress)) {
		profileAttributes.$Address = customer.profile.addressBook.preferredAddress.address1;
		profileAttributes.$City = customer.profile.addressBook.preferredAddress.city;
		profileAttributes.$State = customer.profile.addressBook.preferredAddress.stateCode;
		profileAttributes.$Zip = customer.profile.addressBook.preferredAddress.postalCode;
		profileAttributes.$Country = customer.profile.addressBook.preferredAddress.countryCode.displayValue;
	} else if (!empty(customer.profile.addressBook.addresses) && (customer.profile.addressBook.addresses.length > 0)) {
		profileAttributes.$Address = customer.profile.addressBook.addresses[0].address1;
		profileAttributes.$City = customer.profile.addressBook.addresses[0].city;
		profileAttributes.$State = customer.profile.addressBook.addresses[0].stateCode;
		profileAttributes.$Zip = customer.profile.addressBook.addresses[0].postalCode;
		profileAttributes.$Country = customer.profile.addressBook.addresses[0].countryCode.displayValue;
	}
	
	profileData.profileAttributes = profileAttributes;
	
	return profileData;
	
}

	
exports.BuildRSCData = guard.ensure(['get'], buildRSCData);
