var HashMap = require('dw/util/HashMap');
var URLUtils = require('dw/web/URLUtils');

module.exports.get = function get(product) {
    var model = new HashMap();
    var productImage = null;
    model.url = URLUtils.url('Product-Show', 'pid', product.ID);
    var images = product.getImages('large');

    if (images.iterator() && images.iterator().hasNext()) {
        productImage = images.iterator().next();
    }

    model.text_headline = product.getName();
    if (productImage) {
        model.image = {
            src : productImage.getAbsURL(),
            alt : productImage.getAlt()
        };
    }
    return model;
};
