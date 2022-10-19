/* eslint-disable no-use-before-define */
'use strict';

/* global braintreeUtils braintree $ VenmoSession */
var braintreeUtils = require('./braintreeUtils');
var loaderInstance = require('./loaderHelper');

var bu = braintreeUtils;

function Constructor(initParams, $btn) {
    var $errorContainer = document.createElement('div');
    $errorContainer.className = 'venmo-error';
    var $loaderContainter = document.createElement('div');
    $loaderContainter.className = 'braintree-loader';
    this.$braintreeVenmoRiskDataInput = document.querySelector('input[name=braintreeVenmoRiskData]');

    this.$btn = $btn;
    this.params = initParams;

    if (initParams.$errorContainer) {
        $errorContainer = initParams.$errorContainer;
        delete initParams.$errorContainer;
    }

    if (initParams.$loaderContainer) {
        $loaderContainter = initParams.$loaderContainer;
    }

    $btn.parentNode.insertBefore($errorContainer, $btn.nextSibling);

    this.er = bu.createErrorInstance($errorContainer);
    this.loader = loaderInstance($loaderContainter);
}

Constructor.prototype.createVenmo = function () {
    var that = this;
    var isBrowserSupported;
    that.loader.show();

    braintree.client.create({
        authorization: bu.clientToken
    }, function (clientErr, clientInstance) {
            // Stop if there was a problem creating the client.
            // This could happen if there is a network error or if the authorization
            // is invalid.
        if (clientErr) {
            that.er.show(clientErr);
            return;
        }

        braintree.dataCollector.create({
            client: clientInstance,
            paypal: true
        }, function (dataCollectorErr, dataCollectorInstance) {
            if (dataCollectorErr) {
                that.er.show(dataCollectorErr);
                return;
            }

            if (that.$braintreeVenmoRiskDataInput) {
                that.$braintreeVenmoRiskDataInput.value = dataCollectorInstance.deviceData;
            }
            that.loader.hide();
        });

        isBrowserSupported = braintree.venmo.isBrowserSupported({
            allowNewBrowserTab: false,
            allowDesktop: true
        });
        // Verify browser support before proceeding.
        if (isBrowserSupported) {
            braintree.venmo.create({
                client: clientInstance,
                allowNewBrowserTab: false,
                ignoreHistoryChanges: true,
                allowDesktop: true
            }, function (venmoErr, venmoInstance) {
                if (venmoErr) {
                    that.er.show(venmoErr);
                    return;
                }

                // Verify browser support before proceeding.
                if (!venmoInstance.isBrowserSupported()) {
                    that.params.deviceNotSupportVenmo();
                    that.loader.hide();
                    return;
                }

                that.$btn.addEventListener('click', function () {
                    if (!that.params.venmoAccountPage && !that.params.onClick()) {
                        return;
                    }
                    venmoInstance.tokenize({ processResultsDelay: 10 }, function (tokenizeErr, payload) {
                        that.loader.show();

                        if (tokenizeErr) {
                            handleVenmoError(tokenizeErr);
                        } else {
                            handleVenmoSuccess(payload);
                        }
                    });
                    return;
                });
            });
        } else {
            that.params.deviceNotSupportVenmo();
            that.loader.hide();
            return;
        }
    });

    function handleVenmoError(err) {
        that.er.show(err);
        that.loader.hide();
    }
    function handleVenmoSuccess(payload) {
        that.er.hide();
        that.params.onTokenizePayment(payload);
        that.loader.hide();
    }
};

module.exports = {
    init: function (params, $btn) {
        var ins = new Constructor(params, $btn);
        bu.clientToken = params.clientToken;
        return ins.createVenmo();
    }
};
