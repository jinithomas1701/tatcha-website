'use strict';

var dialog = require('../dialog'),
    minicart = require('../minicart'),
    page = require('../page'),
    util = require('../util'),
    Promise = require('promise'),
    progress = require('../progress')
	//Lodash is removed from codebase. If we need to use this functionality need to implement lodash api with plain JS
    /*_ = require('lodash');*/

/**
 * @description Make the dataLayer push to send item data to GA
 * @param product ID and price
 * **/
var sendAddToCartGAData = function(productId, quantity, price, productname,source) {
	try {
		if(!source){
			source = '';
		}

    	if (!window.dataLayer) {
			window.dataLayer = [];
		}
    	dataLayer.push({
    		"event": "tatcha_add_to_cart",
    		"prodID": productId,
    		"prodName": productname,
    		"sourceButton": source,
    		"prodPrice": price
    	});
	} catch (e) {
		throw e;
	}
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

/**
 * @description Make the AJAX request to add an item to cart
 * @param {Element} form The form element that contains the item quantity and ID data
 * @returns {Promise}
 */
var addItemToCart = function (form) {
    var $form = $(form),
        $qty = $form.find('input[name="Quantity"]');
    if ($qty.length === 0 || isNaN($qty.val()) || parseInt($qty.val(), 10) === 0) {
        $qty.val('1');
    }
    return Promise.resolve($.ajax({
        type: 'POST',
        url: util.ajaxUrl(Urls.addProduct),
        data: $form.serialize()
    })).then(function (response) {
        // handle error in the response
        if (response.error) {
        	if(response.hasCouponApplied){
				var errorMsg = response.message;
				$('.product-auto-delivery-block input[name=hasSmartOrderRefill]').prop('checked', false);
				$('.ad-promocode-error .error-text').append(errorMsg);
				$('.ad-promocode-error').show();
			}
            throw new Error(response.error);
        } else {

            return response;
        }
    });
};

/**
 * @description Handler to handle the add to cart event
 */
var addToCart = function (e) {
    e.preventDefault();
    hideErrorBlocks();
    var $form = $(this).closest('form');
	var productID = $form.find('input[name="pid"]').val(),
		productname =  $form.find('input[name="productname"]').val(),
		quantity =  $form.find('input[name="Quantity"]').val(),
		price = $form.find('input[name="unitPrice"]').val();
	var source = ($(this).data("buttonid"))?$(this).data("buttonid"):'';

	if(source == '') {
		source = ($(this).data("source"))?$(this).data("source"):'';
	}


	// $('#add-to-bag-affix').hide();
	// $(".tatcha-header-nav, .tatcha-pre-nav, .add-to-bag-sticky-container").show();
    $(".tatcha-header-nav, .tatcha-pre-nav").show();

    addItemToCart($form).then(function (response) {
    	var hasError = false;
    	try {
        	var errorObj = JSON.parse(response);
        	if(errorObj.error !=''){
        		hasError = true;
        		$('.add-to-bag-alert').text(errorObj.error);
        		$('.add-to-bag-alert').show();
        	}
    	} catch(err){hasError = false;}

    	if(!hasError){
            var $uuid = $form.find('input[name="uuid"]');
            if ($uuid.length > 0 && $uuid.val().length > 0) {
                page.refresh();
            } else {
                // do not close quickview if adding individual item that is part of product set
                // @TODO should notify the user some other way that the add action has completed successfully
                if (!$(this).hasClass('sub-product-item')) {
                    dialog.close();
                }
                sendAddToCartGAData(productID, quantity, price, productname,source);
                showAddToBagModal(response, productID);
            }
    	}

    }.bind(this));
};

/**
 * @description Handler to handle the add to cart event from pdp
 */
var addToCartMain = function (e) {
    e.preventDefault();
    hideErrorBlocks();
    var $form = $(this).closest('form');
    var productID = $form.find('input[name="pid"]').val(),
    	productname =  $form.find('input[name="productname"]').val(),
		quantity =  $form.find('input[name="Quantity"]').val(),
		price = $form.find('input[name="unitPrice"]').val();
			if(e.target.id ==="add-to-cart-fixed"){
				$form.find('select[name="Quantity"]').val("1");
			}

		// $(".tatcha-header-nav, .tatcha-pre-nav, .add-to-bag-sticky-container").show();
		// $('#add-to-bag-affix').hide();
        $(".tatcha-header-nav, .tatcha-pre-nav").show();

    $('.add-to-bag-main-alert').hide();
	$('.ad-promocode-error .error-text').empty();
	$('.ad-promocode-error').hide();
    // validate if auto delivery is enabled and selcted
    if ($('input.auto-delivery-toggle').prop('checked')) {
	if(window.enableSORV2){
		if($("#SorDeliveryMonthInterval option:selected").val() === '0'){
    		$('.add-to-bag-main-alert').html('Please select the frequency for auto-delivery');
    		$('.product-auto-delivery-block').addClass('has-error');
    		$('.add-to-bag-main-alert').show();
    		return;
    	} else {
    		$("input.auto-delivery-toggle").prop("value", true);
    	}
	}
	/*else{
		if($("#OsfSorDeliveryInterval option:selected").val() === '0'){
    		$('.add-to-bag-main-alert').html('Please select the frequency for auto-delivery');
    		$('.product-auto-delivery-block').addClass('has-error');
    		$('.add-to-bag-main-alert').show();
    		return;
    	} else {
    		$("input.auto-delivery-toggle").prop("value", true);
    	}
	}*/

    }
    var source = ($(this).data("buttonid"))?$(this).data("buttonid"):'';
    addItemToCart($form).then(function (response) {
    	progress.hide();
    	var hasError = false;
    	try {
        	var errorObj = JSON.parse(response);
        	if(errorObj.error !=''){
        		hasError = true;
        		$('.add-to-bag-main-alert').text(errorObj.error);
        		$('.add-to-bag-main-alert').show();
        	}
    	} catch(err){hasError = false;}

    	if(!hasError){
            var $uuid = $form.find('input[name="uuid"]');
            if ($uuid.length > 0 && $uuid.val().length > 0) {
                page.refresh();
            } else {
                // do not close quickview if adding individual item that is part of product set
                // @TODO should notify the user some other way that the add action has completed successfully
                if (!$(this).hasClass('sub-product-item')) {
                    dialog.close();
                }
                if ($('#quickviewModal').hasClass('show') || $('#quickviewModal').hasClass('in')) {
                	$('#quickviewModal').modal('hide');
                }
                sendAddToCartGAData(productID, quantity, price, productname,source);
                showAddToBagModal(response, productID);
            }
    	}

    }.bind(this));
};

var updateMiniCart = function () {

	var headerType = $('.isUpdatedDesign').length > 0 ? $('.isUpdatedDesign').val(): 'false';
	var url = Urls.minicart + '?isUpdatedDesign=' + headerType;

	$.ajax({
        type: 'GET',
        url: util.ajaxUrl(url),
        success:function(response) {
    		minicart.showNoScroll(response);
        }
    });
};

var hideErrorBlocks = function () {
	$('.add-to-bag-main-alert').text('');
	$('.add-to-bag-main-alert').hide();
	$('.add-to-bag-alert').text('');
	$('.add-to-bag-alert').hide();
	$('.product-auto-delivery-block').removeClass('has-error');
}
/**
 * @description Handler to handle the add all items to cart event
 */
var addAllToCart = function (e) {
    e.preventDefault();
    var $productForms = $('#product-set-list').find('form').toArray();
	console.log($productForms.map(function(item,index){
	return addItemToCart(item)
	}));

    Promise.all($productForms.map(function(item,index){
	return addItemToCart(item)
	}) )
        .then(function (responses) {
            dialog.close();
            // show the final response only, which would include all the other items
            minicart.show(responses[responses.length - 1]);
        });
};

var carouselAddToCart = function (e) {
    e.preventDefault();

    var button = $(this);
    var pid = button.attr('data-pid');
    var productname =  button.attr('data-productname');
    var price = button.attr('data-price');

    button.attr("disabled", true);
    $.ajax({
        type: 'POST',
        url: util.ajaxUrl(Urls.addProduct),
        data: {'Quantity':'1',
    		   'uuid':'',
    		   'cartAction':'update',
    		   'pid': pid,
    		   'page':'bag',
    		   'pageInfo': 'addToBag'
        },
        success:function(response) {
    		button.removeAttr("disabled");
    		sendAddToCartGAData(pid, '1', price, productname,'');
    		showAddToBagModal(response, pid);
    		//minicart.show(response);
    		//location.reload();
        }
    });

};

var ritualAddToCart = function (e) {
    e.preventDefault();

    var button = $(this);
    var pid = button.attr('data-pid');
    var productname =  button.attr('data-productname');
    var price = button.attr('data-price');

    button.attr("disabled", true);
    $.ajax({
        type: 'POST',
        url: util.ajaxUrl(Urls.addProduct),
        data: {
			'Quantity':'1',
    		'uuid':'',
			'cartAction':'update',
			'pid': pid,
			'page':'bag',
			'pageInfo': 'addToBag',
			'upsell': false
        },
        success:function(response) {
    		button.removeAttr("disabled");
    		sendAddToCartGAData(pid, '1', price, productname,'');
    		showAddToBagModal(response, pid);
        }
    });
};


var bagAddToCart = function(e) {
e.preventDefault();

    var button = $(this);
    var pid = button.attr('data-pid');
    var productname = button.attr('data-productname');
    var price = button.attr('data-price');

    button.attr("disabled", true);
    $('.loader-preventive').show();
    $.ajax({
        type: 'POST',
        url: util.ajaxUrl(Urls.addProduct),
        data: {'Quantity':'1',
    		   'uuid':'',
    		   'cartAction':'update',
    		   'pid': pid,
    		   'page':'bag'
        },
        success:function(response) {
        	sendAddToCartGAData(pid, '1', price, productname,'');
    		button.removeAttr("disabled");
    		$('.loader-preventive').hide();
    		location.reload();
        }
    });
};

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
	if(container){
		container.addEventListener('keydown', focusElement);
	}


    // Close mini bag
	$('.close-bag').on('keypress',function(e) {
	    if(e.which == 13 || e.which == 32) {
	    	$(this).trigger("click");
	    }
	});
}

