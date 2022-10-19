'use strict';

var Calendar = require('dw/util/Calendar');
var StringUtils = require('dw/util/StringUtils');
var Site = require('dw/system/Site');

/**
 * Sanitize a string by removing the whitespaces
 *
 * @param inS String to sanitize
 *
 **/
function sanitize(inS) {
    return inS.replace(/\W/g, '');
}

/**
 * unsanitizeOR a string by replaced %7c with '|' pipes
 *
 * @param anURL URL String to sanitize
 *
 **/
function unsanitizeOR(anURL) {
    return anURL.toString().replace('%7c', '|', 'g');
}

/**
 * cleanupID cleans a product id
 *
 * @param a a String to cleanup
 *
 **/
function cleanupID(s) {
    return (s === null) ? s : s.replace(new RegExp('[^a-z0-9_\-]', 'gi'), '_').toLowerCase();
}

/*
 * Convert Time to Specific time zone
 */
function ConvertTime(inputdate, offset){
	offset = offset ? offset : Site.getCurrent().getCustomPreferenceValue("TimeZoneOffset");
	var d = new Date(inputdate);
	var utc = d.getTime() + (d.getTimezoneOffset()*60000);
	var nd = new Date(utc + (3600000*offset));
	return StringUtils.formatCalendar(new Calendar(nd), 'MM/dd/yyyy');
}

/*
 * Get Array between two numbers
 */
function GetArray(minValue, maxValue, step) {
    var resArray = [];
    if (!isNaN(minValue) || !isNaN(maxValue) || !isNaN(step)) {
        for (var i = minValue; i <= maxValue; i=i+step) {
            resArray.push(i);
        }
    }
    return resArray;
}

/*
 * Get Years List
 */
function GetYearsList(offset) {
    var resArray = [];
    var year = new Date().getYear();
    var start = (offset && !isNaN(offset)) ? year - offset : year;
    var end = start - 100;
    
    for (var i = start; i >= end; i=i-1) {
        resArray.push(i);
    }
    return resArray;
}

/*
 * Get Estimated Date
 */

function GetEstimatedDate(currentDate, noofdays) { 
	currentDate = new Date(currentDate);
	var holidayList = JSON.parse(Site.getCurrent().getCustomPreferenceValue('holidayList'));
	
	var deliverydate = currentDate;
	for(var i = 0; i <= noofdays; i++) {
		var date = new Date(currentDate.getTime() + i*24*60*60*1000);
		var day = date.getDay();
		var dm = ("0" + (date.getMonth() + 1)).slice(-2) + '/' + date.getDate();
		if(day == 0 || day == 6 || holidayList.indexOf(dm) != -1) {
			noofdays++;
		}
	}
	
	deliverydate = new Date(currentDate.getTime() + noofdays*24*60*60*1000);
	
    return deliverydate;
}


module.exports.sanitize = sanitize;
module.exports.unsanitizeOR = unsanitizeOR;
module.exports.cleanupID = cleanupID;
module.exports.ConvertTime = ConvertTime;
module.exports.GetArray = GetArray;
module.exports.GetYearsList = GetYearsList;
module.exports.GetEstimatedDate = GetEstimatedDate;