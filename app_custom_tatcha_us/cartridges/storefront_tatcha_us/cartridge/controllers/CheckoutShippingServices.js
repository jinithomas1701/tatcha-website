/**
 * Extension to default CheckoutShippingServices controller to provide custom
 * implementation for Address validation on shipping page for single shipment.
 * @module  controllers/CheckoutShippingServices
 */

'use strict';

var server = require('server');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var Site = require('dw/system/Site');
var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');

server.extend(module.superModule);

server.prepend('SubmitShipping',
    function (req, res, next) {

    //to reduce number of tax calls
    session.custom.NoCall = false;
    return next();
});

server.append('SubmitShipping',
	server.middleware.https,
	csrfProtection.validateAjaxRequest,
	function (req, res, next) {
		var AccountModel = require('*/cartridge/models/account');
		var Transaction = require('dw/system/Transaction');
		var BasketMgr = require('dw/order/BasketMgr');
        var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
        var ShippingHelper = require('*/cartridge/scripts/checkout/shippingHelpers');
        var OrderModel = require('*/cartridge/models/order');
        var Locale = require('dw/util/Locale');
		var currentBasket = BasketMgr.getCurrentBasket();
        var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');

        var URLUtils = require('dw/web/URLUtils');
		this.on('route:BeforeComplete', function (req, res) {
			var form = server.forms.getForm('shipping');
            var httpParameters = req.httpParameterMap;
			var email = form.shippingAddress.addressFields.emailaddress.value? form.shippingAddress.addressFields.emailaddress.value:
                (req.currentCustomer.profile? req.currentCustomer.profile.email: '');

			Transaction.wrap(function () {
				currentBasket.setCustomerEmail(email);
			});
			var accountModel = new AccountModel(req.currentCustomer);
			var viewData = res.getViewData();
			viewData.customer = accountModel;

            if (viewData.shippingMethod) {
                var shippingMethodSelected = viewData.shippingMethod;
                ShippingHelper.setSelectedShippingMethodToDefaultShipment(shippingMethodSelected);
            }

            // Copy over first shipping address (use shipmentUUID for matching)
            COHelpers.copyBillingAddressToBasket(
                currentBasket.defaultShipment.shippingAddress, currentBasket);
            var currentLocale = Locale.getLocale(req.locale.id);
            var basketModel = new OrderModel(
                currentBasket,
                {
                    usingMultiShipping: false,
                    shippable: true,
                    countryCode: currentLocale.country,
                    containerView: 'basket'
                }
            );
            viewData.order = basketModel;
            var showAfterpayPayment = require('*/cartridge/scripts/util/afterpayUtils').showAfterpayPayment();
            if (httpParameters.editMode && httpParameters.editMode.value === 'true') {
                var paymentInfo = '';
                var hasAfterPayPI = checkAfterPayPI(currentBasket);
                if (hasAfterPayPI === true) {
                    session.custom.apAddressEdit = true;
                    if(!showAfterpayPayment || currentBasket.getDefaultShipment().shippingAddress.countryCode.value !== 'US'){
                        session.custom.apAddressEdit = false;
                        hasAfterPayPI = false;
                        //removing Afterpay PI from basket
                        Transaction.wrap(function () {
                            currentBasket.removePaymentInstrument(currentBasket.paymentInstruments[0]);
                        });
                        res.json({
                            currentStage: 'payment',
                            editMode: 'true',
                            redirectUrl: URLUtils.url('Checkout-Begin', 'stage', 'payment').toString()
                        });
                    }
                } else {
                    paymentInfo = getPaymentInfo(req, currentBasket);
                }
                if (paymentInfo.validPayment || hasAfterPayPI === true) {
                    res.json({
                        currentStage: 'placeOrder',
                        editMode: 'true',
                        redirectUrl: URLUtils.url('Checkout-Begin', 'stage', 'placeOrder').toString()
                    });
                }
            }
            viewData.showAfterpayPayment = showAfterpayPayment;

            // re-validate giftcertificate PI
            cartHelper.revalidateGiftCertificatePayment(currentBasket);
            Transaction.wrap(function () {
                if (!cartHelper.calculatePaymentTransactionTotal(currentBasket)) {
                    res.json({
                        currentStage: 'payment',
                        editMode: 'true',
                        redirectUrl: URLUtils.url('Checkout-Begin', 'stage', 'payment').toString()
                    });
                }
            });
		});
		return next();
	});

