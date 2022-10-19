'use strict';
var dialog = require('../../dialog');
var util = require('../../util');
var qs = require('qs');
var url = require('url');
//Lodash is removed from codebase. If we need to use this functionality need to implement lodash api with plain JS
/*var _ = require('lodash');*/
var zoomMediaQuery = matchMedia('(min-width: 960px)');
var colorbox = require('../../colorbox');
var isVideoIconClick = false;

/**
 * @description Sets the main image attributes and the href for the surrounding <a> tag
 * @param {Object} atts Object with url, alt, title and hires properties
 */
function setMainImage (atts) {
    $('#pdpMain .primary-image').attr({
        src: atts.url,
        alt: atts.alt,
        title: atts.title
    });
    
    $('#pdpMain .product-image-popup').attr({
        href: atts.url
    });
    
    updatePinButton(atts.url);
    if (!dialog.isActive() && !util.isMobile()) {
        $('#pdpMain .main-image').attr('href', atts.hires);
    }
}

function updatePinButton (imageUrl) {
    var pinButton = document.querySelector('.share-icon[data-share=pinterest]');
    if (!pinButton) {
        return;
    }
    var newUrl = imageUrl;
    if (!imageUrl) {
        newUrl = document.querySelector('#pdpMain .primary-image').getAttribute('src');
    }
    var href = url.parse(pinButton.href);
    var query = qs.parse(href.query);
    query.media = url.resolve(window.location.href, newUrl);
    query.url = window.location.href;
   /* var newHref = url.format(_.extend({}, href, {
        query: query, // query is only used if search is absent
        search: qs.stringify(query)
    }));
    pinButton.href = newHref;*/
}

/**
 * @description Replaces the images in the image container, for eg. when a different color was clicked.
 */
var isVariation = false;
function replaceImages () {
    var $newImages = $('#update-images'),
        $imageContainer = $('#pdpMain .product-image-container');
    if ($newImages.length === 0) { return; }

    $imageContainer.html($newImages.html());
    $newImages.remove();
    
    var elem = document.querySelector('.product-thumbnails-carousel')
    var flkty = new Flickity( elem, {
		  cellAlign: 'left',
		  contain: true,
		  imagesLoaded: true,
		  percentPosition: false,
		  freeScroll: true,
		  prevNextButtons: false,
		  pageDots: false
	});
    
    colorbox.init();
    isVideoActive = false;
    isVariation = true;
}

/* @module image
 * @description this module handles the primary image viewer on PDP
 **/

/**
 * @description by default, this function sets up zoom and event handler for thumbnail click
 **/
