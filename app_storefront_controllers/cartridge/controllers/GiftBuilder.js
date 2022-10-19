'use strict';

/**
 * Controller that renders gift builder helper pages and snippets.
 *
 * @module controllers/GiftBuilder
 */

var params = request.httpParameterMap;

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');

function getGiftProducts()
{
	var Site = require('dw/system/Site');
	var giftBuilderSKU = Site.getCurrent().getCustomPreferenceValue('giftBuilderSKU');
	var selected = [];
	if(!empty(params.selected.stringValue)){
		selected = JSON.parse(params.selected.stringValue);
	}
	var mainGiftProduct = dw.catalog.ProductMgr.getProduct(giftBuilderSKU);
	app.getView({
		mainGiftProduct : mainGiftProduct,
		selected : selected
	}).render('product/giftbuilder/giftproducts');
}

function getSelectedProducts()
{
	var selected = [];
	var selectedProducts = [];
	var limit = 3;
	if(!empty(params.selected.stringValue)){
		selected = JSON.parse(params.selected.stringValue);
		for (var item in selected) {
			let product = dw.catalog.ProductMgr.getProduct(selected[item]);
			selectedProducts.push(product);
		}
	}
	
	app.getView({
		selectedProducts : selectedProducts,
		limit : limit
	}).render('product/giftbuilder/selectedproducts');
}

/*
 * Web exposed methods
 */

exports.GetGiftProducts = guard.ensure(['get'], getGiftProducts);
exports.GetGiftProducts = guard.ensure(['post'], getGiftProducts);
exports.GetSelectedProducts = guard.ensure(['post'], getSelectedProducts);

