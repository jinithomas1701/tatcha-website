'use strict';

var util = require('./util'),
    bonusProductsView = require('./bonus-products-view');

var timer = {
    id: null,
    clear: function () {
        if (this.id) {
            window.clearTimeout(this.id);
            delete this.id;
        }
    },
    start: function (duration, callback) {
        this.id = setTimeout(callback, duration);
    }
};

$(document).ready(function() {
	$(document).on("keyup",".minicart-promo-code",function(event){
		$(".minicart-promo-code").val(event.target.value);
	})

	$(document).on("click",".minibag-sitegen .add-coupon",function(){
			$(".promocode-container").addClass("d-flex");
			$(".mini-bag .add-promo-text").hide();
			$(".minibag-scroll")[0].scrollTop = $(".minibag-scroll")[0].scrollHeight; ;
	})

	$('body').on('shown.bs.modal', '.modal, .modal.modal-afterpay', function(){
		$('#gladlyChat_container').attr('style','z-index:1040 !important');
	})

	//override enter key for coupon code entry
	$(document).on("keydown",".minicart-promo-code",function(e){
		if (e.which === 13 && $(this).val().length === 0)
        {
        	return false;
        } else if(e.which === 13 && $(this).val().length > 0) {
        	$('.minicart-promo-button').trigger('click');
        }
	})

	//hiding search suggestion when focus goes to minibag
	$('.minicart').focusin(function(e) {
		$('.dropdown-search-desktop').css('display', 'none');
	})	//Promocode apply button status change

	$(document).on('keyup','.promocode-container input',function(){
		if($(this).val() && $(this).val().trim().length>0){
	$('.promocode-container button').removeAttr("disabled")
		}else{
	$('.promocode-container button').attr("disabled","disabled")

		}
	})
	$(document).on('paste onpaste','.promocode-container input',function(){
	$('.promocode-container button').removeAttr("disabled")
	})

});

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
	$('.minibag-sitegen .close-bag').on('keypress',function(e) {
	    if(e.which == 13 || e.which == 32) {
	    	$(this).trigger("click");
	    }
	});
}

