/**
 * GTM order confirmation purchase data
 **/

$(document).ready(function(){
    if (!window.dataLayer) {
        window.dataLayer = [];
    }

    try {
        var orderInfoElm = document.getElementById("gtmConfirmationPurchaseData");
        if (orderInfoElm) {
            var orderObj = JSON.parse(orderInfoElm.value);
            dataLayer.push(orderObj);

            // GA 4 Datalayer
            var purchaseObj = {"event":"purchase"};
            var ecommerceObj = {
                'transaction_id': orderObj.transactionId,
                'affiliation': 'Tatcha',
                'value': orderObj.transactionTotal,
                'tax': orderObj.transactionTax,
                'shipping': orderObj.transactionShipping,
                'currency': 'USD',
                'coupon': orderObj.discountCoupon
            }

            var items = [];
            for (var i = 0; i < orderObj.transactionProducts.length; i++) {
                items.push({
                    item_name: orderObj.transactionProducts[i].name,
                    item_id: orderObj.transactionProducts[i].sku,
                    price: orderObj.transactionProducts[i].price,
                    item_brand: 'Tatcha',
                    item_category: '',
                    item_variant: '',
                    quantity: orderObj.transactionProducts[i].quantity,
                });
            }

            ecommerceObj.items = items;
            purchaseObj.ecommerce = ecommerceObj;

            //	dataLayer.push({ ecommerce: null });
            dataLayer.push({
                'event': 'purchase',
                'ecommerce': purchaseObj
            });
        }
    } catch (e) {}
});
