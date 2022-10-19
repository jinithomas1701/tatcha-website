var ajax = require('../ajax');
var quickview = require('../quickview');
var addToCart = require('./product/addToCart');
var minicart = require('../minicart');
var util = require('../util');

var sknCncrn = [];
var eyeCncrn = [];
var eyeConcern = '';
var prdSlctd = [];
var skinTypeVal = '';
var sensitivity = false;
var routine = '';

/**
 * Global add to bag event
 */
var sendRitualFinderAddToCartGlobalGA = function(pid) {
	try {
		
		var prodId = pid || '';
		if (!window.dataLayer) {
			window.dataLayer = [];
		}
		
		dataLayer.push({
			'event': 'add_to_cart_global',
			'prodID': prodId
    	});
		
	} catch(e) {
		
	}
}

function initializeEvents() {
	
	//Initialize to false on load
	 showAMOriginalResults = false;
	 showPMOriginalResults = false;
	 
	 
	 //check if user filter parameters in URL
	 if (window.location.href.indexOf('&amFilters=') > 0) {
		 showAMOriginalResults = true;
	 }

	 if (window.location.href.indexOf('&pmFilters=') > 0) {
		 showPMOriginalResults = true;
	 }
	 
	 // Enable original results button based on selected tab
	 var selectedTime = $('input[name=dayOrNight]:checked').val();
	 
	 if(selectedTime == 'AM' && showAMOriginalResults == true){
		 $('.show-default-result').show();
	 }
	 
	 if(selectedTime == 'PM' && showPMOriginalResults == true){
		 $('.show-default-result').show();
	 }
	 
	 
	 
}

function scrollToTop() {
	    $('body,html').animate({
        scrollTop: 0
    }, 250);
    return false;
}

$('.enable-cta-2').click(function(){
	enableCTA2();
});

function enableCTA2(){
	$('.disabled-cta-2').hide();
	$('.enabled-cta-2').stop().fadeIn(250);
}

$('.enable-cta-3').click(function(){
	enableCTA3();
});

function enableCTA3(){
	$('.disabled-cta-3').hide();
	$('.enabled-cta-3').stop().fadeIn(250);
}

$('.show-state-2').click(function(e){
	e.preventDefault();
	scrollToTop();
	$('.wn-state-1, .wn-state-3, .wn-state-4, .wn-state-5, .wn-state-6').hide();
	$('.wn-state-2').stop().fadeIn(750);
});

$('.show-state-3').click(function(e){
	e.preventDefault();
	scrollToTop();
	if(routine.length > 0) {
		$('#persona').val(routine);
	}
	$('.wn-state-1, .wn-state-2, .wn-state-4, .wn-state-5, .wn-state-6').hide();
	$('.wn-state-3').stop().fadeIn(750);
});

$('.show-state-4').click(function(e){
	e.preventDefault();
	scrollToTop();
	if(skinTypeVal.length > 0) {
		$('#skinType').val(skinTypeVal);
	}
	$('#skinSensitivity').val(sensitivity);
	
	$('.wn-state-1, .wn-state-2, .wn-state-3, .wn-state-5, .wn-state-6').hide();
	$('.wn-state-4').stop().fadeIn(750);
});

$('.show-state-5').click(function(e){
	e.preventDefault();
	scrollToTop();
	if(sknCncrn.length > 0) {
		let concerns = '';
		sknCncrn.forEach(function(cncrn, index) {
			concerns += cncrn;
			if(index < sknCncrn.length - 1) {
				concerns += '|';
			}
		})
		$('input[name="skinConcerns"]').val(concerns);
	}
	
	$('.wn-state-1, .wn-state-2, .wn-state-3, .wn-state-4, .wn-state-6').hide();
	$('.wn-state-5').stop().fadeIn(750);
});
$('.show-state-6').click(function(e){
	e.preventDefault();
	scrollToTop();
	if(eyeConcern.length > 0) {
		let concrns = $('input[name="skinConcerns"]').val() || '';
		if(concrns.length > 0) {
			concrns += '|';
		}
		concrns += eyeConcern;
		$('input[name="skinConcerns"]').val(concrns);
	}
	$('.wn-state-1, .wn-state-2, .wn-state-3, .wn-state-4, .wn-state-5').hide();
	$('.wn-state-6').stop().fadeIn(750);
});

$('#sensitivity').change(function() {
	
	if($(this).is(':checked')) {
		sensitivity = true;
		$(this).parent().attr("aria-checked", "true");
	} else {
		sensitivity = false;
		$(this).parent().attr("aria-checked", "false");
	}
});

$('.whats-next .checkbox-options.dot-style.dot-style-reset li').on('keydown', function(e){
	if(e.keyCode === 32){
		var inputCheckbox = $(this).find('#sensitivity');
		if($(inputCheckbox).prop("checked") === false){
			$(inputCheckbox).prop("checked", true);
			$(this).attr("aria-checked", "true");
			sensitivity = true;
		}else{
			$(inputCheckbox).prop("checked", false);
			$(this).attr("aria-checked", "false");
			sensitivity = false;
		}
		return false;
	}
});

var itemPresent = function(arr, val) {
	let fndElm = false;
	
	if(arr.length > 0) {
		arr.forEach(function(elm) {
			if(elm === val) {
				fndElm = true;
			}
		});
	}
	
	return fndElm ? true : false;
}

var dsblElements = function(elm, arr) {
	
	$(elm).each(function(el, val) {
		let elmVal = $(this).attr('value');
		if(!itemPresent(arr, elmVal)) {
			$(this).attr('disabled', 'disabled');
			$(this).parent().attr('aria-disabled', true);
		}
	})
}


