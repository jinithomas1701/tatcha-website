'use strict';

var server = require('server');
var page = module.superModule;
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
server.extend(page);

server.append(
    'Begin',
    server.middleware.https,
    consentTracking.consent,
    csrfProtection.generateToken,
    function (req, res, next) {
    	var viewData = res.getViewData();
        viewData.pageContext = 'checkout';
        res.setViewData(viewData);
        next();
    }
);

module.exports = server.exports();