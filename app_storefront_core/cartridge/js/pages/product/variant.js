'use strict';

var ajax = require('../../ajax'),
    image = require('./image'),
    progress = require('../../progress'),
    productStoreInventory = require('../../storeinventory/product'),
    tooltip = require('../../tooltip'),
    util = require('../../util');


/**
 * @description update product content with new variant from href, load new content to #product-content panel
 * @param {String} href - url of the new product variant
 **/
var updateContent = function (href) {
    var $pdpForm = $('.pdpForm');
    var qty = $pdpForm.find('input[name="Quantity"]').first().val();
    var params = {
        Quantity: isNaN(qty) ? '1' : qty,
        format: 'ajax',
        productlistid: $pdpForm.find('input[name="productlistid"]').first().val()
    };

    progress.show($('#pdpMain'));

    ajax.load({
        url: util.appendParamsToUrl(href, params),
        target: $('#product-content'),
        callback: function () {
            if (SitePreferences.STORE_PICKUP) {
                productStoreInventory.init();
            }
            image.replaceImages();
            /*if($('.product-detail-container .add-to-bag-sticky').length) {
    			$(window).scroll(function () {
    		    	var cartButton = $('.product-detail #add-to-cart').offset().top;
    	      		if ($(window).width() <=576 ) {
    		            if ($(this).scrollTop() > cartButton) {
    		                $('#add-to-bag-affix').fadeIn();
    		            } 
    		            if ($(this).scrollTop() < cartButton) {
    		                $('#add-to-bag-affix').fadeOut();
    		            }
    		        }
    	        });
    		}*/
            tooltip.init();
        }
    });
};


/**
 * @description update product content with new variant from href, load new content to #product-content panel
 * @param {String} href - url of the new product variant
 **/
var updateQuickviewContent = function (href) {
    var $pdpForm = $('.pdpForm');
    var qty = $pdpForm.find('input[name="Quantity"]').first().val();
    var params = {
        Quantity: isNaN(qty) ? '1' : qty,
        format: 'ajax',
        productlistid: $pdpForm.find('input[name="productlistid"]').first().val()
    };

    progress.show($('#pdpMain'));

    ajax.load({
        url: util.appendParamsToUrl(href, params),
        target: $('#quickviewModal-content'),
        callback: function () {
            if (SitePreferences.STORE_PICKUP) {
                productStoreInventory.init();
            }
            //image.replaceImages();
            if($('.product-detail #add-to-cart').length) {
    			$(window).scroll(function () {
    		    	var cartButton = $('.product-detail #add-to-cart').offset().top;
    	      		if ($(window).width() <=576 ) {
    		            if ($(this).scrollTop() > cartButton) {
    		                $('#add-to-bag-affix').fadeIn();
    		            } 
    		            if ($(this).scrollTop() < cartButton) {
    		                $('#add-to-bag-affix').fadeOut();
    		            }
    		        }
    	        });
    		}
            tooltip.init();
        }
    });
};

/**
 * @description update product entire content and  with new variant from href, load new content to #product-content panel
 * @param {String} href - url of the new product variant
 **/
var updateEntireProductContent = function (href) {
    var $pdpForm = $('.pdpForm');
    var qty = $pdpForm.find('input[name="Quantity"]').first().val();
    var params = {
        Quantity: isNaN(qty) ? '1' : qty,
        format: 'skinTypeVariation',
        productlistid: $pdpForm.find('input[name="productlistid"]').first().val()
    };

    progress.show($('#main'));   
    
    ajax.load({
        url: util.appendParamsToUrl(href, params),
        target: $('#product-content'),
        callback: function () {
            if (SitePreferences.STORE_PICKUP) {
                productStoreInventory.init();
            }
            image.replaceImages();
            tooltip.init();
            replaceContentSection();
           
            var elem = document.querySelector('.product-merchandise-carousel');
            var flkty = new Flickity( elem, {  
            	   cellAlign:"left",
            	   contain:true,
            	   imagesLoaded:true,
            	   percentPosition:false,
            	   freeScroll:true,
            	   pageDots:false,
            	   groupCells:true
            	});
            var addToCart = require('./addToCart');
            addToCart();
        }
    });
};

/**
 * @description Replaces the content .
 */
function replaceContentSection () {
    var $newContent = $('#update-content'),
        $contentContainer = $('.product-detail-container #content-blocks');
    if ($newContent.length === 0) { return; }

    $contentContainer.html($newContent.html());
    $newContent.remove();
}



/**
 * @description update product content with new variant from href, load new content to .product-tile panel
 * @param {String} href - url of the new product variant
 **/
