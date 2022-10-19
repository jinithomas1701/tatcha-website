/* eslint-disable guard-for-in, no-restricted-syntax */
"use strict";
/**
 *  Property of OSF Global Services, Inc., (with its brand OSF Commerce). OSF remains the sole owner of all right, title and interest in the software.
 *  Do not copy, sell, reverse engineer or otherwise attempt to derive or obtain information about the functioning, manufacture or operation therein.
 */
/**
 * Controller for managing the OSF Smart Order Refill Business Manager module
 * This Business Manager module is used to display the reports about and manage customer subscriptions and subscription orders
 * @module controllers/SmartOrderRefillReport
 */

/* global request, session, empty, response */
// API includes
var CustomerMgr = require("dw/customer/CustomerMgr");
var ProductMgr = require("dw/catalog/ProductMgr");
var ISML = require("dw/template/ISML");
var URLUtils = require("dw/web/URLUtils");
var Calendar = require("dw/util/Calendar");
var PagingModel = require("dw/web/PagingModel");
var ArrayList = require("dw/util/ArrayList");

// Script Includes
var RefillCustomerModel = require("*/cartridge/models/smartOrderRefill/refillCustomer.js");


// Global Variables
var SORLogger = require("dw/system/Logger").getLogger("SORReporting", "SORReporting");
var params = request.httpParameterMap;
var forms = session.forms;
var sessionUserName = session.getUserName();
if (sessionUserName === "storefront") {
    throw Error("Unauthorized Access");
}

/**
 * @description This function creates the search query for customers with active subscriptions while taking into account the filtering parameters
 * @param {string} searchBy search by filer
 * @param {string} searchArg query string
 * @returns {dw.util.SeekableIterator} search results
 */
function filterSORMembers(searchBy, searchArg) {
    var search = searchArg;
    var queryStr = "custom.hasSmartOrderRefill={0} OR custom.hasStandBySubscriptions={1}";
    search = "'" + search + "*'";
    switch (searchBy) {
        case "customerName":
            queryStr += " AND (firstName ILIKE " + search + " OR lastName ILIKE " + search + ")";
            break;

        case "customerEmail":
            queryStr += " AND email ILIKE " + search;
            break;

        default:
            break;
    }

    return CustomerMgr.searchProfiles(queryStr, null, true, true);
}

/**
 * @description Creates a list of all customers that have active Smart Order Refill subscriptions
 * @returns {dw.util.SeekableIterator} search results
 */
function getAllCustomersWithSOR() {
    return CustomerMgr.searchProfiles("custom.hasSmartOrderRefill={0} OR custom.hasStandBySubscriptions={1}", null, true, true);
}

/**
 * @description Creates a list of all customers that have used Smart Order Refill
 * @returns {dw.util.SeekableIterator} search results
 */
function getAllCustomersWithSORSummary() {
    return CustomerMgr.searchProfiles("custom.hasSmartOrderRefillHistory={0}", null, true);
}

/**
 * @description Generates paging model for orders/subscription search results
 * @param {Object[]} elements a colection of Objects representing the scheduled order/subscriptions stored in the customer profile
 * @returns {dw.web.PagingModel} pagination model for results
 */
function constructPagingModel(elements) {
    const defaultPaginationSize = 10;
    var parameterMap = request.httpParameterMap;
    var pageSize = parameterMap.sz.intValue || defaultPaginationSize;
    var start = parameterMap.start.intValue || 0;
    var elementsPagingModel = new PagingModel(elements);

    elementsPagingModel.setPageSize(pageSize);
    elementsPagingModel.setStart(start);

    return elementsPagingModel;
}

