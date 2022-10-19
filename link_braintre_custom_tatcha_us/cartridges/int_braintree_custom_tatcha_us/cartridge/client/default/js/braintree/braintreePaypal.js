/* eslint-disable no-inner-declarations */
/* eslint-disable new-cap */
'use strict';

/* global braintreeUtils braintree paypal $ */
var braintreeUtils = require('./braintreeUtils');
var loaderInstance = require('braintree_base/braintree/loaderHelper');
var paypalHelper = require('./paypal/paypalHelper');
var { showCartErrorMsg } = require('./helper');

var bu = braintreeUtils;
var console = bu.console;

var pid;
var uuid;
var removeFromCartUrl;
var loader;
var $price;
var sdkUrlConfiguration;
var isZeroAmount = false;
var $braintreePDPButton = document.querySelector('.braintree_pdp_button');
var $miniCartQuantity = document.querySelector('.minicart-quantity');
var $addToCartButton = document.querySelector('.add-to-cart') || document.querySelector('.add-to-cart-global');
var $paypalCartButton = document.querySelector('.js_braintree_paypal_cart_button');
var $paypalBillingButton = document.querySelector('.js_braintree_paypal_billing_button');

function Constructor(initParams, $btn) {
    var params = initParams;
    this.params = initParams;
    params.options = params.options || {};

    this.$btn = $btn;
    var $errorContainer = document.createElement('div');
    $errorContainer.className = 'error';

    if (params.$errorContainer) {
        $errorContainer = params.$errorContainer;
        delete params.$errorContainer;
    }

    var $loaderContainter = document.querySelector('.braintreePayPalLoader');
    var $braintreePaypalRiskDataInput = document.querySelector('input[name=braintreePaypalRiskData]');

    if (params.$loaderContainer) {
        $loaderContainter = params.$loaderContainer;
    }

    $btn.parentNode.insertBefore($errorContainer, $btn.nextSibling);

    this.er = bu.createErrorInstance($errorContainer);
    loader = loaderInstance($loaderContainter);
    this.loader = loader;
    var that = this;

    if (params.isFraudToolsEnabled) {
        loader.show();
        braintree.dataCollector.create({
            authorization: bu.clientToken,
            paypal: true,
            kount: false
        }, function (error, data) {
            loader.hide();
            if (error) {
                console.log(error);
                return;
            }
            if ($braintreePaypalRiskDataInput) {
                $braintreePaypalRiskDataInput.value = data.deviceData;
            }
            params.riskData = data.deviceData;
        });
    }

    if ($braintreePDPButton) {
        $price = document.querySelector('.price .sales .value');
        // Check minicart quantity and hide PDPbutton if it is not empty
        if (($miniCartQuantity && parseInt($miniCartQuantity.textContent, 0) > 0)
            || ($price && $price.getAttribute('content') === '0.00')) {  // Check if product price is zero
            paypalHelper.hidePDPButton($braintreePDPButton);
        }
    }

    loader.show();

    braintree.client.create({
        authorization: bu.clientToken
    }).then(function (clientInstance) {
        return braintree.paypalCheckout.create({
            client: clientInstance
        });
    }).then(function (paypalCheckoutInstance) {
        if ($braintreePDPButton) {
            if ($addToCartButton.disabled) {
                paypalHelper.hidePDPButton($braintreePDPButton);
            }
            $('body').on('cart:update', function () {
                $miniCartQuantity = parseInt(document.querySelector('.minicart-quantity').textContent, 0);
                if ($addToCartButton.disabled) {
                    paypalHelper.hidePDPButton($braintreePDPButton);
                }
                if ($miniCartQuantity === 0 && !$addToCartButton.disabled) {
                    paypalHelper.showPDPButton($braintreePDPButton);
                }
            });

            $('body').on('product:afterAddToCart', function () {
                paypalHelper.hidePDPButton($braintreePDPButton);
            });

            // Update addToCart button status
            $('body').on('product:statusUpdate', function () {
                $miniCartQuantity = parseInt(document.querySelector('.minicart-quantity').textContent, 0);
                $price = document.querySelector('.price .sales .value');
                isZeroAmount = false;
                if ($braintreePDPButton && $price) {
                    isZeroAmount = $price.getAttribute('content') === '0.00';
                }

                if ($miniCartQuantity === 0) {
                    if ($addToCartButton.disabled || isZeroAmount) {
                        paypalHelper.hidePDPButton($braintreePDPButton);
                    }
                    if (!$addToCartButton.disabled && !isZeroAmount) {
                        paypalHelper.showPDPButton($braintreePDPButton);
                    }
                }
            });
        }

        var payment = function () {
            if ($braintreePDPButton && $braintreePDPButton.style.display === '') {
                that.er.hide();
                var res = braintreeUtils.pdpOnlickForAsignedPaypalPayment();
                if (res.cart) {
                    uuid = res.pliUUID;
                    removeFromCartUrl = res.cart.actionUrls.removeProductLineItemUrl;
                    pid = res.pid;
                    that.params.options.amount = parseFloat(res.cart.totals.grandTotal.replace(/\$|,/g, ''));
                } else {
                    throw new Error(res.message || 'Error occurs');
                }
            }
            return paypalCheckoutInstance.createPayment(that.params.options);
        };

        var paypalButtonConfig = {
            locale: params.options.locale,
            onApprove: function (data) {
                if (params.options.intent === 'order') {
                    data.intent = 'order';
                }

                //mParticle Event trigger
                if(window.mParticleCheckoutInitiated) {
                    var page = window.location.href;
                    window.mParticleCheckoutInitiated('paypal', page);
                }

                // GTM event trigger
                try {
                    if (!window.dataLayer) {
                        window.dataLayer = [];
                    }
                    window.dataLayer.push({
                        'paypalAction': 'authorize',
                        'event': 'tatcha_checkout_paypal'
                    });
                } catch (e) {}

                return paypalCheckoutInstance.tokenizePayment(data).then(function (payload) {
                    params.onTokenizePayment(payload, that);
                });
            },
            onCancel: function (a, b) {
                if (typeof params.options.onCancel === 'function') {
                    params.options.onCancel(a, b);
                }

                // GTM
                try {
                    if (!window.dataLayer) {
                        window.dataLayer = [];
                    }
                    window.dataLayer.push({
                        'paypalAction': 'cancel',
                        'event': 'tatcha_checkout_paypal'
                    });
                } catch (e) {}

                if ($braintreePDPButton && $braintreePDPButton.style.display === '') {
                    var urlParams = {
                        pid: pid,
                        uuid: uuid
                    };

                    $.ajax({
                        url: paypalHelper.appendToUrl(removeFromCartUrl, urlParams),
                        type: 'get',
                        dataType: 'json',
                        success: function () {
                            $.spinner().stop();
                        },
                        error: function () {
                            $.spinner().stop();
                        }
                    });
                }
            },
            onError: function (err) {
                that.er.show(err.message.split(/\r?\n/g)[0]);

                if ($braintreePDPButton && $braintreePDPButton.style.display === '' && pid) {
                    var productID = pid;
                    var urlParams = {
                        pid: productID,
                        uuid: uuid
                    };

                    $.ajax({
                        url: paypalHelper.appendToUrl(removeFromCartUrl, urlParams),
                        type: 'get',
                        dataType: 'json',
                        success: function () {
                            $.spinner().stop();
                        },
                        error: function () {
                            $.spinner().stop();
                        }
                    });
                }
            }
        };

        isZeroAmount = that.params.options.amount === 0;
        if (isZeroAmount) {
            var zeroAmountErrorMsg = 'Order total 0 is not allowed for PayPal';
            paypalButtonConfig.onClick = function (_, actions) {
                if ($paypalCartButton) showCartErrorMsg(zeroAmountErrorMsg);
                if ($paypalBillingButton) paypalHelper.showCheckoutErrorMsg(zeroAmountErrorMsg);
                return actions.reject();
            };
        }

        if (params.options && params.options.flow === 'checkout') {
            paypalButtonConfig.createOrder = payment;
            sdkUrlConfiguration = {
                intent: params.options.intent,
                currency: params.options.currency,
                components: 'buttons,messages',
				'disable-funding': 'credit,card',
                commit: false
            };
        } else {
            paypalButtonConfig.createBillingAgreement = payment;
            sdkUrlConfiguration = {
                vault: true,
                components: 'buttons,messages',
				'disable-funding': 'credit,card'
            };
        }

        paypalButtonConfig = $.extend(false, paypalButtonConfig, that.params.paypalConfig);
        loader.hide();

        if (!window.isPayPalSDKLoaded) {
            paypalCheckoutInstance.loadPayPalSDK(sdkUrlConfiguration).then(function () {
                window.isPayPalSDKLoaded = true;
                return paypal.Buttons(paypalButtonConfig).render(that.$btn);
            });
        } else {
            return paypal.Buttons(paypalButtonConfig).render(that.$btn);
        }
    }).catch(function (err) {
        console.error('Error!', err);
        loader.hide();
    });
}

Constructor.prototype.updateAmount = function (amount) {
    this.params.options.amount = amount;
};

Constructor.prototype.updateShippingAddress = function (data) {
    this.params.options.shippingAddressOverride = data;
};

module.exports = {
    init: function (params, $btn) {
        bu.clientToken = params.clientToken;
        $.extend(bu.messages, params.messages);
        return new Constructor(params, $btn);
    }
};
