'use strict';

var ProductMgr = require('dw/catalog/ProductMgr');
var Site = require('dw/system/Site');
module.exports = {
    maxQntyForProduct: function (pid) {
        var apiProduct = ProductMgr.getProduct(pid);
        var defaultMaxQty = Site.getCurrent().getCustomPreferenceValue('maxOrderQuantity');
        if (!apiProduct) {
            return defaultMaxQty;
        }
        // eslint-disable-next-line no-undef
        var maxQty = !empty(apiProduct.custom.maxOrderQuantity) ? apiProduct.custom.maxOrderQuantity : defaultMaxQty;
        return maxQty;
    }
};
