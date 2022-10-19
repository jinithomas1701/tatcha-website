'use strict';

/**
 * Controller that adds and removes products and coupons in the cart.
 * Also provides functions for the continue shopping button and minicart.
 *
 * @module controllers/Cart
 */

/* API Includes */
var ArrayList = require('dw/util/ArrayList');
var ISML = require('dw/template/ISML');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');
var URLUtils = require('dw/web/URLUtils');
var Site = require('dw/system/Site');
var CustomerMgr= require('dw/customer/CustomerMgr');
var CustomObjectMgr= require('dw/object/CustomObjectMgr');
var GiftCertificateMgr = require('dw/order/GiftCertificateMgr');
var GiftCertificateStatusCodes = require('dw/order/GiftCertificateStatusCodes');
var GiftCertificate = require('dw/order/GiftCertificate');
var Status = require('dw/system/Status');
var Cookie = require('dw/web/Cookie');

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var  getzip = require('app_storefront_core/cartridge/scripts/cart/GetCustomerIp');
var securityHeader = require('~/cartridge/scripts/util/SecurityHeaders');
var GiftSet = require('app_storefront_core/cartridge/scripts/util/giftset');

/**
 * Redirects the user to the last visited catalog URL if known, otherwise redirects to
 * a hostname-only URL if an alias is set, or to the Home-Show controller function in the default
 * format using the HTTP protocol.
 */
function continueShopping() {

    var location = require('~/cartridge/scripts/util/Browsing').lastCatalogURL();

    if (location) {
        response.redirect(location);
    } else {
        response.redirect(URLUtils.httpHome());
    }
}

function hasSampleProductsInBag(basket) {
	var hasSample = false;
	var samplePromotionId = Site.getCurrent().getCustomPreferenceValue('samplePromotionID');
    var bonusDiscountLineItems = basket.bonusDiscountLineItems;
    if(bonusDiscountLineItems && bonusDiscountLineItems.length) {
    	for(var i=0;i<bonusDiscountLineItems.length;i++){
        	if(bonusDiscountLineItems[i].getPromotion().ID === samplePromotionId && bonusDiscountLineItems[i].getBonusProductLineItems().size() > 0) {
        		hasSample =  true;
        	}
        		
        }
    	return hasSample;
    }
}

function showSamplesPopup() {
	var cart = app.getModel('Cart').get();
	var hasProductswithNonZeroPrice = cart.getAllProductLineItems().size() > 0 && cart.getAdjustedMerchandizeTotalNetPrice().value > 0;
	var hasSampleProducts = hasSampleProductsInBag(cart);
	if(hasProductswithNonZeroPrice && !hasSampleProducts) {
	   var cookieName  = "dw_samples_popup";
	   var cookieValue = "1";
	   var popupCookie = new  Cookie(cookieName, cookieValue);
	   popupCookie.path = "/";
       popupCookie.maxAge = 900000;
       //popupCookie.httpOnly = true;
       popupCookie.secure = true;
	   response.addHttpCookie(popupCookie);
	}
	session.custom.showSamplePopup = true;
}

/**
 * Invalidates the login and shipment forms. Renders the checkout/cart/cart template.
 */
function show() {
    var cartForm = app.getForm('cart');
    app.getForm('login').invalidate();

    cartForm.get('shipments').invalidate();
    var cart = app.getModel('Cart').get();
    //Check if customer is eligible for express checkout
    var isExpressCheckout = false;
    var paymentMethod = '';
    if(cart && cart.getPaymentInstruments()){    	
		var paymentInstruments = cart.getPaymentInstruments();
		for(var i=0; i< paymentInstruments.length; i++) {
			if((paymentInstruments[i].getPaymentMethod() =='AFTERPAY_PBI')){
				paymentMethod = 'AFTERPAY_PBI';
				break;
			}
	    }
    }
    if (customer.authenticated && customer.registered && !empty(customer.profile.addressBook.preferredAddress) && !empty(customer.profile.wallet.paymentInstruments) && paymentMethod!='AFTERPAY_PBI') {
    	isExpressCheckout = true;
     }
    
    session.custom.NoCall = true;
    
    
    
    //GeoIP Based ZipCode, Country Setup
    var defaultShipment = !empty(cart) ? cart.getDefaultShipment() : '';
    var shippingAddress = (!empty(defaultShipment) && defaultShipment.getShippingAddress()) ? defaultShipment.getShippingAddress() : '';
    var postalCode = !empty(shippingAddress) ? shippingAddress.getPostalCode() : '';
    var countryCode = !empty(shippingAddress) ? shippingAddress.getCountryCode() : '';
    
    if (!postalCode && !countryCode.value) {
     Transaction.wrap(function () {
         shippingAddress = cart.createShipmentShippingAddress(defaultShipment.getID());
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
                cart.updateShipmentShippingMethod(cart.getDefaultShipment().getID(), session.forms.singleshipping.shippingAddress.shippingMethodID.value, null, null);
         } else {
          var zipCode = getzip.getZipCode();
             var countryCode = getzip.getCountryCode();
             //if(countryCode == 'US'){
              shippingAddress.setPostalCode(null);
                    shippingAddress.setCountryCode(countryCode);
                    cart.updateShipmentShippingMethod(cart.getDefaultShipment().getID(), session.forms.singleshipping.shippingAddress.shippingMethodID.value, null, null);
             //}
         }
         cart.calculate();
        });
    }
    
    //Update Giftwrap Options
    Transaction.wrap(function () {
    	cart.calculate();
    });
    cart.updateGiftWrapOptions();
    
    //Get cart page meta data
    var cartAsset = app.getModel('Content').get('cart');
    if (cartAsset) {
    	var pageMeta = require('~/cartridge/scripts/meta');
    	pageMeta.update(cartAsset);
	}
        
    if(!session.custom.showSamplePopup && request.httpParameterMap.referrer != 'ritualfinder') {
    	showSamplesPopup();
    }
    
    var PromoTrigger = false;
    if(session.custom.promotrigger) {
    	PromoTrigger = true;
    	session.custom.promotrigger = false;
    }
      // Smart Order Refill Modification - Begin
    if (dw.system.Site.getCurrent().getCustomPreferenceValue('SorEnabled')) {
        require('int_smartorderrefill/cartridge/scripts/smartOrderRefill/refillHelper.js').checkForRefillProducts();
    }
    // Smart Order Refill Modification - End

    
    securityHeader.setSecurityHeaders();
    app.getView('Cart', {
        cart: app.getModel('Cart').get(),
        RegistrationStatus: false,
        PromoTrigger: PromoTrigger,
        isExpressCheckout : isExpressCheckout
    }).render('checkout/cart/cart');

}

