'use strict';

var page = module.superModule;

var server = require('server');
var URLUtils = require('dw/web/URLUtils');
var Site = require('dw/system/Site');
var Resource = require('dw/web/Resource');

var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var {
    createBillingFormFields,
    getAccountFormFields,
    getAccountNameFields,
} = require('*/cartridge/scripts/braintree/helpers/paymentHelper');
var prefs = require('*/cartridge/config/braintreePreferences');

var {
    createBraintreePayPalButtonConfig,
    createBraintreeApplePayButtonConfig,
    createBraintreeVenmoButtonConfig,
    createBraintreeLocalPaymentMethodButtonConfig,
    createBraintreeGooglePayButtonConfig,
    createBraintreeSrcButtonConfig
} = require('*/cartridge/scripts/braintree/helpers/buttonConfigHelper');

var {
    createGooglepayConfig,
    createSrcConfig,
    createCreditCardConfig,
    createPaypalConfig,
    createVenmoConfig
} = require('*/cartridge/scripts/braintree/helpers/paymentConfigHelper');

var btBusinessLogic = require('*/cartridge/scripts/braintree/braintreeAPI/braintreeBusinessLogic');
var prefs = require('*/cartridge/config/braintreePreferences');
var braintreeConstants = require('*/cartridge/scripts/util/braintreeConstants');
var braintreeUtil = require('*/cartridge/scripts/util/braintreeUtil.js');

function getSFRACheckoutFormFields() {
    return getAccountFormFields(createBillingFormFields(), {
        firstName: '',
        lastName: '',
        address1: '',
        address2: '',
        city: '',
        postalCode: '',
        stateCode: '',
        country: '',
        email: '',
        phone: '',
        paymentMethod: ''
    });
}

/**
 * Gets Array with SFRA Checkout, Form Fields Names
 * @returns {Function} Array with valid checkout Form Fields Names
 */
function getSFRABillingFormFieldsNames() {
    return getAccountNameFields(createBillingFormFields(), {
        firstName: '',
        lastName: '',
        address1: '',
        address2: '',
        city: '',
        postalCode: '',
        stateCode: '',
        country: '',
        email: '',
        phone: ''
    });
}

/**
 * Creates config Brantree hosted fields
 * @param {Response} res Response system object
 * @param {string} clientToken Braintree clientToken
 * @returns {Object} hosted fields config object
 */
function createHostedFieldsConfig(res, clientToken) {
    var isEnable3dSecure = prefs.is3DSecureEnabled;
    var billingData = res.getViewData();
    var cardForm = billingData.forms.billingForm.creditCardFields;

    return {
        paymentMethodName: prefs.paymentMethods.BRAINTREE_CREDIT.paymentMethodId,
        is3dSecureEnabled: isEnable3dSecure,
        isFraudToolsEnabled: prefs.isFraudToolsEnabled,
        isSkip3dSecureLiabilityResult: prefs.is3DSecureSkipClientValidationResult,
        clientToken: clientToken,
        messages: {
            validation: Resource.msg('braintree.creditcard.error.validation', 'locale', null),
            secure3DFailed: Resource.msg('braintree.creditcard.error.secure3DFailed', 'locale', null),
            HOSTED_FIELDS_FIELDS_EMPTY: Resource.msg('braintree.creditcard.error.HOSTED_FIELDS_FIELDS_EMPTY', 'locale', null),
            HOSTED_FIELDS_FIELDS_INVALID: Resource.msg('braintree.creditcard.error.HOSTED_FIELDS_FIELDS_INVALID', 'locale', null),
            HOSTED_FIELDS_FAILED_TOKENIZATION: Resource.msg('braintree.creditcard.error.HOSTED_FIELDS_FAILED_TOKENIZATION', 'locale', null),
            HOSTED_FIELDS_TOKENIZATION_NETWORK_ERROR: Resource.msg('braintree.creditcard.error.HOSTED_FIELDS_TOKENIZATION_NETWORK_ERROR', 'locale', null),
            CLIENT_REQUEST_TIMEOUT: Resource.msg('braintree.error.CLIENT_REQUEST_TIMEOUT', 'locale', null),
            CLIENT_GATEWAY_NETWORK: Resource.msg('braintree.error.CLIENT_GATEWAY_NETWORK', 'locale', null),
            CLIENT_REQUEST_ERROR: Resource.msg('braintree.error.CLIENT_REQUEST_ERROR', 'locale', null),
            CLIENT_MISSING_GATEWAY_CONFIGURATION: Resource.msg('braintree.error.CLIENT_MISSING_GATEWAY_CONFIGURATION', 'locale', null)
        },
        amount: 0,
        fieldsConfig: {
            initOwnerValue: '',
            ownerHtmlName: cardForm.cardOwner.htmlName,
            typeHtmlName: cardForm.cardType.htmlName,
            numberHtmlName: cardForm.cardNumber.htmlName,
            expirationMonth: cardForm.expirationMonth.htmlName,
            expirationYear: cardForm.expirationYear.htmlName
        }
    };
}


