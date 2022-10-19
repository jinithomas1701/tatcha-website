/**
*
* @module  OrderExport
*/

'use strict';

exports.PushOrdersToLinc = function(pdict) {
	var OrderMgr = require('dw/order/OrderMgr');
    var queryString = 'orderNo = {0}';

    var orderIds = pdict.orderIds;
    if (typeof(orderIds) != 'undefined' && !empty(orderIds)) {
	    var orderIdsArray = [];
	    orderIdsArray = orderIds.split(',');

	    for (i = 0; i < orderIdsArray.length; i += 1) {
	    	dw.system.Logger.info("++++++++++++++-------------------+++++++++++++++++++++ ");
		    var order = OrderMgr.queryOrder(queryString, orderIdsArray[i]);
		    dw.system.Logger.info("Order Number "+order.getOrderNo());
		    var orderPayload = require('*/cartridge/scripts/emailUtilsSFRA').prepareOrderPayload(order,false,"");
		    var postData = orderPayload['LINC_PAYLOAD'];
		    dw.system.Logger.info("REQUEST: ");
		    dw.system.Logger.info(postData);
			if (typeof(postData) != 'undefined') {
				var httpClient = new dw.net.HTTPClient();
		        httpClient.setTimeout(5000);
		        httpClient.open('POST', 'https://ws.staging.letslinc.com/v1/order');
		        httpClient.setRequestHeader('Content-Type', 'application/json');
		        httpClient.setRequestHeader('Accept', 'application/json');
		        httpClient.setRequestHeader('Authorization', 'Bearer 6ByOInArJF5ZxJvDTtJVESdfkxsMAp');
		        httpClient.send(postData);
		        if (httpClient.statusCode == 202) {
		        	var rsp = JSON.parse(httpClient.text);
		            dw.system.Logger.info(" RESPONSE : "+rsp['success_message']);
		         }
			}
			dw.system.Logger.info("++++++++++++++-------------------+++++++++++++++++++++ ");
	    }
    }
}

