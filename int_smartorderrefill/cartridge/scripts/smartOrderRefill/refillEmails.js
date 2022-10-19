"use strict";
/**
 *  Property of OSF Global Services, Inc., (with its brand OSF Commerce). OSF remains the sole owner of all right, title and interest in the software.
 *  Do not copy, sell, reverse engineer or otherwise attempt to derive or obtain information about the functioning, manufacture or operation therein.
 */
var HashMap = require("dw/util/HashMap");
var URLUtils = require("dw/web/URLUtils");
var URLAction = require("dw/web/URLAction");
var Site = require("dw/system/Site");
var Resource = require("dw/web/Resource");
var Logger = require('dw/system/Logger');

var SOREmails = {};
/**
 * @description Send email with provided paramters
 * @param {string} to destination email address
 * @param {string} subject email subject line
 * @param {dw.util.HashMap} content map of values used in tempalate
 * @param {string} template name of tempalte to use
 */
function sendEmail(to, subject, content, template) {
    var Mail = require("dw/net/Mail");
    var Template = require("dw/util/Template");

    var mail = new Mail();
    var mailFrom = Site.current.getCustomPreferenceValue("customerServiceEmail") || Resource.msg("smartorderrefill.defaultemail", "smartorderrefill", null);
    var mailContent = content;

    if (template) {
        var mailTemplate = new Template(template);
        mailContent = mailTemplate.render(content);
    }

    mail.setFrom(mailFrom);
    mail.addTo(to);
    mail.setSubject(subject);
    mail.setContent(mailContent);
    mail.send();
}

/**
 * @description converts refill list products array to list of names
 * @param {RefillProduct[]} products aray of RefillProducts
 * @returns {string} string of product names
 */
function getProductNamesAsString(products) {
    var ProductMgr = require("dw/catalog/ProductMgr");

    var productNameString = "";
    for (var i = 0; i < products.length; i++) {
        if (i === 0) {
            productNameString = ProductMgr.getProduct(products[i].ID).name;
        } else {
            productNameString += ", " + ProductMgr.getProduct(products[i].ID).name;
        }
    }
    return productNameString;
}


function prepareNotificationPayloadSOR(customerOrder, mailType) {
	
var orderDetails = {};
	
	var shippingAddr  = customerOrder['shippingAddress'];
    var shippingObj = shippingAddr;
    var defaultShipping = dw.order.ShippingMgr.getDefaultShippingMethod();
    
    orderDetails['FULLFILMENT_DATE'] = dw.util.StringUtils.formatCalendar(new dw.util.Calendar(customerOrder.createdAt), 'MM/dd/yyyy' );
    
    var total = 0;
    var currencyCode;
	for(var i=0; i<customerOrder.products.length;i++) {
		var product = customerOrder.products[i];
		var productDetail = require('app_storefront_controllers/cartridge/scripts/app').getModel('Product').get(product.ID).object;
		orderDetails['PRODUCT_NAME'] = productDetail.name;
		orderDetails['PRODUCT_QTY'] = product.quantity;
		orderDetails['PRODUCT_PRICE'] = dw.util.StringUtils.formatMoney(new dw.value.Money(product.price, currencyCode));
		orderDetails['PRODUCT_IMG_URL'] = productDetail.getImage("large").getAbsURL().toString();
		orderDetails['PRODUCT_URL'] = require('dw/web/URLUtils').url('Product-Show', 'pid', product.ID).toString();
	    
		total = total + (product.price * product.quantity);
		currencyCode = product.currencyCode;
	}
	
	var shippingCost = dw.system.Site.getCurrent().getCustomPreferenceValue("OsfSorEnableFreeShipping") ?
            new dw.value.Money(0.0, currencyCode) : dw.order.ShippingMgr.getShippingCost(defaultShipping, new dw.value.Money(total, currencyCode));
    var orderTotal = total + shippingCost.decimalValue;
	
	//orderDetails['DISCOUNT'] = shippingaddress;
	orderDetails['SUBTOTAL'] = dw.util.StringUtils.formatMoney(dw.value.Money(total, currencyCode));
	//orderDetails['TAX'] = new dw.value.Money(0.0, currencyCode);
	orderDetails['SHIPPING_COST'] = dw.util.StringUtils.formatMoney(dw.value.Money(shippingCost.value, currencyCode));
	orderDetails['ORDER_TOTAL'] = dw.util.StringUtils.formatMoney(dw.value.Money(orderTotal, currencyCode));
	orderDetails['SHIPPING'] = shippingObj;
	orderDetails['SHIPPING_METHOD'] = defaultShipping.ID;
	orderDetails['$event_id'] = mailType + '-' + customerOrder.ID;
	
	return orderDetails;
}

