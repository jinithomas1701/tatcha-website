'use strict';

var page = require('./page'),
    util = require('./util'),
    TPromise = require('promise');

var _currentCategory = '',
    MAX_ACTIVE = 5;

/**
 * @private
 * @function
 * @description Verifies the number of elements in the compare container and updates it with sequential classes for ui targeting
 */
function refreshContainer() {
    var $compareContainer = $('.compare-panel');
    var $compareItems = $compareContainer.find('.compare-product');
    var numActive = $compareItems.filter('.active').length;

    if (numActive < 2) {
        $('#compare-items-button').attr('disabled', 'disabled');
    } else {
        $('#compare-items-button').removeAttr('disabled');
    }

    $compareContainer.toggle(numActive > 0);
}

function updateHeaderCount() {
	//setting the selected prodcts count in comapare panel header
    var selectedPrdLength = 0;
    selectedPrdLength = $('.compare-product.active').length;
    if(selectedPrdLength > 0) {
    	$('.compare-prd-num').text('('+selectedPrdLength+')').css('display','inline');
    }
}

function hasReachedMaxLimit(chkLitmit) {
	if(typeof(MAX_ACTIVE) === 'undefined') {
		var MAX_ACTIVE = 5;
	}
	var $tile = $('.product-list-unit-v2');
    var numActive = $('.compare-panel .compare-product').filter('.active').length;
    if(numActive === MAX_ACTIVE) {
    	if(chkLitmit) {
    		return true;
    	} else {
    		$tile.each(function() {
            	if($(this).find('.compare-check').not(':checked')){
            		$(this).attr('disabled', 'true');
            		$tile.find('.check-label').addClass('disabled-comapare-text');
            		$tile.find('.check-square').addClass('disabled-comapare-box');
            	}
            });
    	}
    }
}

/**
 * @private
 * @function
 * @description Adds an item to the compare container and refreshes it
 */
function addToList(data) {
	
	if($('.compare-panel').not(':visible')) {
		$('.compare-panel').slideDown();
	}
	
	// compare-items -> compare-panel, compare-item-> compare-product
	
    // get the first compare-item not currently active
    var $item = $('.compare-panel .compare-product').not('.active').first(),
        $productTile = $('#' + data.uuid);

    if ($item.length === 0) {
        if ($productTile.length > 0) {
            $productTile.find('.compare-check')[0].checked = false;
        }
        window.alert(Resources.COMPARE_ADD_FAIL);
        return;
    }

    // if already added somehow, return
    if ($('[data-uuid="' + data.uuid + '"]').length > 0) {
        return;
    }
    
    var hasLitmiReached = hasReachedMaxLimit(true);
    if(hasLitmiReached) {
    	return false;
    }
    
    $item.find('.product-name').text(data.name).css('display', 'inline-block');
    $item.find('.compare-prd-remove').css('display', 'block');
    $item.find('.compare-prd-remove').attr('aria-label', 'Remove item from compare - '+data.name+'.');
    
    $item.find('.empty-product-wrap').css('display', 'none');
    
    // set as active item
    $item.addClass('active')
        .attr('data-uuid', data.uuid)
        .attr('data-itemid', data.itemid)
        .data('uuid', data.uuid)
        .data('data-name', data.name)
        .data('itemid', data.itemid)
        .prepend($(data.img).clone()
        .addClass('compare-prd-image product-thumbnail'));

    	$item.find('.compare-prd-image').removeClass('img-responsive product-img lazyImage');
    
    updateHeaderCount();
    hasReachedMaxLimit();
    
}

function enableCompareField() {
	
	var $tile = $('.product-list-unit-v2');
	$tile.each(function() {
    	if($(this).find('.compare-check').not(':checked')){
    		$(this).attr('disabled', 'false');
    		$tile.find('.check-label').removeClass('disabled-comapare-text');
    		$tile.find('.check-square').removeClass('disabled-comapare-box');
    	}
    });
}

/**
 * @private
 * @function
 * description Removes an item from the compare container and refreshes it
 */
function removeFromList($item) {
    if ($item.length === 0) { return; }
    
    $item.find('.product-name').text("");
    $item.find('.compare-prd-remove').css('display', 'none');
    $item.find('.compare-prd-remove').removeAttr('aria-label');
    $item.find('.product-thumbnail').css('display', 'inline-block');
    // remove class, data and id from item
    $item.removeClass('active')
        .removeAttr('data-uuid')
        .removeAttr('data-itemid')
        .data('uuid', '')
        .data('itemid', '')
        // remove the image
        .find('.compare-prd-image').remove();
    
    var emptyItem = $('.compare-product').not('.active');
    $item.remove();
    $('.compare-product-block').append(emptyItem);
    
    updateHeaderCount();
    enableCompareField();
    
}

function addProductAjax(args) {
    var promise = new TPromise(function (resolve, reject) {
        $.ajax({
            url: Urls.compareAdd,
            data: {
                pid: args.itemid,
                category: _currentCategory
            },
            dataType: 'json'
        }).done(function (response) {
            if (!response || !response.success) {
                reject(new Error(Resources.COMPARE_ADD_FAIL));
            } else {
                resolve(response);
            }
        }).fail(function (jqxhr, status, err) {
            reject(new Error(err));
        });
    });
    return promise;
}