/**
 * Handles the form actions for the cart.
 * - __addCoupon(formgroup)__ - adds a coupon to the basket in a transaction. Returns a JSON object with parameters for the template.
 * - __calculateTotal__ - returns the cart object.
 * - __checkoutCart__ - validates the cart for checkout. If valid, redirect to the COCustomer-Start controller function to start the checkout. If invalid returns the cart and the results of the validation.
 * - __continueShopping__ - calls the {@link module:controllers/Cart~continueShopping|continueShopping} function and returns null.
 * - __deleteCoupon(formgroup)__ - removes a coupon from the basket in a transaction. Returns a JSON object with parameters for the template
 * - __deleteGiftCertificate(formgroup)__ - removes a gift certificate from the basket in a transaction. Returns a JSON object with parameters for the template.
 * - __deleteProduct(formgroup)__ -  removes a product from the basket in a transaction. Returns a JSON object with parameters for the template.
 * - __editLineItem(formgroup)__ - gets a ProductModel that wraps the pid (product ID) in the httpParameterMap and updates the options to select for the product. Updates the product in a transaction.
 * Renders the checkout/cart/refreshcart template. Returns null.
 * - __login__ - calls the Login controller and returns a JSON object with parameters for the template.
 * - __logout__ - logs the customer out and returns a JSON object with parameters for the template.
 * - __register__ - calls the Account controller StartRegister function. Updates the cart calculation in a transaction and returns null.
 * - __unregistered__ - calls the COShipping controller Start function and returns null.
 * - __updateCart__ - In a transaction, removes zero quantity line items, removes line items for in-store pickup, and copies data to system objects based on the form bindings.
 * Returns a JSON object with parameters for the template.
 * - __error__ - returns null.
 *
 * __Note:__ The CartView sets the ContinueURL to this function, so that any time URLUtils.continueURL() is used in the cart.isml, this function is called.
 * Several actions have <b>formgroup</b> as an input parameter. The formgroup is supplied by the {@link module:models/FormModel~FormModel/handleAction|FormModel handleAction} function in the FormModel module.
 * The formgroup is session.forms.cart object of the triggered action in the form definition. Any object returned by the function for an action is passed in the parameters to the cart template
 * and is accessible using the $pdict.property syntax. For example, if a function returns {CouponStatus: status} is accessible via ${pdict.CouponStatus}
 * Most member functions return a JSON object that contains {cart: cart}. The cart property is used by the CartView to determine the value of
 * $pdict.Basket in the cart.isml template.
 *
 * For any member function that returns an object, the page metadata is updated, the function gets a ContentModel that wraps the cart content asset,
 * and the checkout/cart/cart template is rendered.
 *
 */
function submitForm() {
    // There is no existing state, so resolve the basket again.
    var cart, formResult, cartForm, cartAsset, pageMeta;
    cartForm = app.getForm('cart');
    cart = app.getModel('Cart').goc();
    
    if (cart) {
    	revalidateGiftCertificatePayment();    
    	
    }
    
    //Check if customer is eligible for express checkout
    var isExpressCheckout = false;
    var paymentMethod = '';
    if(cart && cart.getPaymentInstruments()){    	
		var paymentInstruments = cart.getPaymentInstruments();
		for(var i=0; i< paymentInstruments.length; i++) {
			if((paymentInstruments[i].getPaymentMethod() =='AFTERPAY_PBI')){
				paymentMethod = 'AFTERPAY_PBI';
				break;
			}
	    }
    }
    
    var PromoTrigger = false;
    if (customer.authenticated && customer.registered && !empty(customer.profile.addressBook.preferredAddress) && !empty(customer.profile.wallet.paymentInstruments) && paymentMethod!='AFTERPAY_PBI') {
    	isExpressCheckout = true;
     }
    session.custom.NoCall = true;
    securityHeader.setSecurityHeaders();
    formResult = cartForm.handleAction({
        //Add a coupon if a coupon was entered correctly and is active.
        'addCoupon': function (formgroup) {
            var CSRFProtection = require('dw/web/CSRFProtection');

            if (!CSRFProtection.validateRequest()) {
                app.getModel('Customer').logout();
                app.getView().render('csrf/csrffailed');
                return null;
            }
            var hasSORProducts = session.custom.hasSORProducts? session.custom.hasSORProducts: false;
            var status;
            var result = {
                cart: cart,
                EnableCheckout: true,
                dontRedirect: false
            };

            if (formgroup.couponCode.htmlValue && !hasSORProducts) {
                status = cart.addCoupon(formgroup.couponCode.htmlValue);
                var promoId = Site.getCurrent().getCustomPreferenceValue('samplePromotionID');
                var bonusDiscountLineItems = cart.getBonusDiscountLineItems();
                var bonusDiscountLineItem;
                for (var i = 0; i <  bonusDiscountLineItems.length; i++) {
                	bonusDiscountLineItem = bonusDiscountLineItems[i];
                	if (bonusDiscountLineItem.getPromotion().ID != promoId) {
                		status.CouponStatus = 'APPLIED';
                	}
                }
               
                if (status && typeof(status.CouponStatus) != 'undefined') {
                    if(status.CouponStatus == 'APPLIED') {
                        session.custom.Coupon = JSON.stringify({
                            status: status.CouponStatus,
                            code: formgroup.couponCode.htmlValue
                        });
                    }else{
                         var couponLineItem = cart.getCouponLineItem(formgroup.couponCode.htmlValue);
                         if(!empty(couponLineItem)) {
                             Transaction.wrap(function () {
                                 cart.removeCouponLineItem(couponLineItem);
                            });
                         }
                         session.custom.Coupon = JSON.stringify({
                             status: status.CouponStatus,
                             code: formgroup.couponCode.htmlValue
                         });
                    }
                    
                } else {
                    // no status means valid but inactive coupon
                    result.CouponError = 'NO_ACTIVE_PROMOTION';
                    session.custom.Coupon = JSON.stringify({
                    	code : formgroup.couponCode.htmlValue,
            			status : result.CouponError
                	});
                }
            } else if (formgroup.couponCode.htmlValue && hasSORProducts){
                result.CouponError = 'AUTODELIVERY_ENABLED';
                session.custom.Coupon = JSON.stringify({
                	status : result.CouponError
                });
            } else {
                // no coupon code supplied
                result.CouponError = 'COUPON_CODE_MISSING';
                session.custom.Coupon = JSON.stringify({
        			status : result.CouponError
            	});
            }
            PromoTrigger = true;
            session.custom.promotrigger = true;
            return result;
        },
        'calculateTotal': function () {
            // Nothing to do here as re-calculation happens during view anyways
            return {
                cart: cart
            };
        },
        'checkoutCart': function () {
            var validationResult, result;
          
            validationResult = cart.validateForCheckout();

            
            if (validationResult.EnableCheckout) {
                //app.getController('COCustomer').Start();
            	if(customer.authenticated && customer.registered && !empty(customer.profile.addressBook.preferredAddress) && empty(customer.profile.wallet.paymentInstruments)){
            		//patch fix for RDMP-1929(payment methods in disabled state - GC + normal product)            		 
            		if((dw.system.Site.current.getCustomPreferenceValue('enableSinglePageCheckout')) && cart.object && (cart.object.productLineItems.length > 0) && cart.object.defaultShipment &&(cart.object.defaultShipment.shippingMethodID === 'productMatrix_GiftCard')){
            			response.redirect(URLUtils.https('COShipping-Start'));
            		}else{
                		response.redirect(URLUtils.https('COBilling-Start'));
            		}
            	}else {
            		response.redirect(URLUtils.https('COCustomer-Start'));
            	}

            } else {
                result = {
                    cart: cart,
                    BasketStatus: validationResult.BasketStatus,
                    EnableCheckout: validationResult.EnableCheckout
                };
            }
            return result;
        },
        'continueShopping': function () {
            continueShopping();
            return null;
        },
        'deleteCoupon': function (formgroup) {
            Transaction.wrap(function () {
                cart.removeCouponLineItem(formgroup.getTriggeredAction().object);
            });
            
            if(cart.object.couponLineItems.empty==true) {
            	session.custom.Coupon = JSON.stringify({
        			deleteStatus : true,
        			code : formgroup.couponCode.htmlValue
            	});
            	formgroup.couponCode.setValue(null);
            }
            PromoTrigger = true;
            session.custom.promotrigger = true;
            
            return {
                cart: cart
            };
        },
        'deleteGiftCertificate': function (formgroup) {
            Transaction.wrap(function () {
                cart.removeGiftCertificateLineItem(formgroup.getTriggeredAction().object);
            });

            return {
                cart: cart
            };
        },
        'deleteProduct': function (formgroup) {
            Transaction.wrap(function () {                
                cart.removeProductLineItem(formgroup.getTriggeredAction().object);
                cart.checkGiftItem();
                GiftSet.checkGiftBuilderItem(cart);
                cart.updateCoupons();
            });
                   // Smart Order Refill Modification - Begin
            if (dw.system.Site.getCurrent().getCustomPreferenceValue('SorEnabled')) {
                require('int_smartorderrefill/cartridge/scripts/smartOrderRefill/refillHelper.js').checkForRefillProducts();
            }
            // Smart Order Refill Modification - End
            removeGiftWrapIfIneligible();
            removeGiftMsgIfCartIsEmpty();
            session.custom.NoCall = true;
            
            return {
                cart: cart,
                edit: true
            };
        },
        'editLineItem': function (formgroup) {
            var product, productOptionModel;
            product = app.getModel('Product').get(request.httpParameterMap.pid.stringValue).object;
            productOptionModel = product.updateOptionSelection(request.httpParameterMap);

            Transaction.wrap(function () {
                cart.updateLineItem(formgroup.getTriggeredAction().object, product, request.httpParameterMap.Quantity.doubleValue, productOptionModel);
                cart.checkGiftItem();
                GiftSet.checkGiftBuilderItem(cart);
                cart.calculate();
                cart.updateCoupons();                
            });
            
            session.custom.NoCall = true;
            
            ISML.renderTemplate('checkout/cart/refreshcart');
            
            return {
                edit: true
            };
        },
        'updateCart': function () {

        	var params = request.httpParameterMap;
            Transaction.wrap(function () {
                var shipmentItem, item;
                var prdQtyMob = params.prdQtyMob.value;
                var prdIdMob = params.prdIdMob.value;
                // remove zero quantity line items
                for (var i = 0; i < session.forms.cart.shipments.childCount; i++) {
                    shipmentItem = session.forms.cart.shipments[i];

                    for (var j = 0; j < shipmentItem.items.childCount; j++) {
                        item = shipmentItem.items[j];
                        //setting item quantity in case of mobile
                        if(prdQtyMob && prdIdMob && (prdIdMob == item.object.productID)){
                        	item.quantity.value = parseInt(prdQtyMob);
                        }
                        
                        if (item.quantity.value === 0) {
                            cart.removeProductLineItem(item.object);
                        }
                        
                        //Validate MaxOrderQuantity
                        var defaultMaxQty = Site.getCurrent().getCustomPreferenceValue('maxOrderQuantity');
                        var maxQty = !empty(item.object.product.custom.maxOrderQuantity) ? item.object.product.custom.maxOrderQuantity : defaultMaxQty;
                        if (maxQty && item.quantity.value > maxQty) {
                        	item.quantity.value = maxQty;
                        	session.custom.maxQtyError = dw.web.Resource.msgf('cart.maxqtyerror', 'checkout', null, item.object.product.name);
                        }
                    }
                }

                session.forms.cart.shipments.accept();
                cart.checkInStoreProducts();
                cart.checkGiftItem();
                GiftSet.checkGiftBuilderItem(cart);
                cart.updateCoupons();
            });

            session.custom.NoCall = true;
            
            return {
                cart: cart,
                EnableCheckout: true,
                edit: true
            };
        },
        'error': function () {
            return null;
        }
    });
    
    if(request.httpParameterMap.scope == 'shipping') {
    	response.redirect(URLUtils.https('COShipping-Start'));
    	return;
    } else if(request.httpParameterMap.scope == 'billing') {
    	response.redirect(URLUtils.https('COBilling-Start'));
    	return;
    } else if(request.httpParameterMap.scope == 'summary') {
    	response.redirect(URLUtils.https('COSummary-Start'));
    	return;
    } else {}

    if (formResult) {
        cartAsset = app.getModel('Content').get('cart');

        pageMeta = require('~/cartridge/scripts/meta');
        pageMeta.update(cartAsset);
        
        if (formResult.dontRedirect) {
            app.getView({
                Basket: formResult.cart.object,
                PromoTrigger: PromoTrigger,
                EnableCheckout: formResult.EnableCheckout,
                CouponStatus: formResult.CouponStatus,
                CouponError: formResult.CouponError,
                isExpressCheckout : isExpressCheckout,
                edit : formResult.edit
            }).render('checkout/cart/cart');
        } else {
        	if(!Site.getCurrent().getCustomPreferenceValue('klaviyo_enabled')) {
        		response.redirect(URLUtils.https('Cart-Show'));
        	} else {
        		response.redirect(URLUtils.https('Cart-Show', 'edit', (formResult.edit)?'true':'false'));
        	}
        }
    }
}

