var Resource = require('dw/web/Resource');
var OrderMgr = require('dw/order/OrderMgr');
var Money = require('dw/value/Money');

var braintreeHelper = require('~/cartridge/scripts/braintree/bmBraintreeHelper');
var btConstants = require('*/cartridge/scripts/util/braintreeConstants');
var { render, renderJson, renderError } = require('*/cartridge/scripts/braintree/responseHelper');

var BTTransactionMgrModel = require('*/cartridge/models/btTransactionMgr');
var BTTransactionModel = require('*/cartridge/models/btTransaction');
var BTOrdersPagingModel = require('*/cartridge/models/btOrdersPaging');
var BTTransactionActionsModel = require('*/cartridge/models/btTransactionActions');
var BTOrderMgrModel = require('*/cartridge/models/btOrderMgr');

var hm = request.httpParameterMap;

/**
 *  Gets orders list. Can be filtered by order ID or transaction ID
 */
function orders() {
    var ordersList = null;
    var searchType = null;
    var pagingModel = null;
    var searchByPaymentMethodFlag = false;
    var btOrderMgrModel = new BTOrderMgrModel();
    var btOrdersPagingModel = new BTOrdersPagingModel();
    var isSearchQueryEmpty = braintreeHelper.isSearchQueryEmpty(hm.transactionId, hm.paymentMethod, hm.orderNo);

    // if search query inputs are empty get full orders list
    if (isSearchQueryEmpty) {
        ordersList = btOrderMgrModel.getAllOrders();
    } else {
        // define search type based on submitted search query
        searchType = braintreeHelper.getSearchType(hm.transactionId, hm.paymentMethod);

        switch (searchType) {
            case btConstants.SEARCH_BY_TRANSACTION_ID:
                ordersList = btOrderMgrModel.getOrdersByTransactionId(hm.transactionId.value);

                break;
            case btConstants.SEARCH_BY_ORDER_NUMBER:
                ordersList = btOrderMgrModel.getOrdersByOrderNo(hm.orderNo.stringValue);

                break;
            case btConstants.SEARCH_BY_PAYMENT_METHOD:
                ordersList = btOrderMgrModel.getOrdersByPaymentMethod(hm.paymentMethod.stringValue);
                searchByPaymentMethodFlag = true;

                break;
            default:
                break;
        }
    }

    // if requested order/s exist create dw.web.PagingModel and set its size, paging
    if (!empty(ordersList)) {
        pagingModel = btOrdersPagingModel.createPagingModel(ordersList, searchByPaymentMethodFlag);
        btOrdersPagingModel.setPagingModelSize(pagingModel, hm.page, hm.pagesize);
    }

    // set what payment methods are enabled and we can make search by payment method from it's list
    var braintreePaymentInstruments = braintreeHelper.getApplicablePaymentMethods();

    render('braintreebm/transactions/orderslist', {
        PagingModel: pagingModel,
        braintreePaymentInstruments: braintreePaymentInstruments
    });
}

/**
 * Get transaction details
 * @return {*} in case of error render error
 */
function orderTransaction() {
    var btTransactionModel = null;
    var order = OrderMgr.getOrder(hm.orderNo.stringValue, hm.orderToken.stringValue);

    try {
        if (!order) {
            return renderError(null);
        }

        var braintreePaymentInstrument = braintreeHelper.getBraintreePaymentInstrument(order);
        var transactionId = empty(hm.transactionId.stringValue) ? braintreePaymentInstrument.getPaymentTransaction().getTransactionID() : hm.transactionId.stringValue;

        if (!transactionId) {
            return renderError(Resource.msg('transaction.detail.error.transactionid', 'braintreebm', null));
        }

        var btTransactionMgrModel = new BTTransactionMgrModel();
        var transaction = btTransactionMgrModel.findTransaction(hm.transactionType.stringValue, transactionId);

        if (!transaction) {
            return renderError(Resource.msg('transaction.detail.error', 'braintreebm', null));
        }

        // update order payment status based on initial transaction status
        var btOrderMgrModel = new BTOrderMgrModel();
        btOrderMgrModel.updateBtPaymentStatusOfOrder(order, transaction.status, transactionId);

        // extend transaction object with required data such as refundedAmount, settledAmount, flags, etc.
        btTransactionModel = new BTTransactionModel(order, transaction);
    } catch (error) {
        // if error message is intended for user we display it, otherwise show standard error msg
        return renderError(error.isBusinessLogic ? error.message : Resource.msg('transaction.detail.error', 'braintreebm', null));
    }

    render('braintreebm/transactions/ordertransaction', {
        Order: order,
        Transaction: btTransactionModel
    });
}

/**
 * Do actions like Settle, Refund and etc.
 * @return {*} in case of error render error
 */
