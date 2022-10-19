/* eslint-disable no-restricted-syntax, guard-for-in, no-array-constructor, no-continue */

"use strict";
/**
 *  Property of OSF Global Services, Inc., (with its brand OSF Commerce). OSF remains the sole owner of all right, title and interest in the software.
 *  Do not copy, sell, reverse engineer or otherwise attempt to derive or obtain information about the functioning, manufacture or operation therein.
 */

/* global empty */

var RefillProduct = require("~/cartridge/models/smartOrderRefill/refillProduct");
var RefillAddress = require("~/cartridge/models/smartOrderRefill/refillAddress");
/**
 * @module RefillOrder
 */

/**
 * @description Model for Smart Order Refill Subscription Orders
 * @typedef {RefillOrder} RefillOrder
 * @property {string} ID
 * @property {string} subscriptionID
 * @property {string} originalOrder
 * @property {string} type
 * @property {boolean} notified
 * @property {string} status
 * @property {string} customerNo
 * @property {string} periodicity
 * @property {number} interval
 * @property {number} orderDay
 * @property {boolean} isLastOrder
 * @property {Date} createdAt
 * @property {string} creditCardToken
 * @property {Date} lastUpdate
 * @property {RefillProduct[]} products
 * @property {RefillAddress} billingAddress
 * @property {RefillAddress} shippingAddress
 * @property {boolean} hasBillingAddress
 * @property {boolean} hasShippingAddress
 * @property {boolean} updated
 * @property {string} refillType
 */
/**
 * @description constructor for RefillOrder
 * @constructor RefillOrder
 * @param {Object} orderObject - Plain object that matches the model properties
 */
function RefillOrder(orderObject) {
    this.ID = orderObject.ID;
    this.subscriptionID = orderObject.subscriptionID;
    this.originalOrder = orderObject.originalOrder;
    this.type = orderObject.type;
    this.notified = orderObject.notified;
    this.status = orderObject.status;
    this.customerNo = orderObject.customerNo;
    this.periodicity = orderObject.periodicity;
    this.interval = parseInt(orderObject.interval);
    this.orderDay = orderObject.orderDay;
    this.isLastOrder = orderObject.isLastOrder || false;
    this.createdAt = new Date(orderObject.createdAt);
    this.creditCardToken = orderObject.creditCardToken;
    if (!empty(orderObject.lastUpdate)) {
        this.lastUpdate = new Date(orderObject.lastUpdate);
    }
    this.products = new Array();
    for (var productIndex in orderObject.products) {
        this.products.push(new RefillProduct(orderObject.products[productIndex]));
    }
    if (!empty(orderObject.billingAddress)) {
        this.billingAddress = new RefillAddress(orderObject.billingAddress);
        this.billingAddress.type = RefillAddress.TYPE_BILLING;
        this.hasBillingAddress = true;
    } else {
        this.hasBillingAddress = false;
    }
    if (!empty(orderObject.shippingAddress)) {
        this.shippingAddress = new RefillAddress(orderObject.shippingAddress);
        this.shippingAddress.type = RefillAddress.TYPE_SHIPPING;
        this.hasShippingAddress = true;
    } else {
        this.hasShippingAddress = false;
    }
    this.updated = false;
    this.refillType = "order";
}

