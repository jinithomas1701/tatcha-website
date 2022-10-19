'use strict';

/**
 * Checkout Related Events
 */

$( document ).ready(function() {

    /*
	 * Confirmation page: trigger an event if account,
	 * create section is visible when confirmation page loads
	 */
    if(location.href.indexOf('/checkout/confirmation') > -1) {
        if($('.checkout-registration').is(':visible')) {
            var data = {};
            data.actionType = 'message display';
            mPartcleLogEvent('Checkout Create Account Action', data, 'Checkout');
        }
    }
})

/**
 * Cart Events
 */

// mParticle Product Add to cart
$(document).on('click' , 'button[data-product-info], a[data-product-info]',function(){
    addToCart(this);
});

/**
 * Cart - Remove product
 */
$(document).on('click' , 'div.delete-product',function(){
    var productInfoList = [];
    var productInfo = $(this).closest('.bag-product-item').data('product-info');
    var quantity =  $(this).closest('.bag-product-item').find('.qty-field').val();
    var position =  $(this).closest('.bag-product-item').data('index');
    if(productInfo){
        productInfo.quantity = (quantity)?quantity:1;
        productInfo.position = (position)?position:1;
        productInfo.brand = 'Tatcha';
        productInfoList.push(productInfo);
    }
    var customAttributes = getCustomAttributes($(this),'remove_from_cart');
    mParticleProductAction(productInfoList,customAttributes,'remove_from_cart');
});

//Cart: mParticle Product Click
$(document).on('click' , '.pairs-with-flex .pairs-with-name , .pairs-with-btn' ,function(){
   productClick(this);
});

/**
 * Cart: Samples open
 */
$(document).on('click' , '.add-sample-btn',function(){
    var data = {};
    data.actionType = 'Click Add Sample';
    (window.location.pathname.indexOf('/bag') > -1) ? data.pageSource = 'Bag' : data.pageSource = '';
    data.productID = '';
    mPartcleLogEvent('Sample Action', data, 'Samples');
})

/**
 * Cart: Samples add button click
 */
$(document).on('click' , '#bonusModal .select-bonus-item',function(){
    var data = {};
    $(this).hasClass('active-btn') ?  data.actionType = 'Remove Sample' : data.actionType = 'Add Sample';
    (window.location.pathname.indexOf('/bag') > -1) ? data.pageSource = 'Bag' : data.pageSource = '';
    data.productID = $(this).data('pid');
    mPartcleLogEvent('Sample Action', data, 'Samples');
})

/**
 * Cart: Samples submit click
 */
$(document).on('click' , '#submit-sample-items',function(){
    var data = {};
    data.actionType = 'Submit Selection';
    (window.location.pathname.indexOf('/bag') > -1) ? data.pageSource = 'Bag' : data.pageSource = '';
    data.productID = '';
    mPartcleLogEvent('Sample Action', data, 'Samples');
});

/*
* Checkout bag page step trigger
*/
$(document).on('click', '.cart-checkout-btn, #cart-summary .checkout-btn', function() {
    var data = {};
    data.stepName = 'bag';
    mPartcleLogEvent('Complete Checkout Step', data, 'Checkout', mParticle.EventType.Navigation);
});

/**
 * Bag - Standard
 */
$(document).on('click', '.bag-page .checkout-summary .cart-checkout-btn, #cart-summary .checkout-btn', function() {
    var data = {};
    data.containerSource = 'bag';
    data.paymentType = 'Standard';
    data.checkoutInitiated = true;
    var bagProducts = getbagProductsList();
    mParticleLogProduct(bagProducts, data, 'Checkout');
})

/**
 * Bag - AfterPay
 */
$(document).on('click', '.bag-page .afterpay-express-btn', function() {
    var data = {};
    if(window.location.href.indexOf('/bag') > -1) {
        data.containerSource = 'bag';
    }
    data.paymentType = 'AfterPay';
    data.checkoutInitiated = true;
    var bagProducts = getbagProductsList();
    mParticleLogProduct(bagProducts, data, 'Checkout');
})

/**
 * Bag - Apple Pay
 */
$(document).on('click', '.bag-page .braintree-cart-apple-button', function() {
    var data = {};
    if(window.location.href.indexOf('/bag') > -1) {
        data.containerSource = 'bag';
    }
    data.checkoutInitiated = true;
    data.paymentType = 'Apple Pay';
    var bagProducts = getbagProductsList();
    mParticleLogProduct(bagProducts, data, 'Checkout');
})

// mParticle Product Wish List Click
$(document).on('click' , '.btn-wishlist.wishlist-additem , .wishlist-login-btn.btn-wishlist' ,function(){
    var productObj;
    var position;
    var productInfoList = [];
    if($(this).parent().closest('.bag-product-item').data('product-info')){
        productObj = $(this).parent().closest('.bag-product-item');
        position = $(this).closest('.bag-product-item').data('index');
    }else{
        productObj = $(this).closest("form").find("[data-product-info]");
        position = $(this).closest('.product-list-col').data('index');
    }
    if(!productObj.length) {
        productObj = $(this).closest(".product-list-unit-v2").find("[data-product-info]");
    }

    if(productObj.length > 0) {
        var productInfo = productObj.data('product-info');
        if(productInfo){
            productInfo.quantity = 1;
            productInfo.position = (position)?position:1;
            productInfo.brand = 'Tatcha';
            productInfoList.push(productInfo);
        }
        var customAttributes = getCustomAttributes($(this),'product_wishlist_click');
        mParticleProductAction(productInfoList,customAttributes,'product_wishlist_click');
    }
});