SOREmails.sendOrderCancel = function (customerOrder, customerObject) {
    var map = new HashMap();
    var subject = Resource.msg("sor.mail.cancelorder.subject", "mail", null);

    map.put("topcontent", Resource.msgf("sor.mail.cancelorder.topcontent", "mail", null, customerOrder.createdAt.toDateString()));
    map.put("products", customerOrder.products);
    map.put("subject", subject);
    map.put("customerName", customerObject.profile.firstName + " " + customerObject.profile.lastName);
    map.put("thanks", Resource.msg("sor.mail.thanks", "mail", null));

    sendEmail(customerObject.profile.email, subject, map, "mail/soremail");
};

SOREmails.sendOrderReactivate = function (customerOrder, customerObject) {
    var map = new HashMap();
    var subject = Resource.msg("sor.mail.reactivateorder.subject", "mail", null);

    map.put("topcontent", Resource.msgf("sor.mail.reactivateorder.subject", "mail", null, customerOrder.createdAt.toDateString()));
    map.put("products", customerOrder.products);
    map.put("subject", subject);
    map.put("customerName", customerObject.profile.firstName + " " + customerObject.profile.lastName);
    map.put("thanks", Resource.msg("sor.mail.thanks", "mail", null));

    sendEmail(customerObject.profile.email, subject, map, "mail/soremail");
};

SOREmails.sendOrderPause = function (customerOrder, customerObject) {
    var map = new HashMap();
    var subject = Resource.msg("sor.mail.pauseorder.subject", "mail", null);

    map.put("topcontent", Resource.msgf("sor.mail.pauseorder.topcontent", "mail", null, customerOrder.createdAt.toDateString()));
    map.put("bottomcontent", Resource.msg("sor.mail.pauseorder.bottomcontent", "mail", null));
    map.put("button", {
        text: Resource.msg("sor.mail.managerefill.button.name", "mail", null),
        link: URLUtils.https(new URLAction("SmartOrderRefillController-Manage", Site.current.ID))
    });
    map.put("products", customerOrder.products);
    map.put("subject", subject);
    map.put("customerName", customerObject.profile.firstName + " " + customerObject.profile.lastName);
    map.put("thanks", Resource.msg("sor.mail.thanks", "mail", null));

    sendEmail(customerObject.profile.email, subject, map, "mail/soremail");
};

SOREmails.sendSubscriptionPause = function (customerSubscription, customerObject, preferencesObject) {
    var map = new HashMap();
    var subject = Resource.msg("sor.mail.pausesubscription.subject", "mail", null);
    var cancelIntervalProp = (preferencesObject.SorMonthsToCancelPaused > 1 ? "sor.mail.months" : "sor.mail.month");
    var monthsToCancelPaused = preferencesObject.SorMonthsToCancelPaused > 1 ? preferencesObject.SorMonthsToCancelPaused : 12;

    map.put("topcontent", Resource.msgf("sor.mail.pausesubscription.topcontent", "mail", null, Resource.msgf(cancelIntervalProp, "mail", null, monthsToCancelPaused)));
    map.put("bottomcontent", Resource.msg("sor.mail.pausesubscription.bottomcontent", "mail", null));
    map.put("button", {
        text: Resource.msg("sor.mail.managerefill.button.name", "mail", null),
        link: URLUtils.https(new URLAction("SmartOrderRefillController-Manage", Site.current.ID))
    });
    map.put("products", customerSubscription.products);
    map.put("subject", subject);
    map.put("isSubscription", true);
    map.put("customerName", customerObject.profile.firstName + " " + customerObject.profile.lastName);
    map.put("thanks", Resource.msg("sor.mail.thanks", "mail", null));

    sendEmail(customerObject.profile.email, subject, map, "mail/soremail");
};

