'use strict';

var collections = require('*/cartridge/scripts/util/collections');
var formatMoney = require('dw/util/StringUtils').formatMoney;

/**
 * Function filter out the required field from gift certificate line item
 * @param {dw.order.GiftCertificateLineItem} lineItem - gift certificate line item
 * @return {Object} gcLineItem - customized linr temI
 */
function filterGCLineitem(lineItem) {
    var gcLineItem = {};
    gcLineItem.UUID = lineItem.UUID;
    gcLineItem.recipientName = lineItem.recipientName;
    gcLineItem.recipientEmail = lineItem.recipientEmail;
    gcLineItem.lineItemText = lineItem.lineItemText;
    gcLineItem.senderName = lineItem.senderName;
    gcLineItem.message = lineItem.message;
    gcLineItem.image = lineItem.custom.giftCertificateImage;

    gcLineItem.price = {
        basePrice: formatMoney(lineItem.basePrice),
        grossPrice: formatMoney(lineItem.grossPrice)
    };

    return gcLineItem;
}

/**
 * Function creates gift certificate line item object
 * @param {dw.order.LineItem} allLineItems - all line items
 * @param {Object} view - Basket object
 * @return {Object} GcliObject - GCLI object
 */
function createGcliObject(allLineItems, view) {
    var lineItems = [];

    var totalQuantity = 0;
    var subTotal = 0;

    collections.forEach(allLineItems, function (item) {
        totalQuantity += 1;
        subTotal += item.basePrice;

        var params = {
            pview: 'giftCertificateLineItem',
            containerView: view,
            lineItem: filterGCLineitem(item)
        };

        lineItems.push(params);
    });

    return {
        lineItems: lineItems,
        totalQuantity: totalQuantity,
        subTotal: subTotal
    };
}

/**
 * Function provides giftcertificate lineItem modal
 * @param {dw.order.LineItem} giftCertificateLineItems - line items
 * @param {Object} view - Basket object
 */
function GiftCertificateLineItems(giftCertificateLineItems, view) {
    if (giftCertificateLineItems != null) {
        var gcliObject = createGcliObject(giftCertificateLineItems, view);
        this.items = gcliObject.lineItems;
        this.subTotal = gcliObject.subTotal;
        this.totalQuantity = gcliObject.totalQuantity;
    } else {
        this.items = [];
        this.totalQuantity = 0;
        this.subTotal = 0;
    }
}


module.exports = GiftCertificateLineItems;