/** Paypal */
window.mParticleCheckoutInitiated = function(paymentType, page) {
    if(paymentType === 'paypal') {
        var data = {};

        if(window.location.href.indexOf('/bag') > -1) {
            data.containerSource = 'bag';
        }
        data.paymentType = 'PayPal';
        data.checkoutInitiated = true;
        var bagProducts = getbagProductsList();
        mParticleLogProduct(bagProducts, data, 'Checkout');
    }
}

/**
 * Checkout Events
 */

/**
 * Checkout shipping completed trigger
 */
/*
$(document).on('click', '.shipping-address .next-step-cta', function(e) {
    if(!$('#addressSuggestionModal').is(':visible')) {
        var dataObj = {};
        dataObj.stepName = 'shipping';
        mPartcleLogEvent('Complete Checkout Step', dataObj, 'Checkout', mParticle.EventType.Navigation);
    }
});
*/

/**
 * Checkout payment step trigger
 */
$(document).on('click', '.payment-button .next-step-cta', function() {
    var data = {};
    data.stepName = 'payment';
    mPartcleLogEvent('Complete Checkout Step', data, 'Checkout', mParticle.EventType.Navigation);
})

/**
 * Checkout place order step trigger
 */
$(document).on('click', '.review-summary .next-step-cta', function() {
    var data = {};
    data.stepName = 'review';
    mPartcleLogEvent('Complete Checkout Step', data, 'Checkout', mParticle.EventType.Navigation);
})

/**
 * Checkout login click
 */
$(document).on('click', '.checkout-section .js-login-customer', function() {
    var data = {};
    data.pageSource = 'checkout page';
    data.identityOption = 'login';
    mPartcleLogEvent('Checkout Identity Click', data, 'Checkout');
});

/*
* Checkout - Giftwrap add link click trigger
*/
$(document).on('click', '.hasGiftMessage', function() {
    var data = {};
    mPartcleLogEvent('Gift Options Modal Click', data, 'Gift Options');
});

/*
* Checkout - Giftwrap save
* values send :- giftwrapSelected, giftMessage
*/
$(document).on('click', '#giftWrapAndMessage .gift-btn, #giftmsg-form .modal-tatcha-gift-message-save', function() {
    var data = {};
    var giftwrapSelected = $('.gift-toggle').is(':checked');
    var giftMessage = $('.giftmessage').val();
    data.giftwrapSelected = giftwrapSelected;
    data.giftMessage = giftMessage;
    mPartcleLogEvent('Gift Options Selected', data, 'Checkout');
});
/**
 * Checkout Promo field Reveal
 */
$(document).on('click', '.promocode-container .promo-code-form', function() {
    var data = {};

    var actionType = 'reveal';
    var promoCode = '';
    var pageSource = 'checkout summary';

    data.actionType = actionType;
    data.promoCode = promoCode;
    data.pageSource = pageSource;

    mPartcleLogEvent('Promo Code Action', data, 'Checkout');
})

/*
* Cart, Checkout - PromoCode Apply
* values send :- actionType, promoCode, pageSource
*/
$(document).on('click', '.bag-promo-container .promo-button, .order-summary .promo-button', function() {
    var data = {};

    var actionType = 'add';
    var promoCode = '';
    var pageSource = '';

    if(location.href.indexOf('/bag') > -1) {
        pageSource = 'bag';
        promoCode = $('.bag-promo-container #couponCode').val();
    } else if(location.href.indexOf('/checkout') > -1) {
        pageSource = 'checkout summary';
        promoCode = $('.promocode-container #promocode').val();
    }

    data.actionType = actionType;
    data.promoCode = promoCode;
    data.pageSource = pageSource;

    mPartcleLogEvent('Promo Code Action', data, 'Checkout');
});

/*
* Cart, Checkout - PromoCode Remove
* values send :- actionType, promoCode, pageSource
*/
$(document).on('click', '.order-summary .promo-close, .checkout-promo-code .promo-remove', function() {
    var data = {};

    var actionType = 'remove';
    var promoCode = '';
    var pageSource = '';

    if(location.href.indexOf('/bag') > -1) {
        pageSource = 'bag';
        promoCode = $('input[name="dwfrm_cart_couponCode"]').val();
    } else if(location.href.indexOf('/checkout') > -1) {
        pageSource = 'checkout summary';
        promoCode = $('.promocode-applied input').val();
    }

    data.actionType = actionType;
    data.promoCode = promoCode;
    data.pageSource = pageSource;

    mPartcleLogEvent('Promo Code Action', data, 'Checkout');
});

/*
*
* Checkot Confirmation: account creation trigger
*/
$(document).on('click', '.checkout-registration button', function(e) {
    e.preventDefault();
    var data = {};
    data.actionType = 'account create submit';
    mPartcleLogEvent('Checkout Create Account Action', data, 'Checkout');
    $(this).closest('form').submit();
});

/*
* Checkout confirmation page Link click : Cancel, Refund, Shipping, FAQs, Contact US
*/
$(document).on('click', '.cancel-links a, .order-questions a', function() {
    var data = {};
    data.linkType = 'main body';
    data.linkAddress = $(this).attr('href');
    data.linkText = $(this).text();
    mPartcleLogEvent('Confirmation Page Link Click', data, 'Checkout');
});

/**
 * Checkout: Login Modal, Login Click Event
 */
