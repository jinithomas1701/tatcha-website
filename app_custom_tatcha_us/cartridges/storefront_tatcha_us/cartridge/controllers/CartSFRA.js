'use strict';

var server = require('server');

var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var Resource = require('dw/web/Resource');

var BasketMgr = require('dw/order/BasketMgr');
var Transaction = require('dw/system/Transaction');
var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
var giftCertHelper = require('*/cartridge/scripts/helpers/giftCertHelper');
var GiftSet = require('*/cartridge/scripts/util/giftset');

var {
    getDefaultCustomerPaypalPaymentInstrument } = require('*/cartridge/scripts/braintree/helpers/customerHelper');
var {
    isPaypalButtonEnabled,
    getAccountFormFields,
    createBillingFormFields
} = require('*/cartridge/scripts/braintree/helpers/paymentHelper');

var {
    createBraintreeSrcButtonConfig,
    createBraintreePayPalButtonConfig,
    createBraintreeGooglePayButtonConfig,
    createBraintreeApplePayButtonConfig
} = require('*/cartridge/scripts/braintree/helpers/buttonConfigHelper');

var btBusinessLogic = require('*/cartridge/scripts/braintree/braintreeAPI/braintreeBusinessLogic');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var prefs = require('*/cartridge/config/braintreePreferences');
var braintreeConstants = require('*/cartridge/scripts/util/braintreeConstants');
var ArrayList = require('dw/util/ArrayList');

/**
 * Cart-Show : The Cart-Show endpoint renders the cart page with the current basket
 * @name Base/Cart-Show
 * @function
 * @memberof Cart
 * @param {middleware} - server.middleware.https
 * @param {middleware} - consentTracking.consent
 * @param {middleware} - csrfProtection.generateToken
 * @param {category} - sensitive
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
server.get(
    'Show',
    server.middleware.https,
    consentTracking.consent,
    csrfProtection.generateToken,
    function (req, res, next) {
        var CartModel = require('*/cartridge/models/cart');
        var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
        var reportingUrlsHelper = require('*/cartridge/scripts/reportingUrls');

        var currentBasket = BasketMgr.getCurrentBasket();
        var reportingURLs;

        <!-- custom code start -->
        session.custom.NoCall = true;
        <!-- custom code end -->

        if (currentBasket) {
            Transaction.wrap(function () {
                if (currentBasket.currencyCode !== req.session.currency.currencyCode) {
                    currentBasket.updateCurrency();
                }
                cartHelper.ensureAllShipmentsHaveMethods(currentBasket);

                basketCalculationHelpers.calculateTotals(currentBasket);
                cartHelper.removePaymentInstruments(currentBasket);
            });
        }

        if (currentBasket && currentBasket.allLineItems.length) {
            reportingURLs = reportingUrlsHelper.getBasketOpenReportingURLs(currentBasket);
        }

        res.setViewData({ reportingURLs: reportingURLs });

        res.setViewData({
            section: 'cart'
        });
        <!-- custom code end -->

        var basketModel = new CartModel(currentBasket);
        res.render('cart/cart', basketModel);
        next();
    }
);


/**
 * Cart-ShowBonusProducts : This endpoint is called when a product with bonus product is added to Cart
 * @name Base/Product-ShowBonusProducts
 * @function
 * @memberof Product
 * @param {querystringparameter} - DUUID - Discount Line Item UUID
 * @param {querystringparameter} - pagesize - Number of products to show on a page
 * @param {querystringparameter} - pagestart - Starting Page Number
 * @param {querystringparameter} - maxpids - Limit maximum number of Products
 * @param {category} - non-sensitive
 * @param {returns} - json
 * @param {serverfunction} - get
 */

server.get('ShowBonusProducts', function (req, res, next) {
    var bonusProductHelper = require('*/cartridge/scripts/helpers/bonusProductHelper');
    var products = [];
    var pStart = req.querystring.pagestart;
    var duuid = req.querystring.DUUID;
    var miniCart = req.querystring.miniCart;
    var collections = require('*/cartridge/scripts/util/collections');
    var Util = require('dw/util');
    var currentBasket = BasketMgr.getCurrentOrNewBasket();
    var selectedBonusProducts;
    var bonusDiscountLineItem;
    var currentBonusLineItems;
    var miniCart = req.querystring.miniCart;

    if (duuid) {
        bonusDiscountLineItem = collections.find(currentBasket.getBonusDiscountLineItems(), function (item) {
            return item.UUID === duuid;
        });

        if (bonusDiscountLineItem && bonusDiscountLineItem.bonusProductLineItems.length) {
            currentBonusLineItems = new Util.ArrayList();
            selectedBonusProducts = collections.map(bonusDiscountLineItem.bonusProductLineItems, function (bonusProductLineItem) {
                var option = {
                    optionid: '',
                    selectedvalue: ''
                };
                if (!bonusProductLineItem.optionProductLineItems.empty) {
                    option.optionid = bonusProductLineItem.optionProductLineItems[0].optionID;
                    option.optionid = bonusProductLineItem.optionProductLineItems[0].optionValueID;
                }
                currentBonusLineItems.add(bonusProductLineItem.productID);
                return {
                    pid: bonusProductLineItem.productID,
                    name: bonusProductLineItem.productName,
                    submittedQty: (bonusProductLineItem.quantityValue),
                    option: option
                };
            });
        } else {
            selectedBonusProducts = [];
        }
        products = bonusProductHelper.getBonusProducts(bonusDiscountLineItem, duuid, pStart);
    }

    var temp = 'product/components/choiceOfBonusProducts/bonusProducts';

    if (req.querystring.usetatchamodal === 'true') {
        temp = 'product/bonusproductlistmodal';
        if (miniCart === 'true') {
            temp = 'product/bonusProductListModalMiniCart';
        }

    }

    // Single Page Checkout
    if(require('dw/system/Site').getCurrent().getCustomPreferenceValue('enableSinglePageCheckout')) {
        if (req.querystring && req.querystring.format.stringValue === 'spcheckout') {
            temp = 'product/bonuscheckoutproductgrid';
        }
    }

    res.render(temp, {
        products: products,
        selectedBonusProducts: selectedBonusProducts,
        maxPids: req.querystring.maxpids,
        maxBonusItems: bonusDiscountLineItem.maxBonusItems,
        uuid: bonusDiscountLineItem.UUID,
        BonusDiscountLineItem: bonusDiscountLineItem,
        pliUUID: '',
        currentBonusLineItems: currentBonusLineItems,
        closeButtonText: Resource.msg('link.choice.of.bonus.dialog.close', 'product', null),
        enterDialogMessage: Resource.msg('msg.enter.choice.of.bonus.select.products', 'product', null)
    });

    next();
});

