'use strict';

var addProductToCart = require('./product/addToCart'),
    page = require('../page'),
    login = require('../login'),
    util = require('../util'),
    progress = require('../progress');

$(document).on('click','.wishlist-more', function() {
	var api_url = $(this).attr('data-api-url');
	progress.show();
	$.ajax({
        type: 'GET',
        url: api_url,
        success: function (response) {
            // put response into cache
        	$( ".wishlist-more-container" ).remove();
            $('.wishlist-container').append(response);
            progress.hide();
        }
    });
});

$(document).on('click', '.delete-wishlist-item', function(e) {
	if($('.wishlist-product-container').length > 1) {
		e.preventDefault();
	}
	
	$(this).tooltip('hide');
	
	var wishlist_url = $(this).attr('data-api-url');
	var pid = $(this).attr('data-pid');
	var that = this;
	progress.show();
	$.ajax({
        type: 'GET',
        url: util.ajaxUrl(wishlist_url),
        success:function(response) {
			var pname = $(that).attr('data-pname');
			$('#wishlist-remove-notification').text('Product ' + pname + ' is removed from wishlist');
			$('#wishlist-remove-notification').focus();
			
        	$("#"+pid).remove();
        	progress.hide();
			
				
        }
    });
});

exports.init = function () {
    addProductToCart();
    $('#editAddress').on('change', function () {
        page.redirect(util.appendParamToURL(Urls.wishlistAddress, 'AddressID', $(this).val()));
    });

    //add js logic to remove the , from the qty feild to pass regex expression on client side
    $('.option-quantity-desired input').on('focusout', function () {
        $(this).val($(this).val().replace(',', ''));
    });
    
    $('.copyText').on('click', function(){
    	var target = $(this).data('target');
    	$(target).select();
    	document.execCommand("copy");
    })

    login.init();

};