var minicart = {

  //open pairs with in minicart
  pairsWithOpen :function(pairProduct){
  		var $cartItem = pairProduct.parents('.bag-product-item');
        pairProduct.toggleClass('pairs-bestwith-btn-open')
	    $cartItem.find('.pairs-with-box').toggleClass('pairs-with-btn-open');
	    $cartItem.find('.pairs-block').toggleClass('open');
	    if ($cartItem.find('.fa-plus:visible').length > 0) {
	        $cartItem.find('.fa-plus').hide();
	        $cartItem.find('.fa-minus').show();
	    } else {
	        $cartItem.find('.fa-plus').show();
	        $cartItem.find('.fa-minus').hide();
	    }
        if($cartItem.find('.pairs-with-box').hasClass('pairs-with-btn-open')){
            $cartItem.find('.pairs-with-box').attr("aria-expanded","true").attr("aria-label","expanded");
            $cartItem.find('.pairs-block').find('.pairs-with-name').attr("tabindex","0")
            $cartItem.find('.pairs-block').find('.product-suggestion-close').attr("tabindex","0")
            $cartItem.find('.pairs-with-travel, .pairs-with-main').attr("tabindex","0")
        } else{
            $cartItem.find('.pairs-with-box').attr("aria-expanded","flase").attr("aria-label","collapsed");
            $cartItem.find('.pairs-block').find('.pairs-with-name').attr("tabindex","-1")
            $cartItem.find('.pairs-block').find('.pairs-body .product-suggestion-close').attr("tabindex","-1")
            $cartItem.find('.pairs-with-travel, .pairs-with-main').attr("tabindex","-1")
        }
    },

	showMinibag:function(){
		//RDMP-3633-hiding linc webchat
		$('#linc-web-chat-iframe').css('display', 'none');
		$('#gladlyChat_container').attr('style','z-index:1000 !important');
		if(window.requestAnimationFrame){
			requestAnimationFrame(function(){
			  $('.mini-bag').addClass("show-minibag");
              $('.mini-bag').removeClass("hide-minibag");
              $('.sticky-add-to-bag').css("z-index","1010");
              $('.add-to-bag-sticky-container').removeClass('sticky-add-to-bag');
              $('.minibag-mask').show();
              $('.loader-preventive').hide();
              // $(".title-container h2").focus();
             // Send event to GTM
              if(window.dataLayer){
                  try {
                  	 dataLayer.push({'event': 'optimize.minibagactivated'});
                  } catch(err) {}
              }
			})
		}else{
			 $('.mini-bag').addClass("show-minibag");
              $('.mini-bag').removeClass("hide-minibag");
			$('.sticky-add-to-bag').css("z-index","1010");
			$('.add-to-bag-sticky-container').removeClass('sticky-add-to-bag');
              $('.minibag-mask').show();
              $('.loader-preventive').hide();
             // Send event to GTM
              if(window.dataLayer){
                  try {
                  	 dataLayer.push({'event': 'optimize.minibagactivated'});
                  } catch(err) {}
              }
		}
	},
    init: function () {
		var _this = this;
        this.$el = $('.minicart');
        this.$content = this.$el.find('.mini-cart-content');
		$('#gladlyChat_container').attr('style','z-index:1000 !important');
        $('.mini-cart-product').eq(0).find('.mini-cart-toggle').addClass('fa-caret-down');
        $('.mini-cart-product').not(':first').addClass('collapsed')
            .find('.mini-cart-toggle').addClass('fa-caret-right');

        $('.mini-cart-toggle').on('click', function () {
            $(this).toggleClass('fa-caret-down fa-caret-right');
            $(this).closest('.mini-cart-product').toggleClass('collapsed');
        });

        // events
        this.$el.find('.mini-cart-total').on('mouseenter', function () {
            if (this.$content.not(':visible')) {
                this.$content.slideDown('slow');
            }
        }.bind(this));

        this.$el.find('.mini-cart-total').on('mouseleave', function () {
        	 timer.clear();
             timer.start(500, this.close.bind(this));
        }.bind(this));

        this.$content.on('mouseenter', function () {
            timer.clear();
        }).on('mouseleave', function () {
            timer.clear();
            timer.start(500, this.close.bind(this));
        }.bind(this));


        //Click handler for the Bag icon in header
        $(document).on('click', '.minicart-sitegen .mini-cart-total',function() {
        	if(window.location.href.indexOf("/bag") > -1 ){
        		return false;
        	}


            //Fetch the data from service minicartShow(MiniCart-Show)
            $.ajax({
                type: 'GET',
                url: util.ajaxUrl(Urls.minicartShow),
                success:function(response) {
                	if(response) {

                		$('.mini-bag-container').empty();
                        //appending the response to minicart container div
                        $('.mini-bag-container').append(response);

                        // Call after pay if eligible
                        if ( $( "#afterpay-express-button" ).length ) {
                        	initAfterpay();
                        }

                        //initialize braintree for paypal and applepay
						try{
							window.initbraintreeSG();
							window.initApplepayButton();
						}catch(e){}

						/**
                    	 * To show the minibag drawer
                    	 * */
                       /* $('.mini-bag').removeClass("hide-minibag");
                    	$('.minibag-mask').show();*/
                    	$('body').css("overflow","hidden");
                        setTimeout(function(){
                        	/*$('.mini-bag').addClass("show-minibag");*/
                        	_this.showMinibag();
                        	//pairs with open
                        	pairsWithOpen();

                        	$('body').tooltip({
                        	    selector: '[data-toggle="tooltip"]'
                        	});
							// $(".title-container h2").focus();
							trapMiniBagFocus();
                        },100)


                  }

                }
            });

        })

        //Click handler for the remove icon of product line items
        $(document).on('click', '.minibag-sitegen .minicart-remove-product', function(){
		var productId = $(this).attr('data-pid');
		$('.loader-preventive').show();
        $.ajax({
            type: 'POST',
            url: util.ajaxUrl(Urls.minicartDeleteProduct),
            data:{
         	   productId:productId
            },
            success:function(response) {
            	if(response) {
	            $('.mini-bag-container').empty();
	            $('.mini-bag-container').append(response);

                // Call after pay if eligible
                if ( $( "#afterpay-express-button" ).length ) {
                	initAfterpay();
                }

				//initialize braintree for paypal and applepay
				try{
					window.initbraintreeSG();
				}catch(e){}

              /**
          	 * To show the minibag drawer
          	 * */
          	/*$('.mini-bag').addClass("show-minibag");*/
              /*$('.mini-bag').removeClass("hide-minibag");*/
              /*$('.minibag-mask').show();*/
			  _this.showMinibag();
              pairsWithOpen();
              /*$('.loader-preventive').hide();*/
              trapMiniBagFocus();
              }

            }
        });
	})

	//On Change handler for the quantity update of the product line items
	 $(document).on('change', '.minibag-sitegen .qty-field', function(){
		var productId = $(this).attr('data-pid');
		var quantity = $(this).val();
		$('.loader-preventive').show();
        $.ajax({
            type: 'POST',
            url: util.ajaxUrl(Urls.minicartProductQtyUpdate),
            data:{
         	   productId:productId,
         	   quantity:quantity
            },
            success:function(response) {
            	if(response) {
	            $('.mini-bag-container').empty();
	            $('.mini-bag-container').append(response);

                // Call after pay if eligible
                if ( $( "#afterpay-express-button" ).length ) {
                	initAfterpay();
                }

				//initialize braintree for paypal and applepay
				try{
					window.initbraintreeSG();
				}catch(e){}

              /**
          	 * To show the minibag drawer
          	 * */
				_this.showMinibag();
				pairsWithOpen();
          	  trapMiniBagFocus();
              }

            }
        });
	})

	//Click handler for the pairs with button of product line items
	$(document).on('click', '.pairs-with-btn', function(){
		var id = $(this).data('pairswith');
		if(id) {
			// $('.pairs-with-image,.pairs-with-name,.pairs-with-variant,.pairs-with-addtobagone,.pairs-with-travelsizeone,.pairs-with-addtobagtwo,.pairs-with-travelsizetwo').removeAttr('tabindex');
			var pairsWithDiv = $('div[data-cartproductid="'+id+'"]');
			$('div[data-closesuggestion="'+id+'"]').attr('tabindex', '0');
			$('div[data-closesuggestion="'+id+'"]').attr('aria-label', 'Close pairs best with');
			if(pairsWithDiv && !pairsWithDiv.hasClass('open')) {
				pairsWithDiv.addClass('open');
				$('div[data-treasurelink="'+id+'"]').show();
			}
		}
	});


    //Click handler for promotion
    $(document).on('click', '.minicart-promo-button', function(){
		var couponCode = $('#minicart-promo-code').val();
		$('.loader-preventive').show();
        $.ajax({
            type: 'POST',
            url: util.ajaxUrl(Urls.minicartAddCoupon),
            data:{
            	couponCode:couponCode
            },
            success:function(response) {
            	if(response) {
	            $('.mini-bag-container').empty();
	            $('.mini-bag-container').append(response);

                // Call after pay if eligible
                if ( $( "#afterpay-express-button" ).length ) {
                	initAfterpay();
                }

				//initialize braintree for paypal and applepay
				try{
					window.initbraintreeSG();
				}catch(e){}

              /**
          	 * To show the minibag drawer
          	 * */
          	/*$('.mini-bag').addClass("show-minibag");
              $('.mini-bag').removeClass("hide-minibag");
              $('.minibag-mask').show();*/
			  _this.showMinibag();
              pairsWithOpen(); //open pairswith
              /*$('.loader-preventive').hide();*/
              trapMiniBagFocus();
              }

            	//GWP in minicart
            	if($( '.gwpMiniCartModalLink' ).hasClass('addMiniCartBonusModalLink')){
                	$('.gwpMiniCartModalLink').trigger('click');
                }
            }
        });
	})

    $(document).on('focus', '.mini-bag .promocode-label', function(){
    	$(this).find('.promo-tooltip').attr('aria-hidden', false);
    	$(this).find('.promo-tooltip').text('Only one code per order. Some products may be excluded. Tooltip');
    });

    $(document).on('focus', '.minicart-promo-code', function(){
    	$('.promo-tooltip').attr('aria-hidden', true);
    });

	//Click to handle coupon removal
    $(document).on('click', '.minicart-promo-remove', function(){
		var couponCode = $(this).attr('data-pid');
		$('.loader-preventive').show();
        $.ajax({
            type: 'POST',
            url: util.ajaxUrl(Urls.minicartRemoveCoupon),
            data:{
            	couponCode:couponCode
            },
            success:function(response) {
            	if(response) {
	            $('.mini-bag-container').empty();
	            $('.mini-bag-container').append(response);

                // Call after pay if eligible
                if ( $( "#afterpay-express-button" ).length ) {
                	initAfterpay();
                }

				//initialize braintree for paypal and applepay
				try{
					window.initbraintreeSG();
				}catch(e){}

              /**
          	 * To show the minibag drawer
          	 * */
          	/*$('.mini-bag').addClass("show-minibag");
              $('.mini-bag').removeClass("hide-minibag");
              $('.minibag-mask').show();*/
              pairsWithOpen(); //open pairswith
             /* $('.loader-preventive').hide();*/
			 _this.showMinibag();
              trapMiniBagFocus();
              }

            }
        });
	})

	//GWP in minicart
	/*if($( ".gwpMiniCartModalLink" ).hasClass( "addMiniCartBonusModalLink" )){
    	$('.gwpMiniCartModalLink').trigger('click');
    }*/

  //Click to show GWP products
    $(document).on('click', '.gwpMiniCartModalLink', function(){
		var bonusDiscountLineItemUUID = $(this).attr('data-bonusuuid');
		var pageSize = $(this).attr('data-pagesize');
		var pageStart = $(this).attr('data-pagestart');
		var bpTotal = $(this).attr('data-bptotal');
        $.ajax({
            type: 'POST',
            url: util.ajaxUrl(Urls.getBonusProductsMiniCart),
            data:{
            	bonusDiscountLineItemUUID : bonusDiscountLineItemUUID,
            	pageSize : pageSize,
            	pageStart : pageStart,
            	bpTotal : bpTotal
            },
            success:function(response) {
            	if(response) {
            		 $(".sample-product-container").empty();
			            $(".sample-product-container").append(response);
			            $(".sample-product-container").show();
			            $(".sample-product-container .samples-content").show();
			            Samples.init();
              }

            }
        });
	})

	//close sample modal
	$(document).on("click",".samples-title .fa-angle-double-left",function(){
		$(".ajax-loader").show();
		Samples.submitForm();
	})

	 //Show samples in mini bag
		  $(document).on("click",".mini-bag .samples-banner",function(){
			  console.log("Samples Request");
		    $(".ajax-loader").show();
		    $(".sample-product-container").show();
//		    setTimeout(function(){
//		      $(".sample-product-container .samples-content").show();
//		      $(".ajax-loader").hide();
//		    },1000)
				var bonusDiscountLineItemUUID = $(this).attr('data-bonusuuid');
				var pageSize = $(this).attr('data-pagesize');
				var pageStart = $(this).attr('data-pagestart');
				var bpTotal = $(this).attr('data-bptotal');
		        $.ajax({
		            type: 'POST',
		            url: util.ajaxUrl(Urls.getBonusProductsMiniCart),
		            data:{
		            	bonusDiscountLineItemUUID : bonusDiscountLineItemUUID,
		            	pageSize : pageSize,
		            	pageStart : pageStart,
		            	bpTotal : bpTotal
		            },
		            success:function(response) {
		            	if(response) {
//			            $('.mini-bag-container').empty();
//			            $('.mini-bag-container').append(response);
			            $(".sample-product-container").empty();
			            $(".sample-product-container").append(response);

//			            $(".sample-product-container").show();
			            $(".sample-product-container .samples-content").show();
			            Samples.init();
			            $(".ajax-loader").hide();
//			            setTimeout(function(){
//
//			              },1000)
		              /**
		          	 * To show the minibag drawer
		          	 * */
		          	/*$('.mini-bag').addClass("show-minibag");
		              $('.mini-bag').removeClass("hide-minibag");
		              $('.minibag-mask').show();*/
					 _this.showMinibag();
		              //trapMiniBagFocus();
		  		    $(".sample-product-container .samples-title h2").focus();

		              }

		            }
		        });

		  })

    var sendMiniCartGlobalGA = function(pid, quantity, price, productname,source) {
    	try {

    		var prodId = pid || '';
    		var source = source || '';
    		var productname = productname || '';
    		var price = price || '';
    		if (!window.dataLayer) {
    			window.dataLayer = [];
    		}

    		dataLayer.push({
    			'event': 'add_to_cart_global',
    			'prodID': prodId,
        		"prodName": productname,
        		"sourceButton": source,
        		"prodPrice": price
        	});

    	} catch(e) {

    	}
    }
        //Click handler for the add to cart from pairs with , add travel size , add product from empty cart
    	$(document).on('click', '.mini-bag .add-to-cart,.mini-bag .add-travel-link, .minibag-sitegen .add-minicart-empty-item', function(){
    		var productId = $(this).attr('data-addtocart');
    		var source = $(this).attr('data-source');
    		var productname = $(this).attr('data-productname');
    		$('.loader-preventive').show();
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
    	            console.log('dsds');
                    // Call after pay if eligible
                    if ( $( "#afterpay-express-button" ).length ) {
                    	initAfterpay();
                    }

					//initialize braintree for paypal and applepay
					try{
						window.initbraintreeSG();
					}catch(e){}
                  /**
              	 * To show the minibag drawer
              	 * */
              	/*$('.mini-bag').addClass("show-minibag");*/
              	  //pairs with open
            	  pairsWithOpen();
				  _this.showMinibag();
                  /*$('.mini-bag').removeClass("hide-minibag");
                  $('.minibag-mask').show();
                  $('.loader-preventive').hide();*/
                  trapMiniBagFocus();
                  }
                	sendMiniCartGlobalGA(productId,1,'',productname,source);
                }
            });
    	})
    	;
    	//pairs with suggestion close
    	// $(document).on('click', '.product-suggestion-close', function(){
    	// 	var id = $(this).data('closesuggestion');
    	// 	$(this).removeAttr('aria-label');
    	// 	$(this).removeAttr('tabindex');
    	// 	if(id) {
		// 		$('.pairs-with-image,.pairs-with-name,.pairs-with-variant,.pairs-with-addtobagone,.pairs-with-travelsizeone,.pairs-with-addtobagtwo,.pairs-with-travelsizetwo').attr('tabindex','-1');
    	// 		var pairsWithDiv = $('div[data-cartproductid="'+id+'"]');
    	// 		if(pairsWithDiv && pairsWithDiv.hasClass('open')) {
    	// 			pairsWithDiv.removeClass('open');
    	// 			$('div[data-treasurelink="'+id+'"]').hide();
    	// 			$('button[data-pairswith="'+id+'"]').show();
    	// 		}
    	// 	}
    	// });

    	// //ADA
    	// $(document).on('keydown', '.product-suggestion-close', function(e){
    	// 	if(e.keyCode === 13){
    	// 		e.preventDefault();
    	// 		$(this).trigger("click");
    	// 	}
    	// });

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
    	 * To hide the minibag drawer
    	 * */
        $(document).on('click', '.mini-bag-container .minibag-sitegen .close-bag,.minibag-mask', function() {
			if($('.mini-bag-container .samples-content').length>0 && $('.samples-content').css("display")!=="none"){
        		return false;
        	}

        	if($(this).attr("data-link")){
        		if(window.location.href.indexOf("/bag") > -1 || window.location.href.indexOf("/giftcertpurchase?step=3") > -1){
            		window.location = $(this).attr("data-link");
            	}else{
            		//Update cart count
                    var headerType = $('.isUpdatedDesign').length > 0 ? $('.isUpdatedDesign').val(): 'false';
                	var url = Urls.minicart + '?isUpdatedDesign=' + headerType;
                    $.ajax({
                        type: 'GET',
                        url: util.ajaxUrl(url),
                        success:function(response) {
                        	if(response) {
								if(window.location.href.indexOf("giftfinder/results") < 0 ){
        	                        $('body').css("overflow","");
        						}else{
	    	                        $('body').css("overflow","hidden");
								}
                        		$('.minibag-mask').hide();
								$('.add-to-bag-status').text('');
                        		$('.mini-bag').addClass("hide-minibag");
                                $('.mini-bag').removeClass("show-minibag");
								$('.sticky-add-to-bag').css("z-index","1025");
								$('#linc-web-chat-iframe').css('display', 'block');
							   setTimeout(function(){
                            	   $('.minicart').empty();
                                   $('.minicart').append(response);
								   $('.add-to-bag-sticky-container').addClass('sticky-add-to-bag');
								   $('#gladlyChat_container').attr('style','z-index:1040 !important');
						       },500)
                          }

                        }
                    });
            	}
        	}

        });

         $(document).on('click', '.mini-bag-container .minicart-remove-giftcert', function() {

        	 var giftCertId = $(this).attr('data-gid');
     		$('.loader-preventive').show();
             $.ajax({
                 type: 'POST',
                 url: util.ajaxUrl(Urls.minicartDeleteGiftCert),
                 data:{
              	   giftCertId:giftCertId
                 },
                 success:function(response) {
                 	if(response) {
     	            $('.mini-bag-container').empty();
     	            $('.mini-bag-container').append(response);
                    // Call after pay if eligible
                    if ( $( "#afterpay-express-button" ).length ) {
                    	initAfterpay();
                    }
					//initialize braintree for paypal and applepay
					try{
						window.initbraintreeSG();
					}catch(e){}
                   /**
               	 * To show the minibag drawer
               	 * */
               	/*$('.mini-bag').addClass("show-minibag");
               	   $('.mini-bag').removeClass("hide-minibag");
                   $('.minibag-mask').show();
                   $('.loader-preventive').hide();*/
				   _this.showMinibag();
				   pairsWithOpen();
                   trapMiniBagFocus();
                   }

                 }
             });
        });
    },

    /**
     * @function
     * @description Shows the given content in the mini cart
     * @param {String} A HTML string with the content which will be shown
     */
    show: function (html) {
        this.$el.html(html);
        util.scrollBrowser(0);
        this.init();
        this.slide();
        bonusProductsView.loadBonusOption();
    },
    /**
     * @function
     * @description Shows the given content in the mini cart
     * @param {String} A HTML string with the content which will be shown
     */
    showNoScroll: function (html) {
        this.$el.html(html);
        this.init();
        this.slide();
        bonusProductsView.loadBonusOption();
    },
    /**
     * @function
     * @description Slides down and show the contents of the mini cart
     */
    slide: function () {
        timer.clear();
        // show the item
        this.$content.slideDown('slow');
        // after a time out automatically close it
        timer.start(6000, this.close.bind(this));

    },
    /**
     * @function
     * @description Closes the mini cart with given delay
     * @param {Number} delay The delay in milliseconds
     */
    close: function (delay) {
        timer.clear();
        this.$content.slideUp(delay);
    }
};

