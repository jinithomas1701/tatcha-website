var Transaction = require('dw/system/Transaction');
var HookMgr = require('dw/system/HookMgr');
var PaymentInstrument = require('dw/order/PaymentInstrument');

var prefs = require('*/cartridge/config/braintreePreferences');
var braintreeConstants = require('*/cartridge/scripts/util/braintreeConstants');
var { clearDefaultProperty } = require('*/cartridge/scripts/braintree/helpers/customerHelper');
var { getApplicableCreditCardPaymentInstruments } = require('*/cartridge/scripts/braintree/helpers/paymentHelper');
var base = module.superModule;

/**
 * Return boolean Token Exists value
 * @param  {boolean} isCustomerExistInVault customer vault
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument current payment instrument
 * @returns {boolean} Token Exist
 */
function isTokenExists(isCustomerExistInVault, paymentInstrument) {
    var isTokenAllowed = isCustomerExistInVault &&
        paymentInstrument.creditCardToken &&
        !paymentInstrument.custom.braintreeIs3dSecureRequired;

    return isTokenAllowed || !paymentInstrument.custom.braintreePaymentMethodNonce;
}

/**
 * Returns a prepared custom fields string
 * @param {dw.order.Order} order Order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Order payment instrument
 * @return {string} custom fields string
 */
function getCustomFields(order, paymentInstrument) {
    var paymentProcessorId = paymentInstrument.getPaymentTransaction().getPaymentProcessor().ID;
    var prefsCustomFields = prefs.customFields;
    var hookMethodName = paymentProcessorId.split('_')[1].toLowerCase();
    var resultStr = '';
    var cfObject = {};

    for (var fName in prefsCustomFields) {
        var fArr = prefsCustomFields[fName].split(':');
        cfObject[fArr[0]] = fArr[1];
    }

    if (HookMgr.hasHook('braintree.customFields')) {
        var cfs = HookMgr.callHook('braintree.customFields', hookMethodName, { order: order, paymentInstrument: paymentInstrument });
        for (var field in cfs) {
            cfObject[field] = cfs[field];
        }
    }

    for (var field2 in cfObject) {
        resultStr += '<' + field2 + '>' + cfObject[field2] + '</' + field2 + '>';
    }

    return resultStr;
}


/**
 * Create Base Sale Transaction Data
 * @param  {dw.order.Order} order Order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Order payment instrument
 * @param {Object} prefsData preferencies data settings
 * @returns {Object} data fields
 */