var deleteItem = function(arr, itm) {
	let index = null;
	arr.forEach(function(el, i) {
		if(el === itm) {
			arr.splice(i, 1);
		}
	});
}

var enblElements = function(elm) {
	$(elm).each(function(el, val) {
		$(this).attr('disabled', false);
		$(this).parent().attr('aria-disabled', false);
	})
}


$('.rec-routine').on('click', function(e) {
	if(e.target.value && $(this).is(':checked')) {
		routine = e.target.value;
	}
})

$('.whats-next .radio-options.dot-style.no-radio-dot li').on('keydown', function(e){
	if(e.keyCode === 13){
		var inputRadio = $(this).find('.rec-routine')[0];
		if($(inputRadio).prop("checked") === false){
			$(inputRadio).prop("checked", true);
			if($(this).parent().find('li').attr('aria-checked')){
				$(this).parent().find('li').attr('aria-checked',false);
				$(this).parent().find('.rec-routine').removeAttr('checked');
			}
			$(this).attr("aria-checked",true);
		}
		if($(inputRadio).attr('value') && $(inputRadio).is(':checked')) {
			$(inputRadio).attr("checked","checked");
			routine = $(inputRadio).attr('value');
			enableCTA2();
		}
	}
	
});

$('.skinTypeList').on('click', function(e) {
	if(e.target.value && $(this).is(':checked')) {
		skinTypeVal = e.target.value;
	}
})

$('.whats-next .radio-options.dot-style li').on('keydown', function(e){
	if(e.keyCode === 13){
		var inputRadio = $(this).find('.skinTypeList')[0];
		if($(inputRadio).prop("checked") === false){
			$(inputRadio).prop("checked", true);
			if($(this).parent().find('li').attr('aria-checked')){
				$(this).parent().find('li').attr('aria-checked',false);
			}
			$(this).attr("aria-checked",true);
		}
		if($(inputRadio).attr('value') && $(inputRadio).is(':checked')) {
			skinTypeVal = $(inputRadio).attr('value');
			enableCTA3();
		}
	}
});

$('.skinConcern').on('click', function(e) {	
	skinConcern(this,e.target.value);
});

function skinConcern(concernInput,target){
	var elm = $('.skinConcern');
	if($(concernInput).parent().attr("aria-checked") === "true"){
		$(concernInput).parent().attr("aria-checked", "false");		
	}else{
		$(concernInput).parent().attr("aria-checked", "true");		
	}
	if(target && $(concernInput).is(':checked')) {
		sknCncrn.push(target);
	}
	
	if(target && !$(concernInput).is(':checked')) {
		let val = $(concernInput).attr('value');
		
		if(sknCncrn.length > 2) {
			enblElements(elm);
		}
		deleteItem(sknCncrn, val);
	}
	
	if(sknCncrn.length > 2) {
		dsblElements(elm, sknCncrn);
	}
}

$('.whats-next .checkbox-options.dot-style#skinConcern li').on('keydown', function(e){
	if(e.keyCode === 32){
		var inputCheckbox = $(this).find('.skinConcern')[0];
		if(!($(inputCheckbox).attr('disabled'))){
			if($(inputCheckbox).prop("checked") === false){
				$(inputCheckbox).prop("checked", true);
			}else{
				$(inputCheckbox).prop("checked", false);
			}
			e.target.value=$(inputCheckbox).attr('value');
			skinConcern(inputCheckbox,$(inputCheckbox).attr('value'));
		}				
		return false;
	}

});

$('.eyeConcern').on('click', function(e) {
	HandleEyeConcern(this,e.target.value);
});

function HandleEyeConcern(concernInput,target){
var elm = $('.eyeConcern');
	
	if($(concernInput).parent().attr("aria-checked") === "true"){
		$(concernInput).parent().attr("aria-checked", "false");		
	}else{
		$(concernInput).parent().attr("aria-checked", "true");		
	}
	
	if(target && $(concernInput).is(':checked')) {
		eyeConcern = target;
		
		$(elm).each(function(el, val) {
			var elmVal = $(this).attr('value');
			if(eyeConcern !== elmVal) {
				$(this).parent().addClass('disabled-concern');
				$(this).siblings().css( 'border-color', '#DFE3E6' );
				$(this).siblings().find('.check-dot').css( 'border-color', '#DFE3E6' );
				$(this).siblings().find('.check-dot').css( 'background-color', '#fff' );
				$(this).attr('checked', false);
				
			} else {
				$(this).parent().removeClass('disabled-concern');
				$(this).siblings().css( 'border-color', '#857ed2' );
				$(this).siblings().find('.check-dot').css( 'border-color', '#857ed2' );
				$(this).siblings().find('.check-dot').css( 'background-color', '#857ed2' );
				
			}
		})
	} else {
		$(elm).each(function(el, val) {
			$(this).parent().removeClass('disabled-concern');
			$(this).siblings().css( 'border-color', '#DFE3E6' );
			$(this).siblings().find('.check-dot').css( 'border-color', '#000' );
			$(this).siblings().find('.check-dot').css( 'background-color', '#fff' );
			$(this).attr('checked', false);
		})
	}
}

$('.whats-next .checkbox-options.dot-style#eyeConcern li').on('keydown', function(e){
	if(e.keyCode === 32){
		var inputCheckbox = $(this).find('.eyeConcern')[0];
		if($(inputCheckbox).prop("checked") === false){
			$(inputCheckbox).prop("checked", true);
		}else{
			$(inputCheckbox).prop("checked", false);
		}
		HandleEyeConcern(inputCheckbox,$(inputCheckbox).attr('value'));
		return false;
	}
});