var showAddToBagModal = function (bagData, pid) {
	$('.mini-bag-container').empty();
    //appending the response to minicart container div
    $('.mini-bag-container').append(bagData);

    // Call after pay if eligible
    if ( $( "#afterpay-express-button" ).length ) {
    	initAfterpay();
    }
    if($('.mini-bag #minibag-pid').length >0) {
    	$('.mini-bag #minibag-pid').val(pid);
    }

    try{
		window.miniCartButton();
		window.initbraintreeSG();
	}catch(e){}

    /**
	 * To show the minibag drawer
	 * */
//	$('.mini-bag').addClass("show-minibag");
    /*$('.mini-bag').removeClass("hide-minibag");
    $('.minibag-mask').show();*/
    $('body').css("overflow","hidden");

    //pairs with popup open
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

	//pairs with popup open
	minicart.pairsWithOpen($('.pairs-with-btn').last());

 	//document.body.scrollTop = 0;
  	//document.documentElement.scrollTop = 0;
   setTimeout(function() {
	  /* $('.mini-bag').addClass("show-minibag");*/
	   minicart.showMinibag();
	   $('body').tooltip({
   	    selector: '[data-toggle="tooltip"]'
   	});
	$('#minibag-container-wrap .add-to-bag-status').text('Product added to your bag')
   	$("#minibag-container-wrap .close-bag").focus();
	trapMiniBagFocus();
   }, 100);
//    updateMiniCart();
    /*setTimeout(function() {
		$('#addToBagModal').modal('hide');
	}, 6000);*/
   if(pid) {
	   sendAddToCartGlobalGA(pid);
   }
};

