'use strict';

var ajax = require('./ajax');
var login = require('./login');
var validator = require('./validator');

function validateEmail(email) {
    var re = /\S+@\S+\.\S+/;
    return re.test(email);
}

/**
 * for GTM - 20.4 : Gift Options: Bag Page
 *
 */
function gtmGiftOptions(){
	var giftMsg = $('.checkout-gift-block #giftMsg').val();
	var hasGiftWrap = $('.checkout-gift-block #hasGiftWrap').val();

	try{
	    if (!window.dataLayer) {
	      window.dataLayer = [];
	    }

		if(hasGiftWrap === 'true'){
			dataLayer.push({
		        "event": "tatcha_giftoptions_giftbox"
		    });
		}
		if (giftMsg !== 'null') {
			dataLayer.push({
		        "event": "tatcha_giftoptions_giftmsg"
		    });
		}
	  } catch (e) {}
 }

var commonutil = {
    init: function () {
        validator.init();
    	var phoneValidator;
    	$( document ).ready(function() {

    		if($('#phoneText').length){
				phoneValidator = window.intlTelInput(document.querySelector("#phoneText"), {
	                separateDialCode: true,
	                utilsScript: $("#validatorScript").val()
	            });

				var countryCode = $('#countryCode').val();
				if (typeof countryCode != 'undefined' || countryCode != '') {
					window.intlTelInputGlobals.getCountryData().find(function(el){
						if(el.dialCode === countryCode) {
							phoneValidator.setCountry(el.iso2);
						}
					});
				}
    		}
    	});

        $('[data-toggle="tooltip"]').tooltip();

        //Login Page
        $('#loginbtn').on('click', function (e) {
            if($(this).parents('form').valid()){
            	$('.loader-preventive').show();
            }
        });


        //Password Reset Page
        $('.sendEmail').click( function(e) {
            var email = $('#resetEmail').val();
            $('.form-group').removeClass('has-error');
            if(validateEmail(email)) {
                var url = $('#PasswordResetForm').data('url');
                url.concat('?resetType','=email','?resetEmail','='+email);
                $("#PasswordResetForm").attr("action", url);
                $('.loader-preventive').show();

                $("#PasswordResetForm").submit();
            } else {
                $(".form-group-email").addClass('has-error');
                if($(".form-group-email").find("#resetEmail-error").length > 0) {
                	$(".form-group-email").find("#resetEmail-error").show();
                } else {
                	$(".form-group-email").find(".help-block").show();
                }

            }
        });
        $('.send-code').click( function(e) {
            if(phoneValidator.isValidNumber()){
                $("#countryCode").val(phoneValidator.getSelectedCountryData().dialCode);
                var formattedNumber = phoneValidator.getNumber(1);
                $("#formattedNumber").val(formattedNumber);
                try{
                    $("#phoneText").val(phoneValidator.getNumber().replace("+"+phoneValidator.getSelectedCountryData().dialCode, ""));
                } catch(err){}
                var url = $('#PasswordResetForm').data('url');
                var resetType = $('input[name=resetType]:checked').val();
                url.concat('?resetType','='+resetType,'?countryCode','='+$("#countryCode").val(),'?phoneText','='+$("#phoneText").val(),'?formattedNumber','='+ $("#formattedNumber").val());
                $("#PasswordResetForm").attr("action", url);
                $('.loader-preventive').show();

                /*
                 * Updated code by removing recaptcha check
                 * */
                e.preventDefault();
                document.PasswordResetForm.submit();

            } else {
                $(".form-group-phone").addClass('has-error');
                $(".form-group-phone").find(".help-block").show();
            }
        });

        //Login Modal
        $('#login-btn').on('click', function (e) {
            e.preventDefault();
            //if($(this).parents('form').valid()){
            	$('.loader-preventive').show();
                login.login();
            //}
        });

        //Checkout Login
        $('#checkout-login-form-btn').on('click', function (e) {
        	$('.loader-preventive').show();
        	$('#checkout-login-form-btn').trigger('click');
        });

        //Express Checkout
        $(document).on('click','#express-checkout-button', function (e) {
        	// for GTM - 20.4 : Gift Options: Bag Page
        	e.preventDefault();
        	gtmGiftOptions();
        	$('.loader-preventive').show();
        	window.location.href = document.getElementById('express-checkout-button').href;
        });

            // Afterpay Changes Start
	    $(document).on('click', '.afterpay-icon-link', function(e) {
		    e.preventDefault();
		    var termsUrl=$(this);
		    if($('#afterpayModal').length==0){
		    $.ajax({
		    	url: termsUrl.attr('href'),
		    	data: {},
		    	success: function(data) {
		    		$('body').append(data);
		    		var modal = $('#afterpayModal');
		    		//modal.find( '.modal-body' ).html(data);
		    		modal.modal('show');
		    	}
		    });
		    }
	    });
		// Footer SEO Toggle
        commonutil.footerSeo();
        $(document).on('click', '[data-footer-seo="toggle-link"]', function() {
            $('[data-footer-seo="container"]').toggleClass('footer-seo--show-all')
        });

         // Auto delivery Tooltip Changes Start
        $(document).on('click', '.pdp-refill-info', function (e) {
			e.preventDefault();
			$("#autoDeliveryModal").modal('show');
		}).on('keyup', function(e) {
			if(e.keyCode==40){
				e.preventDefault();
			}
		});

		$(document).on('click', '.auto-delivery-close', function (e) {
			e.preventDefault();
			$('#autoDeliveryModal').modal('hide');
		}).on('keyup', function(e) {
			if(e.keyCode==40){
				e.preventDefault();
			}
		});
		 // Auto delivery Tooltip Changes End

        /*Trigger OnLoad Event from URL
          can be reuse this for different cases - newsletterSuccess, selectCard, selectAddress etc
        */
        var reqEvent = commonutil.getUrlParam('triggerEvent');
        if(reqEvent) {
            switch(reqEvent) {
                case 'focus' :
                    var id = commonutil.getUrlParam('id');
                    if($('div[data-itemid="'+id+'"]:visible').length) {
                        var top = $('div[data-itemid="'+id+'"]:visible').offset().top;
                        top = top - 100;
                        if(window.location.href.indexOf("/giftfinder") > -1 ){
                            $(".results-wrapper").animate({ scrollTop: top }, 600);
                        }else {
                            $("html, body").animate({ scrollTop: top }, 600);
                        }

                    }
                    break;
            }
        }
        //Init Close lisenter
    },
     /* SEO category content show more and less changes start */
    footerSeo: function () {
        var footerSeo = {
            maxLimit: 143,
            textCount: 0,
            activeClass: 'footer-seo--show-all',
            $container: $('[data-footer-seo="container"]'),
            $title: $('[data-footer-seo="title"]'),
            $moreWrapper: $('[data-footer-seo="show-more-wrapper"]'),
            $lessWrapper: $('[data-footer-seo="show-less-wrapper"]')
        }

        if (footerSeo.$title.length) {
            footerSeo.$lessWrapper.append(`<h2 class="footer-seo__title" data-footer-seo="title">${footerSeo.$title.html()}</h2>`);
        }

        footerSeo.$moreWrapper.find('p').each(function() {
            var _self = footerSeo;
            if (_self.maxLimit < _self.textCount) return false;
            var current = $.trim($(this).text()).length;
            var currentHtml = $(this).html();
            _self.textCount += current;
            if (_self.maxLimit < _self.textCount) {
                currentHtml = $.trim($(this).text().slice(0, Math.abs(Math.abs(current - _self.textCount) - _self.maxLimit)));
                currentHtml = `${currentHtml}...`;
                _self.$container.addClass('footer-seo--toggle-active');
                _self.$container.removeClass(_self.activeClass);
            }
            _self.$lessWrapper.append(`<p>${currentHtml}</p>`);
        });

        if(footerSeo.textCount < footerSeo.maxLimit){
            $('.footer-seo__toggle-link').addClass('d-none');
        }

    },
    /* SEO category content show more and less changes End */

    //Get URL Param
    getUrlParam: function (name) {
        var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
        if(results) {
            return results[1] || 0;
        }
        return false;
    }
}

module.exports = commonutil;
