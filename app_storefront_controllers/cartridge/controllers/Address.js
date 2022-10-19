'use strict';

/**
 * Controller that provides functions for editing, adding, and removing addresses in a customer addressbook.
 * It also sets the default address in the addressbook.
 * @module controllers/Address
 */

/* API Includes */
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');
var URLUtils = require('dw/web/URLUtils');

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var securityHeader = require('~/cartridge/scripts/util/SecurityHeaders');

/**
 * Gets a ContentModel that wraps the myaccount-addresses content asset.
 * Updates the page metadata and renders the addresslist template.
 */
function list() {
    var pageMeta = require('~/cartridge/scripts/meta');

    var content = app.getModel('Content').get('myaccount');
    if (content) {
        pageMeta.update(content.object);
    }
    securityHeader.setSecurityHeaders();
    app.getView().render('account/addressbook/addresslist');
}

/**
 * Clears the profile form and renders the addressdetails template.
 */
function add() {
    session.custom.editDefaultAddress = false;
    var profileForm = session.forms.profile;
    
    var pageMeta = require('~/cartridge/scripts/meta');

    var content = app.getModel('Content').get('myaccount');
    if (content) {
        pageMeta.update(content.object);
    }
    
    var invalid = request.httpParameterMap.invalid.value;
    if(invalid != 'true') {
    	app.getForm('profile').clear();
    }
    
    var values = {
	  'firstName': session.customer.profile.firstName, 
	  'lastName': session.customer.profile.lastName
    };
    app.getForm(profileForm.address).copyFrom(values);
    
    securityHeader.setSecurityHeaders();
    
    app.getView({
        Action: 'add',
        ContinueURL: URLUtils.https('Address-Form')
    }).render('account/addressbook/addressdetails');
}

/**
 * Gets an AddressModel object. Gets the customeraddress form.
 * Handles the address form actions:
 *  - cancel and error - if the HTTPParameterMap format value is ajax, returns an error message,
 * otherwise redirects to the Address-List controller function.
 *  - create - if the address is valid, creates the address. If address creation fails, redirects to the Address-Add controller.
 *  - edit - if the address is valid, updates the address. If the address is invalid or the update fails, displays an error message.
 *  - remove - removes the address. If the address removal fails, displays an error message.
 */