server.extend(page);
server.prepend('Begin', function (req, res, next) {
    const hasSorProductsInBag = session.custom && session.custom.hasSORProducts;
    if(hasSorProductsInBag && !customer.authenticated && !customer.registered){
        response.redirect(URLUtils.https('CartSFRA-Show').append('hasadproducts', 'true'));
    }

    // custom code CartSFRA start
    var BasketMgr = require('dw/order/BasketMgr');
    var validationHelpers = require('*/cartridge/scripts/helpers/basketValidationHelpers');
    var ShippingHelper = require('*/cartridge/scripts/checkout/shippingHelpers');
    var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
    var currentBasket = BasketMgr.getCurrentBasket();
    if (!currentBasket) {
        res.redirect(URLUtils.url('CartSFRA-Show'));
    }

    var validatedProducts = validationHelpers.validateProducts(currentBasket);
    if (validatedProducts.error) {
        res.redirect(URLUtils.url('CartSFRA-Show'));
    }
    //reduce tax calls
    var currentStage = req.querystring.stage;
    
    if(currentStage === 'payment' || currentStage === 'placeOrder'){
        session.custom.NoCall = false;
    }else{
        session.custom.NoCall = true;
    }

    // custom code CartSFRA end

    next();
});

server.append('Begin', function (req, res, next) {
    var UUIDUtils = require('dw/util/UUIDUtils');
    var Locale = require('dw/util/Locale');
    var viewData = res.getViewData();
    var BasketMgr = require('dw/order/BasketMgr');
    var Transaction = require('dw/system/Transaction');
    var currentBasket = BasketMgr.getCurrentBasket();
    var OrderModel = require('*/cartridge/models/order');
    var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
    var ShippingHelper = require('*/cartridge/scripts/checkout/shippingHelpers');
    var hasAutoDeliveryProduct = false;


    if (viewData.currentStage === 'customer') {
        viewData.currentStage = 'shipping';
    }

    /**
     * Create customer on braintree end, if not already created
     * User will be created only if registered and the profile field(braintreeCustomerId) is empty
     */
    try {
        braintreeUtil.checkAndCreateCustomer();
    } catch (e) {

    }

    viewData.giftWrapEnabled = false;
    var giftWrapId = dw.system.Site.getCurrent().getCustomPreferenceValue('GiftWrapId');
    if(giftWrapId){
        var giftWrapProduct = dw.catalog.ProductMgr.getProduct(giftWrapId);
        if(giftWrapProduct && giftWrapProduct.onlineFlag){
            var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
            var checkoutHelper = require('*/cartridge/scripts/checkout/checkoutHelpers');
            var giftWrapExistsInCart = false;
            var giftMessage = currentBasket.getDefaultShipment().getGiftMessage();

            var matchingProductObj =  cartHelper.getMatchingProducts(giftWrapProduct.ID, currentBasket.productLineItems);
            if (matchingProductObj.matchingProducts.length > 0) {
                giftWrapExistsInCart = true;
            }

            // Remove gift wrap and message if cart is empty or has only GIFT WRAP
            if(giftWrapExistsInCart && (currentBasket.productLineItems.length <= 1)){
                for (var i = 0; i < matchingProductObj.matchingProducts.length; i++) {
                    Transaction.wrap(function () {
                        currentBasket.removeProductLineItem(matchingProductObj.matchingProducts[i]);
                    });
                }

                Transaction.wrap(function () {
                    currentBasket.getDefaultShipment().setGiftMessage('');
                });
                giftWrapExistsInCart = false;
            }
            var showAdWarning = false;
            if (customer.authenticated && customer.registered) {
                hasAutoDeliveryProduct = checkoutHelper.hasAutoDeliveryProductInBag();
	            var usersCountry = checkoutHelper.checkUserSavedAddress();
	            showAdWarning = hasAutoDeliveryProduct && usersCountry;

                if (!empty(currentBasket.getDefaultShipment()) && currentBasket.getDefaultShipment().shippingAddress && !empty(currentBasket.getDefaultShipment().shippingAddress.countryCode)) {
                    if (currentBasket.getDefaultShipment().shippingAddress.countryCode.value != 'US' && hasAutoDeliveryProduct) {
                        showAdWarning = true;
                    } else {
                        showAdWarning = false;
                    }
                }
            }
            var orderType = COHelpers.getOrderType(currentBasket);
            var showInternationShipmentMsg = false;
            var defaultShipping = currentBasket.getDefaultShipment() && currentBasket.getDefaultShipment().shippingAddress && currentBasket.getDefaultShipment().shippingAddress.countryCode && currentBasket.getDefaultShipment().shippingAddress.countryCode.value;
            if (orderType !== 'giftcard' &&  defaultShipping != 'US') {
                showInternationShipmentMsg = true;
            }
            viewData.giftWrapExistsInCart = giftWrapExistsInCart;
            viewData.giftWrapDetails = cartHelper.getGiftWrapProductDetails(currentBasket,giftWrapProduct);
            viewData.giftMessage = giftMessage;
            viewData.giftWrapEnabled = true;
            viewData.giftwrapEligibility = cartHelper.giftWrapEligibility(currentBasket, giftWrapId);
        }
    }
    if(viewData.currentStage === 'shipping'){
        //setting default address and shipping in cart
        if(customer.authenticated && customer.registered && customer.addressBook.preferredAddress && !(currentBasket.paymentInstruments.length && (currentBasket.paymentInstruments[0].paymentMethod === 'PayPal' || currentBasket.paymentInstruments[0].paymentMethod === 'AFTERPAY_PBI' || currentBasket.paymentInstruments[0].paymentMethod === 'ApplePay'))){
            if(session.custom.selectedShippingAddress){
                for (var j = 0; j < customer.addressBook.addresses.length; j++) {
                    if(customer.addressBook.addresses[j].ID == session.custom.selectedShippingAddress){
                        COHelpers.copyCustomerAddressToShipment(customer.addressBook.addresses[j]);
                    }
                }
            }else {
                COHelpers.copyCustomerAddressToShipment(customer.addressBook.preferredAddress);
            }
            if(!empty(currentBasket)){
                var shipment = currentBasket.getDefaultShipment();
                var shipping = shipment.shippingAddress;
                var address = ShippingHelper.addressFormat(shipping);
                var applicableShippingMethods = ShippingHelper.getApplicableShippingMethods(shipment,address);
                if(!empty(applicableShippingMethods[0]) && !empty(applicableShippingMethods[0].ID)){
                    ShippingHelper.setSelectedShippingMethodToDefaultShipment(applicableShippingMethods[0].ID);
                }
            }

        }
    }

    //Set shipping address locale country to users geo locale if it is empty & set shipping method
    checkoutHelper.setGeoLocBasedShippingMethod();

    viewData.newaddressId = UUIDUtils.createUUID();
    var addressModalForm = server.forms.getForm('address');
    viewData.forms.addressModalForm = addressModalForm;

    //getting afterpayform
    var afterpayForm = server.forms.getForm('afterpay');
    viewData.forms.afterpayForm = afterpayForm;

    //afterpay error
    var afterpayErrorResponse = req.querystring.afterpayErrorMessage;
    viewData.afterpayApiError = afterpayErrorResponse;

    //giftcertificate check
    var hasOnlyGiftCertificate = cartHelper.hasOnlyGiftCertificateItem(currentBasket);
    viewData.hasOnlyGiftCertificate = hasOnlyGiftCertificate;

    //checking order has PayPal PI, then hide shipping section
    var hasPayPalPI = false;
    var order = viewData.order;
    if(order && order.billing.payment && order.billing.payment.selectedPaymentInstruments.length == 1 && order.billing.payment.selectedPaymentInstruments[0].paymentMethod === 'PayPal'){
        hasPayPalPI = true;
    }
    viewData.hasPayPalPI = hasPayPalPI

    // Express Checkout
    if (req.querystring && req.querystring.type === 'expresscheckout' &&  req.querystring.stage !== 'placeOrder') {
		if (req.currentCustomer.raw.authenticated) {
            if (COHelpers.eligibleForExpressCheckout(req.currentCustomer.raw, currentBasket, req, res)) {
                session.custom.checkoutType = req.querystring.type;
                res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'placeOrder'));
                return next();
            }
		}
	}

    //GTM change
    if(!empty(session.custom.checkoutType) && session.custom.checkoutType !== 'afterpayexpress'){
        if((order && order.billing.payment && order.billing.payment.selectedPaymentInstruments.length == 1) && (order.billing.payment.selectedPaymentInstruments[0].paymentMethod === 'PayPal' || order.billing.payment.selectedPaymentInstruments[0].paymentMethod === 'AFTERPAY_PBI')){
            delete session.custom.checkoutType;
        }
    }
    viewData.checkoutType = session.custom.checkoutType;

	//GC only items in basket - Go to payment step, if we have no product line items, but only gift certificates in the basket, shipping is not required.
	if (hasOnlyGiftCertificate && req.querystring && req.querystring.stage !== 'payment' && req.querystring.stage !== 'placeOrder') {
		//setting gift certificate sender's email to cart
    	if (empty(currentBasket.customerEmail) && currentBasket.customerEmail == null ) {
    		for(var i = 0; i < currentBasket.giftCertificateLineItems.length; i++) {
    			var giftItem = currentBasket.giftCertificateLineItems[i];
    			if (!empty(giftItem) && !empty(giftItem.custom.giftCertificateSenderEmail) && giftItem.custom.giftCertificateSenderEmail !== null) {
    				var customerEmail = giftItem.custom.giftCertificateSenderEmail;
    				customerEmail = currentBasket.getCustomerEmail() ? currentBasket.getCustomerEmail() : customerEmail;
    				Transaction.wrap(function () {
    	      			currentBasket.setCustomerEmail(customerEmail);
    	      		});
    				break;
    			}
    		}
    	}
    	var billingAddress = currentBasket.billingAddress;
    	Transaction.wrap(function () {
            if (!billingAddress) {
                billingAddress = currentBasket.createBillingAddress();
            }
            billingAddress.setCountryCode(request.getGeolocation().getCountryCode());
        });
    	res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment'));
        return next();
	}

	//set customer email when empty
	if (empty(currentBasket.customerEmail) && currentBasket.customerEmail == null && req.currentCustomer.raw.authenticated) {
		Transaction.wrap(function () {
  			currentBasket.setCustomerEmail(req.currentCustomer.raw.profile.email);
  		});
	}

    /**
     * Afterpay threshold check
     * @type {boolean}
     */
    var showAfterpayPayment = false;
    if(Site.getCurrent().getCustomPreferenceValue('enableAfterpay')) {
        showAfterpayPayment = require('*/cartridge/scripts/util/afterpayUtils').showAfterpayPayment();

        if (!empty(currentBasket.getDefaultShipment()) && currentBasket.getDefaultShipment().shippingAddress && !empty(currentBasket.getDefaultShipment().shippingAddress.countryCode)) {
            if (currentBasket.getDefaultShipment().shippingAddress.countryCode.value === 'US' && showAfterpayPayment) {
                showAfterpayPayment = true;
            } else {
                showAfterpayPayment = false;
            }
        }
    }

    //validate Coupon code and remove
    if((viewData.currentStage === 'placeOrder' || viewData.currentStage === 'payment') && currentBasket && !customer.authenticated){
        var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
        var collections = require('*/cartridge/scripts/util/collections');
        var couponLineItemData = collections.find(currentBasket.couponLineItems, function (couponLineItem) {
            return !couponLineItem.valid ? couponLineItem : null;
        });
        if(!empty(couponLineItemData)){
            Transaction.wrap(function () {
                currentBasket.removeCouponLineItem(couponLineItemData);
                basketCalculationHelpers.calculateTotals(currentBasket);
            });
        }
    }

    /**
     * Check for showEditPaymentLink
     */
    var showEditPaymentLink = true;
    if(viewData.currentStage === 'placeOrder'){
        if(viewData.order.billing.payment.selectedPaymentInstruments &&
            (viewData.order.billing.payment.selectedPaymentInstruments[0].paymentMethod === 'AFTERPAY_PBI' || viewData.order.billing.payment.selectedPaymentInstruments[0].paymentMethod === 'PayPal' || viewData.order.billing.payment.selectedPaymentInstruments[0].paymentMethod === 'ApplePay')){
            showEditPaymentLink = false;
        }
    }

    /**
     * Check basket has giftcertificate
     */
    var hasGCPI = (currentBasket.giftCertificatePaymentInstruments && currentBasket.giftCertificatePaymentInstruments.length > 0)? true: false;

    viewData.showEditPaymentLink = showEditPaymentLink;
    viewData.showAfterpayPayment = showAfterpayPayment;
    viewData.showAdWarning = showAdWarning;
    viewData.showInternationShipmentMsg = showInternationShipmentMsg;
    viewData.orderType = COHelpers.getOrderType(currentBasket);
    viewData.hasAutoDeliveryProduct = hasAutoDeliveryProduct;
    viewData.hasGCPI = hasGCPI

    var currentCustomer = req.currentCustomer.raw;
    var currentLocale = Locale.getLocale(req.locale.id);

    //RDMP-4317
    var paymentInfoAvailable = false;
    var hasAfterpayPI = false;
    if(!(currentBasket.paymentInstruments.empty)) {
        paymentInfoAvailable = true;
        if((currentBasket.paymentInstruments.length == 1 && currentBasket.paymentInstruments[0].paymentMethod == 'AFTERPAY_PBI')) {
            paymentInfoAvailable = false;
            hasAfterpayPI = true;
        }
    }
    res.setViewData({
        paymentInfoAvailable : paymentInfoAvailable,
        hasAfterpayPI : hasAfterpayPI
    });

     // Loop through all shipments and make sure all are valid
     //var allValid = COHelpers.ensureValidShipments(currentBasket);

    var orderModel = new OrderModel(
        currentBasket,
        {
            customer: currentCustomer,
            usingMultiShipping: false,
            shippable: true,
            countryCode: currentLocale.country,
            containerView: 'basket'
        }
    );
    viewData.order = orderModel;
    
    //For getting the user from eu-country or not
    var euCountriesList = Site.getCurrent().getCustomPreferenceValue('euCountriesList');
   
    if(!empty(euCountriesList)){
    	euCountriesList = JSON.parse(euCountriesList);
    	var geoLocCountryCode = request.getGeolocation().getCountryCode();
    	var euCountryYN = false;
		for(var i = 0; i < euCountriesList.length; i++) {
	     	if(euCountriesList[i] == geoLocCountryCode){
				euCountryYN	= true;
				break;
	        }
	 	} 
    }
	 viewData.euCountryYN = euCountryYN;

    viewData.braintree.sfraCheckoutFormFields = getSFRACheckoutFormFields();
    viewData.braintree.checkoutFromCartUrl = prefs.checkoutFromCartUrl;
    viewData.braintree.placeOrdeUrl = prefs.placeOrdeUrl;
    //Sorting Saved credit cards using created date
    if(viewData.braintree.creditCardConfig && viewData.braintree.creditCardConfig.customerSavedCreditCards && viewData.braintree.creditCardConfig.customerSavedCreditCards.length>1){
        viewData.braintree.creditCardConfig.customerSavedCreditCards.sort(function(prev,next){
            if ('braintreeDefaultCard' in next.custom && next.custom.braintreeDefaultCard) {
				return 1;
			}
            if ( prev.creationDate < next.creationDate ){
                return -1;
            }
            return 0;
        })
    }

    res.setViewData(viewData);

    /*viewData.braintree = {
            prefs: prefs,
            currency: currentBasket.getCurrencyCode(),
            paypalConfig: paypalConfig,
            payPalButtonConfig: payPalButtonConfig,
            applePayButtonConfig: applePayButtonConfig,
            venmoButtonConfig: venmoButtonConfig,
            venmoConfig: venmoConfig,
            hostedFieldsConfig: hostedFieldsConfig,
            creditCardConfig: creditCardConfig,
            lpmPaymentOptions: lpmPaymentOptions,
            isActiveLpmPaymentOptions: isActiveLpmPaymentOptions,
            lpmButtonConfig: lpmButtonConfig,
            googlepayButtonConfig: googlepayButtonConfig,
            googlepayConfig: googlepayConfig,
            srcConfig: srcConfig,
            srcButtonConfig: srcButtonConfig,
            sfraBillingFormFieldsNames: getSFRABillingFormFieldsNames(),
            sfraCheckoutFormFields: getSFRACheckoutFormFields(),
            checkoutFromCartUrl: prefs.checkoutFromCartUrl,
            placeOrdeUrl: prefs.placeOrdeUrl
    };*/

    /* this.on('route:BeforeComplete', function (req, res) {
        var viewData = res.getViewData();
        viewData.braintree.sfraCheckoutFormFields = getSFRACheckoutFormFields();
        viewData.braintree.checkoutFromCartUrl = prefs.checkoutFromCartUrl;
        viewData.braintree.placeOrdeUrl = prefs.placeOrdeUrl;
        res.setViewData(viewData);
    }); */

    next();
});

module.exports = server.exports();