function action() {
    var transaction = null;
    var order = null;
    var paymentInstrument = null;
    var paymentTransaction = null;
    var initialOrderPaymentStatus = null;
    var amountValue = null;
    var isPaypalPaymentMethod = null;

    var method = hm.get('method').getStringValue();
    var amount = hm.get('amount').getDoubleValue();
    var orderNo = hm.get('orderNo').getStringValue();
    var orderToken =  hm.get('orderToken').getStringValue();
    var updatePartialList = hm.get('updatePartialList').getBooleanValue() || false;

    // orderNo is not available in case of ACTION_NEW_TRANSACTION_FROM_VAULT
    if (orderNo && orderToken) {
        order = OrderMgr.getOrder(orderNo, orderToken);
        paymentInstrument = braintreeHelper.getBraintreePaymentInstrument(order);
        paymentTransaction = paymentInstrument.getPaymentTransaction();
        initialOrderPaymentStatus = order.custom.braintreePaymentStatus || '';
        amountValue = amount && new Money(amount, paymentTransaction.getAmount().getCurrencyCode());
        isPaypalPaymentMethod = paymentInstrument.paymentMethod === btConstants.PAYMENT_METHOD_ID_PAYPAL;
    }

    var btTransactionActionsModel = new BTTransactionActionsModel();
    var btOrderMgrModel = new BTOrderMgrModel();

    var reqData = {};

    for (var name in hm) {
        reqData[name] = hm[name].toString();
    }

    try {
        switch (method) {
            case btConstants.ACTION_SUBMIT_FOR_SETTLEMENT:
                var paymentTransactionAmount = paymentTransaction.getAmount();
                // if transaction is fully (not partially) submitted for settlement
                var isFullSettlementSubmitted = empty(amount) || (paymentTransactionAmount.subtract(amountValue) <= 0);
                // Indicates whether the amount was settled before the current transaction
                var isAmountSettled = reqData.leftToSettle !== paymentTransactionAmount.value.toString();
                // Indicates whether use submitForSettlement API
                var isSubmitForSettlement = (isFullSettlementSubmitted && !isAmountSettled) || !isPaypalPaymentMethod;

                if (isSubmitForSettlement) {
                    transaction = btTransactionActionsModel.submitForSettlement(reqData);
                    updatePartialList = false;
                } else {
                    transaction = btTransactionActionsModel.submitPartialSettlement(reqData);
                    updatePartialList = true;
                }

                break;
            case btConstants.ACTION_REFUND:
                transaction = btTransactionActionsModel.refund(reqData);

                break;
            case btConstants.ACTION_VOID:
                transaction = btTransactionActionsModel.void(reqData);

                btOrderMgrModel.updateBraintreePaymentStatus(order, transaction.status);

                break;
            case btConstants.ACTION_VOID_WITHOUT_UPDATE:
                transaction = btTransactionActionsModel.voidWithoutUpdate(reqData);

                break;

            case btConstants.ACTION_SUBMIT_FOR_PARTIAL_SETTLEMENT_FOR_NON_PP_TRANSACTION:
                // simulating partial capture transaction for non PayPal transactions by adding isSubmitForSettlement flag
                if (paymentInstrument && !isPaypalPaymentMethod) {
                    reqData.isSubmitForSettlement = true;
                }

                transaction = btTransactionActionsModel.newTransactionFromVault(reqData);

                break;

            case btConstants.ACTION_NEW_TRANSACTION_FROM_VAULT:
                transaction = btTransactionActionsModel.newTransactionFromVault(reqData);

                break;
            case btConstants.ACTION_CREATE_INTENT_ORDER_TRANSACTION:
                reqData.isSubmitForSettlement = JSON.parse(reqData.isSubmitForSettlement);
                transaction = btTransactionActionsModel.newTransactionFromVault(reqData);

                btOrderMgrModel.updateIntentOrderData(order, paymentTransaction, transaction);

                break;
            default:
                break;
        }
    } catch (error) {
        // if error message is intended for user we display it, otherwise show standard error msg
        return renderJson('Error', error.isBusinessLogic ? error.message : Resource.msg('transaction.detail.error', 'braintreebm', null));
    }

    if (updatePartialList) {
        btOrderMgrModel.updatePartialTransactionsList(order, transaction.legacyId);
    }

    if (order && initialOrderPaymentStatus !== order.custom.braintreePaymentStatus) {
        renderJson('Success', null, {
            orderNo: orderNo,
            paymentStatus: braintreeHelper.parseStatus(order.custom.braintreePaymentStatus)
        });
    } else {
        renderJson('Success');
    }
}

/**
 * Return template for AJAX call
 */
function merchantView() {
    render(hm.template.stringValue, {
        httpParameterMap: hm
    });
}

/*
* Web exposed methods
*/

orders.public = true;
orderTransaction.public = true;
action.public = true;
merchantView.public = true;

exports.Orders = orders;
exports.OrderTransaction = orderTransaction;
exports.Action = action;
exports.MerchantView = merchantView;
