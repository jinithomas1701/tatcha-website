'use strict';

/**
 * Controller for gift certificate purchases.
 *
 * @module controllers/GiftCert
 */

/* API Includes */
var GiftCertificateMgr = require('dw/order/GiftCertificateMgr');
var HashMap = require('dw/util/HashMap');
var Money = require('dw/value/Money');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');
var URLUtils = require('dw/web/URLUtils');
var RateLimiter = require('app_storefront_core/cartridge/scripts/util/RateLimiter');

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');

var Cart = app.getModel('Cart');
var ProductList = app.getModel('ProductList');
var PagingModel = require('dw/web/PagingModel');
var SearchModel = require('dw/catalog/SearchModel');
var securityHeader = require('~/cartridge/scripts/util/SecurityHeaders');
var Site = require('dw/system/Site');

/**
 * Clears the giftcert form and calls the {@link module:controllers/GiftCert~showPurchase|showPurchase} function to
 * render the page to purchase a gift certificate.
 *
 */
function purchase() {
    app.getForm('giftcert').clear();

    showPurchase();
}


/**
 * Renders the new design for gift certificate purchase
 * **/

function giftPurchase() {
	
	var ContentMgr = dw.content.ContentMgr;
	 var content;
	try {
		 content = ContentMgr.getContent('e-gift-card');
	}catch(e) {
		
	}
   
	securityHeader.setSecurityHeaders();
	app.getView({
        bctext1: 'gc',
        bcurl1: null,
        Content: content,
        ContinueURL: URLUtils.https('GiftCert-AddToBasket')
    }).render('checkout/giftcert/giftcertpurchasestep1_bs');
}

/**
 * Internal helper function that prepares and shows the purchase page without clearing the form.
 * Populates the giftcert.purchase with information from the httpParameterMap and the customer profile.
 * Sets the ContinueURL to {@link module:controllers/GiftCert~addToBasket|GiftCert-AddToBasket}
 *  and renders the purchase page (checkout/giftcert/giftcertpurchase template).
 */
function showPurchase() {
    var parameterMap = request.httpParameterMap;
    var purchaseForm = app.getForm('giftcert.purchase');


    if (parameterMap.from.stringValue || parameterMap.recipient.stringValue) {
        purchaseForm.setValue('from', parameterMap.from.stringValue);
        purchaseForm.setValue('recipient', parameterMap.recipient.stringValue);
    }


    if (customer.registered) {
        purchaseForm.setValue('from', customer.profile.firstName + ' ' + customer.profile.lastName);
    }


    if (!parameterMap.plid.empty) {
        var productList = ProductList.get(parameterMap.plid.value).object;
        if (productList) {
            purchaseForm.setValue('recipient', productList.owner.profile.firstName + ' ' +
                productList.owner.profile.lastName);
            purchaseForm.setValue('recipientEmail', productList.owner.profile.email);
            purchaseForm.setValue('confirmRecipientEmail', productList.owner.profile.email);
            purchaseForm.setValue('lineItemId', parameterMap.itemid.stringValue);
        }
    }
    
    var Content = require('~/cartridge/scripts/app').getModel('Content');
    var seoAsset = Content.get('giftcardseo');

    var pageMeta = require('~/cartridge/scripts/meta');
    pageMeta.update(seoAsset);

    app.getView({
        bctext1: 'gc',
        bcurl1: null,
        ContinueURL: URLUtils.https('GiftCert-AddToBasket')
    }).render('checkout/giftcert/giftcertpurchase');
}

/**
 * Internal helper to show errors on the purchase page.
 * For an ajax request, renders a JSON object (checkout/giftcert/giftcertaddtobasketjson template).
 * Otherwise, calls the {@link module:controllers/GiftCert~showPurchase|showPurchase} function.
 * @param  {Object} args
 * @param  {dw.util.Map} args.FormErrors Errors from the form.
 * @param  {String} args.GeneralError Errors from the page.
 */
