/* eslint-disable no-unused-vars */
/* eslint-disable dot-notation */
/* eslint-disable eol-last */
/* eslint-disable no-restricted-syntax, guard-for-in, no-array-constructor, no-continue, new-cap */

"use strict";
/**
 *  Property of OSF Global Services, Inc., (with its brand OSF Commerce). OSF remains the sole owner of all right, title and interest in the software.
 *  Do not copy, sell, reverse engineer or otherwise attempt to derive or obtain information about the functioning, manufacture or operation therein.
 */
/**
 * This model is responsible for handling the Customer Refill inforamtion
 */
/* global empty, request, session */
var Site = require('dw/system/Site');
var Resource = require("dw/web/Resource");
var Calendar = require("dw/util/Calendar");
var URLUtils = require("dw/web/URLUtils");
var ProductSearchModel = require("dw/catalog/ProductSearchModel");
var OrderMgr = require("dw/order/OrderMgr");
var ProductMgr = require("dw/catalog/ProductMgr");
var PaymentMgr = require("dw/order/PaymentMgr");
var ArrayList = require("dw/util/ArrayList");
var sorHelper = require("~/cartridge/scripts/smartOrderRefill/refillHelper.js");
var paymentIntegration = require("~/cartridge/controllers/paymentIntegration/PaymentIntegration");
var RefillSubscription = require("~/cartridge/models/smartOrderRefill/refillSubscription");
var RefillAddress = require("~/cartridge/models/smartOrderRefill/refillAddress");
var RefillOrder = require("~/cartridge/models/smartOrderRefill/refillOrder");
var RefillProduct = require("~/cartridge/models/smartOrderRefill/refillProduct");
var RefillCheckout = require("~/cartridge/models/smartOrderRefill/refillCheckout");
var RefillStorage = require("~/cartridge/scripts/smartOrderRefill/refillStorage");
var RefillEmails = require("~/cartridge/scripts/smartOrderRefill/refillEmails");
var PaymentInstrument = require("dw/order/PaymentInstrument");
var SORLogger = require("dw/system/Logger").getLogger("SORLogger", "SORLogger");
var PAYMENTPROCESSOR = {
    CYBERSOURCE: "CYBERSOURCE_CREDIT",
    ADYEN: "ADYEN_CREDIT",
    BASIC: "BASIC_CREDIT",
    BRAINTREE: "BRAINTREE_CREDIT"
};
var siteID = require("dw/system/Site").current.ID;

/**
 * @module RefillCustomer
 */


/**
 * @description This function generates a JS representation of Smart Order Refill site preference values
 * @param {dw.system.SitePreferences} preferences SFCC preferences object
 * @returns {Object} object representation of Smart Order Refill preferences
 */
function getPreferences(preferences) {
    var preferenceObject = {
        SorEnabled: preferences.custom.SorEnabled,
        SorMonthsToCancelPaused: preferences.custom.SorMonthsToCancelPaused,
        SorAutomaticRenewalEnabled: preferences.custom.SorAutomaticRenewalEnabled,
        SorChangeProductPrice: preferences.custom.SorChangeProductPrice,
        SorBillingDay: preferences.custom.SorBillingDay,
        rescheduleOrderEnabled: preferences.custom.SorRescheduleOrder,
        numberOfDelayDays: preferences.custom.SorNumberOfDelayDays,
        notificationBeforeOrderDays: preferences.custom.SorNotificationBeforeOrderDays,
        SorCancelPausedInNextOrder: preferences.custom.SorCancelPausedInNextOrder,
        SorPriceBook: preferences.custom.SorPriceBook,
        SorDeliveryWeekInterval: preferences.custom.SorDeliveryWeekInterval,
        SorDeliveryMonthInterval: preferences.custom.SorDeliveryMonthInterval,
        SorPauseSubscription: preferences.custom.SorPauseSubscription,
        SorOCAPIKey: preferences.custom.SorOCAPIKey,
        SorToAddProduct: preferences.custom.SorToAddProduct,
        SorCancellationReasons: preferences.custom.SorCancellationReasons
    };
    preferenceObject.SorDeliveryWeekInterval = preferenceObject.SorDeliveryWeekInterval.sort(function (a, b) { return a - b; });
    preferenceObject.SorDeliveryMonthInterval = preferenceObject.SorDeliveryMonthInterval.sort(function (a, b) { return a - b; });
    return preferenceObject;
}
/**
 * @description Model for Smart Order Refill Custoemr
 * @typedef {RefillCustomer} RefillCustomer
 * @property {dw.customer.Customer} customer
 * @property {Object} orders
 * @property {Date} currentDate
 * @property {Object} subscriptions
 * @property {dw.system.Request} request
 * @property {Object} preferences
 */

/**
 * @description Constructor function for RefillCustomer
 * @param {Object} args constructor paramters
 * @constructor RefillCustomer
 */
function RefillCustomer(args) {
    this.customer = args.customer;
    this.orders = {};
    this.currentDate = args.dateOverride || new Date();
    this.request = args.request || request;
    this.subscriptions = this.initializeSubscriptions();
    this.preferences = getPreferences(args.preferences || require("dw/system/Site").current.preferences);
}
/**
 * Funtion responsible for retriving current country
 * @function getCurrentCountry
 * @param {string} locale locale string of country to search for
 * @returns {string} country code
 */
function getCurrentCountry(locale) {
    var currentCountry = null;
    try {
        var countries = require("*/cartridge/config/countries");
        var Locale = require("dw/util/Locale");
        var country;
        if (!empty(countries) && countries.length === 0) {
            var currentLocale = Locale.getLocale(locale);
            if (!currentLocale.country) {
                currentCountry = countries[0];
            }
            for (var i = 0; i < countries.length; i++) {
                var tempCountry = countries[i];
                if (tempCountry.countryCode === currentLocale.country) {
                    country = tempCountry;
                    break;
                }
            }
        }
        currentCountry = country || countries[0];
    } catch (error) {
        currentCountry = require("*/cartridge/scripts/util/Countries").getCurrent({
            CurrentRequest: {
                locale: locale
            }
        });
    }
    return currentCountry;
}

/**
 * @description Return the difference in days between two dates
 * @function dateDiffInDays
 * @param {Date} date1 date to compare
 * @param {Date} date2 date to compare
 * @returns {number} number of days difference between dates
 */
function dateDiffInDays(date1, date2) {
    var dt1 = new Date(date1);
    var dt2 = new Date(date2);

    return Math.floor((Date.UTC(dt2.getFullYear(), dt2.getMonth(), dt2.getDate()) - Date.UTC(dt1.getFullYear(), dt1.getMonth(), dt1.getDate())) / (1000 * 60 * 60 * 24));
}

/**
 * @description This function is responsible for canceling a customer subscription and optionaly sending a notification message
 * @function cancelSubscription
 * @param {RefillCustomer} refillCustomer RefillCustomer object
 * @param {RefillSubscription} customerSubscription RefillSubscription object
 * @param {boolean} skipEmail detrmines if email will be skiped
 * @returns {boolean} success status
 */
function cancelSubscription(refillCustomer, customerSubscription, skipEmail, sorCancelReason) {
    var success = false;
    try {
        customerSubscription.changeStatus(RefillSubscription.STATUS_CANCELED);
        if(!empty(sorCancelReason)){
            customerSubscription.cancellationReason = sorCancelReason;
        }
        customerSubscription.cancelAllOrders();
        refillCustomer.updateOrderList(customerSubscription.orders);
        success = RefillStorage["SOR_STORAGE"].saveCustomerSubscription(refillCustomer, customerSubscription.ID);
        if (success) {
            if (!skipEmail) {
                RefillEmails.sendSubscriptionCancel(customerSubscription, refillCustomer.customer);
            }
            RefillStorage["SOR_STORAGE"].saveCustomerInformation(refillCustomer);
        }
    } catch (e) {
        var error = e;
        return success;
    }
    return success;
}

/**
 * @description This function detrmines if a subscription or order is eligible for customer cancelation
 * this is to ensure that a customer commitment will be fulfilled
 * @function checkForCommitmentBeforeCancel
 * @param {RefillCustomer} refillCustomer RefillCustomer object
 * @param {string} type type of refill list to check
 * @param {string} id id of the comitmant item
 * @param {string} item product if of commitmatn item
 * @returns {Object} success status of check
 */
function checkForCommitmentBeforeCancel(refillCustomer, type, id, item) {
    var ret = {
        status: true,
        message: ""
    };
    if (type === "order") {
        var customerOrder = refillCustomer.orders[id];
        var orderSubscription = refillCustomer.subscriptions[customerOrder.subscriptionID];
        var futureProductOrders;
        var productCommitment;

        for (var productIndex in customerOrder.products) {
            var orderProduct = customerOrder.products[productIndex];
            productCommitment = 0;

            var subscriptionProduct = orderSubscription.getProduct(orderProduct.ID);
            if (!empty(subscriptionProduct.commitment)) {
                productCommitment = subscriptionProduct.commitment - subscriptionProduct.commitmentDone;
            }

            if (productCommitment <= 0) continue;

            futureProductOrders = 0;
            var activeSubscriptionOrders = orderSubscription.getActiveOrders();
            for (var activeSubscriptionOrdersIndex in activeSubscriptionOrders) {
                var activeSubscriptionOrder = activeSubscriptionOrders[activeSubscriptionOrdersIndex];
                var subscriptionOrderProduct = activeSubscriptionOrder.getProduct(subscriptionProduct.ID);
                if (!empty(subscriptionOrderProduct)) {
                    futureProductOrders += 1;
                }
            }

            if (productCommitment >= futureProductOrders) {
                var orderProductName = ProductMgr.getProduct(orderProduct.ID).name;
                ret.status = false;
                ret.message = "Product " + orderProductName + " needs " + productCommitment + " more completed orders.";
            }
        }
    } else if (type === "subscription") {
        var customerSubscription = refillCustomer.subscriptions[id];

        for (var productsIndex in customerSubscription.products) {
            var product = customerSubscription.products[productsIndex];
            if (item && item !== product.ID) continue;

            if (product.commitment && product.commitment > product.commitmentDone) {
                var productName = ProductMgr.getProduct(product.ID).name;
                ret.status = false;
                ret.message = "Product " + productName + " has commitment " + product.commitmentDone + "/" + product.commitment;
                break;
            }
        }
    }

    return ret;
}

/**
 * @description This function is used to retrive the OCAPI authentification token
 * @function getOCAPIAuthToken
 * @param {string} SorOCAPIKey ocapi key
 * @returns {Object} status
 */
function getOCAPIAuthToken(SorOCAPIKey) {
    var createRequest = function (ocapiService) {
        ocapiService.addHeader("Content-Type", "application/x-www-form-urlencoded");
        ocapiService.addHeader("Authorization", "Basic " + SorOCAPIKey);
        ocapiService.setRequestMethod("POST");

        return "grant_type=urn:demandware:params:oauth:grant-type:client-id:dwsid:dwsecuretoken";
    };

    var parseResponse = function (_service, args) {
        return args.text;
    };

    var filterLogMessage = function (msg) {
        return msg;
    };

    var serviceCallback = {
        createRequest: createRequest,
        parseResponse: parseResponse,
        filterLogMessage: filterLogMessage
    };

    var service = require("dw/svc/LocalServiceRegistry").createService("SOR_OCAPI_Auth", serviceCallback);

    var response = service.call();

    var responseObj = JSON.parse(response.object);

    if (responseObj) {
        return responseObj.access_token;
    }
    return {
        error: true,
        message: JSON.parse(response.errorMessage).error_description
    };
}

/**
 * @description This function is responsible for generating the OCAPI request body
 * @function getOCAPIRequestBody
 * @param {Object} args arg object
 * @returns {string} stringified object
 */
function getOCAPIRequestBody(args) {
    var body = {};
    body.parameters = [];

    body.parameters.push({});
    body.parameters[0].name = "subsList";
    body.parameters[0].value = JSON.stringify(args.subsList);

    body.parameters.push({});
    body.parameters[1].name = "note";
    body.parameters[1].value = JSON.stringify(args.note);

    body.parameters.push({});
    body.parameters[2].name = "cancelationInfo";
    body.parameters[2].value = JSON.stringify(args.cancelationInfo);

    body.parameters.push({});
    body.parameters[3].name = "cancelationFee";
    body.parameters[3].value = JSON.stringify(args.cancelationFee);

    body.parameters.push({});
    body.parameters[4].name = "customerNo";
    body.parameters[4].value = JSON.stringify(args.customerNo);

    return JSON.stringify(body);
}

/**
 * @description This function is responsible for getting the product
 * @function getOCAPIRequestBody
 * @param {string} productID product ID
 * @param {string} currency currency
 * @returns {string} stringified object
 */
RefillCustomer.prototype.getOCAPIProduct = function (productID, currency) {
    var createRequest = function (ocapiService) {
        ocapiService.addHeader("Content-Type", "application/json");
        ocapiService.setRequestMethod("GET");
        var url = ocapiService.getURL();
        url = url.replace("{siteid}", siteID);
        url = url.replace("{productID}", productID);
        url = url.replace("{currency}", currency);
        ocapiService.setURL(url);
    };
    var parseResponse = function (_service, args) {
        return args.text;
    };

    var filterLogMessage = function (msg) {
        return msg;
    };

    var serviceCallback = {
        createRequest: createRequest,
        parseResponse: parseResponse,
        filterLogMessage: filterLogMessage
    };

    var service = require("dw/svc/LocalServiceRegistry").createService("SOR_OCAPI_GetProduct", serviceCallback);

    var response = service.call();

    var responseObj = JSON.parse(response.object);
    var ret;
    if (responseObj) {
        ret = responseObj;
    } else {
        ret = {
            error: true,
            message: JSON.parse(response.errorMessage).error_description
        };
    }
    return ret;
};

/**
 * @description Fucntion is responsible for procesing a refill order and setting the corect status and sending the coresponsing notification email
 * @function processOrderList
 * @param {RefillCustomer} refillCustomer RefillCustomer object
 * @param {RefillOrder} customerOrderArg RefillOrder object
 * @param {boolean} cancelIfOutOfStock determins if outof stock should cause RefillOrder to be canceled
 */
