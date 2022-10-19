'use strict';

/* global request, session */

var StringUtils = require('dw/util/StringUtils');
var Site = require('dw/system/Site');
var Logger = require('dw/system/Logger');
var ServiceRegistry = require('dw/svc/LocalServiceRegistry');
var productMgr = require('dw/catalog/ProductMgr');
var orderMgr = require('dw/order/OrderMgr');
var basketMgr = require('dw/order/BasketMgr');
var money = require('dw/value/Money');
var imageSize = Site.getCurrent().getCustomPreferenceValue('klaviyo_image_size') || 'large';
var apiKey = Site.getCurrent().getCustomPreferenceValue('klaviyo_api_key');
var HTTPRequestPart = require('dw/net/HTTPRequestPart');

/**
 * Uses the service framework to get the Klaviyo Service configuration
 * (please see metadata/klaviyo-services.xml) and executes a get call with the payload generated from the
 * preparePayload() method.
 *
 * This is a track API call. Please refer https://www.klaviyo.com/docs/http-api
 *
 * @param email
 * @param data
 * @param event
 * @returns
 */
 function sendEmail(email, data, event) {
    var requestBody = {};
    var resultObj = {};

    var logger = Logger.getLogger('Klaviyo', 'klaviyoUtils - sendEmail()');

    if (KlaviyoTrackService == null || empty(email)) {
        logger.error('sendEmail() failed for email: ' + obfuscateKlEmail(email) + '. Service Connection for send email via Klaviyo returned null.');
        return;
    }

    logger.info('Send email: ' + email + ' Event: ' + event);

	requestBody = preparePayload(email, data, event);

    //KlaviyoTrackService.addParam('data', klaviyoData);

    var result = KlaviyoTrackService.call(requestBody);

    if (result == null) {
        logger.error('Result for send email via Klaviyo returned null. Payload info: ' +  requestBody);
        return;
    }

    resultObj = JSON.parse(result.object);

    if (resultObj == 1) {
        logger.info('Send email via Klaviyo is successful. Payload info ' + requestBody);
    } else {
        logger.error('Send email via Klaviyo failed. Payload info ' +  requestBody);
    }

    return resultObj;
}


/**
 * Prepares Track API Payload Data in format per
 * https://www.klaviyo.com/docs/http-api
 *
 * @param email
 * @param data
 * @param event
 * @returns
 */
function preparePayload(email, data, event) {
    var jsonData = {};
    jsonData.token = Site.getCurrent().getCustomPreferenceValue('klaviyo_account');
    jsonData.event = event;
    /*
    if (WHITELISTED_EVENTS.indexOf(event) > -1) {
        jsonData.service = 'demandware';
    } */
    var customerProperties = {};
    customerProperties.$email = email;
    jsonData.customer_properties = customerProperties;
    jsonData.properties = data;
    jsonData.time = Math.floor(Date.now() / 1000);
    return JSON.stringify(jsonData);
}

/**
 * Prepares GiftCard Object and set necessary details
 *
 * @param giftCard
 * @returns {Object}
 */

 function preparegiftCardObject(giftCard) {
    var giftCardObj = {};
    giftCardObj['Product Name'] = 'e-Giftcard';
    // giftCardObj['Product ID'] = dw.system.Site.getCurrent().getCustomPreferenceValue('EgiftProduct-ID');
    giftCardObj['Recipient Email'] = giftCard.recipientEmail;
    giftCardObj['Recipient Name'] = giftCard.recipientName;
    giftCardObj['Sender Name'] = giftCard.senderName;
    giftCardObj.Message = giftCard.message;
    giftCardObj.Value = giftCard.price.value;
    return giftCardObj;
}

/**
 * Prepares Viewed Product Object and set necessary details
 * @param {string} pageProductID - product id of the product viewed
 * @param {Object} viewedProduct - product Object
 * @returns {Object} - returns payload
 */
