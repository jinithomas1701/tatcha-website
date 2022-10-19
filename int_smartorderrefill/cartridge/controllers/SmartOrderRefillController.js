/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
"use strict";
/**
 *  Property of OSF Global Services, Inc., (with its brand OSF Commerce). OSF remains the sole owner of all right, title and interest in the software.
 *  Do not copy, sell, reverse engineer or otherwise attempt to derive or obtain information about the functioning, manufacture or operation therein.
 */
/* global session, request, customer, empty, response */
/**
 * Controller handling smart order refill.
 * @module controllers/SmartOrderRefillController
 */

/* API Imports */
var Transaction = require("dw/system/Transaction");
var URLUtils = require("dw/web/URLUtils");
var CustomerMgr = require("dw/customer/CustomerMgr");
var Site = require("dw/system/Site");
var ISML = require("dw/template/ISML");


/* Script Modules */
var sorHelper = require("*/cartridge/scripts/smartOrderRefill/refillHelper.js");
var RefillOptionsModel = require("*/cartridge/models/smartOrderRefill/refillOptions.js");
var RefillCustomerModel = require("*/cartridge/models/smartOrderRefill/refillCustomer.js");

/* Global Variables */
var sorEnabled = Site.current.getCustomPreferenceValue("SorEnabled");
var params = request.httpParameterMap;
var forms = session.forms;
var jsonResponse = {
    success: false,
    message: ""
};

// HELPER FUNCTIONS

/**
 * @description ustomer login shim for SFCC
 * @param {string} username custoemr username
 * @param {string} password custoemr password
 * @param {boolean} rememberMe stay loged in
 * @returns {boolean} success status
 */
function logInCustomer(username, password, rememberMe) {
    var tempCustomer = CustomerMgr.getCustomerByLogin(username);
    var logedInCustomer = null;
    if (tempCustomer == null || (tempCustomer !== null && tempCustomer.profile !== null && tempCustomer.profile.credentials.locked)) { // NOSONAR
        return false;
    }
    Transaction.wrap(function () {
        logedInCustomer = CustomerMgr.loginCustomer(CustomerMgr.authenticateCustomer(username, password), rememberMe);
    });
    if (logedInCustomer == null || (logedInCustomer !== null && logedInCustomer.profile !== null && logedInCustomer.profile.credentials.locked)) {
        return false;
    }
    return true;
}

/**
 * This function renders a object as a json response
 * @param {Object} object object
 */
function renderJSON(object) {
    ISML.renderTemplate("smartOrderRefill/util/json", {
        jsonObject: object
    });
}

/**
 * Displays Manage Smart Order Refill page
 */
module.exports.Manage = function () {
    if (!customer.profile) {
        session.custom.TargetLocation = URLUtils.url("SmartOrderRefillController-Manage").toString();
        response.redirect(URLUtils.url("Login-Show"));
        return;
    }
    if (sorHelper.verifyLicense() && sorEnabled) {
    	 // Getting SOR resources, preferences and urls
        var resources = sorHelper.getResources();
        var preferences = sorHelper.getPreferences();
        var urls = sorHelper.getUrls();
        var refillCustomer = new RefillCustomerModel({
            customer: CustomerMgr.getCustomerByLogin(customer.profile.email)
        });
        ISML.renderTemplate("smartOrderRefill/dashboard/manageDetails", {
            refillCustomer: refillCustomer,
            resources: resources,
            urls: urls,
            preferences: preferences
        });
    } else {
        response.redirect(URLUtils.url("Account-Show"));
    }
};
module.exports.Manage.public = true;

/**
 * Root handles all interactions on Manage page
 */
module.exports.ManageRefillList = function () {
    var refillCustomer = new RefillCustomerModel({
        customer: CustomerMgr.getCustomerByLogin(customer.profile.email)
    });
    var renderInfo = {};
    var result = null;
	var action = params.action.stringValue;
    
    if (!params.oid.empty) {
        renderInfo.view = {
            template: "smartOrderRefill/dashboard/refillListView/listView"
        };
        renderInfo.updateAddress = {
            template: "smartOrderRefill/dashboard/changeAddress"
        };
        result = refillCustomer.updateCustomerOrder(request, forms, renderInfo);
        if (!empty(result.template)) {
            ISML.renderTemplate(result.template, result);
        } else {
            renderJSON(result);
        }
    }

    if (!params.sid.empty) {
        renderInfo.reactivate = {
            template: "smartOrderRefill/dashboard/reactivateSubscription"
        };
        renderInfo.view = {
            template: "smartOrderRefill/dashboard/refillListView/listView"
        };
        renderInfo.updateAddress = {
            template: "smartOrderRefill/dashboard/changeAddress"
        };
        renderInfo.updateCreditCard = {
            template: "smartOrderRefill/dashboard/updateCard"
        };
        renderInfo.addProduct = {
            template: "smartOrderRefill/dashboard/addProduct"
        };
        result = refillCustomer.updateCustomerSubscription(request, forms, renderInfo);
        if (!empty(result.template)) {
            ISML.renderTemplate(result.template, result);
        } else {
             if(action === 'updateAddressSave') {
        		response.redirect(URLUtils.https('SmartOrderRefillController-Manage'));
        	} else {
        		renderJSON(result);
        	}
            
        }
    }
};
module.exports.ManageRefillList.public = true;