$(document).on('click' , '#loginModal button , #loginModal a, .login-dropdown',function(){
    if($(this).hasClass('close')){
        return;
    }
    var linkText;
    if($(this).hasClass('btn-facebook')){
        linkText = 'Continue With Facebook'
    }else if($(this).hasClass('create-account-link')){
        linkText = 'Create Account';
    }else if($(this)[0].id == 'login-btn' || $(this).hasClass('login-dropdown')){
        linkText = 'Login';
    }else if($(this)[0].innerHTML == 'Privacy Policy'){
        linkText = 'Privacy'
    }else if($(this)[0].innerHTML == 'Terms of Service'){
        linkText = 'TOS'
    }

    /*if(!linkText) {
        linkText = 'Login';
    }*/

    mParticleLoginModalClick(linkText);
});


/**
 * mParticle - Rotating banner previous button click
 */

$(document).on('click','.rotating-promo-carousel .flickity-prev-next-button.previous',function(){
    mParticleRotatingBannerAction("click arrow","left");
})
//mParticle - Rotating banner next button click
$(document).on('click','.rotating-promo-carousel .flickity-prev-next-button.next',function(){
    mParticleRotatingBannerAction("click arrow","right");
})
//mParticle - Rotating banner text click
$(document).on('click','.rotating-promo-carousel .is-selected .rotating-banner-link',function(){
    mParticleRotatingBannerAction("click text");
})
//mParticle - Rotating banner se all link click
$(document).on('click','.seeall-link',function(){
    mParticleRotatingBannerAction("click see all");
})


/**
 * Rotating promo banner actions
 * @param action
 * @param direction
 */
function mParticleRotatingBannerAction(action,direction){
    var data = {
        'actionType':action,
        'pageSource':findSource(),
        'cellHeading':$('.rotating-promo-carousel .is-selected .rotating-banner-link').text()
    }
    if(direction){
        data['clickDirection'] = direction;
    }


    if(window.location.search) {
        var urlParams = new URLSearchParams(window.location.search);
        if(urlParams.get('utm_source')){
            data.utm_source = urlParams.get('utm_source');
        }
        if(urlParams.get('utm_campaign')){
            data.utm_campaign = urlParams.get('utm_campaign');
        }
        if(urlParams.get('utm_medium')){
            data.utm_medium = urlParams.get('utm_medium');
        }
    }
    data.deviceType = isMobile() ? 'mobile':'desktop';

    mParticle.logEvent(
        'Rotating Banner Action',
        mParticle.EventType.Other,data,{
            'Google.Category': 'Promo Banners'
        });
    if (SitePreferences.RSC_ADC_ENABLED) {
        adc.logRSCCustomEvent(
            'Rotating Banner Action',
            mParticle.EventType.Other, data);
    }
}

// Function returns page source for rotating banner
function findSource(){
    if(window.location.pathname.indexOf("/category") > -1){
        return "category page";
    }else if(window.location.pathname.indexOf("/product") > -1){
        return "p-page";
    }else if(window.location.pathname.indexOf("/confirmation") > -1){
        return "confirmation";
    }else if(window.location.pathname === "/"){
        return "home page";
    }
}

/**
 * Add to cart event
 * @param prodElement
 */
function addToCart(prodElement) {
    var productInfoList = [];
    var productInfo = $(prodElement).data('product-info');
    var quantity =  $(prodElement).closest('form').find('select[name="Quantity"]').val();
    var position =  $(prodElement).closest('.product-list-col').data('index') || $(prodElement).closest('.carousel-cell').data('index') + 1;
    if(productInfo){
        productInfo.position = (position)?position:1;
        productInfo.quantity = (quantity)?quantity:1;
        productInfo.brand = 'Tatcha';
        productInfoList.push(productInfo);
    }
    var customAttributes = getCustomAttributes($(prodElement),'add_to_cart');
    mParticleProductAction(productInfoList,customAttributes,'add_to_cart');
}

/*
* Generic methos for firing mParticle Log Event
* @param event - Event Name
* @param data - The data to be send along with the event
* @param category - Event category
*/
function mPartcleLogEvent(event, data, category, eventCategory) {
    var eCategory = eventCategory ? eventCategory : mParticle.EventType.Other;

    if(window.location.search && data) {
        var urlParams = new URLSearchParams(window.location.search);
        if(urlParams.get('utm_source')){
            data.utm_source = urlParams.get('utm_source');
        }
        if(urlParams.get('utm_campaign')){
            data.utm_campaign = urlParams.get('utm_campaign');
        }
        if(urlParams.get('utm_medium')){
            data.utm_medium = urlParams.get('utm_medium');
        }

    }

    if(data && category != 'Gift Finder') {
        data.deviceType = isMobile() ? 'mobile':'desktop';
    }



    if(category && category!=null){
        mParticle.logEvent(
            event,
            eCategory,
            data,
            {
                'Google.Category': category
            }
        );
    }else{
        mParticle.logEvent(
            event,
            eCategory,
            data
        );
    }

    if (SitePreferences.RSC_ADC_ENABLED) {
        adc.logRSCCustomEvent(
            event,
            eCategory,
            data
        );
    }

}

/**
 * Login action
 * @param text
 */
