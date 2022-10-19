'use strict';

/**
 * Utility file to perform generic functions needed for afterpay express.
 *
 */

var	Calendar = require("dw/util/Calendar");

function getEstimatedArrival(shippingMethod) {
	var StringUtils = require('dw/util/StringUtils');
	var stringHelper = require('*/cartridge/scripts/util/StringHelpers');
	var pstCal = new Calendar();
	pstCal.setTimeZone('PST');
	var estimated_days = shippingMethod.custom.estimatedDays;
	var order_cutoffTime = shippingMethod.custom.order_cutoffTime;
	var currentdate = StringUtils.formatCalendar(pstCal, "MM/dd/yyyy HH:mm:ss"); 
	var estimatedDate = stringHelper.GetEstimatedDate(currentdate, estimated_days);
	var datetime =  StringUtils.formatCalendar(pstCal, "HH");
	
	var formattedDate = getFormattedDate(estimatedDate); 
	
	var result = "Estimated Arrival: " + formattedDate;
	return result;
}
	
/**
 * method to get formatted date
 * @param {Date} date
 * @returns
 */
function getFormattedDate(date){
    var dateObj=new Date(date);
    var dMonthStr = (dateObj.getMonth()+1).toString();
    var dateMonth = dMonthStr.length > 1 ? dMonthStr : '0'+dMonthStr;
    var dDateStr = dateObj.getDate().toString();
    var dateDay = dDateStr.length > 1 ? dDateStr : '0'+dDateStr;
    var formattedDate =  dateMonth+'/'+dateDay;

    return formattedDate;
}

module.exports = {
    getFormattedDate : getFormattedDate,
    getEstimatedArrival : getEstimatedArrival
}