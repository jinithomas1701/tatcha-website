/**
 * This script provides helper functions 
 * for the Blutag Service API
 */

var Logger = require('dw/system/Logger');
var Site = require('dw/system/Site');


/**
 * Prepares the Blutag payload prior to send to the tracking service
 */
function prepareBlutagTrackingPayload(myOrderObj, shipmentObj) {

	var blutagTrackingPayload = {
			"orderId": myOrderObj.getOrderNo(),
			"trackingNumber": shipmentObj.getTrackingNumber(),
			"email": myOrderObj.customerEmail,
			"orderStatus": "Shipped"
	};


	return JSON.stringify(blutagTrackingPayload);

}

/**
 * Helper method to call Blutag tracking API
 */
function callBlutagTrackingAPI (myOrderObj, shipmentObj) {
	
	var logger = Logger.getLogger('Blutag','BlutagTrackingHelper');

	try {
		var blutagTrackingService = require("int_blutag/cartridge/scripts/services/blutagTrackingService");

		var blutagTrackingAPIPayload = prepareBlutagTrackingPayload(myOrderObj, shipmentObj);

		var blutagTrackingServiceResponse = blutagTrackingService.callblutagTracking(blutagTrackingAPIPayload);
		
		
		logger.info("Successfully called Blutag Tracking API for payload: " + blutagTrackingAPIPayload + ". Response: " + blutagTrackingServiceResponse);

	} catch (e) {
		logger.error('Error calling blutag tracking for order: ' +  myOrderObj.getOrderNo() + '. Error: ' + e.message);
	}

}


module.exports = {
		callBlutagTrackingAPI : callBlutagTrackingAPI
}