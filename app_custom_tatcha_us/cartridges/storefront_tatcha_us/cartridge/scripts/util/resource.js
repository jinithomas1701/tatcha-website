/**
 * Resource helper
 *
 */
var Currency = require('dw/util/Currency');
var Site = require('dw/system/Site');
var ContentMgr = require('dw/content/ContentMgr');
var ProductAvailabilityModel = require('dw/catalog/ProductAvailabilityModel');

function ResourceHelper() {}
/**
 * Get the client-side constants
 * @param pageContext
 * @returns {Object} An objects key key-value pairs holding the constants
 */
ResourceHelper.getConstants = function(pageContext) {
    return {
        AVAIL_STATUS_IN_STOCK         : ProductAvailabilityModel.AVAILABILITY_STATUS_IN_STOCK,
        AVAIL_STATUS_PREORDER         : ProductAvailabilityModel.AVAILABILITY_STATUS_PREORDER,
        AVAIL_STATUS_BACKORDER         : ProductAvailabilityModel.AVAILABILITY_STATUS_BACKORDER,
        AVAIL_STATUS_NOT_AVAILABLE     : ProductAvailabilityModel.AVAILABILITY_STATUS_NOT_AVAILABLE
    };
}
/**
 * Get the client-side resources of a given page
 * @param pageContext
 * @returns {Object} An objects key key-value pairs holding the resources
 */