$('.prdItem').on('click', function(e) {
	handleCurrentRoutine(this, e.target.value);
});

function handleCurrentRoutine(product, target){
	var elm = $('.prd');
	
	if($(product).parent().attr("aria-checked") === "true"){
		$(product).parent().attr("aria-checked", "false");		
	}else{
		$(product).parent().attr("aria-checked", "true");		
	}
	
	if(target && $(product).is(':checked')) {
		prdSlctd.push(target);
	}
	
	if(target && !$(product).is(':checked')) {
		let val = $(product).attr('value');
		
		deleteItem(prdSlctd, val);
	}
}

$('.whats-next .checkbox-options.dot-style.product-style li').on('keydown', function(e){
	if(e.keyCode === 32){
		var inputCheckbox = $(this).find('.prdItem')[0];
		if($(inputCheckbox).prop("checked") === false){
			$(inputCheckbox).prop("checked", true);
		}else{
			$(inputCheckbox).prop("checked", false);
		}
		handleCurrentRoutine(inputCheckbox,$(inputCheckbox).attr('value'));
		return false;
	}
});

$('.whats-next .select-product-list .category-header').on('click', function(e){
	expandOrCollapse(this);
});

function expandOrCollapse(toggeButton){
	if($(toggeButton).attr("aria-expanded") === 'true'){
		$(toggeButton).attr("aria-expanded","false");
	}else{
		$(toggeButton).attr("aria-expanded","true");
	}
}

$('.whats-next .select-product-list .category-header').on('keydown', function(e){
	if(e.keyCode === 13){
		expandOrCollapse($(this).parent().find('.collapse in')[0]);
	}
});

$('.show-recomnd-results').on('click', function(e) {
	e.preventDefault();
	if(prdSlctd.length > 0) {
		$('#prds').val(prdSlctd);
	}
	//updating status for screen reader
	$('.whats-next-main #notify-ritual-result').text('Please wait, recommended rituals are loading');
	$('.loader-content').show();
	setTimeout(function () {
		$('#recommendation-form').submit();
	}, 500);
});

getSelectedFilters = function(usageTime) {
	var selectedFilters = [];
	$('.rec-filter-item').each(function(evnt) {
		if($(this).is(':checked') && $(this).attr('data-time') === usageTime) {
			var filterVal = $(this).val().replace(/\s/g, "");
			var filterItem = filterVal;
			if(filterVal.indexOf('+') >= 0) {
				filterItem = filterVal.replace(/\+/g,"");
			}
			selectedFilters.push(filterItem);
		}
	});
	return selectedFilters;
}

$('.rec-usage-time').on('click', function(e) {	
	switchTime(this,e);
});

$('.switch-label').on('keydown', function(e) {
	if(e.keyCode === 13){
		var timeId = $(this).attr('for');
		if(timeId === 'am'){
			$(this).parent().find('input[id=am]').prop('checked',true);
		}else if(timeId === 'pm'){
			$(this).parent().find('input[id=pm]').prop('checked',true);
		}
		switchTime($(this).parent().find('input[id='+timeId+']')[0],e);
	}
});

function switchTime(inputTime,e){
	var usageTime = e.target.value;
	var selectedTime = $('input[name=dayOrNight]:checked').val();
	$('#time-selctor').attr('data-time', selectedTime);
	
	// mParticle - Handle viewed screen
	setTimeout(function(){ window.mParticleViewedScreen('Ritual Finder'); }, 1000);
	
	if(selectedTime == 'AM') {
		
		if(showAMOriginalResults == true){
			$('.show-default-result').show();
		} else {
			$('.show-default-result').hide();
		}
		
		$('.ritual-selected-time').text('A.M.');
		$('.selected-time-am-icon').css('display', 'inline-block');
		$('.selected-time-pm-icon').css('display', 'none');
		$('.whats-next-main #add-all-to-bag').attr('aria-label', 'Add all A.M. products to bag');
		$('.whats-next-main #rf-email-btn').attr('aria-label', 'Email My A.M. Ritual');
		$('#resultsPM').hide();
		$('#resultsAM').show();
	} else {
		
		if(showPMOriginalResults == true){
			$('.show-default-result').show();
		} else {
			$('.show-default-result').hide();
		}
		
		$('.ritual-selected-time').text('P.M.');
		$('.selected-time-pm-icon').css('display', 'inline-block');
		$('.selected-time-am-icon').css('display', 'none');
		$('.whats-next-main #add-all-to-bag').attr('aria-label', 'Add all P.M. products to bag');
		$('.whats-next-main #rf-email-btn').attr('aria-label', 'Email My P.M. Ritual');
		$('#resultsPM').show();
		$('#resultsAM').hide();		
	}
	

	$('.rec-filter-item').each(function(ev) {
		if(selectedTime === $(this).attr('data-time')) {
			$(this).parent().css('display','inline-block');	
		} else {
			$(this).parent().css('display','none');
		}
	});
	
	updateOOSStatus(selectedTime);
	setHistory();
}

