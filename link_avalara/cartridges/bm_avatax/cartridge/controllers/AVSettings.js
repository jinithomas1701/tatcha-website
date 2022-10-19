/**
 * The controller which handles various features on AvaTax settings page of the BM cartridge
 */
'use strict';

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');

// API includes
var dwsite = require('dw/system/Site');

// script includes
var avaTaxClient = require('*/cartridge/scripts/avaTaxClient');
var r = require('~/cartridge/scripts/util/Response');

// Logger includes
var LOGGER = dw.system.Logger.getLogger('Avalara', 'AvaTax');
var params = request.httpParameterMap;

// Model includes
var AddressValidationInfo = require('*/cartridge/models/addressValidationInfo');
var CommitTransactionModel = require('*/cartridge/models/commitTransactionModel');
var VoidTransactionModel = require('*/cartridge/models/voidTransactionModel');

// AvaTax setting preference
var settingsObject = JSON.parse(dw.system.Site.getCurrent().getCustomPreferenceValue('ATSettings'));

/**
 * It is a starting point for this controller and the page
 * It fetches the current settings and fills the form
 */
function start() {
    var currentMenuItemId = params.CurrentMenuItemId.value;
    var menuname = params.menuname.value;
    var mainmenuname = params.mainmenuname.value;

    session.privacy.currentMenuItemId = currentMenuItemId;
    session.privacy.menuname = menuname;
    session.privacy.mainmenuname = mainmenuname;

    var viewObj = {
        CurrentMenuItemId: currentMenuItemId,
        menuname: menuname,
        mainmenuname: mainmenuname,
        settings: settingsObject
    };

    app.getView(viewObj).render('/avatax/settings');
}


/**
 * Saves form data to setting preference - ATSettings
 */
function saveFormData() {
    try {
        var formData = {
            taxCalculation: params.taxCalculation.booleanValue,
            addressValidation: params.addressValidation.booleanValue,
            taxationpolicy: params.taxationpolicy.value,
            saveTransactions: params.saveTransactions.booleanValue,
            commitTransactions: params.commitTransactions.booleanValue,
            companyCode: params.companyCode.value,
            useCustomCustomerCode: params.useCustomCustomerCode.value,
            customCustomerAttribute: params.customCustomerAttribute.value,
            defaultShippingMethodTaxCode: params.defaultShippingMethodTaxCode.value,
            locationCode: params.locationCode.value,
            line1: params.line1.value,
            line2: params.line2.value,
            line3: params.line3.value,
            city: params.city.value,
            state: params.state.value,
            zipCode: params.zipCode.value,
            countryCode: params.countryCode.value
        };

        dw.system.Transaction.wrap(function () {
            dwsite.getCurrent().setCustomPreferenceValue('ATSettings', JSON.stringify(formData));
        });

        r.renderJSON({
            success: true
        });
    } catch (e) {
        LOGGER.warn('Error while saving the form data. Error details - ' + e.message);
        r.renderJSON({
            success: false,
            message: e.message
        });
    }
}

/**
 * Tests connection to AvaTax server
 */
function testConnection() {
    var res = null;
    var svcResponse = null;

    try {
        svcResponse = avaTaxClient.testConnection();
        if (svcResponse.authenticated) {
            res = {
                success: true,
                message: 'Test Connection successful. (Account ID - ' + svcResponse.authenticatedUserName + '/' + svcResponse.authenticatedAccountId + ')',
                authenticated: true
            };
        } else {
            res = {
                success: false,
                authenticated: false,
                message: 'Test connection failed. User or Password is blank/incorrect.'
            };
        }
    } catch (e) {
        LOGGER.warn('There was a problem checking the AvaTax connection. Error - ' + e.message);
        res = {
            success: false,
            message: 'There was a problem checking the AvaTax connection. Please check logs.'
        };
    }

    if (res == null) {
        res = {
            success: false,
            message: 'There was a problem checking the AvaTax connection. Please check logs.'
        };
    }

    r.renderJSON(res);
}


/**
 * Voids a document on AvaTax with a certain order number
 */
