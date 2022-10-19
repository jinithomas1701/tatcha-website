'use strict';

var ajax = require('../../ajax'),
    formPrepare = require('./formPrepare'),
    progress = require('../../progress'),
    tooltip = require('../../tooltip'),
    util = require('../../util');

var shippingMethods;
/**
 * @function
 * @description Initializes gift message box, if shipment is gift
 */
function giftMessageBox() {
    // show gift message box, if shipment is gift
    $('.gift-message-text').toggleClass('hidden', $('input[name$="_shippingAddress_isGift"]:checked').val() !== 'true');
}

/**
 * @function
 * @description updates the order summary based on a possibly recalculated basket after a shipping promotion has been applied
 */
function updateSummary() {
    var $summary = $('.update-summary');
    // indicate progress
   // progress.show($summary);

    // load the updated summary area
    $summary.load(Urls.summaryRefreshURL, function () {
        // hide edit shipping method link
        $summary.fadeIn('fast');
        $summary.find('.checkout-mini-cart .minishipment .header a').hide();
        $summary.find('.order-totals-table .order-shipping .label a').hide();
        
        if($('#chkInternationalDutiesNotification').length>0){
    		if($('#chkInternationalDutiesNotification').is(':checked')){
    			$('.btn-checkout-continue').removeAttr('disabled');
    		}
    		else{
    			$('.btn-checkout-continue').attr('disabled','true');
    		}
        }
        var cartQty = parseInt($('.checkout-summary-total').data('cartqty'));
        if(cartQty == 1) {
        	cartQty = cartQty + ' item';
        } else {
        	cartQty = cartQty + ' items';
        }
        $('#summary-cartqty').html(cartQty);
        /*var checkoutTotal = $('.checkout-summary-total').data('checkout-summary-total');
        var applepayButton = $('.js_braintree_applepay_button');
        var config = applepayButton.data('braintree-config');
        config.options.amount = checkoutTotal;
        applepayButton.attr('data-braintree-config', JSON.stringify(config));*/
        progress.hide();
    }); 
    
}

/**
 * @function
 * @description Helper method which constructs a URL for an AJAX request using the
 * entered address information as URL request parameters.
 */
function getShippingMethodURL(url, extraParams) {
    var $form = $('.address');
    var params = {
        address1: $form.find('input[name$="_address1"]').val(),
        address2: $form.find('input[name$="_address2"]').val(),
        countryCode: $form.find('select[id$="_country"]').val(),
        stateCode: $form.find('[name$="_states_state"]').val(),
        postalCode: $form.find('input[name$="_postal"]').val(),
        city: $form.find('input[name$="_city"]').val()
    };
    return util.appendParamsToUrl(url, $.extend(params, extraParams));
}

/**
 * @function
 * @description selects a shipping method for the default shipment and updates the summary section on the right hand side
 * @param
 */
function selectShippingMethod(shippingMethodID) {
    // nothing entered
    if (!shippingMethodID) {
        return;
    }
    // attempt to set shipping method
    //progress.show();
    var url = getShippingMethodURL(Urls.selectShippingMethodsList, {shippingMethodID: shippingMethodID});
    
    progress.showFull();
    
    ajax.getJson({
        url: url,
        callback: function (data) {
            updateSummary();
            //progress.hide();
            if (!data || !data.shippingMethodID) {
                window.alert('Couldn\'t select shipping method.');
                return false;
            }
            // display promotion in UI and update the summary section,
            // if some promotions were applied
            $('.shippingpromotions').empty();

            progress.hideFull();
            
            // if (data.shippingPriceAdjustments && data.shippingPriceAdjustments.length > 0) {
            //     var len = data.shippingPriceAdjustments.length;
            //     for (var i=0; i < len; i++) {
            //         var spa = data.shippingPriceAdjustments[i];
            //     }
            // }
        }
    });
}

/**
 * @function
 * @description Make an AJAX request to the server to retrieve the list of applicable shipping methods
 * based on the merchandise in the cart and the currently entered shipping address
 * (the address may be only partially entered).  If the list of applicable shipping methods
 * has changed because new address information has been entered, then issue another AJAX
 * request which updates the currently selected shipping method (if needed) and also updates
 * the UI.
 */