/**
 * Cart-AddBonusProducts : The Cart-AddBonusProducts endpoint handles adding bonus products to basket
 * @name Base/Cart-AddBonusProducts
 * @function
 * @memberof Cart
 * @param {querystringparameter} - pids - an object containing: 1. totalQty (total quantity of total bonus products) 2. a list of bonus products with each index being an object containing pid (product id of the bonus product), qty (quantity of the bonus product), a list of options of the bonus product
 * @param {querystringparameter} - uuid - UUID of the mian product
 * @param {querystringparameter} - pliuud - UUID of the bonus product line item
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - post
 */
server.post('AddBonusProducts', function (req, res, next) {
    var ProductMgr = require('dw/catalog/ProductMgr');
    var productHelper = require('*/cartridge/scripts/helpers/productHelpers');
    var collections = require('*/cartridge/scripts/util/collections');
    var CartModel = require('*/cartridge/models/cart');
    var currentBasket = BasketMgr.getCurrentOrNewBasket();
    var data = JSON.parse(req.querystring.pids);
    var newBonusDiscountLineItems = currentBasket.getBonusDiscountLineItems();
    var qtyAllowed = data.totalQty;
    var totalQty = 0;

    for (var i = 0; i < data.bonusProducts.length; i++) {
        totalQty += data.bonusProducts[i].qty;
    }

    if (totalQty === 0) {
    		var bonusDiscountLineItem = collections.find(newBonusDiscountLineItems, function (item) {
            	return item.UUID === req.querystring.uuid;
       		 });
     		Transaction.wrap(function () {
                collections.forEach(bonusDiscountLineItem.getBonusProductLineItems(), function (dli) {
                    if (dli.product) {
                        currentBasket.removeProductLineItem(dli);
                    }
                });
          	});
        res.json({
            errorMessage: Resource.msg(
                'error.alert.choiceofbonus.no.product.selected',
                'product',
                null),
            error: true,
            success: false
        });
    } else if (totalQty > qtyAllowed) {
        res.json({
            errorMessage: Resource.msgf(
                'error.alert.choiceofbonus.max.quantity',
                'product',
                null,
                qtyAllowed,
                totalQty),
            error: true,
            success: false
        });
    } else {
        var bonusDiscountLineItem = collections.find(newBonusDiscountLineItems, function (item) {
            return item.UUID === req.querystring.uuid;
        });

        if (currentBasket) {
            Transaction.wrap(function () {
                collections.forEach(bonusDiscountLineItem.getBonusProductLineItems(), function (dli) {
                    if (dli.product) {
                        currentBasket.removeProductLineItem(dli);
                    }
                });

                var pli;
                data.bonusProducts.forEach(function (bonusProduct) {
                    var product = ProductMgr.getProduct(bonusProduct.pid);
                    var selectedOptions = bonusProduct.options;
                    var optionModel = productHelper.getCurrentOptionModel(
                        product.optionModel,
                        selectedOptions
                    );
                    pli = currentBasket.createBonusProductLineItem(
                        bonusDiscountLineItem,
                        product,
                        optionModel,
                        null
                    );
                    pli.setQuantityValue(bonusProduct.qty);
                });
            });
            // fix for GWP promo issue - RDMP-4584
            var uuid = req.querystring.uuid;
            var promoId = dw.system.Site.getCurrent().getCustomPreferenceValue('samplePromotionID');
            if(bonusDiscountLineItem && bonusDiscountLineItem.promotion.ID !== promoId) {
                collections.forEach(currentBasket.productLineItems, function (lineItem) {
                    if (lineItem.bonusDiscountLineItem && (lineItem.bonusDiscountLineItem.UUID !== uuid) && lineItem.bonusDiscountLineItem.promotionID !== promoId) {
                        currentBasket.removeProductLineItem(lineItem);
                    }
                });
            }
        }
         Transaction.wrap(function () {
                basketCalculationHelpers.calculateTotals(currentBasket);
         });

        res.json({
            totalQty: currentBasket.productQuantityTotal,
            msgSuccess: Resource.msg('text.alert.choiceofbonus.addedtobasket', 'product', null),
            success: true,
            error: false
        });
    }
    next();
});

/*
 Controller for adding GIFT WRAP / GIFT MSG
 */
