/* eslint-disable no-restricted-syntax, guard-for-in, no-array-constructor */

"use strict";
/**
 *  Property of OSF Global Services, Inc., (with its brand OSF Commerce). OSF remains the sole owner of all right, title and interest in the software.
 *  Do not copy, sell, reverse engineer or otherwise attempt to derive or obtain information about the functioning, manufacture or operation therein.
 */
/* global empty, session */

var RefillProduct = require("~/cartridge/models/smartOrderRefill/refillProduct");
var RefillAddress = require("~/cartridge/models/smartOrderRefill/refillAddress");
var RefillOrder = require("~/cartridge/models/smartOrderRefill/refillOrder");
var Calendar = require("dw/util/Calendar");

/**
 * @module RefillSubscription
 */

// helper functions
/**
 * @description Function recursivaly generates order templates for order creatin
 * @param {RefillSubscription} subscriptionList RefillSubscription object to use
 * @param {RefillProduct[]} products array of RefillProduct objects to use
 * @returns {Object} template object to use for order generation
 */
function getSubscriptionOrderTemplates(subscriptionList, products) {
    var orderProducts = products;
    var productsInDifferentOrder = new Array();
    var orderTemplates = new Array();
    var daysInterval = null;
    var mainOrder = {
        subscriptionID: subscriptionList.ID,
        originalOrder: subscriptionList.originalOrder,
        type: subscriptionList.type,
        customerNo: subscriptionList.customerNo,
        status: RefillOrder.STATUS_SCHEDULED,
        notified: false,
        products: []
    };
    if (subscriptionList.creditCardToken) {
        mainOrder.creditCardToken = subscriptionList.creditCardToken;
    }

    for (var orderProductsIndex in orderProducts) {
        var prod = orderProducts[orderProductsIndex];
        if (mainOrder.products.indexOf(prod) === -1) {
            if (mainOrder.products.length === 0) {
                mainOrder.periodicity = prod.periodicity;
                mainOrder.interval = parseInt(prod.interval);
                mainOrder.products.push(prod);
                mainOrder.orderDay = prod.orderDay;
                if (mainOrder.periodicity === RefillProduct.PERIODICITY_WEEK) {
                    daysInterval = 7 * mainOrder.interval;
                }
            } else if (mainOrder.periodicity === prod.periodicity && mainOrder.interval === prod.interval) {
                mainOrder.products.push(prod);
            } else {
                productsInDifferentOrder.push(prod);
            }
        }
    }
    orderTemplates.push({
        daysInterval: daysInterval,
        mainOrder: mainOrder
    });

    if (productsInDifferentOrder.length > 0) {
        orderTemplates = orderTemplates.concat(getSubscriptionOrderTemplates(subscriptionList, productsInDifferentOrder));
    }

    return orderTemplates;
}

/**
 * @description Function which converts date object to a string
 * @param {Date} date date to convert
 * @param {string} separator separator to use
 * @returns {string} string representation of date
 */
function dateToStr(date, separator) {
    var day = date.getDate();
    var month = date.getMonth();
    var year = date.getFullYear();

    day = (day > 9 ? "" : "0") + day;
    month = (month + 1 > 9 ? "" : "0") + (month + 1);
    year = (year > 9 ? "" : "0") + year;
    return [year, month, day].join(separator || "-");
}

/**
 * @description Model for Smart Order Refill Subscription
 * @typedef {RefillSubscription} RefillSubscription
 * @property {string} ID
 * @property {string} originalOrder
 * @property {string} type
 * @property {boolean} renewal
 * @property {string} status
 * @property {string} customerNo
 * @property {Date} createdAt
 * @property {Date} lastRefillDate
 * @property {Date} validUntil
 * @property {Date|string} cardExpirationDate
 * @property {string} creditCardToken
 * @property {Date} lastUpdate
 * @property {RefillProduct[]} products
 * @property {RefillAddress} billingAddress
 * @property {RefillAddress} shippingAddress
 * @property {RefillOrder[]} orders
 * @property {boolean} updated
 * @property {string} refillType
 */

/**
 * @description Constructor for RefillSubscription
 * @param {Object} subscriptionObject Plain object that matches the model properties
 * @constructor RefillSubscription
 */