$('.show-default-result').on('click', function() {
	
	//Check which tab is reloaded
	var reloadUrl = $('#originalUrl').val();
	var selectedTime = $('input[name=dayOrNight]:checked').val()	
	var amFilters = [];
	var pmFilters = [];
	var amParams = "";
	var pmParams = "";
	
	if(selectedTime == 'AM'){
		
		if(showPMOriginalResults == true){
		    $.each($(".rec-filter-item:checked[data-time='PM']"), function(){            
		    	pmFilters.push($.trim($(this).next("label").text()));
		    });
		    
		    if(pmFilters.length > 0 ){
		    	pmParams = "&pmFilters="+pmFilters.join("|");
		    }
		}
		 
	} else {
		
		if(showAMOriginalResults == true){
		    $.each($(".rec-filter-item:checked[data-time='AM']"), function(){            
		    	amFilters.push($.trim($(this).next("label").text()));
		    });
		    
		    if(amFilters.length > 0 ){
		    	amParams = "&amFilters="+amFilters.join("|");
		    }
		}
		
	}

	if(amParams!=''){
		reloadUrl = reloadUrl+amParams;
	}
	
	if(pmParams!=''){
		reloadUrl = reloadUrl+pmParams;
	}
	
	window.location.href = reloadUrl+"&selectedTime="+selectedTime;
	
})

$('.empty-dot').on('click', function(e) {
	e.preventDefault();
});



$('.gtm_ritual_builder_more_info').on('click', function(e) {
	
	setHistory();
	
});


$('.rec-filter-item').on('click', function(e) {
	filterItem(this,e);
});

$('.rec-filter-options li label').on('keydown', function(e) {
	if(e.keyCode === 13){
		if($(this).parent().find('input[id='+$(this).attr('for')+']').prop('checked')){
			$(this).parent().find('input[id='+$(this).attr('for')+']').prop('checked',false)
		}else{
			$(this).parent().find('input[id='+$(this).attr('for')+']').prop('checked',true)
		}	
		e.target.value = $(this).parent().find('input[id='+$(this).attr('for')+']').attr('value');
		filterItem($(this).parent().find('input[id='+$(this).attr('for')+']')[0],e);
	}	
});


function filterItem(filterInput,event){
	var filterName = event.target.value;
	var isChecked = $(filterInput).is(':checked');
	if(isChecked == true){
		$(filterInput).next('.focus-outline-purple').attr("aria-checked", "true");
	} else{
		$(filterInput).next('.focus-outline-purple').attr("aria-checked", "false");
	}
	var selectedTime = $('input[name=dayOrNight]:checked').val()	
	var selectedFilters = getSelectedFilters(selectedTime);	
	var filterId = filterName.replace(/\s/g, "");
	$('.show-default-result').show();
	
	if(filterId.indexOf('+') >= 0) {
		filterId = filterId.replace(/\+/g, "");
	}
	
	// Hide AM/PM tab
	if(selectedTime == 'AM') {
		showAMOriginalResults = true;	
		$('#resultsAM ').fadeOut();
	} else {
		showPMOriginalResults = true;			
		$('#resultsPM ').fadeOut();
	}
	
	// Hide/Show all the items applicable for the filter clicked
	if(selectedTime == 'AM') {
		$('#resultsAM > .rec-prd-list-item').each(function(ev) {
			if($(this).data('filter') == filterId){
				if(isChecked) {
					$(this).show();
					$(this).attr('data-display', 'true');
				} else {
					$(this).hide();
					$(this).attr('data-display', 'false');
				}					
			}
		});				
	} else {
		$('#resultsPM > .rec-prd-list-item').each(function(ev) {
			if($(this).data('filter') == filterId){
				if(isChecked) {
					$(this).show();
					$(this).attr('data-display', 'true');
				} else {
					$(this).hide();
					$(this).attr('data-display', 'false');
				}
			}
		});
	}		
		
	rearrangeProductTiles(selectedFilters, selectedTime);
	if(selectedTime == 'AM') {
		$('#resultsAM ').fadeIn('slow');
	} else {
		$('#resultsPM ').fadeIn('slow');
	}
	updateOOSStatus(selectedTime);
	setHistory();
}

$(document).on('click', '.product-quick-view', function (e) {
	e.preventDefault();
	$('.loader-preventive').show();
	/*var productUrl = $(this).attr('data-url');

	quickview.show({
        url: productUrl,
        source: 'quickview'
	});*/
	var modal = $("#addAllPearlSelect");
	var img = modal.find('a.variant-option.active').data('lgimg').url;
	modal.find('.img-fluid').attr('src', img);
	modal.find('#add-selection, #skip-to-bag').attr('data-callback', 'addtocart');
	//attribute to identify pearl only add to bag - new modal update
	modal.find('.product-add-to-bag').attr('add-type', 'addpearl');
	$("#saveRegimen").modal('hide');		
	setTimeout(function () {
		modal.modal('show');
		if($('#addAllPearlSelect .add-all-modal-title').attr('type') == 'tab'){
			$('#addAllPearlSelect .add-all-modal-title').focus();
			$('#addAllPearlSelect .add-all-modal-title').removeAttr('type');
		}
	}, 500);
	$('.loader-preventive').hide();
});

$(document).on('keydown', '.product-quick-view', function (e) {
	if(e.keyCode === 13	){
		$('#addAllPearlSelect .add-all-modal-title').attr('type' , 'tab');
	}
});

$("#saveRegimen").on("show.bs.modal", function () {
	$('#saveEmail').show();
});

$("#saveRegimen").on("hidden.bs.modal", function () {
	$('#saveButtons .alert').hide();
	$('#saveEmail input').val('');
	$('.has-error').removeClass('has-error');
	$('#saveButtons').show();
});

