'use strict';

/**
*
*	 This is the Import Review service to communicate with Yotpo
*
*/
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var YotpoUtils = require('int_yotpo/cartridge/scripts/yotpo/utils/YotpoUtils');
var currentLocaleID = YotpoUtils.getCurrentLocale(request);
var yotpoAppKey = YotpoUtils.getAppKeyForCurrentLocale(currentLocaleID);

var yotpoImportReviewRatingSvc = LocalServiceRegistry.createService('int_yotpo.http.get.import.ratings.api', {

    createRequest: function (svc, args) {
    	svc.setRequestMethod('GET')
    	var serviceCredential = svc.getConfiguration().getCredential();
    	var serviceUrl = serviceCredential.getURL();
    	serviceUrl += '/' + yotpoAppKey + '/' + args + '/' + 'bottomline';
    	svc.setURL(serviceUrl);
    	
    	svc.addHeader('Content-Type', 'application/json');
        svc.addHeader('Accept', 'application/json');

        return args;
    },

    parseResponse: function (svc, client) {
        return client.text;
    }
    
});

exports.yotpoImportReviewRatingSvc = yotpoImportReviewRatingSvc;