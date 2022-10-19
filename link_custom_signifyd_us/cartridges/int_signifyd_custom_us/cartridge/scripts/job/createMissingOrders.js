'use strict';

var OrderMgr = require('dw/order/OrderMgr');
var Logger = require('dw/system/Logger');
var Site = require('dw/system/Site');
var Order = require('dw/order/Order');

// eslint-disable-next-line valid-jsdoc
/**
 * prepares the search query
 * @returns {{string: string, values: []}}
 */
function getSearchQuery() {
    var queryFields = [];
    var queryValues = [];

    // add retry count to filter
    var signifydMaxRetryCount = Site.getCurrent().getCustomPreferenceValue('SignifydMaxRetryCount');
    queryFields.push('(custom.SignifydRetryCount < {0} AND custom.SignifydRetryCount >= {1})');
    queryValues.push(signifydMaxRetryCount);
    queryValues.push(0);

    // add signifydCaseID to filter
    queryFields.push('custom.SignifydCaseID = {2}');
    queryValues.push(null);

    //Order status
    queryFields.push('(status != {3} AND status != {4})');
    queryValues.push(Order.ORDER_STATUS_CANCELLED);
    queryValues.push(Order.ORDER_STATUS_FAILED);

    return {
        string: queryFields.join(' AND '),
        values: queryValues
    };
}

// eslint-disable-next-line valid-jsdoc
/**
 * Searchs for order in the Salesforce Commerce Cloud
 * @returns {dw.util.SeekableIterator<dw.order.Order>}
 */
function getOrdersIterator() {
    var searchQuery = getSearchQuery();
    var ordersIterator = OrderMgr.searchOrders(searchQuery.string, 'creationDate desc', searchQuery.values);
    return ordersIterator;
}

// eslint-disable-next-line valid-jsdoc
/**
 * Iterates over each order and call Signifyd
 * @param {dw.util.SeekableIterator<dw.order.Order>} ordersIterator
 */
function processOrders(ordersIterator) {
    while (ordersIterator.hasNext()) {
        var order = ordersIterator.next();
        Logger.info('Processing OrderNo: {0}', order.orderNo);
        // eslint-disable-next-line new-cap
        require('*/cartridge/scripts/service/signifyd').Call(order,false);
    }
}

/**
 * Main entry point for the Job call
 *
 */
function execute() {
    if (Site.getCurrent().getCustomPreferenceValue('SignifydEnableCartridge')) {
        var ordersIterator = getOrdersIterator();

        Logger.info('Orders count: {0}', ordersIterator.count);

        processOrders(ordersIterator);

        Logger.info('Finished order processing');
    }
}

exports.execute = execute;
