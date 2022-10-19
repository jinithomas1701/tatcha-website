  
'use strict';

var server = require('server');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var page = module.superModule;
server.extend(page);

server.append(
	'Confirm',
	consentTracking.consent,
	server.middleware.https,
	csrfProtection.generateToken,
	function (req, res, next) {
        var viewData = res.getViewData();
        viewData.pageContext = 'orderconfirmation';
        res.setViewData(viewData);
        next();
    }
);

module.exports = server.exports();