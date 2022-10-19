'use strict';


$( document ).ready(function() {

	window.mParticle.ready(
			function() { 
				window.mParticle.eCommerce.setCurrencyCode('USD');
				//RDMP-3422 fix - disable pixel call
				if(typeof(fbq) != 'undefined'){
					fbq.disablePushState = true;
				}
			 }
	);
	

	/*
	 * Product Event Trackers
	 */
	 // mParticle Product Add to cart
	$(document).on('click' , 'button[data-product-info], a[data-product-info], .btn-pairsWith .add-to-cart',function(){    	
		addToCart(this);
    });
	
	$(document).on('click' , 'div.add-minicart-empty-item', function(){  
		addToCart($(this).closest('.empty-bag-item'));
    });
	
	$('.full-width-panel-add-to-bag').click(function(){
		addToCart(this);
    });
	
	// mParticle Upsell product Add to cart
	$('.upsell-product-add-to-cart, .add-ritual-button').click(function(){
		var productInfoList = [];
		$('.mparticle-product').each(function(){
			var visible = $(this).closest('.ritualfinder-each-product-wrap').length > 0 ? $(this).closest('.ritualfinder-each-product-wrap').is(':visible') : true;
			if(visible) {
				var product = $(this).data('product-info');
				var quantity =  $(this).closest('form').find('select[name="Quantity"]').val();  
				var position =  $(this).closest('.ritualfinder-each-product-wrap').data('index');
				if(product){
					product.position = (position)?position:1;
					product.quantity = (quantity)?quantity:1;
					product.brand = 'Tatcha';
					productInfoList.push(product);
				}		        
			}
		});
		var uniqueProdList = new Set(productInfoList.map(JSON.stringify));
		var uniqueProdListArray = Array.from(uniqueProdList);
		var uniqueProdListObj = uniqueProdListArray.map(JSON.parse);

	    var customAttributes = getCustomAttributes($(this),'add_to_cart');
		mParticleProductAction(uniqueProdListObj,customAttributes,'add_to_cart');
    });

	// mParticle Product remove from cart   
	$(document).on("keydown",".minicart-remove-product",function(e){
		if(e.keyCode === 13){
			e.preventDefault();
			$(this).trigger('click');
		}
	}); 
    $(document).on('click' , 'button[name$="deleteProduct"] , div.minicart-remove-product',function(){
    	var productInfoList = [];
    	var productInfo = $(this).closest('.bag-product-item').data('product-info');	
    	var quantity =  $(this).closest('.bag-product-item').find('.qty-field').val(); 
    	var position =  $(this).closest('.bag-product-item').data('index');
    	if(productInfo){
    		productInfo.quantity = (quantity)?quantity:1;
        	productInfo.position = (position)?position:1;
        	productInfo.brand = 'Tatcha';    	 	
        	productInfoList.push(productInfo);
    	}
	    var customAttributes = getCustomAttributes($(this),'remove_from_cart');
		mParticleProductAction(productInfoList,customAttributes,'remove_from_cart');
    });
	
    // mParticle Product Click
    $(document).on('click' , '.product-list-unit-v2 a , .product-list-unit a , .upsell-use-with a , .product-use-with a , .pairs-with-flex .pairs-with-name , .pairs-with-btn , .mini-bag .pairs-with-box ,[data-slider-detail="carousel"] a' ,function(){
    	if(!($(this).hasClass('upsell-btn-useitwith'))){
        	productClick(this);
    	}
    });
    
    // mParticle Product Wish List Click
    $(document).on('click' , '.btn-wishlist.wishlist-additem , .wishlist-login-btn.btn-wishlist' ,function(){
    	var productObj;
    	var position;
    	var productInfoList = [];
    	if($(this).parent().closest('.bag-product-item').data('product-info')){
    		productObj = $(this).parent().closest('.bag-product-item');
    		position = $(this).closest('.bag-product-item').data('index');
    	}else{
    		productObj = $(this).closest("form").find("[data-product-info]");
    		position = $(this).closest('.product-list-col').data('index');
    	}
    	if(!productObj.length) {
    		productObj = $(this).closest(".product-list-unit-v2").find("[data-product-info]"); 
    	}
    	
    	if(productObj.length > 0) {
    		var productInfo = productObj.data('product-info');
    		if(productInfo){
	    		productInfo.quantity = 1;
	    		productInfo.position = (position)?position:1;
	    		productInfo.brand = 'Tatcha';
	    		productInfoList.push(productInfo);
    		}
    	    var customAttributes = getCustomAttributes($(this),'product_wishlist_click');
    		mParticleProductAction(productInfoList,customAttributes,'product_wishlist_click');
    	}
    });
    
	//Content Impression
	/*$('#homepage .hero-container .hero-content').not('.hero-marquee-v2').each(function(){
		var heading  = $("#homepage .hero-container .hero-content").not('.hero-marquee-v2').find('.hero-heading').text().split("\n").join(" ");
		var textContent = $("#homepage .hero-container .hero-content").not('.hero-marquee-v2').find('p').text();
		mParticleContentImpression("hero","homepage",heading,textContent);
	})
	$('#homepage .heroV2-section').each(function(){
		var heading  = $("#homepage .heroV2-section .d-md-block .hero-heading div").text();
		var textContent = $("#homepage .heroV2-section .d-md-block p").text();
		mParticleContentImpression("secondary hero","homepage",heading,textContent);
	})	  

	$('#homepage .carousel-bottom-link').each(function(){
		var textContent=""
		$('#homepage .carousel-bottom-link a').each(function(){
		  textContent +=" "+$(this).text();
		});
		mParticleContentImpression("link row","homepage","",textContent);
	})
	
	$('#homepage .panel-fullwidth-info,.panel-fullwidth,.panel-fullwidth-feature,.panel-fullwidth-quote').each(function(){
		var heading = $(this).parent().find('h2,.quotation').text();
		mParticleContentImpression("panel","homepage",heading,$(this).parent().find('p,.quote-body').text());
	})
	
	$('#homepage .image-link-container .image-link .btn-link').each(function(){
		var heading = $(this).parent().find('.headingv2,.heading').text();
		mParticleContentImpression("image","homepage",heading,"");
	})*/
	//Content Click
	/*$('#homepage .hero-container .hero-content').not('.hero-marquee-v2').click(function(){
		var heading  = $("#homepage .hero-container .hero-content").not('.hero-marquee-v2').find('.hero-heading').text().split("\n").join(" ");
		var textContent = $("#homepage .hero-container .hero-content").not('.hero-marquee-v2').find('p').text();
		mParticleContentClick("hero","homepage",heading,textContent);
	})
	
	$('#homepage .heroV2-section').click(function(){
		var heading  = $("#homepage .heroV2-section .d-md-block .hero-heading div").text();
		var textContent = $("#homepage .heroV2-section .d-md-block p").text();
		mParticleContentClick("secondary hero","homepage",heading,textContent);
	})	
	
	$('#homepage .carousel-bottom-link').click(function(){
		var textContent=""
		$('#homepage .carousel-bottom-link a').each(function(){
		  textContent +=" "+$(this).text();
		});
		mParticleContentClick("link row","homepage","",textContent);
	})
	$('#homepage .image-link-container .image-link .btn-link').click(function(){
		var heading = $(this).parent().find('.headingv2,.heading').text();
		mParticleContentClick("image","homepage",heading,$(this).text());
	})	
	$('#homepage .panel-fullwidth-quote,.panel-fullwidth,.panel-fullwidth-feature,.panel-fullwidth-info a,.btn-link').click(function(){
		var heading = $(this).parent().find('h2,.quotation').text();
		mParticleContentClick("panel","homepage",heading,$(this).parent().find('p,.quote-body').text());
	})	*/
	

    // mParticle View Impression
	document.querySelectorAll('.product-list-unit-v2,.carousel-product-list-item.is-selected,[data-slider-detail="carousel"]').forEach((i) => {
	    if (i) {
	        const observer = new IntersectionObserver((entries) => {
	            observerCallback(entries, observer, i)
	        },{threshold: [0.3, 0.6]});    
	        observer.observe(i);
	    }
	})

	const observerCallback = (entries, observer, header) => {
	    entries.forEach((entry, i) => {
	         if (entry.isIntersecting) {
	        	 $( document ).trigger( "mParticle:viewimpression", [ entries[0].target] );
	        	 observer.unobserve(entries[0].target);
	         }
	    });
	};
	
    $( document ).on( "mParticle:viewimpression", {
        customAttributes: ""
    }, function( event, targetElement ) {
    	var productInfoList = [];
    	var productObj = $(targetElement).find("[data-product-info]"); 
    	if(productObj.length > 0) {
    		var productInfo = productObj.data('product-info');
    		productInfoList.push(productInfo);
    	    var customAttributes = getCustomAttributes($(targetElement),'impression');
    		mParticleProductAction(productInfoList,customAttributes,'product_view');
    	}

    });

        
	//mParticle - Rotating banner previous button click 
	
	$(document).on('click','.rotating-promo-carousel .flickity-prev-next-button.previous',function(){
		mParticleRotatingBannerAction("click arrow","left");
	})
	//mParticle - Rotating banner next button click
	$(document).on('click','.rotating-promo-carousel .flickity-prev-next-button.next',function(){
		mParticleRotatingBannerAction("click arrow","right");
	})
	//mParticle - Rotating banner text click    
	$(document).on('click','.rotating-promo-carousel .is-selected .rotating-banner-link',function(){
		mParticleRotatingBannerAction("click text");
	})
	//mParticle - Rotating banner se all link click
	$(document).on('click','.seeall-link',function(){
		mParticleRotatingBannerAction("click see all");
	})	
	
	//mParticle - Purple Promo event- purple banner without rotation(single promo)
	$(document).on('click','.rotating-promo-container .tatcha-promo-text .rotating-banner-link' ,function(){
		mParticlePrenavClick($(this).text());
	});
	
    //Login Modal, Login Click Event
    $(document).on('click' , '#loginModal button , #loginModal a, .login-dropdown',function(){
    	if($(this).hasClass('close')){
    		return;
    	}
    	var linkText;   	
    	if($(this).hasClass('btn-facebook')){
    		linkText = 'Continue With Facebook'
    	}else if($(this).hasClass('create-account-link')){
    		linkText = 'Create Account';
    	}else if($(this)[0].id == 'login-btn' || $(this).hasClass('login-dropdown')){
    		linkText = 'Login';
    	}else if($(this)[0].innerHTML == 'Privacy Policy'){
    		linkText = 'Privacy'
    	}else if($(this)[0].innerHTML == 'Terms of Service'){
    		linkText = 'TOS'
    	}

    	/*if(!linkText) {
    		linkText = 'Login';
    	}*/
    	
    	mParticleLoginModalClick(linkText);
    });
    
    //samples Action - add sample button click
	$(document).on("keydown",".mini-bag .samples-banner",function(e){
		if(e.keyCode === 13){
			e.preventDefault();
			$(this).trigger('click');
		}
	});
    $(document).on('click' , '.mini-bag .samples-banner , .add-sample-btn',function(){
    	var data = {};
    	data.actionType = 'Click Add Sample';
    	(window.location.pathname.indexOf('/bag') > -1) ? data.pageSource = 'Bag' : data.pageSource = 'Mini-bag';
    	data.productID = '';
    	mPartcleLogEvent('Sample Action', data, 'Samples');
    })    
    
    //add button click
    $(document).on('click' , '.sample-products .select-minicart-bonus-item , #bonusModal .select-bonus-item, .free-sample-add-btn',function(){
    	var data = {};
    	$(this).hasClass('active-btn') ? data.actionType = 'Add Sample' : data.actionType = 'Remove Sample';    	
    	(window.location.pathname.indexOf('/bag') > -1) ? data.pageSource = 'Bag' : data.pageSource = 'Mini-bag';
    	data.productID = $(this).data('pid');
    	mPartcleLogEvent('Sample Action', data, 'Samples');
    })
    
    //sample submit click
    $(document).on('click' , '#submit-sample-items , #gwpbonusModalMinicart .gtm-samples-action, .add-bonus-products',function(){
    	var data = {};
    	data.actionType = 'Submit Selection';    	
    	(window.location.pathname.indexOf('/bag') > -1) ? data.pageSource = 'Bag' : data.pageSource = 'Mini-bag';   	
    	data.productID = '';
    	mPartcleLogEvent('Sample Action', data, 'Samples');
    })

	/* Below block needs to be removed once SFRA is live*/
    //Ritual Finder Steps
    $(document).on('click' , '.whats-next-questions .show-state-2, .whats-next-questions .show-state-3, .whats-next-questions .show-state-4, .whats-next-questions .show-state-5, .whats-next-questions .show-state-6, .whats-next-questions .show-recomnd-results',function(){
    	var data = {};
    	if($(this).hasClass('show-state-2')){
    		data.stepName = 'Persona';  
    	}else if($(this).hasClass('show-state-3')){
    		data.stepName = 'Skin Type';  
    	}else if($(this).hasClass('show-state-4')){
    		data.stepName = 'Skin Wishes';  
    	}else if($(this).hasClass('show-state-5')){
    		data.stepName = 'Eye Concerns';  
    	}else if($(this).hasClass('show-state-6')){
    		data.stepName = 'Current Routine';  
    	}else if($(this).hasClass('show-recomnd-results')){
    		data.stepName = 'Result Page';  
    	}
    	 	
    	mPartcleLogEvent('Ritual Finder Steps', data, 'Ritual Finder', mParticle.EventType.Navigation);
    })
    
     //Email Ritual Finder Results
    $(document).on('click' , '#saveRegimen #emailSend',function(){
    	var data = {};
    	data.ritualType = $('#saveRegimen .ritual-selected-time').text().replaceAll('.','');   	
    	mPartcleLogEvent('Email Ritual Finder Results', data, 'Ritual Finder');
    })
	/* Above block needs to be removed once SFRA is live*/

	/**
	 * Ritual Finder 2.0 Events
	 */
	// Ritual Finder 2.0 Steps
	$(document).on('click' , '.ritual-finder-landingpage .get-started-button, .ritual-finder-question-page .skin-today-btn, .ritual-finder-question-page .skin-benefit-btn, .ritual-finder-question-page .eyes-btn, .ritual-finder-question-page .skip-to-result-button, .ritual-finder-question-page .show-rf-results',function(){
		var data = {};
		if($(this).hasClass('get-started-button')){
			data.stepName = 'Skin Type';
		}else if($(this).hasClass('skin-today-btn')){
			data.stepName = 'Skin Wishes';
		}else if($(this).hasClass('skin-benefit-btn')){
			data.stepName = 'Eye Concerns';
		}else if($(this).hasClass('eyes-btn')){
			data.stepName = 'Current Routine';
		}else if($(this).hasClass('skip-to-result-button') || $(this).hasClass('show-rf-results')){
			data.stepName = 'Result Page';
		}

		mPartcleLogEvent('Ritual Finder Steps', data, 'Ritual Finder', mParticle.EventType.Navigation);
	})

	//Email Ritual Finder 2.0 Results
	$(document).on('click' , '#emailIdModal #ritualEmailButton',function(){
		var data = {};
		data.ritualType = "AM/PM";
		mPartcleLogEvent('Email Ritual Finder Results', data, 'Ritual Finder');
	})

	//Ritual Finder 2.0 Sensitivity
	$(document).on('change', '.ritual-finder-question-page #sensitivity', function() {
		var isSkinSensitive = $(this).is(':checked');
		mParticleUpdateUserAttribute('Ritual Finder Sensitivity', isSkinSensitive);
	})

	/**
	 * Ritual Finder Skin Type
	 */
	$(document).on('click', '.ritual-finder-question-page .skin-texture-today .continue-button', function() {
		var selectedSkinType = $('input[name="optionSkinType"]:checked').val();
		mParticleUpdateUserAttribute('Ritual Finder Skin Type', selectedSkinType);

		// updating skin sensitivity profile value
		var isSkinSensitive = $('.ritual-finder-question-page #sensitivity').is(':checked');
		mParticleUpdateUserAttribute('Ritual Finder Sensitivity', isSkinSensitive);
	})

	/**
	 * Ritual Finder Skin Wishes
	 */
	var skinCncrns = '';
	$(document).on('click', '.skin-benifits .continue-button', function() {
		if(skinCncrns && skinCncrns.length > 0) {
			var skinWishes = skinCncrns.replace(/,(?=[^,]*$)/, '');;
			mParticleUpdateUserAttribute('Ritual Finder Skin Wishes', skinWishes);
		}
	})

	/**
	 * Get the list of selected wishes
	 */
	$(document).on('change', '.ritual-finder-question-page .ritualSkinConcern', function() {
		if($(this).is(':checked')) {
			skinCncrns += $(this).parent().find('label').find('.check-label').text() + ',';
		}
	});

	//Compare page button click
	$(document).on("click",".compare-show, .compare-show-mobile",function(){
	
		var compareProductPids = [];
			
		$(".compareProductId").each(function() {
			compareProductPids.push($(this).attr("data-pid"));
		});
			
		window.mParticle.logEvent('Compare Click', mParticle.EventType.Other, {
	        'linkPath': window.location.pathname,
	        'deviceType': isMobile() ? 'mobile' : 'desktop',
	        'compareProductPids': compareProductPids.toString(),
	        'FilterSelection': "Compare"
	    });
		if (SitePreferences.RSC_ADC_ENABLED) {
			
			adc.logRSCCustomEvent(
				'Compare page',
				mParticle.EventType.Other,
				{
					'comparison_products': compareProductPids.join(","),
					'deviceType': isMobile() ? 'mobile' : 'desktop'
				});
		}
	})

    //Comparison Checkbox Action  
    $(document).on('click' , '.product-hit-tile .compare-check',function(){
    	var data = {};
    	data.actionType = $(this).prop('checked') ? 'check' : 'uncheck';
    	data.productID = $(this).closest('.product-list-unit-v2').data('itemid');  
    	data.pageSource = window.location.pathname;
    	mPartcleLogEvent('Comparison Checkbox Action', data, 'Comparison');
    })
    
    //Comparison Results Click
    $(document).on('click' , '.compare-page .compare-add-to-bag , .comparison-table .btn-remove , .compare-page .compare-edit-selections',function(){
    	var data = {};
    	if($(this).hasClass('compare-add-to-bag')){
    		data.clickType = 'Add to bag';
    	}else if($(this).hasClass('btn-remove')){
    		data.clickType = 'Remove From Comparison';
    	}else if($(this).hasClass('compare-edit-selections')){
    		data.clickType = 'Back Button/Edit';
    	}
    	
    	data.productID = $(this).hasClass('compare-edit-selections') ? '' : $(this).data('pid');  
    	mPartcleLogEvent('Comparison Results Click', data, 'Comparison');
    })
    
    //Email Signup - footer and Klaviyo lightbox
    $(document).on('click' , '#SubscribeForm button , .klaviyo-form-version-cid_1 button',function(){
   	 var data = {};
   	 data.content = 'newsletter';
   	 var form = $(this).closest("form");
   	 if(form.hasClass('mailing-list')){
   		 data.source = 'Footer';
   	 }else if(form.hasClass('klaviyo-form-version-cid_1')){
   		 data.source = 'Klayvio lightbox';
   	 }
   	 mPartcleLogEvent('Email Signup', data,'',mParticle.EventType.UserPreference);
    })
    
    //gift finder - Filter Selected
    $(document).on('change', '#gfPersona, #gfPricerange', function(){
    	var data = {};
    	data.filterSelection = $(this).val();
    	data.platform = isMobile() ? 'mobile':'desktop';
    	mPartcleLogEvent('Filter Selected', data, 'Gift Finder');
    });
    
  //gift finder - Gift Finder Email Results
    $(document).on('click', '#giftFinderModal .giftFinderEmailbutton', function(){
    	mPartcleLogEvent('Gift Finder Email Results', {}, 'Gift Finder');
    });

});

