'use strict';
/* global XML */

var braintreeApi = {};
var prefs = require('~/cartridge/config/braintreePreferences')();

/**
 * Transform inappropriate values in request data object into empty string
 * @param {Object} source Request data
 * @return {Object | Array} Formatted request data
 */
function prepareXmlData(source) {
    var sourceData = source;
    function parse(data, keyPath) { // eslint-disable-line require-jsdoc
        var dataParsed = data;
        var notEmptyCount = 0;
        for (var key in dataParsed) { // eslint-disable-line no-restricted-syntax, guard-for-in
            var val = dataParsed[key];
            if (typeof val === 'object' && val !== null && val !== undefined) {
                parse(val, keyPath + '.' + key);
                notEmptyCount++;
            } else if (val || val === false) {
                notEmptyCount++;
            } else {
                dataParsed[key] = '';
            }
        }
        if (!notEmptyCount) {
            var keys = keyPath.split('.').slice(1);
            if (keys.length === 1) {
                delete sourceData[keys[0]];
            }
            if (keys.length === 2) {
                delete sourceData[keys[0]][keys[1]];
            }
            if (keys.length === 3) {
                delete sourceData[keys[0]][keys[1]][keys[2]];
            }
        }
    }
    parse(sourceData, '');
    return sourceData;
}

/**
 * Create XML string for <merchant-account-id />
 * @param {string} currencyCode - Currency Code
 * @return {string} XML <merchant-account-id>MerchantID</merchant-account-id>
 */
function createMerchantAccountXml(currencyCode) {
    var merchantAccounts = {};
    var code = currencyCode.toUpperCase();
    for (var fieldName in prefs.BRAINTREE_Merchant_Account_IDs) {
        var fieldArr = prefs.BRAINTREE_Merchant_Account_IDs[fieldName].split(':');
        merchantAccounts[fieldArr[0].toUpperCase()] = fieldArr[1];
    }

    if (typeof merchantAccounts[code] === 'string') {
        return '<merchant-account-id>' + merchantAccounts[code].replace(/\s/g, '') + '</merchant-account-id>';
    }

    return '';
}

/**
 * Create XML request data, based on current API call
 * @param {string} xmlType Type of data that are needed for this API call
 * @param {Object} sourceData Request data
 * @return {string} XML for API call
 */
