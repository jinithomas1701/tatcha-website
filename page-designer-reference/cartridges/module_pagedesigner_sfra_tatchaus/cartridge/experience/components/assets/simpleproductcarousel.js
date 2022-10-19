'use strict';

var Template = require('dw/util/Template');
var ProductViewModel = require('*/cartridge/experience/viewmodels/ProductViewModel');

/**
 * Render logic for the assets.producttile.
 */
module.exports.render = function (context) {
    var content = context.content;

    var products = new dw.util.ArrayList();
    var model = new dw.util.HashMap();
    var product = content.product1;
    
    if(!empty(product)) {
    	products.add(product);
    }
    
    product = content.product2;
    
    if(!empty(product)) {
    	products.add(product);
    }
    
    product = content.product3;
    
    if(!empty(product)) {
    	products.add(product);
    }
    
    product = content.product4;
    
    if(!empty(product)) {
    	products.add(product);
    }
    
    product = content.product5;
    
    if(!empty(product)) {
    	products.add(product);
    }
    
    product = content.product6;
    
    if(!empty(product)) {
    	products.add(product);
    }
    
    product = content.product7;
    
    if(!empty(product)) {
    	products.add(product);
    }
    
    product = content.product8;
    
    if(!empty(product)) {
    	products.add(product);
    }
    
    if(content.topMargin) {
    	model.topMargin = content.topMargin;
    }
    
    if(content.bottomMargin) {
    	model.bottomMargin = content.bottomMargin;
    }
    
    model.products = products;

    return new Template('experience/components/assets/simpleproductcarousel').render(model).text;
};
