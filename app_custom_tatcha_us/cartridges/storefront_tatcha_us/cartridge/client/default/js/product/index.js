'use strict';

var dialog = require('../dialog'),
    tooltip = require('../tooltip'),
    util = require('../util'),
    addToCart = require('./addToCart'),
    availability = require('./availability'),
    image = require('./image'),
    productNav = require('./productNav'),
    productSet = require('./productSet'),
    recommendations = require('./recommendations'),
    colorbox = require('../colorbox'),
    variant = require('./variant'),
    ajax = require('../ajax');

/**
 * @description Initialize product detail page with reviews, recommendation and product navigation.
 */
function initializeDom() {
    productNav();
    recommendations();
    tooltip.init();
}

/**
 * @description Make the dataLayer push to send item data to GA
 * @param product IDs
 * **/
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

/**
 * @description Initialize event handlers on product detail page
 */
function initializeEvents() {

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
    var notifyPrevent = false;

    $('#notify-me-modal').on('show.bs.modal', function (e) {
        $(this).find('.has-error').removeClass('has-error');
        $(this).find('#notify-me-email-error').remove();
        $(this).find('form')[0].reset();

        $("#notify-me-modal .success-msg").addClass("d-none");
        $("#notify-me-modal .modal-body,.modal-footer").removeClass("d-none");
        $("#notify-me-modal .help-block").hide()
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


    /* var position = $(window).scrollTop();
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

    });*/



    $(document).on("click",'button.notify-me',function(event){
        event.preventDefault();
        if($(this).closest('form').valid()){
            $('.loader-preventive').show();
            ajax.post({
                url: $(this).closest('form').attr("action"),
                data: $(this).closest('form').serialize(),
                callback: function (response) {
                    $('.loader-preventive').hide();
                    $("#notify-me-modal .success-msg").removeClass("d-none");
                    $("#notify-me-modal .modal-body,.modal-footer").addClass("d-none");
                }
            });
        }

    })

    //Add all to bag changes
    $(document).on('click','#add-all-to-bag  , #add-all-to-bag-small, #add-all-to-bag-medium',function(e) {
        var productIds;
        if($('input[name="contentBlockV1"]') && $('input[name="contentBlockV1"]').val() == 'true'){
            productIds = getRecommededRitualsIds();
            $('#add-to-bag-affix').hide();
            addAllToBagPDP(productIds);
        }

    })
    //Add price to ATB
    $(document).on('change','input[type=radio][name=hasSmartOrderRefill]',function(e) {
        var price =  $(this).next('p').find('label span').text();
        var buttonText = "Add to Bag - "+price;
        $("#add-to-cart").text(buttonText);
    })
    function getRecommededRitualsIds() {
        var prdIds = [];
        var uniqueIds = [];
        $('.routine-step.product-list-unit').each(function(e){
            var sku = '';
            $('.routine-step.product-list-unit').each(function(e){
                var sku = '';
                if($(this).find('input[name="prodSku"]') && $(this).find('input[name="prodSku"]').val() != ''){
                    sku = $(this).find('input[name="prodSku"]').val();
                    prdIds.push(sku);
                }
            });
        });
        uniqueIds = uniqueList(prdIds);
        uniqueIds = uniqueIds.join(',');
        if(uniqueIds.endsWith(',') == true){
            uniqueIds = uniqueIds.substring(0,uniqueIds.length-1);
        }
        return uniqueIds;
    }
    function addAllToBagPDP(productIds) {
        $('#saveRegimen , #addAllPearlSelect').modal('hide');
        $('.loader-content').show();
        var url = $('#add-all-to-bag').data('url');
        var data = {'productIds': productIds};
        ajax.post({
            url: url,
            data: data,
            callback: function (response) {
                if(response) {
                    response = JSON.parse(response);
                    if(response.status == 'success') {
                        $('#addAllToBagModal #addedproducts-count').html(response.totalProducts);
                        $('.loader-content').hide();

                        //GTM - add to bag global event
                        sendAddToCartGlobalGA(productIds);

                        $( ".mini-cart-total" ).each(function( index ) {
                            $( this ).trigger("click");

                                 document.body.scrollTop = 0;
                                  document.documentElement.scrollTop = 0;

                            return false;
                        });
                    } else {
                        $('.loader-content').hide();
                    }
                }
            }
        });
    }
    function uniqueList(list) {
        var result = [];
        $.each(list, function(i, e) {
          if ($.inArray(e, result) == -1) result.push(e);
        });
        return result;
    }
    //End Add all to bag

// New product page changes end

}

var product = {
    initializeEvents: initializeEvents,
    headerMainNavOffsetTop: 0,
    init: function () {
        this.headerMainNavOffsetTop = $('[data-global-header="navBar"]').offset().top;
        initializeDom();
        initializeEvents();
        this.addToBagSticky();
        this.windowEvents();
        this.stickyHeader();
    },
    windowEvents: function () {
        $(window).on("resize scroll",function(e){
            product.addToBagSticky();
            product.stickyHeader();
        });
    },
    addToBagSticky: function () {
        var $elem = $('[data-pdp="affix"]'),
            $body = $('body'),
            $addToBag = $('[data-pdp="addToBag"]');
        if(window.scrollY >= $elem.offset().top + 49) {
            $body.addClass('sticky-add-to-bag');
            $addToBag.addClass('gtm-addtobag-affix');
        } else {
            $body.removeClass('sticky-add-to-bag');
            $addToBag.removeClass('gtm-addtobag-affix');
        }
    },
    stickyHeader: function () {
        var $body = $('body');
        window.scrollY >= product.headerMainNavOffsetTop ? $body.addClass('sticky-main-nav') : $body.removeClass('sticky-main-nav');
    }
};

module.exports = product;