server.post('SaveGiftWrapAndMessage', function (req, res, next) {
    var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
    var giftMessage = dw.util.StringUtils.trim((req.form.giftMessage)?req.form.giftMessage:'');
    var addGift = req.form.addGift;
    var scope = req.form.scope;

    var giftWrapId = dw.system.Site.getCurrent().getCustomPreferenceValue('GiftWrapId');
    var currentBasket = BasketMgr.getCurrentBasket();

    if(giftWrapId && currentBasket) {
        var giftWrapProduct = dw.catalog.ProductMgr.getProduct(giftWrapId);
        var matchingProductObj = cartHelper.getMatchingProducts(giftWrapProduct.ID, currentBasket.productLineItems);

        // Check if already exists
        var giftWrapExistsInCart = false;
        if (matchingProductObj.matchingProducts.length > 0) {
            giftWrapExistsInCart = true;
        }

        // Check add/delete
        if(addGift){
            if(!giftWrapExistsInCart){
                Transaction.wrap(function () {
                    cartHelper.addProductToCart(currentBasket,giftWrapProduct.ID,1,[],[]);
                });
            }
        } else {
            if(giftWrapExistsInCart){
                for (var i = 0; i < matchingProductObj.matchingProducts.length; i++) {
                    Transaction.wrap(function () {
                        currentBasket.removeProductLineItem(matchingProductObj.matchingProducts[i]);
                    });
                }
            }
        }

        // Update Gift Message
        Transaction.wrap(function () {
            currentBasket.getDefaultShipment().setGiftMessage(giftMessage);
        });
    }

    res.redirect(require('dw/web/URLUtils').url('CartSFRA-Show'));
    next();
});

/**
 * Cart-AddCoupon : The Cart-AddCoupon endpoint is responsible for adding a coupon to a basket
 * @name Base/Cart-AddCoupon
 * @function
 * @memberof Cart
 * @param {middleware} - server.middleware.https
 * @param {middleware} - csrfProtection.validateAjaxRequest
 * @param {querystringparameter} - couponCode - the coupon code to be applied
 * @param {querystringparameter} - csrf_token - hidden input field csrf token
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - get
 */
server.get('AddCoupon',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        var URLUtils = require('dw/web/URLUtils');
        var CartModel = require('*/cartridge/models/cart');
        var gwpPromotion = false;
        var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
        var promoId = dw.system.Site.getCurrent().getCustomPreferenceValue('samplePromotionID');
        var curBonusDiscountLineItems;
        var promotion;
        var currentBasket = BasketMgr.getCurrentBasket();
		var section = (req.httpParameterMap.section.value)?req.httpParameterMap.section.value:'';
        if (!currentBasket) {
            res.setStatusCode(500);
            res.json({
                error: true,
                redirectUrl: URLUtils.url('Cart-Show').toString()
            });

            return next();
        }

        if (!currentBasket) {
            res.setStatusCode(500);
            res.json({ errorMessage: Resource.msg('error.add.coupon', 'cart', null) });
            return next();
        }

        // prevent coupon apply if the cart has AD products
        if (session.custom.hasSORProducts) {
            res.json({
                error: true,
                errorMessage: Resource.msg('cart.AUTODELIVERY_ENABLED','checkout', null)
            });
            return next();
        }

        var error = false;
        var errorMessage;

        //Remove existing coupons from basket if any already applied
        var couponLineItems = currentBasket.getCouponLineItems();
        for (var i = 0; i <  couponLineItems.length; i++) {
            Transaction.wrap(function () {
                currentBasket.removeCouponLineItem(couponLineItems[i]);
                basketCalculationHelpers.calculateTotals(currentBasket);
            });
        }

        try {
            Transaction.wrap(function () {
                return currentBasket.createCouponLineItem(req.querystring.couponCode, true);
            });
        } catch (e) {
            error = true;
            var errorCodes = {
                COUPON_CODE_ALREADY_IN_BASKET: 'error.coupon.already.in.cart',
                COUPON_ALREADY_IN_BASKET: 'error.coupon.cannot.be.combined',
                COUPON_CODE_ALREADY_REDEEMED: 'error.coupon.already.redeemed',
                COUPON_CODE_UNKNOWN: 'error.unable.to.add.coupon',
                COUPON_DISABLED: 'error.unable.to.add.coupon',
                REDEMPTION_LIMIT_EXCEEDED: 'error.unable.to.add.coupon',
                TIMEFRAME_REDEMPTION_LIMIT_EXCEEDED: 'error.unable.to.add.coupon',
                NO_ACTIVE_PROMOTION: 'error.unable.to.add.coupon',
                default: 'error.unable.to.add.coupon'
            };

            var errorMessageKey = errorCodes[e.errorCode] || errorCodes.default;
            errorMessage = Resource.msg(errorMessageKey, 'cart', null);
        }

        if (error) {
            res.json({
                error: error,
                errorMessage: errorMessage
            });
            return next();
        }

        //re-validate giftcertificate PI
        cartHelper.revalidateGiftCertificatePayment(currentBasket);

        Transaction.wrap(function () {
            basketCalculationHelpers.calculateTotals(currentBasket);
        });

        var basketModel = new CartModel(currentBasket);

        for (var i = 0; i < currentBasket.bonusDiscountLineItems.length; i++) {
            var promotionID = currentBasket.bonusDiscountLineItems[i].promotionID;
            if (promotionID !== promoId) {
                gwpPromotion = true;
                curBonusDiscountLineItems = currentBasket.bonusDiscountLineItems[i];
                promotion = currentBasket.bonusDiscountLineItems[i].promotion;
            }
        }

        if (gwpPromotion) {
            var bonusProductIDs = [];
            for (var q = 0; q < curBonusDiscountLineItems.bonusProducts.length; q++) {
                bonusProductIDs.push(curBonusDiscountLineItems.bonusProducts[q].ID);
            }

            var temp = 'cart/gwpModal/productCard';
        	if (section === 'minibag') {
            	temp = 'cart/gwpModal/productCardMiniCart';
        	}
            var gwpPromotionHtml = cartHelper.gwpModalProductCard(bonusProductIDs, null,temp);
            res.json({
                gwpPromotionHtml: gwpPromotionHtml,
                gwpPromotion: gwpPromotion,
                maxGwpBonusItem: curBonusDiscountLineItems.getMaxBonusItems(),
                promotionName: promotion.name,
                promotionUUID: promotion.UUID,
                bonusUUID: curBonusDiscountLineItems.UUID
            });
        }

        var cli = currentBasket.getCouponLineItem(req.querystring.couponCode);
        if (!empty(cli) && !cli.applied && !gwpPromotion) {
             Transaction.wrap(function () {
                 currentBasket.removeCouponLineItem(cli);
            });
            res.json({
                error: true,
                errorMessage: Resource.msg('error.unable.to.add.coupon', 'cart', null)
            });
            return next();
        }

        /**
         * Afterpay threshold check
         * @type {boolean}
         */
        var showAfterpayPayment = false;
        showAfterpayPayment = require('*/cartridge/scripts/util/afterpayUtils').showAfterpayPayment();
        if (!empty(currentBasket.getDefaultShipment()) && currentBasket.getDefaultShipment().shippingAddress && !empty(currentBasket.getDefaultShipment().shippingAddress.countryCode)) {
            if (currentBasket.getDefaultShipment().shippingAddress.countryCode.value === 'US' && showAfterpayPayment) {
                showAfterpayPayment = true;
            } else {
                showAfterpayPayment = false;
            }
        }
        res.json({
            showAfterpayPayment: showAfterpayPayment
        })




        if(section == 'minibag' && !gwpPromotion) {

            Transaction.wrap(function () {
                basketCalculationHelpers.calculateTotals(currentBasket);
            });
            basketModel = new CartModel(currentBasket);

            res.setViewData({
                section: 'minibag'
            });
            res.render('checkout/cart/miniCart', basketModel);
        } else {
            if(section == 'minibag'){
                res.setViewData({
                    section: 'minibag'
                });
            }
            res.json(basketModel);
        }
        return next();
    });


    /**
 * Cart-RemoveCouponLineItem : The Cart-RemoveCouponLineItem endpoint is responsible for removing a coupon from a basket
 * @name Base/Cart-RemoveCouponLineItem
 * @function
 * @memberof Cart
 * @param {querystringparameter} - code - the coupon code
 * @param {querystringparameter} - uuid - the UUID of the coupon line item object
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - get
 */
