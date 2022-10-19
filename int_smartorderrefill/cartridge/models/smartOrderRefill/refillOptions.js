/* eslint-disable no-restricted-syntax, guard-for-in, no-array-constructor */

"use strict";
/**
 *  Property of OSF Global Services, Inc., (with its brand OSF Commerce). OSF remains the sole owner of all right, title and interest in the software.
 *  Do not copy, sell, reverse engineer or otherwise attempt to derive or obtain information about the functioning, manufacture or operation therein.
 */
/**
 * This model is responsible for handling the Refill interval status of products
 */
/* global empty, request */

var PERIODICITY = {
    MONTH: "month",
    WEEK: "week"
};

var productLineItem = null;
var preferences = null;

/**
 * This function generates a JS representation of Smart Order Refill site preference values
 * @param {dw.system.SitePreferences} preferencesAgrs SFCC preferences object
 * @returns {Object} object representation of preferences
 */
function getPreferences(preferencesAgrs) {
    var preferenceObject = {
        SorEnabled: preferencesAgrs.custom.SorEnabled,
        SorOneTime: preferencesAgrs.custom.SorDeliveryOneTime,
        SorDeliveryMonthInterval: preferencesAgrs.custom.SorDeliveryMonthInterval,
        SorDeliveryWeekInterval: preferencesAgrs.custom.SorDeliveryWeekInterval,
        SorPriceBook: preferencesAgrs.custom.SorPriceBook,
        SorToAddProduct: preferencesAgrs.custom.SorToAddProduct
    };
    return preferenceObject;
}

/**
 * @description This functions retrives the product line item of the customer basket coresponding to a product ID or UUID
 * @param {string} productID id of product to search for
 * @param {string} lineItemID id of line item to serch for in collection
 * @returns {dw.order.ProductLineItem} product line item
 */
function getProductLineItem(productID, lineItemID) {
    var productLineItems = require("dw/order/BasketMgr").currentOrNewBasket.allProductLineItems;
    var lineitem = null;
    if (productLineItems.length > 0) {
        for (var index in productLineItems) {
            var productLineitem = productLineItems[index];
            if (!empty(lineItemID) && productLineitem.UUID === lineItemID) {
                lineitem = productLineitem;
                break;
            }
            if (!empty(productID) && productLineitem.productID === productID) {
                lineitem = productLineitem;
                break;
            }
        }
    }
    return lineitem;
}

/**
 * @description retrive product based on id
 * @param {string} productID id of product
 * @returns {dw.catalog.Product|null} found product
 */
function getProduct(productID) {
    var product = null;
    if (!empty(productID)) {
        product = require("dw/catalog/ProductMgr").getProduct(productID);
    }
    return product;
}

/**
 * @description This function retrives the Samrt Order Refill related inforamtion of a product
 * @param {dw.catalog.Product} product SFCC prodcut object
 * @returns {Object} object representation of Smart order Refill options of the product
 */
function getSorProductInfo(product) {
    var sorOptions = {
        isSor: false,
        commitment: 0,
        sorCustomerGroup: "",
        sorPrice: null
    };
    if (!empty(product)) {
        sorOptions.isSor = product.custom.OsfSmartOrderRefill || false;
        sorOptions.commitment = product.custom.SorCommitment || 0;
        sorOptions.sorCustomerGroup = product.custom.SorCustomerGroup || "";

        if (product.custom.OsfSmartOrderRefill && preferences.SorPriceBook) {
            var sorPriceBookID = request.session.currency.currencyCode.toLowerCase() + "-" + preferences.SorPriceBook;
            var PriceModel = product.getPriceModel();
            if (sorPriceBookID) {
                var sorPrice = PriceModel.getPriceBookPrice(sorPriceBookID).decimalValue;
                if (sorPrice) {
                    sorOptions.sorPrice = sorPrice;
                }
            }
        }
    }
    return sorOptions;
}

/**
 * @description This function retrives the week refill interval enabled on the site and the selected interval for the product line item if applicable
 * @returns {Object} object representation of weekIntervals

 */
function getWeekIntervals() {
    var weekIntervals = {
        enabled: false,
        selected: false,
        intervals: []
    };
    var intervalValue = null;
    if (preferences.SorDeliveryWeekInterval.length > 0) {
        weekIntervals.enabled = true;
        var intervalSet = false;
        if (!empty(productLineItem) && productLineItem.custom.SorPeriodicity === PERIODICITY.WEEK) {
            intervalSet = true;
            intervalValue = productLineItem.custom.SorWeekInterval;
        }
        for (var index in preferences.SorDeliveryWeekInterval) {
            var interval = preferences.SorDeliveryWeekInterval[index];
            var intervalObject = {
                value: interval,
                selected: false
            };
            if (intervalSet && interval === intervalValue) {
                intervalObject.selected = true;
                weekIntervals.selected = true;
                weekIntervals.selectedInterval = interval;
            }
            weekIntervals.intervals.push(intervalObject);
        }
    }
    return weekIntervals;
}

