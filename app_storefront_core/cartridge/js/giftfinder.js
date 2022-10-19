'use strict';
var ajax = require('./ajax');
var validator = require('./validator');

module.exports = function() {
	
	//input name
	$('.gift-finder-box #giftFinderInputName').on('input', function() {
		if($(".findTheGiftBtn").attr('disabled')){
			$(".findTheGiftBtn").removeAttr('disabled');
		}
		
		if($(this).val().length < 1 ){
			$(".findTheGiftBtn").attr('disabled', "");
		}
	});
	
	$('.gift-finder-box #giftFinderInputName').on('focus', function() {
		$('#giftFinderInputName').css('margin-bottom',"2.3125rem");
		$('#giftFinderInputName').removeClass('border border-danger');
		$('#giftFinderNameErrorMsg').addClass('d-none');
	});
	
	$('.gift-finder-box .gift-finder-btn.findTheGiftBtn').on('click', function(e){
		e.preventDefault();
		var name = $('.gift-finder-box #giftFinderInputName').val();
		var nameRegex = /^[a-zA-Z ]{2,30}$/;

		if(!name || !nameRegex.test(name) || ($.trim(name)).length < 1) {
			$('#giftFinderInputName').addClass('border border-danger');
			$('#giftFinderInputName').css('margin-bottom','0px');
			$('#giftFinderNameErrorMsg').removeClass('d-none');
			return false;
		}
		
		scrollToTop();
		$('#giftfinderform #gfname').val(name);
		
		showNextQuestion(this);
		$('.gift-finder-box #finderName').text( $('.gift-finder-box #giftFinderInputName').val() +' is a...' );
		$('.name-dot').hide();
		$('.cat-dot').show();
		$('.gift-finder-content #gtmGFactiveForm').val('gtm-categoryForm');
		$('#categorySelector').addClass('gtm-categorySelector');
		$('#giftFinderInputName').removeClass('gtm-giftFinderInputName');
		$('#pricerange').removeClass('gtm-pricerange');
	});
	
	
	//category type
	$('#categorySelector .giftfinderRadioLabel').on('click', function(e){
		
		if($(".gift-finder-btn.continueBtn").attr('disabled')){
			$('.gift-finder-btn.continueBtn').removeAttr('disabled');
		}
		
	});
	
	$('.gift-finder-box .gift-finder-btn.continueBtn').on('click', function(e){
		e.preventDefault();
		scrollToTop();
		
		$('#giftfinderform #category').val($('input[name=giftFinderMethod]:checked', '#categorySelector').val());
		
		showNextQuestion(this);
		$('.cat-dot').hide();
		$('.price-dot').show();
		$('.gift-finder-content #gtmGFactiveForm').val('gtm-priceForm');
		$('#pricerange').addClass('gtm-pricerange');
		$('#categorySelector').removeClass('gtm-categorySelector');
		$('#giftFinderInputName').removeClass('gtm-giftFinderInputName');
	});
	
	//price range
	$('#pricerange .giftfinderRadioLabel').on('click', function(e){
		
		if($(".gift-finder-btn.showResultsBtn").attr('disabled')){
			$('.gift-finder-btn.showResultsBtn').removeAttr('disabled');
		}
		
	});
	
	//form submit
	$('.gift-finder-box .gift-finder-btn.showResultsBtn').on('click', function(e){
		e.preventDefault();
		
		$('#giftfinderform #priceRange').val($('input[name=giftFinderResult]:checked', '#pricerange').val());
		var gfName = $('#gfname').val();
		var category = $('#category').val();
		var priceRange = $('#priceRange').val();
		var actionUrl = $("#giftfinderform").attr('action');
		actionUrl = actionUrl + '?gfname='+gfName+'&category='+category+'&priceRange='+priceRange;
		$("#giftfinderform").attr('action',actionUrl);
		$('#giftfinderform').submit();
	});
	
	
	//dots handling
	$('.gift-finder-dots .state1.active.on').on('click', function(e){
		$('.gift-finder-dots:visible').hide();
		$('.gift-finder-dots.name-dot').show();
		
		$('.gift-finder-row.active').removeClass('active').addClass('d-none');
		$('.gift-finder-row.state1').removeClass('d-none').addClass('active');
		$('.gift-finder-content #gtmGFactiveForm').val('gtm-nameForm');
		$('#giftFinderInputName').addClass('gtm-giftFinderInputName');
		$('#categorySelector').removeClass('gtm-categorySelector');
		$('#pricerange').removeClass('gtm-pricerange');
		
		
		
	})
	
	$('.gift-finder-dots .state2.active.on').on('click', function(e){
		$('.gift-finder-dots:visible').hide();
		$('.gift-finder-dots.cat-dot').show();
		
		$('.gift-finder-row.active').removeClass('active').addClass('d-none');
		$('.gift-finder-row.state2').removeClass('d-none').addClass('active');
		$('.gift-finder-content #gtmGFactiveForm').val('gtm-categoryForm');
		$('#categorySelector').addClass('gtm-categorySelector');
		$('#giftFinderInputName').removeClass('gtm-giftFinderInputName');
		$('#pricerange').removeClass('gtm-pricerange');
	})
	
	function scrollToTop() {
	    $('body,html').animate({
        scrollTop: 0
    }, 250);
    return false;
	}
	
	function showNextQuestion(currentDiv){
		$(currentDiv).parent().closest('.gift-finder-row').removeClass('active');
		$(currentDiv).parent().closest('.gift-finder-row').addClass('d-none');
		
		$(currentDiv).parent().closest('.gift-finder-row').next().removeClass('d-none');
		$(currentDiv).parent().closest('.gift-finder-row').next().addClass('active');
	}
	
	
	//result page
	$(document).on('change', '#gfPersona, #gfPricerange', function(){
		
		$('.loader-preventive').show();
		var gfName = $('#gfname').val();
		var category = $( "#gfPersona option:selected" ).text();
		var priceRange = $( "#gfPricerange option:selected" ).text();
		var actionUrl = $("#giftfinderResultform").attr('action');
		actionUrl = actionUrl + '?gfname='+gfName+'&category='+category+'&priceRange='+priceRange;
		$("#giftfinderResultform").attr('action',actionUrl);
		$('#giftfinderResultform').submit();
	});
	
	$('.giftFinderEmailbutton').on('click', function() {
		//giftFinderEmailInput
		validator.init();
    	var formValidator = $("#giftfinderEmail").validate()
    	if(!formValidator.form()){
    		return false;
    	} 
    	var email = $('#giftFinderEmailInput').val();
		var products = getSelectedProductsForGFMail();
		var addtoemaillistGF = $('#addtoemaillistGF:checked').val();
		var data = {'productData': products, 'email': email, 'addtoemaillistGF': addtoemaillistGF};
		ajax.post({
			url: $(this).data('url'),
	        data: data,
	        callback: function (response) {
	        	response = JSON.parse(response);
	        	if(response.status == 'success') {
					$('.giftFinder-email-modal').hide();
					$('.giftFinderEmailbutton').hide();
					$('.mailSentTxt').show();
					$('.giftFinderEmailbutton').val('');
	        	}
	        }
		});
		
	});
	
	$('.emailResultsBtn').on('click',function(){
		$('#giftFinderEmailInput').val('');
		$('.giftFinder-email-modal').show();
		$('.giftFinderEmailbutton').show();
		$('.mailSentTxt').hide();
	});
	
	function getSelectedProductsForGFMail(){
		var productData = {};
		var name = $('#gfname').val();
		var personaText = $('#gfPersona option:selected').text();
		var priceRange = $('#gfPricerange option:selected').text();
		productData['name'] = name;
		productData['persona'] = personaText;
		productData['priceRange'] = priceRange;
		productData['products'] = [];
		$('.gift-finder-tiles').each(function(e){
			
			var price = $(this).find('.product-tile').find('.product-price .price-sales').text().replace(/\s/g, "");
			if($(this).find('.product-tile').find('.product-price .price-sales .product-price-value').length) {
				price = price.replace("value)", " value)");
				price = price.replace("($", " ($");
			}
			
			var product = {
					'id': $(this).find('.product-tile').attr('data-itemid'),
					'name': $(this).find('.product-tile').attr('data-name'),
					'secondaryName': $(this).find('.product-subtitle').html().trim(),
					'image': $(this).find('.product-tile').find('.product-img').attr('data-src'), 
					'price': price,
					'url': 'https://'+window.location.host+$(this).find('.product-tile').find('.product-view-link').attr('href')
			}
			
			productData['products'].push(product);
		});
		
		productData = JSON.stringify(productData);
		return productData;
	}
	
	//pearl add to bag
	$(document).on('click', '#add-pearl', function (e) {
		$('#saveRegimen , #addAllPearlSelect').modal('hide');
		$('.loader-content').show();
		var id = $('#selectedvariant').val();
		var data;
		if(id) {
			data = {'productIds': id};
		}else{
			data = {'productIds': 'MED-PEARL-EYE'};
		}
		ajax.post({
			url: "/on/demandware.store/Sites-tatcha-Site/default/Cart-AddWhatsnextItems",
	        data: data,
	        callback: function (response) {
	        	if(response) {
	        		response = JSON.parse(response);
	            	if(response.status == 'success') {            		
						$('#addAllToBagModal #addedproducts-count').html(response.totalProducts);
						$('.loader-content').hide();

						$( ".mini-cart-total" ).each(function( index ) {
					        $( this ).trigger("click");
					    	return false;				    	 
					    });
	            	} else {
	            		$('.loader-content').hide();
	            	}
	        	}
	        }
		});
	});
};

