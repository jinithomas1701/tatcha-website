/* eslint-disable no-undef */
/*
 * AvaTax REST service client
 */
/* eslint-disable no-unused-vars */
'use strict';

// API includes
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');

// Custom logger
var LOGGER = require('dw/system/Logger').getLogger('Avalara', 'AvaTax');

// Global service componentnts
var svc;
var config;
var url;
var user;
var password;
var encodedAuthStr;
var credential;
var clientHeaderStr;


/**
 * Initialize the service components
 */
function initservice() {
    // Create a service object
    svc = LocalServiceRegistry.createService('avatax.rest.all', {
        createRequest: function (_svc, args) {
            if (args) {
                return JSON.stringify(args);
            }
            return null;
        },
        parseResponse: function (_svc, client) {
            return client.text;
        }
    });
    // Configure the service related parameters
    config = svc.getConfiguration();
    credential = config.getCredential();
    url = !empty(credential.getURL()) ? credential.getURL() : '';
    user = credential.getUser();
    password = credential.getPassword();
    encodedAuthStr = require('dw/util/StringUtils').encodeBase64(user + ':' + password);
    if (session.privacy.sitesource && session.privacy.sitesource === 'sgjc') {
        clientHeaderStr = 'SF B2C/SGJC || 20.1.0v2; a0o0b000005cECaAAM';
    } else {
        clientHeaderStr = 'SF B2C/SFRA || 20.1.0v2; a0o0b000005cECLAA2'; // (app name); (app version); (library name); (library version); (machine name)
    }
    svc.addHeader('Accept', 'application/json');
    svc.addHeader('X-Avalara-Client', clientHeaderStr);
    svc.addHeader('Authorization', 'Basic ' + encodedAuthStr);
}

// Logentries variables
var leSvc;
var leConfig;
var leCredential;
var leUrl;
var leSvcresponse;
/**
 * Initialize the log entries service and retrieve the related configuration
 */
function initLeService() {
    // Logentries service
    leSvc = LocalServiceRegistry.createService('logentries.avatax.svc', {
        createRequest: function (_svc, args) {
            if (args) {
                return JSON.stringify(args);
            }
            return null;
        },
        parseResponse: function (_svc, client) {
            return client.text;
        }
    });
    // Configure service related parameters
    leConfig = leSvc.getConfiguration();
    leCredential = leConfig.getCredential();
    if (url.toLowerCase().indexOf('sandbox') === -1) {
        if (session.privacy.sitesource && session.privacy.sitesource === 'sgjc') {
            leUrl = leCredential.getURL() + '1e91ee1e-5803-4190-82d6-7e20cd03300d'; // logentries sgjc production
        } else {
            leUrl = leCredential.getURL() + 'd220e459-1119-46b8-8b3b-8aa4dee04245'; // logentries sfra production
        }
    } else if (session.privacy.sitesource && session.privacy.sitesource === 'sgjc') {
        leUrl = leCredential.getURL() + '6e7e8a4d-e107-43fc-ade7-90bd69f83856'; // logentries sgjc development
    } else {
        leUrl = leCredential.getURL() + '78bf832b-72c4-4bf6-a062-39948937dcfb'; // logentries sfra development
    }
    leSvc.setURL(leUrl);
    leSvc.addHeader('Content-Type', 'application/json');
}

/**
 * Retrives auth info for AvaTax
 * @returns {*} authinfo object
 */
function getAuthInfo() {
    initservice();
    initLeService();
    return {
        url: url,
        user: user,
        leUrl: leUrl
    };
}

/**
 * Log the log details to logentries server using the logentries service call
 * @param {*} jsonLog jsonLog
 * @returns {*} log response
 */
function leLog(jsonLog) {
    initLeService();
    leSvcresponse = leSvc.call(jsonLog);
    if (leSvcresponse.status !== 'OK') {
        LOGGER.warn('Got an error calling:' + leUrl + '. The status code is: ' + leSvcresponse.status +
            ', and the text is: ' + leSvcresponse +
            ' and the error text is: ' + leSvcresponse.getErrorMessage());
        var errorResult = {
            statusCode: leSvcresponse.status,
            errorMessage: JSON.parse(leSvcresponse.getErrorMessage()),
            url: leUrl
        };
        return errorResult;
    }
    // return a plain javascript object
    return {
        success: true
    };
}

