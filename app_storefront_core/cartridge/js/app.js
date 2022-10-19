/**
 *    (c) 2009-2014 Demandware Inc.
 *    Subject to standard usage terms and conditions
 *    For all details and documentation:
 *    https://bitbucket.com/demandware/sitegenesis
 */

'use strict';

var countries = require('./countries'),
    dialog = require('./dialog'),
    //minicart = require('./minicart'),
    page = require('./page'),
    rating = require('./rating'),
    //searchplaceholder = require('./searchplaceholder'),
    searchsuggest = require('./searchsuggest'),
    tooltip = require('./tooltip'),
    util = require('./util'),
    validator = require('./validator'),
    tls = require('./tls'),
    //gmautocomplete = require('./gmautocomplete'),
    ajax = require('./ajax'),
    progress = require('./progress'),
    login = require('./login'),
	//livechat = require('./livechat'),
    commonutil = require('./commonutil');

// if jQuery has not been loaded, load from google cdn
if (!window.jQuery) {
    var s = document.createElement('script');
    s.setAttribute('src', 'https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js');
    s.setAttribute('type', 'text/javascript');
    document.getElementsByTagName('head')[0].appendChild(s);
}

require('./jquery-ext')();
require('./cookieprivacy')();
require('./captcha')();
require('./tatcha-common')();
require('./giftfinder')();
function initializeEvents() {
    var controlKeys = ['8', '13', '46', '45', '36', '35', '38', '37', '40', '39'];

    $('body')
        .on('keydown', 'textarea[data-character-limit]', function (e) {
            var text = $.trim($(this).val()),
                charsLimit = $(this).data('character-limit'),
                charsUsed = text.length;

            if ((charsUsed >= charsLimit) && (controlKeys.indexOf(e.which.toString()) < 0)) {
                e.preventDefault();
            }
        })
        .on('change keyup mouseup', 'textarea[data-character-limit]', function () {
            var text = $.trim($(this).val()),
                charsLimit = $(this).data('character-limit'),
                charsUsed = text.length,
                charsRemain = charsLimit - charsUsed;

            if (charsRemain < 0) {
                $(this).val(text.slice(0, charsRemain));
                charsRemain = 0;
            }

            $(this).next('div.char-count').find('.char-remain-count').html(charsRemain);
            if($('#giftmsg-char-length').length){
            	var charcounttext= $(this).next('div.char-count').text();
            	$('#giftmsg-char-length').text(charcounttext);
            }
        });

    /**
     * initialize search suggestions, pending the value of the site preference(enhancedSearchSuggestions)
     * this will either init the legacy(false) or the beta versions(true) of the the search suggest feature.
     * */
   
    searchsuggest.init('', Resources.SIMPLE_SEARCH);
    
    $(window).resize(function(){
		searchsuggest.init('', Resources.SIMPLE_SEARCH);
    });    

    // add show/hide navigation elements
    $('.secondary-navigation .toggle').click(function () {
        $(this).toggleClass('expanded').next('ul').toggle();
    });

    // add generic toggle functionality
    $('.toggle').next('.toggle-content').hide();
    $('.toggle').click(function () {
        $(this).toggleClass('expanded').next('.toggle-content').toggle();
    });

    // subscribe email box
    var $subscribeEmail = $('.subscribe-email');
    if ($subscribeEmail.length > 0)    {
        $subscribeEmail.focus(function () {
            var val = $(this.val());
            if (val.length > 0 && val !== Resources.SUBSCRIBE_EMAIL_DEFAULT) {
                return; // do not animate when contains non-default value
            }

            $(this).animate({color: '#999999'}, 500, 'linear', function () {
                $(this).val('').css('color', '#333333');
            });
        }).blur(function () {
            var val = $.trim($(this.val()));
            if (val.length > 0) {
                return; // do not animate when contains value
            }
            $(this).val(Resources.SUBSCRIBE_EMAIL_DEFAULT)
                .css('color', '#999999')
                .animate({color: '#333333'}, 500, 'linear');
        });
    }

    $('.privacy-policy').on('click', function (e) {
        e.preventDefault();
        dialog.open({
            url: $(e.target).attr('href'),
            options: {
                height: 600
            }
        });
    });

    // main menu toggle
    $('.menu-toggle').on('click', function () {
        $('#wrapper').toggleClass('menu-active');
    });
    $('.menu-category li .menu-item-toggle').on('click', function (e) {
        e.preventDefault();
        var $parentLi = $(e.target).closest('li');
        $parentLi.siblings('li').removeClass('active').find('.menu-item-toggle').removeClass('fa-chevron-up active').addClass('fa-chevron-right');
        $parentLi.toggleClass('active');
        $(e.target).toggleClass('fa-chevron-right fa-chevron-up active');
    });
    $('.user-account').on('click', function (e) {
        e.preventDefault();
        $(this).parent('.user-info').toggleClass('active');
    });
    
    // Afterpay Changes Start
    $(document).on('click', '.afterpay-icon-link', function(e) {  
	    e.preventDefault();
	    var termsUrl=$(this);
	    if($('#afterpayModal').length==0){
	    $.ajax({
	    	url: termsUrl.attr('href'),
	    	data: {},
	    	success: function(data) {
	    		$('body').append(data);
	    		var modal = $('#afterpayModal');
	    		//modal.find( '.modal-body' ).html(data);
	    		modal.modal('show');
	    	}
	    });
	    }
    });
    // Afterpay Changes End
    
    // affix nav on scroll, hide prenav    
    if($('.tatcha-navbar').length > 0) {
    	//affix nav on scroll, hide prenav
    	var header = document.getElementById("mainNav");
    	var sticky = header.offsetTop;
    	
    	var screenWidth = window.screen ? window.screen.availWidth: null;
    	if($("main.essence-content").length<1){
		 $(window).scroll(function() {
          if (window.pageYOffset > sticky) {
        	  if(window.location.pathname.indexOf('/product') > -1 && $(window).width() < 768){}
        	  else {
        		  $('#mainNav').addClass('sticky-top');
                  $('#mainNav').addClass('navbar-fixed-top');
        	  }           
            if(screenWidth !== null &&  screenWidth < 1024) {
            	$('.mobile-search-block').fadeOut();
            }
          } else {
            $('#mainNav').removeClass('sticky-top');
            $('#mainNav').removeClass('navbar-fixed-top');
            if(screenWidth !== null &&  screenWidth < 1024) {
            	$('.mobile-search-block').fadeIn();
            }
          }
        });
	}
       
    }
    
    $('.navbar-toggle').click( function() {
       if ($(this).hasClass('collapsed')) {
        $("ul.nav.navbar-nav.nav-mobile .nav-link.dropdown-toggle").parent().removeClass('open iconChange');
        $('ul.nav.navbar-nav.nav-mobile').find('.dropdown-menu').css({'display':'none'});
        //$('.navbar-collapse').animate({"left": "0","height":"100%"}, 300, "linear");
      }
    });

    $('.nav-hamburger').click( function() {
		$('.tatcha-pre-nav').toggleClass('mobile-nav-hide');
		$('body').toggleClass('modal-open');
		$('nav').toggleClass('mobile-menu');
    });

    $("button.navbar-search-icon").on("click touchstart",function(e) {
  	   	e.preventDefault();  	   
  	   	if($('#navigation').hasClass("in")){
			$('.navbar-toggle').trigger("click");
  	   	}
  	   
  	   	var navbarOffsetTop = $('.tatcha-navbar').offset().top;
  	   	$('html,body').animate({scrollTop:navbarOffsetTop}, 1,function(){ 
			//$(".dropdown-search-mobile").show();
			$(".dropdown-search-mobile-results").html('').hide();
			$(".search-mobile-input input").val(''); 	
  	   	});
	   
  	    setTimeout(function(){ 
			$(".search-mobile-input input").focus();
		}, 200);
  	});

    // close mobile search
    $(".search-mobile-close").on("click touchstart",function(e) {
		e.preventDefault();
		$('.dropdown-search-mobile-results,.search-mobile-close').hide();
		$('input[name="q"]').val("");
		
		if($('#qm-md').text().trim().length === 0) {
			$('.dropdown-search-mobile').hide();
		}
   	});    

    // demo search mobile
    $('.search-mobile-input input').click( function() {
		$('.search-mobile-close').show();
    });
    //footer region selector ada changes 
	$('.region-selector-container .list-item').keyup(function(event){
	if(event.keyCode===13){
	    if($(this).find('a').length>0){
		window.open($(this).find('a').attr("href"),"_blank");
	}
	    
	}
	
	})
    
}
/**
 * @private
 * @function
 * @description Adds class ('js') to html for css targeting and loads js specific styles.
 */
