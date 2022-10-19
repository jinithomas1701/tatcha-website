'use strict';

/**
*
*	 This is the Authentication service to communicate with Yotpo
*
*/
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');

var yotpoAuthenticationSvc = LocalServiceRegistry.createService('int_yotpo.https.post.auth.api', {

    createRequest: function (svc, args) {
        svc.addHeader('Content-Type', 'application/json');
        svc.addHeader('charset', 'utf-8');
        svc.addHeader('Accept', '*/*');

        return args;
    },

    parseResponse: function (svc, client) {
        return client.text;
    },

    // Hide sensitive data in server request and response logs
    getRequestLogMessage: function (reqObj) {
        var requestJSON = JSON.parse(reqObj);
        requestJSON.client_id = '';
        requestJSON.client_secret = '';

        return JSON.stringify(requestJSON);
    }
});

exports.yotpoAuthenticationSvc = yotpoAuthenticationSvc;