var player, videoURL, videoSource;
module.exports = function () {
    if (dialog.isActive() || util.isMobile()) {
        $('#pdpMain .main-image').removeAttr('href');
    }
    
    $('#pdpMain').on('click', '#video-thumbnail-play-icon', function(e) {
    	$(this).parent().find('.productthumbnail').trigger('click');
    });
    
    $('#pdpMain').on('keyup','.product-thumbnail', function(e){
    	if(e.keyCode === 13){
    		switchProductThumbnail($(this).find('.productthumbnail'));
    	}
    });    
    
    //updatePinButton();
    // handle product thumbnail click event
    $('#pdpMain').on('click', '.productthumbnail', function () {
        // switch indicator
    	switchProductThumbnail(this); 
    });
	$(document).on('keyup','.primary-image',function(e){
		if(e.keyCode === 9){
    		$carousel.flickity('next');
    	}
	})
		
		var flkty =  Flickity('.product-carousel')
		flkty.on( 'change', function( index ) {
			switchProductThumbnail(this);
		});
    var $carousel = $('.carousel.product-img-main').flickity();

    $('.carousel-nav').on( 'click', '.productthumbnail', function() {
		var index = $(this).data('index');
		$carousel.flickity( 'select', index );	  
	});
        
	$('.carousel-nav').on( 'keyup', '.productthumbnail', function(event) {
		if(event.keyCode === 13){
			$(this).trigger('click');	
		}		 
	});
	
    $carousel.on('change.flickity', function( event, index ) {
    	$('.carousel-nav.product-thumbnails-carousel').find('.is-nav-selected').removeClass('is-nav-selected');
    	$('.carousel-nav.product-thumbnails-carousel div:eq('+index+')').addClass('is-nav-selected');
    	if($('.carousel-nav.product-thumbnails-carousel div:eq('+index+')').find('.video-thumbnail').length > 0){
    		switchProductThumbnail($('.carousel-nav.product-thumbnails-carousel div:eq('+index+')').find('.productthumbnail'));
    	} else {    	
	    	var vSource = $('.product-thumbnail.video-thumbnail img').attr('data-source');
	    	if(player) {
	    		if(vSource == 'null' || vSource === 'youtube'){
	    			pauseVideo();
	    		}else if (vSource === 'vimeo') {
	    			pauseVimeoVideo();
	    		}
	        }
    	}
		
	});
		
		$(".product-thumbnail").on("click",function(){
			var videoSource = $('.product-thumbnail.video-thumbnail img').attr('data-source');
				if(player){
					 if(videoSource == 'null' || videoSource === 'youtube'){
			    		pauseVideo();
			    	}else if (videoSource === 'vimeo') {
			    		pauseVimeoVideo();
					}
				}
		})
		
		$(".product-carousel .flickity-page-dots li").on("click",function(){
			if($(".product-carousel .flickity-page-dots li.is-selected")){
				var videoSource = $('.product-thumbnail.video-thumbnail img').attr('data-source');
				if(player){
					 if(videoSource == 'null' || videoSource === 'youtube'){
			    		pauseVideo();
			    	}else if (videoSource === 'vimeo') {
			    		pauseVimeoVideo();
					}
				}
			}
		})
		
		$(document).on("click",".video-icon-thumbnail",function(){
			Flickity('.product-carousel').select($(".product-carousel .flickity-page-dots li").length-1);
			isVideoIconClick = true;
			switchProductThumbnail();
			/*var videoSource = $('.video-thumbnail img').attr('data-source');
			setTimeout(function(){
				if(player){
					 if(videoSource == 'null' || videoSource === 'youtube'){
			    		playVideo();
			    	}else if (videoSource === 'vimeo') {
			    		playVimeoVideo();
					}
				}
			},5000);*/
		})
		
		$(".video-thumbnail").on("click",function(){
			Flickity('.product-carousel').select($(".product-carousel .flickity-page-dots li").length-1);
			switchProductThumbnail();
			var videoSource = $('.product-thumbnail.video-thumbnail img').attr('data-source');
			setTimeout(function(){
				if(player){
					 if(videoSource == 'null' || videoSource === 'youtube'){
			    		playVideo();
			    	}else if (videoSource === 'vimeo') {
			    		playVimeoVideo();
					}
				}
			},1000);
		})
	
};

function switchProductThumbnail(imageElement){ 
	
	//GTM change - RDMP-3315
	if(typeof(imageElement) != 'undefined'){
		var event = '';
		if($('#video-container.is-selected').length > 0){
			event = 'mobile_image_carousel_pagination_movie';
		}else if($('#image-container.is-selected').length > 0){
			event = 'mobile_image_carousel_pagination';
		}
		
		try {			
			if (!window.dataLayer) {
				window.dataLayer = [];
			}			
			dataLayer.push({
				'event': event,
				'aria-label': $('.flickity-page-dots li.is-selected').attr('aria-label') || ''
	    	});			
		} catch(e) {
			
		} 
	}
	
    	if($(".video-cell.is-selected").length>0){
			var videoElement = $(".video-cell.is-selected").find('img');
			videoSource = $(videoElement).attr("data-source");
			imageElement = videoElement; 
			/*if(player){
				 if(videoSource == 'null' || videoSource === 'youtube'){
		    		pauseVideo();
		    	}else if (videoSource === 'vimeo') {
		    		pauseVimeoVideo();
				}
			}*/
		}else{
			videoSource = $('.product-thumbnail.video-thumbnail img').attr('data-source');
			//videoSource = $(videoElement).attr("data-source")
			if(player){
				if(videoSource == 'null' || videoSource === 'youtube'){
		    		pauseVideo();
		    	}else if (videoSource === 'vimeo') {
		    		pauseVimeoVideo();
				}	
			}
			
			//player = null;
		}
	
	videoSource = $(imageElement).attr("data-source");
	if(videoSource == 'null' || videoSource === 'youtube'){        		
		if($(imageElement).attr("data-video") !== videoURL || isVariation) {
    		isVariation = isVariation ? !isVariation : isVariation;
    		videoURL = $(imageElement).attr("data-video");
			$(imageElement).removeClass("d-none");
	        player = new YT.Player('player', {
	            videoId: $(imageElement).attr("data-video"),
	            playerVars: { 'controls': 1,'rel' : 0 },
	            events: {
	                'onReady': onPlayerReady
	            }
            });
    	} else {
    		if(player) {
    			checkScroll(); 
    		}
    	}
	} else if (videoSource === 'vimeo') {
		if($(imageElement).attr("data-video") !== videoURL || isVariation) {
    		isVariation = isVariation ? !isVariation : isVariation;
    		videoURL = $(imageElement).attr("data-video");
    		var options = {
		        id: videoURL,
		        height: "350",
				texttrack:"en",
				autoplay: isVideoIconClick
		    };
    		
    		player = new Vimeo.Player('player', options);

    		player.ready().then(function() {
			
			$('#player').find("iframe").attr('id','vimeoplayer');
    			onPlayVimeo();
				if(isVideoIconClick) {
					playVimeoVideo();
					isVideoIconClick = false;
				}
    		}).catch(function(err){
    			
    		});
    		
    	} else {
    		if(player) {
    			checkScroll();
    		}
    	}
	}
}
 
