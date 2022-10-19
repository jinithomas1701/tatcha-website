'use strict';

/**
 * Controller that exports customers, products, orders, adandonned baskets.
 *
 * @module controllers/StartSelligentExport
 */
var params = request.httpParameterMap;
/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');

var SelligentExport = app.getModel('StartSelligentExport');

/*
 * Entry point used by the Selligent Windows Service to launch exports of Products, customers, orders and abandoned baskets
 * 
 */
function start() {

    SelligentExport.Execute();
}

/*
* Exposed methods.
*/
/** Start a defined Selligent Export job **/ 
exports.Start = guard.ensure(['get'], start);
exports.Start.public = true;