function RefillSubscription(subscriptionObject) {
    this.ID = subscriptionObject.ID;
    this.originalOrder = subscriptionObject.originalOrder;
    this.type = subscriptionObject.type;
    this.renewal = subscriptionObject.renewal;
    this.status = subscriptionObject.status;
    //RDMP-3582: SOR cancellation property
    if(!empty(subscriptionObject.cancellationReason) && subscriptionObject.status == RefillSubscription.STATUS_CANCELED){
        this.cancellationReason = subscriptionObject.cancellationReason;
    }
    this.customerNo = subscriptionObject.customerNo;
    this.createdAt = new Date(subscriptionObject.createdAt);
    this.lastRefillDate = new Date(subscriptionObject.lastRefillDate);
    this.validUntil = new Date(subscriptionObject.validUntil);
    if (subscriptionObject.cardExpirationDate !== RefillSubscription.STATUS_PENDING) {
        this.cardExpirationDate = new Date(subscriptionObject.cardExpirationDate);
    } else {
        this.cardExpirationDate = RefillSubscription.STATUS_PENDING;
    }

    this.creditCardToken = subscriptionObject.creditCardToken;
    if (!empty(subscriptionObject.lastUpdate)) {
        this.lastUpdate = new Date(subscriptionObject.lastUpdate);
    } else {
        this.lastUpdate = this.createdAt;
    }

    this.products = new Array();
    for (var productIndex in subscriptionObject.products) {
        this.products.push(new RefillProduct(subscriptionObject.products[productIndex]));
    }
    this.billingAddress = new RefillAddress(subscriptionObject.billingAddress);
    this.billingAddress.type = RefillAddress.TYPE_BILLING;
    this.shippingAddress = new RefillAddress(subscriptionObject.shippingAddress);
    this.shippingAddress.type = RefillAddress.TYPE_SHIPPING;
    this.orders = new Array();
    this.updated = false;
    this.refillType = "subscription";
}