ResourceHelper.getResources = function(pageContext) {
    var Resource = require('dw/web/Resource');

    // application resources
    var resources = {
        // Common
        I_AGREE                           : Resource.msg('global.i_agree', 'locale', null),
        CLOSE                             : Resource.msg('global.close', 'locale', null),
        NO_THANKS                         : Resource.msg('global.nothanks', 'locale', null),
        OK                                : Resource.msg('global.ok', 'locale', null),
        ARE_YOU_HUMAN                     : Resource.msg('global.captcha.areyouhuman', 'locale', null),

        // Checkout
        SHIP_QualifiesFor                 : Resource.msg('shipment.qualifiesfor', 'checkout', null),
        CC_LOAD_ERROR                     : Resource.msg('billing.creditcardloaderror', 'checkout', null),
        COULD_NOT_SAVE_ADDRESS            : Resource.msg('multishippingaddresses.couldnotsaveaddress', 'checkout', null),

        // Registry resources
        REG_ADDR_ERROR                    : Resource.msg('global.couldntloadaddress', 'locale', null),

         // bonus products messages
        BONUS_PRODUCT                     : Resource.msg('product.bonusproduct', 'product', null),
        BONUS_PRODUCTS                    : Resource.msg('product.bonusproducts', 'product', null),
        SELECT_BONUS_PRODUCTS             : Resource.msg('product.selectbonusproducts', 'product', null),
        SELECT_BONUS_PRODUCT              : Resource.msg('product.selectbonusproduct', 'product', null),
        BONUS_PRODUCT_MAX                 : Resource.msg('product.bonusproductsmax', 'product', null),
        BONUS_PRODUCT_TOOMANY             : Resource.msg('product.bonusproductstoomany', 'product', null),
        SIMPLE_SEARCH                     : Resource.msg('simplesearch.searchtext', 'search', null),
        SUBSCRIBE_EMAIL_DEFAULT           : Resource.msg('subscribe.email.default', 'forms', 'Email Address'),

        CURRENCY_SYMBOL                   : Currency.getCurrency(Site.current.getDefaultCurrency()).symbol,
        MISSINGVAL                        : Resource.msg('global.missingval', 'locale', null),
        SERVER_ERROR                      : Resource.msg('global.servererror', 'locale', null),
        MISSING_LIB                       : Resource.msg('global.missinglib', 'locale', null),
        BAD_RESPONSE                      : Resource.msg('global.badresponse', 'locale', null),
        INVALID_PHONE                     : Resource.msg('global.invalidphone', 'locale', null),
        INVALID_POSTALCODE                : Resource.msg('global.invalidpostalcode', 'locale', null),
        REMOVE                            : Resource.msg('global.remove', 'locale', null),
        QTY                               : Resource.msg('global.qty', 'locale', null),
        EMPTY_IMG_ALT                     : Resource.msg('global.remove', 'locale', null),
        COMPARE_BUTTON_LABEL              : Resource.msg('productcomparewidget.compareitemsbutton', 'search', null),
        COMPARE_CONFIRMATION              : Resource.msg('productcomparewidget.maxproducts', 'search', null),
        COMPARE_REMOVE_FAIL               : Resource.msg('productcomparewidget.removefail', 'search', null),
        COMPARE_ADD_FAIL                  : Resource.msg('productcomparewidget.addfail', 'search', null),
        ADD_TO_CART_FAIL                  : Resource.msg('cart.unableToAdd', 'checkout', null),
        REGISTRY_SEARCH_ADVANCED_CLOSE    : Resource.msg('account.giftregistry.closeadvanced', 'account', null),
        GIFT_CERT_INVALID                 : Resource.msg('billing.giftcertinvalid', 'checkout', null),
        GIFT_CERT_BALANCE                 : Resource.msg('billing.giftcertbalancemsg', 'checkout', null),
        GIFT_CERT_AMOUNT_INVALID          : Resource.msg('giftcert.amountvalueerror', 'forms', null),
        GIFT_CERT_MISSING                 : Resource.msg('billing.giftcertidmissing', 'checkout', null),
        INVALID_OWNER                     : Resource.msg('billing.ownerparseerror', 'checkout', null),
        COUPON_CODE_MISSING               : Resource.msg('cart.COUPON_CODE_MISSING', 'checkout',  null),
        COOKIES_DISABLED                  : Resource.msg('global.browsertoolscheck.cookies', 'locale', null),
        BML_AGREE_TO_TERMS                : Resource.msg('bml.termserror', 'forms', null),
        CHAR_LIMIT_MSG                    : Resource.msg('character.limit', 'forms', null),
        CONFIRM_DELETE                    : Resource.msg('confirm.delete', 'forms', null),
        TITLE_GIFTREGISTRY                : Resource.msg('title.giftregistry', 'forms', null),
        TITLE_ADDRESS                     : Resource.msg('title.address', 'forms', null),
        TITLE_CREDITCARD                  : Resource.msg('title.creditcard', 'forms', null),
        SERVER_CONNECTION_ERROR           : Resource.msg('global.serverconnection', 'locale', 'Server connection failed!'),
        IN_STOCK_DATE                     : Resource.msg('global.inStockDate', 'locale', null),
        ITEM_STATUS_NOTAVAILABLE          : Resource.msg('global.allnotavailable', 'locale', null),
        INIFINITESCROLL                   : Resource.msg('paginginformation.infinite-scroll', 'search', null),
        STORE_NEAR_YOU                    : Resource.msg('storelist.lightbox.whatsavailable', 'storepickup', 'What\'s available at a store near you'),
        SELECT_STORE                      : Resource.msg('storelist.lightbox.selectstore', 'storepickup', null),
        SELECTED_STORE                    : Resource.msg('storelist.lightbox.selectedstore', 'storepickup', null),
        PREFERRED_STORE                   : Resource.msg('storelist.lightbox.preferredstore', 'storepickup', null),
        SET_PREFERRED_STORE               : Resource.msg('storelist.lightbox.setpreferredstore', 'storepickup', null),
        ENTER_ZIP                         : Resource.msg('storelist.lightbox.enterzip', 'storepickup', null),
        INVALID_ZIP                       : Resource.msg('storelist.lightbox.invalidpostalcode', 'storepickup', null),
        SEARCH                            : Resource.msg('global.search', 'locale', null),
        CHANGE_LOCATION                   : Resource.msg('storelist.lightbox.changelocation', 'storepickup', null),
        CONTINUE_WITH_STORE               : Resource.msg('storelist.lightbox.continuewithstore', 'storepickup', null),
        CONTINUE                          : Resource.msg('global.continue', 'locale', null),
        SEE_MORE                          : Resource.msg('storelist.lightbox.seemore', 'storepickup', null),
        SEE_LESS                          : Resource.msg('storelist.lightbox.seeless', 'storepickup', null),
        QUICK_VIEW                        : Resource.msg('product.quickview', 'product', null),
        QUICK_VIEW_POPUP                  : Resource.msg('product.quickview.popup', 'product', null),
        TLS_WARNING                       : Resource.msg('global.browsertoolscheck.tls', 'locale', null),

        // Validation messages
        VALIDATE_REQUIRED                 : Resource.msg('validate.required', 'forms', null),
        VALIDATE_REMOTE                   : Resource.msg('validate.remote', 'forms', null),
        VALIDATE_EMAIL                    : Resource.msg('validate.email', 'forms', null),
        VALIDATE_CREDITCARDOWNERNAME      : Resource.msg('validate.creditcard.creditcardownername', 'forms', null),
        VALIDATE_URL                      : Resource.msg('validate.url', 'forms', null),
        VALIDATE_DATE                     : Resource.msg('validate.date', 'forms', null),
        VALIDATE_DATEISO                  : Resource.msg('validate.dateISO', 'forms', null),
        VALIDATE_NUMBER                   : Resource.msg('validate.number', 'forms', null),
        VALIDATE_DIGITS                   : Resource.msg('validate.digits', 'forms', null),
        VALIDATE_CREDITCARD               : Resource.msg('validate.creditcard', 'forms', null),
        VALIDATE_EQUALTO                  : Resource.msg('validate.equalTo', 'forms', null),
        VALIDATE_MAXLENGTH                : Resource.msg('validate.maxlength', 'forms', null),
        VALIDATE_MINLENGTH                : Resource.msg('validate.minlength', 'forms', null),
        VALIDATE_RANGELENGTH              : Resource.msg('validate.rangelength', 'forms', null),
        VALIDATE_RANGE                    : Resource.msg('validate.range', 'forms', null),
        VALIDATE_MAX                      : Resource.msg('validate.max', 'forms', null),
        VALIDATE_MIN                      : Resource.msg('validate.min', 'forms', null),
        VALIDATE_INTERNATIONAL_ADDRESS    : Resource.msg('validate.foreignCharacters', 'forms', null),
        VALIDATE_PASSWORD				  : Resource.msg('validate.password', 'forms', null),
        VALIDATE_CUSTOMER_NAME            : Resource.msg('validate.symbolandnumbers', 'forms', null)
    };

    // additional resources
    resources[ProductAvailabilityModel.AVAILABILITY_STATUS_IN_STOCK] = Resource.msg('global.instock', 'locale', null);
    resources["QTY_" + ProductAvailabilityModel.AVAILABILITY_STATUS_IN_STOCK] = Resource.msg('global.quantityinstock', 'locale', null);
    resources[ProductAvailabilityModel.AVAILABILITY_STATUS_PREORDER] = Resource.msg('global.allpreorder', 'locale', null);
    resources["QTY_" + ProductAvailabilityModel.AVAILABILITY_STATUS_PREORDER] = Resource.msg('global.quantitypreorder', 'locale', null);
    resources["REMAIN_" + ProductAvailabilityModel.AVAILABILITY_STATUS_PREORDER] = Resource.msg('global.remainingpreorder', 'locale', null);
    resources[ProductAvailabilityModel.AVAILABILITY_STATUS_BACKORDER] = Resource.msg('global.allbackorder', 'locale', null);
    resources["QTY_" + ProductAvailabilityModel.AVAILABILITY_STATUS_BACKORDER] = Resource.msg('global.quantitybackorder', 'locale', null);
    resources["REMAIN_" + ProductAvailabilityModel.AVAILABILITY_STATUS_BACKORDER] = Resource.msg('global.remainingbackorder', 'locale', null);
    resources[ProductAvailabilityModel.AVAILABILITY_STATUS_NOT_AVAILABLE] = Resource.msg('global.allnotavailable', 'locale', null);
    resources["REMAIN_" + ProductAvailabilityModel.AVAILABILITY_STATUS_NOT_AVAILABLE] = Resource.msg('global.remainingnotavailable', 'locale', null);

    return resources;
}

