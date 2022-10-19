'use strict';

/**
 * Gets a gift certificate line item.
 *
 * @param {dw.order.GiftCertificate} lineItems giftCertificate objects
 * @param {string} uuid - UUID of the gift certificate line item to retrieve.
 * @return {dw.order.GiftCertificate | null} giftCertificate object with the passed UUID or null if no gift certificate with the passed UUID exists in the cart.
 */
var getGiftCertificateLineItemByUUID = function (lineItems, uuid) {
    for (var it = lineItems.iterator(); it.hasNext();) {
        var item = it.next();
        if (item.getUUID() === uuid) {
            return item;
        }
    }
    return null;
};

module.exports = {
    getGiftCertificateLineItemByUUID: getGiftCertificateLineItemByUUID
};
