'use strict';

var base = module.superModule;
var collections = require('*/cartridge/scripts/util/collections');
var HashMap = require('dw/util/HashMap');
var Template = require('dw/util/Template');
var URLUtils = require('dw/web/URLUtils');
var formatMoney = require('dw/util/StringUtils').formatMoney;

/**
 * Adds discounts to a discounts object
 * @param {dw.util.Collection} collection - a collection of price adjustments
 * @param {Object} discounts - an object of price adjustments
 * @returns {Object} an object of price adjustments
 */
function createDiscountObject(collection, discounts) {
    var result = discounts;
    collections.forEach(collection, function (item) {
        if (!item.basedOnCoupon) {
            result[item.UUID] = {
                UUID: item.UUID,
                lineItemText: item.lineItemText,
                price: formatMoney(item.price),
                type: 'promotion',
                callOutMsg: (typeof item.promotion !== 'undefined' && item.promotion !== null) ? item.promotion.calloutMsg : ''
            };
        }
    });

    return result;
}

/**
 * create the discount results html
 * @param {Array} discounts - an array of objects that contains coupon and priceAdjustment
 * information
 * @returns {string} The rendered HTML
 */
function getCheckoutDiscountsHtml(discounts) {
    var context = new HashMap();
    var object = { order: { totals: { discounts: discounts } } };

    Object.keys(object).forEach(function (key) {
        context.put(key, object[key]);
    });

    var template = new Template('checkout/checkoutCouponDisplay');
    return template.render(context).text;
}

/**
 * create the discount total results html
 * @param {Array} discounts - an array of objects that contains coupon and priceAdjustment
 * information
 * @returns {string} The rendered HTML
 */
function getCheckoutDiscountsTotalHtml(totals) {
    var context = new HashMap();
    var object = { order: { totals: totals } };

    Object.keys(object).forEach(function (key) {
        context.put(key, object[key]);
    });

    var template = new Template('checkout/checkoutDiscountsTotalDisplay');
    return template.render(context).text;
}

/**
 * Accepts a total object and formats the value
 * @param {dw.value.Money} total - Total price of the cart
 * @returns {string} the formatted money value
 */
function getTotals(total) {
    return !total.available ? '-' : formatMoney(total);
}


/**
 * creates an array of discounts.
 * @param {dw.order.LineItemCtnr} lineItemContainer - the current line item container
 * @returns {Array} an array of objects containing promotion and coupon information
 */
function getDiscounts(lineItemContainer) {
    var discounts = {};

    collections.forEach(lineItemContainer.couponLineItems, function (couponLineItem) {
        var priceAdjustments = collections.map(
            couponLineItem.priceAdjustments, function (priceAdjustment) {
                return { callOutMsg: (typeof priceAdjustment.promotion !== 'undefined' && priceAdjustment.promotion !== null) ? priceAdjustment.promotion.calloutMsg : '' };
            });
        discounts[couponLineItem.UUID] = {
            type: 'coupon',
            UUID: couponLineItem.UUID,
            couponCode: couponLineItem.couponCode,
            applied: couponLineItem.applied,
            valid: couponLineItem.valid,
            relationship: priceAdjustments,
            removeCouponURL: URLUtils.url('CartSFRA-RemoveCouponLineItem').toString()
        };
    });

    discounts = createDiscountObject(lineItemContainer.priceAdjustments, discounts);
    discounts = createDiscountObject(lineItemContainer.allShippingPriceAdjustments, discounts);

    return Object.keys(discounts).map(function (key) {
        return discounts[key];
    });
}

function getShippingPrices(lineItemContainer) {
    var prices = {};
    if (lineItemContainer) {
        prices.shippingTotalPrice = lineItemContainer.shippingTotalPrice.available ? lineItemContainer.shippingTotalPrice.value : '';
        prices.shippingTotalPriceFormatted = lineItemContainer.shippingTotalPrice.available ? formatMoney(lineItemContainer.shippingTotalPrice) : '';
        prices.adjustedShippingTotalPrice = lineItemContainer.adjustedShippingTotalPrice.available ? lineItemContainer.adjustedShippingTotalPrice.value : '';
        prices.adjustedShippingTotalPriceFormatted = lineItemContainer.adjustedShippingTotalPrice.available ? formatMoney(lineItemContainer.adjustedShippingTotalPrice) : '';
    } else {
        prices.shippingTotalPrice = '';
        prices.shippingTotalPriceFormatted = '';
        prices.adjustedShippingTotalPrice = '';
        prices.adjustedShippingTotalPriceFormatted = '';
    }
    return prices;
}

/**
 * @constructor
 * @classdesc totals class that represents the order totals of the current line item container
 *
 * @param {dw.order.lineItemContainer} lineItemContainer - The current user's line item container
 */
function totals(lineItemContainer) {
    var checkoutHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');

	base.call(this, lineItemContainer);
	if (lineItemContainer) {
		this.discounts = getDiscounts(lineItemContainer);
		this.checkoutDiscountsHtml = getCheckoutDiscountsHtml(this.discounts);
		this.subTotalIncludingOrderDiscount = getTotals(lineItemContainer.getAdjustedMerchandizeTotalPrice(true).add(lineItemContainer.giftCertificateTotalPrice));
		this.checkoutDiscountsTotalHtml = getCheckoutDiscountsTotalHtml(this);
        this.gcLineItemsSize = lineItemContainer.giftCertificateLineItems.size();
        this.totalGrossPrice = formatMoney(lineItemContainer.totalGrossPrice);
        this.gcPIs = checkoutHelpers.gcPaymentMethods(lineItemContainer);
        this.totalNetsPrice = formatMoney(lineItemContainer.totalNetPrice);
        this.nonGcAmount = checkoutHelpers.getNonGiftCertificateAmount(lineItemContainer);
        this.hasApplicableCreditCards = checkoutHelpers.checkApplicableCards(lineItemContainer);
        this.gcPaymentMethodId = checkoutHelpers.getGcPaymentInstrumentId(lineItemContainer);
        this.getShippingPrices = getShippingPrices(lineItemContainer);
	}

    this.adjustedShippingCost = lineItemContainer ? getTotals(lineItemContainer.getAdjustedShippingTotalGrossPrice()) : 0;
    this.noShippingCost = lineItemContainer ? lineItemContainer.getAdjustedShippingTotalNetPrice().value === 0 : 0;

    this.subTotal = lineItemContainer ? getTotals(lineItemContainer.getAdjustedMerchandizeTotalPrice(false).add(lineItemContainer.getGiftCertificateTotalPrice())) : 0;
}

module.exports = totals;
