var util = require('./util');
var validator = require('./validator');
var getShippingMethodURL = function (shippingMethodID,isShippingOnlyPage, containerForm) {
	
	var url = Urls.shippingMethodsList;
	if(shippingMethodID){
		url = Urls.selectShippingMethodsList;
	}
	
    var $form = containerForm ? $('#' + containerForm) : $('#dwfrm_singleshipping_shippingAddress');
    var params = {
        address1: $form.find('input[name$="_address1"]').val(),
        address2: $form.find('input[name$="_address2"]').val(),
        stateCode: $form.find('[name$="_states_state"]').val(),
        postalCode: $form.find('input[name$="_postal"]').val(),
        city: $form.find('input[name$="_city"]').val(),
        id: $form.find('input[name$="_addressFields_id"]').val()
    };
    
    // Set the country based on the input field
    if($form.find('select[id$="country"]').val()){
    	$.extend( params, {countryCode:$form.find('select[id$="country"]').val()} );
    } else if($form.find('input[name$="_country"]').val()) {
    	$.extend( params, {countryCode:$form.find('input[name$="_country"]').val()} );
    }
    if(isShippingOnlyPage){
    $.extend( params, {isShippingEdit: true});
    }
    if(shippingMethodID){
    	$.extend( params, {shippingMethodID:shippingMethodID} );
    }
    return url+'?'+$.param( params );
};

var submitShippingForm = function (shippingMethodID) {
	util.showLoader();
	util.hideCommonError();
	var url = $("#dwfrm_singleshipping_shippingAddress").attr('action');
	$('#dwfrm_singleshipping_shippingAddress').submit();
};

/*
 * This has all the shipping method listeners
 */
