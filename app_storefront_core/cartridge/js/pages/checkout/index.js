'use strict';

var address = require('./address'),
    billing = require('./billing'),
    multiship = require('./multiship'),
    shipping = require('./shipping'),
    progress = require('../../progress'),
    account = require('../account');

/**
 * @function Initializes the page events depending on the checkout stage (shipping/billing)
 */
exports.init = function () {
	 account.initCartLogin();
	 account.init();

    address.init();
    if ($('.checkout-shipping-panel').length > 0) {
        shipping.init();
    } else if ($('.checkout-multi-shipping').length > 0) {
        multiship.init();
    } else {
        billing.init();
    }

    
    //if on the order review page and there are products that are not available diable the submit order button
    if ($('.order-summary-footer').length > 0) {
        if ($('.notavailable').length > 0) {
            $('.order-summary-footer .submit-order .button-fancy-large').attr('disabled', 'disabled');
        }
    }
    
    // show Summary on mobile until final step
    if ($('.checkout.summary-page').length > 0) {
		$('.panel.checkout-summary').removeClass('hidden-xs').removeClass('hidden-sm');
    }
    
    $('#chkInternationalDutiesNotification').on('click',function(){
		if($(this).is(':checked')){
			$('.btn-checkout-continue').removeAttr('disabled');
		}
		else{
			$('.btn-checkout-continue').attr('disabled','true');
		}
    });

    $('.checkout-review-edit').on('click',function(){
    	$('.loader-preventive').show();
    });
    
    
    
    $('.btn-primary.place-order').on('click', function(){
		if($(this).parents('form').valid()) {
			//$('.btn-primary.place-order').addClass('loading-btn');
			$('.loader-preventive').show();
		}
    });
    
    $(document).on('click', '.trigger-placeorder', function(){
    	//$('.trigger-placeorder').addClass('loading-btn');
		$('.place-order').trigger('click');
    });
    
    if($( "#gwpbonusModal" ).hasClass( "addBonusModalLink" )){
    	// load the url and show modal on success
    	$("#gwpbonusModal .modal-content").load($('#bonusproducturl').val(), function() {
    	     $("#gwpbonusModal").modal("show"); 
    	});
    }
    
    $('.checkout-account-options-block #dwfrm_profile_login_passwordconfirm').keypress(function(e) {
    	if($('.btn-primary.place-order').hasClass('loading-btn')) {
			$('.btn-primary.place-order').removeClass('loading-btn');
		}
    })
    
    $( document ).ready(function() {
    	$('#gwpbonusModal').on('hidden.bs.modal', function (e) {
    		if($(this).hasClass( "addBonusModalLink" )){
    			progress.show();
    			$('.promo-remove').trigger('click');
    		}
    		$('#gwpbonusModal').modal('hide');
	    });
    	
 
        
        $('.loader-content').hide();

        
    	
    });
    
  };
