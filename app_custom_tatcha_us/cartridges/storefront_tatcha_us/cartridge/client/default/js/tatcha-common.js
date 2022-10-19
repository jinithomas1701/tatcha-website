module.exports = function(){
	var util = require('./util');
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

	 var trapFocus =  function(element) {
		    var focusableEls = element.querySelectorAll('a[href]:not([disabled]):not([aria-hidden="true"]), button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled]), a:not([disabled]):not([aria-hidden="true"]), div[tabindex="0"]');
		    var KEYCODE_TAB = 9;
		        if(focusableEls.length == 1){
					element.addEventListener('keydown', function(e) {
			        var isTabPressed = (e.key === 'Tab' || e.keyCode === KEYCODE_TAB);
			
			        if (!isTabPressed) { 
			            return; 
			        }
			
			        if ( e.shiftKey ) /* shift + tab */ {
			           focusableEls[0].focus();
					   e.preventDefault();
			        } else /* tab */ {
			           focusableEls[0].focus();
					   e.preventDefault();
			        }
			
			    	});
				}
				else{
					var firstFocusableEl = focusableEls[0];  
			        var lastFocusableEl = focusableEls[focusableEls.length - 1];
			        
			    	element.addEventListener('keydown', function(e) {
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
						element.addEventListener('keyup', function(e) {
							if($(document.activeElement)[0] === element){
								firstFocusableEl.focus();
								e.preventDefault();
							}
						});
			        }
			
			    	});
				}
				
		}
	    
	    //Auto Delivery Popup
	    $('.sor-itool').on('click', function(){
			var element = document.getElementById('sorModal');
	    	var body = $(this).attr('data-content');
	    	$('#sorModal .modal-body').html(body);
	    	$('#sorModal').modal();
			trapFocus(element);
	    });

		$('.pdp-refill-info').on('click', function(){
			var element = document.getElementById('autoDeliveryModal');
			trapFocus(element);
		});
		
		$('.skin-type-info-icon').on('focus',function(){
			var element = document.getElementById('skinTypeInfo');
			trapFocus(element);
		})
		
		$('.carousel-cell .rotating-banner-link').on('keydown',function(e){
			e.preventDefault();
			if(e.keyCode === 9 && e.shiftKey){
				$('.rotating-promo-container .flickity-prev-next-button.previous').focus();
			}else if(e.keyCode === 9){
				$('.rotating-promo-container .flickity-prev-next-button.next').focus();
			}else if(e.keyCode === 13){
				$(this)[0].click();
			}
		});
		
		$(document).on('click' , '.rotating-promo-container .flickity-prev-next-button.next, .rotating-promo-container .flickity-prev-next-button.previous' , function(e){
			setTimeout(function(){ 
				$('.rotating-promo-container .carousel-cell.is-selected a').focus();
			}, 500);
		});
		
		//Rotating promo modal- link collapse
		$('.promoDetailsCollapse[data-toggle="collapse"]').click(function() {
			var datatarget=$(this).data("target");
			  if ($(datatarget).hasClass("show")) {
			    $(this).text("Details");
			  } else {
			    $(this).text("Hide Details");
			  }
		});
		
		//See All carousel open modal
		$('.seeall-link').on('keypress',function(e) {
		    if(e.which == 13 || e.which == 32) {
		    	$('.seeall-link').trigger("click");
		    	$('#rotatingPromoModal .close').focus();
		    }
		});
		
		$('.seeall-link').on('click' , function(){
			var element = document.getElementById('rotatingPromoModal');
			trapFocus(element);
		});
		
		//Details on popup modal
		$('.promoDetailsCollapse').on('keypress',function(e) {
		    if(e.which == 13 || e.which == 32) {
		    	$(this).trigger("click");
		    }
		});
		
		$('.product-cms-carousel').on('focus','.carousel-cell',function(e){	    	
	    	var isSelected = $(this).hasClass('is-selected');
			if(!isSelected) {
				var currentIndex = $(this).data('index');
				var closestIndex = $(this).parent().find('.is-selected').last().data('index');
				if(currentIndex > closestIndex) {
					$(this).closest('.product-merchandise-carousel').find('.flickity-button.next').trigger('click');
				} else {
					$(this).closest('.product-merchandise-carousel').find('.flickity-button.previous').trigger('click');
				}
			}
	    });

		$('#addAllPearlSelect').on('shown.bs.modal', function () {
			$(this).find('button.close').focus();
			var element = document.getElementById('addAllPearlSelect');
			trapFocus(element);
		});
		
		$(document).ready(function () {
			//Accessibility - RDMP-2202
			if($('#account-creation-success-msg').length > 0) {
				setTimeout(function() {
					$('#account-creation-success-msg').text('Thank you! Your account has been created.');
					$('#account-creation-success').focus();
			  	}, 1000);
			}
			
		});
		
		$('#searchDesktopModal').on('shown.bs.modal', function () {
			var element = document.getElementById('searchDesktopModal');
			if(util.isMobile()){
				$(element).find('.popular-desk a').attr('aria-hidden', true);
			}else {
				$(element).find('.popular-mob a').attr('aria-hidden', true);
			}
			$(element).find('input').focus();
			trapFocus(element);
		});
		

}