server.get('RemoveCouponLineItem', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var Resource = require('dw/web/Resource');
    var Transaction = require('dw/system/Transaction');
    var URLUtils = require('dw/web/URLUtils');
    var CartModel = require('*/cartridge/models/cart');
    var collections = require('*/cartridge/scripts/util/collections');
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');

    var currentBasket = BasketMgr.getCurrentBasket();

    if (!currentBasket) {
        res.setStatusCode(500);
        res.json({
            error: true,
            redirectUrl: URLUtils.url('Cart-Show').toString()
        });

        return next();
    }

    var couponLineItem;

    if (currentBasket && req.querystring.uuid) {
        couponLineItem = collections.find(currentBasket.couponLineItems, function (item) {
            return item.UUID === req.querystring.uuid;
        });

        if (couponLineItem) {
            Transaction.wrap(function () {
                currentBasket.removeCouponLineItem(couponLineItem);
                basketCalculationHelpers.calculateTotals(currentBasket);
            });

            //re-validate giftcertificate PI
            cartHelper.revalidateGiftCertificatePayment(currentBasket);

            var basketModel = new CartModel(currentBasket);

            /**
             * Afterpay threshold check
             * @type {boolean}
             */
            var showAfterpayPayment = false;
            showAfterpayPayment = require('*/cartridge/scripts/util/afterpayUtils').showAfterpayPayment();
            if (!empty(currentBasket.getDefaultShipment()) && currentBasket.getDefaultShipment().shippingAddress && !empty(currentBasket.getDefaultShipment().shippingAddress.countryCode)) {
                if (currentBasket.getDefaultShipment().shippingAddress.countryCode.value === 'US' && showAfterpayPayment) {
                    showAfterpayPayment = true;
                } else {
                    showAfterpayPayment = false;
                }
            }
            res.json({
                showAfterpayPayment: showAfterpayPayment
            })

            var section = (req.httpParameterMap.section.value)?req.httpParameterMap.section.value:'';
            if(section == 'minibag') {
                res.setViewData({
                    section: 'minibag'
                });
                res.render('checkout/cart/miniCart', basketModel);
            } else {
                res.json(basketModel);
            }
            return next();
        }
    }

    res.setStatusCode(500);
    res.json({ errorMessage: Resource.msg('error.cannot.remove.coupon', 'cart', null) });
    return next();
});


/**
 * Removes the gift certificate from the basket
 */
server.get('RemoveGiftCertLineItem', function (req, res, next) {
    var CartModel = require('*/cartridge/models/cart');
    var renderTemplateHelper = require('*/cartridge/scripts/renderTemplateHelper');
    var giftCertificateLineItemUUID = req.querystring.uuid;
    var giftCertificateLineItem = null;
    var currentBasket = BasketMgr.getCurrentOrNewBasket();
    var giftCertificateLineItems = currentBasket.getGiftCertificateLineItems();
    if (giftCertificateLineItems.length > 0 && !empty(giftCertificateLineItemUUID)) {
        giftCertificateLineItem = giftCertHelper.getGiftCertificateLineItemByUUID(giftCertificateLineItems, giftCertificateLineItemUUID);
    }

    var giftItemDeleted = false;
    if (!empty(giftCertificateLineItem)) {
        Transaction.wrap(function () {
            currentBasket.removeGiftCertificateLineItem(giftCertificateLineItem);
            basketCalculationHelpers.calculateTotals(currentBasket);
            giftItemDeleted = true;
        });
    }

    if (giftItemDeleted) {
        var basketModel = new CartModel(currentBasket);
        var basketModelPlus = {
            basket: basketModel,
            giftLineItemAvailable: giftCertificateLineItems > 1 ? true : false
        };
         var section = (req.httpParameterMap.section.value)?req.httpParameterMap.section.value:'';
            if(section == 'minibag') {
                res.setViewData({
                    section: 'minibag'
                });
                res.render('checkout/cart/miniCart', basketModel);
            } else {
                var renderedTemplate;
        		renderedTemplate = renderTemplateHelper.getRenderedHtml(basketModel, 'cart/cartProductContainer');
        		basketModelPlus.renderedTemplate = renderedTemplate;
        		res.json(basketModelPlus);
            }

    } else {
        res.setStatusCode(500);
        res.json({ errorMessage: Resource.msg('error.cannot.remove.product', 'cart', null) });
    }

    return next();
});
/*
 * method to remove gift message when the user clicks on remove message button
 * */