function initializeDom() {
    // add class to html for css targeting
    $('html').addClass('js');
    if (SitePreferences.LISTING_INFINITE_SCROLL) {
        $('html').addClass('infinite-scroll');
    }
    // load js specific styles
    util.limitCharacters();
}

var pages = {
    account: require('./pages/account'),
    cart: require('./pages/cart'),
    checkout: require('./pages/checkout'),
    compare: require('./pages/compare'),
    product: require('./pages/product'),
    registry: require('./pages/registry'),
    search: require('./pages/search'),
    storefront: require('./pages/storefront'),
    wishlist: require('./pages/wishlist'),
    storelocator: require('./pages/storelocator'),
    blog: require('./pages/blog'),
    cms: require('./pages/cms'),
    recommendation: require('./pages/recommendation')
};

var app = {
    init: function () {
        if (document.cookie.length === 0) {
            $('<div/>').addClass('browser-compatibility-alert').append($('<p/>').addClass('browser-error').html(Resources.COOKIES_DISABLED)).appendTo('#browser-check');
        }
        initializeDom();
        initializeEvents();

        // init specific global components
        countries.init();
        tooltip.init();
       // minicart.init();
        validator.init();
        rating.init();
        //searchplaceholder.init();
//        if (window.google && window.google.maps) {
//        	gmautocomplete.init();
//        }
        
        //Initialize Custom Functions
        advisor.init();
        SOR.init();
        GiftWrap.init();
        Profile.init();
        CartPage.init();
        Checkout.init();
		login.init();
		commonutil.init();
        
        //Tooltip Initialize
        $('[data-toggle="tooltip"]').tooltip();

        // execute page specific initializations
        $.extend(page, window.pageContext);
        var ns = page.ns;
        if (ns && pages[ns] && pages[ns].init) {
            pages[ns].init();
        }

        // Check TLS status if indicated by site preference
        if (SitePreferences.CHECK_TLS === true) {
            tls.getUserAgent();
        }
        
        window.sgDialog = require('./dialog');
    }
};

//Advisor Events
var advisor = {
	init: function(){
		//Advisor events
	}
};

