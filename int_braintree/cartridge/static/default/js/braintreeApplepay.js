'use strict';

/* global braintreeUtils braintree $ ApplePaySession */

braintreeUtils.applePay = (function () {
    var bu = braintreeUtils;

    function Constructor(initParams, $btn) {
        this.$btn = $btn;
        var $errorContainer = $('<div class="error"></div>');
        var $loaderContainter = $('<div class="braintree-loader"></div>');
        $btn.after($errorContainer);
        $btn.after($loaderContainter);
        this.params = initParams;
        this.er = bu.createErrorInstance($errorContainer[0]);
        this.loader = bu.createLoaderInstance($loaderContainter[0]);
    }

    Constructor.prototype.createApplePay = function () {
        var that = this;
        var params = that.params;
        var loader = that.loader;
        loader.show();

        
		braintree.client.create({
			authorization: bu.clientToken
		}, function (clientErr, clientInstance) {
			if (clientErr) {
				console.error('Error creating client:', clientErr);
				return;
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
					var session = new ApplePaySession(3, paymentRequest);

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
									nonce: payload.nonce
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

							if(shippingContact && shippingContact.addressLines[0] && shippingContact.postalCode && shippingContact.countryCode && shippingContact.emailAddress) {
								that.$btn.trigger('braintree:ApplePayPaymentAuthorized', data);
							}
						});
					};
					session.oncancel = function (event) {
						$('.applepayoverlay').hide();
					}
					session.begin();
				};
				var promise = ApplePaySession.canMakePaymentsWithActiveCard(applePayInstance.merchantIdentifier);
				promise.then(function (canMakePaymentsWithActiveCard) {
					if (!canMakePaymentsWithActiveCard) {
						that.$btn.trigger('braintree:ApplePayCanNotMakePaymentWithActiveCard');
						that.createApplePaySession = null;
						return;
					}
				});
			});
		});
        
    };

    Constructor.prototype.startPayment = function () {
        this.er.hide();
        if (this.createApplePaySession) {
        	$('.applepayoverlay').show();
            this.createApplePaySession();
        }
        
        // GTM
	    try {
	    	if (!window.dataLayer) {
				window.dataLayer = [];
			}
	    	window.dataLayer.push({
	    	 'event': 'tatcha_checkout_applepay'
	    	 });
	    } catch (e) {}         
        
    };

    Constructor.prototype.updateAmount = function (amount) {
        this.params.options.amount = amount;
    };

    return {
        init: function (params, $btn) {
            if (!window.ApplePaySession || (window.ApplePaySession && !ApplePaySession.canMakePayments())) {
                $btn.trigger('braintree:deviceNotSupportApplePay');
                $('.cart-payment-applepay-wrap').hide(); 
                return false;
            }
            $btn.trigger('braintree:deviceSupportApplePay');

            var ins = new Constructor(params, $btn);
            bu.clientToken = params.clientToken;
            $.extend(bu.messages, params.messages);
            ins.createApplePay();
            return ins;
        }
    };
}());