function processOrderList(refillCustomer, customerOrderArg, cancelIfOutOfStock) {
    SORLogger.info("SOR Job: inside processOrderList ***");
    var customerOrder = customerOrderArg;
    if (customerOrder.status !== RefillOrder.STATUS_CCEXPIRED) {
        var allProductsAvailable = true;
        for (var productsIndex in customerOrder.products) {
            var product = customerOrder.products[productsIndex];
            if (!product.isAvailableForSmartOrderRefill()) {
                allProductsAvailable = false;
            }
            SORLogger.info("SOR Job: processOrderList ***: Product ID: {0}, Available status: {1}", product.ID, allProductsAvailable);
        }

        if (allProductsAvailable) {
            customerOrder.changeStatus(RefillOrder.STATUS_PROCESSING);
            customerOrder.lastUpdate = refillCustomer.currentDate;
            SORLogger.info("Set PROCESSING status. Order: {0}", customerOrder.ID);
        } else if (cancelIfOutOfStock) {
            /* commenting since notification is not need
            RefillEmails.sendOrderOutOfStockCancel(customerOrder, refillCustomer.customer);*/
            customerOrder.changeStatus(RefillOrder.STATUS_CANCELED);
            customerOrder.lastUpdate = refillCustomer.currentDate;
        } else {
            customerOrder.changeStatus(RefillOrder.STATUS_OUTOFSTOCK);
            customerOrder.lastUpdate = refillCustomer.currentDate;
        }
    } else {
    	/* commenting since notification is not need
    	RefillEmails.sendCCExpiredMail(customerOrder, refillCustomer.customer); */
        customerOrder.changeStatus(RefillOrder.STATUS_CANCELED);
        customerOrder.lastUpdate = refillCustomer.currentDate;
    }
    SORLogger.info("SOR order {0} status: {1}", customerOrder.ID, customerOrder.status);
}

/**
 * @description This function is responsible for removing a subscription product, updating all scheduled orders
 * @function removeSubscriptionProduct
 * @param {RefillCustomer} refillCustomer RefillCustomer object
 * @param {RefillSubscription} customerSubscription RefillSubscription object
 * @param {string} productID prodcut id to remove
 * @returns {boolean} success status
 */
function removeSubscriptionProduct(refillCustomer, customerSubscription, productID) {
    customerSubscription.removeProduct(productID);
    customerSubscription.changeStatus(RefillSubscription.STATUS_UPDATED);
    customerSubscription.clearActiveOrders();

    customerSubscription.createScheduledOrders(refillCustomer.currentDate);
    refillCustomer.updateOrderList(customerSubscription.orders);

    var success = RefillStorage["SOR_STORAGE"].saveCustomerSubscription(refillCustomer, customerSubscription.ID);

    if (success) {
        RefillStorage["SOR_STORAGE"].saveCustomerInformation(refillCustomer);
    }

    return success;
}

/**
 * @description Function is responsible for charging a customer a cancelation fee
 * @param {RefillSubscription} subsList RefillSubscription object
 * @param {number} cancelationFee value of cancelation fee
 * @param {string} note order note
 * @param {Object} cancelationInfo cancelation object
 * @param {RefillCustomer} sorCustomer RefillCustomer object
 * @returns {Object} success status
 */
function chargeCancelationFee(subsList, cancelationFee, note, cancelationInfo, sorCustomer) {
    var currentCustomer = sorCustomer.customer;
    var authToken = getOCAPIAuthToken(sorCustomer.preferences.SorOCAPIKey);

    var subListParam = {
        ID: subsList.ID,
        creditCardToken: subsList.creditCardToken,
        originalOrder: subsList.originalOrder,
        firstName: subsList.billingAddress.firstName,
        lastName: subsList.billingAddress.lastName,
        phone: subsList.billingAddress.phone,
        address1: subsList.billingAddress.address1,
        address2: subsList.billingAddress.address2,
        city: subsList.billingAddress.city,
        stateCode: subsList.billingAddress.stateCode,
        postalCode: subsList.billingAddress.postalCode,
        countryCode: subsList.billingAddress.countryCode,
        firstName2: subsList.shippingAddress.firstName,
        lastName2: subsList.shippingAddress.lastName,
        phone2: subsList.shippingAddress.phone,
        address12: subsList.shippingAddress.address1,
        address22: subsList.shippingAddress.address2,
        city2: subsList.shippingAddress.city,
        stateCode2: subsList.shippingAddress.stateCode,
        postalCode2: subsList.shippingAddress.postalCode,
        countryCode2: subsList.shippingAddress.countryCode
    };
    var cancelInfo = cancelationInfo;
    cancelInfo.siteID = siteID;
    var body = getOCAPIRequestBody({
        cancelationFee: cancelationFee,
        subsList: subListParam,
        note: note,
        cancelationInfo: cancelInfo,
        customerNo: currentCustomer.profile.customerNo
    });

    var createRequest = function (ocapiService) {
        ocapiService.addHeader("Content-Type", "application/json");
        ocapiService.addHeader("Authorization", "Bearer " + authToken);
        ocapiService.setRequestMethod("POST");

        return body;
    };

    var parseResponse = function (_service, args) {
        return args.text;
    };

    var filterLogMessage = function (msg) {
        return msg;
    };

    var serviceCallback = {
        createRequest: createRequest,
        parseResponse: parseResponse,
        filterLogMessage: filterLogMessage
    };

    if (authToken && !authToken.error) {
        var service = require("dw/svc/LocalServiceRegistry").createService("SOR_OCAPI_ChargeCancelationFee", serviceCallback);
        var response = service.call();
        return response;
    }
    return {
        error: true,
        message: authToken.message
    };
}

/**
 * @desscription Function is responsible for retriving a customer saved addresses from the profile
 * @function getCustomerAddresses
 * @param {dw.customer.Customer} customerObject SFCC custoemr object
 * @returns {Object[]} colection of saved customer addreses
 */
function getCustomerAddresses(customerObject) {
    var customerAddresses = [];
    for (var addressIndex in customerObject.profile.addressBook.addresses) {
        var address = customerObject.profile.addressBook.addresses[addressIndex];
        customerAddresses.push(
            {
                UUID: address.UUID,
                ID: address.ID,
                key: address.ID,
                firstName: address.firstName,
                lastName: address.lastName,
                address1: address.address1,
                address2: address.address2,
                postalCode: address.postalCode,
                city: address.city,
                stateCode: address.stateCode,
                countryCode: address.countryCode.value,
                phone: address.phone,
                type: "customer",
                displayValue: address.ID
            }
        );
    }
    return customerAddresses;
}

/**
 * @description Method is responsible for generating a new subscription based on the Storefront order
 * @function createSmartOrderRefillSubscription
 * @memberof RefillCustomer.prototype
 * @param {dw.order.Order} order SFCC initail order object
 * @returns {RefillSubscription} RefillSubscription object based on initail order
 */
RefillCustomer.prototype.createSmartOrderRefillSubscription = function (order, Customer) {    
	var subscriptionList = {};
    //var count = 1;

    var paymentMethod = PaymentMgr.getPaymentMethod(PaymentInstrument.METHOD_CREDIT_CARD);
    var paymentProcessorID = paymentMethod.getPaymentProcessor().getID();
	var order = order;
	
    /*if (!paymentIntegration[paymentProcessorID].checkInitialPaymentApproval(order)) {
        return false;
    }*/

    for (var shipmentsIndex in order.shipments) {
        var shipment = order.shipments[shipmentsIndex];
        var createdAt = new Date();
        var validUntil = new Calendar(createdAt);

        validUntil.add(Calendar.YEAR, 1);

        var lineItems = shipment.productLineItems.toArray();
        
        //added customozation to handle mutlple AD products in a single order.
        for (var lineItemsIndex in lineItems) {
            var lineItem = lineItems[lineItemsIndex];
            if (!empty(lineItem.custom.hasSmartOrderRefill) && lineItem.custom.hasSmartOrderRefill) {
                if (lineItem.custom.SorMonthInterval > 0 || lineItem.custom.SorWeekInterval > 0) {
                    if (!empty(lineItem.product) && lineItem.quantityValue > 0) {
                        
                        subscriptionList = {
                                ID: RefillSubscription.TYPE_SOR + "-" + (++lineItemsIndex) + "-" + order.orderNo,
                                originalOrder: order.orderNo,
                                type: RefillSubscription.TYPE_SOR,
                                renewal: this.preferences.SorAutomaticRenewalEnabled,
                                status: RefillSubscription.STATUS_NEW,
                                customerNo: this.customer.profile.customerNo,
                                createdAt: createdAt,
                                orderDay: createdAt.getDate(),
                                lastRefillDate: createdAt,
                                validUntil: validUntil.getTime(),
                                billingAddress: RefillAddress.getAddressFromLineItem(order.billingAddress),
                                shippingAddress: RefillAddress.getAddressFromLineItem(shipment.shippingAddress),
                                products: []
                            };

                            var paymentInstruments = order.paymentInstruments;
                            var cardExpirationDate = new Date(); // NOSONAR

                            for (var paymentInstrumentsIndex in paymentInstruments) {
                                var instrument = paymentInstruments[paymentInstrumentsIndex];
                                if (instrument.paymentMethod.equals(PaymentInstrument.METHOD_CREDIT_CARD)) {
                                    paymentProcessorID = PaymentMgr.getPaymentMethod(instrument.paymentMethod).paymentProcessor.ID;
                                    // save credit card expiration date
                                    var ccExpYear = instrument.creditCardExpirationYear;
                                    var ccExpMonth = instrument.creditCardExpirationMonth;	
                                    if (ccExpYear && ccExpMonth) {
                                        cardExpirationDate = new Date(ccExpYear, ccExpMonth - 1, 1);
                                        var lastDayOfMonth = new Calendar(cardExpirationDate);
                                        lastDayOfMonth.set(Calendar.DAY_OF_MONTH, lastDayOfMonth.getActualMaximum(Calendar.DAY_OF_MONTH));
                                        cardExpirationDate = lastDayOfMonth.getTime();
                                        subscriptionList.cardExpirationDate = cardExpirationDate;

                    					//saving card expiration date to customer level
                    					Customer.profile.custom.OsfSorCreditCardExpirationDate = cardExpirationDate;
                                    } else {
                                        // expiration date is not avaliable
                                        subscriptionList.cardExpirationDate = RefillSubscription.STATUS_PENDING;
                                    }	
                                    // save the payment token
                                    if (!empty(instrument.custom.braintreePaymentMethodToken)) {
                                        subscriptionList.creditCardToken = instrument.custom.braintreePaymentMethodToken;

                    					//save token to the customer profile
                    					Customer.profile.custom.OsfSorSubscriptionToken = instrument.custom.braintreePaymentMethodToken;
                                    } else {
                                        // token date is not avaliable
                                        subscriptionList.creditCardToken = RefillSubscription.STATUS_PENDING;
                                    }

                                    if (subscriptionList.cardExpirationDate === RefillSubscription.STATUS_PENDING || subscriptionList.creditCardToken === RefillSubscription.STATUS_PENDING) {
                                        var originalCCData = paymentIntegration[paymentProcessorID].getCreditCardInformation({
                                            paymentInstrument: instrument,
                                            customerNo: this.customer.profile.customerNo,
                                            paymentProcessorID: paymentProcessorID
                                        });
                                        if (!empty(originalCCData.expDate)) {
                                            subscriptionList.cardExpirationDate = originalCCData.expDate;
                                        }
                                        if (!empty(originalCCData.token)) {
                                            subscriptionList.creditCardToken = originalCCData.token;
                                        }
                                    }
                    			
                                }
                            }
                            
                            // create the product list with the refilled product
                            var orderDay = this.preferences.SorBillingDay;
                            var sorPriceBookID = null;

                            if (!empty(orderDay) && orderDay > 0) {
                                if (orderDay > 28) {
                                    orderDay = validUntil.getActualMaximum(Calendar.DAY_OF_MONTH);
                                }
                                subscriptionList.orderDay = orderDay;
                                validUntil.set(Calendar.DAY_OF_MONTH, orderDay);
                                subscriptionList.validUntil = validUntil.getTime();
                            }

                            if (this.preferences.SorPriceBook) {
                                sorPriceBookID = this.request.session.currency.currencyCode.toLowerCase() + "-" + this.preferences.SorPriceBook;
                            }

                            var subscriptionProduct = RefillProduct.getProductFromLineitem(sorPriceBookID, lineItem, subscriptionList.orderDay);
                            subscriptionList.products.push(subscriptionProduct);
                            
                            if (subscriptionList.products.length > 0) {
                                var subscription = new RefillSubscription(subscriptionList);
                                this.subscriptions[subscription.ID] = subscription;
                                subscription.createScheduledOrders(this.currentDate);
                                this.updateOrderList(subscription.orders);
                                var success = RefillStorage["SOR_STORAGE"].saveCustomerSubscription(this, subscription.ID);
                                if (success) {
                                    RefillStorage["SOR_STORAGE"].saveCustomerInformation(this);
                                }
                                //count++;
                            } else {
                                subscriptionList = {};
                            }
                    }
                }
            }
        }
        
    }

    return subscriptionList;
};

/**
 *  @description Checks for default credit cards and subscriptions about to expire and notifies the customer.
 *  Also if all subscriptions are expired, or the customer has no more scheduled orders the flag on his profile will be set to false
 *  and the customer will be removed from SOR_customers customers group.
 * @function manageSubscriptions
 * @memberof RefillCustomer.prototype
 */
