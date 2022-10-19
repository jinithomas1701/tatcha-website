'use strict';

var ajax = require('./ajax'),
    minicart = require('./minicart'),
    util = require('./util');

var enterKeyCount = 0;

var updateMiniCart = function () {
	$.ajax({
        type: 'GET',
        url: util.ajaxUrl(Urls.minicart),
        success:function(response) {
    		minicart.showNoScroll(response);
        }
    });
};

var showBagModal = function(view) {
	$('#eGiftBag-content').html(view);
	$('#eGiftBag').modal();
	updateMiniCart();
};



var setAddToCartHandler = function (e) {
    e.preventDefault();
    var form = $(this).closest('form');
    if(!form.valid()) {
        return false;
       }
    var options = {
        url: util.ajaxUrl(form.attr('action')),
        method: 'POST',
        cache: false,
        data: form.serialize()
    };
    $.ajax(options).done(function (response) {
    	if(response){
    		showBagModal(response);
        	form.find('input,textarea').val('');
    	} else {
    		form.find('span.error').hide();
            if(response == null || response.errors == null){
            	return false;
            } 
            for (var id in response.errors.FormErrors) {
                var $errorEl = $('#' + id).addClass('error').removeClass('valid').next('.error');
                if (!$errorEl || $errorEl.length === 0) {
                    $errorEl = $('<span for="' + id + '" generated="true" class="error" style=""></span>');
                    $('#' + id).after($errorEl);
                }
                $errorEl.text(response.errors.FormErrors[id].replace(/\\'/g, '\'')).show();
            }
    	}
    }).fail(function (xhr, textStatus) {
        // failed
        if (textStatus === 'parsererror') {
            window.alert(Resources.BAD_RESPONSE);
        } else {
            window.alert(Resources.SERVER_CONNECTION_ERROR);
        }
    });
};

var saveGiftCertStep1Data = function(e, fromStorage) {
	if(e) {
		e.preventDefault();
	}
	
	var hasError = false;
	var defaultGiftImage = '';
	if(fromStorage){
		defaultGiftImage = $('#selectedImage').val();
	}else{
		defaultGiftImage = $('.selected-gift-cert-image').attr('src');
	}
	$('#selectedGiftImgae').val(defaultGiftImage);
	if($('#recipientName').val().length === 0) {
		hasError = true;
		$('#recipientName').closest('.form-group').addClass('has-error');
		$('#recipientName').siblings('.help-block').show();
		$('#recipientName').siblings('.invalid-feedback').show();
	}
	
	if($('#senderName').val().length === 0) {
		hasError = true;
		$('#senderName').closest('.form-group').addClass('has-error');
		$('#senderName').siblings('.help-block').show();
		$('#senderName').siblings('.invalid-feedback').show();
	}
	
	var giftCertAmount = $('#giftCertAmount').val();
	
	if(!hasError) {
		var form;
		var url = '';
		if(!fromStorage) {
			url = util.ajaxUrl($(this).closest('form').attr('action'));
			form = $(this).closest('form').serialize()+'&pmin=0&pmax='+giftCertAmount+'&cgid='+$('#giftCardCategory').val();
			localStorage.setItem('giftStep1', form);
			localStorage.setItem('giftStep1URL', url);
		} else {
			form = localStorage.getItem('giftStep1');
			url = localStorage.getItem('giftStep1URL');
		}
		
		var options = {
	        url: url,
	        method: 'POST',
	        cache: false,
	        data: form
	    };
		$('.loader-preventive').show();
		$.ajax(options).then(function(res) {
			if(res) {
				$('.recommended-tab-contents').remove();
				$('.recommend-tab').show();
				$('.deliver-tab').hide();
				$('.design-tab').hide();
				$('.recommend-tab').append(res);
				window.history.replaceState(null, null, '?step=2');
			}
			$('.loader-preventive').hide();
		});
	}
};

var selectGiftCertImage = function(e) {
	e.preventDefault();
	if(($(this).attr('src')).length) {
		$('.gift-card-thumbnails .product-thumbnail').removeClass('active');
		$(this).closest('.product-thumbnail').addClass('active');
		$('.selected-gift-cert-image').attr('src', $(this).attr('src'));
		$('#selected-image-gift').val($(this).attr('src'));
		$('#selectedGiftImgae').val($(this).attr('src'));
	}
};

