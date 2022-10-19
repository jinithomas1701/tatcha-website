'use strict';

/**
 * Need to move to custom base cartridge
 */
var base = require('./product/base');


const util = require("./util");
const bonusProductsView = require("./bonus-products-view");

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

var minicart = {
    /**
     * @function
     * @description Initializing minicart operations
     */
    init: function (){


	if(window.location.href.indexOf("/bag")<0){
    	base.selectBonusProduct();
    	base.addBonusProductsToCart();
	}

    $('body').tooltip({
           selector: '[data-toggle="tooltip"]'
     });
        $('#gladlyChat_container').attr('style','z-index:1000 !important');
	//Samples Modal

        $(document).on('click', '.mini-bag #bonusModalLink', function (e) {
            e.preventDefault();
            var target = $(this).data('href');

            $(".ajax-loader").show();
            $(".sample-product-container").show();
            $.ajax({
                type: 'GET',
                url: target,
                success:function(response) {
                    if(response) {
                        $(".sample-product-container").empty();
                        $(".sample-product-container").append(response);
                        $(".sample-product-container .samples-content").show();
                        //Samples.init();
                        $(".ajax-loader").hide();
                        //_this.showMinibag();
                        //trapMiniBagFocus();
                        $(".sample-product-container .samples-title .samples-text").focus();

                    }

                }
            });
        });

	//Add Promo-code
 $('body').on('submit', '.mini-bag .promo-code-form', function(e){
	    e.preventDefault();
	    $('.loader-preventive').show();
	    $('.coupon-missing-error').hide();
	    $('.coupon-error-message').empty();
	    if (!$('.coupon-code-field').val()) {
	        $('.promo-code-form .form-control').addClass('is-invalid');
	        $('.promo-code-form .form-control').attr('aria-describedby', 'missingCouponCode');
	        $('.coupon-missing-error').show();
	        $('.loader-preventive').hide();
	        return false;
	    }
	    var $form = $('.promo-code-form');
	    $('.promo-code-form .form-control').removeClass('is-invalid');
	    $('.coupon-error-message').empty();
	    $('body').trigger('promotion:beforeUpdate');

	    $.ajax({
		        url: $form.attr('action'),
		        type: 'GET',
		        data: $form.serialize(),
		        success: function (data) {
                    $('.loader-preventive').hide();
		            if (data.error) {
		                //$('.promo-code-form .form-control').addClass('is-invalid');
		                $('.promo-code-form .form-control').attr('aria-describedby', 'invalidCouponCode');
		                $('.coupon-error-message').empty().append(data.errorMessage);
                        $("#minibag-container-wrap .coupon-code-field").focus();

		                $('body').trigger('promotion:error', data);

						$('.coupon-code-field').val('');

						// GTM change
                        try {
                            if (!window.dataLayer) {
                                window.dataLayer = [];
                            }
                            dataLayer.push({
                                'event': 'minibag_error_impression'
                            });
                        } catch (e) {

                        }

		            }else if (data.gwpPromotion) {

		                var lidata = {
		                    uuid: data.promotionUUID,
		                    maxItems: data.maxGwpBonusItem
		                };
		                $('#gwpbonusModal').removeClass('d-none');
		                $('#gwpbonusModal #bonus-product-list-options').attr('data-options', JSON.stringify(lidata));
		                $('#gwpbonusModal .modal-title').append(data.promotionName);
		                $('#gwpbonusModal .samples-modal').attr('data-uuid', data.bonusUUID);

		                for (var i = 0; i < data.gwpPromotionHtml.length; i++) {
		                    $('#gwpbonusModal .modal-body-content').append(data.gwpPromotionHtml[i]);
		                }
		                $('#gwpbonusModal .gwp-max-select').append(data.maxGwpBonusItem);


		                $('#gwpbonusModal').attr('data-uuid', data.editGwpProducts.uuid);
		                $('#gwpbonusModal').data('removecouponlineitem', data.actionUrls.removeCouponLineItem);
		                $('#gwpbonusModal').attr('data-couponlineitemuuid', data.editGwpProducts.gwpCouponUUID);

		                $('#gwpbonusModal').modal('show');
		                $('#gwpbonusModal .gwp-max-select').html(data.maxGwpBonusItem);

		                $('#gwpbonusModal').on('hide.bs.modal', function (e) {
		                    removeGwpCouponLineItem();
		                });

		                /*$('#gwpbonusModal .samples-title .samples-back-icon').on('click', function (e) {
		                    removeGwpCouponLineItem();
		                });*/
		                $('body > .modal-backdrop').remove();
           			 }else {
                        minicart.showAddToBagModal(data, "promoAdd");
		            }
		        },
		        error: function (err) {
		            $('body').trigger('promotion:error', err);

		            if (err.responseJSON.redirectUrl) {
		                window.location.href = err.responseJSON.redirectUrl;
		            } else {
		                createErrorNotification(err.errorMessage);
		                $('.loader-preventive').hide();
		            }
		        }
	   	 });
	    return false;
	});


	/**
 * Function to remove Gwp CouponLineItem
 */
function removeGwpCouponLineItem() {
    var url = $('#gwpbonusModal').data('removecouponlineitem');
    var urlParams = {
        uuid: $('#gwpbonusModal').data('couponlineitemuuid'),
        section:'minibag'
    };
    url = appendToUrl(url, urlParams);

    $('.loader-preventive').show();
    $.ajax({
        url: url,
        method: 'GET',
        success: function (data) {
            minicart.showAddToBagModal(data, 'promoRemove');
        },
        error: function () {
            $('.loader-preventive').hide();
        }
    });
}

	// Promo code remove
	$('body').on('click', '.mini-bag .promocode-remove', function (e) {
	    e.preventDefault();
	    if ($('.alert-dismissible') && $('.alert-dismissible').length > 0) {
	        $('.alert-dismissible').remove();
	    }
	    var url = $(this).data('action');
	    var uuid = $(this).data('uuid');
	    var couponCode = $('.coupon-code-field').val();
	    var urlParams = {
	        code: couponCode,
	        uuid: uuid,
            section:'minibag'
	    };

	    url = appendToUrl(url, urlParams);
	    $('.loader-preventive').show();
	    $.ajax({
	        url: url,
	        type: 'get',
	        success: function (data) {
	            $('.loader-preventive').hide();
                minicart.showAddToBagModal(data, 'promoRemove');
	        },
	        error: function (err) {
	            $('.coupon-error-message').removeClass('d-none');
	            $('.coupon-error-message').empty();
	            createPromoErrorNotification(err.responseJSON.errorMessage);
	            $('.loader-preventive').hide();
	        }
	    });
	});



	$('body').on('click', '.mini-bag .edit-gwp', function (e) {
    e.preventDefault();
    var pids = [];
    var queryString = '?pids=';
    $.each($('.gwpProductItem'), function () {
        pids.push($(this).data('pid'));
    });
    queryString += JSON.stringify(pids);
    queryString += '&gwpUUID=' + $(this).data('uuid');
    queryString +='&section=minibag';

    var url = $(this).data('actionurl');

    $('.loader-preventive').show();
    $.ajax({
        url: url + queryString,
        method: 'POST',
        success: function (data) {
            if (data.error) {
                $('#gwpbonusModal').modal('hide');
                if ($('.add-to-cart-messages').length === 0) {
                    $('body').append('<div class="add-to-cart-messages"></div>');
                }
                $('.add-to-cart-messages').append(
                    '<div class="alert alert-danger add-to-basket-alert text-center"'
                    + ' role="alert">'
                    + data.errorMessage + '</div>'
                );
                setTimeout(function () {
                    $('.add-to-basket-alert').remove();
                    location.reload();
                }, 3000);
            } else {
                $('#gwpbonusModal .modal-body-content').children().remove();
                for (var i = 0; i < data.gwpPromotionHtml.length; i++) {
                    $('#gwpbonusModal .modal-body-content').append(data.gwpPromotionHtml[i]);
                }
                var lidata = {
                    uuid: data.promotionUUID,
                    maxItems: data.maxGwpBonusItem
                };
                $('#gwpbonusModal #bonus-product-list-options').attr('data-options', JSON.stringify(lidata));
                $('#gwpbonusModal .modal-title').empty().append(data.promotionName);
                $('#gwpbonusModal .samples-modal').attr('data-uuid', data.bonusUUID);

                $('#gwpbonusModal').data('uuid', data.editGwpProducts.uuid);
                $('#gwpbonusModal').data('removecouponlineitem', data.actionUrls.removeCouponLineItem);
                $('#gwpbonusModal').data('couponlineitemuuid', data.editGwpProducts.gwpCouponUUID);

                $('#gwpbonusModal').modal('show');
                $('#gwpbonusModal .gwp-selected').html(data.editGwpProducts.selectedGwpCount);
                $('#gwpbonusModal .gwp-max-select').html(data.maxGwpBonusItem);

                if (data.editGwpProducts.selectedGwpCount >= data.maxGwpBonusItem) {
                    $('#gwpbonusModal .add-product:not(.active)').addClass('disabled');
                }
            }
            $('.loader-preventive').hide();
            $('body > .modal-backdrop').remove();
        },
        error: function () {
            $('.loader-preventive').hide();
        }
    });
});

    /**
 	* re-renders the order totals and the number of items in the cart
 	* @param {Object} message - Error message to display
 	*/
	function createErrorNotification(message) {
    	var errorHtml = '<div class="alert alert-danger alert-dismissible valid-cart-error ' +
       	 'fade show" role="alert">' +
       	 '<button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
       	 '<span aria-hidden="true">&times;</span>' +
       	 '</button>' + message + '</div>';

    	$('.cart-error').append(errorHtml);
	}

	/**
	 * re-renders the order totals and the number of items in the cart
 	* @param {Object} message - Error message to display
 	*/
	function createPromoErrorNotification(message) {
    	var errorHtml = '<i class="fal fa-exclamation-circle my-auto"></i><div class="ml-2">' + message + '</div>';
    	$('.coupon-error-message').append(errorHtml);
	}


	    /**
	 * appends params to a url
	 * @param {string} url - Original url
	 * @param {Object} params - Parameters to append
	 * @returns {string} result url with appended parameters
	 */
	function appendToUrl(url, params) {
	    var newUrl = url;
	    newUrl += (newUrl.indexOf('?') !== -1 ? '&' : '?') + Object.keys(params).map(function (key) {
	        return key + '=' + encodeURIComponent(params[key]);
	    }).join('&');

	    return newUrl;
	}

	/**
	 * re-renders the order totals and the number of items in the cart
	 * @param {Object} data - AJAX response from the server
	 */
	function updateCartTotals(data) {
	    $('.count-lower').empty().append('('+data.resources.numberOfItems+')');
	    $('.shipping-cost').empty().append(data.totals.noShippingCost ? 'Free' : data.totals.adjustedShippingCost);
	    $('.tax-total').empty().append('TBD');
	    $('.grand-total').empty().append(data.totals.grandTotal);
	    $('.sub-total').empty().append(data.totals.subTotalIncludingOrderDiscount);
	    $('.minicart-quantity').empty().append(data.numItems);
	    $('.minicart-link').attr({
	        'aria-label': data.resources.minicartCountOfItems,
	        title: data.resources.minicartCountOfItems
	    });
	    if (data.totals.orderLevelDiscountTotal.value > 0) {
	        $('.order-discount').removeClass('hide-order-discount');
	        $('.order-discount-total').empty()
	            .append('- ' + data.totals.orderLevelDiscountTotal.formatted);
	    } else {
	        $('.order-discount').addClass('hide-order-discount');
	    }

	    if (data.totals.shippingLevelDiscountTotal.value > 0) {
	        $('.shipping-discount').removeClass('hide-shipping-discount');
	        $('.shipping-discount-total').empty().append('- ' +
	            data.totals.shippingLevelDiscountTotal.formatted);
	    } else {
	        $('.shipping-discount').addClass('hide-shipping-discount');
	    }

	    data.items.forEach(function (item) {
	        if (data.totals.orderLevelDiscountTotal.value > 0) {
	            $('.coupons-and-promos').empty().append(data.totals.discountsHtml);
	        }
	        if (item.renderedPromotions) {
	            $('.item-' + item.UUID).empty().append(item.renderedPromotions);
	        } else {
	            $('.item-' + item.UUID).empty();
	        }
	        $('.uuid-' + item.UUID + ' .unit-price').empty().append(item.renderedPrice);
	        $('.line-item-price-' + item.UUID + ' .unit-price').empty().append(item.renderedPrice);
	        if(item.sordeliveryoption){

	        	var pricehtml= '<span class="price-unadjusted stike">'
                                + '$' + (item.price.sales.value * item.quantity).toFixed(2)
                                + '</span>';
               $('.price-total-' + item.UUID).empty().append(pricehtml);
               $('.price-total-' + item.UUID).append(item.priceTotal.price);
	        }else if(item.proratedPrice && ((item.price.sales.value * item.quantity) > item.proratedPrice)){

    			var pricehtml= '<span class="price-unadjusted stike">'
                                + item.priceTotal.price
                                + '</span>';
                $('.price-total-' + item.UUID).empty().append(pricehtml);
                $('.price-total-' + item.UUID).append('$'+item.proratedPrice.toFixed(2));
	        }else{
	           $('.price-total-' + item.UUID).empty().append(item.priceTotal.price);
	    	}
	    });

        //afterpay changes
        if(data.afterPayMin && data.afterPayMax){
            var totalamount = parseInt(data.totals.subTotalIncludingOrderDiscount.replace(/\$|,/g, ''));
            if(totalamount < data.afterPayMin){
                $('.afterpay-threshold-message').empty().text('Afterpay is only available for orders over $ '+ Number(data.afterPayMin).toFixed(2));
                $('.minicart-payment-btn-afterpay').addClass('d-none');
            }else if (totalamount > data.afterPayMax){
                $('.afterpay-threshold-message').empty().text('Afterpay is only available for orders below $ '+ Number(data.afterPayMax).toFixed((2)));
                $('.minicart-payment-btn-afterpay').addClass('d-none');
            }else {
                var apamount = Number(Math.round((totalamount / 4) * 100) / 100).toFixed(2);
                $('.afterpay-threshold-message').empty().text('Or 4 interest-free installments of $ '+apamount+ ' by ');
                $('.minicart-payment-btn-afterpay').removeClass('d-none');
            }
        }
	}

	/**
	 * re-renders the approaching discount messages
	 * @param {Object} approachingDiscounts - updated approaching discounts for the cart
 	*/
	function updateApproachingDiscounts(approachingDiscounts) {
	    var html = '';
	    $('.approaching-discounts').empty();
	    if (approachingDiscounts.length > 0) {
	        approachingDiscounts.forEach(function (item) {
	            html += '<div class="single-approaching-discount text-center">'
	                + item.discountMsg + '</div>';
	        });
	    }
	    $('.approaching-discounts').append(html);
	}

	/**
 	* Updates the availability of a product line item
 	* @param {Object} data - AJAX response from the server
 	* @param {string} uuid - The uuid of the product line item to update
 	*/
	function updateAvailability(data, uuid) {
	    var lineItem;
	    var messages = '';

	    for (var i = 0; i < data.items.length; i++) {
	        if (data.items[i].UUID === uuid) {
	            lineItem = data.items[i];
	            break;
	        }
	    }

	    if (lineItem != null) {
	        $('.availability-' + lineItem.UUID).empty();

	        if (lineItem.availability) {
	            if (lineItem.availability.messages) {
	                lineItem.availability.messages.forEach(function (message) {
	                    messages += '<p class="line-item-attributes">' + message + '</p>';
	                });
	            }

	            if (lineItem.availability.inStockDate) {
	                messages += '<p class="line-item-attributes line-item-instock-date">'
	                    + lineItem.availability.inStockDate
	                    + '</p>';
	            }
	        }

	        $('.availability-' + lineItem.UUID).html(messages);
	    }
	}

	/**
 	* Checks whether the basket is valid. if invalid displays error message and disables
 	* checkout button
 	* @param {Object} data - AJAX response from the server
 	*/
	function validateBasket(data) {
	    if (data.valid.error) {
	        if (data.valid.message) {
	            var errorHtml = '<div class="alert alert-danger alert-dismissible valid-cart-error ' +
	                'fade show" role="alert">' +
	                '<button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
	                '<span aria-hidden="true">&times;</span>' +
	                '</button>' + data.valid.message + '</div>';

	            $('.cart-error').append(errorHtml);
	        } else {
	            $('.cart').empty().append('<div class="row"> ' +
	                '<div class="col-12 text-center"> ' +
	                '<h1>' + data.resources.emptyCartMsg + '</h1> ' +
	                '</div> ' +
	                '</div>'
	            );
	            $('.number-of-items').empty().append(data.resources.numberOfItems);
	            $('.minicart-quantity').empty().append(data.numItems);
	            $('.minicart-link').attr({
	                'aria-label': data.resources.minicartCountOfItems,
	                title: data.resources.minicartCountOfItems
	            });
	            $('.minicart .popover').empty();
	            $('.minicart .popover').removeClass('show');
	        }

	        $('.checkout-btn').addClass('disabled');
	    } else {
	        $('.checkout-btn').removeClass('disabled');
	    }
	}


	//quantity updation
	$('body').on('change', '.mini-bag .quantity-form > .qty-field', function () {
	    var preSelectQty = $(this).data('pre-select-qty');
	    var quantity = $(this).val();
	    var productID = $(this).data('pid');
	    var url = $(this).data('action');
	    var uuid = $(this).data('uuid');

        var section = '';
        if ($('.mini-bag').hasClass('show-minibag')) {
            section = 'minibag';
        }

	    var urlParams = {
	        pid: productID,
	        quantity: quantity,
	        uuid: uuid,
            section:section
	    };
	    url = appendToUrl(url, urlParams);

	    //$(this).parents('.card').spinner().start();

	    $('body').trigger('cart:beforeUpdate');
	    $('.loader-preventive').show();
	    $.ajax({
	        url: url,
	        type: 'get',
	        context: this,
	        success: function (data) {
	            /*$('.quantity[data-uuid="' + uuid + '"]').val(quantity);
	            $('.coupons-and-promos').empty().append(data.totals.discountsHtml);
	            updateCartTotals(data);
	            updateApproachingDiscounts(data.approachingDiscounts);
	            updateAvailability(data, uuid);
	            validateBasket(data);
	            $(this).data('pre-select-qty', quantity);

	            $('body').trigger('cart:update', data);
                */

	            if ($(this).parents('.product-info').hasClass('bonus-product-line-item') && $('.cart-page').length) {
                    $('.loader-preventive').hide();
	                location.reload();
	            }


	            // GTM custom event
                try {
                    if (!window.dataLayer) {
                        window.dataLayer = [];
                    }

                    dataLayer.push({
                        'event': 'update_qty_minibag'
                    });

                } catch(e) {

                }
                minicart.showAddToBagModal(data);
	        },
	        error: function (err) {
	            if (err.responseJSON.redirectUrl) {
	                window.location.href = err.responseJSON.redirectUrl;
	            } else {
	                createErrorNotification(err.responseJSON.errorMessage);
	                $(this).val(parseInt(preSelectQty, 10));
	            }
                $('.loader-preventive').hide();
	        }
	    });
	});

    // cart delete button click
	$('body').on('click', '.mini-bag .remove-product.delete-product', function (e) {
	    e.preventDefault();
	    if ($('.alert-dismissible') && $('.alert-dismissible').length > 0) {
	        $('.alert-dismissible').remove();
	    }

	    var productID = $(this).data('pid');
	    var url = $(this).data('action');
	    var uuid = $(this).data('uuid');
        var section = '';

        if ($('.mini-bag').hasClass('show-minibag')) {
            section = 'minibag';
        }
	    var urlParams = {
	        pid: productID,
	        uuid: uuid,
            section:section
	    };

	    url = appendToUrl(url, urlParams);

	    $('body > .modal-backdrop').remove();

	    $('.loader-preventive').show();
	    $.ajax({
	        url: url,
	        type: 'get',
	        success: function (data) {

                if(section == 'minibag'){
                    $('.loader-preventive').hide();
                    minicart.showAddToBagModal(data);
                    return;
                }

	            if (data.basket.items.length === 0) {
	                $('.cart-page').empty().append('<div class="row"> ' +
	                    '<div class="col-12 text-center"> ' +
	                    '<h1>' + data.basket.resources.emptyCartMsg + '</h1> ' +
	                    '</div> ' +
	                    '</div>'
	                );
	                $('.order-count-text').empty().append(data.basket.resources.numberOfItems);
	                $('.item-count').empty().append('(' + data.basket.resources.numberOfItems + ')');
	                $('.minicart-quantity').empty().append(data.basket.numItems);
	                $('.minicart-link').attr({
	                    'aria-label': data.basket.resources.minicartCountOfItems,
	                    title: data.basket.resources.minicartCountOfItems
	                });
	                $('.minicart .popover').empty();
	                $('.minicart .popover').removeClass('show');
	                $('body').removeClass('modal-open');
	                $('html').removeClass('veiled');
	                $('body').css('overflow', 'auto');
	            } else {
	                if (data.toBeDeletedUUIDs && data.toBeDeletedUUIDs.length > 0) {
	                    for (var i = 0; i < data.toBeDeletedUUIDs.length; i++) {
	                        $('.uuid-' + data.toBeDeletedUUIDs[i]).remove();
	                    }
	                }
	                $('.uuid-' + uuid).remove();
	                if (!data.basket.hasBonusProduct) {
	                    $('.bonus-product').remove();
	                }
	                $('.coupons-and-promos').empty().append(data.basket.totals.discountsHtml);
	                updateCartTotals(data.basket);
	                updateApproachingDiscounts(data.basket.approachingDiscounts);
	                $('body').trigger('setShippingMethodSelection', data.basket);
	                validateBasket(data.basket);
	                if ($('.minicart.add-sample-btn') && $('.minicart.add-sample-btn').length > 0 && !data.basket.hasBonusProduct) {
	                    $('.minicart.add-sample-btn').html('Add Samples');
	                }
	                if ($('.add-sample.add-sample-btn') && $('.add-sample.add-sample-btn').length > 0  && !data.basket.hasBonusProduct) {
	                    $('.add-sample.add-sample-btn').html('Add Samples');
	                }
	            }

	            $('body').trigger('cart:update');

	            if ($('.mini-bag').hasClass('show-minibag')) {
	                //$('.cart-wrapper .cart .close-bag').trigger('click');
	                $('.minicart .mini-cart-total').trigger('click');
	            }  else if ($('.container-fluid#cart-table').length > 0) {
	                location.reload();
	            }

	            $('.loader-preventive').hide();
	        },
	        error: function (err) {
	            if (err.responseJSON.redirectUrl) {
	                window.location.href = err.responseJSON.redirectUrl;
	            } else {
	                createErrorNotification(err.responseJSON.errorMessage);
	                $('.loader-preventive').hide();
	            }
	            $('body').css('overflow', 'auto');
	        }
	    });
	});

    $(document).on('click', '.product-suggestion-close', function(){
        var $cartItem = $(this).parents('.bag-product-item');
        $('.pairs-with-box').removeClass('pairs-bestwith-btn-open');
        if($(this).parents('.bag-item-container').children('pairs-with-btn').hasClass('pairs-bestwith-btn-open')){
            $(this).parents('.bag-item-container').children('pairs-with-btn').removeClass('pairs-bestwith-btn-open')
        } else{
            $(this).parents('.bag-item-container').children('pairs-with-btn').removeClass('pairs-bestwith-btn-open')
        }
	    $cartItem.find('.pairs-with-box').toggleClass('pairs-with-btn-open');
	    $cartItem.find('.pairs-block').toggleClass('open');
        if($cartItem.find('.pairs-with-box').hasClass('pairs-with-btn-open')){
            $cartItem.find('.pairs-with-box').attr("aria-expanded","true").attr("aria-label","expanded");
            $cartItem.find('.pairs-block').find('.product-suggestion-close').attr("tabindex","0")
            $cartItem.find('.pairs-block').find('.pairs-with-name').attr("tabindex","0")
            $cartItem.find('.pairs-with-travel, .pairs-with-main').attr("tabindex","0")
        } else{
            $cartItem.find('.pairs-with-box').attr("aria-expanded","flase").attr("aria-label","collapsed");
            $cartItem.find('.pairs-block').find('.pairs-with-name').attr("tabindex","-1")
            $cartItem.find('.pairs-block').find('.pairs-body .product-suggestion-close').attr("tabindex","-1")
            $cartItem.find('.pairs-with-travel, .pairs-with-main').attr("tabindex","-1")
        }
    });

    $(document).on('keydown', '.product-suggestion-close', function(e){
        if(e.keyCode === 13){
            e.preventDefault();
            $(this).trigger("click");
        }
    });

    // Pairs With
	$('body').on('click', '.mini-bag .pairs-with-box', function () {
	   minicart.pairsWithOpen($(this));
	});

        //Click handler for the Bag icon in header
        $(document).on('click', '.mini-cart-total',function() {
            if(window.location.href.indexOf("/bag") > -1 ){
                return false;
            }

            //Fetch the data from service minicartShow(CartSFRA-MiniCartShow)
            $.ajax({
                type: 'GET',
                url: util.ajaxUrl(Urls.minicartShow),
                success:function(response) {
                    if(response) {
                        minicart.showAddToBagModal(response);
                    }

                }
            });
        });

        /**
         * To hide the minibag drawer
         */
        $(document).on('click', '.mini-bag-container .close-bag,.minibag-mask', function() {
            if($('.mini-bag-container .samples-content').length>0 && $('.sample-product-container').css("display")!=="none"){
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
                                // $('.sticky-add-to-bag').css("z-index","1025");
                                $('#linc-web-chat-iframe').css('display', 'block');
                                setTimeout(function(){
                                    $('.minicart').empty();
                                    $('.minicart').append(response);
                                    // $('.add-to-bag-sticky-container').addClass('sticky-add-to-bag');
                                    // $(".title-container h2").focus();
                                    $('#gladlyChat_container').attr('style','z-index:1040 !important');
                                },500)
                            }

                        }
                    });
                }
            }
        });



        /**
         * ADA
         */
        //hiding search suggestion when focus goes to minibag
        $('.mini-cart').focusin(function(e) {
            $('.dropdown-search-desktop').css('display', 'none');
        })

        /**
         * Promo code related handlers
         */
        $(document).on("keyup",".minicart-promo-code",function(event){
            $(".minicart-promo-code").val(event.target.value);
        })

        $(document).on("click",".mini-bag .add-promo-text",function(){
            $(".promocode-container").addClass("d-flex");
            $(".mini-bag .add-promo-text").hide();
            $(".minibag-scroll")[0].scrollTop = $(".minibag-scroll")[0].scrollHeight; ;
        });

        $(document).on("keydown",".mini-bag .add-promo-text",function(e){
            if (e.which === 13){
                $(this).trigger('click');
            }
        });

        //override enter key for coupon code entry
        $(document).on("keydown",".minicart-promo-code",function(e){
            if (e.which === 13 && $(this).val().length === 0)
            {
                return false;
            } else if(e.which === 13 && $(this).val().length > 0) {
                $('.minicart-promo-button').trigger('click');
            }
        })

        $(document).on('focus', '.mini-bag .promocode-label', function(){
            $(this).find('.promo-tooltip').attr('aria-hidden', false);
            $(this).find('.promo-tooltip').text('Only one code per order. Some products may be excluded. Tooltip');
        });

        $(document).on('focus', '.minicart-promo-code', function(){
            $('.promo-tooltip').attr('aria-hidden', true);
        });

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

        /* Custom event to call show mini bag from old code.
         */
        $(document).on('show:minibag',function(e, json){
            $.ajax({
                type: 'GET',
                url: util.ajaxUrl(Urls.minicartShow),
                success:function(response) {
                    if(response) {
                        minicart.showAddToBagModal(response, json);
                    }
                }
            });
        })

        /*
        Loader for begin checkout
         */
        $(document).on("click",".secure-checkout",function(){
            $('.loader-preventive').show();
        });


        /**
         * Samples related handlers
         */



       //close sample modal
        $(document).on("click",".sample-product-container .samples-title .samples-back-icon",function(){
            $(".ajax-loader").show();
            $('#submit-sample-items').trigger('click');
            setTimeout(function() {
                $('.sample-product-container').hide();
                $(".ajax-loader").hide();
            }, 1000);
        });

        $(document).on('click', '#gwpbonusModal .samples-title .samples-back-icon', function (e) {
            if ($('#gwpbonusModal .gwp-selected').text() <= 0){
                removeGwpCouponLineItem();
            }else {
                $('#gwpbonusModal').modal('hide');
            }
        });
    },

    /**
     * @function
     * @description Add product to bag
     * @param bagbutton
     */
    addToBag: function (bagbutton){
        var button = $(bagbutton);
        var pid = button.attr('data-pid');
        var productname =  button.attr('data-productname');
        var price = button.attr('data-price');
        var requestURL = button.attr('data-url');

        $.ajax({
            type: 'POST',
            url: util.ajaxUrl(Urls.addProduct, 'ajax'),
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
                // button.removeAttr("disabled");
                sendAddToCartGAData(pid, '1', price, productname,'');
                minicart.showAddToBagModal(response, pid);
            }
        });
    },

    /**
     * @function
     * @description Add all products to bag
     * @param productIDs
     * @param bagbutton
     */
    addAllProductsToBag: function (productIDs, bagbutton){
        var requestURL = $(bagbutton).attr('data-url');
        $.ajax({
            type: 'POST',
            url: requestURL,
            data: {
                'productIds':productIDs
            },
            success:function(response) {

                $( ".mini-cart-total" ).each(function( index ) {
                    $( this ).trigger("click");
                    return false;
                });
                /*setHistory();*/
                sendAddToCartGlobalGA(productIDs);
            }
        });
    },

    /**
     * @function
     * @description Sets response to minibag container
     * @param response
     * @param pid
     */
    showAddToBagModal: function (response, pid){
        $('.mini-bag-container').empty();
        //appending the response to minicart container div
        $('.mini-bag-container').append(response);

        // Call after pay if eligible
        if ( $( "#afterpay-express-button" ).length ) {
            initAfterpay();
        }

        if(pid && ($('.mini-bag #minibag-pid').length >0)) {
            $('.mini-bag #minibag-pid').val(pid);
        }

        try{
            window.miniCartButton();
			window.initApplepayButton();
        }catch(e){}

        $('body').trigger('product:afterAddToCart');

        /**
         * To show the minibag drawer
         * */
        $('body').css("overflow","hidden");

        //document.body.scrollTop = 0;
        //document.documentElement.scrollTop = 0;
        setTimeout(function() {
            minicart.showMinibag();

            //pairs with popup open
            minicart.pairsWithOpen($('.pairs-with-btn').last());
            /*$('body').tooltip({
                selector: '[data-toggle="tooltip"]'
            });*/
            $('#minibag-container-wrap .add-to-bag-status').text('Product added to your bag')

            if(pid === 'promoAdd'){
                $("#minibag-container-wrap .promocode-applied .promoapply").focus();
            }else if( pid === 'promoRemove'){
                $("#minibag-container-wrap .add-promo-text").focus();
            }else{
                $("#minibag-container-wrap .close-bag").focus();
            }


            minicart.trapMiniBagFocus();
        }, 100);

        if(pid) {
            sendAddToCartGlobalGA(pid);
        }
    },

    /**
     * @function
     * @description Open minibag
     */
    showMinibag: function (){
        //RDMP-3633-hiding linc webchat
        $('#linc-web-chat-iframe').css('display', 'none');
        $('#gladlyChat_container').attr('style','z-index:1000 !important');
        if(window.requestAnimationFrame){
            requestAnimationFrame(function(){
                $('.mini-bag').addClass("show-minibag");
                $('.mini-bag').removeClass("hide-minibag");
                // $('.sticky-add-to-bag').css("z-index","1010");
                // $('.add-to-bag-sticky-container').removeClass('sticky-add-to-bag');
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
            // $('.sticky-add-to-bag').css("z-index","1010");
            // $('.add-to-bag-sticky-container').removeClass('sticky-add-to-bag');
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


    /**
     * @function
     * @description Trap focus on mini bag when open for tab events
     */
    trapMiniBagFocus: function (){
        var container = document.querySelector("#minibag-container-wrap");
        container.addEventListener('keydown', focusElement);

        // Close mini bag
        $('.close-bag').on('keypress',function(e) {
            if(e.which == 13 || e.which == 32) {
                $(this).trigger("click");
            }
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
    },

     /**
     * @function
     * @description Open and close best pair with
     */

    pairsWithOpen: function (pairProduct){
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
  }

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

// $(document).ready(function() {
//     $('body').on('shown.bs.modal', '.modal, .modal.modal-afterpay', function(){
// 		$('#gladlyChat_container').attr('style','z-index:1000 !important');
// 	})
// });



module.exports = minicart;