/**
 * Adds or replaces a product in the cart, gift registry, or wishlist.
 * If the function is being called as a gift registry update, calls the
 * {@link module:controllers/GiftRegistry~replaceProductListItem|GiftRegistry controller ReplaceProductListItem function}.
 * The httpParameterMap source and cartAction parameters indicate how the function is called.
 * If the function is being called as a wishlist update, calls the
 * {@link module:controllers/Wishlist~replaceProductListItem|Wishlist controller ReplaceProductListItem function}.
 * If the product line item for the product to add has a:
 * - __uuid__ - gets a ProductModel that wraps the product and determines the product quantity and options.
 * In a transaction, calls the {@link module:models/CartModel~CartModel/updateLineItem|CartModel updateLineItem} function to replace the current product in the line
 * item with the new product.
 * - __plid__ - gets the product list and adds a product list item.
 * Otherwise, adds the product and checks if a new discount line item is triggered.
 * Renders the checkout/cart/refreshcart template if the httpParameterMap format parameter is set to ajax,
 * otherwise renders the checkout/cart/cart template.
 */
function addProduct() {
	/* Queue-It changes start */
	if (session.custom.ajaxredirecturl) {
		const qtemplate = '/queueit/queueiterror.isml';
		const queueItHeaderName = 'X-SF-CC-QUEUEIT';
		response.addHttpHeader(queueItHeaderName, session.custom.ajaxredirecturl );
		app.getView().render(qtemplate);
	}
	/* Queue-It changes end */
	var cart = app.getModel('Cart').goc();
    var errorString ='';
    var hasQtyReached = cart.isMaxQtyReached();
    var page = request.httpParameterMap.page ? request.httpParameterMap.page.stringValue : null;
    var cartAction = request.httpParameterMap.cartAction;
    if(hasQtyReached) {
    	errorString = Resource.msgf('cart.maxqtyerror', 'checkout', null, hasQtyReached);
    	if (page !== 'bag' && page !== 'account') {
    		app.getView({
        		error:errorString
        	}).render('product/addtocarterror');            
        	return false;
    	}
    }
    
    session.custom.NoCall = true;
    var hasSOREnabled = request.httpParameterMap.hasSmartOrderRefill? request.httpParameterMap.hasSmartOrderRefill.booleanValue : false;
    var hasCouponApplied = (!empty(cart.getCouponLineItems()) && cart.getCouponLineItems().length > 0) ? true: false;

    if(hasCouponApplied && hasSOREnabled){
        let r = require('~/cartridge/scripts/util/Response');
        r.renderJSON({
            error: true,
            hasCouponApplied: hasCouponApplied,
            message: Resource.msgf('cart.AUTODELIVERY_ENABLED_PPage', 'checkout', null),
        });
        return;
    }else{
        var renderInfo = cart.addProductToCart();
        var pageInfo = null;
        var productInfo = null;
        var cartQuantity = null;
        var params = request.httpParameterMap;


        // Smart Order Refill Modification - Begin
        if (dw.system.Site.getCurrent().getCustomPreferenceValue('SorEnabled')) {
            require('int_smartorderrefill/cartridge/controllers/SmartOrderRefillController.js').UpdateCartProductRefillInformation();
        }
        // Smart Order Refill Modification - End


        pageInfo = request.httpParameterMap.pageInfo ? request.httpParameterMap.pageInfo.value : null;

        if (renderInfo.source === 'giftregistry') {
            app.getView().render('account/giftregistry/refreshgiftregistry');
        } else if (renderInfo.template === 'checkout/cart/cart') {
            app.getView('Cart', {
                Basket: cart
            }).render(renderInfo.template);
        } else if (renderInfo.format === 'ajax') {
            if(pageInfo === 'addToBag') {
                productInfo = cart.getProductLineItems(params.pid.value);
                cartQuantity = cart.getTotalCartQuantity();
                var quantity = parseInt(request.httpParameterMap.Quantity.value);
//    		app.getView('Cart', {
//                cart: cart,
//                product: productInfo,
//                lastAddedQuantity: quantity,
//                cartQuantity: cartQuantity,
//                error: errorString,
//                BonusDiscountLineItem: renderInfo.BonusDiscountLineItem
//            }).render('product/components/addtobagmodal');
                if (dw.system.Site.getCurrent().getCustomPreferenceValue('UseSfraMiniBag')) {
                    response.redirect(URLUtils.url('CartSFRA-MiniCartShow',"cartAction",cartAction));
                } else {
                    response.redirect(URLUtils.url('MiniCart-Show',"cartAction",cartAction));
                }

            } else {
                app.getView('Cart', {
                    cart: cart,
                    BonusDiscountLineItem: renderInfo.BonusDiscountLineItem
                }).render(renderInfo.template);
            }
        } else {
            response.redirect(URLUtils.url('Cart-Show',"cartAction","add"));
        }
    }
}