function setImpression(){
	    // mParticle View Impression
		document.querySelectorAll('.product-list-unit-v2,.carousel-product-list-item.is-selected,[data-slider-detail="carousel"]').forEach((i) => {
			if (i) {
				const observer = new IntersectionObserver((entries) => {
					observerCallback(entries, observer, i)
				},{threshold: [0.3, 0.6]});    
				observer.observe(i);
			}
		})
	
		const observerCallback = (entries, observer, header) => {
			entries.forEach((entry, i) => {
				 if (entry.isIntersecting) {
					 $( document ).trigger( "mParticle:viewimpression", [ entries[0].target] );
					 observer.unobserve(entries[0].target);
				 }
			});
		};
}

/*function mParticleContentImpression(type,source,heading,text){
	var data = {
      'contentType':type,
      'pageSource':source,
      'contentHeading':heading,
      'contentText':text
   }
	mPartcleLogEvent('Content Impression',data);		
}

function mParticleContentClick(type,source,heading,text){
		var data = {
      'contentType':type,
      'pageSource':source,
      'contentHeading':heading,
      'contentText':text
   }
	mPartcleLogEvent('Content Click',data);	
}
*/
// Scroll Listerners
/*$(window).on("scroll", function(){
	trackScrollPercentage();
})*/


/*
 * Util functions
 */