SOREmails.sendSubscriptionReactivate = function (customerSubscription, customerObject) {
    var map = new HashMap();
    var subject = Resource.msg("sor.mail.reactivatesubscription.subject", "mail", null);

    map.put("topcontent", Resource.msg("sor.mail.reactivatesubscription.topcontent", "mail", null));
    map.put("products", customerSubscription.products);
    map.put("subject", subject);
    map.put("isSubscription", true);
    map.put("customerName", customerObject.profile.firstName + " " + customerObject.profile.lastName);
    map.put("thanks", Resource.msg("sor.mail.thanks", "mail", null));

    sendEmail(customerObject.profile.email, subject, map, "mail/soremail");
};

SOREmails.sendSubscriptionCancel = function (customerSubscription, customerObject) {
    /*var map = new HashMap();
    var subject = Resource.msg("sor.mail.cancelsubscription.subject", "mail", null);

    map.put("topcontent", Resource.msg("sor.mail.cancelsubscription.topcontent", "mail", null));
    map.put("bottomcontent", Resource.msg("sor.mail.cancelsubscription.bottomcontent", "mail", null));
    map.put("products", customerSubscription.products);
    map.put("subject", subject);
    map.put("isSubscription", true);
    map.put("customerName", customerObject.profile.firstName + " " + customerObject.profile.lastName);
    map.put("button", {
        text: Resource.msg("sor.mail.cancelsubscription.button.name", "mail", null),
        link: URLUtils.https(new URLAction("Home-Show", Site.current.ID))
    });

    sendEmail(customerObject.profile.email, subject, map, "mail/soremail");*/
    
    // Send email notification 
	var klaviyo = require('int_klaviyo_services/cartridge/scripts/utils/klaviyo/KlaviyoUtils');
    var orderEmail = customerObject.profile.email ? customerObject.profile.email: '';

	// Send notifications
	if(orderEmail!=''){
        var orderDetails = {}; 
		orderDetails['ORDER_NUMBER'] = 'AUTODELIVERY';
		orderDetails['FIRST_NAME'] = (customerObject.profile.firstName) ? customerObject.profile.firstName:'';
		orderDetails['LAST_NAME'] = (customerObject.profile.lastName) ? customerObject.profile.lastName:'';		
		orderDetails['CANCEL_REASON'] = 'AUTODELIVERY'; 
		klaviyo.sendEmail(orderEmail, orderDetails, 'Order Cancellation');				
	}
};

SOREmails.sendProductAddedEmail = function (productID, customerSubscription, customerObject) {
    var map = new HashMap();
    var subject = Resource.msg("sor.mail.addproduct.subject", "mail", null);

    map.put("topcontent", Resource.msg("sor.mail.addproduct.topcontent", "mail", null));
    map.put("bottomcontent", Resource.msg("sor.mail.addproduct.bottomcontent", "mail", null));
    map.put("products", customerSubscription.products);
    map.put("subject", subject);
    map.put("isSubscription", true);
    map.put("customerName", customerObject.profile.firstName + " " + customerObject.profile.lastName);
    map.put("button", {
        text: Resource.msg("sor.mail.addproduct.button.name", "mail", null),
        link: URLUtils.https(new URLAction("SmartOrderRefillController-Manage", Site.current.ID))
    });

    sendEmail(customerObject.profile.email, subject, map, "mail/soremail");
};