/**
* @description This function generates the csv export file based on the serach results
* @param {dw.util.ArrayList} subscriptions - returned by validateAndReturnSubscriptions function
*/
function exportSubscriptions(subscriptions) {
    var Resource = require("dw/web/Resource");
    var StringUtils = require("dw/util/StringUtils");
    var File = require("dw/io/File");
    var FileWriter = require("dw/io/FileWriter");
    var CSVStreamWriter = require("dw/io/CSVStreamWriter");

    var headers = [
        Resource.msg("report.tableheader.subscriptionid", "sor_smartorderrefill", null),
        Resource.msg("report.tableheader.customer", "sor_smartorderrefill", null),
        Resource.msg("report.tableheader.validuntil", "sor_smartorderrefill", null),
        Resource.msg("report.tableheader.status", "sor_smartorderrefill", null),
        Resource.msg("report.tableheader.productid", "sor_smartorderrefill", null),
        Resource.msg("report.tableheader.productname", "sor_smartorderrefill", null)
    ];

    var path = File.IMPEX + File.SEPARATOR + "src" + File.SEPARATOR + "SmartOrderRefillReports/Exports/Subscriptions/";
    var dirTarget = new File(path);
    if (!dirTarget.exists()) {
        dirTarget.mkdirs();
    }

    var fileName = ["Export_", StringUtils.formatCalendar(new Calendar(), "yyyy_MM_dd_HHmmss"), ".csv"].join("");
    var file = new File(path + fileName);
    var fileWriter = new FileWriter(file);
    var csw = new CSVStreamWriter(fileWriter);

    if (headers != null) {
        csw.writeNext(headers);
        headers = null;
    }
    try {
        for (var subscriptionsIndex in subscriptions) {
            var subscription = subscriptions[subscriptionsIndex];
            for (var subscriptionProductsIndex in subscription.products) {
                var product = subscription.products[subscriptionProductsIndex];
                var line = [
                    subscription.ID,
                    CustomerMgr.getCustomerByCustomerNumber(subscription.customerNo).getProfile().getEmail(),
                    subscription.validUntil,
                    subscription.status,
                    product.ID,
                    ProductMgr.getProduct(product.ID).getName()
                ];
                csw.writeNext(line);
            }
        }
    } catch (err) {
        SORLogger.error("SmartOrderRefillReport.js - exportSubscriptions function - " + err);
        csw.writeNext([Resource.msg("forms.sorsubscriptions.exportError", "sor_forms", null)]);
    } finally {
        csw.close();
        fileWriter.close();
        ISML.renderTemplate("bm/sorSubscriptionReport");
    }
}

/**
* @description This function generates the csv export file based on the serach results
* @param {Array} orders - returned by validateAndReturnOrders function
*/
function exportOrders(orders) {
    var Resource = require("dw/web/Resource");
    var StringUtils = require("dw/util/StringUtils");
    var File = require("dw/io/File");
    var FileWriter = require("dw/io/FileWriter");
    var CSVStreamWriter = require("dw/io/CSVStreamWriter");

    var headers = [
        Resource.msg("report.tableheader.customer", "sor_smartorderrefill", null),
        Resource.msg("report.tableheader.orderdate", "sor_smartorderrefill", null),
        Resource.msg("report.tableheader.status", "sor_smartorderrefill", null),
        Resource.msg("report.tableheader.subscriptionid", "sor_smartorderrefill", null),
        Resource.msg("report.tableheader.productid", "sor_smartorderrefill", null),
        Resource.msg("report.tableheader.productname", "sor_smartorderrefill", null),
        Resource.msg("report.tableheader.productprice", "sor_smartorderrefill", null),
		Resource.msg("report.tableheader.quantity", "sor_smartorderrefill", null)
    ];

    var path = File.IMPEX + File.SEPARATOR + "src" + File.SEPARATOR + "SmartOrderRefillReports/Exports/Orders/";
    var dirTarget = new File(path);
    if (!dirTarget.exists()) {
        dirTarget.mkdirs();
    }
    var fileName = ["Exp_order_", StringUtils.formatCalendar(new Calendar(), "yyyy_MM_dd_HHmmss"), ".csv"].join("");
    var file = new File(path + fileName);
    var fileWriter = new FileWriter(file);
    var csw = new CSVStreamWriter(fileWriter);

    if (headers != null) {
        csw.writeNext(headers);
        headers = null;
    }
    try {
        for (var ordersIndex in orders) {
            var order = orders[ordersIndex];
            for (var orderProductsIndex in order.products) {
                var productLine = order.products[orderProductsIndex];
                var line = [
                    CustomerMgr.getCustomerByCustomerNumber(order.customerNo).getProfile().getEmail(),
                    order.ID.split(order.subscriptionID + "-")[1],
                    order.status,
                    order.subscriptionID,
                    productLine.ID,
                    ProductMgr.getProduct(productLine.ID).getName(),
                    productLine.price + " " + productLine.currencyCode,
					productLine.quantity
                ];
                csw.writeNext(line);
            }
        }
    } catch (err) {
        SORLogger.error("SmartOrderRefillReport.js - exportOrders function - " + err);
        csw.writeNext([Resource.msg("forms.sorsubscriptions.exportError", "sor_forms", null)]);
    } finally {
        csw.close();
        fileWriter.close();
        ISML.renderTemplate("bm/sorOrdersReport");
    }
}

