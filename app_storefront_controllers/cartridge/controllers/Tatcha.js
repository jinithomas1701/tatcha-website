/**
* Description of the Controller and the logic it provides
*
* @module  controllers/Tatcha
*/

'use strict';

// HINT: New Controller functions

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');

/**
* Close Header Banner for current session
*
*/
var closeBanner = function(){
	session.custom.closeBanner = true;
	let r = require('~/cartridge/scripts/util/Response');
    r.renderJSON({
        status: 'success'
    });
}

/**
* Close Header Banner for current session
*
*/
var advisor = function(){
	app.getView().render('tatcha/advisor');
}


/* Exports of the controller */
exports.CloseBanner = guard.ensure(['get'], closeBanner);
exports.Advisor = guard.ensure(['get'], advisor);