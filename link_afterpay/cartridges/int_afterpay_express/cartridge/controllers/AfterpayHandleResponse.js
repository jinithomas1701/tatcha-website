'use strict';

/* Script Modules */
var server = require('server');
var URLUtils = require('dw/web/URLUtils');
/* Global variables */
var sitePreferences = require('int_afterpay_core/cartridge/scripts/util/afterpayUtilities.js').getSitePreferencesUtilities();


server.get('SummaryRedirect', server.middleware.https, function (req, res, next) {
		//GTM change
		session.custom.checkoutType = "afterpayexpress";
		res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'placeOrder'));
		return next();
});

module.exports = server.exports();