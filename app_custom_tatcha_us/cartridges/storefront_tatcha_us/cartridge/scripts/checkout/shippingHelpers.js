'use strict';

var server = require('server');
var BasketMgr = require('dw/order/BasketMgr');
var ArrayList = require('dw/util/ArrayList');
var Money = require('dw/value/Money');
var ShippingMgr = require('dw/order/ShippingMgr');
var ShippingMethodModel = require('*/cartridge/models/shipping/shippingMethod');

var base = module.superModule;

/**
 * Updates the shipping method of the given shipment. If a shipping method ID is given, the given
 * shipping method is used to update the shipment.
 * @param {dw.order.ShippingMethod} shippingMethod - A shipping method.
 * @returns {Object} Returns the following object:
 * "shippingPriceAdjustmentsTotal" : priceAdjTotal,
 * "surchargeAdjusted"             : adjustedSurchargeTotal,
 * "baseShipping"                  : baseShipping,
 * "baseShippingAdjusted"          : baseShippingAdjusted
 */

base.preCalculateShipping = function (shippingMethod){
    var formatCurrency = require('*/cartridge/scripts/util/formatting').formatCurrency;
    var currentBasket = BasketMgr.getCurrentBasket();
    var shipment = currentBasket.getDefaultShipment();
    var baseShippingAdjustedFormatted, surchargeAdjustedFormatted, shippingPriceAdjustmentsTotalFormatted, baseShippingFormatted;

    if (shipment) {
        var currencyCode = currentBasket.getCurrencyCode();
        var productIter              = currentBasket.getAllProductLineItems().iterator(),
            priceAdj,
            priceAdjIter             = shipment.getShippingPriceAdjustments().iterator(),
            priceAdjTotal            = new Money(0.0, currencyCode), // total of all price adjustments
            surchargeTotal           = new Money(0.0, currencyCode), // total of all surcharges
            adjustedSurchargeTotal    = new Money(0.0, currencyCode); // total of all surcharges minus price adjustments

        // Iterates over all products in the basket
        // and calculates their shipping cost and shipping discounts
        while (productIter.hasNext()) {
            var pli = productIter.next();
            var product = pli.product;
            if (product) {
                var psc = ShippingMgr.getProductShippingModel(product).getShippingCost(shippingMethod);
                if (psc && psc.getAmount() && psc.isSurcharge()) {
                    // update the surcharge totals
                    surchargeTotal = surchargeTotal.add(psc.getAmount());
                }
            }
        }

        while (priceAdjIter.hasNext()) {
            priceAdj = priceAdjIter.next();
            if (priceAdj && priceAdj.promotion !== null) {
                priceAdjTotal = priceAdjTotal.add(priceAdj.price);
            }
        }
        var shippingTotalPrice = currentBasket.getShippingTotalPrice();
        var adjustedShippingTotal = currentBasket.getAdjustedShippingTotalPrice();

        var baseShipping = shippingTotalPrice.subtract(surchargeTotal);
        var baseShippingAdjusted = null;
        if (priceAdjTotal >= 0) {
            baseShippingAdjusted = baseShipping.subtract(priceAdjTotal);
        } else {
            baseShippingAdjusted = baseShipping.add(priceAdjTotal);
        }
        baseShippingAdjustedFormatted = formatCurrency(baseShippingAdjusted.value, baseShippingAdjusted.currencyCode);
        surchargeAdjustedFormatted = formatCurrency(adjustedSurchargeTotal.value, adjustedSurchargeTotal.currencyCode);
        shippingPriceAdjustmentsTotalFormatted = formatCurrency(priceAdjTotal.value, priceAdjTotal.currencyCode);
        baseShippingFormatted = formatCurrency(baseShipping.value, baseShipping.currencyCode);

        return {
            shippingPriceAdjustmentsTotal: priceAdjTotal,
            surchargeAdjusted: adjustedSurchargeTotal,
            baseShipping: baseShipping,
            baseShippingAdjusted: baseShippingAdjusted,
            baseShippingAdjustedFormatted: baseShippingAdjustedFormatted,
            baseShippingFormatted: baseShippingFormatted,
            surchargeAdjustedFormatted: surchargeAdjustedFormatted,
            shippingPriceAdjustmentsTotalFormatted: shippingPriceAdjustmentsTotalFormatted
        };
    }
}

base.setSelectedShippingMethodToDefaultShipment = function (shippingMethodID) {
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    var Transaction = require('dw/system/Transaction');

    var applicableShippingMethods, address = {};

    var currentBasket = BasketMgr.getCurrentBasket();
    var shipment = currentBasket.getDefaultShipment();
    var shipping = shipment.shippingAddress;

    address.countryCode = !empty(shipping.countryCode) ? shipping.countryCode.value : ' ';
    address.stateCode = !empty(shipping.stateCode) ? shipping.stateCode.value : ' ';
    address.postalCode = !empty(shipping.postalCode) ? shipping.postalCode.value : ' ';
    address.city = !empty(shipping.city) ? shipping.city.value : ' ';
    address.address1 = !empty(shipping.address1) ? shipping.address1.value : ' ';
    address.address2 = !empty(shipping.address2) ? shipping.address2.value : '';

    applicableShippingMethods = ShippingMgr.getShipmentShippingModel(shipment).getApplicableShippingMethods(address);

    //skip tax calls
    session.custom.SkipCall = true;
    Transaction.wrap(function () {
        base.selectShippingMethod(shipment, shippingMethodID, applicableShippingMethods, address);
        basketCalculationHelpers.calculateTotals(currentBasket);
    });
    session.custom.SkipCall = false;
}