function handleForm() {
    var Address;
    var success;
    var message;
    var addressId;

    Address = app.getModel('Address');
    var addressForm = app.getForm('customeraddress');

    addressForm.handleAction({
        cancel: function () {
            success = false;
        },
        create: function () {
        	 /*var tel = session.forms.profile.address.phone.htmlValue;
             var phone =  tel.substr(0, 3) + "-"+ tel.substr(3, 3) + "-" + tel.substr(6); //Create format with substrings
             session.forms.profile.address.phone.htmlValue = phone;*/
             
            if (!session.forms.profile.address.valid || !Address.create(session.forms.profile.address)) {
                response.redirect(URLUtils.https('Address-Add'));
                success = false;
            }
            
            var addressBook = customer.profile.addressBook;
            addressId = session.forms.profile.address.addressid.htmlValue;
            if(session.forms.profile.address.addressdefault.checked == true) {
                var address = addressBook.getAddress(addressId);
                Transaction.wrap(function () {
                    addressBook.setPreferredAddress(address);
                });

                if (session.custom.selectedShippingAddress) {
                    session.custom.selectedShippingAddress = address.ID;
                }
            } else {
            	var prefAddress = customer.profile.addressBook.preferredAddress;
            	if(!empty(prefAddress) && addressId == prefAddress.ID) {
            		Transaction.wrap(function () {
                        addressBook.setPreferredAddress(null);
                    });
            	}
            }
            success = true;
        },
        edit: function () {
            if (!session.forms.profile.address.valid) {
                success = false;
                message = 'Form is invalid';
            }
            try {
            	addressId = session.forms.profile.address.addressid.htmlValue;
            	/*var tel = session.forms.profile.address.phone.htmlValue.replace(/-/g, '');
                var phone =  tel.substr(0, 3) + "-"+ tel.substr(3, 3) + "-" + tel.substr(6); //Create format with substrings
                session.forms.profile.address.phone.htmlValue = phone;*/
                
                Address.update(addressId, session.forms.profile.address);
                
                var addressBook = customer.profile.addressBook;
                if(session.forms.profile.address.addressdefault.checked == true) {
                    var address = addressBook.getAddress(addressId);
                    Transaction.wrap(function () {
                        addressBook.setPreferredAddress(address);
                    });
                } else {
                	var prefAddress = customer.profile.addressBook.preferredAddress;
                	if(!empty(prefAddress) && addressId == prefAddress.ID) {
                		Transaction.wrap(function () {
                            addressBook.setPreferredAddress(null);
                        });
                	}
                }
                
                success = true;
            } catch (e) {
                success = false;
                message = e.message;
            }
        },
        error: function () {
            success = false;
        },
        remove: function () {
            if (Address.remove(session.forms.profile.address.addressid.value)) {
                success = false;
            }
        }
    });
    
    if (success && dw.system.Site.getCurrent().getCustomPreferenceValue('mParticleEnabled')) {
    	session.privacy.addressAddEditEvent = true;
    }

    if (request.httpParameterMap.format.stringValue === 'ajax') {
        let r = require('~/cartridge/scripts/util/Response');

        r.renderJSON({
            success: success,
            message: message
        });
        return;
    }
    
    // Single Page Checkout
    if(require('dw/system/Site').getCurrent().getCustomPreferenceValue('enableSinglePageCheckout')) {
	    if (request.httpParameterMap.format.stringValue === 'spcheckout') {
	    	session.custom.checkoutState = 'shipping';
	    	session.custom.checkoutMode = 'edit';
	    	session.custom.selectedShippingAddress = addressId;
	    	if(success) {
	    		app.getView().render('singlepagecheckout/rendercheckoutcontainer');
	    	}	        
	        return;
	    }
    }
    
    var params = request.httpParameterMap;
    if(success) {
    	if(request.httpParameterMap.scope.value == 'shipping'){
    		response.redirect(URLUtils.https('COShipping-Start', 'triggerEvent', 'selectAddress', 'id', addressId));
    	} else if(request.httpParameterMap.scope.value == 'billing') {
    		response.redirect(URLUtils.https('COBilling-Start', 'triggerEvent', 'selectAddress', 'id', addressId));
    	} else if(request.httpParameterMap.scope.value == 'auto-delivery') {
    		if(dw.system.Site.getCurrent().getCustomPreferenceValue('SorEnabled')){
    			var sor = require('int_smartorderrefill/cartridge/controllers/SmartOrderRefillController');
        		session.forms.changeaddress.copyFrom({'selectedAddress': addressId});
        		var result = sor.ManageRefillList();
        		response.redirect(URLUtils.https('SmartOrderRefillController-Manage'));
    		}
    	} else {
    		response.redirect(URLUtils.https('Address-List'));
    	}
    } else {
    	var actionId = app.getForm('profile').object.submittedAction.formId;
    	if(actionId == 'edit') {
    		var addressId = session.forms.profile.address.addressid.htmlValue;
    		response.redirect(URLUtils.https('Address-Edit', 'AddressID', addressId, 'invalid', true));
    	} else if(actionId == 'add') {
    		response.redirect(URLUtils.https('Address-Add', 'invalid', true));
    	} else {
    		response.redirect(URLUtils.https('Address-List'));
    	}
    }
}

/**
 * Clears the profile form and gets the addressBook for the current customer.
 * Copies address information from the stored customer profile into the profile form.
 * Renders the addressdetails form and passes the address information to the template.
 */
function edit() {
    var profileForm, addressBook, address;
    
 // Gets address to be edited.
    addressBook = customer.profile.addressBook;
    address = addressBook.getAddress(request.httpParameterMap.AddressID.value);
    profileForm = session.forms.profile;
    
    var pageMeta = require('~/cartridge/scripts/meta');

    var content = app.getModel('Content').get('myaccount');
    if (content) {
        pageMeta.update(content.object);
    }
    
    var invalid = request.httpParameterMap.invalid.value;
    if(invalid != 'true') {
    	app.getForm('profile').clear();
    	app.getForm(profileForm.address).copyFrom(address);
	    app.getForm(profileForm.address.states).copyFrom(address);
    }
    
    var preferedAddress = addressBook.getPreferredAddress();
    if(preferedAddress && preferedAddress.ID == address.ID) {
	  	session.custom.editDefaultAddress = true;
    } else {
    	session.custom.editDefaultAddress = false;
    }
    
    securityHeader.setSecurityHeaders();
    app.getView({
        Action: 'edit',
        ContinueURL: URLUtils.https('Address-Form'),
        Address: address
    }).render('account/addressbook/addressdetails');
}

