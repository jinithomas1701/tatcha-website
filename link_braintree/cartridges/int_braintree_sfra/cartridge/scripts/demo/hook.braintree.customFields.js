'use strict';
/* eslint-disable */

exports.credit = function(data) {

    var order = data.order; // dw.order.Order
    var paymentInstrument = data.paymentInstrument; // dw.order.PaymentInstrument (BRAINTREE_PAYPAL or BRAINTREE_CREDIT)
    var customer = order.getCustomer(); // Returns the customer associated with this container (dw.customer.Customer)
    var defaultShipment = order.getDefaultShipment();
    var shippingAddress = defaultShipment.getShippingAddress(); // Shipping Address (dw.order.OrderAddress)
    var orderLineItems = order.getAllLineItems();
    var billingAddress = order.getBillingAddress(); // Billing address (dw.order.OrderAddress)

    var customFields = {
        //field_2: 'value2_overided',
        //field_3: 'value3'
    };

    // Iterate the order products example
    /*
    var productsIds = [];
    for (var i = 0, len = orderLineItems.size(); i < len; i++) {
        var productLineItem = orderLineItems[i];
        if (productLineItem instanceof dw.order.ProductLineItem || productLineItem instanceof dw.catalog.Variant) {
            var product = productLineItem.getProduct();
            productsIds.push(product.getID());
        }
    }
    customFields.products_ids = productsIds.join(',');
    */

    // Examples with the shipping and billing addresses
    /*
    customFields.billing_address_city = billingAddress.getCity();
    customFields.shipping_address_name = shippingAddress.getFirstName();
    */

    return customFields;
};

exports.paypal = exports.credit;

exports.applepay = exports.credit;

