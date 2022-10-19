'use strict';

var page = module.superModule;

var server = require('server');

var URLUtils = require('dw/web/URLUtils');
var Resource = require('dw/web/Resource');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');

server.post('SaveAddressModal', csrfProtection.validateAjaxRequest, function (req, res, next) {
    var CustomerMgr = require('dw/customer/CustomerMgr');
    var Transaction = require('dw/system/Transaction');
    var formErrors = require('*/cartridge/scripts/formErrors');
    var accountHelpers = require('*/cartridge/scripts/helpers/accountHelpers');
    var addressHelpers = require('*/cartridge/scripts/helpers/addressHelpers');
    var UUIDUtils = require('dw/util/UUIDUtils');

    var addressForm = server.forms.getForm('address');
    var addressFormObj = addressForm.toObject();
    addressFormObj.addressForm = addressForm;
    var customer = CustomerMgr.getCustomerByCustomerNumber(
        req.currentCustomer.profile.customerNo
    );
    var addressBook = customer.getProfile().getAddressBook();
    var isDefault = addressForm.isDefault.htmlValue;
    var isEdit = addressForm.isEdit.htmlValue;
    var addressId = !empty(addressForm.addressId) ? addressForm.addressId.value : '';
    if (isEdit === 'false') {
        addressId = UUIDUtils.createUUID();
        session.custom.selectedShippingAddress = addressId;
    }

    if (addressForm.valid) {
        res.setViewData(addressFormObj);
        this.on('route:BeforeComplete', function () { // eslint-disable-line no-shadow
            var formInfo = res.getViewData();
            Transaction.wrap(function () {
                var address = null;
                if (addressId) {
                    if (addressId && isEdit === 'false') {
                        address = addressBook.createAddress(addressId);
                    }
                    if (isEdit === 'true') {
                        address = addressBook.getAddress(addressId);
                    }
                }

                if (address) {
                    if (addressId) {
                        address.setID(addressId);
                    }

                    // Save form's address
                    addressHelpers.updateAddressFields(address, formInfo);

                    if (isDefault === 'true') {
                        addressBook.setPreferredAddress(address);
                    }

                    if (customer.addressBook.preferredAddress.ID  === addressId) {
                        isDefault = 'true';
                    }
                    // Send account edited email
                    //accountHelpers.sendAccountEditedEmail(customer.profile);
                    var addressObj = {
                        address1: address.address1,
                        address2: address.address2,
                        city: address.city,
                        firstName: address.firstName,
                        lastName: address.lastName,
                        phone: address.phone,
                        postalCode: address.postalCode,
                        stateCode: address.stateCode,
                        countryCode: address.countryCode.value,
                        countryDisplayValue: address.countryCode.displayValue,
                        addressId: addressId,
                        isDefault: isDefault,
                        isEdit: isEdit,
                        dataId:'uuid-'+address.UUID
                    }
                    res.json({
                        success: true,
                        address: addressObj
                    });
                } else {
                    formInfo.addressForm.valid = false;
                    formInfo.addressForm.addressId.valid = false;
                    formInfo.addressForm.addressId.error =
                        Resource.msg('error.message.idalreadyexists', 'forms', null);
                    res.json({
                        success: false,
                        fields: formErrors.getFormErrors(addressForm),
                        error: 'Already Exists'
                    });
                }
            });
        });
    } else {
        res.json({
            success: false,
            fields: formErrors.getFormErrors(addressForm)
        });
    }
    return next();
});

/**
 * Address-DeleteAddressModal : Delete an existing address
 * @name Base/Address-DeleteAddressModal
 * @function
 * @memberof Address
 * @param {middleware} - userLoggedIn.validateLoggedInAjax
 * @param {querystringparameter} - addressId - a string used to identify the address record
 * @param {querystringparameter} - isDefault - true if this is the default address. false otherwise
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - get
 */
 server.get('DeleteAddressModal', userLoggedIn.validateLoggedInAjax, function (req, res, next) {
    var CustomerMgr = require('dw/customer/CustomerMgr');
    var Transaction = require('dw/system/Transaction');
    var accountHelpers = require('*/cartridge/scripts/helpers/accountHelpers');

    var data = res.getViewData();
    if (data && !data.loggedin) {
        res.json();
        return next();
    }

    var addressId = req.querystring.addressId;
    var isDefault = req.querystring.isDefault;
    var customer = CustomerMgr.getCustomerByCustomerNumber(
        req.currentCustomer.profile.customerNo
    );
    var addressBook = customer.getProfile().getAddressBook();
    var address = addressBook.getAddress(addressId);
    var UUID = address ? address.getUUID() : null;
    this.on('route:BeforeComplete', function () { // eslint-disable-line no-shadow
        var length;
        Transaction.wrap(function () {
            addressBook.removeAddress(address);
            length = addressBook.getAddresses().length;
            if (isDefault && length > 0) {
                var newDefaultAddress = addressBook.getAddresses()[0];
                addressBook.setPreferredAddress(newDefaultAddress);
            }
        });

        // Send account edited email
        //accountHelpers.sendAccountEditedEmail(customer.profile);

        if (length === 0) {
            res.json({
                UUID: UUID,
                defaultMsg: Resource.msg('label.addressbook.defaultaddress', 'account', null),
                message: Resource.msg('msg.no.saved.addresses', 'address', null)
            });
        } else {
            res.json({ UUID: UUID,
                defaultMsg: Resource.msg('label.addressbook.defaultaddress', 'account', null)
            });
        }
    });
    return next();
});

module.exports = server.exports();