/**
 * Get the client-side URLs of a given page
 * @returns {Object} An objects key key-value pairs holding the URLs
 */
ResourceHelper.getUrls = function(pageContext) {
    var URLUtils = require('dw/web/URLUtils');
    var Resource = require('dw/web/Resource');

    var UseController = dw.system.Site.current.getCustomPreferenceValue('OsfSorUseController');

    // application urls
    var urls =  {
        appResources                : URLUtils.url('Resources-Load').toString(),
        pageInclude                 : URLUtils.url('Page-Include').toString(),
        continueUrl                 : request.isHttpSecure() ? (URLUtils.httpsContinue() ? URLUtils.httpsContinue().toString() : '') : (URLUtils.httpContinue() ? URLUtils.httpContinue().toString() : ''),
        staticPath                  : URLUtils.staticURL("/").toString(),
        addGiftCert                 : URLUtils.url('GiftCert-Purchase').toString(),
        minicartGC                  : URLUtils.url('GiftCert-ShowMiniCart').toString(),
        addProduct                  : URLUtils.url('Cart-AddProduct').toString(),
        minicart                    : URLUtils.url('Cart-MiniCart').toString(),
        cartShow                    : URLUtils.url('Cart-Show').toString(),
        giftRegAdd                  : URLUtils.https('Address-GetAddressDetails', 'addressID', '').toString(),
        paymentsList                : URLUtils.https('BraintreePayments-List').toString(),
        addressesList               : URLUtils.https('Address-List').toString(),
        deleteAddress               : URLUtils.url('Address-Delete').toString(),
        getProductUrl               : URLUtils.url('Product-Show').toString(),
        getBonusProducts            : URLUtils.url('Product-GetBonusProducts').toString(),
        addBonusProduct             : URLUtils.url('Cart-AddBonusProduct').toString(),
        getSetItem                  : URLUtils.url('Product-GetSetItem').toString(),
        productDetail               : URLUtils.url('Product-Detail').toString(),
        getAvailability             : URLUtils.url('Product-GetAvailability').toString(),
        removeImg                   : URLUtils.staticURL('/images/icon_remove.gif').toString(),
        searchsuggest               : URLUtils.url('SearchServices-GetSuggestions').toString(),
        productNav                  : URLUtils.url('Product-Productnav').toString(),
        summaryRefreshURL           : URLUtils.url('COBilling-UpdateSummary').toString(),
        billingSelectCC             : URLUtils.https('COBilling-SelectCreditCard').toString(),
        updateAddressDetails        : URLUtils.https('COShipping-UpdateAddressDetails').toString(),
        updateAddressDetailsBilling : URLUtils.https('COBilling-UpdateAddressDetails').toString(),
        shippingMethodsJSON         : URLUtils.https('COShipping-GetApplicableShippingMethodsJSON').toString(),
        shippingMethodsList         : URLUtils.https('COShipping-UpdateShippingMethodList').toString(),
        selectShippingMethodsList   : URLUtils.https('COShipping-SelectShippingMethod').toString(),
        resetPaymentForms           : URLUtils.url('COBilling-ResetPaymentForms').toString(),
        compareEmptyImage           : URLUtils.staticURL('/images/comparewidgetempty.png').toString(),
        giftCardCheckBalance        : URLUtils.https('COBilling-GetGiftCertificateBalance').toString(),
        redeemGiftCert              : URLUtils.https('COBilling-RedeemGiftCertificateJson').toString(),
        addCoupon                   : URLUtils.https('Cart-AddCouponJson').toString(),
        removeCoupon				: URLUtils.https('Cart-RemoveCoupon').toString(),
        summaryUpdate				: URLUtils.https('Cart-SummaryUpdate').toString(),
        billing                     : URLUtils.url('COBilling-Start').toString(),
        setSessionCurrency          : URLUtils.url('Currency-SetSessionCurrency').toString(),
        addEditAddress              : URLUtils.url('COShippingMultiple-AddEditAddressJSON').toString(),
        cookieHint                  : URLUtils.url('Page-Show', 'cid', 'cookie_hint').toString(),
        rateLimiterReset            : URLUtils.url('RateLimiter-HideCaptcha').toString(),
        csrffailed                  : URLUtils.url('CSRF-Failed').toString(),
        loginFromCartPage			: URLUtils.url((UseController ? 'SmartOrderRefillController' : 'SmartOrderRefill') + '-RequireLogin').toString(),
		viewOrder					: URLUtils.url((UseController ? 'SmartOrderRefillController' : 'SmartOrderRefill') + '-ViewOROrder').toString(),
		addressChange				: URLUtils.url((UseController ? 'SmartOrderRefillController' : 'SmartOrderRefill') + '-ChangeAddress').toString(),
		viewSubscription			: URLUtils.url((UseController ? 'SmartOrderRefillController' : 'SmartOrderRefill') + '-ViewORSubscription').toString(),
		manageOrders				: URLUtils.url((UseController ? 'SmartOrderRefillController' : 'SmartOrderRefill') + '-Manage').toString(),
		changeProducts				: URLUtils.url((UseController ? 'SmartOrderRefillController' : 'SmartOrderRefill') + '-ChangeAllSubscriptionProducts').toString(),
		updateSubscriptionProduct 	: URLUtils.url((UseController ? 'SmartOrderRefillController' : 'SmartOrderRefill') + '-UpdateSubscriptionProduct').toString(),
		closeBanner                 : URLUtils.url('Tatcha-CloseBanner').toString(),
		addGiftBuilderProducts      : URLUtils.url('Cart-AddGiftBuilderProducts').toString(),
		applyGiftBuilderProducts    : URLUtils.url('GiftBuilder-GetSelectedProducts').toString(),
		compareAdd					: URLUtils.url('Compare-AddProduct').toString(),
		compareRemove				: URLUtils.url('Compare-RemoveProduct').toString(),
		compareShow					: URLUtils.url('Compare-Show').toString(),
        addGiftSetProducts			: URLUtils.url('GiftSet-AddItemsToCart').toString(),
        addUpsellProducts			: URLUtils.url('Cart-AddUpsellProducts').toString(),
        minicartShow				: URLUtils.url('CartSFRA-MiniCartShow').toString(),
        minicartDeleteProduct		: URLUtils.url('Cart-RemoveProductLineItem').toString(),
        minicartProductQtyUpdate	: URLUtils.url('MiniCart-UpdateProductQty').toString(),
        minicartCreateProduct		: URLUtils.url('MiniCart-CreateProduct').toString(),
        minicartDeleteGiftCert      : URLUtils.url('MiniCart-RemoveGiftCert').toString(),
        compareUpdate               : URLUtils.url('Compare-UpdateProduct').toString(),
        minicartAddCoupon      		: URLUtils.url('MiniCart-AddCoupon').toString(),
        minicartRemoveCoupon      	: URLUtils.url('MiniCart-RemoveCoupon').toString(),
        getBonusProductsMiniCart    : URLUtils.url('Cart-ShowBonusProducts').toString(),
        verifyAddress				: URLUtils.url('Loqate-VerifyAddress').toString(),
        retriveProducts				: URLUtils.url('GiftFinder-RetriveProducts').toString(),
		facebookEventTrigger		: URLUtils.url('FacebookPixel-FacebookEventTrigger').toString(),
		compareWidgetUpdate			: URLUtils.url('Compare-CompareWidgetUpdate').toString(),
        addExtendedCartProduct      : URLUtils.url('ExtendedCart-AddMultipleProductsV2').toString()
    };
    return urls;
}
/**
 * Get the client-side preferences of a given page
 * @returns {Object} An objects key key-value pairs holding the preferences
 */