/**
 * @description determines if an RefillOrder object has a prodcut, by name or id
 * @param {RefillOrder} order RefillOrder object to check
 * @param {string} productIdent product identifier
 * @returns {boolean} presence or absence
 */
function isProductInOrder(order, productIdent) {
    var exists = false;
    for (var productsIndex in order.products) {
        var prod = order.products[productsIndex];
        var product = ProductMgr.getProduct(prod.ID);
        if (!empty(product) && product.getName().indexOf(productIdent) !== -1) {
            exists = true;
            break;
        }
        if (prod.ID === productIdent) {
            exists = true;
            break;
        }
    }
    return exists;
}

/**
 * This Endpoint renders the main dasboard page where the merchant can choose from the 3 available sections
 * SOR Subscriptions, Orders Summary, Subscription Summary
 */
module.exports.Manage = function () {
    ISML.renderTemplate("bm/sorMainDashboard", {
        Authorized: require("*/cartridge/scripts/smartOrderRefill/refillHelper.js").verifyLicense() || true
    });
};
module.exports.Manage.public = true;

/**
 * This Endpoint renders the SOR Subscriptions page
 * This page displays the customers with active Smart Order Refill subscriptions and alowes filtering by customer name and email
 */
module.exports.ManageSOR = function () {
    var searchBy = forms.sorsubscriptions.searchMemberBy.value;
    var search = forms.sorsubscriptions.searchMember.value;
    var members;
    var tmpMember;

    if (search) {
        tmpMember = filterSORMembers(searchBy, search);
    }

    if (!tmpMember) {
        tmpMember = getAllCustomersWithSOR();
    }

    members = constructPagingModel(tmpMember.asList());

    ISML.renderTemplate("bm/sorDashboard", {
        memberPaginationModel: members,
        sorType: "SOR",
        navigation: "manageSOR"
    });
};
module.exports.ManageSOR.public = true;


/**
 * This enpont is used to render a customers active subscriptions as tiles
 * The tiles are displayed in a modal and contains summary information and action buttons  similar to ones on customer Smart Order refill Dashboard
 */
module.exports.ShowSubscriptions = function () {
    var currentCustomer = CustomerMgr.getCustomerByCustomerNumber(params.client.stringValue);

    var refillCustomer = new RefillCustomerModel({
        customer: currentCustomer
    });

    ISML.renderTemplate("bm/sorSubscriptions", {
        refillCustomer: refillCustomer
    });
};
module.exports.ShowSubscriptions.public = true;

/**
 * This endpoint is used to render a customers selected order as tiles
 * The tile is displayed in a modal and contains summary information and action buttons similar to ones on customer Smart Order refill Dashboard
 */
module.exports.ShowOrder = function () {
    var currentCustomer = CustomerMgr.getCustomerByCustomerNumber(params.client.stringValue);
    var refillCustomer = new RefillCustomerModel({
        customer: currentCustomer
    });
    var renderInfo = {
        view: {
            template: "bm/sorOrders"
        }
    };

    var result = refillCustomer.updateCustomerOrder(request, forms, renderInfo);
    ISML.renderTemplate(result.template, result);
};
module.exports.ShowOrder.public = true;

/**
 * This endpoint renders a modal for choosing the fee for canceling a subscription / order that has commitment or removing a product that has commitment
 */
