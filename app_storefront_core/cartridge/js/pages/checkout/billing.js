'use strict';

var ajax = require('../../ajax'),
    formPrepare = require('./formPrepare'),
    giftcard = require('../../giftcard'),
    util = require('../../util'),
    progress = require('../../progress');
	

/**
 * @function
 * @description Fills the Credit Card form with the passed data-parameter and clears the former cvn input
 * @param {Object} data The Credit Card data (holder, type, masked number, expiration month/year)
 */
function setCCFields(data) {
    var $creditCard = $('[data-method="CREDIT_CARD"]');
    $creditCard.find('input[name$="creditCard_owner"]').val(data.holder).trigger('change');
    $creditCard.find('select[name$="_type"]').val(data.type).trigger('change');
    $creditCard.find('input[name*="_creditCard_number"]').val(data.maskedNumber).trigger('change');
    $creditCard.find('[name$="_month"]').val(data.expirationMonth).trigger('change');
    $creditCard.find('[name$="_year"]').val(data.expirationYear).trigger('change');
    $creditCard.find('input[name$="_cvn"]').val('').trigger('change');
}

/**
 * @function
 * @description Updates the credit card form with the attributes of a given card
 * @param {String} cardID the credit card ID of a given card
 */
function populateCreditCardForm(cardID) {
    // load card details
    var url = util.appendParamToURL(Urls.billingSelectCC, 'creditCardUUID', cardID);
    ajax.getJson({
        url: url,
        callback: function (data) {
            if (!data) {
                window.alert(Resources.CC_LOAD_ERROR);
                return false;
            }
            setCCFields(data);
        }
    });
}

/**
 * @function
 * @description Changes the payment method form depending on the passed paymentMethodID
 * @param {String} paymentMethodID the ID of the payment method, to which the payment method form should be changed to
 */
function updatePaymentMethod(paymentMethodID) {
    var $paymentMethods = $('.payment-method');
    //$paymentMethods.removeClass('payment-method-expanded');

    var $selectedPaymentMethod = $paymentMethods.filter('[data-method="' + paymentMethodID + '"]');
    if ($selectedPaymentMethod.length === 0) {
        $selectedPaymentMethod = $('[data-method="Custom"]');
    }
    $selectedPaymentMethod.addClass('payment-method-expanded');

    // ensure checkbox of payment method is checked
   // $('input[name$="_selectedPaymentMethodID"]').removeAttr('checked');
    //$('input[value=' + paymentMethodID + ']').prop('checked', 'checked');

    formPrepare.validateForm();
}

/**
 * @function
 * @description loads billing address, Gift Certificates, Coupon and Payment methods
 */