function removeProductAjax(args) {
    var promise = new TPromise(function (resolve, reject) {
        $.ajax({
            url: Urls.compareRemove,
            data: {
                pid: args.itemid,
                category: _currentCategory
            },
            dataType: 'json'
        }).done(function (response) {
            if (!response || !response.success) {
                reject(new Error(Resources.COMPARE_REMOVE_FAIL));
            } else {
                resolve(response);
            }
        }).fail(function (jqxhr, status, err) {
            reject(new Error(err));
        });
    });
    return promise;
}

function shiftImages() {
    return new TPromise(function (resolve) {
        var $items = $('.compare-panel .compare-product');
        $items.each(function (i, item) {
            var $item = $(item);
            // last item
            if (i === $items.length - 1) {
                return removeFromList($item);
            }
            var $next = $items.eq(i + 1);
            if ($next.hasClass('active')) {
                // remove its own image
                $next.find('.compare-prd-image').detach().appendTo($item);
                $item.addClass('active')
                    .attr('data-uuid', $next.data('uuid'))
                    .attr('data-itemid', $next.data('itemid'))
                    .data('uuid', $next.data('uuid'))
                    .data('itemid', $next.data('itemid'));
            }
        });
        resolve();
    });
}

/**
 * @function
 * @description Adds product to the compare table
 */
function addProduct(args) {
    var promise;
    var $items = $('.compare-panel .compare-product');
    var $cb = $(args.cb);
    var numActive = $items.filter('.active').length;
    
    var hasLimitReached = hasReachedMaxLimit(true);
    if (hasLimitReached) {
    	return;
    } else {
        promise = TPromise.resolve(0);
    }
    return promise.then(function () {
        return addProductAjax(args).then(function () {
            addToList(args);
            if ($cb && $cb.length > 0) { $cb[0].checked = true; }
            refreshContainer();
        });
    }).then(null, function () {
        if ($cb && $cb.length > 0) { $cb[0].checked = false; }
    });
}

/**
 * @function
 * @description Removes product from the compare table
 * @param {object} args - the arguments object should have the following properties: itemid, uuid and cb (checkbox)
 */
function removeProduct(args) {
    var $cb = args.cb ? $(args.cb) : null;
    var $itemId = args.itemid;
    return removeProductAjax(args).then(function () {
        var $item = $('[data-uuid="' + args.uuid + '"]');
        removeFromList($item);
        if ($cb && $cb.length > 0) { 
        	var allPrdTileElements = $('div.product-tile[data-itemid="'+ $itemId +'"]');
        	if (allPrdTileElements.length > 1) {
        		allPrdTileElements.each(function(index, element){
        			var ptile = element.closest('.product-tile');
        			$(ptile).find('input[type="checkbox"].compare-check').prop("checked", false);
        		})
        	} else {
	        	$cb[0].checked = false;
        	}
        }
        refreshContainer();
    }, function () {
        if ($cb && $cb.length > 0) { $cb[0].checked = true; }
    });
}

function removeItem($item) {
    var uuid = $item.data('uuid'),
        $productTile = $('#' + uuid);
    return removeProduct({
        itemid: $item.data('itemid'),
        uuid: uuid,
        cb: ($productTile.length === 0) ? null : $productTile.find('.compare-check')
    });
}

/**
 * @private
 * @function
 * @description Initializes the DOM-Object of the compare container
 */
function initializeDom() {
    var $compareContainer = $('.compare-panel');
    _currentCategory = $compareContainer.data('category') || '';
    var $active = $compareContainer.find('.compare-product').filter('.active');
    $active.each(function () {
        var $productTile = $('#' +  $(this).data('uuid'));
        if ($productTile.length === 0) {return;}
        $productTile.find('.compare-check')[0].checked = true;
    });
    // set container state
    refreshContainer();
}

/**
 * @private
 * @function
 * @description Initializes the events on the compare container
 */
function initializeEvents() {
    // add event to buttons to remove products
    $(document).on('click', '.compare-product .compare-prd-remove', function () {
    	var numActive = $('.compare-panel .compare-product').filter('.active').length;
    	if(numActive === 1) {
    		$('.compare-panel').slideToggle(function() { 
          		$('.compare-body').collapse('hide');
          	});
    	}
    	
        removeItem($(this).closest('.compare-product'));
        
        if($(this).parent().next().find('button:visible')){
            $(this).parent().next().find('button')[0].focus();
        }
    });

    // Button to go to compare page
    $(document).on('click','#compare-items-button', function () {
        page.redirect(util.appendParamToURL(Urls.compareShow, 'category', _currentCategory));
    });

    // Button to clear all compared items
    // rely on refreshContainer to take care of hiding the container
    $(document).on('click', '#clear-compared-items', function () {
    	$('.compare-panel').slideToggle(function() { 
      		$('.compare-body').collapse('hide');
      	});
        $('.compare-product.active').each(function() {
        	removeItem($(this));
        	enableCompareField();
        })
    });
}

exports.init = function () {
    initializeDom();
    initializeEvents();
};

exports.addProduct = addProduct;
exports.removeProduct = removeProduct;
exports.hasReachedMaxLimit = hasReachedMaxLimit;
exports.enableCompareField = enableCompareField;