function prepareViewedProductEventData(pageProductID, viewedProduct) {
    var klData = {};
    klData.event = 'Viewed Product';
    klData.viewedProductID = pageProductID;
    klData.viewedProductName = viewedProduct.name;
    klData.viewedProductPage = viewedProduct.getPageURL();
    klData.viewedProductAlternateImage = (viewedProduct.custom.benefitsSection2Image) ? viewedProduct.custom.benefitsSection2Image.getAbsURL() : null;
    klData.viewedProductImage = imageSize ? viewedProduct.getImage(imageSize).getAbsURL().toString() : null;
    var price = viewedProduct.getPriceModel().getPrice().getValue();
    if (empty(price) || price <= 0) {
        price = viewedProduct.getPriceModel().getMinPrice().getValue();
    }
    klData.viewedProductPrice = price;
    klData.viewedProductDesc = viewedProduct.custom.benefitsSection1;
    klData.viewedProductComingSoon = viewedProduct.custom.comingSoon;
    klData.comingSoon = !empty(viewedProduct.custom.oosProductStatus)?viewedProduct.custom.oosProductStatus:''
    klData.viewedProductPageURL = require('dw/web/URLUtils').https('Product-Show', 'pid', pageProductID).toString();
    klData.viewedProductUPC = viewedProduct.UPC;
    klData.viewedProductAvailability = viewedProduct.availabilityModel.availability;
    klData.viewedProductCategories = createCategories(viewedProduct);
    klData.viewedProductPrimaryCategory = !empty(viewedProduct.getPrimaryCategory()) ? viewedProduct.getPrimaryCategory().displayName : '';  // eslint-disable-line
    return klData;
}

/**
 * Creating data layer from the order object and send to klaviyo
 * @param {Object} currentOrder - Order Object
 * @returns {Object} dwareOrder - order payload
 */
function prepareOrderConfirmationEventForKlaviyo(currentOrder) {
    var dwareOrder;
    var logger = Logger.getLogger('Klaviyo', 'klaviyoUtils - orderConfirmation()');
    try {
        // putting this here for perormance
        // site specific order object */
        var emailUtils = require('*/cartridge/scripts/utils/klaviyo/emailUtils');
        dwareOrder = emailUtils.prepareOrderPayload(currentOrder, false, 'orderConfirmation');
        var orderEmail = currentOrder.customerEmail ? currentOrder.customerEmail : currentOrder.getCustomer().profile.email;
        sendEmail(orderEmail, dwareOrder, 'Placed Order');
        // giftcards
        var giftCertCollection = currentOrder.getGiftCertificateLineItems().toArray();
        var orderGiftCards = [];

        for (var giftCertIndex = 0; giftCertIndex < giftCertCollection.length; giftCertIndex++) {
            // gift certificates don't count as orderItems so we need to reconcile that ourselves
            // var giftCardId = dw.system.Site.getCurrent().getCustomPreferenceValue('EgiftProduct-ID');

            /* klData["Item Count"]++ */
            var giftCard = giftCertCollection[giftCertIndex];
            var giftCardObj = {};
            giftCardObj = preparegiftCardObject(giftCard);
            orderGiftCards.push(giftCardObj);
        }

        // send an event for transactional gift certificate emails
        for (var totalOrderGiftCards = 0; totalOrderGiftCards < orderGiftCards.length; totalOrderGiftCards++) {
            var theGiftCard = orderGiftCards[totalOrderGiftCards];
            sendEmail(theGiftCard['Recipient Email'], theGiftCard, 'e-Giftcard Notification');
        }
    } catch (e) {
        logger.debug('prepareOrderConfirmationEventForKlaviyo -- error ' + e.message + ' at ' + e.lineNumber);
    }
    return dwareOrder;
}

function createCategories(product) {
    var productCategoryIndex;
    var currentCategory;
    var arrayOfCategories = [];
    var logger = Logger.getLogger('Klaviyo', 'klaviyoUtils - createCategories()');
    try {
        if (product.allCategories) {
            var productCategoryArray = product.allCategories.toArray();
            for (productCategoryIndex = 0; productCategoryIndex < productCategoryArray.length; productCategoryIndex++) {
                currentCategory = productCategoryArray[productCategoryIndex].displayName;
                arrayOfCategories.push(currentCategory);
            }
        }
    } catch (e) {
        logger.debug('Error occured while creating the category ' + e.message);
    }
    return arrayOfCategories;
}

/**
 * Removing duplicate items from an array
 * @param array
 * @returns array
 */

 function removeDuplicates(items) {
    var unique = {};
    items.forEach(function(i) {
        if (!unique[i]) {
            unique[i] = true;
        }
    });
    return Object.keys(unique);
}


