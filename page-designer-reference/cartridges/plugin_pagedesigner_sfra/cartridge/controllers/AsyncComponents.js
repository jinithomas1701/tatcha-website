'use strict';

var server = require('server');
var Template = require('dw/util/Template');
var ProductViewModel = require('*/cartridge/experience/viewmodels/ProductViewModel');


server.get('Load', function (req, res, next) {
    var components = (JSON.parse(req.querystring.components));
    var limit = parseInt(req.querystring.limit);
    var successfulrenderings = 0;
    components.forEach(function (component) {
        if (limit <= successfulrenderings) {
            return;
        }
        var model = new dw.util.HashMap();

        if (component.model.type === 'product') {
            var product = dw.catalog.ProductMgr.getProduct(component.model.id);
            if (!product || !product.online) {
                return;
            }
            model = ProductViewModel.get(product);
            if (successfulrenderings === 0) {
                model.additionalClass = 'active';
            }
        }

        var template = new Template('experience/components/' + component.template);
        var renderedTemplate = template.render(model);
        response.writer.print(renderedTemplate.text);
        successfulrenderings++;
    });
});

server.get('LoadRecommProducts', function (req, res, next) {
    var httpParameterMap = req.httpParameterMap;
    var components = (JSON.parse(httpParameterMap.components.stringValue));
    var limit = httpParameterMap.limit.intValue;
    var successfulrenderings = 0;
    components.forEach(function (component) {
        if (limit <= successfulrenderings) {
            return;
        }
        var model = new dw.util.HashMap();

        if (component.model.type === 'product') {
            var product = dw.catalog.ProductMgr.getProduct(component.model.id);
            if(product.isMaster()){
                var product = product.getVariationModel().getDefaultVariant();
            }
            if (!product || !product.online) {
                return;
            }
            model.Product = product;
            if (successfulrenderings === 0) {
                model.additionalClass = 'active';
            }
        }

        var template = new Template('experience/components/' + component.template);
        var renderedTemplate = template.render(model);
        response.writer.print(renderedTemplate.text);
        successfulrenderings++;
    });
});

module.exports = server.exports();