var disableAddButtons = function (giftProducts) {
	if (giftProducts && typeof giftProducts != "undefined") {
	    GiftProductsArray = JSON.parse(giftProducts);
	}else{
		var GiftProductsArray = [];
	}
	if(GiftProductsArray.length >= 3){
		$('#selectMinis-content').find('.btn-promo-select:not(.active)').addClass('disabled');
	}else{
		$('#selectMinis-content').find('.btn-promo-select:not(.active)').removeClass('disabled');
	}
};

var addGiftProductsToCart = function (e) {
	e.preventDefault();
    hideErrorBlocks();
    var button = $(this);
    var pid = button.attr('data-pid');
	var giftProducts = $("#selectedProducts").val();
	$.ajax({
        type: 'POST',
        url: util.ajaxUrl(Urls.addGiftBuilderProducts),
        data: {'Quantity':'1',
    		   'uuid':'',
    		   'cartAction':'update',
    		   'pid': pid,
    		   'giftProducts':giftProducts,
    		   'pageInfo': 'addToBag'
        },
        success:function(response) {
        	var GiftProductsArray = [];
        	var maxQtyStatus = $(response).find("input#maxQuantityStatus").val();
        	progress.hide();
    		showAddToBagModal(response, pid);
    		applySelectedAjax(Urls.applyGiftBuilderProducts,JSON.stringify(GiftProductsArray),maxQtyStatus);
    		$(".product-add-to-cart #add-to-cart-gift").attr("disabled","disabled");
        }
    });
};

