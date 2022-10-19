/**
 *  Property of OSF Global Services, Inc., (with its brand OSF Commerce). OSF remains the sole owner of all right, title and interest in the software.
 *  Do not copy, sell, reverse engineer or otherwise attempt to derive or obtain information about the functioning, manufacture or operation therein.
 */

exports.SOR_STORAGE = {
    getCustomerSubscriptions: function (ArgRefillCustomer) {
        var storeStorage = require("*/cartridge/scripts/smartOrderRefill/storage/sorStorage.js");
        return storeStorage.getCustomerSubscriptions(ArgRefillCustomer);
    },

    getCustomerSubscriptionsOrders: function (ArgRefillCustomer) {
        var storeStorage = require("*/cartridge/scripts/smartOrderRefill/storage/sorStorage.js");
        return storeStorage.getCustomerSubscriptionsOrders(ArgRefillCustomer);
    },

    getCustomerSubscriptionOrders: function (ArgRefillCustomer, subscriptionID) {
        var storeStorage = require("*/cartridge/scripts/smartOrderRefill/storage/sorStorage.js");
        return storeStorage.getCustomerSubscriptionOrders(ArgRefillCustomer, subscriptionID);
    },

    saveCustomerSubscriptionOrder: function (ArgRefillCustomer, orderID) {
        var storeStorage = require("*/cartridge/scripts/smartOrderRefill/storage/sorStorage.js");
        return storeStorage.saveCustomerSubscriptionOrder(ArgRefillCustomer, orderID);
    },

    saveCustomerSubscription: function (ArgRefillCustomer, subscriptionID) {
        var storeStorage = require("*/cartridge/scripts/smartOrderRefill/storage/sorStorage.js");
        return storeStorage.saveCustomerSubscription(ArgRefillCustomer, subscriptionID);
    },

    saveCustomerInformation: function (ArgRefillCustomer) {
        var storeStorage = require("*/cartridge/scripts/smartOrderRefill/storage/sorStorage.js");
        return storeStorage.saveCustomerInformation(ArgRefillCustomer);
    }
};

exports.EXPORT_STORAGE = {
    saveSubscriptionExport: function (subscription) {
        var fileStorage = require("*/cartridge/scripts/smartOrderRefill/storage/fileStorage.js");
        return fileStorage.saveSubscriptionExport(subscription);
    },

    saveOrdersExport: function (orders) {
        var fileStorage = require("*/cartridge/scripts/smartOrderRefill/storage/fileStorage.js");
        return fileStorage.saveOrdersExport(orders);
    }
};
