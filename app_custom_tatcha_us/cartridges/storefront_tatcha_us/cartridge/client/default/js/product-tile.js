'use strict';

var variant = require('./product/variant'),
    quickview = require('./quickview');

function initQuickViewButtons() {
    $('.quickview-enabled').on('mouseenter', function () {
        var $qvButton = $('#quickviewbutton');
        if ($qvButton.length === 0) {
            $qvButton = $('<a id="quickviewbutton" class="btn btn-default product-quickview quickview">' + Resources.QUICK_VIEW + '<i class="fa fa-arrows-alt"></i></a>');
        }
        var $link = $(this).find('.thumb-link');
        $qvButton.attr({
            'href': $link.attr('href'),
            'title': $link.attr('title')
        }).appendTo(this);
        $qvButton.off('click').on('click', function (e) {
            e.preventDefault();
            quickview.show({
                url: $(this).attr('href'),
                source: 'quickview'
            });
        });
    });
}

function gridViewToggle() {
    $('.toggle-grid').on('click', function () {
        $('.search-result-content').toggleClass('wide-tiles');
        $(this).toggleClass('wide');
    });
}

/**
 * @private
 * @function
 * @description Initializes events on the product-tile for the following elements:
 * - swatches
 * - thumbnails
 */
function initializeEvents() {
	// Commenting to disable quick view options, MOC-910
    //initQuickViewButtons();
    gridViewToggle();
    $('.swatch-list').on('mouseleave', function () {
        // Restore current thumb image
        var $tile = $(this).closest('.product-tile'),
            $thumb = $tile.find('.product-image .thumb-link img').eq(0),
            data = $thumb.data('current');

        $thumb.attr({
            src: data.src,
            alt: data.alt,
            title: data.title
        });
    });
    $('.swatch-list .swatch').on('click', function (e) {
        e.preventDefault();
        if ($(this).hasClass('selected')) { return; }

        var $tile = $(this).closest('.product-tile');
        $(this).closest('.swatch-list').find('.swatch.selected').removeClass('selected');
        $(this).addClass('selected');
        $tile.find('.thumb-link').attr('href', $(this).attr('href'));
        $tile.find('name-link').attr('href', $(this).attr('href'));

        var data = $(this).children('img').filter(':first').data('thumb');
        var $thumb = $tile.find('.product-image .thumb-link img').eq(0);
        var currentAttrs = {
            src: data.src,
            alt: data.alt,
            title: data.title
        };
        $thumb.attr(currentAttrs);
        $thumb.data('current', currentAttrs);
    }).on('mouseenter', function () {
        // get current thumb details
        var $tile = $(this).closest('.product-tile'),
            $thumb = $tile.find('.product-image .thumb-link img').eq(0),
            data = $(this).children('img').filter(':first').data('thumb'),
            current = $thumb.data('current');

        // If this is the first time, then record the current img
        if (!current) {
            $thumb.data('current', {
                src: $thumb[0].src,
                alt: $thumb[0].alt,
                title: $thumb[0].title
            });
        }

        // Set the tile image to the values provided on the swatch data attributes
        $thumb.attr({
            src: data.src,
            alt: data.alt,
            title: data.title
        });
    });
    
    $(document).on('click', '.open-qv-modal', function (e) {
		e.preventDefault();
		$('.loader-preventive').show();
		var productUrl = $(this).attr('data-url');
	
		quickview.show({
	        url: productUrl,
	        source: 'quickview'
		});
    });
    
    $('#notify-me-modal').on('show.bs.modal', function (e) {
    	$('#quickviewModal').modal('hide');
	});
    
    $(document).on('click','#quickviewModal .auto-delivery-toggle', function (e) {
    	if ($('input.auto-delivery-toggle').prop('checked')) {
    		
    		if($('#select-everydelivery').length > 0){
    			$('#select-everydelivery').show();
    		} else {
                $('select[name=OsfSorDeliveryWeekInterval],.OsfSorDeliveryInterval-help').show();
                $('select[name=OsfSorDeliveryInterval],.OsfSorDeliveryInterval-help').show();         			
    		}
	
    	} else {
    		$('#select-everydelivery').hide();
            $('select[name=OsfSorDeliveryWeekInterval],.OsfSorDeliveryInterval-help').hide();
            $('select[name=OsfSorDeliveryInterval],.OsfSorDeliveryInterval-help').hide();     		    		
    	}
    	
  	
    	
    });
}

exports.init = function () {
	variant();
    var $tiles = $('.product-tile');
    if ($tiles.length === 0) { return; }
    
    initializeEvents();
    
    $('.modal-quickview').on('show.bs.modal', function (e) {
    		$('.btn.plp-list-quick-view').removeClass('loading-btn');
    		$('.modal-quickview #add-to-cart').on('click', function (e) {
    			$(this).addClass('loading-btn');
     	});
	});
     
};
