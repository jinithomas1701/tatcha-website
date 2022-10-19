'use strict';

var page = module.superModule;
var server = require('server');
var array = require('*/cartridge/scripts/util/array');
var { deletePaymentMethod } = require('~/cartridge/scripts/braintree/braintreeAPI/braintreeBusinessLogic');
var {
    setAndReturnNewDefaultCard
} = require('~/cartridge/scripts/braintree/helpers/paymentHelper');

server.extend(page);

server.append('DeletePayment', function (req, res, next) {
    var newDefaultAccount;
    var UUID = req.querystring.UUID;
    var paymentInstruments = req.currentCustomer.wallet.paymentInstruments;
    var paymentToDelete = {
        payment: array.find(paymentInstruments, function (item) {
            return UUID === item.UUID;
        }).raw
    };

    paymentToDelete.paymentMethod = paymentToDelete.payment.paymentMethod;
    paymentToDelete.isDefaultCard = paymentToDelete.payment.custom.braintreeDefaultCard;
    // Delete Payment Method from Braintree && Customer Payment Instruments
    deletePaymentMethod(paymentToDelete);

    if (paymentToDelete.isDefaultCard) {
        newDefaultAccount = setAndReturnNewDefaultCard(paymentToDelete.paymentMethod);
        if (empty(newDefaultAccount)) {
            return next();
        }

        res.json({ newDefaultAccount: newDefaultAccount[0].UUID });
    }

    next();
});

module.exports = server.exports();
