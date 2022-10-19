'use strict';

var compareWidget = require('../compare-widget'),
    productTile = require('../product-tile'),
    progress = require('../progress'),
    minicart = require('../minicart'),
    addToCart = require('../pages/product/addToCart'),
	commonUtil = require('../commonutil'),
    util = require('../util');
	
	var options = [];
	let pageLoadedCount = getPageNumFromUrl() || 1;
	var last_scroll = 0;
	var MAX_PRD_LIMIT = 5;
	
function getPageNumFromUrl() {
	let urlParams = location.search;
	let pageNumParam;
	if (urlParams.indexOf('pageNum') > -1) {
		try {
			pageNumParam = parseInt(urlParams.split('pageNum=')[1]);
		} catch (e) {
			throw e;
		}
    } else {
    	pageNumParam =  undefined;
    }
	return pageNumParam;
}
	
function mostlyVisible(element) {
  // if ca 25% of element is visible
  var scroll_pos = $(window).scrollTop();
  var window_height = $(window).height();
  var el_top = $(element).offset().top;
  var el_height = $(element).height();
  var el_bottom = el_top + el_height;
  return ((el_bottom - el_height*0.25 > scroll_pos) && 
          (el_top < (scroll_pos+0.5*window_height)));
}

function infiniteScroll() {
	
	var loadingTop = $('.infinite-scroll-placeholder-top');
	var loadingBottom = $('.infinite-scroll-placeholder');
	
	var scroll_pos = $(window).scrollTop();
	
    // getting the hidden div, which is the placeholder for the next page
    var loadingPlaceHolder = $('.infinite-scroll-placeholder[data-loading-state="unloaded"]');
    var loadingPlaceHolderTop = $('.infinite-scroll-placeholder-top[data-loading-state="unloaded"]');
    var prdListItems = $('.prd-tile-wrap');
    

    if (loadingPlaceHolder.length) {
        // switch state to 'loading'
        // - switches state, so the above selector is only matching once
        // - shows loading indicator
    	
        loadingPlaceHolder.attr('data-loading-state', 'loading');
        //loadingPlaceHolder.addClass('infinite-scroll-loading');
        
        
        
        // get url hidden in DOM
        var gridUrl = loadingPlaceHolder.attr('data-grid-url');
        var gridPage = loadingPlaceHolder.attr('data-grid-page');

        // named wrapper function, which can either be called, if cache is hit, or ajax repsonse is received
        let fillEndlessScrollChunk = function (html) {
            loadingPlaceHolder.removeClass('infinite-scroll-loading');
            loadingPlaceHolder.attr('data-loading-state', 'loaded');
            $('div.search-result-content').append(html); 
            initYotpo();
			//$('.product-count').text($('.product-hit-tile').length+" products"); 
        };
        
        // old condition for caching was `'sessionStorage' in window && sessionStorage["scroll-cache_" + gridUrl]`
        // it was removed to temporarily address RAP-2649
        $.ajax({
            type: 'GET',
            dataType: 'html',
            url: gridUrl,
            success: function (response) {
                // put response into cache
                try {
                    sessionStorage['scroll-cache_' + gridUrl] = response;
                    pageLoadedCount += 1;
                } catch (e) {
                    // nothing to catch in case of out of memory of session storage
                    // it will fall back to load via ajax
                }
                // update UI
                fillEndlessScrollChunk(response);
                productTile.init();
		    }
        });
        
        console.log('pageLoadedCount '+pageLoadedCount);
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

    }
    
    if(loadingPlaceHolderTop.length && util.elementInViewport(loadingPlaceHolderTop.get(0), 250)) {
    	// switch state to 'loading'
        // - switches state, so the above selector is only matching once
        // - shows loading indicator
    	
    	loadingPlaceHolderTop.attr('data-loading-state', 'loading');
    	//loadingPlaceHolderTop.addClass('infinite-scroll-loading');
        
        // get url hidden in DOM
        var gridUrl = loadingPlaceHolderTop.attr('data-grid-url');
        var gridPage = loadingPlaceHolderTop.attr('data-grid-page');


        // named wrapper function, which can either be called, if cache is hit, or ajax repsonse is received
        let fillEndlessScrollChunk = function (html) {
        	loadingPlaceHolderTop.removeClass('infinite-scroll-loading');
        	loadingPlaceHolderTop.attr('data-loading-state', 'loaded');
            $('div.search-result-content').prepend(html);
			console.log('gridUrl2 '+gridUrl);
            console.log('Html2 '+html);
        };

        // old condition for caching was `'sessionStorage' in window && sessionStorage["scroll-cache_" + gridUrl]`
        // it was removed to temporarily address RAP-2649
        $.ajax({
            type: 'GET',
            dataType: 'html',
            url: gridUrl,
            success: function (response) {
                // put response into cache
                try {
                    sessionStorage['scroll-cache_' + gridUrl] = response;
                    pageLoadedCount += 1;
                } catch (e) {
                    // nothing to catch in case of out of memory of session storage
                    // it will fall back to load via ajax
                }
                // update UI
                fillEndlessScrollChunk(response);
                productTile.init();
            }
        });
        
    }
    
    // Adjust the URL based on the top item shown
    // for reasonable amounts of items
    if ($('.prd-tile-wrap').is(':visible')) {
      last_scroll = scroll_pos;
      var url = "";
      var urlParams = "";
      var filteredParam = "";
      $(prdListItems).each(function(index) {
    	var pageIndex = $(this).attr("data-prd-page");
        if (mostlyVisible(this) && pageIndex) {
          url  = window.location.href.split('?')[1];
          if(url && url.indexOf('page=') !== -1) {
        	  filteredParam = url.split('page=')[0];
        	  
        	  urlParams = filteredParam.length > 0 ? '?' + filteredParam : '?';
              window.history.replaceState(null, null, urlParams + 'page=' + parseInt(pageIndex));
          } else {
        	  urlParams = (url && url.length > 0) ? '?'+url+'&' : '?';
              window.history.replaceState(null, null, urlParams + 'page=' + parseInt(pageIndex));  
          }
          var pageNavUrl = $('#searchUrl').val();
          if(parseInt(pageIndex)) {
        	  var prevPage = parseInt(pageIndex) - 1;
        	  var nextPage = parseInt(pageIndex) + 1;
        	  if(prevPage !== 0) {
        		  if($('link[rel=prev]').length == 0) {
        			  $('head').append("<link rel='prev' href=''>");
        		  }
        		  $('link[rel=prev]').attr('href', pageNavUrl +"&page="+prevPage);
        	  } else {
        		  $('link[rel=prev]').remove();
        	  }
        	  
        	  $('link[rel=next]').attr('href', pageNavUrl +"&page="+nextPage)
          }
          return(false);
        }
      });
    }
    

    
}
/**
 * @private
 * @function
 * @description replaces breadcrumbs, lefthand nav and product listing with ajax and puts a loading indicator over the product listing
 */