server.get('removeGiftMessage', function (req, res, next) {
    var renderTemplateHelper = require('*/cartridge/scripts/renderTemplateHelper');
    var CartModel = require('*/cartridge/models/cart');
    var currentBasket = BasketMgr.getCurrentBasket();
    var params = req.httpParameterMap;
    var messageRemoved = false;
    if (!params.giftMessage.value) {
        Transaction.wrap(function () {
            currentBasket.getDefaultShipment().setGiftMessage(null);
            messageRemoved = true;
        });
    }
    if (messageRemoved) {
        res.json({ success: true });
        var renderedTemplate;
        var basketModel = new CartModel(currentBasket);
        var basketModelPlus = {
            basket: basketModel
        };
        renderedTemplate = renderTemplateHelper.getRenderedHtml(basketModel, 'cart/cartProductContainer');
        basketModelPlus.renderedTemplate = renderedTemplate;
        res.json(basketModelPlus);
    } else {
        res.setStatusCode(500);
        res.json({ errorMessage: Resource.msg('error.cannot.remove.product', 'cart', null) });
    }
    return next();
});



/**
 * Cart-AddProduct : The Cart-MiniCart endpoint is responsible for displaying the cart icon in the header with the number of items in the current basket
 * @name Base/Cart-AddProduct
 * @function
 * @memberof Cart
 * @param {httpparameter} - pid - product ID
 * @param {httpparameter} - quantity - quantity of product
 * @param {httpparameter} - options - list of product options
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - post
 */
server.post('AddProduct', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var Resource = require('dw/web/Resource');
    var URLUtils = require('dw/web/URLUtils');
    var Transaction = require('dw/system/Transaction');
    var CartModel = require('*/cartridge/models/cart');
    var ProductLineItemsModel = require('*/cartridge/models/productLineItems');
    var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');

    var currentBasket = BasketMgr.getCurrentOrNewBasket();
    var previousBonusDiscountLineItems = currentBasket.getBonusDiscountLineItems();
    var productId = req.form.pid;
    var childProducts = Object.hasOwnProperty.call(req.form, 'childProducts')
        ? JSON.parse(req.form.childProducts)
        : [];
    var options = req.form.options ? JSON.parse(req.form.options) : [];
    var quantity;
    var result;
    var pidsObj;

    if (currentBasket) {
        Transaction.wrap(function () {
            if (!req.form.pidsObj) {
                quantity = parseInt(req.form.quantity, 10);
                result = cartHelper.addProductToCart(
                    currentBasket,
                    productId,
                    quantity,
                    childProducts,
                    options
                );
            } else {
                // product set
                pidsObj = JSON.parse(req.form.pidsObj);
                result = {
                    error: false,
                    message: Resource.msg('text.alert.addedtobasket', 'product', null)
                };

                pidsObj.forEach(function (PIDObj) {
                    quantity = parseInt(PIDObj.qty, 10);
                    var pidOptions = PIDObj.options ? JSON.parse(PIDObj.options) : {};
                    var PIDObjResult = cartHelper.addProductToCart(
                        currentBasket,
                        PIDObj.pid,
                        quantity,
                        childProducts,
                        pidOptions
                    );
                    if (PIDObjResult.error) {
                        result.error = PIDObjResult.error;
                        result.message = PIDObjResult.message;
                    }
                });
            }

            if (!result.error) {
                //giftset check
                GiftSet.checkGiftBuilderItem(currentBasket);
                cartHelper.ensureAllShipmentsHaveMethods(currentBasket);
                basketCalculationHelpers.calculateTotals(currentBasket);
                cartHelper.updateCoupons(currentBasket);
            }
        });
    }

    var quantityTotal = ProductLineItemsModel.getTotalQuantity(currentBasket.productLineItems);
    var cartModel = new CartModel(currentBasket);

    var urlObject = {
        url: URLUtils.url('Cart-ChooseBonusProducts').toString(),
        configureProductstUrl: URLUtils.url('Product-ShowBonusProducts').toString(),
        addToCartUrl: URLUtils.url('Cart-AddBonusProducts').toString()
    };

    var newBonusDiscountLineItem =
        cartHelper.getNewBonusDiscountLineItem(
            currentBasket,
            previousBonusDiscountLineItems,
            urlObject,
            result.uuid
        );
    if (newBonusDiscountLineItem) {
        var allLineItems = currentBasket.allProductLineItems;
        var collections = require('*/cartridge/scripts/util/collections');
        collections.forEach(allLineItems, function (pli) {
            if (pli.UUID === result.uuid) {
                Transaction.wrap(function () {
                    pli.custom.bonusProductLineItemUUID = 'bonus'; // eslint-disable-line no-param-reassign
                    pli.custom.preOrderUUID = pli.UUID; // eslint-disable-line no-param-reassign
                });
            }
        });
    }

    var reportingURL = cartHelper.getReportingUrlAddToCart(currentBasket, result.error);

    res.json({
        reportingURL: reportingURL,
        quantityTotal: quantityTotal,
        message: result.message,
        cart: cartModel,
        newBonusDiscountLineItem: newBonusDiscountLineItem || {},
        error: result.error,
        pliUUID: result.uuid,
        minicartCountOfItems: Resource.msgf('minicart.count', 'common', null, quantityTotal)
    });

    next();
});