RefillCustomer.prototype.manageSubscriptions = function () {
    SORLogger.info("SOR Job: start manageSubscriptions ***");
    var renewalCount = 0;
    var customerSubscriptions = this.subscriptions;
    // set global level currentDate
    if (!empty(customerSubscriptions)) {
        for (var customerSubscriptionsIndex in customerSubscriptions) {
            var customerSubscription = customerSubscriptions[customerSubscriptionsIndex];
            if (customerSubscription.status === RefillSubscription.STATUS_EXPIRED || customerSubscription.status === RefillSubscription.STATUS_CANCELED) {
                continue;
            }
            if (customerSubscription.status === RefillSubscription.STATUS_PAUSED) {
                var monthsToCancel = this.preferences.SorMonthsToCancelPaused || 12;
                var currentDate = this.currentDate;

                if (monthsToCancel <= 0 || monthsToCancel > 12) {
                    monthsToCancel = 12;
                }

                var dateToCancelCalendar = new Calendar(customerSubscription.createdAt);
                dateToCancelCalendar.add(Calendar.MONTH, monthsToCancel);
                var dateToCancel = dateToCancelCalendar.getTime();
                var diff = dateDiffInDays(currentDate, dateToCancel);

                if (diff <= 0) {
                    cancelSubscription(this, customerSubscription, false);
                }
                continue;
            }

            RefillCheckout.setLocaleAndCurrency(customerSubscription);
            if (customerSubscription.cardExpirationDate === RefillSubscription.STATUS_PENDING || customerSubscription.creditCardToken === RefillSubscription.STATUS_PENDING) {
                var originalOrder = OrderMgr.getOrder(customerSubscription.originalOrder);
                var paymentInstruments = originalOrder.getPaymentInstruments();
                var instrumentsIterator = paymentInstruments.iterator();

                while (instrumentsIterator.hasNext()) {
                    var paymentInstrument = instrumentsIterator.next();
                    var paymentProcessorID = PaymentMgr.getPaymentMethod(paymentInstrument.paymentMethod).paymentProcessor.ID;
                    var originalCCData = paymentIntegration[paymentProcessorID].getCreditCardInformation({
                        paymentInstrument: paymentInstrument,
                        customerNo: originalOrder.customer.profile.customerNo,
                        paymentProcessorID: paymentProcessorID
                    });
                    if (!empty(originalCCData.expDate)) {
                        customerSubscription.cardExpirationDate = originalCCData.expDate;
                    }
                    if (!empty(originalCCData.token)) {
                        customerSubscription.creditCardToken = originalCCData.token;
                    }
                }
                RefillStorage["SOR_STORAGE"].saveCustomerSubscription(this, customerSubscription.ID);
            }

            //var customerCCExpirationDate = customerSubscription.cardExpirationDate; //need to fetch token from customer profile
            var customerCCExpirationDate = this.customer.profile.custom.OsfSorCreditCardExpirationDate;
            var cardDiffArray = [2, 5, 10, 15];
            var creditCardDifference;

            if (customerCCExpirationDate === RefillSubscription.STATUS_PENDING) {
                creditCardDifference = RefillSubscription.STATUS_PENDING;
            } else {
                creditCardDifference = dateDiffInDays(this.currentDate, customerCCExpirationDate);
            }

            /*if (cardDiffArray.indexOf(creditCardDifference) !== -1) {
                RefillEmails.sendCreditCardExpirationWarning(this.customer, creditCardDifference);
            } else if (creditCardDifference === 0) {
                RefillEmails.sendCreditCardExpiration(this.customer);
            }*/

            var subscriptionDifference = dateDiffInDays(this.currentDate, customerSubscription.validUntil);

            if (subscriptionDifference <= 0) {
                subscriptionDifference = 0;
                if (customerSubscription.renewal) {
                    if (this.preferences.SorAutomaticRenewalEnabled) {
                        customerSubscription.changeStatus(RefillSubscription.STATUS_RENEW);
                        //customerSubscription.createdAt = this.currentDate;
                        customerSubscription.lastUpdate = this.currentDate;
                        var validUntil = new Calendar(this.currentDate);
                        validUntil.add(Calendar.YEAR, 1);
                        if (customerSubscription.orderDay) {
                            validUntil.set(Calendar.DAY_OF_MONTH, customerSubscription.orderDay);
                        }
                        customerSubscription.validUntil = validUntil.getTime();
                    } else {
                        customerSubscription.changeStatus(RefillSubscription.STATUS_EXPIRED);
                        customerSubscription.lastUpdate = this.currentDate;
                    }
                }
            }

            if (customerSubscription.renewal) {
                if (this.preferences.SorAutomaticRenewalEnabled) {
                    if (subscriptionDifference === 15 || subscriptionDifference === 3) {
                    	/* commenting since notification is not need
                    	RefillEmails.sendSubscriptionRenewalWarning(customerSubscription, this.customer, subscriptionDifference); */
                    } else if (subscriptionDifference === 0) {
                        //RefillEmails.sendSubscriptionRenewal(customerSubscription, this.customer);
                        if (customerSubscription.status === RefillSubscription.STATUS_RENEW) {
                            renewalCount++;
                        }
                    }
                } else if (subscriptionDifference === 15 || subscriptionDifference === 3) {
                	/* commenting since notification is not need
                	RefillEmails.sendSubscriptionExpirationWarning(customerSubscription, this.customer, subscriptionDifference); */
                } else if (subscriptionDifference === 0) {
                	/* commenting since notification is not need
                	RefillEmails.sendSubscriptionExpiration(customerSubscription, this.customer); */
                }
            } else if (!customerSubscription.renewal) {
                if (subscriptionDifference === 15 || subscriptionDifference === 3) {
                	/* commenting since notification is not need
                	RefillEmails.sendSubscriptionExpirationWarning(customerSubscription, this.customer, subscriptionDifference); */
                } else if (subscriptionDifference === 0) {
                	/* commenting since notification is not need
                	RefillEmails.sendSubscriptionExpiration(customerSubscription, this.customer); */
                }
            }

            if (this.preferences.SorChangeProductPrice) {
                var priceChanges = {
                    changed: false,
                    products: []
                };
                var sorPriceBookID = null;

                for (var productsIndex1 in customerSubscription.products) {
                    var product1 = customerSubscription.products[productsIndex1];
                    if (this.preferences.SorPriceBook) {
                        sorPriceBookID = product1.currencyCode.toLowerCase() + "-" + this.preferences.SorPriceBook;
                    }
                    var productPriceChanges = product1.priceChanges(sorPriceBookID);

                    if (productPriceChanges.changed) {
                        priceChanges.changed = true;
                        priceChanges.products.push(productPriceChanges);
                    }
                }

                if (priceChanges.changed) {
                    for (var productsIndex2 in priceChanges.products) {
                        var prod = priceChanges.products[productsIndex2];
                        customerSubscription.updateProductPrice(prod.ID, prod.newPrice, this.currentDate);
                    }
                    customerSubscription.changeStatus(RefillSubscription.STATUS_UPDATED);
                    customerSubscription.lastUpdate = this.currentDate;
                    this.updateOrderList(customerSubscription.orders);

                    if (RefillStorage["SOR_STORAGE"].saveCustomerSubscription(this, customerSubscription.ID)) {
                        RefillStorage["SOR_STORAGE"].saveCustomerInformation(this);
                        /* commenting since notification is not need
                        RefillEmails.sendSubscriptionPriceChange(customerSubscription, this.customer, priceChanges); */
                    }
                }
            }

            SORLogger.info("SOR Job: Renewal count: {0}", renewalCount);
            if (renewalCount > 0) {
                var customerSubscriptionOrders = customerSubscription.orders;
                for (var customerSubscriptionOrdersIndex in customerSubscriptionOrders) {
                    var customerSubscriptionOrder = customerSubscriptionOrders[customerSubscriptionOrdersIndex];
                    var orderdateDiff = dateDiffInDays(customerSubscriptionOrder.createdAt, this.currentDate);
                    if ((customerSubscriptionOrder.status === RefillOrder.STATUS_SCHEDULED || customerSubscriptionOrder.status === RefillOrder.STATUS_PROCESSING) && orderdateDiff >= 0) {
                        try {
                            this.processCustomerSorOrders();
                            if(customerSubscriptionOrder.status !== RefillOrder.STATUS_OUTOFSTOCK){
                                var customerCheckout = new RefillCheckout({
                                    customerRefillOrder: customerSubscriptionOrder,
                                    customer: this.customer,
                                    type: "system"
                                });
                                customerCheckout.placeOrder(this.currentDate);
                            }
                        } catch (e) {
                            SORLogger.error("Error in renewal order: {0}", e.toString());
                        }

                        if(customerSubscriptionOrder.status !== RefillOrder.STATUS_OUTOFSTOCK){
                            customerSubscriptionOrder.changeStatus(RefillOrder.STATUS_PROCESSED);
                            customerSubscriptionOrder.lastUpdate = this.currentDate;
                            customerSubscription.changeStatus(RefillOrder.STATUS_UPDATED);
                            customerSubscription.lastUpdate = this.currentDate;
                            customerSubscription.lastRefillDate = customerSubscription.createdAt;
                            for (var productsIndex in customerSubscription.products) {
                                var product = customerSubscription.products[productsIndex];
                                if (product.commitment) {
                                    product.commitmentDone += 1;
                                }
                            }
                        }
                        if (RefillStorage["SOR_STORAGE"].saveCustomerSubscription(this, customerSubscription.ID)) {
                            RefillStorage["SOR_STORAGE"].saveCustomerInformation(this);
                        }
                    }
                    if (customerSubscriptionOrder.status === RefillOrder.STATUS_PAUSED) {
                        customerSubscriptionOrder.changeStatus(RefillOrder.STATUS_CANCELED);
                        customerSubscriptionOrder.lastUpdate = this.currentDate;
                        /* commenting since notification is not need
                        RefillEmails.sendOrderInactiveMail(customerSubscriptionOrder, this.customer); */
                    }

                    if (customerSubscriptionOrder.status === RefillOrder.STATUS_OUTOFSTOCK) {
                        customerSubscriptionOrder.changeStatus(RefillOrder.STATUS_CANCELED);
                        customerSubscriptionOrder.lastUpdate = this.currentDate;
                        /* commenting since notification is not need
                        RefillEmails.sendOrderOutOfStockCancel(customerSubscriptionOrder, this.customer); */
                    }

                    if (customerSubscriptionOrder.status === RefillOrder.STATUS_CCEXPIRED) {
                        customerSubscriptionOrder.changeStatus(RefillOrder.STATUS_CANCELED);
                        customerSubscriptionOrder.lastUpdate = this.currentDate;
                        /* commenting since notification is not need
                        RefillEmails.sendCCExpiredMail(customerSubscriptionOrder, this.customer); */
                    }
                    if (RefillStorage["SOR_STORAGE"].saveCustomerSubscriptionOrder(this,customerSubscriptionOrder.ID)) {
                        RefillStorage["SOR_STORAGE"].saveCustomerInformation(this);
                    }
                }
                customerSubscription.changeStatus(RefillSubscription.STATUS_NEW);
                customerSubscription.clearActiveOrders();

                customerSubscription.createScheduledOrders(this.currentDate);
                this.updateOrderList(customerSubscription.orders);
                if (RefillStorage["SOR_STORAGE"].saveCustomerSubscription(this, customerSubscription.ID)) {
                    RefillStorage["SOR_STORAGE"].saveCustomerInformation(this);
                }
            } else if (subscriptionDifference === 0) {
                customerSubscription.changeStatus(RefillSubscription.STATUS_EXPIRED);
                if (RefillStorage["SOR_STORAGE"].saveCustomerSubscription(this, customerSubscription.ID)) {
                    RefillStorage["SOR_STORAGE"].saveCustomerInformation(this);
                }
            }
        }
    }
    SORLogger.info("SOR Job: end manageSubscriptions ***");
};

/**
 * Processes the customer subscriptions and place automatic orders
 * @function processCustomerSorOrders
 * @memberof RefillCustomer.prototype
 */
RefillCustomer.prototype.processCustomerSorOrders = function () {
    SORLogger.info("SOR Job: Inside processCustomerSorOrders **");
    var customerOrders = this.orders;
    for (var customerOrdersIndex in customerOrders) {
        var customerOrder = customerOrders[customerOrdersIndex];
        var customerSubscription = this.subscriptions[customerOrder.subscriptionID];
        var subscriptionExpDate = new Date(customerSubscription.validUntil);
        var subExp = dateDiffInDays(this.currentDate, subscriptionExpDate);
        if (
            customerOrder.status === RefillOrder.STATUS_SCHEDULED ||
            customerOrder.status === RefillOrder.STATUS_UPDATED ||
            customerOrder.status === RefillOrder.STATUS_OUTOFSTOCK ||
            customerOrder.status === RefillOrder.STATUS_CCEXPIRED
        ) {
            SORLogger.info("SOR Job: Current date: {0}", this.currentDate);
            var diff = dateDiffInDays(customerOrder.createdAt, this.currentDate);
            if (this.preferences.notificationBeforeOrderDays > 0 && !customerOrder.notified && diff === -this.preferences.notificationBeforeOrderDays && diff < 0) {
                //RefillEmails.sendOrderNotificationBeforePlace(customerOrder, this.customer, this.preferences.notificationBeforeOrderDays);
            	var klaviyoAutoDeliveryTxnlEnabled = dw.system.Site.getCurrent().getCustomPreferenceValue('klaviyo_autodelivery_transactional_enabled');
                if (klaviyoAutoDeliveryTxnlEnabled) {
                	dw.system.Logger.info('SOR Job: Send Notification: Subscription: {0} Email: {1} ', customerOrder.ID, this.customer.profile.email);
                	//require('app_storefront_core/cartridge/scripts/util/EmailUtils').sendOrderNotificationEmail(productList, 'Auto Delivery Order Notification');
                	RefillEmails.sendOrderNotificationBeforePlace(customerOrder, this.customer, this.preferences.notificationBeforeOrderDays);
                }
            	customerOrder.notified = true;
                customerOrder.updated = true;
            }

            SORLogger.info("SOR Job: Date difference: {0}", diff);
            if (diff < 0) continue;

            // Re-Scheduled Disabled
            if (!this.preferences.rescheduleOrderEnabled) {
                if (diff === 0) {
                    processOrderList(this, customerOrder, true);
                } else {
                	/* commenting since notification is not need
                	RefillEmails.sendOrderInactiveMail(customerOrder, this.customer); */
                    customerOrder.changeStatus(RefillOrder.STATUS_CANCELED);
                    customerOrder.lastUpdate = this.currentDate;
                }
            // Re-Scheduled Enabled
            } else if (diff < this.preferences.numberOfDelayDays) {
                processOrderList(this, customerOrder, false);

                if (diff === 0 && customerOrder.status === RefillOrder.STATUS_OUTOFSTOCK) {
                	/* commenting since notification is not need
                	RefillEmails.sendOrderOutOfStock(customerOrder, this.customer, this.preferences.numberOfDelayDays); */
                }
            } else if (customerOrder.status === RefillOrder.STATUS_OUTOFSTOCK) {
            	/* commenting since notification is not need
            	RefillEmails.sendOrderOutOfStockCancel(customerOrder, this.customer); */
                customerOrder.changeStatus(RefillOrder.STATUS_CANCELED);
                customerOrder.lastUpdate = this.currentDate;
            } else if (customerOrder.status === RefillOrder.STATUS_CCEXPIRED) {
            	/* commenting since notification is not need
            	RefillEmails.sendCCExpiredMail(customerOrder, this.customer); */
                customerOrder.changeStatus(RefillOrder.STATUS_CANCELED);
                customerOrder.lastUpdate = this.currentDate;
            } else {
            	/* commenting since notification is not need
            	RefillEmails.sendOrderInactiveMail(customerOrder, this.customer); */
                customerOrder.changeStatus(RefillOrder.STATUS_CANCELED);
                customerOrder.lastUpdate = this.currentDate;
            }
            if (customerOrder.status === RefillOrder.STATUS_CANCELED || customerOrder.status === RefillOrder.STATUS_OUTOFSTOCK) {
                if (customerSubscription.status === RefillSubscription.STATUS_EXPIRED) {
                    customerSubscription.changeStatus(RefillSubscription.STATUS_EXPIRED);
                } else {
                    customerSubscription.changeStatus(RefillSubscription.STATUS_UPDATED);
                }
                customerSubscription.lastUpdate = this.currentDate;
                customerSubscription.lastRefillDate = this.currentDate;
                var success1 = RefillStorage["SOR_STORAGE"].saveCustomerSubscription(this, customerSubscription.ID);
                if (success1) {
                    RefillStorage["SOR_STORAGE"].saveCustomerInformation(this);
                }
            }
        } else if (customerOrder.status === RefillOrder.STATUS_PAUSED) {
            var cancelOrder = false;

           if (this.preferences.SorCancelPausedInNextOrder) {
                var nextOrder = new Calendar(customerOrder.createdAt);
                if (customerOrder.periodicity === RefillProduct.PERIODICITY_WEEK) {
                    var daysInterval = 7 * customerOrder.interval;
                    nextOrder.add(Calendar.DAY_OF_MONTH, daysInterval);
                } else {
                    nextOrder.add(Calendar.MONTH, customerOrder.interval);
                    nextOrder.set(Calendar.DAY_OF_MONTH, customerOrder.orderDay);
                }
                cancelOrder = (this.currentDate >= nextOrder.getTime()); // NOSONAR
            }

            var pauseDiff = dateDiffInDays(customerOrder.createdAt, this.currentDate);
            if (this.preferences.rescheduleOrderEnabled) {
                cancelOrder = (pauseDiff >= this.preferences.numberOfDelayDays);
            } else {
                cancelOrder = (pauseDiff >= 0);
            }

            if (cancelOrder || subExp === 0) {
            	/* commenting since notification is not need
            	RefillEmails.sendOrderInactiveMail(customerOrder, this.customer); */
                customerOrder.changeStatus(RefillOrder.STATUS_CANCELED);
                customerOrder.lastUpdate = this.currentDate;
                if (cancelOrder) {
                    customerSubscription.changeStatus(RefillSubscription.STATUS_UPDATED);
                    customerSubscription.lastUpdate = this.currentDate;
                    customerSubscription.lastRefillDate = this.currentDate;
                    var success = RefillStorage["SOR_STORAGE"].saveCustomerSubscription(this, customerSubscription.ID);
                    if (success) {
                        RefillStorage["SOR_STORAGE"].saveCustomerInformation(this);
                    }
                }
            }
        }
    }
};

