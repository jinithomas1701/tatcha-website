/* eslint-disable no-undef */
'use strict';

var baseMethod = require('base/product/base');
var util = require('../util');

/**
 * Retrieves the relevant pid value
 * @param {jquery} $el - DOM container for a given add to cart button
 * @return {string} - value to be used when adding product to cart
 */
function getPidValue($el) {
    var pid;

    if ($el.hasClass('btn-pairsWith')) {
        pid = $($el).data('pid');
    } else if ($('#quickViewModal').hasClass('show') && !$('.product-set').length) {
        pid = $($el).closest('.modal-content').find('.product-quickview').data('pid');
    } else if ($('.product-set-detail').length || $('.product-set').length) {
        pid = $($el).closest('.product-detail').find('.product-id').text();
    } else if($el.hasClass('add-minicart-empty-item')){
    	pid = $($el).attr('data-addtocart');
    } else {
        pid = $('.product-detail:not(".bundle-item")').data('pid');
    }

    return pid;
}

/**
 * Retrieves url to use when adding a product to the cart
 *
 * @return {string} - The provided URL to use when adding a product to the cart
 */
function getAddToCartUrl() {
    return $('.add-to-cart-url').val();
}

/**
 * Retrieves the bundle product item ID's for the Controller to replace bundle master product
 * items with their selected variants
 *
 * @return {string[]} - List of selected bundle product item ID's
 */
function getChildProducts() {
    var childProducts = [];
    $('.bundle-item').each(function () {
        childProducts.push({
            pid: $(this).find('.product-id').text(),
            quantity: parseInt($(this).find('label.quantity').data('quantity'), 10)
        });
    });

    return childProducts.length ? JSON.stringify(childProducts) : [];
}

/**
 * Retrieve contextual quantity selector
 * @param {jquery} $el - DOM container for the relevant quantity
 * @return {jquery} - quantity selector DOM container
 */
function getQuantitySelector($el) {
    var quantitySelected;
    if ($el.hasClass('btn-pairsWith')) {
        quantitySelected = $($el).closest('.pairs-body').find('.quantity-select-pairsWith');
    } else if ($el && $('.set-items').length) {
        quantitySelected = $($el).closest('.product-detail').find('.quantity-select');
    } else if ($el && $('.product-bundle').length) {
        var quantitySelectedModal = $($el).closest('.modal-footer').find('.quantity-select');
        var quantitySelectedPDP = $($el).closest('.bundle-footer').find('.quantity-select');
        if (quantitySelectedModal.val() === undefined) {
            quantitySelected = quantitySelectedPDP;
        } else {
            quantitySelected = quantitySelectedModal;
        }
    } else if($el.hasClass('add-minicart-empty-item')){
    	quantitySelected = $($el).closest('.empty-bag-item').find('.quantity-select-empty-item');
    }else {
        quantitySelected = $('.quantity-select');
    }
    return quantitySelected;
}

/**
 * Retrieves the value associated with the Quantity pull-down menu
 * @param {jquery} $el - DOM container for the relevant quantity
 * @return {string} - value found in the quantity input
 */
function getQuantitySelected($el) {
    return getQuantitySelector($el).val();
}

/**
 * Retrieve product options
 *
 * @param {jQuery} $productContainer - DOM element for current product
 * @return {string} - Product options and their selected values
 */
function getOptions($productContainer) {
    var options = $productContainer
        .find('.product-option')
        .map(function () {
            var $elOption = $(this).find('.options-select');
            var urlValue = $elOption.val();
            var selectedValueId = $elOption.find('option[value="' + urlValue + '"]')
                .data('value-id');
            return {
                optionId: $(this).data('option-id'),
                selectedValueId: selectedValueId
            };
        }).toArray();

    return JSON.stringify(options);
}

/**
 * Updates the Mini-Cart quantity value after the customer has pressed the "Add to Cart" button
 * @param {string} response - ajax response from clicking the add to cart button
 */