function voidTransaction() {
    var orderno = params.orderno.value;
    var res = null;
    var message = '';

    if (empty(orderno)) {
        message = 'Empty order no.';

        res = {
            success: false,
            message: message
        };
    } else {
        try {
            var validateOrder = dw.order.OrderMgr.getOrder(orderno.toString());

            if (!validateOrder) {
                message = 'Order not found in Business Manager.';

                res = {
                    success: false,
                    message: message
                };
            } else {
                var svcResponse = voidDocument(orderno);

                if (svcResponse.error || svcResponse.message || svcResponse.errorMessage) {
                    message = 'Unsuccessful. Service response below:';

                    res = {
                        success: true,
                        message: message,
                        svcResponse: svcResponse
                    };
                } else {
                    message = 'Successful. Service response below:';
                    res = {
                        success: true,
                        message: message,
                        svcResponse: svcResponse
                    };
                }
            }
        } catch (e) {
            LOGGER.warn('There was a problem voiding the transaction - ' + orderno + '. Error - ' + e.message);
            res = {
                success: false,
                message: 'There was a problem voiding the transaction - ' + orderno + '. Please check logs.'
            };
        }
    }

    if (res == null) {
        res = {
            success: false,
            message: 'There was a problem voiding the transaction. Please check logs.'
        };
    }

    r.renderJSON(res);
}


/**
 * Commits a transaction on AvaTax with a certain order number
 */
function commitTransaction() {
    var orderno = params.orderno.value || '';

    var res = null;
    var message = '';

    if (empty(orderno)) {
        message = 'Empty order number.';

        res = {
            success: false,
            message: message
        };
    } else {
        try {
            var validateOrder = dw.order.OrderMgr.getOrder(orderno.toString());

            if (!validateOrder) {
                message = 'Order not found in Business Manager.';
                res = {
                    success: false,
                    message: message
                };
            } else {
                var svcResponse = commitDocument(orderno);

                if (svcResponse.error || svcResponse.message || svcResponse.errorMessage) {
                    message = 'Unsuccessful. Service response below:';

                    res = {
                        success: true,
                        message: message,
                        svcResponse: svcResponse
                    };
                } else {
                    message = 'Successful. Service response below:';
                    res = {
                        success: true,
                        message: message,
                        svcResponse: svcResponse
                    };
                }
            }
        } catch (e) {
            LOGGER.warn('There was a problem commiting the transaction - ' + orderno + '. Error - ' + e.message);
            res = {
                success: false,
                message: 'There was a problem commiting the transaction - ' + orderno + '. Please check logs.'
            };
        }
    }

    if (res == null) {
        res = {
            success: false,
            message: 'There was a problem commiting the transaction. Please check logs.'
        };
    }

    r.renderJSON(res);
}


/**
 * validates an address of the order
 */
function validateAddress() {
    var validateOrder;
    var address;
    var validateResponse;
    var errorMsg;
    var res = null;
    var message = '';
    var orderNo = params.orderno.value;
    validateOrder = dw.order.OrderMgr.getOrder(orderNo.toString());
    if (validateOrder) {
        var shipments = validateOrder.getShipments().iterator();
        while (shipments.hasNext()) {
            var currentShipment = shipments.next();
            address = currentShipment.shippingAddress;
            validateResponse = validateShippingAddress(address);
            if (validateResponse.messages && validateResponse.messages.length > 0) {
                message = 'Unsuccessful. Service response below:';
                res = {
                    success: true,
                    message: message,
                    svcResponse: validateResponse
                };
            } else {
                message = 'Successful. Service response below:';
                res = {
                    success: true,
                    message: message,
                    svcResponse: validateResponse
                };
            }
        }
    } else {
        errorMsg = 'Order not found in Business Manager.';
        res = {
            success: false,
            message: errorMsg
        };
    }
    r.renderJSON(res);
}


/**
 * Resolve an address against Avalara's address-validation system
 * @param {string} address dw.order address object
 * @returns {*} A response object that contains information about the validated address
 */