/**
 * @description This methode places customer subscription orders
 * @function  placeCustomerSorOrders
 * @memberof RefillCustomer.prototype
 */
RefillCustomer.prototype.placeCustomerSorOrders = function () {
    SORLogger.info("Start placeCustomerSorOrders ***");
    var customerOrders = this.orders;
    for (var customerOrdersIndex in customerOrders) {
        var customerOrder = customerOrders[customerOrdersIndex];
        var customerSubscription = this.subscriptions[customerOrder.subscriptionID];
        try {
            if (customerOrder.status !== RefillOrder.STATUS_PROCESSING) {
                continue;
            }
            var activeSubscriptionOrders = customerSubscription.getActiveOrders();
            if (customerOrder.ID === activeSubscriptionOrders[0].ID) {
                customerOrder.isLastOrder = true;
            } else {
                customerOrder.isLastOrder = false;
            }
            var customerCheckout = new RefillCheckout({
                customerRefillOrder: customerOrder,
                customer: this.customer,
                type: "system"
            });
            customerCheckout.placeOrder(this.currentDate);
            customerOrder.changeStatus(RefillOrder.STATUS_PROCESSED);
            customerOrder.lastUpdate = this.currentDate;
            if (customerSubscription.status === RefillSubscription.STATUS_EXPIRED) {
                customerSubscription.changeStatus(RefillSubscription.STATUS_EXPIRED);
            } else {
                customerSubscription.changeStatus(RefillSubscription.STATUS_UPDATED);
            }
            customerSubscription.lastUpdate = this.currentDate;
            customerSubscription.lastRefillDate = customerOrder.createdAt;
            if(customerSubscription.shippingAddress.countryCode && customerSubscription.shippingAddress.countryCode.value === ''){
            	customerSubscription.shippingAddress.countryCode.value = 'US';
            }
            for (var productsIndex in customerSubscription.products) {
                var product = customerSubscription.products[productsIndex];
                if (product.commitment) {
                    product.commitmentDone += 1;
                }
            }
        } catch (e) {
            customerOrder.changeStatus(RefillOrder.STATUS_SCHEDULED);
            SORLogger.error("Error: {0} Order {1} set status SCHEDULED", e.toString(), customerOrder.ID);
        } finally {
            var success = RefillStorage["SOR_STORAGE"].saveCustomerSubscription(this, customerSubscription.ID);
            if (success) {
                RefillStorage["SOR_STORAGE"].saveCustomerInformation(this);
            }
        }
    }
    SORLogger.info("End placeCustomerSorOrders ***");
};

/**
 * @description This methode initializes the lsit of customer subscriptions and subscriptions orders
 * @function initializeSubscriptions
 * @memberof RefillCustomer.prototype
 * @returns {RefillSubscription[]} colection of all RefillSubscription objects
 */
RefillCustomer.prototype.initializeSubscriptions = function () {
    var subscriptionsList = new ArrayList(RefillStorage["SOR_STORAGE"].getCustomerSubscriptions(this)).toArray();
    var subscriptionsObject = {};
    for (var subscriptionsListIndex in subscriptionsList) {
        var subscription = new RefillSubscription(subscriptionsList[subscriptionsListIndex]);
        var subscriptionOrderList = RefillStorage["SOR_STORAGE"].getCustomerSubscriptionOrders(this, subscription.ID);
        for (var subscriptionOrderListIndex in subscriptionOrderList) {
            var subscriptionOrder = new RefillOrder(subscriptionOrderList[subscriptionOrderListIndex]);
            if (!subscriptionOrder.hasBillingAddress) {
                subscriptionOrder.billingAddress = new RefillAddress(subscription.billingAddress);
                subscriptionOrder.billingAddress.type = RefillAddress.TYPE_BILLING;
            }
            if (!subscriptionOrder.hasShippingAddress) {
                subscriptionOrder.shippingAddress = new RefillAddress(subscription.shippingAddress);
                subscriptionOrder.shippingAddress.type = RefillAddress.TYPE_SHIPPING;
            }
            subscription.orders.push(subscriptionOrder);
            this.orders[subscriptionOrder.ID] = subscriptionOrder;
        }
        subscriptionsObject[subscription.ID] = subscription;
    }
    return subscriptionsObject;
};

/**
 * @description Retrives customers active subscriptions
 * @function getActiveSubscriptions
 * @memberof RefillCustomer.prototype
 * @returns {RefillSubscription[]} colection of active RefillSubscription objects
 */
RefillCustomer.prototype.getActiveSubscriptions = function () {
    var PropertyComparator = require("dw/util/PropertyComparator");
    var activeSubscriptions = new ArrayList();
    var comparator = new PropertyComparator("createdAt", false);

    for (var subscriptionIndex in this.subscriptions) {
        var subscription = this.subscriptions[subscriptionIndex];
        if (subscription.status !== RefillSubscription.STATUS_EXPIRED && subscription.status !== RefillSubscription.STATUS_CANCELED) {
            activeSubscriptions.push(subscription);
        }
    }
    activeSubscriptions.sort(comparator);
    return activeSubscriptions;
};

/**
 * @description Methods updates customer subscriptions and sends coresponding emails
 * @function updateCustomerSubscription
 * @memberof RefillCustomer.prototype
 * @param {dw.system.Request} requestObject SFCC request object
 * @param {dw.web.Forms} formsArg SFCC forms object
 * @param {Object} renderInfo object with additional infomation
 * @returns {Object} JSON response for controller
 */
