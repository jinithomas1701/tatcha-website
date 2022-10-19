/**
 * The controller which handles various features on AvaTax settings page of the BM cartridge
 */
'use strict';

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');

var params = request.httpParameterMap;

/**
 * Returns an Array of url items to be displayed on help page
 * @returns {*} Array of url items
 */
function avItems() {
	var items = [];

	items = [{
			name: 'Avalara Home',
			href: 'https://www.avalara.com/',
			title: 'Learn why Avalara',
			description: 'Keeping up with the ever-changing world of tax laws can be a circus act without automated tax compliance'
		},
		{
			name: 'Avalara Help Center',
			href: 'https://help.avalara.com/',
			description: 'One stop guide for all your queries related to AvaTax'
		},
		{
			name: 'Avalara AvaTax Update',
			href: 'https://help.avalara.com/Avalara_AvaTax_Update',
			description: 'Real-time sales tax calculations flow directly from our powerful tax engine to your shopping cart or invoicing system, all in a flash'
		},
		{
			name: 'AvaTax Developer Guide',
			href: 'https://developer.avalara.com/avatax/dev-guide/',
			description: 'Introduction to AvaTax - a powerful and easy-to-use API for tax calculations for financial applications'
		},
		{
			name: 'AvaTax REST API',
			href: 'https://developer.avalara.com/api-reference/avatax/rest/v2/',
			description: 'REST interface to Avalara\'s enterprise tax service, AvaTax'
		},
		{
			name: 'AvaTax API - Swagger UI',
			href: 'https://sandbox-rest.avatax.com/swagger/ui/index.html',
			description: 'Test the AvaTax REST API on Swagger UI'
		}
	];

	return items;
}

/**
 * It is a starting point for this controller and the page
 */
function start() {
	var currentMenuItemId = params.CurrentMenuItemId.value;
	var menuname = params.menuname.value;
	var mainmenuname = params.mainmenuname.value;

	session.privacy.currentMenuItemId = currentMenuItemId;
	session.privacy.menuname = menuname;
	session.privacy.mainmenuname = mainmenuname;

	var viewObj = {
		CurrentMenuItemId: currentMenuItemId,
		menuname: menuname,
		mainmenuname: mainmenuname,
		items: avItems()
	};

	app.getView(viewObj).render('/avatax/avhelp');
}


exports.Start = guard.ensure(['https', 'get'], start);