SOREmails.sendAddressChangeEmail = function (addressType, refillList, customerObject) {
    var addressTypeValue = Resource.msg("sor.mail.addresstype." + addressType, "mail", null);
    var map = new HashMap();
    var subject = Resource.msgf("sor.mail.changeaddress.subject", "mail", null, addressTypeValue);

    map.put("topcontent", Resource.msgf("sor.mail.changeaddress.topcontent." + refillList.refillType, "mail", null, addressTypeValue, getProductNamesAsString(refillList.products), refillList.createdAt.toDateString()));
    map.put("bottomcontent", Resource.msg("sor.mail.changeaddress.bottomcontent", "mail", null));
    map.put("address", refillList[addressType + "Address"]);
    map.put("subject", subject);
    map.put("customerName", customerObject.profile.firstName + " " + customerObject.profile.lastName);
    map.put("button", {
        text: Resource.msg("sor.mail.managerefill.button.name", "mail", null),
        link: URLUtils.https(new URLAction("SmartOrderRefillController-Manage", Site.current.ID))
    });

    sendEmail(customerObject.profile.email, subject, map, "mail/soremail");
};

SOREmails.sendCreditCardExpirationWarning = function (customerObject, creditCardDifference) {
    var map = new HashMap();
    var subject = Resource.msg("sor.mail.ccexp.expire.subject", "mail", null);

    map.put("topcontent", Resource.msgf("sor.mail.ccexp.expire.topcontent", "mail", null, creditCardDifference));
    map.put("subject", subject);
    map.put("thanks", Resource.msg("sor.mail.thanks", "mail", null));
    map.put("customerName", customerObject.profile.firstName + " " + customerObject.profile.lastName);

    sendEmail(customerObject.profile.email, subject, map, "mail/soremail");
};

SOREmails.sendCreditCardExpiration = function (customerObject) {
    var map = new HashMap();
    var subject = Resource.msg("sor.mail.ccexp.expired.subject", "mail", null);

    map.put("topcontent", Resource.msg("sor.mail.ccexp.expired.topcontent", "mail", null));
    map.put("subject", subject);
    map.put("thanks", Resource.msg("sor.mail.thanks", "mail", null));
    map.put("customerName", customerObject.profile.firstName + " " + customerObject.profile.lastName);

    sendEmail(customerObject.profile.email, subject, map, "mail/soremail");
};

SOREmails.sendSubscriptionRenewalWarning = function (customerSubscription, customerObject, subscriptionDifference) {
    var map = new HashMap();
    var subject = Resource.msg("sor.mail.subscriptionren.renew.subject", "mail", null);

    map.put("topcontent", Resource.msgf("sor.mail.subscriptionren.renew.topcontent", "mail", null, getProductNamesAsString(customerSubscription.products), subscriptionDifference));
    map.put("subject", subject);
    map.put("thanks", Resource.msg("sor.mail.thanks", "mail", null));
    map.put("customerName", customerObject.profile.firstName + " " + customerObject.profile.lastName);
    map.put("products", customerSubscription.products);
    map.put("isSubscription", true);

    sendEmail(customerObject.profile.email, subject, map, "mail/soremail");
};

SOREmails.sendSubscriptionRenewal = function (customerSubscription, customerObject) {
    var map = new HashMap();
    var subject = Resource.msg("sor.mail.subscriptionren.renewed.subject", "mail", null);

    map.put("topcontent", Resource.msgf("sor.mail.subscriptionren.renewed.topcontent", "mail", null, getProductNamesAsString(customerSubscription.products)));
    map.put("subject", subject);
    map.put("thanks", Resource.msg("sor.mail.thanks", "mail", null));
    map.put("customerName", customerObject.profile.firstName + " " + customerObject.profile.lastName);
    map.put("products", customerSubscription.products);
    map.put("isSubscription", true);

    sendEmail(customerObject.profile.email, subject, map, "mail/soremail");
};

SOREmails.sendSubscriptionExpirationWarning = function (customerSubscription, customerObject, subscriptionDifference) {
    var map = new HashMap();
    var subject = Resource.msg("sor.mail.subscriptionexp.expire.subject", "mail", null);

    map.put("topcontent", Resource.msgf("sor.mail.subscriptionexp.expire.topcontent", "mail", null, getProductNamesAsString(customerSubscription.products), subscriptionDifference));
    map.put("subject", subject);
    map.put("thanks", Resource.msg("sor.mail.thanks", "mail", null));
    map.put("customerName", customerObject.profile.firstName + " " + customerObject.profile.lastName);
    map.put("products", customerSubscription.products);
    map.put("isSubscription", true);

    sendEmail(customerObject.profile.email, subject, map, "mail/soremail");
};

