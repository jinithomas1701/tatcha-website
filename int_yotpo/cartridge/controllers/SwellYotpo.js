'use strict';

/**
 * @module controllers/SwellYotpo
 *
 * This is main controller for Swell Loyalty. It contains all endpoints which
 * Yotpo cartridge exposes to search customers, orders and process other data requests.
 */

var Constants = require('~/cartridge/scripts/yotpo/utils/Constants');
var guard = require(Constants.SITEGENESIS_CARTRIDGE_NAME + '/cartridge/scripts/guard.js');

var SwellAPI = require('~/cartridge/scripts/yotpo/swell/api/SwellAPI');
var YotpoLogger = require('~/cartridge/scripts/yotpo/utils/YotpoLogger');

/**
 * This function used to get single customer on the base of email and customer no
 *
 */
function getSingleCustomer() {
    YotpoLogger.logMessage('Received request to fetch single customer',
            'debug', 'SwellYotpo~getSingleCustomer');

    var requestParams = request.httpParameterMap;

    var params = {
        apiKey: requestParams.api_key.value,
        customerNo: requestParams.id.value,
        email: requestParams.email.value,
        singleCustomer: true
    };

    var result = SwellAPI.fetchCustomers(params);

    response.setContentType('application/json');
    response.setStatus(result.status);
    response.writer.write(JSON.stringify(result.responseJSON));
}

/**
 * This function used to get multiple customer on the base of start and end index
 *
 */
function getMultipleCustomers() {
    YotpoLogger.logMessage('Received request to fetch multiple customers',
            'debug', 'SwellYotpo~getMultipleCustomers');

    var requestParams = request.httpParameterMap;

    var params = {
        apiKey: requestParams.api_key.value,
        startIndex: requestParams.page.value,
        pageSize: requestParams.page_size.value,
        singleCustomer: false
    };

    var result = SwellAPI.fetchCustomers(params);

    response.setContentType('application/json');
    response.setStatus(result.status);
    response.writer.write(JSON.stringify(result.responseJSON));
}

/**
 * This function is used to count order by its state
 */
function getOrderCountByState() {
    YotpoLogger.logMessage('Received request to fetch order by state',
            'debug', 'SwellYotpo~getOrderCountByState');

    var requestParams = request.httpParameterMap;

    var params = {
        apiKey: requestParams.api_key.value,
        state: requestParams.state.value,
        orderCountByState: true
    };

    var result = SwellAPI.getOrdersCount(params);

    response.setContentType('application/json');
    response.setStatus(result.status);
    response.writer.write(JSON.stringify(result.responseJSON));
}

/**
 * This function is used to count order by its volume by default it will return 30
 */
function getOrderCountByVolume() {
    YotpoLogger.logMessage('Received request to fetch order by volume',
            'debug', 'SwellYotpo~getOrderCountByVolume');

    var requestParams = request.httpParameterMap;

    var params = {
        apiKey: requestParams.api_key.value,
        orderCountByState: false
    };

    var result = SwellAPI.getOrdersCount(params);

    response.setContentType('application/json');
    response.setStatus(result.status);
    response.writer.write(JSON.stringify(result.responseJSON));
}

/**
 * This function is used to get single order by its ID
 */
function getSingleOrder() {
    YotpoLogger.logMessage('Received request to fetch order by id',
            'debug', 'SwellYotpo~getOrder');

    var requestParams = request.httpParameterMap;

    var params = {
        apiKey: requestParams.api_key.value,
        orderId: requestParams.id.value,
        singleOrder: true
    };

    var result = SwellAPI.fetchOrders(params);

    response.setContentType('application/json');
    response.setStatus(result.status);
    response.writer.write(JSON.stringify(result.responseJSON));
}

/**
 * This function is used to get multiple order by start and end index
 */
function getMultipleOrders() {
    YotpoLogger.logMessage('Received request to fetch orders by page size, page counter and state',
            'debug', 'SwellYotpo~getOrders');

    var requestParams = request.httpParameterMap;

    var params = {
        apiKey: requestParams.api_key.value,
        page: requestParams.page.value,
        pageSize: requestParams.page_size.value,
        state: requestParams.state.value,
        singleOrder: false
    };

    var result = SwellAPI.fetchOrders(params);

    response.setContentType('application/json');
    response.setStatus(result.status);
    response.writer.write(JSON.stringify(result.responseJSON));
}
/**
 * This endpoint is used to create gift certificates based on request parameters.
 * It will authenticate incoming API request using Swell API Key.
 */
function createGiftCertificate() {
    YotpoLogger.logMessage('Received request to create gift certificate',
            'debug', 'SwellYotpo~CreateGiftCertificate');

    var requestParams = request.httpParameterMap;

    var params = {
        apiKey: requestParams.api_key.value,
        amount: requestParams.amount.value,
        code: requestParams.code ? requestParams.code.value : null,
        senderName: requestParams.sender_name ? requestParams.sender_name.value : null,
        recipientName: requestParams.recipient_name ? requestParams.recipient_name.value : null,
        recipientEmail: requestParams.recipient_email ? requestParams.recipient_email.value : null,
        description: requestParams.description ? requestParams.description.value : null,
        message: requestParams.message ? requestParams.message.value : null
    };

    var result = SwellAPI.createGiftCertificate(params);
    response.setContentType('application/json');
    response.setStatus(result.status);
    response.writer.write(JSON.stringify(result.responseJSON));
}

exports.GetCustomer = guard.ensure(['get', 'https'], getSingleCustomer);
exports.GetCustomers = guard.ensure(['get', 'https'], getMultipleCustomers);
exports.GetOrderCountByState = guard.ensure(['get', 'https'], getOrderCountByState);
exports.GetOrderCountByVolume = guard.ensure(['get', 'https'], getOrderCountByVolume);
exports.GetOrder = guard.ensure(['get', 'https'], getSingleOrder);
exports.GetOrders = guard.ensure(['get', 'https'], getMultipleOrders);
exports.CreateGiftCertificate = guard.ensure(['post', 'https'], createGiftCertificate);

