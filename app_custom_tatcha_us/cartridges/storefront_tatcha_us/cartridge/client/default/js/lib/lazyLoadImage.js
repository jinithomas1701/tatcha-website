/*
 * Lazy load - JavaScript plugin for lazy loading images
 */

"use strict";

(function(window, document) {
	/*
	 * Default values for LazyLoad
	 * */
	const defaults = {
		root : null,
		src :'data-src',
		srcset: 'data-srcset',
		selector: '.lazyImage',
		rootMargin: "0px",
        threshold: 0
	}
	
	function LazyLoad(images, options) {
		this.options = options;
		this.images = images || document.querySelectorAll(defaults.selector);
		this.observer = null;
		this.init();
	}
	
	LazyLoad.prototype = {
		init: function() {
			
			/*
			 * If Intersection observers are not supported by the browser load everything
			 * */
			if(!window.IntersectionObserver) {
				this.loadImages();
				return;
			}
			
			let self = this;
			let observerConfig = {
				root: this.options.root || defaults.root,
				rootMargin: this.options.rootMargin || defaults.rootMargin,
                threshold: this.options.threshold || defaults.threshold
			}
			
			this.observer =  new IntersectionObserver(function(items) {
				Array.prototype.forEach.call(items, function(item) {
					if(item.intersectionRatio > 0) {
						self.observer.unobserve(item.target);
						let src = item.target.getAttribute(defaults.src);
						
						if(item.target.tagName.toLowerCase() === 'img') {
							if(src) {
								item.target.src = src;
							}
						}
						
						if(item.target.tagName.toLowerCase() === 'source') {
							var srcset = item.target.getAttribute(defaults.srcset);
							if(srcset) {
								item.target.srcset = srcset;
							}
						}
					}
				})
			}, observerConfig)
			
			Array.prototype.forEach.call(this.images, function(image) {
				self.observer.observe(image)
			})
		},
		loadImages: function() {
			let self = this;
			
			Array.prototype.forEach.call(this.images, function(image) {
				let src = image ? image.getAttribute(defaults.src) : null;
				
				if(src !== null && image.tagName.toLowerCase() === 'img') {
					image.src = src;
				}
			})
		}
	}
	
	window.lazyLoad = function(images, options) {
		return new LazyLoad(images, options);
	}
	
})(window, document)