SOREmails.sendSubscriptionExpiration = function (customerSubscription, customerObject) {
    var map = new HashMap();
    var subject = Resource.msg("sor.mail.subscriptionexp.expired.subject", "mail", null);

    map.put("topcontent", Resource.msgf("sor.mail.subscriptionexp.expired.topcontent", "mail", null, getProductNamesAsString(customerSubscription.products)));
    map.put("subject", subject);
    map.put("thanks", Resource.msg("sor.mail.thanks", "mail", null));
    map.put("customerName", customerObject.profile.firstName + " " + customerObject.profile.lastName);
    map.put("products", customerSubscription.products);
    map.put("isSubscription", true);

    sendEmail(customerObject.profile.email, subject, map, "mail/soremail");
};

SOREmails.sendSubscriptionPriceChange = function (customerSubscription, customerObject, priceChanges) {
    var map = new HashMap();
    var subject = Resource.msg("sor.mail.changeprice.subject", "mail", null);

    map.put("topcontent", Resource.msg("sor.mail.changeprice.topcontent", "mail", null));
    map.put("subject", subject);
    map.put("thanks", Resource.msg("sor.mail.thanks", "mail", null));
    map.put("customerName", customerObject.profile.firstName + " " + customerObject.profile.lastName);
    map.put("products", customerSubscription.products);
    map.put("isSubscription", true);
    map.put("bottomcontent", Resource.msg("sor.mail.changeprice.bottomcontent", "mail", null));
    map.put("priceChanges", priceChanges.products);

    sendEmail(customerObject.profile.email, subject, map, "mail/soremail");
};

SOREmails.sendOrderInactiveMail = function (customerOrder, customerObject) {
    var map = new HashMap();
    var subject = Resource.msg("sor.mail.cancelorderinative.subject", "mail", null);

    map.put("subject", subject);
    map.put("customerName", customerObject.profile.firstName + " " + customerObject.profile.lastName);
    map.put("thanks", Resource.msg("sor.mail.thanks", "mail", null));
    map.put("topcontent", Resource.msgf("sor.mail.cancelorderinative.topcontent", "mail", null, customerOrder.createdAt.toDateString()));
    map.put("products", customerOrder.products);

    sendEmail(customerObject.profile.email, subject, map, "mail/soremail");
};

SOREmails.sendOrderOutOfStockCancel = function (customerOrder, customerObject) {
    var map = new HashMap();
    var subject = Resource.msg("sor.mail.cancelorderoutofstock.subject", "mail", null);

    map.put("subject", subject);
    map.put("customerName", customerObject.profile.firstName + " " + customerObject.profile.lastName);
    map.put("thanks", Resource.msg("sor.mail.thanks", "mail", null));
    map.put("topcontent", Resource.msgf("sor.mail.cancelorderoutofstock.topcontent", "mail", null, getProductNamesAsString(customerOrder.products), customerOrder.createdAt.toDateString()));
    map.put("bottomcontent", Resource.msg("sor.mail.cancelorderoutofstock.bottomcontent", "mail", null));

    sendEmail(customerObject.profile.email, subject, map, "mail/soremail");
};

SOREmails.sendCCExpiredMail = function (customerOrder, customerObject) {
    var map = new HashMap();
    var subject = Resource.msg("sor.mail.cancelorderccexpired.subject", "mail", null);

    map.put("subject", subject);
    map.put("customerName", customerObject.profile.firstName + " " + customerObject.profile.lastName);
    map.put("thanks", Resource.msg("sor.mail.thanks", "mail", null));
    map.put("topcontent", Resource.msgf("sor.mail.cancelorderccexpired.topcontent", "mail", null, customerOrder.createdAt.toDateString()));
    map.put("products", customerOrder.products);

    sendEmail(customerObject.profile.email, subject, map, "mail/soremail");
};

