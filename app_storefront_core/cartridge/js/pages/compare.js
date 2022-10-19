'use strict';

var addProductToCart = require('./product/addToCart'),
    ajax = require('../ajax'),
    page = require('../page'),
    productTile = require('../product-tile'),
    progress = require('../progress'),
    quickview = require('../quickview'),
    util = require('../util'),
	minicart = require('../minicart');

/**
 * @private
 * @function
 * @description Binds the click events to the remove-link and quick-view button
 */
function initializeEvents() {
    $(document).on('click', '.btn-remove', function (e) {
        e.preventDefault();
        $('.loader-content').show();
        var removeUrl = $(this).attr('data-remove-url');
        ajax.getJson({
            url: removeUrl,
            callback: function () {
                page.refresh();
            }
        });
        $('.loader-content').hide();
    });
}

var sendAddToCartGlobalGA = function(pid) {
	try {
		
		var prodId = pid || '';
		if (!window.dataLayer) {
			window.dataLayer = [];
		}
		
		dataLayer.push({
			'event': 'add_to_cart_global',
			'prodID': prodId
    	});
		
	} catch(e) {
		
	}
}

/*
 * Pagination 
 */
$(document).on('click', '.open-quick-view', function (e) {
	e.preventDefault();
	var productUrl = $(this).attr('data-url');
	
	quickview.show({
        url: productUrl,
        source: 'quickview'
	});
});

$(document).on('change','.product-variant-container.compare select',function(){
	if(window.location.href.indexOf("products=")===-1){
		variationChange($(this).closest(".productIdInput")[0].getAttribute("data-pid") , $(this).val());
	}else{
		window.location.href = window.location.href.replace($(this).closest(".productIdInput")[0].getAttribute("data-pid"),$(this).val()) 
	}
	
	
})
$(document).on('change','.product-comparison .color-radio',function(){
	if(window.location.href.indexOf("products=")===-1){
		variationChange($(this).closest(".productIdInput")[0].getAttribute("data-pid") , $(this).val());
	}else{
		window.location.href = window.location.href.replace($(this).closest(".productIdInput")[0].getAttribute("data-pid"),$(this).val()) 
	}	
})
 function variationChange (removedProduct,addedProduct){
	var productIds = $(".productIdInput").map(function(index,item){
		return item.getAttribute("data-pid");
	})
	var url =  util.appendParamsToUrl(Urls.compareUpdate,{
		'category': $('.product-comparison').attr("data-cgid"),
		'removedPid':removedProduct,
		'addedPid': addedProduct
	} )
	
	$.ajax({
                type: 'GET',
                url: url,
                success:function(response){
				if(response.success){
					page.refresh();
				}
                }
	})
}

function focusElement(e) {
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
function trapMiniBagFocus() {
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

$(document).on('click', '.compare-add-to-bag', function(){
    		var productId = $(this).attr('data-pid');
    		$.ajax({
                type: 'POST',
                url: util.ajaxUrl(Urls.minicartCreateProduct),
                data:{
             	   productId:productId
                },
                success:function(response) {
                	if(response) {	
    	            $('.mini-bag-container').empty();
    	            $('.mini-bag-container').append(response);

					try{
						window.miniCartButton();
						window.initbraintreeSG();
					}catch(e){}
                  /**
              	 * To show the minibag drawer
              	 * */
              /*	$('.mini-bag').addClass("show-minibag");
                  $('.mini-bag').removeClass("hide-minibag");
                  $('.minibag-mask').show();*/
 				  $('body').css("overflow","hidden");
                  minicart.showMinibag();
                  //open pairs with
                  minicart.pairsWithOpen($('.pairs-with-btn').last());
                  trapMiniBagFocus();
                }
                
            	if(productId) {
            		   sendAddToCartGlobalGA(productId);
            	   }
                
                }
            });		
    	})
    	
$(document).on('click', '.compare-section .variant-selection-plp', function(){
	$('.loader-preventive').show();
	var compareProductIds = [];
	$(".compareProductId").each(function(e){
		compareProductIds.push($(this).attr('data-pid'));
	});
	var cgid = $(this).attr('data-cgid');
	var pearlSelectedId = $(this).attr('data-attrid');
	var pearlProdID = $('#pearlProdID').val();
	var index = compareProductIds.indexOf(pearlProdID);
    if (index !== -1) {
    	compareProductIds[index] = pearlSelectedId;
    }
    
	$.ajax({
        type: 'POST',
        url: util.ajaxUrl(Urls.compareWidgetUpdate),
        data:{
        	compareProductIds: JSON.stringify(compareProductIds),
        	cgid: cgid
        },
        success:function(response) {
        	if(response) {	
        		$('.compareWidgetContainer').empty();
        		$('.compareWidgetContainer').append(response);
        		
        		// Reload lazy load images
                var prdImgs = $('.compareWidgetContainer .lazyImage');
    			$(prdImgs).each(function(e){
    				let src = $(this) ? $(this)[0].getAttribute('data-src') : null;
        			
        			if (src !== null && $(this)[0].tagName.toLowerCase() === 'img') {
        				$(this)[0].src = src;
        			}
    			});
    			
        		$('.loader-preventive').hide();
          }
        
        }
    });	
	
})

$(document).on("click",".compare-show, .compare-show-mobile",function(){
	var element  = $(".compare-title")[0];
		if(element){
			element.scrollIntoView({behavior: "smooth"});
		}
   })
	   
exports.init = function () {
    productTile.init();
    initializeEvents();
    addProductToCart();
};