var videos = document.getElementsByTagName("iframe"), fraction = 0.7;

function checkScroll() {

  for(var i = 0; i < videos.length; i++) {
    var video = videos[i];

    var xValue = 0,
        yValue = 0,
        containerWidth = video.width,
        containerHeight = video.height,
        rightPosition, //right
        bottomPosition, //bottom 
        visibleX, visibleY, visible,
        parent;

    
    parent = video;
    while (parent && parent !== document.body) {
      xValue += parent.offsetLeft;
      yValue += parent.offsetTop;
      parent = parent.offsetParent;
    }

    rightPosition = xValue + parseInt(containerWidth);
    bottomPosition = yValue + parseInt(containerHeight);
   

    visibleX = Math.max(0, Math.min(containerWidth, window.pageXOffset + window.innerWidth - xValue, rightPosition - window.pageXOffset));
    visibleY = Math.max(0, Math.min(containerHeight, window.pageYOffset + window.innerHeight - yValue, bottomPosition - window.pageYOffset));
    

    visible = visibleX * visibleY / (containerWidth * containerHeight);

   //add p page v1 condition
    	
	
	
/*		if(!isInViewport($(".video-cell.is-selected")[0])){
			 if(videoSource == 'null' || videoSource === 'youtube'){
		    		pauseVideo();
		    	}else if (videoSource === 'vimeo') {
		    		pauseVimeoVideo();
				}
		
		}else{
			if(videoSource == 'null' || videoSource === 'youtube'){
		    		  playVideo();
		    	  }else if (videoSource === 'vimeo') {
		    		  playVimeoVideo();
		    	  }
		}*/
	
		
  }

};

function onPlayerReady(event) {
	window.addEventListener('scroll', checkScroll, false);
    window.addEventListener('resize', checkScroll, false);
    
    //event.target.playVideo();
	if(isVideoIconClick) {
		event.target.playVideo();
		isVideoIconClick = false;
	}
}

function onPlayVimeo() {
	window.addEventListener('scroll', checkScroll, false);
    window.addEventListener('resize', checkScroll, false);
    
   // playVimeoVideo();
}

function stopVideo() {
	player.stopVideo();
}

function playVideo() {
  player.playVideo();
};

function pauseVideo() {
  player.pauseVideo();
};

function playVimeoVideo() {
	player.play().then(function(){
	}).catch(function(error) {
		console.log('error--', error);
	});
};

function pauseVimeoVideo() {
	player.pause().then(function(){
	}).catch(function(error) {
	});
};

function isInViewport(element) {
	const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );

    }
   

$(document).ready(function() {
	//removing the tabindex from thumbnails div
    $('#pdpMain #thumbnails').removeAttr('tabIndex');
    $('#pdpMain #thumbnails .carousel-cell').removeAttr('tabIndex');
    
    //removing aria-label
    $('#pdpMain button.flickity-prev-next-button').removeAttr('aria-label');
});

module.exports.setMainImage = setMainImage;
module.exports.replaceImages = replaceImages;
