'use strict';

/**
 * Controller that manages the order history of a registered user.
 *
 * @module controllers/Order
 */

/* API Includes */
var ContentMgr = require('dw/content/ContentMgr');
var OrderMgr = require('dw/order/OrderMgr');
var PagingModel = require('dw/web/PagingModel');
var RateLimiter = require('app_storefront_core/cartridge/scripts/util/RateLimiter');

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var URLUtils = require('dw/web/URLUtils');
var securityHeader = require('~/cartridge/scripts/util/SecurityHeaders');


/**
 * Renders a page with the order history of the current logged in customer.
 *
 * Creates a PagingModel for the orders with information from the httpParameterMap.
 * Invalidates and clears the orders.orderlist form. Updates the page metadata. Sets the
 * ContinueURL property to Order-Orders and renders the order history page (account/orderhistory/orders template).
 */
function history() {
	try {
		var orderHistory : dw.customer.OrderHistory = customer.getOrderHistory();
        var orders = orderHistory.getOrders("status!={0} AND status!={1} AND status!={2}", "creationDate DESC",
         dw.order.Order.ORDER_STATUS_REPLACED, dw.order.Order.ORDER_STATUS_FAILED,dw.order.Order.ORDER_STATUS_CREATED);
	} catch(e) {
		var LOGGER = dw.system.Logger.getLogger('order');
		LOGGER.warn('Error while fetching order history for the customer - '+ e.toString());
	}
	

    var parameterMap = request.httpParameterMap;
    var type = parameterMap.type ? parameterMap.type.stringValue : '';
    var pageSize = parameterMap.sz.intValue || 10;
    var start = parameterMap.start.intValue || 0;
    var orderPagingModel = new PagingModel(orders, orders.count);
    
    if(type === 'ajax') {
    	var pageStart = parameterMap.pageStart.intValue;
    	orderPagingModel.setPageSize(10);
        orderPagingModel.setStart(pageStart);
    } else {
    	orderPagingModel.setPageSize(pageSize);
        orderPagingModel.setStart(start);
    }

    var orderListForm = app.getForm('orders.orderlist');
    orderListForm.invalidate();
    orderListForm.clear();
    orderListForm.copyFrom(orderPagingModel.pageElements);

    var pageMeta = require('~/cartridge/scripts/meta');
    pageMeta.update(ContentMgr.getContent('myaccount'));
    var template = 'account/orderhistory/orders';
    if(type === 'ajax') {
    	template = 'account/orderhistory/orderslist';
    }
    orders.close();
    securityHeader.setSecurityHeaders();
    app.getView({
        OrderPagingModel: orderPagingModel,
        ContinueURL: dw.web.URLUtils.https('Order-Orders')
    }).render(template);
}

/**
 * Renders a page with the reorder items of the current logged in customer.
 *
 */
