/**
 * Extension to default CheckoutShippingServices controller to provide custom
 * implementation for Address validation on shipping page for single shipment.
 * @module  controllers/CheckoutShippingServices
 */

'use strict';

var server = require('server');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var LOGGER = require('dw/system/Logger').getLogger('Avalara');
var Site = require('dw/system/Site');

server.extend(module.superModule);

// AvaTax setting preference
var settingsObject = JSON.parse(Site.getCurrent().getCustomPreferenceValue('ATSettings'));

server.append('SubmitShipping',
	server.middleware.https,
	csrfProtection.validateAjaxRequest,
	function (req, res, next) {
		// Default implementation if AvaTax not enabled
		if (!settingsObject.addressValidation) {
			return next();
		}
		// Custom implementation if AvaTax is enabled

		var URLUtils = require('dw/web/URLUtils');
		var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
		var addressFieldsForm = session.forms.shipping.shippingAddress.addressFields;
		var fieldErrors = {};
		var data = res.getViewData();
		if (data && data.csrfError) {
			res.json();
			return next();
		}
		var currentBasket = dw.order.BasketMgr.getCurrentBasket();
		if (!currentBasket) {
			res.json({
				error: true,
				cartError: true,
				fieldErrors: [],
				serverErrors: [],
				redirectUrl: URLUtils.url('Cart-Show').toString()
			});
			return next();
		}
		var form = server.forms.getForm('shipping');
		var result = {};
		var shippingFormErrors = COHelpers.validateShippingForm(form.shippingAddress.addressFields);
		if (Object.keys(shippingFormErrors).length > 0) {
			req.session.privacyCache.set(currentBasket.defaultShipment.UUID, 'invalid');
			res.json({
				form: form,
				fieldErrors: [shippingFormErrors],
				serverErrors: [],
				error: true
			});
			return next();
		}
		var address = {
			firstName: form.shippingAddress.addressFields.firstName.htmlValue,
			lastName: form.shippingAddress.addressFields.lastName.htmlValue,
			address1: form.shippingAddress.addressFields.address1.htmlValue,
			address2: form.shippingAddress.addressFields.address2.htmlValue,
			city: form.shippingAddress.addressFields.city.htmlValue,
			postalCode: form.shippingAddress.addressFields.postalCode.htmlValue,
			countryCode: form.shippingAddress.addressFields.country.htmlValue,
			phone: form.shippingAddress.addressFields.phone.htmlValue,
			stateCode: form.shippingAddress.addressFields.states.stateCode.htmlValue
		};

		// If country other than US / Canada, do not validate addresses
		var countries = ['us', 'usa', 'canada'];
		if (countries.indexOf(form.shippingAddress.addressFields.country.htmlValue.toString().toLowerCase()) === -1) {
			LOGGER.warn('AvaTax | Can not validate address for this country - {0}. File - CheckoutShippingServices.js', form.shippingAddress.addressFields.country.value.toString());
			return next();
		}

		// Address validation service call
		var validationResult = require('~/cartridge/scripts/avaTax').validateShippingAddress(address);
		// If the response contains statusCode and has value anything but 'OK', its an error. So continue the flow
		if (!empty(validationResult.statusCode) && validationResult.statusCode !== 'OK') {
			if (validationResult.statusCode === 'validateShippingAddressMethodFailed') {
				LOGGER.warn('AvaTax not able to validate address. Method failed. - CheckoutShippingServices.js');
			}
			return next();
		}
		// If the response contains messages attribute and has severity value 'Error', validation failed
		if (!empty(validationResult.messages) && validationResult.messages[0].severity === 'Error') {
			var validationResultMessagesArray = validationResult.messages;
			if (validationResultMessagesArray.length > 1) {
				LOGGER.warn('qwerty -> ' + validationResultMessagesArray[1].details.toLowerCase().indexOf('geocoded'));
				if (validationResultMessagesArray[1].details.toLowerCase().indexOf('geocoded') > 0) {
					if (validationResultMessagesArray[0].refersTo.toLowerCase().indexOf('city') !== -1) {
						fieldErrors[addressFieldsForm.city.htmlName] = validationResultMessagesArray[0].summary;
					} else if (validationResultMessagesArray[0].refersTo.toLowerCase().indexOf('line1') !== -1) {
						fieldErrors[addressFieldsForm.address1.htmlName] = validationResultMessagesArray[0].summary;
					} else if (validationResultMessagesArray[0].refersTo.toLowerCase().indexOf('country') !== -1) {
						fieldErrors[addressFieldsForm.country.htmlName] = validationResultMessagesArray[0].summary;
					} else if (validationResultMessagesArray[0].refersTo.toLowerCase().indexOf('postalcode') !== -1) {
						fieldErrors[addressFieldsForm.postalCode.htmlName] = validationResultMessagesArray[0].summary;
					}
				} else {
					var invalidAvataxField = validationResultMessagesArray[0].refersTo;
					if (invalidAvataxField.toLowerCase().indexOf('line1') !== -1 || invalidAvataxField.toLowerCase().indexOf('address') !== -1) {
						fieldErrors[addressFieldsForm.address1.htmlName] = validationResultMessagesArray[0].summary;
					} else if (invalidAvataxField.toLowerCase().indexOf('city') !== -1) {
						fieldErrors[addressFieldsForm.city.htmlName] = validationResultMessagesArray[0].summary;
					} else if (invalidAvataxField.toLowerCase().indexOf('country') !== -1) {
						fieldErrors[addressFieldsForm.country.htmlName] = validationResultMessagesArray[0].summary;
					} else if (invalidAvataxField.toLowerCase().indexOf('postalcode') !== -1) {
						fieldErrors[addressFieldsForm.postalCode.htmlName] = validationResultMessagesArray[0].summary;
					}
				}
			} else {
				var invalidAvataxField = validationResultMessagesArray[0].refersTo;
				if (invalidAvataxField.toLowerCase().indexOf('line1') !== -1 || invalidAvataxField.toLowerCase().indexOf('address') !== -1) {
					fieldErrors[addressFieldsForm.address1.htmlName] = validationResultMessagesArray[0].summary;
				} else if (invalidAvataxField.toLowerCase().indexOf('city') !== -1) {
					fieldErrors[addressFieldsForm.city.htmlName] = validationResultMessagesArray[0].summary;
				} else if (invalidAvataxField.toLowerCase().indexOf('country') !== -1) {
					fieldErrors[addressFieldsForm.country.htmlName] = validationResultMessagesArray[0].summary;
				} else if (invalidAvataxField.toLowerCase().indexOf('postalcode') !== -1) {
					fieldErrors[addressFieldsForm.postalCode.htmlName] = validationResultMessagesArray[0].summary;
				}
			}
			req.session.privacyCache.set(currentBasket.defaultShipment.UUID, 'invalid');
			res.json({
				form: session.forms.shipping,
				fieldErrors: [fieldErrors],
				serverErrors: [],
				error: true
			});
		} else if (validationResult.validatedAddresses) {
			req.session.privacyCache.set(currentBasket.defaultShipment.UUID, 'valid');
			// fill the form with validated address
			var validatedAddress = validationResult.validatedAddresses[0];
			form.shippingAddress.addressFields.address1.value = validatedAddress.line1;
			form.shippingAddress.addressFields.address2.value = validatedAddress.line2;
			form.shippingAddress.addressFields.city.value = validatedAddress.city;
			form.shippingAddress.addressFields.country.value = validatedAddress.country;
			form.shippingAddress.addressFields.postalCode.value = validatedAddress.postalCode;
			form.shippingAddress.addressFields.states.stateCode.value = validatedAddress.region;
			result.address = {
				firstName: form.shippingAddress.addressFields.firstName.htmlValue,
				lastName: form.shippingAddress.addressFields.lastName.htmlValue,
				address1: validatedAddress.line1,
				address2: validatedAddress.line2,
				city: validatedAddress.city,
				postalCode: validatedAddress.postalCode,
				countryCode: validatedAddress.country,
				phone: form.shippingAddress.addressFields.phone.htmlValue,
				stateCode: validatedAddress.region
			};
			if (Object.prototype.hasOwnProperty
				.call(form.shippingAddress.addressFields, 'states')) {
				result.address.stateCode =
					form.shippingAddress.addressFields.states.stateCode.htmlValue;
			}
			result.shippingBillingSame =
				form.shippingAddress.shippingAddressUseAsBillingAddress.value;
			result.shippingMethod = form.shippingAddress.shippingMethodID.value ?
				form.shippingAddress.shippingMethodID.value.toString() :
				null;
			res.setViewData(result);
			this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
				var AccountModel = require('*/cartridge/models/account');
				var OrderModel = require('*/cartridge/models/order');
				var Locale = require('dw/util/Locale');
				var shippingData = res.getViewData();
				COHelpers.copyShippingAddressToShipment(
					shippingData,
					currentBasket.defaultShipment
				);
				if (!currentBasket.billingAddress) {
					if (req.currentCustomer.addressBook &&
						req.currentCustomer.addressBook.preferredAddress) {
						// Copy over preferredAddress (use addressUUID for matching)
						COHelpers.copyBillingAddressToBasket(
							req.currentCustomer.addressBook.preferredAddress);
					} else {
						// Copy over first shipping address (use shipmentUUID for matching)
						COHelpers.copyBillingAddressToBasket(
							currentBasket.defaultShipment.shippingAddress);
					}
				}
				var usingMultiShipping = req.session.privacyCache.get('usingMultiShipping');
				if (usingMultiShipping === true && currentBasket.shipments.length < 2) {
					req.session.privacyCache.set('usingMultiShipping', false);
					usingMultiShipping = false;
				}
				COHelpers.recalculateBasket(currentBasket);
				var currentLocale = Locale.getLocale(req.locale.id);
				var basketModel = new OrderModel(
					currentBasket, {
						usingMultiShipping: usingMultiShipping,
						shippable: true,
						countryCode: currentLocale.country,
						containerView: 'basket'
					}
				);
				res.json({
					customer: new AccountModel(req.currentCustomer),
					order: basketModel,
					form: server.forms.getForm('shipping')
				});
			});
		}
		return next();
	});

module.exports = server.exports();