function showError(args) {
    if (request.httpParameterMap.format.stringValue === 'ajax') {
        app.getView({
            GeneralError: args.GeneralError,
            FormErrors: args.FormErrors || new HashMap()
        }).render('checkout/giftcert/giftcertaddtobasketjson');
        return;
    }

    showPurchase();
}


/**
 * Updates and renders the gift certificate purchase page.
 * Clears the giftcert form and assigns values to the giftcert.purchase form from the gift certificate line item. Sets ContinueURL to GiftCert-Update
 * and renders the gift certificate purchase page (checkout/giftcert/giftcertpurchase template).
 * If there is no existing cart or no gift certificate line item, calls the {@link module:controllers/GiftCert~purchase|purchase} function.
 */
function edit() {
    var cart = Cart.get();
    if (!cart) {
        purchase();
        return;
    }
    var giftCertificateLineItem = cart.getGiftCertificateLineItemByUUID(request.httpParameterMap.GiftCertificateLineItemID.value);
    if (!giftCertificateLineItem) {
        purchase();
        return;
    }

    var giftcertForm = app.getForm('giftcert');
    giftcertForm.clear();

    var purchaseForm = app.getForm('giftcert.purchase');
    purchaseForm.setValue('lineItemId', giftCertificateLineItem.UUID);
    purchaseForm.setValue('from', giftCertificateLineItem.senderName);
    purchaseForm.setValue('recipient', giftCertificateLineItem.recipientName);
    purchaseForm.setValue('recipientEmail', giftCertificateLineItem.recipientEmail);
    purchaseForm.setValue('confirmRecipientEmail', giftCertificateLineItem.recipientEmail);
    purchaseForm.setValue('message', giftCertificateLineItem.message);
    purchaseForm.setValue('amount', giftCertificateLineItem.price.value);

    app.getView({
        GiftCertificateLineItem: giftCertificateLineItem,
        ContinueURL: URLUtils.https('GiftCert-Update')
    }).render('checkout/giftcert/giftcertpurchase');
}


/**
 * Displays the details of a gift certificate as a JSON object in order to check the
 * current balance. If an error occurs, renders an error message.
 */
function checkBalance() {
    var params = request.httpParameterMap;

    // Check to see if the number of attempts has exceeded the session threshold
    if (RateLimiter.isOverThreshold('GCBalanceCounter')) {
        RateLimiter.showCaptcha();
    }

    var giftCertificate = null;

    var giftCertID = params.giftCertID.stringValue || params.dwfrm_giftcert_balance_giftCertID.stringValue;
    if (giftCertID) {
        giftCertificate = GiftCertificateMgr.getGiftCertificateByCode(giftCertID);
    }

    if (!empty(giftCertificate) && giftCertificate.enabled) {
        app.getView({
            GiftCertificate: giftCertificate
        }).render('checkout/giftcert/giftcertpurchase');
        RateLimiter.hideCaptcha();
    } else {
        app.getView({
            ErrorMsg: Resource.msg('giftcertpurchase.checkinvalid', 'checkout', null)
        }).render('checkout/giftcert/giftcertpurchase');
    }

}


/**
 * Adds a gift certificate to the basket.
 * This is called when the giftcert.purchase form is posted in the giftcertpurchase.isml template.
 */
function addToBasket() {
    processAddToBasket(createGiftCert);
}

/**
 * Updates the gift certificate in the basket.
 * This is called when the giftcert.purchase is posted in the giftcertpurchase.isml template.
 */
function update() {
    processAddToBasket(updateGiftCert);
}

/**
 * Internal helper function that creates/updates the gift certificate.
 * Validates the giftcert.purchase form and handles any errors. Gets or
 * creates a CartModel and creates or updates the gift certificate line item.
 * It then recalculates the cart. For ajax requests, renders the checkout/giftcert/giftcertaddtobasketjson
 * template. For all other requests, calls the {@link module:controllers/Cart~show|Cart controller show function}.
 * @param {function} action The gift certificate function to execute.
 */
