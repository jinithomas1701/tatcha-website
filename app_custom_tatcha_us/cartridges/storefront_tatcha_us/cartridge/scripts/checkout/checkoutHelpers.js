'use strict';

var server = require('server');

var collections = require('*/cartridge/scripts/util/collections');

var BasketMgr = require('dw/order/BasketMgr');
var HookMgr = require('dw/system/HookMgr');
var OrderMgr = require('dw/order/OrderMgr');
var PaymentInstrument = require('dw/order/PaymentInstrument');
var PaymentMgr = require('dw/order/PaymentMgr');
var Order = require('dw/order/Order');
var Status = require('dw/system/Status');
var Resource = require('dw/web/Resource');
var Site = require('dw/system/Site');
var Transaction = require('dw/system/Transaction');
var money = require('dw/value/Money');
var ShippingMgr = require('dw/order/ShippingMgr');
var URLUtils = require('dw/web/URLUtils');

var AddressModel = require('*/cartridge/models/address');
var formErrors = require('*/cartridge/scripts/formErrors');

var renderTemplateHelper = require('*/cartridge/scripts/renderTemplateHelper');
var ShippingHelper = require('*/cartridge/scripts/checkout/shippingHelpers');

var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
var Countries = require('*/cartridge/scripts/util/Countries');
var base = module.superModule;


/**
 * handles the payment authorization for each payment instrument
 * @param {dw.order.Order} order - the order object
 * @param {string} orderNumber - The order number for the order
 * @returns {Object} an error object
 */
    base.handlePayments = function(order, orderNumber) {
    var result = {};
    var nonGcAmount = base.getNonGiftCertificateAmount(order);
    if (order.totalNetPrice !== 0.00 || nonGcAmount === 0) {
        var paymentInstruments = order.paymentInstruments;

        if (paymentInstruments.length === 0) {
            Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
            result.error = true;
        }

        if (!result.error) {
            for (var i = 0; i < paymentInstruments.length; i++) {
                var paymentInstrument = paymentInstruments[i];
                var paymentProcessor = PaymentMgr
                    .getPaymentMethod(paymentInstrument.paymentMethod)
                    .paymentProcessor;
                var authorizationResult;
                if (paymentProcessor === null) {
                    Transaction.begin();
                    paymentInstrument.paymentTransaction.setTransactionID(orderNumber);
                    Transaction.commit();
                } else {
                    if(paymentProcessor.ID.toLowerCase() === 'braintree_credit' || paymentProcessor.ID.toLowerCase() === 'afterpay_credit') {
                        if (HookMgr.hasHook('app.payment.custom.processor.' +
                            paymentProcessor.ID.toLowerCase())) {
                            authorizationResult = HookMgr.callHook(
                                'app.payment.custom.processor.' + paymentProcessor.ID.toLowerCase(),
                                'Authorize',
                                orderNumber,
                                paymentInstrument,
                                paymentProcessor
                            );
                        } else {
                            authorizationResult = HookMgr.callHook(
                                'app.payment.processor.default',
                                'Authorize'
                            );
                        }
                    }
                    else {
                        if (HookMgr.hasHook('app.payment.processor.' +
                            paymentProcessor.ID.toLowerCase())) {
                            authorizationResult = HookMgr.callHook(
                                'app.payment.processor.' + paymentProcessor.ID.toLowerCase(),
                                'Authorize',
                                orderNumber,
                                paymentInstrument,
                                paymentProcessor
                            );
                        } else {
                            authorizationResult = HookMgr.callHook(
                                'app.payment.processor.default',
                                'Authorize'
                            );
                        }
                    }

                    if (authorizationResult.error) {
                        Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
                        result.error = true;
                        break;
                    }
                }
            }
        }
    }

    return result;
}

function convertCardTypeToDwFormat (braintreeType) {
    switch (braintreeType) {
        case 'American express':
            return 'Amex';
        case 'Mastercard':
            return 'Master';
        case 'Jcb':
            return 'JCB';
        default:
            return braintreeType;
    }
}