/**
 * Filters the service response object.
 * @param {*} httpResponse httpResponse
 * @returns {*} Returns error details if unsuccessful. Otherwise, the response JSON.
 */
function responseFilter(httpResponse) {
    if (httpResponse.status !== 'OK') {
        var errorResult = {
            statusCode: httpResponse.status,
            errorMessage: JSON.parse(httpResponse.getErrorMessage()),
            url: url
        };
        return errorResult;
    }
    // return a plain javascript object
    return JSON.parse(httpResponse.object);
}

/**
 * Helps diagnose connectivity problems between the application and AvaTax.
 * @returns {Object} a response object that contains information about the authentication
 */
function testConnection() {
    initservice();
    url += 'api/v2/utilities/ping';
    svc.setRequestMethod('GET');
    url = encodeURI(url);
    svc.setURL(url);
    // service call
    var httpResult = svc.call();
    return responseFilter(httpResult);
}

/**
 * Resolve an address against Avalara's address-validation system
 * @param {Object} addressValidationInfo - addressValidationInfo object
 * @returns {Object} a response object that contains information about the validated address
 */
function resolveAddressPost(addressValidationInfo) {
    initservice();
    url += 'api/v2/addresses/resolve';
    svc.setRequestMethod('POST');
    url = encodeURI(url);
    svc.setURL(url);
    // service call
    var httpResult = svc.call(addressValidationInfo);
    return responseFilter(httpResult);
}

/**
 * Records a new transaction in AvaTax.
 * @param {Object} createTransactionModel object - refer AvaTax documentation
 * @param {Object} include object - refer AvaTax documentation
 * @returns {Object} a response object that contains information about the taxes
 */
function createTransaction(createTransactionModel, include) {
    initservice();
    url += 'api/v2/transactions/create' + (!empty(include) ? '?$include=' + include : '');
    svc.setRequestMethod('POST');
    url = encodeURI(url);
    svc.setURL(url);
    // service call
    var httpResult = svc.call(createTransactionModel);
    return responseFilter(httpResult);
}


/**
 * Marks a transaction by changing its status to 'Committed'
 * @param {string} companyCode - refer AvaTax documentation
 * @param {string} transactionCode - Order number in SFCC - refer AvaTax documentation
 * @param {string} commitTransactionModel object
 * @param {string} documentType string
 * @returns {Object} a response object that contains information about the transaction
 */
function commitTransaction(companyCode, transactionCode, commitTransactionModel, documentType) {
    initservice();
    url += 'api/v2/companies/' + companyCode + '/transactions/' + transactionCode + '/commit' + (!empty(documentType) ? '?documentType=' + documentType : '');
    url = encodeURI(url);
    svc.setRequestMethod('POST');
    svc.setURL(url);
    // service call
    var httpResult = svc.call(commitTransactionModel);
    return responseFilter(httpResult);
}


/**
 * Records a new transaction or adjust an existing transaction in AvaTax
 * @param {string} include string
 * @param {Object} createOrAdjustTransactionModel object
 * @returns {Object} a response object that contains information about the transaction
 */
function createOrAdjustTransaction(include, createOrAdjustTransactionModel) {
    initservice();
    url += 'api/v2/transactions/createoradjust' + (!empty(include) ? '?$include=' + include : '');
    url = encodeURI(url);
    svc.setRequestMethod('POST');
    svc.setURL(url);
    // service call
    var httpResult = svc.call(createOrAdjustTransactionModel);
    return responseFilter(httpResult);
}


/**
 * Voids the current transaction uniquely identified by transactionCode.
 * @param {string} companyCode string
 * @param {string} transactionCode string
 * @param {Object} voidTransactionModel object
 * @returns {Object} a response object that contains information about the transaction being voided
 */
function voidTransaction(companyCode, transactionCode, voidTransactionModel) {
    initservice();
    url += 'api/v2/companies/' + companyCode + '/transactions/' + transactionCode + '/void';
    url = encodeURI(url);
    svc.setRequestMethod('POST');
    svc.setURL(url);
    // service call
    var httpResult = svc.call(voidTransactionModel);
    return responseFilter(httpResult);
}


