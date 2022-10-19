/**
* Description of the Controller and the logic it provides
*
* @module  controllers/FacebookPixel
*/

'use strict';
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var LOGGER = require('dw/system/Logger');

// HINT: do not put all require statements at the top of the file
// unless you really need them for all functions

/**
* Description of the function
*
* @return {String} The string 'myFunction'
*/
// var myFunction = function(){
//     return 'myFunction';
// }

/* Exports of the controller */
///**
// * @see {@link module:controllers/FacebookPixel~myFunction} */
//exports.MyFunction = myFunction;

function FacebookEventTrigger(){
	var facebookAPIHelper = require('*/cartridge/scripts/FacebookAPIHelper');
	try{
		var params =  request.httpParameterMap;
		facebookAPIHelper.facebookEventTrigger(params);
	}
	catch (e) {
		var error = e;
		LOGGER.error('Facebook event api error - '+ e.toString());
	}
}

exports.FacebookEventTrigger = guard.ensure(['post'], FacebookEventTrigger);