//Smart Order Refill Functions
var SOR = {
	init: function() {
		$('.select-everydelivery').each(function(){
			var delType = $(this).val();
			$(this).parents('.bag-item-auto-delivery').find('.'+delType+'-select').show();
		});
		
		$('.multipleRefillSor').on('click', function(){
			var row = $(this).parents('.bag-item-auto-delivery');
			var checked = $(this).is(":checked");
			var weekInterval = row.find('select[name="dwfrm_smartorderrefill_SorWeekInterval"]').val();
			var interval = row.find('select[name="dwfrm_smartorderrefill_SorMonthInterval"]').val();

			if(weekInterval || interval) {
				if(checked) {
					row.find('.frequency-options').show();
					SOR.submitForm(row);
				} else {
					row.find('.frequency-options').hide();
					SOR.removeRefill(row);
				}
			}
		});
		$('.multipleRefill').on('click', function(){
			var row = $(this).parents('.bag-item-auto-delivery');
			var checked = $(this).is(":checked");
			var weekInterval = row.find('select[name="dwfrm_smartorderrefill_OsfSorSmartOrderRefillWeekInterval"]').val();
			var interval = row.find('select[name="dwfrm_smartorderrefill_OsfSorSmartOrderRefillInterval"]').val();

			if(weekInterval || interval) {
				if(checked) {
					row.find('.frequency-options').show();
					progress.showFull();
					var liuuid = row.find('input[name="liuuid"]').val();
					var hasRefill = row.find('input[name="dwfrm_smartorderrefill_hasOsfSmartOrderRefill"]').is(":checked") ? true : false;
					var everyDelivery = row.find('[name="everyDelivery"]').val();
					var weekInterval = row.find('select[name="dwfrm_smartorderrefill_OsfSorSmartOrderRefillWeekInterval"]').val();
					var interval = row.find('select[name="dwfrm_smartorderrefill_OsfSorSmartOrderRefillInterval"]').val();
					var form = $('#dwfrm_smartorderrefill');
					form.find('input[name="liuuid"]').val(liuuid);
					form.find('input[name="dwfrm_smartorderrefill_hasOsfSmartOrderRefill"]').val(hasRefill);
					form.find('input[name="everyDelivery"]').val(everyDelivery);
					form.find('input[name="dwfrm_smartorderrefill_OsfSorSmartOrderRefillWeekInterval"]').val(weekInterval);
					form.find('input[name="dwfrm_smartorderrefill_OsfSorSmartOrderRefillInterval"]').val(interval);
					form.find('button[name="dwfrm_smartorderrefill_update"]').trigger('click');
				} else {
					row.find('.frequency-options').hide();
					SOR.removeRefill(row);
				}
			}
		});
		
		$('.select-everydelivery').on('change', function () {
			var row = $(this).parents('.bag-item-auto-delivery');
			var value = $(this).val();
			row.find('.input-select').hide();
			row.find('.'+value+'-select').show();
	    });
		
		$('.input-select.inputOsf-select').on('change', function(){
			if($(this).val()) {
				var row = $(this).parents('.bag-item-auto-delivery');
				var weekInterval = row.find('select[name="dwfrm_smartorderrefill_OsfSorSmartOrderRefillWeekInterval"]').val();
				var interval = row.find('select[name="dwfrm_smartorderrefill_OsfSorSmartOrderRefillInterval"]').val();
				if((weekInterval || interval) && row.find('.multipleRefill').is(':checked')) {
					var prodId = row.find('.multipleRefill').attr('data-pid');
					//GMT change to track AD interval change 
					try{
			    	    if (!window.dataLayer) {
			    	      window.dataLayer = [];
			    	    }
			    	    var adinterval = row.find('.frequency-options .month-select option:selected').text().trim();
			    	    dataLayer.push({
			    	        "event": "tatcha_adfrequency_update",
			    	        "adfrequency": adinterval,
			    	        'prodID': prodId
			    	    }); 
			    	  } catch (e) {}
					
					progress.showFull();
					var liuuid = row.find('input[name="liuuid"]').val();
					var hasRefill = row.find('input[name="dwfrm_smartorderrefill_hasOsfSmartOrderRefill"]').is(":checked") ? true : false;
					var everyDelivery = row.find('[name="everyDelivery"]').val();
					var weekInterval = row.find('select[name="dwfrm_smartorderrefill_OsfSorSmartOrderRefillWeekInterval"]').val();
					var interval = row.find('select[name="dwfrm_smartorderrefill_OsfSorSmartOrderRefillInterval"]').val();
					var form = $('#dwfrm_smartorderrefill');
					form.find('input[name="liuuid"]').val(liuuid);
					form.find('input[name="dwfrm_smartorderrefill_hasOsfSmartOrderRefill"]').val(hasRefill);
					form.find('input[name="everyDelivery"]').val(everyDelivery);
					form.find('input[name="dwfrm_smartorderrefill_OsfSorSmartOrderRefillWeekInterval"]').val(weekInterval);
					form.find('input[name="dwfrm_smartorderrefill_OsfSorSmartOrderRefillInterval"]').val(interval);
					form.find('button[name="dwfrm_smartorderrefill_update"]').trigger('click');
				}
			}
		});
		$('.input-select.inputSor-select').on('change', function(){
			if($(this).val()) {
				var row = $(this).parents('.bag-item-auto-delivery');
				var weekInterval = row.find('select[name="dwfrm_smartorderrefill_OsfSorSmartOrderRefillWeekInterval"]').val();
				var interval = row.find('select[name="dwfrm_smartorderrefill_SorMonthInterval"]').val();
				if((weekInterval || interval) && row.find('.multipleRefillSor').is(':checked')) {
					var prodId = row.find('.multipleRefillSor').attr('data-pid');
					//GMT change to track AD interval change 
					try{
			    	    if (!window.dataLayer) {
			    	      window.dataLayer = [];
			    	    }
			    	    var adinterval = row.find('.frequency-options .month-select option:selected').text().trim();
			    	    dataLayer.push({
			    	        "event": "tatcha_adfrequency_update",
			    	        "adfrequency": adinterval,
			    	        'prodID': prodId
			    	    }); 
			    	  } catch (e) {}
					
					SOR.submitForm(row);
				}
			}
		});
		
		
		$(document).on('click', 'input[name="dwfrm_changeaddress_selectedAddress"]', function(){
			$('.radio-changeaddress').removeClass('selected');
			$(this).parents('.radio-changeaddress').addClass('selected');
		});
	},
	submitForm: function(row) {
		progress.showFull();
		var liuuid = row.find('input[name="liuuid"]').val();
		var hasRefill = row.find('input[name="dwfrm_smartorderrefill_hasSmartOrderRefill"]').is(":checked") ? true : false;
		var everyDelivery = row.find('[name="everyDelivery"]').val();
		var weekInterval = row.find('select[name="dwfrm_smartorderrefill_OsfSorSmartOrderRefillWeekInterval"]').val();
		var interval = row.find('select[name="dwfrm_smartorderrefill_SorMonthInterval"]').val();
		var form = $('#dwfrm_smartorderrefill');
		form.find('input[name="liuuid"]').val(liuuid);
		form.find('input[name="dwfrm_smartorderrefill_hasSmartOrderRefill"]').val(hasRefill);
		form.find('input[name="everyDelivery"]').val(everyDelivery);
		form.find('input[name="dwfrm_smartorderrefill_OsfSorSmartOrderRefillWeekInterval"]').val(weekInterval);
		form.find('input[name="dwfrm_smartorderrefill_SorMonthInterval"]').val(interval);
		form.find('button[name="dwfrm_smartorderrefill_update"]').trigger('click');
	},
	removeRefill: function(row) {
		progress.showFull();
		row.find('.osf-remove-link')[0].click();
	}
};

//GiftWrap
var GiftWrap = {
	init: function() {
		
		$('#hasGiftMessage').on('click', function(){
			var isChecked = $(this).is(':checked');
			if(isChecked){
				$('#gift-message-form').show();
			} else {
				$('#gift-message-form').hide();
			}
		});
	}
};

//Profile Page JS functions
var Profile = {
	init: function() {
		//My account form switch
	    $('.account-switch-section').on('click', function(){
	    	var name = $(this).attr('data-section');
	    	if(name) {
	    		$('.account-step').hide();
	    		$('.account-step-'+name).show();
	    		if(name == 'summary') {
	    			$(this).parents('.card').find('form')[0].reset();
	    			$(this).parents('.card').find('form .has-error').removeClass('has-error');
	    			$(this).parents('.card').find('.alert.alert-danger').remove();
	    			$(this).parents('.card').find('form span.help-block').html('');
	    			if($(this).parents('.card').find('form').attr('id') == 'ChangePassowrdForm') {
	    				$(this).parents('.card').find('form input').val('');
	    			}
	    			if($(this).parents('.card').find('form').attr('id') == 'EmailForm') {
	    				var defVal = $(this).parents('.card').find('form #dwfrm_profile_customer_email').attr('data-default-value');
	    				$(this).parents('.card').find('form #dwfrm_profile_customer_email').val(defVal);
	    				$(this).parents('.card').find('form #dwfrm_profile_customer_emailconfirm').val('');
	    			}
	    		}
	    	}
	    });
	    
	    //My Account DOB select boxes
	    var previousDOB = $('#dwfrm_profile_customer_birthday').val();
	    $('.dobselect').on('blur', function(){
	    	var day = $('.dobselect.dob-day').val();    	
	    	var month = $('.dobselect.dob-month').val();
	    	var year = $('.dobselect.dob-year').val();
	    	
	    	var dob = "";
	    	if(day || month || year) {
	    		day = day ? day : '00';
	    		month = month ? month : '00';
	        	year = year ? year : 1900;
	        	dob = month + '/' + day + '/' + year;
	    	}
	    	$('#dwfrm_profile_customer_birthday').val(dob);
	    	$('#dwfrm_profile_customer_birthday').trigger('blur');
	    });
	    
	    //Show Confirm Popup before saving DOB
	    $('#save-profile').on('click', function() {
	    	var newDOB = $('#dwfrm_profile_customer_birthday').val();
	    	var isValid = $("#ProfileForm").valid();
	    	if(isValid) {
	    		if(previousDOB != newDOB && $('.dobselect.dob-year').val() != '') {
	    			$('#modal-birthday').find('#selectedDOBvalue').html(newDOB.replace('/1900', ''));
	        		$('#modal-birthday').modal('show');
	        	} else {
	        		$('#dwfrm_profile_confirm').trigger('click');
	        	}
	    	}
	    });
	    $('#confirmDOBsave').on('click', function(){
	    	$('#dwfrm_profile_confirm').trigger('click');
	    });
	    
	    //Update error message
	    $('#bday-field').bind('DOMSubtreeModified', function() {
	    	var error = $('#bday-field #dwfrm_profile_customer_birthday-error').clone();
	    	$('#bday-error').html('').append(error);
	    	$('#bday-error .help-block').show();
	    });
	}
};