/**
 * Updates refill information on product line item
 */
module.exports.UpdateCartProductRefillInformation = function () {
    var lineItemID = params.liuuid.stringValue;
    var hasRefill = params.hasSmartOrderRefill.booleanValue;
    var intervalType = params.everyDelivery.stringValue;
	var refillOptions = new RefillOptionsModel({
        productID: params.pid.stringValue,
        lineItemID: params.liuuid.stringValue
    });
    var intervalValue = (intervalType === refillOptions.PERIODICITY.WEEK ? params.SorDeliveryWeekInterval.intValue : params.SorDeliveryMonthInterval.intValue);
    Transaction.wrap(function () {
        if (!params.action.empty) {
            jsonResponse.success = true;
            if (params.action.stringValue === "modify") {
                var productLineItem = refillOptions.productLineItem;
                forms.smartorderrefill.clearFormElement();

                if (!empty(productLineItem)) {
                    forms.smartorderrefill.copyFrom(productLineItem);
                }
                ISML.renderTemplate("smartOrderRefill/components/cart/modifyOrderRefill", {
                    RefillOptions: refillOptions,
                    lineItemID: lineItemID
                });
            } else if (params.action.stringValue === "update") {
            	if(params.isForm.stringValue === "true"){
            		hasRefill = forms.smartorderrefill.hasSmartOrderRefill.value;
            		intervalValue = forms.smartorderrefill.SorMonthInterval.value;
            		intervalType = refillOptions.PERIODICITY.MONTH;
            		refillOptions.update(intervalType, intervalValue, hasRefill);
            		response.redirect(URLUtils.url('Cart-Show'));
            	}else{
            	renderJSON(jsonResponse);
            	}
               
            } else if (params.action.stringValue === "remove") {
                refillOptions.remove();
                //renderJSON(jsonResponse);
                response.redirect(URLUtils.url('Cart-Show'));
            }
        } else if (hasRefill) {
            refillOptions.add(intervalType, intervalValue);
            
        }
        sorHelper.checkForRefillProducts();
    });
};
module.exports.UpdateCartProductRefillInformation.public = true;

/**
 * Displays the refill option form on pdp
 */
module.exports.PDPRefillOptions = function () {
    if (sorHelper.verifyLicense() && sorEnabled) {
        var refillOptions = new RefillOptionsModel({
            productID: params.pid.stringValue
        });
        var exclusiveGroup = sorHelper.checkforExclusivelyGroup(customer, refillOptions.sorCG);
        if (exclusiveGroup) { 
            var productPrice = refillOptions.product.priceModel.getPrice().value;
            /*
            * Displays Promotional price (autoDeliveryPrice) 
            */   
            var autoDeliveryPrice = productPrice ? productPrice - (productPrice/10) : null;
            ISML.renderTemplate("smartOrderRefill/components/product/productRefillOptions", {
                orderable: refillOptions.product.availabilityModel.orderable,
                RefillOptions: refillOptions,
                AutoDeliveryPrice:autoDeliveryPrice
            });
        }
    }
};
module.exports.PDPRefillOptions.public = true;

/**
 * Check for refill product
 */
module.exports.CheckProductRefill = function () {
    var resp = {
        success: false
    };
    if (customer.authenticated) {
        var intervalType = params.everyDelivery.stringValue;
        var intervalValue = (intervalType === "week" ? params.SorDeliveryWeekInterval.intValue : params.SorDeliveryMonthInterval.intValue);
        var productID = params.pid.stringValue;
        var quantity = params.quantity.intValue;


        var refillCustomer = new RefillCustomerModel({
            customer: CustomerMgr.getCustomerByLogin(customer.profile.email)
        });
        var useSubscription = false;
        var subscriptionIDs = [];
        if (quantity !== null) {
            if (refillCustomer.subscriptions) {
                for (var subscriptionsIndex in refillCustomer.subscriptions) {
                    var subscription = refillCustomer.subscriptions[subscriptionsIndex];
                    if (subscription.status === "updated" || subscription.status === "new") {
                        for (var productIndex in subscription.products) {
                            var product = subscription.products[productIndex];
                            if (product.ID !== productID) {
                                if (parseInt(product.interval, 10) === parseInt(intervalValue, 10) && product.periodicity === intervalType) {
                                    useSubscription = true;
                                    if (subscriptionIDs.indexOf(subscription.ID) === -1) {
                                        subscriptionIDs.push(subscription.ID);
                                    }
                                }
                            } else {
                                useSubscription = false;
                                break;
                            }
                        }
                    }
                }
                if (useSubscription) {
                    if (!empty(subscriptionIDs)) {
                        resp.subscriptionIDs = subscriptionIDs;
                    }
                    resp.success = true;
                    resp.interval = intervalValue;
                    resp.periodicity = intervalType;
                    resp.quantity = quantity;
                }
            }
        }
    }
    renderJSON(resp);
};
module.exports.CheckProductRefill.public = true;

