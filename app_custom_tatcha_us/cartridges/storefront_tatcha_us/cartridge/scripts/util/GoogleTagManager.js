'use strict';

/* Script Modules */
var Site = require('dw/system/Site');
var OrderMgr = require('dw/order/OrderMgr');


/**
 * Used to push product details to GA layer
 *
 * @param product
 * @returns
 */
function getProductPageDataLayer (product) {

	var category : dw.catalog.Category = null;
	category = product.primaryCategory;
	if( category == null && product.variant ) {
		category = product.variationModel.master.primaryCategory;
	}

	var path : dw.util.Collection = new dw.util.ArrayList();

	if( category != null) {
		while( category.parent != null ) {
			if( category.online ) path.addAt( 0, category );
			category = category.parent;
		}
	}

	var categories = [];
	for(var i=0; i < path.length; i++) {
		categories.push(path[i].displayName);
	}

	var prodCategory = "";
	if(categories.length>0){
		prodCategory = categories.join(' > ');
	}

	var dataLayer = {};
	var productId = product.ID;
	/*if (product.variant){
	productId = product.masterProduct.ID;
	}*/
	dataLayer.prodID = productId;
	dataLayer.prodPrice = product.priceModel.getPrice() ? product.priceModel.getPrice().value : '';
	dataLayer.prodCategory = prodCategory;
	dataLayer.prodName = product.getName();
	dataLayer.event = 'tatcha_product_view';
	return dataLayer;
}

/**
 * Used to push order details to GA layer
 *
 * @param orderNumber
 * @returns
 */
