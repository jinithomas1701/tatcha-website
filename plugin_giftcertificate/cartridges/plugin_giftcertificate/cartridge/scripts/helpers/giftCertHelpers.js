'use strict';
var Transaction = require('dw/system/Transaction');
var Money = require('dw/value/Money');
var Site = require('dw/system/Site');
importScript("int_tatcha_dis:common/GetImageUrl.ds");

/**
 * Gets a gift certificate line item.
 *
 * @param {dw.order.GiftCertificate} lineItems giftCertificate objects
 * @param {string} uuid - UUID of the gift certificate line item to retrieve.
 * @return {dw.order.GiftCertificate | null} giftCertificate object with the passed UUID or null if no gift certificate with the passed UUID exists in the cart.
 */
 var getGiftCertificateLineItemByUUID = function (lineItems, uuid) {
	for (var it = lineItems.iterator(); it.hasNext();) {
		var item = it.next();
		if (item.getUUID() === uuid) {
			return item;
		}
	}
	return null;
};

/**
 * Builds Object from giftCertificateLineItem to update the form values
 * @param {dw.order.GiftCertificate} giftCertificateLineItem gift certificate line item
 * @return {Object} giftLineItemObj
 */
 var getGiftLineItemObj = function (giftCertificateLineItem) {
	var giftLineItemObj = {};
	giftLineItemObj.from = giftCertificateLineItem.senderName;
	giftLineItemObj.lineItemId = giftCertificateLineItem.UUID;
	giftLineItemObj.recipient = giftCertificateLineItem.recipientName;
	giftLineItemObj.recipientEmail = giftCertificateLineItem.recipientEmail;
	giftLineItemObj.confirmRecipientEmail = giftCertificateLineItem.recipientEmail;
	giftLineItemObj.message = giftCertificateLineItem.message;
	giftLineItemObj.amount = giftCertificateLineItem.price.value;

	return giftLineItemObj;
};

/**
 * Creates a gift certificate in the customer basket using form input values.
 * If a gift certificate is added to a product list, a ProductListItem is added, otherwise a GiftCertificateLineItem
 * is added.
 * __Note:__ the form must be validated before this function is called.
 *
 * @param {dw.order.Basket} currentBasket -  current Basket.
 * @return {dw.order.GiftCertificateLineItem} gift certificate line item added to the
 * current basket or product list.
 */
 function createGiftCert(currentBasket, purchaseForm, req) {
	var giftCertificateLineItem;
	var selectImage = req.httpParameterMap.selectedGiftImage.stringValue;
	Transaction.wrap(function () {
		giftCertificateLineItem = currentBasket.createGiftCertificateLineItem(purchaseForm.amount.value, purchaseForm.recipientEmail.value);
		giftCertificateLineItem.setRecipientName(purchaseForm.recipient.value);
		giftCertificateLineItem.setSenderName(purchaseForm.from.value);
		giftCertificateLineItem.setMessage(purchaseForm.message.value);
		giftCertificateLineItem.custom.giftCertificateImage = selectImage;
		giftCertificateLineItem.custom.giftCertificateDeliveryDate = purchaseForm.deliveryDate.value;
		giftCertificateLineItem.custom.giftCertificateSenderEmail = purchaseForm.senderEmail.value;
		return giftCertificateLineItem;
	});

	if (!giftCertificateLineItem) {
		return null;
	}

	return giftCertificateLineItem;
}

/**
 * Updates a gift certificate in the customer basket using form input values.
 * Gets the input values from the purchase form and assigns them to the gift certificate line item.
 * __Note:__ the form must be validated before calling this function.
 *
 * @transaction
 * @param {dw.order.Basket} currentBasket -  current Basket.
 * @return {dw.order.GiftCertificateLineItem} gift certificate line item added to the
 * current basket or product list.
 */
 function updateGiftCert(currentBasket) {
	// eslint-disable-next-line no-undef
	var purchaseForm = session.forms.giftcert.purchase;
	var giftCertificateLineItems = currentBasket.getGiftCertificateLineItems();
	var giftCertificateLineItem = null;
	var giftCertificateLineItemUUID = purchaseForm.lineItemId.value;

	if (giftCertificateLineItems.length > 0 && giftCertificateLineItemUUID != null) {
		giftCertificateLineItem = getGiftCertificateLineItemByUUID(giftCertificateLineItems, giftCertificateLineItemUUID);
	}

	if (!giftCertificateLineItem) {
		return null;
	}

	Transaction.wrap(function () {
		giftCertificateLineItem.senderName = purchaseForm.from.value;
		giftCertificateLineItem.recipientName = purchaseForm.recipient.value;
		giftCertificateLineItem.recipientEmail = purchaseForm.recipientEmail.value;
		giftCertificateLineItem.message = purchaseForm.message.value;

		var amount = purchaseForm.amount.value;
		giftCertificateLineItem.basePrice = new Money(amount, giftCertificateLineItem.basePrice.currencyCode);
		giftCertificateLineItem.grossPrice = new Money(amount, giftCertificateLineItem.grossPrice.currencyCode);
		giftCertificateLineItem.netPrice = new Money(amount, giftCertificateLineItem.netPrice.currencyCode);
	});


	return giftCertificateLineItem;
}
/**
 * Internal helper function that validates the gift certificate form.
 * Validates the giftcert.purchase form and handles any errors.
 * @param {Object} form - gift certificate form object
 * @return {Object} giftCertForm
 */
 var processAddToBasket = function (form) {
	var Resource = require('dw/web/Resource');
	var giftCertForm = form;

	// Validates amount in range.
	var amountForm = giftCertForm.purchase.amount;
	if (amountForm.valid && ((amountForm.value < 5) || (amountForm.value > 5000))) {
		amountForm.valid = false;
		amountForm.error = Resource.msg('giftcert.amountparseerror', 'forms', null);
		giftCertForm.valid = false;
	}

	return giftCertForm;
}
/**
 * giftMediaUrl helper function that generate the gift certificate image url.
 * Generate the gift certificate image urls.
 * @param {dw.content.MediaFile} image - gift certificate image object
 * @param {String} pageType - Type of page
 * @param {Boolean} absolute 
 * @return {String} url 
 */