function updateProductListing(url,device) {
    if (!url || url === window.location.href) {
        return;
    }
    progress.show($('.search-result-content'));
    $('#main').load(util.appendParamToURL(url, 'format', 'ajax'), function () {
        compareWidget.init();
        productTile.init();
		commonUtil.footerSeo();
        var w = window.outerWidth;
        if(w>=768) {
      	   filterSelectionUI('#filterskinType');
      	   filterSelectionUI('#filterskinConcerns');
      	   filterSelectionUI('#filterisTravelSize');  	  
        } else {
           filterSelectionUIMobile('.modal-mobile-filters');
        }
      
        progress.hide();
        history.pushState(undefined, '', url);
        
        $('.dropdown.refinement').on('hide.bs.dropdown', function(e) {
        		resetFilterSelection('.filters-desktop');
        });
        
        if(device==='mobile'){
        	$('#filtersModal').find("input").each(function(index,checkbox){ 
        	 	if(checkbox.checked){
        	        $(checkbox).attr("data-filter-checked","true");
        	    } else{
        	    		$(checkbox).removeAttr("data-filter-checked");
        	    }
        	});	
        }
    });
}

/**
 * @private
 * @function
 * @description Initializes events for the following elements:<br/>
 * <p>refinement blocks</p>
 * <p>updating grid: refinements, pagination, breadcrumb</p>
 * <p>item click</p>
 * <p>sorting changes</p>
 */