/**
 * Creating data layer from the basket for add to cart event.
 * @param {Object} klData - req object
 * @param {string} pid - product id
 * @param {number} quantity - qty selected
 * @returns {Object} kldataAddToCart - return
 */
 function prepareAddToCartEventForKlaviyo() {
    var basketItems = basketMgr.getCurrentBasket().getProductLineItems().toArray();
   // var curProd = productMgr.getProduct(pid);
    var kldataAddToCart = {};
    kldataAddToCart.event = 'Added to Cart';
    kldataAddToCart.basketGross = basketMgr.getCurrentBasket().getTotalGrossPrice().getValue().valueOf();
    kldataAddToCart.itemCount = basketItems.length;
    kldataAddToCart.lineItems = [];
    kldataAddToCart.items = [];
    kldataAddToCart.categories = [];
    kldataAddToCart.primaryCategories = [];

    for (var itemIndex = 0; itemIndex < basketItems.length; itemIndex++) {
        var lineItem = basketItems[itemIndex];
        var currentProductID = lineItem.productID;
        var basketProduct = productMgr.getProduct(currentProductID);

        if (currentProductID != null && !empty(basketProduct) && basketProduct.getPriceModel().getPrice().value > 0) {  // eslint-disable-line
            var primaryCategory;
            if (basketProduct.variant && basketProduct.masterProduct.getPrimaryCategory()) {
                primaryCategory = basketProduct.masterProduct.getPrimaryCategory().displayName;
            } else if (basketProduct && basketProduct.getPrimaryCategory()) {
                primaryCategory = basketProduct.getPrimaryCategory().displayName;
            }
            var imageSizeOfProduct = null;
            if (imageSize && basketProduct.getImage(imageSize)) {
                imageSizeOfProduct = basketProduct.getImage(imageSize).getAbsURL().toString();
            }
            kldataAddToCart.lineItems.push({
                productID: currentProductID,
                productName: basketProduct.name,
                productImageURL: imageSizeOfProduct,
                productAlternateImage : !empty(basketProduct.custom.benefitsSection2Image) ? basketProduct.custom.benefitsSection2Image.getAbsURL().toString() : null,
                productPageURL: require('dw/web/URLUtils').https('Product-Show', 'pid', currentProductID).toString(),
                price: StringUtils.formatMoney(money(basketProduct.getPriceModel().getPrice().value, session.getCurrency().getCurrencyCode())),
                productDescription: basketProduct.custom.benefitsSection1 ? basketProduct.custom.benefitsSection1.toString() : null,
                productUPC: basketProduct.UPC,
                productAvailabilityModel: basketProduct.availabilityModel.availability,
                categories: createCategories(basketProduct),
                comingSoon: basketProduct.custom.comingSoon,
                primaryCategory: primaryCategory
            });
            kldataAddToCart.items.push(basketProduct.name);
            kldataAddToCart.categories.push.apply(kldataAddToCart.categories, kldataAddToCart.lineItems[itemIndex].categories);
            kldataAddToCart.primaryCategories.push(kldataAddToCart.lineItems[itemIndex].primaryCategory);
        }
    }
    return kldataAddToCart;
}

function prepareCheckoutEventForKlaviyo(currentBasket) {
    try {
        var klCheckoutData = {};
        var basketItems = currentBasket.getProductLineItems().toArray();
        // Create some top-level event data
        klCheckoutData.event = 'Started Checkout';
        klCheckoutData['Basket Gross Price'] = currentBasket.getTotalGrossPrice().value;
        klCheckoutData['Item Count'] = basketItems.length;

        // prepare to add top-level data while iterating through product line items
        klCheckoutData.line_items = [];
        klCheckoutData.Categories = [];
        klCheckoutData.Items = [];
        klCheckoutData.$email = currentBasket.customerEmail;

        for (var itemIndex = 0; itemIndex < basketItems.length; itemIndex++) {
            var lineItem = basketItems[itemIndex];
            var currentProductID = lineItem.productID;
            var basketProduct = productMgr.getProduct(currentProductID);

            if ( currentProductID != null && !empty(basketProduct) && (basketProduct.getPriceModel().getPrice().value > 0 || currentProductID == giftBuilderSKUID)) {
                var productObj = prepareProductObj(lineItem, basketProduct, currentProductID);

                // add top-level data for the event for segmenting, etc.
                klCheckoutData.line_items.push(productObj);
                klCheckoutData.Categories.push.apply(klCheckoutData.Categories, klCheckoutData.line_items[itemIndex].Categories);
                klCheckoutData.Items.push(klCheckoutData.line_items[itemIndex]['Product Name']);
            }
        }
    } catch (e) {
        klCheckoutData.data.debug_error = [e.message, e.lineNumber];
    }
    return klCheckoutData;
}