$('#emailSend').on('click', function() {
	var email = $('#emailRegimen').val();
	var emailRegex = /^[\w.%+-]+@[\w.-]+\.[\w]{2,6}$/;
	if(!email || !emailRegex.test(email)) {
		$('#emailRegimen').parents('.form-group').addClass('has-error');
		return false;
	}
	debugger;
	var products = getSelectedProductsForMail();
	var addtoemaillist = $('#addtoemaillist:checked').val();
	var data = {'productData': products, 'email': email, 'addtoemaillist': addtoemaillist};
	ajax.post({
		url: $(this).data('url'),
        data: data,
        callback: function (response) {
        	response = JSON.parse(response);
        	if(response.status == 'success') {
        		$('#saveButtons .alert').show();
        		$('#saveButtons').show();
				$('#saveEmail').hide();
				$('#emailRegimen').val('');
				if (SitePreferences.MPARTICLE_ENABLED) {
            		var identifyData = {};
            		identifyData.email = email;
            		setTimeout(function(){ window.mParticleIdentify(identifyData, true); }, 1000);
            	}
        	}
        }
	});
});

	$(document).on('click','#add-all-to-bag  , #add-all-to-bag-small, #add-all-to-bag-medium',function(e) {
	var productIds;
	 if($('input[name="contentBlockV1"]') && $('input[name="contentBlockV1"]').val() == 'true'){
	 	productIds = getRecommededRitualsIds();
	 	$('#add-to-bag-affix').hide();
	 } else {
	    productIds = getSelectedProducts();
	 }
	var hasPearl = isPearlSelected(productIds);
	$(".tatcha-header-nav, .tatcha-pre-nav, .add-to-bag-sticky-container").show();
	if(hasPearl) {
		var modal = $("#addAllPearlSelect");
		var img = modal.find('a.variant-option.active').data('lgimg').url;
		var isAvailable = modal.find('a.variant-option.active').data('available');
		if(!isAvailable){
			$('#add-selection').addClass('disabled');
			$('#add-selection').text('Out Of Stock');
		}else{
			$('#add-selection').removeClass('disabled');
			$('#add-selection').text('Add Selection');
		}
		modal.find('.img-fluid').attr('src', img);
		modal.find('#add-selection, #skip-to-bag').attr('data-callback', 'addtocart');
		modal.find('.product-add-to-bag').removeAttr('add-type');
		$("#saveRegimen").modal('hide');		
		setTimeout(function () {
			modal.modal('show');
		}, 500);
	} else {
		if($('input[name="contentBlockV1"]') && $('input[name="contentBlockV1"]').val() == 'true'){
			addAllToBagPDP(productIds);
		} else {
			addAllToBag(productIds);
		}
	}
});

$('#add-all-to-wishlist').on('click', function(e) {
	var productIds = getSelectedProducts();
	var hasPearl = isPearlSelected(productIds);
	if(hasPearl) {
		var modal = $("#addAllPearlSelect");
		var img = modal.find('a.variant-option.active').data('lgimg').url;
		modal.find('.img-responsive').attr('src', img);
		modal.find('#add-selection, #skip-to-bag').attr('data-callback', 'addtowishlist');
		$("#saveRegimen").modal('hide');
		
		setTimeout(function () {
			modal.modal('show');
		}, 500);
	} else {		
		addAllToWishlist(productIds);
	}
});

$('.wishlist-addall-login-btn').on('click', function(e) {
	var container = $('#loginModal');
	var productIds = getSelectedProducts();
	container.find('input[name="callBackAction"]').val('wishlist-addall');
	container.find('input[name="pid"]').val(productIds);
	$('#loginModal').modal('show');
});

$(document).on('click', '#addAllPearlSelect a.variant-option', function (e) {
	e.preventDefault();
	var modal = $('#addAllPearlSelect');
	var id = $(this).data('productid');
	var title = $(this).attr('title').replace('Select Color: ', '');
	var img = $(this).data('lgimg').url;
	var isAvailable = $(this).data('available');
	if(!isAvailable){
		$('#add-selection').addClass('disabled');
		$('#add-selection').text('Out Of Stock');
	}else{
		$('#add-selection').removeClass('disabled');
		$('#add-selection').text('Add Selection');
	}

	modal.find('a.variant-option').removeClass('active');
	$(this).addClass('active');
	modal.find('#selectedvariant').val(id);
	modal.find('.variants-color .variant-name').html(title);
	modal.find('.img-responsive').attr('src', img);
});

$(document).on('click', '#add-selection', function (e) {
	e.preventDefault();
	addSelection(this);
});

$(document).on('keydown', '#add-selection', function (e) {
	if(e.keyCode === 13){
		e.preventDefault();
		addSelection(this);
	}
});

function addSelection(addSelectionButton){
	var selectedIds;
	if($(addSelectionButton).closest('.product-add-to-bag').attr('add-type') && $(addSelectionButton).closest('.product-add-to-bag').attr('add-type') == 'addpearl'){
		selectedIds = 'MED-PEARL-EYE';
	}else{
		selectedIds = getSelectedProducts();
	}
	var id = $('#selectedvariant').val();
	var callback = $(addSelectionButton).data('callback');
	if(id) {
		selectedIds = selectedIds.replace('MED-PEARL-EYE', id);
	}
	if(callback == 'addtowishlist') {
		addAllToWishlist(selectedIds);
	} else {
		addAllToBag(selectedIds);
	}
}

$(document).on('click', '#skip-to-bag', function (e) {
	e.preventDefault();
	skipToBag(this);
});