/**
 * Displays the current items in the cart in the minicart panel.
 */
function miniCart() {

    var cart = app.getModel('Cart').get();
    var currentParameterMap = request.httpParameterMap;
    var isUpdatedDesign = currentParameterMap.isUpdatedDesign ? currentParameterMap.isUpdatedDesign.booleanValue : '';
    
    app.getView({
    	isUpdatedDesign: isUpdatedDesign,
        Basket: cart ? cart.object : null
    }).render('checkout/cart/minicart');

}



function addGiftWrap() {
	var giftWrapId = Site.getCurrent().getCustomPreferenceValue('GiftWrapId');
	 var cart = app.getModel('Cart').goc();
	 
	 var plis = cart.getProductLineItems();
	 if(plis.length && !cart.checkCartHasGiftWrap()) {
	  var params = request.httpParameterMap;
	        var Product = app.getModel('Product');
	        var productOptionModel;
	        var previousBonusDiscountLineItems = cart.getBonusDiscountLineItems();

	        var productToAdd = Product.get(giftWrapId);
	        productOptionModel = productToAdd.updateOptionSelection(params);
	        cart.addProductItem(productToAdd.object, 1, productOptionModel);
	 }

	 var currentHttpParameterMap = request.httpParameterMap;
	 if (currentHttpParameterMap.scope == 'cart'){
			response.redirect(URLUtils.url('Cart-Show'));
			 }else if(currentHttpParameterMap.scope == 'shipping'){
				 response.redirect(URLUtils.url('COShipping-Start'));
			 }
    
	}




/**
 * Remove a giftwrap to cart.
 *
 */
function removeGiftWrap() {
	var giftWrapId = Site.getCurrent().getCustomPreferenceValue('GiftWrapId');
	var cart = app.getModel('Cart').goc();
	var plis = cart.getProductLineItems();
	for (var i = 0, il = plis.length; i < il; i++) {
	       var item = plis[i];
	       if (item.product.ID == giftWrapId) {
	   Transaction.wrap(function () {
	          cart.removeProductLineItem(item);
	   });
	       }
	 }
	 var currentHttpParameterMap = request.httpParameterMap;
	 if (currentHttpParameterMap.scope == 'cart'){
			response.redirect(URLUtils.url('Cart-Show'));
			 }else if(currentHttpParameterMap.scope == 'shipping'){
				 response.redirect(URLUtils.url('COShipping-Start'));
			 }
    
}



/**
 * Adds the product with the given ID to the wish list.
 *
 * Gets a ProductModel that wraps the product in the httpParameterMap. Uses
 * {@link module:models/ProductModel~ProductModel/updateOptionSelection|ProductModel updateOptionSelection}
 * to get the product options selected for the product.
 * Gets a ProductListModel and adds the product to the product list. Renders the checkout/cart/cart template.
 */
function addToWishlist() {
    var productID, product, productOptionModel, productList, Product;
    Product = app.getModel('Product');

    productID = request.httpParameterMap.pid.stringValue;
    product = Product.get(productID);
    productOptionModel = product.updateOptionSelection(request.httpParameterMap);

    productList = app.getModel('ProductList').get();
    productList.addProduct(product.object, request.httpParameterMap.Quantity.doubleValue, productOptionModel);

    app.getView('Cart', {
        cart: app.getModel('Cart').get(),
        ProductAddedToWishlist: productID
    }).render('checkout/cart/cart');

}

/**
 * Adds a bonus product to the cart.
 *
 * Parses the httpParameterMap and adds the bonus products in it to an array.
 *
 * Gets the bonus discount line item. In a transaction, removes the bonus discount line item. For each bonus product in the array,
 * gets the product based on the product ID and adds the product as a bonus product to the cart.
 *
 * If the product is a bundle, updates the product option selections for each child product, finds the line item,
 * and replaces it with the current child product and selections.
 *
 * If the product and line item can be retrieved, recalculates the cart, commits the transaction, and renders a JSON object indicating success.
 * If the transaction fails, rolls back the transaction and renders a JSON object indicating failure.
 */
function addBonusProductJson() {
    var h, i, j, cart, data, productsJSON, bonusDiscountLineItem, product, lineItem, childPids, childProduct, foundLineItem, Product, isBonusProductPresent;
    cart = app.getModel('Cart').goc();
    Product = app.getModel('Product');
    session.custom.NoCall = true;
    
    if(Site.getCurrent().getCustomPreferenceValue('enableSinglePageCheckout')) {
	    if (request.httpParameterMap.format.stringValue === 'spcheckout') {
	    	session.custom.checkoutState = (session.custom.checkoutState)?session.custom.checkoutState:'';
	    	session.custom.checkoutMode = (session.custom.checkoutMode)?session.custom.checkoutMode:'';
	    	session.custom.NoCall = false;
	    }
    }
    
    // parse bonus product JSON
    data = JSON.parse(request.httpParameterMap.getRequestBodyAsString());
    productsJSON = new ArrayList();

    for (h = 0; h < data.bonusproducts.length; h += 1) {
        // add bonus product at index zero (front of the array) each time
        productsJSON.addAt(0, data.bonusproducts[h].product);
    }

    bonusDiscountLineItem = cart.getBonusDiscountLineItemByUUID(request.httpParameterMap.bonusDiscountLineItemUUID.stringValue);

    Transaction.begin();
    cart.removeBonusDiscountLineItemProducts(bonusDiscountLineItem);
    if(!empty(bonusDiscountLineItem) && !empty(bonusDiscountLineItem.getBonusProductLineItems())) {
    	isBonusProductPresent = true;
    }

    for (i = 0; i < productsJSON.length; i += 1) {

        product = Product.get(productsJSON[i].pid).object;
        lineItem = cart.addBonusProduct(bonusDiscountLineItem, product, new ArrayList(productsJSON[i].options), parseInt(productsJSON[i].qty));

        if (lineItem && product) {
            if (product.isBundle()) {

                childPids = productsJSON[i].childPids.split(',');

                for (j = 0; j < childPids.length; j += 1) {
                    childProduct = Product.get(childPids[j]).object;

                    if (childProduct) {



                        var UpdateProductOptionSelections = require('app_core_tatcha_core/cartridge/scripts/cart/UpdateProductOptionSelections');
                        UpdateProductOptionSelections.update({
                            SelectedOptions: new ArrayList(productsJSON[i].options),
                            Product: childProduct
                        });

                        foundLineItem = cart.getBundledProductLineItemByPID(lineItem.getBundledProductLineItems(),
                            (childProduct.isVariant() ? childProduct.masterProduct.ID : childProduct.ID));

                        if (foundLineItem) {
                            foundLineItem.replaceProduct(childProduct);
                            isBonusProductPresent = true;
                        }
                    }
                }
            }
        } else {
            Transaction.rollback();

            let r = require('~/cartridge/scripts/util/Response');
            r.renderJSON({
                success: false
            });
            return;
        }
    }
    
    var promoId = Site.getCurrent().getCustomPreferenceValue('samplePromotionID');
    var bonusDiscountLineItems = cart.getBonusDiscountLineItems();
    var bonusDiscountLineItem;
    var couponLineItem;
    for (var i = 0; i <  bonusDiscountLineItems.length; i++) {
    	bonusDiscountLineItem = bonusDiscountLineItems[i];
    	if (bonusDiscountLineItem.getPromotion().ID != promoId && !isBonusProductPresent) {
    		var couponLineItems = cart.getCouponLineItems();
    		for (var i = 0; i <  couponLineItems.length; i++) {
    			couponLineItem = couponLineItems[i];
    		    session.custom.Coupon = JSON.stringify({
    		    	status : "APPLIED",
	    			code : couponLineItem.getCouponCode()
    		    });
    		}
    	}
    }

    cart.calculate();
    Transaction.commit();
    
    var bonusDiscountLineItems = cart.getBonusDiscountLineItems();
    var couponLineItems = cart.getCouponLineItems();
    if (productsJSON.length == 0) {
    	for (var i = 0; i <  couponLineItems.length; i++) {
    		couponLineItem = couponLineItems[i];
    		Transaction.wrap(function () {
    			cart.removeCouponLineItem(couponLineItem);
            	session.custom.Coupon = JSON.stringify({
            			deleteStatus : true,
            			code : couponLineItem.getCouponCode()
                });
    		});
    	}
    }

    
    let r = require('~/cartridge/scripts/util/Response');
    r.renderJSON({
        success: true
    });
}