function filterChecked(event){
	
	   var $target = $( event.currentTarget ),
    val = $target.attr( 'data-value' ),
    $inp = $target.find( 'input' ),
    idx;

	   if ( ( idx = options.indexOf( val ) ) > -1 ) {
	      options.splice( idx, 1 );
	      setTimeout( function() { $inp.prop( 'checked', false ) }, 0);
	   } else {
	      options.push( val );
	      setTimeout( function() { $inp.prop( 'checked', true ) }, 0);
	   }

	   //$( event.target ).blur();
	      
	   return false;

}

function initializeEvents() {
    var $main = $('#main');
    // compare checked
    $main.on('click', 'input[type="checkbox"].compare-check', function () {
        
    	showCompareWidget(this);

    });
	//Filter desktop  dynamic align
	$(document).on("shown.bs.dropdown",".dropdown.refinement",function(){
    	$(this).find(".dropdown-menu-multi-col").css("right","0px").css("left","unset");
	})
	
    // handle toggle refinement blocks
    $main.on('click', '.refinement h3', function () {
        $(this).toggleClass('expanded')
        .siblings('ul').toggle();
    });

    // handle events for updating grid
    $main.on('click', '.refinement a, .pagination a, .breadcrumb-refinement-value a', function (e) {
        // don't intercept for category and folder refinements, as well as unselectable
        if ($(this).parents('.category-refinement').length > 0 || $(this).parents('.folder-refinement').length > 0 || $(this).parent().hasClass('unselectable')) {
            return;
        }
        e.preventDefault();
        e.stopPropagation(); 
    });
    
  

    // handle events item click. append params.
    $main.on('click', '.product-tile a:not("#quickviewbutton")', function () {

    	if ($(this).hasClass('reviews-ratings-link')) {
            return;      
        }

        var a = $(this);
        // get current page refinement values
        var wl = window.location;

        var qsParams = (wl.search.length > 1) ? util.getQueryStringParams(wl.search.substr(1)) : {};
        var hashParams = (wl.hash.length > 1) ? util.getQueryStringParams(wl.hash.substr(1)) : {};

        // merge hash params with querystring params
        var params = $.extend(hashParams, qsParams);
        if (!params.start) {
            params.start = 0;
        }
        // get the index of the selected item and save as start parameter
        var tile = a.closest('.product-tile');
        var idx = tile.data('idx') ? + tile.data('idx') : 0;

        // convert params.start to integer and add index
        params.start = (+params.start) + (idx + 1);
        // set the hash and allow normal action to continue
        a[0].hash = $.param(params);
    });

    // handle add to bag
    $main.on('click', '.plp-list', function () {
    	
        var $form = $(this).closest('form'),
        $qty = $form.find('input[name="Quantity"]');
        if ($qty.length === 0 || isNaN($qty.val()) || parseInt($qty.val(), 10) === 0) {
        	$qty.val('1');
        }
        return Promise.resolve($.ajax({
        type: 'POST',
        url: util.ajaxUrl(Urls.addProduct),
        data: $form.serialize()
        })).then(function (response) {
        //TODO: Temp
        	minicart.showNoScroll(response);

        // handle error in the response
        if (response.error) {
            throw new Error(response.error);
        } else {
            return response;
        }
    });
    });    
    
    // handle sorting change
    $main.on('click', '.sort-by a', function (e) {
        e.preventDefault();
		var sortRule = $(this).attr('data-sort');
		$('.sort-sr-only').text(sortRule + ' sort applied successfully, loading the results');
        updateProductListing(this.href);

		var selectedSortText = $(this).text().trim().split('\n');
        $("#sort-selected-value").text(selectedSortText[0]);
        
    	
   	 	//for mParticle event
        if (SitePreferences.MPARTICLE_ENABLED) {
         var deviceType = util.isMobile()? 'mobile' : 'desktop';
         var refinementType = refinementTypes(deviceType);
            
		 var searchRefinements = {};
		 searchRefinements.skinType = refinementType.skinType.join(',');
		 searchRefinements.skinConcerns = refinementType.skinConcerns.join(',');
		 searchRefinements.sortBy = selectedSortText[0];
		 searchRefinements.category = $('#categoryValue').val();
		 setTimeout(function(){ window.mParticleSearchRefinements(searchRefinements); }, 1000);
   	 	}
        
    })
    .on('change', '.items-per-page select', function () {
        var refineUrl = $(this).find('option:selected').val();
        if (refineUrl === 'INFINITE_SCROLL') {
            $('html').addClass('infinite-scroll').removeClass('disable-infinite-scroll');
        } else {
            $('html').addClass('disable-infinite-scroll').removeClass('infinite-scroll');
            updateProductListing(refineUrl);
        }
    });
    

    
    $main.on( 'click', '.dropdown-menu a', function( event ) {
    		filterChecked(event);
	});
	
	  $(document).on("click",".video-play-pause.pause",function(){
		$(this).parent().find('video')[0].pause();
      	$(this).removeClass("pause");
        $(this).addClass("play");
		$(this).attr("aria-label",$(this).attr("aria-label").replace("Pause","Play"));
		
  	 })
 	$(document).on("click",".video-play-pause.play",function(){
		$(this).parent().find('video')[0].play();
        $(this).removeClass("play");
        $(this).addClass("pause");
		$(this).attr("aria-label",$(this).attr("aria-label").replace("Play","Pause"));
   	})
	$(document).on("keyup",".video-play-pause",function(event){
		if(event.keyCode === 13){
			$(this).click();
		}
	})
	if($(".promo-video").length>0){
		$(".video-play-pause").eq(0).addClass("pause");
		$(".video-play-pause").eq(0).removeClass("play");
		$(".promo-video")[0].play();
		$(".video-play-pause").eq(0).attr("aria-label",$(".video-play-pause").eq(0).attr("aria-label").replace("Play","Pause"));
	}
	

	

        
}

