/* eslint-disable new-cap */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-loop-func */
/* eslint-disable dot-notation */
/* global empty*/
"use strict";
/**
 *  Property of OSF Global Services, Inc., (with its brand OSF Commerce). OSF remains the sole owner of all right, title and interest in the software.
 *  Do not copy, sell, reverse engineer or otherwise attempt to derive or obtain information about the functioning, manufacture or operation therein.
 */
var RefillCustomerModel = require("~/cartridge/models/smartOrderRefill/refillCustomer.js");
var sorHelper = require("~/cartridge/scripts/smartOrderRefill/refillHelper.js");
var RefillCheckout = require("~/cartridge/models/smartOrderRefill/refillCheckout");
var RefillStorage = require("~/cartridge/scripts/smartOrderRefill/refillStorage");
var Status = require("dw/system/Status");
var CustomerMgr = require("dw/customer/CustomerMgr");
var Resource = require("dw/web/Resource");
var SORLogger = require("dw/system/Logger").getLogger("SORLogger", "SORLogger");
var Transaction = require("dw/system/Transaction");
var RefillAddress = require("~/cartridge/models/smartOrderRefill/refillAddress");
var FileWriter = require("dw/io/FileWriter");
var FileReader = require("dw/io/FileReader");
var CSVStreamReader = require("dw/io/CSVStreamReader");
var File = require("dw/io/File");
var Logger = require('dw/system/Logger');
/**
 * This function gets and iterates over order schedules
 * @param {Object} pdict - Any vars passed by Job call
 * @returns {dw.system.Status} job status
 */
exports.CreateOrders = function (pdict) {
    if (!sorHelper.verifyLicense()) {
        return new Status(Status.ERROR, null, Resource.msg("smartorderrefill.licenseinvalid", "smartorderrefill", null));
    }
 
    SORLogger.info("Start Job. Date Override: {0}", pdict.DateOverride);
    var hasNext;
    var fileReader;
    // process active subscriptions
    var sorActiveUserList = new File(File.IMPEX + "/src/sorActiveUserList.csv");
    fileReader = FileReader(sorActiveUserList);
    var profileActiveCounter = 0;
    hasNext = true;
    SORLogger.info("Procesing customer batch {0} to {1}", (pdict.StartAtProfile), (pdict.StartAtProfile + pdict.NumberOfProfiles));
    while (hasNext) {
        var customerNoActive = fileReader.readLine();
        if (customerNoActive == null) {
            hasNext = false;
            break;
        }
        if (!empty(customerNoActive)) {
            if (profileActiveCounter >= pdict.StartAtProfile) {
                if (pdict.NumberOfProfiles && profileActiveCounter >= (pdict.StartAtProfile + pdict.NumberOfProfiles)) {
                    SORLogger.info("Job Profile Limit Reached: {0} customers", pdict.NumberOfProfiles);
                    break;
                }
                var scheduledCustomerApi = CustomerMgr.getCustomerByCustomerNumber(customerNoActive);
                SORLogger.info("##-------Process Customer(1): {0}---------##", scheduledCustomerApi.profile.getCustomerNo());
                var scheduledCustomer1 = new RefillCustomerModel({
                    customer: scheduledCustomerApi,
                    dateOverride: pdict.DateOverride
                });
                try {
                    scheduledCustomer1.manageSubscriptions();
                } catch (e) {
                    SORLogger.error("Error in orders managment(1): {0}", e.toString());
                }
            }
        }
    }
    fileReader.close();

    // process pause subscriptions
    var sorStandByUserList = new File(File.IMPEX + "/src/sorStandByUserList.csv");
    fileReader = FileReader(sorStandByUserList);
    var profileStandByCounter = 0;
    hasNext = true;
    SORLogger.info("Procesing customer batch {0} to {1}", (pdict.StartAtProfile), (pdict.StartAtProfile + pdict.NumberOfProfiles));
    while (hasNext) {
        var customerNoStandBy = fileReader.readLine();
        if (customerNoStandBy == null) {
            hasNext = false;
            break;
        }
        if (!empty(customerNoStandBy)) {
            if (profileStandByCounter >= pdict.StartAtProfile) {
                if (pdict.NumberOfProfiles && profileStandByCounter >= (pdict.StartAtProfile + pdict.NumberOfProfiles)) {
                    SORLogger.info("Job Profile Limit Reached: {0} customers", pdict.NumberOfProfiles);
                    break;
                }
                var scheduledCustomerApi2 = CustomerMgr.getCustomerByCustomerNumber(customerNoStandBy);
                SORLogger.info("Process Customer: {0}", scheduledCustomerApi2.profile.getCustomerNo());
                var scheduledCustomer2 = new RefillCustomerModel({
                    customer: scheduledCustomerApi2,
                    dateOverride: pdict.DateOverride
                });
                try {
                    scheduledCustomer2.manageSubscriptions();
                } catch (e) {
                    SORLogger.error("Error in orders managment(2): {0}", e.toString());
                }
            }
        }
    }
    fileReader.close();
    // process subscriptions orders
    var sorSheduledUserList = new File(File.IMPEX + "/src/sorSheduledUserList.csv");
    fileReader = FileReader(sorSheduledUserList);
    var profileSheduledCounter = 0;
    hasNext = true;
    SORLogger.info("Procesing customer batch {0} to {1}", (pdict.StartAtProfile), (pdict.StartAtProfile + pdict.NumberOfProfiles));
    while (hasNext) {
        var customerNoSheduled = fileReader.readLine();
        if (customerNoSheduled == null) {
            hasNext = false;
            break;
        }
        if (!empty(customerNoSheduled)) {
            if (profileSheduledCounter >= pdict.StartAtProfile) {
                if (pdict.NumberOfProfiles && profileSheduledCounter >= (pdict.StartAtProfile + pdict.NumberOfProfiles)) {
                    SORLogger.info("Job Profile Limit Reached: {0} customers", pdict.NumberOfProfiles);
                    break;
                }
                var scheduledCustomerApi3 = CustomerMgr.getCustomerByCustomerNumber(customerNoSheduled);
                SORLogger.info("##--------- Process Customer(2): {0} ---------##", scheduledCustomerApi3.profile.getCustomerNo());
                var scheduledCustomer3 = new RefillCustomerModel({
                    customer: scheduledCustomerApi3,
                    dateOverride: pdict.DateOverride
                });
                try {
                    scheduledCustomer3.processCustomerSorOrders();
                } catch (e) {
                    SORLogger.error("Error in orders processing: {0}", e.toString());
                }
                scheduledCustomer3.placeCustomerSorOrders();
            }
        }
    }
    fileReader.close();
    return new Status(Status.OK, null, "Process finished.");
};

