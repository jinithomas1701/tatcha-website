'use strict';

module.exports = function (object, lineItem) {
    Object.defineProperty(object, 'proratedPrice', {
        enumerable: true,
        value: lineItem.proratedPrice.value
    });

};