function updateShippingMethodList() {
	$('.loader-content').hide();
    var $shippingMethodList = $('#shipping-method-list');
    if (!$shippingMethodList || $shippingMethodList.length === 0) { return; }
    var url = getShippingMethodURL(Urls.shippingMethodsJSON);
    //progress.show();
    progress.showFull();
    ajax.getJson({
        url: url,
        callback: function (data) {
            if (!data) {
                window.alert('Couldn\'t get list of applicable shipping methods.');
                return false;
            }
            /*
             * Need to refresh to updatefedex rates
             *if (shippingMethods && shippingMethods.toString() === data.toString()) {
                // No need to update the UI.  The list has not changed.
                return true;
            }*/

            // We need to update the UI.  The list has changed.
            // Cache the array of returned shipping methods.
            shippingMethods = data;
            // indicate progress
            //progress.show($shippingMethodList);
            progress.showFull();

            // load the shipping method form
            var smlUrl = getShippingMethodURL(Urls.shippingMethodsList);
            $shippingMethodList.load(smlUrl, function () {
            	progress.hideFull();
            	
                $shippingMethodList.fadeIn('fast');
                // rebind the radio buttons onclick function to a handler.
                $shippingMethodList.find('[name$="_shippingMethodID"]').click(function () {
                    selectShippingMethod($(this).val());
                });
                if($shippingMethodList.find('[name$="_shippingMethodID"]').length === 0){
                   $('.btn-checkout-continue').attr('disabled','true');
                	 }else{
                	$('.btn-checkout-continue').removeAttr('disabled');
                 }
                // update the summary
                updateSummary();
               // progress.hide();
                tooltip.init();
                //if nothing is selected in the shipping methods select the first one
                if ($shippingMethodList.find('.input-radio:checked').length === 0) {
                    $shippingMethodList.find('.input-radio:first').prop('checked', 'checked');
                    $shippingMethodList.find('.input-radio:first').parents('.radio-ship-option').addClass('selected');
                    $shippingMethodList.find('.input-radio:checked').trigger('click');
                }
            });
        }
    });
}

function setLoqateCountry(country) {
	if (typeof(pca) !== "undefined") {
    	try {
    		pca.on("load", function(type, id, control) {
    			if(control !== undefined || control !== null) {
    				control.setCountry(country);
    			}
    		});
    	} catch(err){
    		$('.shippingAddressWrap').show();
    		$('.showShippingAddressFields').hide();
    	}
	} else {
		
		$('.shippingAddressWrap').show();
		$('.showShippingAddressFields').hide();
	}
}

function updateADIntlWarn() {
	var country = $('select[name$="_shippingAddress_addressFields_country"]').val();
	setLoqateCountry(country);
	if(country == 'US') {
		$('#ad-intl-warn').hide();
	} else {
		$('#ad-intl-warn').show();
	}
}

exports.init = function () {
    formPrepare.init({
        continueSelector: '[name$="shippingAddress_save"]',
        formSelector:'[id$="singleshipping_shippingAddress"]'
    });
    $('input[name$="_shippingAddress_isGift"]').on('click', giftMessageBox);

    $('.address').on('change',
        'input[name$="_addressFields_postal"]',
        updateShippingMethodList
    );
    
    $('.address').on('change',
        'select[name$="_shippingAddress_addressFields_country"]',
        updateADIntlWarn
    );

    giftMessageBox();
    updateShippingMethodList();
    updateADIntlWarn();

    if($('.select-address').length){
    		$('input.phone').removeClass('phone').removeClass('required');
    }
    
    $('.modal-tatcha-add-address').on('show.bs.modal', function () {
    		$('#dwfrm_profile_address_phone').addClass('phone').addClass('required');
    	})
    	
    $('.modal-tatcha-add-address').on('hidden.bs.modal', function () {
    		$('#dwfrm_profile_address_phone').removeClass('phone').removeClass('required');
    	})      
};


