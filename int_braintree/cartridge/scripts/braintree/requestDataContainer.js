'use strict';
/* global dw empty */

var BraintreeHelper = require('~/cartridge/scripts/braintree/braintreeHelper');
var prefs = BraintreeHelper.getPrefs();

/**
 * Return request data for given API call method name
 * @param {string} method API call name
 * @param {Object} dataObj HTTP params from request
 * @return {Object} Formatted data for API call
 */
module.exports = function (method, dataObj) {
    var data;
    var dataObject = dataObj;
    if (empty(dataObject) && method) {
        throw new Error('No data provided for call');
    }

    switch (method) {
        case 'refund':
            data = {
                xmlType: 'transaction_amount',
                requestPath: 'transactions/' + dataObject.transactionId + '/refund',
                orderId: dataObject.orderNo,
                amount: dataObject.amount
            };
            break;
        case 'void':
            data = {
                xmlType: 'empty',
                requestPath: 'transactions/' + dataObject.transactionId + '/void',
                requestMethod: 'PUT'
            };
            break;
        case 'clone':
            data = {
                xmlType: 'transaction_clone',
                requestPath: 'transactions/' + dataObject.transactionId + '/clone',
                amount: dataObject.amount,
                isSubmitForSettlement: dataObject.isSubmintForSettlement
            };
            break;
        case 'submitForSettelment':
            data = {
                xmlType: 'transaction_amount',
                requestPath: 'transactions/' + dataObject.transactionId + '/submit_for_settlement',
                requestMethod: 'PUT',
                orderId: dataObject.orderNo,
                amount: dataObject.amount
            };
            break;
        case 'updateDetails':
            data = {
                xmlType: 'transaction_amount',
                requestPath: 'transactions/' + dataObject.transactionId + '/update_details',
                requestMethod: 'PUT',
                orderId: dataObject.orderNo,
                amount: dataObject.amount
            };
            break;
        case 'submitForPartialSettlement':
            data = {
                xmlType: 'transaction_amount',
                requestPath: 'transactions/' + dataObject.transactionId + '/submit_for_partial_settlement',
                requestMethod: 'POST',
                orderId: dataObject.orderNo,
                amount: dataObject.amount
            };
            break;
        case 'find':
            data = {
                xmlType: 'empty',
                requestPath: 'transactions/' + dataObject.transactionId,
                requestMethod: 'GET'
            };
            break;
        case 'search':
            data = {
                xmlType: 'transactions_search',
                requestPath: 'transactions/advanced_search_ids',
                data: {
                    startDate: dataObject.startDate,
                    endDate: dataObject.endDate
                }
            };
            break;
        case 'findCustomer':
            data = {
                xmlType: 'empty',
                requestPath: 'customers/' + dataObject.customerId,
                requestMethod: 'GET'
            };
            break;
        case 'createCustomer':
            var billingAddress = dataObject.billingAddress;
            // Checks if BillingAddress is instance of dw.order.OrderAddress
            if (billingAddress instanceof dw.order.OrderAddress) {
                billingAddress = BraintreeHelper.createAddressData(billingAddress);
            }

            data = {
                xmlType: 'customer_create',
                requestPath: 'customers',
                customerId: dataObject.customerId,
                firstName: dataObject.firstName,
                lastName: dataObject.lastName,
                email: dataObject.email,
                company: dataObject.company,
                phone: dataObject.phone,
                fax: dataObject.fax,
                website: dataObject.website,
                paymentMethodNonce: dataObject.paymentMethodNonce,
                paypalPayeeEmail: dataObject.paypalPayeeEmail
            };

            if (dataObject.paymentMethodNonce) {
                data.creditCard = {
                    cardholderName: dataObject.cardholderName,
                    billingAddress: billingAddress,
                    makeDefault: dataObject.makeDefault,
                    verifyCard: dataObject.verifyCard,
                    token: dataObject.paymentMethodToken
                };
            }

            break;
        case 'updateCustomer':
            data = {
                xmlType: 'customer_update',
                requestMethod: 'PUT',
                requestPath: 'customers/' + dataObject.customerId,
                firstName: dataObject.firstName,
                lastName: dataObject.lastName,
                email: dataObject.email,
                company: dataObject.company,
                phone: dataObject.phone,
                fax: dataObject.fax,
                website: dataObject.website
            };
            break;
        case 'removeCustomer':
            data = {
                xmlType: 'empty',
                requestPath: 'customers/' + dataObject.customerId,
                requestMethod: 'DELETE'
            };
            break;
        case 'bindCustomer':
            // Check if customer with given CustomerNo exist
            var profile = dw.customer.CustomerMgr.getProfile(dataObject.customerNo);
            if (!profile) {
                throw new Error('User is not exist');
            }
            var customer = profile.getCustomer();

            var customerId = BraintreeHelper.createCustomerId(customer);
            dataObject.customerId = customerId;
            data = {
                xmlType: 'customer_create',
                requestPath: 'customers',
                customerId: customerId,
                firstName: profile.getFirstName(),
                lastName: profile.getLastName(),
                email: profile.getEmail(),
                company: profile.getCompanyName(),
                phone: profile.getPhoneHome(),
                fax: profile.getFax(),
                website: ''
            };
            break;
        case 'findPaymentMethod':
            data = {
                xmlType: 'empty',
                requestPath: 'payment_methods/any/' + dataObject.token,
                requestMethod: 'GET'
            };
            break;
        case 'createPaymentMethod':
            data = {
                xmlType: 'payment_method',
                requestPath: 'payment_methods',
                customerId: dataObject.customerId,
                paymentMethodNonce: dataObject.paymentMethodNonce,
                billingAddress: dataObject.billingAddress,
                billingAddressId: dataObject.billingAddressId,
                makeDefault: dataObject.makeDefault,
                failOnDuplicatePaymentMethod: dataObject.failOnDuplicatePaymentMethod,
                verifyCard: dataObject.verifyCard,
                cardHolderName: dataObject.cardHolderName
            };
            break;
        case 'updatePaymentMethod':
            data = {
                xmlType: 'payment_method',
                requestPath: 'payment_methods/any/' + dataObject.token,
                requestMethod: 'PUT',
                customerId: dataObject.customerId,
                paymentMethodNonce: dataObject.paymentMethodNonce,
                billingAddress: dataObject.billingAddress,
                billingAddressId: dataObject.billingAddressId,
                makeDefault: dataObject.makeDefault,
                failOnDuplicatePaymentMethod: dataObject.failOnDuplicatePaymentMethod,
                verifyCard: dataObject.verifyCard,
                cardHolderName: dataObject.cardHolderName
            };

            if (data.billingAddress) {
                data.billingAddress.updateExisting = dataObject.bllingAddressUpdateExisting;
                data.billingAddressId = null;
            }
            break;
        case 'deletePaymentMethod':
            data = {
                xmlType: 'empty',
                requestPath: 'payment_methods/any/' + dataObject.token,
                requestMethod: 'DELETE'
            };
            break;
        case 'createAddress':
            data = BraintreeHelper.createAddressData(dataObject.address);
            data.xmlType = 'address_create';
            data.requestPath = 'customers/' + BraintreeHelper.createCustomerId(dataObject.customer) + '/addresses';
            break;
        case 'updateAddress':
            data = BraintreeHelper.createAddressData(dataObject.address);
            data.xmlType = 'address_create';
            data.requestPath = 'customers/' + BraintreeHelper.createCustomerId(dataObject.customer) + '/addresses/' + dataObject.address.custom.braintreeAddressId;
            data.requestMethod = 'PUT';
            break;
        case 'deleteAddress':
            data = {
                xmlType: 'empty',
                requestPath: 'customers/' + BraintreeHelper.createCustomerId(dataObject.customer) + '/addresses/' + dataObject.address.custom.braintreeAddressId,
                requestMethod: 'DELETE'
            };
            break;
        case 'createVaultTransaction':
            if (dataObject.token) {
                data = {
                    xmlType: 'transactuion_create_vault',
                    requestPath: 'transactions',
                    amount: dataObject.amount,
                    currencyCode: dataObject.currencyCode,
                    orderId: dataObject.orderId,
                    tax: dataObject.tax,
                    customFields: dataObject.customFields,
                    token: dataObject.token,
                    submitForSettlement: dataObject.isSubmintForSettlement === undefined ? prefs.BRAINTREE_Payment_Model === 'sale' : dataObject.isSubmintForSettlement
                };
            }
            break;
        case 'createTransaction':
            data = {
                xmlType: 'transaction_create',
                requestPath: 'transactions',
                amount: dataObject.amount,
                currencyCode: dataObject.currencyCode,
                tax: dataObject.tax,
                customFields: dataObject.customFields,
                nonce: dataObject.paymentMethodNonce,
                firstName: dataObject.firstName,
                lastName: dataObject.lastName,
                billingPostalCode: dataObject.billingPostalCode,
                billingStreetAddress: dataObject.billingStreetAddress,
                shippingPostalCode: dataObject.shippingPostalCode,
                shippingStreetAddress: dataObject.shippingStreetAddress,
                options: {
                    verifyCard: dataObject.verifyCard || false,
                    submitForSettlement: prefs.BRAINTREE_Payment_Model === 'sale'
                }
            };

            if (prefs.BRAINTREE_Vault_Mode === 'always') {
                data.options.storeInVault = true;
            } else if (prefs.BRAINTREE_Vault_Mode === 'success') {
                data.options.storeInVaultOnSuccess = true;
            }
            break;
        default:
            throw new Error('No request data find for provided API method');
    }

    return data;
};