/**
 * Gets the addressBook for the current customer. Gets an address from the addressBook based on the Address ID in the httpParameterMap.
 * Sets the default address. Redirects to the Address-List controller function.
 */
function setDefault() {
    var addressBook, address;

    addressBook = customer.profile.addressBook;
    address = addressBook.getAddress(request.httpParameterMap.AddressID.value);

    Transaction.wrap(function () {
        addressBook.setPreferredAddress(address);
    });

    if (session.custom.selectedShippingAddress) {
        session.custom.selectedShippingAddress = address.ID;
    }

    response.redirect(URLUtils.https('Address-List'));
}

/**
 * Gets the addressBook for the current customer Returns a customer address as a JSON response by rendering the
 * addressjson template. Required to fill address form with selected address from address book.
 */
function getAddressDetails() {
    var addressBook = customer.profile.addressBook;
    var address = addressBook.getAddress(request.httpParameterMap.addressID.value);

    app.getView({
        Address: address
    }).render('account/addressbook/addressjson');
}

/**
 * Removes an address based on the Address ID in the httpParameterMap. If the httpParameterMap format value is set to ajax,
 * redirects to the Address-List controller function. Otherwise, renders an error message.
 */
function Delete() {
    var CustomerStatusCodes = require('dw/customer/CustomerStatusCodes');
    var deleteAddressResult = app.getModel('Address').remove(decodeURIComponent(request.httpParameterMap.AddressID.value));

    // Single Page Checkout
    if(require('dw/system/Site').getCurrent().getCustomPreferenceValue('enableSinglePageCheckout')) {
	    if (request.httpParameterMap.format.stringValue === 'spcheckout') {
	    	session.custom.checkoutState = 'shipping';
	    	session.custom.checkoutMode = 'edit';
	    	app.getView({
	    		checkoutState:'shipping',
	    		checkoutMode:'edit'
	    	}).render('singlepagecheckout/rendercheckoutcontainer');        
	        return;
	    }
    } 
    
    if (request.httpParameterMap.format.stringValue !== 'ajax') {
        response.redirect(URLUtils.https('Address-List'));
        return;
    }

    let r = require('~/cartridge/scripts/util/Response');

    r.renderJSON({
        status: deleteAddressResult ? 'OK' : CustomerStatusCodes.CUSTOMER_ADDRESS_REFERENCED_BY_PRODUCT_LIST,
        message: deleteAddressResult ? '' : Resource.msg('addressdetails.' + CustomerStatusCodes.CUSTOMER_ADDRESS_REFERENCED_BY_PRODUCT_LIST, 'account', null)
    });
}

/*
* Web exposed methods
*/
/** Lists addresses in the customer profile.
 * @see {@link module:controllers/Address~list} */
exports.List = guard.ensure(['get', 'https', 'loggedIn'], list);
/** Renders a dialog for adding a new address to the address book.
 * @see {@link module:controllers/Address~add} */
exports.Add = guard.ensure(['get', 'https', 'loggedIn'], add);
/** Renders a dialog for editing an existing address.
 * @see {@link module:controllers/Address~edit} */
exports.Edit = guard.ensure(['get', 'https', 'loggedIn'], edit);
/** The address form handler.
 * @see {@link module:controllers/Address~handleForm} */
exports.Form = guard.ensure(['post', 'https', 'loggedIn', 'csrf'], handleForm);
/** Sets the default address for the customer address book.
 * @see {@link module:controllers/Address~setDefault} */
exports.SetDefault = guard.ensure(['get', 'https', 'loggedIn'], setDefault);
/** Sets the default address.
 * @see {@link module:controllers/Address~getAddressDetails} */
exports.GetAddressDetails = guard.ensure(['get', 'https', 'loggedIn'], getAddressDetails);
/** Deletes an existing address.
 * @see {@link module:controllers/Address~Delete} */
exports.Delete = guard.ensure(['https', 'loggedIn'], Delete);
