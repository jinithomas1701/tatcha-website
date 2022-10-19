'use strict';

/* global braintreeUtils braintree paypal $ */

braintreeUtils.payPal = (function () {
    var bu = braintreeUtils;

    var console = bu.console;
    var $miniCartQuantity = parseInt($('.minicart-quantity').text(), 0);
    var $addToCartButton = $('#add-to-cart');
    var $config = $('.js_braintree_paypal_cart_button').data('braintreeConfig');
    var $braintreePDPButton = $('.braitnree-pdp-paypal-button-wrap');

    function Constructor(initParams, $btn) {
        var params = initParams;
        this.params = initParams;
        params.options = params.options || {};

        this.$btn = $btn;
        var $errorContainer = $('<div class="error"></div>');

        if (params.$errorContainer) {
            $errorContainer = params.$errorContainer;
            delete params.$errorContainer;
        }

        var $loaderContainter = $('<div class="braintree-loader"></div>');

        if (params.$loaderContainer) {
            $loaderContainter = params.$loaderContainer;
        }

        $btn.after($errorContainer);
        $btn.after($loaderContainter);

        this.er = bu.createErrorInstance($errorContainer[0]);
        this.loader = bu.createLoaderInstance($loaderContainter[0]);
        this.minicartLoader = $btn.next('.braintree-loader');

        var that = this;

        if (params.isFraudToolsEnabled) {
            that.loader.show();
            braintree.dataCollector.create({
                authorization: bu.clientToken,
                paypal: true,
                kount: false
            }, function (error, data) {
                that.loader.hide();
                if (error) {
                        that.er.show(error);
                    return;
                }
                $('input[name=braintreePaypalRiskData]').val(data.deviceData);
                params.riskData = data.deviceData;
            });
        }

        // Check minicart quantity and hide PDPbutton if it is not empty
        if ($miniCartQuantity > 0 || $addToCartButton.prop('disabled')) {
            $('.braitnree-pdp-paypal-button-wrap').hide();
        }

        that.loader.show();

        braintree.client.create({
            authorization: bu.clientToken
        }, function (error, clientInstance) {
            if (error) {
                that.er.show(error);
                return;
            }

            braintree.paypalCheckout.create({
                authorization: bu.clientToken,
            }, function (error, paypalCheckoutInstance) {
                that.loader.hide();
                if (error) {
                    that.er.show(error);
                    return;
                }
                that.loader.show();

                var showCredit = $btn.data('showcredit');
                if(showCredit) {
                    var allowedFunding = [paypal.FUNDING.CREDIT];
                    var disallowedFunding= [paypal.FUNDING.CARD, paypal.FUNDING.VENMO];
                } else {
                    var allowedFunding = [];
                    var disallowedFunding= [paypal.FUNDING.CREDIT, paypal.FUNDING.CARD, paypal.FUNDING.VENMO];
                }
                var paypalButtonConfig = {
                    env: clientInstance.getConfiguration().gatewayConfiguration.environment === 'production' ? 'production' : 'sandbox',
                    payment: function () {
                        // https://braintree.github.io/braintree-web/current/PayPalCheckout.html#createPayment
                        $braintreePDPButton = $('.braitnree-pdp-paypal-button-wrap');

                        if ($braintreePDPButton.length && $braintreePDPButton.is(':visible')) {
                            that.er.hide();
                            paypal.Button.props.payment.timeout = 30000;
                            var res = bu.pdpOnlickForAsignedPaypalPayment();

                            if (res) {
                                that.params.options.amount = parseFloat(res.amount);
                            } else {
                                throw new Error(res.message || 'Error occurs');
                            }
                        }
                        if(!($('#braintreeFormErrorContainer').is(':empty'))) {
                            $('#braintreeFormErrorContainer').html('');
                        }
                        return paypalCheckoutInstance.createPayment(that.params.options);
                    },
                    locale: params.options.locale,
                    commit: params.options.useraction === 'commit',
                    style: {
                        layout: (params.options.style && params.options.style.layout) ? params.options.style.layout : 'vertical',  // horizontal | vertical
                        size: 'responsive',    // medium | large | responsive
                        shape: 'rect',      // pill | rect
                        color: 'silver',  // gold | blue | silver | black
                        tagline: (params.options.style && params.options.style.tagline) ? params.options.style.tagline : false,
                        label: (params.options.style && params.options.style.label) ? params.options.style.label : 'paypal',
                        // label: 'checkout',
                        // checkout The PayPal Checkout button. The default button.
                        // credit   The PayPal Credit button. Initializes the credit flow. Cannot be used with any custom color option.
                        // pay      The Pay With PayPal button. Initializes the checkout flow.
                        // buynow   The Buy Now button. Initializes the checkout flow. The default Buy Now button is unbranded. To include PayPal branding, set branding: true.
                        // paypal   The generic PayPal button. Initializes the checkout flow. This button contains only the PayPal brand logo.
                        // tagline: true, // false - to disable the tagline/text beneath the button
                        // maxbuttons: 4, //1-4
                        // fundingicons: true, // true  Displays funding instrument icons. Not valid for the credit button.
                        // false Hides funding instrument icons.
                    },
                    funding: {
                        allowed: allowedFunding, //Removed paypal.FUNDING.VENMO
                        disallowed: disallowedFunding
                        // paypal.FUNDING.CREDIT    Allow buyers to pay with PayPal Credit.                 Enabled by default for US buyers.
                        // paypal.FUNDING.CARD      Allow buyers to pay with their credit or debit card     Enabled by default for all buyers.
                        // paypal.FUNDING.ELV       Allow German buyers to pay with their bank account      Enabled by default for DE buyers.
                    },
                    onAuthorize: function (data, actions) {
                        return new paypal.Promise(function (resolve, reject) {
                            // GTM
                    	    try {
                    	    	if (!window.dataLayer) {
                    				window.dataLayer = [];
                    			}
                    	    	window.dataLayer.push({
                    	    	 'paypalAction': 'authorize',
                    	    	 'event': 'tatcha_checkout_paypal'
                    	    	 });

								if(window.mParticleCheckoutInitiated) {
									var page = window.location.href;
									window.mParticleCheckoutInitiated('paypal', page);
								}
                    	    } catch (e) {}
                        	
                            paypalCheckoutInstance.tokenizePayment(data).then(function (payload) {
                                params.onTokenizePayment(payload, resolve, reject, actions, that);
                            }).catch(function (err) {
                                that.loader.hide();
                                if (err) {
                                    that.er.show(err);
                                    return;
                                }
                            });
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

                        if ($braintreePDPButton.length && $braintreePDPButton.is(':visible')) {
                            $.ajax({
                                url: $config.removeLineItem,
                                type: 'post'
                            }).responseJSON;
                        }
                    },
                    onError: function (err) {
                        that.er.show(err);

                        if ($braintreePDPButton.length && $braintreePDPButton.is(':visible')) {
                            $.ajax({
                                url: $config.removeLineItem,
                                type: 'post'
                            }).responseJSON;
                        }
                    }
                };

                paypalButtonConfig = $.extend(false, paypalButtonConfig, that.params.paypalConfig);

                if (that.params.paypalConfig.bmConfigurationInvalid) {
                    console.error('Invalid configuration in BM: Merchant Tools > Site Preferences > Custom Preference > BRAINTREE_PAYPAL > Field: ' + that.params.paypalConfig.bmConfigurationInvalid);
                    return;
                }

                paypal.Button.render(paypalButtonConfig, that.$btn[0]).then(function () {
                    that.loader.hide();
                    that.minicartLoader.hide();
                });
            });
        });


    }

    Constructor.prototype.updateAmount = function (amount) {
        this.params.options.amount = amount;
    };

    Constructor.prototype.updateShippingAddress = function (data) {
        this.params.options.shippingAddressOverride = data;
    };

    function initAccountListAndSaveFunctionality() {
        var $accountsList = $('#braintreePaypalAccountsList');
        var $savePaypalAccountCountainerEl = $('#braintreeSavePaypalAccountContainer');
        var $savePaypalAccountEl = $('#braintreeSavePaypalAccount');
        var $paypalAccounMakeDefaultEl = $('#braintreePaypalAccountMakeDefault');

        function accountsListChange() { // eslint-disable-line require-jsdoc
            if ($accountsList.val() === 'newaccount') {
                if ($savePaypalAccountCountainerEl.length) {
                    $savePaypalAccountCountainerEl.show();
                    $savePaypalAccountEl[0].checked = true;
                    $savePaypalAccountEl[0].disabled = false;
                }
                if ($paypalAccounMakeDefaultEl.length) {
                    $paypalAccounMakeDefaultEl[0].disabled = false;
                }
            } else {
                var selectedAccount = window.braintreeUtils.getSelectedData($accountsList[0]);
                if (selectedAccount && $paypalAccounMakeDefaultEl.length) {
                    if (selectedAccount['data-default'].value === 'true') {
                        $paypalAccounMakeDefaultEl[0].disabled = true;
                    } else {
                        $paypalAccounMakeDefaultEl[0].disabled = false;
                    }
                    $paypalAccounMakeDefaultEl[0].checked = true;
                }
                if ($savePaypalAccountCountainerEl.length) {
                    $savePaypalAccountEl[0].checked = false;
                    $savePaypalAccountCountainerEl.hide();
                }
            }
        }

        $savePaypalAccountEl.change(function () {
            if ($savePaypalAccountEl[0].checked) {
                $paypalAccounMakeDefaultEl[0].disabled = false;
                $paypalAccounMakeDefaultEl[0].checked = true;
            } else {
                $paypalAccounMakeDefaultEl[0].disabled = true;
                $paypalAccounMakeDefaultEl[0].checked = false;
            }
        });

        if ($accountsList.length) {
            $accountsList.change(accountsListChange);
            accountsListChange();
        }
    }

    function createBillingAddressData(inpBillingAddress, details) {
        var billingAddress = inpBillingAddress;
        billingAddress.firstName = details.firstName;
        billingAddress.lastName = details.lastName;
        billingAddress.email = details.email;
        billingAddress.phone = details.phone;
        billingAddress.countryCodeAlpha2 = billingAddress.countryCode;
        billingAddress.streetAddress = billingAddress.line1;
        billingAddress.extendedAddress = billingAddress.line2;
        billingAddress.locality = billingAddress.city;
        billingAddress.region = billingAddress.state;
        return JSON.stringify(billingAddress);
    }

    function createShippingAddressData(inpShippingAddress, details) {
        var shippingAddress = inpShippingAddress;
        if (!shippingAddress.recipientName) {
            shippingAddress.firstName = details.firstName;
            shippingAddress.lastName = details.lastName;
            shippingAddress.recipientName = details.firstName + ' ' + details.lastName;
        }
        shippingAddress.email = details.email;
        shippingAddress.phone = details.phone;
        shippingAddress.countryCodeAlpha2 = shippingAddress.countryCode;
        shippingAddress.streetAddress = shippingAddress.line1;
        shippingAddress.extendedAddress = shippingAddress.line2;
        shippingAddress.locality = shippingAddress.city;
        shippingAddress.region = shippingAddress.state;
        shippingAddress.postalCode = shippingAddress.postalCode;
        return JSON.stringify(shippingAddress);
    }

    return {
        init: function (params, $btn) {
            bu.clientToken = params.clientToken;
            $.extend(bu.messages, params.messages);
            return new Constructor(params, $btn);
        },
        initAccountListAndSaveFunctionality: initAccountListAndSaveFunctionality,
        createBillingAddressData: createBillingAddressData,
        createShippingAddressData: createShippingAddressData
    };
}());