server.append('UpdateShippingMethodsList', server.middleware.https, function (req, res, next) {
    var viewData = res.getViewData();
    var BasketMgr = require('dw/order/BasketMgr');
    var ShippingMgr = require('dw/order/ShippingMgr');
    var Transaction = require('dw/system/Transaction');
    var currentBasket = BasketMgr.getCurrentBasket();
    var continueDisable = false;
    var applicableShippingMethods;
    var checkoutHelper = require('*/cartridge/scripts/checkout/checkoutHelpers');
    var ShippingHelper = require('*/cartridge/scripts/checkout/shippingHelpers');
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    var OrderModel = require('*/cartridge/models/order');

    //session.custom.NoCall = true;
    var address = ShippingHelper.getAddressFromRequest(req);
    var shipping = currentBasket.getDefaultShipment().getShippingAddress() || currentBasket.getDefaultShipment().createShippingAddress();
     var updateShippingMethod = true;
    if(address.countryCode&&shipping.getCountryCode()&&address.countryCode == shipping.getCountryCode()){
        updateShippingMethod = false;
    }
    Transaction.wrap(function () {
        shipping.setFirstName(address.firstName ? address.firstName : '');
        shipping.setLastName(address.lastName ? address.lastName : '');
        shipping.setAddress1(address.address1 ? address.address1 : '');
        shipping.setAddress2(address.address2 ? address.address2 : '');
        shipping.setCity(address.city ? address.city : '');
        shipping.setPostalCode(address.postalCode ? address.postalCode : '');
        shipping.setStateCode(address.stateCode ? address.stateCode : '');
        shipping.setCountryCode(address.countryCode ? address.countryCode : '');
        shipping.setPhone(address.phone ? address.phone : '');
        basketCalculationHelpers.calculateTotals(currentBasket);
    });

    var addressShipping = {};

    addressShipping.countryCode = address.countryCode;
    addressShipping.stateCode = address.stateCode ? address.stateCode : '';
    addressShipping.postalCode = address.postalCode ? address.postalCode : '';
    addressShipping.city = address.city ? address.city : '';
    addressShipping.address1 = address.address1 ? address.address1 : '';
    addressShipping.address2 = address.address2 ? address.address2 : '';
    if(updateShippingMethod){
        applicableShippingMethods = ShippingMgr.getShipmentShippingModel(currentBasket.getDefaultShipment()).getApplicableShippingMethods(addressShipping);
        var filteredShipping = ShippingHelper.getFilteredShippingMethod(applicableShippingMethods);
        // Set the filteredShipping.
        Transaction.wrap(function () {
            currentBasket.getDefaultShipment().setShippingMethod(filteredShipping);
            basketCalculationHelpers.calculateTotals(currentBasket);
        });
    }
    var basketModel = new OrderModel(
        currentBasket,
        { usingMultiShipping: false, countryCode: address.countryCode, containerView: 'basket' }
    );

    var params = request.httpParameterMap;
    var selectedAddressID = !empty(params.selectedAddressId) ? params.selectedAddressId.value : '';

    if (!empty(selectedAddressID)) {
        session.custom.selectedShippingAddress = selectedAddressID;
    }

    //check for AD products in bag
    var hasRefillProducts = checkoutHelper.hasAutoDeliveryProductInBag();
    if(hasRefillProducts && currentBasket.getDefaultShipment().getShippingAddress().getCountryCode().getValue() !== 'US'){
        continueDisable = true;
    }
    viewData.continueDisable = continueDisable;
    viewData.order = basketModel;
    res.setViewData(viewData);
    return next();
});

server.append('SelectShippingMethod', function (req, res, next) {
    var checkoutHelper = require('*/cartridge/scripts/checkout/checkoutHelpers');
    var BasketMgr = require('dw/order/BasketMgr');
    var currentBasket = BasketMgr.getCurrentBasket();
    this.on('route:BeforeComplete', function (req, res) {
        var viewData = res.getViewData();
        var continueDisable = false;
        //check for AD products in bag
        var hasRefillProducts = checkoutHelper.hasAutoDeliveryProductInBag();
        if(hasRefillProducts && currentBasket.getDefaultShipment().getShippingAddress().getCountryCode().getValue() !== 'US'){
            continueDisable = true;
        }
        viewData.continueDisable = continueDisable;
        res.setViewData(viewData);
    });
    return next();
});

function getPaymentInfo(req, basket) {
    var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
    var paymentInfo = {};
    var validPayment = COHelpers.validatePayment(req, basket);
    paymentInfo.validPayment = validPayment.error ? false : true;
    return paymentInfo;
}

function checkAfterPayPI(basket) {
    var hasAfterPayPI = false;
    var iter = basket.getPaymentInstruments().iterator();
    var apPaymentInstrument = '';
    while (iter.hasNext()) {
        apPaymentInstrument = iter.next();
        if (apPaymentInstrument.paymentMethod === 'AFTERPAY_PBI') {
            hasAfterPayPI = true;
            break;
        }
    }
    return hasAfterPayPI;
}

server.get('RemoveGiftMessage', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var currentBasket = BasketMgr.getCurrentBasket();
    var Transaction = require('dw/system/Transaction');
    //session.custom.NoCall = true;
    Transaction.wrap(function () {
        currentBasket.getDefaultShipment().setGift(false);
        currentBasket.getDefaultShipment().setGiftMessage(null);
        basketCalculationHelpers.calculateTotals(currentBasket);
    });
    res.json({
        success: true
    });
    return next();
});

/*
 Controller for adding GIFT WRAP / GIFT MSG
 */
