'use strict';

var base = require('./product/base');
const util = require("./util");
const minicart = require("./minicart");

base.selectBonusProduct();
base.addBonusProductsToCart();


//Samples Modal
$('body').on('click', '#bonusModalLink', function (ev) {
    ev.preventDefault();
    var target = $(this).attr("href");

    // load the url and show modal on success
    $("#bonusModal .modal-content").load(target, function() {
        $("#bonusModal").modal("show");
    });
})

$('.payment-options input').keydown(function () {
    $(this).val() ? $('.promo-button').removeAttr("disabled") : $('.promo-button').attr("disabled",'disabled')
});

$('.payment-options input').blur(function () {
    $(this).val() ? $('.promo-button').removeAttr("disabled") : $('.promo-button').attr("disabled",'disabled')
});

$('.payment-options input').on('keyup', function(e) {
    $(this).val() ? $('.promo-button').removeAttr("disabled") : $('.promo-button').attr("disabled",'disabled')
});

$('.payment-options input').on('paste onpaste', function(e) {
    $('.promo-button').removeAttr("disabled")
});

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
    $('.summary-heading').empty().append('Order Summary (' + data.resources.numberOfItems + ')');
    var quantity = data.resources.numberOfItems.toUpperCase()+' | ';
    var elem ='<div class="text-center p-4">'+quantity+'<strong>'+data.totals.grandTotal+'</strong>'+
    '</div>'
    $('.bag-page .mobile-payment-options .container-fluid .text-center').replaceWith(elem)
    $('.shipping-cost').empty().append(data.totals.noShippingCost ? 'Free' : data.totals.adjustedShippingCost);
    $('.tax-total').empty().append('TBD');
    $('.grand-total').empty().append(data.totals.grandTotal);
    $('.sub-total').empty().append(data.totals.subTotal);
    $('.sub-total-IncludingOrderDiscount').empty().append(data.totals.subTotalIncludingOrderDiscount);
    $('.minicart-quantity').empty().append(data.numItems);
    $('.mini-cart-total .bag-number').empty().append(data.numItems);
    $('.minicart-link').attr({
        'aria-label': data.resources.minicartCountOfItems,
        title: data.resources.minicartCountOfItems
    });
    if (data.totals.orderLevelDiscountTotal.value > 0 || (data.totals.discounts[0] && data.totals.discounts[0].gwpCoupon)) {
        if(data.totals.orderLevelDiscountTotal.value > 0){
            $('.order-discount').removeClass('hide-order-discount');
            $('.order-discount-total').empty()
                .append('- ' + data.totals.orderLevelDiscountTotal.formatted);
            $('.order-discount .coupon-code').empty().append('Discount: '+data.totals.discounts[0].couponCode);
        }
        $('.bag-promo-container').addClass('hide-coupon-apply-container');
        $('.input-group-readonly').removeClass('hide-applied-coupon-container');
        $('#dwfrm_cart_couponCode').attr('value', data.totals.discounts[0].couponCode);
        $('#remove-coupon').attr('data-code', data.totals.discounts[0].couponCode);
        $('#remove-coupon').attr('data-uuid', data.totals.discounts[0].UUID);
        $('.text-success.cart-coupon-code').removeClass('hide-applied-coupon-container');
        $('.text-success.cart-coupon-code').empty().html('<i class="fal fa-check-circle"></i> Promotional code '+ data.totals.discounts[0].couponCode +' has been applied.');
    } else {
        $('.order-discount').addClass('hide-order-discount');
        $('.bag-promo-container').removeClass('hide-coupon-apply-container');
        $('.input-group-readonly').addClass('hide-applied-coupon-container');
        $('.text-success.cart-coupon-code').addClass('hide-applied-coupon-container');
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

    //disabling checkout buttons
    if(!data.hasRefillProducts && !data.hasOnlyGiftCertificate){
        $('#cart-afterpay-button').removeClass('d-none');
        $('#cart-paypal-button').removeClass('d-none');
        $('.cart-applepay-button').removeClass('d-none');
        $('.product-afterpay-message').removeClass('d-none');
    }else{
        $('#cart-afterpay-button').addClass('d-none');
        $('#cart-paypal-button').addClass('d-none');
        $('.cart-applepay-button').addClass('d-none');
        $('.product-afterpay-message').addClass('d-none');
    }

    //afterpay changes
    if(data.afterPayMin && data.afterPayMax){
        var totalamount = parseInt(data.totals.subTotalIncludingOrderDiscount.replace(/\$|,/g, ''));
        if(totalamount < data.afterPayMin){
            $('.cart-afterpay-message').addClass('d-none');
            $('.cart-afterpay-error-message .afterpay-threshold-message').empty().text('Afterpay is only available for orders over $ '+ Number(data.afterPayMin).toFixed(2));
            $('#cart-afterpay-button').addClass('d-none');
        }else if (totalamount > data.afterPayMax){
            $('.cart-afterpay-message').addClass('d-none');
            $('.cart-afterpay-error-message .afterpay-threshold-message').empty().text('Afterpay is only available for orders below $ '+ Number(data.afterPayMax).toFixed((2)));
            $('#cart-afterpay-button').addClass('d-none');
        }else {
            var apamount = Number(Math.round((totalamount / 4) * 100) / 100).toFixed(2);
            $('.cart-afterpay-error-message').addClass('d-none');
            $('.cart-afterpay-message .afterpay-threshold-message').empty().text('Or 4 interest-free installments of $ '+apamount+ ' by ');
            if(!data.hasRefillProducts && !data.hasOnlyGiftCertificate){
                $('#cart-afterpay-button').removeClass('d-none');
            }
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

$('body').on('change', '.quantity-form > .qty-field', function () {
    var preSelectQty = $(this).data('pre-select-qty');
    var quantity = $(this).val();
    var productID = $(this).data('pid');
    var url = $(this).data('action');
    var uuid = $(this).data('uuid');

    var urlParams = {
        pid: productID,
        quantity: quantity,
        uuid: uuid
    };
    url = appendToUrl(url, urlParams);

    //$(this).parents('.card').spinner().start();

    $('body').trigger('cart:beforeUpdate');
    $('.loader-preventive').show();
    $.ajax({
        url: url,
        type: 'get',
        context: this,
        dataType: 'json',
        success: function (data) {
            $('.quantity[data-uuid="' + uuid + '"]').val(quantity);
            $('.coupons-and-promos').empty().append(data.totals.discountsHtml);
            updateCartTotals(data);
            updateApproachingDiscounts(data.approachingDiscounts);
            updateAvailability(data, uuid);
            validateBasket(data);
            $(this).data('pre-select-qty', quantity);

            $('body').trigger('cart:update', data);
            if ($(this).parents('.product-info').hasClass('bonus-product-line-item') && $('.cart-page').length) {
                location.reload();
            }

            // GTM custom event
            try {
                if (!window.dataLayer) {
                    window.dataLayer = [];
                }

                dataLayer.push({
                    'event': 'update_qty_bag'
                });

            } catch(e) {

            }
            location.reload();
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

/**
 * Function to remove Gwp CouponLineItem
 */
function removeGwpCouponLineItem() {
    var url = $('#gwpbonusModal').data('removecouponlineitem');
    var queryString = '?uuid=' + $('#gwpbonusModal').data('couponlineitemuuid');
    $('.loader-preventive').show();
    $.ajax({
        url: url + queryString,
        method: 'GET',
        dataType: 'json',
        success: function (data) {
            location.reload();
        },
        error: function () {
            $('.loader-preventive').hide();
        }
    });
}

// cart delete button click
$('body').on('click', '.remove-product.delete-product', function (e) {
    e.preventDefault();
    if ($('.alert-dismissible') && $('.alert-dismissible').length > 0) {
        $('.alert-dismissible').remove();
    }
    var productID = $(this).data('pid');
    var url = $(this).data('action');
    var uuid = $(this).data('uuid');
    var urlParams = {
        pid: productID,
        uuid: uuid
    };

    url = appendToUrl(url, urlParams);

    $('body > .modal-backdrop').remove();

    $('.loader-preventive').show();
    $.ajax({
        url: url,
        type: 'get',
        success: function (data) {
            if (data.basket.items.length === 0) {
                /*$('.cart-page').empty().append('<div class="row"> ' +
                    '<div class="col-12 text-center"> ' +
                    '<h1>' + data.basket.resources.emptyCartMsg + '</h1> ' +
                    '</div> ' +
                    '</div>'
                );*/
                var currURL = window.location.href;
                if(currURL.indexOf('hasadproducts=true') > -1){
                    currURL = util.removeParamFromURL(currURL, 'hasadproducts');
                }
                window.location.assign(currURL);

                $('.order-count-text').empty().append(data.basket.resources.numberOfItems);
                $('.item-count').empty().append('(' + data.basket.resources.numberOfItems + ')');
                $('.minicart-quantity').empty().append(data.basket.numItems);
                $('.minicart-link').attr({
                    'aria-label': data.basket.resources.minicartCountOfItems,
                    title: data.basket.resources.minicartCountOfItems
                });


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

            $('body').trigger('cart:update');

            if ($('.mini-bag').hasClass('show-minibag')) {
                //$('.cart-wrapper .cart .close-bag').trigger('click');
                $('.minicart .mini-cart-total').trigger('click');
            }  else if ($('.container-fluid#cart-table').length > 0) {
                //location.reload();
                $('.bag-common').empty().append(data.renderedTemplate);
                $('.pair-with-btn').last().trigger('click');
            }

            $('.loader-preventive').hide();
            }

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

$('body').on('click', '.cart-page .edit-gwp', function (e) {
    e.preventDefault();
    $('.loader-preventive').show();

    var pids = [];
    var queryString = '?pids=';
    $.each($('.gwpProductItem'), function () {
        pids.push($(this).data('pid'));
    });

    queryString += JSON.stringify(pids);
    queryString += '&gwpUUID=' + $(this).data('uuid');

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
        },
        error: function () {
            $('.loader-preventive').hide();
        }
    });
});

function addWishlist(e) {
    if(e){
        e.preventDefault();
    }
    var url = $(this).data('url');
    var container = $(this).parents('.wishlist-btn-container');
    var pid = $(this).data('pid');
    $('.loader-preventive').show();
    $.getJSON(url, function (data) {
        if (data && data.success === true) {
            $('.add-to-wishlist-sr').text('product added to wishlist');
            container.find('.wishlist-additem').hide();
            container.find('.wishlist-removeitem').show();
            //Update ritual page items
            var ritualContainer = $('.rec-prd-list-item[data-id="'+pid+'"]');
            if(ritualContainer.length) {
                ritualContainer.find('.wishlist-additem').hide();
                ritualContainer.find('.wishlist-removeitem').show();
            }
            $('.loader-preventive').hide();
        }
    });
}

function removeWishlist(e) {
    if(e){
        e.preventDefault();
    }
    var url = $(this).data('url');
    var container = $(this).parents('.wishlist-btn-container');
    var pid = $(this).data('pid');
    $('.loader-preventive').show();
    $.getJSON(url, function (data) {
        if (data && data.success === true) {
            $('.remove-from-wishlist-sr').text('product added to wishlist');
            container.find('.wishlist-removeitem').hide();
            container.find('.wishlist-additem').show();
            //Update ritual page items
            var ritualContainer = $('.rec-prd-list-item[data-id="'+pid+'"]');
            if(ritualContainer.length) {
                ritualContainer.find('.wishlist-removeitem').hide();
                ritualContainer.find('.wishlist-additem').show();
            }
            $('.loader-preventive').hide();
        }
    });
}

$(document).on('click', '.wishlist-additem', addWishlist);
$(document).on('keyup', '.wishlist-additem', function(event) {
    if(event.keyCode === 13) {
        event.preventDefault();
        addWishlist();
    }
});

$(document).on('click', '.wishlist-removeitem', removeWishlist);
$(document).on('keyup', '.wishlist-removeitem', function(event) {
    if(event.keyCode === 13) {
        event.preventDefault();
        removeWishlist();
    }
});

// Checkout button click
$('body').on('click', '.checkout-btn, .minibag-checkout-btn', function (e) {
    e.preventDefault();
    var url = $(this).data('action');
    var cartValidationUrl = $(this).data('validateurl');
    var curLineItemId;
    $('.loader-preventive').show();

    // for GTM - 20.4 : Gift Options: Bag Page
    gtmGiftOptions();

    /**
     * Skip email gate implementation for AD
     */
    var hasSORProducts = $(this).attr('data-sorproducts');
    var userExists = $(this).attr('data-userexists');
    if(hasSORProducts === 'true' && userExists === 'false'){
        //e.preventDefault();
        $('.loader-preventive').hide();
        var container = $('#loginModal');
        var url = container.find('.register-link').attr('data-url');
        if(url && url.indexOf('skip_email_gate=true') === -1){
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

    $.ajax({
        url: cartValidationUrl,
        method: 'GET',
        dataType: 'json',
        async: false,
        success: function (data) {
            data.inventoryMsg.messages.forEach(function (temp) {
                curLineItemId = temp.uuid;
                var $curSelector = $('.cart-item.uuid-' + curLineItemId);
                if (!$curSelector.find('.item-oos').hasClass('d-none')) {
                    $curSelector.find('.item-oos').addClass('d-none');
                }
                if (!$curSelector.find('.oos-txt').hasClass('d-none')) {
                    $curSelector.find('.oos-txt').addClass('d-none');
                }
                if ($curSelector.hasClass('out-of-stock-cart')) {
                    $curSelector.removeClass('out-of-stock-cart');
                }
                if (temp.inStock === 'OOS') {
                    $curSelector.find('.item-oos').removeClass('d-none');
                    $curSelector.find('.oos-txt').removeClass('d-none');
                    $curSelector.addClass('out-of-stock-cart');
                }
            });
            $('.loader-preventive').hide();
        },
        error: function () {
            $('.loader-preventive').hide();
        }
    });

    if ($('.alert-dismissible') && $('.alert-dismissible').length === 0 && ($('.out-of-stock-cart') && $('.out-of-stock-cart').length > 0)) {
        var oosErrorMsg = $('.OOS-error').html();
        createErrorNotification(oosErrorMsg);
    }
    if (($('.out-of-stock-cart') && $('.out-of-stock-cart').length === 0) && $('.alert-dismissible') && $('.alert-dismissible').length > 0) {
        $('.alert-dismissible').remove();
    }
    if (($('.alert-dismissible') && $('.alert-dismissible').length > 0) || ($('.out-of-stock-cart') && $('.out-of-stock-cart').length > 0)) {
        return false;
    } else {                                                                                                                                                               // eslint-disable-line
        window.location.href = url;
    }
});

// cart add coupon
$('.promo-code-form').submit(function (e) {
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
        dataType: 'json',
        data: $form.serialize(),
        success: function (data) {
            if (data.error) {
                // $('.promo-code-form .form-control').addClass('is-invalid');
                $('.promo-code-form .form-control').attr('aria-describedby', 'invalidCouponCode');
                $('.coupon-error-message').empty().append('<i class="fal fa-exclamation-circle"></i> ' + data.errorMessage);
                $('body').trigger('promotion:error', data);
                $('.loader-preventive').hide();
            } else if (data.gwpPromotion) {
                var lidata = {
                    uuid: data.promotionUUID,
                    maxItems: data.maxGwpBonusItem
                };
                $('#gwpbonusModal #bonus-product-list-options').attr('data-options', JSON.stringify(lidata));
                $('#gwpbonusModal .modal-title').append(data.promotionName);
                $('#gwpbonusModal .samples-modal').attr('data-uuid', data.bonusUUID);

                for (var i = 0; i < data.gwpPromotionHtml.length; i++) {
                    $('#gwpbonusModal .modal-body-content').append(data.gwpPromotionHtml[i]);
                }
                $('#gwpbonusModal .gwp-max-select').append(data.maxGwpBonusItem);

                $('#gwpbonusModal').data('uuid', data.editGwpProducts.uuid);
                $('#gwpbonusModal').data('removecouponlineitem', data.actionUrls.removeCouponLineItem);
                $('#gwpbonusModal').data('couponlineitemuuid', data.editGwpProducts.gwpCouponUUID);

                $('#gwpbonusModal').modal('show');
                $('#gwpbonusModal .gwp-max-select').html(data.maxGwpBonusItem);

                $('#gwpbonusModal').on('hide.bs.modal', function (e) {
                    removeGwpCouponLineItem();
                });

                $('#gwpSampleModal .close').on('click', function (e) {
                    removeGwpCouponLineItem();
                });

                //gwpModal();

                $('.coupon-code-field').val('');
                $('.loader-preventive').hide();
            } else {

                /**
                 * Added for RDMP-4528 patch fix
                 * */
                location.reload();

                /**
                 * Commented for RDMP-4528 patch fix
                 * */

                /*$('.coupons-and-promos').empty().append(data.totals.discountsHtml);
                updateCartTotals(data);
                updateApproachingDiscounts(data.approachingDiscounts);
                validateBasket(data);
                $('body').trigger('promotion:success', data);

                 */
                //$('.text-success.cart-coupon-code').empty().append('<i class="fal fa-check-circle"></i> Coupon Applied');
                /*if ($('.container-fluid#cart-table').length > 0) {
                    location.reload();
                }*/
            }

        },
        error: function (err) {
            $('body').trigger('promotion:error', err);
            if (err.responseJSON.redirectUrl) {
                window.location.href = err.responseJSON.redirectUrl;
            } else {
                createErrorNotification(err.errorMessage);
            }
            $('.loader-preventive').hide();
        }
    });
    return false;
});

// Gift wrap model
$('body')
    .on('keydown', '.gift-options-modal .gift-text-area', function (e) {
        var text = $.trim($(this).val()),
            charsLimit = $(this).data('character-limit'),
            charsUsed = text.length;
        if ((charsUsed >= charsLimit) && (controlKeys.indexOf(e.which.toString()) < 0)) {
            e.preventDefault();
        }
    })
    .on('change keyup mouseup', 'textarea[data-character-limit]', function () {
        var text = $.trim($(this).val()),
            charsLimit = $(this).data('character-limit'),
            charsUsed = text.length,
            charsRemain = charsLimit - charsUsed;
        if (charsRemain < 0) {
            $(this).val(text.slice(0, charsRemain));
            charsRemain = 0;
        }

        $(this).next('.text-char-count').find('.char-remain-count').html(charsRemain);
    });

$( "#giftWrapAndMessage" ).submit(function( event ) {
    var giftWrapAdded = $('.gift-options-modal input:checkbox').prop('checked');
    var giftMsg = $.trim($('.gift-options-modal .gift-text-area').val());
});

// Pairs With
$('body').on('click', '.pairs-with-box, .remove-pairswith', function () {
    var $cartItem = $(this).parents('.bag-product-item');
    $(this).toggleClass('pairs-bestwith-btn-open')
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
        $cartItem.find('.pairs-block').find('.product-suggestion-close').attr("tabindex","-1")
        $cartItem.find('.pairs-with-travel, .pairs-with-main').attr("tabindex","-1")
    }
    // if ($cartItem.find('.fa-plus:visible').length > 0) {
    //     $cartItem.find('.fa-plus').hide();
    //     $cartItem.find('.fa-minus').show();
    // } else {
    //     $cartItem.find('.fa-plus').show();
    //     $cartItem.find('.fa-minus').hide();
    // }
});

$(document).ready(function () {
    $('.pairs-with-box:visible').last().trigger('click');

    // Call after pay if eligible
    if ( $( "#afterpay-express-button" ).length ) {
        initAfterpay();
    }

    var currURL = window.location.href;
    if(currURL.indexOf('hasadproducts=true') > -1){
        $('#loginModal').modal('show');
        $('#ad-warning').show();
    }
});

$('body').on('click', '.promocode-remove', function (e) {
    e.preventDefault();
    if ($('.alert-dismissible') && $('.alert-dismissible').length > 0) {
        $('.alert-dismissible').remove();
    }
    var url = $(this).data('action');
    var uuid = $(this).attr('data-uuid');

    var couponCode = $('.coupon-code-field').val();
    var urlParams = {
        code: couponCode,
        uuid: uuid
    };

    url = appendToUrl(url, urlParams);
    $('.loader-preventive').show();
    $.ajax({
        url: url,
        type: 'get',
        dataType: 'json',
        success: function (data) {
            /**
             * Added for RDMP-4528 patch fix
             * */
            location.reload();

            /**
             * Commented for RDMP-4528 patch fix
             * */

            /*$('.coupon-uuid-' + uuid).remove();
            $('.promocode-desc-container').removeClass('d-flex');
            $('.promocode-desc-container').addClass('d-none');
            $('.promocode-desc-container').empty();
            $('.order.promocode-info').remove();
            $('.shipping.promocode-info').remove();
            $('.coupon-code-field').val('');
            if ($('.coupon-code-field') && $('.coupon-code-field').attr('readonly')) {
                $('.coupon-code-field').removeAttr('readonly');
            }
            $('.coupon-code-field').removeClass('promocode-has-error');
            $('.cart-promo-code-form .form-control').removeClass('is-invalid');
            $('.coupon-code-field').removeClass('promocode-has-applied');
            updateCartTotals(data);
            updateApproachingDiscounts(data.approachingDiscounts);
            validateBasket(data);
            $('body').trigger('promotion:success', data);
            $('.loader-preventive').hide();
            $('.gwpProductItem').remove();
            $('.promo-gift-checkout').remove();
            */
        },
        error: function (err) {
            $('.coupon-error-message').removeClass('d-none');
            $('.coupon-error-message').empty();
            createPromoErrorNotification(err.responseJSON.errorMessage);
            $('.loader-preventive').hide();
        }
    });
});

// gift wrap message remove click
$(document).on('click', '#remove-giftmsg', function(e){
    e.preventDefault();
    var href = $('#remove-giftmsg').attr('href');
    $('.loader-preventive').show();
    $.ajax({
        url: href,
        type: 'GET',
        dataType: 'json',
        success: function (data) {
            if (!data.error) {
                $('.gift-message-summary-block').hide();
                $('.gift-message-add-block').show();
                if ($('.container-fluid#cart-table').length > 0) {
                    $('.bag-common').empty().append(data.renderedTemplate);
                    $('.pair-with-btn').last().trigger('click');
                }
            }
            $('.loader-preventive').hide();
        },
        error: function (err) {
            $('.loader-preventive').hide();
        }
    });
});


/**
 * for GTM - 20.4 : Gift Options: Bag Page
 *
 */
function gtmGiftOptions(){
    var giftMsg = $('.bag-page .gift-options #giftMsg').val();
    var hasGiftWrap = $('.bag-page .gift-options #hasGiftWrap').val();

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

$(document).on('click', '.carousel-add-to-cart', function(){
    minicart.addToBag(this);
})

// out of stock popup display
$( document ).ready(function() {
    $('.loader-content').hide();
    $(".mini-cart-total").css('cursor','default');
    var outOfStock =$('.outofstock').val();
    if(outOfStock == 'true'){
        $('#outOfStockModal').modal('show');
    }
});

$(document).on('click', '#addGift', function(e){
    var eligibility = $(this).data('eligibility');
    var checked = $(this).is(':checked');
    if(checked) {
        if($('#giftbox-message').length){
            $('#giftbox-message').text('Gift box has been added to your bag');
        }
        if(eligibility == 'ineligible') {
            $('#addGift').prop('checked', false);
            $("#giftbox-ineligibile-validation").show();
            $("#giftbox-part-eligible-validation").hide();
        } else if(eligibility == 'part-eligible') {
            $("#giftbox-ineligibile-validation").hide();
            $("#giftbox-part-eligible-validation").show();
        }
    } else {
        if($('#giftbox-message').length){
            $('#giftbox-message').text('Gift box has been removed from your bag');
        }
        $(".giftbox-eligibility").hide();
    }
});
