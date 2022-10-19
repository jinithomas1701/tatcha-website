/* eslint-disable no-restricted-syntax, guard-for-in, no-array-constructor, no-continue */

"use strict";
/**
 *  Property of OSF Global Services, Inc., (with its brand OSF Commerce). OSF remains the sole owner of all right, title and interest in the software.
 *  Do not copy, sell, reverse engineer or otherwise attempt to derive or obtain information about the functioning, manufacture or operation therein.
 */

/* global empty */

var ProductMgr = require("dw/catalog/ProductMgr");

/**
 * @module RefillProduct
 */

/**
 * @description Model for Smart Order Refill Product
 * @typedef {RefillProduct} RefillProduct
 * @property {string} ID
 * @property {number} price
 * @property {string} currencyCode
 * @property {number} quantity
 * @property {string} periodicity
 * @property {number} interval
 * @property {number} orderDay
 * @property {number|undefined} commitment
 * @property {number|undefined} commitmentDone
 */

 /**
  * @description Constructor for RefillProduct
  * @param {Object} productObject - Plain object that matches the model properties
  * @constructor RefillProduct
  */
function RefillProduct(productObject) {
    this.ID = productObject.ID;
    var product = ProductMgr.getProduct(productObject.ID);
    this.price = (product && product.priceModel && product.priceModel.price)? product.priceModel.price.value : productObject.price;
    this.currencyCode = productObject.currencyCode;
    this.quantity = parseInt(productObject.quantity);
    this.periodicity = productObject.periodicity;
    this.interval = parseInt(productObject.interval);
    this.orderDay = productObject.orderDay;
    if (!(empty(productObject.commitment))) {
        this.commitment = productObject.commitment;
    }
    if (!(empty(productObject.commitmentDone))) {
        this.commitmentDone = productObject.commitmentDone;
    }
}
Object.defineProperties(RefillProduct, {
    /**
     * @property {string} PERIODICITY_MONTH
     * @memberof RefillProduct
     * @static
     * @readonly
     */
    PERIODICITY_MONTH: {
        value: "month",
        writable: false
    },
    /**
     * @property {string} PERIODICITY_WEEK
     * @memberof RefillProduct
     * @static
     * @readonly
     */
    PERIODICITY_WEEK: {
        value: "week",
        writable: false
    }
});
/**
 * @function isAvailableForSmartOrderRefill
 * @memberof RefillProduct.prototype
 * @returns {boolean} bulean representng if product is available for subscription
 */
RefillProduct.prototype.isAvailableForSmartOrderRefill = function () {
    var product = ProductMgr.getProduct(this.ID);
    return product.availabilityModel.orderable;
};

/**
 * @typedef {RefillProductPriceChange}
 * @property {string} ID - the product ID
 * @property {string} name - the product name
 * @property {number} oldPrice - the refill list product price
 * @property {number} newPrice - the current price of the product
 * @property {boolean} changed - flag indicates of the price has changed
 */

/**
 * @description check for and retrive price changes
 * @function priceChanges
 * @memberof RefillProduct.prototype
 * @param {string|null} sorPriceBookID is of the sor pricebook
 * @returns {RefillProductPriceChange} RefillProductPriceChange object
 */
RefillProduct.prototype.priceChanges = function (sorPriceBookID) {
    var product = ProductMgr.getProduct(this.ID);
    var currentPrice = product.priceModel.price.decimalValue;

    if (!empty(sorPriceBookID)) {
        var PriceModel = product.getPriceModel();
        var sorPrice = PriceModel.getPriceBookPrice(sorPriceBookID).decimalValue;
        if (!empty(sorPrice)) {
            currentPrice = sorPrice;
        }
    }
    if (!empty(currentPrice)) {
        currentPrice = parseFloat(currentPrice.get().toFixed(2));
    }
    return {
        ID: this.ID,
        name: product.name,
        oldPrice: this.price,
        newPrice: currentPrice,
        changed: currentPrice !== this.price
    };
};

/**
 * @description convert product line item to RefillProduct object
 * @function getProductFromLineitem
 * @memberof RefillProduct
 * @param {string|null} sorPriceBookID sor pricebook id
 * @param {dw.order.ProductLineItem} lineItem prodcut line item
 * @param {number} orderDay the day of the refill order will be generated on
 * @returns {RefillProduct} RefillProduct object
 */
RefillProduct.getProductFromLineitem = function (sorPriceBookID, lineItem, orderDay) {
    var prodPrice = 0;
    var sorPrice = null;

    if (!empty(sorPriceBookID)) {
        var priceModel = lineItem.product.priceModel;
        sorPrice = priceModel.getPriceBookPrice(sorPriceBookID).valueOrNull;
    }

    if (!empty(sorPrice)) {
        prodPrice = sorPrice;
    } else {
        var pliPrice = lineItem.product.priceModel.price*lineItem.quantityValue;
        var pliQuantity = lineItem.quantityValue;
        var priceUnit = pliPrice/pliQuantity;
        if (!empty(priceUnit)) {
            prodPrice = parseFloat(priceUnit.toFixed(2));
        }
    }

    var productObject = {
        ID: lineItem.product.ID,
        price: prodPrice,
        currencyCode: lineItem.adjustedPrice.currencyCode,
        quantity: lineItem.quantityValue,
        periodicity: lineItem.custom.SorPeriodicity,
        interval: lineItem.custom.SorPeriodicity === RefillProduct.PERIODICITY_MONTH ? lineItem.custom.SorMonthInterval : lineItem.custom.SorWeekInterval,
        orderDay: orderDay
    };

    if (lineItem.product.custom.SorCommitment) {
        productObject.commitment = lineItem.product.custom.SorCommitment;
        productObject.commitmentDone = 0;
    }
    return new RefillProduct(productObject);
};

module.exports = RefillProduct;
