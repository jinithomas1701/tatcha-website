/**
 * Description of the Controller and the logic it provides
 *
 * @module  controllers/CheckoutAddressServices
 */
'use strict';

var server = require('server');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var LOGGER = require('dw/system/Logger').getLogger('Avalara');

server.extend(module.superModule);

// AvaTax setting preference
var settingsObject = JSON.parse(dw.system.Site.getCurrent().getCustomPreferenceValue('ATSettings'));

server.append('AddNewAddress',
	server.middleware.https,
	csrfProtection.validateAjaxRequest,
	function (req, res, next) {
		if (!settingsObject.addressValidation) {
			return next();
		}
		var BasketMgr = require('dw/order/BasketMgr');
		var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');

		var Transaction = require('dw/system/Transaction');
		var ShippingHelper = require('*/cartridge/scripts/checkout/shippingHelpers');

		var form = server.forms.getForm('shipping');
		var shippingFormErrors = COHelpers.validateShippingForm(form.shippingAddress.addressFields);
		var basket = currentBasket = BasketMgr.getCurrentBasket();
		var fieldErrors = {};
		var addressFieldsForm = session.forms.shipping.shippingAddress.addressFields;
		var pliUUID = req.form.productLineItemUUID;
		var shipmentUUID = req.form.shipmentSelector || req.form.shipmentUUID;
		var origUUID = req.form.originalShipmentUUID;
		var usingMultiShipping = req.session.privacyCache.get('usingMultiShipping');
		var result = {};
		if (Object.keys(shippingFormErrors).length > 0) {
			req.session.privacyCache.set(currentBasket.defaultShipment.UUID, 'invalid');
			res.json({
				form: form,
				fieldErrors: shippingFormErrors,
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

		var validationResult = require('~/cartridge/scripts/avaTax').validateShippingAddress(address);
		// If the response contains statusCode and has value anything but 'OK', its an error
		if ((!empty(validationResult.statusCode) && validationResult.statusCode !== 'OK')) {
			if (validationResult.statusCode === 'validateShippingAddressMethodFailed') {
				LOGGER.warn('AvaTax not able to validate address. Method failed. - CheckoutShippingServices.js');
			}
			return next();
		}
		if (!empty(validationResult.messages) && validationResult.messages[0].severity === 'Error') {
			var validationResultMessagesArray = validationResult.messages;
			if (validationResultMessagesArray.length > 1) {
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
			// shippingFormErrors = COHelpers.validateShippingForm(form.shippingAddress.addressFields);
			req.session.privacyCache.set(currentBasket.defaultShipment.UUID, 'invalid');
			res.json({
				form: session.forms.shipping,
				fieldErrors: fieldErrors,
				serverErrors: [],
				error: true
			});
			return next();
		} else if (validationResult.validatedAddresses) { // if validated address
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
			var shipment;
			if (!COHelpers.isShippingAddressInitialized()) {
				// First use always applies to defaultShipment
				COHelpers.copyShippingAddressToShipment(result, basket.defaultShipment);
				shipment = basket.defaultShipment;
			} else {
				try {
					Transaction.wrap(function () {
						if (origUUID === shipmentUUID) {
							// An edit to the address or shipping method
							shipment = ShippingHelper.getShipmentByUUID(basket, shipmentUUID);
							COHelpers.copyShippingAddressToShipment(result, shipment);
						} else {
							var productLineItem = COHelpers.getProductLineItem(basket, pliUUID);
							if (shipmentUUID === 'new') {
								// Choosing a new address for this pli
								if (origUUID === basket.defaultShipment.UUID &&
									basket.defaultShipment.productLineItems.length === 1) {
									// just replace the built-in one
									shipment = basket.defaultShipment;
								} else {
									// create a new shipment and associate the current pli (later)
									shipment = basket.createShipment(UUIDUtils.createUUID());
								}
							} else if (shipmentUUID.indexOf('ab_') === 0) {
								shipment = basket.createShipment(UUIDUtils.createUUID());
							} else {
								// Choose an existing shipment for this PLI
								shipment = ShippingHelper.getShipmentByUUID(basket, shipmentUUID);
							}
							COHelpers.copyShippingAddressToShipment(result, shipment);
							productLineItem.setShipment(shipment);
							COHelpers.ensureNoEmptyShipments(req);
						}
					});
				} catch (e) {
					result.error = e;
				}
			}
			if (shipment && shipment.UUID) {
				req.session.privacyCache.set(shipment.UUID, 'valid');
			}
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
				// Loop through all shipments and make sure all are valid
				var isValid;

				for (var i = 0, ii = currentBasket.shipments.length; i < ii; i++) {
					isValid = req.session.privacyCache.get(currentBasket.shipments[i].UUID);
					if (isValid !== 'valid') {
						allValid = false;
						break;
					}
				}
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
				var currentLocale = Locale.getLocale(req.locale.id);
				var basketModel = new OrderModel(
					currentBasket, {
						usingMultiShipping: usingMultiShipping,
						shippable: true,
						countryCode: currentLocale.country,
						containerView: 'basket'
					}
				);
				var accountModel = new AccountModel(req.currentCustomer);
				res.json({
					form: form,
					data: result,
					order: basketModel,
					customer: accountModel,
					fieldErrors: [],
					serverErrors: [],
					error: false
				});
			});
		}
		return next();
	});

module.exports = server.exports();