braintreeApi.createXml = function (xmlType, sourceData) {
    var prefs = require('~/cartridge/config/braintreePreferences')();
    var data = prepareXmlData(sourceData || {});

    switch(xmlType) {
        case 'empty':
            return '';

        case 'client_token':
            var xmlObj =  <client_token>
                                    <version type="integer">2</version>
                                    <merchant-account-id/>
                                </client_token>;
            var result = xmlObj.toXMLString();
            result = result.replace('<merchant-account-id/>', createMerchantAccountXml(data.currencyCode));
            return result;
            

        case 'customer':
            var xmlObj =  <customer>
                                    <id>{data.id}</id>
                                    <first-name>{data.firstName}</first-name>
                                    <last-name>{data.lastName}</last-name>
                                    <company>{data.company}</company>
                                    <phone>{data.phone}</phone>
                                    <fax>{data.fax}</fax>
                                    <email>{data.email}</email>
                                </customer>;
            return xmlObj.toXMLString();

        case 'billing':
            var xmlObj =  <billing>
                                    <first-name>{data.firstName}</first-name>
                                    <last-name>{data.lastName}</last-name>
                                    <company>{data.company}</company>
                                    <street-address>{data.streetAddress}</street-address>
                                    <extended-address>{data.extendedAddress}</extended-address>
                                    <locality>{data.locality}</locality>
                                    <region>{data.region}</region>
                                    <postal-code>{data.postalCode}</postal-code>
                                    <country-code-alpha2>{data.countryCodeAlpha2}</country-code-alpha2>
                                    <country-name>{data.countryName}</country-name>
                                </billing>;
            return xmlObj.toXMLString();

        case 'billing_address':
            var xmlObj =  <billing-address>
                                    <first-name>{data.firstName}</first-name>
                                    <last-name>{data.lastName}</last-name>
                                    <company>{data.company}</company>
                                    <street-address>{data.streetAddress}</street-address>
                                    <extended-address>{data.extendedAddress}</extended-address>
                                    <locality>{data.locality}</locality>
                                    <region>{data.region}</region>
                                    <postal-code>{data.postalCode}</postal-code>
                                    <country-code-alpha2>{data.countryCodeAlpha2}</country-code-alpha2>
                                    <country-name>{data.countryName}</country-name>
                                    <options/>
                                </billing-address>;
            var result = xmlObj.toXMLString();
            if(data.updateExisting) {
                result = result.replace('<options/>', '<options><update-existing type="boolean">true</update-existing></options>');
            }
            return result;

        case 'shipping':
            var xmlObj =  <shipping>
                                    <first-name>{data.firstName}</first-name>
                                    <last-name>{data.lastName}</last-name>
                                    <company>{data.company}</company>
                                    <street-address>{data.streetAddress}</street-address>
                                    <extended-address>{data.extendedAddress}</extended-address>
                                    <locality>{data.locality}</locality>
                                    <region>{data.region}</region>
                                    <postal-code>{data.postalCode}</postal-code>
                                    <country-code-alpha/>
                                    <country-name>{data.countryName}</country-name>
                                </shipping>;
            var result = xmlObj.toXMLString();
            result = result.replace('<country-code-alpha/>', data.level_2_3_processing && data.countryCodeAlpha3 ? '<country-code-alpha3>' + data.countryCodeAlpha3 + '</country-code-alpha3>' 
                    : '<country-code-alpha2>' + data.countryCodeAlpha2 + '</country-code-alpha2>');

            return result;

        case 'transaction_amount':
            var xmlObj =  <transaction>
                                    <amount/>
                                    <order-id>{data.orderId}</order-id>
                                </transaction>;
            var result = xmlObj.toXMLString();
            result = result.replace('<amount/>', data.amount ? '<amount>' + data.amount + '</amount>' : '');

            return result;

        case 'descriptor':
            var xmlObj =  <descriptor>
                                    <name/>
                                    <phone/>
                                    <url/>
                                </descriptor>;
            var result = xmlObj.toXMLString();
            result = result.replace('<name/>', data.name ? '<name>' + data.name + '</name>' : '');
            result = result.replace('<phone/>', data.name ? '<phone>' + data.phone + '</phone>' : '');
            result = result.replace('<url/>', data.name ? '<url>' + data.url + '</url>' : '');
            return result;

        case 'transaction':
            var xmlObj =  <transaction>
                                    <merchant-account-id/>
                                    <type>sale</type>
                                    <order-id>{data.orderId}</order-id>
                                    <amount>{data.amount}</amount>
                                    <payment-method-identificator/>
                                    <customer/>
                                    <customer-id>{data.customerId}</customer-id>
                                    <billing/>
                                    <billing-address-id/>
                                    <shipping-address-id/>
                                    <shipping/>
                                    <options>
                                        <add-billing-address-to-payment-method/>
                                        <store-in-vault/>
                                        <store-in-vault-on-success/>
                                        <submit-for-settlement type="boolean">{data.options.submitForSettlement}</submit-for-settlement>
                                        <three_d_secure/>
                                        <paypal/>
                                        <skip-advanced-fraud-checking/>
                                    </options>
                                    <descriptor/>
                                    <device-data/>
                                    <channel>{prefs.braintreeChannel}</channel>
                                    <custom-fields/>
                                    <purchase-order-number/>
                                    <tax-amount/>
                                    <shipping-amount/>
                                    <discount-amount/>
                                    <ships-from-postal-code/>
                                    <line-items/>
                                </transaction>;
            var result = xmlObj.toXMLString();

            if(data.descriptor) {
                result = result.replace('<descriptor/>', braintreeApi.createXml('descriptor', data.descriptor));
            }

            if(data.customer) {
                result = result.replace('<customer/>', braintreeApi.createXml('customer', data.customer));
            }
            if(data.billing) {
                result = result.replace('<billing/>', braintreeApi.createXml('billing', data.billing));
            }
            if(data.shipping) {
                result = result.replace('<shipping/>', braintreeApi.createXml('shipping', data.shipping));
            }
            if(data.options.addShippingAddress) {
                result = result.replace('<store-shipping-address-in-vault/>', '<store-shipping-address-in-vault type="boolean">' + data.options.addShippingAddress + '</store-shipping-address-in-vault>');
            }
            if(data.options.addBillingAddress) {
                result = result.replace('<add-billing-address-to-payment-method/>', '<add-billing-address-to-payment-method type="boolean">' + data.options.addBillingAddress + '</add-billing-address-to-payment-method>');
            }
            if(data.options.storeInVault) {
                result = result.replace('<store-in-vault/>', '<store-in-vault type="boolean">' + data.options.storeInVault + '</store-in-vault>');
            }
            if(data.options.storeInVaultOnSuccess) {
                result = result.replace('<store-in-vault-on-success/>', '<store-in-vault-on-success type="boolean">' + data.options.storeInVaultOnSuccess + '</store-in-vault-on-success>');
            }
            if(data.options.payeeEmail) {
                result = result.replace('<paypal/>', '<paypal><payee_email>' + data.options.payeeEmail + '</payee_email></paypal>');
            }
            if(data.billingAddressId) {
                result = result.replace('<billing-address-id/>', '<billing-address-id>' + data.billingAddressId + '</billing-address-id>');
            }
            if(data.shippingAddressId) {
                result = result.replace('<shipping-address-id/>', '<shipping-address-id>' + data.shippingAddressId + '</shipping-address-id>');
            }
            if(data.paymentMethodNonce) {
                result = result.replace('<payment-method-identificator/>', '<payment-method-nonce>' + data.paymentMethodNonce + '</payment-method-nonce>');
            }
            if(data.paymentMethodToken) {
                result = result.replace('<payment-method-identificator/>', '<payment-method-token>' + data.paymentMethodToken + '</payment-method-token>');
            }

            result = result.replace('<merchant-account-id/>', createMerchantAccountXml(data.currencyCode));

            if(data.deviceData) {
                result = result.replace('<device-data/>', '<device-data>' + data.deviceData + '</device-data>');
            }
            
            if(data.options.skipAdvancedFraudChecking){
				result = result.replace('<skip-advanced-fraud-checking/>', '<skip-advanced-fraud-checking type="boolean">true</skip-advanced-fraud-checking>');
			}

            result = result.replace('<three_d_secure/>', data.is3dSecuteRequired ? '<three_d_secure><required type="boolean">true</required></three_d_secure>' : '');

            if(data.customFields) {
                result = result.replace('<custom-fields/>', '<custom-fields>' + data.customFields + '</custom-fields>');
            }
            
            if(data.level_2_3_processing) {
                /** Level 2 fields */
                //result = result.replace('<purchase-order-number/>', '<purchase-order-number>' + data.orderId + '</purchase-order-number>');
                result = result.replace('<tax-amount/>','<tax-amount>' + data.taxAmount + '</tax-amount>');
                
                /** 
                 * Due to Rounding discount issues, removed from BRAINTREE_PAYPAL scope due to bug on PayPal end. 
                 * No ETA on bug fix and not in roadmap. 
                 */
                if (!data.l2_only) {
                    /** Level 3 fields */
                    result = result.replace('<shipping-amount/>','<shipping-amount>' + data.shippingAmount + '</shipping-amount>');
                    result = result.replace('<discount-amount/>','<discount-amount>' + data.discountAmount + '</discount-amount>');
                    // result = result.replace('<ships-from-postal-code/>','<ships-from-postal-code>' + data.shipsFromPostalCode + '</ships-from-postal-code>');      
                    
                    result = result.replace('<line-items/>', braintreeApi.createXml('line-items', data.lineItems));
                }
            }

            return result;

        case 'transaction_clone':
            var xmlObj =  <transaction-clone>
                                    <amount>{data.amount}</amount>
                                    <options>
                                        <submit-for-settlement>{data.isSubmitForSettlement}</submit-for-settlement>
                                    </options>
                                </transaction-clone>;
            return xmlObj.toXMLString();

        case 'transactions_search':
            var xmlObj = <search>
                                    <created_at>
                                        <min type="datetime">{data.startDate}</min>
                                        <max type="datetime">{data.endDate}</max>
                                    </created_at>
                                </search>;
            return xmlObj.toXMLString();

        case 'search_transactions_by_ids':
            var idsStr = '';
            data.ids.forEach(function(id) {
                idsStr += '<item>' + id + '</item>';
            });
            return '<search><ids type="array">' + idsStr + '</ids></search>';

        case 'payment_method':
            data.makeDefault = data.makeDefault || '';
            data.failOnDuplicatePaymentMethod = data.failOnDuplicatePaymentMethod || '';
            data.verifyCard = data.verifyCard || '';
            var xmlObj =  <payment-method>
                                    <customer-id/>
                                    <payment-method-nonce/>
                                    <billing-address-id/>
                                    <billing-address/>
                                    <cardholder-name>{data.cardHolderName}</cardholder-name>
                                    <options>
                                        <make-default>{data.makeDefault}</make-default>
                                        <fail-on-duplicate-payment-method>{data.failOnDuplicatePaymentMethod}</fail-on-duplicate-payment-method>
                                        <verify-card>{data.verifyCard}</verify-card>
                                    </options>
                                </payment-method>;
            var result = xmlObj.toXMLString();
            if(data.billingAddress) {
                result = result.replace('<billing-address/>', braintreeApi.createXml('billing_address', data.billingAddress));
            }
            result = result.replace('<customer-id/>', data.customerId ? '<customer-id>' + data.customerId + '</customer-id>' : '');
            result = result.replace('<payment-method-nonce/>', data.paymentMethodNonce ? '<payment-method-nonce>' + data.paymentMethodNonce + '</payment-method-nonce>' : '');
            result = result.replace('<billing-address-id/>', data.billingAddressId ? '<billing-address-id>' + data.billingAddressId + '</billing-address-id>' : '');
            return result;

        case 'credit_card':
            data.makeDefault = data.makeDefault || false;
            var xmlObj =  <credit-card>
                                    <billing-address/>
                                    <cardholder-name>{data.cardholderName}</cardholder-name>
                                    <options>
                                        <make-default>{data.makeDefault}</make-default>
                                        <verify-card>{data.verifyCard}</verify-card>
                                        <token>{data.token}</token>
                                    </options>
                                </credit-card>;
            var result = xmlObj.toXMLString();
            if(data.billingAddress) {
                result = result.replace('<billing-address/>', braintreeApi.createXml('billing_address', data.billingAddress));
            }
            return result;

        case 'customer_create':
            data.makeDefault = data.makeDefault || false;
            var xmlObj =  <customer>
                                    <id>{data.customerId}</id>
                                    <first-name>{data.firstName}</first-name>
                                    <last-name>{data.lastName}</last-name>
                                    <email>{data.email}</email>
                                    <company>{data.company}</company>
                                    <phone>{data.phone}</phone>
                                    <fax>{data.fax}</fax>
                                    <website>{data.website}</website>
                                    <credit-card/>
                                    <options>
                                        <paypal-payee-email/>
                                    </options>
                                </customer>;
            var result = xmlObj.toXMLString();
            if(data.paymentMethodNonce) {
                result = result.replace('<credit-card/>', '<payment-method-nonce>' + data.paymentMethodNonce + '</payment-method-nonce>');
            } else {
                if(data.creditCard) {
                    result = result.replace('<credit-card/>', braintreeApi.createXml('credit_card', data.creditCard));
                }
            }
            if(data.paypalPayeeEmail) {
                result = result.replace('<paypal-payee-email/>', '<paypal><payeeEmail>' + data.paypalPayeeEmail + '</payeeEmail></paypal>');
            } else {
                result = result.replace('<paypal-payee-email/>', '');
            }
            return result;

        case 'transactuion_create_vault':
            var xmlObj =  <transaction>
                                    <merchant-account-id/>
                                    <type>sale</type>
                                    <order-id/>
                                    <payment-method-token>{data.token}</payment-method-token>
                                    <tax-amount/>
                                    <custom-fields/>
                                    <amount>{data.amount}</amount>
                                    <options>
                                        <submit-for-settlement type="boolean">{data.submitForSettlement}</submit-for-settlement>
                                    </options>
                                </transaction>;
            var result = xmlObj.toXMLString();
            if(data.orderId) {
                result = result.replace('<order-id/>', '<order-id>' + data.orderId + '</order-id>');
            }
            if(data.tax) {
                result = result.replace('<tax-amount/>', '<tax-amount>' + data.tax + '</tax-amount>');
            }
            if(data.customFields) {
                result = result.replace('<custom-fields/>', '<custom-fields>' + data.customFields + '</custom-fields>');
            }
            result = result.replace('<merchant-account-id/>', createMerchantAccountXml(data.currencyCode));
            return result;
        case 'transaction_create':
            var xmlObj =  <transaction>
                                    <merchant-account-id/>
                                    <type>sale</type>
                                    <payment-method-nonce>{data.nonce}</payment-method-nonce>
                                    <tax-amount>{data.tax}</tax-amount>
                                    <custom-fields/>
                                    <amount>{data.amount}</amount>
                                    <options>
                                        <submit-for-settlement type="boolean">{data.options.submitForSettlement}</submit-for-settlement>
                                        <store-in-vault-on-success type="boolean">{data.options.submitForSettlement}</store-in-vault-on-success>
                                        <store-in-vault type="boolean">{data.options.submitForSettlement}</store-in-vault>
                                    </options>
                                    <shipping>
                                        <street-address>{data.shippingStreetAddress}</street-address>
                                        <postal-code>{data.shippingPostalCode}</postal-code>
                                    </shipping>
                                    <customer>
                                        <first-name>{data.firstName}</first-name>
                                        <last-name>{data.lastName}</last-name>
                                    </customer>
                                    <billing>
                                        <street-address>{data.billingStreetAddress}</street-address>
                                        <postal-code>{data.billingPostalCode}</postal-code>
                                    </billing>
                                </transaction>;
            var result = xmlObj.toXMLString();
            if(data.customFields) {
                result = result.replace('<custom-fields/>', '<custom-fields>' + data.customFields + '</custom-fields>');
            }
            result = result.replace('<merchant-account-id/>', createMerchantAccountXml(data.currencyCode));
            return result;

        case 'customer_update':
            var xmlObj =  <customer>
                                    <first-name>{data.firstName}</first-name>
                                    <last-name>{data.lastName}</last-name>
                                    <email>{data.email}</email>
                                    <company>{data.company}</company>
                                    <phone>{data.phone}</phone>
                                    <fax>{data.fax}</fax>
                                    <website>{data.website}</website>
                                </customer>;
            return xmlObj.toXMLString();

        case 'address_create':
            var xmlObj =  <address>
                                    <first-name>{data.firstName}</first-name>
                                    <last-name>{data.lastName}</last-name>
                                    <company>{data.company}</company>
                                    <street-address>{data.streetAddress}</street-address>
                                    <extended-address>{data.extendedAddress}</extended-address>
                                    <locality>{data.locality}</locality>
                                    <region>{data.region}</region>
                                    <postal-code>{data.postalCode}</postal-code>
                                    <country-code-alpha2>{data.countryCodeAlpha2}</country-code-alpha2>
                                    <country-name>{data.countryName}</country-name>
                                </address>;
            return xmlObj.toXMLString();
            
        case 'line-items':
            var lineItem = '';
            data.map(function(value) {
                lineItem += '<line-item>';
                lineItem += '<name>' + value.name + '</name>';
                lineItem += '<kind>' + value.kind + '</kind>';
                lineItem += '<quantity>' + value.quantity + '</quantity>';
                lineItem += '<unit-amount>' + value.unitAmount + '</unit-amount>';
                lineItem += '<unit-of-measure>' + value.unitOfMeasure + '</unit-of-measure>';
                lineItem += '<total-amount>' + value.totalAmount + '</total-amount>';
                lineItem += '<tax-amount>' + value.taxAmount + '</tax-amount>';
                lineItem += '<discount-amount>' + value.discountAmount + '</discount-amount>';
                lineItem += '<product-code>' + value.productCode + '</product-code>';
                lineItem += '<commodity-code>' + value.commodityCode + '</commodity-code>';
                lineItem += '</line-item>';
            });
            return '<line-items type="array">' + lineItem + '</line-items>';
    }
};

