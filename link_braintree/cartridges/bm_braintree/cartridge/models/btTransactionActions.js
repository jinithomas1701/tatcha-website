var BTOrderMgrModel = require('*/cartridge/models/btOrderMgr');
var BTGraphQLSdkModel = require('*/cartridge/models/btGraphQLSdk');
var btOrderMgr = new BTOrderMgrModel();
var btGraphQLSdk = new BTGraphQLSdkModel();

/**
 * BT Transaction Actions Model
 */
function TransactionActionsModel() { }

TransactionActionsModel.prototype.submitForSettlement = function (reqData) {
    var resultObject = btGraphQLSdk.submitForSettlement(reqData);

    btOrderMgr.updateBtPaymentStatusfterSettlement(resultObject, reqData.orderToken);

    return resultObject;
};

TransactionActionsModel.prototype.submitPartialSettlement = function (reqData) {
    var resultObject = btGraphQLSdk.submitForPartialSettlement(reqData);

    btOrderMgr.updateBtPaymentStatusAfterPartialSettlement(resultObject, reqData.orderToken);

    return resultObject;
};

TransactionActionsModel.prototype.refund = function (reqData) {
    return btGraphQLSdk.refundTransaction(reqData);
};

TransactionActionsModel.prototype.void = function (reqData) {
    return btGraphQLSdk.voidTransaction(reqData);
};

TransactionActionsModel.prototype.voidWithoutUpdate = function (reqData) {
    return btGraphQLSdk.voidTransaction(reqData);
};

TransactionActionsModel.prototype.newTransactionFromVault = function (reqData) {
    return btGraphQLSdk.createTransactionFromVault(reqData);
};

module.exports = TransactionActionsModel;
