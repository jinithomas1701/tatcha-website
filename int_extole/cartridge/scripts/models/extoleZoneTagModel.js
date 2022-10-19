'use strict';

var Site = require('dw/system/Site');
var URLUtils = require('dw/web/URLUtils');
var extoleConfigurations = require('int_extole/cartridge/scripts/extole/libExtole');

/**
 * Function returns Extole Zone Tag object build based on pdict data, where
 * name 		: zone name
 * element_id 	: zone element_id
 * customer 	: active customer info, when available
 * order 		: order object, when available
 * product 		: product object, when available
 * category 	: category object, when available
 * labels		: Site ID and Current Locale
 * 
 * @param {Object} pdict - pipeline pdict or controller esult object 
 * @returns {Object} extoleZoneTag - configured extoleZoneTag object
 */
function getExtoleZoneTag(pdict) {	
	var extole = extoleConfigurations;
	var isExtoleEnabled = extole.isExtoleEnabled();
	var extoleClientName = extole.getClientName();
	var name = pdict.name.toString();
		
	// Customer related data
	var customer = pdict.customer;
	var customerEmail = '';
	var customerFirstName = '';
	var customerLastName = '';
	var order = pdict.order;
	
	if (customer && customer.getProfile()) {
		var profile = customer.getProfile();
	
		customerEmail = profile.getEmail();
		customerFirstName = profile.getFirstName();
		customerLastName = profile.getLastName();
	
	} else if(order) {
		customerEmail = order.customerEmail;
		if (order.billingAddress) {
			customerFirstName = order.billingAddress.firstName;
			customerLastName = order.billingAddress.lastName;
		}
	}

	// Order related data	
	if (order) {
		var couponList = '';
		var clis = order.getCouponLineItems();

		for (var i = 0; i < clis.length; i++) {
			var cli = clis[i];
			couponList = (empty(couponList)) ? couponList + cli.getCouponCode() : ',' + couponList + cli.getCouponCode();				
		}
	}
	// Product related data
	var	product = pdict.Product;
	var productID =  '';
	var productTitle =  '';
	var productImage;
	var productImageURL = '';
	var productDescription = '';
	var productURL = '';

	if (product) {
		productID = product.ID;
		productTitle =  (!empty(product.getPageTitle())? product.getPageTitle() : (!empty(product.getName()) ? product.getName() : product.ID));
		productImageURL = !empty(product.getImage('large')) ? product.getImage('large').getAbsURL().toString() : '';
		productDescription = !empty(product.getPageDescription()) ? product.getPageDescription() : '';
		productURL = URLUtils.http('Product-Show','pid', product.ID).toString();
	} 

	// Category related data
	var	category = pdict.category;
	var categoryTitle = '';
	var categoryImageURL = '';
	var categoryDescription = '';
	var categoryURL = '';
	
	if (category) {
		categoryTitle = !empty(category.getDisplayName()) ? category.getDisplayName() : category.ID;
		categoryImageURL = !empty(category.getImage()) ? category.getImage().getAbsURL().toString() : '';		
		categoryDescription = !empty(category.getPageDescription()) ? category.getPageDescription() : '';
		categoryURL = URLUtils.http('Search-Show','cid', category.ID).toString();
	}

	// Label related data
	var siteName = (extole.getSiteLabel()) ? extole.getSiteLabel() : 'Sites-' + Site.current.name + '-Site';
	var isExtoleStagingEnabled = Site.getCurrent().getCustomPreferenceValue('isExtoleStagingEnabled');
	var currentLocale =  pdict.CurrentRequest.locale;
	
	// creating Extole Zone Tag object 
	var extoleZoneTag = {};
	if (isExtoleEnabled && extoleClientName && name) {
		// name
		extoleZoneTag.name = name;

		// labels
		extoleZoneTag.labels = [siteName, currentLocale];

		// element_id
		if (name != 'registration' && name != 'conversion') {
			extoleZoneTag.element_id = pdict.element_id;
		}

		// data object
		if (customerEmail || ( name == 'product' && product) || ( name == 'category' && category)) {
			
			extoleZoneTag.data = {};
			
			if (name == 'product' && product) {
				// product data	
				extoleZoneTag.data.content = {};
				extoleZoneTag.data.content.title = productTitle;
				extoleZoneTag.data.content.image_url = productImageURL;
				extoleZoneTag.data.content.description = productDescription;
				extoleZoneTag.data.content.url = productURL;
				extoleZoneTag.data.content.partner_content_id = productID;
			} else if (name == 'category' && category) {
				// category data
				extoleZoneTag.data.content = {};
				extoleZoneTag.data.content.title = categoryTitle;
				extoleZoneTag.data.content.image_url = categoryImageURL;
				extoleZoneTag.data.content.description = categoryDescription;
				extoleZoneTag.data.content.url = categoryURL;
			} else {
				// customer data
				extoleZoneTag.data.first_name = customerFirstName;
				extoleZoneTag.data.last_name = customerLastName;
				extoleZoneTag.data.email = customerEmail;
				extoleZoneTag.data.partner_user_id = customerEmail;
				
				if (name == 'conversion' && order) {
					extoleZoneTag.data.partner_conversion_id = order.orderNo;
					extoleZoneTag.data.cart_value = order.getAdjustedMerchandizeTotalPrice(false).add(order.giftCertificateTotalPrice).getDecimalValue().toString();
					extoleZoneTag.data.coupon_code = couponList;
				}
			} 
		}
		
		if (isExtoleStagingEnabled) {
			if (empty(extoleZoneTag.data)) {
				extoleZoneTag.data = {};
			}
			extoleZoneTag.data.labels = 'staging';
		}

	}
	
	return extoleZoneTag;
}
			
module.exports = {
		get: getExtoleZoneTag
}