//Focus the compare checkbox
$('.compare-checkbox').on("keydown", function(e){
	if(e.keyCode === 32 ){
		if($(this).find('.compare-check').prop("checked") == true){
			$(this).find('.compare-check').prop( "checked", false );
		}else{
			$(this).find('.compare-check').prop( "checked", true );
		}
		showCompareWidget($(this).find('.compare-check')[0]);
		return false;
	}
});

$(document).on("click", '.prd-refinement', function(e){
	e.preventDefault();
	productRefinmentCheck(this);
});

$(document).on("keydown", '.prd-refinement', function(e){
	if(e.keyCode === 32 || e.keyCode === 13 ){
        e.preventDefault();
		$(this).trigger('click');
	}
	$(this).focus();
});

function productRefinmentCheck(currentElement){
	var currEl = $(currentElement);
	
	if(currEl.prop("checked") == true){
		if($('#prd-checked').length){
			//currEl.prop("checked", true);
			currEl.closest('a').next('#prd-checked').text('checked');
        }
	}else{
		if($('#prd-checked').length){
			//currEl.prop("checked", false);
			currEl.closest('a').next('#prd-checked').text('not checked');
        }
	}
}

function showCompareWidget(compareCheckbox){
	var cb = $(compareCheckbox);
    var tile = cb.closest('.product-tile');
    
    if(compareCheckbox.checked && compareWidget.hasReachedMaxLimit(true)) {
    	return false;
    } else {
    	
    	if(!compareCheckbox.checked && compareWidget.hasReachedMaxLimit(true)) {
    		compareWidget.enableCompareField();
    	}
    	
    	var func = compareCheckbox.checked ? compareWidget.addProduct : compareWidget.removeProduct;
    	
    	var checked = compareCheckbox.checked;        	
    	var dataId = tile.find('a.thumb-link').attr('data-id');
    	var allElements = $('a.thumb-link[data-id="'+ dataId +'"]');
    	if (allElements.length > 1) {
    		allElements.each(function(index, element){
    			var ptile = element.closest('.product-tile');
    			$(ptile).find('input[type="checkbox"].compare-check').prop("checked", checked);
    		})
    	}
    	
        var itemImg = tile.find('.product-img-block img.product-img').first();
        func({
            itemid: tile.data('itemid'),
            name: tile.data('name'),
            uuid: tile[0].id,
            img: itemImg,
            cb: cb
        });
    }

}

