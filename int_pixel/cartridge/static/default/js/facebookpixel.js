

function sendEventTrigger(pageURL, eventData , eventName){
	$.ajax({
        type: 'POST',
        data:{
        	sourceurl : pageURL,
        	eventData : eventData,
        	eventName: eventName
        }, 
        url: Urls.facebookEventTrigger,
        success:function(response) {
        	return true;
        }
    });
}

function addToCartFbPixel(prodElement, pageURL) {
	var productInfo = $(prodElement).data('product-info');	
	var quantity =  $(prodElement).closest('form').find('select[name="Quantity"]').val();    	
    if(productInfo){
		productInfo.quantity = (quantity)?quantity:1;
    }
    sendEventTrigger(pageURL, JSON.stringify(productInfo), 'AddToCart');
}

$( document ).ready(function() {
	
	var pageURL = window.location.href;
	
	/* All page view event 
	 * commenting since it is triggering automatically
	 * */
	//sendEventTrigger(pageURL,'', 'PageView');
	
	/* Product view event*/
	var productPath = (pageURL.indexOf('/product/') > -1) ? true : false;
	if(productPath){
		var product = $('.product-add-to-cart #add-to-cart').data('product-info');
		var prodInfo = JSON.stringify(product);
		sendEventTrigger(pageURL, prodInfo, 'View Content');
	}
	
	/*Add to cart Event tracking*/
	$(document).on('click' , 'button[data-product-info], a[data-product-info]',function(){    	
		addToCartFbPixel(this,pageURL);
    });
	
	$(document).on('click' , 'div.add-minicart-empty-item', function(){  
		addToCartFbPixel($(this).closest('.empty-bag-item'),pageURL);
		
    });
	
	$('.carousel-add-to-cart, .full-width-panel-add-to-bag').click(function(){	
		addToCartFbPixel(this,pageURL);
    });
	
	/*Upsell product Add to cart*/
	$('.upsell-product-add-to-cart, .add-all-rf').click(function(){
		//var productInfoList = [];
		$('.mparticle-product').each(function(){
			var visible = $(this).closest('.product-list-col').length > 0 ? $(this).closest('.product-list-col').is(':visible') : true;
			if(visible) {
				var product = $(this).data('product-info');
				var quantity =  $(this).closest('form').find('select[name="Quantity"]').val();  
				if(product){
					product.quantity = (quantity)?quantity:1;
				}		        
			}
		});
		sendEventTrigger(pageURL, JSON.stringify(product), 'AddToCart');
    });
	
	/*Initiate checkout event*/
	setTimeout(function() {
		var checkoutPath = (pageURL.indexOf('/checkout/') > -1) ? true : false;
		if(checkoutPath){
			var fbbasketDetails = $('#fbbasketDetails').data('basket-info');
			if(fbbasketDetails != null){
				sendEventTrigger(pageURL, JSON.stringify(fbbasketDetails), 'InitiateCheckout');
			}
		}
	}, 3000);
	
	
	/*purchase event*/
	setTimeout(function() {
	var confirmationPath = (window.location.href.indexOf('/checkout/confirmation') > -1) ? true : false;
	if(confirmationPath){
		var fborderDetails = $('#fborderDetails').data('order-info');
		if(fborderDetails != null){
			sendEventTrigger(pageURL, JSON.stringify(fborderDetails), 'Purchase');
		}
	 }
	}, 3000);
});
