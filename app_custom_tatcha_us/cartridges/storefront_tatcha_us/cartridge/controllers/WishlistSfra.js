'use strict';

var server = require('server');
var productListHelper = require('*/cartridge/scripts/helpers/wishListHelpers');
var Resource = require('dw/web/Resource');
var PAGE_SIZE_ITEMS = 15;
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');

server.get('ShowButton', function (req, res, next) {
    var requestPid = req.querystring.pid;
    var ProductMgr = require('dw/catalog/ProductMgr');
    var product = ProductMgr.getProduct(requestPid);
    var t = product.custom.oosProductStatus;
    res.render('product/components/productv1/wishlistbtn_v1', {
        pid: requestPid,
		product: product,
    });
    next();
});
server.get('AddItemJson', function (req, res, next) {
    var list = productListHelper.getCurrentOrNewList(req.currentCustomer.raw, { type: 10 });
    var pid = req.httpParameterMap.pid.stringValue;
    var optionId = null;
    var optionVal = null;

    var config = {
        qty: 1,
        optionId: optionId,
        optionValue: optionVal,
        req: req,
        type: 10
    };
    var errMsg = productListHelper.itemExists(list, pid, config) ? Resource.msg('wishlist.addtowishlist.exist.msg', 'wishlist', null) :
        Resource.msg('wishlist.addtowishlist.failure.msg', 'wishlist', null);

    var success = productListHelper.addItem(list, pid, config);
    if (success) {
        res.json({
            success: true
        });
    } else {
        res.json({
            error: true,
            pid: pid,
            msg: errMsg
        });
    }
    next();
});
server.get('RemoveItemJson', function (req, res, next) {
    var pid = req.httpParameterMap.pid.stringValue;
    var list = productListHelper.removeItem(customer, pid, { req: req, type: 10 });
    var listIsEmpty = list.prodList.items.empty;
    res.json({
        success: true
    });
    next();
});
module.exports = server.exports();