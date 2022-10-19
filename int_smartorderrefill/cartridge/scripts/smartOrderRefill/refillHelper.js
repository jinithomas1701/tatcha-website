/* eslint-disable no-restricted-syntax, guard-for-in  */
/**
 * @module scripts/smartOrderRefill/refillHelper
 */

/**
 *  Property of OSF Global Services, Inc., (with its brand OSF Commerce). OSF remains the sole owner of all right, title and interest in the software.
 *  Do not copy, sell, reverse engineer or otherwise attempt to derive or obtain information about the functioning, manufacture or operation therein.
 */
/* global request, session, empty, response */
/**
 * @description Verify Smart Order Refill License
 * @returns {boolean} returns success status of license validation
 */
function verifyLicense() {
    return true;
    // eslint-disable-next-line no-unreachable
    var OSFLicenseManager = require("*/cartridge/scripts/OSFLicenseManager"); // NOSONAR
    try {
        return OSFLicenseManager.getLicenseStatus("DWORC").isValid;
    } catch (error) {
        return false;
    }
}

/**
 * @description Checks if a Exclusively group is set and, if true, the customer is assigned to it
 * @param {dw.customer.Customer} customer customer to check
 * @param {string} sorCustomerGroup sor customer group
 * @returns {boolean} success of check
 */
function checkforExclusivelyGroup(customer, sorCustomerGroup) {
    var CustomerMgr = require("dw/customer/CustomerMgr");
    var enableProductGroup = require("dw/system/Site").current.getCustomPreferenceValue("SorEnableProductCustomerGroup");
    var exclusiveGroup = require("dw/system/Site").current.getCustomPreferenceValue("SorExclusivelyCustomerGroup");
    var customerGroup;
    var isPartOfGroup = true;
    var currentCustomer;
    if (enableProductGroup) {
        for (var sorCustomerGroupIndex in sorCustomerGroup) {
            customerGroup = sorCustomerGroup[sorCustomerGroupIndex];
            if (!empty(customerGroup)) {
                if (customer.profile) {
                    currentCustomer = CustomerMgr.getCustomerByLogin(customer.profile.email);
                    isPartOfGroup = currentCustomer.isMemberOfCustomerGroup(customerGroup);
                    if (isPartOfGroup) {
                        break;
                    }
                } else {
                    isPartOfGroup = false;
                }
            }
        }
    } else if (!empty(exclusiveGroup)) {
        var group = CustomerMgr.getCustomerGroup(exclusiveGroup);
        if (group) {
            currentCustomer = CustomerMgr.getCustomerByLogin(customer.profile.email);
            isPartOfGroup = currentCustomer.isMemberOfCustomerGroup(exclusiveGroup);
        }
    }
    return isPartOfGroup;
}

/**
 * @description Checks basket for presence of refill products
 * @returns {boolean} repressents success of the check
 */
function checkForRefillProducts() {
    var countSor = 0;
    var basket = require("dw/order/BasketMgr").getCurrentBasket();

    if (basket) {
        var customer = basket.getCustomer();
        var productLineItems = basket.allProductLineItems;
        for (var productLineItemsIndex in productLineItems) {
            var lineItem = productLineItems[productLineItemsIndex];
            if (lineItem.product) {
                if (customer && checkforExclusivelyGroup(customer, lineItem.product.custom.SorCustomerGroup)) {
                    if ("hasSmartOrderRefill" in lineItem.custom
                        && lineItem.custom.hasSmartOrderRefill
                        && (lineItem.custom.SorMonthInterval > 0 || lineItem.custom.SorWeekInterval > 0)) {
                        countSor++;
                    }
                }
            }
        }
    }

    countSor = parseInt(countSor, 10);
    var hasSORProducts = !!countSor;
    session.custom.hasSORProducts = hasSORProducts;
    return hasSORProducts;
}

/**
 * @description Validate SorCheckout
 * @param {boolean} doRedirect redirect or not to the cart-show
 * @returns {boolean} repressents success of the validation
 */
