/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
/**
 *  Property of OSF Global Services, Inc., (with its brand OSF Commerce). OSF remains the sole owner of all right, title and interest in the software.
 *  Do not copy, sell, reverse engineer or otherwise attempt to derive or obtain information about the functioning, manufacture or operation therein.
 */

var CustomerMgr = require("dw/customer/CustomerMgr");
var ProductMgr = require("dw/catalog/ProductMgr");
var Calendar = require("dw/util/Calendar");
var File = require("dw/io/File");
var FileWriter = require("dw/io/FileWriter");
var StringUtils = require("dw/util/StringUtils");
var CSVStreamWriter = require("dw/io/CSVStreamWriter");
var Resource = require("dw/web/Resource");
var SORLogger = require("dw/system/Logger").getLogger("SORLogger", "SORLogger");
var Site = require("dw/system/Site");

/**
 * Save subscription export
 * @param {Object} subscription - subscription
 */
function saveSubscriptionExport(subscription) {
    var headers = [
        Resource.msg("report.tableheader.subscriptionid", "smartorderrefill", null),
        Resource.msg("report.tableheader.customer", "smartorderrefill", null),
        Resource.msg("report.tableheader.validuntil", "smartorderrefill", null),
        Resource.msg("report.tableheader.status", "smartorderrefill", null),
        Resource.msg("report.tableheader.shipping.address1", "smartorderrefill", null),
        Resource.msg("report.tableheader.shipping.city", "smartorderrefill", null),
        Resource.msg("report.tableheader.shipping.countryCode", "smartorderrefill", null),
        Resource.msg("report.tableheader.shipping.firstName", "smartorderrefill", null),
        Resource.msg("report.tableheader.shipping.lastName", "smartorderrefill", null),
        Resource.msg("report.tableheader.shipping.phone", "smartorderrefill", null),
        Resource.msg("report.tableheader.shipping.postalCode", "smartorderrefill", null),
        Resource.msg("report.tableheader.shipping.stateCode", "smartorderrefill", null),
        Resource.msg("report.tableheader.billing.address1", "smartorderrefill", null),
        Resource.msg("report.tableheader.billing.city", "smartorderrefill", null),
        Resource.msg("report.tableheader.billing.countryCode", "smartorderrefill", null),
        Resource.msg("report.tableheader.billing.firstName", "smartorderrefill", null),
        Resource.msg("report.tableheader.billing.lastName", "smartorderrefill", null),
        Resource.msg("report.tableheader.billing.phone", "smartorderrefill", null),
        Resource.msg("report.tableheader.billing.postalCode", "smartorderrefill", null),
        Resource.msg("report.tableheader.billing.stateCode", "smartorderrefill", null),
        Resource.msg("report.tableheader.productid", "smartorderrefill", null),
        Resource.msg("report.tableheader.productname", "smartorderrefill", null),
        Resource.msg("report.tableheader.productprice", "smartorderrefill", null),
        Resource.msg("report.tableheader.productquantity", "smartorderrefill", null)
    ];

    var path = File.IMPEX + File.SEPARATOR + "src" + File.SEPARATOR + "fileStorage" + File.SEPARATOR + "saveSubscription";
    var folder = new File(path);
    if (!folder.exists()) {
        folder.mkdirs();
    }
    var fileName = ["ExportSubscription_", Site.current.ID, "_", StringUtils.formatCalendar(new Calendar(), "yyyy_MM_dd_HHmmss"), "_", Math.random().toString(36).substr(2), ".csv"].join("");
    var file = new File(path + File.SEPARATOR + fileName);
    var fileWriter = new FileWriter(file);
    var csw = new CSVStreamWriter(fileWriter);

    if (headers != null) {
        csw.writeNext(headers);
        headers = null;
    }
    try {
        for (var subscriptionProductsIndex in subscription.products) {
            var product = subscription.products[subscriptionProductsIndex];
            var line = [
                subscription.ID,
                CustomerMgr.getCustomerByCustomerNumber(subscription.customerNo).getProfile().getEmail(),
                subscription.validUntil,
                subscription.status,
                subscription.shippingAddress.address1,
                subscription.shippingAddress.city,
                subscription.shippingAddress.countryCode.value,
                subscription.shippingAddress.firstName,
                subscription.shippingAddress.lastName,
                subscription.shippingAddress.phone,
                subscription.shippingAddress.postalCode,
                subscription.shippingAddress.stateCode,
                subscription.billingAddress.address1,
                subscription.billingAddress.city,
                subscription.billingAddress.countryCode.value,
                subscription.billingAddress.firstName,
                subscription.billingAddress.lastName,
                subscription.billingAddress.phone,
                subscription.billingAddress.postalCode,
                subscription.billingAddress.stateCode,
                product.ID,
                ProductMgr.getProduct(product.ID).getName(),
                product.price + " " + product.currencyCode,
                product.quantity
            ];
            csw.writeNext(line);
        }
    } catch (err) {
        SORLogger.error("fileStorage.js - saveSubscriptionExport function - " + err);
        csw.writeNext([Resource.msg("forms.sorsubscriptions.exportError", "sor_forms", null)]);
    } finally {
        csw.close();
        fileWriter.close();
    }
}