base.createBaseSaleTransactionData = function (order, paymentInstrument, prefsData) {
    var { createCustomerId } = require('*/cartridge/scripts/braintree/helpers/customerHelper');
    var {
        getAmountPaid,
        createShippingAddressData,
        getOrderLevelDiscountTotal,
        getLineItems,
        getMerchantAccountID
    } = require('*/cartridge/scripts/braintree/helpers/paymentHelper');
    var customer = order.getCustomer();
    var isUsedAlreadySavedPaymentMethod = false;

    var data = {
        orderId: order.getOrderNo(),
        amount: getAmountPaid(order).getValue(),
        currencyCode: order.getCurrencyCode(),
        customFields: getCustomFields(order, paymentInstrument),
        options: {
            submitForSettlement: prefsData.isSettle
        },
        merchantAccountId: getMerchantAccountID(order.getCurrencyCode())
    };

    if (customer.isRegistered()) {
        data.customerId = customer.profile.custom.braintreeCustomerId || createCustomerId(customer);
    } else {
        data.customerId = null;
        data.customer = customer.isRegistered() ?
            base.createRegisteredCustomerData(order) :
            base.createGuestCustomerData(order);

		var customerDetails = {};
		customerDetails.email = order.getCustomerEmail();
		customerDetails.phoneNumber = order.getDefaultShipment().getShippingAddress().phone ? order.getDefaultShipment().getShippingAddress().phone : '';
		data.customerDetails = customerDetails;
    }

    if (isTokenExists(customer.isRegistered(), paymentInstrument)) {
        if(paymentInstrument.creditCardToken) {
            data.paymentMethodToken = paymentInstrument.creditCardToken;
        } else {
            if (!empty(paymentInstrument.custom.braintreePaymentMethodToken) && (empty(paymentInstrument.custom.braintreePaymentMethodNonce) || paymentInstrument.custom.braintreePaymentMethodNonce === 'null')) {
                data.paymentMethodToken = paymentInstrument.custom.braintreePaymentMethodToken;
            } else {
                data.paymentMethodNonce = paymentInstrument.custom.braintreePaymentMethodNonce;
            }
        }

        isUsedAlreadySavedPaymentMethod = true;
    } else {
        data.paymentMethodNonce = paymentInstrument.custom.braintreePaymentMethodNonce;
    }

	var shipping = createShippingAddressData(order.getDefaultShipment().getShippingAddress());
    if(shipping && shipping.countryCode && !empty(shipping.countryCode)){
        data.shipping = shipping;
    }

    if (prefsData.isL2L3) {
        var shipping = createShippingAddressData(order.getDefaultShipment().getShippingAddress());
        if (order.getCustomerLocaleID().split('_')[1].toLowerCase() === shipping.countryCode.toLowerCase()) {
            shipping.countryCode = base.getISO3Country(order.getCustomerLocaleID());
        }

        data.shipping = shipping;
        data.taxAmount = order.getTotalTax().toNumberString();

        if (paymentInstrument.paymentMethod === braintreeConstants.PAYMENT_METHOD_ID_PAYPAL) {
            /** Rounding issues due to discounts, removed from scope due to bug on PayPal / BT end.
             * No ETA on bug fix and not in roadmap.
             *
             * data.shippingAmount = order.getShippingTotalPrice().value;
             * data.discountAmount = getOrderLevelDiscountTotal(order);
             * data.lineItems = getLineItems(order.productLineItems);
             */
        } else {
            data.shippingAmount = order.getShippingTotalPrice().toNumberString();
            data.discountAmount = getOrderLevelDiscountTotal(order);
            data.lineItems = getLineItems(order);
        }
    }

    if (isUsedAlreadySavedPaymentMethod) {
        data.customerId = null;
    }

    var isUsedGooglepayPaymentMehtod = paymentInstrument.paymentMethod === braintreeConstants.PAYMENT_METHOD_ID_GOOGLEPAY;
    var isVaultingAllowed = !isUsedGooglepayPaymentMehtod ||
        (isUsedGooglepayPaymentMehtod &&
            session.privacy.googlepayPaymentType === braintreeConstants.GOOGLEPAY_TYPE_ANDROID_PAY_CARD);

    if (prefsData.vaultMode && isVaultingAllowed && !isUsedAlreadySavedPaymentMethod) {
        data.vaultPaymentMethodAfterTransacting = {
            when: braintreeConstants.TRANSACTION_VAULT_ON_SUCCESS
        };
    }

    return data;
}