function mParticleLoginModalClick(text){
    var linkPath = window.location.pathname;

    var utm_source = '';
    var utm_campaign = '';
    var utm_medium = '';

    if(window.location.search) {
        var urlParams = new URLSearchParams(window.location.search);
        if(urlParams.get('utm_source')){
            utm_source = urlParams.get('utm_source');
        }
        if(urlParams.get('utm_campaign')){
            utm_campaign = urlParams.get('utm_campaign');
        }
        if(urlParams.get('utm_medium')){
            utm_medium = urlParams.get('utm_medium');
        }
    }


    mParticle.logEvent(
        'Login Click',
        mParticle.EventType.Other,{
            'linkText':text,
            'linkPath':linkPath,
            'utm_source':utm_source,
            'utm_campaign':utm_campaign,
            'utm_medium':utm_medium,
            'deviceType':isMobile() ? 'mobile':'desktop'
        },{
            'Google.Category':'Login Modal'
        });
    if (SitePreferences.RSC_ADC_ENABLED) {
        adc.logRSCCustomEvent(
            'Login Click',
            mParticle.EventType.Other,
            {
                'linkText': text,
                'linkPath': linkPath,
                'utm_source': utm_source,
                'utm_campaign': utm_campaign,
                'utm_medium': utm_medium,
                'deviceType': isMobile() ? 'mobile' : 'desktop'
            });
    }
}

/**
 * Purchase action
 */
function mParticlePurchaseAction(){

    var dataLayer = JSON.parse($('#mParticleOrderDatalayer').val());

    if(dataLayer) {

        try {
            var mParticleProducts = [];
            var rscProducts = [];
            $.each(dataLayer.items, function(i, item) {
                var itemCustomAttributes = {
                    'originalPrice':item.price,
                    'mainSKU':item.masterSku,
                    'type':''
                }

                if(item.autoDelivery){
                    itemCustomAttributes.autoDelivery = item.autoDelivery;
                    itemCustomAttributes.autoDeliveryInterval = item.autoDeliveryInterval;
                }
                mParticleProducts.push(window.mParticle.eCommerce.createProduct(
                    item.productname,
                    item.sku,
                    item.price,
                    item.quantity,
                    item.variation ? item.variation : '',
                    item.category ? item.category: '',
                    'Tatcha',
                    item.quantity,
                    dataLayer.discountCoupon,
                    itemCustomAttributes));

                rscProducts.push({
                    'Name': item.productname,
                    'Sku': item.sku,
                    'Price': item.price,
                    'Variation': item.variation ? item.variation : '',
                    'Category': item.category ? item.category : '',
                    'Quantity': item.quantity,
                    'DiscountCoupon': dataLayer.discountCoupon,
                    itemCustomAttributes
                });
            });

            var transactionAttributes = {
                Id: dataLayer.transactionId,
                Revenue: dataLayer.revenue,
                Tax: dataLayer.tax,
                Shipping: dataLayer.shippingPrice,
                CouponCode: dataLayer.discountCoupon
            };
            var customAttributes = {
                'Payment Type': dataLayer.paymentMethod,
                'Shipping Type': dataLayer.shippingMethod,
                'deviceType': isMobile() ? 'mobile':'desktop',
                'isGuestCheckout': $('.gtm-login').length == 0 ? false : true,
                value : dataLayer.revenue,
                currency : 'USD'
            };
            var customFlags = {};

            mParticle.eCommerce.logProductAction(
                mParticle.ProductActionType.Purchase,
                mParticleProducts,
                customAttributes,
                customFlags,
                transactionAttributes);
            if (SitePreferences.RSC_ADC_ENABLED) {
                adc.logRSCCommerceEvent(
                    'purchase',
                    rscProducts,
                    customAttributes,
                    transactionAttributes);
            }

        } catch (e) { }

    }

}

/**
 * Method to identify anonymous activity.
 *
 * @param identifyData
 * @returns
 */
function mParticleIdentify(profileData) {

    var identityRequest = {
        userIdentities: { email: profileData.email }
    }

    var identityCallback = function(result) {
        window.mpid = result.getUser().getMPID();
        if (result.getUser()) {
            for (var key in profileData.profileAttributes) {
                result.getUser().setUserAttribute(key,profileData.profileAttributes[key]);
                if (SitePreferences.RSC_ADC_ENABLED) {
                    adc.updateCustomerAttribute(key, profileData.profileAttributes[key]);
                }
            }
        } else {
            success = false;
        }

    };

    mParticle.Identity.identify(identityRequest, identityCallback);

}

/**
 * Method to identify viewed screens.
 *
 * @param pageName
 * @returns
 */