/**
 * Parse XML into Object
 * @param {string} xmlStr XML string
 * @return {Object} Parsed object
 */
braintreeApi.parseXml = function (xmlStr) {
    var resultObj = {};
    var xmlObj = new XML(xmlStr);

    function formatNodeName(name) { // eslint-disable-line require-jsdoc
        var nameParts = name.split('-');
        for (var i = 1; i < nameParts.length; i++) {
            nameParts[i] = nameParts[i].charAt(0).toUpperCase() + nameParts[i].slice(1);
        }
        return nameParts.join('');
    }

    function parse(node, objectToParse) { // eslint-disable-line require-jsdoc
        var obj = objectToParse;
        var nodeName = formatNodeName(node.name().toString());
        var elements = node.elements();
        var element = null;
        var elementIndx = null;

        if (elements.length()) {
            var nodeType = node.attribute('type').toString();
            if (nodeType === 'array' || nodeType === 'collection') {
                obj[nodeName] = [];
                if (elements[0] && elements[0].hasSimpleContent() && nodeType !== 'collection') {
                    for (elementIndx in elements) { // eslint-disable-line no-restricted-syntax, guard-for-in
                        element = elements[elementIndx];
                        obj[nodeName].push(element.text().toString());
                    }
                } else {
                    for (elementIndx in elements) { // eslint-disable-line no-restricted-syntax, guard-for-in
                        element = elements[elementIndx];
                        parse(element, obj[nodeName]);
                    }
                }
            } else if (obj instanceof Array) {
                var objNew = {};
                obj.push(objNew);
                for (elementIndx in elements) { // eslint-disable-line no-restricted-syntax, guard-for-in
                    element = elements[elementIndx];
                    parse(element, objNew);
                }
            } else {
                obj[nodeName] = {};
                for (elementIndx in elements) { // eslint-disable-line no-restricted-syntax, guard-for-in
                    element = elements[elementIndx];
                    parse(element, obj[nodeName]);
                }
            }
        } else {
            obj[nodeName] = node.text().toString();
        }
    }

    parse(xmlObj, resultObj);
    return resultObj;
};

module.exports = braintreeApi;