function handlePostCartAdd(response) {
    $('.minicart').trigger('count:update', response);

    // DataLayer addtocart
    if (!window.dataLayer) {
        window.dataLayer = [];
    }
    if (!response.error) {
        dataLayer.push({
            event: 'tatcha_add_to_cart',
            prodID: response.cart.items[0].id,
            prodName: response.cart.items[0].productName,
            prodPrice: response.cart.items[0].price.sales.formatted
        });
    }

    $('body').trigger('product:afterAddToCart', response);
}

/**
 * @function
 * @description Open minibag
 */
function showMinibag(){
    //RDMP-3633-hiding linc webchat
    $('#linc-web-chat-iframe').css('display', 'none');
    if(window.requestAnimationFrame){
        requestAnimationFrame(function(){
            $('.mini-bag').addClass("show-minibag");
            $('.mini-bag').removeClass("hide-minibag");
            // $('.sticky-add-to-bag').css("z-index","1010");
            // $('.add-to-bag-sticky-container').removeClass('sticky-add-to-bag');
            $('.minibag-mask').show();
            $('.loader-preventive').hide();
            $('#gladlyChat_container').attr('style','z-index:1000 !important');
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
        $('#gladlyChat_container').attr('style','z-index:1000 !important');
        // Send event to GTM
        if(window.dataLayer){
            try {
                dataLayer.push({'event': 'optimize.minibagactivated'});
            } catch(err) {}
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

/**
 * @function
 * @description Trap focus on mini bag when open for tab events
 */
function trapMiniBagFocus (){
    var container = document.querySelector("#minibag-container-wrap");
    container.addEventListener('keydown', focusElement);

    // Close mini bag
    $('.close-bag').on('keypress',function(e) {
        if(e.which == 13 || e.which == 32) {
            $(this).trigger("click");
        }
    });
}

// GTM change
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

baseMethod.selectBonusProduct = function () {
    $(document).on('click', '.select-bonus-product', function (e) {

        var $choiceOfBonusProduct = $(this).parents('.choice-of-bonus-product');
        var selectedItemNo = $('.select-bonus-product.active-btn').length;
        var pid = $(this).data('pid');
        var options = JSON.parse($('#bonus-product-list-options').attr('data-options'));
        var maxPids = options.maxItems;
        var addItem = false;
        if ($(this).hasClass('active-btn')) {
            $(this).removeClass('active-btn').removeClass('active');
            $(this).find('span').html('Add');
            $(this).attr('aria-checked',false);
            $('#selected-pid-' + pid).remove();
            selectedItemNo--;
            $('.select-bonus-product').removeClass('disabled');
        } else {
            if (selectedItemNo < maxPids) {
                $(this).addClass('active-btn');
                $(this).find('span').html('Selected');
                $(this).attr('aria-checked',true);
                addItem = true;
                selectedItemNo++;
            }
            if (selectedItemNo >= maxPids) {
                $('.select-bonus-product:not(.active-btn)').addClass('disabled');
            }
        }
        var submittedQty = 1;
        var totalQty = 0;
        if ($('#bonusModal .selected-bonus-products .selected-pid') && $('#bonusModal .selected-bonus-products .selected-pid').length > 0) {
            $.each($('#bagSampleModal .selected-bonus-products .selected-pid'), function () {
                totalQty += $(this).data('qty');
            });
        }

        $('#bonusModal .product-count, #gwpbonusModalMinicart .product-count').html(selectedItemNo + ' of ' + maxPids + ' selected');
        $('#gwpbonusModal .gwp-selected').html(selectedItemNo);

        // totalQty += submittedQty;
        var optionID = $choiceOfBonusProduct.find('.product-option').data('option-id');
        var valueId = $choiceOfBonusProduct.find('.options-select option:selected').data('valueId');
        if (totalQty <= maxPids) {
            var selectedPrds = [];
            $.each($('.select-bonus-product.active-btn'), function () {
                var pid = $(this).data('pid');
                var selectedBonusProductHtml = ''
                    + '<div class="selected-pid row d-none"'
                    + 'data-pid="' + pid + '"'
                    + 'id = "selected-pid-' + pid + '"'
                    + 'data-qty="' + submittedQty + '"'
                    + 'data-optionID="' + (optionID || '') + '"'
                    + 'data-option-selected-value="' + (valueId || '') + '"'
                    + '>'
                    + '<div class="col-sm-11 col-9 bonus-product-name" >'
                    + $choiceOfBonusProduct.find('.product-name').html()
                    + '</div>'
                    + '<div class="col-1"><i class="fa fa-times" aria-hidden="true"></i></div>'
                    + '</div>'
                ;
                selectedPrds.push(selectedBonusProductHtml);
            });

            ($(this).closest('.modal').find('.selected-bonus-products')).empty().append(selectedPrds);
            $('#gwpbonusModalMinicart .selected-bonus-products').empty().append(selectedPrds);
            // $('#bonusModal .selected-bonus-products, #gwpbonusModalMinicart .selected-bonus-products, #gwpbonusModal .selected-bonus-products').append(selectedBonusProductHtml);
            totalQty += submittedQty;

            $('.pre-cart-products').html('<span>' + totalQty + '</span> / <span>' + maxPids + '</span>');
            $('.selected-bonus-products .bonus-summary').removeClass('alert-danger');
        } else {
            $('.selected-bonus-products .bonus-summary').addClass('alert-danger');
        }
    });
};

baseMethod.addBonusProductsToCart = function () {
    $(document).on('click', '.add-bonus-products, .gwp-add-products', function (e) {

        var $readyToOrderBonusProducts = $('.selected-bonus-products .selected-pid');
        var queryString = '?pids=';
        var url = $('.add-bonus-products').data('url');
        var gwpPromoApply = $(this).hasClass('gwp-add-products');
        var pidsObject = {
            bonusProducts: []
        };

        $.each($readyToOrderBonusProducts, function () {
            var qtyOption =
                parseInt($(this)
                    .data('qty'), 10);

            var option = null;
            if (qtyOption > 0) {
                if ($(this).data('optionid') && $(this).data('option-selected-value')) {
                    option = {};
                    option.optionId = $(this).data('optionid');
                    option.productId = $(this).data('pid');
                    option.selectedValueId = $(this).data('option-selected-value');
                }
                pidsObject.bonusProducts.push({
                    pid: $(this).data('pid'),
                    qty: qtyOption,
                    options: [option]
                });
                pidsObject.totalQty = $('.samples-modal').data('total-qty');
            }
        });
        queryString += JSON.stringify(pidsObject);
        queryString = queryString + '&uuid=' + $('.samples-modal').data('uuid');
        if ($('.minicart.attribute-wrapper') && $('.minicart.attribute-wrapper').data('prod-lineitem-uuid') && $('.minicart.attribute-wrapper').data('prod-lineitem-uuid').length > 0) {
            queryString = queryString + '&pliuuid=' + $('.minicart.attribute-wrapper').data('prod-lineitem-uuid');
        } else if ($('.product-info.bonus-product-line-item') && $('.product-info.bonus-product-line-item').data('prod-lineitem-uuid')) {
            queryString = queryString + '&pliuuid=' + $('.product-info.bonus-product-line-item').data('prod-lineitem-uuid');
        } else {
            queryString = queryString + '&pliuuid=' + ($('.product-info').data('prod-lineitem-uuid') ? $('.product-info').data('prod-lineitem-uuid') : $('.product-item').data('product-line-item'));
        }

        $('.loader-preventive').show();
        $.ajax({
            url: url + queryString,
            method: 'POST',
            success: function (data) {
                // $('.loader-preventive').hide();
                if (data.error) {
                    $('.samples-modal').modal('hide');
                    setTimeout(function () {
                        $('.add-to-basket-alert').remove();
                        if ($('.container-fluid#cart-table').length > 0 || $('.checkout-page#maincontent').length > 0) {
                        	location.reload();
                        }else{
                        	$(document).trigger('show:minibag');
                        }
                    }, 3000);
                } else {
                    $('.configure-bonus-product-attributes').html(data);
                    $('.bonus-products-step2').removeClass('hidden-xl-down');
                    $('.samples-modal').modal('hide');
                    $('.sample-product-container').hide();
                    $('.minicart-quantity').html(data.totalQty);
                    if ($('.container-fluid#cart-table').length > 0 || $('.checkout-page#maincontent').length > 0) {
                        var editMode = $('#editMode').val();
                        if (editMode) {
                            sessionStorage.setItem('EditMode', editMode);
                        }
                        setTimeout(function () {
                            $('.add-to-basket-alert').remove();
                            location.reload();
                        }, 1500);
                    } else {
                        if (gwpPromoApply) {
                            $(document).trigger('show:minibag', ['promoAdd']);
                        } else {
                            $(document).trigger('show:minibag');
                        }
                        
                    }

                }
            },
            error: function () {
                $('.loader-preventive').hide();
            }
        });
    });

    $(document).ready(function(e){
        var $phoneEle = $('.confirm-phone');
        $phoneEle.each(function(index){
            $(this).html(util.formatUSPhoneNumber($(this).text().trim()));
        })
    });


    $(document).on('click', '.btn-pairsWith.add-to-cart, .add-minicart-empty-item', function (e) {
        var addToCartUrl;
        var pid;
        var pidsObj;
        var setPids;
        var productname = $(this).attr('data-productname');
        var source = $(this).attr('data-source');

        $('body').trigger('product:beforeAddToCart', this);

        if ($('.set-items').length && $(this).hasClass('add-to-cart-global')) {
            setPids = [];

            $('.product-detail').each(function () {
                if (!$(this).hasClass('product-set-detail')) {
                    setPids.push({
                        pid: $(this).find('.product-id').text(),
                        qty: $(this).find('.quantity-select').val(),
                        options: getOptions($(this))
                    });
                }
            });
            pidsObj = JSON.stringify(setPids);
        }

        pid = getPidValue($(this));

        var $productContainer = $(this).closest('.product-detail');
        if (!$productContainer.length) {
            $productContainer = $(this).closest('.quick-view-dialog').find('.product-detail');
        }

        addToCartUrl = getAddToCartUrl();

        var form = {
            pid: pid,
            pidsObj: pidsObj,
            childProducts: getChildProducts(),
            quantity: getQuantitySelected($(this))
        };
        var qty = getQuantitySelected($(this));
        if (!$('.bundle-item').length) {
            form.options = getOptions($productContainer);
        }

        $(this).trigger('updateAddToCartFormData', form);
        if (addToCartUrl) {
            $('.loader-preventive').show();
            $.ajax({
                url: addToCartUrl,
                method: 'POST',
                data: form,
                success: function (data) {
                    handlePostCartAdd(data);
                    //miniCartReportingUrl(data.reportingURL);
                    try {
                        var klaviyoAddtocartUrl;
                        form = {
                            pid: pid,
                            quantity: qty
                        };
                        if ($('#klaviyoAddToCartEventUrl') && $('#klaviyoAddToCartEventUrl').val()) {
                            klaviyoAddtocartUrl = $('#klaviyoAddToCartEventUrl').val();
                        }
                        $.ajax({
                            url: klaviyoAddtocartUrl,
                            method: 'POST',
                            data: form
                        });
                    } catch (err) {
                        var error = err;                                                              // eslint-disable-line
                    }
					if ($('.mini-bag').hasClass('show-minibag')) {
                		$(document).trigger('show:minibag');

                		//GTM change
                        sendMiniCartGlobalGA(pid,1,'',productname,source);

            		} else if ($('.container-fluid#cart-table').length > 0) {
                        location.reload();
                    }


                },
                error: function () {
                    $('.loader-preventive').hide();
                }
            });
        }
    });
};

module.exports = baseMethod;