function mParticleViewedScreen(pageName){
    var pathName = window.location.pathname+window.location.search;

    var logEvent;
    var utm_source = '';
    var utm_campaign = '';
    var utm_medium = '';
    var eventName;
    if(pageName == 'Checkout' || pageName == 'Ritual Finder' || pageName == 'Gift finder' || pageName == 'Compare' || pageName == 'Wishlist' || pageName == 'My Account' || pageName == 'Order History' || pageName == 'Reorder'){
        logEvent = true;
        if(pathName.indexOf("/auto-delivery") > -1){
            pageName = 'Auto delivery';
        }else if(pathName.indexOf("account/address") > -1){
            pageName = 'Address book';
        }else if(pathName.indexOf("account/payment") > -1){
            pageName = 'Payment options';
        }else if(pathName.indexOf("account/text-email") > -1){
            pageName = 'Text & email preferences';
        }else if(pathName.indexOf("account/settings") > -1){
            pageName = 'Login settings & profile';
        }
    }else if(pageName == 'Cart'){
        logEvent = true;
        pageName = 'Bag';
    }else if(pageName == 'Storefront'){
        logEvent = true;
        if(window.location.pathname == '/'){
            pageName = 'Home page';
        }else{
            pageName = 'Content page';
        }
        eventName = pageName;
    }else if(pathName.indexOf("/product") > -1){
        logEvent = true;
        pageName = 'Product page';
        eventName = 'Product Detail Page';
        //product - view detail
        var productInfoList = [];
        var prodElement = $('button.add-to-cart');
        if(prodElement && prodElement.length > 0) {
            var productInfo = prodElement.data('product-info');
            if(productInfo){
                productInfo.brand = 'Tatcha';
                productInfoList.push(productInfo);
                mParticleProductAction(productInfoList,getCustomAttributes($(prodElement),'view_detail'),'view_detail');
            }
        }
    }else if(pathName.indexOf("/category/about-auto-delivery") > -1){
        logEvent = true;
        pageName = 'Auto delivery';
    }else if(pageName == 'Product Search Results'){
        logEvent = true;
        pageName = 'Category page';
        eventName = pageName;
    }else if(pageName == 'Order Confirmation'){
        logEvent = true;
        pageName = 'Checkout';
    }else if(pageName == 'Blog Page'){
        logEvent = true;
        eventName = pageName;
    }else if(pageName == 'Content Search Results' || pageName == 'CMS Page'){
        logEvent = true;
        pageName = 'Content page view';
        eventName = pageName;
    }else{
        logEvent = true;
        eventName = pageName;
    }


    if(pathName.indexOf("/checkout/expressreview") > -1){
        pathName = pathName.split('&token')[0];
    }

    if(logEvent){
        if(window.location.search) {
            var urlParams = new URLSearchParams(window.location.search);

            if(urlParams.get('utm_source')){
                utm_source = urlParams.get('utm_source');
            }
            if(urlParams.get('utm_campaign')){
                utm_campaign = urlParams.get('utm_campaign');
            }
            if(urlParams.get('utm_medium')){
                utm_medium = urlParams.get('utm_medium');
            }
        }

        mParticle.logPageView(
            eventName ? eventName : pageName+" page",
            {	"url": window.location.toString(),
                "pageCategory" : pageName,
                "deviceType": isMobile() ? 'mobile':'desktop',
                "utm_source" : utm_source,
                "utm_campaign" : utm_campaign,
                "utm_medium" : utm_medium
            },
            {"Google.Page": window.location.pathname.toString()}
        );
        if (SitePreferences.RSC_ADC_ENABLED) {
            adc.logRSCScreenView(
                eventName ? eventName : pageName + " page",
                {
                    "url": window.location.toString(),
                    "pageCategory": pageName,
                    "deviceType": isMobile() ? 'mobile' : 'desktop',
                    "utm_source": utm_source,
                    "utm_campaign": utm_campaign,
                    "utm_medium": utm_medium
                }
            );
        }
    }
}

/**
 * Product action
 * @param productInfo
 * @param customAttributes
 * @param actionType
 */
function mParticleProductAction(productInfo,customAttributes,actionType){

    if(!window.mParticle || !productInfo) {
        return;
    }

    try {
        var ProductList = [];
        var rscProductList = [];
        for(var i = 0; i < productInfo.length; i++) {
            var Product = window.mParticle.eCommerce.createProduct(
                (productInfo[i].productname)?productInfo[i].productname:'',
                (productInfo[i].sku)?productInfo[i].sku:'',
                (productInfo[i].price)?productInfo[i].price:'',
                (productInfo[i].quantity)?productInfo[i].quantity:'',
                (productInfo[i].variant)?productInfo[i].variant:'',
                (productInfo[i].category)?productInfo[i].category:'',
                (productInfo[i].brand)?productInfo[i].brand:'',
                (productInfo[i].position)?productInfo[i].position:'',
                (productInfo[i].couponCode)?productInfo[i].couponCode:'',
                {
                    'originalPrice':(productInfo[i].price)?productInfo[i].price:'',
                    'masterSKU':(productInfo[i].masterSku)?productInfo[i].masterSku:'',
                    'type':(productInfo[i].type)?productInfo[i].type:''
                }
            );
            Product.Quantity = productInfo[i].quantity;
            ProductList.push(Product);

            var rscProduct = {
                'Name': (productInfo[i].productname) ? productInfo[i].productname : '',
                'Sku': (productInfo[i].sku) ? productInfo[i].sku : '',
                'Price': (productInfo[i].price) ? productInfo[i].price : 0,
                'Quantity': (productInfo[i].quantity) ? productInfo[i].quantity : 0,
                'Variant': (productInfo[i].variant) ? productInfo[i].variant : '',
                'Category': (productInfo[i].category) ? productInfo[i].category : '',
                'Brand': (productInfo[i].brand) ? productInfo[i].brand : '',
                'Position': (productInfo[i].position) ? productInfo[i].position : 0,
                'couponCode': (productInfo[i].couponCode) ? productInfo[i].couponCode : '',
                'originalPrice': (productInfo[i].price) ? productInfo[i].price : 0,
                'masterSKU': (productInfo[i].masterSku) ? productInfo[i].masterSku : '',
                'type': (productInfo[i].type) ? productInfo[i].type : ''
            }
            rscProductList.push(rscProduct);
        }

        // Push to mParticle
        switch(actionType) {
            case 'add_to_cart':
                window.mParticle.eCommerce.logProductAction(
                    window.mParticle.ProductActionType.AddToCart,
                    ProductList,customAttributes
                );
				if (SitePreferences.RSC_ADC_ENABLED) {
					adc.logRSCCommerceEvent(
						'add_to_cart',
						rscProductList, customAttributes
						);					
				}
                break;
            case 'remove_from_cart':
                window.mParticle.eCommerce.logProductAction(
                    window.mParticle.ProductActionType.RemoveFromCart,
                    ProductList,customAttributes
                );
                if (SitePreferences.RSC_ADC_ENABLED) {
					adc.logRSCCommerceEvent(
						'remove_from_cart',
						rscProductList, customAttributes
					);
                }
                break;
            case 'product_click':
                window.mParticle.eCommerce.logProductAction(
                    window.mParticle.ProductActionType.Click,
                    ProductList,customAttributes
                );
                if (SitePreferences.RSC_ADC_ENABLED) {
                    adc.logRSCCommerceEvent(
                        'product_click',
                        rscProductList, customAttributes
                    );
                }
                break;
            case 'product_view':
                var impression = mParticle.eCommerce.createImpression('Product View', Product);
                window.mParticle.eCommerce.logImpression(impression,customAttributes);
                if (SitePreferences.RSC_ADC_ENABLED) {
                    var impression = { 'Name': 'Product View' };
                    var attributes = {
                        'originalPrice': Product.Price,
                        'mainSKU': Product.masterSKU,
                        'type': ''
                    }
                    var product = {
                        'Name': Product.Name,
                        'Sku': Product.Sku,
                        'Price': Product.Price,
                        'Quantity': Product.Quantity,
                        'Variation': Product.Variant ? Product.Variant : '',
                        'Quantity': Product.quantity,
                        'DiscountCoupon': dataLayer.discountCoupon
                    };
                    product['Attributes'] = attributes;
                    impression['Product'] = product;
                    adc.logRSCImpressionEvent(impression, customAttributes)
                }
                break;
            case 'product_wishlist_click':
                window.mParticle.eCommerce.logProductAction(
                    window.mParticle.ProductActionType.AddToWishlist,
                    ProductList,customAttributes
                );
                if (SitePreferences.RSC_ADC_ENABLED) {
                    adc.logRSCCommerceEvent(
                        'add_to_wishlist',
                        rscProductList, customAttributes
                    );
                }
                break;
            case 'view_detail':
                window.mParticle.eCommerce.logProductAction(
                    window.mParticle.ProductActionType.ViewDetail,
                    ProductList,customAttributes
                );
                if (SitePreferences.RSC_ADC_ENABLED) {
                    adc.logRSCCommerceEvent(
                        'view_detail',
                        rscProductList, customAttributes
                    );
                }
            default:

        }

    } catch(err){
        //TODO
    }
}