/**
 * @description Function is responsible for charging a customer a cancelation fee
 * @param {Object} pdict - Any vars passed by Job call
 * @returns {dw.system.Status} job status
 */
exports.ChargeCancelationFee = function (pdict) {
    var Site = require("dw/system/Site");
    var executionScope = JSON.parse(pdict.cancelationInfo);
    if (Site.current.ID !== executionScope.siteID) {
        return true;
    }
    var orderList = {};
    var args = {};
    var cancelProduct = {};
    var status = {};
    var customer = CustomerMgr.getCustomerByCustomerNumber(JSON.parse(pdict.customerNo));
    var subListParam = JSON.parse(pdict.subsList);
    var Billing = {};
    var Shipping = {};
    orderList.subscriptionID = subListParam.ID;
    orderList.originalOrder = subListParam.originalOrder;
    orderList.creditCardToken = subListParam.creditCardToken;

    orderList.billingAddress = [];
    Billing.address1 = subListParam.address1;
    Billing.address2 = subListParam.address2;
    Billing.city = subListParam.city;
    Billing.firstName = subListParam.firstName;
    Billing.lastName = subListParam.lastName;
    Billing.phone = subListParam.phone;
    Billing.postalCode = subListParam.postalCode;
    Billing.stateCode = subListParam.stateCode;
    Billing.countryCode = subListParam.countryCode;
    orderList.billingAddress = new RefillAddress(Billing);

    orderList.shippingAddress = [];
    Shipping.address1 = subListParam.address12;
    Shipping.address2 = subListParam.address22;
    Shipping.city = subListParam.city2;
    Shipping.firstName = subListParam.firstName2;
    Shipping.lastName = subListParam.lastName2;
    Shipping.phone = subListParam.phone2;
    Shipping.postalCode = subListParam.postalCode2;
    Shipping.stateCode = subListParam.stateCode2;
    Shipping.countryCode = subListParam.countryCode2;
    orderList.shippingAddress = new RefillAddress(Shipping);

    orderList.products = [];
    if (pdict.note) {
        orderList.note = pdict.note;
    }

    if (pdict.cancelationInfo) {
        orderList.cancelationInfo = pdict.cancelationInfo;
    }
    var cInfo = JSON.parse(orderList.cancelationInfo);
    var product = cInfo.products[0];
    var productID = product.ID;
    args.type = "cancel";
    args.cancelationFee = pdict.cancelationFee;
    cancelProduct.productID = productID;
    cancelProduct.name = "SORCancel";
    cancelProduct.ID = "sorcancel";
    cancelProduct.price = pdict.cancelationFee;
    cancelProduct.quantity = 1;
    orderList.products.push(cancelProduct);
    var customerCheckout = new RefillCheckout({
        customerRefillOrder: orderList,
        customer: customer,
        type: "cancel",
        cancelationFee: pdict.cancelationFee
    });
    status = customerCheckout.placeOrder();

    if (status.error) {
        return false;
    }
    return new Status(Status.OK, null, "Process finished.");
};
/**
 * @description Function is responsible for cleaning up all the order and subscription
 * @param {Object} pdict - Any vars passed by Job call
 * @returns {dw.system.Status} job status
 */