RefillCustomer.prototype.updateCustomerSubscription = function (requestObject, formsArg, renderInfo) {
    var forms = formsArg;
    var params = requestObject.httpParameterMap;
    var action = params.action.stringValue;
    var createdAt = new Date();
    var validUntil = new Calendar(createdAt);
    var sorPriceBookID = null;
    var jsonResponse = {
        success: false,
        message: ""
    };
    var renewalStatus;
    var quantity;
    var context;
    var productID;
    var product;
    var periodicity;
    var interval;
    var customerSubscription = this.subscriptions[params.sid.stringValue];
    if (!empty(renderInfo[action]) && !empty(renderInfo[action].reloadUrl)) {
        jsonResponse.reloadUrl = renderInfo[action].reloadUrl;
    }
    if (!empty(renderInfo[action]) && !empty(renderInfo[action].template)) {
        jsonResponse.template = renderInfo[action].template;
    }
    var checkBeforeCancel = true;
    if (!empty(renderInfo[action]) && !empty(renderInfo[action].checkBeforeCancel) && renderInfo[action].checkBeforeCancel === false) {
        checkBeforeCancel = false;
    }
    if (!empty(customerSubscription)) {
        switch (action) {
            case RefillSubscription.STATUS_PAUSED:
                var checkPause;
                if (checkBeforeCancel) {
                    checkPause = checkForCommitmentBeforeCancel(this, "subscription", customerSubscription.ID);
                } else {
                    checkPause = {
                        status: true
                    };
                }

                if (checkPause.status) {
                    customerSubscription.changeStatus(RefillSubscription.STATUS_PAUSED);
                    var customerSubscriptionOrders = customerSubscription.getActiveOrders();
                    for (var customerSubscriptionOrdersIndex in customerSubscriptionOrders) {
                        var customerSubscriptionOrder = customerSubscriptionOrders[customerSubscriptionOrdersIndex];
                        customerSubscriptionOrder.changeStatus(RefillOrder.STATUS_DELETED);
                    }

                    jsonResponse.success = RefillStorage["SOR_STORAGE"].saveCustomerSubscription(this, customerSubscription.ID);
                    if (jsonResponse.success) {
                        //RefillEmails.sendSubscriptionPause(customerSubscription, this.customer, this.preferences);
                        RefillStorage["SOR_STORAGE"].saveCustomerInformation(this);
                    }
                } else {
                    jsonResponse.success = false;
                    jsonResponse.message = checkPause.message;
                }
                break;
            case "reactivateSave" :
                if (params.available.booleanValue) {
                    if (this.preferences.SorPriceBook) {
                        sorPriceBookID = request.session.currency.currencyCode.toLowerCase() + "-" + this.preferences.SorPriceBook;
                    }

                    if (params.priceChanged.booleanValue) {
                        for (var productsIndex1 in customerSubscription.products) {
                            var product1 = customerSubscription.products[productsIndex1];
                            if (this.preferences.SorChangeProductPrice) {
                                var productPriceChange1 = product1.priceChanges(sorPriceBookID);
                                if (productPriceChange1.changed) {
                                    product1.price = productPriceChange1.newPrice;
                                }
                            }
                        }
                    }

                    if (params.reactiveType.stringValue === "remaining") {
                        customerSubscription.changeStatus(RefillSubscription.STATUS_UPDATED);

                        var diff = dateDiffInDays(customerSubscription.lastUpdate, customerSubscription.lastRefillDate);
                        if (diff < 0) {
                            var lastRefill = new Date(customerSubscription.lastRefillDate);
                            var today = new Date();

                            lastRefill.setMonth(today.getMonth());
                            lastRefill.setFullYear(today.getFullYear());
                            customerSubscription.lastRefillDate = lastRefill;
                        }
                    } else {
                        validUntil.add(Calendar.YEAR, 1);

                        customerSubscription.changeStatus(RefillSubscription.STATUS_NEW);
                        customerSubscription.createdAt = createdAt;
                        customerSubscription.lastRefillDate = createdAt;
                        customerSubscription.validUntil = validUntil.getTime();
                    }

                    customerSubscription.createScheduledOrders(this.currentDate);
                    this.updateOrderList(customerSubscription.orders);

                    jsonResponse.success = RefillStorage["SOR_STORAGE"].saveCustomerSubscription(this, customerSubscription.ID);

                    if (jsonResponse.success) {
                    	/* commenting since notification is not need
                    	RefillEmails.sendSubscriptionReactivate(customerSubscription, this.customer); */
                        RefillStorage["SOR_STORAGE"].saveCustomerInformation(this);
                    }
                } else {
                    cancelSubscription(this, customerSubscription, false);
                    jsonResponse.success = true;
                }
                break;
            case "reactivate":
                var allProductsAvailable = true;
                var priceChanges = new Array();

                if (this.preferences.SorPriceBook) {
                    sorPriceBookID = request.session.currency.currencyCode.toLowerCase() + "-" + this.preferences.SorPriceBook;
                }

                for (var productsIndex in customerSubscription.products) {
                    var product2 = customerSubscription.products[productsIndex];
                    if (!product2.isAvailableForSmartOrderRefill()) {
                        allProductsAvailable = false;
                    }
                    if (this.preferences.SorChangeProductPrice) {
                        var productPriceChange = product2.priceChanges(sorPriceBookID);
                        if (productPriceChange.changed) {
                            priceChanges.push(productPriceChange);
                        }
                    }
                }

                validUntil.add(Calendar.YEAR, 1);
                var oneYear = validUntil.getTime();
                jsonResponse.success = true;
                jsonResponse.Available = allProductsAvailable;
                jsonResponse.RemainingDate = customerSubscription.validUntil;
                jsonResponse.OneYearDate = oneYear.toDateString();
                jsonResponse.PriceChanges = priceChanges;
                break;
            case RefillSubscription.STATUS_CANCELED:
                var checkCancel = checkForCommitmentBeforeCancel(this, "subscription", customerSubscription.ID);
                var sorCancelReason = params.sorCancellationReason? params.sorCancellationReason.value: '';
                if (checkCancel.status) {
                    if (cancelSubscription(this, customerSubscription, false, sorCancelReason)) {
                        jsonResponse.success = true;
                    } else {
                        jsonResponse.success = false;
                    }
                } else {
                    jsonResponse.success = false;
                    jsonResponse.message = checkCancel.message;
                    if (!empty(renderInfo[action]) && !empty(renderInfo[action].showChargeModal) && renderInfo[action].showChargeModal) {
                        jsonResponse.reloadUrl = URLUtils.https("SmartOrderRefillReport-CancelationFee", "client", this.customer.profile.customerNo, "sid", customerSubscription.ID).toString();
                    }
                }
                //Get subscribed Product lists
                var mParticleUtil = require('int_mParticle/cartridge/scripts/mParticleUtils.js');
                mParticleUtil.getCustomersActiveSubscriptions();
                break;
            case "updateRenewal":
                renewalStatus = false;
                if (!params.status.empty) {
                    renewalStatus = params.status.booleanValue;
                }
                customerSubscription.renewal = renewalStatus;
                customerSubscription.changeStatus(RefillOrder.STATUS_UPDATED);
                jsonResponse.success = RefillStorage["SOR_STORAGE"].saveCustomerSubscription(this, customerSubscription.ID);
                if (jsonResponse.success) {
                    RefillStorage["SOR_STORAGE"].saveCustomerInformation(this);
                }

                break;
            case "reactivateRenewal":
                renewalStatus = true;
                if (!params.status.empty) {
                    renewalStatus = params.status.booleanValue;
                }
                customerSubscription.renewal = renewalStatus;
                customerSubscription.changeStatus(RefillOrder.STATUS_UPDATED);
                jsonResponse.success = RefillStorage["SOR_STORAGE"].saveCustomerSubscription(this, customerSubscription.ID);
                if (jsonResponse.success) {
                    RefillStorage["SOR_STORAGE"].saveCustomerInformation(this);
                }

                break;
            case "updateQuantity":
                quantity = params.quantity.intValue;
                productID = params.item.stringValue;
                if (quantity && quantity > 0) {
                    customerSubscription.updateProductQuantity(productID, quantity);
                    customerSubscription.changeStatus(RefillOrder.STATUS_UPDATED);
                    jsonResponse.success = RefillStorage["SOR_STORAGE"].saveCustomerSubscription(this, customerSubscription.ID);
                    if (jsonResponse.success) {
                        RefillStorage["SOR_STORAGE"].saveCustomerInformation(this);
                    }
                } else {
                    jsonResponse.message = (quantity == null || quantity < 0) ? Resource.msg("validate.required", "forms", null) : Resource.msgf("validate.min", "forms", null, 1);
                    jsonResponse.success = false;
                }
                break;
            case "updateRefill":
            	var sorNextDate = params.sorNextDate.dateValue;
            	sorNextDate.setMonth(sorNextDate.getMonth() - params.interval.intValue);
            	//var intervalDays = (params.periodicity.stringValue === 'month') ? (params.interval.intValue * 31) : (params.interval.intValue * 7);
            	//var sorNewDate = new Date(sorNextDate.getTime() - (intervalDays * 24*60*60*1000));
            	//sorNextDate.setDate(sorNextDate.getDate() + intervalDays);
            	customerSubscription.createdAt = sorNextDate;
                customerSubscription.lastRefillDate = sorNextDate;
                customerSubscription.updateProductRefill(params.item.stringValue, params.interval.intValue, params.periodicity.stringValue, sorNextDate.getDate());
                customerSubscription.changeStatus(RefillSubscription.STATUS_UPDATED);
                customerSubscription.clearActiveOrders();
                
                customerSubscription.createScheduledOrders(this.currentDate); 
                this.updateOrderList(customerSubscription.orders);

                jsonResponse.success = RefillStorage["SOR_STORAGE"].saveCustomerSubscription(this, customerSubscription.ID);

                if (jsonResponse.success) {
                    RefillStorage["SOR_STORAGE"].saveCustomerInformation(this);
                }
                break;

            case "removeProduct":
                var checkRemove = checkForCommitmentBeforeCancel(this, "subscription", customerSubscription.ID, params.item.stringValue);
                if (checkRemove.status) {
                    jsonResponse.success = removeSubscriptionProduct(this, customerSubscription, params.item.stringValue);
                } else {
                    jsonResponse.success = false;
                    jsonResponse.message = checkRemove.message;
                    if (!empty(renderInfo[action]) && !empty(renderInfo[action].showChargeModal) && renderInfo[action].showChargeModal) {
                        jsonResponse.reloadUrl = URLUtils.https("SmartOrderRefillReport-CancelationFee", "sid", customerSubscription.ID, "client", this.customer.profile.customerNo, "item", params.item.stringValue).toString();
                        jsonResponse.commitment = true;
                    } else {
                        jsonResponse.commitment = false;
                    }
                }
                break;

            case "updateAddressSave":
                var addressType = params.addressType.stringValue + "Address";
                var newAddress = RefillAddress.getAddressFromForm(forms.changeaddress);
				
				if(!empty(newAddress)) {
					if(!empty(forms.changeaddress.selectedAddress) && !empty(forms.changeaddress.selectedAddress.value)){
						var selectedAddress = session.customer.addressBook.getAddress(forms.changeaddress.selectedAddress.value);
						newAddress =  RefillAddress.getSelectedAddress(selectedAddress);
					}
                	customerSubscription[addressType] = newAddress;
               		customerSubscription.changeStatus(RefillSubscription.STATUS_UPDATED);
                	var activeSubscriptionOrders = customerSubscription.getActiveOrders();
                	
                	for (var activeOrderIndex in activeSubscriptionOrders) {
                    	var activeOrder = activeSubscriptionOrders[activeOrderIndex];
                    	activeOrder[addressType] = newAddress;
                    	activeOrder["has" + addressType.charAt(0).toUpperCase() + addressType.slice(1)] = false;
                    	activeOrder.changeStatus(RefillOrder.STATUS_UPDATED);
                	}
                	
                	jsonResponse.success = RefillStorage["SOR_STORAGE"].saveCustomerSubscription(this, customerSubscription.ID);
                	if (jsonResponse.success) {
                    	//RefillEmails.sendAddressChangeEmail(params.addressType.stringValue, customerSubscription, this.customer);
                    	RefillStorage["SOR_STORAGE"].saveCustomerInformation(this);
                	}
				}
				
                break;
            case "updateAddress":
                var addressType2 = params.addressType.stringValue + "Address";
                var addressObj = customerSubscription[addressType2];
                RefillAddress.initChangeAddressForm(forms.changeaddress, addressObj);
                jsonResponse.success = true;
                jsonResponse.customerAddresses = getCustomerAddresses(this.customer);
                jsonResponse.prefAddress = this.customer.profile.addressBook ? this.customer.profile.addressBook.preferredAddress : '';
                jsonResponse.isSubscription = true;
                jsonResponse.listTypeParam = "sid";
                jsonResponse.listID = customerSubscription.ID;
                break;
            case "updateCreditCardSave" :
                if (!empty(forms.updatecard) && forms.updatecard.valid) {
                    var paymentMethod = PaymentMgr.getPaymentMethod(PaymentInstrument.METHOD_CREDIT_CARD);
                    var paymentProcessorID = paymentMethod.getPaymentProcessor().getID();
                    var cardToken = paymentIntegration[paymentProcessorID].updateCreditCardInformation({
                        creditCardForm: forms.updatecard,
                        customerSubscription: customerSubscription
                    });

                    if (cardToken) {
                        var newYear = parseInt(forms.updatecard.expiration.year.value, 10);
                        var newMonth = parseInt(forms.updatecard.expiration.month.htmlValue, 10) - 1;
                        var cardExpirationDate = new Date(newYear, newMonth, 1);
                        var lastDayOfMonth = new Calendar(cardExpirationDate);

                        lastDayOfMonth.set(Calendar.DAY_OF_MONTH, lastDayOfMonth.getActualMaximum(Calendar.DAY_OF_MONTH));
                        cardExpirationDate = lastDayOfMonth.getTime();

                        customerSubscription.cardExpirationDate = cardExpirationDate;
                        customerSubscription.creditCardToken = cardToken;
                        customerSubscription.changeStatus(RefillSubscription.STATUS_UPDATED);
                        customerSubscription.clearActiveOrders();

                        customerSubscription.createScheduledOrders(this.currentDate);
                        this.updateOrderList(customerSubscription.orders);

                        jsonResponse.success = RefillStorage["SOR_STORAGE"].saveCustomerSubscription(this, customerSubscription.ID);

                        if (jsonResponse.success) {
                            RefillStorage["SOR_STORAGE"].saveCustomerInformation(this);
                        }
                    }
                }
                break;
            case "updateCreditCard" :
                var currentCountry = getCurrentCountry(request.locale);
                var applicablePaymentCards = PaymentMgr.getPaymentMethod(PaymentInstrument.METHOD_CREDIT_CARD).getApplicablePaymentCards(this.customer, currentCountry.countryCode, 0);
                var canUpdateAll = false;
                var options;
                var expMonth;
                var expYear;
                var procesor;
                var expDate;

                var paymentMethod2 = PaymentMgr.getPaymentMethod(PaymentInstrument.METHOD_CREDIT_CARD);
                procesor = paymentMethod2.getPaymentProcessor().getID();

                var currentCreditCard = paymentIntegration[procesor].getCreditCardInformation({
                    customerSubscription: customerSubscription,
                    paymentProcessorID: procesor
                });

                if (procesor === PAYMENTPROCESSOR.CYBERSOURCE || procesor === PAYMENTPROCESSOR.BASIC || procesor === PAYMENTPROCESSOR.BRAINTREE) {
                    if (currentCreditCard && currentCreditCard.expMonth && currentCreditCard.expYear) {
                        expMonth = currentCreditCard.expMonth;
                        expYear = currentCreditCard.expYear;
                        canUpdateAll = true;
                    } else {
                        expDate = customerSubscription.cardExpirationDate;

                        expMonth = (expDate.getMonth() + 1).toString();
                        expYear = expDate.getFullYear().toString();
                    }
                    options = {};
                    options.card = {
                        number: currentCreditCard.number,
                        type: currentCreditCard.type,
                        expMonth: expMonth,
                        expYear: expYear
                    };
                    options.canUpdateAll = canUpdateAll;
                    options.procesor = procesor;
                } else if (procesor === PAYMENTPROCESSOR.ADYEN) {
                    var savedCreditCards = this.customer.profile.wallet.getPaymentInstruments(PaymentInstrument.METHOD_CREDIT_CARD);

                    options = {
                        procesor: procesor,
                        savedCreditCards: savedCreditCards
                    };
                }

                forms.updatecard.type.setOptions(applicablePaymentCards.iterator());
                forms.updatecard.clearFormElement();
                if (procesor === PAYMENTPROCESSOR.CYBERSOURCE || procesor === PAYMENTPROCESSOR.BASIC || procesor === PAYMENTPROCESSOR.BRAINTREE) {
                    forms.updatecard.type.value = (options.card.type === "MasterCard") ? "Master Card" : options.card.type; // NOSONAR
                    forms.updatecard.number.value = options.card.number;
                    forms.updatecard.expiration.year.value = parseInt(options.card.expYear, 10);
                    forms.updatecard.expiration.month.value = parseInt(options.card.expMonth, 10);
                }
                jsonResponse.success = true;
                jsonResponse.options = options;
                jsonResponse.options.PAYMENTPROCESSOR = PAYMENTPROCESSOR;
                break;
            case "view":
                var viewPaymentMethod = PaymentMgr.getPaymentMethod(PaymentInstrument.METHOD_CREDIT_CARD);
                var viewPaymentProcessorID = viewPaymentMethod.getPaymentProcessor().getID();
                var viewCurrentCreditCard = paymentIntegration[viewPaymentProcessorID].getCreditCardInformation({
                    customerSubscription: customerSubscription,
                    paymentProcessorID: viewPaymentProcessorID
                });

                var activeOrdersList;
                var originalOrder = OrderMgr.getOrder(customerSubscription.originalOrder);
                activeOrdersList = customerSubscription.getActiveOrders();
                var template = jsonResponse.template;
                jsonResponse = {
                    ordersList: activeOrdersList,
                    hasProcessor: (paymentIntegration[viewPaymentProcessorID]),
                    ProductList: customerSubscription,
                    isPaused: customerSubscription.status === RefillSubscription.STATUS_PAUSED,
                    isSubscription: true,
                    listTypeParam: "sid",
                    ShippingMethodName: dw.system.Site.getCurrent().getCustomPreferenceValue("osfShippingMethod"),
                    ShippingCost: 0,
                    currencyCode: (!empty(originalOrder) ? originalOrder.getAdjustedShippingTotalPrice().currencyCode : dw.system.Site.current.getDefaultCurrency() ),
                    currentCreditCard: viewCurrentCreditCard,
                    preferences: this.preferences,
                    PERIODICITY: {
                        MONTH: RefillProduct.PERIODICITY_MONTH,
                        WEEK: RefillProduct.PERIODICITY_WEEK
                    },
                    currentCustomer: this.customer
                };
                jsonResponse.template = template;

                break;
            case "cancelWithCommitment":
                var note = "Cancel Subscription (" + customerSubscription.ID + ")";
                var cancelationFee = forms.cancelationfee.fee.value;
                if (cancelationFee && cancelationFee > 0) {
                    var cancelationInfo1 = {
                        ID: customerSubscription.ID,
                        type: customerSubscription.refillType,
                        products: customerSubscription.products
                    };
                    var cancelationStatus1 = chargeCancelationFee(customerSubscription, cancelationFee, note, cancelationInfo1, this);
                    if (cancelationStatus1) {
                        jsonResponse.success = cancelSubscription(this, customerSubscription, true);
                    }
                } else {
                    jsonResponse.success = cancelSubscription(this, customerSubscription, false);
                }
                break;
            case "removeProductWithCommitment":
                var removeProductID = params.item.stringValue;
                var removeProductNote = "Remove product (" + removeProductID + ") from Subscription (" + customerSubscription.ID + ")";
                var removeProducCancelationFee = forms.cancelationfee.fee.value;
                if (removeProducCancelationFee && removeProducCancelationFee > 0) {
                    var cancelationInfo = {
                        ID: customerSubscription.ID,
                        type: "product",
                        products: []
                    };
                    var removeItem = customerSubscription.getProduct(removeProductID);
                    if (!empty(removeItem)) {
                        cancelationInfo.products.push(removeItem);
                    }
                    var cancelationStatus = chargeCancelationFee(customerSubscription, removeProducCancelationFee, removeProductNote, cancelationInfo, this);
                    if (cancelationStatus) {
                        jsonResponse.success = removeSubscriptionProduct(this, customerSubscription, removeProductID);
                    }
                } else {
                    jsonResponse.success = removeSubscriptionProduct(this, customerSubscription, removeProductID);
                }
                break;
            case "editProduct":
                var editProductID = params.item.stringValue;
                forms.editproduct.clearFormElement();
                context = this.editProduct(customerSubscription, editProductID);
                context.template = jsonResponse.template;
                context.isSubscription = true;
                context.listTypeParam = "sid";
                jsonResponse = context;
                break;
            case "editProductSave":
                if (
                    !params.opid.empty &&
                    !empty(forms.editproduct.variation.value) &&
                    !empty(forms.editproduct.quantity.value) &&
                    forms.editproduct.quantity.value > 0 &&
                    !empty(forms.editproduct.interval.value) &&
                    !empty(forms.editproduct.periodicity.value)
                ) {
                    var oldProductID = params.opid.stringValue;
                    var newProductID = forms.editproduct.variation.value;
                    var productQuantity = forms.editproduct.quantity.value;
                    var refillInterval = forms.editproduct.interval.value;
                    var refillPeriodicity = forms.editproduct.periodicity.value;
                    product = customerSubscription.getProduct(oldProductID);
                    if (!empty(product)) {
                        if (oldProductID !== newProductID) {
                            var currency = product.currencyCode;
                            var productObj = this.getOCAPIProduct(newProductID, currency);
                            var newPrice = productObj.price;
                            var newCurrency = currency;
                            product.ID = newProductID;
                            product.price = newPrice;
                            product.currencyCode = newCurrency;
                        }
                        product.quantity = productQuantity;
                        product.interval = refillInterval;
                        product.periodicity = refillPeriodicity;
                        customerSubscription.changeStatus(RefillSubscription.STATUS_UPDATED);
                        customerSubscription.clearActiveOrders();
                        customerSubscription.createScheduledOrders(this.currentDate);
                        this.updateOrderList(customerSubscription.orders);
                        var success = RefillStorage["SOR_STORAGE"].saveCustomerSubscription(this, customerSubscription.ID);
                        if (success) {
                            RefillStorage["SOR_STORAGE"].saveCustomerInformation(this);
                        }
                        jsonResponse.success = success;
                    }
                }
                break;
            case "addProductSave":
                if (
                    !empty(params.pid.stringValue) &&
                    !empty(params.interval.intValue) &&
                    params.quantity.intValue > 0 &&
                    !empty(params.periodicity.stringValue)
                ) {
                    productID = params.pid.stringValue;
                    periodicity = params.periodicity.stringValue;
                    interval = params.interval.intValue;
                    quantity = params.quantity.intValue;
                    product = ProductMgr.getProduct(productID);
                    if (empty(quantity)) {
                        quantity = 1;
                    }
                    sorPriceBookID = "";
                    if (this.preferences.SorPriceBook) {
                        sorPriceBookID = session.currency.currencyCode.toLowerCase() + "-" + this.preferences.SorPriceBook;
                    }
                    customerSubscription.addProduct(productID, periodicity, interval, sorPriceBookID, quantity);
                    customerSubscription.changeStatus(RefillOrder.STATUS_UPDATED);
                    customerSubscription.clearActiveOrders();
                    customerSubscription.createScheduledOrders(this.currentDate);
                    this.updateOrderList(customerSubscription.orders);
                    jsonResponse.success = RefillStorage["SOR_STORAGE"].saveCustomerSubscription(this, customerSubscription.ID);
                    if (jsonResponse.success) {
                        RefillStorage["SOR_STORAGE"].saveCustomerInformation(this);
                        /* commenting since notification is not need
                        RefillEmails.sendProductAddedEmail(productID, customerSubscription, this.customer); */
                    }
                }

                break;
            case "addProduct":
                forms.addproduct.clearFormElement();
                context = this.addProductDashboard(customerSubscription);
                context.template = jsonResponse.template;
                context.isSubscription = true;
                context.listTypeParam = "sid";
                context.isSubscription = true;
                context.listID = customerSubscription.ID;
                jsonResponse = context;
                break;
            case "addProductToBM":
                jsonResponse.success = true;
                jsonResponse.listTypeParam = "sid";
                jsonResponse.listID = customerSubscription.ID;
                jsonResponse.client = customerSubscription.customerNo;
                break;

            case "addProductToBMShow":
                forms.addproductToBM.clearFormElement();
                if (params.addProductType.stringValue === "addP") {
                    context = this.addProductWithCommitment(customerSubscription);
                } else {
                    context = this.addProduct(customerSubscription);
                }
                context.template = jsonResponse.template;
                context.isSubscription = true;
                context.listTypeParam = "sid";
                context.listID = customerSubscription.ID;
                jsonResponse = context;
                break;
            case "addProductToBMSave":
                if (
                    !empty(params.product.stringValue) &&
                    !empty(params.quantity.intValue) &&
                    params.quantity.intValue > 0 &&
                    !empty(params.interval.intValue) &&
                    !empty(params.periodicity.stringValue)
                ) {
                    productID = params.pid.stringValue;
                    periodicity = params.periodicity.stringValue;
                    interval = params.interval.intValue;
                    quantity = params.quantity.intValue;
                    var prodID = params.product.stringValue;
                    product = ProductMgr.getProduct(prodID);
                    var commitment = product.custom.SorCommitment;
                    if (empty(quantity)) {
                        quantity = 1;
                    }
                    sorPriceBookID = "";
                    if (this.preferences.SorPriceBook) {
                        sorPriceBookID = session.currency.currencyCode.toLowerCase() + "-" + this.preferences.SorPriceBook;
                    }
                    customerSubscription.addProd(productID, periodicity, interval, sorPriceBookID, quantity, commitment);
                    customerSubscription.changeStatus(RefillOrder.STATUS_UPDATED);
                    customerSubscription.clearActiveOrders();
                    customerSubscription.createScheduledOrders(this.currentDate);
                    this.updateOrderList(customerSubscription.orders);
                    jsonResponse.success = RefillStorage["SOR_STORAGE"].saveCustomerSubscription(this, customerSubscription.ID);
                    if (jsonResponse.success) {
                        RefillStorage["SOR_STORAGE"].saveCustomerInformation(this);
                        /* commenting since notification is not need
                        RefillEmails.sendProductAddedEmail(productID, customerSubscription, this.customer); */
                    }
                }
                break;
            default:
                // default case
                break;
        }
    }
    return jsonResponse;
};
    /**
 * @description Methode initializes the add product view
 * @param {RefillSubscription|RefillOrder} refillList refil list object
 * @returns {Object} object with add product view data
 */