module.exports.CancelationFee = function () {
    var subscriptionId = params.sid.stringValue;
    var oredrId = params.oid.stringValue;
    var customer = params.client.stringValue;
    var item = params.item.stringValue;
    var continueURL = "";
    forms.cancelationfee.clearFormElement();
    if (item) {
        continueURL = URLUtils.https("SmartOrderRefillReport-ManageRefillList", "sid", subscriptionId, "client", customer, "item", item, "action", "removeProductWithCommitment");
    } else if (subscriptionId) {
        continueURL = URLUtils.https("SmartOrderRefillReport-ManageRefillList", "sid", subscriptionId, "client", customer, "action", "cancelWithCommitment");
    } else {
        continueURL = URLUtils.https("SmartOrderRefillReport-ManageRefillList", "oid", oredrId, "client", customer, "action", "cancelWithCommitment");
    }

    ISML.renderTemplate("bm/sorCancelationfee", {
        customer: customer,
        continueURL: continueURL
    });
};
module.exports.CancelationFee.public = true;

/**
 * This endpoint renders the Orders Summary search page
 * This page is used to search for customer orders and filter by criteria Start Date, End Date, Customer Email, Product id/name, order status
  */
module.exports.OrdersSummary = function () {
    ISML.renderTemplate("bm/sorOrdersReport", { navigation: "orderSummary" });
};
module.exports.OrdersSummary.public = true;

/**
 * This endpoint handles the form submit for search results and exporting the search results to csv
 */