exports.init = function () {
	
	if($('.radio-billing-address').length){
		$('input.phone').removeClass('phone').removeClass('required');
	}
    $('.modal-tatcha-add-address').on('show.bs.modal', function () {
		$('#dwfrm_profile_address_phone').addClass('phone').addClass('required');
	})
	
	$('.modal-tatcha-add-address').on('hidden.bs.modal', function () {
		$('#dwfrm_profile_address_phone').removeClass('phone').removeClass('required');
	})
	
    var $checkoutForm = $('.checkout-billing');
    var $addGiftCert = $('#add-giftcert');
    var $giftCertCode = $('input[name$="_giftCertCode"]');
    var $addCoupon = $('#add-coupon');
    var $couponCode = $('input[name$="_couponCode"]');
    var $selectPaymentMethod = $('.payment-method-options');
    var selectedPaymentMethod = $selectPaymentMethod.find(':checked').val();

    $giftCertCode.on('paste keyup onpaste', function(e) {
    	pasted(e);
    	if($giftCertCode && $giftCertCode.val().length > 0) {
    		$('#add-giftcert').prop("disabled", false);
            $('#check-giftcert').prop("disabled", false);
    	} else {
    		$('#add-giftcert').prop("disabled", true);
            $('#check-giftcert').prop("disabled", true);
    	}
    });
    
    function pasted(e){
    		setTimeout(function(){
    			if(e.target.value){
    				$('#add-giftcert').prop("disabled", false);
    	            $('#check-giftcert').prop("disabled", false);
    			}
    		},0);
    	
    }

    formPrepare.init({
        formSelector: 'form[id$="billing"]',
        continueSelector: '[name$="billing_save"]'
    });
    
    $('#giftCardModal').on('show.bs.modal', function () {
		$('#giftCardModal').find('.alert').remove();
		$('#giftCardModal').find('input').val('');
		
		$('#check-giftcert,#add-giftcert').attr('disabled','true')
		
		$('#giftCardModal').find('.has-error').removeClass('has-error');
		$('#giftCardModal #dwfrm_billing_giftCertCode-error').remove();
	})

    // default payment method to 'CREDIT_CARD'
    updatePaymentMethod((selectedPaymentMethod) ? selectedPaymentMethod : 'CREDIT_CARD');
    $selectPaymentMethod.on('click', 'input[type="radio"]', function () {
        updatePaymentMethod($(this).val());
    });

    // select credit card from list
    $('#creditCardList').on('change', function () {
        var cardUUID = $(this).val();
        if (!cardUUID) {return;}
        populateCreditCardForm(cardUUID);

        // remove server side error
        $('.required.error').removeClass('error');
        $('.error-message').remove();
    });

    $('#check-giftcert').on('click', function (e) {
        e.preventDefault();
        $('#giftCardModal').find('.alert').remove();
        var $balance = $('.balance');
        if ($giftCertCode.length === 0 || $giftCertCode.val().length === 0) {
            var error = $balance.find('span.error');
            if (error.length === 0) {
                error = $('<span>').addClass('error').appendTo($balance);
            }
            error.html('<div class="alert alert-danger checkout-alert" role="alert">'+Resources.GIFT_CERT_MISSING+'</div>');
            return;
        }
        progress.show('#giftCardModal');
        giftcard.checkBalance($giftCertCode.val(), function (data) {
            if (!data || !data.giftCertificate) {
                $balance.html('<div class="alert alert-danger checkout-alert" role="alert">'+Resources.GIFT_CERT_INVALID+'</div>').removeClass('success').addClass('error');
                progress.hide();
                return;
            }
            progress.hide();
            if(data.giftCertificate && data.giftCertificate.balance && data.giftCertificate.balance.indexOf('$')> -1 ){
            	var giftBalance = data.giftCertificate.balance.replace('$', '');
            	$balance.html('<div class="alert alert-default alert-giftcard-balance" role="alert">'+String.format(Resources.GIFT_CERT_BALANCE, giftBalance)+'</div>').removeClass('error').addClass('success');
            }
        });
    });

    $addGiftCert.on('click', function (e) {
        e.preventDefault();
        $('#giftCardModal').find('.alert').remove();
        var code = $giftCertCode.val(),
            $error = $checkoutForm.find('.giftcert-error');
        if (code.length === 0) {
            $error.html('<div class="alert alert-danger checkout-alert" role="alert">'+Resources.GIFT_CERT_MISSING+'</div>');
            return;
        }

        var url = util.appendParamsToUrl(Urls.redeemGiftCert, {giftCertCode: code, format: 'ajax'});
        progress.showFull();
        $.getJSON(url, function (data) {
        	 	progress.hideFull(); 	
            var fail = false;
            var msg = '';
            if (!data) {
                msg = Resources.BAD_RESPONSE;
                fail = true;
            } else if (!data.success) {
                msg = data.message.split('<').join('&lt;').split('>').join('&gt;');
                fail = true;
            }
            if (fail) {
                $error.html('<div class="alert alert-danger checkout-alert" role="alert">'+msg+'</div>');
                return;
            } else {
                window.location.assign(Urls.billing);
            }
        });
        
    });

    $addCoupon.on('click', function (e) {
        e.preventDefault();
        progress.showFull();
        var $error = $checkoutForm.find('.coupon-error'),
            code = $couponCode.val();
        if (code.length === 0) {
            $error.html(Resources.COUPON_CODE_MISSING);
            progress.hideFull();
            return;
        }

        var url = util.appendParamsToUrl(Urls.addCoupon, {couponCode: code, format: 'ajax'});
        $.getJSON(url, function (data) {
        	progress.hideFull();
            var fail = false;
            var msg = '';
            if (!data) {
                msg = Resources.BAD_RESPONSE;
                fail = true;
            } else if (!data.success) {
                msg = data.message.split('<').join('&lt;').split('>').join('&gt;');
                fail = true;
            }
            if (fail) {
                $error.html(msg);
                return;
            }

            //basket check for displaying the payment section, if the adjusted total of the basket is 0 after applying the coupon
            //this will force a page refresh to display the coupon message based on a parameter message
            if (data.success && data.baskettotal === 0) {
                window.location.assign(Urls.billing);
            }
        });
    });
    
    
    $(document).ready(function (e) {
    	let promoWrapOffsetTop = $('.checkout-promo-code').length > 0 ? $('.checkout-promo-code').offset().top : 0;
    	let promoSubmitted = sessionStorage.getItem('billing-promo');
    	if(promoSubmitted) {
    		$("body, html").animate({
    			scrollTop: promoWrapOffsetTop - 150
    		}, 1000 );
    	}
    	sessionStorage.removeItem('billing-promo')
    	
    	$('#afterpay-error').length > 0? $('html, body').animate({scrollTop: $("#afterpay-error").offset().top}, 600) : 0;
    	
    });

    // trigger events on enter
    $couponCode.on('keydown', function (e) {
        if (e.which === 13) {
            e.preventDefault();
            $addCoupon.click();
        }
    });
    $giftCertCode.on('keydown', function (e) {
        if (e.which === 13) {
            e.preventDefault();
            $addGiftCert.click();
        }
    });
    
    $('#dwfrm_billing').submit(function() {
        //$('.loader-preventive').show();
    });
    
    $('#addCreditCardForm').submit(function() {
    	if($(this).find('#braintreeCardOwner').val() != '') {
            $('.loader-preventive').show();
        }
    });
    
    $('#cart-coupon-form').submit(function() {
        $('.loader-preventive').show();
        sessionStorage.setItem('billing-promo', true);
    });    
    
    $('#is-CREDIT_CARD').click(function () {
    	$("#creditcard_container").show();
    	$("#containerAfterPay").hide();
    	$("#giftcard-block").show();
    	$("#checkout-billing-addr").show();
    	//$("#checkout-credit-card-block").removeClass("disabledbutton");
    	$("#checkout-gift-card-block").removeClass("disabledbutton")
    });
    
    $('#is-AFTERPAY_PBI').click(function () {
    	$("#containerAfterPay").show();
    	$("#creditcard_container").hide();
    	$("#checkout-billing-addr").hide();
    	//$("#checkout-credit-card-block").addClass("disabledbutton");
    	$("#checkout-gift-card-block").addClass("disabledbutton");
    });
    
    
    if ($('input.afterpayInputRadio').prop('checked')) {
    	$("#containerAfterPay").show();
    	$("#creditcard_container").hide();
    	$("#checkout-billing-addr").hide();
    	//$("#checkout-credit-card-block").addClass("disabledbutton");
    	$("#checkout-gift-card-block").addClass("disabledbutton");
    }    
    $('.alert-giftcard-applied').length > 0? $("#afterpay-span").addClass("disabledbutton"):$("#afterpay-span").removeClass("disabledbutton")
    $('.alert-giftcard-applied').length > 0? $('#afterpay-gift-msg').show():0
};
