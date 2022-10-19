'use strict';

var account = require('./account'),
	ajax = require('../ajax'),
    bonusProductsView = require('../bonus-products-view'),
    progress = require('../progress'),
    quickview = require('../quickview'),
    cartStoreInventory = require('../storeinventory/cart'),
	util = require('../util');

/**
 * @private
 * @function
 * @description Binds events to the cart page (edit item's details, bonus item's actions, coupon code entry)
 */
function initializeEvents() {
    $('#cart-table').on('click', '.item-edit-details a', function (e) {
        e.preventDefault();
        quickview.show({
            url: e.target.href,
            source: 'cart'
        });
    })
    .on('click', '.bonus-item-actions a, .item-details .bonusproducts a', function (e) {
        e.preventDefault();
        bonusProductsView.show(this.href);
    });

    // override enter key for coupon code entry
    $('form input[name$="_couponCode"]').on('keydown', function (e) {
        if (e.which === 13 && $(this).val().length === 0) 
        { 
        	return false; 
        } else if(e.which === 13 && $(this).val().length > 0) {
        	e.preventDefault();
        	$('.promo-button').trigger('click');
        }
    });

    //to prevent multiple submissions of the form when removing a product from the cart
    var removeItemEvent = false;
    $('button[name$="deleteProduct"]').on('click', function (e) {
        if (removeItemEvent) {
            e.preventDefault();
        } else {
            removeItemEvent = true;
        }
    });

    if($( ".gwpModalLink" ).hasClass( "addBonusModalLink" )){
    	$('.gwpModalLink').trigger('click');
    }
    
    $(document).on('click', '.bag-item-img-block .cart-add-wishlist', function() {
    	var url = $(this).attr('data-url');
    	progress.show();
    	$.getJSON(url, function (data) {
    		if (data && data.success === true) {
    			$('.cart-add-wishlist').hide();
    			$('.cart-remove-wishlist').show();
    			progress.hide();
    		}
    	});
    });
    
    $(document).on('click', '.bag-item-img-block .cart-remove-wishlist', function() {
    	var url = $(this).attr('data-url');
    	progress.show();
    	$.getJSON(url, function (data) {
    		if (data && data.success === true) {
    			$('.cart-remove-wishlist').hide();
    			$('.cart-add-wishlist').show();
    			progress.hide();
    		}
    	});
    });
    
    $(document).on('click', '.wishlist-before-login', function(e) {
    	e.preventDefault();
    	$('#loginModal').modal('show');
    });
    
    function getCookie(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for(var i=0;i < ca.length;i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1,c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
        }
        return null;
    }
    
    $( document ).ready(function() {
    	
    	// Call After Pay if eligible
        if ( $( "#afterpay-express-button" ).length ) {
        	initAfterpay();
        }
    	
    	$('#bonusModal').on('hidden.bs.modal', function (e) {
    		$('#bonusModal').modal('hide');
	    });
    	$('#gwpbonusModal').on('hidden.bs.modal', function (e) {
    		if($( ".gwpModalLink" ).hasClass( "addBonusModalLink" )){
    			progress.show();
    			$('.promo-remove').trigger('click');
    		}
    		$('#gwpbonusModal').modal('hide');
	    });
    	
    	var samplePopup = getCookie('dw_samples_popup');
    	
        if(samplePopup && $('.product-sample-add').length) {
        	$( ".product-sample-add" ).trigger( "click" );
        	var now = new Date();
            if (document.cookie.indexOf('dw_samples_popup') > 0) {
            	document.cookie = "dw_samples_popup=; expires=Thu, 01-Jan-70 00:00:01 GMT; path=/; secure";
            }
        }
        
        $('#addToBagModal').on('hidden.bs.modal', function() {
        	location.reload();
        });
        
        $('.payment-options input').keydown(function () {
            $(this).val() ? $('.promo-button').removeAttr("disabled") : $('.promo-button').attr("disabled",'disabled')
        });
        
        $('.payment-options input').blur(function () {
           $(this).val() ? $('.promo-button').removeAttr("disabled") : $('.promo-button').attr("disabled",'disabled')
        });
        
        $(".slide-up-payment").on('click', function () {
        	$('.mobile-payment-options').toggleClass("slide-up");
        });
        
        $('.payment-options input').on('keyup', function(e) {
        	 $(this).val() ? $('.promo-button').removeAttr("disabled") : $('.promo-button').attr("disabled",'disabled')
        });
		$('.payment-options input').on('paste onpaste', function(e) {
        	  $('.promo-button').removeAttr("disabled") 
        });
		
		var currURL = window.location.href;
		if(currURL.indexOf('hasadproducts=true') > -1){
			$('#loginModal').modal('show');
    		$('#ad-warning').show();
		}
		
		//pairs with open
		var lastPairswithID = $('.bag-page .popup-unit').last().attr('data-cartproductid');
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
    });
    
}

