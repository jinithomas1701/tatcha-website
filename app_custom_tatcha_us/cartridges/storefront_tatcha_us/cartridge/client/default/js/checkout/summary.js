'use strict';

var summaryHelpers = require('base/checkout/summary');

/**
 * updates the totals tax
 * @param {Array} totals - the totals data
 */
summaryHelpers.updateTaxTBD = function (totals) {
    if(($('.data-checkout-stage') && document.getElementById('checkout-main').getAttribute('data-checkout-stage') === 'shipping') || window.location.href.indexOf('shipping') > -1 ){
        $('.order-tax').empty().append('Estimated Tax');
        $('.tax-total').empty().append('TBD');
    }else{
        $('.tax-total').empty().append(totals.totalTax);
        $('.order-tax').empty().append('Tax');
    }
}

/**
 * updates the order product shipping summary for an order model
 * @param {Object} order - the order model
 */
summaryHelpers.updateOrderProductSummaryInformation = function (order) {
    var $productSummary = $('<div />');
    order.shipping.forEach(function (shipping) {
        shipping.productLineItems.items.forEach(function (lineItem) {
            var pli;
            if (lineItem.id === 'TATCHA-GIFTWRAP') {
                var tmpl = $('#duplicate-product-sec').clone();
                $('.product-img', tmpl)
                .attr('src', lineItem.images.large[0].url);
                $('.product-name', tmpl)
                .text(lineItem.productName);
	                if(lineItem.proratedPrice && ((lineItem.price.sales.value * lineItem.quantity) > lineItem.proratedPrice)){
		    			var pricehtml= '<span class="price-unadjusted stike">'
	                                	+ lineItem.priceTotal.price
	                                	+ '</span> <div> $'+lineItem.proratedPrice.toFixed(2)+'</div>';
	               		$('.price', tmpl).append(pricehtml);
		        	}else{
	               		$('.price', tmpl).text(lineItem.price.sales.formatted);
		    		}
	    		 $('.price', tmpl).addClass(lineItem.UUID);
	    		 pli = tmpl.html();
            } else {
                pli = $('[data-product-line-item=' + lineItem.UUID + ']');
            }
            $productSummary.append(pli);
        });

        var address = shipping.shippingAddress || {};
        var selectedMethod = shipping.selectedShippingMethod;

        var nameLine = address.firstName ? address.firstName + ' ' : '';
        if (address.lastName) nameLine += address.lastName;

        var address1Line = address.address1;
        var address2Line = address.address2;

        var phoneLine = address.phone;

        var shippingCost = selectedMethod ? selectedMethod.shippingCost : '';
        var methodNameLine = selectedMethod ? selectedMethod.displayName : '';
        var methodArrivalTime = selectedMethod && selectedMethod.estimatedArrivalTime
            ? '( ' + selectedMethod.estimatedArrivalTime + ' )'
            : '';

        var tmpl = $('#pli-shipping-summary-template').clone();

        if (shipping.productLineItems.items && shipping.productLineItems.items.length > 1) {
            $('h5 > span').text(' - ' + shipping.productLineItems.items.length + ' '
                + order.resources.items);
        } else {
            $('h5 > span').text('');
        }

        var stateRequiredAttr = $('#shippingState').attr('required');
        var isRequired = stateRequiredAttr !== undefined && stateRequiredAttr !== false;
        var stateExists = (shipping.shippingAddress && shipping.shippingAddress.stateCode)
            ? shipping.shippingAddress.stateCode
            : false;
        var stateBoolean = false;
        if ((isRequired && stateExists) || (!isRequired)) {
            stateBoolean = true;
        }

        var shippingForm = $('.multi-shipping input[name="shipmentUUID"][value="' + shipping.UUID + '"]').parent();

        if (shipping.shippingAddress
            && shipping.shippingAddress.firstName
            && shipping.shippingAddress.address1
            && shipping.shippingAddress.city
            && stateBoolean
            && shipping.shippingAddress.countryCode
            && (shipping.shippingAddress.phone || shipping.productLineItems.items[0].fromStoreId)) {
            $('.ship-to-name', tmpl).text(nameLine);
            $('.ship-to-address1', tmpl).text(address1Line);
            $('.ship-to-address2', tmpl).text(address2Line);
            $('.ship-to-city', tmpl).text(address.city);
            if (address.stateCode) {
                $('.ship-to-st', tmpl).text(address.stateCode);
            }
            $('.ship-to-zip', tmpl).text(address.postalCode);
            $('.ship-to-phone', tmpl).text(phoneLine);

            if (!address2Line) {
                $('.ship-to-address2', tmpl).hide();
            }

            if (!phoneLine) {
                $('.ship-to-phone', tmpl).hide();
            }

            shippingForm.find('.ship-to-message').text('');
        } else {
            shippingForm.find('.ship-to-message').text(order.resources.addressIncomplete);
        }

        if (shipping.isGift) {
            $('.gift-message-summary', tmpl).text("<i>"+shipping.giftMessage+"</i>");
        } else {
            $('.gift-summary', tmpl).addClass('d-none');
        }

        // checking h5 title shipping to or pickup
        var $shippingAddressLabel = $('.shipping-header-text', tmpl);
        $('body').trigger('shipping:updateAddressLabelText',
            { selectedShippingMethod: selectedMethod, resources: order.resources, shippingAddressLabel: $shippingAddressLabel });

        if (shipping.selectedShippingMethod) {
            $('.display-name', tmpl).text(methodNameLine);
            $('.arrival-time', tmpl).text(methodArrivalTime);
            $('.price', tmpl).text(shippingCost);
        }

        var $shippingSummary = $('<div class="multi-shipping" data-shipment-summary="'
            + shipping.UUID + '" />');
       /* $shippingSummary.html(tmpl.html());
        $productSummary.append($shippingSummary);*/
    });

    if (order.giftCertificateItems) {
		order.giftCertificateItems.forEach(function (giftCertificateItem) {
	        $productSummary.append($('[data-product-line-item=' + giftCertificateItem.lineItem.UUID + ']'));
	    });
	}

    $('.product-summary-block').html($productSummary.html());

    // Also update the line item prices, as they might have been altered
    $('.grand-total-price').text(order.totals.subTotal);
    order.items.items.forEach(function (item) {
        if (item.priceTotal && item.priceTotal.renderedPrice) {
            $('.item-total-' + item.UUID).empty().append(item.priceTotal.renderedPrice);
        }
    });
}