/*
 * Util method to identify the device type(Mobile/Desktop)
 */
function isMobile() {
    var mobileAgentHash = ['mobile', 'tablet', 'phone', 'ipad', 'ipod', 'android', 'blackberry', 'windows ce', 'opera mini', 'palm'];
    var idx = 0;
    var isMobile = false;
    var userAgent = (navigator.userAgent).toLowerCase();

    while (mobileAgentHash[idx] && !isMobile) {
        isMobile = (userAgent.indexOf(mobileAgentHash[idx]) >= 0);
        idx++;
    }
    return isMobile;
}

/**
 * Getting custom attrivute list
 * @param obj
 * @param action
 * @returns {{deviceType: (string), siteSection: string, sourcePage: string, utm_campaign: string, utm_medium: string, pagePath: string, utm_source: string}}
 */
function getCustomAttributes(obj,action){

    var siteSection = '';
    var utm_source = '';
    var utm_campaign = '';
    var utm_medium = '';

    var pagePath = window.location.origin + window.location.pathname;
    var pathName = window.location.pathname;

    if((pathName.startsWith("/category") || pathName.startsWith("/s/tatcha/category")) && $(obj).closest('.mini-bag').length < 1){
        siteSection = $(obj).hasClass('compare-add-to-bag') ? "Compare" : "Category";
    } else if((pathName.startsWith("/product") || pathName.startsWith("/s/tatcha/product")) && $(obj).closest('.mini-bag').length < 1){
        if(action == 'view_detail'){
            siteSection = "page";
        } else if ($(obj).closest('.routine-step').length > 0) {
            siteSection = "via Suggested Ritual";
        } else if ($(obj).hasClass('ymliAddToBag') || $(obj).closest('.product-list-unit').find('.ymliAddToBag').length > 0) {
            siteSection = "via YMAL";
        } else if ($(obj).closest('.upsell-use-with').length > 0 ) {
            siteSection = $(obj).hasClass('upsell-product-add-to-cart') ? "via Use It With - ADD BOTH" : "via Use It With";
        } else if ($(obj).hasClass('upsell-product-add-to-cart')) {
            siteSection = "P-Page Use It With: Add Both";
        } else if ($(obj).hasClass('mobile-affixed')) {
            siteSection = "P-Page Mobile Affixed";
        } else {
            siteSection = "P-Page Main";
        }
    } else if($(obj).hasClass('home-carousel-add-to-cart') || $(obj).siblings('.product-cta').children().hasClass('home-carousel-add-to-cart')){
        siteSection = "via Home Carousel";
    } else if($(obj).hasClass('img-search-add-to-cart')){
        siteSection = "Image Search";
    } else if($(obj).hasClass('compare-add-to-bag')){
        siteSection = "Comparison";
    } else if($(obj).hasClass('pairs-with-btn')){
        siteSection = "Pairs With View Click";
    } else if($(obj).closest('.pairs-with-flex').length > 0) {
        if($(obj).closest('.mini-bag').length > 0){
            siteSection = "via Mini Bag Pairs With";
        }else {
            siteSection = "via Bag Page Pairs With";
        }
    } else if($(obj).hasClass('pairs-with-travel')) {
        siteSection = "Bag Page: Pairs With Travel";
    } else if(pathName.startsWith("/bag") || pathName.startsWith("/s/tatcha/bag"))	{
        siteSection = "Bag";
    } else if($(obj).closest('.mini-bag').length > 0){
        siteSection = "Mini Bag";
    } else if($(obj).hasClass('reorder-prd-add-qv')){
        siteSection = "Reorder";
    } else if($(obj).hasClass('ritual-add-to-cart') || $(obj).hasClass('add-all-rf')){
        siteSection = "Ritual Finder";
    } else if(pathName.startsWith("/blog") || pathName.startsWith("/s/tatcha/blog")){
        siteSection = "Blog Post";
    } else if($(obj).hasClass('history-add-to-cart') || pathName.startsWith("/account/orders") || pathName.startsWith("/s/tatcha/account/orders")){
        siteSection = "Order History";
    } else if($(obj).hasClass('wishlist-add-to-cart') || pathName.startsWith("/account/wishlist") || pathName.startsWith("/s/tatcha/account/wishlist")){
        if($(obj).hasClass('carousel-add-to-cart')) {
            siteSection = "Wishlist Empty State Carousel";
        } else {
            siteSection = "Wishlist";
        }
    } else if(pathName.startsWith("/giftfinder/results") || pathName.startsWith("/s/tatcha/giftfinder/results")){
        siteSection = "Gift Finder";
    } else if($(obj).hasClass('full-width-panel-add-to-bag')){
        siteSection = "Home Panel Full Width Product";
    } else if($(obj).hasClass('move-search')){
        siteSection = "via Search results";
    }


    if(action == 'add_to_cart') {
        siteSection = "Add to Bag Click: "+siteSection;
    } else if(action == 'product_click') {
        if($(obj).closest('.carousel-cell').length > 0 || $(obj).closest('.upsell-use-with').length > 0 || $(obj).closest('.pairs-with-flex').length > 0){
            siteSection = "Upsell: View Product Link Click: "+siteSection;
        }else if($(obj).hasClass('pairs-with-btn')){
            if($(obj).closest('.mini-bag').length > 0){
                siteSection = "Mini-Bag: "+siteSection;
            }else {
                siteSection = "Bag: "+siteSection;
            }
        }else{
            siteSection = "Product Click: "+siteSection;
        }
    } else if(action == 'remove_from_cart'){
        siteSection = "Remove from cart Click: "+siteSection;
    }else if(action == 'product_wishlist_click'){
        siteSection = "Add to wishlist Click: "+siteSection;
    } else if(action != 'view_detail'){
        siteSection = "Product View: "+siteSection;
    }


    // Optional parameters

    if(window.location.search) {
        var urlParams = new URLSearchParams(window.location.search);

        if(urlParams.get('utm_source')){
            utm_source = urlParams.get('utm_source');
        }
        if(urlParams.get('utm_campaign')){
            utm_campaign = urlParams.get('utm_campaign');
        }
        if(urlParams.get('utm_medium')){
            utm_medium = urlParams.get('utm_medium');
        }
    }

    var customAttributes = {
        siteSection: siteSection,
        sourcePage: window.location.href,
        pagePath: pathName,
        deviceType: isMobile() ? 'mobile':'desktop',
        utm_source: utm_source,
        utm_campaign: utm_campaign,
        utm_medium: utm_medium
    };

    return customAttributes;

}