/**
 * Adds a coupon to the cart using JSON.
 *
 * Gets the CartModel. Gets the coupon code from the httpParameterMap couponCode parameter.
 * In a transaction, adds the coupon to the cart and renders a JSON object that includes the coupon code
 * and the status of the transaction.
 *
 */
function addCouponJson() {
    var couponCode, cart, couponStatus, result;

    couponCode = request.httpParameterMap.couponCode.stringValue;
    cart = app.getModel('Cart').goc();
    var hasSORProducts = session.custom.hasSORProducts? session.custom.hasSORProducts: false;

    if(!empty(couponCode) && !hasSORProducts) {
     Transaction.wrap(function () {
             result = cart.addCoupon(couponCode);
        });
     var couponStatus = result.CouponStatus;
     if (result && typeof(result.CouponStatus) != 'undefined') {
         var promoId = Site.getCurrent().getCustomPreferenceValue('samplePromotionID');
         var bonusDiscountLineItems = cart.getBonusDiscountLineItems();
         var bonusDiscountLineItem;
         var isGWPPromo = false;
         for (var i = 0; i <  bonusDiscountLineItems.length; i++) {
         	bonusDiscountLineItem = bonusDiscountLineItems[i];
         	if (bonusDiscountLineItem.getPromotion().ID != promoId) {
         		result.CouponStatus = 'APPLIED';
         		isGWPPromo = true;
         	}
         }
         
         var statusError = (result.CouponStatus != 'APPLIED');
         if(statusError){
             var couponLineItem = cart.getCouponLineItem(couponCode);
             if(!empty(couponLineItem)) {
            	 Transaction.wrap(function () {
            		 cart.removeCouponLineItem(couponLineItem);
             	});
             }
         }

         couponStatus = result.CouponStatus;
         
      if(result.CouponStatus == 'APPLIED') {
             revalidateGiftCertificatePayment();     
            }
      couponStatus = result.CouponStatus;
     } else {
      couponStatus = 'NO_ACTIVE_PROMOTION';
     }
    } else if(!empty(couponCode) && hasSORProducts) {
        couponStatus = 'AUTODELIVERY_ENABLED';
    } else {
     couponStatus = 'COUPON_CODE_MISSING';     
    }
    
    if (!couponStatus.error) {
     session.custom.NoCall = true;
    }

    // Customer Info - RDMP-3448
    var currentCustomer = cart.getCustomer();
    var isAuthenticated = !empty(currentCustomer) ? currentCustomer.authenticated : false ;
    var customerInfo = {};
    if(isAuthenticated){
        var singlePageCheckoutUtils = require('int_singlepagecheckout/cartridge/scripts/util/SinglePageCheckoutUtils');
        var params = request.httpParameterMap;
        if(params.selectAddressID) {
            session.custom.selectedShippingAddress = params.selectAddressID.value;
        }
        customerInfo = singlePageCheckoutUtils.getCustomerInfo(cart,currentCustomer);
    }

    if (request.httpParameterMap.format.stringValue === 'ajax') {
        let r = require('~/cartridge/scripts/util/Response');
        r.renderJSON({
            status: couponStatus.CouponStatus,
            message: Resource.msgf('cart.' + couponStatus.code, 'checkout', null, couponCode),
            success: !couponStatus.error,
            baskettotal: cart.object.adjustedMerchandizeTotalGrossPrice.value,
            CouponCode: couponCode,
            customerInfo: customerInfo
        });
        return;
    }
    
    // Single Page Checkout
    if(Site.getCurrent().getCustomPreferenceValue('enableSinglePageCheckout')) {
	    if (request.httpParameterMap.format.stringValue === 'spcheckout') {
	    	session.custom.checkoutState = (session.custom.checkoutState)?session.custom.checkoutState:'';
	    	session.custom.checkoutMode = 'edit';
	    	
	    	var responseCode = '';
	    	var responseMsg = '';
	    	if(couponStatus == 'APPLIED'){
	    		responseCode = 'COUPON_APPLIED';
	    		responseMsg = couponCode+' has been applied';
	    	} else if (couponStatus == 'AUTODELIVERY_ENABLED') {
                responseCode = 'AUTODELIVERY_ENABLED';
                responseMsg = Resource.msgf('cart.' + couponStatus, 'checkout', null, couponCode);
            }  else {
	    		responseCode = 'COUPON_INVALID';
	    		responseMsg = Resource.msgf('cart.' + couponStatus.code, 'checkout', null, couponCode);
	    	}
	    	if(isGWPPromo) {
	    		responseCode = 'COUPON_GWP_APPLIED';
	    		responseMsg = couponCode;
	    	}
	    	
	        app.getView({
                responseCode: responseCode,
                responseMsg: responseMsg
            }).render('singlepagecheckout/rendercheckoutcontainer');
	        return;
	    }
    }  
    
    session.custom.Coupon = JSON.stringify({
  		status : couponStatus,
  		code : couponCode,
  		error: statusError
 	});
    
    if(request.httpParameterMap.scope == 'shipping') {
     response.redirect(URLUtils.https('COShipping-Start'));
    } else if(request.httpParameterMap.scope == 'billing') {
     response.redirect(URLUtils.https('COBilling-Start'));
    } else if(request.httpParameterMap.scope == 'summary') {
     response.redirect(URLUtils.https('COSummary-Start'));
    } else {
     response.redirect(URLUtils.https('Cart-Show'));
    }
}

/**
 * Adds a giftwrap to cart.
 *
 */