Object.defineProperties(RefillSubscription, {
    /**
     * @property {string} STATUS_NEW
     * @memberof RefillSubscription
     * @static
     * @readonly
     */
    STATUS_NEW: {
        value: "new",
        writable: false
    },
    /**
     * @property {string} STATUS_RENEW
     * @memberof RefillSubscription
     * @static
     * @readonly
     */
    STATUS_RENEW: {
        value: "renew",
        writable: false
    },
    /**
     * @property {string} STATUS_UPDATED
     * @memberof RefillSubscription
     * @static
     * @readonly
     */
    STATUS_UPDATED: {
        value: "updated",
        writable: false
    },
    /**
     * @property {string} STATUS_PAUSED
     * @memberof RefillSubscription
     * @static
     * @readonly
     */
    STATUS_PAUSED: {
        value: "paused",
        writable: false
    },
    /**
     * @property {string} STATUS_CANCELED
     * @memberof RefillSubscription
     * @static
     * @readonly
     */
    STATUS_CANCELED: {
        value: "canceled",
        writable: false
    },
    /**
     * @property {string} STATUS_EXPIRED
     * @memberof RefillSubscription
     * @static
     * @readonly
     */
    STATUS_EXPIRED: {
        value: "expired",
        writable: false
    },
    /**
     * @property {string} STATUS_PENDING
     * @memberof RefillSubscription
     * @static
     * @readonly
     */
    STATUS_PENDING: {
        value: "pending",
        writable: false
    },
    /**
     * @property {string} TYPE_SOR
     * @memberof RefillSubscription
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
 * @memberof RefillSubscription.prototype
 * @returns {Object} serialized subcription
 */
RefillSubscription.prototype.serialize = function () {
    var serializeObject = {};
    for (var prop in this) {
        // eslint-disable-next-line no-prototype-builtins
        if (this.hasOwnProperty(prop) && prop !== "orders" && prop !== "updated" && prop !== "refillType") {
            serializeObject[prop] = this[prop];
        }
    }
    return serializeObject;
};

/**
 * @description Methode filters the subscriptions orders and returna a colection of active RefillOrder objects
 * @function getActiveOrders
 * @memberof RefillSubscription.prototype
 * @returns {RefillOrder[]} array of RefillOrder objects
 */
RefillSubscription.prototype.getActiveOrders = function () {
    var PropertyComparator = require("dw/util/PropertyComparator");
    var ArrayList = require("dw/util/ArrayList");

    var activeOrders = new ArrayList();
    var comparator = new PropertyComparator("createdAt", false);
    for (var orderIndex in this.orders) {
        var order = this.orders[orderIndex];
        if (order.status !== RefillOrder.STATUS_PROCESSED && order.status !== RefillOrder.STATUS_CANCELED && order.status !== RefillOrder.STATUS_DELETED) {
            activeOrders.push(order);
        }
    }
    activeOrders.sort(comparator);
    return activeOrders;
};

/**
 * @description Methode retrives subscription product coresponding to the id
 * @function getProduct
 * @memberof RefillSubscription.prototype
 * @param {string} productID id of product to find
 * @returns {RefillProduct|null} RefillProduct product object or null if no product found
 */
RefillSubscription.prototype.getProduct = function (productID) {
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
 * @description Methode removes a prodcut from the subscription
 * @function removeProduct
 * @memberof RefillSubscription.prototype
 * @param {string} productID id of product to remove
 */
RefillSubscription.prototype.removeProduct = function (productID) {
    for (var productsIndex in this.products) {
        if (this.products[productsIndex].ID === productID) {
            this.products.splice(productsIndex, 1);
        }
    }
};

/**
 * @description Methode adds a product to the subscription
 * @function addProduct
 * @memberof RefillSubscription.prototype
 * @param {string} productID id of product to add
 * @param {string} periodicity periodicity of product
 * @param {number} interval interval of product
 * @param {string} sorPriceBookID the smart order refill price id
 * @param {number} quantity quantity value to set
 */
RefillSubscription.prototype.addProduct = function (productID, periodicity, interval, sorPriceBookID, quantity) {
    var product = new RefillProduct({
        ID: productID,
        price: 0,
        currencyCode: session.currency.currencyCode,
        quantity: quantity,
        periodicity: periodicity,
        interval: interval,
        orderDay: this.products[0].orderDay
    });
    var productPriceChanges = product.priceChanges(sorPriceBookID);
    product.price = productPriceChanges.newPrice;
    this.products.push(product);
};

/**
 * @description Methode adds a prodcut to the subscription
 * @function addProd
 * @memberof RefillSubscription.prototype
 * @param {string} productID id of product to add
 * @param {string} periodicity periodicity of product
 * @param {number} interval interval of product
 * @param {string} sorPriceBookID the smart order refill price id
 * @param {number} quantity quantity value to set
 * @param {number} commitment commitment of product
 */
RefillSubscription.prototype.addProd = function (productID, periodicity, interval, sorPriceBookID, quantity, commitment) {
    var product = new RefillProduct({
        ID: productID,
        price: 0,
        currencyCode: session.currency.currencyCode,
        quantity: quantity,
        periodicity: periodicity,
        interval: interval,
        orderDay: this.products[0].orderDay
    });
    if (commitment > 0 && commitment != null) {
        product.commitment = commitment;
        product.commitmentDone = 0;
    }
    var productPriceChanges = product.priceChanges(sorPriceBookID);
    product.price = productPriceChanges.newPrice;
    this.products.push(product);
};
/**
 * @documentation Methode markes active orders for deletion
 * @fucntion removeProduct
 * @memberof RefillSubscription.prototype
 */
RefillSubscription.prototype.clearActiveOrders = function () {
    var customerSubscriptionOrders = this.getActiveOrders();
    for (var customerSubscriptionOrdersIndex in customerSubscriptionOrders) {
        var customerSubscriptionOrder = customerSubscriptionOrders[customerSubscriptionOrdersIndex];
        customerSubscriptionOrder.changeStatus(RefillOrder.STATUS_DELETED);
    }
};

/**
 * @description Method changes the status of the subscription and updates the lastUpdate property
 * @function changeStatus
 * @memberof RefillOrder.prototype
 * @param {string} status value of the status to set
 */
RefillSubscription.prototype.changeStatus = function (status) {
    this.status = status;
    this.lastUpdate = new Date();
    this.updated = true;
};

/**
 * @description Methode retrives subscription order coresponding to the id
 * @function getOrder
 * @memberof RefillSubscription.prototype
 * @param {string} orderID id of the order to find
 * @returns {RefillOrder|null} RefillOrder object or null if no order is found
 */
RefillSubscription.prototype.getOrder = function (orderID) {
    var order = null;
    for (var ordersIndex in this.orders) {
        if (this.orders[ordersIndex].ID === orderID) {
            order = this.orders[ordersIndex];
            break;
        }
    }
    return order;
};

/**
 * @description Methode canceles all the subscriptions orders
 * @function cancelAllOrders
 * @memberof RefillSubscription.prototype
 */
RefillSubscription.prototype.cancelAllOrders = function () {
    for (var ordersIndex in this.orders) {
        this.orders[ordersIndex].changeStatus(RefillOrder.STATUS_CANCELED);
    }
};

/**
 * @description Methode updates the subscription product quantity
 * @function updateProductQuantity
 * @memberof RefillSubscription.prototype
 * @param {string} productID id of product to update
 * @param {number} quantity quantity value to set
 */
RefillSubscription.prototype.updateProductQuantity = function (productID, quantity) {
    var product = this.getProduct(productID);
    if (!empty(product)) {
        product.quantity = quantity;
        var customerSubscriptionOrders = this.getActiveOrders();
        for (var ordersIndex in customerSubscriptionOrders) {
            customerSubscriptionOrders[ordersIndex].updateProductQuantity(productID, quantity);
            customerSubscriptionOrders[ordersIndex].changeStatus(RefillOrder.STATUS_UPDATED);
        }
    }
};

/**
 * @description Methode updates the subscription product price
 * @function updateProductPrice
 * @memberof RefillSubscription.prototype
 * @param {string} productID id of product to update
 * @param {number} price price value to set
 * @param {Date} currentDate date to set for update
 */
RefillSubscription.prototype.updateProductPrice = function (productID, price, currentDate) {
    var product = this.getProduct(productID);
    if (!empty(product)) {
        product.price = price;
        var customerSubscriptionOrders = this.getActiveOrders();
        for (var ordersIndex in customerSubscriptionOrders) {
            customerSubscriptionOrders[ordersIndex].updateProductPrice(productID, price);
            if (customerSubscriptionOrders[ordersIndex].status !== RefillOrder.STATUS_PAUSED) {
                customerSubscriptionOrders[ordersIndex].changeStatus(RefillOrder.STATUS_UPDATED);
            }
            customerSubscriptionOrders[ordersIndex].lastUpdate = currentDate;
        }
    }
};

/**
 * @description Methode updates the subscription product refill interval and periodicity
 * @function updateProductRefill
 * @memberof RefillSubscription.prototype
 * @param {string} productID id of product to update
 * @param {number} interval interval value to set
 * @param {string} periodicity periodicity value to set
 */
RefillSubscription.prototype.updateProductRefill = function (productID, interval, periodicity, nextOrderDay) {
    var product = this.getProduct(productID);
    if (!empty(product)) {
        product.interval = interval;
        product.periodicity = periodicity;
        product.orderDay = nextOrderDay;
    }
};

/**
 * @description Methode generates subscription orders
 * @function createScheduledOrders
 * @memberof RefillSubscription.prototype
 * @param {Date} currentDate the current date
 */
RefillSubscription.prototype.createScheduledOrders = function (currentDate) {
    // Prepare the list of products will be in each order
    var orderTemplates = getSubscriptionOrderTemplates(this, this.products);

    // Generate future orders
    for (var orderTemplatesIndex in orderTemplates) {
        var orderTemplate = orderTemplates[orderTemplatesIndex];
        var dateLimit = new Date(this.validUntil);
        var orderCalendar = new Calendar(new Date(this.lastRefillDate));
        var mainOrder = orderTemplate.mainOrder;
        var daysInterval = orderTemplate.daysInterval;
        var ccExpDate;
        if (this.cardExpirationDate !== RefillSubscription.STATUS_PENDING) {
            ccExpDate = new Calendar(new Date(this.cardExpirationDate));
        } else {
            ccExpDate = RefillSubscription.STATUS_PENDING;
        }
        if (mainOrder.periodicity === RefillProduct.PERIODICITY_WEEK) {
            orderCalendar.add(Calendar.DAY_OF_MONTH, daysInterval);
        } else {
            orderCalendar.add(Calendar.MONTH, mainOrder.interval);
            orderCalendar.set(Calendar.DAY_OF_MONTH, mainOrder.orderDay);
        }
        var orderDate = orderCalendar.getTime();
        var expiredOrder = false;

        while (orderDate <= dateLimit) {
            var order = JSON.parse(JSON.stringify(mainOrder));
            order.ID = this.ID + "-" + dateToStr(orderDate, "-") + "." + orderTemplatesIndex;
            order.createdAt = orderDate;

            if (!expiredOrder && ccExpDate !== RefillSubscription.STATUS_PENDING && ccExpDate.compareTo(orderCalendar) < 0) {
                expiredOrder = true;
            }

            if (expiredOrder) {
                order.status = RefillOrder.STATUS_CCEXPIRED;
                delete order.creditCardToken;
            }

            var curentDateBegin = currentDate;
            curentDateBegin.setHours(0, 0, 0, 0);
            orderDate.setHours(0, 0, 0, 0);
            var includingToday = !!this.includingToday;
            if (orderDate.getTime() === curentDateBegin.getTime() && includingToday) {
                this.orders.push(new RefillOrder(order));
            }
            var existingOrder = this.getOrder(order.ID);

            if (orderDate > curentDateBegin && (empty(existingOrder) || (!empty(existingOrder) && existingOrder.status === RefillOrder.STATUS_DELETED))) {
                this.orders.push(new RefillOrder(order));
            }

            orderCalendar = new Calendar(orderDate);
            if (order.periodicity === RefillProduct.PERIODICITY_WEEK) {
                orderCalendar.add(Calendar.DAY_OF_MONTH, daysInterval);
            } else {
                orderCalendar.add(Calendar.MONTH, mainOrder.interval);
            }
            orderDate = orderCalendar.getTime();
        }
    }
};

module.exports = RefillSubscription;
