'use strict';
var braintreeUtils = require('./braintreeUtils');
var loaderInstance = require('./loaderHelper');
/* global braintreeUtils braintree $ ApplePaySession */

var bu = braintreeUtils;
var loader;

function Constructor(initParams, $btn) {
    this.$btn = $btn;
    var $errorContainer = document.createElement('div');
    $errorContainer.className = 'error';
    var $loaderContainter = document.querySelector('.braintreeApplePayLoader');
    loader = loaderInstance($loaderContainter);
    this.loader = loader;
    $btn.parentNode.insertBefore($errorContainer, $btn.nextSibling);
    this.params = initParams;
    this.er = bu.createErrorInstance($errorContainer);
}

Constructor.prototype.createApplePay = function () {
    var that = this;
    var params = that.params;
    this.$braintreeApplePayDeviceDataInput = document.querySelector('input[name=braintreeApplePayDeviceDataInput]');
    loader.show();

    braintree.client.create({
        authorization: bu.clientToken
    }, function (clientErr, clientInstance) {
        if (clientErr) {
            that.er.show(clientErr);
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

                if (that.$braintreeApplePayDeviceDataInput) {
                    that.$braintreeApplePayDeviceDataInput.value = dataCollectorInstance.deviceData;
                }
                that.loader.hide();
            });
        }

        braintree.applePay.create({
            client: clientInstance
        }, function (error, applePayInstance) {
            loader.hide();
            if (error) {
                that.er.show(error);
                return;
            }
            that.createApplePaySession = function () {
                var paymentRequest = applePayInstance.createPaymentRequest({
                    total: {
                        label: params.options.displayName,
                        amount: params.options.amount
                    }
                });
                if (params.isRequiredBillingContactFields) {
                    paymentRequest.requiredBillingContactFields = ['postalAddress', 'name'];
                }
                if (params.isRequiredShippingContactFields) {
                    paymentRequest.requiredShippingContactFields = ['postalAddress', 'name', 'phone', 'email'];
                }

                var session = new ApplePaySession(1, paymentRequest);

                session.onvalidatemerchant = function (event) {
                    loader.show();
                    applePayInstance.performValidation({
                        validationURL: event.validationURL,
                        displayName: params.options.displayName
                    }, function (eventError, merchantSession) {
                        loader.hide();
                        if (eventError) {
                            that.er.show(eventError);
                            session.abort();
                            return;
                        }
                        session.completeMerchantValidation(merchantSession);
                    });
                };
                session.onpaymentauthorized = function (event) {
                    loader.show();
                    applePayInstance.tokenize({
                        token: event.payment.token
                    }, function (eventError, payload) {
                        loader.hide();
                        if (eventError) {
                            that.er.show(eventError);
                            session.completePayment(ApplePaySession.STATUS_FAILURE);
                            return;
                        }

                        session.completePayment(ApplePaySession.STATUS_SUCCESS);

                        var data = {
                            event: event,
                            payload: payload,
                            nonce: payload.nonce,
                            deviceData: document.querySelector('input[name=braintreeApplePayDeviceDataInput]').value
                        };
                        var shippingContact = event.payment.shippingContact;
                        if (shippingContact) {
                            data.shippingAddress = {
                                streetAddress: shippingContact.addressLines[0],
                                extendedAddress: shippingContact.addressLines[1],
                                locality: shippingContact.locality,
                                region: shippingContact.administrativeArea.toUpperCase(),
                                postalCode: shippingContact.postalCode,
                                countryCodeAlpha2: shippingContact.countryCode.toUpperCase(),
                                firstName: shippingContact.givenName,
                                lastName: shippingContact.familyName,
                                phone: shippingContact.phoneNumber,
                                email: shippingContact.emailAddress
                            };
                        } else {
                            shippingContact = {
                                emailAddress: document.querySelector('.contact-info-block [name=dwfrm_billing_contactInfoFields_email]').value,
                                phoneNumber: document.querySelector('.contact-info-block [name=dwfrm_billing_contactInfoFields_phone]').value
                            };
                        }

                        var billingContact = event.payment.billingContact;
                        if (billingContact) {
                            data.billingAddress = {
                                streetAddress: billingContact.addressLines[0],
                                extendedAddress: billingContact.addressLines[1],
                                locality: billingContact.locality,
                                region: billingContact.administrativeArea.toUpperCase(),
                                postalCode: billingContact.postalCode,
                                countryCodeAlpha2: billingContact.countryCode.toUpperCase(),
                                firstName: billingContact.givenName,
                                lastName: billingContact.familyName,
                                email: shippingContact.emailAddress,
                                phone: shippingContact.phoneNumber
                            };
                        }

                        that.$btn.dispatchEvent(new CustomEvent('braintree:ApplePayPaymentAuthorized', {
                            detail: {
                                data: data
                            }
                        }));
                    });
                };
                session.begin();
            };
            /*var promise = ApplePaySession.canMakePaymentsWithActiveCard(applePayInstance.merchantIdentifier);
            promise.then(function (canMakePaymentsWithActiveCard) {
                if (!canMakePaymentsWithActiveCard) {
                    that.$btn.dispatchEvent(new CustomEvent('braintree:ApplePayCanNotMakePaymentWithActiveCard'));
                    that.createApplePaySession = null;
                    return;
                }
            });*/
        });
    });
};

Constructor.prototype.startPayment = function () {
    this.er.hide();
    if (this.createApplePaySession) {
        this.createApplePaySession();
    }
};

Constructor.prototype.updateAmount = function (amount) {
    this.params.options.amount = amount;
};

module.exports = {
    init: function (params, $btn) {
        if (!window.ApplePaySession) {
            $btn.dispatchEvent(new CustomEvent('braintree:deviceNotSupportApplePay'));
            return false;
        }
        $btn.dispatchEvent(new CustomEvent('braintree:deviceSupportApplePay'));
        var ins = new Constructor(params, $btn);
        bu.clientToken = params.clientToken;
        $.extend(bu.messages, params.messages);
        ins.createApplePay();
        return ins;
    }
};

