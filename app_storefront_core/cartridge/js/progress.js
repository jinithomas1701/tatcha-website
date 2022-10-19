'use strict';

var $loader;

var showFull = function (container) {
	$('.loader-preventive').show();
};

/**
 * @function
 * @description Shows an AJAX-loader on top of a given container
 * @param {Element} container The Element on top of which the AJAX-Loader will be shown
 */
var show = function (container) {
    var target = (!container || $(container).length === 0) ? $('body') : $(container);
    $loader = $loader || $('.sk-fading-circle');
    
    var $overlay = ($('.overlay').length===0) ? $('<div class="overlay"></div>') : $('.overlay');
    
   var loaderHTML = ['<div class="sk-circle1 sk-circle"></div>',
   '<div class="sk-circle2 sk-circle"></div>',
   '<div class="sk-circle3 sk-circle"></div>',
   '<div class="sk-circle4 sk-circle"></div>',
   '<div class="sk-circle5 sk-circle"></div>',
   '<div class="sk-circle6 sk-circle"></div>',
   '<div class="sk-circle7 sk-circle"></div>',
   '<div class="sk-circle8 sk-circle"></div>',
   '<div class="sk-circle9 sk-circle"></div>',
   '<div class="sk-circle10 sk-circle"></div>',
   '<div class="sk-circle11 sk-circle"></div>',
   '<div class="sk-circle12 sk-circle"></div>'].join('');

    if ($loader.length === 0) {
        $loader = $('<div/>').addClass('sk-fading-circle')
            .append($(loaderHTML));
    }
    
    $overlay.show();
    $(target).append($overlay);
    return $loader.appendTo(target).show();
};
/**
 * @function
 * @description Hides an AJAX-loader
 */
var hide = function () {
    if ($loader) {
        $loader.hide();
        $('.overlay').hide();
    }
};

var hideFull = function () {
	$('.loader-preventive').hide();
};

exports.show = show;
exports.hide = hide;
exports.showFull = showFull;
exports.hideFull = hideFull;