function mParticleLoginModalClick(text){
	var linkPath = window.location.pathname;
	
	  var utm_source = '';
	  var utm_campaign = '';
	  var utm_medium = '';

	  if(window.location.search) {    
	    var urlParams = new URLSearchParams(window.location.search);
	    if(urlParams.get('utm_source')){
	      utm_source = urlParams.get('utm_source');       
	    }
	    if(urlParams.get('utm_campaign')){
	      utm_campaign = urlParams.get('utm_campaign');       
	    }
	    if(urlParams.get('utm_medium')){
	      utm_medium = urlParams.get('utm_medium');       
	    }     
	  }
	  
  
	mParticle.logEvent(
	    	   'Login Click', 
	    	   mParticle.EventType.Other,{
	    	      'linkText':text,
	    	      'linkPath':linkPath,
	    	      'utm_source':utm_source,
	    	      'utm_campaign':utm_campaign,
	    	      'utm_medium':utm_medium,
	    	      'deviceType':isMobile() ? 'mobile':'desktop'
	    	   },{
	    	      'Google.Category':'Login Modal'
	    	   });
	if (SitePreferences.RSC_ADC_ENABLED) {
		adc.logRSCCustomEvent(
			'Login Click',
			mParticle.EventType.Other,
			{
				'linkText': text,
				'linkPath': linkPath,
				'utm_source': utm_source,
				'utm_campaign': utm_campaign,
				'utm_medium': utm_medium,
				'deviceType': isMobile() ? 'mobile' : 'desktop'
			});
	}
}

function addToCart(prodElement) {
	var productInfoList = [];
	var productInfo = JSON.parse($(prodElement).attr('data-product-info'));	
	var quantity =  $(prodElement).closest('form').find('select[name="Quantity"]').val();    	
    var position =  $(prodElement).closest('.product-list-col').data('index') || $(prodElement).closest('.carousel-cell').data('index') + 1;
    if(productInfo){
	    productInfo.position = (position)?position:1;
		productInfo.quantity = (quantity)?quantity:1;
		productInfo.brand = 'Tatcha';   
		productInfoList.push(productInfo);
    }
    var customAttributes = getCustomAttributes($(prodElement),'add_to_cart');
	mParticleProductAction(productInfoList,customAttributes,'add_to_cart');
}

function productClick(prodElement){
	var customAttributes = getCustomAttributes($(prodElement),'product_click');
	var productInfoList = [];
	if($(prodElement).hasClass('pairs-with-btn')){
		prodElement = $(prodElement).closest('.bag-item-container').siblings('.popup-unit').find("[data-product-info]");	
	}else if($(prodElement).closest('.popup-body').length > 0){
		prodElement = $(prodElement).closest('.popup-body').find("[data-product-info]"); 
	}else if($(prodElement).closest('.upsell-use-with').length > 0){
		prodElement = $(prodElement).closest('.upsell-use-with').find("[data-product-info]"); 
	}else if($(prodElement).closest('.carousel-cell').length > 0){
		prodElement = $(prodElement).closest('.carousel-cell').find("[data-product-info]");
	}else if($(prodElement).closest('[data-slider-detail="carousel"]').length > 0){
		prodElement = $(prodElement).closest('[data-slider-detail="carousel"]').find("[data-product-info]");
	}
	else if($(prodElement).closest('.move-search').length > 0){
		prodElement = $(prodElement).closest('.move-search');
	}else {
		prodElement = $(prodElement).closest('.product-tile').find("[data-product-info]");
	}
	if(prodElement && prodElement.length > 0) {
		var productInfo = prodElement.data('product-info');
		if(productInfo){
			productInfo.quantity = 1;
			productInfo.brand = 'Tatcha';
			productInfo.position =  $(prodElement).closest('.product-list-col').data('index') || $(prodElement).closest('.carousel-cell').data('index') + 1;
			productInfoList.push(productInfo);
			mParticleProductAction(productInfoList,customAttributes,'product_click');
		}				
	}
}

