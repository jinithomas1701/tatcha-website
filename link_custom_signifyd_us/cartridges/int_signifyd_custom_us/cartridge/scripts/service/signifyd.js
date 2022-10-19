/**
* Main Signifyd Script File
* Two main public methods are Call and Callback
*
* Call - for export order info to.
* Callback - for receive data about guarantie Status.
*
*/
var Site = require('dw/system/Site');
var System = require('dw/system/System');
var sitePrefs = Site.getCurrent().getPreferences();
var APIkey = sitePrefs.getCustom().SignifydApiKey;
var HoldBySignified = sitePrefs.getCustom().SignifydHoldOrderEnable;
var EnableDecisionCentre = sitePrefs.getCustom().SignifydEnableDecisionCentre;
var EnableCartridge = sitePrefs.getCustom().SignifydEnableCartridge;
var Mac = require('dw/crypto/Mac');
var Logger = require('dw/system/Logger');
var Transaction = require('dw/system/Transaction');
var Encoding = require('dw/crypto/Encoding');
var URLUtils = require('dw/web/URLUtils');
var Calendar = require('dw/util/Calendar');
var StringUtils = require('dw/util/StringUtils');
var BasketMgr = require('dw/order/BasketMgr');
var OrderMgr = require('dw/order/OrderMgr');
var ProductMgr = require('dw/catalog/ProductMgr');
var signifydInit = require('int_signifyd/cartridge/scripts/service/signifydInit');
var SignifydMappings = JSON.parse(sitePrefs.getCustom().SignifydMappings);
var Shipment = require('dw/order/Shipment');
var Order = require('dw/order/Order');
var Resource = require('dw/web/Resource');
var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');
var Mail = require('dw/net/Mail');

/**
 * Get information about the SFCC version
 * @return {Object} - json describing the version
 */
function getPlatform() {
    return {
        storePlatform: 'Salesforce Commerce Cloud',
        storePlatformVersion: String(System.getCompatibilityMode()), // returns a string with the platform version: 1602
        signifydClientApp: 'Salesforce Commerce Cloud',
        signifydClientAppVersion: '19.2' // current year + number of certifications in the year
    };
}

// eslint-disable-next-line valid-jsdoc
/**
 * Get Information about customer in JSON format
 * acceptable on Stringifyd side
 *
 * @param {dw.order.Shipment} shipment to be verifyed
 * @param {String} email: String from order propertie
 * @return {Array}  Array of json objects for each recipient.
 */
function getRecipient(shipments, email) {
    var recipients = [];

    if (!empty(shipments)) {
        var iterator = shipments.iterator();
        while (iterator.hasNext()) {
            var shipment = iterator.next();
            recipients.push({
                fullName: shipment.shippingAddress.fullName,
                confirmationEmail: email,
                confirmationPhone: shipment.shippingAddress.phone,
                organization: shipment.shippingAddress.companyName,
                shipmentId: shipment.shipmentNo,
            });
            if(!empty(shipment.productLineItems)) {
                recipients.push({
                    deliveryAddress: {
                        streetAddress: shipment.shippingAddress.address1,
                        unit: shipment.shippingAddress.address2,
                        city: shipment.shippingAddress.city,
                        provinceCode: shipment.shippingAddress.stateCode,
                        postalCode: shipment.shippingAddress.postalCode,
                        countryCode: shipment.shippingAddress.countryCode.value
                    }
                });
            }
        }
    }

    return recipients;
}

function getGiftCardRecipient(giftCertificates) {
    var result = new Array(); 
    if(!empty(giftCertificates)) {  		
	    for (var i = 0; i < giftCertificates.length; i++) {
	        var giftCertificate = giftCertificates[i];
	        result.push({
	            fullName: giftCertificate.recipientName,
	            confirmationEmail: giftCertificate.recipientEmail,
	            confirmationPhone: '',
	            deliveryAddress: {  "streetAddress": "",
							        "city": "",
							        "provinceCode": "",
							        "postalCode": "",
							        "countryCode": ""
							      } 
	        });
	    }
    }
    return result;
}

// eslint-disable-next-line valid-jsdoc
/**
 * Get list of shipments in JSON format
 * acceptable on Stringifyd side
 * * @param {Array} shipments array .
 * @return {Array}  array of shipments as json objects.
 */
function getShipments(shipments) {
    var Ashipments = [];
    for (var i = 0; i < shipments.length; i++) {
        var shipment = shipments[i];
            if(!empty(shipment.productLineItems)) {
                Ashipments.push({
                    shipmentId: shipment.shipmentNo,
                    shipper: shipment.standardShippingLineItem.ID,
                    shippingMethod: shipment.shippingMethod.description,
                    shippingPrice: shipment.adjustedShippingTotalNetPrice.value,
                    trackingNumber: shipment.trackingNumber
                });
            } else {
                Ashipments.push({
                    shipper: shipment.standardShippingLineItem.ID,
                    shippingMethod: "ELECTRONIC",
                    shippingPrice: shipment.adjustedShippingTotalNetPrice.value,
                    trackingNumber: ""
            });
        }
    }
    return Ashipments;
}

/**
 * Get Information about customer in JSON format
 * acceptable on Stringifyd side
 *
 * @param {order}  order that just have been placed.
 * @return {Object}  json objects describes User.
 */
