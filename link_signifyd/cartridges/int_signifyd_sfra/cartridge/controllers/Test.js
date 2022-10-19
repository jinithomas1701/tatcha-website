'use strict';

var server = require('server');
/* SFRA Cartrige Includes */
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
/* API Includes */
var OrderMgr = require('dw/order/OrderMgr');

server.post('Config', csrfProtection.validateAjaxRequest, function (req, res, next) {
    var Site = require('dw/system/Site');
    var sitePrefs = Site.getCurrent().getPreferences();
    var APIkey = sitePrefs.getCustom().SignifydApiKey;
    res.json({
        APIkey: APIkey
    });
    next();
});

server.post('Callback', csrfProtection.validateAjaxRequest, function (req, res, next) {
    var orderNumber = req.querystring.orderNumber;
    var order = OrderMgr.getOrder(orderNumber);
    if (order) {
        res.json({
            success: true,
            SignifydGuaranteeDisposition: order.custom.SignifydGuaranteeDisposition ? order.custom.SignifydGuaranteeDisposition.value : '',
            SignifydFraudScore: order.custom.SignifydFraudScore,
            SignifydOrderURL: order.custom.SignifydOrderURL,
            exportStatus: order.exportStatus.value
        });
    } else {
        res.json({
            success: false
        });
    }
    next();
});

server.get('CaseID', csrfProtection.validateAjaxRequest, function (req, res, next) {
    var sig = require('int_signifyd/cartridge/scripts/service/signifyd');
    var orderNumber = req.querystring.orderNumber;
    var order = OrderMgr.getOrder(orderNumber);
    // eslint-disable-next-line new-cap
    var caseId = sig.Call(order);
    res.renderJSON([{
        caseId: caseId
    }]);
    next();
});

module.exports = server.exports();