function mParticleProductAction(productInfo,customAttributes,actionType){
	
	if(!window.mParticle || !productInfo) {
		return;
	}

	try {		
			var ProductList = [];
			var rscProductList = [];
			for(var i = 0; i < productInfo.length; i++) {
				var Product = window.mParticle.eCommerce.createProduct(
		    		(productInfo[i].productname)?productInfo[i].productname:'',
		    		(productInfo[i].sku)?productInfo[i].sku:'',
		    		(productInfo[i].price)?productInfo[i].price:'',
		    		(productInfo[i].quantity)?productInfo[i].quantity:'',
		    		(productInfo[i].variant)?productInfo[i].variant:'',
		    		(productInfo[i].category)?productInfo[i].category:'',
		    		(productInfo[i].brand)?productInfo[i].brand:'',
		    		(productInfo[i].position)?productInfo[i].position:'',
		    		(productInfo[i].couponCode)?productInfo[i].couponCode:'',
		    		{
		    			'originalPrice':(productInfo[i].price)?productInfo[i].price:'',
		    			'masterSKU':(productInfo[i].masterSku)?productInfo[i].masterSku:'',
		    			'type':(productInfo[i].type)?productInfo[i].type:''
		            }
				);
				Product.Quantity = productInfo[i].quantity;
				ProductList.push(Product);

				var rscProduct = {
					'Name': (productInfo[i].productname) ? productInfo[i].productname : '',
					'Sku': (productInfo[i].sku) ? productInfo[i].sku : '',
					'Price': (productInfo[i].price) ? productInfo[i].price : 0,
					'Quantity': (productInfo[i].quantity) ? productInfo[i].quantity : 0,
					'Variant': (productInfo[i].variant) ? productInfo[i].variant : '',
					'Category': (productInfo[i].category) ? productInfo[i].category : '',
					'Brand': (productInfo[i].brand) ? productInfo[i].brand : '',
					'Position': (productInfo[i].position) ? productInfo[i].position : 0,
					'couponCode': (productInfo[i].couponCode) ? productInfo[i].couponCode : '',
					'originalPrice': (productInfo[i].price) ? productInfo[i].price : 0,
					'masterSKU': (productInfo[i].masterSku) ? productInfo[i].masterSku : '',
					'type': (productInfo[i].type) ? productInfo[i].type : ''
				}
				rscProductList.push(rscProduct);
			}

	    // Push to mParticle
	    switch(actionType) {
	    	case 'add_to_cart':
	    		window.mParticle.eCommerce.logProductAction(
		    		window.mParticle.ProductActionType.AddToCart, 
		    		ProductList,customAttributes
	    		);
				if (SitePreferences.RSC_ADC_ENABLED) {
					adc.logRSCCommerceEvent(
						'add_to_cart',
						rscProductList, customAttributes
						);					
				}
	    	break;
	    	case 'remove_from_cart':
	    		window.mParticle.eCommerce.logProductAction(
		    		window.mParticle.ProductActionType.RemoveFromCart, 
		    		ProductList,customAttributes
	    		);
                if (SitePreferences.RSC_ADC_ENABLED) {
					adc.logRSCCommerceEvent(
						'remove_from_cart',
						rscProductList, customAttributes
					);
                }
	    	break;
	    	case 'product_click':
	    		window.mParticle.eCommerce.logProductAction(
	    			window.mParticle.ProductActionType.Click, 
	    			ProductList,customAttributes
	    		);
				if (SitePreferences.RSC_ADC_ENABLED) {
					adc.logRSCCommerceEvent(
						'product_click',
						rscProductList, customAttributes
					);
				}
	    	break;
	    	case 'product_view':
	    		var impression = mParticle.eCommerce.createImpression('Product View', Product);
	    		window.mParticle.eCommerce.logImpression(impression,customAttributes);
				if (SitePreferences.RSC_ADC_ENABLED) {
					var impression = { 'Name': 'Product View' };
					var attributes = {
						'originalPrice': Product.Price,
						'mainSKU': Product.masterSKU,
						'type': ''
					}
					var product = {
						'Name': Product.Name,
						'Sku': Product.Sku,
						'Price': Product.Price,
						'Quantity': Product.Quantity,
						'Variation': Product.Variant ? Product.Variant : '',
						'Quantity': Product.quantity,
						'DiscountCoupon': dataLayer.discountCoupon
					};
					product['Attributes'] = attributes;
					impression['Product'] = product;
					adc.logRSCImpressionEvent(impression, customAttributes)
				}
	    	break;	 
	    	case 'product_wishlist_click':
	    		window.mParticle.eCommerce.logProductAction(
	    			window.mParticle.ProductActionType.AddToWishlist, 
	    			ProductList,customAttributes
	    		);
				if (SitePreferences.RSC_ADC_ENABLED) {
					adc.logRSCCommerceEvent(
						'add_to_wishlist',
						rscProductList, customAttributes
					);
				}
	    	break;
	    	case 'view_detail':
	    		window.mParticle.eCommerce.logProductAction(
	    			window.mParticle.ProductActionType.ViewDetail, 
	    			ProductList,customAttributes
	    		);
				if (SitePreferences.RSC_ADC_ENABLED) {
					adc.logRSCCommerceEvent(
						'view_detail',
						rscProductList, customAttributes
					);
				}			
	    	default:

	    }	    
	    
	} catch(err){
		//TODO
	}
}

//Rotating promo banner actions
function mParticleRotatingBannerAction(action,direction){
	var data = {
     	 'actionType':action,
     	 'pageSource':findSource(),
    	 'cellHeading':$('.rotating-promo-carousel .is-selected .rotating-banner-link').text()
      	 }
	if(direction){
		data['clickDirection'] = direction;
	}
	
	
	if(window.location.search) {    
	    var urlParams = new URLSearchParams(window.location.search);
	    if(urlParams.get('utm_source')){
	    	data.utm_source = urlParams.get('utm_source');       
	    }
	    if(urlParams.get('utm_campaign')){
	    	data.utm_campaign = urlParams.get('utm_campaign');       
	    }
	    if(urlParams.get('utm_medium')){
	    	data.utm_medium = urlParams.get('utm_medium');       
	    }     
	 }
	 data.deviceType = isMobile() ? 'mobile':'desktop';
		  
	mParticle.logEvent(
  		 'Rotating Banner Action', 
  		 mParticle.EventType.Other,data,{
        'Google.Category': 'Promo Banners'
   });	
	if (SitePreferences.RSC_ADC_ENABLED) {
		adc.logRSCCustomEvent(
			'Rotating Banner Action',
			mParticle.EventType.Other, data);
	}
}

//Pre nav click action
function mParticlePrenavClick(promoText){
	var data={
		"pageSource":findSource(),
		"actionType":"click",
		"promoText":promoText
	};
	
	mPartcleLogEvent('Purple Promo', data);	
	if (SitePreferences.RSC_ADC_ENABLED) {
		adc.logRSCCustomEvent('Purple Promo', data);
	}
}

// Function returns page source for rotating banner
function findSource(){
		var source = window.location.pathname;
		if(window.location.pathname.indexOf("/category") > -1){
			source = "category page";
		}else if(window.location.pathname.indexOf("/product") > -1){
			source = "p-page";
		}else if(window.location.pathname.indexOf("/confirmation") > -1){
			source = "confirmation";
		}else if(window.location.pathname.indexOf("/consultation") > -1){
			source = "consultation";
		}else if(window.location.pathname.indexOf("/ritual_finder") > -1){
			source = "ritual finder";
		}else if(window.location.pathname === "/"){
			source = "home page";
		}
		return source;
}

/**
 * Method to send login and registration events/data to mParticle
 * 
 * @param profileData
 * @param isRegister
 * @returns
 */