var showGiftBuilderPopup = function () {
	var url = $(this).attr('data-url');

	var giftProducts = $("#selectedProducts").val();

    $('#selectMinis').find('#selectMinis-content').html('');
    //check if the modal is open. if it's open just reload content not whole modal
    if ($('#selectMinis').hasClass('in')) {
        $('#selectMinis').find('#selectMinis-content')
                .load(url,{selected:giftProducts}, function(responseTxt, statusTxt, xhr){
                	disableAddButtons(giftProducts);
                });
    } else {
        //if modal isn't open; open it and load content
        $('#selectMinis')
                .find('#selectMinis-content')
                .load(url,{selected:giftProducts}, function(responseTxt, statusTxt, xhr){
                	$('#selectMinis').modal('show');
                	disableAddButtons(giftProducts);
                });

    }

    $( ".modal-select-minis").on('shown.bs.modal', function(){
        var total = $('.giftproduct-add-to-cart .product-price').text() ;
        var subtotal = parseFloat(total.substring(1, total.length));
        $('#selectMinis .subtotal').text(subtotal);
    });

};

$(document).on('change', '.btn-promo-select input',function () {
	var GiftProductsArray = [];
	var giftProducts = $('#selectedItems').val();
	if (giftProducts) {
	    GiftProductsArray = giftProducts.split(',');
	}
	var checkbox = $(this);
	if (checkbox.is(':checked'))  {
		if(GiftProductsArray.indexOf(checkbox.val()) == -1 && GiftProductsArray.length <3){
			GiftProductsArray.push(checkbox.val());
			$(this).closest('.btn-promo-select').find('.btn-status').text('Selected');
			$(this).parent().addClass('active');
		}else{
			$(this).prop('checked', false);
			$(this).parent().removeClass('active');
			$(this).parent().removeClass('focus');
			return;
		}
	}
	else {
		var index = GiftProductsArray.indexOf(checkbox.val());
		GiftProductsArray.splice(index, 1);
		$(this).closest('.btn-promo-select').find('.btn-status').text('Add');
	}
	if($(this).parent().hasClass("active-btn")){
		$(this).closest('.btn-promo-select').find('.btn-status').text('Selected');
		$(this).parent().attr('aria-checked', true);
	}
	else {
		$(this).closest('.btn-promo-select').find('.btn-status').text('Add');
		$(this).parent().attr('aria-checked', false);
	}
	$('#selectedItems').val(GiftProductsArray.join(','));
	$('#product-count-value').html(GiftProductsArray.length);
	disableAddButtons(JSON.stringify(GiftProductsArray));

	var selProds = $('.btn-promo-select.active').parent().parent().find(".price-sales");
	var subtotal = 0;
	$.each(selProds, function( index, price ) {
		var p = ($(price).text());
		p = p.trim().substring(1,p.length);
		subtotal+=parseInt(p);
	});
	$('#selectMinis .subtotal').text(subtotal);
});

