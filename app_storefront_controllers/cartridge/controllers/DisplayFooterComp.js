/**
* Description of the Controller and the logic it provides
*
* @module  controllers/DisplayFooterComp
*/

'use strict';

// HINT: do not put all require statements at the top of the file
// unless you really need them for all functions
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var Cookie = require('dw/web/Cookie');

/**
* Description of the function
*
* @return {String} The string 'myFunction'
*/
// var myFunction = function(){
//     return 'myFunction';
// }

/* Exports of the controller */
///**
// * @see {@link module:controllers/DisplayFooterComp~myFunction} */
//exports.MyFunction = myFunction;

function show() {
	var cookieName  = "dw_cookies_popup";
	var cookieValue = "1";
	var popupCookie = new  Cookie(cookieName, cookieValue);
	popupCookie.path = "/";
	popupCookie.maxAge = 31536000;
	popupCookie.httpOnly = true;
	popupCookie.secure = true;
	var extole_zone_name = request.httpParameterMap.extole_zone_name.stringValue;
	response.addHttpCookie(popupCookie);

	//RDMP-3452: Klaviyo_tag-RenderKlaviyo
	if(dw.system.Site.getCurrent().getCustomPreferenceValue('klaviyo_enabled')){
		var klaviyoUtils = require('*/cartridge/scripts/utils/klaviyo/klaviyoUtils');
		var klaviyoTags = require('*/cartridge/scripts/utils/klaviyo/klaviyoOnSiteTags.js').klaviyoOnSiteTags;
        var klaviyoDataLayer = klaviyoUtils.buildDataLayer();
		var sendToDom = klaviyoTags(klaviyoDataLayer);
		app.getView({
			extoleZoneName: !empty(extole_zone_name)?extole_zone_name:'',
			klaviyoDataTrack: klaviyoDataLayer,
			klaviyoData : sendToDom
		}).render('components/footer/footer_component');
	}else{
		app.getView({extoleZoneName: !empty(extole_zone_name)?extole_zone_name:''}).render('components/footer/footer_component');
	}

}
function footerSubscribe() {
	
	var isUpdatedDesign = request.httpParameterMap.updateddesign ? request.httpParameterMap.updateddesign.booleanValue : false;
	if(isUpdatedDesign) {
		app.getView().render('account/user/footer-subscribe-bs');
	} else {
		app.getView().render('account/user/footer-subscribe');
	}
}

exports.Show = guard.ensure(['get'], show);
exports.FooterSubscribe = guard.ensure(['get'], footerSubscribe);