function validateShippingAddress(address) {
    try {
        var svcResponse = null;
        // build an addressvalidationinfo object
        var validateAddress = new AddressValidationInfo();
        validateAddress.textCase = 'Mixed';
        validateAddress.line1 = address.address1 || '';
        validateAddress.line2 = address.address2 || '';
        validateAddress.city = address.city || '';
        validateAddress.region = address.stateCode || '';
        validateAddress.postalCode = address.postalCode || '';
        if (!empty(address.countryCode.value)) {
            validateAddress.country = address.countryCode.value || 'us';
        } else {
            validateAddress.country = address.countryCode || 'us';
        }
        // Make sure an address was provided
        if (empty(validateAddress)) {
            LOGGER.warn('AvaTax | No address provided. File - AVSettings.js');
            return;
        }
        var country = !empty(validateAddress.country) ? validateAddress.country : '';
        // countries for address validation - to be changed for Global implementation
        var countries = ['us', 'usa', 'canada'];
        if (countries.indexOf(country.toString().toLowerCase()) === -1) {
            LOGGER.warn('AvaTax | Can not validate address for this country {0}. File - AVSettings.js', country);
            return;
        }
        LOGGER.warn('xys');
        // Service call
        svcResponse = avaTaxClient.resolveAddressPost(validateAddress);
        return svcResponse;
    } catch (e) {
        LOGGER.warn('AvaTax | AvaTax Can not validate address at the moment. AVSettings.js~validateShippingAddress');
        return {
            statusCode: 'validateShippingAddressMethodFailed',
            message: e.message,
            error: true
        };
    }
}

/**
 * Marks a transaction by changing its status to 'Committed'.
 * @param {string} orderNo - DW order number of the transaction to be committed
 * @returns {*} A response object that contains information about the committed transaction
 */
function commitDocument(orderNo) {
    var message = '';

    try {
        var companyCode = settingsObject.companyCode || '';
        var transactionCode = orderNo;
        var commitTransactionModel = new CommitTransactionModel.CommitTransactionModel();
        var documentType = 'SalesInvoice';
        commitTransactionModel.commit = true;
        var svcResponse = avaTaxClient.commitTransaction(companyCode, transactionCode, commitTransactionModel, documentType);
        // ----------------- Logentries - START -------------------- //
        if (!empty(svcResponse.statusCode) && svcResponse.statusCode !== 'OK') {
            message = 'AvaTax commit document failed. Service configuration issue.';
        }
        if (svcResponse.error || svcResponse.message || svcResponse.errorMessage) {
            if (svcResponse.errorMessage) {
                message = svcResponse.errorMessage.error.message;
            }
            if (svcResponse.message) {
                message = svcResponse.message;
            }
            if (svcResponse.error) {
                message = svcResponse.message;
            }
        }
        return svcResponse;
    } catch (e) {
        LOGGER.warn('[AvaTax | Commit document failed with error - {0}. File - AvaTax.js~commitDocument]', e.message);
        return {
            error: true,
            message: 'Document commit failed'
        };
    }
}

/**
 * Voids the document.
 * @param {string} orderNo - DW order number
 * @returns {*} A response object that contains information about the voided transaction
 */
function voidDocument(orderNo) {
    var message = '';
    try {
        var companyCode = settingsObject.companyCode || '';
        var transactionCode = orderNo;
        var voidTransactionModel = new VoidTransactionModel.VoidTransactionModel();
        voidTransactionModel.code = voidTransactionModel.code.C_DOCVOIDED;

        var svcResponse = avaTaxClient.voidTransaction(companyCode, transactionCode, voidTransactionModel);
        // ----------------- Logentries - START --------------------
        if (!empty(svcResponse.statusCode) && svcResponse.statusCode !== 'OK') {
            message = 'AvaTax void document failed. Service configuration issue.';
        }
        if (svcResponse.error || svcResponse.message || svcResponse.errorMessage) {
            if (svcResponse.errorMessage) {
                message = svcResponse.errorMessage.error.message;
            }
            if (svcResponse.message) {
                message = svcResponse.message;
            }
            if (svcResponse.error) {
                message = svcResponse.message;
            }
        }
        return svcResponse;
    } catch (e) {
        LOGGER.warn('[AvaTax | Void document failed with error - {0}. File - AvaTax.js~voidDocument]', e.message);
        return {
            error: true,
            message: 'Document void failed'
        };
    }
}

// Module exports
exports.Start = guard.ensure(['https'], start);
exports.Save = guard.ensure(['https'], saveFormData);
exports.Test = guard.ensure(['https'], testConnection);
exports.Void = guard.ensure(['https'], voidTransaction);
exports.Commit = guard.ensure(['https'], commitTransaction);
exports.Validate = guard.ensure(['https'], validateAddress);