/**
 * Save General Transaction Data
 * @param  {dw.order.Order} order Order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Order payment instrument
 * @param  {Object} responseTransaction - response transaction
 */
 base.saveGeneralTransactionData = function(order, paymentInstrument, responseTransaction) {
    var Money = require('dw/value/Money');
    var PT = require('dw/order/PaymentTransaction');
    var paymentTransaction = paymentInstrument.getPaymentTransaction();
    var transaction = responseTransaction.transaction || responseTransaction;
    var transactionStatus = transaction.status;

    paymentTransaction.setTransactionID(transaction.legacyId);
    paymentTransaction.setAmount(new Money(transaction.amount.value, order.getCurrencyCode()));

    order.custom.isBraintree = true;
    order.custom.braintreePaymentStatus = transactionStatus;

    paymentInstrument.custom.braintreePaymentMethodNonce = null;

    if (!prefs.isSettle && transactionStatus === braintreeConstants.TRANSACTION_STATUS_AUTHORIZED) {
        paymentTransaction.setType(PT.TYPE_AUTH);
    } else if (prefs.isSettle &&
        (transactionStatus === braintreeConstants.TRANSACTION_STATUS_SETTLING ||
            transactionStatus === braintreeConstants.TRANSACTION_STATUS_SUBMITTED_FOR_SETTLEMENT)) {
        paymentTransaction.setType(PT.TYPE_CAPTURE);
    }
    if(responseTransaction.paymentMethod.legacyId) {
        paymentInstrument.custom.braintreePaymentMethodToken = responseTransaction.paymentMethod.legacyId;
    }

    // Need to debug the case of (GC + Credit card case)
    if(paymentInstrument.paymentMethod.toLowerCase() === 'credit_card') {
        if(responseTransaction.paymentMethodSnapshot) {
            var creditCardDetails = responseTransaction.paymentMethodSnapshot;
            if(creditCardDetails.threeDSecureInfo && creditCardDetails.threeDSecureInfo.authentication) {
                paymentInstrument.custom.braintree3dSecureStatus = (creditCardDetails.threeDSecureInfo.authentication && creditCardDetails.threeDSecureInfo.authentication.authenticationStatus) ? creditCardDetails.threeDSecureInfo.authentication.authenticationStatus : null;
            }

            paymentInstrument.custom.bin = creditCardDetails.bin;
        }
        if(responseTransaction.statusHistory && responseTransaction.statusHistory.length>0 && responseTransaction.statusHistory[0].processorResponse) {
            var processorResponse = responseTransaction.statusHistory[0].processorResponse;
            paymentInstrument.custom.cvvResponseCode = processorResponse.cvvResponse;
            paymentInstrument.custom.avsPostalCodeResponseCode = processorResponse.avsPostalCodeResponse;
            paymentInstrument.custom.avsStreetAddressResponseCode = processorResponse.avsStreetAddressResponse;
        }
    }

    // needs to add isBraintree to customer profile, if the customer exists in braintree

}
 /**
 * Saves parameters of the credit card
 * @param {Object} createPaymentMethodResponseData Payment method response data from Braintree response
 * @param {string} paymentMethodId Payment method id
 * @param {string} creditOwner Credit card owner
 * @returns {Object} Object with token
 */
 function saveGeneralPaymentMethodParameters(createPaymentMethodResponseData, paymentMethodId, creditOwner, isDefaultCard) {
     var customerPaymentInstrumentObject;
     var paymentMethodData = createPaymentMethodResponseData.paymentMethod;
     var response = createPaymentMethodResponseData.paymentMethodSnapshot || paymentMethodData.details;
     var customerWallet = customer.getProfile().getWallet();
     // modify card type to appropriate format
     var type = response.brandCode.toLowerCase();
     var cardType = type.replace(/_/g, ' ').replace(type.charAt(0), (type.charAt(0)).toUpperCase());

     var card = {
         expirationMonth: response.expirationMonth,
         expirationYear: response.expirationYear,
         number: Date.now().toString().substr(0, 11) + response.last4,
         type: cardType,
         paymentMethodToken: paymentMethodData.legacyId,
         owner: creditOwner || createOwnerName(paymentMethodData)
     };
     if (isDefaultCard === 'true') {
         clearDefaultProperty(getApplicableCreditCardPaymentInstruments());
     }

     Transaction.wrap(function () {
         var customerPaymentInstrument = customerWallet.createPaymentInstrument(paymentMethodId);
         customerPaymentInstrument.setCreditCardHolder(card.owner);
         customerPaymentInstrument.setCreditCardNumber(card.number);
         customerPaymentInstrument.setCreditCardExpirationMonth(parseInt(card.expirationMonth, 10));
         customerPaymentInstrument.setCreditCardExpirationYear(parseInt(card.expirationYear, 10));
         customerPaymentInstrument.setCreditCardType(card.type);
         customerPaymentInstrument.creditCardToken = card.paymentMethodToken;
         if (isDefaultCard === 'true') {
             customerPaymentInstrument.custom.braintreeDefaultCard = true;
         }
         customerPaymentInstrumentObject = customerPaymentInstrument;
     });

     return {
         customerPaymentInstrument: customerPaymentInstrumentObject,
         error: false
     };
 }
 
 /**
 * Save credit cart as customer payment method
 * @param {Object} createPaymentMethodResponseData Response from BT API
 * @param {string} creditOwner Credit card owner.
 * @returns {Object} Object with token
 */
 base.saveCustomerCreditCard = function (createPaymentMethodResponseData, creditOwner, isDefaultCard) {
     var setDefault = 'false';
     if (isDefaultCard === 'true') {
         setDefault = isDefaultCard;
     } else if (isDefaultCard === 'false') {
         setDefault = isDefaultCard;
     }
     return saveGeneralPaymentMethodParameters(createPaymentMethodResponseData, PaymentInstrument.METHOD_CREDIT_CARD, creditOwner, setDefault);
 }

 /**
 * Set shipping method
 * @param {Object} currentBasket Basket
 */
 base.setShippingMethod = function (currentBasket) {
	var ShippingMgr = require('dw/order/ShippingMgr');
	var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
	var address = currentBasket.getDefaultShipment().getShippingAddress();
	var applicableShippingMethods;
	
	var addressShipping = {};
	addressShipping.countryCode = address.countryCode.value;
	addressShipping.stateCode = address.stateCode ? address.stateCode : '';
	addressShipping.postalCode = address.postalCode ? address.postalCode : '';
	addressShipping.city = address.city ? address.city : '';
	addressShipping.address1 = address.address1 ? address.address1 : '';
	addressShipping.address2 = address.address2 ? address.address2 : '';
	
	applicableShippingMethods = ShippingMgr.getShipmentShippingModel(currentBasket.getDefaultShipment()).getApplicableShippingMethods(addressShipping);
	// Set the first shipping method in the applicable list.
	Transaction.wrap(function () {
	    currentBasket.getDefaultShipment().setShippingMethod(applicableShippingMethods.iterator().next());
	    basketCalculationHelpers.calculateTotals(currentBasket);
	});
 }

module.exports = base;