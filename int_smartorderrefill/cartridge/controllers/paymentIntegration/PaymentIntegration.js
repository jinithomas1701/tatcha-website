/**
 *  Property of OSF Global Services, Inc., (with its brand OSF Commerce). OSF remains the sole owner of all right, title and interest in the software.
 *  Do not copy, sell, reverse engineer or otherwise attempt to derive or obtain information about the functioning, manufacture or operation therein.
 */
exports.CYBERSOURCE_CREDIT = {
    authorize: function (args) {
        var authorizeArgs = {
            Order: args.Order,
            SubscriptionID: args.OrderList.creditCardToken,
            OriginalOrder: args.OrderList.originalOrder
        };
        var cyberSourceProcessor = require("*/cartridge/controllers/paymentIntegration/CYBERSOURCE_CREDIT_SubscriptionPayment.js");
        return cyberSourceProcessor.authorize(authorizeArgs);
    },
    chargeFee: function (args) {
        var subsList = args.OrderList;
        var feeValue = args.CancelationFee;
        var cyberSourceProcessor = require("*/cartridge/controllers/paymentIntegration/CYBERSOURCE_CREDIT_SubscriptionPayment.js");
        return cyberSourceProcessor.chargeFee(subsList, feeValue);
    },

    checkInitialPaymentApproval: function (initialOrder) {
        var cyberSourceProcessor = require("*/cartridge/controllers/paymentIntegration/CYBERSOURCE_CREDIT_SubscriptionPayment.js");
        return cyberSourceProcessor.checkInitialPaymentApproval(initialOrder);
    },

    getCreditCardInformation: function (args) {
        var cyberSourceProcessor = require("*/cartridge/controllers/paymentIntegration/CYBERSOURCE_CREDIT_SubscriptionPayment.js");
        return cyberSourceProcessor.getCreditCardInformation(args);
    },

    updatePaymentInstrument: function (args) {
        var cyberSourceProcessor = require("*/cartridge/controllers/paymentIntegration/CYBERSOURCE_CREDIT_SubscriptionPayment.js");
        cyberSourceProcessor.updatePaymentInstrument(args.paymentInstrument, args.response);
    },

    updateCreditCardInformation: function (args) {
        var cyberSourceProcessor = require("*/cartridge/controllers/paymentIntegration/CYBERSOURCE_CREDIT_SubscriptionPayment.js");
        return cyberSourceProcessor.updateCard(args.creditCardForm, args.customerSubscription);
    }
};

exports.ADYEN_CREDIT = {
    authorize: function (args) {
        var authorizeArgs = {
            Order: args.Order,
            Token: args.OrderList.creditCardToken
        };
        var adyenCreditProcessor = require("*/cartridge/controllers/paymentIntegration/ADYEN_CREDIT_SubscriptionPayment.js");
        return adyenCreditProcessor.authorize(authorizeArgs);
    },

    chargeFee: function (args) {
        var authorizeArgs = {
            Order: args.Order,
            Token: args.OrderList.creditCardToken
        };
        var adyenCreditProcessor = require("*/cartridge/controllers/paymentIntegration/ADYEN_CREDIT_SubscriptionPayment.js");
        return adyenCreditProcessor.authorize(authorizeArgs);
    },

    checkInitialPaymentApproval: function (initialOrder) {
        var adyenCreditProcessor = require("*/cartridge/controllers/paymentIntegration/ADYEN_CREDIT_SubscriptionPayment.js");
        return adyenCreditProcessor.checkInitialPaymentApproval(initialOrder);
    },

    getCreditCardInformation: function (args) {
        var adyenCreditProcessor = require("*/cartridge/controllers/paymentIntegration/ADYEN_CREDIT_SubscriptionPayment.js");
        return adyenCreditProcessor.getCreditCardInformation(args);
    },

    updatePaymentInstrument: function (args) {
        var adyenCreditProcessor = require("*/cartridge/controllers/paymentIntegration/ADYEN_CREDIT_SubscriptionPayment.js");
        adyenCreditProcessor.updatePaymentInstrument(args.paymentInstrument, args.response, args.order);
    },

    updateCreditCardInformation: function (args) {
        var adyenCreditProcessor = require("*/cartridge/controllers/paymentIntegration/ADYEN_CREDIT_SubscriptionPayment.js");
        return adyenCreditProcessor.updateCard(args.creditCardForm);
    }
};