function validateSorCheckout(doRedirect) {
    var URLUtils = require("dw/web/URLUtils");
    var PaymentInstrument = require("dw/order/PaymentInstrument");
    var BasketMgr = require("dw/order/BasketMgr");
    var basket = BasketMgr.getCurrentBasket();
    var isValid = true;
    if (basket && session.custom.hasSORProducts) {
        var customer = basket.getCustomer();
        var basketPayments = basket.paymentInstruments;
        for (var payIndex in basketPayments) {
            var payment = basketPayments[payIndex];
            if (payment.paymentMethod !== PaymentInstrument.METHOD_CREDIT_CARD) {
                isValid = false;
            }
        }
        if (!customer.authenticated) {
            isValid = false;
        }
    }
    if (!isValid) {
        if (doRedirect) {
            response.redirect(URLUtils.https("Cart-Show"));
        }
        return true;
    }
    return false;
}

/**
 * @description Get ProductLineItem's Custom Attributes for Multi-Shipping
 * @param {dw.order.Basket} basket the current basket
 * @returns {Object} SmartOrderRefill line item attributes
 */
function getSorAttributes(basket) {
    var obj = {};
    for (var productLineItemsIndex in basket.productLineItems) {
        var pli = basket.productLineItems[productLineItemsIndex];
        if (pli.custom.hasSmartOrderRefill) {
            obj[pli.productID] = {
                SorMonthInterval: pli.custom.SorMonthInterval,
                SorWeekInterval: pli.custom.SorWeekInterval,
                SorPeriodicity: pli.custom.SorPeriodicity
            };
        }
    }
    return obj;
}

 /**
 * @description Set ProductLineItem's Custom Attributes for Multi-Shipping
 * @param {dw.order.Basket} basket the current basket
 * @param {Object} obj SmartOrderRefill line item attributes to set
 */
function setSorAttributes(basket, obj) {
    for (var productLineItemsIndex in basket.productLineItems) {
        var pli = basket.productLineItems[productLineItemsIndex];
        if (Object.keys(obj).indexOf(pli.productID) >= 0) {
            pli.custom.hasSmartOrderRefill = true;
            pli.custom.SorMonthInterval = obj[pli.productID].SorMonthInterval;
            pli.custom.SorWeekInterval = obj[pli.productID].SorWeekInterval;
            pli.custom.SorPeriodicity = obj[pli.productID].SorPeriodicity;
        }
    }
}

/**
 * Returns smartorderrefill resources
 * @returns {Object} resources used in front end code
 */