function getOrderConfirmationDataLayer(orderNumber) {
    try {
        var dataLayer = {};
        var OrderMgr = require('dw/order/OrderMgr');

        var order = OrderMgr.getOrder(orderNumber);
        if(order && order !== null) {
            var shippingExclDiscounts : dw.value.Money = order.shippingTotalPrice;
            var shippingInclDiscounts : dw.value.Money = order.getAdjustedShippingTotalPrice();
            var shippingDiscount : dw.value.Money = shippingExclDiscounts.subtract( shippingInclDiscounts );
            var shippingTotalCost : dw.value.Money = shippingExclDiscounts.subtract( shippingDiscount );

            dataLayer.transactionId = order.orderNo ? order.orderNo : '';
            dataLayer.transactionAffiliation = 'Tatcha';
            dataLayer.transactionTotal = order.totalGrossPrice ? order.totalGrossPrice.value : '';
            dataLayer.transactionTax = order.totalTax ? order.totalTax.value : '';
            dataLayer.transactionShipping = shippingTotalCost ? shippingTotalCost.value : '';


            // Get the coupon attached to the order
            var discountCoupon = "";
            var shippingLineItems = order.shipments[0].shippingLineItems;
            var shippingLineItem = {};
            var shippingItemsArray = [];
            if(shippingLineItems && shippingLineItems.length > 0){
                if(shippingLineItems[0].lineItemCtnr){
                    var couponLineItems = shippingLineItems[0].lineItemCtnr.couponLineItems;
                    if(couponLineItems && couponLineItems.length > 0){
                        var couponLineItem = {};
                        for(var j in couponLineItems) {
                            if(couponLineItems[j].statusCode == 'APPLIED'){
                                discountCoupon = couponLineItems[j].couponCode;
                                break;
                            }

                        }
                    }
                }

            } else {
                discountCoupon = "";
            }

            dataLayer.discountCoupon = discountCoupon;

            //Customer ID
            dataLayer.customerId = (order.customerNo)?order.customerNo:"";

            // Discounts
            var merchTotalExclOrderDiscounts = order.getAdjustedMerchandizeTotalPrice(false);
            var merchTotalInclOrderDiscounts = order.getAdjustedMerchandizeTotalPrice(true);
            var orderDiscount = merchTotalExclOrderDiscounts.subtract( merchTotalInclOrderDiscounts );
            dataLayer.discount = orderDiscount.value;


            if(dataLayer.transactionTotal ==''){
                dataLayer.transactionTotal = order.merchandizeTotalGrossPrice ? order.merchandizeTotalGrossPrice.value : '';
            }

            if(dataLayer.transactionTax ==''){
                dataLayer.transactionTax = order.merchandizeTotalTax ? order.merchandizeTotalTax.value : '';
            }

            var productList = [];
            for each(var product in order.productLineItems) {
                var productData = {};
                productData.sku = product.product.ID ? product.product.ID : '';
                productData.name= product.product.name ? product.product.name : '';
                productData.price= product.product.priceModel.getPrice() ? product.product.priceModel.getPrice().value : '';
                productData.coupon= '';
                productData.quantity= product.quantity ? product.quantity.value : '';
                productData.category= !empty(product.product.getPrimaryCategory()) ? product.product.getPrimaryCategory().displayName : '';
                productList.push(productData);
            }


            var giftCertificateLineItems = order.giftCertificateLineItems;
            var giftLineItem = {};
            if(giftCertificateLineItems && giftCertificateLineItems.length > 0){
                var LOGGER = dw.system.Logger.getLogger('order');
                LOGGER.warn('In Gift Card - Condition');
                var giftCardId = Site.getCurrent().getCustomPreferenceValue('EgiftProduct-ID');
                var giftCardProduct = dw.catalog.ProductMgr.getProduct(giftCardId);
                for(var j in giftCertificateLineItems) {
                    LOGGER.warn('In Gift Card - Loop');
                    var giftCardData = {};
                    giftLineItem = giftCertificateLineItems[j];
                    var giftCertificateImage = giftLineItem.custom.giftCertificateImage;
                    var giftCertificateImageFileName = '';
                    var giftCertificateImageFileNameWithoutExt = '';
                    if(!empty(giftCertificateImage)) {
                        var giftCertificateImageSplits = giftLineItem.custom.giftCertificateImage.split('/');
                        if(!empty(giftCertificateImageSplits) && giftCertificateImageSplits.length > 0) {
                            giftCertificateImageFileName = giftCertificateImageSplits[giftCertificateImageSplits.length-1];
                            giftCertificateImageFileNameWithoutExt = giftCertificateImageFileName.split('.');
                            if (giftCertificateImageFileNameWithoutExt && giftCertificateImageFileNameWithoutExt.length > 0) {
                                giftCertificateImageFileNameWithoutExt = giftCertificateImageFileNameWithoutExt[0];
                            }

                        }
                    }
                    giftCardData.sku = giftCardProduct.ID ? giftCardProduct.ID : '';
                    giftCardData.name = giftCardProduct.name ? giftCardProduct.name : '';
                    giftCardData.price = giftLineItem.price ? giftLineItem.price.value : '';
                    giftCardData.coupon = '';
                    giftCardData.quantity = 1;
                    giftCardData.giftCertificateImage = giftCertificateImageFileNameWithoutExt;
                    giftCardData.giftCertificateRecommendedItems = !empty(giftLineItem.custom.giftCertificateRecommendedItems) ? giftLineItem.custom.giftCertificateRecommendedItems : '';

                    productList.push(giftCardData);
                }
            }

            dataLayer.transactionProducts = productList;
        }

        return dataLayer;
    } catch (e) {
        var err = e;
        var LOGGER = dw.system.Logger.getLogger('order');
        LOGGER.warn('GTM Error - '+ e.toString());
    }
}

function getCategoryPageDataLayer () {
    var dataLayer = {};
    dataLayer.catID = request.getHttpParameterMap().cgid.value;
    dataLayer.event = "tatcha_category_view";
    return dataLayer;
}

module.exports = {
    getProductPageDataLayer: getProductPageDataLayer,
    getOrderConfirmationDataLayer: getOrderConfirmationDataLayer,
    getCategoryPageDataLayer : getCategoryPageDataLayer
};