SOREmails.sendOrderNotificationBeforePlace = function (customerOrder, customerObject, notificationBeforeOrderDays) {
    /*var map = new HashMap();
    var subject = Resource.msg("sor.mail.beforeorder.subject", "mail", null);

    map.put("customerName", customerObject.profile.firstName + " " + customerObject.profile.lastName);
    map.put("topcontent", Resource.msgf("sor.mail.beforeorder.topcontent", "mail", null, getProductNamesAsString(customerOrder.products), notificationBeforeOrderDays));
    map.put("subject", subject);
    map.put("button", {
        text: Resource.msg("sor.mail.managerefill.button.name", "mail", null),
        link: URLUtils.https("SmartOrderRefillController-Manage")
    });

    sendEmail(customerObject.profile.email, subject, map, "mail/soremail");*/
	
	var logger = Logger.getLogger('Klaviyo', 'RefillEmails - sendOrderNotificationBeforePlace()');
	try {
		var mailType = 'Auto Delivery Order Notification';
		var orderPayload = prepareNotificationPayloadSOR(customerOrder, mailType);
		require('*/cartridge/scripts/utils/klaviyo/klaviyoUtils').sendEmail(customerObject.profile.email, orderPayload, mailType);
		
	} catch (e) {
		logger.error('sendOrderNotificationEmail() failed for List ID: ' + customerOrder.ID + ', mailType: ' +  mailType + '. Error: ' +  e.message);
		return;
	}
};

SOREmails.sendOrderOutOfStock = function (customerOrder, customerObject, numberOfDelayDays) {
    var map = new HashMap();
    var subject = Resource.msg("sor.mail.outofstock.subject", "mail", null);

    map.put("subject", subject);
    map.put("customerName", customerObject.profile.firstName + " " + customerObject.profile.lastName);
    map.put("thanks", Resource.msg("sor.mail.sorryoutofstock", "mail", null));
    map.put("topcontent", Resource.msgf("sor.mail.outofstock.topcontent", "mail", null, getProductNamesAsString(customerOrder.products), customerOrder.createdAt.toDateString()));
    map.put("bottomcontent", Resource.msgf("sor.mail.outofstock.bottomcontent", "mail", null, numberOfDelayDays));
    map.put("products", customerOrder.products);
    sendEmail(customerObject.profile.email, subject, map, "mail/soremail");
};

SOREmails.sendPaymentFail = function (customerOrder, customerObject) {
    var map = new HashMap();
    var subject = Resource.msg("sor.mail.unsuccessfulpayment.subject", "mail", null);

    map.put("topcontent", Resource.msgf("sor.mail.unsuccessfulpayment.topcontent", "mail", null, getProductNamesAsString(customerOrder.products)));
    map.put("subject", subject);
    map.put("thanks", Resource.msg("sor.mail.thanks", "mail", null));
    map.put("customerName", customerObject.profile.firstName + " " + customerObject.profile.lastName);
    sendEmail(customerObject.profile.email, subject, map, "mail/soremail");
};

SOREmails.sendConfirmation = function (customerOrder, customerObject, order, emailTemplate) {
    var subject = Resource.msg("email.orderconfirmation.subject", "smartorderrefill", null) + " " + order.orderNo;
    var refillList = [];
    var map = new HashMap();

    refillList.push(customerOrder);
    map.put("ORIsFutureOrder", true);
    map.put("MailSubject", subject);
    map.put("Order", order);
    map.put("RefillList", refillList);
    sendEmail(customerObject.profile.email, subject, map, emailTemplate);
};

SOREmails.sendInitialConfirmation = function (subscriptionList, order) {
    var subject = Resource.msg("email.orderconfirmation.subject", "smartorderrefill", null) + " " + order.orderNo;
    var map = new HashMap();

    map.put("HasRefillProducts", true);
    map.put("MailSubject", subject);
    map.put("Order", order);
    map.put("RefillList", subscriptionList);
    sendEmail(order.customerEmail, subject, map, "mail/orderconfirmation");
};

module.exports = SOREmails;
