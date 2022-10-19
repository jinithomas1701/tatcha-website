'use strict';

var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var URLUtils = require('dw/web/URLUtils');

function csrfFailed() {
    //app.getView().render('csrf/csrffailed');
	response.redirect(URLUtils.url('Home-Show'));
}

exports.Failed = guard.ensure(['get', 'https'], csrfFailed);