function getResources() {
    var Resource = require("dw/web/Resource");
    var resources = {
        SOR_DELETE_ORDERS_TITLE: Resource.msg("smartorderrefill.deleteorders.title", "smartorderrefill", null),
        SOR_DELETE_ORDERS_MESSAGE: Resource.msg("smartorderrefill.deleteorders.message", "smartorderrefill", null),
        SOR_DELETE_PART_MESSAGE: Resource.msg("smartorderrefill.deletepart.message", "smartorderrefill", null),
        SOR_DELETE_SUBSCRIPTION_TITLE: Resource.msg("smartorderrefill.deletesubs.title", "smartorderrefill", null),
        SOR_DELETE_SUBSCRIPTION_MESSAGE: Resource.msg("smartorderrefill.deletesubs.message", "smartorderrefill", null),
        SOR_PAUSE_SUBSCRIPTION_TITLE: Resource.msg("smartorderrefill.pausesubs.title", "smartorderrefill", null),
        SOR_PAUSE_SUBSCRIPTION_MESSAGE: Resource.msg("smartorderrefill.pausesubs.message", "smartorderrefill", null),
        SOR_REACTIVE_SUBSCRIPTION_TITLE: Resource.msg("smartorderrefill.reactivesubs.title", "smartorderrefill", null),
        SOR_SKIP_ORDER_TITLE: Resource.msg("smartorderrefill.skiporder.title", "smartorderrefill", null),
        SOR_SKIP_ORDER_MESSAGE: Resource.msg("smartorderrefill.skiporder.message", "smartorderrefill", null),
        SOR_PAUSE_ORDER_TITLE: Resource.msg("smartorderrefill.pauseorder.title", "smartorderrefill", null),
        SOR_PAUSE_ORDER_MESSAGE: Resource.msg("smartorderrefill.pauseorder.message", "smartorderrefill", null),
        SOR_REACTIVE_ORDER_TITLE: Resource.msg("smartorderrefill.reactiveorder.title", "smartorderrefill", null),
        SOR_UPDATE_CREDIT_CARD_TITLE: Resource.msg("smartorderrefill.updatecreditcard", "smartorderrefill", null),
        SOR_ADD_PRODUCT_TITLE: Resource.msg("smartorderrefill.addProduct", "smartorderrefill", null),
        SOR_REACTIVE_ORDER_MESSAGE: Resource.msg("smartorderrefill.reactiveorder.notavailable", "smartorderrefill", null),
        SOR_CUSTOMER_SERVICE_MESSAGE: Resource.msg("smartorderrefill.subscription.customerservice", "smartorderrefill", null),
        SOR_UNEXPECTED_ERROR: Resource.msg("smartorderrefill.unexpectederror", "smartorderrefill", null),
        SOR_ERROR_TITLE: Resource.msg("smartorderrefill.errortitle", "smartorderrefill", null),
        SOR_ADDRESS_ERROR: Resource.msg("smartorderrefill.addresserror", "smartorderrefill", null),
        SOR_PRODUCT_ERROR: Resource.msg("smartorderrefill.producterror", "smartorderrefill", null),
        SOR_QUANTITY_ERROR: Resource.msg("smartorderrefill.quantityerror", "smartorderrefill", null),
        SOR_CREDITCARD_ERROR: Resource.msg("smartorderrefill.creditcarderror", "smartorderrefill", null),
        SOR_LOGINFROMCART_ERROR: Resource.msg("smartorderrefill.loginfromcart.error", "smartorderrefill", null),
        SOR_MODIFY_SMART_ORDER_REFILL: Resource.msg("smartorderrefill.modifySOR", "smartorderrefill", null),
        SOR_GLOBAL_CLOSE: Resource.msg("smartorderrefill.close", "smartorderrefill", null),
        SOR_GLOBAL_CANCEL: Resource.msg("smartorderrefill.cancel", "smartorderrefill", null),
        SOR_GLOBAL_SAVE: Resource.msg("smartorderrefill.save", "smartorderrefill", null),
        SOR_GLOBAL_OK: Resource.msg("smartorderrefill.ok", "smartorderrefill", null),
        SOR_GLOBAL_UPDATE: Resource.msg("smartorderrefill.update", "smartorderrefill", null),
        SOR_GLOBAL_SUBMIT: Resource.msg("smartorderrefill.submit", "smartorderrefill", null)
    };
    return resources;
}

/**
 * Returns urls to SmartOrderRefillController functions for account page
 * @returns {Object} Urls used in front end code
 */
function getUrls() {
    var URLUtils = require("dw/web/URLUtils");
    var urls = {
        loginFromCartPage: URLUtils.url("SmartOrderRefillController-RequireLogin").toString(),
        manageOrders: URLUtils.url("SmartOrderRefillController-Manage").toString(),
        updateRefillData: URLUtils.url("SmartOrderRefillController-UpdateCartProductRefillInformation").toString(),
        checkProductRefill: URLUtils.url("SmartOrderRefillController-CheckProductRefill").toString(),
        updatePDPOptions: URLUtils.url("SmartOrderRefillController-PDPRefillOptions").toString(),
        cancelOneOrder: URLUtils.url("SmartOrderRefillController-SkipOrder").toString(),
        cartShow: URLUtils.url("Cart-Show").toString()
    };
    return urls;
}

/**
 * Returns SOR preferences
* @returns {Object} Site preferences used in front end code
*/
function getPreferences() {
    var Site = require("dw/system/Site");
    var preferences = {
        SOR_ENABLED: Site.getCurrent().getCustomPreferenceValue("SorEnabled")
    };
    return preferences;
}


module.exports = {
    verifyLicense: verifyLicense,
    getPreferences: getPreferences,
    checkForRefillProducts: checkForRefillProducts,
    validateSorCheckout: validateSorCheckout,
    checkforExclusivelyGroup: checkforExclusivelyGroup,
    getSorAttributes: getSorAttributes,
    setSorAttributes: setSorAttributes,
    getResources: getResources,
    getUrls: getUrls
};