module.exports.AddProductPDP = function () {
    var pid = params.pid.stringValue;
    var quantity = params.quantity.intValue;
    var interval = parseInt(params.interval, 10);
    var periodicity = params.periodicity.value;
    var subIDs = params["subIDs[]"].values;
    var refillCustomer = new RefillCustomerModel({
        customer: CustomerMgr.getCustomerByLogin(customer.profile.email)
    });
    var subList = [];
    if (refillCustomer.subscriptions) {
        for (var index in subIDs) {
            for (var subscriptionsIndex in refillCustomer.subscriptions) {
                if (subIDs[index] === subscriptionsIndex) {
                    subList.push(refillCustomer.subscriptions[subscriptionsIndex]);
                }
            }
        }
    }
    ISML.renderTemplate("smartOrderRefill/components/product/subscriptions", {
        subscriptionsList: subList,
        interval: interval,
        periodicity: periodicity,
        quantity: quantity,
        pid: pid
    });
};
module.exports.AddProductPDP.public = true;
/**
 * Removes refill information from ProductLineItem
 */
module.exports.RefillInfoCart = function () {
    var lineItemID = params.lineItemID.stringValue;
    var refillOptions = new RefillOptionsModel({
        lineItemID: lineItemID
    });
    ISML.renderTemplate("smartOrderRefill/components/cart/showRefillInfo", {
        showLinks: params.showLinks.booleanValue,
        RefillOptions: refillOptions,
        lineItemID: lineItemID
    });
};
module.exports.RefillInfoCart.public = true;

/**
 * Displays and handles the login register form for cart modal
 */
module.exports.RequireLogin = function () {
    if (request.httpMethod === "GET") {
        forms.sorlogin.clearFormElement();
        ISML.renderTemplate("smartOrderRefill/components/account/login");
    } else if (!empty(request.triggeredForm) && request.triggeredForm.valid && request.triggeredForm.triggeredAction.triggered) {
        if (request.triggeredForm.register.triggered) {
            session.custom.TargetLocation = URLUtils.url("Cart-Show").toString();
            jsonResponse.url = URLUtils.url("Account-StartRegister").toString();
            jsonResponse.success = true;
        } else {
            jsonResponse.url = URLUtils.url("Cart-Show").toString();
            jsonResponse.success = logInCustomer(forms.sorlogin.username.value, forms.sorlogin.password.value, forms.sorlogin.rememberme.value);
        }
        renderJSON(jsonResponse);
    }
};
module.exports.RequireLogin.public = true;

/**
* Function that outputs resources, preferences, urls to sor_footer template
*/
module.exports.Footer = function () {
    // Getting SOR resources, preferences and urls
    var resources = sorHelper.getResources();
    var preferences = sorHelper.getPreferences();
    var urls = sorHelper.getUrls();

    ISML.renderTemplate("smartOrderRefill/components/footer", {
        resources: resources,
        urls: urls,
        preferences: preferences
    });
};
module.exports.Footer.public = true;

/**
 * Display SOR link in account page if SOR is enabled
 */
module.exports.SORMenuLink = function () {
    var enabled = sorHelper.verifyLicense() && sorEnabled;
    ISML.renderTemplate("smartOrderRefill/components/account/menuLink", {
        enabled: enabled,
        showCard: params.showcard.booleanValue
    });
};
module.exports.SORMenuLink.public = true;


/**
 * Switch Subscription Payment card
 * Change OSF Auto Delivery Payment Card
 */

module.exports.SwitchCard = function (){
	var paymentInstruments = customer.getProfile().getWallet().getPaymentInstruments(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);
	var selectedId = params.cardId.stringValue;
	var instrument;
	
	for(var key in paymentInstruments) {
		var card = paymentInstruments[key];
		if(card.UUID == selectedId) {
			instrument = card;
			break;
		}
	}
	
	var expirationDate = new Date(instrument.getCreditCardExpirationYear(), instrument.getCreditCardExpirationMonth()-1, 1);
    var lastDayOfMonth = new dw.util.Calendar(expirationDate);
    lastDayOfMonth.set(dw.util.Calendar.DAY_OF_MONTH, lastDayOfMonth.getActualMaximum(dw.util.Calendar.DAY_OF_MONTH));
    expirationDate = lastDayOfMonth.getTime();
    
    Transaction.wrap(function() {
    	customer.profile.custom.OsfSorCreditCardExpirationDate = expirationDate;
    	customer.profile.custom.OsfSorSubscriptionToken = instrument.creditCardToken;
    });    
	
	response.redirect(URLUtils.url('SmartOrderRefillController-Manage'));
}
module.exports.SwitchCard.public = true;