/**
 * Validates payment
 * @param {Object} req - The local instance of the request object
 * @param {dw.order.Basket} currentBasket - The current basket
 * @returns {Object} an object that has error information
 */
 base.validatePayment = function(req, currentBasket) {
    var applicablePaymentCards;
    var applicablePaymentMethods;
    var creditCardPaymentMethod = PaymentMgr.getPaymentMethod(PaymentInstrument.METHOD_CREDIT_CARD);
    var paymentAmount = currentBasket.totalGrossPrice.value;
    var countryCode;
    var currentCustomer = req.currentCustomer.raw;
    var paymentInstruments = currentBasket.paymentInstruments;
    var result = {};

     countryCode = Countries.getCurrent({
         CurrentRequest: {
             locale: request.locale
         }
     }).countryCode;

    applicablePaymentMethods = PaymentMgr.getApplicablePaymentMethods(
        currentCustomer,
        countryCode,
        paymentAmount
    );
    applicablePaymentCards = creditCardPaymentMethod.getApplicablePaymentCards(
        currentCustomer,
        countryCode,
        paymentAmount
    );

    var invalid = true;

    for (var i = 0; i < paymentInstruments.length; i++) {
        var paymentInstrument = paymentInstruments[i];

        if (PaymentInstrument.METHOD_GIFT_CERTIFICATE.equals(paymentInstrument.paymentMethod)) {
            invalid = false;
        }

        var paymentMethod = PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod());

        if (paymentMethod && applicablePaymentMethods.contains(paymentMethod)) {
            if (PaymentInstrument.METHOD_CREDIT_CARD.equals(paymentInstrument.paymentMethod)) {
                var cardType = convertCardTypeToDwFormat(paymentInstrument.creditCardType);
                var card = PaymentMgr.getPaymentCard(cardType);

                // Checks whether payment card is still applicable.
                if (card && applicablePaymentCards.contains(card)) {
                    invalid = false;
                }
            } else {
                invalid = false;
            }
        }

        if (invalid) {
            break; // there is an invalid payment instrument
        }
    }

    result.error = invalid;
    return result;
}

/*
* Check AD product in cart
*/
base.hasAutoDeliveryProductInBag = function hasAutoDeliveryProductInBag () {
    var Site = require('dw/system/Site');
    var hasADProduct = false;
	var hasSORProductInCart = null;
	if(Site.getCurrent().getCustomPreferenceValue('SorEnabled')){
		hasSORProductInCart = session.custom && session.custom.hasSORProducts;
	}
	if(hasSORProductInCart) {
		hasADProduct = true;
	}
	return hasADProduct;
}

/*
* Check User saved address
*/
base.checkUserSavedAddress = function checkUserSavedAddress() {
    var customer = session.customer;
	var hasSavedAddress = false;
    var geolocation = request.getGeolocation();
	var countryCode  = geolocation.getCountryCode();
	var enableADWarning = false;
	if(customer.authenticated && customer.registered && customer.addressBook && customer.addressBook.addresses && customer.addressBook.addresses.length > 0) {
		hasSavedAddress = true;
	}

	if(countryCode !== 'US' || !hasSavedAddress) {
		enableADWarning = true;
	}
	return enableADWarning;
}

/**
 * International shipping
 * @param shippingAddress
 * @returns {boolean}
 */
base.hasSavedInternationalShipping = function (shippingAddress) {
    var hasInterNationalShipping = false;
    if(shippingAddress.countryCode.value !== 'US') {
        hasInterNationalShipping = true;
    }
    return hasInterNationalShipping;
}
/*
 * Get Order Type
 */
base.getOrderType = function (cart) {

    var orderType = 'regular';
    var hasGiftCardItems = false;
    var hasRegularItems = false;

    if (cart && cart.getGiftCertificateLineItems() && cart.getGiftCertificateLineItems().size() > 0) {
        hasGiftCardItems = true;
    }

    if (cart && cart.getProductLineItems() && cart.getProductLineItems().size() > 0) {
        hasRegularItems = true;
    }

    if(hasGiftCardItems && !hasRegularItems) {
        orderType = 'giftcard';
    } else if(hasGiftCardItems && hasRegularItems) {
        orderType = 'mixed';
    } else {
        orderType = 'regular';
    }

    return orderType;
}

base.gcPaymentMethods = function (lineItemContainer) {
    var gcPIModel = require('*/cartridge/models/payment/gcPaymentMethod');

    var gcPIs = lineItemContainer.giftCertificatePaymentInstruments;
    var filteredPIs = [];
    collections.forEach(gcPIs, function (gcPI) {
        filteredPIs.push(new gcPIModel(gcPI));
    });
    return filteredPIs;
}

