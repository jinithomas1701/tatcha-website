/* Script Modules */
var Status = require('dw/system/Status');
/* API Includes */


var OrderMgr = require('dw/order/OrderMgr');
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');

function afterPOST(order) {

    var paymentInstrument = order.paymentInstrument;
    var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.paymentMethod).paymentProcessor;

    Transaction.wrap(function () {
        paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
    });


	var handlePaymentsResult = COHelpers.handlePayments(order, order.orderNo);

	if (handlePaymentsResult.error) {
		return Transaction.wrap(function () {
			OrderMgr.failOrder(order, true);
		});
		return new Status(Status.ERROR, 'confirm.error.technical');
	}
	else if (handlePaymentsResult.missingPaymentInfo) {
		return Transaction.wrap(function () {
			OrderMgr.failOrder(order, true);

		});
		return new Status(Status.ERROR, 'confirm.error.technical');
	}

    var fraudDetectionStatus = { status: 'success' };
    // Need to use COHelpers.placeOrder because it exists in plugin_giftcertificate cartridge.
    var orderPlacementStatus = COHelpers.placeOrder(order, fraudDetectionStatus);
	if (orderPlacementStatus.error) {
		return new Status(Status.ERROR, 'confirm.error.technical');
	}

	if(!dw.system.Site.getCurrent().getCustomPreferenceValue('klaviyo_order_transactional_enabled')){
		return new Status(Status.OK);
	}

	// putting this here for performance
	var KlaviyoUtils = require('*/cartridge/scripts/utils/klaviyo/klaviyoUtils');
	// tatcha specific order object */
	var EmailUtils = require('*/cartridge/scripts/utils/klaviyo/emailUtils');

	// for tatcha, we are going to skip the rest of this method
	// and just pass in currentOrder as the order param of this function
	var tatchaOrder = EmailUtils.prepareOrderPayload(order, false, 'orderConfirmation');
	var orderEmail = order.customerEmail ? order.customerEmail : order.getCustomer().profile.email;

	KlaviyoUtils.sendEmail(orderEmail, tatchaOrder, "Placed Order");
	
	var Signifyd = require('*/cartridge/scripts/service/signifyd');
	
	Signifyd.Call(order,false);
	

	return new Status(Status.OK);

}

exports.afterPOST = afterPOST;