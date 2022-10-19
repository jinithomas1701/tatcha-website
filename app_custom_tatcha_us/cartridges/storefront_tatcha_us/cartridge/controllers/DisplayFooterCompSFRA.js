'use strict';

var server = require('server');
var Cookie = require('dw/web/Cookie');

server.get('Show', server.middleware.https, function (req, res, next) {
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
        res.render('components/footer/footer_component', {
            extoleZoneName: !empty(extole_zone_name) ? extole_zone_name : '',
            klaviyoData: sendToDom,
            klaviyoDataTrack: klaviyoDataLayer,
        });
    } else {
        res.render('components/footer/footer_component', { extoleZoneName: !empty(extole_zone_name) ? extole_zone_name : '' });
    }
    next();
});

server.get('FooterSubscribe', server.middleware.https, function (req, res, next){
    var isUpdatedDesign = request.httpParameterMap.updateddesign ? request.httpParameterMap.updateddesign.booleanValue : false;
    if(isUpdatedDesign) {
        res.render('components/footer/footerSubscribeBs');
    } else {
        res.render('account/user/footer-subscribe');
    }
    next();
});

module.exports = server.exports();