$(document).on('keydown', '#skip-to-bag', function (e) {
	if(e.keyCode === 13){
		e.preventDefault();
		skipToBag(this);
	}
	
	var kc = e.which || e.keyCode;
    if (kc === 9) {
		$('#addAllPearlSelect .close').focus();
    }
	if(e.shiftKey) {
		if (kc === 9) {
			$('#addAllPearlSelect #skip-to-bag').focus();
		}
	}
});

function skipToBag(skipButton){
	if($(skipButton).closest('.product-add-to-bag').attr('add-type') && $(skipButton).closest('.product-add-to-bag').attr('add-type') == 'addpearl'){
		$('#addAllPearlSelect').modal('hide');
	}else{
		var selectedIds = getSelectedProducts();
		selectedIds = selectedIds.replace('MED-PEARL-EYE', '');
		selectedIds = selectedIds.split(',');
		selectedIds = selectedIds.filter(function(el) { return el!==''; });
		selectedIds = selectedIds.join(',');
		var callback = $(skipButton).data('callback');
		if(callback == 'addtowishlist') {
			addAllToWishlist(selectedIds);
		} else {
			addAllToBag(selectedIds);
		}
	}	
}

/*
 * This is to check if the page was reloaded via BACK
 */
if (window.performance) {
    var navEntries = window.performance.getEntriesByType('navigation');
    if (navEntries.length > 0 && navEntries[0].type === 'back_forward') {
         $('.loader-content').show();
         location.reload(true);
    } else if (window.performance.navigation
         && window.performance.navigation.type == window.performance.navigation.TYPE_BACK_FORWARD) {
         $('.loader-content').show();
         location.reload(true);
    } else {
         console.log('This is normal page load');
    }
} else {
    console.log("Unfortunately, your browser doesn't support this API");
}


function uniqueList(list) {
	var result = [];
	$.each(list, function(i, e) {
	  if ($.inArray(e, result) == -1) result.push(e);
	});
	return result;
}

function isPearlSelected(productIds) {
	if(productIds.indexOf('MED-PEARL-EYE') !== -1) {
		return true;
	}
	return false;
}

function addAllToBag(productIds) {
	$('#saveRegimen , #addAllPearlSelect').modal('hide');
	$('.loader-content').show();
	var url = $('#add-all-to-bag').data('url');
	var data = {'productIds': productIds};
	ajax.post({
		url: url,
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
					setHistory();
					sendRitualFinderAddToCartGlobalGA(productIds);
            	} else {
            		$('.loader-content').hide();
            	}
        	}
        }
	});
}
function addAllToBagPDP(productIds) {
	$('#saveRegimen , #addAllPearlSelect').modal('hide');
	$('.loader-content').show();
	var url = $('#add-all-to-bag').data('url');
	var data = {'productIds': productIds};
	ajax.post({
		url: url,
        data: data,
        callback: function (response) {
        	if(response) {
        		response = JSON.parse(response);
            	if(response.status == 'success') {            		
					$('#addAllToBagModal #addedproducts-count').html(response.totalProducts);
					$('.loader-content').hide();

					$( ".mini-cart-total" ).each(function( index ) {
				        $( this ).trigger("click");
						
						 	document.body.scrollTop = 0; 
						  	document.documentElement.scrollTop = 0;
						
				    	return false;				    	 
				    });
					sendRitualFinderAddToCartGlobalGA(productIds);
            	} else {
            		$('.loader-content').hide();
            	}
        	}
        }
	});
}

function addAllToWishlist(productIds) {
	$('#saveRegimen , #addAllPearlSelect').modal('hide');
	$('.loader-content').show();
	var url = $('#add-all-to-wishlist').data('url');
	var data = {'pid': productIds};
	ajax.post({
		url: url,
        data: data,
        callback: function (response) {
        	if(response) {
        		response = JSON.parse(response);
            	if(response.success == true) {
					$('.wishlist-btn-container .wishlist-additem').hide();
					$('.wishlist-btn-container .wishlist-removeitem').show();
					$('.loader-content').hide();
            	} else {
            		$('.loader-content').hide();
            	}
        	}
        }
	});
}

function getSelectedProducts() {
	var prdIdList = [];
	var uniquePrdId = [];
	var time = $('#time-selctor').attr('data-time');
	$('.rec-prd-list-item').each(function(e){
		if($(this).attr('data-display') === 'true' && $(this).attr('data-selected') != 'true' && $(this).attr('data-time') == time && $(this).attr('data-instock') === 'true') {
			prdIdList.push($(this).attr('data-id'));
		}
		
		//for pearl
		if($(this).attr('data-display') === 'true' && $(this).attr('data-selected') != 'true' && $(this).attr('data-time') == time && $(this).attr('data-id') === 'MED-PEARL-EYE') {
			prdIdList.push($(this).attr('data-id'));
		}
	});
	uniquePrdId = uniqueList(prdIdList);
	uniquePrdId = uniquePrdId.join(',');
	return uniquePrdId;
}

function getRecommededRitualsIds() {
	var prdIds = [];
	var uniqueIds = [];
	$('.routine-step.product-list-unit').each(function(e){
		var sku = '';
		$('.routine-step.product-list-unit').each(function(e){
			var sku = '';
			if($(this).find('input[name="prodSku"]') && $(this).find('input[name="prodSku"]').val() != ''){
				sku = $(this).find('input[name="prodSku"]').val();
				prdIds.push(sku);
			}
		});
	});
	uniqueIds = uniqueList(prdIds);
	uniqueIds = uniqueIds.join(',');
	if(uniqueIds.endsWith(',') == true){
		uniqueIds = uniqueIds.substring(0,uniqueIds.length-1);
	}
	return uniqueIds;
}