/**
 * @private
 * @function
 * @description Initialize additional functionality related with Braintree PayPal integration
 */
function initBraintreePaypalFunctionality() {
	
	var dialog = require('../dialog'); //For SiteGenesis v100- must be './dialog'
	var util = require('../util'); //For SiteGenesis v100- must be './util'
	var $expressButton = $('.js_braintree_paypal_start_checkout_with_saved_account');
	
	$expressButton.on('click', function() {
		if($expressButton.data('is-address-exist') === true) {
			return true;
		}
		dialog.open({
			url: $expressButton.data('edit-address-url'),
			options: {
				title: $expressButton.data('edit-address-title'),
				open: initEditDefaultShippingAddressForm
			}
		});
		return false;
	});
	
	function initEditDefaultShippingAddressForm() {
		var $form = $('#braintreePaypalEditDefaultShippingAddress');
		$form.on('click', '.apply-button', function() {
			if (!$form.valid()) {
				return false;
			}
			var applyName = $form.find('.apply-button').attr('name');
			var options = {
				url: $form.attr('action'),
				data: $form.serialize() + '&' + applyName + '=true',
				type: 'POST'
			};
			$.ajax(options).done(function(data) {
				if (typeof(data) !== 'string') {
					if(data.success) {
						dialog.close();
						window.location = $expressButton.attr('href');
					} else {
						return false;
					}
				} else {
					$('#dialog-container').html(data);
					initEditDefaultShippingAddressForm();
				}
			});
			return false;
		});
		$form.on('click', '.cancel-button, .close-button', function() {
			dialog.close();
			return false;
		});
$('#braintreePaypalSelectSavedAddress').change(function() {
			var data = $(this).val();
			try {
				data = JSON.parse(data);
				for(name in data) {
					var val = data[name];
					if(typeof val === 'string') {
						val = val.replace(/\^/g,"'");
					}
					$('#dwfrm_profile_address_' + name).val(val);
				}
			} catch(e) {
				$form.find('input:text').val('');
				$form.find('select').val('');
			}
		});
	}
}

