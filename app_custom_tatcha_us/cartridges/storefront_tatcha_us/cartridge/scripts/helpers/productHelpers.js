'use strict';

var base = module.superModule;
var Site = require('dw/system/Site');
var Resource = require('dw/web/Resource');
var tatchaUtil = require('*/cartridge/scripts/util/TatchaSfra');
var ProductUtils = require('~/cartridge/scripts/product/ProductUtilsSfra.js');

base.getProductSearchHit = function getProductSearchHit(apiProduct) {
    var ProductSearchModel = require('dw/catalog/ProductSearchModel');
    var searchModel = new ProductSearchModel();
    searchModel.setSearchPhrase(apiProduct.ID);
    searchModel.search();

    if (searchModel.count === 0) {
        searchModel.setSearchPhrase(apiProduct.ID.replace(/-/g, ' '));
        searchModel.search();
    }

    var hit = searchModel.getProductSearchHit(apiProduct);
    if (!hit && searchModel.getProductSearchHits().hasNext()) {
        var tempHit = searchModel.getProductSearchHits().next();
        if (tempHit.firstRepresentedProductID === apiProduct.ID) {
            hit = tempHit;
        }
    }
    return hit;
};

base.showProductPage = function showProductPage(querystring, reqPageMetaData) {
    var URLUtils = require('dw/web/URLUtils');
    var ProductFactory = require('*/cartridge/scripts/factories/product');
    var pageMetaHelper = require('*/cartridge/scripts/helpers/pageMetaHelper');

    var params = querystring;
    var factProduct = ProductFactory.get(params);
    var addToCartUrl = URLUtils.url('CartSFRA-AddProduct');
    var canonicalUrl = URLUtils.url('Product-Show', 'pid', factProduct.id);
    var breadcrumbs = base.getAllBreadcrumbs(null, factProduct.id, []).reverse();

    var template = 'product/productDetailSFRA';

    if (factProduct.productType === 'bundle' && !factProduct.template) {
        template = 'product/bundleDetails';
    } else if (factProduct.productType === 'set' && !factProduct.template) {
        template = 'product/setDetails';
    } else if (factProduct.template) {
        template = factProduct.template;
    }

    pageMetaHelper.setPageMetaData(reqPageMetaData, factProduct);
    pageMetaHelper.setPageMetaTags(reqPageMetaData, factProduct);
    var schemaData = require('*/cartridge/scripts/helpers/structuredDataHelper').getProductSchema(factProduct);

    var ProductMgr = require('dw/catalog/ProductMgr');
    var product = ProductMgr.getProduct(factProduct.id);
    var giftBuilderSKU = Site.getCurrent().getCustomPreferenceValue('giftBuilderSKU');
    var maxOrderQuantity = Site.getCurrent().getCustomPreferenceValue('maxOrderQuantity');
    var hasCartCategory = tatchaUtil.hasCartCategory(product);

    // Added for mParticle and other analytics
    var mParticleEnabled = Site.getCurrent().getCustomPreferenceValue('mParticleEnabled') ? true : false;
    var rscEnabled = Site.getCurrent().getCustomPreferenceValue('EnableRSCADC') ? true : false;
    var mParticleProductJson = {},
    productInfo = {}, 
    productPageView ={},
    lincWidgetProdData = [];
    
    if(mParticleEnabled || rscEnabled) {
        var mParticleHelper = require('int_mParticle/cartridge/scripts/mParticleUtils.js');
        mParticleProductJson = JSON.stringify(mParticleHelper.getProductInfo(product));
    }
    
    //get target location and saved to session
    var browsing = require('*/cartridge/scripts/util/Browsing');
    session.custom.TargetLocation = browsing.lastUrl().toString();

    //Check pdp sort enabled
    var SorEnabled = Site.getCurrent().getCustomPreferenceValue('SorEnabled');

    //Datalayer set from product info
    var TagManagerUtils = require('*/cartridge/scripts/util/GoogleTagManager.js');
    var gtmDataLayer = TagManagerUtils.getProductPageDataLayer(product);
    if (!empty(gtmDataLayer)) { 
        var productPageView = JSON.stringify(gtmDataLayer);
    }
    productInfo.variantId = gtmDataLayer.prodID;
    productInfo.productId = gtmDataLayer.prodID;
    productInfo.name = gtmDataLayer.prodName;
    productInfo.category = gtmDataLayer.prodCategory;
    lincWidgetProdData.push(productInfo);

    //OOS Status
    var oosStatus = base.oosStatus(product);

    //Product datas
    var datas = ProductUtils.pdpDatas(product);

    //Afterpay enable preferences
    var sitePreferences =require("int_afterpay_core/cartridge/scripts/util/afterpayUtilities.js").getSitePreferencesUtilities();
    var afterpayEnable = sitePreferences.isAfterpayEnabled();
    if (afterpayEnable) {
        require('int_afterpay_sfra/cartridge/scripts/util/afterpayCallThreshold.js').setThreshold();
    }

    var productImgVideo = product.custom.autoplayVideoSource.value;
    var videoThumbnailUrl='';

    //getting vimeo thumbnail url
    if (productImgVideo == 'vimeo' && !empty(product.custom.vimeoVideoThumbnailUrl)){
        videoThumbnailUrl = product.custom.vimeoVideoThumbnailUrl;
    }

    //Get variation size context
    var VariationUtils = require('~/cartridge/scripts/product/VariationUtilsSfra.js');    

    //Yotpo rich snippet - aggregate ratings
    var yotpoReviewResponse = {};
    if(!empty(product.custom.yotpoAggregateRating)){
        var yotpoResponse = product.custom.yotpoAggregateRating.split(',');
        yotpoReviewResponse.average_score = yotpoResponse[0];
        yotpoReviewResponse.total_reviews = yotpoResponse[1];
    }

    //Suggested Ritual Data
    var isSkinTypeVariant = ProductUtils.isSkinTypeVariant(product);
    var suggestedRoutine = ProductUtils.getSuggestedRoutine(product,isSkinTypeVariant);
    
    return {
        template: template,
        product: factProduct,
        fullProduct:product,
        addToCartUrl: addToCartUrl,
        resources: base.getResources(),
        breadcrumbs: breadcrumbs,
        canonicalUrl: canonicalUrl,
        schemaData: schemaData,
        DefaultVariant: product.getVariationModel().getDefaultVariant(),
        giftBuilderSKU : giftBuilderSKU,
        maxOrderQuantity: maxOrderQuantity,
        hasCartCategory: hasCartCategory,
        mParticleProductJson: mParticleProductJson,
        SorEnabled: SorEnabled,
        lincWidgetProdData: JSON.stringify(lincWidgetProdData),
        productPageView: productPageView,
        afterpayEnable: afterpayEnable,
        VideoThumbnailUrl: videoThumbnailUrl,
        YotpoReviewResponse: yotpoReviewResponse,
        autoDeliveryCheck: base.autoDeliveryCheck(querystring, reqPageMetaData),
        oosStatus: oosStatus,
        datas:datas,
        VariationUtils:VariationUtils,
        suggestedRoutine:suggestedRoutine
    };
}
base.autoDeliveryCheck = function(querystring, reqPageMetaData) {
    var sorHelper = require("*/cartridge/scripts/smartOrderRefill/refillHelper.js");
    var RefillOptionsModel = require("*/cartridge/models/smartOrderRefill/refillOptions.js");
    var sorEnabled = Site.current.getCustomPreferenceValue("SorEnabled");
    var params = querystring;
    if(sorHelper.verifyLicense() && sorEnabled){
        var refillOptions = new RefillOptionsModel({
            productID: params.pid
        });
        var exclusiveGroup = sorHelper.checkforExclusivelyGroup(customer, refillOptions.sorCG);
        var orderable = refillOptions.product.availabilityModel.orderable;
        if(exclusiveGroup && refillOptions.isSORProduct && orderable && (refillOptions.weekIntervals.enabled || refillOptions.monthIntervals.enabled)){
            return true;
        }
    }
    return false;
}
base.oosStatus = function(product){
    var oosStatus = '';
    var pvm = product.getVariationModel();
    var it = pvm.getProductVariationAttributes().iterator();
    var array = [];
    var options = '';
    var requiredOptions = '';
    while (it.hasNext()) {
        var text = it.next();
        array.push(text.displayName);
    }
    options = array.join(', ');
    var lastIndex = options.lastIndexOf(',');
    if (lastIndex > 0 && options.length > 1 && array.length > 1) {
        requiredOptions = options.substr(0,lastIndex) + ' ' + Resource.msg('product.attributedivider', 'product', null) + options.substr(lastIndex+1, options.length);
    } else {
        requiredOptions = options;
    }
    var buttonTitleDisabledSelectVariation = dw.util.StringUtils.format(Resource.msg('product.missingval','product', null), requiredOptions);
    oosStatus = (product.custom.oosProductStatus.value)?product.custom.oosProductStatus.value:"notifyme";
    return oosStatus;

}
module.exports = base;