base.getNonGiftCertificateAmount = function (lineItemContainer) {
        var currencyCode = lineItemContainer ? lineItemContainer.getCurrencyCode() : "US";
        var giftCertTotal = new money(0.0, currencyCode);
        var gcPaymentInstrs = lineItemContainer.getGiftCertificatePaymentInstruments();
        var iter = gcPaymentInstrs.iterator();
        var orderPI = null;

        // Sums the total redemption amount.
        while (iter.hasNext()) {
            orderPI = iter.next();
            giftCertTotal = giftCertTotal.add(orderPI.getPaymentTransaction().getAmount());
        }

        // Gets the order total.
        var orderTotal = lineItemContainer.getTotalGrossPrice();

        // This is the remaining open order total that must be paid.
        var amountOpen = orderTotal.subtract(giftCertTotal);

        // Returns the open amount to be paid.
        return amountOpen.value;
}

base.getGcPaymentInstrumentId = function (lineItemContainer) {
    var gcPaymentInstrs = lineItemContainer.getGiftCertificatePaymentInstruments();
    var iter = gcPaymentInstrs.iterator();
    var paymentMethodId = '';
    while (iter.hasNext()) {
        var orderPI = iter.next();
        paymentMethodId = orderPI.paymentMethod;
    }
    return paymentMethodId;
}

base.checkApplicableCards = function () {
    var PaymentInstrument = require('dw/order/PaymentInstrument');
    var PaymentMgr = require('dw/order/PaymentMgr');

    var applicableCreditCards = false;

    if (customer.authenticated) {
        var profile = customer.profile;
        if (profile) {
            var paymentInstruments = profile.getWallet().getPaymentInstruments();
            for (var i = 0; i < paymentInstruments.length; i++) {
                var paymentInstrument = paymentInstruments[i];
                if (PaymentInstrument.METHOD_CREDIT_CARD.equals(paymentInstrument.paymentMethod)) {
                    applicableCreditCards = true;
                    break;
                }
            }
        }
    }
    return applicableCreditCards;
}

/**
 * Get the payment transaction amount
 * @param {dw.order.Basket} currentBasket - The current basket
 * @returns {Object} total - return the total amount for payment instruments.
 */
 function getTransactionAmount(basket){
    var total = new dw.value.Money(0, basket.getCurrencyCode());
    for each(var PI in basket.getPaymentInstruments()){
        total = total.add(PI.paymentTransaction.amount);
    }
    return total;
}

/**
 * Sets the payment transaction amount equals to order total.
 * @param {dw.order.Basket} currentBasket - The current basket
 * @returns {Boolean} flag to check the payment instruments amount is equal to order total or not.
 */
 function paymentAmountEqualsTotal(basket){
    var totalGrossPrice = basket.getTotalGrossPrice();
    var paymentInstruments = basket.getPaymentInstruments();
    if(totalGrossPrice.isAvailable() && paymentInstruments.size() > 0){
        var transactionAmount = getTransactionAmount(basket);
        if(transactionAmount.equals(totalGrossPrice)){
            return true;
        }
    }
    return false;
}

/**
 * Sets the payment transaction amount to paymentInstrument
 * @param {dw.order.Basket} currentBasket - The current basket
 * @returns {Object} an error object
 */
base.calculatePaymentTransaction = function (currentBasket) {
    var result = { error: false };
    if(!paymentAmountEqualsTotal(currentBasket)){
        try {
            // TODO: This function will need to account for gift certificates at a later date
            Transaction.wrap(function () {
                var paymentInstruments = currentBasket.paymentInstruments;

                if (!paymentInstruments.length) {
                    return;
                }

                // Assuming that there is only one payment instrument used for the total order amount.
                // TODO: Will have to rewrite this logic once we start supporting multiple payment instruments for same order
                var orderTotal = currentBasket.totalGrossPrice;
                var paymentInstrument = paymentInstruments[0];

                paymentInstrument.paymentTransaction.setAmount(orderTotal);
            });
        } catch (e) {
            result.error = true;
        }
    }
    return result;
}

/**
 * Adds address to basket
 *
 * @param {dw/customer/Customer} customer - customer for which the profile is set
 * @param {Object} preferredAddress - preferred address to be set in customer
 * @param {dw/order/PaymentInstrument} defaultPI - default Payment instrument to be set in customer
 * @param {dw/order/Basket} basket - current basket
 */