var applySelectedAjax = function(url,giftProducts,maxQtyStatus){
	progress.show('body');
	$.ajax({
        type: 'POST',
        url: url,
        data: {
        	'selected':giftProducts
        },
        success:function(response) {
    		progress.hide();
    		var total = $(response).find("#totalAmount").val();
    		$('#selectd_products').html(response);
    		$('.product-price-block .product-price').html(total);
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
    		if(maxQtyStatus=="true"){
    			$('.set-selector-btn-block button.giftbuilder-selector').attr("disabled","disabled");
    			$('#qtyError').show();
    			$('#qtyError').html("The maximum quantity for this gift has been reached.");
    		}
        }
    });
};

var applySelectedProducts = function () {
	var selectedItems = $('#selectedItems').val();
	var GiftProductsArray = [];
	if (selectedItems) {
	    GiftProductsArray = selectedItems.split(',');
	}
	var url = $(this).attr('data-url');
	applySelectedAjax(url,JSON.stringify(GiftProductsArray),false);
};

$('#selectMinis').on('hidden.bs.modal', function (e) {
	$('#selectMinis').modal('hide');
});


var giftSet = {
	init: function() {
		$(document).on('click', '.gift-set-checkbox', function(e){
			var maxcount = $('#maxitems').data('value');
			var selectedCount = $('.gift-set-checkbox:checked').length;

			if($(this).is(':checked')) {
				if(selectedCount > maxcount) {
					$(this).prop('checked', false);
				}
				selectedCount = $('.gift-set-checkbox:checked').length;
			}

			giftSet.prepareReview();
		});

		$(document).on('click', '.remove-item', function(e){
			var pid = $(this).data('pid');
			$('#myCheckbox6-'+pid).prop('checked', false);
			giftSet.prepareReview();
		});

		/*$(document).on('click', '#add-giftset-to-cart', function(e){
			var data = {
				mainProductId : $('#mainProductId').val(),
				selectedItems : $('#selectedItems').val()
			}
			giftSet.addGiftSetToCart(data);
		});*/
	},
	prepareReview: function() {
		var maxcount = $('#maxitems').data('value');
		var selectedCount = $('.gift-set-checkbox:checked').length;
		var percentage = (selectedCount / maxcount)*100;
		var total = 0;
		var reviewHtml = '';
		var selectedItems = [];

		$('.gift-set-checkbox:checked').each(function(){
			var pid = $(this).attr('data-pid');
			var name = $(this).attr('data-name');
			var price = $(this).attr('data-price');
			var priceValue = $(this).attr('data-priceValue');
			var imgUrl = $(this).attr('data-imgurl');

			total = parseInt(total) + parseInt(priceValue);
			selectedItems.push(pid);

			reviewHtml += '<div class="product-review mt-2">'
			reviewHtml += '<div class="prodict-image"><img src="'+imgUrl+'"></div>';
			reviewHtml += '<div class="product-name">'+name+'<div class="product-price">'+price + '</div></div>';
			reviewHtml += '<div class="d-inline review-item-close remove-item" data-pid="'+pid+'"><i class="fal fa-times"></i></div></div>';
		});

		for(var i = selectedCount; i < maxcount; i++) {
			reviewHtml += '<div class="product-review deactivate mt-2 row m-0"></div>';
		}

		selectedItems = selectedItems.join(',');
		$('#selectedItems').text(selectedItems);

		if(percentage == 100) {
			$('#add-giftset-to-cart').removeAttr('disabled');
			$('#add-giftset-to-cart').addClass('active');
			$('#add-giftset-to-cart').text('Add to Bag');
			$('.complimentary-item').removeClass('deactivate');
		} else {
			$('#add-giftset-to-cart').attr('disabled', true);
			$('#add-giftset-to-cart').removeClass('active');
			$('#add-giftset-to-cart').text('Add more items');
			$('.complimentary-item').addClass('deactivate');
		}

		$('#review-products').html(reviewHtml);
		$('#selectedcount').html(selectedCount);
		$('#total-price').html('$'+total);
		$('#progressbar').attr('aria-valuenow', percentage);
		$('#progressbar').attr('style', 'width: '+percentage+'px');
	},
	addGiftSetToCart: function(data) {
		var action = $('#gift-set-form').attr('action');
		$.ajax({
			type: 'POST',
			url: util.ajaxUrl(Urls.addGiftSetProducts),
			data: data,
			success:function(response) {
				progress.hide();
    			showAddToBagModal(response);
			}
		});
	}
}


