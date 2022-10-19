/**
 * Initialize HTTPForm services for a cartridge
 */
 
 
 //importPackage(dw.net);
 
 var LocalServiceRegistry    = require('dw/svc/LocalServiceRegistry');
 var Logger   = require('dw/system/Logger');
 var Site = require('dw/system/Site');
 var StringUtils = require('dw/util/StringUtils');

 // eslint-disable-next-line valid-jsdoc
/**
 *
 * @returns {dw.svc.Service}
 */

 function cancelGuarantee() {
      
     var service = LocalServiceRegistry.createService("Signifyd.REST.CancelGuarantee", {
         createRequest: function(svc, args){
              
             var sitePrefs = Site.getCurrent().getPreferences();
             var APIkey = sitePrefs.getCustom().SignifydApiKey;
             var authKey = StringUtils.encodeBase64(APIkey); // move to site preferences
             svc.setRequestMethod("PUT");
             svc.addHeader("Content-Type", "application/json");
             svc.addHeader("Authorization", "Basic " + authKey);
             var requestUrl =  svc.URL;
                 requestUrl = requestUrl.replace("{caseId}",args.case_id);
             svc.URL = requestUrl;
             if(args.body) {
                 return JSON.stringify(args.body);
             } else {
                 return null;
             }
         },
         parseResponse: function(svc, client) {
             return client.text;
         },
         mockCall: function(svc, client) {
             return {
                 statusCode: 200,
                 statusMessage: "Form post successful",
                 text: "{ \"investigationId\": 1}"
             };
         }
     });
 
     return service;
 }
 
 
 module.exports = {
     cancelGuarantee: cancelGuarantee
 };