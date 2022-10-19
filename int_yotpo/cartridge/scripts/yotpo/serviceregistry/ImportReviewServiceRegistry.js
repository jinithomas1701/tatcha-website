'use strict';

/**
*
*	 This is the Import Review service to communicate with Yotpo
*
*/
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');

var yotpoImportReviewSvc = LocalServiceRegistry.createService('int_yotpo.http.post.import.reviews.api', {

    createRequest: function (svc, args) {
        svc.addHeader('Content-Type', 'application/json; charset=utf-8');
        svc.addHeader('Accept', '*/*');

        return args;
    },

    parseResponse: function (svc, client) {
        return client.text;
    },

    // Hide sensitive data in server request and response logs
    getRequestLogMessage: function (reqObj) {
        var requestJSON = JSON.parse(reqObj);
        requestJSON.app_key = '';

        return JSON.stringify(requestJSON);
    }
});

exports.yotpoImportReviewSvc = yotpoImportReviewSvc;
