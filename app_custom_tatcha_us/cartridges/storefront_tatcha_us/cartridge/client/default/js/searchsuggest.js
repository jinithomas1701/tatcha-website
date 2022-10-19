'use strict';

var util = require('./util');

var currentQuery = null,
    lastQuery = null,
    runningQuery = null,
    listTotal = -1,
    listCurrent = -1,
    delay = 30,
    mobile,
    $resultsContainer,
    searchType;
/**
 * @function
 * @description Handles keyboard's arrow keys
 * @param keyCode Code of an arrow key to be handled
 */
function handleArrowKeys(keyCode) {
    switch (keyCode) {
        case 38:
            // keyUp
            listCurrent = (listCurrent <= 0) ? (listTotal - 1) : (listCurrent - 1);
            break;
        case 40:
            // keyDown
            listCurrent = (listCurrent >= listTotal - 1) ? 0 : listCurrent + 1;
            //key down event handling - focus first element in the search result list
            $(".dropdown-product-list li a").first().focus();
            break;
        default:
            // reset
            listCurrent = -1;
            return false;
    }

    $resultsContainer.children().removeClass('selected').eq(listCurrent).addClass('selected');
    /*$('input[name="q"]').val($resultsContainer.find('.selected .suggestionterm').first().text());*/
    return true;
}

