/**
* Description of the Controller and the logic it provides
*
* @module  controllers/MIniCart
*/

'use strict';


/* API Includes */
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');
var URLUtils = require('dw/web/URLUtils');
var Site = require('dw/system/Site');
var CustomerMgr= require('dw/customer/CustomerMgr');

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var GiftSet = require('app_storefront_core/cartridge/scripts/util/giftset');
var getzip = require('app_storefront_core/cartridge/scripts/cart/GetCustomerIp');


/**
 * Renders the minicart drawer content
 * @return checkout/cart/minicartcontent
 * */
function show() {
	var Basket = app.getModel('Cart').get();
	updateMinicartAddress(Basket);
	//After Pay Changes Start
    var sitePreferences =require("int_afterpay_core/cartridge/scripts/util/afterpayUtilities.js").getSitePreferencesUtilities();
    var afterpayEnable = sitePreferences.isAfterpayEnabled();
    if(afterpayEnable){
    	require("int_afterpay_core/cartridge/scripts/util/afterpayCallThreshold.js").SetThreshold();
    	}
    //After Pay Changes End
    
	app.getView('MiniCart', {
        Basket: Basket
    }).render('checkout/cart/minicartcontent');
}

/**
 * Delete product line item from minicart
 * @return checkout/cart/minicartcontent
 * */
function deleteProduct(){
	var cart = app.getModel('Cart').goc();
	var requestId = request.httpParameterMap.productId.value;
	var productLineItem = cart.getProductLineItems(requestId);

    session.custom.NoCall = true;
	Transaction.wrap(function () {                
         cart.removeProductLineItem(productLineItem[0]);
         cart.checkGiftItem();
         GiftSet.checkGiftBuilderItem(cart);
         cart.updateCoupons();
     });
     app.getView('MiniCart', {
         Basket: cart,
         cartAction : 'update'
     }).render('checkout/cart/minicartcontent');
}

/**
 * Update quantity of productline items
 * @return checkout/cart/minicartcontent
 * */
function minicartUpdateProduct(){
	var cart = app.getModel('Cart').goc();
	var productId = request.httpParameterMap.productId.value;
	var quantity = request.httpParameterMap.quantity.value;
	var productLineItem = cart.getProductLineItems(productId)[0];
    session.custom.NoCall = true;
	Transaction.wrap(function () {  
		productLineItem.setQuantityValue(parseInt(quantity));
		if (quantity === 0) {
        cart.removeProductLineItem(productLineItem);
    	}
	 var defaultMaxQty = Site.getCurrent().getCustomPreferenceValue('maxOrderQuantity');
     var maxQty = !empty(productLineItem.product.custom.maxOrderQuantity) ? productLineItem.product.custom.maxOrderQuantity : defaultMaxQty;
    
		if (maxQty && productLineItem.quantity.value > maxQty) {
			productLineItem.setQuantityValue(maxQty);
		}	
         cart.checkGiftItem();
         GiftSet.checkGiftBuilderItem(cart);
         cart.updateCoupons();
     });
     
     app.getView('MiniCart', {
         Basket: cart,
         cartAction : 'update'
     }).render('checkout/cart/minicartcontent');
}
/**
 * Add product in pairs with and empty cart state.
 * @return checkout/cart/minicartcontent
 * */

function createProduct(){
	var cart = app.getModel('Cart').goc();
	
	var productId = request.httpParameterMap.productId.value;
	 var status = 0;
	 var Product = app.getModel('Product');
     var productToAdd = Product.get(productId);         
     var productLineItems = cart.object.productLineItems;
     var productInCart;
     for (var q = 0; q < productLineItems.length; q++) {
             if (productLineItems[q].productID === productToAdd.object.ID) {
                     productInCart = productLineItems[q];
                     break;
             }
     }
     var defaultMaxQty = Site.getCurrent().getCustomPreferenceValue('maxOrderQuantity');
     var maxQty = !empty(productToAdd.object.custom.maxOrderQuantity) ? productToAdd.object.custom.maxOrderQuantity : defaultMaxQty;
     var reqQty = (productInCart && !productInCart.optionModel) ? (productInCart.quantityValue + 1) : parseInt(1); 
     if(reqQty > maxQty) {
     	status = maxQty;
      }

    session.custom.NoCall = true;
	if(status){
	session.custom.maxQtyError = dw.web.Resource.msgf('cart.maxqtyerror', 'checkout', null, maxQty); 
	if(productId){
		session.custom.maxQtyError_pid = productId;
	   }
	}
	else{
	Transaction.wrap(function () {  
		 cart.createProductLineItem(productId,cart.object.defaultShipment);	
         cart.checkGiftItem();
         GiftSet.checkGiftBuilderItem(cart);
         cart.updateCoupons();
     });
	}
    if (dw.system.Site.getCurrent().getCustomPreferenceValue('UseSfraMiniBag')) {
        response.redirect(URLUtils.url('CartSFRA-MiniCartShow',"cartAction",'update'));
    } else {
        app.getView('MiniCart', {
            Basket: cart,
            cartAction : 'update'
        }).render('checkout/cart/minicartcontent');
    }
}
/**
 * Remove gift certificate from minicart
 * @return checkout/cart/minicartcontent
 * */
