'use strict';

var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');
var PageRenderHelper = require('~/cartridge/experience/utilities/PageRenderHelper.js');

/**
 * Render logic for the assets.einsteinproductrecommendation.
 */
module.exports.render = function (context) {
    var model = new HashMap();
    var content = context.content;

    var product = content.product;
    var recommender = content.recommender;
    model.limit = parseInt(content.count) || 1;

    if (product) {
        model.secondaryProductId = '';
        model.alternativeGroupType = '';
        model.alternativeGroupId = '';
        model.primaryProductId = (product.variant || product.variationGroup) ? product.variationModel.master.ID : product.ID;
        if (product.variant || product.variationGroup) {
            model.secondaryProductId = product.ID;
        }

        if (product.variationGroup || product.bundle || product.productSet) {
            if (product.productSet) {
                model.alternativeGroupType = 'set';
            } else if (product.bundle) {
                model.alternativeGroupType = 'bundle';
            } else if (product.variationGroup) {
                model.alternativeGroupType = 'vgroup';
            }

            model.alternativeGroupId = product.ID;
        }
    }
    if (recommender) {
        model.recommender = recommender.value;
    } else {
        throw new Error('No recommender available');
    }
    model.productLoadUrl = dw.web.URLUtils.abs('AsyncComponents-Load');

    if (model.limit > 1) {
        model.id = 'carousel-' + PageRenderHelper.safeCSSClass(context.component.getID());
        return new Template('experience/components/einstein/product-to-productcarousel').render(model).text;
    }
    return new Template('experience/components/einstein/product-to-producttile').render(model).text;
};