var setActiveTabData = function(url,tab, fromModal) {
	$.ajax({
        type: 'POST',
        url: util.ajaxUrl(url),
        data: {
        	'tab':tab
        }
        }).then(function(res) {
		if(res) {
			if(fromModal) {
				location.reload();
			} else {
				$('.recommend-tab').show();
				$('.deliver-tab').hide();
				$('.design-tab').hide();
			}
		}
		$('.loader-preventive').hide();
	});
} 

var activateSelectedTab = function() {
	let giftCardTab = this.getAttribute('data-tab');
	var activeTab = $("#activeStep").val();
	if($('#isPage2Step2Viewed').val() == 'true' || $('#isPage1Step2Viewed').val() == 'true'){
		$("#step1RecTabLi").removeAttr("style");
	}
	if($('#isPage2Step3Viewed').val() == 'true' || $('#isPage1Step3Viewed').val() == 'true' || $('#isPage3Step3Viewed').val() == 'true' ){
		$("#step1DelTabLi").removeAttr("style");
		$("#step2DelTabLi").removeAttr("style");
	}
	switch(giftCardTab) {
		case 'design-tab':
			$('.design-tab').show();
			$('.deliver-tab').hide();
			$('.recommend-tab').hide();
			$('.loader-preventive').hide();
			$("body, html").animate({
				scrollTop: 0
			}, 0 );
			window.history.replaceState(null, null, '?step=1');
			$('#selectionCount').html('<span id="recPdCount">0</span> of 3<br>Selected');
			break;
		case 'recommend-tab':
			let isBtnPrevious = this.getAttribute('data-previous');
			window.history.replaceState(null, null, '?step=2');
			if(isBtnPrevious) {
				enterKeyCount = 0;
				$('.loader-preventive').show();
				let url = this.getAttribute('data-url');
				let tab = this.getAttribute('data-step');
				if($('#isPage2Step2Viewed').length == 0){
					$('#giftGertStep1Next').trigger('click');
				}
				else{
					setActiveTabData(url, tab);					
				}
				$("body, html").animate({
					scrollTop: 0
				}, 0 );
			} else {
				$('.recommend-tab').show();
				$('.deliver-tab').hide();
				$('.design-tab').hide();
				if($('#isPage2Step2Viewed').length == 0){
					$('#giftGertStep1Next').trigger('click');
				}
			}
			
			break;
		case 'deliver-tab':
			$('.deliver-tab').show();
			$('.recommend-tab').hide();
			$('.design-tab').hide();
			if($('#isPage3Step3Viewed').length == 0){
				$('#giftGertStep2Next').trigger('click');
			}
			window.history.replaceState(null, null, '?step=3');
			break;
		default:
			break;
	}
}

