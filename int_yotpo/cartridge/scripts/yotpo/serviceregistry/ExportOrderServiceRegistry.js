'use strict';

/**
*
*	 This is the Export Order service to communicate with Yotpo
*
*/
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');

var yotpoExportOrdersSvc = LocalServiceRegistry.createService('int_yotpo.https.post.export.purchase.api', {

    createRequest: function (svc, args) {
        svc.addHeader('Content-Type', 'application/json; charset=utf-8');
        svc.addHeader('Accept', '*/*');
        svc.addHeader('Accept-Encoding', 'gzip,deflate');

        return args;
    },

    parseResponse: function (svc, client) {
        return client.text;
    },

    // Hide sensitive data in server request and response logs
    getRequestLogMessage: function (reqObj) {
        var requestJSON = JSON.parse(reqObj);
        var orders = requestJSON.orders;

        for (var i = 0; i < orders.length; i++) {
            orders[i].email = '';
            orders[i].customer_name = '';
        }

        return JSON.stringify(requestJSON);
    }
});

exports.yotpoExportOrdersSvc = yotpoExportOrdersSvc;