/*
 * added for removing 'add gift box' option if only in-eligible items are there in the shopping bag.
 * (calling while removing gift box eligible items from the shopping bag)
 * @date 11-Feb-2020
 * */
function removeGiftWrapIfIneligible() {
    var giftWrapId = dw.system.Site.getCurrent().getCustomPreferenceValue('GiftWrapId');
    var currentBasket = BasketMgr.getCurrentBasket();
    if(currentBasket) {
        var plis = currentBasket.getProductLineItems();
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
                currentBasket.removeProductLineItem(giftItem);
            });
            var defaultShipment = currentBasket.getDefaultShipment();
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

/**
 * Cart-RemoveProductLineItem : The Cart-RemoveProductLineItem endpoint removes a product line item from the basket
 * @name Base/Cart-RemoveProductLineItem
 * @function
 * @memberof Cart
 * @param {querystringparameter} - pid - the product id
 * @param {querystringparameter} - uuid - the universally unique identifier of the product object
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - get
 */
server.get('RemoveProductLineItem', function (req, res, next) {
    var URLUtils = require('dw/web/URLUtils');
    var CartModel = require('*/cartridge/models/cart');
    var renderTemplateHelper = require('*/cartridge/scripts/renderTemplateHelper');
    var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');

    var currentBasket = BasketMgr.getCurrentBasket();

    if (!currentBasket) {
        res.setStatusCode(500);
        res.json({
            error: true,
            redirectUrl: URLUtils.url('Cart-Show').toString()
        });

        return next();
    }

    var isProductLineItemFound = false;
    var bonusProductsUUIDs = [];

    Transaction.wrap(function () {
        if (req.querystring.pid && req.querystring.uuid) {
            var productLineItems = currentBasket.getAllProductLineItems(req.querystring.pid);
            var bonusProductLineItems = currentBasket.bonusLineItems;
            var mainProdItem;
            for (var i = 0; i < productLineItems.length; i++) {
                var item = productLineItems[i];
                if ((item.UUID === req.querystring.uuid)) {
                    if (bonusProductLineItems && bonusProductLineItems.length > 0) {
                        for (var j = 0; j < bonusProductLineItems.length; j++) {
                            var bonusItem = bonusProductLineItems[j];
                            mainProdItem = bonusItem.getQualifyingProductLineItemForBonusProduct();
                            if (mainProdItem !== null
                                && (mainProdItem.productID === item.productID)) {
                                bonusProductsUUIDs.push(bonusItem.UUID);
                            }
                        }
                    }

                    var shipmentToRemove = item.shipment;
                    currentBasket.removeProductLineItem(item);
                    if (shipmentToRemove.productLineItems.empty && !shipmentToRemove.default) {
                        currentBasket.removeShipment(shipmentToRemove);
                    }
                    isProductLineItemFound = true;
                    removeGiftWrapIfIneligible()
                    break;
                }
            }
        }

        //giftset check
        GiftSet.checkGiftBuilderItem(currentBasket);
        basketCalculationHelpers.calculateTotals(currentBasket);
        cartHelper.updateCoupons(currentBasket);
    });

    //AD change
    session.custom.hasSORProducts = false;
    var productLineItems = currentBasket.getAllProductLineItems().iterator();
    while (productLineItems.hasNext()) {
        var productLineItem = productLineItems.next();
        if (productLineItem.custom.sordeliveryoption) {
            session.custom.hasSORProducts = true;
            break;
        }
    }

    if (isProductLineItemFound) {
        var basketModel = new CartModel(currentBasket);
        var basketModelPlus = {
            basket: basketModel,
            toBeDeletedUUIDs: bonusProductsUUIDs
        };

        var section = (req.httpParameterMap.section.value)?req.httpParameterMap.section.value:'';
        if(section == 'minibag') {
            res.setViewData({
                section: 'minibag'
            });
            res.render('checkout/cart/miniCart', basketModel);
        } else {
            var renderedTemplate;
            renderedTemplate = renderTemplateHelper.getRenderedHtml(basketModel, 'cart/cartProductContainer');
            basketModelPlus.renderedTemplate = renderedTemplate;
            res.json(basketModelPlus);
        }


    } else {
        res.setStatusCode(500);
        res.json({ errorMessage: Resource.msg('error.cannot.remove.product', 'cart', null) });
    }

    return next();
});

/**
 * Cart-UpdateQuantity : The Cart-UpdateQuantity endpoint handles updating the quantity of a product line item in the basket
 * @name Base/Cart-UpdateQuantity
 * @function
 * @memberof Cart
 * @param {querystringparameter} - pid - the product id
 * @param {querystringparameter} - quantity - the quantity to be updated for the line item
 * @param {querystringparameter} -  uuid - the universally unique identifier of the product object
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - get
 */