$(document).on('click', '#giftwrap-toggle', function(e){
	var eligibility = $(this).data('eligibility');
	var checked = $(this).is(':checked');
	if(checked) {
		if(eligibility == 'ineligible') {
			$('#ineligibleGiftAllModal').modal("show");
		} else if(eligibility == 'part-eligible') {
			$('#ineligibleGiftPartialModal').modal("show");
		} else {
			switchGiftWrap();
		}
	} else {
		switchGiftWrap();
	}
});

$('#addGiftWrap').on('click', function(){
	switchGiftWrap();
	$('#ineligibleGiftPartialModal').modal('hide');
	$('#giftwrap-toggle').attr("checked", true);
});
$('#skipGiftWrap').on('click', function(){
	$('.gifwrap-no-eligible-msg').show();
})

$('#ineligibleGiftAllModal, #ineligibleGiftPartialModal').on('hidden.bs.modal', function () {
    $('#giftwrap-toggle').prop('checked', false);
});

function switchGiftWrap() {
	progress.showFull();
	var href = $('#add-giftwrap-button').attr('href');
	var remove = $('#remove-giftwrap-button').attr('href');
	var checked = $('#giftwrap-toggle').is(':checked');
	if(checked) {
		ajax.load({
			url: href,
		    data: { checked : checked },
		    callback: function (response) {
			    updateSummary();
			    $('#giftwrap-toggle').prop('checked', 'checked');			   
			    if(pageContext.ns === 'cart') {
					location.reload();
				} else {
					progress.hideFull();
				}
		    }.bind(this)
		});
	} else {
		ajax.load({
			url: remove,
		    callback: function (response) {
			    updateSummary();
			    $('#giftwrap-toggle').attr('checked', false);
				    
			    if(pageContext.ns === 'cart') {
					location.reload();
				} else {
					progress.hideFull();
				}
		    }.bind(this)
		}); 
	}
}

$(document).on('submit', '#giftmsg-form', function(e){
	e.preventDefault();
	progress.showFull();
	var form  = $('#giftmsg-form');
	var giftMessage = form.find('textarea').val();
	if(giftMessage != null && (giftMessage.includes("<script") 
			|| (giftMessage.length > 0 && giftMessage.replace(/\s/g, '').length<=0))) {
	    $('.special-character-validation').show();
	    $('.form-group').addClass('has-error'); 
	    e.preventDefault();
	    progress.hideFull();
	} else {
	    $('.special-character-validation').hide();
	    $('.form-group').removeClass('has-error'); 
	if(giftMessage != null) {
		ajax.load({
		    url: form.attr('action'),
		    data: form.serialize(),
		    callback: function (response) {
		    	updateSummary();
		    	if(pageContext.ns === 'cart') {
		    		location.reload();
		    	} else {
		    		$('.gift-message-add-block').hide();
			        $('.gift-message-summary-block').show();
			        $('.gift-message-box').find('em').text(giftMessage);
			        form.find('textarea').attr('value', giftMessage);
				    switchControlsBs('save');
			        progress.hideFull();
		    	}
		      }.bind(this)
		});
	}
	$('#giftMessageModal').modal('hide');
}
});

//Address add form (Shipping)
$("#edit-address-form" ).submit(function( event ) {
	  if(typeof event.result != 'undefined' && event.result){
		  $('.loader-preventive').show();
	  }
});


$(document).on('click', '#remove-giftmsg', function(e){
	e.preventDefault();
	progress.showFull();
	 var href = $('#remove-giftmsg').attr('href');
		ajax.load({
		    url: href,
		    callback: function (response) {
		    updateSummary();
		    $('.gift-message-summary-block').hide();
		    $('.gift-message-add-block').show();
		    switchControlsBs('remove');
		    progress.hideFull();
	       }.bind(this)
		});
});


/**
 * 
 * **/