ResourceHelper.getPreferences = function(pageContext) {
    var cookieHintAsset = ContentMgr.getContent('cookie_hint');
    return {
        LISTING_INFINITE_SCROLL: (Site.getCurrent().getCustomPreferenceValue('enableInfiniteScroll') ? true : false),
        LISTING_REFINE_SORT: true,
        STORE_PICKUP: Site.getCurrent().getCustomPreferenceValue('enableStorePickUp'),
        COOKIE_HINT: (cookieHintAsset && cookieHintAsset.online) || false,
        CHECK_TLS: Site.getCurrent().getCustomPreferenceValue('checkTLS'),
        GOOGLE_API_KEY: Site.getCurrent().getCustomPreferenceValue('googleMapAPI'),
        AFTERPAY_PORTAL : Site.getCurrent().getCustomPreferenceValue('apJavascriptURL'),
        MPARTICLE_ENABLED : Site.getCurrent().getCustomPreferenceValue('mParticleEnabled'),
        RSC_ADC_ENABLED : Site.getCurrent().getCustomPreferenceValue('EnableRSCADC'),
        RSC_ADC_URL : Site.getCurrent().getCustomPreferenceValue('RSCADCUrl'),
        RSC_CONFIG : Site.getCurrent().getCustomPreferenceValue('RSCConfig')
    };
}
/**
 * Get the client-side preferences of a given page
 * @returns {Object} An objects key key-value pairs holding the preferences
 */
ResourceHelper.getSessionAttributes = function(pageContext) {
    return {
        SHOW_CAPTCHA: session.privacy.showCaptcha
    };
}
/**
 * Get the client-side user settings
 * @returns {Object} An objects key key-value pairs holding the settings
 */
ResourceHelper.getUserSettings = function(pageContext) {
    var ProductAvailabilityModel = require('dw/catalog/ProductAvailabilityModel');
    return {
        zip: session.custom.zipcode == "null" ? null : session.custom.zipcode,
        storeId: session.custom.storeId == "null" ? null : session.custom.storeId
    };
}
