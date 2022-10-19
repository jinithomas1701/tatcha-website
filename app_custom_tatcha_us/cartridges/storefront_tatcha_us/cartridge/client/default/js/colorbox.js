
var colorbox = {
	init: function(){
        $.colorbox.settings.close = '<i class="fal fa-times"></i>';
        $.colorbox.settings.maxWidth = '95%';
        $.colorbox.settings.maxHeight = '95%';
        $.colorbox.settings.rel = false;
        $(".product-image-popup").colorbox();
	}			
};

module.exports = colorbox;