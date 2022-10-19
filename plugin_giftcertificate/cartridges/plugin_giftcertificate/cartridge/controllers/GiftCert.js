'use strict';

var server = require('server');

var Transaction = require('dw/system/Transaction');
var URLUtils = require('dw/web/URLUtils');
var BasketMgr = require('dw/order/BasketMgr');
var Resource = require('dw/web/Resource');

var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var giftCertHelper = require('*/cartridge/scripts/helpers/giftCertHelpers');
var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');

/* API Includes */
var GiftCertificateMgr = require('dw/order/GiftCertificateMgr');

/**
 * Renders form for adding gift certificate
 */
 server.get('GiftPurchase', csrfProtection.generateToken, function (req, res, next) {
    var giftCertForm = server.forms.getForm('giftcert');
    giftCertForm.clear();
    var config = giftCertHelper.getGiftCertConfig();
    var selectedAmount = session.custom.giftAmount ? session.custom.giftAmount: 0;
    
    var folder = new dw.content.ContentMgr.getFolder('gift-card-images');
	var contentList = new dw.util.ArrayList(folder.onlineContent);
	
	var filePath;
	var imagePath;
	if(contentList && contentList.length && contentList.length > 0 && contentList[0] && !empty(contentList[0])){
        filePath = contentList[0].custom.image;
        if(filePath && !empty(filePath)){
            imagePath = giftCertHelper.giftMediaUrl(filePath,'pdp');
        }
    }
    var actionUrl = URLUtils.https('GiftCert-AddToBasket');
    res.render('checkout/giftcert/giftcertpurchase', {
        giftCertForm: giftCertForm,
        actionUrl: actionUrl,
        product: config.giftProduct,
        pid: config.giftproductId,
        imagePath: imagePath,
        giftAmount:config.giftAmount,
        selectedAmount:config.selectedAmount,
        giftCertCategory:config.giftCertCategory,
        mParticleInfo:config.mParticleInfo
    });
    next();
});
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
 * Adds a gift certificate in basket
 */
server.post('AddToBasket', csrfProtection.validateAjaxRequest, server.middleware.https, function (req, res, next) {
    var CartModel = require('*/cartridge/models/cart');
    var formErrors = require('*/cartridge/scripts/formErrors');
    var giftCertForm = giftCertHelper.processAddToBasket(server.forms.getForm('giftcert'));
    var ProductLineItemsModel = require('*/cartridge/models/productLineItems');
    if (giftCertForm.valid) {
        var currentBasket = BasketMgr.getCurrentOrNewBasket();
        var giftCertificateLineItem = giftCertHelper.createGiftCert(currentBasket, giftCertForm.purchase, req);
        if (empty(giftCertificateLineItem)) {
            res.setStatusCode(500);
            res.json({
                success: false,
                errorMessage: Resource.msg('giftcert.server.error', 'forms', null)
            });
            return next();
        }
        Transaction.wrap(function() {
            basketCalculationHelpers.calculateTotals(currentBasket);
        });
        var quantityTotal = ProductLineItemsModel.getTotalQuantity(currentBasket.productLineItems);

        if (currentBasket.getGiftCertificateLineItems().size() > 0) {
            quantityTotal += currentBasket.getGiftCertificateLineItems().size()
        }
        var cartModel = new CartModel(currentBasket);
        resetGiftSessionData();
        res.setViewData({
            section: 'minibag'
        });
        res.render('checkout/cart/miniCart', cartModel);
    }else{
        res.json({
            fields: formErrors.getFormErrors(giftCertForm)
        });  
    }
    return next();
});    
/**
 * Rednerd the gift certificate form to edit an existing added certificate
 */
server.get('CheckBalance', server.middleware.https, function (req, res, next) {
    var GiftCertificateMgr = require('dw/order/GiftCertificateMgr');
    var StringUtils = require('dw/util/StringUtils');
    var Resource = require('dw/web/Resource');

    var gcCode = req.httpParameterMap.giftCertificateID.value;
    var giftCertificate = GiftCertificateMgr.getGiftCertificateByCode(gcCode);

    if (giftCertificate && giftCertificate.isEnabled()) {
        res.json({
            giftCertificate: {
                ID: giftCertificate.getGiftCertificateCode(),
                balance: StringUtils.formatMoney(giftCertificate.getBalance())
            }
        });
    } else {
        res.json({
            error: Resource.msg('billing.giftcertinvalid', 'giftcert', null)
        });
    }
    return next();
});

/*
 Controller for adding GIFT WRAP / GIFT MSG
 */
 server.post('SendThankyou', function (req, res, next) {
    var params = req.httpParameterMap;
	var message = params.thankYouMessage;
	var cardId = params.view;
	
	if(!empty(cardId)){
	    var EmailUtils = require('*/cartridge/scripts/utils/klaviyo/emailUtils');
	    var GiftCertificateMgr = require('dw/order/GiftCertificateMgr');
	    
	    var giftCertificate = GiftCertificateMgr.getGiftCertificateByMerchantID(cardId);
	    var emailResponse = EmailUtils.sendThankyouEmail(giftCertificate, message);
		
		res.json({
            status: true
        });
		} else{
		res.json({
            status: false
        });
	}
    next();
});

module.exports = server.exports();