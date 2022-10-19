'use strict';

var OrderMgr = require('dw/order/OrderMgr');
var Logger   = require('dw/system/Logger');


/**
 * Searchs for order in the Salesforce Commerce Cloud
 */
function getOrdersIterator(args) { 
	var canceledStatus =  dw.order.Order.ORDER_STATUS_CANCELLED;
	var intervalDays = 3;
	var toDate = new Date();
	if( !empty(args) ){
		if(args.hasOwnProperty('intervalDays_fromDate') && args.intervalDays_fromDate !=0 ){
			intervalDays = args.intervalDays_fromDate;
		}
		if(args.hasOwnProperty('nowDate') && args.nowDate != 0 ){
			toDate = new Date (Date.parse(args.nowDate));
		}
	}
	toDate.setHours(0,0,0,0);
	var fromDate = new Date(toDate);
	fromDate.setHours(0,0,0,0);
	fromDate.setDate(toDate.getDate() - intervalDays);
	
	Logger.getLogger("Signifyd", "signifyd-extend-job").info('Paramenter Request: intervalDays {0}, date-range: fromdate {2} - toDate {1}', intervalDays, toDate,fromDate);	
	
    var ordersIterator = OrderMgr.searchOrders('status={0} AND  creationDate >= {1} AND creationDate <= {2} AND custom.SignifydCaseID != {3} AND custom.SignifydCancelGuaranteeStatus = {4} OR custom.SignifydCancelGuaranteeStatus = {5}', 'creationDate desc',canceledStatus,fromDate,toDate,null,null,false);
   
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
	if (dw.system.Site.getCurrent().getCustomPreferenceValue("SignifydEnableCartridge")) {
        var ordersIterator = getOrdersIterator(args); 
         processOrders(ordersIterator); 
    }

}

exports.execute = execute;