/*$('.compare-check').on("keyup", function(e){
	if(e.keyCode === 9){
		$(this).parent().addClass('compare-box-focus');
		e.stopPropagation();
		e.preventDefault();
	}
});

$('.compare-check').on("blur", function(){
	$(this).parent().removeClass('compare-box-focus'); 
});*/

$('.modal-mobile-filters a').on('click', function(e) {
    e.preventDefault();
    filterChecked(e);
});


$('body').on('click','.mobile-filter-apply', function(e) {
    e.preventDefault();

    var q = generateQueryString('mobile');
    var url = window.location.origin+window.location.pathname;
    
    if(q!='?'){
		url += q;
    }
    
    updateProductListing(url,"mobile");
    
    $('.modal-mobile-filters').modal('hide');
    
});

function refinementTypes(device){
	
	var isTravelSize = [];
	var skinConcerns = [];
	var skinType  = [];
	
	if(device==='desktop'){
		
		$('#filterskinType').parent().find('.dropdown-menu input').each(function(index,checkbox){
		 	   if(checkbox.checked){
		 		   skinType.push($(checkbox).attr('data-filter-code'));
		 	   }
		 });
		
		$('#filterskinConcerns').parent().find('.dropdown-menu input').each(function(index,checkbox){
		 	   if(checkbox.checked){
		 		  skinConcerns.push($(checkbox).attr('data-filter-code'));
		 	   }
		 });
		
		$('#filterisTravelSize').parent().find('.dropdown-menu input').each(function(index,checkbox){
		 	   var status;
			   if(checkbox.checked){
		 		 
		 		 if($(checkbox).parent().text() === "Full Size"){
		 			status = false;
		 		 }
		 		 if($(checkbox).parent().text() === "Travel Size"){
			 		status = true;
			 	 } 
		 		 isTravelSize.push(status);
		 	   }
		 });
	}
	
	if(device==='mobile'){
		
		$('#mobileFilterskinType').find('input').each(function(index,checkbox){
		 	   if(checkbox.checked){
		 		   skinType.push($(checkbox).attr('data-filter-code'));
		 	   }
		 });
		
		$('#mobileFilterskinConcerns').find('input').each(function(index,checkbox){
		 	   if(checkbox.checked){
		 		  skinConcerns.push($(checkbox).attr('data-filter-code'));
		 	   }
		 });
		
		$('#mobileFilterisTravelSize').find('input').each(function(index,checkbox){
		 	   var status;
			   if(checkbox.checked){
		 		 
		 		 if($(checkbox).parent().text() === "Full Size"){
		 			status = false;
		 		 }
		 		 if($(checkbox).parent().text() === "Travel Size"){
			 		status = true;
			 	 } 
		 		 isTravelSize.push(status);
		 	   }
		 });
	
	}
	
	var refinement = {
			skinType : skinType,
			skinConcerns : skinConcerns,
			isTravelSize : isTravelSize
	};
	
	return refinement;
}