/**
 * Product Click action
 * @param prodElement
 */
function productClick(prodElement){

    var customAttributes = getCustomAttributes($(prodElement),'product_click');
    var productInfoList = [];
    if($(prodElement).hasClass('pairs-with-btn')){
        prodElement = $(prodElement).closest('.bag-item-container').siblings('.popup-unit').find("[data-product-info]");
    } else if($(prodElement).closest('.popup-body').length > 0){
        prodElement = $(prodElement).closest('.popup-body').find("[data-product-info]");
    }else if($(prodElement).closest('.upsell-use-with').length > 0){
        prodElement = $(prodElement).closest('.upsell-use-with').find("[data-product-info]");
    }else if($(prodElement).closest('.carousel-cell').length > 0){
        prodElement = $(prodElement).closest('.carousel-cell').find("[data-product-info]");
    }else if($(prodElement).closest('.move-search').length > 0){
        prodElement = $(prodElement).closest('.move-search');
    }else {
        prodElement = $(prodElement).closest('.product-tile').find("[data-product-info]");
    }
    if(prodElement && prodElement.length > 0) {
        var productInfo = prodElement.data('product-info');
        if(productInfo){
            productInfo.quantity = 1;
            productInfo.brand = 'Tatcha';
            productInfo.position =  $(prodElement).closest('.product-list-col').data('index') || $(prodElement).closest('.carousel-cell').data('index') + 1;
            productInfoList.push(productInfo);
            mParticleProductAction(productInfoList,customAttributes,'product_click');
        }
    }
}

/**
 * Method to send login and registration events/data to mParticle
 *
 * @param profileData
 * @param isRegister
 * @returns
 */
