'use strict';

var dialog = require('../../dialog'),
    productStoreInventory = require('../../storeinventory/product'),
    tooltip = require('../../tooltip'),
    util = require('../../util'),
    addToCart = require('./addToCart'),
    availability = require('./availability'),
    image = require('./image'),
    productNav = require('./productNav'),
    productSet = require('./productSet'),
    recommendations = require('./recommendations'),
    colorbox = require('../../colorbox'),
    progress = require('../../progress'),
    variant = require('./variant'),
    ajax = require('../../ajax');

/**
 * @description Initialize product detail page with reviews, recommendation and product navigation.
 */
function initializeDom() {
    productNav();
    recommendations();
    tooltip.init();
}

/**
 * @description Initialize event handlers on product detail page
 */
function initializeEvents() {

	$( document ).ready(function() {
		setTimeout(function () {
			if($('.bv-expand-filter-button').length > 0) {
				$('.bv-filters').removeClass('bv-hidden');
				$('.bv-expand-filter-button').remove();
			}
        }, 2000);

		setTimeout(function () {
			$('.prd-rating-share-block').removeClass('prd-share-hidden');
			$('.prd-rating-share-block').addClass('prd-share-show');

        }, 3000);
		$(document).on("click",".yotpo-icon-cross",function(){
			document.body.style.overflow="auto";
		})

		$(document).on("click",".mobile-filters-footer-btn",function(){
			document.body.style.overflow="auto";
		})

	    if(urlParam('reviews') == 'true'){
	    	var target = $("#reviews");
	    	if(target.length) {
	    		var t;
	    		if(navigator.userAgent.match(/Android|BlackBerry|iPhone|iPod|iPad|Opera Mini|IEMobile/i)) {
	    			t = $("#reviews").offset().top;
	    		} else {
	    			t = $("#reviews").offset().top - 125;
	    		}
	    		$('html, body').animate({
	    			scrollTop: t
	    		}, 2000);
	    		//document.getElementById('reviews').scrollIntoView({ behavior: 'smooth' });
	    	}
	    }

	});

    var $pdpMain = $('#pdpMain');

    let pdpImages = document.querySelectorAll('.lazyImage');
    window.lazyLoad(pdpImages, {
	     root: null,
	     rootMargin: "0px",
	     threshold: .25
	});

    addToCart();
    availability();
    variant();
    image();
    colorbox.init();
    productSet();
    if (SitePreferences.STORE_PICKUP) {
        productStoreInventory.init();
    }

    // Add to Wishlist and Add to Gift Registry links behaviors
    $pdpMain.on('click', '[data-action="wishlist"], [data-action="gift-registry"]', function () {
        var data = util.getQueryStringParams($('.pdpForm').serialize());
        if (data.cartAction) {
            delete data.cartAction;
        }
        var url = util.appendParamsToUrl(this.href, data);
        this.setAttribute('href', url);
    });

    // product options
    $pdpMain.on('change', '.product-options select', function () {
        var salesPrice = $pdpMain.find('.product-add-to-cart .price-sales');
        var selectedItem = $(this).children().filter(':selected').first();
        salesPrice.text(selectedItem.data('combined'));
    });

    // prevent default behavior of thumbnail link and add this Button
    $pdpMain.on('click', '.thumbnail-link, .unselectable a', function (e) {
        e.preventDefault();
    });

    $('.size-chart-link a').on('click', function (e) {
        e.preventDefault();
        dialog.open({
            url: $(e.target).attr('href')
        });
    });

    $(document).on('click','.auto-delivery-toggle', function (e) {

    	if ($('input.auto-delivery-toggle').prop('checked')) {

    		if($('#select-everydelivery').length > 0){
    			$('#select-everydelivery').show();
    		} else {
		if(window.enableSORV2){
			$('select[name=OsfSorDeliveryWeekInterval],.OsfSorDeliveryInterval-help').show();
          $('select[name=SorDeliveryMonthInterval],.OsfSorDeliveryInterval-help').show();
		}else{
		 $('select[name=OsfSorDeliveryWeekInterval],.OsfSorDeliveryInterval-help').show();
         $('select[name=OsfSorDeliveryInterval],.OsfSorDeliveryInterval-help').show();
		}
    		}

    	} else {
    		$('#select-everydelivery').hide();
		if(window.enableSORV2){
	       $('select[name=OsfSorDeliveryWeekInterval],.OsfSorDeliveryInterval-help').hide();
           $('select[name=SorDeliveryMonthInterval],.OsfSorDeliveryInterval-help').hide();
		}else{
		  $('select[name=OsfSorDeliveryWeekInterval],.OsfSorDeliveryInterval-help').hide();
           $('select[name=OsfSorDeliveryInterval],.OsfSorDeliveryInterval-help').hide();
		}

		//hiding AD error - RDMP-3528
		$('.ad-promocode-error-affix').hide();
    	}

    });


    var notifyPrevent = false;
    $('#notify-me-modal').on('hidden.bs.modal', function (e) {
        $(this).find('.has-error').removeClass('has-error');
        $(this).find('#notify-me-email-error').remove();
        $(this).find('form')[0].reset();

     });


    $('.modal').on('show.bs.modal', function (e) {
    	$('main').addClass('disable-animations');
    })

    $('.notify-me-modal-dialog').mousedown(function(e) {
    	var classList = e.target.classList;
    	$.each(classList, function(index, item) {
    	    if (item === 'notify-me-cancel') {
    	    	notifyPrevent = true;
    	    }
    	});
    	if(notifyPrevent) {
    		notifyPrevent = false;
    		e.preventDefault();
    		$('.notify-me-cancel').trigger('click');
    	}
    });

    $(document).on('click','.bv-rating-ratio',function(){
    		var t = $("#reviews").offset().top-125;
    		$('html, body').animate({
            scrollTop: t
        }, 1000);
    });

    function urlParam(name){
    	var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
    	if(results) {
    		return results[1] || 0;
    	} else {
    		return false;
    	}
    }




    /*$('#comingsoon-form').on('submit', function(e){
    	e.preventDefault();
    	var form = $(this);
    	if(form.valid()) {
    		$('.loader-preventive').show();
    		ajax.post({
	            url: form.attr('action'),
	            data: form.serialize(),
	            callback: function (response) {
	            	$('.loader-preventive').hide();
	            	if(response) {
	            		response = JSON.parse(response);
	            		if(response.status) {
	            			$('#notify-me-modal').modal('hide');
	            		}
	            	}
	            }
	    	});
    	}
    });

    $('#notify-me-form').on('submit', function(e){
    	e.preventDefault();
    	var form = $(this);
    	if(form.valid()) {
    		$('.loader-preventive').show();
    		ajax.post({
	            url: form.attr('action'),
	            data: form.serialize(),
	            callback: function (response) {
	            	$('.loader-preventive').hide();
	            	if(response) {
	            		response = JSON.parse(response);
	            		if(response.status) {
	            			$('#notify-me-modal').modal('hide');
	            		}
	            	}
	            }
	    	});
    	}
    });*/

    /* Yotpo customization */
    $( document ).ready(function() {
    	try{
    		setTimeout(function (){$(".yotpo-user-field-description:contains('Net Promoter Score:')").parent().hide();}, 2000);
    	} catch (err){}

    	$('#reviews').bind('DOMSubtreeModified',function(event) {
        	try{
        		$(".yotpo-user-field-description:contains('Net Promoter Score:')").parent().hide();
        	} catch (err){}
    	});
    });


// New product page changes start
if($(".you-may-like-carousel").length>0){
	var youmaylike = new Flickity('.you-may-like-carousel',{ "cellAlign": "left", "contain": true, "imagesLoaded": true, "percentPosition": false, "freeScroll": true, "pageDots": true, "groupCells": true,"wrapAround":true });
}


if($(".product-carousel").length>0){
	var flkty = new Flickity('.product-carousel',{ "cellAlign": "center","wrapAround": true, "contain": true, "imagesLoaded": "true", "percentPosition": false, "freeScroll": false, "pageDots": true, "groupCells": false,lazyLoad:"true"});
}

if($(".product-carousel .video-frame").length > 0){
	$(".flickity-page-dots li").last().remove();
}
$(".product-thumbnail").not(".video-thumbnail").on("click",function(){
	$(".product-thumbnail").removeClass("active");
	$(this).addClass("active");
	flkty.select($(".product-thumbnail").index(this))
})
flkty.on( 'change', function( index ) {
	$(".product-thumbnail").removeClass("active");

	$(".product-thumbnail").eq(index).addClass("active")
});
$(".video-play-icon").on("click",function(){
	$(".video-thumbnail").trigger("click");
})
if($(".video-icon-thumbnail").length > 0){
	$(".product-carousel .flickity-page-dots .dot").last()[0].appendChild($(".video-icon-thumbnail")[0]);
	$(".product-carousel .flickity-page-dots .dot").last().attr("style","background:transparent;box-shadow:none !important");

}

		var position = $(window).scrollTop();
		var stickyButtonTop = $('.product-detail-container .add-to-bag-sticky-container').length > 0 ? $('.product-detail-container .add-to-bag-sticky-container').offset().top : '';
	    var imageContainerTop = $('.product-detail-container .product-carousel').length > 0 ? $('.product-detail-container .product-carousel').offset().top : '';
		$(window).scroll(function () {
	    	var scroll = $(window).scrollTop();
			if($('#add-to-bag-affix').length>0){
				var cartButton;
				if($('.product-detail-container .add-to-bag-sticky-container').length > 0 ){
					cartButton = $('.product-detail-container .add-to-bag-sticky-container');
				}

				if ($(window).width() <=767 ) {
		            if(scroll <= position) {
		            	if(stickyButtonTop != '' && $(this).scrollTop()-65 < imageContainerTop){
		            		$(".tatcha-pre-nav, .tatcha-header-nav, .add-to-bag-sticky-container").removeClass('sticky-add-to-bag');
		            	}else {
		            		$(".tatcha-pre-nav, .tatcha-header-nav").addClass('sticky-add-to-bag');
			            	$(".tatcha-pre-nav, .tatcha-header-nav, .add-to-bag-sticky-container").show();
							$(".tatcha-pre-nav").css("top", "0");
		            		$(".tatcha-header-nav").css("top", "0px");
							$(".tatcha-header-nav").css("z-index", "1030");
		            		$(".add-to-bag-sticky-container").css("top", "75px");
		            	}
		            }else if (stickyButtonTop != '' && window.pageYOffset +35 > stickyButtonTop) {
		                //$(".tatcha-pre-nav, .tatcha-header-nav").addClass('sticky-add-to-bag');
		                $(".add-to-bag-sticky-container").addClass('sticky-add-to-bag');
	            		$(".add-to-bag-sticky-container").css("top", "0");
		                $(".tatcha-pre-nav, .tatcha-header-nav").css("top", "-100px");
		            }
		            position = scroll;
				}
			}

        });



$(document).on("click",'button.notify-me',function(event){
	event.preventDefault();
		if($(this).form().valid()){
				$('.loader-preventive').show();
			ajax.post({
	            url: $(this).form().attr("action"),
	            data: $(this).form().serialize(),
	            callback: function (response) {
				$('.loader-preventive').hide();
	            $("#notify-me-modal .success-msg").removeClass("d-none");
				$("#notify-me-modal .modal-body,.modal-footer").addClass("d-none");
	            }
	    	});
		}

})
$('#notify-me-modal').on('hide.bs.modal', function (e) {
  $("#notify-me-modal .success-msg").addClass("d-none");
	$("#notify-me-modal .modal-body,.modal-footer").removeClass("d-none");
	$("#notify-me-modal").find("form")[0].reset();
	$("#notify-me-modal .help-block").hide()
})

// New product page changes end

}

var product = {
    initializeEvents: initializeEvents,
    init: function () {
        initializeDom();
        initializeEvents();
    }
};

module.exports = product;