function addGiftWrap() {
	var giftWrapId = Site.getCurrent().getCustomPreferenceValue('GiftWrapId');
	var cart = app.getModel('Cart').goc();
	
	var plis = cart.getProductLineItems();
	if(plis.length && !cart.checkCartHasGiftWrap()) {
		var params = request.httpParameterMap;
        var Product = app.getModel('Product');
        var productOptionModel;
        var previousBonusDiscountLineItems = cart.getBonusDiscountLineItems();
        session.custom.NoCall = true;

        var productToAdd = Product.get(giftWrapId);
        productOptionModel = productToAdd.updateOptionSelection(params);
        cart.addProductItem(productToAdd.object, 1, productOptionModel);
	}
	
	 var currentHttpParameterMap = request.httpParameterMap;
	 if (currentHttpParameterMap.scope == 'cart'){
			response.redirect(URLUtils.url('Cart-Show'));
			 }else if(currentHttpParameterMap.scope == 'shipping'){
				 response.redirect(URLUtils.url('COShipping-Start'));
			 }
}


function saveGiftMessage(){
	
    //Add Giftwrap Messages
    var params = request.httpParameterMap;
    var cart = app.getModel('Cart').goc();
    var defaultShipment = cart.getDefaultShipment();
    if(params.giftMessage.value) {
    	Transaction.wrap(function () {
            //defaultShipment.setGift(true);
            defaultShipment.setGiftMessage(params.giftMessage.value);
            
    	});
    } 
    var currentHttpParameterMap = request.httpParameterMap;
	 if (currentHttpParameterMap.scope == 'cart'){
			response.redirect(URLUtils.url('Cart-Show'));
			 }else if(currentHttpParameterMap.scope == 'shipping'){
				 response.redirect(URLUtils.url('COShipping-Start'));
			 }
   
}

function removeGiftMessageSPC() {
    //Remove Giftwrap Messages
    var params = request.httpParameterMap;
    var cart = app.getModel('Cart').goc();
    var defaultShipment = cart.getDefaultShipment();
    if(!params.giftMessage.value) {
    	Transaction.wrap(function () {
            defaultShipment.setGift(false);
            defaultShipment.setGiftMessage(null);
    	});
    } 
    
    var currentHttpParameterMap = request.httpParameterMap;
	 if (currentHttpParameterMap.scope == 'cart'){
		response.redirect(URLUtils.url('Cart-Show'));
	 }else if(currentHttpParameterMap.scope == 'shipping'){
		response.redirect(URLUtils.url('COShipping-Start'));
	 }
}

function removeGiftMessage() {
	
    //Add Giftwrap Messages
    var params = request.httpParameterMap;
    var cart = app.getModel('Cart').goc();
    var defaultShipment = cart.getDefaultShipment();
    if(!params.giftMessage.value) {
    	Transaction.wrap(function () {
            defaultShipment.setGift(false);
            defaultShipment.setGiftMessage(null);
            
    	});
    } 
    var currentHttpParameterMap = request.httpParameterMap;
	 if (currentHttpParameterMap.scope == 'cart'){
			response.redirect(URLUtils.url('Cart-Show'));
			 }else if(currentHttpParameterMap.scope == 'shipping'){
				 response.redirect(URLUtils.url('COShipping-Start'));
			 }
   
}

/**
 * Remove a giftwrap to cart.
 *
 */
function removeGiftWrap() {
	var giftWrapId = Site.getCurrent().getCustomPreferenceValue('GiftWrapId');
	var cart = app.getModel('Cart').goc();
	var plis = cart.getProductLineItems();
	for (var i = 0, il = plis.length; i < il; i++) {
       var item = plis[i];
       if (item.product.ID == giftWrapId) {
			Transaction.wrap(function () {
                cart.removeProductLineItem(item);
			});
       }
	}
	var defaultShipment = cart.getDefaultShipment();
	Transaction.wrap(function () {
        defaultShipment.setGift(false);
        //defaultShipment.setGiftMessage(null);
        defaultShipment.custom.giftFrom = null;
        defaultShipment.custom.giftTo = null;
	});
	session.custom.NoCall = true;
	 var currentHttpParameterMap = request.httpParameterMap;
	 if (currentHttpParameterMap.scope == 'cart'){
		 response.redirect(URLUtils.url('Cart-Show'));
	 }else if(currentHttpParameterMap.scope == 'shipping'){
		 response.redirect(URLUtils.url('COShipping-Start'));
	 }
}

function removeCoupon() {
	var lineItemID = request.httpParameterMap.lineItem.value;
	var couponCode = request.httpParameterMap.couponCode.stringValue;
	var cart = app.getModel('Cart').goc();
	var coupons = cart.object.couponLineItems;
	for(var key in coupons) {
		var coupon = coupons[key];
		if(coupon.UUID == lineItemID) {
			Transaction.wrap(function () {
                cart.removeCouponLineItem(coupon);
            });
		}
	}
	
	session.forms.cart.couponCode.setValue(null);
	session.custom.NoCall = true;
	
	revalidateGiftCertificatePayment();

    // Customer Info - RDMP-3448
    var currentCustomer = cart.getCustomer();
    var isAuthenticated = !empty(currentCustomer) ? currentCustomer.authenticated : false ;
    var customerInfo = {};
    if(isAuthenticated){
        var singlePageCheckoutUtils = require('int_singlepagecheckout/cartridge/scripts/util/SinglePageCheckoutUtils');
        var params = request.httpParameterMap;
        if(params.selectAddressID) {
            session.custom.selectedShippingAddress = params.selectAddressID.value;
        }
        customerInfo = singlePageCheckoutUtils.getCustomerInfo(cart,currentCustomer);
    }
	
	if (request.httpParameterMap.format.stringValue === 'ajax') {
        let r = require('~/cartridge/scripts/util/Response');
        r.renderJSON({
        	status: 'REMOVED',
        	message: Resource.msgf('cart.couponremoved', 'checkout', null, couponCode),
            success: true,
            baskettotal: cart.object.adjustedMerchandizeTotalGrossPrice.value,
            CouponCode: couponCode,
            customerInfo: customerInfo
        });
        return;
    }
	
    // Single Page Checkout
    if(Site.getCurrent().getCustomPreferenceValue('enableSinglePageCheckout')) {
	    if (request.httpParameterMap.format.stringValue === 'spcheckout') {
	    	session.custom.checkoutState = (session.custom.checkoutState)?session.custom.checkoutState:'';
	    	session.custom.checkoutMode = 'edit';
	    	
	    	//Calculate is needed to remove bonus line items
	    	session.custom.NoCall = false;
	        Transaction.wrap(function () {
	            cart.calculate();
	          });
	    	
	        app.getView().render('singlepagecheckout/rendercheckoutcontainer');
	        return;
	    }
    }
    
    session.custom.Coupon = JSON.stringify({
		deleteStatus : true,
		code : couponCode
	});
    
	if(request.httpParameterMap.scope == 'shipping') {
    	response.redirect(URLUtils.https('COShipping-Start'));
    } else if(request.httpParameterMap.scope == 'billing') {
    	response.redirect(URLUtils.https('COBilling-Start'));
    } else if(request.httpParameterMap.scope == 'summary') {
    	response.redirect(URLUtils.https('COSummary-Start'));
    } else {
    	response.redirect(URLUtils.https('Cart-Show'));
    }
}

function summaryUpdate() {
	var cart = app.getModel('Cart').get();

    Transaction.wrap(function () {
        cart.calculate();
    });

    app.getView({
        EnableCheckout: true,
        Basket: cart.object
    }).render('checkout/cart/summary');
}

