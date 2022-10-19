/**
 * This script is used to Update the shipment status of the order & to trigger Klaviyo Shipping Confirmatin trigger.
*/

importPackage( dw.system );
importPackage( dw.order );

var Calendar = require('dw/util/Calendar');
var StringUtils = require('dw/util/StringUtils');
var Site = require('dw/system/Site');

function execute(parameters, stepExecution) {
	try{
        var overrideDate = stepExecution.getParameterValue('overridedate');

        dw.system.Logger.info('sendCancellationNotifications started');

        var orderDate = new Date();

        //Consider the timezone

        var orderDate = new Date();
        var fromOrderDate = new Date();	

        //Set to the overridden date if passed	
        if (overrideDate) {
            var pdate = overrideDate.split('/');
            orderDate = new Date(pdate[0], (pdate[1]-1), pdate[2]);
            fromOrderDate = new Date(pdate[0], (pdate[1]-1), pdate[2]);
        }

        // Change from date to 1 day previous
        fromOrderDate.setHours(orderDate.getHours() - 48);

        dw.system.Logger.info('SendCancellationNotifications: From Date : {0}',fromOrderDate);
        dw.system.Logger.info('SendCancellationNotifications: To Date {0}',orderDate);

        var ordersIterator = require('dw/order/OrderMgr').searchOrders('status={0} AND creationDate >= {1} and creationDate <= {2}', 'creationDate desc',
        dw.order.Order.ORDER_STATUS_CANCELLED,fromOrderDate,orderDate,null,false);

        dw.system.Logger.info('SendCancellationNotifications: Order count : {0}',ordersIterator.count);
        while (ordersIterator.hasNext()) {
            var order = ordersIterator.next();
            // Check if cancel email sent
            var cancelEmailSent = (order.custom.cancelEmailSent)?order.custom.cancelEmailSent:false;
            dw.system.Logger.info('SendCancellationNotifications: CancelEmailSent : {0}',cancelEmailSent);

            if(cancelEmailSent) continue;

            var orderDetails = {};
            var orderEmail = order.getCustomer().profile ? order.getCustomer().profile.email: order.customerEmail;

            var cancelCode = (order.cancelCode)?order.cancelCode:'';
            var cancelDescription = (order.cancelDescription)?order.cancelDescription:'';

            if(cancelDescription =='Declined by Signifyd.'){
                cancelDescription = 'FRAUD';
            } else {
                cancelDescription = 'TEAMLOVE';
            }
            var orderDate = new Date(order.creationDate);
            var orderCreationDate = StringUtils.formatCalendar(new Calendar(orderDate), 'yyyy/MM/dd' );

            orderDetails['ORDER_NUMBER'] = order.orderNo;
            orderDetails['FIRST_NAME'] = (order.billingAddress.firstName)?order.billingAddress.firstName:'';
            orderDetails['LAST_NAME'] = (order.billingAddress.lastName)?order.billingAddress.lastName:'';
            orderDetails['ORDER_DATE'] = orderCreationDate;
            orderDetails['CANCEL_REASON'] = cancelDescription; //AUTODELIVERY, FRAUD, TEAMLOVE

            //Send Cancellation Confirmation email
            require('*/cartridge/scripts/utils/klaviyo/klaviyoUtils').sendEmail(orderEmail, orderDetails, 'Order Cancellation');

            // Update Order Flag
            Transaction.wrap(function () {
                order.custom.cancelEmailSent = true;
            });
        }
    }
    catch(e) {
        Logger.error("Error occured while executing sendCancellationNotifications Script "+e);
    }
}

/* Module Exports */
exports.execute = execute;