exports.CleanUp = function (pdict) {
    if (!sorHelper.verifyLicense()) {
        return new Status(Status.ERROR, null, Resource.msg("smartorderrefill.licenseinvalid", "smartorderrefill", null));
    }
    var sorHistoryUserList = new File(File.IMPEX + "/src/sorHistoryUserList.csv");
    var fileReader = FileReader(sorHistoryUserList);
    var profileCounter = 0;
    var hasNext = true;
    SORLogger.info("Procesing custoemr batch {0} to {1}", (pdict.StartAtProfile), (pdict.StartAtProfile + pdict.NumberOfProfiles));
    while (hasNext) {
        var customerNo = fileReader.readLine();
        if (customerNo == null) {
            hasNext = false;
            break;
        }
        if (!empty(customerNo)) {
            if (profileCounter >= pdict.StartAtProfile) {
                if (pdict.NumberOfProfiles && profileCounter >= (pdict.StartAtProfile + pdict.NumberOfProfiles)) {
                    SORLogger.info("Job Profile Limit Reached: {0} customers", pdict.NumberOfProfiles);
                    break;
                }
                var scheduledCustomerApi = CustomerMgr.getCustomerByCustomerNumber(customerNo);
                SORLogger.info("Process Customer: {0}", scheduledCustomerApi.profile.getCustomerNo());
                var scheduledCustomer = new RefillCustomerModel({
                    customer: scheduledCustomerApi
                });
                var customSubs = [];
                var customOrders = [];
                for (var subscriptionIndex in scheduledCustomer.subscriptions) {
                    var subs = scheduledCustomer.subscriptions[subscriptionIndex];
                    customSubs.push(subs);
                    customOrders = customOrders.concat(subs.orders);
                    if (subs.status === "canceled" || subs.status === "expired") {
                        RefillStorage["EXPORT_STORAGE"].saveSubscriptionExport(subs);
                        var removeIndex = customSubs.indexOf(subs);
                        customSubs.splice(removeIndex, 1);
                        RefillStorage["EXPORT_STORAGE"].saveOrdersExport(subs.orders);
                        for (var ordersIndex in subs.orders) {
                            var ords = subs.orders[ordersIndex];
                            var removeIndex2 = customOrders.indexOf(ords);
                            customOrders.splice(removeIndex2, 1);
                        }
                    } else {
                        var exportOrders = [];
                        for (var ordersIndex2 in subs.orders) {
                            var ords2 = subs.orders[ordersIndex2];
                            if (ords2.createdAt < subs.createdAt) {
                                exportOrders.push(ords2);
                                var removeIndex3 = customOrders.indexOf(ords2);
                                customOrders.splice(removeIndex3, 1);
                            }
                        }
                        if (!empty(exportOrders)) {
                            RefillStorage["EXPORT_STORAGE"].saveOrdersExport(exportOrders);
                        }
                    }
                }
                Transaction.wrap(function () {
                    scheduledCustomer.subscriptions = customSubs;
                    scheduledCustomer.orders = customOrders;
                });
                var success = RefillStorage["SOR_STORAGE"].saveCustomerSubscription(scheduledCustomer, customSubs.ID);
                if (success) {
                    RefillStorage["SOR_STORAGE"].saveCustomerInformation(scheduledCustomer);
                }
            }
        }
    }
    fileReader.close();
    return new Status(Status.OK, null, "Process finished.");
};
/**
 * @description Generate User List
 */