function mParticleLogin(profileData, eventType){
	
	var identityRequest = {
			userIdentities: {
				email: profileData.email,
				customerid: profileData.customerNo
			}
	};

	if(profileData.facebookID) {
		identityRequest.userIdentities.facebook = profileData.facebookID;
	}
	
	var success = true;
	
	try {

		var identityCallback = function(result) {
			if (result.getUser()) {
				window.mpid = result.getUser().getMPID();
				if (SitePreferences.RSC_ADC_ENABLED) {
					for (var key in identityRequest.userIdentities) {
						adc.updateCustomerIdentity(key, identityRequest.userIdentities[key]);
					}
				}

				for (var key in profileData.profileAttributes) {
					result.getUser().setUserAttribute(key, profileData.profileAttributes[key]);
					if (SitePreferences.RSC_ADC_ENABLED) {
						adc.updateCustomerAttribute(key, profileData.profileAttributes[key]);
					}
				}
			} else {
				success = false;
			}
		};

		mParticle.Identity.login(identityRequest, identityCallback);


	} catch (e) {
		success = false;
	}
	
	if (success) {
		
		var data = {};
		if(window.location.search) {    
		    var urlParams = new URLSearchParams(window.location.search);
		    if(urlParams.get('utm_source')){
		    	data.utm_source = urlParams.get('utm_source');       
		    }
		    if(urlParams.get('utm_campaign')){
		    	data.utm_campaign = urlParams.get('utm_campaign');       
		    }
		    if(urlParams.get('utm_medium')){
		    	data.utm_medium = urlParams.get('utm_medium');       
		    }     
		 }
		 data.deviceType = isMobile() ? 'mobile':'desktop';
		 

		if (eventType == 'register') {
			mParticle.logEvent('Created Account',mParticle.EventType.Other,data);
		} else if (eventType == 'login'){
			mParticle.logEvent('Logged In',mParticle.EventType.Other,data);
		} else if (eventType == 'facebook') {
			mParticle.logEvent('Facebook Login',mParticle.EventType.Other,data);
		}
	} else {
		if (eventType == 'register') {
			mParticle.logError('Create Account failed');
		} else if (eventType == 'login'){
			mParticle.logError('Login failed');
		} else if (eventType == 'facebook') {
			mParticle.logEvent('Facebook Login Failed');
		}
	}

	if (SitePreferences.RSC_ADC_ENABLED) {
		if (profileData) {
			var userIdentites = {
				email: profileData.email,
				customerid: profileData.customerNo
			}

			if (profileData.facebookID) {
				userIdentites.push('facebook', profileData.facebookID)
			}

			var rscData = {};
			if (window.location.search) {
				var urlParams = new URLSearchParams(window.location.search);
				if (urlParams.get('utm_source')) {
					rscData.utm_source = urlParams.get('utm_source');
				}
				if (urlParams.get('utm_campaign')) {
					rscData.utm_campaign = urlParams.get('utm_campaign');
				}
				if (urlParams.get('utm_medium')) {
					rscData.utm_medium = urlParams.get('utm_medium');
				}
			}
			rscData.deviceType = isMobile() ? 'mobile' : 'desktop';

			if (eventType == 'register') {
				adc.logRSCCustomEvent('Created Account', mParticle.EventType.Other, rscData);
			} else if (eventType == 'login') {
				adc.logRSCCustomEvent('Logged In', mParticle.EventType.Other, rscData);
			} else if (eventType == 'facebook') {
				adc.logRSCCustomEvent('Facebook Login', mParticle.EventType.Other, rscData);
			}
		}
	}
	

}

/**
 * Method to update user attributes in mParticle
 * 
 * @param profileAttributes
 * @returns
 */
function mParticleUpdateUserAttributes(profileAttributes){
	
	var currentUser = mParticle.Identity.getCurrentUser();

	//Update user attributes associated with the user (there are several variations of this in addition to below)
    for (var key in profileAttributes) {
    	currentUser.setUserAttribute(key,profileAttributes[key]);
		if (SitePreferences.RSC_ADC_ENABLED) {
			adc.updateCustomerAttribute(key,profileAttributes[key]);
		}
    }

}

/**
 * Method to update a single user attribute in mParticle
 * 
 * @param key
 * @param value
 * @returns
 */
function mParticleUpdateUserAttribute(key, value){
	var currentUser = mParticle.Identity.getCurrentUser();

	//Update user attributes associated with the user (there are several variations of this in addition to below)
    currentUser.setUserAttribute(key,value);
	if (SitePreferences.RSC_ADC_ENABLED) {
		adc.updateCustomerAttribute(key, value);
	}

}


/**
 * Method to update identity (specifically email) in mParticle
 * 
 * @param email
 * @returns
 */
function mParticleModifyIdentity(email){

	var identityRequest = {
		userIdentities: { email: email }
	}
	
	var identityCallback = function(result) {
		if (result.getUser()) {
			//
		}
	};
	
	mParticle.Identity.modify(identityRequest, identityCallback);
	if (SitePreferences.RSC_ADC_ENABLED) {
		adc.updateCustomerIdentity('email', email);

	}
}

/**
 * Method to identify anonymous activity.
 * 
 * @param identifyData
 * @returns
 */
function mParticleIdentify(profileData) {

	var identityRequest = {
			userIdentities: { email: profileData.email }
	}

	var identityCallback = function(result) {
		window.mpid = result.getUser().getMPID();		
		if (result.getUser()) {
			for (var key in profileData.profileAttributes) {
				result.getUser().setUserAttribute(key,profileData.profileAttributes[key]);
				if (SitePreferences.RSC_ADC_ENABLED) {
					adc.updateCustomerAttribute(key, profileData.profileAttributes[key]);
				}
			}
		} else {
			success = false;
		}

	};

	mParticle.Identity.identify(identityRequest, identityCallback);

}


function getCustomAttributes(obj,action){
	
	var siteSection = '';
    var utm_source = '';
    var utm_campaign = '';
    var utm_medium = '';

	var pagePath = window.location.origin + window.location.pathname;	
	var pathName = window.location.pathname;
	
	if((pathName.startsWith("/category") || pathName.startsWith("/s/tatcha/category")) && $(obj).closest('.mini-bag').length < 1){
		siteSection = $(obj).hasClass('compare-add-to-bag') ? "Category Compare" : "Category";
	} else if((pathName.startsWith("/product") || pathName.startsWith("/s/tatcha/product")) && $(obj).closest('.mini-bag').length < 1){
		if(action == 'view_detail'){
			siteSection = "page";
		} else if ($(obj).closest('.routine-step').length > 0) {
			siteSection = "via Suggested Ritual";
		} else if ($(obj).hasClass('ymliAddToBag') || $(obj).closest('.product-list-unit').find('.ymliAddToBag').length > 0) {
			siteSection = "via YMAL";
		} else if ($(obj).closest('.upsell-use-with').length > 0 ) {
			siteSection = $(obj).hasClass('upsell-product-add-to-cart') ? "via Use It With - ADD BOTH" : "via Use It With";
		} else if ($(obj).hasClass('upsell-product-add-to-cart')) {
			siteSection = "P-Page Use It With: Add Both";
		} else if ($(obj).hasClass('mobile-affixed')) {
			siteSection = "P-Page Mobile Affixed";
		} else {
			siteSection = "P-Page Main";
		}
	} else if($(obj).hasClass('home-carousel-add-to-cart') || $(obj).siblings('.product-cta').children().hasClass('home-carousel-add-to-cart')||$(obj).siblings('[data-slider-detail="simple-btn"]').children().hasClass('home-carousel-add-to-cart')){		
		siteSection = "via Home Carousel";
	} else if($(obj).hasClass('img-search-add-to-cart')){		
		siteSection = "Image Search";
	} else if($(obj).hasClass('compare-add-to-bag')){		
		siteSection = "Comparison";
	} else if($(obj).hasClass('pairs-with-btn')){
		siteSection = "Pairs With View Click";
    } else if($(obj).closest('.pairs-with-flex').length > 0) {
		if($(obj).closest('.mini-bag').length > 0){
			siteSection = "via Mini Bag Pairs With";			
		}else {
			siteSection = "via Bag Page Pairs With";			
		}
	} else if($(obj).hasClass('pairs-with-travel')) {
		siteSection = "Bag Page: Pairs With Travel";
	} else if(pathName.startsWith("/bag") || pathName.startsWith("/s/tatcha/bag"))	{
		siteSection = "Bag";
	} else if($(obj).closest('.mini-bag').length > 0){		
		siteSection = "Mini Bag";
	} else if($(obj).hasClass('reorder-prd-add-qv')){		
		siteSection = "Reorder";
	} else if($(obj).hasClass('ritual-add-to-cart') || $(obj).hasClass('add-ritual-button')){
		siteSection = "Ritual Finder";
	} else if(pathName.startsWith("/blog") || pathName.startsWith("/s/tatcha/blog")){
		siteSection = "Blog Post";
	} else if($(obj).hasClass('history-add-to-cart') || pathName.startsWith("/account/orders") || pathName.startsWith("/s/tatcha/account/orders")){		
		siteSection = "Order History";
	} else if($(obj).hasClass('wishlist-add-to-cart') || pathName.startsWith("/account/wishlist") || pathName.startsWith("/s/tatcha/account/wishlist")){
		if($(obj).hasClass('carousel-add-to-cart')) {
			siteSection = "Wishlist Empty State Carousel";
		} else {
			siteSection = "Wishlist";
		}
	} else if(pathName.startsWith("/giftfinder/results") || pathName.startsWith("/s/tatcha/giftfinder/results")){		
		siteSection = "Gift Finder";
	} else if($(obj).hasClass('full-width-panel-add-to-bag')){		
		siteSection = "Home Panel Full Width Product";
	} else if($(obj).hasClass('move-search')){
		siteSection = "via Search results";
	}
	
	
	if(action == 'add_to_cart') {
		siteSection = "Add to Bag Click: "+siteSection;
	} else if(action == 'product_click') {
		if($(obj).closest('[data-slider-detail="carousel"]').length > 0 || $(obj).closest('.carousel-cell').length > 0 || $(obj).closest('.upsell-use-with').length > 0 || $(obj).closest('.pairs-with-flex').length > 0){
			siteSection = "Upsell: View Product Link Click: "+siteSection;
		}else if($(obj).hasClass('pairs-with-btn')){
			if($(obj).closest('.mini-bag').length > 0){
				siteSection = "Mini-Bag: "+siteSection;
			}else {
				siteSection = "Bag: "+siteSection;	
			}
		}else{	
			siteSection = "Product Click: "+siteSection;			
		}
	} else if(action == 'remove_from_cart'){
		siteSection = "Remove from cart Click: "+siteSection;
	}else if(action == 'product_wishlist_click'){
		siteSection = "Add to wishlist Click: "+siteSection;
	} else if(action != 'view_detail'){
		siteSection = "Product View: "+siteSection;
	}

	
	// Optional parameters

	if(window.location.search) {		
		var urlParams = new URLSearchParams(window.location.search);
	
		if(urlParams.get('utm_source')){
			utm_source = urlParams.get('utm_source');	    	
		}
		if(urlParams.get('utm_campaign')){
			utm_campaign = urlParams.get('utm_campaign');	    	
		}
		if(urlParams.get('utm_medium')){
			utm_medium = urlParams.get('utm_medium');	    	
		}    
	}
	
    var customAttributes = { 
        	siteSection: siteSection, 
        	sourcePage: window.location.href,
        	pagePath: pathName,
        	deviceType: isMobile() ? 'mobile':'desktop',
        	utm_source: utm_source,
        	utm_campaign: utm_campaign,
        	utm_medium: utm_medium
        };
    
    return customAttributes;

}