function generateQueryString(device){
	
	
	 var refinementType = refinementTypes(device);
	 var refinement = {};
	 
	 refinement['skinType'] =  refinementType.skinType.join('|');
	 refinement['skinConcerns'] = refinementType.skinConcerns.join('|');
	 refinement['isTravelSize'] = refinementType.isTravelSize.join('|');
	 
	 var index = 0,q=[];
	 
	 for(var type in refinement){
		
		if(refinement[type]){
			index++;
			q.push('prefn'+index+'='+type);
			q.push('prefv'+index+'='+refinement[type]);		
		}
	 }
	 
	 var sortSelection = $('#sort-selected-value').text().trim();
	 var sortAttr ="";
	 if(sortSelection=="Featured"){
		sortAttr = "&srule=featured&sz=12&start=0";
	 }
	 else if(sortSelection=="Price (low to high)"){
		sortAttr = "&srule=price-low-to-high&sz=12&start=0"; 
	 }
	 else if(sortSelection=="Price (high to low)"){
		sortAttr = "?srule=price-high-to-low&sz=12&start=0";
	 }
	 else if(sortSelection=="Product name (A to Z)"){
		sortAttr = "&srule=product-name-ascending&sz=12&start=0"; 
	 }
	 
	 if (SitePreferences.MPARTICLE_ENABLED) {
		 var searchRefinements = {};
		 searchRefinements.skinType = refinementType.skinType.join(',');
		 searchRefinements.skinConcerns = refinementType.skinConcerns.join(',');
		 searchRefinements.sortBy = sortSelection;
		 searchRefinements.category = $('#categoryValue').val();
		 setTimeout(function(){ window.mParticleSearchRefinements(searchRefinements); }, 1000);
	 }
	 
	 return "?"+encodeURI(q.join('&'))+sortAttr;  

}

$('body').on('click', '.filter-cta-container .btn', function(e) {
    e.preventDefault();
    //$(this).find('.sr-only').text('Selected filters applied, loading the results');
    $('div.filter-result').text('Selected filters applied successfully, loading the results');
    var q = generateQueryString('desktop');
    var url = window.location.origin+window.location.pathname;
    
    if(q!='?'){
    		url += q;
    }
    updateProductListing(url);
    
});

$('body').on('click', '.clear-filter, .clear-filters-mobile', function(e) {
    e.preventDefault();
    var url = window.location.origin+window.location.pathname;
    
    var sortSelection = $('#sort-selected-value').text().trim();
	var sortAttr ="";
	 
	 if(sortSelection=="Featured"){
		sortAttr = "?srule=featured&sz=12&start=0";
	 }
	 else if(sortSelection=="Price (low to high)"){
		sortAttr = "?srule=price-low-to-high&sz=12&start=0"; 
	 }
	 else if(sortSelection=="Price (high to low)"){
		sortAttr = "?srule=price-high-to-low&sz=12&start=0";
	 }
	 else if(sortSelection=="Product name (A to Z)"){
		sortAttr = "?srule=product-name-ascending&sz=12&start=0"; 
	 }
	
	//$('.clear-filter-loading').text('Loading the results');
	 $('div.filter-result').text('All filters cleared successfully, loading the results');

	$('.modal-mobile-filters').find('input').each(function(index,checkbox){
        if(checkbox.checked){
			$(checkbox).prop("checked", false);
            $(checkbox).removeAttr("checked");
        }
    });
    
    $('.filters-mobile .view-option-value').empty().append("Select Options");

	if(util.isMobile()) {
		$('.clear-filters-mobile').hide();
	}

    updateProductListing(url+"?"+sortAttr);
    
    $('.clear-filter').hide();
	$('.clear-filter').removeClass('d-xl-inline-block');
	
	
});


$( ".gc-skintype-filter , .gc-solution-filter" ).change(function() {
	 $('.loader-preventive').show();
	  $(location).attr('href', $(this).find("option:selected").data('url'));
});


function filterSelectionUI(filterType){
	var selectedList = [];
	var filterTypeSelector = $(filterType).parent();
	var selectedType = filterTypeSelector.find('.view-option-value').text();
	 
	filterTypeSelector.find('.dropdown-menu input').each(function(index,checkbox){
	 	   if(checkbox.checked){
	 		   selectedList.push($(checkbox).parent().text());
	 	   }
	 });
	 
	 if(selectedList.length===1){
	 		$(filterType).find('.view-option-value').empty().append(selectedList[0])	
	 		$('.clear-filter').show();
			$('.clear-filter').addClass('d-xl-inline-block');
			$('.clear-filters-mobile').show();
	 } else if(selectedList.length>1){
	 		$(filterType).find('.view-option-value').empty().append("(Multiple...)");
			$('.clear-filter').show();
	 		$('.clear-filter').addClass('d-xl-inline-block');
			$('.clear-filters-mobile').show();
	 } else{
	 		$(filterType).find('.view-option-value').empty().append(selectedType);
	 		
	 } 	
}