/**
 * Plain JS object that represents a DW Script API dw.order.ShippingMethod object
 * @param {dw.order.Shipment} shipment - the target Shipment
 * @param {Object} [address] - optional address object
 * @returns {dw.util.Collection} an array of ShippingModels
 */
base.getApplicableShippingMethods = function (shipment, address) {
    var collections = require('*/cartridge/scripts/util/collections');
    var ShippingMgr = require('dw/order/ShippingMgr');
    var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
    var BasketMgr = require('dw/order/BasketMgr');
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    var Transaction = require('dw/system/Transaction');

    if (!shipment) return null;

    var shipmentShippingModel = ShippingMgr.getShipmentShippingModel(shipment);

    var shippingMethods;
    if (address) {
        shippingMethods = shipmentShippingModel.getApplicableShippingMethods(address);
    } else {
        var address = {};
        if (!empty(shipment.shippingAddress)) {
            var shipping = shipment.shippingAddress;

            address.countryCode = !empty(shipping.countryCode) ? shipping.countryCode.value : ' ';
            address.stateCode = !empty(shipping.stateCode) ? shipping.stateCode.value : ' ';
            address.postalCode = !empty(shipping.postalCode) ? shipping.postalCode.value : ' ';
            address.city = !empty(shipping.city) ? shipping.city.value : ' ';
            address.address1 = !empty(shipping.address1) ? shipping.address1.value : ' ';
            address.address2 = !empty(shipping.address2) ? shipping.address2.value : '';

        } else {
            var geoLocCountryCode = request.getGeolocation().getCountryCode();
            address.countryCode = geoLocCountryCode;
        }
        shippingMethods = shipmentShippingModel.getApplicableShippingMethods(address);
    }
    var currentBasket = BasketMgr.getCurrentBasket();
    var orderType = COHelpers.getOrderType(currentBasket);
    // Filter out whatever the method associated with in store pickup and min , max shipping value
    var filteredMethods = [];
    var order_total = currentBasket ? currentBasket.getAdjustedMerchandizeTotalPrice() : null;
    collections.forEach(shippingMethods, function (shippingMethod) {
        if(!empty(order_total) && !empty(shippingMethod.custom.minOrderValue) && (order_total < shippingMethod.custom.minOrderValue)){
            return;
        }
        if(!empty(order_total) && !empty(shippingMethod.custom.orderValue) && (order_total > shippingMethod.custom.orderValue)){
            return;
        }
        var shipmentShippingModel = ShippingMgr.getShipmentShippingModel(shipment);
        var shippingCost = shipmentShippingModel.getShippingCost(shippingMethod);
        // Filetering gc shipping method
        if ((orderType === 'mixed' || orderType === 'regular') && !shippingMethod.custom.storePickupEnabled && !shippingMethod.custom.vgcShippingMethod) {
            filteredMethods.push(new ShippingMethodModel(shippingMethod, shipment));
        } else if (orderType === 'giftcard' && !shippingMethod.custom.storePickupEnabled && shippingMethod.custom.vgcShippingMethod) {
			filteredMethods.push(new ShippingMethodModel(shippingMethod, shipment));
		}
    });
    return filteredMethods;
}

/**
 * Returns a boolean indicating if the address is empty
 * @param {dw.order.Shipment} shipment - A shipment from the current basket
 * @returns {boolean} a boolean that indicates if the address is empty
 */
 base.isEmptyAddress= function (shipment) {
    if (shipment && shipment.shippingAddress) {
        return ['firstName', 'lastName', 'address1', 'address2', 'phone', 'city', 'postalCode', 'stateCode'].some(function (key) {
            return shipment.shippingAddress[key];
        });
    }
    return false;
}
/**
 * Returns filter Shipping Method Collection
 * @param {Object} [applicableMethods] - All Applicable Shipping Methods
 * @returns {Object} A Object of Filtered Shipping Method
 */
 base.getFilteredShippingMethod = function (applicableShippingMethods) {
    var BasketMgr = require('dw/order/BasketMgr');
    var currentBasket = BasketMgr.getCurrentBasket();
    var order_total = currentBasket ? currentBasket.getAdjustedMerchandizeTotalPrice() : null;
    var iterator = applicableShippingMethods.iterator();
    while (iterator.hasNext()) {
        var shippingMethod = iterator.next();
        if(!empty(order_total) && !empty(shippingMethod.custom.minOrderValue) && (order_total < shippingMethod.custom.minOrderValue)){
            continue;
        }
        if(!empty(order_total) && !empty(shippingMethod.custom.orderValue) && (order_total > shippingMethod.custom.orderValue)){
            continue;
        }
        return shippingMethod;
        break;
    }
}
/**
 * Returns formated address
 * @param {Object} [shipping] - Address
 * @returns {address} A Array of Formated Address
 */
base.addressFormat = function(shipping){
    var address = {};
    address.countryCode = !empty(shipping.countryCode) ? shipping.countryCode.value : ' ';
    address.stateCode = !empty(shipping.stateCode) ? shipping.stateCode.value : ' ';
    address.postalCode = !empty(shipping.postalCode) ? shipping.postalCode.value : ' ';
    address.city = !empty(shipping.city) ? shipping.city.value : ' ';
    address.address1 = !empty(shipping.address1) ? shipping.address1.value : ' ';
    address.address2 = !empty(shipping.address2) ? shipping.address2.value : '';
    return address;
}

module.exports = base;