/**
 * Method to identify viewed screens.
 * 
 * @param pageName
 * @returns
 */
function mParticleViewedScreen(pageName){
	var pathName = window.location.pathname+window.location.search;
	
	var logEvent;
	var utm_source = '';
	var utm_campaign = '';
	var utm_medium = '';
	var eventName;
	if(pageName == 'Checkout' || pageName == 'Ritual Finder' || pageName == 'Gift finder' || pageName == 'Compare' || pageName == 'Wishlist' || pageName == 'My Account' || pageName == 'Order History' || pageName == 'Reorder'){
		logEvent = true;
		if(pathName.indexOf("/auto-delivery") > -1){
			pageName = 'Auto delivery';
		}else if(pathName.indexOf("account/address") > -1){
			pageName = 'Address book';
		}else if(pathName.indexOf("account/payment") > -1){
			pageName = 'Payment options';
		}else if(pathName.indexOf("account/text-email") > -1){
			pageName = 'Text & email preferences';
		}else if(pathName.indexOf("account/settings") > -1){
			pageName = 'Login settings & profile';
		}
	}else if(pageName == 'Cart'){
		logEvent = true;
		pageName = 'Bag';
	}else if(pageName == 'Storefront'){
		logEvent = true;
		if(window.location.pathname == '/'){
			pageName = 'Home page';
		}else{
			pageName = 'Content page';
		}		
		eventName = pageName;
	}else if(pathName.indexOf("/product") > -1){
		logEvent = true;
		pageName = 'Product page';
		eventName = 'Product Detail Page';
		//product - view detail
		var productInfoList = [];
		var prodElement = $('button.add-to-cart');
		if(prodElement && prodElement.length > 0) {
			var productInfo = prodElement.data('product-info');
			if(productInfo){
				productInfo.brand = 'Tatcha';
				productInfoList.push(productInfo);
				mParticleProductAction(productInfoList,getCustomAttributes($(prodElement),'view_detail'),'view_detail');
			}				
		}
	}else if(pathName.indexOf("/category/about-auto-delivery") > -1){
		logEvent = true;
		pageName = 'Auto delivery';
	}else if(pageName == 'Product Search Results'){
		logEvent = true;
		pageName = 'Category page';
		eventName = pageName;
	}else if(pageName == 'Order Confirmation'){
		logEvent = true;
		pageName = 'Checkout';
	}else if(pageName == 'Blog Page'){
		logEvent = true;
		eventName = pageName;
	}else if(pageName == 'Content Search Results' || pageName == 'CMS Page'){
		logEvent = true;
		pageName = 'Content page view'; 
		eventName = pageName;
	}else if(pathName.indexOf("/giftcertpurchase") > -1){
		logEvent = true;
		pageName = 'Product page';
		eventName = 'Product Detail Page';
	}else{
		logEvent = true;
		 eventName = pageName;
	}
	
	
	if(pathName.indexOf("/checkout/expressreview") > -1){
		pathName = pathName.split('&token')[0];
	}	
	
	if(logEvent){
		if(window.location.search) {		
			var urlParams = new URLSearchParams(window.location.search);
		
			if(urlParams.get('utm_source')){
				utm_source = urlParams.get('utm_source');	    	
			}
			if(urlParams.get('utm_campaign')){
				utm_campaign = urlParams.get('utm_campaign');	    	
			}
			if(urlParams.get('utm_medium')){
				utm_medium = urlParams.get('utm_medium');	    	
			}    
		}
		
		mParticle.logPageView(
				eventName ? eventName : pageName+" page",
				{	"url": window.location.toString(),
					"pageCategory" : pageName,
					"deviceType": isMobile() ? 'mobile':'desktop',
					"utm_source" : utm_source,
					"utm_campaign" : utm_campaign,
					"utm_medium" : utm_medium
				},				
				{"Google.Page": window.location.pathname.toString()}
			);
		if (SitePreferences.RSC_ADC_ENABLED) {
			adc.logRSCScreenView(
				eventName ? eventName : pageName + " page",
				{
					"url": window.location.toString(),
					"pageCategory": pageName,
					"deviceType": isMobile() ? 'mobile' : 'desktop',
					"utm_source": utm_source,
					"utm_campaign": utm_campaign,
					"utm_medium": utm_medium
				}
			);
		}
	}	
}


/* Category filters */

function mParticleSearchRefinements(searchRefinements){
	var data = {}, filterSelection = [];
	if(searchRefinements.skinType){
		data.skinType = searchRefinements.skinType;
		filterSelection.push('skin type');
	}
	if(searchRefinements.skinConcerns){
		data.skinConcerns = searchRefinements.skinConcerns;
		filterSelection.push('solutions');
	}
	if(searchRefinements.sortBy){
		data.sortBy = searchRefinements.sortBy;
		filterSelection.push('sort by');
	}
	data.filterSelection = filterSelection.join(',');
	
	mParticle.logEvent(
	   'Filter Selected', 
	   mParticle.EventType.Other,{
	      'filterSelection':filterSelection.join(','),
	      'device':isMobile() ? 'mobile':'desktop',
	      'Category filter: skin type': data.skinType,
	      'Category filter: solutions': data.skinConcerns,
	      'Category filter: filter by': data.sortBy,
	   },{
	      'Google.Category': searchRefinements.category
	   });
	if (SitePreferences.RSC_ADC_ENABLED) {
		adc.logRSCCustomEvent(
			'Filter Selected',
			mParticle.EventType.Other, {
			'filterSelection': filterSelection.join(','),
			'device': isMobile() ? 'mobile' : 'desktop',
			'Category filter: skin type': data.skinType,
			'Category filter: solutions': data.skinConcerns,
			'Category filter: filter by': data.sortBy,
		});
	}
}

/* CHECKOUT */

/* 
* Cart - Giftwrap add link click trigger
*/
$(document).on('click', '.hasGiftMessage', function() {
	var data = {};
	mPartcleLogEvent('Gift Options Modal Click', data, 'Gift Options');
});