/**
 * Replaces the current transaction uniquely identified by this URL with a new transaction.
 * @param {string}companyCode string
 * @param {string} transactionCode string
 * @param {Object} adjustTransactionModel object
 * @returns {Object} a response object that contains information about the transaction being adjusted
 */
function adjustTransaction(companyCode, transactionCode, adjustTransactionModel) {
    initservice();
    url += 'api/v2/companies/' + companyCode + '/transactions/' + transactionCode + '/adjust';
    url = encodeURI(url);
    svc.setRequestMethod('POST');
    svc.setURL(url);
    // service call
    var httpResult = svc.call(adjustTransactionModel);
    return responseFilter(httpResult);
}

/**
 * Build a multi - location tax content file
 * @param {*} companyCode companyCode
 * @param {*} documentDate documentDate
 * @param {*} taxCodes taxCodes
 * @param {*} locationCodes locationCodes
 * @returns {*} object
 */
function buildTaxContent(companyCode, documentDate, taxCodes, locationCodes) {
    initservice();
    url += 'api/v2/pointofsaledata/build';
    url = encodeURI(url);
    svc.setRequestMethod('POST');
    svc.setURL(url);

    documentDate = '2019-08-13';
    companyCode = 'default';
    taxCodes = ['P0000000'];
    locationCodes = ['NY', 'TN'];


    var request = {
        companyCode: companyCode,
        documentDate: documentDate,
        responseType: 'xml',
        taxCodes: taxCodes,
        locationCodes: locationCodes,
        includeJurisCodes: true
    };

    // service call
    var httpResult = svc.call(request);
    return httpResult.object;
}

/**
 * Gets all transactions for specified company for specified date range
 * @param {string} companyCode string
 * @param {string} fromDate string
 * @param {string} toDate string
 * @returns {Object} a collection object that contains information about the transactions
 */
function getTransactions(companyCode, fromDate, toDate) {
    initservice();
    if (empty(fromDate) || empty(toDate)) {
        url += 'api/v2/companies/' + companyCode + '/transactions';
    } else {
        url += 'api/v2/companies/' + companyCode + '/transactions?$filter=date between \'' + fromDate + '\' and \'' + toDate + '\' AND status <> Adjusted';
    }
    url = encodeURI(url);
    svc.setRequestMethod('GET');
    svc.setURL(url);
    // service call
    var httpResult = svc.call();
    var result = null;
    var records;
    if (httpResult.status !== 'OK') {
        result = {
            status: 'error',
            values: null,
            errorMessage: JSON.parse(httpResult.getErrorMessage())
        };
    } else {
        // return a plain javascript object
        records = JSON.parse((httpResult.object).replace('@nextLink', 'nextLink'));
    }
    var SortedMap = require('dw/util/SortedMap');
    var sm = new SortedMap();
    if (records.value) {
        for (var i = 0; i < records.value.length; i++) {
            sm.put(records.value[i].code, records.value[i]);
        }
        while (records.nextLink) {
            initservice(); //
            url += records.nextLink;
            url = encodeURI(url);
            svc.setRequestMethod('GET');
            svc.setURL(url);
            // service call
            var httpResult1 = svc.call();
            var record1;
            if (httpResult1.status !== 'OK') {
                result = {
                    status: 'error',
                    values: null,
                    errorMessage: JSON.parse(httpResponse.getErrorMessage())
                };
            } else {
                // return a plain javascript object
                record1 = JSON.parse((httpResult1.object).replace('@nextLink', 'nextLink'));
                if (record1.value) {
                    for (i = 0; i < record1.value.length; i++) {
                        sm.put(record1.value[i].code, record1.value[i]);
                    }
                }
            }
        }
        result = {
            ERROR: false,
            values: sm
        };
    } else {
        result = {
            ERROR: true,
            values: null
        };
    }
    return result;
}

// Module exports
module.exports = {
    testConnection: testConnection,
    resolveAddressPost: resolveAddressPost,
    createTransaction: createTransaction,
    commitTransaction: commitTransaction,
    createOrAdjustTransaction: createOrAdjustTransaction,
    voidTransaction: voidTransaction,
    adjustTransaction: adjustTransaction,
    getAuthInfo: getAuthInfo,
    leLog: leLog,
    getTransactions: getTransactions,
    buildTaxContent: buildTaxContent
};