function removeGiftCert(){
	var cart = app.getModel('Cart').goc();
	var giftCertId = request.httpParameterMap.giftCertId.value;
	var giftCertLineItems = cart.getGiftCertificateLineItems();
	var giftCertLineItem; 
	var giftIter = giftCertLineItems.iterator();
	
	while(giftIter.hasNext()){
		giftCertLineItem = giftIter.next();
		if(giftCertLineItem.UUID === giftCertId){
			break; 
		}				
	}

    session.custom.NoCall = true;
	Transaction.wrap(function () {  
		cart.removeGiftCertificateLineItem(giftCertLineItem);	
		cart.checkGiftItem();
        GiftSet.checkGiftBuilderItem(cart);
        cart.updateCoupons();
    });
	 app.getView('MiniCart', {
         Basket: cart
     }).render('checkout/cart/minicartcontent');
	
}

/**
 * update cart shipping address
 * @returns
 */
function updateMinicartAddress(basket){
	
	if(!empty(basket)) {
	//GeoIP Based ZipCode, Country Setup
    var defaultShipment = basket.getDefaultShipment();
    var shippingAddress = defaultShipment.getShippingAddress();
    var postalCode = !empty(shippingAddress) ? shippingAddress.getPostalCode() : '';
    var countryCode = !empty(shippingAddress) ? shippingAddress.getCountryCode() : '';
    
	if (!postalCode && !countryCode.value) {
        Transaction.wrap(function () {
            shippingAddress = basket.createShipmentShippingAddress(defaultShipment.getID());
            if (customer.authenticated && customer.registered && customer.addressBook.preferredAddress) {
             var preferedAddress = customer.addressBook.preferredAddress;
             shippingAddress.setFirstName(preferedAddress.firstName);
                   shippingAddress.setLastName(preferedAddress.lastName);
                   shippingAddress.setAddress1(preferedAddress.address1);
                   shippingAddress.setAddress2(preferedAddress.address2);
                   shippingAddress.setCity(preferedAddress.city);
                   shippingAddress.setPostalCode(preferedAddress.postalCode);
                   shippingAddress.setStateCode(preferedAddress.stateCode);
                   shippingAddress.setCountryCode(preferedAddress.countryCode);
                   shippingAddress.setPhone(preferedAddress.phone);
                   basket.updateShipmentShippingMethod(basket.getDefaultShipment().getID(), session.forms.singleshipping.shippingAddress.shippingMethodID.value, null, null);
            } else {
             var zipCode = getzip.getZipCode();
                var countryCode = getzip.getCountryCode();
                //if(countryCode == 'US'){
                 shippingAddress.setPostalCode(null);
                 shippingAddress.setCountryCode(countryCode);
                 basket.updateShipmentShippingMethod(basket.getDefaultShipment().getID(), session.forms.singleshipping.shippingAddress.shippingMethodID.value, null, null);
                //}
            }
            session.custom.NoCall = true;
            basket.calculate();
           });
       }
	}
}

/**
 * Apply coupon on minicart
 * @returns
 */
