/* eslint-disable no-unused-vars */
/* eslint-disable no-restricted-syntax, guard-for-in, no-array-constructor */

"use strict";
/**
 *  Property of OSF Global Services, Inc., (with its brand OSF Commerce). OSF remains the sole owner of all right, title and interest in the software.
 *  Do not copy, sell, reverse engineer or otherwise attempt to derive or obtain information about the functioning, manufacture or operation therein.
 */
/* global empty */
var Transaction = require("dw/system/Transaction");
/**
 * Get the customer subscriptions
 * @param {RefillCustomer} ArgRefillCustomer - refillcustomer
 * @returns {Object} Returns the parsed Object
 */
function getCustomerSubscriptions(ArgRefillCustomer) {
    var RefillCustomer = ArgRefillCustomer;
    var parsedObject = new Array();
    try {
        parsedObject = JSON.parse(RefillCustomer.customer.profile.custom.SorSubscriptions);
        if (empty(parsedObject)) {
            parsedObject = new Array();
        }
    } catch (error) {
        parsedObject = new Array();
    }
    return parsedObject;
}

exports.getCustomerSubscriptions = getCustomerSubscriptions;
/**
 * Get customer subscriptions orders
 * @param {RefillCustomer} ArgRefillCustomer - refillcustomer
 * @returns {Object} Returns the orders
 */
function getCustomerSubscriptionsOrders(ArgRefillCustomer) {
    var RefillCustomer = ArgRefillCustomer;
    var customerSubscriptionsOrders = JSON.parse(RefillCustomer.customer.profile.custom.SorOrders) || [];

    return customerSubscriptionsOrders;
}

exports.getCustomerSubscriptionsOrders = getCustomerSubscriptionsOrders;
/**
 * Get customer subscription orders
 * @param {RefillCustomer} ArgRefillCustomer - refillcustomer
 * @param {string} subscriptionID - subscription ID
 * @returns {Object} Returns the orders
 */
function getCustomerSubscriptionOrders(ArgRefillCustomer, subscriptionID) {
    var RefillCustomer = ArgRefillCustomer;
    var parsedObject = new Array();
    var subscriptionsOrders = new Array();
    try {
        parsedObject = JSON.parse(RefillCustomer.customer.profile.custom.SorOrders);
        if (empty(parsedObject)) {
            parsedObject = new Array();
        }
    } catch (error) {
        parsedObject = new Array();
    }
    for (var parsedObjectIndex in parsedObject) {
        var subscriptionOrder = parsedObject[parsedObjectIndex];
        if (subscriptionOrder.subscriptionID === subscriptionID) {
            subscriptionsOrders.push(subscriptionOrder);
        }
    }
    return subscriptionsOrders;
}

exports.getCustomerSubscriptionOrders = getCustomerSubscriptionOrders;

// eslint-disable-next-line no-unused-vars
/**
 * Save customer subscription order
 * @param {RefillCustomer} ArgRefillCustomer - refillcustomer
 * @param {string} orderID - order ID
 * @returns {boolean} Returns success true or false if is saved or not
 */
function saveCustomerSubscriptionOrder(ArgRefillCustomer, orderID) {
    var RefillCustomer = ArgRefillCustomer;
    var customerOrders = new Array();
    var success = true;
    for (var orderIndex in RefillCustomer.orders) {
        var order = RefillCustomer.orders[orderIndex];
        customerOrders.push(order.serialize());
    }
    try {
        Transaction.wrap(function () {
            RefillCustomer.customer.profile.custom.SorOrders = JSON.stringify(customerOrders);
        });
    } catch (error) {
        success = false;
    }
    return success;
}

exports.saveCustomerSubscriptionOrder = saveCustomerSubscriptionOrder;

// eslint-disable-next-line no-unused-vars
/**
 * Save customer subscription
 * @param {RefillCustomer} ArgRefillCustomer - refillcustomer
 * @param {string} subscriptionID - subscription ID
 * @returns {boolean} Returns success true or false if is saved or not
 */
function saveCustomerSubscription(ArgRefillCustomer, subscriptionID) {
    var RefillCustomer = ArgRefillCustomer;
    var customerOrders = new Array();
    var customerSubscriptions = new Array();
    var success = true;
    for (var orderIndex in RefillCustomer.orders) {
        var order = RefillCustomer.orders[orderIndex];
        if (order.status !== order.constructor.STATUS_DELETED) {
            customerOrders.push(order.serialize());
        }
    }
    for (var subscriptionsIndex in RefillCustomer.subscriptions) {
        var subscription = RefillCustomer.subscriptions[subscriptionsIndex];
        customerSubscriptions.push(subscription.serialize());
    }
    try {
        Transaction.wrap(function () {
            RefillCustomer.customer.profile.custom.SorOrders = JSON.stringify(customerOrders);
            RefillCustomer.customer.profile.custom.SorSubscriptions = JSON.stringify(customerSubscriptions);
        });
    } catch (error) {
        success = false;
    }
    return success;
}

exports.saveCustomerSubscription = saveCustomerSubscription;
/**
 * Save customer information
 * @param {RefillCustomer} ArgRefillCustomer - refillcustomer
 * @returns {boolean} Returns success true or false if is saved or not
 */
function saveCustomerInformation(ArgRefillCustomer) {
    var RefillCustomer = ArgRefillCustomer;
    var customerHasSmartOrderRefill = false;
    var customerHasStandBySubscriptions = false;
    var customerHasSmartOrderRefillHistory = true;
    var customerHasActiveSubscriptions = false;
    var success = true;

    for (var ordersIndex in RefillCustomer.orders) {
        var order = RefillCustomer.orders[ordersIndex];
        if (order.status !== order.constructor.STATUS_PROCESSED && order.status !== order.constructor.STATUS_CANCELED && order.status !== order.constructor.STATUS_DELETED) {
            customerHasSmartOrderRefill = true;

            break;
        }
    }

    for (var subscriptionsIndex in RefillCustomer.subscriptions) {
        var subscription = RefillCustomer.subscriptions[subscriptionsIndex];
        if (subscription.status === subscription.constructor.STATUS_PAUSED) {
            customerHasStandBySubscriptions = true;
        }
        if (subscription.status === subscription.constructor.STATUS_NEW || subscription.status === subscription.constructor.STATUS_UPDATED) {
            customerHasActiveSubscriptions = true;
        }
    }

    RefillCustomer.hasSmartOrderRefill = customerHasSmartOrderRefill;
    RefillCustomer.hasStandBySubscriptions = customerHasStandBySubscriptions;
    RefillCustomer.hasSmartOrderRefillHistory = customerHasSmartOrderRefillHistory;
    RefillCustomer.hasActiveSubscriptions = customerHasActiveSubscriptions;

    try {
        Transaction.wrap(function () {
            RefillCustomer.customer.profile.custom.hasSmartOrderRefill = customerHasSmartOrderRefill;
            RefillCustomer.customer.profile.custom.hasStandBySubscriptions = customerHasStandBySubscriptions;
            RefillCustomer.customer.profile.custom.hasSmartOrderRefillHistory = customerHasSmartOrderRefillHistory;
            RefillCustomer.customer.profile.custom.hasActiveSubscriptions = customerHasActiveSubscriptions;
        });
    } catch (error) {
        success = false;
    }
    return success;
}

exports.saveCustomerInformation = saveCustomerInformation;