function reorder() {
	
	try {
		var orderHistory : dw.customer.OrderHistory = customer.getOrderHistory();
        var orders = orderHistory.getOrders("status!={0} AND status!={1}", "creationDate DESC",
         dw.order.Order.ORDER_STATUS_REPLACED, dw.order.Order.ORDER_STATUS_FAILED);

	} catch(e) {
		var LOGGER = dw.system.Logger.getLogger('order');
		LOGGER.warn('Error while fetching order history for the customer - '+ e.toString());
	}
    
    var parameterMap = request.httpParameterMap;
    var pageSize = 10;
    var type = parameterMap.type.stringValue || '';
    var currentPage = parameterMap.currentPage.intValue || 1;
    
    
    
    //Get the products for the order
    var reorderList = new dw.util.ArrayList();
    var paginationList = new dw.util.ArrayList(); 
    var samples = new dw.util.ArrayList();
    var products = '';
    
	var giftWrapSKU = require('dw/system/Site').getCurrent().getCustomPreferenceValue('GiftWrapId');
	var egiftProduct = require('dw/system/Site').getCurrent().getCustomPreferenceValue('EgiftProduct-ID');
	var giftBuilderSKU = require('dw/system/Site').getCurrent().getCustomPreferenceValue('giftBuilderSKU');	    
	var StringUtils = require('dw/util/StringUtils');
	var monthNames = ["January", "February", "March", "April", "May", "June","July", "August", "September", "October", "November", "December"];
	
    // Set the product ID
    while (orders.hasNext()) {
    	var orderObj = orders.next() ;
    	products = orderObj.getAllProductLineItems();
    	var cal : Calendar  = new dw.util.Calendar(orderObj.getCreationDate());
    	cal.setTimeZone('PST');
    	var dayAndYear : String = StringUtils.formatCalendar(cal, " dd, yyyy");
    	var month = StringUtils.formatCalendar(cal, "M");
    	var fullmonth = monthNames[(month-1)];
    	var orderedDate = fullmonth+dayAndYear;
    	
    	//Filter samples and add to paginationList
    	for (var i=0 ; i< products.length; i++) {
    		
    		//Skip 
    		if(products[i].productID ==giftWrapSKU || products[i].productID ==egiftProduct || products[i].productID ==giftBuilderSKU ){
    			continue;
    		}
    		
    		if((products[i].productID.indexOf('-PK') !== -1) || (products[i].productID.indexOf('-POD') !== -1)) { 
    			samples.push(products[i].productID);
    		} else {    			
    			paginationList.push({"productID":products[i].productID,"orderedDate" :orderedDate });
    		}

    	}
    	
    	//Add filtered samples to paginationList
    	for (var i=0 ; i< samples.length; i++) {
    		//paginationList.push(samples[i]);
    		paginationList.push({"productID":samples[i],"orderedDate" :orderedDate });
    	}
    	samples.clear();
    	
    }     
    
    var totalProducts = paginationList.length;
    var numOfPages = Math.ceil(totalProducts/pageSize);
    var hasNextPage = false;
    
    if(currentPage < numOfPages) {
    	hasNextPage = true;
    } else {
    	hasNextPage = false;
    }    
    var index = (currentPage-1) * pageSize;

    for (var i=index,j=1 ; i< totalProducts; i++,j++) { 
    	try {    		
    	    var product = app.getModel('Product').get(paginationList[i].productID).object;
    	    
    	    var showDate = false; 
    	    
    	    if((i == 0) || (paginationList[i].orderedDate != paginationList[i-1].orderedDate)){    	    	
    	    	showDate = true;
        	}
    	    
    	    var reorderItem = {
    	    		product:product, 
    	    		showDate:showDate,
    	    		dateOrdered:paginationList[i].orderedDate
    	    };
    	    reorderList.push(reorderItem);
    	    if(j == pageSize || j > pageSize ) break;    		
    	} catch(err){}
    }
    

    var pageMeta = require('~/cartridge/scripts/meta');
    pageMeta.update(ContentMgr.getContent('myaccount'));
    
    var template = 'account/reorder/reorder';
    if(type=='ajax'){
    	template = 'account/reorder/reorder_ajax';
    }

	orders.close();
    securityHeader.setSecurityHeaders();
    app.getView({
    	TotalProducts: totalProducts,
    	ReorderList: reorderList,
    	HasNextPage: hasNextPage,
    	CurrentPage: (currentPage + 1)
    }).render(template);
}


/**
 * Gets an OrderView and renders the order detail page (account/orderhistory/orderdetails template). If there is an error,
 * redirects to the {@link module:controllers/Order~history|history} function.
 */
function orders() {
    var orderListForm = app.getForm('orders.orderlist');
    var pageMeta = require('~/cartridge/scripts/meta');
    pageMeta.update(ContentMgr.getContent('myaccount'));
    orderListForm.handleAction({
        show: function (formGroup, action) {
            var Order = action.object;
            securityHeader.setSecurityHeaders();
            app.getView({Order: Order}).render('account/orderhistory/orderdetails');
        },
        error: function () {
        	securityHeader.setSecurityHeaders();
            response.redirect(dw.web.URLUtils.https('Order-History'));
        }
    });

}


/**
 * Renders a page with details of a single order. This function
 * renders the order details by the UUID of the order, therefore it can also be used
 * for unregistered customers to track the status of their orders. It
 * renders the order details page (account/orderhistory/orderdetails template), even
 * if the order cannot be found.
 */
function track () {
    var parameterMap = request.httpParameterMap;

    if (empty(parameterMap.orderID.stringValue)) {
        app.getView().render('account/orderhistory/orderdetails');
        return response;
    }

    var uuid = parameterMap.orderID.stringValue;
    var orders = OrderMgr.searchOrders('UUID={0} AND status!={1}', 'creationDate desc', uuid, dw.order.Order.ORDER_STATUS_REPLACED);
    securityHeader.setSecurityHeaders();
    if (empty(orders)) {
        app.getView().render('account/orderhistory/orderdetails');
    }

    var Order = orders.next();
    app.getView({Order: Order}).render('account/orderhistory/orderdetails');
}

function showTrackOrder () {
	var customer = session.customer;
	var orderTrackForm = app.getForm('ordertrack');
	orderTrackForm.clear();
	securityHeader.setSecurityHeaders();
	if (customer.authenticated && customer.registered) {
		orders();
	} else {
		app.getView().render('account/trackorder/trackorder');
	}
}