RefillCustomer.prototype.addProductDashboard = function (refillList) {
    var view = null;
    var productSearchModel = new ProductSearchModel();
    var listProducts = new ArrayList();
    var listVariations = new ArrayList();
    var tempProducts;
    productSearchModel.setCategoryID("root");
    productSearchModel.setRecursiveCategorySearch(true);
    productSearchModel.search();
    var CustomerMgr = require("dw/customer/CustomerMgr");
    tempProducts = productSearchModel.productSearchHits;
    var customer = CustomerMgr.getCustomerByCustomerNumber(refillList.customerNo);
    while (tempProducts.hasNext()) {
        var prod = tempProducts.next().product;
        if (prod.custom.SorCustomerGroup && sorHelper.checkforExclusivelyGroup(customer, prod.custom.SorCustomerGroup)) {
            if (prod.custom.OsfSmartOrderRefill) {
                if (prod.isMaster() || prod.isVariant()) {
                    if (prod.isVariant()) {
                        prod = prod.getMasterProduct();
                    }

                    var variations = {};
                    if (prod.isVariant() || prod.isMaster()) {
                        var pvm = prod.variationModel;
                        for (var i = 0, len = pvm.variants.length; i < len; i++) {
                            var v = pvm.variants[i];
                            var variant = {
                                id: v.ID,
                                attributes: {}
                            };
                            // attributes
                            var attKey = [];
                            for (var a = 0, alen = pvm.productVariationAttributes.length; a < alen; a++) {
                                var att = pvm.productVariationAttributes[a];
                                var variationValue = pvm.getVariationValue(v, att);
                                if (!variationValue) { continue; }
                                attKey.push(att.ID + "-" + variationValue.value);
                                variant.attributes[att.ID] = !variationValue.displayValue ? variationValue.value : variationValue.displayValue;
                            }
                            variations[attKey.join("|")] = variant;
                        }
                    }

                    for (var variationsIndex in variations) {
                        var variation = variations[variationsIndex];
                        var tempVariation = {};

                        tempVariation.ID = prod.ID;
                        tempVariation.label = prod.name + "(";
                        tempVariation.value = variation.id;
                        var attributeNames = Object.keys(variation.attributes);

                        for (var attributeNamesIndex in attributeNames) {
                            var tempAtrributeName = attributeNames[attributeNamesIndex];
                            tempVariation.label += tempAtrributeName + " = " + variation.attributes[tempAtrributeName] + " ";
                        }
                        tempVariation.label += ")";
                        if (!prod.custom.SorCommitment) {
                            listVariations.add(tempVariation);
                        }
                    }
                    if (!prod.custom.SorCommitment) {
                        listProducts.add(prod);
                    }
                } else {
                    var tempBundle = {};
                    tempBundle.ID = prod.ID;
                    tempBundle.label = prod.name;
                    tempBundle.value = prod.ID;
                    if (!prod.custom.SorCommitment) {
                        listProducts.add(prod);
                        listVariations.add(tempBundle);
                    }
                }
            }
        }
    }
    var listPeriodicity = new ArrayList();
    var listIntervals = new ArrayList();
    var periodicity = new ArrayList();
    var weekIntervals = this.preferences.SorDeliveryWeekInterval;
    var monthIntervals = this.preferences.SorDeliveryMonthInterval;

    if (weekIntervals.length > 0) {
        periodicity.push(RefillProduct.PERIODICITY_WEEK);
    }
    if (monthIntervals.length > 0) {
        periodicity.push(RefillProduct.PERIODICITY_MONTH);
    }

    for (var periodicityIndex in periodicity) {
        var period = periodicity[periodicityIndex];
        var tempPeriodicity = {};
        tempPeriodicity.value = period;
        tempPeriodicity.label = period;
        listPeriodicity.add(tempPeriodicity);
    }

    for (var weekIntervalsIndex in weekIntervals) {
        var weekInterval = weekIntervals[weekIntervalsIndex];
        var tempWeekInterval = {};
        tempWeekInterval.value = weekInterval;
        tempWeekInterval.label = weekInterval;
        tempWeekInterval.periodicity = RefillProduct.PERIODICITY_WEEK;
        listIntervals.add(tempWeekInterval);
    }
    for (var monthIntervalsIndex in monthIntervals) {
        var monthInterval = monthIntervals[monthIntervalsIndex];
        var tempMonthInterval = {};
        tempMonthInterval.value = monthInterval;
        tempMonthInterval.label = monthInterval;
        tempMonthInterval.periodicity = RefillProduct.PERIODICITY_MONTH;
        listIntervals.add(tempMonthInterval);
    }

    view = {
        products: listProducts,
        periodicity: listPeriodicity,
        interval: listIntervals,
        variations: listVariations,
        listID: refillList.ID,
        client: refillList.customerNo
    };

    return view;
};
/**
 * @description Methode initializes the add product with commitment view
 * @param {RefillSubscription|RefillOrder} refillList refil list object
 * @returns {Object} object with add product with commitment view data
 */
RefillCustomer.prototype.addProductWithCommitment = function (refillList) {
    var view = null;
    var productSearchModel = new ProductSearchModel();
    var listProducts = new ArrayList();
    var listVariations = new ArrayList();
    var tempProducts;
    productSearchModel.setCategoryID("root");
    productSearchModel.setRecursiveCategorySearch(true);
    productSearchModel.search();
    tempProducts = productSearchModel.productSearchHits;
    var variationIds = [];
    var products = refillList.products;
    for (var productsIndex in products) {
        var p = products[productsIndex];
        variationIds.push(p.ID);
    }
    while (tempProducts.hasNext()) {
        var prod = tempProducts.next().product;

        if (prod.custom.OsfSmartOrderRefill) {
            if (prod.isMaster() || prod.isVariant()) {
                if (prod.isVariant()) {
                    prod = prod.getMasterProduct();
                }

                var variations = {};
                if (prod.isVariant() || prod.isMaster()) {
                    var pvm = prod.variationModel;
                    for (var i = 0, len = pvm.variants.length; i < len; i++) {
                        var v = pvm.variants[i];
                        var variant = {
                            id: v.ID,
                            attributes: {}
                        };
                        // attributes
                        var attKey = [];
                        for (var a = 0, alen = pvm.productVariationAttributes.length; a < alen; a++) {
                            var att = pvm.productVariationAttributes[a];
                            var variationValue = pvm.getVariationValue(v, att);
                            if (!variationValue) { continue; }
                            attKey.push(att.ID + "-" + variationValue.value);
                            variant.attributes[att.ID] = !variationValue.displayValue ? variationValue.value : variationValue.displayValue;
                        }
                        variations[attKey.join("|")] = variant;
                    }
                }
                for (var variationsIndex in variations) {
                    var variation = variations[variationsIndex];
                    if (variationIds.indexOf(variation.id) === -1) {
                        var tempVariation = {};

                        tempVariation.ID = prod.ID;
                        tempVariation.label = prod.name + "(";
                        tempVariation.value = variation.id;
                        // if (prod.custom.SorCommitment){
                        //     tempVariation.commitment =prod.custom.SorCommitment;
                        // }
                        var attributeNames = Object.keys(variation.attributes);

                        for (var attributeNamesIndex in attributeNames) {
                            var tempAtrributeName = attributeNames[attributeNamesIndex];
                            tempVariation.label += tempAtrributeName + " = " + variation.attributes[tempAtrributeName] + " ";
                        }
                        tempVariation.label += ")";
                        if (prod.custom.SorCommitment) {
                            listVariations.add(tempVariation);
                        }
                    }
                }
                if (prod.custom.SorCommitment) {
                    listProducts.add(prod);
                }
            } else {
                var tempBundle = {};
                tempBundle.ID = prod.ID;
                tempBundle.label = prod.name;
                tempBundle.value = prod.ID;
                if (prod.custom.SorCommitment) {
                    listProducts.add(prod);
                    listVariations.add(tempBundle);
                }
            }
        }
    }
    var listPeriodicity = new ArrayList();
    var listIntervals = new ArrayList();
    var periodicity = new ArrayList();
    var weekIntervals = this.preferences.SorDeliveryWeekInterval;
    var monthIntervals = this.preferences.SorDeliveryMonthInterval;

    if (weekIntervals.length > 0) {
        periodicity.push(RefillProduct.PERIODICITY_WEEK);
    }
    if (monthIntervals.length > 0) {
        periodicity.push(RefillProduct.PERIODICITY_MONTH);
    }

    for (var periodicityIndex in periodicity) {
        var period = periodicity[periodicityIndex];
        var tempPeriodicity = {};
        tempPeriodicity.value = period;
        tempPeriodicity.label = period;
        listPeriodicity.add(tempPeriodicity);
    }

    for (var weekIntervalsIndex in weekIntervals) {
        var weekInterval = weekIntervals[weekIntervalsIndex];
        var tempWeekInterval = {};
        tempWeekInterval.value = weekInterval;
        tempWeekInterval.label = weekInterval;
        tempWeekInterval.periodicity = RefillProduct.PERIODICITY_WEEK;
        listIntervals.add(tempWeekInterval);
    }
    for (var monthIntervalsIndex in monthIntervals) {
        var monthInterval = monthIntervals[monthIntervalsIndex];
        var tempMonthInterval = {};
        tempMonthInterval.value = monthInterval;
        tempMonthInterval.label = monthInterval;
        tempMonthInterval.periodicity = RefillProduct.PERIODICITY_MONTH;
        listIntervals.add(tempMonthInterval);
    }

    view = {
        products: listProducts,
        periodicity: listPeriodicity,
        interval: listIntervals,
        variations: listVariations,
        listID: refillList.ID,
        client: refillList.customerNo
        // commitment : tempVariation.commitment
    };

    return view;
};
/**
 * @description Methode initializes the add product view
 * @param {RefillSubscription|RefillOrder} refillList refil list object
 * @returns {Object} object with add product view data
 */
