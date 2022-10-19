'use strict';

var base = module.superModule;
var URLUtils = require('dw/web/URLUtils');
var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
var TotalsModel = require('*/cartridge/models/totals');
var GiftCertificateLineItemsModel = require('*/cartridge/models/giftCertificateLineItem/giftCertificateLineItems');

/**
 * Generates an object of URLs
 * @returns {Object} an object of URLs in string format
 */
function getActionUrls() {
    return {
        submitCouponCodeUrl: URLUtils.url('CartSFRA-AddCoupon').toString(),
        removeCouponLineItem: URLUtils.url('CartSFRA-RemoveCouponLineItem').toString()
    };
}

/**
 * Order class that represents the current order
 * @param {dw.order.LineItemCtnr} lineItemContainer - Current users's basket/order
 * @param {Object} options - The current order's line items
 * @param {Object} options.config - Object to help configure the orderModel
 * @param {string} options.config.numberOfLineItems - helps determine the number of lineitems needed
 * @param {string} options.countryCode - the current request country code
 * @constructor
 */
function OrderModel(lineItemContainer, options) {
    base.call(this, lineItemContainer, options);
    var totalsModel = new TotalsModel(lineItemContainer);
    this.actionUrls = getActionUrls();
    // gift certificate products
    var giftCertificateLineItemsModel = new GiftCertificateLineItemsModel(lineItemContainer.getGiftCertificateLineItems(), 'basket');
    this.giftCertificateItems = giftCertificateLineItemsModel.items;
    this.items.totalQuantity += giftCertificateLineItemsModel.totalQuantity;
    //GWP bonus products
    var allProductLineItemsID = [];
    for (var r = 0; r < lineItemContainer.getAllProductLineItems().length; r++) {
        allProductLineItemsID.push(lineItemContainer.getAllProductLineItems()[r].productID);
    }
    var editGwpProducts = cartHelper.editGwpProductsList(totalsModel.discounts, lineItemContainer.bonusDiscountLineItems, allProductLineItemsID);
    this.editGwpProducts = editGwpProducts;
    this.totals = totalsModel;
    this.hasOnlyGiftCertificate = lineItemContainer && lineItemContainer.getAllProductLineItems().length == 0 && lineItemContainer.getGiftCertificateLineItems().length > 0 ? true : false;
    this.orderEmail = (lineItemContainer.customer && lineItemContainer.customer.profile)? lineItemContainer.customer.profile.email : lineItemContainer.customerEmail;
    this.sameAsShipping = options.sameAsShipping || false;
    this.totalGrossPrice = lineItemContainer.totalGrossPrice;
    this.currencyCode = lineItemContainer.currencyCode;
}

module.exports = OrderModel;
