var base = module.superModule;

var URLUtils = require('dw/web/URLUtils');
var ProductLineItemsModel = require('*/cartridge/models/productLineItems');
var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
var GiftCertificateLineItemsModel = require('*/cartridge/models/giftCertificateLineItem/giftCertificateLineItems');
var TotalsModel = require('*/cartridge/models/totals');
var Transaction = require('dw/system/Transaction');
var Resource = require('dw/web/Resource');
var Site = require('dw/system/Site');

/**
 * @constructor
 * @classdesc CartModel class that represents the current basket
 *
 * @param {dw.order.Basket} basket - Current users's basket
 * @param {dw.campaign.DiscountPlan} discountPlan - set of applicable discounts
 */
function CartModel(basket) {
    base.call(this, basket);
    if (basket !== null) {
        var totalsModel = new TotalsModel(basket);
        this.bonusDiscountLineItems = basket ? basket.bonusDiscountLineItems : '';
        var productLineItemsModel = new ProductLineItemsModel(basket.productLineItems, 'basket');
        var bonusLineItems = [];
        for (var i = 0; i < productLineItemsModel.items.length; i++) {
            if (productLineItemsModel.items[i].bonusProductLineItemUUID === 'bonus') {
                bonusLineItems.push(productLineItemsModel.items[i]);
            }
        }
        this.bonusLineItems = bonusLineItems;

        // Pairs With Change
        var productLineItemsID = [];

        for (var q = 0; q < productLineItemsModel.items.length; q++) {
            productLineItemsID.push(productLineItemsModel.items[q].id);
        }

        for (var j = 0; j < productLineItemsModel.items.length; j++) {
            if (!empty(productLineItemsModel.items[j].pairsWith)) {
                var pairsWithProductID = productLineItemsModel.items[j].pairsWith;
                productLineItemsModel.items[j].pairsWithProduct = cartHelper.getPairsWithProduct(productLineItemsID, pairsWithProductID);
            }
        }

    //GWP bonus products
        var allProductLineItemsID = [];
        for (var r = 0; r < basket.getAllProductLineItems().length; r++) {
            allProductLineItemsID.push(basket.getAllProductLineItems()[r].productID);
        }

        var editGwpProducts = cartHelper.editGwpProductsList(totalsModel.discounts, basket.bonusDiscountLineItems, allProductLineItemsID);
        this.editGwpProducts = editGwpProducts;
        this.totals = totalsModel;

        var bonusLineItemsArray = [];
        var gwpBonusProducts;

        for (var y = 0; y < productLineItemsModel.items.length; y++) {
            if (productLineItemsModel.items[y].isBonusProductLineItem) {
                bonusLineItemsArray.push(productLineItemsModel.items[y]);
            }
        }

        if (editGwpProducts) {
            for (var p = 0; p < basket.bonusDiscountLineItems.length; p++) {
                if (basket.bonusDiscountLineItems[p].UUID === editGwpProducts.uuid) {
                    gwpBonusProducts = basket.bonusDiscountLineItems[p].bonusProducts;
                }
            }
            for (var i = 0; i < bonusLineItemsArray.length; i++) {
                for (var n = 0; n < gwpBonusProducts.length; n++) {
                    if (gwpBonusProducts[n].ID == bonusLineItemsArray[i].id) {
                        bonusLineItemsArray[i].gwpProduct = true;
                        break;
                    } else {
                        bonusLineItemsArray[i].gwpProduct = false;
                    }
                }
            }
        }

        this.bonusLineItems = bonusLineItems;
        this.items = productLineItemsModel.items;
        // gift certifiacte change
        this.actionUrls.removeGiftCertificate = URLUtils.url('CartSFRA-RemoveGiftCertLineItem').toString();
        var giftCertificateLineItemsModel = new GiftCertificateLineItemsModel(basket.getGiftCertificateLineItems(), 'basket');
        this.giftCertificateItems = giftCertificateLineItemsModel.items;
        this.numItems += giftCertificateLineItemsModel.totalQuantity;
        this.hasOnlyGiftCertificate = basket && basket.getAllProductLineItems().length == 0 && basket.getGiftCertificateLineItems().length > 0 ? true : false;

        //Afterpay changes
        if(Site.getCurrent().getCustomPreferenceValue('enableAfterpay')){
            this.afterPayMin = Site.getCurrent().getCustomPreferenceValue('apMinThresholdAmount');
            this.afterPayMax = Site.getCurrent().getCustomPreferenceValue('apMaxThresholdAmount');
        }

        // custom code for CartSFRA controller
        this.actionUrls.submitCouponCodeUrl = URLUtils.url('CartSFRA-AddCoupon').toString();
        this.actionUrls.updateQuantityUrl = URLUtils.url('CartSFRA-UpdateQuantity').toString();
        this.actionUrls.removeProductLineItemUrl = URLUtils.url('CartSFRA-RemoveProductLineItem').toString();
        this.actionUrls.removeCouponLineItem = URLUtils.url('CartSFRA-RemoveCouponLineItem').toString();


        <!-- custom code start -->
        this.giftWrapEnabled = false;
        var giftWrapId = dw.system.Site.getCurrent().getCustomPreferenceValue('GiftWrapId');
        if (giftWrapId) {
            var giftWrapProduct = dw.catalog.ProductMgr.getProduct(giftWrapId);
            if (giftWrapProduct && giftWrapProduct.onlineFlag) {
                var giftWrapExistsInCart = false;
                var giftMessage = basket.getDefaultShipment().getGiftMessage();

                var matchingProductObj = cartHelper.getMatchingProducts(giftWrapProduct.ID, basket.productLineItems);
                if (matchingProductObj.matchingProducts.length > 0) {
                    giftWrapExistsInCart = true;
                }

                // Remove gift wrap and message if cart is empty or has only GIFT WRAP
                if (giftWrapExistsInCart && (basket.productLineItems.length <= 1)){
                    for (var i = 0; i < matchingProductObj.matchingProducts.length; i++) {
                        Transaction.wrap(function () {
                            basket.removeProductLineItem(matchingProductObj.matchingProducts[i]);
                        });
                    }

                    Transaction.wrap(function () {
                        basket.getDefaultShipment().setGiftMessage('');
                    });
                    giftWrapExistsInCart = false;
                }

                this.giftWrapExistsInCart = giftWrapExistsInCart;
                this.giftWrapDetails = cartHelper.getGiftWrapProductDetails(basket, giftWrapProduct);
                this.giftMessage = giftMessage;
                this.giftWrapEnabled = true;
                this.giftwrapEligibility = cartHelper.giftWrapEligibility(basket, giftWrapId);
            }
        }

        //check for AD products in bag
        session.custom.hasSORProducts = cartHelper.hasAutoDeliveryProductInBag(basket);
        this.hasRefillProducts = session.custom.hasSORProducts;

        //getting afterpay eligibility
        var afterPayEligible = false;
        afterPayEligible = cartHelper.isAfterpayEligible(basket);
        this.afterPayEligible = afterPayEligible;
    }else{
        this.items = [];
        this.numItems = 0;
        this.giftCertificateItems=[];
    }
    this.resources = {
        numberOfItems: this.numItems > 1 ? Resource.msgf('label.number.items.in.cart', 'cart', null, this.numItems) : Resource.msgf('label.number.item.in.cart', 'cart', null, this.numItems)
    };
}

module.exports = CartModel;
