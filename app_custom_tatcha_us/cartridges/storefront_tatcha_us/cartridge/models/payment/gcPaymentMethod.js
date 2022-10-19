'use strict';

/**
 * Plain JS object that represents a DW Script API dw.order.ShippingMethod object
 * @param {dw.order.ShippingMethod} shippingMethod - the default shipment of the current basket
 * @param {dw.order.Shipment} [shipment] - a Shipment
 */
 function gcPaymentInstrumentModel(gcPaymentInstrument) {
    this.transactionAmount = gcPaymentInstrument.paymentTransaction.amount;
    this.gcCode = gcPaymentInstrument.getGiftCertificateCode();
}

module.exports = gcPaymentInstrumentModel;
