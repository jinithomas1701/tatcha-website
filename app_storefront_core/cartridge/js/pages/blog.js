'use strict';

var addToCart = require('../pages/product/addToCart');
var progress = require('../progress');
var blogPage = getPageNumFromUrl() || 1;

function initializeEvents() {
	addToCart();
	
}

function getPageNumFromUrl() {
	let urlParams = location.search;
	let pageNumParam;
	if (urlParams.indexOf('blogPage') > -1) {
		try {
			pageNumParam = parseInt(urlParams.split('blogPage=')[1]);
		} catch (e) {
			throw e;
		}
    } else {
    	pageNumParam =  undefined;
    }
	return pageNumParam;
}

$(document).on('click','.blog-more', function() {
	var api_url = $(this).attr('data-api-url');
	progress.show();
	$.ajax({
        type: 'GET',
        url: api_url,
        success: function (response) {
            // put response into cache
        	blogPage += 1;
        	$( ".blog-more-container" ).remove();
            $('.blog-index').append(response);
            progress.hide();
        }
    });
});

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

$(document).on('click','.blog-index-post', function() {
	let url = replaceUrlParam(location.href, 'blogPage', blogPage);
	window.history.replaceState({}, "", url);
});

var blog = {
	initializeEvents: initializeEvents,
	init: function () {
		initializeEvents();
	}
};

module.exports = blog;