var searchsuggest = {
    /**
     * @function
     * @description Configures parameters and required object instances
     */
    init: function (container, defaultValue) {
        var $searchForm;
        var $searchField;
        $resultsContainer = null;
    		var w = window.outerWidth;

    		if(w<768){
    			mobile = true;
    			$searchForm = $(".simple-search-desktop");
    			$searchField = $searchForm.find('input[id="q"]');
    			$resultsContainer = $('<div/>').attr('class', 'dropdown-search-mobile-results').appendTo('.dropdown-search-mobile');
    		}
    		else{
    			mobile = false;
    			$searchForm = $(".simple-search-desktop");
    			$searchField = $searchForm.find('input[id="q"]');
    			searchType = $searchForm.find('input[id="q"]').attr('data-source') || 'bs4_search';
    		}

    		$(document).on("touchmove",".dropdown-search-mobile-results",function(){
    			$(".search-mobile-input input").blur();
    		});

        // disable browser auto complete
        $searchField.attr('autocomplete', 'off');

        // on focus listener (clear default value)
        $searchField.focus(function () {
            if (!$resultsContainer) {
                // create results container if needed

	        		if(w<768){
	        			$resultsContainer = $('<div/>').attr('class', 'dropdown-search-mobile-results').appendTo('.dropdown-search-mobile')
	        		}
	        		else{
	        			$resultsContainer = $('<div/>').attr('class', 'dropdown-menu dropdown-search dropdown-search-desktop').appendTo($searchForm);
	        			if(searchType === "bs3_search"){
	        				$resultsContainer = $($resultsContainer).attr('id','bs3');
	        			}else{
	        				$resultsContainer = $($resultsContainer).attr('id','bs4');
	        			}
	        		}
            }
            if ($searchField.val() === defaultValue) {
                $searchField.val('');
            }
        });



        $(document).on('click touchstart', function (event) {

        	  if(!mobile){
        		  if (!$searchForm.is(event.target)) {
                    setTimeout(this.clearResults, 200);
               }
        	  }
        	  else{
        		  var formlen = $( event.target ).closest( ".simple-search-mobile" ).length
               var searchlen = $( event.target ).closest( ".navbar-search-icon" ).length

                  if(formlen===0 && searchlen===0){
                  		//$(".dropdown-search-mobile").hide();
               }

        	  }

        }.bind(this));
        // on key up listener
        $searchField.on("keyup change",function (e) {

        	if(e.target.value.length >= 1){
            	$('.clear-search').show();
        	}else{
        		$('.clear-search').hide();
        		$('.search-modal-dialog .recommendation-row').show();
                $('.search-modal-dialog .results-row').hide();
        	}

            if(e.target.value.length < 3){
	            	$resultsContainer.hide().empty();
            		return;
            }
            // get keyCode (window.event is for IE)
            var keyCode = e.keyCode || window.event.keyCode;

            // check and treat up and down arrows
            if (handleArrowKeys(keyCode)) {
                return;
            }
            // check for an ENTER or ESC
            if (keyCode === 13 || keyCode === 27) {
                this.clearResults();
                return;
            }

            currentQuery = $searchField.val().trim();

            // no query currently running, init an update
            if (!runningQuery) {
                runningQuery = currentQuery;
                setTimeout(this.suggest.bind(this), delay);
            }
        }.bind(this));

        //new search close
        $('.search-modal-dialog .clear-search').on('click' , function(e){
        	$('.navbar-search .search-input').val('');
        	$(this).hide();
        	$('.search-modal-dialog .recommendation-row').show();
            $('.search-modal-dialog .results-row').hide();
        });

        //search icon click
        $('.navbar-search .search-icon').on('click', function(e){
        	$(this).closest('form[name=simpleSearch').submit();
        });

        $(".search-form-list .input-group-addon, #searchDesktopModal .clear-search").on('keydown' , function(e){
            if(e.keyCode === 13){
                e.preventDefault();
             	$(this).trigger('click');
        	}
        });

    },

    /**
     * @function
     * @description trigger suggest action
     */
    suggest: function () {
    	var visibleItemsLength;
    	var visibleItemsArray;
    	var lastVisibleElement;
        // check whether query to execute (runningQuery) is still up to date and had not changed in the meanwhile
        // (we had a little delay)
        if (runningQuery !== currentQuery) {
            // update running query to the most recent search phrase
            runningQuery = currentQuery;
        }

        // if it's empty clear the results box and return
        if (runningQuery.length === 0) {
            this.clearResults();
            runningQuery = null;
            return;
        }

        // if the current search phrase is the same as for the last suggestion call, just return
        if (lastQuery === runningQuery) {
            runningQuery = null;
            return;
        }

        // build the request url
        var reqUrl = util.appendParamToURL(Urls.searchsuggest, 'q', runningQuery);

        // execute server call
        $.get(reqUrl, function (data) {
            var suggestionHTML = data,
                ansLength = suggestionHTML.trim().length;

            // if there are results populate the results div
            if (ansLength === 0) {
                this.clearResults();
            } else {
                // update the results div
            	$('.search-modal-dialog .results-row').html(suggestionHTML).fadeIn(200);
                $('#serach-suggestion-notification').text('Search suggetions found. To navigate through the list use Tab key');
                //new search update
                $('.search-modal-dialog .recommendation-row').hide();
                $('.search-modal-dialog .results-row').show();
            }

            // record the query that has been executed
            lastQuery = runningQuery;
            // reset currently running query
            runningQuery = null;

            // check for another required update (if current search phrase is different from just executed call)
            if (currentQuery !== lastQuery) {
                // ... and execute immediately if search has changed while this server call was in transit
                runningQuery = currentQuery;
                setTimeout(this.suggest.bind(this), delay);
            }
            this.hideLeftPanel();

            visibleItemsLength = $('.dropdown-product-list li:visible').length - 1;
            visibleItemsArray = $('.dropdown-product-list li:visible').toArray();
            //lastVisibleElement = visibleItemsArray[visibleItemsLength].getAttribute("data-pid");

        }.bind(this));

         //down arrow handling

        $(document).on("keyup", "#bs4 .dropdown-product-list li a" , function(e) {
        	traverseProducts(this,e);
        });

      //BS3 change
        $(document).on("keydown", "#bs3 .dropdown-product-list li a" , function(e) {
        	if(e.keyCode === 13){
        		$(this).trigger('click');
        	}else{
            	traverseProducts(this,e);
        	}
        });

        function traverseProducts(item,e){
        	e.preventDefault();
    		e.stopPropagation();
        	if(e.keyCode === 40) {

        		if($(item).attr("data-pid") === lastVisibleElement) {
        			$(".gtm-search-articles li a:first")[0].focus();
        		} else {
        			$(item).parent().next().find('a')[0].focus();
        		}
        	}else if(e.keyCode === 38){
        		if($(item).parent().is(':first-child')) {
        			$("#q").focus();
        		} else {
        			$(item).parent().prev().find('a')[0].focus();
        		}
        	}
        }

        $(document).on("keyup", "#bs4 .gtm-search-articles li a" , function(e) {
        	traverseArticles(this,e);
        });

        $(document).on("keydown", "#bs3 .gtm-search-articles li a" , function(e) {
        	if(e.keyCode === 13){
        		$(this).trigger('click');
        	}else{
            	traverseArticles(this,e);
        	}
        });

        function traverseArticles(article,e){
        	e.preventDefault();
    		e.stopPropagation();
        	if(e.keyCode === 40) {
        		if($(article).parent().is(':last-child')) {
        			$(".gtm-search-suggested-terms li a:first-child").focus();
        		} else {
        			$(article).parent().next().find('a')[0].focus();
        		}
        	} else if(e.keyCode === 38) {
        		if($(article).parent().is(':first-child')) {
        			$(".dropdown-product-list li a:eq("+visibleItemsLength+")")[0].focus();
        		} else {
        			$(article).parent().prev().find('a')[0].focus();
        		}
        	}
        }

        $(document).on("keyup", "#bs4 .gtm-search-suggested-terms li:last-child", function(e) {
        	setFocusToSeeAll(e);
        });

        $(document).on("keydown", "#bs3 .gtm-search-suggested-terms li:last-child", function(e) {
        	setFocusToSeeAll(e);
        });

        function setFocusToSeeAll(e){
        	if(e.keyCode === 40){
        		e.preventDefault();
        		e.stopPropagation();
        		$(".search-see-all a").focus();
        	}
        }

        $(document).on("keydown", "#bs3 .gtm-search-suggested-terms li a:first-child", function(e) {
        	setFocusToArticles(e);
        });

        $(document).on("keyup", "#bs4 .gtm-search-suggested-terms li a:first-child", function(e) {
        	setFocusToArticles(e);
        });

        function setFocusToArticles(e){
        	if(e.keyCode === 38){
        		e.preventDefault();
        		e.stopPropagation();
        		$(".gtm-search-articles li a").last().focus();
        	}
        }

        $(document).on("keydown", "#bs3 .search-see-all a", function(e) {
        	setFocusToTerms(e);
        });

        $(document).on("keyup", "#bs4 .search-see-all a", function(e) {
        	setFocusToTerms(e);
        });

        function setFocusToTerms(e){
        	if(e.keyCode === 38){
        		e.preventDefault();
        		e.stopPropagation();
        		$(".gtm-search-suggested-terms li a").last().focus();
        	}
        }

        /*$(document).on("keydown", ".dropdown-product-list li:first", function(e) {
        	e.preventDefault();
    		e.stopPropagation();
        	if(e.keyCode === 38){
        		$("#q").focus();
        	}
        });*/

        /*$(document).on("keydown", "#q", function(e) {
	    	if(e.keyCode === 9 && !event.shiftKey){
	        	e.preventDefault();
	        	$(".mini-cart a").focus();
	        }
    	});*/

    },
    /**
     * @function
     * @description
     */
    clearResults: function () {
        if (!$resultsContainer) { return; }
        $resultsContainer.fadeOut(200, function () {$resultsContainer.empty();});

    },
    /**
     * @function
     * @description
     */
    hideLeftPanel: function () {
        //hide left panel if there is only a matching suggested custom phrase
        if ($('.search-suggestion-left-panel-hit').length === 1 && $('.search-phrase-suggestion a').text().replace(/(^[\s]+|[\s]+$)/g, '').toUpperCase() === $('.search-suggestion-left-panel-hit a').text().toUpperCase()) {
            $('.search-suggestion-left-panel').css('display', 'none');
            $('.search-suggestion-wrapper-full').addClass('search-suggestion-wrapper');
            $('.search-suggestion-wrapper').removeClass('search-suggestion-wrapper-full');
        }
    }
};

module.exports = searchsuggest;