exports.saveSubscriptionExport = saveSubscriptionExport;


/**
 * Save orders export
 * @param {Object} orders -orders
 */
function saveOrdersExport(orders) {
    var headers = [
        Resource.msg("report.tableheader.customer", "smartorderrefill", null),
        Resource.msg("report.tableheader.orderdate", "smartorderrefill", null),
        Resource.msg("report.tableheader.status", "smartorderrefill", null),
        Resource.msg("report.tableheader.subscriptionid", "smartorderrefill", null),
        Resource.msg("report.tableheader.shipping.address1", "smartorderrefill", null),
        Resource.msg("report.tableheader.shipping.city", "smartorderrefill", null),
        Resource.msg("report.tableheader.shipping.countryCode", "smartorderrefill", null),
        Resource.msg("report.tableheader.shipping.firstName", "smartorderrefill", null),
        Resource.msg("report.tableheader.shipping.lastName", "smartorderrefill", null),
        Resource.msg("report.tableheader.shipping.phone", "smartorderrefill", null),
        Resource.msg("report.tableheader.shipping.postalCode", "smartorderrefill", null),
        Resource.msg("report.tableheader.shipping.stateCode", "smartorderrefill", null),
        Resource.msg("report.tableheader.billing.address1", "smartorderrefill", null),
        Resource.msg("report.tableheader.billing.city", "smartorderrefill", null),
        Resource.msg("report.tableheader.billing.countryCode", "smartorderrefill", null),
        Resource.msg("report.tableheader.billing.firstName", "smartorderrefill", null),
        Resource.msg("report.tableheader.billing.lastName", "smartorderrefill", null),
        Resource.msg("report.tableheader.billing.phone", "smartorderrefill", null),
        Resource.msg("report.tableheader.billing.postalCode", "smartorderrefill", null),
        Resource.msg("report.tableheader.billing.stateCode", "smartorderrefill", null),
        Resource.msg("report.tableheader.productid", "smartorderrefill", null),
        Resource.msg("report.tableheader.productname", "smartorderrefill", null),
        Resource.msg("report.tableheader.productprice", "smartorderrefill", null),
        Resource.msg("report.tableheader.productquantity", "smartorderrefill", null)
    ];

    var path = File.IMPEX + File.SEPARATOR + "src" + File.SEPARATOR + "fileStorage/saveOrders/";
    var folder = new File(path);
    if (!folder.exists()) {
        folder.mkdirs();
    }
    var fileName = ["ExportOrders_", Site.current.ID, "_", StringUtils.formatCalendar(new Calendar(), "yyyy_MM_dd_HHmmss"), "_", Math.random().toString(36).substr(2), ".csv"].join("");
    var file = new File(path + File.SEPARATOR + fileName);
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
                    order.shippingAddress.address1,
                    order.shippingAddress.city,
                    order.shippingAddress.countryCode.value,
                    order.shippingAddress.firstName,
                    order.shippingAddress.lastName,
                    order.shippingAddress.phone,
                    order.shippingAddress.postalCode,
                    order.shippingAddress.stateCode,
                    order.billingAddress.address1,
                    order.billingAddress.city,
                    order.billingAddress.countryCode.value,
                    order.billingAddress.firstName,
                    order.billingAddress.lastName,
                    order.billingAddress.phone,
                    order.billingAddress.postalCode,
                    order.billingAddress.stateCode,
                    productLine.ID,
                    ProductMgr.getProduct(productLine.ID).getName(),
                    productLine.price + " " + productLine.currencyCode,
                    productLine.quantity
                ];
                csw.writeNext(line);
            }
        }
    } catch (err) {
        SORLogger.error("fileStorage.js - saveOrdersExport function -  " + err);
        csw.writeNext([Resource.msg("forms.sorsubscriptions.exportError", "sor_forms", null)]);
    } finally {
        csw.close();
        fileWriter.close();
    }
}

exports.saveOrdersExport = saveOrdersExport;