function mParticleLogin(profileData, eventType){

    var identityRequest = {
        userIdentities: {
            email: profileData.email,
            customerid: profileData.customerNo
        }
    };

    if(profileData.facebookID) {
        identityRequest.userIdentities.facebook = profileData.facebookID;
    }

    var success = true;

    try {

        var identityCallback = function(result) {
            if (result.getUser()) {
                window.mpid = result.getUser().getMPID();
                if (SitePreferences.RSC_ADC_ENABLED) {
                    for (var key in identityRequest.userIdentities) {
                        adc.updateCustomerIdentity(key, identityRequest.userIdentities[key]);
                    }
                }

                for (var key in profileData.profileAttributes) {
                    result.getUser().setUserAttribute(key, profileData.profileAttributes[key]);
                    if (SitePreferences.RSC_ADC_ENABLED) {
                        adc.updateCustomerAttribute(key, profileData.profileAttributes[key]);
                    }
                }
            } else {
                success = false;
            }
        };

        mParticle.Identity.login(identityRequest, identityCallback);


    } catch (e) {
        success = false;
    }

    if (success) {

        var data = {};
        if(window.location.search) {
            var urlParams = new URLSearchParams(window.location.search);
            if(urlParams.get('utm_source')){
                data.utm_source = urlParams.get('utm_source');
            }
            if(urlParams.get('utm_campaign')){
                data.utm_campaign = urlParams.get('utm_campaign');
            }
            if(urlParams.get('utm_medium')){
                data.utm_medium = urlParams.get('utm_medium');
            }
        }
        data.deviceType = isMobile() ? 'mobile':'desktop';


        if (eventType == 'register') {
            mParticle.logEvent('Created Account',mParticle.EventType.Other,data);
        } else if (eventType == 'login'){
            mParticle.logEvent('Logged In',mParticle.EventType.Other,data);
        } else if (eventType == 'facebook') {
            mParticle.logEvent('Facebook Login',mParticle.EventType.Other,data);
        }
    } else {
        if (eventType == 'register') {
            mParticle.logError('Create Account failed');
        } else if (eventType == 'login'){
            mParticle.logError('Login failed');
        } else if (eventType == 'facebook') {
            mParticle.logEvent('Facebook Login Failed');
        }
    }

    if (SitePreferences.RSC_ADC_ENABLED) {
        if (profileData) {
            var userIdentites = {
                email: profileData.email,
                customerid: profileData.customerNo
            }

            if (profileData.facebookID) {
                userIdentites.push('facebook', profileData.facebookID)
            }

            var rscData = {};
            if (window.location.search) {
                var urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('utm_source')) {
                    rscData.utm_source = urlParams.get('utm_source');
                }
                if (urlParams.get('utm_campaign')) {
                    rscData.utm_campaign = urlParams.get('utm_campaign');
                }
                if (urlParams.get('utm_medium')) {
                    rscData.utm_medium = urlParams.get('utm_medium');
                }
            }
            rscData.deviceType = isMobile() ? 'mobile' : 'desktop';

            if (eventType == 'register') {
                adc.logRSCCustomEvent('Created Account', mParticle.EventType.Other, rscData);
            } else if (eventType == 'login') {
                adc.logRSCCustomEvent('Logged In', mParticle.EventType.Other, rscData);
            } else if (eventType == 'facebook') {
                adc.logRSCCustomEvent('Facebook Login', mParticle.EventType.Other, rscData);
            }
        }
    }
}

/**
* Method to update a single user attribute in mParticle
*
* @param key
* @param value
* @returns
*/
function mParticleUpdateUserAttribute(key, value){
    var currentUser = mParticle.Identity.getCurrentUser();

    //Update user attributes associated with the user (there are several variations of this in addition to below)
    currentUser.setUserAttribute(key,value);
    if (SitePreferences.RSC_ADC_ENABLED) {
        adc.updateCustomerAttribute(key, value);
    }

}

/**
 * Method to update user attributes in mParticle
 *
 * @param profileAttributes
 * @returns
 */
function mParticleUpdateUserAttributes(profileAttributes){

    var currentUser = mParticle.Identity.getCurrentUser();

    //Update user attributes associated with the user (there are several variations of this in addition to below)
    for (var key in profileAttributes) {
        currentUser.setUserAttribute(key,profileAttributes[key]);
        if (SitePreferences.RSC_ADC_ENABLED) {
            adc.updateCustomerAttribute(key,profileAttributes[key]);
        }
    }

}

/**
 * Get bag product list
 * @returns {*[]}
 */
function getbagProductsList() {
    var selector = $('.bag-item-list .bag-product-item');
    var productsList = [];
    try {
        if(window.mParticle) {
            if(selector.length > 0) {
                for(var i=0;i<selector.length;i++) {
                    if(selector[i] && $(selector[i]).is(':visible')) {
                        var prd = $(selector[i]).attr('data-product-info');
                        prd = JSON.parse(prd);
                        var qty = $(selector[i]).find('.qty-field') ? $(selector[i]).find('.qty-field').val() : 1;
                        var product;
                        if(prd) {
                            product = window.mParticle.eCommerce.createProduct(
                                prd.productname,
                                prd.sku,
                                prd.price,
                                qty,
                                prd.variant ? prd.variant : '',
                                prd.category ? prd.category: '',
                                'Tatcha'
                            );
                        }
                        productsList.push(product);
                    }
                }
            }
        }
    } catch(e) {}

    return productsList;
}

/**
 * Cart: Product event
 * @param products
 * @param data
 */
function mParticleLogProduct(products,data) {
    try {
        if(window.mParticle) {
            var transactionAttributes;

            mParticle.eCommerce.logProductAction(
                mParticle.ProductActionType.Checkout,
                products,
                data,
                null,
                transactionAttributes
            );
        }
        if (SitePreferences.RSC_ADC_ENABLED) {
            if (products) {
                var rscProductList = [];
                for (const product of products){
                    var rscProduct = product;
                    if(!rscProduct.Position || rscProduct.Position === ''){
                        rscProduct.Position = 0;
                    }
                    if(!rscProduct.Quantity || rscProduct.Quantity === ''){
                        rscProduct.Quantity = 0;
                    }
                    rscProductList.push(rscProduct)
                } 
                adc.logRSCCommerceEvent(
                    "Checkout",
                    rscProductList,
                    data
                );
            }
        }
    }catch(e){}
}