function minicartAddCoupon(){
	var couponCode, cart, couponStatus, result;
    var hasSORProducts = session.custom.hasSORProducts? session.custom.hasSORProducts: false;
    couponCode = request.httpParameterMap.couponCode.stringValue;
    cart = app.getModel('Cart').goc();
    

    if (!empty(couponCode) && !hasSORProducts) {
	Transaction.wrap(function() {
		result = cart.addCoupon(couponCode);
	});
	var couponStatus = result.CouponStatus;
	if (result && typeof (result.CouponStatus) != 'undefined') {
		var promoId = Site.getCurrent().getCustomPreferenceValue('samplePromotionID');
		var bonusDiscountLineItems = cart.getBonusDiscountLineItems();
		var bonusDiscountLineItem;
		for (var i = 0; i < bonusDiscountLineItems.length; i++) {
			bonusDiscountLineItem = bonusDiscountLineItems[i];
			if (bonusDiscountLineItem.getPromotion().ID != promoId) {
				result.CouponStatus = 'APPLIED';
			}
		}

		var statusError = (result.CouponStatus != 'APPLIED');
		if (statusError) {
			var couponLineItem = cart.getCouponLineItem(couponCode);
			if (!empty(couponLineItem)) {
				Transaction.wrap(function() {
					cart.removeCouponLineItem(couponLineItem);
				});
			}
		}
		couponStatus = result.CouponStatus;
			
		} else {
			couponStatus = 'NO_ACTIVE_PROMOTION';
		}
	}else if (!empty(couponCode) && hasSORProducts){
        couponStatus = 'AUTODELIVERY_ENABLED';
    }else {
	 couponStatus = 'COUPON_CODE_MISSING';     
	}
    

    session.custom.Coupon = JSON.stringify({
		status : couponStatus,
		code : couponCode,
		error : statusError
    });
    
    if (!couponStatus.error) {
     session.custom.NoCall = true;
    }
    
    app.getView('MiniCart', {
        Basket: cart,
        cartAction : 'update',
        result : result
    }).render('checkout/cart/minicartcontent');
}

/**
 * function to handle coupon removal
 * @returns
 */
function minicartRemoveCoupon(){
	
	var couponCode, cart;

    couponCode = request.httpParameterMap.couponCode.stringValue;
    cart = app.getModel('Cart').goc();
    
    var couponLineItem = cart.getCouponLineItem(couponCode);
    session.custom.NoCall = true;
    Transaction.wrap(function () {
    	cart.removeCouponLineItem(couponLineItem);
    	cart.calculate();
    });
    
    app.getView('MiniCart', {
        Basket: cart,
        cartAction : 'update'
    }).render('checkout/cart/minicartcontent');
}


/**
 * Renders a list of bonus products for a bonus discount line item in minicart.
 */
function getBonusProductsMiniCart() {
    var Cart = app.getModel('Cart');
    var getBonusDiscountLineItemDS = require('app_storefront_core/cartridge/scripts/cart/GetBonusDiscountLineItem');
    var currentHttpParameterMap = request.httpParameterMap;
    var bonusDiscountLineItems = Cart.get().getBonusDiscountLineItems();
    var bonusDiscountLineItem;

    bonusDiscountLineItem = getBonusDiscountLineItemDS.getBonusDiscountLineItem(bonusDiscountLineItems, currentHttpParameterMap.bonusDiscountLineItemUUID);
    var bpCount = bonusDiscountLineItem.bonusProducts.length;
    var bpTotal;
    var bonusDiscountProducts;
    session.custom.NoCall = true;
    if (currentHttpParameterMap.pageSize && !bpCount) {

        var BPLIObj = getBonusDiscountLineItemDS.getBonusPLIs(currentHttpParameterMap.pageSize, currentHttpParameterMap.pageStart, bonusDiscountLineItem);

        bpTotal = BPLIObj.bpTotal;
        bonusDiscountProducts = BPLIObj.bonusDiscountProducts;
    } else {
        bpTotal = -1;
    }
    var basket = Cart.goc();
    app.getView('MiniCart', {
        Basket: basket,
        cartAction : 'update',
        BonusDiscountLineItem: bonusDiscountLineItem,
        BPTotal: bpTotal,
        BonusDiscountProducts: bonusDiscountProducts
    }).render('checkout/cart/minicartbonusitems');

}

exports.Show = guard.ensure(['https'], show);
exports.DeleteProduct = guard.ensure(['post'], deleteProduct);
exports.UpdateProductQty = guard.ensure(['post'], minicartUpdateProduct);
exports.CreateProduct= guard.ensure(['post'], createProduct);
exports.RemoveGiftCert= guard.ensure(['post'], removeGiftCert);
exports.AddCoupon = guard.ensure(['post'], minicartAddCoupon);
exports.RemoveCoupon = guard.ensure(['post'], minicartRemoveCoupon);
exports.GetBonusProductsMiniCart = guard.ensure(['post'], getBonusProductsMiniCart);
