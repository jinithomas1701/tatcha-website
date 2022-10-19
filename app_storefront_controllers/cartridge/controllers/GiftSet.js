'use strict';

/**
 * Controller that renders gift builder helper pages and snippets.
 *
 * @module controllers/GiftSet
 */

var params = request.httpParameterMap;

/* Script Modules */
var app = require('app_storefront_controllers/cartridge/scripts/app');
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var Transaction = require('dw/system/Transaction');
var ArrayList = require('dw/util/ArrayList');
var URLUtils = require('dw/web/URLUtils');
var params = request.httpParameterMap;

var addItemsToCart = function(){
	var mainId = params.mainProductId.stringValue;
    var selectedItems = params.selectedItems.stringValue;
    selectedItems = selectedItems ? selectedItems.split(',') : null;
    var cart = app.getModel('Cart').goc();
    var cartResult;

    if(selectedItems) {
        var list = new ArrayList();
        var gift = {'id': mainId, 'qty': 1};
        list.add(gift);

        for(var i=0; i < selectedItems.length; i++) {
            var item = {'id': selectedItems[i], 'qty': 1};
            list.add(item);
        }
        
        Transaction.wrap(function() {            
            cartResult = cart.addMultipleItems(list);
            var rand = selectedItems.length;
            var productLineItems = cart.getAllProductLineItems();
            for(var i=0; i < productLineItems.length; i++) {
                var productLineItem = productLineItems[i];
                if (productLineItem.product && selectedItems.indexOf(productLineItem.product.ID) != -1) {
                    if(productLineItem.custom.giftBuilderSku) {
                        productLineItem.custom.giftBuilderSku = productLineItem.custom.giftBuilderSku+'|'+mainId+'@'+rand;
                    } else {
                        productLineItem.custom.giftBuilderSku = mainId+'@'+rand;
                    }                    
                }
                if (productLineItem.product && productLineItem.product.ID == mainId) {
                    productLineItem.custom.giftBuilderSku = 'GiftSetMaster';
                }
            }
        });
    }
    if (request.httpParameterMap.format.stringValue === 'ajax') {
        var productInfo = [];
        for(var i=0; i < list.length; i++) {
    		var lineItem = cart.getProductLineItems(list[i]['id']);
    		productInfo.push(lineItem);
    	}
        app.getView('Cart', {
	        cart: cart,
	        product: productInfo,
	        lastAddedQuantity: 1,
	        cartQuantity: cart.getTotalCartQuantity(),
	        addedPreoducts : list,
	        gift : gift,
	        BonusDiscountLineItem: cartResult.BonusDiscountLineItem
	    }).render('product/components/addtobagmodal');
    } else {
        response.redirect(URLUtils.https('CartSFRA-Show'));
    }
    
}

exports.AddItemsToCart = guard.ensure(['post'], addItemsToCart);
