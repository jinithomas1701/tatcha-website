'use strict';

/**
 * Controller that  used to set Promocode to session 
 *
 * @module controllers/Promo
 */

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var URLUtils = require('dw/web/URLUtils');

function setPromo() {

	var params = request.httpParameterMap;
	var redirectURL = params.redirectURL.stringValue;	
	var promoCode = params.promoCode.stringValue;	
	
	//Empty parameter checks 
	if(empty(redirectURL) || empty(promoCode)) {
		response.renderJSON({
			"response" : {
				"status":"error",    
				"error" : [
					{
						"msg" : "Missing Parameters"
					}
				]
			}
		});
	}
	
	// Check if coupon is valid	
	var coupon = '';
	var isValid = true;
	try {
		coupon = dw.campaign.CouponMgr.getCouponByCode(promoCode);
		if(!coupon.isEnabled()) {
			isValid = false;
		}
	} catch(err){
		session.custom.headerPromo = "";
	}
	
	if (typeof(coupon) != 'undefined' && coupon !='' && isValid) {
		session.custom.headerPromo = promoCode;
	} else {
		session.custom.headerPromo = "";
	}
	
	response.redirect(redirectURL);
	return;

}

function displayPromo() {
	if (typeof (session.custom.userType) != 'undefined' && !empty(session.custom.userType)) {
		app.getView().render('components/header/personalization/personalization_data_layer');
	}
	if (typeof (session.custom.headerPromo) != 'undefined' && !empty(session.custom.headerPromo)) {
		app.getView().render('components/header/header-promo-session');
	}
}

function getPromoTile() {
	var params = request.httpParameterMap;
	var isFirstItem = params.isFirstItem.stringValue;
	var gridPage = params.gridPage.stringValue;
	var index = params.index.stringValue;
	var categoryID = params.categoryID.stringValue;

	if(session.custom.hasPromoContent && session.custom.hasPromoContent !== null) {
		session.custom.lastPromoCategoryID = categoryID;
		session.custom.hasPromoContent = null;
		delete session.custom.hasPromoContent;
	}
	var promoSessionData = session.custom.catPromoBannerAssetsArray;
	if((session.custom.lastPromoCategoryID && session.custom.lastPromoCategoryID !== null) && (session.custom.lastPromoCategoryID !== categoryID)) {
		session.custom.catPromoBannerAssetsArray = null;
		promoSessionData = null;
		delete session.custom.catPromoBannerAssetsArray;
	}

	app.getView({
		isFirstItem: params.isFirstItem,
		gridPage: params.gridPage,
		index: params.index,
		initialPosition: params.initialPosition,
		promoSessionData: promoSessionData

	}).render('product/components/categorypagepromo_new');
}

/*
* Module exports
*/

/*
* Web exposed methods
*/
/**
 * Registers the 'start checkout' event for A/B testing.
 * You must use GET to access the function via URL.
 * @see module:controllers/ABTestEvent~startCheckout
 */
exports.SetPromo = guard.ensure(['get'], setPromo);
exports.DisplayPromo = guard.ensure(['get'], displayPromo);
exports.GetPromoTile = guard.ensure(['get'], getPromoTile);