var updateProductTileContent = function (element) {
    var $pdpForm = $('.pdpForm');
    var ajaxUrl = '';
    var qty = $pdpForm.find('input[name="Quantity"]').first().val();
    
    var prdTile = element.closest('.product-tile');
    var parentTile = prdTile.parentElement;
    
    var cgid = prdTile.getElementsByClassName('product-variant-content')[0].getAttribute('data-cgid');    
    
    var className = element.className;
    
    // Get Url from select or color list
    if (className.indexOf('color-img') < 0) {
	    var selectedOption = $("option:selected", element)[0];
		var showCompare = selectedOption.getAttribute('data-compare');
		
		if(showCompare === 'undefined' || typeof showCompare === 'undefined') {
			showCompare = true;
		}
		
	    if ( cgid !== 'null' ) {    	
	    	ajaxUrl = selectedOption.getAttribute('href') + '&cgid=' + cgid + '&showCompare=' + showCompare;    	
	    } else {
	    	ajaxUrl = selectedOption.getAttribute('href');
		}
    } else {
    	if ( cgid !== 'null' ) {    	
    		ajaxUrl = element.getAttribute('href') + '&cgid=' + cgid;    	
        } else {
        	ajaxUrl = element.getAttribute('href');
    	}
    }

    var params = {
        Quantity: isNaN(qty) ? '1' : qty,
        format: 'ajax',
        productlistid: $pdpForm.find('input[name="productlistid"]').first().val()
    };
    
    let initYotpo = function () {
        // Initialize Yoto
        try {
        	if (typeof Yotpo !== 'undefined') {
            	var api = new Yotpo.API(yotpo);
            	api.instance.widgets = [];
            	api.refreshWidgets();
        	}
        } catch(err){} 
    };

    $('.loader-preventive').show();

    ajax.load({
        url: util.appendParamsToUrl(ajaxUrl, params),
        target: parentTile,
        callback: function (response) {       	
            if (SitePreferences.STORE_PICKUP) {
                productStoreInventory.init();
            }
            
            // Reload lazy load images
            var prdImg = parentTile.getElementsByClassName('lazyImage');
            let src = prdImg ? prdImg[0].getAttribute('data-src') : null;
			
			if (src !== null && prdImg[0].tagName.toLowerCase() === 'img') {
				prdImg[0].src = src;
			}
			
			// Re-Initialise tooltip
            tooltip.init();
            
            // Re-Initialise product review
            initYotpo();
            
            // Re-Initialise variants select box with new tile
            initVariantSelection();
            
            $('.loader-preventive').hide();
        }
    });
    $('body').tooltip({
	    selector: '.plp-list-quick-view.add-to-cart'
	})
    
};

var initVariantSelection = function () {
	
	var $tilePages = $('.category-page, .product-list');
	
	//Change Event
    $('select[name$="product-variation-size"]').on('change', function (e) {
        e.preventDefault();
                
        if ($(this).hasClass("active")) {
        	return;
        } 

        updateProductTileContent(this);

    });
	
	$tilePages.on('click','.color-variant .variant-selection', function (e) {
        e.preventDefault();
                
        if ($(this).hasClass("active")) {
        	return;
        } 

        updateProductTileContent(this);

    });
	
}

module.exports = function () {
    var $pdpMain = $('#pdpMain');
    
    // hover on swatch - should update main image with swatch image
    $pdpMain.on('mouseenter mouseleave', '.swatchanchor', function () {
        var largeImg = $(this).data('lgimg'),
            $imgZoom = $pdpMain.find('.main-image'),
            $mainImage = $pdpMain.find('.primary-image');

        if (!largeImg) { return; }
        // store the old data from main image for mouseleave handler
        $(this).data('lgimg', {
            hires: $imgZoom.attr('href'),
            url: $mainImage.attr('src'),
            alt: $mainImage.attr('alt'),
            title: $mainImage.attr('title')
        });
        // set the main image
        image.setMainImage(largeImg);
    });

    // click on swatch - should replace product content with new variant
    $pdpMain.on('click', '.product-detail .swatchanchor', function (e) {
        e.preventDefault();
        /*Commenting - Tatcha wants the button states to be shown for OOS variants*/
        /*if ($(this).parents('div').hasClass('unselectable')) { 
        	$(this).tooltip('show');
        	return; 
        	}*/
        
        if ($(this).hasClass("active")) {
        	return;
        }
        
        if($(this).data("vtype") == 'skinTypeVariation'){
        	updateEntireProductContent(this.href);
        } else {
        	updateContent(this.href);
        }
        
    });

    // change drop down variation attribute - should replace product content with new variant
    $pdpMain.on('change', '.variation-select', function () {
        if ($(this).val().length === 0) { return; }
        updateContent($(this).val());
    });
    
    $('#quickviewModal').on('click', '.product-detail .swatchanchor', function (e) {
        e.preventDefault();
        /*Commenting - Tatcha wants the button states to be shown for OOS variants*/
        /*if ($(this).parents('div').hasClass('unselectable')) { 
        	$(this).tooltip('show');
        	return; 
        	}*/
        
        if ($(this).hasClass("active")) {
        	return;
        }
        
        if($(this).data("vtype") == 'skinTypeVariation'){
        	//updateEntireProductContent(this.href);
        	updateQuickviewContent(this.href);
        	
        } else {
        	updateContent(this.href);
        }
        
    });   
    
    //Init variant selection in PLP tiles
    initVariantSelection();
    
};