function getUser(order) {
    if (order.customer.profile) {
        var phone;
        if (order.customer.profile.phoneMobile) phone = order.customer.profile.phoneMobile;
        if (order.customer.profile.phoneBusiness) phone = order.customer.profile.phoneBusiness;
        if (order.customer.profile.phoneHome) phone = order.customer.profile.phoneHome;
        var creationCal = new Calendar(order.customer.profile.getCreationDate());
        var updateCal = new Calendar(order.customer.profile.getLastModified());
        return {
            email: order.customer.profile.email,
            username: order.customerName,
            phone: phone,
            createdDate: StringUtils.formatCalendar(creationCal, "yyyy-MM-dd'T'HH:mm:ssZ"),
            accountNumber: order.customerNo,
            lastUpdateDate: StringUtils.formatCalendar(updateCal, "yyyy-MM-dd'T'HH:mm:ssZ"),
            aggregateOrderCount: order.customer.activeData.getOrders(),
            aggregateOrderDollars: order.customer.activeData.getOrderValue(),
        };
    }
    return {
        email: order.customerEmail,
        username: order.customerName,
        phone: '',
        createdDate: '',
        accountNumber: order.customerNo
    };
}

/**
 * Get information about seller in JSON format
 *
 * @return {Object} json  object with String attributes.
 */
function getSeller() {
    var settings = sitePrefs.getCustom();// ["SignifydApiKey"];
    return {
        name: settings.SignifydSellerName,
        domain: settings.SignifydSellerDomain,
        shipFromAddress: {
            streetAddress: settings.SignifydFromStreet,
            unit: settings.SignifydFromUnit,
            city: settings.SignifydFromCity,
            provinceCode: settings.SignifydFromState,
            postalCode: settings.SignifydFromPostCode,
            countryCode: settings.SignifydFromCountry,
            latitude: settings.SignifydFromLatitude,
            longitude: settings.SignifydFromLongitude
        },
        corporateAddress: {
            streetAddress: settings.SignifydCorporateStreet,
            unit: settings.SignifydCorporateUnit,
            city: settings.SignifydCorporateCity,
            provinceCode: settings.SignifydCorporateState,
            postalCode: settings.SignifydCorporatePostCode,
            countryCode: settings.SignifydCorporateCountry,
            latitude: settings.SignifydCorporateLatitude,
            longitude: settings.SignifydCorporateLongitude
        }
    };
}

/**
 * Get list of products in JSON format
 * acceptable on Stringifyd side
 *
 * @param {products} products array of products.
 * @return {result} - array of products as json objects.
 */
function getProducts(products, giftCertificates) {
    var result = [];

    if(!empty(products)) {
        for (var i = 0; i < products.length; i++) {
            var product = products[i];
            var primaryCat = product.product.getPrimaryCategory();

            // get master product's primary category if variant doesn't have one
            //RDMP-4507: Commenting this code since master category is not relevant to us.
			/*	
				if (empty(primaryCat) && product.product.isVariant() && !product.product.isMaster()) {
	                primaryCat = product.product.masterProduct.getPrimaryCategory();
	            }
			*/
            var parentCat = !empty(primaryCat) ? primaryCat.getParent() : null;

            result.push({
                itemId: product.productID,
                itemName: product.productName,
                itemUrl: URLUtils.abs('Product-Show', 'pid', product.productID).toString(),
                itemQuantity: product.quantityValue,
                itemPrice: product.price.value/product.quantity.value,
                itemSubCategory: !empty(primaryCat) ? primaryCat.ID : null,
                itemCategory: !empty(parentCat) ? parentCat.ID : (!empty(primaryCat) ? primaryCat.ID : null),
                itemImage: (product.product && product.product.getImage('large', 0)) ? product.product.getImage('large', 0).getAbsURL().toString() : '',
                shipmentId: product.shipment.shipmentNo,
            });
        }
    }

    if(!empty(giftCertificates)) {
        var giftCardId = dw.system.Site.getCurrent().getCustomPreferenceValue('EgiftProduct-ID');
        var giftCardProductDetail = ProductMgr.getProduct(giftCardId);

        for (var i = 0; i < giftCertificates.length; i++) {
            var giftCertificate = giftCertificates[i];
            result.push({
                itemId: giftCardId,
                itemName: giftCardProductDetail.name,
                itemUrl: dw.web.URLUtils.abs('GiftCert-GiftPurchase').toString(),
                itemQuantity: 1,
                itemPrice: giftCertificate.price.value,
                itemIsDigital: true
            });
        }
    }
    return result;
}

// eslint-disable-next-line valid-jsdoc
/**
 * Get Main Payment Instrument. It's the first credit card payment instrument,
 * If not available, the first payment instrument is returned
 *
 * @param {dw.util.Collection} paymentInstruments collection of PaymentInstruments on order
 * @return {dw.order.PaymentInstrument} main payment instrument
 */
function getMainPaymentInst(paymentInstruments) {
    var creditCardPaymentInst = null;
    var firstPaymentInst = null;
    if (!empty(paymentInstruments)) {
        var iterator = paymentInstruments.iterator();
        firstPaymentInst = paymentInstruments[0];

        while (iterator.hasNext() && empty(creditCardPaymentInst)) {
            var paymentInst = iterator.next();
            if (paymentInst.getPaymentMethod() === dw.order.PaymentInstrument.METHOD_CREDIT_CARD) {
                creditCardPaymentInst = paymentInst;
            }
        }
    }

    if (!empty(creditCardPaymentInst)) {
        return creditCardPaymentInst;
    } else {
        return firstPaymentInst;
    }
}