/**
 * updates the totals summary
 * @param {Array} totals - the totals data
 */
summaryHelpers.updateTotals = function (totals) {
    var shippingTotal = '';
    if (totals.getShippingPrices && totals.getShippingPrices.shippingTotalPrice != 0 && totals.getShippingPrices.adjustedShippingTotalPrice != 0) {
        shippingTotal = totals.getShippingPrices.shippingTotalPriceFormatted;
        if (totals.getShippingPrices.shippingTotalPrice != totals.getShippingPrices.adjustedShippingTotalPrice) {
            shippingTotal = totals.getShippingPrices.shippingTotalPriceFormatted + '(' + totals.getShippingPrices.adjustedShippingTotalPriceFormatted +')';
        }
    } else {
        shippingTotal = 'Free';
    }
    $('.shipping-total-cost').text(shippingTotal);
    $('.tax-total').text(totals.totalTax);
    $('.sub-total').text(totals.subTotal);
    $('.grand-total-sum').text(totals.grandTotal);

    if (totals.orderLevelDiscountTotal.value > 0) {
        $('.order-discount').removeClass('hide-order-discount');
        $('.order-discount-total').text('- ' + totals.orderLevelDiscountTotal.formatted);
    } else {
        $('.order-discount').addClass('hide-order-discount');
    }

    if (totals.shippingLevelDiscountTotal.value > 0) {
        $('.shipping-discount').removeClass('hide-shipping-discount');
        $('.shipping-discount-total').text('- ' +
            totals.shippingLevelDiscountTotal.formatted);
    } else {
        $('.shipping-discount').addClass('hide-shipping-discount');
    }
	$('.order-summary-heading .order-count').text(totals.grandTotal);
                                    
}

/**
 * updates the product level price based on promo 
 * @param {Array} items - the product lineitem data
 */
summaryHelpers.updateProductDiscountPrice = function (items) {
	    items.forEach(function (item) {
	     if(item.proratedPrice && ((item.price.sales.value * item.quantity) > item.proratedPrice)){
	    
    			var pricehtml= '<span class="price-unadjusted stike">'
                                + item.priceTotal.price
                                + '</span>';
                $('.product-line-item .'+item.UUID).empty().append(pricehtml);
                $('.product-line-item .'+item.UUID).append('<div>$'+item.proratedPrice.toFixed(2)+'</div>');
	        }else if(!item.isBonusProductLineItem){
	           $('.product-line-item .'+item.UUID).empty().append(item.priceTotal.price);
	    	}else{
	    		$('.product-line-item .'+item.UUID).empty().append('Free');
	    	}
	    });
                                    
}

module.exports = summaryHelpers;