function prepareProductObj(lineItem, basketProduct, currentProductID) {
    var productObj = {};
    productObj['Product ID'] = currentProductID;
    productObj['Product Name'] = basketProduct.name;
    productObj['Product Image URL'] = imageSize ? basketProduct.getImage(imageSize).getAbsURL().toString() : null;
    productObj["Product Alternate Image URL"] = !empty(basketProduct.custom.benefitsSection2Image) ? basketProduct.custom.benefitsSection2Image.getAbsURL().toString() : null;
    productObj.Price = dw.util.StringUtils.formatMoney(dw.value.Money(basketProduct.getPriceModel().getPrice().value, session.getCurrency().getCurrencyCode()));
    productObj['Product Description'] = basketProduct.pageDescription ? basketProduct.pageDescription.toString() : null;
    productObj['Product Page URL'] = require('dw/web/URLUtils').https('Product-Show', 'pid', currentProductID).toString();
    productObj['Product UPC'] = basketProduct.UPC;
    productObj['Product Availability Model'] = basketProduct.availabilityModel.availability;
    productObj["Coming Soon"] = basketProduct.custom.comingSoon;
    productObj.Categories = createCategories(basketProduct);
    return productObj;
}

/**
 * Send shipment confirmation for shipped order's
 * @param orderId
 * @returns object
 */
 function sendShipmentConfirmation(orderID) {
    var logger = Logger.getLogger('Klaviyo', 'klaviyoUtils - sendShipmentConfirmation()');

    var orderObj = orderMgr.searchOrders('orderNo={0} AND shippingStatus={1}', 'creationDate desc', orderID,
        dw.order.Order.SHIPPING_STATUS_SHIPPED);
    var orderList = orderObj.asList();

    var sendStatus = false;
    if (!empty(orderList)) {
        for (var i in orderList) {
            var order = orderList[i];
            try {
                var emailUtils = require('*/cartridge/scripts/utils/klaviyo/emailUtils');
                emailUtils.sendOrderEmail(order, 'Shipping Confirmation');
                sendStatus = true;
            } catch (e) {
                logger.error('resendKlaviyoShipmentEmailsJob failed for order: ' + order.getOrderNo() + '. Error: ' + e.message);
            }
        }
    }
    return sendStatus;
}

/**
 * Prepare data's needs to be send to klaviyo in klData object
 */
var buildDataLayer = function() {
    var klData = {};
    var pageContext,
        currentBasket,
        basketHasLength,
        currentOrder,
        viewedProduct,
        httpParameterMap,
        pageProductID,
        orderID,
        searchResultsCount,
        searchTerm,
        pageCategoryId;

    klData.data = '';
    //klData.data.debug_error = '';

    httpParameterMap = request.httpParameterMap;
    pageContext = httpParameterMap.pagecontexttype;
    pageProductID = httpParameterMap.productid;
    orderID = httpParameterMap.orderno;
    searchResultsCount = httpParameterMap.searchresultscount;
    searchTerm = httpParameterMap.searchterm.value;
    pageCategoryId = httpParameterMap.pagecgid.value;

    try {
        // Checkout Started event

        if (pageContext == 'checkout') {
            currentBasket = basketMgr.getCurrentBasket();
            basketHasLength = currentBasket.getProductLineItems().toArray().length >= 1;

            if (basketHasLength) {
                klData = prepareCheckoutEventForKlaviyo(currentBasket);
            }
        }

        // Order Placed Event
        if (pageContext == 'orderconfirmation' && orderID || !empty(orderID.rawValue)) {
            currentOrder = orderMgr.getOrder(orderID);
            prepareOrderConfirmationEventForKlaviyo(currentOrder);
        }


        // Viewed Product event
        if (pageContext == 'product') {
            viewedProduct = productMgr.getProduct(pageProductID);
            klData = prepareViewedProductEventData(pageProductID, viewedProduct);
        }

        // Category Viewed event
        if (pageContext == 'search' && !empty(pageCategoryId)) {
            klData.event = 'Viewed Category';
            klData.pageCategoryId = pageCategoryId;
        }

        // Site Search event
        if (!empty(searchTerm)) {
            klData.event = 'Site Search';
            klData.searchTerm = searchTerm;
            klData.searchResultsCount = (!empty(searchResultsCount)) ? searchResultsCount.value : 0;
        }
    } catch (e) {
        klData.data.debug_error = [e.message, e.lineNumber];
    }

    return klData;
};

