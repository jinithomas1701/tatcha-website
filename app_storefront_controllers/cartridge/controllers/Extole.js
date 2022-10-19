'use strict';

/**
 * Controller that renders the extole tags.
 *
 * @module controllers/Home
 */

var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');

/**
 * Invalidates the login and shipment forms. Renders the checkout/cart/cart template.
 */
function showCommon() {
	try {
		var browsing = require('app_storefront_controllers/cartridge/scripts/util/Browsing');
		var originalUrl = browsing.lastUrl().toString();
		app.getView({
			originalUrl: originalUrl
	    }).render('extole/extolecommon');
	}catch (e) {
		
	}
}

/*
 * Export the publicly available controller methods
 */
/** Renders the home page.
 * @see module:controllers/Extole~show */
exports.ShowCommon = guard.ensure(['get'], showCommon);