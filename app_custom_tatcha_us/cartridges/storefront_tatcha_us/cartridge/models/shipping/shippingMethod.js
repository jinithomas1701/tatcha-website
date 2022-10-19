'use strict';

var base = module.superModule;

var Site = require('dw/system/Site');
var Calendar = require('dw/util/Calendar');
var StringUtils = require('dw/util/StringUtils');


function estimatedDate(shippingMethod) {
    var pstCal = new Calendar();
    pstCal.setTimeZone('PST');
    var estimated_days = shippingMethod.custom.estimatedDays;
    var order_cutoffTime = shippingMethod.custom.order_cutoffTime;
    var currentdate = StringUtils.formatCalendar(pstCal, "MM/dd/yyyy HH:mm:ss");
    var estimatedDate = getDeliveryDate(currentdate, estimated_days);
    var datetime =  StringUtils.formatCalendar(pstCal, "HH");
    if(datetime > order_cutoffTime) {
        estimated_days = estimated_days + 1;
        var estimatedDate = getDeliveryDate(currentdate, estimated_days);
    }
    return estimatedDate;
}

/*
 * Get Delivery Date
 */
function getDeliveryDate(currentDate, noofdays) {
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

function getEstimatedMonth(deliverydate) {
    var estimatedMonth;
    var temp = deliverydate.getMonth();
    if (temp === 0) {
        temp = temp+1;
    }
    if (temp.toString().length === 1) {
        estimatedMonth = temp.toString().padStart(2, '0');
    } else {
        estimatedMonth = temp.toString();
    }
    return estimatedMonth;
}
/**
 * Plain JS object that represents a DW Script API dw.order.ShippingMethod object
 * @param {dw.order.ShippingMethod} shippingMethod - the default shipment of the current basket
 * @param {dw.order.Shipment} [shipment] - a Shipment
 */
function ShippingMethodModel(shippingMethod, shipment) {
    base.call(this, shippingMethod, shipment);
    var deliverydate = estimatedDate(shippingMethod);
    this.estimatedDate = deliverydate;
    this.estimatedDay = deliverydate.getDate();
    this.estimatedMonth = getEstimatedMonth(deliverydate);
    this.orderValue = shippingMethod && shippingMethod.custom? shippingMethod.custom.orderValue : null;
    this.minOrderValue = shippingMethod && shippingMethod.custom? shippingMethod.custom.minOrderValue : null;
    this.storePickupEnabled = shippingMethod && shippingMethod.custom? shippingMethod.custom.storePickupEnabled : null;
    this.isFedex = shippingMethod && shippingMethod.custom? shippingMethod.custom.isFedex : null;
    this.estimatedDays = shippingMethod && shippingMethod.custom? shippingMethod.custom.estimatedDays : null;
    this.order_cutoffTime = shippingMethod && shippingMethod.custom? shippingMethod.custom.order_cutoffTime : null;
}

module.exports = ShippingMethodModel;
