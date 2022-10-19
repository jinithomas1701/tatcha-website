'use strict';

var Site = require('dw/system/Site');
var URLUtils = require('dw/web/URLUtils');
var ProductMgr = require('dw/catalog/ProductMgr');
var StringUtils = require('dw/util/StringUtils');
var Money = require('dw/value/Money');

function prepareOrderPayload (order, isFutureOrder, mailType) {
    var orderDetails = {};
    var isReplenishmentOrder = (mailType != null && mailType == 'Auto Delivery Order Confirmation') ? true : false;

    try {
        // Shipping address
        var orderShippingAddressFirstName = '';
        var orderShippingAddressLastName = '';
        var orderShippingAddressAddress1 = '';
        var orderShippingAddressAddress2 = '';
        var orderShippingAddressCity = '';
        var orderShippingAddressPostalCode = '';
        var orderShippingAddressStateCode = '';
        var orderShippingAddressCountryCode = '';
        var orderShippingAddressPhone = '';

        if(order.shipments.length > 0) {
            // Shipping Address
            orderShippingAddressFirstName = (order.shipments[0].shippingAddress.firstName)?order.shipments[0].shippingAddress.firstName:'';
            orderShippingAddressLastName = (order.shipments[0].shippingAddress.lastName)?order.shipments[0].shippingAddress.lastName:'';
            orderShippingAddressAddress1 = (order.shipments[0].shippingAddress.address1)?order.shipments[0].shippingAddress.address1:'';
            orderShippingAddressAddress2 = (order.shipments[0].shippingAddress.address2)?order.shipments[0].shippingAddress.address2:'';
            orderShippingAddressCity = (order.shipments[0].shippingAddress.city)?order.shipments[0].shippingAddress.city:'';
            orderShippingAddressPostalCode = (order.shipments[0].shippingAddress.postalCode)?order.shipments[0].shippingAddress.postalCode:'';
            orderShippingAddressStateCode = (order.shipments[0].shippingAddress.stateCode)?order.shipments[0].shippingAddress.stateCode:'';
            orderShippingAddressCountryCode = (order.shipments[0].shippingAddress.countryCode.value)?order.shipments[0].shippingAddress.countryCode.value:'';
            orderShippingAddressPhone = (order.shipments[0].shippingAddress.phone)?order.shipments[0].shippingAddress.phone:'';
            var keywords = "";
            if(orderShippingAddressCountryCode != 'US') {
                keywords = "INTERNATIONAL";
            } else {
                var list = Site.getCurrent().getCustomPreferenceValue('USTerritories');
                if(!empty(list) && list.indexOf(orderShippingAddressStateCode) >= 0) {
                    keywords = "US-TERRITORY-PO";
                }
            }

            // Product Details
            var productLineItems = order.shipments[0].productLineItems;
            var productLineItem = {};
            var productLineItemsArray = [];
            var items = [];
            var itemCount = 0;
            var itemPrimaryCategories = [];
            var itemCategories = [];

            if(Site.current.getCustomPreferenceValue('LincEnabled')) {
                var lincItemVariationValues = [];
                var lincItemCategories = [];
                var lincLineItems = [];
            }

            for(var j in productLineItems) {
                productLineItem = productLineItems[j];

                //Resetting keywords value, if it has already a value 'FINAL-SALE' (Sample or GiftWrap)
                if(keywords === 'FINAL-SALE') {
                    keywords = '';
                }
                var prdUrl = '';
                var prdAbsUrl = '';
                var replenishment = false;
                var replenishment_interval = 0;
                var priceString = '';
                var priceValue = 0.0;
                var hasOsfSmartOrderRefill = productLineItem.custom.hasSmartOrderRefill;
                if(!empty(productLineItem.custom.hasSmartOrderRefill) && productLineItem.custom.hasSmartOrderRefill && !isReplenishmentOrder){
                    if (productLineItem.custom.SorMonthInterval > 0 || productLineItem.custom.SorWeekInterval > 0) {
                        replenishment = true;
                        if(productLineItem.custom.SorMonthInterval>1){
                            replenishment_interval = 'Auto-Delivery ('+productLineItem.custom.SorMonthInterval+' months)';
                        }else{
                            replenishment_interval = 'Auto-Delivery ('+productLineItem.custom.SorMonthInterval+' month)';
                        }
                    }
                }

                prdUrl = URLUtils.url('Product-Show', 'pid', productLineItem.productID).toString();
                var secondaryName = '';
                // Get the product secondary name
                var productDetail = ProductMgr.getProduct(productLineItem.productID);
                if(productDetail.custom.secondaryName){
                    secondaryName = productDetail.custom.secondaryName;
                }

                if(!productLineItem.bonusProductLineItem) {
                    priceString = StringUtils.formatMoney(Money(productLineItem.price.value, session.getCurrency().getCurrencyCode()));
                } else {
                    priceString = StringUtils.formatMoney(Money(0, session.getCurrency().getCurrencyCode()));
                }

                //Variation values
                var variationValues = '';
                lincItemVariationValues = [];
                if(productDetail.isVariant()) {
                    var variationAttrs = productDetail.variationModel.getProductVariationAttributes();
                    for(var i = 0; i < variationAttrs.length; i++) {
                        var VA = variationAttrs[i];
                        var selectedValue = productDetail.variationModel.getSelectedValue(VA);
                        if(selectedValue) {
                            variationValues = variationValues + selectedValue.displayValue;
                            if(i < (variationAttrs.length - 1)) {
                                variationValues = variationValues + ' | ';
                            }
                            if(Site.current.getCustomPreferenceValue('LincEnabled')) {
                                lincItemVariationValues.push({
                                    "name": VA.displayName,
                                    "value": selectedValue.displayValue
                                });
                            }
                        }
                    }
                }

                items.push(productLineItem.productID);

                itemCount = itemCount + productLineItem.quantity.value;
                lincItemCategories = [];
                if(productDetail.getPrimaryCategory()) {
                    var primaryCategory = productDetail.getPrimaryCategory();
                    itemPrimaryCategories.push(primaryCategory.displayName);
                    if(Site.current.getCustomPreferenceValue('LincEnabled')) {
                        lincItemCategories.push({
                            "name": primaryCategory.displayName,
                            "id": primaryCategory.ID
                        });
                    }
                }
                var allCategories = productDetail.getAllCategories();
                var isSample = false;
                if(!empty(allCategories) && allCategories.length > 0) {
                    var category = '';
                    for(var categoryCount = 0; categoryCount < allCategories.length; categoryCount++) {
                        category = allCategories[categoryCount];
                        itemCategories.push(category.displayName);
                        if(category.ID == 'samples') {
                            isSample = true;
                            lincItemVariationValues.push({
                                "name": "Size",
                                "value": "Sample"
                            });
                        }
                        if(category.ID == 'GWP-HIDDEN') {
                            isSample = true;
                        }
                    }
                }

                //for replenishment Order - Auto Delivery
                if(isReplenishmentOrder){
                    replenishment = true;
                    if(productLineItem.custom.SorMonthInterval>1){
                        replenishment_interval = 'Auto-Delivery ('+productLineItem.custom.SorMonthInterval+' months)';
                    }else{
                        replenishment_interval = 'Auto-Delivery ('+productLineItem.custom.SorMonthInterval+' month)';
                    }
                }

                productLineItemsArray.push({
                    'ID': productLineItem.productID,
                    'PRODUCT_NAME':productLineItem.product.name,
                    'PRODUCT_SECONDARY_NAME': secondaryName,
                    'QUANTITY': productLineItem.quantity.value,
                    'PRICE': priceString,
                    'DISCOUNT': productLineItem.adjustedPrice.value,
                    'PRODUCT_URL': prdUrl,
                    'REPLENISHMENT': replenishment,
                    'REPLENISHMENT_INTERVAL' : replenishment_interval,
                    'PRODUCT_VARIANT': variationValues,
                    'PRICE_VALUE': productLineItem.price.value,
                    'PRODUCT_IMG_URL': productDetail.getImage("large").getAbsURL().toString(),
                    'IS_SAMPLE': isSample
                });

                if(Site.current.getCustomPreferenceValue('LincEnabled')) {
                    prdAbsUrl =  URLUtils.abs('Product-Show', 'pid', productLineItem.productID).toString();
                    if(isSample ||
                            productLineItem.productID == Site.getCurrent().getCustomPreferenceValue('GiftWrapId')) {
                        keywords = "FINAL-SALE";
                    }

                    var itemprice = 0;
                    if(productLineItem.price.value && productLineItem.quantity.value) {
                        itemprice = productLineItem.price.value/productLineItem.quantity.value;
                    }

                    var lincLineItem = {
                            "product_id": productLineItem.productID,
                            "variant_id": productLineItem.productID,
                            "upc": productLineItem.productID,
                            "product_name": productLineItem.productName,
                            "description": productDetail.custom.benefitsSection1,
                            "quantity": productLineItem.quantity.value,
                            "image": productDetail.getImage("large").getAbsURL().toString(),
                            "link": prdAbsUrl,
                            "price": itemprice,
                            "tax": productLineItem.adjustedTax.value,
                            "discount": productLineItem.adjustedPrice.value,
                            "categories": lincItemCategories,
                            "properties": lincItemVariationValues
                        };
                    if(!empty(keywords)) {
                        lincLineItem['keywords'] = keywords;
                    }
                    lincLineItems.push(lincLineItem);
                }

            }
        }

            // Order Total
            var merchTotalExclOrderDiscounts = order.getAdjustedMerchandizeTotalPrice(false);
            var merchTotalInclOrderDiscounts = order.getAdjustedMerchandizeTotalPrice(true);


            // Merchandise total
            var merchandiseTotal = merchTotalExclOrderDiscounts.add(order.giftCertificateTotalPrice);

            //discounts
            var orderDiscount = merchTotalExclOrderDiscounts.subtract( merchTotalInclOrderDiscounts );

            // Sub Total
            var subTotal = merchTotalInclOrderDiscounts.add(order.giftCertificateTotalPrice);

            //Shipping
            var shippingExclDiscounts = order.shippingTotalPrice;
            var shippingInclDiscounts = order.getAdjustedShippingTotalPrice();
            var shippingDiscount = shippingExclDiscounts.subtract( shippingInclDiscounts );
            var shippingTotalCost = shippingExclDiscounts.subtract( shippingDiscount );

            // Tax
            var totalTax = 0.00;
            if(order.totalTax.available){
                totalTax = order.totalTax.value;
            } else if(order.giftCertificateTotalPrice.available){
                totalTax = order.merchandizeTotalTax.value;
            }

            // Order Total
            var orderTotal = '';
            if(order.totalNetPrice.available){
                orderTotal = order.totalNetPrice.value + totalTax;
            } else {
                orderTotal = order.getAdjustedMerchandizeTotalPrice(true)+(order.giftCertificateTotalPrice)+(shippingTotalPrice)+(totalTax);
            }

            //PrepareLinc Payload
            if(Site.current.getCustomPreferenceValue('LincEnabled')) {
                var lincPayload = {
                    "shop_id": Site.getCurrent().getCustomPreferenceValue('LincShopID'),
                    "order_id": order.orderNo,
                    "user":{
                        "user_id": (order.customerNo)?order.customerNo:'',
                        "first_name": order.customer.profile ? order.customer.profile.firstName : (order.billingAddress.firstName ? order.billingAddress.firstName : order.customerName),
                        "last_name": order.customer.profile ? order.customer.profile.lastName : (order.billingAddress.lastName ? order.billingAddress.lastName : order.customerName),
                        "email": order.getCustomer().profile ? order.getCustomer().profile.email: order.customerEmail,
                    },
                    "billing_address": {
                        'first_name': (order.billingAddress.firstName)?order.billingAddress.firstName:'',
                        'last_name':(order.billingAddress.lastName)?order.billingAddress.lastName:'',
                        'address1': (order.billingAddress.address1)?order.billingAddress.address1:'',
                        'address2': (order.billingAddress.address2)?order.billingAddress.address2:'',
                        'city': (order.billingAddress.city)?order.billingAddress.city:'',
                        'postal_code': (order.billingAddress.postalCode)?order.billingAddress.postalCode:'',
                        'province': (order.billingAddress.stateCode)?order.billingAddress.stateCode:'',
                        'country': (order.billingAddress.countryCode.value)?order.billingAddress.countryCode.value:'',
                        'phone': (order.billingAddress.phone)?order.billingAddress.phone:''
                    },
                    "shipping_address": {
                        'first_name': orderShippingAddressFirstName,
                        'last_name':orderShippingAddressLastName,
                        'address1': orderShippingAddressAddress1,
                        'address2': orderShippingAddressAddress2,
                        'city': orderShippingAddressCity,
                        'postal_code': orderShippingAddressPostalCode,
                        'province': orderShippingAddressStateCode,
                        'country': orderShippingAddressCountryCode,
                        'phone': orderShippingAddressPhone
                    },
                    "locale": "en_US",
                    "purchase_date": new Date().toISOString(),
                    "subtotal_price": subTotal.value,
                    "total_shipping": shippingTotalCost.value,
                    "total_tax": totalTax,
                    "total_discounts": orderDiscount.value,
                    "total_price": orderTotal,
                    "currency": session.getCurrency().getCurrencyCode(),
                    "extra":[
                        {
                            "name":"status",
                            "value": order.confirmationStatus.displayValue
                        },
                        {
                            "name":"payment_status",
                            "value": order.paymentStatus.displayValue
                        }
                    ],
                    "line_items": lincLineItems
                };
                if(mailType != null && (mailType == 'orderConfirmation' || mailType == 'Auto Delivery Order Confirmation') && lincLineItems.length) {
                    orderDetails['LINC_PAYLOAD'] = JSON.stringify(lincPayload);
                }
            }
    } catch (e) {
        var error = e;
    }
    return orderDetails;
}

module.exports = {
	prepareOrderPayload: prepareOrderPayload
};