function addAddressToBasket(customer, preferredAddress, defaultPI, basket) {
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');

    var applicableShippingMethods, address = {};
    var billingAddress = basket.billingAddress;
    Transaction.wrap(function () {
        if (!billingAddress) {
            billingAddress = basket.createBillingAddress();
        }
        billingAddress.setFirstName(preferredAddress.firstName || '');
        billingAddress.setLastName(preferredAddress.lastName || '');
        billingAddress.setAddress1(preferredAddress.address1 || '');
        billingAddress.setAddress2(preferredAddress.address2 || '');
        billingAddress.setCity(preferredAddress.city || '');
        billingAddress.setPostalCode(preferredAddress.postalCode || '');
        billingAddress.setPhone(preferredAddress.phone || '');
        billingAddress.setCountryCode(preferredAddress.countryCode || '');
        billingAddress.setStateCode(preferredAddress.stateCode || '');
        basket.setCustomerEmail(customer.profile.email);
    });

    var shippingAddress = basket.defaultShipment.shippingAddress;
    Transaction.wrap(function () {
        if (!shippingAddress) {
            shippingAddress = basket.defaultShipment.createShippingAddress();
        }
        shippingAddress.setFirstName(preferredAddress.firstName || '');
        shippingAddress.setLastName(preferredAddress.lastName || '');
        shippingAddress.setAddress1(preferredAddress.address1 || '');
        shippingAddress.setAddress2(preferredAddress.address2 || '');
        shippingAddress.setCity(preferredAddress.city || '');
        shippingAddress.setPostalCode(preferredAddress.postalCode || '');
        shippingAddress.setPhone(preferredAddress.phone || '');
        shippingAddress.setCountryCode(preferredAddress.countryCode || '');
        shippingAddress.setStateCode(preferredAddress.stateCode || '');
    });

    var shipment = basket.defaultShipment;
    var shipping = shipment.shippingAddress;

    address.countryCode = !empty(shipping.countryCode) ? shipping.countryCode.value : ' ';
    address.stateCode = !empty(shipping.stateCode) ? shipping.stateCode.value : ' ';
    address.postalCode = !empty(shipping.postalCode) ? shipping.postalCode.value : ' ';
    address.city = !empty(shipping.city) ? shipping.city.value : ' ';
    address.address1 = !empty(shipping.address1) ? shipping.address1.value : ' ';
    address.address2 = !empty(shipping.address2) ? shipping.address2.value : '';

    applicableShippingMethods = ShippingMgr.getShipmentShippingModel(shipment).getApplicableShippingMethods(address);
    var filteredShipping = ShippingHelper.getFilteredShippingMethod(applicableShippingMethods);
    Transaction.wrap(function () {
        basket.getDefaultShipment().setShippingMethod(filteredShipping);
        basketCalculationHelpers.calculateTotals(basket);
    });

    Transaction.wrap(function () {
        var paymentInstruments = basket.getPaymentInstruments();

        collections.forEach(paymentInstruments, function (item) {
            basket.removePaymentInstrument(item);
        });

        var paymentInstrument = basket.createPaymentInstrument(
            PaymentInstrument.METHOD_CREDIT_CARD, basket.totalGrossPrice
        );

        paymentInstrument.setCreditCardHolder(defaultPI.getCreditCardHolder());
        paymentInstrument.setCreditCardType(defaultPI.getCreditCardType());
        paymentInstrument.setCreditCardNumber(defaultPI.getCreditCardNumber());
        paymentInstrument.setCreditCardExpirationMonth(defaultPI.getCreditCardExpirationMonth());
        paymentInstrument.setCreditCardExpirationYear(defaultPI.getCreditCardExpirationYear());
        paymentInstrument.setCreditCardToken(defaultPI.getCreditCardToken());
        var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.paymentMethod).getPaymentProcessor();
        paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
    });
}

