'use strict';

var server = require('server');

var ArrayList = require('dw/util/ArrayList');
var ProductMgr = require('dw/catalog/ProductMgr');
var CatalogMgr = require('dw/catalog/CatalogMgr');

/**
 * @desc compare widget updates
 *
 */
server.post('CompareWidgetUpdate', function (req, res, next) {
    var compareUtils = require('*/cartridge/scripts/util/CompareUtils');
    var parameterMap = req.httpParameterMap;
    var compareProductIds = new ArrayList();
    compareProductIds = JSON.parse(parameterMap.compareProductIds.value);
    var productList = new ArrayList();
    for ( var id in compareProductIds) {
        var product = ProductMgr.getProduct(compareProductIds[id]);
        if(!empty(product)){
            productList.add(product);
        }
    }
    var cgid = parameterMap.cgid;
    var category = CatalogMgr.getCategory(cgid);
    var comparison = compareUtils.get();
    comparison.setCategory(cgid);
    var attributegroups = comparison.findComparisonAttributeGroups();
    var comparisonProductsSize = productList.size();

    res.render('search/components/categorycomparewidget', {
        productList: productList,
        category: category,
        attributegroups: attributegroups,
        comparisonProductsSize: comparisonProductsSize
    });

    next();
});

module.exports = server.exports();