function filterSelectionUIMobile(selector){
	
	var selectedList = [];
	var filterTypeSelector = $(selector);
	
	filterTypeSelector.find('input').each(function(index,checkbox){
		if(checkbox.checked){
				selectedList.push($(checkbox).parent().text());
	 	}
	});
	
	var selectedType = $('.filters-mobile .view-option-value').text();
	
	if(selectedList.length===1){
		$('.filters-mobile .view-option-value').empty().append(selectedList[0])	
		$('.clear-filter').show();
		$('.clear-filter').addClass('d-xl-inline-block');
		if(util.isMobile()) {
			$('.clear-filters-mobile').show();
		}
	} else if(selectedList.length>1){
		$('.filters-mobile .view-option-value').empty().append("(Multiple...)");
		$('.clear-filter').show();
		$('.clear-filter').addClass('d-xl-inline-block');
		if(util.isMobile()) {
			$('.clear-filters-mobile').show();
		}
	} else{
		$('.filters-mobile .view-option-value').empty().append(selectedType);
		if(util.isMobile()) {
			$('.clear-filters-mobile').hide();
		}
		
	 } 	
	
}

function resetFilterSelection(selector){

    $(selector).find("input").each(function(index,element){ 
	    var status = $(element).attr("data-filter-checked");
	 	if(status){
	 		$(element).prop( 'checked', true);
	 		$(element).attr('checked','true');	
	 	}
	 	else{
	 		$(element).removeProp( 'checked')
	 		$(element).removeAttr('checked');		
	 	}
    });	
}

function checkPageToLoad() {
	let pageNumber = sessionStorage['pageCount'] ? sessionStorage['pageCount'] : 1;
	if(pageNumber > 1) {
		getNextProductSet('http://dev01-na01-tatcha.demandware.net/s/tatcha/category/shop-all/?ad=false&sz=12&start=12&format=page-element&lang=default');
	}
}

function replaceUrlParam(url, paramName, paramValue){
    if (paramValue == null) {
        paramValue = '';
    }
    var pattern = new RegExp('\\b('+paramName+'=).*?(&|$)');
    if (url.search(pattern)>=0) {
        return url.replace(pattern,'$1' + paramValue + '$2');
    }
    url = url.replace(/\?$/,'');
    return url + (url.indexOf('?')>0 ? '&' : '?') + paramName + '=' + paramValue;
}

exports.init = function () {
    compareWidget.init();
    if (SitePreferences.LISTING_INFINITE_SCROLL) {
        $(window).on('scroll', infiniteScroll);
    }
    addToCart();
    productTile.init();
    initializeEvents();
    var w = window.outerWidth;
    $('.clear-filter').hide();
	$('.clear-filter').removeClass('d-xl-inline-block');
	if(util.isMobile()) {
		$('.clear-filters-mobile').hide();
	}
    if(w>768){
 	   filterSelectionUI('#filterskinType');
 	   filterSelectionUI('#filterskinConcerns');
 	   filterSelectionUI('#filterisTravelSize');  	  
     }
    else{
    	   filterSelectionUIMobile('.modal-mobile-filters');
    }
    
    $('.dropdown.refinement').on('hide.bs.dropdown', function(e) {
    		resetFilterSelection('.filters-desktop');
    });
  
    $('.modal-mobile-filters .close').on('click', function () {
    		resetFilterSelection('.modal-mobile-filters');
    });
    
    $(document).on('click', '.search-result-content .product-view-link', function (e) {
    	
    	sessionStorage['selected-pid'] = e.currentTarget.getAttribute('data-id');
    	let url = replaceUrlParam(location.href, 'pageNum', pageLoadedCount);
    	window.history.replaceState({}, "", url);
    });
	//$('.product-count').text($('.product-hit-tile').length +" products");
    
};