exports.GenerateUserList = function () {
    var fileWriter;
    var activeSorCustomers = CustomerMgr.searchProfiles("custom.hasActiveSubscriptions={0}", null, true);
    var standBySorCustomers = CustomerMgr.searchProfiles("custom.hasStandBySubscriptions={0}", null, true);
    var scheduledSorCustomers = CustomerMgr.searchProfiles("custom.hasSmartOrderRefill={0}", null, true);
    var historySorCustomers = CustomerMgr.searchProfiles("custom.hasSmartOrderRefillHistory={0}", null, true);

    var totalActiveCustomerCount = activeSorCustomers.getCount();
    SORLogger.info("Total active customers count {0}", totalActiveCustomerCount);
    var sorActiveUserList = new File(File.IMPEX + "/src/sorActiveUserList.csv");
    fileWriter = FileWriter(sorActiveUserList);
    while (activeSorCustomers.hasNext()) {
        var sorCustomerActive = activeSorCustomers.next();
        if(sorCustomerActive.email.indexOf('@pii.ai') > -1) continue; //for filtering pii deleted customers
        fileWriter.writeLine(sorCustomerActive.customerNo);
    }
    fileWriter.close();

    var totalStandByCustomerCount = standBySorCustomers.getCount();
    SORLogger.info("Total standby customers count {0}", totalStandByCustomerCount);
    var sorStandByUserList = new File(File.IMPEX + "/src/sorStandByUserList.csv");
    fileWriter = FileWriter(sorStandByUserList);
    while (standBySorCustomers.hasNext()) {
        var sorCustomerStandBy = standBySorCustomers.next();
        if(sorCustomerStandBy.email.indexOf('@pii.ai') > -1) continue; //for filtering pii deleted customers
        fileWriter.writeLine(sorCustomerStandBy.customerNo);
    }
    fileWriter.close();

    var totalSheduledCustomerCount = scheduledSorCustomers.getCount();
    SORLogger.info("Total sheduled customers count {0}", totalSheduledCustomerCount);
    var sorSheduledUserList = new File(File.IMPEX + "/src/sorSheduledUserList.csv");
    fileWriter = FileWriter(sorSheduledUserList);
    while (scheduledSorCustomers.hasNext()) {
        var sorCustomerSheduled = scheduledSorCustomers.next();
        if(sorCustomerSheduled.email.indexOf('@pii.ai') > -1) continue; //for filtering pii deleted customers
        fileWriter.writeLine(sorCustomerSheduled.customerNo);
    }
    fileWriter.close();

    var totalHistoryCustomerCount = historySorCustomers.getCount();
    SORLogger.info("Total history customers count {0}", totalHistoryCustomerCount);
    var sorHistoryUserList = new File(File.IMPEX + "/src/sorHistoryUserList.csv");
    fileWriter = FileWriter(sorHistoryUserList);
    while (historySorCustomers.hasNext()) {
        var sorCustomerHistory = historySorCustomers.next();
        fileWriter.writeLine(sorCustomerHistory.customerNo);
    }

    fileWriter.close();
};


