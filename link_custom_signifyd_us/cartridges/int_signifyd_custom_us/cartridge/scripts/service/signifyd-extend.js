/**
* Main Signifyd Script File
* Two main public methods are Call and Callback
* 
* Call - for export order info to.
* Callback - for receive data about guarantie Status.
*
*/
/*importPackage(dw.util);
importPackage(dw.svc);
importPackage(dw.net);
importPackage(dw.io);

importPackage(dw.order);*/



var Site = require('dw/system/Site');
var System = require('dw/system/System');
var sitePrefs = Site.getCurrent().getPreferences();
var Order = require('dw/order/Order');
var APIkey = sitePrefs.getCustom().SignifydApiKey;
var HoldBySignified = sitePrefs.getCustom().SignifydHoldOrderEnable;
var EnableCartridge = sitePrefs.getCustom().SignifydEnableCartridge;
var Mac = require('dw/crypto/Mac');
var Logger = require('dw/system/Logger');
var Transaction = require('dw/system/Transaction');
var signifydInitExtend = require('int_signifyd_custom_us/cartridge/scripts/service/signifydInit-extend');
var signifydInit = require('int_signifyd/cartridge/scripts/service/signifydInit');
var signifyd = require('*/cartridge/scripts/service/signifyd');
var SignifydMappings = JSON.parse(sitePrefs.getCustom().SignifydMappings);
var Resource = require('dw/web/Resource');
var Calendar = require('dw/util/Calendar');
var StringUtils = require('dw/util/StringUtils');

	
/**	
 * Send Signifyd cancel guarantee to cancel the order	
 	
 * @param {case_id} - Case id from the order.	
 * @return 1 on succes, 0 on error.	
 */ 	
exports.cancelguarantee = function (order) {	
    if (EnableCartridge) {	
        if (order && order.custom.SignifydCaseID) {
           Logger.getLogger("Signifyd", "signifyd-extend-job").info("Info: API Cancel guarantee for Order {0} case number: {1}", order.currentOrderNo,order.custom.SignifydCaseID);	
            var params = {body:{'guaranteeDisposition': 'CANCELED'},case_id:order.custom.SignifydCaseID};	
			var service = signifydInitExtend.cancelGuarantee();	
            if (service) {	
                try { 	
                    var result = service.call(params);
                    if (result.ok) {	
                        var returnData = JSON.parse(result.object);
                         Logger.getLogger("Signifyd", "signifyd").info("result: {0} ", JSON.stringify(returnData)); 	
                         Transaction.wrap(function () {
		                    order.custom.SignifydCancelGuaranteeStatus = true;
		                 });    
                         return true;	
                    } else {
                    	 
           			   Logger.getLogger("Signifyd", "signifyd-extend-job").info("Param:  {0} ",  JSON.stringify(params));	
                       Logger.getLogger("Signifyd", "signifyd-extend-job").error("Error: {0} : {1}", result.error, JSON.stringify(result.errorMessage));	
                    }	
                } catch (e) {	
                   Logger.getLogger("Signifyd", "signifyd-extend-job").error("Error: API Cancel guarantee was interrupted unexpectedly. Exception: {0}", e.message);	
                }	
            } else {	
               Logger.getLogger("Signifyd", "signifyd-extend-job").error("Error: Service Please provide correct case id for Call method");	
            }	
        } else {	
           Logger.getLogger("Signifyd", "signifyd-extend-job").error("Error: Please provide correct case id for Call method");	
        }	
    }	
    return 0;	
}	
 	