base.eligibleForExpressCheckout = function (customer, basket, req, res) {
    var selectedAddressID = '';
    if (!customer.authenticated) {
        return false;
    }
    if (!customer.profile) {
        return false;
    }
    //session.custom.NoCall = true;
    var preferredAddress = customer.addressBook ? customer.addressBook.preferredAddress : null;

    selectedAddressID = (session.custom.selectedShippingAddress) ? session.custom.selectedShippingAddress : '';

    // Set the selected if exists in session
    if(empty(selectedAddressID)) {
        selectedAddressID = preferredAddress.ID;
        session.custom.selectedShippingAddress = preferredAddress.ID;
    } else if (!empty(selectedAddressID)) {
        preferredAddress = customer.addressBook.getAddress(selectedAddressID);
    }

    if (!preferredAddress) {
        res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'shipping'));
    }
    var paymentInstruments = customer.profile && customer.profile.wallet ? customer.profile.wallet.paymentInstruments : null;
    if (!paymentInstruments || paymentInstruments.getLength() === 0) {
        res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment'));
        return false;
    }
    var iterator = paymentInstruments.iterator();
    var defaultPI;
    while (iterator.hasNext()) {
        var item = iterator.next();
        if ('braintreeDefaultCard' in item.custom && item.custom.braintreeDefaultCard) {
            defaultPI = item;
        }
    }
    if (!defaultPI) {
        res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment'));
        return false;
    }
    /*
	* For old saved cards(SG), the token was stored in : paymentInstrument.custom.braintreePaymentMethodToken,
	* the same is  copied to the new field :paymentInstrument.creditCardToken, as SFRA uses this field
	* **/
	if((empty(defaultPI.creditCardToken) || defaultPI.creditCardToken == null) && !empty(defaultPI.custom.braintreePaymentMethodToken)) {
	    Transaction.wrap(function () {
	        defaultPI.creditCardToken = defaultPI.custom.braintreePaymentMethodToken;
	    });
	}
    var expirationMonth = defaultPI.getCreditCardExpirationMonth();
    var expirationYear = defaultPI.getCreditCardExpirationYear();
    var currentDate = new Date();
    if (expirationYear < currentDate.getFullYear()) {
        res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment'));
        return false;
    }
    if ((expirationYear === currentDate.getFullYear()) && expirationMonth < currentDate.getMonth()) {
        res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment'));
        return false;
    }
    addAddressToBasket(customer, preferredAddress, defaultPI, basket);

    return true;
};

base.handleAfterpayValidation = function(currentBasket){
    var result = { error: false };
    var apMinThreshold = Site.getCurrent().getCustomPreferenceValue('apMinThresholdAmount');
    var apMaxThreshold = Site.getCurrent().getCustomPreferenceValue('apMaxThresholdAmount')
    if(currentBasket.getDefaultShipment().shippingAddress.countryCode.value !== 'US' &&
        currentBasket.getTotalGrossPrice().value < apMinThreshold && currentBasket.getTotalGrossPrice().value > apMaxThreshold){
        result.error = true;
    }else{
        try {
            var AfterpayUtilities = require('*/cartridge/scripts/util/afterpayUtilities.js').getAfterpayCheckoutUtilities();
            var paymentTransaction = AfterpayUtilities.getPaymentTransaction(currentBasket);

            if (empty(paymentTransaction)) {
                throw new InternalError('Can not find payment transaction');
            }

            dw.system.Logger.debug('Payment status after token generation : ' + session.privacy.afterpaytoken);
            Transaction.wrap(function () {
                paymentTransaction.custom.apInitialStatus = "SUCCESS";
                paymentTransaction.custom.apToken = session.privacy.afterpaytoken;
            });

            //setting phone number incase customer updated in shipping page
            if(!empty(currentBasket.getDefaultShipment().getShippingAddress())){
                var billingAddress = currentBasket.getBillingAddress();
                if(!empty(billingAddress)){
                    Transaction.wrap(function () {
                        billingAddress.setPhone(currentBasket.getDefaultShipment().getShippingAddress().getPhone());
                    });
                }
            }
        }catch (e) {
            result.error = true;
        }
    }
    return result;
}

