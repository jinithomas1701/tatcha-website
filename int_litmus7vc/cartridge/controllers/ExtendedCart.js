'use strict';

/**
 * Controller that adds and removes products and coupons in the cart.
 * Also provides functions for the continue shopping button and minicart.
 *
 * @module controllers/Cart
 */

/* API Includes */
var ArrayList = require('dw/util/ArrayList');
var ISML = require('dw/template/ISML');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');
var URLUtils = require('dw/web/URLUtils');

/* Script Modules */
var app = require('app_storefront_controllers/cartridge/scripts/app');
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var Logger = require('dw/system/Logger');

/**
 * Adds multiple products to cart via get call.
 */
function addMultipleProducts() {
	
	var logger = Logger.getLogger('ExtendedCart', 'custom - addMultipleProducts()');

	var cart = app.getModel('Cart').goc();
	var params = request.httpParameterMap;
	var productIds = params.pids.stringValue;
	var utm_source = params.utm_source ? params.utm_source.stringValue: "";
	var utm_medium = params.utm_medium ? params.utm_medium.stringValue: "";
	var utm_campaign = params.utm_campaign ? params.utm_campaign.stringValue: "";
	
	if(!empty(productIds)) {
		var Product = app.getModel('Product');
		var productIdList = productIds.split(',');
		var productId;
		var productOptionModel;

		try {
			if(!empty(productIdList)) {
				session.custom.NoCall = true;
				for (var i = 0; i < productIdList.length; i += 1) {
					productId = Product.get(productIdList[i]).object;
					var productToAdd = Product.get(productId);
					productOptionModel = productToAdd.updateOptionSelection(params);

					cart.addProductItem(productToAdd.object, 1, productOptionModel);
				}
			}
		} catch (e) {
			logger.error("Error adding products. Error: " + e.message);
		}
	}
	response.redirect(URLUtils.url('CartSFRA-Show', 'utm_source', utm_source, 'utm_medium', utm_medium, 'utm_campaign', utm_campaign));
}

/**
 * This method will add a list of products to cart and then
 *  return the minicart data
 *  response redirect: MiniCart-Show
 * */
function addMultipleProductsV2() {
	
	var logger = Logger.getLogger('ExtendedCart', 'custom - addMultipleProductsV2()');

	var cart = app.getModel('Cart').goc();
	var params = request.httpParameterMap;
	var productIds = params.pids.stringValue;

	if(!empty(productIds)) {
		var Product = app.getModel('Product');
		var productIdList = productIds.split(',');
		var productId;
		var productOptionModel;

		try {
			if(!empty(productIdList)) {
				session.custom.NoCall = true;
				for (var i = 0; i < productIdList.length; i += 1) {
					productId = Product.get(productIdList[i]).object;
					var productToAdd = Product.get(productId);
					productOptionModel = productToAdd.updateOptionSelection(params);

					cart.addProductItem(productToAdd.object, 1, productOptionModel);
				}
			}
		} catch (e) {
			logger.error("Error adding products. Error: " + e.message);
		}
	}
	response.redirect(URLUtils.url('MiniCart-Show'));
}

/*
* Module exports
*/

/*
* Exposed methods.
*/

exports.AddMultipleProducts = guard.ensure(['get'], addMultipleProducts);
exports.AddMultipleProductsV2 = guard.ensure(['get'], addMultipleProductsV2);
