'use strict';

/**
 * @module scripts/yotpo/model/authentication/AuthenticationModel
 *
 * This model is used for authentication purpose in Yotpo, It reads the site preferences to get the Yotpo connection
 * details and authentication parameters send the HTTP request. It reads the response and returns
 * authentication data. It returns error in case of some problem in authentication.
 */

/**
* This method prepares authentication JSON to call Yotpo authentication service.
*
* @param {string} yotpoAppKey - yotpoAppKey string
* @param {string} yotpoClientSecretKey - yotpoClientSecretKey string
*
* @returns {Object} authenticationJSON
*/
function prepareAuthenticationJSON(yotpoAppKey, yotpoClientSecretKey) {
    var authenticationJSON;

    authenticationJSON = '{'
        + '"client_id": "' + yotpoAppKey + '",'
        + '"client_secret": "' + yotpoClientSecretKey + '",'
        + '"grant_type": "client_credentials"'
        +
    '}';

    return authenticationJSON;
}

/**
* This method parses Yotpo response and retrieves the u-token.
*
* @param {Object} result - result object
* @returns {Object} JSON object
*/
function parseYotpoResponse(result) {
    var Result = require('dw/svc/Result');
    var YotpoLogger = require('~/cartridge/scripts/yotpo/utils/YotpoLogger');

    var logLocation = 'AuthenticationModel~parseYotpoResponse';
    var errorResult = false;
    var yotpoResponse = JSON.parse(result.object);

    if (result.status === Result.ERROR) {
        if (yotpoResponse.status) {
            YotpoLogger.logMessage('The authentication request returned error. \n Details are:' +
                ' Error Message - ' + result.errorMessage +
                ' Error Code - ' + result.error +
                ' Error type - ' + result.status, 'error', logLocation);
        }
        errorResult = true;
    } else if (result.status === Result.OK) {
        if (yotpoResponse.error) {
            YotpoLogger.logMessage('The authentication could not be performed. \n Error Message: ' + yotpoResponse.error, 'error', logLocation);
            errorResult = true;
        } else {
            YotpoLogger.logMessage('The Authetication performed successfully', 'debug', logLocation);
        }
    } else {
        YotpoLogger.logMessage('Unknown error occured while trying to authenticate with Yotpo - HTTP Status Code is: ' + result.status + ', Error Text is: ', result.errorMessage, 'error', logLocation);
        errorResult = true;
    }

    return {
        errorResult: errorResult,
        updatedUTokenAuthCode: yotpoResponse.access_token
    };
}

/**
 * This is the main function used to authenticate Yotpo.This function called Yotpo authentication service.
 * It prepares authentication json to call service and then parses Yotpo response.
 *
 * @param {Object} yotpoConfiguration - yotpoConfiguration object
 *
 * @returns {boolean} Boolean
 */
function authenticate(yotpoConfiguration) {
    var AuthenticationServiceRegistry = require('~/cartridge/scripts/yotpo/serviceregistry/AuthenticationServiceRegistry');
    var YotpoLogger = require('~/cartridge/scripts/yotpo/utils/YotpoLogger');
    var Constants = require('~/cartridge/scripts/yotpo/utils/Constants');

    var logLocation = 'AuthenticationModel~authenticate';
    var yotpoAppKey = yotpoConfiguration.custom.appKey;
    var yotpoClientSecretKey = yotpoConfiguration.custom.clientSecretKey;

    var autenticationJSON = prepareAuthenticationJSON(yotpoAppKey, yotpoClientSecretKey);

    YotpoLogger.logMessage('Sending request to Yotpo', 'debug', logLocation);
    var result = AuthenticationServiceRegistry.yotpoAuthenticationSvc.call(autenticationJSON);

    var yotpoResponse = parseYotpoResponse(result);

    if (yotpoResponse.errorResult) {
        throw Constants.AUTH_ERROR;
    }

    return yotpoResponse;
}

/* Module Exports */
exports.authenticate = authenticate;