function getSelectedProductsForMail() {
	var productData = {};
	productData['title'] = $('#ritual-title').text();
	var personaText = $('#ritual-title .persona').text();
	productData['persona'] = personaText.charAt(0).toUpperCase() + personaText.substr(1).toLowerCase();
	productData['skinandEyeConcern'] = $('#skinConcern').val();
	productData['selectedTime'] = $('#time-selctor').data('time');
	productData['skinType'] = $('#selected-skintype').text().toLowerCase();
	productData['resultPage'] = window.location.origin + $('#loginModal input[name="originalUrl"]').val();
	$('.rec-prd-list-item').each(function(e){
		if($(this).attr('data-display') === 'true') {
			var time = $(this).attr('data-time');
			var label = $(this).find('.product-label').map(function() {
							return $(this).text();
						}).get();
			var product = {
				'id': $(this).attr('data-id'), 
				'time': time, 
				'icon': (time == 'AM') ? '<i class="fa fa-sun"></i>' : '<i class="fa fa-moon fa-sm"></i>',				
				'stepNo': $(this).find('.step-number').html(), 
				'stepName': $(this).find('.step-action').html(), 
				'label': label, 
				'name': $(this).find('.product-name').attr('data-product-name'),
				'secondaryName': $(this).find('.product-subtitle').html(),
				'image': $(this).find('.img-fluid').attr('src'), 
				'tileImage': $(this).find('.img-fluid').attr('data-ppage-image'),
				'price': $(this).find('.product-info .product-price').html(),
				'url': $(this).attr('data-url')
			};
			productData[time] = productData[time] ? productData[time] : [];
			productData[time].push(product);
		}
	});
	productData = JSON.stringify(productData);
	return productData;
}

$('.product-hide').on('click', function(e) {
	$('.show-default-result').show();
	var currentFilter = $(this).parent().attr('data-filter');
	var currentPrdId = $(this).parent().attr('data-id');
	var currentUsageTime = $(this).parent().attr('data-time');
	
	var prdCount = 1;
	var selectedTime = $('input[name=dayOrNight]:checked').val()
	var selectedFilters = getSelectedFilters(selectedTime);
	$("#"+currentFilter+selectedTime).prop( "checked", false );
	$(this).parent().hide();
	$(this).parent().attr('data-display','false');
	
	var stepNumber = $(this).parent().find('.step-number').text();
	stepNumber = stepNumber ? stepNumber : 1;
	
	// Update Global flag
	if(selectedTime == 'AM') {
		showAMOriginalResults = true;	
	} else {
		showPMOriginalResults = true;			
	}	
	
	// Check RDK
	if(!(typeof currentPrdId === 'undefined') && currentPrdId && (currentPrdId.indexOf('RITUAL')!=-1)){
		setHistory();
	}	
	
	//updateOOSStatus
	updateOOSStatus(selectedTime);
	
	$(this).parent().nextAll().each(function(ev) {
		if($(this).is(':visible')){

			//Odd even check
			if(stepNumber%2) {
				$(this).addClass('results-panel-even');
				$(this).removeClass('results-panel-odd');
				
				$(this).find('div.product-info-col').removeClass('order-lg-1');
				$(this).find('div.product-img-col').removeClass('order-lg-6');
			} else {
				$(this).addClass('results-panel-odd');
				$(this).removeClass('results-panel-even');						
				$(this).find('div.product-info-col').addClass('order-lg-1');
				$(this).find('div.product-img-col').addClass('order-lg-6');
			}
			
			$(this).attr('data-display', 'true');
			$(this).find('.step-number').text(stepNumber);
			$(this).fadeIn( "slow" );
			stepNumber++;			

		}
	});
});

//to disable A.M/P.M buttons if all products are OOS
function updateOOSStatus(selectedTime){
	
    var prdsOOS = true;
    $('.rec-prd-list-item').each(function(e){
		if($(this).attr('data-display') === 'true' && $(this).attr('data-instock') === 'true' && $(this).attr('data-time') === selectedTime) {
			prdsOOS = false;
		}
		
		//for pearl
		if($(this).attr('data-display') === 'true' && $(this).attr('data-time') === selectedTime && $(this).attr('data-id') === 'MED-PEARL-EYE'){
			prdsOOS = false;
		}
		
	});
    
    if(prdsOOS){
    	$('.whats-next-results .add-all-rf').attr('disabled', 'disabled');
    }else{
    	$('.whats-next-results .add-all-rf').removeAttr('disabled');
    }
}

var recommendation = {
	init: function() {
		initializeEvents();
		addToCart();
	}
};

function updateStepNumbers() {
	$( ".step-number:visible" ).each(function( index ) {
		  $( this ).text(index+1)
	});
}

