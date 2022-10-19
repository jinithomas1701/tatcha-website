'use strict';
var validator = require('./validator');
var loqate = require('./loqate');

var showLoader = function (container) {
	$('.loader-preventive').show();
};

var hideLoader = function (container) {
	$('.loader-preventive').hide();
};

/*
 * Show common checkout errors
 */
function showCommonError(message){
	$('.checkout-alert').text(message);
	$('.checkout-alert').show();
}

/*
 * Hide common checkout errors
 */
function hideCommonError(message){
	$('.checkout-alert').hide();	
}

/*
 * Form Reset 
 */
function resetForm(form){
	var formValidator = form.validate();
	formValidator.resetForm();
	form[0].reset();
	form.find('.has-error').removeClass('has-error');
	form.find('.has-state-error').removeClass('has-state-error');
	form.find('label.input--filled').removeClass('input--filled');
} 

/*
 * Ajax method to update container
 */
var updateContainer = function ($form,$endPoint,$method,$updateContainer, $callback){ 
	showLoader();
	hideCommonError();
	var params = {
    		url: $endPoint,
    		method: $method
        };
    if($form){
    	$.extend( params, {data: $($form).serialize()} );
     }

	$.ajax(params).done(function (response) {
	    $( $updateContainer ).html(response);
	    initSpC();
		if($callback && typeof $callback !== undefined) {
			$callback();
		}
		hideLoader();
	}).fail(function () {
		console.log('Failed updating '+$updateContainer);
	});
}

/*
 * Init Checkout listeners after AJAX
 */
var initSpC = function () {
	var x = window.matchMedia("(max-width: 767px)");
    if (x.matches) {
    	 $('.orderCollapse')
         .on('show.bs.collapse', function () {
             document
                 .getElementById("ordersummary")
                 .innerHTML = "CLOSE ORDER SUMMARY " + "<i class='fal fa-lg fa-angle-up'>"
         })
         .on('hide.bs.collapse', function () {
             document
                 .getElementById("ordersummary")
                 .innerHTML = "VIEW ORDER SUMMARY " + "<i class='fal fa-lg fa-angle-down'>";
         })

     $('.shipping-submit').click(function (event) {
         document
             .getElementById("contact-section-heading")
             .innerHTML = "1. Contact & Shipping " + "<i class='fal fa- fa-angle-down'>";
         $('#contactCollapse').collapse('hide');
     });

    }  else{
        $(".orderCollapseWrap").addClass('show');
    } 
    validator.init();
    loqate.initPCA();
    ajaxPostMessageHandler();
	
	$('[data-toggle="tooltip"]').tooltip();
}

/*
 * Handle Post AJAX actions
 */  
var ajaxPostMessageHandler = function () {
	var responseCode = $('#ajaxResponseCode').val();
	var responseMsg = $('#ajaxResponseMsg').val();
	
	if(responseCode && responseMsg) {  		
		switch (responseCode) {
		  case 'INVALID-LOGIN':
		    	$('#login-modal-error').text(responseMsg);			    	
			    $('#login-modal-error').show();
			    $('#loginModal').modal('show');
		    break;
		  case 'COUPON_APPLIED':
		    	$('.coupon-status').show();
		    	setTimeout(function(){
			    	$('.coupon-status').focus();		    		
		    	}, 2500);
			    break;
		  case  'AUTODELIVERY_ENABLED':
				$('.promocode-form').show('slow');
				$('.promocode-link').hide();
				$('.promocode-error .error-text').append(responseMsg);
				$('.promocode-error').show();
				setTimeout(function(){
					$('.promocode-error').focus();
				}, 2500);
				break;
		  case 'COUPON_INVALID':
	            $('.promocode-form').show('slow');
	            $('.promocode-link').hide();
			  	$('.promocode-error .error-text').append(responseMsg);			    	
		    	$('.promocode-error').show();
		    	setTimeout(function(){
			    	$('.promocode-error').focus();		    		
		    	}, 2500);
			    break;
		  case 'COUPON_GWP_APPLIED':
			  	$('.coupon-status').show();	  
	            $('.promocode-form').show('slow');
	            $('.promocode').val(responseMsg);	            
	        	$('#ajaxResponseCode').val('');
	        	$('#ajaxResponseMsg').val('');
	        	setTimeout(function(){
	        		$( ".edit-coupon" ).trigger( "click" );		    		
		    	}, 1500);
			    break;   
		  case 'INVALID-CREDITCARD':
			  $('#addCardModal').modal('show');	
			  setTimeout(function(){
				  $('#addCreditCardForm').find('#braintreeCreditCardErrorContainer').css("display", "block");
				  $('#addCreditCardForm').find('#braintreeCreditCardErrorContainer').html($('#ajaxResponseMsg').val()); 
			  }, 1000);

			  break;  			    
			    
		  default:
			  responseCode = '';
		  	  responseMsg = '';    		  	  
		}
		
	}

};

exports.updateContainer = updateContainer;
exports.initSpC = initSpC;
exports.ajaxPostMessageHandler = ajaxPostMessageHandler;
exports.showLoader = showLoader;
exports.hideLoader = hideLoader;
exports.showCommonError = showCommonError;
exports.hideCommonError = hideCommonError;
exports.resetForm = resetForm;