/**
 * @param {string} pid - id of the product
 * @param {number} quantity - quantity of product
 * @returns {Object} klData - response
 * Prepare data's needs to be send to klaviyo  in klData object for add to cart
 */
 var buildCartDataLayer = function() {
    var klData;
   // klData = {};
    var isValidBasket;
    var basketHasLength;

    isValidBasket = (basketMgr.getCurrentBasket());
    if (isValidBasket) {
        basketHasLength = (basketMgr.getCurrentBasket().getProductLineItems().toArray().length >= 1);
    }

    if (basketHasLength) {
        klData = prepareAddToCartEventForKlaviyo();
    }

    return klData;
};

/**
 * Creating page context from the request path
 * @returns context
 */
 var getContext = function() {
    var path = request.httpPath;
    var parts = path.split('/');
    var context = null;
    if (parts[parts.length - 1] == 'Checkout-Begin') {
        context = 'checkout';
    }
    return context;
};

/**
 * Initializing add to cart event
 * @returns
 */
 var trackAddToCart = function() {
    var klaviyoDataLayer = buildCartDataLayer();
    var email = '';
    if (!empty(session.getCustomer()) && !empty(session.getCustomer().profile)) {
        var currentUser = session.getCustomer().profile;
        email = currentUser.email;
    }
    var event = 'Add To Cart';
    sendEmail(email, klaviyoDataLayer, event);
};

/**
 * Obfuscating an email address for log file
 * @returns obfuscated email like d**********@k******.com
 */
function obfuscateKlEmail(email) {
    if (empty(email)) {
        return;
    }
    var astericks = '**********';
    var splitEmail = email.split('@');
    var firstLetter = splitEmail[0][0];
    var domainLetter = splitEmail[1][0];
    var newDomain = domainLetter.concat(astericks);
    var newStartEmail = firstLetter.concat(astericks + '@');
    var obfuscatedEmail = newStartEmail.concat(newDomain);
    return obfuscatedEmail;
}

module.exports = {
    sendEmail: sendEmail,
    preparegiftCardObject: preparegiftCardObject,
    prepareViewedProductEventData: prepareViewedProductEventData,
    prepareProductObj: prepareProductObj,
    prepareCheckoutEventForKlaviyo: prepareCheckoutEventForKlaviyo,
    prepareOrderConfirmationEventForKlaviyo: prepareOrderConfirmationEventForKlaviyo,
    prepareAddToCartEventForKlaviyo: prepareAddToCartEventForKlaviyo,
    sendShipmentConfirmation: sendShipmentConfirmation,
    createCategories: createCategories,
    buildDataLayer: buildDataLayer,
    buildCartDataLayer: buildCartDataLayer,
    getContext: getContext,
    trackAddToCart: trackAddToCart,
    removeDuplicates: removeDuplicates
};


// HTTP Services

var KlaviyoTrackService = ServiceRegistry.createService('KlaviyoTrackService', {
    /**
     * Create the service request
     * - Set request method to be the HTTP GET method
     * - Construct request URL
     * - Append the request HTTP query string as a URL parameter
     *
     * @param {dw.svc.HTTPService} svc - HTTP Service instance
     * @param {Object} params - Additional paramaters
     * @returns {void}
     */
    createRequest: function(svc,data) {
        svc.setRequestMethod('POST');
        return [
            new HTTPRequestPart('data', data)];
    },
    /**
     * JSON parse the response text and return it in configured retData object
     *
     * @param {dw.svc.HTTPService} svc - HTTP Service instance
     * @param {dw.net.HTTPClient} client - HTTPClient class instance of the current service
     * @returns {Object} retData - Service response object
     */
    parseResponse: function(svc, client) {
        return client.text;
    },

    getRequestLogMessage: function() {
        var reqLogMsg = 'sending klaviyo track payload';
        return reqLogMsg;
    },

    getResponseLogMessage: function() {}

});
