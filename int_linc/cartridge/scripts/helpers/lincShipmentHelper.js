/**
 * This script provides helper functions 
 * for the Linc Cancellation API
 */

var Logger = require('dw/system/Logger');
var Site = require('dw/system/Site');
var logger = Logger.getLogger('LincCancel','LincShipmentHelper');

/**
 * Returns a date diff based on the order 
 *
 * @param {Date} orderCreationDate
 * @returns {Number}
 */
function callLincShipmentAPI(myOrderObj,shipmentObj) {
	try {
		var useLinc = Site.getCurrent().getCustomPreferenceValue('LincEnabled');
		if(useLinc) {
			var shipmentPayload = prepareLincShipmentPayload(myOrderObj,shipmentObj);
			if(!empty(shipmentPayload)) {
				var lincService = require('int_linc/cartridge/scripts/service/lincShipmentService');
				lincService.callLincShipment(shipmentPayload);
			} else {
				logger.warn('No shipment info sent to Linc for order: ' +  myOrderObj.getOrderNo() + ' & shipment: ' + shipmentObj.getShipmentNo());
			}
		}	
	} catch (e) {
		logger.error('Error calling fulfillement for order: ' +  myOrderObj.getOrderNo() + '. Error: ' + e.message);
	}
}

function prepareLincShipmentPayload(myOrderObj, shipmentObj) {
	var allProducts = shipmentObj.getProductLineItems();
	var shipmentMethodID = shipmentObj.getShippingMethodID();
	if (allProducts && allProducts.length > 0  && shipmentMethodID != 'productmatrix_Bring_to_HQ') {
		var lincPayload = [];
		var shippingMethod = null;
		var allMethods = dw.order.ShippingMgr.getAllShippingMethods();
		for (var i = 0; i < allMethods.length; i++) {
			var method = allMethods[i];
			if(shipmentMethodID == method.ID) {
				shippingMethod = method;
			}
		}
		var shippingMethodCarrier = 'UPS';
		if(empty(shippingMethod)) {
			logger.error('Error calling fulfillement for order: ' +  myOrderObj.getOrderNo() + '. Missing Shipment Mapping for: ' + shipmentMethodID);
		} else {
			shippingMethodCarrier = shippingMethod.custom.shippingMethodCarrier ? shippingMethod.custom.shippingMethodCarrier.value : 'UPS';
		}
		
		
		// Added an extra check
		if(Site.getCurrent().getCustomPreferenceValue('enableUSPSCheck')) {
			if(!empty(shipmentObj.getTrackingNumber())){
				var isUSPS = require('app_storefront_core/cartridge/scripts/util/Tatcha').isUSPSTrackNumber(shipmentObj.getTrackingNumber());
				if(isUSPS) {
					shippingMethodCarrier = 'USPS';
				}
			}
		}
		
		var shipmentPayload = {
				"shop_id": Site.getCurrent().getCustomPreferenceValue('LincShopID'),
				"order_id": myOrderObj.getOrderNo(),
				"carrier": shippingMethodCarrier,
				"tracking_number": shipmentObj.getTrackingNumber(),
				"fulfill_date": new Date().toISOString(),
				"products": []
		};
		for (var j = 0; j < allProducts.length; j++) {
			var productLineItem = allProducts[j];
			shipmentPayload.products.push({
				"product_id": productLineItem.productID,
				"variant_id": productLineItem.productID,
				"quantity": productLineItem.quantityValue
			});
		}
		lincPayload.push(shipmentPayload);
		return lincPayload;
	} else {
		return null;
	}
}


/**
 * Returns a date diff based on the order 
 *
 * @param {Date} orderCreationDate
 * @returns {Number}
 */
function callLincShipmentJob(myOrderObj) {
	try {
		var useLinc = Site.getCurrent().getCustomPreferenceValue('LincEnabled');
		if(useLinc) {
			var shipmentPayload = prepareLincShipmentPayloadJob(myOrderObj);
			logger.info("Linc Shipment payload for order : " + myOrderObj.getOrderNo());
			logger.info(shipmentPayload);
			if(!empty(shipmentPayload)) {
				var lincService = require('int_linc/cartridge/scripts/service/lincShipmentService');
				lincService.callLincShipment(shipmentPayload);
			} else {
				logger.warn('No shipment info sent to Linc for order: ' +  myOrderObj.getOrderNo() + ' & shipment: ' + shipmentObj.getShipmentNo());
			}
		}	
	} catch (e) {
		logger.error('Error calling fulfillement for order: ' +  myOrderObj.getOrderNo() + '. Error: ' + e.message);
	}
}

/**
 * 
 * @param myOrderObj
 * @returns
 */
function prepareLincShipmentPayloadJob(myOrderObj) {
	var shipments = myOrderObj.getShipments();
	var shipmentObj;
	var lincPayload = [];
	for (var j = 0; j < shipments.length; j++) {
		shipmentObj = shipments[j];
		var allProducts = shipmentObj.getProductLineItems();
		var shipmentMethodID = shipmentObj.getShippingMethodID();
		if (allProducts && allProducts.length > 0  && shipmentMethodID != 'productmatrix_Bring_to_HQ') {
			var shippingMethod = null;
			var allMethods = dw.order.ShippingMgr.getAllShippingMethods();
			for (var i = 0; i < allMethods.length; i++) {
				var method = allMethods[i];
				if(shipmentMethodID == method.ID) {
					shippingMethod = method;
				}
			}
			if(empty(shippingMethod)) {
				logger.error('Error calling fulfillement for order: ' +  myOrderObj.getOrderNo() + '. Missing Shipment Mapping for: ' + shipmentMethodID);
				return null;
			}
			var shippingMethodCarrier = shippingMethod.custom.shippingMethodCarrier ? shippingMethod.custom.shippingMethodCarrier.value : '';
			var shipmentPayload = {
					"shop_id": Site.getCurrent().getCustomPreferenceValue('LincShopID'),
					"order_id": myOrderObj.getOrderNo(),
					"carrier": shippingMethodCarrier,
					"tracking_number": shipmentObj.getTrackingNumber(),
					"fulfill_date": new Date().toISOString(),
					"products": []
			};
			for (var j = 0; j < allProducts.length; j++) {
				var productLineItem = allProducts[j];
				shipmentPayload.products.push({
					"product_id": productLineItem.productID,
					"variant_id": productLineItem.productID,
					"quantity": productLineItem.quantityValue
				});
			}
			lincPayload.push(shipmentPayload);
		}
	}
	
	return lincPayload;
}

module.exports = {
	callLincShipmentAPI : callLincShipmentAPI,
	callLincShipmentJob : callLincShipmentJob
}