var giftMediaUrl= function(image, pageType, absolute){
	var mediaUrl = getBlogMediaUrl(image, pageType, absolute);
	return mediaUrl;
}

/**
 * Create a gift certificate for a gift certificate line item in the order
 * @param {dw.order.GiftCertificateLineItem} giftCertificateLineItem - gift certificate line item in basket
 * @param {string} orderNo the order number of the order to associate gift certificate to
 * @return {dw.order.GiftCertificate} - gift certificate
 */
 function createGiftCertificateFromLineItem(giftCertificateLineItem, orderNo) {
	var GiftCertificateMgr = require('dw/order/GiftCertificateMgr');
	var giftCertificate = GiftCertificateMgr.createGiftCertificate(giftCertificateLineItem.netPrice.value);
	giftCertificate.setRecipientEmail(giftCertificateLineItem.recipientEmail);
	giftCertificate.setRecipientName(giftCertificateLineItem.recipientName);
	giftCertificate.setSenderName(giftCertificateLineItem.senderName);
	giftCertificate.setMessage(giftCertificateLineItem.message);
	giftCertificate.setOrderNo(orderNo);
		
    //custom attributes
    Transaction.wrap(function () {
    	giftCertificate.custom.giftCertificateImage = giftCertificateLineItem.custom.giftCertificateImage;
    	giftCertificate.custom.giftCertificateDeliveryDate = giftCertificateLineItem.custom.giftCertificateDeliveryDate;
    	giftCertificate.custom.giftCertificateSenderEmail = giftCertificateLineItem.custom.giftCertificateSenderEmail;
    });
	return giftCertificate;
}
function getGiftCertConfig(){
	var viewDatas = {},
	lastAmount = 0;
	var Site = require('dw/system/Site');
	var ProductMgr = require('dw/catalog/ProductMgr');
	var mParticleUtil = require('int_mParticle/cartridge/scripts/mParticleUtils.js');
	var amountArr = Site.getCurrent().getCustomPreferenceValue('giftcert-amount');
	var giftAmount = JSON.parse(amountArr);
	var giftproductId = Site.getCurrent().getCustomPreferenceValue('EgiftProduct-ID');
	var giftProduct = dw.catalog.ProductMgr.getProduct(giftproductId);
	var defualtAmount = Site.getCurrent().getCustomPreferenceValue('defaultGiftCertAmount');
	var mParticleInfo = mParticleUtil.getProductInfo(giftProduct);
	
	if(defualtAmount&&!empty(defualtAmount)&& giftAmount.includes(defualtAmount)){
		lastAmount = defualtAmount;
	}else if(!empty(giftAmount[0])){
		lastAmount = giftAmount[0];
	}
	var selectedAmount = session.custom.giftAmount ? session.custom.giftAmount: lastAmount;
	if(!empty(mParticleInfo)){
		mParticleInfo.price = selectedAmount;
	}
	
	var giftCertCategory = Site.getCurrent().getCustomPreferenceValue('giftCertCategory');
	viewDatas = {
		giftAmount : giftAmount,
		giftProduct : giftProduct,
		selectedAmount : selectedAmount,
		giftproductId:giftproductId,
		giftCertCategory:giftCertCategory,
		mParticleInfo:mParticleInfo
	}
	return viewDatas;
}
module.exports = {
	getGiftCertificateLineItemByUUID: getGiftCertificateLineItemByUUID,
	getGiftLineItemObj: getGiftLineItemObj,
	createGiftCert: createGiftCert,
	updateGiftCert: updateGiftCert,
	processAddToBasket: processAddToBasket,
	createGiftCertificateFromLineItem: createGiftCertificateFromLineItem,
    giftMediaUrl:giftMediaUrl,
	getGiftCertConfig:getGiftCertConfig
};