var CartPage = {
	init: function() {
		//Cart page update cart event
	    $('#cart-items-form .qty-field').on('change', function(){
	    	$('button[name="dwfrm_cart_updateCart"]').trigger('click');
	    });
	    
	    $('#cart-items-form .qty-field-mob').on('change', function(){
	    	var prdQty = $(this).children("option:selected").val();
	    	var prdId = $(this).attr('data-pid');
	    	$('.prd-qty').val(prdQty);
	    	$('.prd-id').val(prdId);
	    	$('button[name="dwfrm_cart_updateCart"]').trigger('click');
	    });


		$('.sor-icon-link').on('click', function(e){
			e.preventDefault();
		})
		
		$('#sorModal').on('shown.bs.modal', function (e) {
		  $('#sorModal .modal-content').attr('aria-hidden',false);
		})

		$('#sorModal').on('hidden.bs.modal', function (e) {
		  $('#sorModal .modal-content').attr('aria-hidden',true);
		})
		
		$('#autoDeliveryModal').on('shown.bs.modal', function () {
			$('#autoDeliveryModal .modal-content').attr('aria-hidden',true);
			$('#autoDeliveryModal .close').focus();	 
		});
	
		$('#autoDeliveryModal').on('hidden.bs.modal', function () {
			  $('#autoDeliveryModal .modal-content').attr('aria-hidden',false);
		})
		
	    
	    //Samples Modal
	    $('.bonusModalLink').on('click', function(ev){
	    	ev.preventDefault();
	    	var target = $(this).attr("href");
	    	
	        // load the url and show modal on success
	        $("#bonusModal .modal-content").load(target, function() {
	             $("#bonusModal").modal("show"); 
	        });
	    })

	    //GWP Modal
	    $('.gwpModalLink').on('click', function(ev){
	    	ev.preventDefault();
	    	var target = $(this).attr("href");
	    	
	        // load the url and show modal on success
	        $("#gwpbonusModal .modal-content").load(target, function() {
	             $("#gwpbonusModal").modal("show"); 
	        });
	    })
	}
};

var Checkout = {
	init: function() {
		$(document).on('click', '.radio-ship-option .input-radio', function(){
			$('.radio-ship-option').removeClass('selected');
			$(this).parents('.radio-ship-option').addClass('selected');
		});
		$('#select-payment-paypal').on('click', function(){
			$('.braintree-radio-box').removeClass('selected');
			$('input[name="dwfrm_billing_paymentMethods_selectedPaymentMethodID"]').prop('checked', false);
			$('#is-PayPal').prop('checked', true);
			$('#save-payment').trigger('click');
		});
		$('#braintreeCreditCardFieldsContainer').on('click', function(){
			$('#is-CREDIT_CARD').prop('checked', true);
		});
		$('.braintreeradios').on('click', function(){
			$('input[name="dwfrm_billing_paymentMethods_selectedPaymentMethodID"]').prop('checked', false);
			$('#is-CREDIT_CARD').prop('checked', true);
			$('#braintreeCreditCardList').val($(this).val());
			$('.braintree-radio-box').removeClass('selected');
			$(this).parents('.braintree-radio-box').addClass('selected');
			var event = new Event('change');
			var element = document.getElementById("braintreeCreditCardList");
			element.dispatchEvent(event);
		});
		$('.braintree-addcard').on('click', function() {
			$('.braintree-radio-box').removeClass('selected');
			$('#braintreeCreditCardList').val('newcard');
			var event = new Event('change');
			var element = document.getElementById("braintreeCreditCardList");
			element.dispatchEvent(event);
			$('#addCardModal').modal('show');
		});
		$('.create-account').on('click', function(){
			if($(this).is(':checked')) {
				$(this).parents('.create-account-secton').find('.create-account-password').show();
				$(this).parents('.create-account-secton').find('.create-account-password input').addClass('required');
			} else {
				$(this).parents('.create-account-secton').find('.create-account-password').hide();
				$(this).parents('.create-account-secton').find('.create-account-password input').removeClass('required');
			}
		});
		//Samples Modal
		$('.bonusModalLinkCheckout').on('click', function(ev){
		  ev.preventDefault();
		  alert('test');
		  var target = $(this).attr("href");
		  
		    // load the url and show modal on success
		    $("#bonusModal .modal-content").load(target, function() {
		         $("#bonusModal").modal("show"); 
		    });
		});
	}
};

// general extension functions
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

function getUrlParam(name) {
	var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
	if(results) {
		return results[1] || 0;
	}
	return false;
}