RefillCustomer.prototype.addProduct = function (refillList) {
    var view = null;
    var productSearchModel = new ProductSearchModel();
    var listProducts = new ArrayList();
    var listVariations = new ArrayList();
    var tempProducts;
    productSearchModel.setCategoryID("root");
    productSearchModel.setRecursiveCategorySearch(true);
    productSearchModel.search();
    tempProducts = productSearchModel.productSearchHits;
    while (tempProducts.hasNext()) {
        var prod = tempProducts.next().product;

        if (prod.custom.OsfSmartOrderRefill) {
            if (prod.isMaster() || prod.isVariant()) {
                if (prod.isVariant()) {
                    prod = prod.getMasterProduct();
                }

                var variations = {};
                if (prod.isVariant() || prod.isMaster()) {
                    var pvm = prod.variationModel;
                    for (var i = 0, len = pvm.variants.length; i < len; i++) {
                        var v = pvm.variants[i];
                        var variant = {
                            id: v.ID,
                            attributes: {}
                        };
                        // attributes
                        var attKey = [];
                        for (var a = 0, alen = pvm.productVariationAttributes.length; a < alen; a++) {
                            var att = pvm.productVariationAttributes[a];
                            var variationValue = pvm.getVariationValue(v, att);
                            if (!variationValue) { continue; }
                            attKey.push(att.ID + "-" + variationValue.value);
                            variant.attributes[att.ID] = !variationValue.displayValue ? variationValue.value : variationValue.displayValue;
                        }
                        variations[attKey.join("|")] = variant;
                    }
                }

                for (var variationsIndex in variations) {
                    var variation = variations[variationsIndex];
                    var tempVariation = {};

                    tempVariation.ID = prod.ID;
                    tempVariation.label = prod.name + "(";
                    tempVariation.value = variation.id;
                    var attributeNames = Object.keys(variation.attributes);

                    for (var attributeNamesIndex in attributeNames) {
                        var tempAtrributeName = attributeNames[attributeNamesIndex];
                        tempVariation.label += tempAtrributeName + " = " + variation.attributes[tempAtrributeName] + " ";
                    }
                    tempVariation.label += ")";
                    if (!prod.custom.SorCommitment) {
                        listVariations.add(tempVariation);
                    }
                }
                if (!prod.custom.SorCommitment) {
                    listProducts.add(prod);
                }
            } else {
                var tempBundle = {};
                tempBundle.ID = prod.ID;
                tempBundle.label = prod.name;
                tempBundle.value = prod.ID;
                if (!prod.custom.SorCommitment) {
                    listProducts.add(prod);
                    listVariations.add(tempBundle);
                }
            }
        }
    }
    var listPeriodicity = new ArrayList();
    var listIntervals = new ArrayList();
    var periodicity = new ArrayList();
    var weekIntervals = this.preferences.SorDeliveryWeekInterval;
    var monthIntervals = this.preferences.SorDeliveryMonthInterval;

    if (weekIntervals.length > 0) {
        periodicity.push(RefillProduct.PERIODICITY_WEEK);
    }
    if (monthIntervals.length > 0) {
        periodicity.push(RefillProduct.PERIODICITY_MONTH);
    }

    for (var periodicityIndex in periodicity) {
        var period = periodicity[periodicityIndex];
        var tempPeriodicity = {};
        tempPeriodicity.value = period;
        tempPeriodicity.label = period;
        listPeriodicity.add(tempPeriodicity);
    }

    for (var weekIntervalsIndex in weekIntervals) {
        var weekInterval = weekIntervals[weekIntervalsIndex];
        var tempWeekInterval = {};
        tempWeekInterval.value = weekInterval;
        tempWeekInterval.label = weekInterval;
        tempWeekInterval.periodicity = RefillProduct.PERIODICITY_WEEK;
        listIntervals.add(tempWeekInterval);
    }
    for (var monthIntervalsIndex in monthIntervals) {
        var monthInterval = monthIntervals[monthIntervalsIndex];
        var tempMonthInterval = {};
        tempMonthInterval.value = monthInterval;
        tempMonthInterval.label = monthInterval;
        tempMonthInterval.periodicity = RefillProduct.PERIODICITY_MONTH;
        listIntervals.add(tempMonthInterval);
    }

    view = {
        products: listProducts,
        periodicity: listPeriodicity,
        interval: listIntervals,
        variations: listVariations,
        listID: refillList.ID,
        client: refillList.customerNo
    };

    return view;
};
/**
 * @description Methode initializes the edit product view
 * @param {RefillSubscription|RefillOrder} refillList refil list object
 * @param {string} productID product id of prodcut to be edited
 * @returns {Object} object with edit product view data
 */
RefillCustomer.prototype.editProduct = function (refillList, productID) {
    var product = refillList.getProduct(productID);
    var view = null;
    if (!empty(product)) {
        var productSearchModel = new ProductSearchModel();
        var productObj = ProductMgr.getProduct(productID);
        var productObjID = productObj.ID;
        if (productObj.isVariant()) {
            productObjID = productObj.getMasterProduct().ID;
        }
        var listProducts = new ArrayList();
        var listVariations = new ArrayList();
        var selectedVariations = new ArrayList();
        var tempProducts;
        productSearchModel.setCategoryID("root");
        productSearchModel.setRecursiveCategorySearch(true);
        productSearchModel.search();
        tempProducts = productSearchModel.productSearchHits;


        var commitment = !!(product.commitment && product.commitment > product.commitmentDone);
        while (tempProducts.hasNext()) {
            var prod = tempProducts.next().product;

            if (prod.custom.OsfSmartOrderRefill) {
                if (prod.isMaster() || prod.isVariant()) {
                    if (prod.isVariant()) {
                        prod = prod.getMasterProduct();
                    }

                    var variations = {};
                    if (prod.isVariant() || prod.isMaster()) {
                        var pvm = prod.variationModel;
                        for (var i = 0, len = pvm.variants.length; i < len; i++) {
                            var v = pvm.variants[i];
                            var variant = {
                                id: v.ID,
                                attributes: {}
                            };
                            // attributes
                            var attKey = [];
                            for (var a = 0, alen = pvm.productVariationAttributes.length; a < alen; a++) {
                                var att = pvm.productVariationAttributes[a];
                                var variationValue = pvm.getVariationValue(v, att);
                                if (!variationValue) { continue; }
                                attKey.push(att.ID + "-" + variationValue.value);
                                variant.attributes[att.ID] = !variationValue.displayValue ? variationValue.value : variationValue.displayValue;
                            }
                            variations[attKey.join("|")] = variant;
                        }
                    }

                    for (var variationsIndex in variations) {
                        var variation = variations[variationsIndex];
                        var tempVariation = {};

                        tempVariation.ID = prod.ID;
                        tempVariation.label = prod.name + "(";
                        tempVariation.value = variation.id;
                        var attributeNames = Object.keys(variation.attributes);

                        for (var attributeNamesIndex in attributeNames) {
                            var tempAtrributeName = attributeNames[attributeNamesIndex];
                            tempVariation.label += tempAtrributeName + " = " + variation.attributes[tempAtrributeName] + " ";
                        }
                        tempVariation.label += ")";

                        if (!commitment && !prod.custom.SorCommitment) {
                            listVariations.add(tempVariation);
                        } else if (!productObj.isBundle()) {
                            if (tempVariation.ID === productObjID) {
                                listVariations.add(tempVariation);
                            }
                        }
                    }
                    if (!prod.custom.SorCommitment) {
                        listProducts.add(prod);
                    }
                } else {
                    var tempBundle = {};
                    tempBundle.ID = prod.ID;
                    tempBundle.label = prod.name;
                    tempBundle.value = prod.ID;
                    if ((!commitment && !prod.custom.SorCommitment) || (commitment && productObj.ID === prod.ID)) {
                        listVariations.add(tempBundle);
                    }
                    if (!prod.custom.SorCommitment) {
                        listProducts.add(prod);
                    }
                }
            }
        }

        if (productObj.isVariant()) {
            var attr = productObj.variationModel.getProductVariationAttributes();
            for (var attrIndex in attr) {
                var va = attr[attrIndex];
                selectedVariations.push(va.displayName + "=" + productObj.variationModel.getSelectedValue(va).displayValue);
            }
        }

        var listPeriodicity = new ArrayList();
        var listIntervals = new ArrayList();
        var periodicity = new ArrayList();
        var weekIntervals = this.preferences.SorDeliveryWeekInterval;
        var monthIntervals = this.preferences.SorDeliveryMonthInterval;
        var selectedPeriodicity = product.periodicity;
        var selectedInterval = product.interval;
        var selectedProductName = productObj.name;
        var selectedProductID;

        if (productObj.isMaster() || productObj.isVariant()) {
            selectedProductID = productObj.getMasterProduct().ID;
        } else {
            selectedProductID = productObj.ID;
        }

        if (weekIntervals.length > 0) {
            periodicity.push(RefillProduct.PERIODICITY_WEEK);
        }
        if (monthIntervals.length > 0) {
            periodicity.push(RefillProduct.PERIODICITY_MONTH);
        }

        for (var periodicityIndex in periodicity) {
            var period = periodicity[periodicityIndex];
            var tempPeriodicity = {};
            tempPeriodicity.value = period;
            tempPeriodicity.label = period;
            listPeriodicity.add(tempPeriodicity);
        }

        for (var weekIntervalsIndex in weekIntervals) {
            var weekInterval = weekIntervals[weekIntervalsIndex];
            var tempWeekInterval = {};
            tempWeekInterval.value = weekInterval;
            tempWeekInterval.label = weekInterval;
            tempWeekInterval.periodicity = RefillProduct.PERIODICITY_WEEK;
            listIntervals.add(tempWeekInterval);
        }
        for (var monthIntervalsIndex in monthIntervals) {
            var monthInterval = monthIntervals[monthIntervalsIndex];
            var tempMonthInterval = {};
            tempMonthInterval.value = monthInterval;
            tempMonthInterval.label = monthInterval;
            tempMonthInterval.periodicity = RefillProduct.PERIODICITY_MONTH;
            listIntervals.add(tempMonthInterval);
        }

        view = {
            selectedPeriodicity: selectedPeriodicity,
            selectedInterval: selectedInterval,
            selectedVariations: selectedVariations,
            selectedProductName: selectedProductName,
            selectedProductID: selectedProductID,
            originalProductID: productObj.ID,
            commitment: commitment,
            products: listProducts,
            periodicity: listPeriodicity,
            interval: listIntervals,
            variations: listVariations,
            listID: refillList.ID,
            quantity: product.quantity
        };
    }
    return view;
};

/**
 * @description Methods updates customer order and sends coresponding emails
 * @function updateCustomerOrder
 * @memberof RefillCustomer.prototype
 * @param {dw.system.Request} requestObject SFCC request object
 * @param {dw.web.Forms} forms SFCC forms object
 * @param {Object} renderInfo object with additional infomation
 * @returns {Object} JSON response for controller
 */