function shippingFormValidations() {
	
	$("input[name=dwfrm_singleshipping_shippingAddress_save]").removeAttr('disabled');
	if($('.braintree-text-input').hasClass('has-error')){
		progress.hideFull();
		return false;
	}
	
	/**
	 *  Shipping page address validation,
	 *  for expanding the the collapsed address section, if any field has any error
	 * */
	
	var isShippingPage = $(this).attr('data-shipping-page');
	if(isShippingPage === 'true') {
		var collapsedAddrFeilds = [], hasError;
		
		var form = $(this).closest('form');
		
		var dataForm = $(this).attr('data-form');
		if(dataForm === 'shipping') {
			collapsedAddrFeilds = ['dwfrm_singleshipping_shippingAddress_addressFields_states_state', 'dwfrm_singleshipping_shippingAddress_addressFields_postal', 'dwfrm_singleshipping_shippingAddress_addressFields_city'];
		} else if(dataForm === 'account') {
			collapsedAddrFeilds = ['dwfrm_profile_address_states_state', 'dwfrm_profile_address_postal', 'dwfrm_profile_address_city'];
		}
		
		for(var i=0;i< collapsedAddrFeilds.length;i++) {
			var fieldValue = form.find('#'+collapsedAddrFeilds[i]).val();
			if(fieldValue == undefined || !fieldValue || fieldValue.length === 0) {
				hasError = true;
			}
		}
		
		if(hasError) {
			$('.shippingAddressWrap').show();
			$('.showShippingAddressFields').hide();
			$(".show-shipping-error .error-block").show();
			progress.hideFull();
		}else{
			$(".show-shipping-error .error-block").hide();
		}
	}
	
	if($('#customeremail').length) {
		if($("input[name=email]").val().trim().length > 0){
			var emailRegex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
			if(!emailRegex.test($("input[name=email]").val())) {
				$("#guest-email-div").addClass('has-error');
				$("#error-text").text("Please enter a valid email.")
				$(".show-shipping-error .error-block").show();
				$("#error-text").show();
				progress.hideFull();
				return false;
			} else {
				$("#customeremail").val($("input[name=email]").val());
				$("#error-text").hide();
				$("#guest-email-div").removeClass('has-error');
				if(hasError){
					$(".show-shipping-error .error-block").show();
				}else{
					$(".show-shipping-error .error-block").hide();
				}
				
			}
		}else{
			$("#guest-email-div").addClass('has-error');
			$("#error-text").text("This field is required.")
			$("#error-text").show();
			$(".show-shipping-error .error-block").show();
			progress.hideFull();
			return false;
		}
	}
}

/**
 * Shipping form submit - validation check.
 * */
$(".demo-save-shipping").on('click', shippingFormValidations);
$('.shipping-submit-post-verification').on('click', shippingFormValidations);

/*
 * added for giftwrap bs4 changes 
 * @date 04-feb-2020
 * */
/*
 * giftwrap-toggle-bs- id of 'add gift box' option checkbox in cart.isml page
 * this is event is added to toggle gift box eligibility error messages 
 * @date 04-feb-2020
 * */
