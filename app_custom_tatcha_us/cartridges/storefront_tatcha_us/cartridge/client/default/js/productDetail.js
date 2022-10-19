var productDetail = require('./product');
var wishlist = require('./components/wishlist');


$(document).ready(function () {
    productDetail.init();
    wishlist.init();
});