RefillCustomer.prototype.updateCustomerOrder = function (requestObject, forms, renderInfo) {
    var params = requestObject.httpParameterMap;
    var action = params.action.stringValue;
    var jsonResponse = {
        success: false,
        message: ""
    };
    var context;
    var customerOrder = this.orders[params.oid.stringValue];
    if (!empty(renderInfo[action]) && !empty(renderInfo[action].reloadUrl)) {
        jsonResponse.reloadUrl = renderInfo[action].reloadUrl;
    }
    if (!empty(renderInfo[action]) && !empty(renderInfo[action].template)) {
        jsonResponse.template = renderInfo[action].template;
    }

    if (!empty(customerOrder)) {
        switch (action) {
            case "updateQuantity":
                var quantity = params.quantity.intValue;
                var productID = params.item.stringValue;

                if (quantity && quantity > 0) {
                    var updateProduct = customerOrder.getProduct(productID);
                    updateProduct.quantity = quantity;
                    customerOrder.changeStatus(RefillOrder.STATUS_UPDATED);
                    jsonResponse.success = RefillStorage["SOR_STORAGE"].saveCustomerSubscriptionOrder(this, customerOrder.ID);
                } else {
                    jsonResponse.message = (quantity == null || quantity < 0) ? Resource.msg("validate.required", "forms", null) : Resource.msgf("validate.min", "forms", null, 1);
                    jsonResponse.success = false;
                }
                break;
            case "removeProduct":
                var sendEmail = false;
                if (customerOrder.products.length === 1) {
                    customerOrder.changeStatus(RefillOrder.STATUS_CANCELED);
                    sendEmail = true;
                } else {
                    customerOrder.removeProduct(params.item.stringValue);
                    customerOrder.changeStatus(RefillOrder.STATUS_UPDATED);
                }
                jsonResponse.success = RefillStorage["SOR_STORAGE"].saveCustomerSubscriptionOrder(this, customerOrder.ID);
                if (jsonResponse.success && sendEmail) {
                	/* commenting since notification is not need
                	RefillEmails.sendOrderCancel(customerOrder, this.customer); */
                }
                break;
            case RefillOrder.STATUS_CANCELED:
                var subscription = this.subscriptions[customerOrder.subscriptionID];
                var activeSubscriptionOrders = subscription.getActiveOrders();
                var lastOrder = activeSubscriptionOrders.length <= 1;
                var checkCancel = checkForCommitmentBeforeCancel(this, "order", customerOrder.ID);
                if (checkCancel.status) {
                    if (!lastOrder) {
                        customerOrder.changeStatus(RefillOrder.STATUS_CANCELED);
                        if (RefillStorage["SOR_STORAGE"].saveCustomerSubscriptionOrder(this, customerOrder.ID)) {
                            jsonResponse.success = true;
                            /* commenting since notification is not need
                            RefillEmails.sendOrderCancel(customerOrder, this.customer); */
                        }
                    } else {
                        jsonResponse.success = false;
                        //jsonResponse.message = Resource.msg("smartorderrefill.lastordercheck", "smartorderrefill", null);
                    }
                } else {
                    jsonResponse.success = false;
                    //jsonResponse.message = checkCancel.message;
                    /*if (!empty(renderInfo[action]) && !empty(renderInfo[action].showChargeModal) && renderInfo[action].showChargeModal) {
                        jsonResponse.reloadUrl = URLUtils.https("SmartOrderRefillReport-CancelationFee", "client", this.customer.profile.customerNo, "oid", customerOrder.ID).toString();
                    }*/
                }
                break;
            case RefillOrder.STATUS_PAUSED:
                var checkPause = checkForCommitmentBeforeCancel(this, "order", customerOrder.ID);
                if (checkPause.status) {
                    customerOrder.changeStatus(RefillOrder.STATUS_PAUSED);
                    if (RefillStorage["SOR_STORAGE"].saveCustomerSubscriptionOrder(this, customerOrder.ID)) {
                        jsonResponse.success = true;
                        /* commenting since notification is not need
                        RefillEmails.sendOrderPause(customerOrder, this.customer); */
                    }
                } else {
                    jsonResponse.success = false;
                    jsonResponse.message = checkPause.message;
                }
                break;
            case "reactivate":
                customerOrder.changeStatus(RefillOrder.STATUS_SCHEDULED);
                if (RefillStorage["SOR_STORAGE"].saveCustomerSubscriptionOrder(this, customerOrder.ID)) {
                    jsonResponse.success = true;
                    /* commenting since notification is not need
                    RefillEmails.sendOrderReactivate(customerOrder, this.customer); */
                }
                break;
            case "updateAddressSave":
                var addressType = params.addressType.stringValue + "Address";
                var newAddress = RefillAddress.getAddressFromForm(forms.changeaddress);
                customerOrder[addressType] = newAddress;
                customerOrder["has" + addressType.charAt(0).toUpperCase() + addressType.slice(1)] = true;
                customerOrder.changeStatus(RefillOrder.STATUS_UPDATED);
                if (RefillStorage["SOR_STORAGE"].saveCustomerSubscriptionOrder(this, customerOrder.ID)) {
                    jsonResponse.success = true;
                    /* commenting since notification is not need
                    RefillEmails.sendAddressChangeEmail(params.addressType.stringValue, customerOrder, this.customer); */
                }
                break;
            case "updateAddress":
                var addressType2 = params.addressType.stringValue + "Address";
                var addressObj = customerOrder[addressType2];
                RefillAddress.initChangeAddressForm(forms.changeaddress, addressObj);
                jsonResponse.success = true;
                jsonResponse.customerAddresses = getCustomerAddresses(this.customer);
                jsonResponse.isSubscription = false;
                jsonResponse.listTypeParam = "oid";
                jsonResponse.listID = customerOrder.ID;
                break;
            case "view":
                var originalOrder = OrderMgr.getOrder(customerOrder.originalOrder);
                var template = jsonResponse.template;
                jsonResponse = {
                    ProductList: customerOrder,
                    isPaused: customerOrder.status === RefillOrder.STATUS_PAUSED,
                    isSubscription: false,
                    listTypeParam: "oid",
                    ShippingMethodName: dw.system.Site.getCurrent().getCustomPreferenceValue("osfShippingMethod"),
                    ShippingCost: 0,
                    currencyCode: (!empty(originalOrder) ? originalOrder.getAdjustedShippingTotalPrice().currencyCode : dw.system.Site.current.getDefaultCurrency()),
                    preferences: this.preferences,
                    PERIODICITY: {
                        MONTH: RefillProduct.PERIODICITY_MONTH,
                        WEEK: RefillProduct.PERIODICITY_WEEK
                    },
                    currentCustomer: this.customer
                };
                jsonResponse.template = template;
                break;
            case "cancelWithCommitment":
                var customerSubscription = this.subscriptions[customerOrder.subscriptionID];
                var note = "Cancel Order (" + customerOrder.ID + ")";
                var cancelationFee = forms.cancelationfee.fee.value;
                if (cancelationFee && cancelationFee > 0) {
                    var cancelationInfo = {
                        ID: customerOrder.ID,
                        type: customerOrder.refillType,
                        products: customerOrder.products
                    };
                    var cancelationStatus = chargeCancelationFee(customerSubscription, cancelationFee, note, cancelationInfo, this);
                    if (cancelationStatus) {
                        customerOrder.changeStatus(RefillOrder.STATUS_CANCELED);
                        jsonResponse.success = RefillStorage["SOR_STORAGE"].saveCustomerSubscriptionOrder(this, customerOrder.ID);
                    }
                } else {
                    customerOrder.changeStatus(RefillOrder.STATUS_CANCELED);
                    if (RefillStorage["SOR_STORAGE"].saveCustomerSubscriptionOrder(this, customerOrder.ID)) {
                        jsonResponse.success = true;
                        /* commenting since notification is not need
                        RefillEmails.sendOrderCancel(customerOrder, this.customer); */
                    }
                }
                break;
            case "editProduct":
                forms.editproduct.clearFormElement();
                context = this.editProduct(customerOrder, params.item.stringValue);
                context.template = jsonResponse.template;
                context.isSubscription = true;
                context.listTypeParam = "oid";
                context.isSubscription = false;
                jsonResponse = context;
                break;
            case "editProductSave":
                if (
                    !params.opid.empty &&
                    !empty(forms.editproduct.variation.value) &&
                    !empty(forms.editproduct.quantity.value) &&
                    forms.editproduct.quantity.value > 0
                ) {
                    var oldProductID = params.opid.stringValue;
                    var newProductID = forms.editproduct.variation.value;
                    var productQuantity = forms.editproduct.quantity.value;
                    var product = customerOrder.getProduct(oldProductID);
                    if (!empty(product)) {
                        if (oldProductID !== newProductID) {
                            var currency = product.currencyCode;
                            var productObj = this.getOCAPIProduct(newProductID, currency);
                            var newPrice = productObj.price;
                            var newCurrency = currency;
                            product.ID = newProductID;
                            product.price = newPrice;
                            product.currencyCode = newCurrency;
                        }
                        product.quantity = productQuantity;
                        customerOrder.changeStatus(RefillSubscription.STATUS_UPDATED);
                        var success = RefillStorage["SOR_STORAGE"].saveCustomerSubscriptionOrder(this, customerOrder.ID);
                        if (success) {
                            RefillStorage["SOR_STORAGE"].saveCustomerInformation(this);
                        }
                        jsonResponse.success = success;
                    }
                }
                break;
            default:
                // default case
                break;
        }
    }
    return jsonResponse;
};

/**
 * @description Methods updates customer order list
 * @function updateOrderList
 * @memberof RefillCustomer.prototype
 * @param {RefillOrder[]} orders collection RefillOrder objects
 */
RefillCustomer.prototype.updateOrderList = function (orders) {
    for (var ordersIndex in orders) {
        var order = orders[ordersIndex];
        order.updated = true;
        this.orders[order.ID] = order;
    }
};

/**
 * Cancel all subscription based on order number.
 */
RefillCustomer.prototype.cancelAllSubscription = function (orderNo){
	var subscriptionList = this.getActiveSubscriptions();
	for ( var subscription in subscriptionList) {
		if(subscriptionList[subscription].originalOrder === orderNo){
			cancelSubscription(this, subscriptionList[subscription], true, 'NA');
		}
	}
};


/**
* Create customer subscriptions in SOR_V2 from migrated SOR_V1 data
*@param {customer} SFCC customer object
*@param {i} -counter variable
*@param {line} - raw of data from CSVReader  
**/
RefillCustomer.prototype.createMigratedSubscriptions =  function (customer, i, line) {
	
	var subscriptionList = {};
	
	var dt = new Date();
    var dtTime  = dt.getTime();
	
	var originalOrder = line[8] ? line[8] :(customer.profile.customerNo) +'-'+ dtTime.toString();
	
	SORLogger.info("originalOrder {0}", originalOrder);
	var subscriptionID = 'SOR-' + originalOrder;
	
	try {
		var formattedDate = line[5];
		formattedDate = formattedDate.replace(/-/g, '/');
		var createdAt = new Date(formattedDate);
		createdAt.setMonth(createdAt.getMonth() - parseInt(line[4]));
		
		var validUntil = new Calendar(createdAt);
		validUntil.add(Calendar.YEAR, 1);
		
		var orderDay = createdAt.getDate();
	}catch(e){}
	
	var billingAddress  = JSON.parse(line[6]);
	var shippingAddress = JSON.parse(line[7]);
	
	var product =  ProductMgr.getProduct(line[2]);
	var productList = [];
	if(product) {
		var priceModel = product.getPriceModel();
		var productPrice = priceModel.getPrice();
		var productObject = {
	        ID: line[2],
	        price: productPrice.value,
	        currencyCode: productPrice.currencyCode,
	        quantity: line[3],
	        periodicity: "month",
	        interval: line[4],
	        orderDay: orderDay
	    };
		productList.push(productObject);
	}
	
	
	originalOrder
	subscriptionList = {
	    ID: subscriptionID,
	    originalOrder: originalOrder,
	    type: 'SOR',
	    renewal: Site.getCurrent().getCustomPreferenceValue('SorAutomaticRenewalEnabled'),
	    status: 'new',
	    customerNo: line[0],
	    createdAt: createdAt,
	    orderDay: orderDay,
	    lastRefillDate: createdAt,
	    validUntil: validUntil.getTime(),
	    billingAddress: RefillAddress.getAddressFromLineItem(billingAddress),
	    shippingAddress: RefillAddress.getAddressFromLineItem(shippingAddress),
	    products: productList,
		cardExpirationDate: customer.profile.custom.OsfSorCreditCardExpirationDate ? customer.profile.custom.OsfSorCreditCardExpirationDate : '',
		creditCardToken: customer.profile.custom.OsfSorSubscriptionToken ? customer.profile.custom.OsfSorSubscriptionToken : ''
	};
	
	var subscription = new RefillSubscription(subscriptionList);
	SORLogger.info("subscription.ID {0}", subscription.ID);
	this.subscriptions[subscription.ID] = subscription;
	subscription.createScheduledOrders(new Date());
	this.updateOrderList(subscription.orders);
	var success = RefillStorage["SOR_STORAGE"].saveCustomerSubscription(this, subscription.ID);
	
	SORLogger.info("success {0}", success);
	if (success) {
	    RefillStorage["SOR_STORAGE"].saveCustomerInformation(this);
	}
	
}

/**
 * @description function to update old sku with new sku
 * @param customer
 * @param oldSku
 * @param newSku
 */
RefillCustomer.prototype.updateSKU =  function (oldSku, newSku) {
    SORLogger.info("SOR Job: start updateSKU ***");
    var renewalCount = 0;
    var customerSubscriptions = this.subscriptions;
    // set global level currentDate
    if (!empty(customerSubscriptions)) {
        for (var customerSubscriptionsIndex in customerSubscriptions) {
            var customerSubscription = customerSubscriptions[customerSubscriptionsIndex];
            if (customerSubscription.status === RefillSubscription.STATUS_EXPIRED || customerSubscription.status === RefillSubscription.STATUS_CANCELED) {
                continue;
            }

            for (var productsIndex in customerSubscription.products) {
                var product = customerSubscription.products[productsIndex];
                SORLogger.info("SOR updateSKU Job - Subscriptions----: "+product.ID);
                if (product.ID === oldSku) {
                    product.ID = newSku;
                }
            }
            if (RefillStorage["SOR_STORAGE"].saveCustomerSubscription(this, customerSubscription.ID)) {
                RefillStorage["SOR_STORAGE"].saveCustomerInformation(this);
            }

        }
    }

    var customerOrders = this.orders;
    if (!empty(customerOrders)) {
        for (var customerOrdersIndex in customerOrders) {
            var customerOrder = customerOrders[customerOrdersIndex];
            if (customerOrder.status === RefillOrder.STATUS_CANCELED || customerOrder.status === RefillOrder.STATUS_CCEXPIRED || customerOrder.status === RefillOrder.STATUS_PROCESSED) {
                continue;
            }
            for (var productsIndex in customerOrder.products) {
                var product = customerOrder.products[productsIndex];
                SORLogger.info("SOR updateSKU Job - Orders----: "+product.ID);
                if (product.ID === oldSku) {
                    product.ID = newSku;
                }
            }

            if (RefillStorage["SOR_STORAGE"].saveCustomerSubscriptionOrder(this,customerOrder.ID)) {
                RefillStorage["SOR_STORAGE"].saveCustomerInformation(this);
            }
        }
    }
}

module.exports = RefillCustomer;