var addToCartUpsell = function (e) {
	e.preventDefault();
	var pid = $(this).attr('data-pid');
	var parentpid = $(this).attr('data-parentpid');
	var selectedProductList = [];
	selectedProductList.push(parentpid);
	selectedProductList.push(pid);
	var upsellProducts = JSON.stringify(selectedProductList);
	$.ajax({
		 type: 'POST',
	        url: util.ajaxUrl(Urls.addUpsellProducts),
	        data: {'Quantity':'1',
	    		   'uuid':'',
	    		   'cartAction':'update',
	    		   'pid': pid,
	    		   'upsellProducts':upsellProducts
	        },
	        success:function(response) {
				progress.hide();
    			showAddToBagModal(response, pid);
			}
	});
}

var mobileAffixAddToCart = function (e) {
    e.preventDefault();

    var button = $(this);
    var pid = button.attr('data-matchbox-addtocart');
    var productname =  button.attr('data-productname');
    var price = button.attr('data-price');
    var hasSmartOrderRefill = $('input[name="hasSmartOrderRefill"]').is(":checked") ? true : false;
    var everyDelivery = '';
	var SorDeliveryMonthInterval = '';
	$('.ad-promocode-error-affix .error-text').empty();
	$('.ad-promocode-error-affix').hide();
    button.attr("disabled", true);
	// validate if auto delivery is enabled and selcted
	if ($('input.auto-delivery-toggle').prop('checked')) {
		everyDelivery = $('input[name="everyDelivery"]').val();
		SorDeliveryMonthInterval = $('#SorDeliveryMonthInterval').val();
		if(window.enableSORV2){
			if($("#SorDeliveryMonthInterval option:selected").val() === '0'){
				$('.add-to-bag-main-alert').html('Please select the frequency for auto-delivery');
				$('.product-auto-delivery-block').addClass('has-error');
				$('.add-to-bag-main-alert').show();
				return;
			} else {
				$("input.auto-delivery-toggle").prop("value", true);
			}
		}
	}
    $.ajax({
        type: 'POST',
        url: util.ajaxUrl(Urls.addProduct),
        data: {'Quantity':$('.add-to-bag-sticky-container select[name="product-quantity"]').val(),
    		   'uuid':'',
    		   'cartAction':'update',
    		   'pid': pid,
    		   'page':'bag',
    		   'pageInfo': 'addToBag',
			   'hasSmartOrderRefill': hasSmartOrderRefill,
			   'everyDelivery': everyDelivery,
			   'SorDeliveryMonthInterval': SorDeliveryMonthInterval
        },
        success:function(response) {
			if (response.error) {
				if(response.hasCouponApplied){
					var errorMsg = response.message;
					$('.ad-promocode-error-affix .error-text').append(errorMsg);
					$('.ad-promocode-error-affix').show();
					button.removeAttr("disabled");
				}
			}else {
				button.removeAttr("disabled");
				sendAddToCartGAData(pid, $('.add-to-bag-sticky-container select[name="product-quantity"]').val(), price, productname,'');
				showAddToBagModal(response, pid);
			}
        }
    });

};