function processAddToBasket(action) {
    var purchaseForm = app.getForm('giftcert.purchase');

    // Validates confirmation of email address.
   // var recipientEmailForm = purchaseForm.get('recipientEmail');
   
   // var confirmRecipientEmailForm = purchaseForm.get('confirmRecipientEmail');

  //  if (recipientEmailForm.isValid() && confirmRecipientEmailForm.isValid() && (recipientEmailForm.value() !== confirmRecipientEmailForm.value())) {
  //      confirmRecipientEmailForm.invalidateFormElement('giftcert.confirmrecipientemailvalueerror');
  //  }

    // Validates amount in range.
    var amountForm = purchaseForm.get('amount');
    if (amountForm.isValid() && ((amountForm.value() < 5) || (amountForm.value() > 5000))) {
        amountForm.invalidateFormElement('giftcert.amountvalueerror');
    }

    // Extracts any error messages from validation.
    var formErrors = new HashMap();
    for (var i = 0; i < purchaseForm.object.getChildCount(); i++) {
        var field = purchaseForm.object[i];
        if (!field.isValid()) {
            formErrors.put(field.getHtmlName(), Resource.msg(field.getError(), 'forms', null));
        }
    }

    if (!formErrors.isEmpty()) {
        showError({
            FormErrors: formErrors
        });
        return;
    }

    var cart = Cart.goc();
    if (!cart) {
        showError({
            GeneralError: Resource.msg('checkout.giftcert.error.internal', 'checkout', null)
        });
        return;
    }

    var giftCertificateLineItem = action(cart);

    if (!giftCertificateLineItem) {
        showError({
            GeneralError: Resource.msg('checkout.giftcert.error.internal', 'checkout', null)
        });
        return;
    }

    Transaction.wrap(function () {
        cart.calculate();
    });

    if (request.httpParameterMap.format.stringValue === 'ajax') {
        app.getView({
            FormErrors: formErrors,
            GiftCertificateLineItem: giftCertificateLineItem,
            giftCardAmount: amountForm.value()
        }).render('checkout/giftcert/egiftbagmodal');
        return;
    }

    response.redirect(URLUtils.https('Cart-Show'));
}

/**
 * Gets the gift certificate line item and renders the minicart (checkout/cart/minicart) template.
 *
 * @TODO Check why normal minicart cannot be used
 */
function showMiniCart() {
    var cart = Cart.get();
    if (!cart) {
        return;
    }
    var giftCertificateLineItem = cart.getGiftCertificateLineItemByUUID(request.httpParameterMap.lineItemId.value);
    if (!giftCertificateLineItem) {
        return;
    }
    app.getView({
        Basket: cart.object,
        GiftCertificateLineItem: giftCertificateLineItem
    }).render('checkout/cart/minicart');
}

/**
 * Creates a gift certificate in the customer basket using form input values.
 * If a gift certificate is added to a product list, a ProductListItem is added, otherwise a GiftCertificateLineItem
 * is added.
 * __Note:__ the form must be validated before this function is called.
 *
 * @param {module:models/CartModel~CartModel} cart - A CartModel wrapping the current Basket.
 * @return {dw.order.GiftCertificateLineItem} gift certificate line item added to the
 * current basket or product list.
 */
