'use strict';

/**
 * Controller for the single page checkout.
 *
 * @module controllers/SinglePageCheckout
 */

 /* API Includes */
var CustomerMgr = require('dw/customer/CustomerMgr');
var ShippingMgr = require('dw/order/ShippingMgr');
var Site = require('dw/system/Site');
var Transaction = require('dw/system/Transaction');
var URLUtils = require('dw/web/URLUtils');

/* Script Modules */
var app = require('app_storefront_controllers/cartridge/scripts/app');
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var response = require('app_storefront_controllers/cartridge/scripts/util/Response');
var singlePageCheckoutUtils = require('int_singlepagecheckout/cartridge/scripts/util/SinglePageCheckoutUtils');

/**
 * Starting point for the single page checkout scenario. 
 */
function start() {
    if(Site.getCurrent().getCustomPreferenceValue('enableSinglePageCheckout')) {
        app.getView().render('singlepagecheckout/singlepagecheckout');
    }
}

/**
 * Starting point for the single page checkout scenario. 
 */
function renderCheckoutContainer() {
    if(Site.getCurrent().getCustomPreferenceValue('enableSinglePageCheckout')) {
        app.getView().render('singlepagecheckout/rendercheckoutcontainer');
    }
}

/**
 * single page checkout edit shipping. 
 */
function renderShippingEdit() {
    if(Site.getCurrent().getCustomPreferenceValue('enableSinglePageCheckout')) {
    	session.custom.checkoutState = 'shipping';
    	session.custom.checkoutMode = 'edit';
        app.getView().render('singlepagecheckout/rendercheckoutcontainer');
    }
}

/**
 * single page checkout edit shipping. 
 */
function renderShippingOnlyEdit() {
    if(Site.getCurrent().getCustomPreferenceValue('enableSinglePageCheckout')) {
    	session.custom.checkoutState = 'shipping';
    	session.custom.checkoutMode = 'edit';
        app.getView().render('singlepagecheckout/shippingedit/shippingonlyedit');
    }
}

function updateShippingMethod(){
	if(Site.getCurrent().getCustomPreferenceValue('enableSinglePageCheckout')) {
		session.custom.NoCall = false;
	      var cart = app.getModel('Cart').get();
	      Transaction.wrap(function () {
	          cart.calculate();
	      });
	    session.custom.NoCall = true;
    	session.custom.checkoutState = 'review';
        app.getView().render('singlepagecheckout/singlepagecheckout');
    }
}


/**
 * Response Builder for Order Summary (AJAX) point for the single page checkout scenario. 
 */
function orderSummary() {
	singlePageCheckoutUtils.renderResponse('','');
	return;
}

function showModal() {
	
    if(Site.getCurrent().getCustomPreferenceValue('enableSinglePageCheckout')) {
        app.getView().render('singlepagecheckout/shipping/address');    	
    }
    
}

/***
* Single page checkout - Edit billing
**/

function renderBillingEdit() {
	if(Site.getCurrent().getCustomPreferenceValue('enableSinglePageCheckout')) {
    	session.custom.checkoutState = 'billing';
    	session.custom.checkoutMode = 'edit';
        app.getView().render('singlepagecheckout/rendercheckoutcontainer');
    }
}

/*
* Web exposed methods
*/
/** Starting point for the single shipping scenario.
 * @see module:controllers/COShipping~start */
exports.Start = guard.ensure(['https'], start);
exports.RenderCheckoutContainer = guard.ensure(['https'], renderCheckoutContainer);
exports.RenderShippingEdit = guard.ensure(['https'], renderShippingEdit);
exports.RenderShippingOnlyEdit = guard.ensure(['https'], renderShippingOnlyEdit);
exports.OrderSummary = guard.ensure(['https'], orderSummary);
exports.ShowModal = guard.ensure(['https'], showModal);
exports.RenderBillingEdit = guard.ensure(['https'], renderBillingEdit);
exports.UpdateShippingMethod = guard.ensure(['post', 'https'], updateShippingMethod);