/**
 * @description This function retrives the month refill interval enabled on the site and the selected interval for the product line item if applicable
 * @returns {Object} object representation of monthIntervals
 */
function getMonthInterval() {
    var monthIntervals = {
        enabled: false,
        selected: false,
        intervals: []
    };
    var intervalValue = null;
    if (preferences.SorDeliveryMonthInterval.length > 0) {
        monthIntervals.enabled = true;
        var intervalSet = false;
        if (!empty(productLineItem) && productLineItem.custom.SorPeriodicity === PERIODICITY.MONTH) {
            intervalSet = true;
            intervalValue = productLineItem.custom.SorMonthInterval;
        }
        for (var index in preferences.SorDeliveryMonthInterval) {
            var interval = preferences.SorDeliveryMonthInterval[index];
            var intervalObject = {
                value: interval,
                selected: false
            };
            if (intervalSet && interval === intervalValue) {
                intervalObject.selected = true;
                monthIntervals.selected = true;
                monthIntervals.selectedInterval = interval;
            }
            monthIntervals.intervals.push(intervalObject);
        }
    }
    return monthIntervals;
}

/**
 * @description This function returns the the Smart Order Refill status of the line item
 * @returns {boolean} Smart Order Refill status of the line item
 */
function getIsSorChecked() {
    var isSorChecked = false;
    if (!empty(productLineItem) && productLineItem.custom.hasSmartOrderRefill) {
        isSorChecked = true;
    }
    return isSorChecked;
}

// member functions

/**
 * @description This function sets the refill information of the product to no refill
 * @memberof RefillOptions.prototype
 */
function remove() {
    productLineItem.custom.hasSmartOrderRefill = true;
    productLineItem.custom.SorMonthInterval = 0;
    productLineItem.custom.SorWeekInterval = 0;
    productLineItem.custom.SorPeriodicity = "";
	productLineItem.custom.sordeliveryoption = '';

    this.weekIntervals = getWeekIntervals();
    this.monthIntervals = getMonthInterval();
}

/**
 * @description This function add the refill interval and sets the refill status of the product line item
 * @param {string} intervalType interval type to set
 * @param {number} intervalValue interval value to set
 * @memberof RefillOptions.prototype
 */
function add(intervalType, intervalValue) {
    if (productLineItem) {
        productLineItem.custom.hasSmartOrderRefill = true;
        productLineItem.custom.SorPeriodicity = intervalType;
        if (intervalType === PERIODICITY.WEEK) {
            productLineItem.custom.SorMonthInterval = 0;
            productLineItem.custom.SorWeekInterval = intervalValue;
			productLineItem.custom.sordeliveryoption = 'week';
        } else if (intervalType === PERIODICITY.MONTH) {
            productLineItem.custom.SorMonthInterval = intervalValue;
            productLineItem.custom.SorWeekInterval = 0;
			productLineItem.custom.sordeliveryoption = 'month';
        } else {
            productLineItem.custom.SorMonthInterval = 0;
            productLineItem.custom.SorWeekInterval = 0;
        }
        this.weekIntervals = getWeekIntervals();
        this.monthIntervals = getMonthInterval();
    }
}

/**
 * @description This function updated the refill inforamtion of the product line item
 * @param {string} intervalType interval type to set
 * @param {number} intervalValue interval value to set
 * @param {boolean} hasRefill detrmins if prodcut should have refill set
 */
function update(intervalType, intervalValue, hasRefill) {
    if (hasRefill) {
        add(intervalType, intervalValue);
    } else {
        remove();
    }
}

/**
 * @description Contructor function for the model
 * @param {Object} args constructor arguments object
 * @constructor RefillOptions
 */
function RefillOptions(args) {
    preferences = getPreferences(args.preferences || require("dw/system/Site").current.preferences);
    productLineItem = getProductLineItem(args.productID, args.lineItemID);
    var product = getProduct(args.productID);
    if (empty(product) && !empty(productLineItem)) {
        product = productLineItem.product;
    }
    this.productLineItem = productLineItem;
    this.product = product;
    var sorProdcutOptions = getSorProductInfo(product);
    this.isSORProduct = sorProdcutOptions.isSor;
    this.commitment = sorProdcutOptions.commitment;
    this.sorCG = sorProdcutOptions.sorCustomerGroup;
    this.isSOREnabled = preferences.SorEnabled || false;
    this.sorOneTime = preferences.SorOneTime;
    this.sorToAddProduct = preferences.SorToAddProduct;
    this.weekIntervals = getWeekIntervals();
    this.monthIntervals = getMonthInterval();
    this.isSorChecked = getIsSorChecked();
    this.sorPrice = sorProdcutOptions.sorPrice;
    this.PERIODICITY = PERIODICITY;
}

RefillOptions.prototype.update = update;
RefillOptions.prototype.remove = remove;
RefillOptions.prototype.add = add;
module.exports = RefillOptions;
