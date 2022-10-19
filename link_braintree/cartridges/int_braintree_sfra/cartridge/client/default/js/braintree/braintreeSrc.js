/* eslint-disable no-undef */
'use strict';
var braintreeUtils = require('./braintreeUtils');
var loaderInstance = require('./loaderHelper');
var bu = braintreeUtils;
var loader;

function Constructor(initParams, $btn) {
    this.$btn = $btn;
    var $errorContainer = document.createElement('div');
    $errorContainer.className = 'error';
    var $loaderContainter = document.querySelector('.braintreeSrcLoader');
    loader = loaderInstance($loaderContainter);
    this.loader = loader;
    $btn.parentNode.insertBefore($errorContainer, $btn.nextSibling);
    this.params = initParams;
    this.er = bu.createErrorInstance($errorContainer);
}

Constructor.prototype.loadSrcButton = function () {
    var that = this;
    var params = that.params;
    this.$braintreeSrcDeviceDataInput = document.querySelector('input[name=braintreeSrcDeviceDataInput]');

    that.loader.show();
    braintree.client.create({
        authorization: params.clientToken
    }, function (clientErr, clientInstance) {
        if (clientErr) {
            that.er.show(clientErr);
            that.loader.hide();
            return;
        }
        if (params.isFraudToolsEnabled) {
            braintree.dataCollector.create({
                client: clientInstance,
                paypal: true
            }, function (dataCollectorErr, dataCollectorInstance) {
                if (dataCollectorErr) {
                    that.er.show(dataCollectorErr);
                    return;
                }

                if (that.$braintreeSrcDeviceDataInput) {
                    that.$braintreeSrcDeviceDataInput.value = dataCollectorInstance.deviceData;
                }
                that.loader.hide();
            });
        }
        braintree.visaCheckout.create({
            client: clientInstance
        }, function (srcPaymentErr, visaCheckoutInstance) {
            if (srcPaymentErr) {
                that.er.show(srcPaymentErr);
                that.loader.hide();
                return;
            }
            var baseInitOptions = {
                paymentRequest: {
                    currencyCode: 'USD',
                    subtotal: params.options.amount
                },
                settings: {
                    locale: params.settings.locale,
                    payment: {
                        cardBrands: params.settings.cardBrands,
                        acceptCanadianVisaDebit: params.settings.acceptCanadianVisaDebit
                    }
                }
            };

            var initOptions = visaCheckoutInstance.createInitOptions(baseInitOptions);
            initOptions.settings.shipping = {
                collectShipping: params.options.isShippingAddressRequired
            };
            V.init(initOptions);
            that.loader.hide();
            V.on('payment.success', function (payment) {
                visaCheckoutInstance.tokenize(payment, function (tokenizeErr, payload) {
                    if (tokenizeErr) {
                        // eslint-disable-next-line no-console
                        console.error('Error during Visa Checkout tokenization', tokenizeErr);
                    } else {
                        var billingAddress = payload.billingAddress;
                        payload.billingAddressString = JSON.stringify({
                            recipientName: (billingAddress.firstName + ' ' + billingAddress.lastName),
                            phone: billingAddress.phoneNumber,
                            countryCodeAlpha2: billingAddress.countryCode,
                            streetAddress: billingAddress.streetAddress,
                            extendedAddress: billingAddress.streetAddress,
                            locality: billingAddress.locality,
                            region: billingAddress.region,
                            postalCode: billingAddress.postalCode,
                            email: payload.userData.userEmail
                        });
                        params.onTokenizePayment(payload);
                    }
                });
            });
        });
    });
};

Constructor.prototype.updateAmount = function (amount) {
    this.params.options.amount = amount;
};

module.exports = {
    init: function (params, $btn) {
        bu.clientToken = params.clientToken;
        return new Constructor(params, $btn);
    }
};