var initShippingListeners = function () {
	
	
	// Facebook Login
	$('#checkout-container').on('click', ".oAuthIcon", function(event){
        $('#OAuthProvider').val(this.id);
    });
	
  	// Join NewsLetter
    $('#singlepagecheckout_profile_customer_addtoemaillist_container').on('click', ':checkbox', function(event){
    	var newsLetterCheckBox = document.getElementById('singlepagecheckout_profile_customer_addtoemaillist');
    	if (newsLetterCheckBox.checked == true) {
    		if($('#guestEmail').valid()) {
    			var guestEmail = document.getElementById('guestEmail').value;
        		var newsLetterSignUpKlavioUrl = document.getElementById('newsLetterSignUpKlavioUrl').value;
        		$.ajax({
					type: 'POST',
					url: newsLetterSignUpKlavioUrl,
					data: {
						"email" : guestEmail,
						"source" : document.getElementById('source').value,
						"csrf_token" : document.getElementById('csrf_token').value
					},
					success:function(response) { 
					}
				 });
    		} else
    			return false;     		
        }
    })
     
    // Address form
     $('#checkout-container').on('click', "a[href='#addressCollapse']", function(event){
         $(".enter-address-link").hide();
     })
     
      $('#checkout-container').on('click', "a[href='#addaddressModalCollapse']", function(event){
         $(".enter-addaddress-link").hide();
     })
     
     //showing Manual fields, if user does not select an address from loqate dropdown
     $('#checkout-container').on('keydown', 'input[name$="_address1"]', function(e){
    	 if(e.keyCode === 9){
    		 if($('#dwfrm_singleshipping_shippingAddress').find("#addressCollapse:visible").length === 0){
        		 e.preventDefault();
    			 $('#dwfrm_singleshipping_shippingAddress').find("a[href='#addressCollapse']").trigger('click');
        		 $('#dwfrm_singleshipping_shippingAddress').find('input[name$="_address2"]').focus();
    		 }
    	 }
     });
      $('#checkout-container').on('keydown', '#dwfrm_profile_address input[name$="_address1"]', function(e){
    	 if(e.keyCode === 9){
    		 if($('#dwfrm_profile_address').find("#addaddressModalCollapseLink:visible").length > 0){
        		 e.preventDefault();
    			 $('#dwfrm_profile_address').find("#addaddressModalCollapseLink").trigger('click');
        		 $('#dwfrm_profile_address').find('input[name$="_address2"]').focus();
    		 }
    	 }
     });
	$('#checkout-container').on('keydown', '.billing-address.spc-billing-address input[name$="_address1"]', function(e){
    	 if(e.keyCode === 9){
    		 if($('.billing-address.spc-billing-address').find("a[href='#billingaddressCollapse']:visible").length > 0){
        		 e.preventDefault();
    			 $('.billing-address.spc-billing-address').find("a[href='#billingaddressCollapse']").trigger('click');
        		 $('.billing-address.spc-billing-address').find('input[name$="_address2"]').focus();
    		 }
    	 }
     });


     /*
      * Shipping form Country Change
      */
     $(document).on('change', '#country', function(){
     	  switch ($(country).val()) {
     	    case "US":
     	      $("#state").attr( "required","" );
     	      $("#stateText").removeAttr( "required" );
     	      $("#stateNonUS").removeAttr( "required" );

     	      $("#state").show();
     	      $("#stateText").hide();
     	      $("#stateNonUS").hide();
     	      $('#stateText-error').hide();
     	      
     	      $("#dwfrm_singleshipping_shippingAddress_addressFields_postal").attr("inputmode","decimal");
     	      $("#dwfrm_singleshipping_shippingAddress_addressFields_postal").attr("pattern","[0-9]*");
     	      break;
     	    case "CA":
       	      $("#stateText").removeAttr( "required" );
       	      $("#state").removeAttr( "required" );
       	      $("#stateText").hide();
       	      $('#stateText-error').hide();
       	      $('#state-error').hide();
       	      $("#state").hide();
       	      $("#stateNonUS").attr( "required","" );
       	      $("#stateNonUS").show();
       	      
       	      $("#dwfrm_singleshipping_shippingAddress_addressFields_postal").removeAttr( "inputmode" );	
       	      $("#dwfrm_singleshipping_shippingAddress_addressFields_postal").removeAttr( "pattern" );
       	      break;
     	    default:        	    
       	      $("#stateText").attr( "required","" );
   	      	  $("#state").removeAttr( "required" );
   	      	  $("#stateNonUS").removeAttr( "required" );
       	      $("#state").hide();
       	      $("#stateNonUS").hide();
     	      $("#stateText").show();
     	      $("#dwfrm_singleshipping_shippingAddress_addressFields_postal").removeAttr( "inputmode" );	
     	      $("#dwfrm_singleshipping_shippingAddress_addressFields_postal").removeAttr( "pattern" );
     	  }
     	  /*setTimeout(function() {
     		  validator.init();
     		  var formValidator = $("#dwfrm_singleshipping_shippingAddress").validate()
     		  if(!formValidator.form()){
     			  $(".enter-address-link").hide();  
     			  $("#addressCollapse").addClass("show");
     		  }
     	  }, 100);*/
		   		
       	  if (typeof pca != "undefined") {
       		try{
   		    	 pca.on("load", function(type, id, control) {
   		    		if((control !== undefined || control !== null)) {
   		    			if($("#country").val()) {
   		    				control.setCountry($("#country").val());
   		    			}
   		    		}
   	    		 });

       		} catch(e) {}          		
       	}  
     	  
     	var url = getShippingMethodURL();
     	if(url) {
     		$( "#shipping-methods" ).load( url, function() {
     			  if($("input[name=shippingMethod]:checked").length == 0) {
     				 $("input[name=shippingMethod]:first").attr('checked', true);
     				 $("input[name=mobile-shippingMethod]:first").attr('checked', true);
     			  }
     			});
     	}        	
     });
    
     /*
      * Shipping form Country Change
      */
     $(document).on('change', '#stateNonUS', function(){
    	 var selectedState = $("#stateNonUS").val();
    	 $("#stateText").val(selectedState);
     });
     
    /*
     * Shipping add address Country Change
     */
    $('#checkout-container').on('change', '#addressmodal-country', function(){
    	  switch ($('#addressmodal-country').val()) {
    	    case "US":
    	      $("#addressmodal-state").attr( "required","" );
    	      $("#addressmodal-stateNonUS").removeAttr( "required" );
    	      $("#addressmodal-stateText").removeAttr( "required" );

    	      $("#addressmodal-state").show();
    	      $("#addressmodal-stateNonUS").hide();
    	      $("#addressmodal-stateText").hide();
    	      $("#dwfrm_profile_address_postal").attr("inputmode","decimal");
     	      $("#dwfrm_profile_address_postal").attr("pattern","[0-9]*");
    	      break;
    	    case "CA":
      	      $("#addressmodal-stateNonUS").attr( "required","" );
      	      $("#addressmodal-state").removeAttr( "required" );
      	      $("#addressmodal-stateText").removeAttr( "required" );

      	      $("#addressmodal-stateNonUS").show();
      	      $("#addressmodal-state").hide();
      	      $("#addressmodal-stateText").hide();
      	      $("#dwfrm_profile_address_postal").removeAttr("inputmode");
      	      $("#dwfrm_profile_address_postal").removeAttr("pattern");
      	      break;
    	    default:       	    
      	      $("#addressmodal-stateText").attr( "required","" );
  	      	  $("#addressmodal-state").removeAttr( "required" );
  	      	  $("#addressmodal-stateNonUS").removeAttr( "required" );
      	      $("#addressmodal-state").hide();
      	      $("#addressmodal-stateNonUS").hide();
    	      $("#addressmodal-stateText").show();
    	      
    	      $("#dwfrm_profile_address_postal").removeAttr("inputmode");
     	      $("#dwfrm_profile_address_postal").removeAttr("pattern");
    	  }
    	  
    	  /*setTimeout(function() {
     		  validator.init();
     		  var formValidator = $("#dwfrm_profile_address").validate()
     		  if(!formValidator.form()){
     			  $(".enter-addaddress-link").hide();  
     			  $("#addaddressModalCollapse").addClass("show");
     		  }
     	  }, 100);*/
			      	         	
    });
    

    if($("#country").val() == 'US' || $("#country").val() == 'CA'){
    	$('#stateText').hide();
    	$("#stateText").removeAttr( "required" );
    }
    
    /*
     * Shipping form Country Change
     */
    $(document).on('change', '#addressmodal-stateNonUS', function(){
   	 var selectedState = $("#addressmodal-stateNonUS").val();
   	 $("#addressmodal-stateText").val(selectedState);
    });
    
    /*
     * Shipping Add Address
     */
    $('#checkout-container').on('click', '.add-address-link', function(){
    	$('.address-title').text('Add address');
    	$('#dwfrm_profile_address_addressid').val($('#createAddressID').val());
    	$('#addressModal-mode').val('');
    	$('#addaddressModalCollapseLink').show();
    	$('.enter-addaddress-link').show();
		$("#addaddressModalCollapse").removeClass("show");
		$('#addressmodal-stateNonUS').hide();
		$("#dwfrm_profile_address_postal").attr("inputmode","decimal");
	    $("#dwfrm_profile_address_postal").attr("pattern","[0-9]*");
    }); 
    
    /* Shipping Summary Edit 
     * 
     */
    $('#checkout-container').on('click', '.edit-contact-section', function(event){
        event.stopImmediatePropagation();
        var url = $('#renderShippingEdit').val();
        window.location.replace(url);
       /* updateSection('',url,'GET','#checkout-container', function() {
			window.initbraintreeSG();
		}); */
    });
    
    /* Shipping Address Autofill Fix (Safari) 
     * 
     */
    $('#checkout-container').on('blur', '#dwfrm_singleshipping_shippingAddress_addressFields_address1', function(event){
    	if ( /^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
        	if($('#dwfrm_singleshipping_shippingAddress_addressFields_address1').val() !=''){
    			  $(".enter-address-link").hide();  
     			  $("#addressCollapse").addClass("show");
        	} 
    	}

    });


	$('#checkout-container').on('touchstart', '#dwfrm_singleshipping_shippingAddress_addressFields_address1', function(event){
    	if ( /^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
			$(".enter-address-link").hide();  
     		$("#addressCollapse").addClass("show");
    	}

    });

    
    $(document).on('click', '.giftwrap-toggle', function(){
    	var eligibility = $(this).data('eligibility');
    	var checked = $(this).is(':checked');
    	if(checked) {
    		if($('#giftbox-message').length){
    			$('#giftbox-message').text('Gift box has been added to your bag');
    		}
    		if(eligibility == 'ineligible') {
    		    $('#giftwrap-toggle-bs').prop('checked', false);
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
    $(document).on('click', '.hasGiftMessage', function() {
    	var defaultLength = 210;
    	if($('.gift-message-container').is(":visible")) {
//    		var giftMsg = $(".gift-message-summary-block .gift-message small").text();
    		var giftMsg = $(".gift-message-container .message").text();
    		if(giftMsg) {
    			$("#textAreaPost").val(giftMsg);
    			defaultLength = defaultLength-giftMsg.length;
    		} else {
        		$("#textAreaPost").val(null);
    		}
    	} else {
    		$("#textAreaPost").val(null);
    	}
    	$('#giftMessageModal .char-remain-count').text(defaultLength);
    	/*if($("#gift-price-bs").is(":visible")) {
		    $('#giftwrap-toggle-bs').prop('checked', true);
			var eligibility = $("#giftwrap-toggle-bs").data('eligibility');
			if(eligibility === 'part-eligible') {
		    	$("#giftbox-part-eligible-validation").show();
			}
		} else {
		    $('#giftwrap-toggle-bs').prop('checked', false);
	    	$("#giftbox-part-eligible-validation").hide();
		}*/
    	$("#giftbox-ineligibile-validation").hide();
    	$(".special-character-validation").hide();
    });
    
  //Gift message modal open handle
	$("#giftMessageModal").on("show.bs.modal", function () {
		trapModalFocus();
	});
	
	// Trap focus on login modal when open for tab events
	var trapModalFocus = function () {
		var container = document.querySelector("#giftMessageModal");
		container.addEventListener('keydown', focusElementLogin);
	    
	    // Close login modal
		$('.close-bag').on('keypress',function(e) {
		    if(e.which == 13 || e.which == 32) {
		    	$(this).trigger("click");
		    }
		});
	}

	var focusElementLogin = function (e) {
		var container = document.querySelector("#giftMessageModal");
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
	
  //update char count in gift wrap message
    $('#checkout-container').on('keydown', 'textarea[data-character-limit]', function (e) {
        var text = $.trim($(this).val()),
        charsLimit = $(this).data('character-limit'),
        charsUsed = text.length;
        var controlKeys = ['8', '13', '46', '45', '36', '35', '38', '37', '40', '39'];

        if ((charsUsed >= charsLimit) && (controlKeys.indexOf(e.which.toString()) < 0)) {
        	e.preventDefault();
        }
    }).on('change keyup mouseup', 'textarea[data-character-limit]', function () {
        var text = $.trim($(this).val()),
            charsLimit = $(this).data('character-limit'),
            charsUsed = text.length,
            charsRemain = charsLimit - charsUsed;

        if (charsRemain < 0) {
            $(this).val(text.slice(0, charsRemain));
            charsRemain = 0;
        }

        $(this).next('div.char-count').find('.char-remain-count').html(charsRemain);
        $('.ea-char-remain-count').html('you have '+charsRemain+'characters left out of 210');
        if($('#giftmsg-char-length').length){
        	var charcounttext= $(this).next('div.char-count').text();
        	$('#giftmsg-char-length').text(charcounttext);
        }
    });
    
    
    /*
     * Remove GWP promo if modal closed without selecting any bonus items
     */

    $('#checkout-container').on('hidden.bs.modal', '#giftModal', function(event){
      event.stopImmediatePropagation();
      if($('.add-bonus-items').length > 0 ){
        $('.promo-close svg').trigger('click');
      }
    });
	
};

	$('#giftMessageModal').on('shown.bs.modal', function () {
		 $('#giftMessageModal .close').focus();
	});

exports.submitShippingForm = submitShippingForm;
exports.getShippingMethodURL = getShippingMethodURL;
exports.initShippingListeners = initShippingListeners;