Object.defineProperties(RefillOrder, {
    /**
     * @property {string} STATUS_SCHEDULED
     * @memberof RefillOrder
     * @static
     * @readonly
     */
    STATUS_SCHEDULED: {
        value: "scheduled",
        writable: false
    },
    /**
     * @property {string} STATUS_UPDATED
     * @memberof RefillOrder
     * @static
     * @readonly
     */
    STATUS_UPDATED: {
        value: "updated",
        writable: false
    },
    /**
     * @property {string} STATUS_PROCESSING
     * @memberof RefillOrder
     * @static
     * @readonly
     */
    STATUS_PROCESSING: {
        value: "processing",
        writable: false
    },
    /**
     * @property {string} STATUS_PROCESSED
     * @memberof RefillOrder
     * @static
     * @readonly
     */
    STATUS_PROCESSED: {
        value: "processed",
        writable: false
    },
    /**
     * @property {string} STATUS_PAUSED
     * @memberof RefillOrder
     * @static
     * @readonly
     */
    STATUS_PAUSED: {
        value: "paused",
        writable: false
    },
    /**
     * @property {string} STATUS_CANCELED
     * @memberof RefillOrder
     * @static
     * @readonly
     */
    STATUS_CANCELED: {
        value: "canceled",
        writable: false
    },
    /**
     * @property {string} STATUS_CCEXPIRED
     * @memberof RefillOrder
     * @static
     * @readonly
     */
    STATUS_CCEXPIRED: {
        value: "cardexpired",
        writable: false
    },
    /**
     * @property {string} STATUS_OUTOFSTOCK
     * @memberof RefillOrder
     * @static
     * @readonly
     */
    STATUS_OUTOFSTOCK: {
        value: "outofstock",
        writable: false
    },
    /**
     * @property {string} STATUS_DELETED
     * @memberof RefillOrder
     * @static
     * @readonly
     */
    STATUS_DELETED: {
        value: "deleted",
        writable: false
    },
    /**
     * @property {string} STATUS_PENDING
     * @memberof RefillOrder
     * @static
     * @readonly
     */
    STATUS_PENDING: {
        value: "pending",
        writable: false
    },
    /**
     * @property {string} TYPE_SOR
     * @memberof RefillOrder
     * @static
     * @readonly
     */
    TYPE_SOR: {
        value: "SOR",
        writable: false
    }
});

/**
 * @description Methode converts the internal representation of the object into a plain js object for storage
 * @function serialize
 * @memberof RefillOrder.prototype
 * @returns {Object} serilized representation of RefillOrder object
 */
RefillOrder.prototype.serialize = function () {
    var serializeObject = {};
    for (var prop in this) {
        // eslint-disable-next-line no-prototype-builtins
        if (!this.hasOwnProperty(prop)) {
            continue;
        }
        if (prop === "updated" || prop === "hasBillingAddress" || prop === "hasShippingAddress" || prop === "refillType") {
            continue;
        }
        if (prop === "billingAddress" && !this.hasBillingAddress) {
            continue;
        }
        if (prop === "shippingAddress" && !this.hasShippingAddress) {
            continue;
        }
        serializeObject[prop] = this[prop];
    }
    return serializeObject;
};

/**
 * @description Methode retrives order product coresponding to the id
 * @function getProduct
 * @memberof RefillOrder.prototype
 * @param {string} productID id of the product to get
 * @returns {RefillProduct|null} RefillProduct object or null if not found
 */
RefillOrder.prototype.getProduct = function (productID) {
    var product = null;
    for (var productsIndex in this.products) {
        if (this.products[productsIndex].ID === productID) {
            product = this.products[productsIndex];
            break;
        }
    }
    return product;
};

/**
 * @description Method removes a prodcut from the subscription order
 * @function removeProduct
 * @memberof RefillOrder.prototype
 * @param {string} productID id of product to remove
 */
RefillOrder.prototype.removeProduct = function (productID) {
    for (var productsIndex in this.products) {
        if (this.products[productsIndex].ID === productID) {
            this.products.splice(productsIndex, 1);
        }
    }
};

/**
 * @description Methode updates the order product quantity
 * @function updateProductQuantity
 * @memberof RefillOrder.prototype
 * @param {string} productID id o product to update
 * @param {number} quantity value of quantity to set
 */
RefillOrder.prototype.updateProductQuantity = function (productID, quantity) {
    var product = this.getProduct(productID);
    if (!empty(product)) {
        product.quantity = quantity;
    }
};

/**
 * @description Methode updates the order product price
 * @function updateProductPrice
 * @memberof RefillOrder.prototype
 * @param {string} productID id o product to update
 * @param {number} price value of price to set
 */
RefillOrder.prototype.updateProductPrice = function (productID, price) {
    var product = this.getProduct(productID);
    if (!empty(product)) {
        product.price = price;
    }
};

/**
 * @description Method changes the status of the order and updates the lastUpdate property
 * @function changeStatus
 * @memberof RefillOrder.prototype
 * @param {string} status value of status to set
 */
RefillOrder.prototype.changeStatus = function (status) {
    this.status = status;
    this.lastUpdate = new Date();
    this.updated = true;
};

module.exports = RefillOrder;