var Samples = {

   		init: function() {
   			var options = JSON.parse($('#bonus-product-list-options').attr('data-options'))
   			var totalSelected = null;
   			if($('.product-slot.mobile').css("display")!=="none"){
   				totalSelected =   $('.product-slot.mobile .select-minicart-bonus-item.active').length
   			}else{
   				totalSelected =   $('.product-slot.desktop .select-minicart-bonus-item.active').length
   			}
   			$('.select-minicart-bonus-item').on('click', function() {
   				if($(this).hasClass('active-btn')) {
   					$(this).removeClass('active-btn');
   	   				$(this).find('span').html('Add');
   					totalSelected--;
   					$('.select-minicart-bonus-item').removeClass('disabled');
   				} else {
   					if(totalSelected < options.maxItems) {
   	   					$(this).addClass('active-btn');
   	   	   				$(this).find('span').html('Selected');
   	   	   				totalSelected++;
   	   	   			}
   					if(totalSelected >= options.maxItems) {
   	   					$('.select-minicart-bonus-item:not(.active-btn)').addClass('disabled');
   	   				}
   				}
   				$('#bonusModal .product-count').html(totalSelected + '/' + options.maxItems + ' selected');
   				$('#gwpbonusModalMinicart .product-count').html(totalSelected + '/' + options.maxItems + ' selected');
   			});
   			$('.samples-action button').on('click', function() {
   				$(".ajax-loader").show();
//   			  $(".sample-product-container .samples-content").hide();
   				Samples.submitForm();
   		    });
   			if(totalSelected >= options.maxItems) {
				$('.select-minicart-bonus-item:not(.active-btn)').addClass('disabled');
			}
   			$('[data-toggle="tooltip"]').tooltip();
   		},
   		submitForm: function() {
   		 $(".ajax-loader").show();
		 $(".sample-product-container").show();
		 	var selectedItems = [];
			if($('.product-slot.mobile').css("display")!=="none"){
				$('.product-slot.mobile .select-minicart-bonus-item.active-btn').each(function() {
	   				var options = JSON.parse($(this).attr('data-options'));
	   				selectedItems.push(options);
	   			});
			}else{
				$('.product-slot.desktop .select-minicart-bonus-item.active-btn').each(function() {
	   				var options = JSON.parse($(this).attr('data-options'));
	   				selectedItems.push(options);
	   			});
			}
			selectedItems = JSON.stringify({
				'bonusproducts': selectedItems
			});

   			$.ajax({
   				url: $('.samples-action').attr('data-url'),
   				type: 'POST',
   				contentType: "application/json",
   			    dataType: 'json',
   				data: selectedItems,
   				success: function(res) {
   					if(res.success == true) {
   					 $.ajax({
			                type: 'GET',
			                url: util.ajaxUrl(Urls.minicartShow),
			                success:function(response) {
			                	if(response) {
			                		$('.mini-bag-container').empty();
			                        //appending the response to minicart container div
			                        $('.mini-bag-container').append(response);
			                        // Call after pay if eligible
			                        if ( $( "#afterpay-express-button" ).length ) {
			                        	initAfterpay();
			                        }


									//initialize braintree for paypal and applepay
									try{
										window.initbraintreeSG();
									}catch(e){}
			                        /**
			                    	 * To show the minibag drawer
			                    	 * */
			                        /*$('.mini-bag').removeClass("hide-minibag");
			                    	$('.minibag-mask').show();*/
			                    	pairsWithOpen(); //open pairswith
			                    	$('body').css("overflow","hidden");
			                        setTimeout(function(){
			                        	/*$('.mini-bag').addClass("show-minibag");*/
										minicart.showMinibag();
			                        	$('body').tooltip({
			                        	    selector: '[data-toggle="tooltip"]'
			                        	});
										$('#minibag-container-wrap .add-to-bag-status').text('Product added to your bag')
			                        	$("#minibag-container-wrap .close-bag").focus();
			                        	$(".ajax-loader").hide();
			                        	trapMiniBagFocus();
			                        },100)


			                  }

			                }
			            });
   					}
   				}
   			});
   		}
    };

module.exports = minicart;