server.post('SaveGiftWrapAndMessage', function (req, res, next) {
    var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
    var BasketMgr = require('dw/order/BasketMgr');
    var Locale = require('dw/util/Locale');
    var OrderModel = require('*/cartridge/models/order');
    var giftMessage = dw.util.StringUtils.trim((req.form.giftMessage)?req.form.giftMessage:'');
    var addGift = req.form.addGift;
    var scope = req.form.scope;
    //session.custom.NoCall = true;

    var giftWrapId = dw.system.Site.getCurrent().getCustomPreferenceValue('GiftWrapId');
    var currentBasket = BasketMgr.getCurrentBasket();

    if(giftWrapId && currentBasket) {
        var Transaction = require('dw/system/Transaction');
        var giftWrapProduct = dw.catalog.ProductMgr.getProduct(giftWrapId);
        var matchingProductObj = cartHelper.getMatchingProducts(giftWrapProduct.ID, currentBasket.productLineItems);

        // Check if already exists
        var giftWrapExistsInCart = false;
        if (matchingProductObj.matchingProducts.length > 0) {
            giftWrapExistsInCart = true;
        }

        // Check add/delete
        if(addGift){
            if(!giftWrapExistsInCart){
                Transaction.wrap(function () {
                    cartHelper.addProductToCart(currentBasket,giftWrapProduct.ID,1,[],[]);
                });
            }
        } else {
            if(giftWrapExistsInCart){
                for (var i = 0; i < matchingProductObj.matchingProducts.length; i++) {
                    Transaction.wrap(function () {
                        currentBasket.removeProductLineItem(matchingProductObj.matchingProducts[i]);
                    });
                }
            }
        }

        // Update Gift Message
        Transaction.wrap(function () {
            currentBasket.getDefaultShipment().setGift(true);
            currentBasket.getDefaultShipment().setGiftMessage(giftMessage);
            basketCalculationHelpers.calculateTotals(currentBasket);
        });
    }
    var currentLocale = Locale.getLocale(req.locale.id);
    var basketModel = new OrderModel(
        currentBasket,
        {
            usingMultiShipping: false,
            shippable: true,
            countryCode: 'US',
            containerView: 'basket'
        }
    );
    if (scope === 'shipping') {
        res.json({
            success: true,
            order: basketModel
        });
        return next();
    }
});

/*
 Controller for updating the total while edit
 */
server.get('UpdateTotalsOnEdit', server.middleware.https, function (req, res, next) {
    var Transaction = require('dw/system/Transaction');
    var BasketMgr = require('dw/order/BasketMgr');
    var Locale = require('dw/util/Locale');
    var OrderModel = require('*/cartridge/models/order');
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');

    var currentBasket = BasketMgr.getCurrentBasket();

    // Calculate the basket
    Transaction.wrap(function () {
        session.custom.NoCall = true;
        basketCalculationHelpers.calculateTotals(currentBasket);
    });

    var currentLocale = Locale.getLocale(req.locale.id);
    var basketModel = new OrderModel(
        currentBasket,
        {
            usingMultiShipping: false,
            shippable: true,
            countryCode: currentLocale.country,
            containerView: 'basket'
        }
    );

    /**
     * Afterpay threshold check
     * @type {boolean}
     */
    var showAfterpayPayment = false;
    showAfterpayPayment = require('*/cartridge/scripts/util/afterpayUtils').showAfterpayPayment();
    if (!empty(currentBasket.getDefaultShipment()) && currentBasket.getDefaultShipment().shippingAddress && !empty(currentBasket.getDefaultShipment().shippingAddress.countryCode)) {
        if (currentBasket.getDefaultShipment().shippingAddress.countryCode.value === 'US' && showAfterpayPayment) {
            showAfterpayPayment = true;
        } else {
            showAfterpayPayment = false;
        }
    }

    res.json({
        order: basketModel,
        showAfterpayPayment: showAfterpayPayment
    });
    return next();
})

server.post('UpdateCustomerEmail', server.middleware.https, csrfProtection.validateAjaxRequest, function (req, res, next) {
	var Transaction = require('dw/system/Transaction');
	var BasketMgr = require('dw/order/BasketMgr');
	var currentBasket = BasketMgr.getCurrentBasket();
    var URLUtils = require('dw/web/URLUtils');
	this.on('route:BeforeComplete', function (req, res) {
		var form = server.forms.getForm('shipping');
		var email = form.shippingAddress.addressFields.emailaddress.value? form.shippingAddress.addressFields.emailaddress.value:
            (req.currentCustomer.profile? req.currentCustomer.profile.email: '');

		Transaction.wrap(function () {
			currentBasket.setCustomerEmail(email);
		});

        var paymentInfo = '';
        paymentInfo = getPaymentInfo(req, currentBasket);

        if (paymentInfo.validPayment) {
            res.json({
                currentStage: 'placeOrder',
                editMode: 'true',
                redirectUrl: URLUtils.url('Checkout-Begin', 'stage', 'placeOrder').toString()
            });
        } else {
            res.json({
                currentStage: 'payment',
                editMode: 'false',
                email: email,
                redirectUrl: URLUtils.url('Checkout-Begin', 'stage', 'payment').toString()
            });
        }
	});
	return next();
});

module.exports = server.exports();