$(document).on('click', '#giftwrap-toggle-bs', function(e){
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

/*
 * this function is added to toggle giftwrap area add/edit links and other elements
 * @date 04-feb-2020
 * */
function switchControlsBs(origin) {
	if(pageContext.ns === 'cart') {
		if(origin==='remove') {
			$('#giftMessageModal #textAreaPost').attr('value', null);
			$('#giftMessageModal #textAreaPost').val(null);
			$('#giftMessageModal #textAreaPost').text(null);
		}
		
		var giftMessage = $("#textAreaPost").val();
		var checked = $('#giftwrap-toggle-bs').is(':checked');
		if((!giftMessage || giftMessage == '') && !checked) {
			$('.gift-message-add-block-bs a#hasGiftMessage-edit').hide();
			$('.gift-message-add-block-bs a#hasGiftMessage-add').show();
	    } else {
	    	$('.gift-message-add-block-bs a#hasGiftMessage-edit').show();
			$('.gift-message-add-block-bs a#hasGiftMessage-add').hide();
	    }
		
		if(!giftMessage || giftMessage == '') {
			$('.gift-message-summary-block').hide();
		}
	    if(checked) {
	    	$("#gift-price-bs").show();
	    } else {
	    	$("#gift-price-bs").hide();
	    }
	    
	    if(origin==='save') {
	    	 var eligibility = $("#giftwrap-toggle-bs").data('eligibility');
	 	    if(eligibility === 'part-eligible' && checked) {
	 	    	$('.gifwrap-no-eligible-msg').show();
	 	    } else {
	 	    	$('.gifwrap-no-eligible-msg').hide();
	 	    }
	    }
	}
}

/*
 * moved this code from cart.js as in cart page id of 'add gift box' option is changed from hasGiftMessage to hasGiftMessage-add
 * @date 04-feb-2020
 * */
$('#hasGiftMessage').on('click', function (e) {
	$('#giftMessageModal #textAreaPost').val('');
	$('#giftMessageModal .char-remain-count').text('210');
});


$(document).on('click', '.showShippingAddressFields', function(e) {
	$('.shippingAddressWrap').show();
	$(this).hide();
});


(function ($) {
    $.fn.serializeFormJSON = function () {

        var o = {};
        var a = this.serializeArray();
        $.each(a, function () {
            if (o[this.name]) {
                if (!o[this.name].push) {
                    o[this.name] = [o[this.name]];
                }
                o[this.name].push(this.value || '');
            } else {
                o[this.name] = this.value || '';
            }
        });
        return o;
    };
})(jQuery);

function getActiveFormFields(addressForm) {
	var formFields = [];
	if(addressForm === 'shipping') {
		formFields = ['dwfrm_singleshipping_shippingAddress_addressFields_country',
			'dwfrm_singleshipping_shippingAddress_addressFields_address1',
			'dwfrm_singleshipping_shippingAddress_addressFields_address2',
			'dwfrm_singleshipping_shippingAddress_addressFields_postal',
			'dwfrm_singleshipping_shippingAddress_addressFields_states_state',
			'dwfrm_singleshipping_shippingAddress_addressFields_city',
			'dwfrm_singleshipping_shippingAddress_addressFields_phone',
			'dwfrm_singleshipping_shippingAddress_addressFields_firstName',
			'dwfrm_singleshipping_shippingAddress_addressFields_lastName'];
		
	} else if(addressForm === 'account') {
		formFields = ['dwfrm_profile_address_country',
			'dwfrm_profile_address_address1',
			'dwfrm_profile_address_address2',
			'dwfrm_profile_address_postal',
			'dwfrm_profile_address_states_state',
			'dwfrm_profile_address_city',
			'dwfrm_profile_address_phone',
			'dwfrm_profile_address_firstname',
			'dwfrm_profile_address_lastname'];
			
			if($('#edit-address-form .modal-body .form-group.has-error').length > 0) {
				$('.shipping-submit-post-verification').trigger('click');
				progress.hideFull();
			}
	}
	
	return formFields;
}


/**
 * Set input address to the verification modal
 * **/
function setInputDatatoModal(inputAddress) {
	var addrline1 = inputAddress.Address1 ? inputAddress.Address1 : '';
	addrline1 += inputAddress.Address2 ? ( ' ' + inputAddress.Address2) : '';
	
	var locality = inputAddress.Locality ? inputAddress.Locality : '';
	locality += inputAddress.AdministrativeArea ? ( ' ' + inputAddress.AdministrativeArea) : '';
	locality += inputAddress.PostalCode ? ( ' ' + inputAddress.PostalCode) : '';
	
	if(addrline1) {
		$('.entered-address-data .addressline').text(addrline1);
	}
	
	if(locality) {
		$('.entered-address-data .address-locality').text(locality);
	}
}


/**
 * if Address verification is enabled, this method will be executed when clicking on continue button from shipping page,
 * Method will be calling Loqate-VerifyAddress, controller method to invoke the API
 * **/
$('.checkout-post-bag .shipping-verify-address').on('click', function(e) {
	
	progress.showFull();
	
	var that = this;
	
	var addressForm = $(that).attr('data-form');
	if(addressForm.length > 0) {
		$('#addressOriginForm').val(addressForm);
	}
	
	var shippingAddressFields;
	shippingAddressFields = getActiveFormFields(addressForm);
	
	//closest form
	var shippingFormData = $(this).closest('form').serializeFormJSON();
	if(shippingFormData) {
		
		if($.trim(shippingFormData[shippingAddressFields[1]]).length === 0 || $.trim(shippingFormData[shippingAddressFields[0]]).length === 0 ||
				$.trim(shippingFormData[shippingAddressFields[3]]).length === 0 || $.trim(shippingFormData[shippingAddressFields[4]]).length === 0 ||
				$.trim(shippingFormData[shippingAddressFields[5]]).length === 0 || $.trim(shippingFormData[shippingAddressFields[6]]).length === 0 ||
				$.trim(shippingFormData[shippingAddressFields[7]]).length === 0 || $.trim(shippingFormData[shippingAddressFields[8]]).length === 0 ||
				($('#guest-email-div input[name="email"]').is(':visible') && $.trim($('#guest-email-div input[name="email"]').val()).length === 0)) {
			e.preventDefault();
			$('.shipping-submit-post-verification').trigger('click');
			progress.hideFull();
			return;
		}
		
		var requestData = {
				"Address1": shippingFormData[shippingAddressFields[1]],
				"Address2": shippingFormData[shippingAddressFields[2]],
				"Country": shippingFormData[shippingAddressFields[0]],
				"PostalCode": shippingFormData[shippingAddressFields[3]],
				"State": shippingFormData[shippingAddressFields[4]],
				"City": shippingFormData[shippingAddressFields[5]]
		};
		
		$.ajax({
	        type: 'POST',
	        url: util.ajaxUrl(Urls.verifyAddress),
	        data: {
	        	Address: JSON.stringify(requestData)
	        },
	        success:function(res) {
	        	var inputAddr = '';
	        	var suggestedAddr = '';
	        	if(res && res.response) {
	        		var response =  res.response;
	        		
	        		// If the response has address suggestion, show address selection modal
	        		if(response.success && response.hasAddressSuggetion) {
	        			
	        			var addressData = response.data;
	        			if(addressData) {
		
							// If address is verfied and has a match score of 100, submit shipping form
							if(response.verificationStatus && response.verificationStatus === 'verified' && response.matchScore && response.matchScore === '100') {
								$('.shipping-submit-post-verification').trigger('click');
		        				progress.hideFull();
		        				return;
							}
	        				
	        				//if the inout address is not verified, we will be showing the address which user entered with a warning
	        				if(response.verificationStatus && response.verificationStatus === 'unverified') {
	        					if(addressData.inputAddress) {
	        						
	        						//set inout address to verification modal
	        						setInputDatatoModal(addressData.inputAddress);
			        				
			        				$('.suggested-address-title, .suggested-address-container').addClass('displaynone');
			        				$('#enteredAddress').prop("checked", true);
			        				$('.text-danger-checkout').show();
			        				$('#loqateAddressVerification').modal('show');
				        			progress.hideFull();
				        			
				        			return;
	        					}
		        			}
	        				
	        				//set user entered address
		        			if(addressData.inputAddress) {
		        				var inputAddress = addressData.inputAddress;
		        				setInputDatatoModal(inputAddress);
		        				
		        			}
		        			
		        			//set suggested address
		        			if(addressData.suggestedAddress) {
		        				var suggetedAddress = addressData.suggestedAddress;
		        				$('.suggested-address-title, .suggested-address-container').removeClass('displaynone');
		        				
		        				$('#selectedAddress').prop("checked", true);
		        				$('#enteredAddress').prop("checked", false);
		        				
		        				$('#loqateSuggestedAddress').val(JSON.stringify(suggetedAddress));
		        				if(suggetedAddress.Address1) {
	            					$('.suggested-address-data .addressline').text(suggetedAddress.Address1);
	            				}
	            				
	            				if(suggetedAddress.Address2) {
	            					$('.suggested-address-data .address-locality').text(suggetedAddress.Address2);
	            				}
		        			}
	        			} else {
	        				$('.shipping-submit-post-verification').trigger('click');
	        				progress.hideFull();
	        				return;
	        			}
	        			
	        			// show address suggestion modal
	        			
	        			$('#loqateAddressVerification').modal('show');
	        			progress.hideFull();
	        		} else {
	        			progress.hideFull();
	        			$('.shipping-submit-post-verification').trigger('click');
	        		}
	        	} else {
	        		progress.hideFull();
	        		$('.shipping-submit-post-verification').trigger('click');
	        	}
	        },
	        error: function(err) {
	        	progress.hideFull();
	        	$('.shipping-submit-post-verification').trigger('click');
	        }
	    });
	}
	
})


/**
 * Set Loqate suggested address to shipping form
 * **/
var setLoqateSuggestedAddress = function(address) {
	
	// Address form
	var originAddressForm = $('#addressOriginForm').val();
	
	var shippingAddressFields;
	shippingAddressFields = getActiveFormFields(originAddressForm);
	
	var $form = $('.addressformfields');
	var suggestedAddr = {
			'Country': address['Country'],
			'Address1': address['Address1'],
			'Address2': address['Address2'],
			'PostalCode': address['PostalCode'],
			'AdministrativeArea': address['AdministrativeArea'],
			'Locality': address['Locality']
	};
	
	for(var key in suggestedAddr) {
		switch(key) {
			case 'Country':
				$form.find('#'+shippingAddressFields[0]).val(suggestedAddr[key]).trigger('change');
				break;
			case 'Address1':
				$form.find('#'+shippingAddressFields[1]).val(suggestedAddr[key]);
				break;
			case 'Address2':
				//$form.find(shippingAddressFields[2]).val(suggestedAddr[key]);
				break;
			case 'PostalCode':
				$form.find('#'+shippingAddressFields[3]).val(suggestedAddr[key]);
				break;
			case 'AdministrativeArea':
				$form.find('[name="'+ shippingAddressFields[4] +'"]').val(suggestedAddr[key]);
				$form.find('[name="'+ shippingAddressFields[4] +'"]').attr('data-selectedValue', suggestedAddr[key]);
				break;
			case 'Locality':
				$form.find('#'+shippingAddressFields[5]).val(suggestedAddr[key]);
				break;
			default:
				break;
		}
	}
	
}

/**
 * Address suggestion modal (Loqate), save address CTA click
 * */
$('.checkout-post-bag .save-loqate-suggested-address').on('click', function() {
	progress.showFull();
	var selectedAddressOption = $("input[name='selectAddress']:checked").val();
	if(selectedAddressOption === 'suggestedAddress' && $('#loqateSuggestedAddress').val().length > 0) {
		var suggestedAddress = JSON.parse($('#loqateSuggestedAddress').val());
		
		setLoqateSuggestedAddress(suggestedAddress);
		
		if(suggestedAddress.Country !== 'US') {
	    	updateShippingMethodList();
	    }
	    $('.shipping-submit-post-verification').trigger('click');
	} else {
		$('.shipping-submit-post-verification').trigger('click');
	}
});

$('input[type=radio][name=selectAddress]').change(function() {
    if (this.value == 'enteredAddress') {
        $('.text-danger-checkout').show();
    }
    else if (this.value == 'suggestedAddress') {
    	$('.text-danger-checkout').hide();
    }
});


$("#loqateAddressVerification").on("hidden.bs.modal", function () {
	$('.text-danger-checkout').hide();
	
	if($('#addAddressModal').is(':visible')) {
		$('body').addClass('modal-open');
	}
});

$('.edit-link').on('click',function(){
	$('#loqateAddressVerification').modal('hide');
	
	// do not scroll if the profile (add address) form is visible on the page
	if($('#isUserLoggedIn').length === 0) {
		setTimeout(function(){$('.checkout-shipping-panel')[0].scrollIntoView({behavior:"smooth"})},500)
	}
	
	if($('#addAddressModal').is(':visible')) {
		$('body').addClass('modal-open');
	}
})
$('.entered-address-container').on('click',function(){
	$('#enteredAddress').click();
	$(".entered-address-container .alert-text").show();
})
$('#enteredAddress').on('click',function(event){
	event.stopImmediatePropagation();
})
$('#selectedAddress').on('click',function(event){
	event.stopImmediatePropagation();
})
    
$('.suggested-address-container').on('click',function(){
  $('#selectedAddress').click();
  $(".entered-address-container .alert-text").hide();
})

exports.updateShippingMethodList = updateShippingMethodList;