/* 
* Cart - Giftwrap save
* values send :- giftwrapSelected, giftMessage
*/
$(document).on('click', '#giftmsg-form .gift-message-save, #giftmsg-form .modal-tatcha-gift-message-save', function() {
	var data = {};
	var giftwrapSelected = $('#giftmsg-form .gift-toggle').is(':checked');
	var giftMessage = $('#giftmsg-form .giftmessage').val();
	data.giftwrapSelected = giftwrapSelected;
	data.giftMessage = giftMessage;
	mPartcleLogEvent('Gift Options Selected', data, 'Checkout');
});


/*
* Cart, Minicart, Checkout - PromoCode Apply
* values send :- actionType, promoCode, pageSource
*/
$(document).on('click', '.minicart-promo-button, .bag-promo-container .promo-button, .order-summary .promo-button', function() {
	var data = {};
	
	var actionType = 'add';
	var promoCode = '';
	var pageSource = '';
	if(location.href.indexOf('/bag') > -1) {
		pageSource = 'bag';
		promoCode = $('input[name="dwfrm_cart_couponCode"]').val();
	} else if(location.href.indexOf('/checkout') > -1) {
		var isMob = isMobile();
		pageSource = 'checkout summary';
		promoCode = isMob ? $('#order-summary-mob .promocode').val() : $('#order-summary-desktop-container .promocode').val();
	} else {
		pageSource = 'mini-bag';
		//Remove the condition and take first value once sfra minbag active and sitegen minibag not in use
		promoCode  = $(this).closest('.minibagSfra').length > 0 ? $('input[name="couponCode"]').val() : $('input[name="minicart-promo-code"]').val();
	}
	
	
	data.actionType = actionType;
	data.promoCode = promoCode;
	data.pageSource = pageSource;
	
	mPartcleLogEvent('Promo Code Action', data, 'Checkout');
});

/*
* Cart, Minicart, Checkout - PromoCode Remove
* values send :- actionType, promoCode, pageSource
*/
$(document).on('click', '.order-summary .promo-close, .checkout-promo-code .promo-remove, .minicart-promo-remove, .mini-bag .promocode-remove', function() {
	var data = {};
	
	var actionType = 'remove';
	var promoCode = '';
	var pageSource = '';
	
	if(location.href.indexOf('/bag') > -1) {
		pageSource = 'bag';
		promoCode = $('input[name="dwfrm_cart_couponCode"]').val();
	} else if(location.href.indexOf('/checkout') > -1) {
		var isMob = isMobile();
		pageSource = 'checkout summary';
		promoCode = isMob ? $('#order-summary-mob input[name="couponCode"]').val() : $('#order-summary-desktop-container input[name="couponCode"]').val();
	} else {
		pageSource = 'mini-bag';
		//Remove the condition and take first value once sfra minbag active and sitegen minibag not in use
		promoCode  = $(this).closest('.minibagSfra').length > 0 ? $('input[name="dwfrm_cart_couponCode"]').val() : $('.minicart-promo-remove').attr('data-pid');
	}
	
	data.actionType = actionType;
	data.promoCode = promoCode;
	data.pageSource = pageSource;
	
	mPartcleLogEvent('Promo Code Action', data, 'Checkout');
});

//Non Page Designer content page cta click - blog page 
/*
$(document).on("click",'.content-article-cta,.blog-post-cta',function(){
	mPartcleLogEvent(
   'Content Page Click', 
   {
      'pageSource':window.location.pathname,
      'clickURL':$(this).find('a').attr("href")
   });
})*/

/** RTIUAL FINDER
 * Needs to be removed once SFRA is live
 * */

/**
 * Ritual Finder - Select persona
 */
$(document).on('click', '.whats-next-main .question-cta .enabled-cta-2', function() {
	var selectedPersona = $('input[name="optionPersona"]:checked').val();
	mParticleUpdateUserAttribute('Ritual Finder Completed Persona', selectedPersona);
})

/**
 * Ritual Finder Skin Type
 */
$(document).on('click', '.whats-next-main .question-cta .enabled-cta-3', function() {
	var selectedPersona = $('input[name="optionSkinType"]:checked').val();
	mParticleUpdateUserAttribute('Ritual Finder Skin Type', selectedPersona);
})

/**
 * Ritual Finder Sensitivity
 */
$(document).on('change', '.whats-next-main #sensitivity', function() {
  var isSkinSensitive = $(this).is(':checked');
  mParticleUpdateUserAttribute('Ritual Finder Sensitivity', isSkinSensitive);
})

/**
 * Ritual Finder Skin Wishes
 */
var skinCncrns = '';
$(document).on('click', '.whats-next-main .show-state-5', function() {
  if(skinCncrns && skinCncrns.length > 0) {
	var skinWishes = skinCncrns.replace(/,(?=[^,]*$)/, '');;
  	mParticleUpdateUserAttribute('Ritual Finder Skin Wishes', skinWishes);
  }
})

/**
 * Get the list of selected wishes
 */
$(document).on('change', '.whats-next-main .skinConcern', function() {
	if($(this).is(':checked')) {
		skinCncrns += $(this).parent().find('label').find('.check-label').text() + ',';
	}
});

/** CHECKOUT INITIATED */

/** Paypal */
window.mParticleCheckoutInitiated = function(paymentType, page) {
	if(paymentType === 'paypal') {
		var data = {};
		data.containerSource = 'mini-bag';
		data.paymentType = 'PayPal';
		data.checkoutInitiated = true;
		var miniBagProducts = getMiniBagProductsList();
		mParticleLogProduct(miniBagProducts, data, 'Checkout');
	}
}

/**
 * Mini Bag - Secure checkout
 */
$(document).on('click', '.mini-bag .secure-checkout', function() {
	var data = {};
	data.containerSource = 'mini-bag';
	data.paymentType = 'secure checkout';
	data.checkoutInitiated = true;
	var miniBagProducts = getMiniBagProductsList();
	mParticleLogProduct(miniBagProducts, data, 'Checkout');
})


/**
 * Mini Bag - AfterPay
 */
$(document).on('click', '.mini-bag .afterpay-express-button-minibag', function() {
	var data = {};
	data.containerSource = 'mini-bag';
	data.paymentType = 'AfterPay';
	data.checkoutInitiated = true;
	var miniBagProducts = getMiniBagProductsList();
	mParticleLogProduct(miniBagProducts, data, 'Checkout');
})

/**
 * Minibag - Apple Pay
 */
$(document).on('click', '.mini-bag .braintree-cart-apple-button', function() {
    var data = {};
	data.containerSource = 'mini-bag';
    data.checkoutInitiated = true;
    data.paymentType = 'Apple Pay';
    var miniBagProducts = getMiniBagProductsList();
    mParticleLogProduct(miniBagProducts, data, 'Checkout');
})

function getMiniBagProductsList() {
	var selector = $('.minibag-scroll .bag-product-item');
	var productsList = [];
	try {
		if(window.mParticle) {
			if(selector.length > 0) {
				for(var i=0;i<selector.length;i++) {
					if(selector[i] && $(selector[i]).is(':visible')) {
						var prd = $(selector[i]).attr('data-product-info');
						prd = JSON.parse(prd);
						var qty = $(selector[i]).find('.qty-field')? $(selector[i]).find('.qty-field').val() : 1;
						var product;
						if(prd) {
							product = window.mParticle.eCommerce.createProduct(
								prd.productname,
								prd.sku,
								prd.price,
								qty,
								prd.variant ? prd.variant : '',
								prd.category ? prd.category: '',
								'Tatcha'
							);
						}   
						productsList.push(product);
					}
				}
			}
		}
	} catch(e){}
	
	return productsList;
}

function mParticleLogProduct(products,data) {
	try {
		if(window.mParticle) {
			var transactionAttributes;

			mParticle.eCommerce.logProductAction(
				mParticle.ProductActionType.Checkout,
				products,
				data,
				null,
				transactionAttributes
			);
		}
		if (SitePreferences.RSC_ADC_ENABLED) {
			if (products) {
				var rscProductList = [];
				for (const product of products){
					var rscProduct = product;
					if(!rscProduct.Position || rscProduct.Position === ''){
						rscProduct.Position = 0;
					}
					if(!rscProduct.Quantity || rscProduct.Quantity === ''){
						rscProduct.Quantity = 0;
					}
					rscProductList.push(rscProduct)
				} 
				adc.logRSCCommerceEvent(
					"Checkout",
					rscProductList,
					data
				);
			}
		}
	}catch(e){}
}
/**
 * Navigation main nav
 */