var validateEmail = function(email) {
	 var filter = /^([\w-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;
	    if (filter.test(email)) {
	        return true;
	    } else {
	        return false;
	    }
}

var skipNextStep = function() {
	$( "#recommendedItems" ).prop( "disabled", true );
	if($('#recommendedItems').val() != ''){
		$( ".remove-recommended" ).trigger( "click" );
	}
	$( "#giftGertStep2Next" ).trigger( "click" , [false, true ,true]);
	
}
var saveGiftCertStep2Data = function(e, fromStorage, isSkip) {
	if(e) {
		e.preventDefault();
	}
	if(!isSkip){
		$( "#recommendedItems" ).prop( "disabled", false );
	}
	var defaultGiftImage = '';
	if(fromStorage){
		defaultGiftImage = $('#selectedImage').val();
	}else{
		defaultGiftImage = $('.selected-gift-cert-image').attr('src');
	}
	$('#selectedGiftImgaeStep2').val(defaultGiftImage);
	var form = '';
	var url = '';
	if(!fromStorage) {
		form = $(this).closest('form').serialize();
		url = util.ajaxUrl($(this).closest('form').attr('action'));
		localStorage.setItem('giftStep2', form);
		localStorage.setItem('giftStep2URL', url);
	} else {
		form = localStorage.getItem('giftStep2');
		url = localStorage.getItem('giftStep2URL');
	}
	
	var options = {
        url: url,
        method: 'POST',
        cache: false,
        data: form
    };
	$('.loader-preventive').show();
	$.ajax(options).then(function(res) {
		if(res) {
			$('.deliver-tab-contents').remove();
			$( ".gift-deliver-tab" ).trigger( "click" );
			$('.deliver-tab').append(res);
			window.history.replaceState(null, null, '?step=3');

		}
		$('.loader-preventive').hide();
	});
}

var focusElement = function (e) {
	var container = document.querySelector("#minibag-container-wrap");
	var focusableEls = container.querySelectorAll('div.close-bag, h2, a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled])');
    var firstFocusableEl = focusableEls[0];  
    var lastFocusableEl = focusableEls[focusableEls.length - 1];
    
	var KEYCODE_TAB = 9;
	var isTabPressed = (e.key === 'Tab' || e.keyCode === KEYCODE_TAB);
	
    if (!isTabPressed) { 
        return; 
    }

    if ( e.shiftKey ) /* shift + tab */ {
        if (document.activeElement === firstFocusableEl) {
            lastFocusableEl.focus();
            e.preventDefault();
        }
    } else /* tab */ {
        if (document.activeElement === lastFocusableEl) {
            firstFocusableEl.focus();
            e.preventDefault();
        }
    }
}

// Trap focus on mini bag when open for tab events
var trapMiniBagFocus = function () {
	var container = document.querySelector("#minibag-container-wrap");
	container.addEventListener('keydown', focusElement);
    
    // Close mini bag
	$('.close-bag').on('keypress',function(e) {
	    if(e.which == 13 || e.which == 32) {
	    	$(this).trigger("click");
	    }
	});
}

//open pairs with in minicart
function pairsWithOpen(){
	var lastPairswithID = $('.minibag-sitegen .popup-unit').last().attr('data-cartproductid');
	var pairsWithDiv = $('div[data-cartproductid="'+lastPairswithID+'"]');
	$('div[data-closesuggestion="'+lastPairswithID+'"]').attr('tabindex', '0');
	$('div[data-closesuggestion="'+lastPairswithID+'"]').attr('aria-label', 'Close pairs best with');
	if(pairsWithDiv && !pairsWithDiv.hasClass('open')) {
		pairsWithDiv.addClass('open');
		pairsWithDiv.find('.pairs-with-image').attr("tabindex","0");
		pairsWithDiv.find('.pairs-with-main').attr("tabindex","0");
		pairsWithDiv.find('.pairs-with-name').attr("tabindex","0");
		pairsWithDiv.find('.pairs-with-travel').attr("tabindex","0");
		$('button[data-pairswith="'+lastPairswithID+'"]').hide();
		$('div[data-treasurelink="'+lastPairswithID+'"]').show();
	}
}

var saveGiftCertData = function(e) {
	e.preventDefault();
	var hasError = false;
	let recipientEmail = $('#recipientEmail').val();
	let senderEmail = $('#senderEmail').val();
	let giftMessage = $('#giftcardMessage').val();
	if($('#giftcardMessage').val() == ''){
		var msg = $('#defaultMessageContent').val();
		$('#giftcardMessage').val(msg);
	}
	if(recipientEmail.length === 0) {
		$('#recipientEmail').closest('.form-group').addClass('has-error');
		$('#recipientEmail').siblings('.help-block').show();
		$('#recipientEmail').siblings('.invalid-feedback').show();
		hasError = true;
	}
	
	if(senderEmail.length === 0) {
		$('#senderEmail').closest('.form-group').addClass('has-error');
		$('#senderEmail').siblings('.help-block').show();
		$('#senderEmail').siblings('.invalid-feedback').show();
		hasError = true;
	}
	
	if(!validateEmail(recipientEmail)) {
		$('#recipientEmail').closest('.form-group').addClass('has-error');
		$('#recipientEmail').siblings('.help-block').show();
		$('#recipientEmail').siblings('.invalid-feedback').show();
		hasError = true;
	}
	
	if(!validateEmail(senderEmail)) {
		$('#senderEmail').closest('.form-group').addClass('has-error');
		$('#senderEmail').siblings('.help-block').show();
		$('#senderEmail').siblings('.invalid-feedback').show();
		hasError = true;
	}
	
	if(!hasError) {
		var form = $(this).closest('form');
		var options = {
	        url: util.ajaxUrl(form.attr('action')),
	        method: 'POST',
	        cache: false,
	        data: form.serialize()
	    };
		$.ajax(options).then(function(res) {
			if(res) {
//				showBagModal(res);
				$('.mini-bag-container').empty();
	    	    //appending the response to minicart container div
	    	    $('.mini-bag-container').append(res);

				/**
	    		 * To show the minibag drawer
	    		 * */
/*	    	    $('.mini-bag').removeClass("hide-minibag");
	    	    $('.minibag-mask').show();*/
	    	    $('body').css("overflow","hidden");
	    	   setTimeout(function() {

				   //initialize braintree for paypal and applepay
				   try{
					   window.miniCartButton();
					   window.initbraintreeSG();
				   }catch(e){}

	    		   /*$('.mini-bag').addClass("show-minibag");*/
					minicart.showMinibag();
					minicart.pairsWithOpen($('.pairs-with-btn').last());
	    		    trapMiniBagFocus();
				    
	    	   }, 100);
			}
		});
	} else {
		if(giftMessage.length === 0 && $('#giftcardMessage').val().length > 0) {
			$('#giftcardMessage').val('');
		}
	}
}

var selectMessageFont = function(e) {
	e.preventDefault();
	let selectedFont = this.getAttribute('data-font');
	switch(selectedFont){
		case 'font-sans':
			$('#giftcardMessage').removeClass( "font-serif font-script font-hand" ).addClass( "font-sans" );
			$('#selectedFont').val('font-sans');
			break;
		case 'font-serif':
			$('#giftcardMessage').removeClass( "font-sans font-script font-hand" ).addClass( "font-serif" );
			$('#selectedFont').val('font-serif');
			break;
		case 'font-script':
			$('#giftcardMessage').removeClass( "font-sans font-serif font-hand" ).addClass( "font-script" );
			$('#selectedFont').val('font-scrip');
			break;
		case 'font-hand':
			$('#giftcardMessage').removeClass( "font-sans font-serif font-script" ).addClass( "font-hand" );
			$('#selectedFont').val('font-hand');
			break;
		default:
			break;
	}
}

var resetFieldError = function(e) {
	$(this).closest('.form-group').removeClass('has-error');
	$(this).siblings('.help-block').hide();
	$(this).siblings('.invalid-feedback').hide();
}

var applySelectedAjax = function(url,giftProducts){
	$('.loader-preventive').show();
	$.ajax({
        type: 'POST',
        url: url,
        data: {
        	'selected':giftProducts
        },
        success:function(response) {
        	$('.loader-preventive').hide();
    		$('#selection-block').html(response);
    		if (giftProducts) {
    		    GiftProductsArray = JSON.parse(giftProducts);
    		}else{
    			var GiftProductsArray = [];
    		} 
    		if(GiftProductsArray.length >= 3){
    			$('.product-add-to-cart #add-to-cart-gift').removeAttr('disabled');
    		}else{
    			$('.product-add-to-cart #add-to-cart-gift').attr("disabled","disabled");
    		}
        }
    });
};

var removeRecommendedProduct = function(e) {
	var GiftProductsArray = [];
	var giftProducts = $('#recommendedItems').val(); 
	var ajaxUrl = $('#selectedGiftUrl').val();
	if (giftProducts) {
	    GiftProductsArray = giftProducts.split(',');
	}
	var removeProduct = $(this).data('pid');
	if (removeProduct.length > 0)  {
		var index = GiftProductsArray.indexOf(removeProduct);
		GiftProductsArray.splice(index, 1);
		$('#recPdCount').text(GiftProductsArray.length);
		applySelectedAjax(ajaxUrl,JSON.stringify(GiftProductsArray));
		$('#recommendedItems').val(GiftProductsArray.join(','));
		$('#label-'+removeProduct).removeClass('active');
		$('#label-'+removeProduct).find('.btn-status').toggle();
		$('#label-'+removeProduct+' input:checkbox').prop('checked', false);
	}
}

var recommendProduct = function(e) {
	var GiftProductsArray = [];
	var giftProducts = $('#recommendedItems').val(); 
	var ajaxUrl = $('#selectedGiftUrl').val();
	if (giftProducts) {
	    GiftProductsArray = giftProducts.split(',');
	}
	
	var checkbox = $(this);
	if (checkbox.is(':checked'))  {
		if(GiftProductsArray.indexOf(checkbox.val()) == -1 && GiftProductsArray.length <3){
			GiftProductsArray.push(checkbox.val());
			$(this).parent().addClass('control-label');
			$('#recPdCount').text(GiftProductsArray.length);
			$(this).parent().find('.btn-status').toggle();
			applySelectedAjax(ajaxUrl,JSON.stringify(GiftProductsArray));
		}else{
			$(this).prop('checked', false);
			$(this).parent().removeClass('active');
			$(this).parent().removeClass('control-label');
			$(this).parent().removeClass('focus');
			return;
		}
	}
	else {
		
		if($(this).parent().hasClass('control-label')) {
			$(this).parent().find('.btn-status').toggle();
			$(this).parent().removeClass('control-label');
			var index = GiftProductsArray.indexOf(checkbox.val());
			GiftProductsArray.splice(index, 1);
			$('#recPdCount').text(GiftProductsArray.length);
			applySelectedAjax(ajaxUrl,JSON.stringify(GiftProductsArray));
		}
	}
	$('#recommendedItems').val(GiftProductsArray.join(','));
}

var scrollToRecommendation = function(e) {
	e.preventDefault();
	
	var position = $($(this).attr("href")).offset().top - 96;

	$("body, html").animate({
		scrollTop: position
	}, 1000 );
}

var restrictEnterKeyPress = function(e) {
	
	let giftMsgLength = $('#giftcardMessage').val().length;
	
	if(giftMsgLength === 0) {
		enterKeyCount = 0;
	}
	
	if(e.keyCode === 13) {
		enterKeyCount ++;
		
		if(enterKeyCount > 5) {
            e.preventDefault();
		}
	}
}

exports.init = function () {
	$( document ).ready(function() {
		var defaultGiftImage ='';
		if( $('#selectedImage').val() == '' || $('#selectedImage').val() == null){
			 defaultGiftImage = $('.selected-gift-cert-image').attr('src');
		}else{
			defaultGiftImage = $('#selectedImage').val();
		}
		$('.selected-gift-cert-image').attr('src',defaultGiftImage);
		$('#selectedGiftImgae').val(defaultGiftImage);
	    let activeStep = $('#activeStep').val();

	    if(activeStep != "2" && activeStep != "3" && location.href.includes("giftcertpurchase")){
			window.history.replaceState(null, null, '?step=1');
		}
	    if(activeStep === "2") {
	    	$('.loader-preventive').show();
	    	saveGiftCertStep1Data(false, true);
	    }else if(activeStep === "3") {
	    	$('.loader-preventive').show();
	    	saveGiftCertStep2Data(false, true);
	    }
	    
	    $(window).scroll(function () {
            if ($(this).scrollTop() > 150) {
                $('#selectionCount').fadeIn();
            } else {
                $('#selectionCount').fadeOut();
            }
        });
	    
	    /*if($('#activeStep').length && $('#activeStep').val().length) {
	    	$('#eGiftBag').on('hidden.bs.modal', function () {
	    		$('.loader-preventive').show();
	    		let url = $('#giftCertStep3BackBtn').attr('data-url');
	    		setActiveTabData(url, 0, 'fromModal');
	    	})
	    }*/
	    $('#eGiftBag').on('hidden.bs.modal', function () {
    		$('.loader-preventive').show();
    		let url = $('#eGiftBag .cart-url').attr('href');
    		location.replace(url);
    	})
	});
	
	
    $('#AddToBasketButton').on('click', setAddToCartHandler);
    $(document).on('click', '#giftGertStep1Next', saveGiftCertStep1Data);
    $(document).on('click', '.gift-cert-images', selectGiftCertImage);
    $(document).on('click', '.gift-card-tab', activateSelectedTab);
    $(document).on('click', '.gift-recommend-tab', activateSelectedTab);
    $(document).on('click', '#giftGertStep2Next', saveGiftCertStep2Data);
    $(document).on('click', '.gift-recommeded-product-skip', skipNextStep);
    $(document).on('click', '#saveGiftCertData', saveGiftCertData);
    $(document).on('click', '.font-radio-option', selectMessageFont);
    $(document).on('click', '#giftGertStep2Back', activateSelectedTab);
    $(document).on('click', '#giftCertStep3BackBtn', activateSelectedTab);
    
    
    $(document).on('focus', '#recipientName', resetFieldError);
    $(document).on('focus', '#senderName', resetFieldError);
    $(document).on('change', '.btn-recommend input',recommendProduct);
    $(document).on('click', '.remove-recommended', removeRecommendedProduct);
    $(document).on('focus', '#recipientEmail', resetFieldError);
    $(document).on('focus', '#senderEmail', resetFieldError);
    $(document).on('click', 'a.anchor-link', scrollToRecommendation);
    
    $(document).on('keypress', '#giftcardMessage', restrictEnterKeyPress);
};