// initialize app
$(document).ready(function () {	
	var homeImages = document.querySelectorAll('.lazyImage');	
	window.lazyLoad(homeImages, {
	     root: null,
	     rootMargin: "0px",
	     threshold: .25
	});
	
	$('#autoDeliveryModal').on('shown.bs.modal', function () {
		$('#autoDeliveryModal .close').focus();
	});
	
	/*
	 * If promo code is entered, scroll to the promo section once the page is loaded.
	 * */
	if($('#promoTried').length > 0 && $('#promoTried').val() === 'true') {
		let promoWrapOffsetTop = $('.checkout-promo-code').length > 0 ? $('.checkout-promo-code').offset().top : 0;
		$("body, html").animate({
			scrollTop: promoWrapOffsetTop - 150
		}, 1000 );
	}
	
    app.init();
    
//    if($('#chat-app-config').length > 0 && $('#chat-app-config').data('provider') == 'livechat') {
//    	livechat.init();
//    }
    
    function getCookie(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for(var i=0;i < ca.length;i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1,c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
        }
        return null;
    }
    
    function setCookie(cname, cvalue, exdays) {
	  var d = new Date();
	  d.setTime(d.getTime() + (exdays*24*60*60*1000));
	  var expires = "expires="+ d.toUTCString();
	  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/; secure";
	}
    
    var cookiePopup = getCookie('dw_cookies_footer_msg');
    if(!cookiePopup) {
    	$('.footer-cookie-container').css('display','block');
    }
    
    
   //Mecca modal will be shown for NZ and AUS users based on IP address
    if($('#meccaModal').length){
    	$('#meccaModal').modal();
    } 	
    
    
    var notHolidayPage = (window.location.href.indexOf('holiday') === -1) ? true : false;
    if($('#newsletterModal').length && notHolidayPage){
    	var time = $('.newletterDisplay').data('val');
    	if(time == '' || time == 'undefined'){
    		time =0;
    	}
    	setTimeout(openNewsLetterModal, time)
    }
    
    function openNewsLetterModal() {
    	$('#newsletterModal').modal();
    }
    
    //Close Header Promo Banner
    $('.close-promo-banner').on('click', function() {
		ajax.load({
		    url: Urls.closeBanner,
		    callback: function (response) {
		        $('.tatcha-promo-banner').hide();
		    }.bind(this)
		});
    });
    
    //FB Button Trigger Click
    $('.fb-loginbtn').on('click', function() {
    	$('#dwfrm_oauthlogin .btn-facebook').trigger('click');
    	$('.loader-preventive').show();
    });
    
    //Logout Click
    $('#logout-btn').click(function(event){
       	$('.loader-preventive').show();
    });
    
    //Reset estimate form on close
    $('#close-estimate').on('click', function() {
    	$('#dwfrm_singleshipping_shippingAddress').trigger('reset');
    	$('#estimateModal').modal('hide');
    });
    
    //Reset giftmsg
    $('.close-giftmsg').on('click', function() {
    	//$('#giftmsg-form').trigger('reset');
    	$('#giftmsg-form textarea').val($('#giftmsg-form textarea').attr('value'));
    	$('#giftMessageModal').modal('hide');
    	 $('.special-character-validation').hide();
    	 $('.form-group').removeClass('has-error'); 
	 $( ".help-block" ).remove();
   }); 
    //gift wrap validation message 
    
    $('.gift-message-save').on('click', function(e) {
	var form  = $('#giftmsg-form');
	var giftMessage = form.find('textarea').val();
	if(giftMessage.includes("<script")) {
	    $('.special-character-validation').show();
	    $('.form-group').addClass('has-error'); 
	    e.preventDefault();
	}else{
	 $('.special-character-validation').hide();
	 $('.form-group').removeClass('has-error'); 
	 $(this).submit();
	}  
   });   
   
    //Reset Add address popup in shipping page    
    $('.close-addaddress').on('click', function() {
    	$('#edit-address-form').trigger('reset');
    	$('#edit-address-form').find('[name$="_address_country"]').trigger('change');
    	$('#edit-address-form').find('.has-error').removeClass('has-error');
    	$('span.help-block').css('display','none');
    	$('#addAddressModal').modal('hide');
    	
    });
    
    $(document).on('hide.bs.modal','#addAddressModal',function(){
    	$('#edit-address-form').trigger('reset');
    	$('#edit-address-form').find('[name$="_address_country"]').trigger('change');
    	$('#edit-address-form').find('.has-error').removeClass('has-error');
    	$('span.help-block').css('display','none');
    	$(".show-shipping-error .error-block").hide();
    })
    
    if($('input[name="dwfrm_billing_billingAddress_createaccount"]').is(':checked')) {
    	$('.create-account-password').find('input').addClass('required');
    } else {
    	$('.create-account-password').find('input').removeClass('required');
    }
    
	
    $("#meccaModal").on("hidden.bs.modal", function () {
        var now = new Date();
        now.setTime(now.getTime() + 120 * 60 * 1000);
        if (document.cookie.indexOf('dw_cookies_meccapopup') < 0) {
        	document.cookie = "dw_cookies_meccapopup=1; expires=" + now.toUTCString() + "; path=/";
        }   	
    });
    
    //Footer Cookie Message
    $('.cookie-warning-close').on('click', function(){
    	var now = new Date();
        now.setTime(now.getTime() + (730 * 24 * 60 * 60 * 1000));
        if (document.cookie.indexOf('dw_cookies_footer_msg') < 0) {
        	document.cookie = "dw_cookies_footer_msg=1; expires=" + now.toUTCString() + "; path=/;secure";
        }
    });
    
    //Footer Ajax Newsletter Form
    /*$('.ajaxsubscribeForm').on('submit', function(e){
    	e.preventDefault();
    	var form = $(this);
    	if(form.valid()) {
    		$('.loader-preventive').show();
    		ajax.post({
                url: form.attr('action'),
                data: form.serialize(),
                callback: function (response) {
                	if(response) {
                		response = JSON.parse(response);
                        if(response.status == 'success') {
                        	var email = $('.ajaxsubscribeForm').find('input[name="dwfrm_subscribe_email"]').val();
                            if (SitePreferences.MPARTICLE_ENABLED) {
                        		var identifyData = {};
                        		identifyData.email = email;
                        		setTimeout(function(){ window.mParticleIdentify(identifyData, true); }, 1000);
                            }
                        	$('.ajaxsubscribeForm').find('input[name="dwfrm_subscribe_email"]').val("");
							$('#newsletterModal').modal('hide');
							//$('#subscribeFotter').modal('show');
							$(".newly-subscribed").removeClass('d-none');
							$(".ajaxsubscribeForm").hide();
                    		$('.loader-preventive').hide();
                        } else if(response.status == 'alreadyconfirmed') {
                        	$('.ajaxsubscribeForm').find('input[name="dwfrm_subscribe_email"]').val("");
							$('#newsletterModal').modal('hide');
							$(".already-subscribed").removeClass('d-none');
							$(".ajaxsubscribeForm").hide();
							//$('#alreadySubscribedModal').modal('show');
                    		$('.loader-preventive').hide();
						}
						var nwsltrCookie = getCookie('dw_cookies_nwsltr_subcribed');
						if(!nwsltrCookie) {
							setCookie('dw_cookies_nwsltr_subcribed', '1', '720');
						}
                	} else {
                		$('.ajaxsubscribeForm').find('input[name="dwfrm_subscribe_email"]').val("");
                		$('#newsletterModal').modal('hide');
                		$('.loader-preventive').hide();
                	}           
                }.bind(this)
            });
    	}    	
    });*/
	
	function addWishlist(e) {
		if(e){
			e.preventDefault();
		}
		var url = $(this).data('url');
		var container = $(this).parents('.wishlist-btn-container');
		var pid = $(this).data('pid');	
    	$('.loader-preventive').show();
    	$.getJSON(url, function (data) {
    		if (data && data.success === true) {
				$('#wishlist-action-sr-'+pid).text('product added to wishlist');
    			container.find('.wishlist-additem').hide();
				container.find('.wishlist-removeitem').show();
				//Update ritual page items				
				var ritualContainer = $('.rec-prd-list-item[data-id="'+pid+'"]');
				if(ritualContainer.length) {
					ritualContainer.find('.wishlist-additem').hide();
					ritualContainer.find('.wishlist-removeitem').show();
				}
    			$('.loader-preventive').hide();
    		}
    	});
	}
    
    $(document).on('click', '.wishlist-additem', addWishlist);
	$(document).on('keyup', '.wishlist-additem', function(event) {
		if(event.keyCode === 13) {
			event.preventDefault();
			addWishlist();
		}
	});

	function removeWishlist(e) {
		if(e){
			e.preventDefault();
		}
		var url = $(this).data('url');
		var container = $(this).parents('.wishlist-btn-container');
		var pid = $(this).data('pid');
    	$('.loader-preventive').show();
    	$.getJSON(url, function (data) {
    		if (data && data.success === true) {
				$('#wishlist-action-sr-'+pid).text('product removed from wishlist');
    			container.find('.wishlist-removeitem').hide();
				container.find('.wishlist-additem').show();
				//Update ritual page items				
				var ritualContainer = $('.rec-prd-list-item[data-id="'+pid+'"]');
				if(ritualContainer.length) {
					ritualContainer.find('.wishlist-removeitem').hide();
					ritualContainer.find('.wishlist-additem').show();
				}
    			$('.loader-preventive').hide();
    		}
    	});
	}
	
	$(document).on('click', '.wishlist-removeitem', removeWishlist);
    $(document).on('keyup', '.wishlist-removeitem', function(event) {
		if(event.keyCode === 13) {
			event.preventDefault();
			removeWishlist();
		}
	});
    
    //Home screen section
    
    /**
	 * Gets the browser name or returns an empty string if unknown. This
	 * function also caches the result to provide for any future calls this
	 * function has.
	 * 
	 * @returns {string}
	 */
    var getDeviceBrowser = function() {
    	var isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    	var isSafari = /Safari/.test(navigator.userAgent);

    	if (isChrome) 
    		return "Chrome";
    	if (isSafari)
    		return "Safari";
    	else
    		return "unknown";
    	};
 
    
    /**
	 * Gets the device name or returns an unknown string if unknown.
	 * 
	 * @returns {string}
	 */
	function getMobileOperatingSystem() {
	  var userAgent = navigator.userAgent || navigator.vendor || window.opera;
	    
	    if (/windows phone/i.test(userAgent)) {
	    	return "windows"
	    }

	    if (/android/i.test(userAgent)) {
	        return "android";
	    }

	    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
	        return "ios";
	    }

	    return "unknown";
	}
	
    var cookieHomescreen = getCookie('dw_cookies_home_screen');
    if(!cookieHomescreen) {
    	setCookie('dw_cookies_home_screen', '1', '720');
    } else {
    	if(parseInt(cookieHomescreen)==1) {
    		var is_iPad = navigator.userAgent.match(/iPad/i) != null;
    	    var deviceName=getMobileOperatingSystem();
    	    var deviceBrwoser=getDeviceBrowser();
    	    
    	    if(is_iPad) {
    	    	 $(".homescreen-banner").hide();
    	    }
    	    if((deviceName=='android' && deviceBrwoser=='Chrome') || (deviceName=='ios' && deviceBrwoser =='Safari')){
    	    	 $(".homescreen-banner").show();
    	    }else{
    	    	 $(".homescreen-banner").hide();
    	    }
    	}
    	setCookie('dw_cookies_home_screen', parseInt(cookieHomescreen)+1, '720');
    }
	
	 $(document).on('click', '.homescreen-banner', function(){
    	
    	var deviceName=getMobileOperatingSystem();
    	var deviceBrwoser=getDeviceBrowser();
    	
    	if(deviceName =='android' && deviceBrwoser =='Chrome'){
    		  $(".homescreen-android").show();
    		  $(".homescreen-ios").hide();
    	}
    	else if (deviceName =='ios'&& deviceBrwoser =='Safari'){
    		  $(".homescreen-ios").show();
    		  $(".homescreen-android").hide();
    	}
    	else{
    		  $(".homescreen-ios").show();
    		  $(".homescreen-android").hide();
    	}
    	
    });
    
 // dismiss add to homescreen
 $('.dismiss-homescreen-banner').click( function() {
   $('.homescreen-banner').hide();
 });
  
    
	//End homescreen section
    
    //AD Ajax Form
    $('.edit_product').each(function(){
    	var $form = $(this);
    	$form.on('submit', function(e){
        	e.preventDefault();
        	$('.loader-preventive').show();
        	ajax.post({
        		url: $form.attr('action'),
        		data: $form.serialize(),
        		callback: function(response) {
        			if(response) {
                		var res = JSON.parse(response);
	        			var container = $('#subscription-'+res.plid);
	        			var nxtdel = new Date(res.nxtdel);
	        			var short = ('0'+(nxtdel.getMonth() + 1)).slice(-2) + '/' + ('0'+nxtdel.getDate()).slice(-2) + '/' + nxtdel.getFullYear().toString().slice(-2);
	        			container.find('.next-shipment-date').html(short);
	        			container.find('input[name="nxtDate"]').val(short);
	        			container.find('input[name="sorMonth"]').html(res.frequency);
	        			container.find('.order-subtotal-value').html(res.subTotal);
	        			container.find('.order-discount-value').html(res.discount);
	        			container.find('.order-total-value').html(res.orderTotal);
	        			container.find('.skip-btn').attr('disabled', 'disabled');
	        			
	        			var modal =  $('#skipModal-'+res.plid);
	        			var seconddel = new Date(res.seconddel);
	        			seconddel = ('0'+(seconddel.getMonth() + 1)).slice(-2) + '/' + ('0'+seconddel.getDate()).slice(-2) + '/' + seconddel.getFullYear();
	        			modal.find('.second-del-date').html(seconddel);
        			}
        			$('.loader-preventive').hide();
        		}
        	});
        });
    });
    
    //AD Skip Shipment
    $('.skip-shipment-btn').on('click', function(e){
    	e.preventDefault();
    	$(this).parents('.modal').modal("hide");
    	$('.loader-preventive').show();
    	var url = $(this).attr('data-url');
    	$.getJSON(url, function (res) {
    		if (res && res.success === true) {
    			var container = $('#subscription-'+res.plid);
    			var nxtdel = new Date(res.nxtdel);
    			var short = ('0'+(nxtdel.getMonth() + 1)).slice(-2) + '/' + ('0'+nxtdel.getDate()).slice(-2) + '/' + nxtdel.getFullYear().toString().slice(-2);
    			container.find('.next-shipment-date').html(short);
    			container.find('input[name="nxtDate"]').val(short);
    			
    			var modal =  $('#skipModal-'+res.plid);
    			var seconddel = new Date(res.seconddel);
    			seconddel = ('0'+(seconddel.getMonth() + 1)).slice(-2) + '/' + ('0'+seconddel.getDate()).slice(-2) + '/' + seconddel.getFullYear();
    			modal.find('.second-del-date').html(seconddel);
    			modal.find('.skip-shipment-btn').attr('data-url', res.skipUrl);
    		}
    		$('.loader-preventive').hide();
    	});
    });
    
    //Trigger OnLoad Event from URL
    var reqEvent = getUrlParam('triggerEvent');
    if(reqEvent) {
    	switch(reqEvent) {
    		case 'sampleItems' :
    			$('#bonusModalLink').trigger('click');
    			break;
    		case 'selectAddress' :
    			var id = getUrlParam('id');
    			$('.address-radio#'+id).trigger('click');
    			$('.same-as-shipping').trigger('click');
    			break;
    		case 'selectCard' :
    			var id = getUrlParam('id');
    			$('.braintree-radio-box #'+id).trigger('click');
    			break;
			case 'focus' :
				var id = getUrlParam('id');
				if($('div[data-itemid="'+id+'"]:visible').length) {
					var top = $('div[data-itemid="'+id+'"]:visible').offset().top;
					top = top - 100;
					if(window.location.href.indexOf("/giftfinder") > -1 ){
						$(".results-wrapper").animate({ scrollTop: top }, 600);
					}else {
						$("html, body").animate({ scrollTop: top }, 600);
					}
					
				}
				break;
    	}
    }
    
    //contact us open Zendesk chat or live chat based on custom preference settings

    $('#helpqueryzendesk').keypress(function(event){
    	  var keycode = (event.keyCode ? event.keyCode : event.which);   	   
    	  if(keycode == '13'){
    	     var query = $('#helpqueryzendesk').val();
    	     if(typeof query !== 'undefined' &&  query){
    	    	 window.open("https://help.tatcha.com/hc/en-us/search?utf8=%E2%9C%93&query="+query, "_blank");
    	     }
    	  }
    }); 

    $('.helpdesksearchicon').click(function() {
	     var query = $('#helpqueryzendesk').val();
	     if(typeof query !== 'undefined' &&  query){
	    	 window.open("https://help.tatcha.com/hc/en-us/search?utf8=%E2%9C%93&query="+query, "_blank");
	     }
	     
    });   
    
    $(document).on('click', '.footer-contact-us', function(){
    	if($('.livechat-open').length) {
    		$('.livechat-open').trigger('click');
    	}
	});
    
    $('.footer-contact-us').keydown(function(event) {
    	if (event.keyCode == 32 || event.keyCode == 13) {
    		$('.footer-contact-us').trigger('click');
			$('#webWidget').focus();								
    	}
    });
	
	$(document).on('submit', '#comingsoon-form', function(e){
    	e.preventDefault();
		var form = $(this);
		validator.init();
		form.find('.has-error').removeClass('has-error');
    	if(form.valid()) {
            form[0].submit();
		}
		form.find('.form-group').addClass('has-error');
        return false;
    });
    
    $(document).on('submit', '#notify-me-form', function(e){
    	e.preventDefault();
		var form = $(this);
		validator.init();
		form.find('.has-error').removeClass('has-error');
    	if(form.valid()) {
    		form[0].submit();
		}
		form.find('.form-group').addClass('has-error');
        return false;
	});	
    
    //  $('.nav-shop-all.nav-desktop').click(function() {
    // 	  window.location = $(this).attr('href'); 
    // 	  return false;
    //   });

	//   $('.nav-shop-all.nav-desktop, .nav-gifts.nav-desktop').on("keyup", function(event){
	// 	if (event.keyCode == 32){
	// 		$(this).parent().addClass('active');
	// 		$(this).siblings(".dropdown-menu").addClass('active-hover');
	// 	}
	// 	else if (event.keyCode == 27){
	// 		$(this).parent().removeClass('active');
	// 		$(this).siblings(".dropdown-menu").removeClass('active-hover');
	// 	}
	// });
	
	// function activeDisabled(ele){
	// 	$(ele).parent().removeClass('active').siblings("li").removeClass('active').find('.active-hover').removeClass('active-hover');
	// 	$(ele).siblings('.active-hover').removeClass('active-hover');
	// }
	
	$('.nav-desktop-container a').on("keyup",function(e){
		if(e.keyCode == 27){
			$(e.currentTarget).parents('.nav-desktop-container.active-hover').removeClass('active-hover')
			.parents('.nav-shop-all.nav-desktop, .nav-gifts.nav-desktop').removeClass('active')
			.siblings().removeClass('active').find('.active-hover').removeClass('active-hover');
		}
	})
	
	// $('.nav-shop-all.nav-desktop, .nav-gifts.nav-desktop').on("focus", (e)=>activeDisabled(e.currentTarget));
	
	// $('.navbar-brand').on("focus",function(){
	// 	$(".navbar-nav.nav-desktop").find('.active, .active-hover').removeClass('active').removeClass('active-hover')
	//   });
    
    // $('.nav-gifts.nav-desktop').click(function() {
  	//   window.location = $(this).attr('href'); 
  	//   return false;
    // });

  
    $(document).on('focus', '#addCreditCardForm #braintreeCardOwner', function(event){ 
    	$(this).attr('required' , true);
    });
    
    $(document).on('focus', '#addCreditCardForm #dwfrm_billing_billingAddress_addressFields_city', function(event){ 
    	$(this).attr({
    		'data-msg-required' : "Please enter the full city name.",
    		'data-msg-minlength' : "Please enter the full city name."
    	});
    });
    
    $(document).on('blur', '#addCreditCardForm #dwfrm_billing_billingAddress_addressFields_postal , #addCreditCardForm #dwfrm_billing_billingAddress_addressFields_states_state' , function(event){ 
    	if($('#dwfrm_billing_billingAddress_addressFields_postal-error').is(":Visible") || $('#dwfrm_billing_billingAddress_addressFields_states_state-error').is(":Visible")){
        	$(this).closest('.row').css("margin-bottom" , "15px");
    	}else{
    		$(this).closest('.row').css("margin-bottom" , "");
    	}
    });
    
    $('.credit-card-save').click(function(e) {
    	e.preventDefault();
    	$('#braintreeCardOwner').attr('required', true);
    	$('#addCreditCardForm #dwfrm_billing_billingAddress_addressFields_city').attr('data-msg-required' , "Please enter the full city name.");
		validator.init();
		var formValidator = $('#addCreditCardForm').validate();
		
		// Check if hosted fields present  
		if(($('#braintreeCardNumber:visible').length > 0) && ($('#braintreeExpirationDate:visible').length > 0) && ($('#braintreeCvv:visible').length > 0)){
							
			if(!$('#braintreeCardNumber').hasClass('braintree-hosted-fields-valid')){					
				$('#braintreeCardNumber').addClass('braintree-hosted-fields-invalid');
				$('#braintreeCardNumber').addClass('is-invalid');
			}
			
			if(!$('#braintreeExpirationDate').hasClass('braintree-hosted-fields-valid')){					
				$('#braintreeExpirationDate').addClass('braintree-hosted-fields-invalid');
				$('#braintreeExpirationDate').addClass('is-invalid');
			}
			
			if(!$('#braintreeCvv').hasClass('braintree-hosted-fields-valid')){					
				$('#braintreeCvv').addClass('braintree-hosted-fields-invalid');
				$('#braintreeCvv').addClass('is-invalid');
			}
			
		}
		
    	if(formValidator.form()) {
    		var urlParams = new URLSearchParams(window.location.search);
    		if(urlParams.get('scope') == 'auto-delivery' && SitePreferences.MPARTICLE_ENABLED){
    			var data = {};
    			data.actionType = 'edit payment';
    			data.pageSource = 'auto delivery page';
    			window.mPartcleLogEvent('Auto-Delivery Action', data, 'Auto-Delivery');
    		}
    		$('#addCreditCardForm').submit();
		}
    	if($('#dwfrm_billing_billingAddress_addressFields_postal-error').is(":Visible") || ($('#dwfrm_billing_billingAddress_addressFields_states_state-error').is(":Visible") && $('input#dwfrm_billing_billingAddress_addressFields_states_state').is(":Visible"))){
    		$('#dwfrm_billing_billingAddress_addressFields_postal-error').closest('.row').css("margin-bottom" , "15px");
    	}else{
    		$('#dwfrm_billing_billingAddress_addressFields_postal-error').closest('.row').css("margin-bottom" , "");
    	}
        return false;
      });
     

    // GTM changes to track Desktop hover event
    $( ".nav-desktop li.dropdown" ).mouseenter(function() {
    	  try{
    	    if (!window.dataLayer) {
    	      window.dataLayer = [];
    	    }
    	    var navText = $.trim($(this).children().first().text());
    	    dataLayer.push({
    	        "event": "tatcha_navigation_hover",
    	        "navText": navText,
    	    }); 
    	  } catch (e) {}
    });
    
    $( ".search-form-list input" ).focusout(function(event) {
    	var parent = $(this).parent();
    	if ($(this).hasClass('nav-link')) {
			$(parent).removeClass("highlightNav");
		}
    });
    
    
    /**
     * change focus of Hamburger menu on focusout, while navigating using keyboard
     * **/
    $('.nav-mini-footer a').focusout(function(e) {
    	$('.close-main-nav').focus();
	})	
    	
	/**
     * Close Hamburger menu on focusout, while navigating using keyboard
     * **/
	$('.minicart').focusin(function(e) {
		
	  if($('.tatcha-navbar .navbar-collapse').hasClass('show')) {
	       $('.tatcha-navbar .navbar-collapse.show').removeClass('show');
	       $('#navigation .main-nav').css('visibility','hidden');
	       $('.nav-mask-4').addClass('d-none');
		   $('#navigation .mobile-account-nav').css('visibility','hidden');
		   $('#navigation .nav-mini-footer').css('visibility','hidden');
	  } else if($('.navbar-collapse').hasClass('in')) {
		   $('.navbar-collapse').removeClass('in');
		   $('#navigation .nav-mobile-footer').css('visibility','hidden');
		   $('#navigation .navbar-nav.nav-mobile').css('visibility','hidden');
		   $('.menu-cross.nav-mobile-section').css('visibility', 'hidden');
	  }
	})
	
	/*
	 * ADA js listeners
	 * 
	 */

	
	$('.flickity-prev-next-button.next').attr('data-toggle','crtooltip');
    $('.flickity-prev-next-button.next').attr('data-placement','bottom');
    //$('.flickity-prev-next-button.next').attr('data-original-title','Next Button');
	$('.flickity-prev-next-button.next').attr('aria-label','Next');
    
    $('.flickity-prev-next-button.previous').attr('data-toggle','crtooltip');
    $('.flickity-prev-next-button.previous').attr('data-placement','bottom');
    //$('.flickity-prev-next-button.previous').attr('data-original-title','Previous Button');
	$('.flickity-prev-next-button.previous').attr('aria-label','Previous');
 
    $('[data-toggle=crtooltip]').tooltip({ trigger: "hover" });

	$('.flickity-prev-next-button.previous').each(function(){
		var fview= $(this).prev('.flickity-viewport');		
		var pbutton = $(this).detach();
		fview.before(pbutton);
	})
	
	/*$('.flickity-prev-next-button.next').removeAttr('aria-label');
	$('.flickity-prev-next-button.previous').removeAttr('aria-label');*/
    
    $(".flickity-prev-next-button svg").click(function(){
    	$('[data-toggle=crtooltip]').tooltip('hide');
    }); 
    
    $('.flickity-page-dots li:visible').each(function(){
    	$(this).attr("tabindex","0");
    });
    
   /**
	*  Flickity - add tabindex="0" to focusable elements inside flickity elements with aria-hidden=false;
	**/
	
	$('.product-detail-container .flickity-slider .carousel-cell').each(function() {
		$(this).removeAttr('aria-hidden')
	});
	
	/**
	 * Yotpo Rating and Review Widget ADA issue work-around.
	 * Currently, in product tile, the review aria-label is setting incorrectly. It has the data of rating instead of reviews.
	 * The below code snippet copies the review text to its aria-label, if any. Instead of the existing rating information. 
     **/ 
	
	 setTimeout(function(){
		if($('.yotpo-bottomline .text-m').length > 0) {
			$('.yotpo-bottomline .text-m').each(function() {
		      var prdReview = $(this).text();
		      $(this).attr('aria-label', (prdReview ? prdReview : ''));
			});
		}
		
		if($('#dwfrm_profile_customer_phoneMobile').length > 0) {
			$('#dwfrm_profile_customer_phoneMobile').attr('placeholder','');
		}
		
	 }, 3000);

	setTimeout(function(){
		if($('#dwfrm_profile_customer_phoneMobile').length > 0) {
			$('#dwfrm_profile_customer_phoneMobile').attr('placeholder','');
		}
	 }, 1800);
	
	$(document).on('click', '.pdp-refill-info', function (e) {
		e.preventDefault();
		$("#autoDeliveryModal").modal('show');
	}).on('keyup', function(e) {
		if(e.keyCode==40){
			e.preventDefault();
		}
	});
	
	$(document).on('click', '.auto-delivery-close', function (e) {
		e.preventDefault();
		$('#autoDeliveryModal').modal('hide');
	}).on('keyup', function(e) {
		if(e.keyCode==40){
			e.preventDefault();
		}
	});
	
	/**
	* ADA Fixes for bag
	**/
	
	if($('.cart-coupon-code-error').text().trim().length > 0) {
		
		$('.cart-coupon-code-error .cart-coupon-code').each(function() {
			if($(this).text().trim().length > 0) {
				$('.code-error-bag-global').attr('aria-label', $(this).text());
				$('.cart-coupon-code-error').attr('tabindex','0');
				$('.cart-coupon-code-error').focus();
				
				setTimeout(function(){ 
					$('.cart-coupon-code-error').removeAttr('tabindex');
					$('.cart-coupon-code-error').blur();
				}, 500);
				
			}
		})
		
	}
	
	//adding role=complementary to help block
	window.onload = function (){
		$('#launcher').attr('role','complementary');
		var launcheriFrame = $('#launcher').contents().find('#Embed');
		launcheriFrame.attr('role','complementary');
	}
	
	// $(document).on("keyup", ".nav-desktop li.dropdown.has-subnav a.nav-link" , function(event) {
	// 	if(event.keyCode==40 || event.keyCode==18){
	// 		event.preventDefault();
	// 		var parent = $(this).parent();
	// 		$(".has-subnav").removeClass("active");
	// 		if($(parent).hasClass("has-subnav")) {		
	// 			parent.addClass("active");
	// 			parent.find(".dropdown-menu").css({"display": "block", "margin-top": "0px"});
	// 		}
	// 		$("#header-nav-state").text('expanded');
	// 	}
	// 	if(event.keyCode==38){
	// 		event.preventDefault();
	// 		var parent = $(this).parent();
	// 		$(".has-subnav").removeClass("active");
	// 		parent.find(".dropdown-menu").css({"display": "", "margin-top": ""});
	// 	}
	// 	if(event.keyCode === 27){
	// 		$("#header-nav-state").text('collapsed');
	// 	}

	// });
	
	// $(document).on("keydown", '.nav-desktop .dropdown-menu a', function(e){
	// 	if(e.keyCode === 32){
	//         e.preventDefault();
	// 		$(this)[0].click();
	// 	}
	// 	if(e.keyCode === 27){
	// 		$("#header-nav-state").text('collapsed');
	// 	}
		
	// 	var lastFocusable = $(this).closest('.dropdown-menu').find( "a" ).last();
	   
	// 	if(e.keyCode === 40 || e.keyCode === 9){
	// 		if(this === lastFocusable.get(0)){
	// 			$("#header-nav-state").text('collapsed');
	// 		}
	// 	}	
	// });
});

$('.hero-cta-container .cta-btn').on('click', function(event) {
	var url = $(this).attr('data-href');
	if(url.length > 0) {
		event.preventDefault();
		window.location.href = url;
	}
})


//Footer refer a friend extole call

$(document).on("click",'.refer-a-friend-subscritpion',function(event){

$("#extole_zone_footer_subscription div").click()

	})
$(document).on("click","#extole_zone_footer_subscription div",function(event){
event.stopPropagation();
})

/* Float Label 
 * 
 */
function hasClass(element, className) {
	if(element && element !== null && element !== undefined) {
		return (" " + element.className + " ").indexOf(" " + className + " ") > -1;
	}
}
if (NodeList.prototype.forEach) {
      document.querySelectorAll("input.form-control,select.form-control").forEach((input) => {
      input.addEventListener("input", (e) => {

	      if (hasClass(e.target.previousElementSibling, "float-label")) {
	    	  e.target.previousElementSibling.className =
	    		  e.target.value.length > 0
	    		  ? "float-label input--filled"
	    				  : "float-label";
	        }
        });
    });
 } 