$(document).on('click','#mainNav .nav-link, #mainNav .nav-mobile-subnav, #mainNav .dropdown-menu .nav-desktop a, #mainNav .main-nav .dropdown-menu li , #mainNav .mini-cart, #mainNav .navbar-search, .search-mobile .simple-search-mobile, #mainNav .minicart',function(e){
	//e.preventDefault();
	var data = {};
	data.stateTypeLogin = $('.gtm-login').length == 0 ? 'LoggedIn' : 'Guest';
	data.stateTypeHeader = $('.prenav-utility .prenav-reorder-dekstop-link').length>0 || $('.mobile-account-nav .prenav-reorder-mobile-link').length>0 ? 'Reorder' : 'Consultation';
	if($(this).hasClass('nav-desktop') || $(this).hasClass('nav-shop-all')){
		data.clickType = 'Top Level Nav';
	}else if($(this).closest('.nav-mobile-subnav').length > 0 || $(this).closest('.show-item').length > 0 || $(this).closest('.nav-img-col').length > 0){
		data.clickType = 'Main Link';
	}else if($(this).closest('.mini-cart').length > 0){
		data.clickType = 'Bag Click';
	}else if($(this).closest('.minicart').length > 0){
		data.clickType = 'Bag Click';
	}else if($(this).hasClass('navbar-search') || $(this).hasClass('simple-search-mobile')){
		data.clickType = 'search-form-list';
	    var searchTerm = $('.simple-search-desktop input').val() !== '' ? $('.simple-search-desktop input').val() : $('.simple-search-mobile input').val();
	    if(searchTerm !==''){
	    	data.searchTerm = searchTerm;
	    }
	}
	data.linkText = ($(e.target).text()) ? $(e.target).text().trim() : $(this).closest('.nav-img-col').find('.nav-img-caption').text();
	var deviceType = isMobile() ? 'Mobile':'Desktop';
	mPartcleLogEvent('Navigation Click', data, deviceType+' Navigation' , mParticle.EventType.Navigation);
})


/**
 * Search dropdown
 */
$(document).on('click','.dropdown-search-desktop .move-search, .dropdown-search-mobile-results .move-search', function(){
	productClick(this);
})

/*
* Generic methos for firing mParticle Log Event
* @param event - Event Name
* @param data - The data to be send along with the event
* @param category - Event category 
*/
function mPartcleLogEvent(event, data, category, eventCategory) {
	var eCategory = eventCategory ? eventCategory : mParticle.EventType.Other;
	
	if(window.location.search && data) {		
		var urlParams = new URLSearchParams(window.location.search);
		if(urlParams.get('utm_source')){
			data.utm_source = urlParams.get('utm_source');
		}
		if(urlParams.get('utm_campaign')){
			data.utm_campaign = urlParams.get('utm_campaign');
		}
		if(urlParams.get('utm_medium')){
			data.utm_medium = urlParams.get('utm_medium');
		}

	}

	if(data && category != 'Gift Finder') {
		data.deviceType = isMobile() ? 'mobile':'desktop';
	}
	
	
	
	if(category && category!=null){
		mParticle.logEvent(
	   	event, 
	  	eCategory,
	   	data,
		{
	      'Google.Category': category
		}
	);
	}else{
		mParticle.logEvent(
	   	event, 
	  	eCategory,
	   	data
	);
	}

	if (SitePreferences.RSC_ADC_ENABLED) {
		adc.logRSCCustomEvent(
			event,
			eCategory,
			data
		);
	}
	
}

/*
 * Util method to identify the device type(Mobile/Desktop)
 */
function isMobile() {
    var mobileAgentHash = ['mobile', 'tablet', 'phone', 'ipad', 'ipod', 'android', 'blackberry', 'windows ce', 'opera mini', 'palm'];
    var idx = 0;
    var isMobile = false;
    var userAgent = (navigator.userAgent).toLowerCase();

    while (mobileAgentHash[idx] && !isMobile) {
        isMobile = (userAgent.indexOf(mobileAgentHash[idx]) >= 0);
        idx++;
    }
    return isMobile;
}

/*
 * Function to set Consent State for OneTrust
 */

function setUserConsentState() {

	try {
		
		// Validations
		if ((typeof window.mParticle === 'undefined') || (typeof window.OneTrust === 'undefined') ||
				(typeof window.OnetrustActiveGroups === 'undefined') || (typeof mParticle.Identity.getCurrentUser === 'undefined')) {
			return;
		}
		

		if(OneTrust && OnetrustActiveGroups) {
	
			var activeConsents = OnetrustActiveGroups.split(",");
			var user = mParticle.Identity.getCurrentUser();
	
			var targetingCookies = false;
			if(activeConsents.includes("C0004")){
				targetingCookies = true;
			}  
	
			if((OneTrust.getGeolocationData().country == 'US' )|| (OneTrust.getGeolocationData().country == 'CA')){
				// Check if state is changed
				if (user.getConsentState() && (typeof user.getConsentState().getCCPAConsentState() !== 'undefined') && 
						(typeof user.getConsentState().getCCPAConsentState().Consented !== 'undefined')) {
					var userState = user.getConsentState().getCCPAConsentState().Consented;
					var selectedState = !(targetingCookies);
					
					if(userState == selectedState) {
						return false;
					}				
				}
				
				// Set CCPA Consent
				var ccpaConsentState = mParticle.Consent.createCCPAConsent(
						!(targetingCookies), 
						Date.now(), 
						"ccpa_targetingcookies", 
						OneTrust.getGeolocationData().country, 
						mParticle.getDeviceId() 
				);
				var consentState = mParticle.Consent.createConsentState();
				consentState.setCCPAConsentState(ccpaConsentState); 
				
			} else {
				var performanceCookies = false;
				if(activeConsents.includes("C0002")){
					performanceCookies = true;
				}
	
				var functionalCookies = false;
				if(activeConsents.includes("C0003")){
					functionalCookies = true;
				}
	
				// Set GDPR Consent
				var gdprTargetingConsentState = mParticle.Consent.createGDPRConsent(
						targetingCookies, 
						Date.now(), 
						"gdpr_targetingcookies", 
						OneTrust.getGeolocationData().country, 
						mParticle.getDeviceId()
				);
	
				// Check if state is changed
				if (user.getConsentState() && (typeof user.getConsentState().getGDPRConsentState() !== 'undefined')) {
					
					if ((typeof user.getConsentState().getGDPRConsentState().targeting !== 'undefined') && 
							(typeof user.getConsentState().getGDPRConsentState().performance !== 'undefined') && 
							(typeof user.getConsentState().getGDPRConsentState().functional !== 'undefined')) {
						
						var userStatetargetingCookies = user.getConsentState().getGDPRConsentState().targeting.Consented;
						var userperformanceCookies = user.getConsentState().getGDPRConsentState().performance.Consented;
						var userStatefunctionalCookies = user.getConsentState().getGDPRConsentState().functional.Consented;
	
						if( (userStatetargetingCookies == targetingCookies) && 
								(userperformanceCookies == performanceCookies) && 
								(userStatefunctionalCookies == functionalCookies)) {
							return false;						
						}
	
					}					
				}
				var performanceCookies_consent = mParticle.Consent.createGDPRConsent(
						performanceCookies, 
						Date.now(), 
						"performanceCookies_consent",
						OneTrust.getGeolocationData().country, 
						mParticle.getDeviceId()
				);
		  
				var functionalCookies_consent = mParticle.Consent.createGDPRConsent(
						functionalCookies, 
						Date.now(), 
						"functionalCookies_consent",
						OneTrust.getGeolocationData().country, 
						mParticle.getDeviceId()
				);
		
		
				var consentState = mParticle.Consent.createConsentState();
				consentState.addGDPRConsentState("Targeting", gdprTargetingConsentState);
				consentState.addGDPRConsentState("Performance", performanceCookies_consent);
				consentState.addGDPRConsentState("Functional", functionalCookies_consent);
				

			
			}

			user.setConsentState(consentState);
			window.mParticle.logEvent('Consent State Update',mParticle.EventType.Other,{});
			if (SitePreferences.RSC_ADC_ENABLED) {
				adc.logRSCCustomEvent(
					'Consent State Update', mParticle.EventType.Other, {}
				);
			}
			/*OneTrust.OnConsentChanged(function() {
				window.mParticle.logEvent('Consent State Update',mParticle.EventType.Other,{})
			})*/
	  }
	} catch(err){}

}
	
	