exports.init = function () {
    initializeEvents();
    initBraintreePaypalFunctionality();

    if (SitePreferences.STORE_PICKUP) {
        cartStoreInventory.init();
    }
    account.initCartLogin();

    $('.modal-tatcha-gift-message').on('show.bs.modal', function () {
    		$('#giftmsg-form').find(".form-group").removeClass("has-error");
		$('#giftmsg-form').find(".help-block").remove();
    })
    
	
    $('#dwfrm_singleshipping_shippingAddress').submit(function() {    	
        $('.loader-preventive').show();
    });	
	
	
    $('input[name="dwfrm_cart_checkoutCart"]').click(function(){
    	
    });
	
	$( document ).ready(function() {
		$('.loader-content').hide();
		$(".mini-cart-total").css('cursor','default');
		var outOfStock =$('.outofstock').val();
		if(outOfStock == 'true'){
			$('#outOfStockModal').modal('show');
		}
	});
    
  /*
   * added for giftwrap bs4 changes
   * @date 04-feb-2020
   * hasGiftMessage-add - id of gift wrap Add link
   * hasGiftMessage - class for gift wrap Add and Edit links
   * */  
	
	$(document).on('click', '#hasGiftMessage-add', function(e) {		   
		$('#giftMessageModal #textAreaPost').val('');
		$('#giftMessageModal .char-remain-count').text('210');
    });
    
    $(document).on('click', '.hasGiftMessage', function() {
    	var defaultLength = 210;
    	if($('.gift-message-summary-block').is(":visible")) {
//    		var giftMsg = $(".gift-message-summary-block .gift-message small").text();
    		var giftMsg = $("#giftMessageModal #textAreaPost").attr('value');
    		if(giftMsg) {
    			$("#textAreaPost").val(giftMsg);
    			defaultLength = defaultLength-giftMsg.length;
    		} else {
        		$("#textAreaPost").val(null);
    		}
    	} else {
    		$("#textAreaPost").val(null);
    	}
    	$('#giftMessageModal .char-remain-count').text(defaultLength);
    	/*if($("#gift-price-bs").is(":visible")) {
		    $('#giftwrap-toggle-bs').prop('checked', true);
			var eligibility = $("#giftwrap-toggle-bs").data('eligibility');
			if(eligibility === 'part-eligible') {
		    	$("#giftbox-part-eligible-validation").show();
			}
		} else {
		    $('#giftwrap-toggle-bs').prop('checked', false);
	    	$("#giftbox-part-eligible-validation").hide();
		}*/
    	$("#giftbox-ineligibile-validation").hide();
    	$(".special-character-validation").hide();
    });
	
    /**
	 * @date 13-feb-2020
	 * added for displaying pairswith isml and 'What a Treasure' link
	 * 
	 * */
	$(document).on('click', '.pairs-with-btn', function(){
		var id = $(this).data('pairswith'); 
		if(id) {
			$('.pairs-with-image,.pairs-with-name,.pairs-with-variant,.pairs-with-addtobagone,.pairs-with-travelsizeone,.pairs-with-addtobagtwo,.pairs-with-travelsizetwo').attr('tabindex', '0');
			var pairsWithDiv = $('div[data-cartproductid="'+id+'"]');
			$('div[data-closesuggestion="'+id+'"]').attr('tabindex', '0');
			$('div[data-closesuggestion="'+id+'"]').attr('aria-label', 'Close pairs best with');
			if(pairsWithDiv && !pairsWithDiv.hasClass('open')) {
				pairsWithDiv.addClass('open');
				$(this).hide();
				$('div[data-treasurelink="'+id+'"]').show();
			}
		}
	});

    
	/**
	 * @date 13-feb-2020
	 * added for hiding pairswith isml and 'What a Treasure' link
	 * 
	 * */
	$(document).on('click', '.product-suggestion-close', function(){
		var id = $(this).data('closesuggestion'); 
		$(this).removeAttr('aria-label');
		$(this).removeAttr('tabindex');
		if(id) {
			$('.pairs-with-image,.pairs-with-name,.pairs-with-variant,.pairs-with-addtobagone,.pairs-with-travelsizeone,.pairs-with-addtobagtwo,.pairs-with-travelsizetwo').attr('tabindex','-1');
			var pairsWithDiv = $('div[data-cartproductid="'+id+'"]');
			if(pairsWithDiv && pairsWithDiv.hasClass('open')) {
				pairsWithDiv.removeClass('open');
				$('div[data-treasurelink="'+id+'"]').hide();
				$('button[data-pairswith="'+id+'"]').show();	
			}
		}
	});
	
	//ADA 
	$(document).on('keydown', '.product-suggestion-close', function(e){
		if(e.keyCode === 13){
			e.preventDefault();
			$(this).trigger("click");
		}
	});
	
	$(document).on('click', '.pairs-with-treasure', function(){
		var pairsID = $(this).parent().attr('data-treasurelink');
		var id = $('div[data-closesuggestion='+pairsID+']').data('closesuggestion');
		$('div[data-closesuggestion='+pairsID+']').removeAttr('aria-label');
		$('div[data-closesuggestion='+pairsID+']').removeAttr('tabindex');
		if(id) {
			$('.pairs-with-image,.pairs-with-name,.pairs-with-variant,.pairs-with-addtobagone,.pairs-with-travelsizeone,.pairs-with-addtobagtwo,.pairs-with-travelsizetwo').attr('tabindex','-1');
			var pairsWithDiv = $('div[data-cartproductid="'+id+'"]');
			if(pairsWithDiv && pairsWithDiv.hasClass('open')) {
				pairsWithDiv.removeClass('open');
				$('div[data-treasurelink="'+id+'"]').hide();
				$('button[data-pairswith="'+id+'"]').show();	
			}
		}
	});
	
	//ADA 
	$(document).on('keydown', '.pairs-with-treasure', function(e){
		if(e.keyCode === 13){
			e.preventDefault();
			$(this).trigger("click");
		}
	});
	
	/**
	 * @date 14-feb-2020
	 * backend call to Cart-AddProduct for both full size and travel size products
	 * 
	 * */
	$(document).on('click', '.add-to-cart, .add-travel-link', function() {
		var id = $(this).data('addtocart');
		if(id) {
			var addToCartForm = $('div[data-submitform="'+id+'"] :input');
			if(addToCartForm) {
				progress.showFull();
				$.ajax({
					url: util.ajaxUrl(Urls.addProduct),
					type: 'POST',
				    data: $(addToCartForm).serialize(),
				    success: function (response) {
				    	if(response) {
				    		var url = window.location.href;    
				    		if (!(url.indexOf('edit=true') > -1)){
				    			if(url.indexOf('?') > -1) {
				    				url += '&edit=true'
				    			} else {
				    				url += '?edit=true'
				    			}
				    		}
				    		window.location.href = url;
				    	}
				    }
				});
			}
		}
	});
	
};
	    