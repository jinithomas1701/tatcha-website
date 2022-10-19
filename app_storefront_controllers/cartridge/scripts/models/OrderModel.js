'use strict';

/**
* Module for ordering functionality.
* @module models/OrderModel
*/

/* API Includes */
var AbstractModel = require('./AbstractModel');
var Order = require('dw/order/Order');
var OrderMgr = require('dw/order/OrderMgr');
var Resource = require('dw/web/Resource');
var Status = require('dw/system/Status');
var Transaction = require('dw/system/Transaction');
var Site = require('dw/system/Site');


/**
 * Place an order using OrderMgr. If order is placed successfully,
 * its status will be set as confirmed, and export status set to ready.
 * @param {dw.order.Order} order
 */
function placeOrder(order) {
    var placeOrderStatus = OrderMgr.placeOrder(order);
    if (placeOrderStatus === Status.ERROR) {
        OrderMgr.failOrder(order, false);
        throw new Error('Failed to place order.');
    }
    
    var orderExportStatus = Order.EXPORT_STATUS_NOTEXPORTED;
    
	var paymentInstruments = order.paymentInstruments;
	var paymentInstrumentSize = paymentInstruments.size();
	//If Paypal only, set order status to export ready.
	if((paymentInstrumentSize == 1 && (paymentInstruments[0].paymentMethod == 'PayPal' || paymentInstruments[0].paymentMethod == 'GIFT_CERTIFICATE' || paymentInstruments[0].paymentMethod == 'AFTERPAY_PBI')) || ((order.getTotalNetPrice().value === 0.00 || order.getTotalNetPrice().value === 0) && order.priceAdjustments.size() > 0)) {
		orderExportStatus = Order.EXPORT_STATUS_READY;
	}
    
    order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
    order.setExportStatus(orderExportStatus);
}
/**
 * Order helper class providing enhanced order functionality.
 * @class module:models/OrderModel~OrderModel
 * @extends module:models/AbstractModel
 *
 * @param {dw.order.Order} obj The order object to enhance/wrap.
 */
var OrderModel = AbstractModel.extend({

});

/**
 * Gets a new instance for a given order or order number.
 *
 * @alias module:models/OrderModel~OrderModel/get
 * @param parameter {dw.order.Order | String} The order object to enhance/wrap or the order ID of the order object.
 * @returns {module:models/OrderModel~OrderModel}
 */
OrderModel.get = function (parameter) {
    var obj = null;
    if (typeof parameter === 'string') {
        obj = OrderMgr.getOrder(parameter);
    } else if (typeof parameter === 'object') {
        obj = parameter;
    }
    return new OrderModel(obj);
};

/**
 * Submits an order
 * @param order {dw.order.Order} The order object to be submitted.
 * @transactional
 * @return {Object} object If order cannot be placed, object.error is set to true. Ortherwise, object.order_created is true, and object.Order is set to the order.
 */
OrderModel.submit = function (order, subscriptionProductList, HasRefillProducts) { 
    var Email = require('./EmailModel');
    var GiftCertificate = require('./GiftCertificateModel');
    try {
        Transaction.begin();
        placeOrder(order);

        /*Handled after shippment in celigoShipment.ds
        // Creates gift certificates for all gift certificate line items in the order
        // and sends an email to the gift certificate receiver

        order.getGiftCertificateLineItems().toArray().map(function (lineItem) {
            return GiftCertificate.createGiftCertificateFromLineItem(lineItem, order.getOrderNo());
        }).forEach(GiftCertificate.sendGiftCertificateEmail);
        */
        Transaction.commit();
    } catch (e) {
        Transaction.rollback();
        return {
            error: true,
            PlaceOrderError: new Status(Status.ERROR, 'confirm.error.technical')
        };
    }
  // Smart Order Refill Modification - Begin
    /*var subscriptionList  = [],
        hasRefillProducts = false;

    if (dw.system.Site.getCurrent().getCustomPreferenceValue('SorEnabled') && session.custom.hasSORProducts) {
        var RefillCustomerModel = require('int_smartorderrefill/cartridge/models/smartOrderRefill/refillCustomer.js'),             
        	customer            = order.getCustomer();
        
        var refillCustomer = new RefillCustomerModel({
            preferences : require('dw/system/Site').current.preferences,
            customer    : require('dw/customer/CustomerMgr').getCustomerByLogin(customer.profile.email)
        });
        subscriptionList.push(refillCustomer.createSmartOrderRefillSubscription(order));
        hasRefillProducts = true;
    }

    delete session.custom.hasSORProducts;*/
    // Smart Order Refill Modification - End

    /*Email.sendMail({
        template: 'mail/orderconfirmation',
        recipient: order.getCustomerEmail(),
        subject: Resource.msg('order.orderconfirmation-email.001', 'order', null),
        context: {
        	 Order: order,
        	 subscriptionProductList : subscriptionProductList,
        	 HasRefillProducts : HasRefillProducts
        }
    });*/
    var app = require('~/cartridge/scripts/app');
    var joinList = app.getForm('profile.customer.addtoemaillist').value();
    
    return {
        Order: order,
        order_created: true
    };
}

/** The order class */
module.exports = OrderModel;