function orderTrackSubmit() {
	var orderTrackForm = app.getForm('ordertrack');
	var customer = session.customer;
	if (customer.authenticated && customer.registered) { 
		app.getController('Order').History();		
	}
	
	var orderNumber = orderTrackForm.getValue('orderNumber');
    var orderFormEmail = orderTrackForm.getValue('orderEmail');
    
    if(!orderNumber && !orderFormEmail) {
    	app.getController('Order').ShowTrackOrder();
    	
    } else {
    	
    	orderTrackForm.handleAction({
    		findorder: function () {
    	        //var orderNumber = orderTrackForm.getValue('orderNumber');
    	        //var orderFormEmail = orderTrackForm.getValue('orderEmail');
    	       
    	        if (!orderNumber || !orderFormEmail) {
    	            response.redirect(URLUtils.https('Order-ShowTrackOrder'));
    	            return;
    	        }
    	
    	        // Check to see if the number of attempts has exceeded the session threshold
    	        if (RateLimiter.isOverThreshold('FailedOrderTrackerCounter')) {
    	            RateLimiter.showCaptcha();
    	        }
    	
    	        var orders = OrderMgr.searchOrders('orderNo={0} AND status!={1}', 'creationDate desc', orderNumber,
    	            dw.order.Order.ORDER_STATUS_REPLACED);
    			securityHeader.setSecurityHeaders();
    	        if (empty(orders)) {
    	            app.getView({
    	                OrderNotFound: true
    	            }).render('account/trackorder/trackorder');
    	            return;
    	        }
    	
    	        var foundOrder = orders.next();
    	
    	        if (foundOrder.customerEmail.toLowerCase() !== orderFormEmail.toLowerCase()) {
    	            app.getView({
    	                OrderNotFound: true
    	            }).render('account/trackorder/trackorder');
    	            return;
    	        }
    	
    	        // Reset the error condition on exceeded attempts
    	        RateLimiter.hideCaptcha();
    	
    	        app.getView({
    	            Order: foundOrder
    	        }).render('account/orderhistory/orderdetails');
    	    }
    	});
    	
    }
	
	
}

function processOrderTrackForm() {
	
	var orderTrackForm = app.getForm('ordertrack');
	
	orderTrackForm.handleAction({
		findorder: function () {
	        var orderNumber = orderTrackForm.getValue('orderNumber');
	        var orderFormEmail = orderTrackForm.getValue('orderEmail');
	        securityHeader.setSecurityHeaders();
	        if (!orderNumber || !orderFormEmail) {
	            response.redirect(URLUtils.https('Order-ShowTrackOrder'));
	            return;
	        }
	
	        // Check to see if the number of attempts has exceeded the session threshold
	        if (RateLimiter.isOverThreshold('FailedOrderTrackerCounter')) {
	            RateLimiter.showCaptcha();
	        }
	
	        var orders = OrderMgr.searchOrders('orderNo={0} AND status!={1}', 'creationDate desc', orderNumber,
	            dw.order.Order.ORDER_STATUS_REPLACED);
	
	        if (empty(orders)) {
	            app.getView({
	                OrderNotFound: true
	            }).render('account/trackorder/trackorder');
	            return;
	        }
	
	        var foundOrder = orders.next();
	
	        if (foundOrder.customerEmail.toLowerCase() !== orderFormEmail.toLowerCase()) {
	            app.getView({
	                OrderNotFound: true
	            }).render('account/trackorder/trackorder');
	            return;
	        }
	
	        // Reset the error condition on exceeded attempts
	        RateLimiter.hideCaptcha();
	        app.getView({
	            Order: foundOrder
	        }).render('account/orderhistory/orderdetails');
	    }
	});
}


/*
 * Module exports
 */

/*
 * Web exposed methods
 */
/** Renders a page with the order history of the current logged in customer.
 * @see module:controllers/Order~history */
exports.History = guard.ensure(['get', 'https', 'loggedIn'], history);
/** Renders a page with the order history of the current logged in customer.
 * @see module:controllers/Order~history */
exports.Reorder = guard.ensure(['get', 'https', 'loggedIn'], reorder);
/** Renders the order detail page.
 * @see module:controllers/Order~orders */
exports.Orders = guard.ensure(['post', 'https', 'loggedIn'], orders);
/** Renders a page with details of a single order.
 * @see module:controllers/Order~track */
exports.Track = guard.ensure(['get', 'https'], track);
exports.ShowTrackOrder = guard.ensure(['https'], showTrackOrder);
exports.OrderTrackForm = guard.ensure(['https','post'], processOrderTrackForm);
exports.OrderTrackSubmit = guard.ensure(['https'], orderTrackSubmit);