server.get('UpdateQuantity', function (req, res, next) {
    var URLUtils = require('dw/web/URLUtils');
    var CartModel = require('*/cartridge/models/cart');
    var collections = require('*/cartridge/scripts/util/collections');
    var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');

    var currentBasket = BasketMgr.getCurrentBasket();

    if (!currentBasket) {
        res.setStatusCode(500);
        res.json({
            error: true,
            redirectUrl: URLUtils.url('CartSFRA-Show').toString()
        });

        return next();
    }

    var productId = req.querystring.pid;
    var updateQuantity = parseInt(req.querystring.quantity, 10);
    var uuid = req.querystring.uuid;
    var productLineItems = currentBasket.productLineItems;
    var matchingLineItem = collections.find(productLineItems, function (item) {
        return item.productID === productId && item.UUID === uuid;
    });
    var availableToSell = 0;

    var totalQtyRequested = 0;
    var qtyAlreadyInCart = 0;
    var minOrderQuantity = 0;
    var perpetual = false;
    var canBeUpdated = false;
    var bundleItems;
    var bonusDiscountLineItemCount = currentBasket.bonusDiscountLineItems.length;

    if (matchingLineItem) {
        if (matchingLineItem.product.bundle) {
            bundleItems = matchingLineItem.bundledProductLineItems;
            canBeUpdated = collections.every(bundleItems, function (item) {
                var quantityToUpdate = updateQuantity *
                    matchingLineItem.product.getBundledProductQuantity(item.product).value;
                qtyAlreadyInCart = cartHelper.getQtyAlreadyInCart(
                    item.productID,
                    productLineItems,
                    item.UUID
                );
                totalQtyRequested = quantityToUpdate + qtyAlreadyInCart;
                availableToSell = item.product.availabilityModel.inventoryRecord.ATS.value;
                perpetual = item.product.availabilityModel.inventoryRecord.perpetual;
                minOrderQuantity = item.product.minOrderQuantity.value;
                return (totalQtyRequested <= availableToSell || perpetual) &&
                    (quantityToUpdate >= minOrderQuantity);
            });
        } else {
            availableToSell = matchingLineItem.product.availabilityModel.inventoryRecord.ATS.value;
            perpetual = matchingLineItem.product.availabilityModel.inventoryRecord.perpetual;
            qtyAlreadyInCart = cartHelper.getQtyAlreadyInCart(
                productId,
                productLineItems,
                matchingLineItem.UUID
            );
            totalQtyRequested = updateQuantity + qtyAlreadyInCart;
            minOrderQuantity = matchingLineItem.product.minOrderQuantity.value;
            canBeUpdated = (totalQtyRequested <= availableToSell || perpetual) &&
                (updateQuantity >= minOrderQuantity);
        }
    }

    if (canBeUpdated) {
        Transaction.wrap(function () {
            matchingLineItem.setQuantityValue(updateQuantity);

            var previousBounsDiscountLineItems = collections.map(currentBasket.bonusDiscountLineItems, function (bonusDiscountLineItem) {
                return bonusDiscountLineItem.UUID;
            });

            //giftset check
            GiftSet.checkGiftBuilderItem(currentBasket);
            basketCalculationHelpers.calculateTotals(currentBasket);
            cartHelper.updateCoupons(currentBasket);
            if (currentBasket.bonusDiscountLineItems.length > bonusDiscountLineItemCount) {
                var prevItems = JSON.stringify(previousBounsDiscountLineItems);

                collections.forEach(currentBasket.bonusDiscountLineItems, function (bonusDiscountLineItem) {
                    if (prevItems.indexOf(bonusDiscountLineItem.UUID) < 0) {
                        bonusDiscountLineItem.custom.bonusProductLineItemUUID = matchingLineItem.UUID; // eslint-disable-line no-param-reassign
                        matchingLineItem.custom.bonusProductLineItemUUID = 'bonus';
                        matchingLineItem.custom.preOrderUUID = matchingLineItem.UUID;
                    }
                });
            }
        });
    }

    //re-validate giftcertificate PI
    cartHelper.revalidateGiftCertificatePayment(currentBasket);
    var section = (req.httpParameterMap.section.value)?req.httpParameterMap.section.value:'';

    if (matchingLineItem && canBeUpdated) {
        var basketModel = new CartModel(currentBasket);
        if(section === 'minibag') {
            res.setViewData({
                section: 'minibag'
            });
            res.render('checkout/cart/miniCart', basketModel);
        } else {
            res.json(basketModel);
        }

    } else {
        res.setStatusCode(500);
        res.json({
            errorMessage: Resource.msg('error.cannot.update.product.quantity', 'cart', null)
        });
    }

    return next();
});


/**
 * Gets object with SFRA Checkout, Form Fields
 * @returns {Function} object with valid checkout fields
 */
function getSFRACheckoutFormFields() {
    return getAccountFormFields(createBillingFormFields(), {
        firstName: '',
        lastName: '',
        address1: '',
        address2: '',
        city: '',
        postalCode: '',
        stateCode: '',
        country: '',
        email: '',
        phone: '',
        paymentMethod: ''
    });
}


/**
 * Cart-MiniCartShow : The Cart-MiniCartShow is responsible for getting the basket and showing the contents when you hover over minicart in header
 * @name Base/Cart-MiniCartShow
 * @function
 * @memberof Cart
 * @param {category} - sensitive
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
server.get('MiniCartShow', function (req, res, next) {
    var CartModel = require('*/cartridge/models/cart');
    var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
    var reportingUrlsHelper = require('*/cartridge/scripts/reportingUrls');

    var currentBasket = BasketMgr.getCurrentBasket();
    var reportingURLs;

    if (currentBasket) {
        Transaction.wrap(function () {
            if (currentBasket.currencyCode !== req.session.currency.currencyCode) {
                currentBasket.updateCurrency();
            }
            cartHelper.ensureAllShipmentsHaveMethods(currentBasket);
            basketCalculationHelpers.calculateTotals(currentBasket);
        });
    }
    /*
        var clientToken = btBusinessLogic.getClientToken(currentBasket.getCurrencyCode());
        var payPalButtonConfig = null;
        var paypalBillingAgreementFlow = null;
        var applePayButtonConfig = null;
        var googlepayButtonConfig = null;
        var srcButtonConfig = null;
        var defaultPaypalAddress = null;
        var braintreePaypalAccountData = null;

        if (prefs.paymentMethods.BRAINTREE_PAYPAL.isActive && isPaypalButtonEnabled(braintreeConstants.FLOW_CART)) {
            payPalButtonConfig = createBraintreePayPalButtonConfig(currentBasket, clientToken, braintreeConstants.FLOW_CART);
            var customerPaypalInstruments = getDefaultCustomerPaypalPaymentInstrument();
            if (customerPaypalInstruments) {
                defaultPaypalAddress = customer.getAddressBook().getPreferredAddress();
                if (!empty(defaultPaypalAddress)) {
                    paypalBillingAgreementFlow = true;
                    braintreePaypalAccountData = {
                        address: customerPaypalInstruments.custom.braintreePaypalAccountAddresses,
                        paymentMethod: prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId,
                        email: customerPaypalInstruments.custom.braintreePaypalAccountEmail,
                        uuid: customerPaypalInstruments.getUUID()
                    };
                }
            }
        }

        if (prefs.paymentMethods.BRAINTREE_APPLEPAY.isActive && prefs.applepayVisibilityOnCart) {
            applePayButtonConfig = createBraintreeApplePayButtonConfig(currentBasket, clientToken, braintreeConstants.FLOW_CART);
        }
    */
    if (currentBasket && currentBasket.allLineItems.length) {
        reportingURLs = reportingUrlsHelper.getBasketOpenReportingURLs(currentBasket);
    }

    if (currentBasket && currentBasket.allLineItems.length) {
        reportingURLs = reportingUrlsHelper.getBasketOpenReportingURLs(currentBasket);
    }