/**
 * Get Credit Card Bin. It's the first 6 digits of the credit card number,
 * If not available, null is returned
 *
 * @param {dw.order.PaymentInstrument} mainPaymentInst main payment instrument on order
 * @return {String} credit card bin or null
 */
/* Taking cardbin from payment instrument 
function getCardBin(mainPaymentInst) {
    var cardBin = null;
    try {
        if (!empty(mainPaymentInst.getCreditCardNumber()) && mainPaymentInst.getCreditCardNumber().indexOf("*") < 0) {
            cardBin = mainPaymentInst.getCreditCardNumber().substring(0, 6);
        } else if (!empty(session.forms.billing.creditCardFields) &&
            !empty(session.forms.billing.creditCardFields.cardNumber) && !empty(session.forms.billing.creditCardFields.cardNumber.value)) {
            cardBin = session.forms.billing.creditCardFields.cardNumber.value.substring(0, 6);
        }
    } catch (e) {
        Logger.getLogger('Signifyd', 'signifyd').error('Error: Error while getting credit card bin number: {0}', e.message);
    }
    return cardBin;
}*/

// eslint-disable-next-line valid-jsdoc
/**
 * Get Discount Codes array, which are the coupon codes applied to the order
 *
 * @param {dw.util.Collection} couponLineItems collection of CouponLineItems on order
 * @return {Array} coupon codes and discount amount/percentage
 */
function getDiscountCodes(couponLineItems) {
    var discountCodes = [];
    if (!empty(couponLineItems)) {
        var iterator = couponLineItems.iterator();

        while (iterator.hasNext()) {
            var coupon = iterator.next();
            /*var priceAdjustments = coupon.getPriceAdjustments().iterator();
            var discountAmount = null;
            var discountPercentage = null;

            while (priceAdjustments.hasNext() && empty(discountAmount) && empty(discountPercentage)) {
                var priceAdj = priceAdjustments.next();
                var discount = priceAdj.getAppliedDiscount();

                if (discount.getType() === dw.campaign.Discount.TYPE_AMOUNT) {
                    discountAmount = discount.getAmount();
                } else if (discount.getType() === dw.campaign.Discount.TYPE_PERCENTAGE) {
                    discountPercentage = discount.getPercentage();
                }
            }*/

            discountCodes.push({
                amount: 1,
                percentage: null,
                code: coupon.getCouponCode()
            });
        }
    }
    return discountCodes;
}

// eslint-disable-next-line valid-jsdoc
/**
 * Sets or increments the retry count for the Order (used in the Job)
 * @param {dw.order.Order} - the current order being integrated
 */
function saveRetryCount(order) {
    Transaction.wrap(function () {
        if (empty(order.custom.SignifydRetryCount)) {
            // eslint-disable-next-line no-param-reassign
            order.custom.SignifydRetryCount = 0;
        }
        else {
        // eslint-disable-next-line no-param-reassign,operator-assignment
        order.custom.SignifydRetryCount = order.custom.SignifydRetryCount + 1;
        }
    });
}


// eslint-disable-next-line valid-jsdoc
/**
 * Process data about order when decision was received.
 *
 * @param {body} - body of request from Signifyd.
 */