function addGiftBuilderProducts()
{
	var ids = [];
    var params = request.httpParameterMap;
    var pid = params.pid.stringValue;
    var giftAdded = false;
    var pageInfo = null;
    var productInfo = [];
    var cartQuantity = null;
    var params = request.httpParameterMap;
    pageInfo = request.httpParameterMap.pageInfo ? request.httpParameterMap.pageInfo.value : null;
    if(!empty(params.giftProducts.stringValue)){
    	var ids = JSON.parse(params.giftProducts.stringValue);
    }
    var cart = app.getModel('Cart').goc();
    
    var list = new ArrayList();
    var gift = {'id': pid, 'qty': 1};
    list.add(gift);  
     
    for(var i=0; i < ids.length; i++) {
    	var item = {'id': ids[i], 'qty': 1};
    	list.add(item);    
    }

    var cartResult = cart.addMultipleItems(list);
    session.custom.selectedProductList = '';
    if (params.format.stringValue === 'ajax') {
    	for(var i=0; i < list.length; i++) {
    		var lineItem = cart.getProductLineItems(list[i]['id']);
    		productInfo.push(lineItem);
    	}
		cartQuantity = cart.getTotalCartQuantity();
		var quantity = 1;
		app.getView('Cart', {
	        cart: cart,
	        product: productInfo,
	        lastAddedQuantity: quantity,
	        cartQuantity: cartQuantity,
	        addedPreoducts : list,
	        gift : gift,
	        BonusDiscountLineItem: cartResult.BonusDiscountLineItem
	    }).render('product/components/addtobagmodal');
    }
}

function revalidateGiftCertificatePayment() {
	var cart = app.getModel('Cart').goc();
	if(cart.getGiftCertificatePaymentInstruments().empty == false) {
		Transaction.wrap(function () {
			session.custom.NoCall = false;
			cart.calculate();
			for(var i in cart.getGiftCertificatePaymentInstruments()) {	
				var giftCertificateCode = cart.object.giftCertificatePaymentInstruments[i].giftCertificateCode;
				cart.removeGiftCertificatePaymentInstrument(giftCertificateCode);				
				var gc, newGCPaymentInstrument, gcPaymentInstrument, status, result;

			    if (cart) {
			        // fetch the gift certificate
			        gc = GiftCertificateMgr.getGiftCertificateByCode(giftCertificateCode);

			        if (!gc) {// make sure exists
			            result = new Status(Status.ERROR, GiftCertificateStatusCodes.GIFTCERTIFICATE_NOT_FOUND);
			        } else if (!gc.isEnabled()) {// make sure it is enabled
			            result = new Status(Status.ERROR, GiftCertificateStatusCodes.GIFTCERTIFICATE_DISABLED);
			        } else if (gc.getStatus() === GiftCertificate.STATUS_PENDING) {// make sure it is available for use
			            result = new Status(Status.ERROR, GiftCertificateStatusCodes.GIFTCERTIFICATE_PENDING);
			        } else if (gc.getStatus() === GiftCertificate.STATUS_REDEEMED) {// make sure it has not been fully redeemed
			            result = new Status(Status.ERROR, GiftCertificateStatusCodes.GIFTCERTIFICATE_INSUFFICIENT_BALANCE);
			        } else if (gc.balance.currencyCode !== cart.getCurrencyCode()) {// make sure the GC is in the right currency
			            result = new Status(Status.ERROR, GiftCertificateStatusCodes.GIFTCERTIFICATE_CURRENCY_MISMATCH);
			        } else {
			            newGCPaymentInstrument = Transaction.wrap(function () {
			                gcPaymentInstrument = cart.createGiftCertificatePaymentInstrument(gc);			                
			            });

			            status = new Status(Status.OK);
			            status.addDetail('NewGCPaymentInstrument', newGCPaymentInstrument);
			            result = status;
			        }
			    } else {
			        result = new Status(Status.ERROR, 'BASKET_NOT_FOUND');
			    }
			    return result;
			}
			cart.calculate();
		});
	}	
}

function addWhatsNextItems() {
	let r = require('app_storefront_controllers/cartridge/scripts/util/Response');
	var params = request.httpParameterMap;
	var productIds = params.productIds.stringValue;
	if(!empty(productIds)) {
		session.custom.NoCall = true;
		productIds = productIds.split(',');		
		var cart = app.getModel('Cart').goc();
	    
	    var list = new ArrayList();	     
	    for(var i=0; i < productIds.length; i++) {
	    	var item = {'id': productIds[i], 'qty': 1};
	    	list.add(item);    
	    }

	    var cartResult = cart.addMultipleItems(list);
	    r.renderJSON({status: 'success', totalProducts: productIds.length});
		return;
	}
	
	r.renderJSON({status: 'error'});
	return;
}

function addUpsellProducts(){
	var ids = [];
    var params = request.httpParameterMap;
    if(!empty(params.upsellProducts.stringValue)){
    	ids = JSON.parse(params.upsellProducts.stringValue);
    }
    var cart = app.getModel('Cart').goc();
    var list = new ArrayList();
    for(var i=0; i < ids.length; i++) {
    	var item = {'id': ids[i], 'qty': 1};
    	list.add(item);    
    }
    
    var productInfo = [];
    var cartQuantity = null;
    
    var cartResult = cart.addMultipleItems(list);
    if (params.format.stringValue === 'ajax') {
    	for(var i=0; i < list.length; i++) {
    		var lineItem = cart.getProductLineItems(list[i]['id']);
    		productInfo.push(lineItem);
    	}
		cartQuantity = cart.getTotalCartQuantity();
		var quantity = 1;
//		app.getView('Cart', {
//	        cart: cart,
//	        product: productInfo,
//	        lastAddedQuantity: quantity,
//	        cartQuantity: cartQuantity,
//	        useitwith : true,
//	        BonusDiscountLineItem: cartResult.BonusDiscountLineItem
//	    }).render('product/components/addtobagmodal');
        if (dw.system.Site.getCurrent().getCustomPreferenceValue('UseSfraMiniBag')) {
            response.redirect(URLUtils.url('CartSFRA-MiniCartShow'));
        } else {
            response.redirect(URLUtils.url('MiniCart-Show'));
        }
    }
}

/**
 * Adds a product to cart via get call.
 */
function addProductsGetJson() {

	var cart = app.getModel('Cart').goc();
	var params = request.httpParameterMap;
	var productIds = params.productIds.stringValue;
	var status = false;
	let r = require('~/cartridge/scripts/util/Response');
	
	if(!empty(productIds)) {
		var Product = app.getModel('Product');
		var productIdList = productIds.split(',');
		var productId;
		var productOptionModel;

		try {
			if(!empty(productIdList)) {
				Transaction.wrap(function () {
					for (var i = 0; i < productIdList.length; i += 1) {
						productId = Product.get(productIdList[i]).object;
						var productToAdd = Product.get(productId);
						productOptionModel = productToAdd.updateOptionSelection(params);

						session.custom.NoCall = true;

						cart.addProductItem(productToAdd.object, 1, productOptionModel);
					}
				});
				status = true;
			}
		} catch (e) {

		}
	}
	r.renderJSON({
		status: status
	});

	return;
}

/*
 * @date 04-02-2019
 * added for shopping bag screen - gift wrap bs4 changes
 * */

/*
 * method to save 'add gift box' option
 * @date 04-02-2019
 * */
function addGiftWrapBS() {
	var giftWrapId = Site.getCurrent().getCustomPreferenceValue('GiftWrapId');
	var cart = app.getModel('Cart').goc();
	
	var plis = cart.getProductLineItems();
	if(plis.length && !cart.checkCartHasGiftWrap()) {
		var params = request.httpParameterMap;
        var Product = app.getModel('Product');
        var productOptionModel;
        var previousBonusDiscountLineItems = cart.getBonusDiscountLineItems();
        session.custom.NoCall = true;

        var productToAdd = Product.get(giftWrapId);
        productOptionModel = productToAdd.updateOptionSelection(params);
        cart.addProductItem(productToAdd.object, 1, productOptionModel);
	}
}
/*
 * method to remove 'add gift box' option
 * @date 04-02-2019
 * */