/*
    res.setViewData({
        reportingURLs: reportingURLs,
        hasOnlyGiftCertificate : hasOnlyGiftCertificate,
        braintree: {
            prefs: prefs,
            payPalButtonConfig: payPalButtonConfig,
            paypalBillingAgreementFlow: paypalBillingAgreementFlow,
            applePayButtonConfig: applePayButtonConfig,
            googlepayButtonConfig: googlepayButtonConfig,
            srcButtonConfig: srcButtonConfig,
            staticImageLink: prefs.staticImageLink,
            checkoutFromCartUrl: prefs.checkoutFromCartUrl,
            placeOrdeUrl: prefs.placeOrdeUrl,
            sfraCheckoutFormFields: getSFRACheckoutFormFields(),
            braintreePaypalAccountData: braintreePaypalAccountData || {}
        }});
*/

    res.setViewData({
        reportingURLs: reportingURLs
    });

    var basketModel = new CartModel(currentBasket);
    res.setViewData({
        section: 'minibag'
    });
    res.render('checkout/cart/miniCart', basketModel);
    next();
});

/**
 * Cart-EditGwpProducts : The Cart-EditGwpProducts endpoint is responsible for getting Gwp products
 * @name Cart-EditGwpProducts
 * @function
 * @memberof Cart
 * @param {middleware} - server.middleware.https
 * @param {middleware} - csrfProtection.validateAjaxRequest
 * @param {querystringparameter} - ids - the pids already selected
 * @param {returns} - json
 * @param {serverfunction} - post
 */
server.post('EditGwpProducts', function (req, res, next) {
    var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
    var collections = require('*/cartridge/scripts/util/collections');
    var TotalsModel = require('*/cartridge/models/totals');
    var URLUtils = require('dw/web/URLUtils');
    var currentBasket = BasketMgr.getCurrentOrNewBasket();
    var newBonusDiscountLineItems = currentBasket.getBonusDiscountLineItems();
	var section = req.querystring.section;

    var data = JSON.parse(req.querystring.pids);
    var bonusProductIDs = [];

    var bonusDiscountLineItem = collections.find(newBonusDiscountLineItems, function (item) {
        return item.UUID === req.querystring.gwpUUID;
    });

    for (var i = 0; i < bonusDiscountLineItem.bonusProducts.length; i++) {
        bonusProductIDs.push(bonusDiscountLineItem.bonusProducts[i].ID);
    }

    var allProductLineItemsID = [];
    for (var r = 0; r < currentBasket.getAllProductLineItems().length; r++) {
        allProductLineItemsID.push(currentBasket.getAllProductLineItems()[r].productID);
    }
    var totalsModel = new TotalsModel(currentBasket);
    var editGwpProducts = cartHelper.editGwpProductsList(totalsModel.discounts, currentBasket.bonusDiscountLineItems, allProductLineItemsID);
    var temp = 'cart/gwpModal/productCard';
    if (section === 'minibag') {
         temp = 'cart/gwpModal/productCardMiniCart';
    }
    var gwpPromotionHtml = cartHelper.gwpModalProductCard(bonusProductIDs, data, temp);

    res.json({
        gwpPromotionHtml: gwpPromotionHtml,
        editGwpProducts: editGwpProducts,
        actionUrls: {
            removeCouponLineItem: URLUtils.url('CartSFRA-RemoveCouponLineItem').toString()
        },
        maxGwpBonusItem: bonusDiscountLineItem.getMaxBonusItems(),
        promotionName: bonusDiscountLineItem.promotion.name,
        promotionUUID: bonusDiscountLineItem.promotion.UUID,
        bonusUUID: bonusDiscountLineItem.UUID
    });
    return next();
});
/**
 * Cart-AddWhatsNextItems : Add multiple items to cart
 * @name Cart-AddWhatsNextItems
 * @function
 * @memberof Cart
 * @param {serverfunction} - post
 */
 server.post('AddWhatsnextItems', function (req, res, next) {
    var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
    var productIds = req.form.productIds;
    if(!empty(productIds)) {
        session.custom.NoCall = true;
        productIds = productIds.split(',');
        var list = new ArrayList();
	    for(var i=0; i < productIds.length; i++) {
	    	var item = {'id': productIds[i], 'qty': 1};
	    	list.add(item);
	    }
        cartHelper.addMultipleItems(req,list);
        res.json({
            status:'success',
            totalProducts: productIds.length
        });
    }
    return next();
});

module.exports = server.exports();