exports.BASIC_CREDIT = {
    authorize: function (args) {
        var basicCreditProcessor = require("*/cartridge/controllers/paymentIntegration/BASIC_CREDIT_SubscriptionPayment.js");
        return basicCreditProcessor.authorize(args);
    },

    chargeFee: function (args) {
        var basicCreditProcessor = require("*/cartridge/controllers/paymentIntegration/BASIC_CREDIT_SubscriptionPayment.js");
        return basicCreditProcessor.authorize(args);
    },

    checkInitialPaymentApproval: function (initialOrder) {
        var basicCreditProcessor = require("*/cartridge/controllers/paymentIntegration/BASIC_CREDIT_SubscriptionPayment.js");
        return basicCreditProcessor.checkInitialPaymentApproval(initialOrder);
    },

    getCreditCardInformation: function (args) {
        var basicCreditProcessor = require("*/cartridge/controllers/paymentIntegration/BASIC_CREDIT_SubscriptionPayment.js");
        return basicCreditProcessor.getCreditCardInformation(args);
    },

    updatePaymentInstrument: function (args) {
        var basicCreditProcessor = require("*/cartridge/controllers/paymentIntegration/BASIC_CREDIT_SubscriptionPayment.js");
        basicCreditProcessor.updatePaymentInstrument(args.paymentInstrument, args.order);
    },

    updateCreditCardInformation: function (args) {
        var basicCreditProcessor = require("*/cartridge/controllers/paymentIntegration/BASIC_CREDIT_SubscriptionPayment.js");
        return basicCreditProcessor.updateCard(args.creditCardForm, args.customerSubscription);
    }
};

exports.BRAINTREE_CREDIT = {
	     authorize : function (Order, Customer, PaymentInstrument) {
        	PaymentInstrument.custom.braintreePaymentMethodToken = Customer.profile.custom.OsfSorSubscriptionToken;

            //setting the card details
            try {
                var savedPymentInstruments = Customer.profile.wallet.getPaymentInstruments(PaymentInstrument.METHOD_CREDIT_CARD);
                if(!empty(Customer.profile.custom.OsfSorSubscriptionToken)){
                    for (var savedPymentInstrumentsIndex in savedPymentInstruments) {
                        var savedPymentInstrument = savedPymentInstruments[savedPymentInstrumentsIndex];
                        if (!empty(savedPymentInstrument.creditCardToken) && savedPymentInstrument.creditCardToken === Customer.profile.custom.OsfSorSubscriptionToken) {
                            if (!empty(savedPymentInstrument.creditCardExpirationMonth) && !empty(savedPymentInstrument.creditCardExpirationYear)) {
                                PaymentInstrument.setCreditCardExpirationMonth(savedPymentInstrument.creditCardExpirationMonth);
                                PaymentInstrument.setCreditCardExpirationYear(savedPymentInstrument.creditCardExpirationYear);
                            }
                            if (!empty(savedPymentInstrument.creditCardType)) {
                                PaymentInstrument.setCreditCardType(savedPymentInstrument.creditCardType);
                            }
                            if(!empty(savedPymentInstrument.creditCardNumber)){
                                PaymentInstrument.setCreditCardNumber(savedPymentInstrument.creditCardNumber);
                            }
                            if (!empty(savedPymentInstrument.creditCardToken)) {
                                PaymentInstrument.setCreditCardToken(savedPymentInstrument.creditCardToken);
                            }
                            break;
                        }
                    }
                }
            }catch (e) {}

            var args = {
                    Order: Order,
                    Customer: Customer,
                    PaymentInstrument: PaymentInstrument,
                    OrderNo: Order.orderNo
            }
            var braintreeProcessor = require("*/cartridge/controllers/paymentIntegration/BRAINTREE_CREDIT_SubscriptionPayment.js");
            return braintreeProcessor.authorize(args);
        },
	    
	    getCreditCardInformation: function (args) {
	        var braintreeCreditProcessor = require("*/cartridge/controllers/paymentIntegration/BRAINTREE_CREDIT_SubscriptionPayment.js");
	        return braintreeCreditProcessor.getCreditCardInformation(args);
	    }
};
