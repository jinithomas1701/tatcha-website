var AfterpayApiContext = require('*/cartridge/scripts/context/afterpayApiContext');
var AfterpayHttpService = require('~/cartridge/scripts/logic/services/afterpayHttpService');
var Class = require('*/cartridge/scripts/util/class').Class;

/**
 *  request and response definitions for payment service type 'direct capture'
 */
var DirectCapturePaymentService = Class.extend({
    _requestUrl: null, // eslint-disable-line
    _requestBody: {}, // eslint-disable-line

    init: function () {
        this.afterpayHttpService = new AfterpayHttpService();
        this.afterpayApiContext = new AfterpayApiContext();
    },

    generateRequest: function (token, orderNo, totalAmount, currencyCode) {
        this._requestUrl = this.afterpayApiContext.getFlowApiUrls().get('directCapturePayment'); // eslint-disable-line
        this._generateRequestBody(token, orderNo, totalAmount, currencyCode); // eslint-disable-line
    },

    generateRequestWithChecksum: function (token, orderNo, totalAmount, currencyCode, apchecksum, isCheckoutAdjusted, shipping) {
        this._requestUrl = this.afterpayApiContext.getFlowApiUrls().get('directCapturePayment'); // eslint-disable-line
        this._generateRequestBodyWithChecksum(token, orderNo, totalAmount, currencyCode, apchecksum, isCheckoutAdjusted, shipping); // eslint-disable-line
    },

    getResponse: function () {
        var response = this.afterpayHttpService.call(this._requestUrl, 'DIRECT_CAPTURE_PAYMENT', this._requestBody); // eslint-disable-line
        return response;
    },

    _generateRequestBody: function (token, orderNo, totalAmount, currencyCode) { // eslint-disable-line
        this._requestBody = { // eslint-disable-line
            token: token,
            merchantReference: orderNo,
            "amount": {
                "amount": totalAmount,
                "currency": currencyCode
            },
            requestMethod: 'POST'
        };
    },

    /**
     * @description Afterpay address change
     */
    _generateRequestBodyWithChecksum: function (token, orderNo, totalAmount, currencyCode, apchecksum, isCheckoutAdjusted, shipping) { // eslint-disable-line
        this._requestBody = { // eslint-disable-line
            token: token,
            merchantReference: orderNo,
            "amount": {
                "amount": totalAmount,
                "currency": currencyCode
            },
            isCheckoutAdjusted: isCheckoutAdjusted,
            shipping: shipping,
            paymentScheduleChecksum: apchecksum,
            requestMethod: 'POST'
        };
    }
});

module.exports = new DirectCapturePaymentService();