function createGiftCert(cart) {
    var giftCertificateLineItem;
    var productLineItemId = request.httpParameterMap.plid.stringValue;
    var productListItem = null;
    var purchaseForm = app.getForm('giftcert.purchase');

    if (productLineItemId) {
        var productList = ProductList.get(productLineItemId).object;
        if (productList) {
            productListItem = productList.getItem(purchaseForm.get('lineItemId').value());
        }
    }

    Transaction.wrap(function() {
        giftCertificateLineItem = cart.object.createGiftCertificateLineItem(purchaseForm.get('amount').value(), purchaseForm.get('recipientEmail').value())
        giftCertificateLineItem.setRecipientName(purchaseForm.get('recipient').value());
        giftCertificateLineItem.setSenderName(purchaseForm.get('from').value());
        giftCertificateLineItem.setMessage(purchaseForm.get('message').value());
        if (productListItem) {
            giftCertificateLineItem.setProductListItem(productListItem);
        }
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
 * @param {module:models/CartModel~CartModel} cart - CartModel that wraps the current Basket.
 * @return {dw.order.GiftCertificateLineItem }gift certificate line item.
 */
function updateGiftCert(cart) {
    var purchaseForm = app.getForm('giftcert.purchase');

    var giftCertificateLineItem = cart.getGiftCertificateLineItemByUUID(purchaseForm.get('lineItemId').value());
    if (!giftCertificateLineItem) {
        return null;
    }

    Transaction.begin();

    giftCertificateLineItem.senderName = purchaseForm.get('from').value();
    giftCertificateLineItem.recipientName = purchaseForm.get('recipient').value();
    giftCertificateLineItem.recipientEmail = purchaseForm.get('recipientEmail').value();
    giftCertificateLineItem.message = purchaseForm.get('message').value();

    var amount = purchaseForm.get('amount').value();
    giftCertificateLineItem.basePrice = new Money(amount, giftCertificateLineItem.basePrice.currencyCode);
    giftCertificateLineItem.grossPrice = new Money(amount, giftCertificateLineItem.grossPrice.currencyCode);
    giftCertificateLineItem.netPrice = new Money(amount, giftCertificateLineItem.netPrice.currencyCode);

    Transaction.commit();

    return giftCertificateLineItem;
}

/**
 * Save gift certificate design tab data to session object
 * **/
function saveGiftCertStep1Data() {
	
	var params = request.httpParameterMap;
	// Constructs the search based on the HTTP params and sets the categoryID.
    var Search = app.getModel('Search');
    var productSearchModel = Search.initializeProductSearchModel(params);

    // Executes the product search.
    productSearchModel.search();
    
    var productSearchListIterator = getProductSearchList(productSearchModel);
    
    var productPagingModel = new PagingModel(productSearchListIterator, productSearchModel.count);
    if (params.start.submitted) {
        productPagingModel.setStart(params.start.intValue);
    }

    if (params.sz.submitted && params.sz.intValue <= 60) {
        productPagingModel.setPageSize(params.sz.intValue);
    } else {
        productPagingModel.setPageSize(100);
    }
    
	let r = require('~/cartridge/scripts/util/Response');
	let parameterMap = request.httpParameterMap;
	let selectedGiftimage = params.selectedGiftImgae.stringValue;
	let senderName = params.senderName.stringValue;
	let recepientName = params.recipientName.stringValue;
	let giftAmount = params.giftCertAmount.intValue;
	let itemid = params.itemid.stringValue;
	session.custom.ispage2Viewed = true;
	if(!empty(selectedGiftimage) && !empty(senderName) && !empty(recepientName) && !empty(giftAmount)) {
		session.custom.selectedGiftimage = selectedGiftimage;
		session.custom.senderName = senderName;
		session.custom.recepientName = recepientName;
		session.custom.giftAmount = giftAmount;
		session.custom.itemid = itemid;
		session.custom.nextStep = 2;
		
		app.getView({
			status: true,
			activeStep: 2,
			ProductSearchResult: productSearchModel,
            ProductPagingModel: productPagingModel
        }).render('checkout/giftcert/giftcertpurchasestep2_bs');
		
	} else {
		r.renderJSON({
			status: false
		});
	}
}

/**
 * function to remove required products from search model for gift card recommendation list
 * using two product list to avoid concurrent modification exception
 * @param productSearchModel
 * @returns
 */
function getProductSearchList(productSearchModel){
	var prdList,productSearchList;
	try {
		prdList = new dw.util.ArrayList(productSearchModel.productSearchHits); 
	    productSearchList = new dw.util.ArrayList(productSearchModel.productSearchHits);
	    var removePrd = Site.getCurrent().getCustomPreferenceValue('excludeGiftCertProducts').split(',');
	    if(!empty(removePrd)){
	    	for ( var item in prdList) {
		    	if(removePrd.indexOf(prdList[item].productID) > -1){
		    		productSearchList.remove(prdList[item]);
		    	}
			}
	    }
	    
	} catch (e) {

	}
	
    return productSearchList.iterator();
}

/**
 * Save gift certificate recommend tab data to session object
 * **/
function saveGiftCertStep2Data() {
	var params = request.httpParameterMap;
	session.custom.nextStep = 3;
	session.custom.recommendedItems = params.recommendedItems.stringValue;
	session.custom.ispage3Viewed = true;
	var selectedImage = params.selectedGiftImgae.stringValue;
	session.custom.selectedGiftimage = selectedImage;
	app.getView({
		status: true
    }).render('checkout/giftcert/giftcertpurchasestep3_bs');
}

function getSelectedProducts()
{
	var params = request.httpParameterMap;
	var selected = [];
	var selectedProducts = [];
	var limit = 3;
	if(!empty(params.selected.stringValue)){
		selected = JSON.parse(params.selected.stringValue);
		for (var item in selected) {
			let product = dw.catalog.ProductMgr.getProduct(selected[item]);
			selectedProducts.push(product);
		}
	}
	
	app.getView({
		selectedProducts : selectedProducts,
		limit : limit
	}).render('checkout/giftcert/selectedproducts');
}
var resetGiftSessionData = function() {
  session.custom.nextStep = 0
  session.custom.selectedGiftimage = '';
  session.custom.senderName = '';
  session.custom.recepientName = '';
  session.custom.giftAmount = 0;
  session.custom.recommendedItems = '';
  session.custom.senderEmail = '';
}


/**
 * Save gift purchase data to system object and add the same to GiftCertificateLineItem
 * **/
function saveGiftPurchaseData() {
	let parameterMap = request.httpParameterMap;
	let recipientEmail = parameterMap.recipientEmail.stringValue;
	let senderEmail = parameterMap.senderEmail.stringValue;
	let giftMessage = parameterMap.giftcardMessage.stringValue;
	let fontOption = parameterMap.selectedFont.stringValue;
	let giftDeliveryDate = parameterMap.giftcardSendDate.dateValue;
	let giftAmount = session.custom.giftAmount;
	if(!empty(recipientEmail) && !empty(senderEmail) && !empty(fontOption) && !empty(giftDeliveryDate)) {
		session.custom.recepientMail = recipientEmail;
		session.custom.senderEmail = senderEmail;
		session.custom.giftMessage = giftMessage;
		session.custom.selectedFont = fontOption;
		session.custom.giftDeliveryDate = giftDeliveryDate;
		session.custom.NoCall = true;
		
		var cart = Cart.goc();
	    if (!cart || giftAmount===0) {
	        return;
	    }
	    
	    var giftCertificateLineItem = createGiftCertificate(cart);

	    if (!giftCertificateLineItem) {
	        return;
	    }
	    
	    Transaction.wrap(function () {
	        cart.calculate();
	    });
	    
	    resetGiftSessionData();

	    if (request.httpParameterMap.format.stringValue === 'ajax') {
//	        app.getView({
//	        	giftCertLineItem: giftCertificateLineItem,
//	            giftCardAmount: giftAmount
//	        }).render('checkout/giftcert/egiftbagmodal');
	    	
	    	//Show Minicart on adding gift certificate.
            if (dw.system.Site.getCurrent().getCustomPreferenceValue('UseSfraMiniBag')) {
                response.redirect(URLUtils.url('CartSFRA-MiniCartShow',"cartAction",'update'));
            } else {
                app.getView('MiniCart', {
                    Basket: cart
                }).render('checkout/cart/minicartcontent');
            }
	        
	        
	        return;
	    }
	    
	    response.redirect(URLUtils.https('Cart-Show'));
	}
	 
}


/**
 * Create and save gift certificate data based on the values passed from the new design
 * ***/
function createGiftCertificate(cart) {
	var giftCertificateLineItem;
    
    Transaction.wrap(function() {
        giftCertificateLineItem = cart.object.createGiftCertificateLineItem(session.custom.giftAmount, session.custom.recepientMail)
        giftCertificateLineItem.setRecipientName(session.custom.recepientName);
        giftCertificateLineItem.setSenderName(session.custom.senderName);
        giftCertificateLineItem.setMessage(session.custom.giftMessage);
        giftCertificateLineItem.custom.giftMessageFont = session.custom.selectedFont;
        giftCertificateLineItem.custom.giftCertificateImage = session.custom.selectedGiftimage;
        giftCertificateLineItem.custom.giftCertificateDeliveryDate = session.custom.giftDeliveryDate;
        giftCertificateLineItem.custom.giftCertificateRecommendedItems = session.custom.recommendedItems;
        giftCertificateLineItem.custom.giftCertificateSenderEmail = session.custom.senderEmail;
        
        return giftCertificateLineItem;
    });

    if (!giftCertificateLineItem) {
        return null;
    }

    return giftCertificateLineItem;
}


/**
 * Sets the current active tab of gift certificate purchase to session variable
 * ***/
function setActiveStep() {
	let parameterMap = request.httpParameterMap;
	session.custom.nextStep = parameterMap.tab.value;
	
	let r = require('~/cartridge/scripts/util/Response');
    r.renderJSON({status: true});
}

/** 
 * Send thank you email
 **/
function sendThankyou() {
	var params = request.httpParameterMap;
	var message = params.thankYouMessage;
	var cardId = params.view;
	
	if(!empty(cardId)){
	    var EmailUtils = require('app_storefront_core/cartridge/scripts/util/EmailUtils');
	    var GiftCertificateMgr = require('dw/order/GiftCertificateMgr');
	    
	    var giftCertificate = GiftCertificateMgr.getGiftCertificateByMerchantID(cardId);
	    var emailResponse = EmailUtils.sendThankyouEmail(giftCertificate, message)
		
		let r = require('~/cartridge/scripts/util/Response');
	    r.renderJSON({status: true});
	} else{
		let r = require('~/cartridge/scripts/util/Response');
	    r.renderJSON({status: false});
	}
}

/*
 * Web exposed methods
 */
/** Renders the page to purchase a gift certificate.
 * @see module:controllers/GiftCert~purchase */
exports.Purchase        = guard.ensure(['https','get'],purchase);
/** Renders the new design for gift certificate purchase */
exports.GiftPurchase        = guard.ensure(['https','get'],giftPurchase);
/** Updates and renders the gift certificate purchase page.
 * @see module:controllers/GiftCert~edit */
exports.Edit            = guard.ensure(['https','get'],edit);
/** Displays the details of a gift certificate to check the current balance.
 * @see module:controllers/GiftCert~checkBalance */
exports.CheckBalance    = guard.ensure(['https','post'],checkBalance);
/** Adds a gift certificate to the basket.
 * @see module:controllers/GiftCert~addToBasket */
exports.AddToBasket     = guard.ensure(['https','post'],addToBasket);
/** Updates the gift certificate in the basket.
 * @see module:controllers/GiftCert~update */
exports.Update          = guard.ensure(['https','post'],update);
/** Renders the minicart.
 * @see module:controllers/GiftCert~showMiniCart */
exports.ShowMiniCart    = guard.ensure(['https','get'],showMiniCart);

exports.SaveGiftCertStep1Data = guard.ensure(['https','post'],saveGiftCertStep1Data);
exports.SaveGiftCertStep2Data = guard.ensure(['https','post'],saveGiftCertStep2Data);
exports.SaveGiftPurchaseData = guard.ensure(['https','post'],saveGiftPurchaseData);
exports.GetSelectedProducts = guard.ensure(['post'], getSelectedProducts);
exports.SetActiveStep = guard.ensure(['post'], setActiveStep);
exports.SendThankyou = guard.ensure(['post'], sendThankyou);
