'use strict';

var page = module.superModule;

var server = require('server');
var cache = require('*/cartridge/scripts/middleware/cache');
var ProductMgr = require('dw/catalog/ProductMgr');
var productHelper = require('*/cartridge/scripts/helpers/productHelpers');
var productTile = require('*/cartridge/models/product/productTile');

server.extend(page);

server.replace('Show', cache.applyPromotionSensitiveCache, function (req, res, next) {
    var URLUtils = require('dw/web/URLUtils');
    var Site = require('dw/system/Site');
    var mParticleUtils = require('*/cartridge/scripts/mParticleUtils');
	var productInfo = {};
    var showPricing = true;
    var giftItem = false;
    var showQuickview = false;
    var disableBtn = false;
    var ratingLink = '';

    var cgid = req.querystring.cgid ? req.querystring.cgid : '';
    var isGiftLanding = req.querystring.isGiftLanding ? req.querystring.isGiftLanding : false;
	var isGiftfinder = req.querystring.isGiftfinder ? req.querystring.isGiftfinder : false;
    var lazyLoad = req.querystring.enablelazyLoad ? req.querystring.enablelazyLoad : false;
    var enablelazyLoad = lazyLoad == 'true' ? true: false;
    var showCompare = isGiftLanding == 'true' ? false : true;
	var showVarient = isGiftfinder == 'true' ? false : true;
    var updateTile = (req.querystring.updateTile && req.querystring.updateTile == 'true')? true : false;
    var productTileParams = { pview: 'tile' };
    Object.keys(req.querystring).forEach(function (key) {
        productTileParams[key] = req.querystring[key];
    });

    var product;
    var productUrl;
    var quickViewUrl;
    var tileIconViewUrl;

    try {
	    var productId = productTileParams.pid;
        var product = Object.create(null);
        var apiProduct = ProductMgr.getProduct(productId);
        if (apiProduct === null) {
            return product;
        }
        var productType = productHelper.getProductType(apiProduct);
        if (productTileParams.updateTile && productType != 'variationGroup') {
			var variationsProduct = productHelper.getVariationModel(apiProduct, productTileParams.variables);
            if (variationsProduct) {
                apiProduct = variationsProduct.getSelectedVariant() || apiProduct; // eslint-disable-line
                productType = productHelper.getProductType(apiProduct);
            }
		}
		product = productTile(product, apiProduct, productType);
        productUrl = URLUtils.url('Product-Show', 'pid', product.id, 'cgid', cgid).relative().toString();
        quickViewUrl = URLUtils.url('Product-ShowQuickView', 'pid', product.id).relative().toString();
        tileIconViewUrl = URLUtils.url('Tile-ShowProductTileIcons', 'pid', product.id).relative().toString();
    } catch (e) {
        product = false;
        productUrl = URLUtils.url('Home-Show');// TODO: change to coming soon page
        quickViewUrl = URLUtils.url('Home-Show');
    }

    var template = 'product/producthittilev1';
    if (product && product.template) {
        template = product.template;
    }

	var giftBuilderSKU = Site.getCurrent().getCustomPreferenceValue('giftBuilderSKU');
	var eGiftProduct = Site.getCurrent().getCustomPreferenceValue('EgiftProduct-ID');
	if ((giftBuilderSKU && product.id == giftBuilderSKU) || (eGiftProduct && product.id == eGiftProduct)){
		giftItem = true;
		showPricing = false;
	}
	if (product.giftSetId){
		showPricing = false;
	}

    if(updateTile){
        enablelazyLoad = true;
    }
	ratingLink = 'rating-' + product.productName + ', ' + product.secondaryName;
	if (product.id === 'DARK-PEARL-EYE' && !showVarient) {
		showQuickview = true;
	}
	if (!product.specialCategory && product.price && product.price.sales && product.price.sales.value == 0) {
		disableBtn = true;
	}
	if (!disableBtn) {
		productInfo = mParticleUtils.getProductInfoSFRA(product);
	}

    res.render(template, {
        product: product,
        cgid: cgid,
        urls: {
            product: productUrl,
            quickView: quickViewUrl,
            tileIconViewUrl: tileIconViewUrl
        },
        display: {
			showSwatches: false,
            showPricing: showPricing,
            showPromotion: true,
            showRating: product.enableReviewsRatings || false,
            showCompare: showCompare,
            showVarient: showVarient,
            showQuickview: showQuickview,
            giftItem: giftItem,
            giftBuilderSKU: giftBuilderSKU,
            eGiftProduct: eGiftProduct,
            ratingLink: ratingLink,
            disableBtn: disableBtn,
            productInfo: productInfo
		},
        enablelazyLoad: enablelazyLoad
    });

    next();
});

server.get('ShowProductTileIcons', function (req, res, next) {
	var URLUtils = require('dw/web/URLUtils');
	var product;
    var addWLUrl;
    var removeWLUrl;
	var pid = req.querystring.pid || '';
	var productTileParams = { pview: 'tile' };
    Object.keys(req.querystring).forEach(function (key) {
        productTileParams[key] = req.querystring[key];
    });
	var productId = productTileParams.pid;
    var product = Object.create(null);
    var apiProduct = ProductMgr.getProduct(productId);
    if (apiProduct === null) {
        return product;
    }
    var productType = productHelper.getProductType(apiProduct);
    if (productTileParams.updateTile && productType != 'variationGroup') {
		var variationsProduct = productHelper.getVariationModel(apiProduct, productTileParams.variables);
        if (variationsProduct) {
            apiProduct = variationsProduct.getSelectedVariant() || apiProduct; // eslint-disable-line
            productType = productHelper.getProductType(apiProduct);
        }
	}
	product = productTile(product, apiProduct, productType);
	addWLUrl = URLUtils.url('WishlistSfra-AddItemJson', 'pid', pid);
	removeWLUrl = URLUtils.https('WishlistSfra-RemoveItemJson', 'pid', pid);
	res.render('product/components/producttileicons', {
		pid: pid,
		product: product,
		urls: {
            addToWL: addWLUrl,
            removeFromWL: removeWLUrl
        }
	});

	next();
});

server.get('Promo', function (req, res, next) {
	var categoryID = req.querystring.categoryID || '';
	if (session.custom.hasPromoContent && session.custom.hasPromoContent !== null) {
		session.custom.lastPromoCategoryID = categoryID;
		session.custom.hasPromoContent = null;
		delete session.custom.hasPromoContent;
	}
	var promoSessionData = session.custom.catPromoBannerAssetsArray;
	if ((session.custom.lastPromoCategoryID && session.custom.lastPromoCategoryID !== null) && (session.custom.lastPromoCategoryID !== categoryID)) {
		session.custom.catPromoBannerAssetsArray = null;
		promoSessionData = null;
		delete session.custom.catPromoBannerAssetsArray;
	}

	res.render('product/components/categorypagepromo_new', {
		isFirstItem: req.querystring.isFirstItem || false,
		gridPage: req.querystring.gridPage || '',
		index: req.querystring.index || 0,
		initialPosition: req.querystring.initialPosition || '',
		promoSessionData: promoSessionData
	});

	next();
});

module.exports = server.exports();
