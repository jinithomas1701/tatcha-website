'use strict';

module.exports = function (object, lineItem) {
    Object.defineProperty(object, 'gwpProduct', {
        enumerable: true,
        value: lineItem.bonusProductLineItem && lineItem.bonusDiscountLineItem && lineItem.bonusDiscountLineItem.promotionID != dw.system.Site.getCurrent().getCustomPreferenceValue('samplePromotionID') ? true : false
    });
};
