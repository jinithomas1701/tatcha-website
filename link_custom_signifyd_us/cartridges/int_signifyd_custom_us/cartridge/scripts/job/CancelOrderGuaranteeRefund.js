'use strict';

var OrderMgr = require('dw/order/OrderMgr');
var Logger   = require('dw/system/Logger');
var Order    = require('dw/order/Order');

/**
 * Searchs for order in the Salesforce Commerce Cloud
 */
function getOrdersIterator() {
 	var ordersIterator = OrderMgr.searchOrders('custom.SignifydCaseID != {0} AND (custom.SignifydCancelGuaranteeStatus = {1} OR custom.SignifydCancelGuaranteeStatus = {2}) AND custom.FullRefundStatus = {3}', 'creationDate desc',null,null,false,true);
 	
    return ordersIterator;
}

/**
 * Iterates over each order and call Signifyd
 * @param {*} ordersIterator 
 */
function processOrders(ordersIterator) {
	var count =0;
    while (ordersIterator.hasNext()) {
        var order = ordersIterator.next(); 
        var casenumber = order.custom.SignifydCaseID; 
        if(order.custom.hasOwnProperty('SignifydCaseID') && casenumber != 'undefined'){
           count++;
           require('int_signifyd_custom_us/cartridge/scripts/service/signifyd-extend').cancelguarantee(order);
       } 
    }
    if(count > 0 ){
    	Logger.getLogger("Signifyd", "signifyd-extend-job").info('Finished processing for {0} orders ', count);
    }else{
    	Logger.getLogger("Signifyd", "signifyd-extend-job").info('There are no orders to process ');
    }
    
}

/**
 * Main entry point for the Job call
 * @param {Object} args - Optional arguments to filter the search
 */
function execute(args) {
	if (dw.system.Site.getCurrent().getCustomPreferenceValue("SignifydEnableCartridge") && dw.system.Site.getCurrent().getCustomPreferenceValue("SignifydRefundEnable") === true) {
        var ordersIterator = getOrdersIterator(args); 
         processOrders(ordersIterator); 
    }else{
    	Logger.getLogger("Signifyd", "signifyd-extend-job").info('This job or cartridge is disabled  SignifydEnableCartridge: {0}, SignifydRefundEnable: {1}',dw.system.Site.getCurrent().getCustomPreferenceValue("SignifydEnableCartridge"), dw.system.Site.getCurrent().getCustomPreferenceValue("SignifydRefundEnable") );
    }
}

exports.execute = execute;
