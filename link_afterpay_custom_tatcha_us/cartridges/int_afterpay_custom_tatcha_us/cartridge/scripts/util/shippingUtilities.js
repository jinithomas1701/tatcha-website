var shippingService = require('*/cartridge/scripts/logic/services/afterpayShippingUpdateService');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('ShippingUtilities');

var ShippingUtilities = {
    sendShippingInfo: function (params) {
    	shippingService.init();
    	shippingService.generateRequest(params);

        var shippingResponse;

        try {
        	shippingResponse = shippingService.getResponse();
        } catch (e) {
            Logger.debug('Exception occured in shipping service call :' + e.message);

            return {
                error: true
            };
        }

        return shippingResponse;
    }
};

module.exports = ShippingUtilities;