function showHideProductTiles(selectedFilters, selectedTime){
	
	var prdPosition = 1;
	//show the items matching the filters for only selected usage time
	$('.rec-prd-list-item[data-time='+selectedTime+']').each(function(ev) {
		var filter = $(this).attr('data-filter');
		var filterNameList = [];
		var productLineItem = $(this);
		
		//To support multiple filters for a product in future
		if(filter!=''){
			filterNameList = filter.split(',');
		}
		
		var productDisplay = $(productLineItem).attr('data-display');
		
		//Mark the matching product tiles to display
		if(filterNameList.length > 0) {
			filterNameList.forEach(function(filterName) {
				if(selectedFilters.includes(filterName)) {
					//Odd even check
					if(prdPosition%2) {
						$(productLineItem).addClass('results-panel-even');
						$(productLineItem).removeClass('results-panel-odd');
						
						$(productLineItem).find('div.product-info-col').removeClass('order-lg-1');
						$(productLineItem).find('div.product-img-col').removeClass('order-lg-6');
					} else {
						$(productLineItem).addClass('results-panel-odd');
						$(productLineItem).removeClass('results-panel-even');						
						$(productLineItem).find('div.product-info-col').addClass('order-lg-1');
						$(productLineItem).find('div.product-img-col').addClass('order-lg-6');
					}
					
					$(productLineItem).attr('data-display', 'true');
					$(productLineItem).find('.step-number').text(prdPosition);
					$(productLineItem).fadeIn( "slow" );
					prdPosition++;
				}
			});
		} 			
	});
}

function rearrangeProductTiles(selectedFilters, selectedTime){
	
	var prdPosition = 1;
	//show the items matching the filters for only selected usage time
	$('.rec-prd-list-item[data-time='+selectedTime+']:visible').each(function(ev) {
		var filter = $(this).attr('data-filter');
		var prdName = $(this).attr('data-prd-name');
		var productLineItem = $(this);
		var productDisplay = $(productLineItem).attr('data-display');

		if(prdPosition%2) {
			$(productLineItem).addClass('results-panel-odd');
			$(productLineItem).removeClass('results-panel-even');
			$(productLineItem).find('div.product-info-col').removeClass('order-lg-1');
			$(productLineItem).find('div.product-img-col').removeClass('order-lg-6');
			
		} else {
			$(productLineItem).addClass('results-panel-even');
			$(productLineItem).removeClass('results-panel-odd');
			$(productLineItem).find('div.product-info-col').addClass('order-lg-1');
			$(productLineItem).find('div.product-img-col').addClass('order-lg-6');
		}
					
		$(productLineItem).attr('data-display', 'true');
		$(productLineItem).find('.step-number').text(prdPosition);
		$(productLineItem).fadeIn( "slow" );
		if(prdName && prdName !== 'RDK') {
			prdPosition++;
		}
	});
}

function setHistory(){
	//Check if original results are visible
	var amFilters = [];
	var pmFilters = [];
	var amParams = "";
	var pmParams = "";
	var originalUrl = $('#originalUrl').val();
	var selectedTime = $('input[name=dayOrNight]:checked').val()
	
	// Get all selected filters
	if(showAMOriginalResults == true){
	    $.each($(".rec-filter-item:checked[data-time='AM']"), function(){            
	    	amFilters.push($.trim($(this).next("label").text()));
	    });
	    
	    if(amFilters.length > 0 ){
	    	amParams = "&amFilters="+amFilters.join("|");
	    }
	    
	}
	if(showPMOriginalResults == true){
	    $.each($(".rec-filter-item:checked[data-time='PM']"), function(){            
	    	pmFilters.push($.trim($(this).next("label").text()));
	    });
	    
	    if(pmFilters.length > 0 ){
	    	pmParams = "&pmFilters="+pmFilters.join("|");
	    }		    
	}
	
	//check if RDK is displayed
	var amRDK = '';
	var pmRDK = '';
	var amRDKelem = $("#resultsAM > .rec-prd-list-item:visible").first().data('id');
	var pmRDKelem = $("#resultsPM > .rec-prd-list-item:visible").first().data('id');
	
	if(!(typeof amRDKelem === 'undefined') && (amRDKelem!='') && (amRDKelem.indexOf('RITUAL') != -1)){
		amRDK = true;
	}
	if(!(typeof pmRDKelem === 'undefined') && (pmRDKelem !='') && (pmRDKelem.indexOf('RITUAL') != -1)){
		pmRDK = true;
	}	
	
	if(amParams!=''){
		originalUrl = originalUrl+amParams;
	}
	
	if(pmParams!=''){
		originalUrl = originalUrl+pmParams;
	}
	
	if(amRDK!=''){
		originalUrl = originalUrl+"&amRDK=true";
	}
	
	if(pmRDK!=''){
		originalUrl = originalUrl+"&pmRDK=true";
	}
	
	
	originalUrl = originalUrl+"&selectedTime="+selectedTime;
	var pathname = originalUrl.split(window.location.host);
	$('#loginModal input[name="originalUrl"]').val(pathname[1]);
	history.pushState({}, null,originalUrl);	
}

var updateMiniCart = function () {
	var headerType = $('.isUpdatedDesign').length > 0 ? $('.isUpdatedDesign').val(): 'false';
	var url = Urls.minicart + '?isUpdatedDesign=' + headerType;
	$.ajax({
        type: 'GET',
        url: util.ajaxUrl(url),
        success:function(response) {
    		minicart.showNoScroll(response);
        }
    });
};

$( document ).ready(function() {
    $('.whats-next.whats-next-questions').css('animation', 'none');
    setTimeout(function() {
        $('#notify-ritual-result').text('Our recommended ritual for the selected skin type is loaded');
	  }, 1000);
    
    var useSelectedTime = $('#selectedTime').val();
    if(useSelectedTime){
    	updateOOSStatus(useSelectedTime);
    }
});

$('#skinTypeInfo').on('shown.bs.modal', function () {
	$('#skinTypeInfo .skinTypeInfo-title').focus();
});

$('#addAllPearlSelect').on('shown.bs.modal', function () {
	$('#addAllPearlSelect').closest('body').css('overflow' , '');
});

module.exports = recommendation;