/**
 * @function
 * @description Binds the click event to a given target for the add-to-cart handling
 */
module.exports = function () {

	/*$( document ).ready(function() {
		if($('.product-detail #add-to-cart').length) {
			$(window).scroll(function () {
		    	var cartButton = $('.product-detail #add-to-cart').offset().top;
	      		if ($(window).width() <=767 ) {
		            if ($(this).scrollTop() > cartButton) {
		                $('#add-to-bag-affix').fadeIn();
		            }
		            if ($(this).scrollTop() < cartButton) {
		                $('#add-to-bag-affix').fadeOut();
		            }
		        }
	        });
		}
    });*/

	window.addProductWithId =  function (dataObj) {
		var pidList = '';
		var pidArray = [];
		try {
			if(dataObj && dataObj.data) {
				for(var key in dataObj.data) {

					if(pidList.length > 0) {
						pidList += ',';
					}
					pidArray.push(dataObj.data[key]);
					pidList += dataObj.data[key];
				}
			}
			var url = Urls.addExtendedCartProduct + '?pids=' + pidList;
			if(pidList.length > 0) {
				$.ajax({
					type: 'GET',
					url: util.ajaxUrl(url),
					success:function(response) {
						if(response) {
							showAddToBagModal(response, pidArray[0]);
						}
					}
				});
			}
		}catch(e){}
	}


    $('.add-to-cart[disabled]').attr('title', $('.availability-msg').text());

    $('.product-detail').off('click', '.add-to-cart', addToCartMain);
    $('.product-detail').on('click', '.add-to-cart', addToCartMain);
    $('.product-detail').on('click', '#add-to-cart-fixed', addToCartMain);


    $(document).on('click', '#quickviewModal .add-to-cart', addToCartMain);
    $('#add-all-to-cart').on('click', addAllToCart);
    $('.useitwith').on('click', addToCart);
	$(document).on('click', '.carousel-add-to-cart', carouselAddToCart);
	$('.ritual-add-to-cart').on('click', ritualAddToCart);
    $('.featured-add-to-cart').on('click', carouselAddToCart);
    $('.reorder-prd-add').on('click', carouselAddToCart);
    $('.bag-add-to-cart').on('click', bagAddToCart);

    $('.srAddToBag').on('click',addToCart);
    $('.ymliAddToBag').on('click',addToCart);
    $('.buy-again').on('click',addToCart);

    $('.plp-list-add-to-cart').off('click',addToCartMain);
    $('.plp-list-add-to-cart').on('click',addToCartMain);

    $(document).on('click', '.giftbuilder-selector',showGiftBuilderPopup);
    $(document).on('click', '#apply-selected-gift',applySelectedProducts);
    $(document).on('click', '#add-to-cart-gift',addGiftProductsToCart);
    $(document).on('click', '.enAddToBag',addToCart);
	$(document).on('click', '.wishlist-add-to-cart', addToCart);
	$(document).on('click', '#upsell-add-to-cart', addToCartUpsell);

	$(document).on('click', '#product-panel-add-to-bag', carouselAddToCart);

	$(document).on('click', '.product-tile .product-cta-block .add-to-cart', addToCartMain);

	giftSet.init();

	//add to bag fixed CTA click
	$('.product-detail-container').on('click', '.add-to-bag-sticky', mobileAffixAddToCart);

	//category page promo pairs with
	$(document).on('click', '.cat-pairswith-promo-btn', addToCartUpsell);
};
