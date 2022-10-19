'use strict';

var server = require('server');

var base = module.superModule;

/**
 * checks whether afterpay is enabled or not in the configuration and checks the minimum and maximum threshold
 * @returns {boolean} - true or false
 */
base.showAfterpayPayment = function (){
    var Site = require('dw/system/Site');
    var BasketMgr = require('dw/order/BasketMgr');

    var showAfterpay = Site.getCurrent().getCustomPreferenceValue('enableAfterpay');
    var basketObject = BasketMgr.getCurrentBasket();
    //var orderGrandTotal = basketObject.totalGrossPrice;
    var orderGrandTotal = basketObject.getAdjustedMerchandizeTotalPrice(true) + basketObject.giftCertificateTotalPrice;
    var apMessageService = require('*/cartridge/scripts/util/afterpayDisplayProductMessage');
    var thresholdResponse = apMessageService.getThresholdRange(orderGrandTotal);
    var disableAfterpayPaymentMethod = false;

    if (thresholdResponse && (thresholdResponse.belowThreshold || thresholdResponse.aboveThreshold)) {
        disableAfterpayPaymentMethod = true;
    }
    return showAfterpay && !disableAfterpayPaymentMethod;
}

module.exports = base;