'use strict';

/**
 * Controller that create/clean an abandoned basket record in the custom object SAB 
 *
 * @module controllers/SelligentAbandonedBasket
 */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var Customer = require('dw/customer');
var Order = require('dw/order');
var System = require('dw/system');
var SelligentCleanupAB = app.getModel('selligentCleanupAbandonedBasket');
var SelligentCleanupAllAB = app.getModel('selligentCleanupAllAbandonedBasket');
var SelligentCreateAB = app.getModel('selligentCreateAbandonedBasket');
var Pipeline = require('dw/system/Pipeline');
var Site = require('dw/system/Site');
/*
 * Entry points to create and cleanup abandoned basket records
 * 
 */
function create () {

	var currentBasket : Order.Basket = Order.BasketMgr.getCurrentBasket();
    var currentCustomer : Customer.Customer = currentBasket.getCustomer();
	
	if (currentBasket != null && currentCustomer != null)
	{
		SelligentCreateAB.Execute(currentBasket, currentCustomer);
	}
}

function cleanUp (currentCustomer) {
	var UseSelligentABCleanup = Site.getCurrent().getCustomPreferenceValue('UseSelligentABCleanup');
	if (currentCustomer != null && UseSelligentABCleanup)
	{
		SelligentCleanupAB.Execute(currentCustomer);	
	}
}

function cleanUpAll(){
	Pipeline.execute('SelligentAbandonedBasket-CleanUpCustomObject');		
}

function cleanUpCustomObject(){
	SelligentCleanupAllAB.Execute();
}
/*
* Exposed methods.
*/
/**Create a new Selligent Abandoned Basket custom object and call Selligent Web Service to communicate informations**/ 
exports.Create = create;
/**Mark as deleted an existing Selligent Abandoned Basket custom object and call Selligent Web Service to communicate informations **/
exports.CleanUp =cleanUp;
/**Description	This entry point is called by the Selligent Windows Service to run the SelligentCleanUpAbandonedBasket job.**/
exports.CleanUpAll = guard.ensure(['get'], cleanUpAll);
exports.CleanUpAll.public = true;
/**Description	CleanUp abandoned baskets custom objects older than a custom interval defined in the config file**/
exports.CleanUpCustomObject = cleanUpCustomObject