function removeGiftWrapBS() {
	var giftWrapId = Site.getCurrent().getCustomPreferenceValue('GiftWrapId');
	var cart = app.getModel('Cart').goc();
	var plis = cart.getProductLineItems();
	for (var i = 0, il = plis.length; i < il; i++) {
       var item = plis[i];
       if (item.product.ID == giftWrapId) {
			Transaction.wrap(function () {
                cart.removeProductLineItem(item);
			});
       }
	}
	var defaultShipment = cart.getDefaultShipment();
	Transaction.wrap(function () {
        defaultShipment.setGift(false);
        //defaultShipment.setGiftMessage(null);
        defaultShipment.custom.giftFrom = null;
        defaultShipment.custom.giftTo = null;
	});
	session.custom.NoCall = true;
}

/*
 * method to save gift message
 * @date 04-02-2019
 * */
function saveGiftMessageBS(){
    //Add Giftwrap Messages
    var params = request.httpParameterMap;
    var cart = app.getModel('Cart').goc();
    var defaultShipment = cart.getDefaultShipment();
    if(params.giftMessage.value ) {
    	Transaction.wrap(function () {
            //defaultShipment.setGift(true);
            defaultShipment.setGiftMessage(params.giftMessage.value);
    	});
    } 
}

/*
 * method to remove gift message when the user clicks on remove message button
 * @date 04-02-2019
 * */

function removeGiftMessageBS() {
    //Remove Giftwrap Messages
    var params = request.httpParameterMap;
    var cart = app.getModel('Cart').goc();
    var defaultShipment = cart.getDefaultShipment();
    if(!params.giftMessage.value) {
    	Transaction.wrap(function () {
            defaultShipment.setGift(false);
            defaultShipment.setGiftMessage(null);
    	});
    } 
}

/*
 * added for saving 'add gift box' option and gift message 
 * @date 04-02-2019
 * */
function saveGiftWrapAndMessage() {
	var currentHttpParameterMap = request.httpParameterMap;
	var gitWrap = currentHttpParameterMap.giftWrapCheckbox.value;
	if(gitWrap && gitWrap === "on") {
		addGiftWrapBS();
	} else {
		removeGiftWrapBS();
	}
	if(currentHttpParameterMap.giftMessage.value) {
		saveGiftMessageBS();
	}else {
		removeGiftMessageBS();
	}
	
    // Single Page Checkout
    if(Site.getCurrent().getCustomPreferenceValue('enableSinglePageCheckout')) {
	    if (request.httpParameterMap.format.stringValue === 'spcheckout') {
	    	session.custom.checkoutState = 'shipping';
	    	session.custom.checkoutMode = 'edit';
	    	session.forms.singleshipping.shippingAddress.giftMessage.value = currentHttpParameterMap.giftMessage.value;
	        app.getView().render('singlepagecheckout/ordersummary');
	        return;
	    }
    } 
    
	if (currentHttpParameterMap.scope == 'cart'){
		 response.redirect(URLUtils.url('Cart-Show'));
	 }else if(currentHttpParameterMap.scope == 'shipping'){
		 response.redirect(URLUtils.url('COShipping-Start'));
	 }	
}


/*
 * added for removing 'add gift box' option if only in-eligible items are there in the shopping bag.
 * (calling while removing gift box eligible items from the shopping bag) 
 * @date 11-Feb-2020
 * */
function removeGiftWrapIfIneligible() {
	var giftWrapId = Site.getCurrent().getCustomPreferenceValue('GiftWrapId');
	var cart = app.getModel('Cart').get();
	if(cart) {
		var plis = cart.getProductLineItems();
		var ineligible = 0;
		var len = plis.length;
		var giftItem = null;
		for (var i = 0; i < len; i++) {
	       var item = plis[i];
	       if(!empty(item.bonusProductLineItem) && item.bonusProductLineItem == false && 
	    		   !empty(item.product.custom.isEligibleForGiftWrap) 
	    		   && item.product.custom.isEligibleForGiftWrap == false && item.productID != giftWrapId) {
	       		ineligible++;
	       }
	       if(item.productID == giftWrapId) {
	       		giftItem = item;
	       }
		}
		if (giftItem && ineligible == (len-1)) {
			Transaction.wrap(function () {
	            cart.removeProductLineItem(giftItem);
			});
			var defaultShipment = cart.getDefaultShipment();
			Transaction.wrap(function () {
		        defaultShipment.setGift(false);
		        //defaultShipment.setGiftMessage(null);
		        defaultShipment.custom.giftFrom = null;
		        defaultShipment.custom.giftTo = null;
			});
			session.custom.NoCall = true;
	     }
	}
}

/*
 * method to remove gift message if the cart is empty 
 * @date 24-02-2019
 * */

function removeGiftMsgIfCartIsEmpty() {
	var params = request.httpParameterMap;
	var cart = app.getModel('Cart').goc();
	var defaultShipment = cart.getDefaultShipment();
	var lineItems = cart.getProductLineItems();
	if (empty(lineItems) && !empty(defaultShipment) && !empty(defaultShipment.getGiftMessage())) {
		Transaction.wrap(function() {
			defaultShipment.setGift(false);
			defaultShipment.setGiftMessage(null);
		});
	}
}

/*
* Module exports
*/

/*
* Exposed methods.
*/
/** Adds a product to the cart.
 * @see {@link module:controllers/Cart~addProduct} */
exports.AddProduct = guard.ensure(['post'], addProduct);
/** Invalidates the login and shipment forms. Renders the basket content.
 * @see {@link module:controllers/Cart~show} */
exports.Show = guard.ensure(['https'], show);
/** Form handler for the cart form.
 * @see {@link module:controllers/Cart~submitForm} */
exports.SubmitForm = guard.ensure(['post', 'https'], submitForm);
/** Redirects the user to the last visited catalog URL.
 * @see {@link module:controllers/Cart~continueShopping} */
exports.ContinueShopping = guard.ensure(['https'], continueShopping);
/** Adds a coupon to the cart using JSON. Called during checkout.
 * @see {@link module:controllers/Cart~addCouponJson} */
exports.AddCouponJson = guard.ensure(['get', 'https'], addCouponJson);
/** Displays the current items in the cart in the minicart panel.
 * @see {@link module:controllers/Cart~miniCart} */
exports.MiniCart = guard.ensure(['get'], miniCart);
/** Adds the product with the given ID to the wish list.
 * @see {@link module:controllers/Cart~addToWishlist} */
exports.AddToWishlist = guard.ensure(['get', 'https', 'loggedIn'], addToWishlist, {
    scope: 'wishlist'
});
/** Adds bonus product to cart.
 * @see {@link module:controllers/Cart~addBonusProductJson} */
exports.AddBonusProduct = guard.ensure(['post'], addBonusProductJson);

exports.AddGiftWrap = guard.ensure(['get'], addGiftWrap);

exports.SaveGiftMessage = guard.ensure(['get'], saveGiftMessage);
exports.RemoveGiftMessage = guard.ensure(['get'], removeGiftMessage);
exports.RemoveGiftMessageSPC = guard.ensure(['get'], removeGiftMessageSPC);
exports.RemoveGiftWrap = guard.ensure(['get'], removeGiftWrap);
exports.RemoveCoupon = guard.ensure(['get', 'https'], removeCoupon);
exports.SummaryUpdate = guard.ensure(['get', 'https'], summaryUpdate);
exports.AddGiftBuilderProducts = guard.ensure(['post'], addGiftBuilderProducts);
exports.AddWhatsnextItems = guard.ensure(['post'], addWhatsNextItems);
exports.AddUpsellProducts = guard.ensure(['post'], addUpsellProducts);
exports.AddProductsGetJson = guard.ensure(['get'], addProductsGetJson);
exports.SaveGiftWrapAndMessage = guard.ensure(['get'], saveGiftWrapAndMessage);
exports.RevalidateGiftCertificatePayment = guard.ensure(['get'], revalidateGiftCertificatePayment);