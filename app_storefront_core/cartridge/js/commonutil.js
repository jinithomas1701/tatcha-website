'use strict';

var ajax = require('./ajax');
var login = require('./login');

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
    	/*var phoneValidator;
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

			//RDMP-3997: IOS 15 Safari / Flickity  Fix
			flickityFix();
    	});*/
    	
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
            if($(this).parents('form').valid()){
            	$('.loader-preventive').show();
                login.submitModal();
            }
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

        //Default Checkout
        /**
         * gtmGiftOptions() and Skip email gate implementation for AD
         * 
         */
        $(document).on('click','.cart-checkout-btn', function (e) {
        	// for GTM - 20.4 : Gift Options: Bag Page
        	gtmGiftOptions();
        	
        	/**
        	 * Skip email gate implementation for AD
        	 */
        	var hasSORProducts = $(this).attr('data-sorproducts');
        	var userExists = $(this).attr('data-userexists');
        	if(hasSORProducts === 'true' && userExists === 'false'){
        		e.preventDefault();
        		$('.loader-preventive').hide();
        		var container = $('#loginModal');
        		var url = container.find('.register-link').attr('data-url');
        		if(url.indexOf('skip_email_gate=true') === -1){
        			url = url + '?skip_email_gate=true';
        		}
        		container.find('.register-link').attr('data-url', url);
        		$('#loginModal').modal('show');
        		$('#ad-warning').show();
        		if($("input[name=scope]")) {
            		container.find('input[name="scope"]').val("checkout");
            	}
        		return;
        	}
        	
            //RDMP-2364
            $('#cart-checkout-button').trigger('click');
        });

		//RDMP-3997: IOS 15 Safari / Flickity  Fix
		function flickityFix(){
			if($( ".carousel" ).length >0){
				var flkty = new Flickity('.carousel', {});
				if (!isiOS()) {
					return;
				}else{
					$( ".carousel" ).each(function( i, carousel ) {
						$(carousel).flickity({
							cellAlign: 'left',
							contain: true
						});
					});

					/* fix iOS touchmove issue */
					;(function () {
						var touchingCarousel = false
						var startXCoordinate
						document.body.addEventListener('touchstart', e => {
							if (e.target.closest('.flickity-slider')) {
								touchingCarousel = true
							} else {
								touchingCarousel = false
								return
							}
							startXCoordinate = e.touches[0].pageX
						});

						document.body.addEventListener('touchmove', e => {
							if (
								!touchingCarousel ||
								!e.cancelable ||
								Math.abs(e.touches[0].pageX - startXCoordinate) < 8
							) return
							e.preventDefault()
							e.stopPropagation()
						}, { passive: false })
					}());

					/* prevent resize in flickity if still animating */
					var resize = Flickity.prototype.resize;
					Flickity.prototype.resize = function() {
						if (! this.isAnimating) {
							resize.call( this );
						} };
				}
			}
		}

		function isiOS() {
			return [
					'iPad Simulator',
					'iPhone Simulator',
					'iPod Simulator',
					'iPad',
					'iPhone',
					'iPod'
				].includes(navigator.platform)
				// iPad on iOS 13 detection
				|| (navigator.userAgent.includes("Mac") && "ontouchend" in document);
		}
		
        // Footer SEO Toggle
        commonutil.footerSeo();
        $(document).on('click', '[data-footer-seo="toggle-link"]', function() {
            $('[data-footer-seo="container"]').toggleClass('footer-seo--show-all')
        });
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

    }
    /* SEO category content show more and less changes End */
}

module.exports = commonutil;