function handleOrderSummaryForm() {
    var searchForm = forms.osfsorreport;
    var action = request.triggeredFormAction;
    var reportDateStart = searchForm.reportDateStart.value;
    var reportDateEnd = searchForm.reportDateEnd.value;
    var customerEmail = searchForm.customerEmail.value;
    var orderProduct = searchForm.orderProduct.value;
    var ordersScheduled = searchForm.ordersScheduled.value;
    var ordersCanceled = searchForm.ordersCanceled.value;
    var ordersProcessed = searchForm.ordersProcessed.value;
    var ordersOther = searchForm.ordersOther.value;

    var dateStart;
    var dateEnd;
    if (empty(reportDateStart)) {
        dateStart = new Date(1990, 1, 1);
    } else {
        dateStart = new Date(reportDateStart);
    }
    if (empty(reportDateEnd)) {
        dateEnd = new Date(2999, 11, 11);
    } else {
        dateEnd = new Date(reportDateEnd);
    }
    var newEndDate = new Date(dateEnd.setHours(23, 59, 59));

    var totalAmount = {};
    var allOrders = new ArrayList();
    var allCustomers = new ArrayList();
   // var allCustomers = getAllCustomersWithSORSummary();
    var seachStatusArray = [];
    if (ordersScheduled === true) {
        seachStatusArray.push("scheduled");
        seachStatusArray.push("updated");
    }
    if (ordersCanceled === true) {
        seachStatusArray.push("canceled");
        seachStatusArray.push("deleted");
    }
    if (ordersProcessed === true) {
        seachStatusArray.push("processed");
    }
    if (ordersOther === true) {
        seachStatusArray.push("paused");
        seachStatusArray.push("cardexpired");
        seachStatusArray.push("outofstock");
    }
    
    if(!empty(reportDateStart) && !empty(reportDateEnd)){
    	allCustomers = getAllCustomersWithSORSummary();
    }

    try {
        while (allCustomers.hasNext()) {
            var currentCustomer = allCustomers.next();
            if (
                empty(customerEmail) ||
                (
                    !empty(customerEmail)
                    && !empty(currentCustomer)
                    && !empty(currentCustomer.email)
                    && currentCustomer.email.indexOf(customerEmail) !== -1
                )
            ) {
                var refillCustomer = new RefillCustomerModel({
                    customer: currentCustomer.customer
                });
                var orders = refillCustomer.orders;
                for (var ordersIndex in orders) {
                    var order = orders[ordersIndex];
                    if (dateStart <= order.createdAt && order.createdAt <= newEndDate) {
                        if (seachStatusArray.length > 0 && seachStatusArray.indexOf(order.status) > -1) {
                            if (empty(orderProduct) || (!empty(orderProduct) && isProductInOrder(order, orderProduct))) {
                                allOrders.push(order);
                                for (var orderProductsIndex in order.products) {
                                    var productItem = order.products[orderProductsIndex];
                                    if (totalAmount[productItem.currencyCode]) {
                                        totalAmount[productItem.currencyCode] += parseFloat(productItem.price);
                                    } else {
                                        totalAmount[productItem.currencyCode] = parseFloat(productItem.price);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        if (!empty(action) && !empty(action.formId) && action.formId === "export") {
            exportOrders(allOrders);
        } else {
            var orderPagingModel = constructPagingModel(allOrders);

            ISML.renderTemplate("bm/sorOrdersReport", {
                totalAmount: totalAmount,
                OrderPagingModel: orderPagingModel,
                reportDateStart: reportDateStart,
                reportDateEnd: reportDateEnd,
                customerEmail: customerEmail,
                orderProduct: orderProduct,
                ordersScheduled: ordersScheduled,
                ordersCanceled: ordersCanceled,
                ordersProcessed: ordersProcessed,
                ordersOther: ordersOther,
                navigation: "orderSummary"
            });
        }
    } catch (error) {
        SORLogger.error("Error retrieving SOR customer scheduled orders. Error: {0}", error);
        ISML.renderTemplate("bm/sorOrdersReport", { navigation: "orderSummary" });
    }
}

module.exports.HandleSummaryFormFilter = handleOrderSummaryForm;
module.exports.HandleSummaryFormFilter.public = true;
module.exports.HandleSummaryPagination = handleOrderSummaryForm;
module.exports.HandleSummaryPagination.public = true;

/* =========== Subscription Reports ========== */

/**
 * This endpoint renders the Subscription Summary search page
 * This page is used to search for customer orders and filter by criteria Start Date, End Date, Customer Email
  */
module.exports.SubscriptionsSummary = function () {
    ISML.renderTemplate("bm/sorSubscriptionReport", { navigation: "subscriptionSummary" });
};
module.exports.SubscriptionsSummary.public = true;
/**
 * @description This endpoint handles the form submit for search results and exporting the search results to csv
 */
function handleSubscriptionSummaryForm() {
    var searchForm = forms.osfsorreport;
    var action = request.triggeredFormAction;
    var reportDateStart = searchForm.reportDateStart.value;
    var reportDateEnd = searchForm.reportDateEnd.value;
    var customerEmail = searchForm.customerEmail.value;
    var subscriptionID = searchForm.subscriptionID.value;
    var dateStart;
    var dateEnd;
    if (empty(reportDateStart)) {
        dateStart = new Date(1990, 1, 1);
    } else {
        dateStart = new Date(reportDateStart);
    }
    if (empty(reportDateEnd)) {
        dateEnd = new Date(2999, 11, 11);
    } else {
        dateEnd = new Date(reportDateEnd);
    }
    var newEndDate = new Date(dateEnd.setHours(23, 59, 59));
    var allCustomers = new ArrayList();
    var allSubscriptions = new ArrayList();
    
    if (!empty(reportDateStart) && !empty(reportDateEnd)) {
    	allCustomers = getAllCustomersWithSORSummary();
    }
    
    try {
        while (allCustomers.hasNext()) {
            var currentCustomer = allCustomers.next();

            if (
                empty(customerEmail) ||
                (
                    !empty(customerEmail)
                    && !empty(currentCustomer)
                    && !empty(currentCustomer.email)
                    && currentCustomer.email.indexOf(customerEmail) !== -1
                )
            ) {
                var refillCustomer = new RefillCustomerModel({
                    customer: currentCustomer.customer
                });
                var subscriptions = refillCustomer.subscriptions;
                for (var subscriptionsIndex in subscriptions) {
                    var subscription = subscriptions[subscriptionsIndex];
                    if (dateStart <= subscription.createdAt && subscription.createdAt <= newEndDate) {
                        if (subscriptionID != null) {
                            if (subscriptionID === subscription.ID) {
                                allSubscriptions.push(subscription);
                            }
                        } else {
                            allSubscriptions.push(subscription);
                        }
                    }
                }
            }
        }
        if (!empty(action) && !empty(action.formId) && action.formId === "export") {
            exportSubscriptions(allSubscriptions);
        } else {
            var subscriptionPagingModel = constructPagingModel(allSubscriptions);

            ISML.renderTemplate("bm/sorSubscriptionReport", {
                subscriptionPagingModel: subscriptionPagingModel,
                reportDateStart: reportDateStart,
                reportDateEnd: reportDateEnd,
                customerEmail: customerEmail,
                navigation: "subscriptionSummary"
            });
        }
    } catch (error) {
        SORLogger.error("Error retrieving SOR customer scheduled orders. Error: {0}", error);
        ISML.renderTemplate("bm/sorSubscriptionReport");
    }
}
module.exports.HandleSubscriptionFormFilter = handleSubscriptionSummaryForm;
module.exports.HandleSubscriptionFormFilter.public = true;
module.exports.HandleSubscriptionPagination = handleSubscriptionSummaryForm;
module.exports.HandleSubscriptionPagination.public = true;

/**
 * @description This endpoint handles the management of Orders and Subscriptions
 */
function manageRefillList() {
    var action = params.action.stringValue;
    var customerId = params.client.stringValue;
    var refillCustomer = new RefillCustomerModel({
        customer: CustomerMgr.getCustomerByCustomerNumber(customerId)
    });
    var renderInfo = {};
    var result;
    var reloadUrl = null;
    var hasReloadUrl = [];
    var refillType = "";
    if (!params.oid.empty) {
        refillType = "oid";
        reloadUrl = URLUtils.https("SmartOrderRefillReport-ShowOrder", "client", params.client.stringValue, "oid", params.oid.stringValue, "action", "view").toString();
        hasReloadUrl = ["paused", "reactivate", "removeProduct"];
        if (hasReloadUrl.indexOf(action) > -1) {
            renderInfo[action] = {
                reloadUrl: reloadUrl
            };
        }
        if (!empty(renderInfo.paused)) {
            renderInfo.paused.checkBeforeCancel = false;
        }
        if (!empty(renderInfo.canceled)) {
            renderInfo.canceled.showChargeModal = true;
        }
        renderInfo.view = {
            template: "bm/refillListView/listView"
        };
        renderInfo.updateAddress = {
            template: "bm/sorChangeAddress"
        };
        renderInfo.editProduct = {
            template: "bm/sorEditProduct"
        };

        result = refillCustomer.updateCustomerOrder(request, forms, renderInfo);
    }

    /**
     * Handles subscriptions
     */
    if (!params.sid.empty) {
        refillType = "sid";
        reloadUrl = URLUtils.https("SmartOrderRefillReport-ShowSubscriptions", "client", params.client.stringValue).toString();
        hasReloadUrl = ["paused", "reactivateSave", "updateRenewal", "canceled", "cancelWithCommitment", "removeProduct", "addProductToBMSave"];
        if (hasReloadUrl.indexOf(action) > -1) {
            renderInfo[action] = {
                reloadUrl: reloadUrl
            };
        }
        if (!empty(renderInfo.paused)) {
            renderInfo.paused.checkBeforeCancel = false;
        }
        if (!empty(renderInfo.canceled)) {
            renderInfo.canceled.showChargeModal = true;
        }
        if (!empty(renderInfo.removeProduct)) {
            renderInfo.removeProduct.showChargeModal = true;
        }

        renderInfo.reactivate = {
            template: "bm/sorReactivateTime"
        };
        renderInfo.view = {
            template: "bm/refillListView/listView"
        };
        renderInfo.updateAddress = {
            template: "bm/sorChangeAddress"
        };
        renderInfo.updateCreditCard = {
            template: "bm/sorUpdateCard"
        };
        renderInfo.editProduct = {
            template: "bm/sorEditProduct"
        };
        renderInfo.addProductToBM = {
            template: "bm/sorAddProduct"
        };
        renderInfo.addProductToBMShow = {
            template: "bm/addProduct"
        };
        result = refillCustomer.updateCustomerSubscription(request, forms, renderInfo);
    }
    var redirectActions = ["updateAddressSave", "updateCreditCardSave", "editProductSave"];
    if (redirectActions.indexOf(action) > -1) {
        response.redirect(URLUtils.https("SmartOrderRefillReport-ManageRefillList", "client", params.client.stringValue, refillType, params[refillType].stringValue, "action", "view"));
    }
    var template = "bm/util/json";

    if (!empty(result.template)) { // NOSONAR
        template = result.template;
    } else {
        result = {
            jsonObject: result
        };
    }
    ISML.renderTemplate(template, result);
}

exports.ManageRefillList = manageRefillList;
module.exports.ManageRefillList.public = true;