/**
* @description Create subscription,
* This will generate the subscriptions and will populate the same in customer profile
**/
exports.CreateSubscriptions = function(pdict) {

    try {
    	var OrderMgr = require('dw/order/OrderMgr');
    	var CustomerMgr = require('dw/customer/CustomerMgr');
    	
    	var orderList = OrderMgr.searchOrders("custom.OSFUseScheduleJob = {0}","orderNo asc", true);
    	orderList = orderList.asList();
    	
    	for(var i in orderList) {
    		var order = orderList[i];
    		//this check is to avoid creation of subscriptions for cancelled orders. 
    		//6 is the code for CANCELLED status.
    		if(order.status.value !== 6){
    			var Customer = CustomerMgr.getCustomerByLogin(order.customerEmail);
        		if(!Customer) {continue;}
        		

				
        		Transaction.wrap(function () {
        			Customer.profile.custom.hasOsfSmartOrderRefill = true;
                    
					var subscriptionList  = [];
			        var hasRefillProducts = false;
			
			        var RefillCustomerModel = require('int_smartorderrefill/cartridge/models/smartOrderRefill/refillCustomer.js');      
			        
			        var refillCustomer = new RefillCustomerModel({
			            preferences : require('dw/system/Site').current.preferences,
			            customer    : Customer
			        });
			        subscriptionList.push(refillCustomer.createSmartOrderRefillSubscription(order, Customer));
			        hasRefillProducts = true;
			
                    order.custom.OSFUseScheduleJob = false;
                });
    		}
    	}
    	
    } catch(e) {
		var err = e;
        Logger.error(e.toString());
        return false;
    }
}

/**
* AD - Customer subscription migration script
**/
exports.MigrateSubscriptionOrders = function() {
	var Site = require('dw/system/Site');
	var ProductMgr = require('dw/catalog/ProductMgr');
	var RefillSubscription = require("*/cartridge/models/smartOrderRefill/refillSubscription");
	
	var fileReader;
	SORLogger.info("Start Job: AD migration");
	var file = new File(File.IMPEX + "/src/tatcha/temp/customerOrdersList.csv");
	var fileReader = new FileReader(file);
	var csvReader = new CSVStreamReader(fileReader);
	var line;
	var i = 0;
	
	while ((line = csvReader.readNext()) != null ) {
		SORLogger.info("Has record");
		
		Transaction.wrap(function() {
			var customer = CustomerMgr.getCustomerByCustomerNumber(line[0]);
			SORLogger.info("customer {0}", customer);
			
			if(customer) {
				SORLogger.info("Customer ID {0}", line[0]);
				customer.profile.custom.hasOsfSmartOrderRefill = true;
				var subscriptionList  = [];
		        var RefillCustomerModel = require('int_smartorderrefill/cartridge/models/smartOrderRefill/refillCustomer.js');      
		        
		        var refillCustomer = new RefillCustomerModel({
		            preferences : require('dw/system/Site').current.preferences,
		            customer    : customer
		        });
			    subscriptionList.push(refillCustomer.createMigratedSubscriptions(customer, i, line));
			}
		})
		i++;
	}
	fileReader.close();
	csvReader.close();
}


/**
 * AD - SKU change job
 **/
exports.UpdateSKU = function() {

    var Site = require('dw/system/Site');
    var ProductMgr = require('dw/catalog/ProductMgr');
    var RefillSubscription = require("*/cartridge/models/smartOrderRefill/refillSubscription");

    var fileReader;
    SORLogger.info("Start Job: Update SKU Job");
    var file = new File(File.IMPEX + "/src/temp/updateSKUList.csv");
    var fileReader = new FileReader(file);
    var csvReader = new CSVStreamReader(fileReader);
    var line;
    var i = 0;

    while ((line = csvReader.readNext()) != null ) {
        var oldSku = line[0];
        var newSku = line[1];
        SORLogger.info("Has record -"+oldSku+','+newSku);

        var scheduledSorCustomers = CustomerMgr.searchProfiles("custom.hasSmartOrderRefill={0}", null, true);

        while (scheduledSorCustomers.hasNext()) {
            var sorCustomerSheduled = scheduledSorCustomers.next();

            var refillCustomer = new RefillCustomerModel({
                preferences : require('dw/system/Site').current.preferences,
                customer    : sorCustomerSheduled.customer
            });

            refillCustomer.updateSKU(oldSku, newSku);
        }
        i++;
    }

    var totalHistoryCustomerCount = scheduledSorCustomers.getCount();
    SORLogger.info("Total history customers count {0}", totalHistoryCustomerCount);
    fileReader.close();
    csvReader.close();
}