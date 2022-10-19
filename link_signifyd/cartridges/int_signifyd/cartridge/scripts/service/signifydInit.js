/**
 * Initialize HTTPForm services for a cartridge
 */
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Site = require('dw/system/Site');
var StringUtils = require('dw/util/StringUtils');


// eslint-disable-next-line valid-jsdoc
/**
 *
 * @returns {dw.svc.Service}
 */
function createCase() {
    var service = LocalServiceRegistry.createService('Signifyd.REST.CreateCase', {
        createRequest: function (svc, args) {
            var sitePrefs = Site.getCurrent().getPreferences();
            var APIkey = sitePrefs.getCustom().SignifydApiKey;
            var authKey = StringUtils.encodeBase64(APIkey); // move to site preferences
            svc.setRequestMethod('POST');
            svc.addHeader('Content-Type', 'application/json');
            svc.addHeader('Authorization', 'Basic ' + authKey);
            if (args) {
                return JSON.stringify(args);
            }
            return null;
        },
        parseResponse: function (svc, client) {
            return client.text;
        },
        mockCall: function () {
            return {
                statusCode: 200,
                statusMessage: 'Form post successful',
                text: '{ "investigationId": 1}'
            };
        },
        getResponseLogMessage: function (response) {
            return response.statusMessage;
        },
        filterLogMessage: function (msg) {
            if (!empty(msg) && dw.system.System.getInstanceType() === dw.system.System.PRODUCTION_SYSTEM){
                msg = msg.replace(/\"cardBin\"\:\w*/, '"cardBin":"******"');
                msg = msg.replace(/\"cardLast4\"\:\".{4}\"/, '"cardLast4":"****"');
                msg = msg.replace(/\"cardExpiryMonth\"\:.{2}/, '"cardExpiryMonth":"**"');
                msg = msg.replace(/\"cardExpiryYear\"\:.{4}/, '"cardExpiryYear":"****"');
                msg = msg.replace(/\"accountId\"\:\w*/, '"accountId":"****"');
            }
            return msg;
        }
    });

    return service;
}

function sendTransaction() {
    var service = LocalServiceRegistry.createService('Signifyd.REST.SendTransaction', {
        createRequest: function (svc, args) {
            var sitePrefs = Site.getCurrent().getPreferences();
            var APIkey = sitePrefs.getCustom().SignifydApiKey;
            var authKey = StringUtils.encodeBase64(APIkey); // move to site preferences
            svc.setRequestMethod('POST');
            svc.addHeader('Content-Type', 'application/json');
            svc.addHeader('Authorization', 'Basic ' + authKey);
            if (args) {
                return JSON.stringify(args);
            }
            return null;
        },
        parseResponse: function (svc, client) {
            return client.text;
        },
        getResponseLogMessage: function (response) {
            return response.statusMessage;
        },
        filterLogMessage: function () {
        }
    });
    return service;
}

function sendFulfillment() {
    var service = LocalServiceRegistry.createService('Signifyd.REST.SendFulfillment', {
        createRequest: function (svc, args) {
            var sitePrefs = Site.getCurrent().getPreferences();
            var APIkey = sitePrefs.getCustom().SignifydApiKey;
            var authKey = StringUtils.encodeBase64(APIkey); // move to site preferences
            svc.setRequestMethod('POST');
            svc.addHeader('Content-Type', 'application/json');
            svc.addHeader('Authorization', 'Basic ' + authKey);
            var url = svc.getURL(); //ADD THE ORDER ID arguments[1].fulfillments.orderId
            url = url.replace(/orderId/g, args.fulfillments[0].orderId);
            svc.setURL(url);
            if (args) {
                return JSON.stringify(args);
            }
            return null;
        },
        parseResponse: function (svc, client) {
            return client.text;
        },
        mockCall: function () {
            return {
                statusCode: 200,
                statusMessage: 'Form post successful',
                text: '{ "investigationId": 1}'
            };
        },
        getResponseLogMessage: function (response) {
            return response.statusMessage;
        },
        filterLogMessage: function () {
        }
    });

    return service;
}

module.exports = {
    createCase: createCase,
    sendTransaction: sendTransaction,
    sendFulfillment: sendFulfillment
};
