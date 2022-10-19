'use strict';
var validator = require('./validator');
var util = require('./util');
var loqate = require('./loqate');
var shipping = require('./shipping');
//general extension functions
(function () {
  String.format = function () {
      var s = arguments[0];
      var i, len = arguments.length - 1;
      for (i = 0; i < len; i++) {
          var reg = new RegExp('\\{' + i + '\\}', 'gm');
          s = s.replace(reg, arguments[i + 1]);
      }
      return s;
  };
})();

var initSPCheckout =  function () {
    $(document).ready(function () {

    	//Init single page function call
        util.initSpC();
    	
        //Iphone input stop zooming in  
        
    	var $objHead = $( 'head' );
    	// define a function to disable zooming
    	var zoomDisable = function() {
    	    $objHead.find( 'meta[name=viewport]' ).remove();
    	    $objHead.prepend( '<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=0" />' );
    	};
    	// ... and another to re-enable it
    	var zoomEnable = function() {
    	    $objHead.find( 'meta[name=viewport]' ).remove();
    	    $objHead.prepend( '<meta name="viewport" content="width=device-width, initial-scale=1.0" />');
    	};

    	// if the device is an iProduct, apply the fix whenever the users touches an input
    	if( navigator.userAgent.length && /iPhone|iPad|iPod/i.test( navigator.userAgent ) ) {
    	    // define as many target fields as your like 
    	    $( "input,select" )
    	        .on( { 'touchstart' : function() { zoomDisable() } } )
    	        .on( { 'touchend' : function() { setTimeout( zoomEnable , 500 ) } } );
    	 }	
           
        // Prototype listeners
        var validated = {};
        
		var currURL = window.location.href;
        if(currURL.indexOf('checkoutState=shipping') > -1 && currURL.indexOf('checkoutMode=edit') > -1) {
            $(".enter-address-link").hide();  
        	$("#addressCollapse").addClass("show");
        }
    	
        // Init loqate Address form
        loqate.initPCAAddressForm();
  	  
  	   $('#checkout-container').on('click', "#internationalDutiesNotification", function(event){
  		 	if($(this).is(':checked') && !$('.review-submit').hasClass('hasADItems')){
  				$('.review-submit').removeClass('disabled');
				$('.review-submit').attr('disabled', false);
  		 	} else{
  				$('.review-submit').addClass('disabled');
				$('.review-submit').attr('disabled', true);
  			}
      	});
      
  	   
	   /*
	    * Shipping Section listeners
	    */

      	shipping.initShippingListeners();
		
		/**
		* Initialize billing address when billing/payment section is visible on page
		**/	
		
		var spcCurrentState = $('#spcCurrentState').length > 0 ? $('#spcCurrentState').val().trim(): '';
		if(spcCurrentState.length > 0 && spcCurrentState === 'billing') {
			resetBillingStateField();
			loqate.initBillingLoqateForm();
		}
		
		// show enter address manually link when we open add address modal
		$('#addressModal').on('shown.bs.modal',  function () {
			var country = $("#addressmodal-country").val();
        	if(country == 'US' && $('#checkout-container #addressmodal-stateText:visible')){
        		$('#checkout-container #addressmodal-state').attr('name', 'dwfrm_profile_address_states_state');
        		$('#checkout-container #addressmodal-stateNonUS').attr('name', '');
				$('#checkout-container #addressmodal-stateText').attr('name', '');
				$('#checkout-container #addressmodal-state').attr('required', true);
				$('#checkout-container #addressmodal-stateNonUS').removeAttr('required');
				$('#checkout-container #addressmodal-stateText').removeAttr('required');
				$('#checkout-container #addressmodal-stateText').hide();
				$('#checkout-container #addressmodal-stateNonUS').hide();
				$('#checkout-container #addressmodal-state').show();
        	} else if(country == 'CA' && $('#checkout-container #addressmodal-stateText:visible')){
        		$('#checkout-container #addressmodal-stateNonUS').attr('name', 'dwfrm_profile_address_states_state');
        		$('#checkout-container #addressmodal-state').attr('name', '');
				$('#checkout-container #addressmodal-stateText').attr('name', '');
				$('#checkout-container #addressmodal-stateNonUS').attr('required', true);
				$('#checkout-container #addressmodal-state').removeAttr('required');
				$('#checkout-container #addressmodal-stateText').removeAttr('required');
				$('#checkout-container #addressmodal-state').hide();
				$('#checkout-container #addressmodal-stateText').hide();
				$('#checkout-container #addressmodal-stateNonUS').show();
        	} 
			  $('#addaddressModalCollapseLink').show();
			  $('.enter-addaddress-link').show();
			  if($('#addressModal-mode').val() == 'edit'){
				  $('#addaddressModalCollapseLink').hide();
			  }
		});
		
		$("#guestEmail").focusout(function(){
			if($('#guestEmail').valid()) {
				$("#dwfrm_login input[name=dwfrm_login_username]").val($('#guestEmail').val());
			}
			if($('#guestEmail').val()=='') {
				$("#dwfrm_login input[name=dwfrm_login_username]").val('');
			}
		});
		
		//to make address modal scrollable, after closing the suggestion modal
		$("#addressSuggestionModal").on("hidden.bs.modal", function () {
			if($('#addressModal').is(':visible')){
			    $('.tatcha-standard').addClass('modal-open');				
			}
		});
		
		//Login modal close handle
		$("#loginModal").on("hidden.bs.modal", function () {
		    $('#login-modal-error').html('');
            $('#login-modal-error').hide();
		});
		
		//Login modal open handle
		$("#loginModal").on("show.bs.modal", function () {
			trapLoginModalFocus();
		});
      
		// Trap focus on login modal when open for tab events
		var trapLoginModalFocus = function () {
			var container = document.querySelector("#loginModal");
			container.addEventListener('keydown', focusElementLogin);
		    
		    // Close login modal
			$('.close-bag').on('keypress',function(e) {
			    if(e.which == 13 || e.which == 32) {
			    	$(this).trigger("click");
			    }
			});
		}

		var focusElementLogin = function (e) {
			var container = document.querySelector("#loginModal");
			var focusableEls = container.querySelectorAll('h4, a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled])');
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
		
		//promocode button state events
		
		$(document).on('keydown', '.promocode-form input', function(e){
            $(this).val() ? $('.promo-button').removeAttr("disabled") : $('.promo-button').attr("disabled",'disabled')
		});
		
		$(document).on('blur', '.promocode-form input', function(e){
	        $(this).val() ? $('.promo-button').removeAttr("disabled") : $('.promo-button').attr("disabled",'disabled')
		});
		
		$(document).on('keyup', '.promocode-form input', function(e){
			$(this).val() ? $('.promo-button').removeAttr("disabled") : $('.promo-button').attr("disabled",'disabled')
		});
		
		$(document).on('paste onpaste', '.promocode-form input', function(e){
			$('.promo-button').removeAttr("disabled");
		});
		
		/**
		* Handle login JSON response
		* @input JSON response from login service
		**/
		
		function handleLoginRes(res) {
			var resp = res;
			if(typeof resp === 'string') {
				resp = JSON.parse(resp);
			}
			if(resp.status == 'success'){
				if(resp.redirectUrl) {
					 window.location.assign(resp.redirectUrl);
                    return;
                }
			}
			if(typeof resp == "undefined" || !resp ) {
                location.reload();
                return;
            }

			if(resp.status == 'error') {
                if (SitePreferences.MPARTICLE_ENABLED) {
                	window.mParticle.logError('Login failed');
                }
				if(resp.errorMsg) {
                    $('#login-modal-error').html(resp.errorMsg);
                    $('#login-modal-error').attr('role','alert');
                    $('#login-modal-error').show();
					$('#loginModal').modal('show');
					$('#dwfrm_login_username').focus();
                } else {
                    location.reload();
                    return;
                }
			}
			util.hideLoader();
			
		}
		
        /*
         * Shipping Login Modal
         */
        
        $('#checkout-container').on('click', "#login-btn", function(event){
        	
			event.preventDefault();
        	// Validate 
        	validator.init();
        	var formValidator = $("#dwfrm_login").validate()
        	if(!formValidator.form()){
        		return false;
        	}
        	$('#login-modal-error').removeAttr('role');
            $('#login-modal-error').hide();
            //removed captcha 
        	updateSection('#dwfrm_login',$('#dwfrm_login').attr('action'),'POST','#checkout-container', function (res) {
				handleLoginRes(res);
			}, true);
           
        })
        
        /**
		* Based on device, determine where to show the order summary section
		*
		**/
		function getOrderSummaryContainer() {
			var orderSummaryContainer = '#order-summary-desktop';
			var isMobileContainerVisible  = $('#order-summary-mob-container').is(':visible');
			var isDesktopContainer = $('#order-summary-desktop-container').is(':visible');

			if(isMobileContainerVisible && !isDesktopContainer) {
				orderSummaryContainer = '#order-summary-mob';
			} else if (!isMobileContainerVisible && isDesktopContainer) {
				orderSummaryContainer = '#order-summary-desktop';
			}
			return orderSummaryContainer;
		} 
        
        /*
         * Facebook Shipping Login Modal
         */
        $('#checkout-container').on('click', ".fb-loginbtn", function(event){
	    	$('#dwfrm_oauthlogin .btn-facebook').trigger('click');
	    });
        
        /*
         * Saved Shipping Address Radio selector
         * 
         */
        $('#checkout-container').on('change', 'input[type=radio][name=dwfrm_singleshipping_addressList]', function(event){
        	// Set the form with new values
        	var selectedAddress = $(this).data('address'); 
        	var $form = $('.savedaddress');
        	$form.find('[name$="_addressFields_firstName"]').val(selectedAddress.firstName);
        	$form.find('[name$="_addressFields_lastName"]').val(selectedAddress.lastName);
        	$form.find('[name$="_addressFields_address1"]').val(selectedAddress.address1);
        	$form.find('[name$="_addressFields_address2"]').val((selectedAddress.address2)?selectedAddress.address2:'');
        	$form.find('[name$="_addressFields_country"]').val(selectedAddress.countryCode);
        	$form.find('[name$="_addressFields_states_state"]').val(selectedAddress.stateCode);
        	$form.find('[name$="_addressFields_postal"]').val(selectedAddress.postalCode);
        	$form.find('[name$="_addressFields_city"]').val(selectedAddress.city);
        	$form.find('[name$="_addressFields_phone"]').val(selectedAddress.phone);
        	$form.find('[name$="_addressFields_id"]').val(selectedAddress.ID);
        	var url = shipping.getShippingMethodURL();
        	
        	$( "#shipping-methods" ).load( url, function() {
        		var url = shipping.getShippingMethodURL($( "input[name=shippingMethod]:first" ).val());
        		var summaryContainer = getOrderSummaryContainer();
        		updateSection('',url,'GET', summaryContainer); 
        	});
        });
        
        /*
         * Shipping Methods Listeners
         */
        $('#checkout-container').on('change', 'input[name=shippingMethod]', function(){
            if ($(this).is(':checked')) {
            	var shippingMethodID = $(this).val();
            	$(".shipping-selector-radio[aria-checked='true']").attr('aria-checked',false);
            	$(this.nextElementSibling).attr('aria-checked', true);
            	if(shippingMethodID) {
            		$('#mobile-shipping-method-'+shippingMethodID).attr('checked', true);
            		var isShippingOnlyPage=false;
            		if($('#shippingOnlyFlag').length > 0) {
        				isShippingOnlyPage=true;
        			}
					var containerForm = $('input[name=shippingMethod]').closest('form').attr('id');
                	var url = shipping.getShippingMethodURL(shippingMethodID,isShippingOnlyPage, containerForm);
                	var summaryContainer = getOrderSummaryContainer();
                	updateSection('',url,'GET', summaryContainer);             	
            	}

            }
        })
        
        $('#checkout-container').on('change', 'input[name=mobile-shippingMethod]', function(){
            if ($(this).is(':checked')) {
            	var shippingMethodID = $(this).val();
            	if(shippingMethodID) {
            		$('#'+shippingMethodID).attr('checked', true);
            		var isShippingOnlyPage=false;
            		if($('#shippingOnlyFlag').length > 0) {
        				isShippingOnlyPage=true;
        			}
					var containerForm = $('input[name=shippingMethod]').closest('form').attr('id');
                	var url = shipping.getShippingMethodURL(shippingMethodID,isShippingOnlyPage, containerForm);
                	var summaryContainer = getOrderSummaryContainer();
                	updateSection('',url,'GET', summaryContainer);             	
            	}

            }
        })
        
        /*
         * Shipping Gift Wrap and Message
         */
        
         $('#checkout-container').on('click', '.modal-tatcha-gift-message-save', function(e){        	 
        	 var form  = $('#giftmsg-form');
        	 var giftMessage = form.find('textarea').val();
			 var isGiftWrpChecked = $("#giftwrap-toggle-bs").is(":checked");
        	 if(!isGiftWrpChecked && ((giftMessage.includes("<script") 
        				|| (giftMessage.length > 0 && giftMessage.replace(/\s/g, '').length<=0)))) {
        		 $('.special-character-validation').show();
        		 $('.form-control giftmessage border rounded').addClass('has-error'); 
        		 e.preventDefault(); 
        	 } else {
        		 var summaryContainer = getOrderSummaryContainer();
        		 updateSection('#giftmsg-form',$('#giftmsg-form').attr('action'),'GET', summaryContainer,function(){
                  	if(($('#giftwrap-toggle-bs:checked').length == 0) && ($('.modal-tatcha-gift-message .giftmessage').val() == '')){
                	  $('.add-link').html('<u>Add</u>');
                	  $('.delivery-container .gift-message-container').hide();
                  }else if($('.modal-tatcha-gift-message .giftmessage').val() == ''){
                	  $('.delivery-container .gift-message-container').hide();
                  } else {
                	  $('.add-link').html('<u>Edit</u>');
                	  if(giftMessage!='') {
						$('.gift-message-container').show();
						$('.gift-message-container').find($('.message')).text(giftMessage);
                	  }
                  }
                 });
             	$('#giftMessageModal').modal('hide');
        	 } 	 
         });
        
        $('#checkout-container').on('click', '.close-message', function(){        	 
        	util.showLoader();
        	util.hideCommonError();
         	var url = $("#removeGiftMessageFromCheckoutUrl").val();     	
         	$.ajax({
    			type: 'GET',
    			url: url,
    			data: {
    				"scope" : "shipping"
    			},
    			success:function(res) {
    				$('.add-link').html('<u>Add</u>'); 
    				$('.gift-message-container').find($('.message')).text('');
    				$('#giftmsg-form').find($('#giftMessage')).val('');
    				$('.gift-message-container').hide();
    				util.hideLoader();
    			} 
    		 });
    	 });

         
        /*
         * Shipping Form Submit
         */

        $('#checkout-container').on('click', '.shipping-submit', function(){        	
        	
        	// Set the form with selected address from the list
        	var selectedAddress = $('#dwfrm_singleshipping_shippingAddress input[name=dwfrm_singleshipping_addressList]:checked').data('address');
        	if(selectedAddress){
        		var $form = $('.savedaddress');
            	$form.find('[name$="_addressFields_firstName"]').val(selectedAddress.firstName);
            	$form.find('[name$="_addressFields_lastName"]').val(selectedAddress.lastName);
            	$form.find('[name$="_addressFields_address1"]').val(selectedAddress.address1);
            	$form.find('[name$="_addressFields_address2"]').val((selectedAddress.address2)?selectedAddress.address2:'');
            	$form.find('[name$="_addressFields_country"]').val(selectedAddress.countryCode);
            	$form.find('[name$="_addressFields_states_state"]').val(selectedAddress.stateCode);
            	$form.find('[name$="_addressFields_postal"]').val(selectedAddress.postalCode);
            	$form.find('[name$="_addressFields_city"]').val(selectedAddress.city);
            	$form.find('[name$="_addressFields_phone"]').val(selectedAddress.phone);
            	$form.find('[name$="_addressFields_id"]').val(selectedAddress.ID);
        	}
        	
        	// Validate 
        	validator.init();
			util.showLoader();
        	var formValidator = $("#dwfrm_singleshipping_shippingAddress").validate()
        	if(!formValidator.form()){
        		$(".enter-address-link").hide();  
        		$("#addressCollapse").addClass("show");
				util.hideLoader();
        		return false;
        	}     	

        	var country = $("#country").val();
        	var stateSelected = '';
        	if(country == 'US'){
        		stateSelected = $("#state").val();
        	} else {
        		if(country == 'CA'){
        			stateSelected = $("#stateNonUS").val();
        		}else{
        			stateSelected = $("#stateText").val();
        		}
        	}
        	var customeremail= $("#guestEmail").val();
        	var shippingMethodSelected = $("input[type='radio'][name='shippingMethod']:checked").val();
			var zipcode = $("input[type='text'][name='postalCode']").val();
			$(".postalcodeField").val(zipcode);
        	$("#dwfrm_singleshipping_shippingAddress_addressFields_country").val(country);
        	$("#dwfrm_singleshipping_shippingAddress_addressFields_states_state").val(stateSelected);
        	$("#customeremail").val(customeremail);         	
        	$("#dwfrm_singleshipping_shippingAddress_shippingMethodID").val(shippingMethodSelected);

        	// Address verification
        	if((country == 'US') && ($('#loqateVerificationEnabled').length > 0)){        		
    			loqate.validateAddress({
	    			"Address1": $("input[name='dwfrm_singleshipping_shippingAddress_addressFields_address1']").val(),
	    			"Address2": $("input[name='dwfrm_singleshipping_shippingAddress_addressFields_address2']").val(),
	    			"Country": $('#country').val(),
	    			"PostalCode": $("input[name='dwfrm_singleshipping_shippingAddress_addressFields_postal']").val(),
	    			"State": $('#state').val(),
	    			"City": $("input[name='dwfrm_singleshipping_shippingAddress_addressFields_city']").val()
        		}).then(function(res) {
    				if(res.length > 0) {
    					$('#addressOriginForm').val('');
    					$(res).modal('show');
						util.hideLoader();
    					return false;
    				} else {
    					shipping.submitShippingForm();
    				}
    			})        		
        	} else {
        		shipping.submitShippingForm();
        	}

         	

        });

		$('#checkout-container').on('click', '.shipping-giftcardonly-submit', function() {
			util.showLoader();
			util.hideCommonError();
			
			validator.init();
        	var formValidator = $("#shippingUpdateCustomerEmail").validate()
        	if(!formValidator.form()){
				util.hideLoader();
        		return false;
        	} 

			$('#checkout-container #shippingUpdateCustomerEmail').submit();
		})
        
        
        
        /*
         * Shipping add address
         */

		$('#addressmodal-state').focusin(function() {
			var form = $('form[name="dwfrm_profile_address"]');
			form.find('[name$="_address_states_state"]').parents('.form-group').removeClass('has-state-error');
		}) 
        
         $('#checkout-container').on('click', '.add-shipping-address', function(){   
	
			if($('#addressmodal-state').find(":selected").text() == 'Select State...'){
				var form = $('form[name="dwfrm_profile_address"]');
				form.find('[name$="_address_states_state"]').parents('.form-group').addClass('has-state-error');
			} 
	
			if($('#addressmodal-stateNonUS').find(":selected").text() == 'Select State...'){
				var form = $('form[name="dwfrm_profile_address"]');
				form.find('[name$="_address_states_state"]').parents('.form-group').addClass('has-state-error');
			}
			
			var country = $("#addressmodal-country").val();
        	if(country == 'US'){
        		$('#checkout-container #addressmodal-state').attr('name', 'dwfrm_profile_address_states_state');
				$('#checkout-container #addressmodal-stateText').attr('name', '');
				$('#checkout-container #addressmodal-stateNonUS').attr('name', '');
				$('#checkout-container #addressmodal-state').attr('required', true);
				$('#checkout-container #addressmodal-stateNonUS').removeAttr('required');
				$('#checkout-container #addressmodal-stateText').removeAttr('required');
        	} else {
        		if(country == 'CA'){
        			$('#checkout-container #addressmodal-stateNonUS').attr('name', 'dwfrm_profile_address_states_state');
        			$('#checkout-container #addressmodal-state').attr('name', '');
    				$('#checkout-container #addressmodal-stateText').attr('name', '');
    				$('#checkout-container #addressmodal-stateNonUS').attr('required', true);
    				$('#checkout-container #addressmodal-state').removeAttr('required');
    				$('#checkout-container #addressmodal-stateText').removeAttr('required');
        		}else{
        			$('#checkout-container #addressmodal-stateText').attr('name', 'dwfrm_profile_address_states_state');
    				$('#checkout-container #addressmodal-state').attr('name', ''); 
    				$('#checkout-container #addressmodal-stateNonUS').attr('name', '');  
    				$('#checkout-container #addressmodal-state').removeAttr('required');
    				$('#checkout-container #addressmodal-stateNonUS').removeAttr('required');
    				$('#checkout-container #addressmodal-state').removeClass('required');
    				$('#checkout-container #addressmodal-stateNonUS').removeClass('required');
    				$('#checkout-container #addressmodal-stateText').attr('required', true);
        		}
        	}
 		
        	var formValidator = $("#dwfrm_profile_address").validate()
        	if(!formValidator.form()){
        		$(".enter-addaddress-link").hide();  
        		$("#addaddressModalCollapse").addClass("show");
        		return false;
        	}

			
        	
        	if($('#dwfrm_profile_address_addressdefault:checked').length > 0 ){
        		$('#dwfrm_profile_address_addressdefault').attr('value', true); 
        	}  
        	
        	if($('#addressModal-mode').val() == 'edit') {
        		$('#addressmodal-action').attr('name', 'dwfrm_profile_address_edit');
        	} else {
        		$('#addressmodal-action').attr('name', 'dwfrm_profile_address_create');
        	}
        	
        	// Address verification
        	if((country == 'US') && ($('#loqateVerificationEnabled').length > 0)){
    			loqate.validateAddress({
	    			"Address1": $('#dwfrm_profile_address_address1').val(),
	    			"Address2": $('#dwfrm_profile_address_address2').val(),
	    			"Country": $('#addressmodal-country').val(),
	    			"PostalCode": $('#dwfrm_profile_address_postal').val(),
	    			"State": $('#addressmodal-state').val(),
	    			"City": $('#dwfrm_profile_address_city').val()
        		}).then(function(res) {

    				if(res.length > 0) {
    					$('#addressOriginForm').val('address-modal');
    					$(res).modal('show');
    					return false;
    				} else {
    		        	updateSection('#dwfrm_profile_address',$('#dwfrm_profile_address').attr('action'),'POST','#checkout-container', function() {
							window.initbraintreeSG();
						});
    		        	$('#addressModal').modal('hide');
    				}
    			})        		
        	} else {
	        	updateSection('#dwfrm_profile_address',$('#dwfrm_profile_address').attr('action'),'POST','#checkout-container', function() {
					window.initbraintreeSG();
				});
	        	$('#addressModal').modal('hide');
        	}
        	

        }); 

        
        /*
         * Shipping remove address
         */
        
        $('#checkout-container').on('click', '.remove-shipping-address', function(){   

        	if($(this).data('address-id')){
        		var url = Urls.deleteAddress+'?AddressID='+$(this).data('address-id')+'&format=spcheckout';
        		updateSection('',url,'GET','#checkout-container', function() {
					window.initbraintreeSG();
				}); 

        	}
        }); 
        
        /*
         * Shipping edit address
         */        
        $('#checkout-container').on('click', '.edit-shipping-address', function(){   

        	if($(this).data('address-id')){
        		$('#dwfrm_profile_address_addressid').val($(this).data('address').ID);
        		$('#dwfrm_profile_address_firstname').val($(this).data('address').firstName);
        		$('#dwfrm_profile_address_lastname').val($(this).data('address').lastName);
        		$('#addressmodal-country').val($(this).data('address').countryCode);
        		$('#dwfrm_profile_address_address1').val($(this).data('address').address1);
        		$('#dwfrm_profile_address_address2').val($(this).data('address').address2);
        		$('#dwfrm_profile_address_postal').val($(this).data('address').postalCode);
        		$('#dwfrm_profile_address_city').val($(this).data('address').city);
        		$('#dwfrm_profile_address_phone').val($(this).data('address').phone);
        		$('#addressmodal-state').val($(this).data('address').stateCode);
        		$('#addressmodal-stateNonUS').val($(this).data('address').stateCode);
        		$('#addressmodal-stateText').val($(this).data('address').stateCode);
        		
        		if($(this).data('address').countryCode == 'US') {
           	      	$("#addressmodal-state").attr( "required","" );
           	      	$("#addressmodal-stateNonUS").removeAttr( "required" );
           	      	$("#addressmodal-stateText").removeAttr( "required" );
           	      	$("#addressmodal-state").show();
           	      	$("#addressmodal-stateNonUS").hide(); 
           	      	$("#addressmodal-stateText").hide();  
           	      	$("#dwfrm_profile_address_postal").attr("inputmode","decimal");
           	      	$("#dwfrm_profile_address_postal").attr("pattern","[0-9]*");
        		} else {
        			if($(this).data('address').countryCode == 'CA'){
        				$("#addressmodal-stateNonUS").attr( "required","" );
        				$("#addressmodal-state").removeAttr( "required" );
               	      	$("#addressmodal-stateText").removeAttr( "required" );
               	      	$("#addressmodal-stateNonUS").show();
               	      	$("#addressmodal-state").hide();
               	      	$("#addressmodal-stateText").hide();
               	      	$("#dwfrm_profile_address_postal").removeAttr( "inputmode");
            	      	$("#dwfrm_profile_address_postal").removeAttr( "pattern");
        			}else {
        				$("#addressmodal-state").removeAttr( "required");
        				$("#addressmodal-stateNonUS").removeAttr( "required");
               	      	$("#addressmodal-stateText").attr( "required", " ");
               	      	$("#addressmodal-state").hide();
               	      	$("#addressmodal-stateNonUS").hide();
               	      	$("#addressmodal-stateText").show();
               	      	$("#dwfrm_profile_address_postal").removeAttr( "inputmode");
               	      	$("#dwfrm_profile_address_postal").removeAttr( "pattern");
        			}
        		}
     	      
	
        		if($(this).data('address').isDefaultAddress == true) {
        			$('#dwfrm_profile_address_addressdefault').attr('value', true); 
        			$('#dwfrm_profile_address_addressdefault').prop('checked', true);
        		} else {
        			$('#dwfrm_profile_address_addressdefault').attr('value', false); 
        			$('#dwfrm_profile_address_addressdefault').prop('checked', false);
        		}
        		
        		// CHANGE TITLE
        		$('.address-title').text('Edit address');
        		$('#addaddressModalCollapseLink').hide();
        		$("#addaddressModalCollapse").addClass("show");
        		$('#addressModal-mode').val('edit');
        		
        	}
        });        

		$('#checkout-container').on('keyup', '.edit-shipping-address', function(e){
			if(e.keyCode === 13 || e.keyCode === 32){
				e.preventDefault();
				$(this).trigger("click");
			}
		});
        
        
        
        
        $('#checkout-container').on('click', '.address-button', function(e){      
        	e.preventDefault();
        	$('#addressModal').modal('hide');
        });
        
        $(document).on('hide.bs.modal','#addressModal',function(){
        	util.resetForm($('#addressModal form'));
        })
        
        
        /* Order Summary listeners */
        
        // Promo Toggle
        $('#checkout-container').on('click', '.promocode-link', function(){
			// update the aria-expanded attribute
			if ($(this).attr('aria-expanded') == 'false'){
		        $(this).attr('aria-expanded', 'true');				
			}
			$('.promocode-form').show('slow');
            $('.promocode-link').hide();
            $("input.promocode").focus();
        })
                
        // Promo Close
        $('#checkout-container').on('click', '.promo-close svg', function(){
			var currentForm  = $(this).parent().parent().find('form');
        	var addressEntered = getEnteredAddress();
			//RDMP-3448 changes
			var shippingEdit;
			if(window.location.href.indexOf("shippingEdit=true") > -1 ){
				shippingEdit = $('#shippingEdit').val();
			}

			//loggedIn user
			if(typeof ($('#dwfrm_singleshipping_shippingAddress input[name=dwfrm_singleshipping_addressList]:checked').data('address')) !== 'undefined'){
				var selectedAddressID = $('#dwfrm_singleshipping_shippingAddress input[name=dwfrm_singleshipping_addressList]:checked').data('address').ID;
				$('input[name=selectAddressID]').val(selectedAddressID);
			}

        	updateSection(currentForm, $(currentForm).attr('action'),'GET','#checkout-container',function() {
        		window.initbraintreeSG();
        		setTimeout(function(){
        			$('.promocode-container .promocode-link').attr('aria-label', 'Promocode has been removed. Promo code');
        			$('.promocode-container .promocode-link').focus();
        		}, 2500);
        		//Added for showing afterpay ineligible message if gift card is already present
        		$('#checkout-container .giftcard-applied').length > 0? $("#checkout-container #afterpay-payment-text,#afterpay-span").addClass("disabled-state"):$("#afterpay-checkout-container #afterpay-payment-text").removeClass("disabled-state");
        		$('#checkout-container .giftcard-applied').length > 0? $('#checkout-container #afterpay-gift-msg').show():0;
        		
        		setEnteredAddress(addressEntered, shippingEdit);
        		addressEntered = "";
				shippingEdit = "";
        	});
        })
        
        // Promo Apply
        $('#checkout-container').on('click', '.promo-button', function(){
        	var currentForm = $(this).closest('form');
        	if($(currentForm).find('.promocode-form input').val().trim().length<1){
        		$('.promocode-error .error-text').text("Please enter a promo code.");
        		$('.promocode-error').show();
        		return false;
        	}
        	
        	//fetching shipping form data - guest user
        	var addressEntered = getEnteredAddress();
			//RDMP-3448 changes
			var shippingEdit;
			if(window.location.href.indexOf("shippingEdit=true") > -1 ){
				shippingEdit = $('#shippingEdit').val();
			}
			//loggedIn user
			if(typeof ($('#dwfrm_singleshipping_shippingAddress input[name=dwfrm_singleshipping_addressList]:checked').data('address')) !== 'undefined'){
				var selectedAddressID = $('#dwfrm_singleshipping_shippingAddress input[name=dwfrm_singleshipping_addressList]:checked').data('address').ID;
				$('input[name=selectAddressID]').val(selectedAddressID);
			}

        	updateSection(currentForm, $(currentForm).attr('action'),'GET','#checkout-container',function() {
        		window.initbraintreeSG();
        		//Added for showing afterpay ineligible message when gift card is already present
        		$('#checkout-container .giftcard-applied').length > 0? $("#checkout-container #afterpay-payment-text,#afterpay-span").addClass("disabled-state"):$("#afterpay-checkout-container #afterpay-payment-text").removeClass("disabled-state");
        		$('#checkout-container .giftcard-applied').length > 0? $('#checkout-container #afterpay-gift-msg').show():0;

				//RDMP-3448 changes
        		setEnteredAddress(addressEntered,shippingEdit);
        		addressEntered = "";
				shippingEdit = "";
        		
        		//expanding order summary section
        		if($('#checkout-container button.checkout-summary-heading-button:visible')){
    				$('#checkout-container button.checkout-summary-heading-button').trigger('click');
        		}
        	});
        })
        
        function getEnteredAddress() {
        	var addressEntered = JSON.stringify({
    			email : $('#dwfrm_singleshipping_shippingAddress').find('#guestEmail').val(),
    			firstName : $('#dwfrm_singleshipping_shippingAddress').find('#dwfrm_singleshipping_shippingAddress_addressFields_firstName').val(),
    			lastName : $('#dwfrm_singleshipping_shippingAddress').find('#dwfrm_singleshipping_shippingAddress_addressFields_lastName').val(),
    			country : $('#dwfrm_singleshipping_shippingAddress').find('#country option:selected').val(),
    			address1 : $('#dwfrm_singleshipping_shippingAddress').find('#dwfrm_singleshipping_shippingAddress_addressFields_address1').val(),
    			address2 : $('#dwfrm_singleshipping_shippingAddress').find('#dwfrm_singleshipping_shippingAddress_addressFields_address2').val(),
    			state : ($('#country option:selected').val() == 'US') ? $('#dwfrm_singleshipping_shippingAddress').find('#state option:selected').val() : $('#dwfrm_singleshipping_shippingAddress').find('#stateText').val(),
    			postal : $('#dwfrm_singleshipping_shippingAddress').find('#dwfrm_singleshipping_shippingAddress_addressFields_postal').val(),
    			city : $('#dwfrm_singleshipping_shippingAddress').find('#dwfrm_singleshipping_shippingAddress_addressFields_city').val(),
    			phone : $('#dwfrm_singleshipping_shippingAddress').find('#dwfrm_singleshipping_shippingAddress_addressFields_phone').val(),
        	});
        	
        	return addressEntered;
        }
        
        function setEnteredAddress(address,shippingEdit) {
        	//setting shipping address in shipping form - promo apply before form submit
    		var parsedAddress = JSON.parse(address);
    		if(parsedAddress){
    			var shippingForm = $('#checkout-container #dwfrm_singleshipping_shippingAddress');
				//RDMP-3448 changes
    			if(typeof shippingEdit === "undefined"){
					(!(shippingForm.find('#guestEmail').val()) && parsedAddress.email) ? shippingForm.find('#guestEmail').val(parsedAddress.email) : "";
					(!(shippingForm.find('#dwfrm_singleshipping_shippingAddress_addressFields_firstName').val()) && parsedAddress.firstName) ? shippingForm.find('#dwfrm_singleshipping_shippingAddress_addressFields_firstName').val(parsedAddress.firstName) : "";
					(!(shippingForm.find('#dwfrm_singleshipping_shippingAddress_addressFields_lastName').val()) && parsedAddress.lastName) ? shippingForm.find('#dwfrm_singleshipping_shippingAddress_addressFields_lastName').val(parsedAddress.lastName) : "";
					(!(shippingForm.find('#dwfrm_singleshipping_shippingAddress_addressFields_address1').val()) && parsedAddress.address1) ? shippingForm.find('#dwfrm_singleshipping_shippingAddress_addressFields_address1').val(parsedAddress.address1) : "";
					(!(shippingForm.find('#dwfrm_singleshipping_shippingAddress_addressFields_address2').val()) && parsedAddress.address2) ? shippingForm.find('#dwfrm_singleshipping_shippingAddress_addressFields_address2').val(parsedAddress.address2) : "";
					if(parsedAddress.country == 'US'){
						if($('#stateText:visible')){
							$('#stateText').hide();
							$('#stateText').removeAttr('required');
							$('select#state').show();
							$('select#state').attr('required', true);
						}
						(!(shippingForm.find('#state option:selected').val()) && parsedAddress.state) ? shippingForm.find('#state option[value='+parsedAddress.state+']').attr('selected', 'selected') : "";
					}else{
						if($('select#state:visible')){
							$('select#state').hide();
							$('select#state').removeAttr('required');
							$('#stateText').show();
							$('#stateText').attr('required', true);
						}
						(!(shippingForm.find('#stateText').val()) && parsedAddress.state) ? shippingForm.find('#stateText').val(parsedAddress.state) : "";
					}
					(!(shippingForm.find('#dwfrm_singleshipping_shippingAddress_addressFields_city').val()) && parsedAddress.city) ? shippingForm.find('#dwfrm_singleshipping_shippingAddress_addressFields_city').val(parsedAddress.city) : "";
					(!(shippingForm.find('#dwfrm_singleshipping_shippingAddress_addressFields_phone').val()) && parsedAddress.phone ) ? shippingForm.find('#dwfrm_singleshipping_shippingAddress_addressFields_phone').val(parsedAddress.phone) : "";

				}else{
					(shippingForm.find('#guestEmail').val() && parsedAddress.email) ? shippingForm.find('#guestEmail').val(parsedAddress.email) : "";
					(shippingForm.find('#dwfrm_singleshipping_shippingAddress_addressFields_firstName').val() && parsedAddress.firstName) ? shippingForm.find('#dwfrm_singleshipping_shippingAddress_addressFields_firstName').val(parsedAddress.firstName) : "";
					(shippingForm.find('#dwfrm_singleshipping_shippingAddress_addressFields_lastName').val() && parsedAddress.lastName) ? shippingForm.find('#dwfrm_singleshipping_shippingAddress_addressFields_lastName').val(parsedAddress.lastName) : "";
					(shippingForm.find('#dwfrm_singleshipping_shippingAddress_addressFields_address1').val() && parsedAddress.address1) ? shippingForm.find('#dwfrm_singleshipping_shippingAddress_addressFields_address1').val(parsedAddress.address1) : "";
					(shippingForm.find('#dwfrm_singleshipping_shippingAddress_addressFields_address2').val() && parsedAddress.address2) ? shippingForm.find('#dwfrm_singleshipping_shippingAddress_addressFields_address2').val(parsedAddress.address2) : "";
					if(parsedAddress.country == 'US'){
						if($('#stateText:visible')){
							$('#stateText').hide();
							$('#stateText').removeAttr('required');
							$('select#state').show();
							$('select#state').attr('required', true);
						}
						(shippingForm.find('#state option:selected').val() && parsedAddress.state) ? shippingForm.find('#state option[value='+parsedAddress.state+']').attr('selected', 'selected') : "";
					}else{
						if($('select#state:visible')){
							$('select#state').hide();
							$('select#state').removeAttr('required');
							$('#stateText').show();
							$('#stateText').attr('required', true);
						}
						(shippingForm.find('#stateText').val() && parsedAddress.state) ? shippingForm.find('#stateText').val(parsedAddress.state) : "";
					}

					(shippingForm.find('#dwfrm_singleshipping_shippingAddress_addressFields_city').val() && parsedAddress.city) ? shippingForm.find('#dwfrm_singleshipping_shippingAddress_addressFields_city').val(parsedAddress.city) : "";
					(shippingForm.find('#dwfrm_singleshipping_shippingAddress_addressFields_phone').val() && parsedAddress.phone ) ? shippingForm.find('#dwfrm_singleshipping_shippingAddress_addressFields_phone').val(parsedAddress.phone) : "";
				}

    			//RDMP-3448 changes
				var postalCode = shippingForm.find('#dwfrm_singleshipping_shippingAddress_addressFields_postal').val();
				if(postalCode != parsedAddress.postal){
					shippingForm.find('#dwfrm_singleshipping_shippingAddress_addressFields_postal').val(parsedAddress.postal);
				}
				var currentCountry = $('#dwfrm_singleshipping_shippingAddress').find('#country option:selected').val();
				if(currentCountry != parsedAddress.country){
					shippingForm.find('#country option[value='+parsedAddress.country+']').attr('selected', 'selected');
					var url = shipping.getShippingMethodURL();
					if(url) {
						$( "#shipping-methods" ).load( url, function() {});
					}
				}
        		setTimeout(function(){
	        		if($("input[name=shippingMethod]:checked").length == 0) {
	        				$("input[name=shippingMethod]:first").attr('checked', true);
	       				 	$("input[name=mobile-shippingMethod]:first").attr('checked', true);
	    			  }
        		}, 1000);

    		}
        }

      $(document).on('keydown','.promocode',function(event){
    	  	if(event.keyCode===13){
    	  		event.preventDefault();
                $('.promo-button').click();	
    	  	}
        	
        })
        
        //remove promocode event
        $(document).on('keydown','.promo-close',function(event){
    	  	if(event.keyCode===13){
    	  		event.preventDefault();
                $('.promo-close svg').click();	
    	  	}
        	
        });
        // GWP Add/Edit Modal show
        $('#checkout-container').on('click', '.edit-coupon', function(){   
        	updateSection('',$(this).data("href"),'GET','#giftModal .modal-content',function() {
        	if($('.coupon-status:visible').length > 0){
        		$('#giftModal #gwpCheckoutModalLabel div.sr-only').text($('.coupon-status').text()+'.');
        	}else if($('#giftModal #gwpCheckoutModalLabel div.sr-only').text().length > 0){
        		$('#giftModal #gwpCheckoutModalLabel div.sr-only').text('');
        	}
        	 $("#giftModal").modal("show")
        	});
        	
        })   
        
        // GWP Add products 
        $('#checkout-container').on('click', '.add-gwp-products', function(){
        	util.showLoader();
        	var totalSelected = 0;
            var selectedItems = [];
            if($('.product-slot.mobile').css("display")!=="none"){
                totalSelected =   $('.product-slot.mobile .btn-promo-select.active').length +1;
                $('.product-slot.mobile .btn-promo-select.active').each(function() {
                    var options = JSON.parse($(this).attr('data-options'));
                    selectedItems.push(options);
                  });
            }else{
                totalSelected =   $('.product-slot.desktop .btn-promo-select.active').length +1;
                $('.product-slot.desktop .btn-promo-select.active').each(function() {
                    var options = JSON.parse($(this).attr('data-options'));
                    selectedItems.push(options);
                });
            }
            
            
            
            
            var data = JSON.stringify({
              'bonusproducts': selectedItems
            });
        	var params = {
            		url: $(this).data('url')+'&format=spcheckout',
            		method: 'POST',
            		async: false,
            		data: data,
                    contentType: 'application/json',
                    dataType: 'json'
                };
        	$.ajax(params).done(function (response) {
        		window.location.reload(); 
        	}).fail(function () {
        		location.reload();
        	});
        })
        
        
        $('#giftModal').on('shown.bs.modal', function() {
        	var totalSelectedGiftProducts = 0;
        	var maxItems = $('#gwp-promo-max-items').val();
        	
        	if($('.product-slot.mobile').css("display")!=="none"){
        		totalSelectedGiftProducts = $('.product-slot.mobile .btn-promo-select.active').length;
            }else{
        	    totalSelectedGiftProducts = $('.product-slot.desktop .btn-promo-select.active').length;
            }
        	
        	$('.product-slot').find('.btn-promo-select.active').removeClass('unselected');
        	
        	if (totalSelectedGiftProducts >= maxItems) {        		
            	$('.product-slot').find('.unselected').attr('disabled', 'disabled');
        	}
        })
        
        // GWP select products        
        $('#checkout-container').on('click', '.btn-promo-select', function(){
        	var totalSelectedGiftProducts = 0;
        	var maxItems = $('#gwp-promo-max-items').val();

        	if($('.product-slot.mobile').css("display")!=="none"){
        		totalSelectedGiftProducts = $('.product-slot.mobile .btn-promo-select.active').length + 1;
            }else{
        	    totalSelectedGiftProducts = $('.product-slot.desktop .btn-promo-select.active').length + 1;
            }

            if($(this).find('span.btn-status').text() == 'Add') {
            	$(this).find('span.btn-status').text('Selected');
            	$(this).removeClass('unselected');
            	$(this).attr('aria-checked', true);
            } else {
            	$(this).find('span.btn-status').text('Add');
            	$(this).addClass('unselected');
            	totalSelectedGiftProducts = totalSelectedGiftProducts - 2;
            	$(this).attr('aria-checked', false);
            }
            
            $('.samples-action .product-selected').html(totalSelectedGiftProducts + '/' + maxItems + ' selected');
            
            if (totalSelectedGiftProducts >= maxItems) {
            	$('.product-slot').find('.unselected').attr('disabled', 'disabled');
            } else {
            	$('.product-slot button').removeAttr('disabled');
            }

        }) 
                
        /* Float Label 
         * 
         */
      /*  $(document).on('input','input.form-control,select.form-control',function(event){
        	if($(this).prev().hasClass('float-label')){
        		$(this).val().length>0?$(this).prev().addClass('input--filled'):$(this).prev().removeClass('input--filled')
        	}
        })
*/
		
		
		/**
		* Billing section listeners
		**/
		
		
		/**
		* Reset billing address form state field based on country
		***/
		function resetBillingStateField() {
			var selectedCountry = $('#checkout-container #dwfrm_billing_billingAddress_addressFields_country').val();
			
			var formStateFieldValue = $('#dwfrm_billing_billingAddress_addressFields_states_state').val() ?
			$('#dwfrm_billing_billingAddress_addressFields_states_state').val().trim() : '';
			
			if(selectedCountry === 'US') {
				$('#billingStateText').addClass('d-none');
				$('#billingStateSelectNonUS').addClass('d-none');
				$('#billingStateSelect').removeClass('d-none');
				$('#billingStateSelect').val(formStateFieldValue);
			} else {
				if(selectedCountry === 'CA'){
					$('#billingStateSelect').addClass('d-none');
					$('#billingStateText').addClass('d-none');
					$('#billingStateSelectNonUS').removeClass('d-none');
					$('#billingStateSelectNonUS').val(formStateFieldValue);
				}else {
					$('#billingStateSelect').addClass('d-none');
					$('#billingStateSelectNonUS').addClass('d-none');
					$('#billingStateText').removeClass('d-none');
					$('#billingStateText').val(formStateFieldValue);
				}
			}
		}
		
		
		$('#checkout-container').on('click', '#addCardModal .credit-card-save', function(e) {
			e.preventDefault();
			util.showLoader();
			var $form = $(this).closest('form');

			$('#addCardModal').find('.braintree-hosted-fields-iframe-container').removeClass('braintreefields');
			
			var stateText = '';
			if($('#addCreditCardForm #dwfrm_billing_billingAddress_addressFields_country').val().toUpperCase() === 'US') {
				stateText = $('#addCreditCardForm #billingStateSelect').val();
				$('#addCreditCardForm #billingStateSelect').attr('required', true);	
				$('#addCreditCardForm #billingStateText').removeClass('required');
				$('#addCreditCardForm #billingStateText').removeAttr('required');
				
			} else {
				stateText = $('#addCreditCardForm #billingStateText').val();
				$('#addCreditCardForm #billingStateText').attr('required', true);	
				$('#addCreditCardForm #billingStateSelect').removeClass('required');
				$('#addCreditCardForm #billingStateSelect').removeAttr('required');
			}
			$('#addCreditCardForm #dwfrm_billing_billingAddress_addressFields_states_state').val(stateText);
			validator.init();
        	var formValidator = $("#addCreditCardForm").validate();
			var isValidForm = formValidator.form();
			
			//error messaging
			if($('#addCreditCardForm #braintreeCardNumber').hasClass('braintree-hosted-fields-invalid')){					
				$('#addCreditCardForm #braintreeCardNumber').addClass('is-invalid');
			}
			
			if($('#addCreditCardForm #braintreeExpirationDate').hasClass('braintree-hosted-fields-invalid')){					
				$('#addCreditCardForm #braintreeExpirationDate').addClass('is-invalid');
			}
			
			if($('#addCreditCardForm #braintreeCvv').hasClass('braintree-hosted-fields-invalid')){					
				$('#addCreditCardForm #braintreeCvv').addClass('is-invalid');
			}
			
        	if(!formValidator.form()){
				if($('#addCardModal .spc-billing-same-as-shipping').is(':checked')) {
					$('#addCardModal .spc-billing-same-as-shipping').trigger('click');
				}
				
        		util.hideLoader();
        		return false;
        	}

			$form.submit();
		});
		
		$(document).on('show.bs.modal', '#addCardModal' , function () {
			$('#addCardModal').find('.braintree-hosted-fields-iframe-container').addClass('braintreefields');
		});
		
		$(document).on('hide.bs.modal', '#addCardModal' , function () {
			$('#addCardModal').find('.braintree-hosted-fields-iframe-container').removeClass('braintree-hosted-fields-invalid');
			$('#addCardModal').find('.braintree-hosted-fields-iframe-container').removeClass('is-invalid');
		});
		
		/**
		* Payment section submit
		**/
		$('#checkout-container').on('click', '.payment-submit', function(e) {
			util.showLoader();
		    
			// Patch for removing 'required' attribute from name tag, if selected payment method is not 'CREDIT_CARD'
		    var selectedPaymentMethod = $('input[name="dwfrm_billing_paymentMethods_selectedPaymentMethodID"]:checked').val();
		    if(selectedPaymentMethod && selectedPaymentMethod !== 'CREDIT_CARD') {
		    	$('#paymentCollapse #braintreeCardOwner').attr('required', false);
		    }
		      
			var $form = $(this).closest('form');
			var stateText = '';
			if($('#dwfrm_billing_billingAddress_addressFields_country').val().toUpperCase() === 'US') {
				stateText = $('#billingStateSelect').val();
				$('#billingStateSelect').attr('required', true);
				
				$('#billingStateText').removeClass('required');
				$('#billingStateText').removeAttr('required');
				$('#billingStateSelectNonUS').removeClass('required');
				$('#billingStateSelectNonUS').removeAttr('required');
			} else {
				if($('#dwfrm_billing_billingAddress_addressFields_country').val().toUpperCase() === 'CA'){
					stateText = $('#billingStateSelectNonUS').val();
					$('#billingStateSelectNonUS').attr('required', true);
					
					$('#billingStateText').removeClass('required');
					$('#billingStateText').removeAttr('required');
					$('#billingStateSelect').removeClass('required');
					$('#billingStateSelect').removeAttr('required');
				}else {
					stateText = $('#billingStateText').val();
					$('#billingStateText').attr('required', true);
					
					$('#billingStateSelect').removeClass('required');
					$('#billingStateSelect').removeAttr('required');
					$('#billingStateSelectNonUS').removeClass('required');
					$('#billingStateSelectNonUS').removeAttr('required');
				}
			}
			$('#dwfrm_billing_billingAddress_addressFields_states_state').val(stateText);
			
			validator.init();
        	var formValidator = $("#dwfrm_billing").validate();
			var isValidForm = formValidator.form();
			
			// Check if hosted fields present  
			var hasHostedFieldError = false;
			if(($('#braintreeCardNumber:visible').length > 0) && ($('#braintreeExpirationDate:visible').length > 0) && ($('#braintreeCvv:visible').length > 0)){
								
				if(!$('#braintreeCardNumber').hasClass('braintree-hosted-fields-valid')){					
					$('#braintreeCardNumber').addClass('braintree-hosted-fields-invalid');
					$('#braintreeCardNumber').addClass('is-invalid');
					hasHostedFieldError = true;						
				}
				
				if(!$('#braintreeExpirationDate').hasClass('braintree-hosted-fields-valid')){					
					$('#braintreeExpirationDate').addClass('braintree-hosted-fields-invalid');
					$('#braintreeExpirationDate').addClass('is-invalid');
					hasHostedFieldError =  true;						
				}
				
				if(!$('#braintreeCvv').hasClass('braintree-hosted-fields-valid')){					
					$('#braintreeCvv').addClass('braintree-hosted-fields-invalid');
					$('#braintreeCvv').addClass('is-invalid');
					hasHostedFieldError =  true;						
				}
				
			}
			
        	if(hasHostedFieldError){  
				util.hideLoader();
        		return false;
        	}
        	
			
        	if(!formValidator.form()){  
        		$("#paymentCollapse").addClass("show");
				$(".spc-billing-address .enter-baddr-manually").hide();
				$('#billingaddressCollapse').addClass('show');

				
				util.hideLoader();
        		return false;
        	}
			
			//form submit
			$form.submit();
		});

		$('#checkout-container').on('click', '.review-submit', function(e){
			util.showLoader();
		});

		/**
		* On country change update state field
		**/
		$(document).on('change', '#dwfrm_billing_billingAddress_addressFields_country', function() {
			var selectedCountry = $(this).val();
			var stateText = '';
			
			var selectorField = '#checkout-container ';
			if($('#addCardModal').is(':visible')) {
				selectorField = '#checkout-container #addCardModal ';
			} else {
				selectorField = '#checkout-container ';	
			}
			
			if(selectedCountry.toUpperCase() === 'US') {
				$(selectorField+'#billingStateText').addClass('d-none');
				$(selectorField+'#billingStateSelectNonUS').addClass('d-none');
				$(selectorField+"#billingStateSelectNonUS").removeAttr( 'required' );
				$(selectorField+"#billingStateText").removeAttr( 'required' );
				$(selectorField+'#billingStateSelect').removeClass('d-none');
				$(selectorField+"#billingStateSelect").attr( 'required' , '');
				stateText = $(selectorField+'#billingStateSelect').val();
			/*	$('#billingStateSelect-error').attr('style','display:inline');*/
				$('#billingStateText-error').attr('style','display:none');
				$(selectorField+'#dwfrm_billing_billingAddress_addressFields_postal').attr('inputmode','decimal');
				$(selectorField+'#dwfrm_billing_billingAddress_addressFields_postal').attr('pattern','[0-9]*');
				
			} else {
				if(selectedCountry.toUpperCase() === 'CA') {
					$(selectorField+'#billingStateText').addClass('d-none');
					$(selectorField+"#billingStateText").removeAttr( 'required' );
					$(selectorField+'#billingStateSelect').addClass('d-none');
					$(selectorField+"#billingStateSelect").removeAttr( 'required' );
					$(selectorField+'#billingStateSelectNonUS').removeClass('d-none');
					$(selectorField+"#billingStateSelectNonUS").attr( 'required' , '');
					stateText = $(selectorField+'#billingStateSelectNonUS').val();
					$('#billingStateSelect-error').attr('style','display:none');
					$('#billingStateText-error').attr('style','display:none');
					$(selectorField+'#dwfrm_billing_billingAddress_addressFields_postal').removeAttr( 'inputmode' );
					$(selectorField+'#dwfrm_billing_billingAddress_addressFields_postal').removeAttr( 'pattern' );
				}else {
					$(selectorField+'#billingStateSelect').addClass('d-none');
					$(selectorField+"#billingStateSelect").removeAttr( 'required' );
					$(selectorField+'#billingStateSelectNonUS').addClass('d-none');
					$(selectorField+"#billingStateSelectNonUS").removeAttr( 'required' );
					$(selectorField+'#billingStateText').removeClass('d-none');
					$(selectorField+"#billingStateText").attr( 'required' , '');
					stateText = $(selectorField+'#billingStateText').val();
					$('#billingStateSelect-error').attr('style','display:none');
				/*	$('#billingStateText-error').attr('style','display:inline');*/
					$(selectorField+'#dwfrm_billing_billingAddress_addressFields_postal').removeAttr( 'inputmode' );
					$(selectorField+'#dwfrm_billing_billingAddress_addressFields_postal').removeAttr( 'pattern' );
				}
			}
			$(selectorField+'#dwfrm_billing_billingAddress_addressFields_states_state').val(stateText);
		})
		
		/**
		* Payment summary mode - Edit link click handler
		**/
        $('#checkout-container').on('click', '.edit-payment-section', function(event){
            event.stopImmediatePropagation();
            var url = $('#renderBillingEdit').val();
            window.location.replace(url);
        })
		
		/**
		* Set billing form fields, when checking or unchecking same as shipping checkbox
		**/
		function sameasshipping(address, $form) {
			if(address && address!== null) {
				address = address.replace(/'/g, '\"');
	    		address = address.replace(/\\/g, '');
	    		address = JSON.parse(address);
				
				var billingFormFields = ['#dwfrm_billing_billingAddress_addressFields_firstName',
					'#dwfrm_billing_billingAddress_addressFields_lastName',
					'#dwfrm_billing_billingAddress_addressFields_country',
					'#dwfrm_billing_billingAddress_addressFields_address1',
					'#dwfrm_billing_billingAddress_addressFields_address2',
					'#dwfrm_billing_billingAddress_addressFields_postal',
					'#dwfrm_billing_billingAddress_addressFields_states_state',
					'#dwfrm_billing_billingAddress_addressFields_city'];
					
				
				// set address Billing fields
				if($form) {
					$($form).find(billingFormFields[0]).val(address.firstName);
					$($form).find(billingFormFields[1]).val(address.lastName);
					$($form).find(billingFormFields[2]).val(address.country);
					$($form).find(billingFormFields[2]).val(address.country).trigger('change');
					$($form).find(billingFormFields[3]).val(address.address1);
					$($form).find(billingFormFields[4]).val(address.address2);
					$($form).find(billingFormFields[5]).val(address.postal);
					$($form).find(billingFormFields[6]).val(address.state);
					$($form).find(billingFormFields[7]).val(address.city);
					
					// Set state value to the temp form fields based on country selected
					if($($form).find('#dwfrm_billing_billingAddress_addressFields_country').val().toUpperCase() === 'US'){
						$($form).find('#billingStateSelect').val(address.state);
					} else {
						if($($form).find('#dwfrm_billing_billingAddress_addressFields_country').val().toUpperCase() === 'CA'){
							$($form).find('#billingStateSelectNonUS').val(address.state);
						}else {
							$($form).find('#billingStateText').val(address.state);
						}
					}
				}	
			}
		}
	
		//same as shipping click listener
		$('#checkout-container').on('click', '.spc-billing-same-as-shipping', function() {
			var $form = $(this).closest('form');
			
			var selectorField = '#checkout-container';
			if($('#addCardModal').is(':visible')) {
				selectorField = '#checkout-container #addCardModal ';
				$('#checkout-container #addCardModal .enter-billing-address-link').hide();
				$('#checkout-container #addCardModal #billingaddressCollapse').addClass('show');
			} else {
				selectorField = '#checkout-container ';	
			}
			
			resetBillingStateField();
			var addressState = '';
			if($(this).is(':checked')) {
				$(selectorField +'.spc-billing-address').css('display', 'none');
				var defaultShipmentAddress = $(this).data('address');
				if(defaultShipmentAddress) {
					addressState = defaultShipmentAddress.state ? defaultShipmentAddress.state : '';
					sameasshipping(defaultShipmentAddress, $form);
				}
			} else {
				$(selectorField+'.spc-billing-address').css('display', 'block');
				var billingAddress = $(selectorField+'#saved-billing-address').data('address');
				if(billingAddress && billingAddress!== null) {
					sameasshipping(billingAddress, $form);	
					addressState = billingAddress.state ? billingAddress.state: '';
				} else {
					addressState = $(selectorField +'#dwfrm_billing_billingAddress_addressFields_states_state').val().trim().length > 0 ?
					$(selectorField +'#dwfrm_billing_billingAddress_addressFields_states_state').val() : '';
				}
			}
			
			// after unchecking, set state field value from default address, if not available set it from the shipping address
			if($(selectorField + '#dwfrm_billing_billingAddress_addressFields_country').val().toUpperCase() === 'US'){
				$($form).find(selectorField +'#billingStateSelect').val(addressState);
			} else {
				if($(selectorField + '#dwfrm_billing_billingAddress_addressFields_country').val().toUpperCase() === 'CA') {
					$($form).find(selectorField +'#billingStateSelectNonUS').val(addressState);
				}else {
					$($form).find(selectorField +'#billingStateText').val(addressState);
				}
			}
		});
		
		/**
		* Logged in user - Add credit card modal adjust input field
		**/
		var creditCardModal = $('.checkout-add-card-modal');
		creditCardModal.find('.braintree-card-number').removeClass('col-md-5').addClass('col-md-12');
		creditCardModal.find('.braintree-expiration-date').removeClass('col-md-3').addClass('col-md-6');
		creditCardModal.find('.braintree-phone').removeClass('col-md-4').addClass('col-md-6');
		
		/**
		* Logged in user - Add credit card click handler
		**/
		$('#checkout-container').on('click','.braintree-addcard', function(e) {
			$('.braintree-radio-box').removeClass('selected');
			$('#braintreeCreditCardList').val('newcard');
			var event = new Event('change');
			var element = document.getElementById("braintreeCreditCardList");
			element.dispatchEvent(event);
			$('#checkout-container #addCardModal').modal('show');
		});
		
		$(".checkout-add-card-modal").on('shown.bs.modal', function(){
	        $('.checkout-add-card-modal').find('#braintreeCreditCardErrorContainer').hide();
	        $('.checkout-add-card-modal .braintree-error-container').show();
	    });
		
		$(".checkout-add-card-modal").on('hidden.bs.modal', function(){
	        $('.checkout-add-card-modal .braintree-error-container').hide();
	    });
		
		
		/**
		* Logged in user - switching saved cards click handler
		**/
		$('#checkout-container').on('click', '.braintreeradios', function(){
			
			$('#checkout-container input[name="dwfrm_billing_paymentMethods_selectedPaymentMethodID"]').prop('checked', false);
			$('#checkout-container #is-CREDIT_CARD').prop('checked', true);
			
			$('#checkout-container #braintreeCreditCardList').val($(this).attr('data-val'));
			$('#checkout-container .saved-credit-card-list-item').prop('checked', false);
			$(this).parent().find('.saved-credit-card-list-item').prop('checked', true);
			
			var event = new Event('change');
			var element = document.getElementById("braintreeCreditCardList");
			element.dispatchEvent(event);
		});
		
		
		/**
		* After pay block
		**/
		
		//Afterpay Changes start
		$('#checkout-container').on('click','#is-CREDIT_CARD', function(e) {
	    	$("#checkout-credit-card-block").show();
	    	$("#containerAfterPay").hide();
	    	$("#giftcard-block").show();
	    	$("#checkout-billing-addr").show();
	    	$("#afterpay-error").hide();
	    	//$("#checkout-credit-card-block").removeClass("disabledbutton");
	    	$("#checkout-gift-card-block").removeClass("afterpay-disabledbutton")
	    });
		$('#checkout-container').on('click','#is-AFTERPAY_PBI', function(e) {
	    	$("#containerAfterPay").show();
	    	$("#checkout-credit-card-block").hide();
	    	$("#checkout-billing-addr").hide();
	    	//$("#checkout-credit-card-block").addClass("disabledbutton");
	    	$("#checkout-gift-card-block").addClass("afterpay-disabledbutton");
	    	if(!$('.spc-billing-same-as-shipping').prop('checked')){
	    		$('.spc-billing-same-as-shipping').trigger('click');
	    		$('.spc-billing-address').hide();
	    	}
	    });
	    
	    
	    if ($('input.afterpayInputRadio').prop('checked')) {
	    	$("#containerAfterPay").show();
	    	$("#checkout-credit-card-block").hide();
	    	$("#checkout-billing-addr").hide();
	    	//$("#checkout-credit-card-block").addClass("disabledbutton");
	    	$("#checkout-gift-card-block").addClass("afterpay-disabledbutton");
	    }    
	    
	    //ADA- CC & afterpay
	    $(".payment-container").on('keydown', '.installment-payment .align-items-start', function(e){
	    	if(e.keyCode === 13){
	    		e.preventDefault();
	    		if($(this).attr("aria-checked") === "false"){
	    			$(this).attr("aria-checked", "true");
	    		}
	    		if($(".payment-container .credit-payment").attr("aria-checked") === "true"){
		    		$(".payment-container .credit-payment").attr("aria-checked", "false");	    			
	    		}
	    		$('#checkout-container #is-AFTERPAY_PBI').trigger('click');
	    		$(this).blur();
	    		$(this).focus();
	    	}
	    });
	    
	    $(".payment-container").on('keydown', '.credit-payment', function(e){
	    	if(e.keyCode === 13){
	    		e.preventDefault();
	    		if($(this).attr("aria-checked") === "false"){
	    			$(this).attr("aria-checked", "true");
	    		}
	    		if($(".payment-container .installment-payment .align-items-start").attr("aria-checked") === "true"){
		    		$(".payment-container .installment-payment .align-items-start").attr("aria-checked", "false");	    			
	    		}
	    		$('#checkout-container #is-CREDIT_CARD').trigger('click');	
	    		$(this).blur();
	    		$(this).focus();
	    	}
	    });
	    	//Afterpay Changes end		
	    		
		//Begin Gift Certificate
	    
		var $addGiftCert = $('#add-giftcert');
		var $giftCertCode = $('input[name$="_giftCertCode"]');

		$('#checkout-container').on('keyup', 'input[name$="_giftCertCode"]', function(e) {
		  pasted(e);
		  if($giftCertCode && $giftCertCode.val().length > 0) {
		    $('#add-giftcert').prop("disabled", false);
		        $('#check-giftcert').prop("disabled", false);
		  } else {
		    $('#add-giftcert').prop("disabled", true);
		        $('#check-giftcert').prop("disabled", true);
		  }
		});
		
		$('#checkout-container').on('paste onpaste', 'input[name$="_giftCertCode"]', function(e) {
		  pasted(e);
		  
		    $('#add-giftcert').prop("disabled", false);
		        $('#check-giftcert').prop("disabled", false);
		   
		});

		function pasted(e){
		setTimeout(function(){
		  if(e.target.value){
		    $('#add-giftcert').prop("disabled", false);
		          $('#check-giftcert').prop("disabled", false);
		  }
		},0);
		}

		$(document).on('show.bs.modal', '#modalCheckoutGiftCertificateRedemption' , function () {
			$('#modalCheckoutGiftCertificateRedemption').find('.gift-cert-alert').remove();
			$('#modalCheckoutGiftCertificateRedemption').find('.gift-cert-error').remove();
			$('#modalCheckoutGiftCertificateRedemption').find('input').val('');

			$('#check-giftcert,#add-giftcert').attr('disabled','true')

			$('#modalCheckoutGiftCertificateRedemption').find('.has-error').removeClass('has-error');
			$('#modalCheckoutGiftCertificateRedemption #dwfrm_billing_giftCertCode-error').remove();
		})
		
		$(document).on('hide.bs.modal', '#modalCheckoutGiftCertificateRedemption' , function () {
			$('#modalCheckoutGiftCertificateRedemption').find('label.input--filled').removeClass('input--filled');
		})


		$('#checkout-container').on('click', '#check-giftcert', function (e) {
			util.showLoader();
		    e.preventDefault();
		    $('#modalCheckoutGiftCertificateRedemption').find('.gift-cert-error').remove();
		    var $balance = $('.balance')
		    if ($('input[name$="_giftCertCode"]').length === 0 || $('input[name$="_giftCertCode"]').val().length === 0) {
		        var error = $balance.find('span.error');
		        if (error.length === 0) {
		            error = $('<span>').addClass('error').appendTo($balance);
		        }
		        error.html('<div class="gift-cert-alert alert-text gift-cert-error"><i class="fal fa-exclamation-circle mr-2"></i> <span>'+Resources.GIFT_CERT_MISSING+'</span></div>');
		        $('.gift-cert-alert').show();
		        util.hideLoader();
		        return;
		    }
		    $.getJSON( Urls.giftCardCheckBalance+'?giftCertificateID='+$('input[name$="_giftCertCode"]').val(), function (data) {
		        if (!data || !data.giftCertificate) {
		            $balance.html('<div class="gift-cert-alert alert-text gift-cert-error"><i class="fal fa-exclamation-circle mr-2"></i> <span>'+Resources.GIFT_CERT_INVALID+'</span></div>');
		            $('.gift-cert-alert').show();
		            util.hideLoader();
		            return;
		        }
		        if(data.giftCertificate && data.giftCertificate.balance && data.giftCertificate.balance.indexOf('$')> -1 ){
		          var giftBalance = data.giftCertificate.balance.replace('$', '');
		          $balance.html('<div class="gift-cert-alert success-text gift-cert-success"><i class="fal fa-check-circle"></i> <span>'+String.format(Resources.GIFT_CERT_BALANCE, giftBalance)+'</span></div>');
		          $('.gift-cert-alert').show();
		          util.hideLoader();
		        }
		    });
		});

		$('#checkout-container').on('click', '#add-giftcert', function (e) {
        	util.showLoader();
			e.preventDefault();
			$('#modalCheckoutGiftCertificateRedemption').find('.gift-cert-alert').remove();
			var code = $('input[name$="_giftCertCode"]').val(),
			$error = $('#modalCheckoutGiftCertificateRedemption').find('.giftcert-error');
			if (code.length === 0) {
				$error.html('<div class="gift-cert-alert alert-text gift-cert-error"><i class="fal fa-exclamation-circle mr-2"></i> <span>'+Resources.GIFT_CERT_MISSING+'</span></div>');
				$('.gift-cert-alert').show();
				util.hideLoader();
				return;
			}

			var url = Urls.redeemGiftCert+'?giftCertCode='+code+'&format=spcheckout';
			
	    	var params = {
	        		url: url,
	        		method: 'GET'
	            };

            var fail = false;
			$.ajax(params).done(function (response) {
	            var msg = '';
	            if (!response) {
	                msg = Resources.BAD_RESPONSE;
	                fail = true;
	            } else if (response.success === false) {
	                msg = response.message.split('<').join('&lt;').split('>').join('&gt;');
	                fail = true;
	            }
	            if (fail) {
	            	$error.html('<div class="gift-cert-alert alert-text gift-cert-error"><i class="fal fa-exclamation-circle mr-2"></i><span>'+msg+'</span></div>');
	                $('.gift-cert-error').show();
	     			util.hideLoader();
	            } else {
	    			util.hideLoader();
	            	$( '#checkout-container' ).html(response);
	            	util.initSpC();
					$('#paymentCollapse').addClass('show');
					window.initbraintreeSG();
					//Added for showing afterpay ineligible message when gift card is applied
					$('#checkout-container .giftcard-applied').length > 0? $("#checkout-container #afterpay-payment-text,#afterpay-span").addClass("disabled-state"):$("#afterpay-checkout-container #afterpay-payment-text").removeClass("disabled-state");
					$('#checkout-container .giftcard-applied').length > 0? $('#checkout-container #afterpay-gift-msg').show():0;
					$('#modalCheckoutGiftCertificateRedemption').modal('hide');
					location.reload();
	            }
	        });			

		});
		
		$(document).on("keydown",'.shipping-selector-radio',function(event){
			if(event.keyCode===13){
				$(this).click();
			}
		})

		$('#checkout-container').on('click', '#remove-giftcert', function(){   
			if($(this).data('url')){
				var url = $(this).data('url');
				updateSection('',url,'GET','#checkout-container',function() {
					$('#paymentCollapse').addClass('show');
					window.initbraintreeSG();
					$('#braintreeCreditCardErrorContainer').hide();
				}); 

			}
		}); 
		
		$("a[href='#billingaddressCollapse']").on('click', function(event){
			$(this).find(".enter-billing-address-link").hide();
        })
        
        $("a[href='#gCAddressModal']").on('click', function(event){
			$(this).find(".enter-billing-address-link").hide();
        })
		  
		  //End Gift Certificate
		  
		  //guest checkout button click
		  $('.checkout-guest-link').on('click', function() {
	        	$('#loginModal').modal('hide');
	        });
	   
		//Added for showing afterpay ineligible message when gift card is applied
		$('#checkout-container .giftcard-applied').length > 0? $("#checkout-container #afterpay-payment-text,#afterpay-span").addClass("disabled-state"):$("#afterpay-checkout-container #afterpay-payment-text").removeClass("disabled-state");
		$('#checkout-container .giftcard-applied').length > 0? $('#checkout-container #afterpay-gift-msg').show():0;
		
		
        // Call After Pay if eligible
        if ( $( "#afterpay-express-button" ).length ) {
        	try {
        		initAfterpay();
        	} catch(err){}
        }

        //initializing afterpay widget
        if ( $( "#afterpay-widget-amount" ).length ) {
        	try {
        		createAfterpayWidget();
        	} catch(err){}
        }
        
    })
    
    /* Functions */
    function hasClass(element, className) {
    	  return (" " + element.className + " ").indexOf(" " + className + " ") > -1;
    }
    
    
    
    /*
     * Ajax method to update section
     */
    function updateSection($form,$endPoint,$method,$updateContainer, $callback, $isJSONResponce){
		util.showLoader();
		util.hideCommonError();
    	var params = {
        		url: $endPoint,
        		method: $method
            };
        if($form){
        	$.extend( params, {data: $($form).serialize()} );
         }

    	$.ajax(params).done(function (response) {
			if(!$isJSONResponce || typeof $isJSONResponce === undefined) {
				$( $updateContainer ).html(response);
			}
    	    
    	    util.initSpC();
    	    // Call after pay if eligible
            if ( $( "#afterpay-express-button" ).length ) {
            	initAfterpay();
            }
            //initializing afterpay widget
            if ( $( "#afterpay-widget-amount" ).length ) {
            	try {
            		createAfterpayWidget();
            	} catch(err){}
            }
            
			if($callback && typeof $callback !== undefined) {
				$callback(response);
			}
			
			if(!$isJSONResponce || typeof $isJSONResponce === undefined) {
				util.hideLoader();
			}

			//RDMP-3596 - fix
			if($('#shipping-methods input[name="shippingMethod"]:checked').length < 1){
				$('#shipping-methods input[name="shippingMethod"]:first').prop("checked", true);
			}

    	}).fail(function () {
    		console.log('Failed updating '+$updateContainer);
    	});
    }
    

    
  //Edit address link click. Scroll position update function
    $('.edit-link').on('click',function(){
    $('#addressSuggestionModal').modal('hide');
    setTimeout(function(){$('.checkout-shipping-panel')[0].scrollIntoView({behavior:"smooth"})},500)
    })

    // User added address onclick function
    $('.entered-address-container').on('click',function(){
    $('#enteredAddress').click();
    $(".entered-address-container .address-warning").show();
    })

    $('#enteredAddress').on('click',function(event){
    event.stopImmediatePropagation();
    })

    $('#selectedAddress').on('click',function(event){
    event.stopImmediatePropagation();
    })
    
    // Suggested  address onclick function
    $('.suggested-address-container').on('click',function(){
      $('#selectedAddress').click();
          $(".entered-address-container .alert-text").hide();
    }) 
    
    //gtm change
    if($('div.reviewCollapse:visible')){
    	var url = location;
    	var checkoutTypeParam;
    	if (url.search.indexOf('checkouttype') > -1) {
    		try {
    			checkoutTypeParam = url.search.split('checkouttype=')[1];
    		} catch (e) {
    			console.log('error in fetching the URL');
    			}
    	}else if (url.pathname.indexOf('checkout/') > -1){
    		try {
    			if(url.pathname.split('checkout/')[1] == 'afterpay-review' || url.pathname.split('checkout/')[1] == 'afterpayexpress-review'){
    				checkoutTypeParam = url.pathname.split('checkout/')[1];
    				checkoutTypeParam = checkoutTypeParam.split('-')[0];
    			}
    		}catch (e) {
    			console.log('error in fetching the URL');
    		}
    	}
    	
    	$( "input[name='checkoutType']" ).val(checkoutTypeParam);
    }
    
    function isInViewport() {
	  var elem = document.querySelector('.review-submit');
	  if (elem) {
		  var bounding = elem.getBoundingClientRect();
		    return (
		        bounding.left >= 0 &&
		        bounding.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
		        bounding.right <= (window.innerWidth || document.documentElement.clientWidth)
		    );
	  }
    }
    
    window.onscroll = function() {
	 	  if (isInViewport()) {
	 		  $('.sticky-place-order').css("opacity",0);
	 		  $('.sticky-place-order').css("z-index",0);
	 	  } else {
	 		  $('.sticky-place-order').css("opacity",1);
	 		  $('.sticky-place-order').css("z-index",1005);
	 	  }  			 
    };
        
}


exports.init = initSPCheckout;
