'use strict';

var GiftCertificateMgr = require('dw/order/GiftCertificateMgr');
var ArrayList = require('dw/util/ArrayList');
var productListHelper = require('*/cartridge/scripts/helpers/wishListHelpers');

/* getting giftcertificate details from order */
function getGiftcertificateFromOrder(order)
{
	var gcIdList = new ArrayList();
	var gcPaymentInstruments = order.totals.gcPIs;
    for(var i=0;i<gcPaymentInstruments.length;i++) {
		var giftCertificate = GiftCertificateMgr.getGiftCertificateByCode(gcPaymentInstruments[i].gcCode);
    	if(giftCertificate.status == require('dw/order/GiftCertificate').STATUS_REDEEMED){
    		var item = []; 
    		item.push({"senderName" : giftCertificate.senderName, "view" : giftCertificate.merchantID});
    		gcIdList.add(item);
    	}
	}
    return gcIdList;
}
/* Check Special category is assigned to current product category */
function hasCartCategory(product) {
	var specialCategory = dw.system.Site.current.getCustomPreferenceValue('AddToCartCategory');
	var categories = product.allCategories;
	categories = categories.iterator();
	var hasCategory = false;
    while (categories.hasNext()) {
        var category = categories.next();
        if(category.ID == specialCategory) {
        	hasCategory = true;
        	break;
        }
    }
    return hasCategory;
}
//Check product is wishlist item
function isWishlistItem(pid) {
	var available = false;
	var list = productListHelper.getCurrentOrNewList(customer, { type: 10 });
	var availability = productListHelper.getItemFromList(list,pid);
	if(availability){
		available = true
	}
	return available;
}

module.exports = {
    getGiftcertificateFromOrder: getGiftcertificateFromOrder,
	hasCartCategory:hasCartCategory,
	isWishlistItem:isWishlistItem
}