base.setGeoLocBasedShippingMethod = function () {
    var shippingHelpers = require('*/cartridge/scripts/checkout/shippingHelpers');
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    var BasketMgr = require('dw/order/BasketMgr');
    var Transaction = require('dw/system/Transaction');
    var currentBasket = BasketMgr.getCurrentBasket();
    var shipment = currentBasket.defaultShipment;
    var applicableShippingMethods, address = {};
    var geoCountry = request.getGeolocation().getCountryCode();
    var availableShippingMethod;
     if (shipment && !shippingHelpers.isEmptyAddress(shipment)) {
        applicableShippingMethods = shippingHelpers.getApplicableShippingMethods(shipment, null);
        if (applicableShippingMethods && applicableShippingMethods.length > 0) {
	        address.countryCode = request.getGeolocation().getCountryCode();
	        applicableShippingMethods = ShippingMgr.getShipmentShippingModel(shipment).getApplicableShippingMethods(address);
            var filteredShipping = shippingHelpers.getFilteredShippingMethod(applicableShippingMethods);
            var shippingMethodID = filteredShipping.ID;
	        Transaction.wrap(function () {
                if(empty(shipment.shippingAddress)){
                    shipment.createShippingAddress();
                }
                shipment.shippingAddress.setCountryCode(geoCountry);
                shippingHelpers.selectShippingMethod(shipment, shippingMethodID, applicableShippingMethods, address);
	            basketCalculationHelpers.calculateTotals(currentBasket);
	        });
		}
     }else if(shipment && !empty(shipment.shippingAddress) && !customer.authenticated && !customer.registered){
        var shipping = shipment.shippingAddress;
        var changeDefaultShipping = true;
        var defaultShipment = currentBasket.getDefaultShipment();
        if(defaultShipment && defaultShipment.shippingMethodID){
            var selectedShippingMethod = defaultShipment.shippingMethodID;

            address.countryCode = !empty(shipping.countryCode) ? shipping.countryCode.value : ' ';
            address.stateCode = !empty(shipping.stateCode) ? shipping.stateCode.value : ' ';
            address.postalCode = !empty(shipping.postalCode) ? shipping.postalCode.value : ' ';
            address.city = !empty(shipping.city) ? shipping.city.value : ' ';
            address.address1 = !empty(shipping.address1) ? shipping.address1.value : ' ';
            address.address2 = !empty(shipping.address2) ? shipping.address2.value : '';

            var availableShippingMethods = shippingHelpers.getApplicableShippingMethods(shipment, address);
            if(availableShippingMethods && availableShippingMethods.length > 0){
                for each( availableShippingMethod in availableShippingMethods ) {
                    if(availableShippingMethod.ID && availableShippingMethod.ID == selectedShippingMethod){
                        changeDefaultShipping = false;
                    }
                }
            }
            if(changeDefaultShipping){
                applicableShippingMethods = ShippingMgr.getShipmentShippingModel(currentBasket.getDefaultShipment()).getApplicableShippingMethods(address);
                var filteredShipping = ShippingHelper.getFilteredShippingMethod(applicableShippingMethods);
                // Set the filteredShipping.
                Transaction.wrap(function () {
                    currentBasket.getDefaultShipment().setShippingMethod(filteredShipping);
                    basketCalculationHelpers.calculateTotals(currentBasket);
                });
            }
        }

     }
}

base.placeOrder = function (order, fraudDetectionStatus) {
    var Transaction = require('dw/system/Transaction');
    var OrderMgr = require('dw/order/OrderMgr');
    var Status = require('dw/system/Status');
    var Order = require('dw/order/Order');
    var result = { error: false };

    try {
        Transaction.begin();
        var placeOrderStatus = OrderMgr.placeOrder(order);
        if (placeOrderStatus === Status.ERROR) {
            throw new Error();
        }

        if (fraudDetectionStatus.status === 'flag') {
            order.setConfirmationStatus(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
        } else {
            order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
        }

        /* Signifyd Modification Start */
        var signifyEnabled = dw.system.Site.getCurrent().getCustomPreferenceValue('SignifydEnableCartridge');
        var signifydHoldOrderEnable = dw.system.Site.getCurrent().getCustomPreferenceValue('SignifydHoldOrderEnable');

        if (signifyEnabled) {
            if (signifydHoldOrderEnable === true) {
                order.setExportStatus(Order.EXPORT_STATUS_NOTEXPORTED);
            } else {
                order.setExportStatus(Order.EXPORT_STATUS_READY);
            }
        } else {
            order.setExportStatus(Order.EXPORT_STATUS_READY);
        }
         /* Signifyd Modification End */

        var paymentInstruments = order.paymentInstruments;
        var paymentInstrumentSize = paymentInstruments.size();
        //If Paypal only, set order status to export ready.
        if((paymentInstrumentSize == 1 && (paymentInstruments[0].paymentMethod == 'PayPal' || paymentInstruments[0].paymentMethod == 'GIFT_CERTIFICATE' || paymentInstruments[0].paymentMethod == 'AFTERPAY_PBI')) || ((order.getTotalNetPrice().value === 0.00 || order.getTotalNetPrice().value === 0) && order.priceAdjustments.size() > 0)) {
            order.setExportStatus(Order.EXPORT_STATUS_READY);
        }

        Transaction.commit();
    } catch (e) {
        var a = e;
        Transaction.wrap(function () { OrderMgr.failOrder(order); });
        result.error = true;
    }

    return result;
}

base.clearSessionVariables = function () {
    delete session.privacy.afterpaytoken;
    delete session.custom.taxString;
    delete session.custom.selectedShippingAddress;
    delete session.custom.apAddressEdit;
    delete session.privacy.apchecksum;
    delete session.custom.taxError;
    delete session.custom.selectedShippingAddress;
  	delete session.custom.NoCall;
	delete session.custom.SkipCall;
}

module.exports = base;
