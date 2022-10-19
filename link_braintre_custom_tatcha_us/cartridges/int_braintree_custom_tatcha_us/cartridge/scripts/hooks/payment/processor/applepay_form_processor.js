'use strict';
var base = module.superModule;
var { updateShippingAddress,setShippingMethod } = require('~/cartridge/scripts/hooks/payment/processor/processorHelper');
var Transaction = require('dw/system/Transaction');
var LOGGER = require('dw/system/Logger');


/**
 * @input request and defaultShipping
 * For Apple pay, The method will check the shipping firstname and lastname,
 * if it is empty, billing firstname and lastname will be copied to shipping address
 * **/
function updateNameIfEmpty(req , orderShippingAddress) {
    var shipping;
    try {
        Transaction.wrap(function () {
            shipping = orderShippingAddress.getShippingAddress();
            if(!empty(shipping)) {
                var firstName = shipping.firstName.trim();
                var lastName =  shipping.lastName.trim();
                if(empty(firstName)) {
                    firstName = req.httpParameterMap.dwfrm_billing_addressFields_firstName ? req.httpParameterMap.dwfrm_billing_addressFields_firstName.stringValue : 'NA';
                    shipping.setFirstName(firstName);
                }
                if(empty(lastName)) {
                    lastName = req.httpParameterMap.dwfrm_billing_addressFields_lastName ? req.httpParameterMap.dwfrm_billing_addressFields_lastName.stringValue : 'NA';
                    shipping.setLastName(lastName);
                }
            }

        });
    } catch (e) {
    }

}

/**
 * ApplePay form processor:
 * Updating Shipping Address (only from Cart Checkout)
 * Adding paymentMethod & email to viewData
 *
 * @param {Object} req the request object
 * @param {Object} paymentForm - the payment form
 * @param {Object} viewFormData - object contains billing form data
 * @returns {Object} an object that has payment information
 */
base.processForm = function(req, paymentForm, viewFormData) {
    var BasketMgr = require('dw/order/BasketMgr');
    var currentBasket = BasketMgr.getCurrentBasket();
    var fromCart = (req.querystring || {}).fromCart;
    var viewData = viewFormData;
    var usingMultiShipping = false; // Current integration support only single shpping
    req.session.privacyCache.set('usingMultiShipping', usingMultiShipping);

    viewData.paymentMethod = {
        value: paymentForm.paymentMethod.value
    };

    /*viewData.email = {
        value: paymentForm.contactInfoFields.email.value
    };*/

    // Shipping handling
    if (fromCart) {
        updateShippingAddress(req.httpParameterMap.braintreeApplePayShippingAddress.stringValue, currentBasket.getDefaultShipment());
        setShippingMethod(currentBasket);
        updateNameIfEmpty(req, currentBasket.getDefaultShipment());
    }

    return {
        error: false,
        viewData: viewData
    };
}

exports.processForm = base.processForm;