function process(body) {
    var orderId = body.orderId || body.customerCaseId;
    var order = OrderMgr.getOrder(orderId);
    var receivedScore = body.score.toString();
    var roundScore = receivedScore;
    if (receivedScore.indexOf('.') >= 0) {
        roundScore = receivedScore.substring(0, receivedScore.indexOf('.'));
    }
    var score = Number(roundScore);
    var isFailedRequest = false;
    if (order && body.orderUrl) {
        Transaction.wrap(function () {
            var orderUrl;
            var modifiedUrl;
            if (body.orderUrl) {
                orderUrl = body.orderUrl;
                modifiedUrl = orderUrl.replace(/(.+)\/(\d+)\/(.+)/, 'https://www.signifyd.com/cases/$2');
            } else {
                modifiedUrl = 'https://www.signifyd.com/cases/' + body.caseId;
            }
            order.custom.SignifydOrderURL = modifiedUrl;
            order.custom.SignifydFraudScore = score;
            
        });
    } else if (order && body.checkpointAction) {
       
            Transaction.wrap(function () {
            if (EnableDecisionCentre) {
                if (body.checkpointAction === 'ACCEPT') {
                    order.custom.SignifydPolicy = 'accept';
                } else if (body.checkpointAction === 'REJECT') {
                    order.custom.SignifydPolicy = 'reject';
                } else {
                    order.custom.SignifydPolicy = 'hold';
                }

                order.custom.SignifydPolicyName = body.checkpointActionReason || '';

                if (HoldBySignified) { //processing is enabled in site preferences
                    if (body.checkpointAction == 'ACCEPT') {
                        order.exportStatus = 2; //Ready to export
                    } else if (body.checkpointAction == 'REJECT') {
                        //Export Failed
                        if(order.status != Order.ORDER_STATUS_CANCELLED) {
                            order.setExportStatus(Order.EXPORT_STATUS_FAILED);
                            order.setConfirmationStatus(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
                            order.setStatus(Order.ORDER_STATUS_CANCELLED);
                            order.setCancelCode(body.checkpointAction);
                            order.setCancelDescription('Declined by Signifyd.');
                            order.custom.SignifydCancelGuaranteeStatus = true;//Setting to CancelGuaranteeStatus so that wont fetch again to signifyd cancel guarantee 
                            Logger.getLogger("Signifyd", "signifyd").info("Order status updated to cancelled by Signifyd. Order Number: " + order.orderNo);
                            
                            sendCancellationEmailNotification (order.currentOrderNo, order.custom.SignifydCaseID, body.checkpointAction);
                        }
                    } else {
                        order.exportStatus = 0; //NOTEXPORTED
                    }
                }
            } else {
                if (body.guaranteeDisposition) {
                    if (body.guaranteeDisposition !== 'APPROVED') {
                        order.custom.SignifydGuaranteeDisposition = 'declined';
                    } else {
                        order.custom.SignifydGuaranteeDisposition = 'approved';
                    }
                }

                if (HoldBySignified) {
                    if (body.guaranteeDisposition == "APPROVED") {
                        order.exportStatus = 2; //Ready to export
                    } else if (body.guaranteeDisposition == "DECLINED" || body.guaranteeDisposition == "CANCELED") {
                        //Export Failed
                        if(order.status != Order.ORDER_STATUS_CANCELLED) {
                            order.setExportStatus(Order.EXPORT_STATUS_FAILED);
                            order.setConfirmationStatus(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
                            order.setStatus(Order.ORDER_STATUS_CANCELLED);
                            order.setCancelCode(body.guaranteeDisposition);
                            order.setCancelDescription('Declined by Signifyd.');
                            order.custom.SignifydCancelGuaranteeStatus = true;//Setting to CancelGuaranteeStatus so that wont fetch again to signifyd cancel guarantee 
                            Logger.getLogger("Signifyd", "signifyd").info("Order status updated to cancelled by Signifyd. Order Number: " + order.orderNo);
                            
                            sendCancellationEmailNotification (order.currentOrderNo, order.custom.SignifydCaseID, body.guaranteeDisposition);
                        }
                    } else {
                        order.exportStatus = 0; //NOTEXPORTED
                    }
                }
            }
        
    });
    }else {
        Logger.getLogger('Signifyd', 'signifyd').error('An error===>>>: There is no order with ID = {0}', body.orderId);
        isFailedRequest = true;
    }
    return isFailedRequest;
}

function sendCancellationEmailNotification (orderNo, signifydCaseID, signifydReason){
	var cancellationNotificationEmailList = sitePrefs.getCustom().SignifydCancellationNotificationEmailList || [];
	
    var template = new Template("mail/cancellation_notification"),
        templateMap = new HashMap(),
        mailMsg = new Mail();
	var subject = "Signifyd Order Cancellation Notification: " + orderNo;
    templateMap.put("OrderNo", orderNo);
    templateMap.put("SignifydCaseID", signifydCaseID);
    templateMap.put("Reason", signifydReason);
	templateMap.put("Subject", subject);
	
    mailMsg.addTo(cancellationNotificationEmailList.join(","));
    mailMsg.setFrom("noreply@tatcha.com");
    mailMsg.setSubject(subject);
    mailMsg.setContent(template.render(templateMap));

    mailMsg.send();
}

// eslint-disable-next-line valid-jsdoc
/**
 * Receive decision about case related to order.
 * Validate signifyd server by api key and
 * delegate processing to next method.
 *
 * @param {request} - http request with body and headers.
 */
 exports.Callback = function (request) {
    var isFailedRequest = false;
    if (EnableCartridge) {
        try {
            var body = request.httpParameterMap.getRequestBodyAsString();
            var headers = request.getHttpHeaders();
            Logger.getLogger('Signifyd', 'signifyd').debug('Debug: API callback header x-signifyd-topic: {0}', headers.get('x-signifyd-topic'));
            Logger.getLogger('Signifyd', 'signifyd').debug('Debug: API callback body: {0}', body);
            var parsedBody = JSON.parse(body);
            var hmacKey = headers.get('x-signifyd-sec-hmac-sha256');
            var crypt = new Mac(Mac.HMAC_SHA_256);
            var cryptedBody = crypt.digest(body, APIkey);
            // var cryptedBody: Bytes = crypt.digest(body, "ABCDE"); //test APIKEY
            var cryptedBodyString = Encoding.toBase64(cryptedBody);
            if (cryptedBodyString.equals(hmacKey)) {
                isFailedRequest = process(parsedBody);
            } else {
                Logger.getLogger('Signifyd', 'signifyd').error('An error===>>>: Request is not Authorized. Please check an API key.');
            }
        } catch (e) {
            var ex = e;
            Logger.getLogger('Signifyd', 'signifyd').error('Error: API Callback processing was interrupted because:{0}', ex.message);
			isFailedRequest = true;
        }
    }

    return isFailedRequest;
};

/**
 * Generates an unique ID to use in Signifyd Fingerprint
 *
 * @return {deviceFingerprintID} - The generated finger print id
 */
function getOrderSessionId() {
    if (EnableCartridge) {
        var storeURL = URLUtils.home().toString();
        var limitedLengthURL = storeURL.length > 50 ? storeURL.substr(0, 50) : storeURL;
        var basketID = BasketMgr.getCurrentOrNewBasket().getUUID();
        var orderSessionId = StringUtils.encodeBase64(limitedLengthURL + basketID);
        return orderSessionId;
    }
    return null;
}


/**
 * Save the orderSessionId to the order
 * @param {order} order the recently created order
 * @param {orderSessionId} orderSessionId the order session id for the signifyd fingerprint
 */
function setOrderSessionId(order, orderSessionId) {
    if (EnableCartridge && orderSessionId) {
        Transaction.wrap(function () {
            // eslint-disable-next-line no-param-reassign
            order.custom.SignifydOrderSessionId = orderSessionId;
        });
    }
}


/**
 * Converts an Order into JSON format
 * acceptable on Stringifyd side
 *
 * @param {order} order Order that just have been placed.
 * @return {result} the json objects describes Order.
 */
 function getParams(order) {
    var SignifydCreateCasePolicy = dw.system.Site.getCurrent().getCustomPreferenceValue('SignifydCreateCasePolicy').value;
    var SignifydDecisionRequest = dw.system.Site.getCurrent().getCustomPreferenceValue('SignifydDecisionRequest').value;
    var SignifydPassiveMode = dw.system.Site.getCurrent().getCustomPreferenceValue('SignifydPassiveMode');
    var orderCreationCal = new Calendar(order.creationDate);
    var phoneOrderEmailList = sitePrefs.getCustom().SignifydPhoneOrderEmailList || [];
    var isPhoneOrder = false;
    if(!empty(phoneOrderEmailList)) {
    	for (var i = 0 ; i < phoneOrderEmailList.length; i++ ) {
    		if (phoneOrderEmailList[i] == order.customerEmail) {
    			isPhoneOrder = true;
    		}
    	}
    }
    	
    var orderChannel = isPhoneOrder ? 'PHONE' : 'WEB';
    var paramsObj = {
        policy: {
            name: SignifydCreateCasePolicy,
        },
        decisionRequest : {
            paymentFraud: SignifydDecisionRequest,
        },
        purchase: {
            orderId: order.currentOrderNo,
            orderSessionId: order.custom.SignifydOrderSessionId,
            browserIpAddress: order.remoteHost,
            discountCodes: getDiscountCodes(order.getCouponLineItems()),
            shipments: getShipments(order.shipments),
            products: getProducts(order.productLineItems, order.giftCertificateLineItems),
            createdAt: StringUtils.formatCalendar(orderCreationCal, "yyyy-MM-dd'T'HH:mm:ssZ"),
            currency: dw.system.Site.getCurrent().getDefaultCurrency(),
            orderChannel: orderChannel, // to be updated by the merchant
            receivedBy: order.createdBy !== 'Customer' ? order.createdBy : null,
            totalPrice: order.getTotalGrossPrice().value
        },
        recipients: getRecipient(order.getShipments(), order.customerEmail),
        transactions: [],
        userAccount: getUser(order),
        seller: {}, // getSeller()
        platformAndClient: getPlatform(),
    };

    if (SignifydPassiveMode) {
        paramsObj.tags = ["Passive Mode"];
    }

    // add payment instrument related fields
    var mainPaymentInst = getMainPaymentInst(order.getPaymentInstruments());
    if (!empty(mainPaymentInst)) {
        var mainTransaction = mainPaymentInst.getPaymentTransaction();
        var mainPaymentProcessor = mainTransaction.getPaymentProcessor();
        var transactionCreationCal = new Calendar(mainTransaction.getCreationDate());

        paramsObj.purchase.checkoutToken = mainPaymentInst.UUID;
        paramsObj.purchase.currency = mainTransaction.amount.currencyCode;
        paramsObj.transactions = [{
            transactionId: mainTransaction.transactionID,
            createdAt: StringUtils.formatCalendar(transactionCreationCal, "yyyy-MM-dd'T'HH:mm:ssZ"),
            paymentMethod: mainPaymentInst.getPaymentMethod(),
            type: "AUTHORIZATION", // to be updated by the merchant
            gatewayStatusCode: "SUCCESS", // to be updated by the merchant
            currency: mainTransaction.amount.currencyCode,
            amount: mainTransaction.amount.value,
            avsResponseCode: getBraintreeSignifydAVSResponseMapping(mainPaymentInst.custom.avsPostalCodeResponseCode, mainPaymentInst.custom.avsStreetAddressResponseCode),
            cvvResponseCode: getBraintreeSignifydCVVResponseMapping(mainPaymentInst.custom.cvvResponseCode),
            checkoutPaymentDetails: {
                holderName: mainPaymentInst.creditCardHolder,
                cardBin: mainPaymentInst.custom.bin,
                cardLast4: mainPaymentInst.creditCardNumberLastDigits,
                cardExpiryMonth: mainPaymentInst.creditCardExpirationMonth,
                cardExpiryYear: mainPaymentInst.creditCardExpirationYear,
                bankAccountNumber: mainPaymentInst.getBankAccountNumber(),
                bankRoutingNumber: mainPaymentInst.getBankRoutingNumber(),
                billingAddress: {
                    streetAddress: order.billingAddress.address1,
                    unit: order.billingAddress.address2,
                    city: order.billingAddress.city,
                    provinceCode: order.billingAddress.stateCode,
                    postalCode: order.billingAddress.postalCode,
                    countryCode: order.billingAddress.countryCode.value
                }
            },
            paymentAccountHolder : {
                accountId: mainPaymentInst.getBankAccountNumber(),
                accountHolderName: mainPaymentInst.getBankAccountHolder(),
                billingAddress: {
                    streetAddress: order.billingAddress.address1,
                    unit: order.billingAddress.address2,
                    city: order.billingAddress.city,
                    provinceCode: order.billingAddress.stateCode,
                    postalCode: order.billingAddress.postalCode,
                    countryCode: order.billingAddress.countryCode.value,
                }
            },
            
         /*   verifications : {
                // to be updated by the merchant
                    avsResponseCode: "Y",
                    cvvResponseCode: "M",
                avsResponse : {
                    addressMatchCode: "D",
                    zipMatchCode: "M"
                }
            } */
        }];
    }
    if(mainPaymentProcessor && mainPaymentProcessor.ID) {
        paramsObj.transactions.gateway = mainPaymentProcessor.ID;
    }

    return paramsObj;
}

/**
*
*/
function getBraintreeSignifydAVSResponseMapping (avsStreetResponseCode, avsPostalResponseCode) {
	var responseCode = '';
	if(!empty(avsStreetResponseCode) && !empty(avsPostalResponseCode)) {
		responseCode = SignifydMappings.avsResponseCodeMapping[avsStreetResponseCode + avsPostalResponseCode];
	}
	return responseCode;
}

/**
*
*/
function getBraintreeSignifydCVVResponseMapping (cvvResponseCode) {
	var responseCode = '';
	if(!empty(cvvResponseCode)) {
		responseCode = SignifydMappings.cvvResponseCodeMapping[cvvResponseCode];
	}
	return responseCode;
}

/**
 * Converts an Order into JSON format
 * acceptable on Stringifyd side
 *
 * @param {order} order Order that just have been placed.
 * @return {result} the json objects describes Order.
 */

function getSendTransactionParams(order) {
    var cal = new Calendar(order.creationDate);
    var paymentInstruments = (!empty(order.allProductLineItems)) ? order.allProductLineItems[0].lineItemCtnr.getPaymentInstruments() : order.getGiftCertificateLineItems()[0].lineItemCtnr.getPaymentInstruments();
    var paymentTransaction = paymentInstruments[0].getPaymentTransaction();
    var paymentInstrument = paymentTransaction.getPaymentInstrument();
    var paymentProcessor = paymentTransaction.getPaymentProcessor();
    var mainPaymentInst = getMainPaymentInst(order.getPaymentInstruments());
    var mainTransaction = mainPaymentInst.getPaymentTransaction();
    var mainPaymentProcessor = mainTransaction.getPaymentProcessor();
    var paramsObj = {
        transactions: [{
            parentTransactionId: null,
            transactionId: paymentTransaction.transactionID,
            createdAt: StringUtils.formatCalendar(cal, "yyyy-MM-dd'T'HH:mm:ssZ"),
            gateway: mainPaymentProcessor.ID,
            paymentMethod: paymentInstrument.getPaymentMethod(),
            type: "AUTHORIZATION",
            gatewayStatusCode: "SUCCESS",
            currency: paymentTransaction.amount.currencyCode,
            amount: paymentTransaction.amount.value,
            avsResponseCode: getBraintreeSignifydAVSResponseMapping(paymentInstrument.custom.avsPostalCodeResponseCode, paymentInstrument.custom.avsStreetAddressResponseCode),
            cvvResponseCode: getBraintreeSignifydCVVResponseMapping(paymentInstrument.custom.cvvResponseCode),
        }],
    };

    if (!empty(mainPaymentInst)) {
        paramsObj.checkoutToken = mainPaymentInst.UUID;
        paramsObj.transactions[0].checkoutPaymentDetails = {
            holderName: mainPaymentInst.creditCardHolder,
            cardLast4: mainPaymentInst.creditCardNumberLastDigits,
            cardExpiryMonth: mainPaymentInst.creditCardExpirationMonth,
            cardExpiryYear: mainPaymentInst.creditCardExpirationYear,
            bankAccountNumber: mainPaymentInst.getBankAccountNumber(),
            bankRoutingNumber: mainPaymentInst.getBankRoutingNumber(),
            billingAddress: {
                streetAddress: order.billingAddress.address1,
                unit: order.billingAddress.address2,
                city: order.billingAddress.city,
                provinceCode: order.billingAddress.stateCode,
                postalCode: order.billingAddress.postalCode,
                countryCode: order.billingAddress.countryCode.value
            }
        }
        paramsObj.transactions[0].paymentAccountHolder =  {
            accountId: mainPaymentInst.getBankAccountNumber(),
            accountHolderName: mainPaymentInst.getBankAccountHolder(),
            billingAddress: {
                streetAddress: order.billingAddress.address1,
                unit: order.billingAddress.address2,
                city: order.billingAddress.city,
                provinceCode: order.billingAddress.stateCode,
                postalCode: order.billingAddress.postalCode,
                countryCode: order.billingAddress.countryCode.value,
            }
        }
    }

    if (!empty(mainPaymentProcessor)) {
        paramsObj.transactions[0].gateway = mainPaymentProcessor.ID;
    }

    return paramsObj;
}

// eslint-disable-next-line valid-jsdoc
/**
 * Send Signifyd order info and
 *
 * @param {Object} - Order that just have been placed.
 * @returns  {number} on error.
 */
 exports.SendTransaction = function (order) {
    if (EnableCartridge) {
        if (order && order.currentOrderNo) {
            Logger.getLogger('Signifyd', 'signifyd').info('Info: API call for order {0}', order.currentOrderNo);
            var params = getSendTransactionParams(order);
            Logger.getLogger('Signifyd', 'signifyd').debug('Debug: API call body: {0}', JSON.stringify(params));
            var service = signifydInit.sendTransaction();

            if (service) {
                try {
                    var result = service.call(params);
                    Logger.getLogger('Signifyd', 'signifyd').error('Error: {0} : {1}', result.error, JSON.parse(result.errorMessage).message);
                } catch (e) {
                    Logger.getLogger('Signifyd', 'signifyd').error('Error: API the SendTransaction was interrupted unexpectedly. Exception: {0}', e.message);
                }
            } else {
                Logger.getLogger('Signifyd', 'signifyd').error('Error: Service Please provide correct order for the SendTransaction method');
            }
        } else {
            Logger.getLogger('Signifyd', 'signifyd').error('Error: Please provide correct order for the SendTransaction method');
        }
    }

    return 0;
};


// eslint-disable-next-line valid-jsdoc
/**
 * Send Signifyd order info and
 * store case id as an attribute of order in DW.
 *
 * @param {Object} - Order that just have been placed.
 * @returns  {Object} - Object containing the case id and the error status.
 */
exports.Call = function (order,isAutoDelivery) {
    var returnObj = {};
    var declined = false;

    if (EnableCartridge) {
        if (order && order.currentOrderNo) {
            //Signifyd integration: Disconnect Paypal Orders to Signifyd
        	var paymentInstruments = order.paymentInstruments;
        	var paymentInstrumentSize = paymentInstruments.size();
        	var doNotSendToSignifyD = false;
			if((paymentInstrumentSize == 1 && (paymentInstruments[0].paymentMethod == 'PayPal' || paymentInstruments[0].paymentMethod == 'GIFT_CERTIFICATE' || paymentInstruments[0].paymentMethod == 'AFTERPAY_PBI')) || ((order.getTotalNetPrice().value === 0.00 || order.getTotalNetPrice().value === 0) && order.priceAdjustments.size() > 0)) {
				doNotSendToSignifyD = true;
			}
            if(!doNotSendToSignifyD){
                Logger.getLogger('Signifyd', 'signifyd').info('Info: API call for order {0}', order.currentOrderNo);
                var params = getParams(order);
                Logger.getLogger('Signifyd', 'signifyd').debug('Debug: API call body: {0}', JSON.stringify(params));
                var service = signifydInit.createCase();
                var SignifydCreateCasePolicy = dw.system.Site.getCurrent().getCustomPreferenceValue('SignifydCreateCasePolicy').value;

                if (service) {
                    try {
                        saveRetryCount(order);
                        var result = service.call(params);

                        if (result.ok) {
                            var caseId;
                            var answer = JSON.parse(result.object);

                            if (SignifydCreateCasePolicy === "PRE_AUTH") {
                                caseId = answer.caseId;
                                if (answer.checkpointAction) {
                                    if (answer.checkpointAction === "REJECT") {
                                        declined = true;
                                    }
                                } else {
                                    if (answer.recommendedAction) {
                                        if (answer.recommendedAction === "REJECT") {
                                            declined = true;
                                        }
                                    } else {
                                        if (answer.decisions.paymentFraud.status) {
                                            if (answer.decisions.paymentFraud.status === "DECLINED") {
                                                declined = true;
                                            }
                                        }
                                    }
                                }
                            } else if (SignifydCreateCasePolicy === "POST_AUTH") {
                                caseId = answer.investigationId;
                            }

                            Transaction.wrap(function () {
                                order.custom.SignifydCaseID = String(caseId);
                                if (SignifydCreateCasePolicy === "PRE_AUTH") {
                                    var orderUrl = 'https://www.signifyd.com/cases/' + caseId;
                                    order.custom.SignifydOrderURL = orderUrl;

                                    if (typeof answer.checkpointAction !== 'undefined' ) {
                                        order.custom.SignifydFraudScore = answer.score;
                                        order.custom.SignifydPolicy = answer.checkpointAction;
                                        order.custom.SignifydPolicyName = answer.checkpointActionReason || '';
                                    } else {
                                        order.custom.SignifydFraudScore = answer.decisions.paymentFraud.score;
                                        order.custom.SignifydPolicy = answer.recommendedAction || answer.decisions.paymentFraud.status;
                                        order.custom.SignifydPolicyName = answer.checkpointActionReasons || '';
                                    }
                                }
                            });

                            returnObj.caseId = caseId;
                            returnObj.declined = declined;

                            return returnObj;
                        } else {
                        Logger.getLogger('Signifyd', 'signifyd').error('Error: {0} : {1}', result.error, JSON.parse(result.errorMessage).message);
                        }
                    } catch (e) {
                        Logger.getLogger('Signifyd', 'signifyd').error('Error: API Call was interrupted unexpectedly. Exception: {0}', e.message);
                    }
                } else {
                    Logger.getLogger('Signifyd', 'signifyd').error('Error: Service Please provide correct order for Call method');
                }
            }
        } else {
            Logger.getLogger('Signifyd', 'signifyd').error('Error: Please provide correct order for Call method');
        }
    }

    return returnObj;
};

function getproductLineItems(productLineItems) {
    var products = [];

    if (!empty(productLineItems)) {
        var iterator = productLineItems.iterator();
        while (iterator.hasNext()) {
            var product = iterator.next();
            products.push({
                itemName: product.lineItemText,
                itemQuantity: product.quantity.value,
                itemPrice: product.grossPrice.value,
            });
        }
    }

    return products;
}

function getDeliveryAddress(shipment) {
    var deliveryAddress = {
        streetAddress: shipment.shippingAddress.address1,
                streetAddress: shipment.shippingAddress.address1, 
        streetAddress: shipment.shippingAddress.address1,
        unit: shipment.shippingAddress.address2 || "",
        city: shipment.shippingAddress.city,
        provinceCode: "" ,
        postalCode: shipment.shippingAddress.postalCode ,
        countryCode: shipment.shippingAddress.countryCode.value
    };

    return deliveryAddress;
}

function getSendFulfillmentParams(order, shipment) {
    if(!empty(order.shipments)) {
    var cal = new Calendar(new Date());
    var products = getproductLineItems(shipment.productLineItems);
    var deliveryAddress = getDeliveryAddress(shipment);
    var shipmentId = shipment.shipmentNo;
    var fulfillmentStatus = order.getShippingStatus().displayValue === "PARTSHIPPED" ? "PARTIAL" : "COMPLETE";
    var trackingNumber =   order.shipments[0].trackingNumber;

    var trackingUrl = '';
			var shippingCarrier = '';
			if(!empty(trackingNumber) && !empty(order.shipments[0].shippingMethod)) {
				if(order.shipments[0].shippingMethod.custom.shippingMethodCarrier=='USPS') {
					trackingUrl = Resource.msgf('tracking.USPS','order',null, trackingNumber);
					shippingCarrier = 'USPS';
				} else if(order.shipments[0].shippingMethod.custom.shippingMethodCarrier=='UPS') {
					trackingUrl = Resource.msgf('tracking.UPS','order',null, trackingNumber);
					shippingCarrier = 'UPS';
				} else {
					//trackingUrl = Resource.msgf('tracking.UPS','order',null,'english',order.shipments[0].shippingAddress.countryCode.value, trackingNumber);
					trackingUrl = Resource.msgf('tracking.UPS','order',null, trackingNumber);
				    shippingCarrier = 'UPS';
				}
			} 
			
			// Added an extra check			
			if(Site.getCurrent().getCustomPreferenceValue('enableUSPSCheck')) {
				if(!empty(trackingNumber) && !empty(order.shipments[0].shippingMethod)){
					var isUSPS = require('app_storefront_core/cartridge/scripts/util/Tatcha').isUSPSTrackNumber(trackingNumber);
					if(isUSPS) {
						trackingUrl = Resource.msgf('tracking.USPS','order',null, trackingNumber);
					}
				}
			}

    var paramsObj = {
        fulfillments : [{
            id: order.orderNo + shipmentId,
            orderId: order.orderNo,
            createdAt: StringUtils.formatCalendar(cal, "yyyy-MM-dd'T'HH:mm:ssZ"),
            recipientName: shipment.shippingAddress.fullName,
            deliveryEmail: order.getCustomerEmail(),
            fulfillmentStatus: fulfillmentStatus,
            products: products,
            deliveryAddress: deliveryAddress,
            shipmentId: shipmentId,
            shipmentStatus: 'DELIVERED', // to be updated by the merchant
            shippingCarrier: shippingCarrier, // to be updated by the merchant
            trackingNumbers: trackingNumber, // to be updated by the merchant
            trackingUrls: trackingUrl // to be updated by the merchant
        }]
    };
}
    return paramsObj;
}

function sendFulfillment(order) {
    if (EnableCartridge) {
        if (order && order.currentOrderNo) {
            try {
                var shipments = order.getShipments();
                for (var index in shipments) {
                    var shipment = shipments[index];
                    var params = getSendFulfillmentParams(order, shipment);
                    if(!empty(params)){	
                    var service = signifydInit.sendFulfillment();

                        if (service) {
                            Logger.getLogger('Signifyd', 'signifyd').info('Info: SendFulfillment API call for order {0}', order.currentOrderNo);

                            var result = service.call(params);

                            if (result.ok) {
                                var returnData = JSON.parse(result.object);	
                                Logger.getLogger("Signifyd", "signifyd-extend-job").info("result: {0} ", JSON.stringify(returnData)); 
                                Transaction.wrap(function () {
                                    order.custom.SignifydOrderFullFilledStatus = true;
                                });
                                return true;	
                            } else {	
                            Logger.getLogger("Signifyd", "signifyd-extend-job").info("Param: {0} ", JSON.stringify(params));
                            Logger.getLogger("Signifyd", "signifyd-extend-job").error("Error: {0} : {1}", result.error, JSON.stringify(result.errorMessage));
                            }
                        } else {
                            Logger.getLogger('Signifyd', 'signifyd').error('Error: Could not initialize SendFulfillment service.');
                        }
                    }  else{
                        Logger.getLogger("Signifyd", "signifyd-extend-job").info("Error: Unable to find shipping info order #{0} }",order.currentOrderNo);	
                        }
                } 
            }   catch (e) {
                    Logger.getLogger('Signifyd', 'signifyd').error('Error: SendFulfillment method was interrupted unexpectedly. Exception: {0}', e.message);
                }
        } else {
            Logger.getLogger('Signifyd', 'signifyd').error('Error: Please provide correct order for the SendFulfillment method');
            }
    }
    return 0;
};


exports.setOrderSessionId = setOrderSessionId;
exports.getOrderSessionId = getOrderSessionId;
exports.getSeler = getSeller;
exports.sendFulfillment = sendFulfillment;
exports.getProducts = getProducts;
exports.getRecipient = getRecipient;
exports.getGiftCardRecipient = getGiftCardRecipient; 