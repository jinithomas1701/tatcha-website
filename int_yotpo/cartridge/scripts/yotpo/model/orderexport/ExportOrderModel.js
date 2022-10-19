'use strict';

/**
 * @module scripts/yotpo/model/orderexport/ExportOrderModel
 *
 * The model is used to export order to Yotpo.
 */

/**
 * It validates that the orders are exportable for current locale in Yotop Configuration object.
 * It returns error if the mandatory data is missing. It will also indicate skipping orders for current
 * locale if the flag in configuration indicate so.
 *
 * @param {Object} yotpoConfiguration : The Yotpo configuration object all necessary configuration data.
 * @param {Object} orderFeedJobLastExecutionTime : The time when the order feed job last executed.
 *
 * @returns {boolean} boolean : The flag to indicate if the orders export should be skipped for current locale.
 */
function validateOrderFeedConfigData(yotpoConfiguration, orderFeedJobLastExecutionTime) {
    var YotpoLogger = require('~/cartridge/scripts/yotpo/utils/YotpoLogger');
    var YotpoUtils = require('~/cartridge/scripts/yotpo/utils/YotpoUtils');

    var logLocation = 'ExportOrderModel~validateOrderFeedConfigData';
    var validationResult = YotpoUtils.validateMandatoryConfigData(yotpoConfiguration);

    if (!validationResult) {
        YotpoLogger.logMessage('The current locale missing mandatory data therefore aborting the process.', 'error', logLocation);
        return false;
    }

    var jobValidationResult = YotpoUtils.validateOrderFeedJobConfiguration(orderFeedJobLastExecutionTime);

    if (!jobValidationResult) {
        YotpoLogger.logMessage('The yotpo job configuration missing mandatory configuration data, cannot proceed.', 'error', logLocation);
        return false;
    }

    var processCurrentLocale = true;

    if (!yotpoConfiguration.custom.enablePurchaseFeed) {
        YotpoLogger.logMessage('Skipping orders for current Locale ID - ' + yotpoConfiguration.custom.localeID + ' Purchase Feed Flag - ' + yotpoConfiguration.custom.enablePurchaseFeed, 'debug', logLocation);
        processCurrentLocale = false;
    }

    return processCurrentLocale;
}

/**
 * This script searches the order based on delta starting from last execution time
 * of export job to current time. It only export orders which are in following state
 * Order.EXPORT_STATUS_READY, Order.EXPORT_STATUS_EXPORTED and customer Locale ID
 * matches with current Locale in processing.
 *
 * @param {Object} currentDateTime : The current date time
 * @param {Object} orderFeedJobLastExecutionTime : Date The time when the order feed job last executed.
 *
 * @returns {Object} ordersIterator : The order list to be exported
 */
function searchOrders(currentDateTime, orderFeedJobLastExecutionTime) {
    var Order = require('dw/order/Order');
    var OrderMgr = require('dw/order/OrderMgr');

    var queryString = '';
    var	sortString = 'orderNo ASC';
    var ordersIterator;

    queryString = 'creationDate >= {0} AND creationDate <= {1} AND ' +
        '(exportStatus = {2} OR exportStatus = {3})';

    ordersIterator = OrderMgr.searchOrders(queryString, sortString,
        orderFeedJobLastExecutionTime, currentDateTime,
        Order.EXPORT_STATUS_READY, Order.EXPORT_STATUS_EXPORTED);
    
    /*queryString = 'orderNo = {0} ';

    ordersIterator = OrderMgr.searchOrders(queryString, sortString,
       '00017407');    */

    return ordersIterator;
}

/**
 * This script will extract all order information and will prepare the JSON to be submitted to Yotpo.
 *
 * @param {Object} yotpoConfiguration : The Yotpo Configuration
 * @param {Object} ordersIterator	 : The order list to process
 * @param {Object} exportOrderConfig : The configuration data for order batch processing
 *
 * @returns {Object} Object
 */
function prepareOrderJSON(yotpoConfiguration, ordersIterator, exportOrderConfig) {
    var Calendar = require('dw/util/Calendar');
    var ProductMgr = require('dw/catalog/ProductMgr');
    var StringUtils = require('dw/util/StringUtils');
    var URLUtils = require('dw/web/URLUtils');
    var Constants = require('~/cartridge/scripts/yotpo/utils/Constants');
    var YotpoLogger = require('~/cartridge/scripts/yotpo/utils/YotpoLogger');
    var YotpoUtils = require('~/cartridge/scripts/yotpo/utils/YotpoUtils');

    var logLocation = 'ExportOrderModel~prepareOrderJSON';
    var payload = '';
    var temp = '';
    var prodLineItemIt;
    var product;
    var shipment;
    var productLineItem;
    var currentProduct;
    var orderShipmentIt;
    var description;
    var imageURL;
    var productURL;
    var price;
    var customerName;
    var customerEmail;
    var productName;
    var productID;
    var brand;
    var mpn;
    var upc;
    var customer;
    var order;
    var tempCalendar = new Calendar();
    var creationDate;
    var firstOrder = true;
    var firstProduct;
    var counter = 1;
    var firstName;
    var lastName;
    var isPayloadEmpty = true;
    var productGroupId;
    var currentLocaleID = yotpoConfiguration.custom.localeID;
    var masterProductID;
    var defaultVariantproduct;

    // Configuration data
    var utokenAuthCode = yotpoConfiguration.custom.utokenAuthCode;

    payload += '{';
    temp += '"validate_data": true,'
        + '"platform": "' + Constants.PLATFORM_FOR_YOTPO_DATA + '",'
        + '"utoken": "{0}",';

    payload += StringUtils.format(temp, utokenAuthCode);
    payload += '"orders": [ ';

    while (ordersIterator.hasNext()) {
        order = ordersIterator.next();
        // Skip if there is no locale information or order Locale doesn't match with current locale
        if (!order.customerLocaleID || order.customerLocaleID !== currentLocaleID) {
            continue; // eslint-disable-line no-continue
        }

        customer = order.customer;
        
        // Added as per Yotpo support suggestion
        if (empty(order.getAllProductLineItems())) {
            continue;
        }

        try {
            var orderPayload = '';
            if (customer.isRegistered()) {
                firstName = empty(customer.profile.firstName) ? ' ' : customer.profile.firstName;
                lastName = empty(customer.profile.lastName) ? ' ' : customer.profile.lastName;
                customerName = firstName + ' ' + lastName;
                customerEmail = customer.profile.email;
            } else {
                customerName = order.customerName;
                customerEmail = order.customerEmail;
            }

            // Skipping the order if any of the following fields empty of an order,
            if (empty(customerName) || empty(customerEmail) || empty(order.orderNo)) {
                throw Constants.EXPORT_ORDER_MISSING_MANDATORY_FIELDS_ERROR;
            }

            if (!firstOrder) {
                orderPayload += ',';
            }

            orderPayload += '{'; // start of order

            customerName = empty(customerName) ? ' ' : YotpoUtils.escape(customerName, Constants.REGEX_FOR_YOTPO_DATA, '');
            customerEmail = empty(customerEmail) ? ' ' : YotpoUtils.escape(customerEmail, Constants.REGEX_FOR_YOTPO_DATA, '');

            orderPayload += '"email": "' + customerEmail + '",';
            orderPayload += '"customer_name": "' + customerName + '",';

            tempCalendar.setTime(order.creationDate);
            creationDate = StringUtils.formatCalendar(tempCalendar, Constants.DATE_FORMAT_FOR_YOTPO_DATA);

            orderPayload += '"order_id":"' + order.orderNo + '",' +
                '"order_date":"' + creationDate + '",' +
                '"currency_iso":"' + order.currencyCode + '",';

            orderPayload += '"products":{';

            firstProduct = true;
            orderShipmentIt = order.getShipments().iterator();

            while (orderShipmentIt.hasNext()) {
                shipment = orderShipmentIt.next();
                prodLineItemIt = shipment.getProductLineItems().iterator();
                

                
                while (prodLineItemIt.hasNext()) {
                    productLineItem = prodLineItemIt.next();
                    product = ProductMgr.getProduct(productLineItem.productID);

                    productGroupId = '';
                    currentProduct = product;

                    if (exportOrderConfig.producInformationFromMaster) {
                        if (product.variant) {
                           // currentProduct = product.getVariationModel().master;
                            masterProductID = product.getVariationModel().master.ID;
                        } else {
                        	masterProductID = product.ID;
                        }
                    } else if (exportOrderConfig.exportGroupIdInOrder && product.variant) {
                        productGroupId = product.getVariationModel().master.ID;
                    }

                    imageURL = encodeURI(YotpoUtils.getImageLink(currentProduct));
                    imageURL = empty(imageURL) ? 'Image not available' : imageURL;
                    productURL = URLUtils.abs('Product-Show', 'pid', currentProduct.ID);

                    if (!firstProduct) {
                        orderPayload += ',';
                    }


                    productName = empty(currentProduct.name) ? ' ' : YotpoUtils.escape(currentProduct.name, Constants.REGEX_FOR_YOTPO_DATA, '');
                    description = empty(currentProduct.custom.benefitsSection1) ? ' ' : YotpoUtils.escape(currentProduct.custom.benefitsSection1, Constants.REGEX_FOR_YOTPO_DATA, '');
                    productID = YotpoUtils.escape(masterProductID, Constants.PRODUCT_REGEX_FOR_YOTPO_DATA, '-');
                    mpn = empty(currentProduct.manufacturerSKU) ? ' ' : YotpoUtils.escape(currentProduct.manufacturerSKU, Constants.REGEX_FOR_YOTPO_DATA, '');
                    brand = empty(currentProduct.brand) ? ' ' : YotpoUtils.escape(currentProduct.brand, Constants.REGEX_FOR_YOTPO_DATA, '');
                    upc = empty(currentProduct.UPC) ? ' ' : YotpoUtils.escape(currentProduct.UPC, Constants.REGEX_FOR_YOTPO_DATA, '');

                    price = productLineItem.getBasePrice().decimalValue;
                    
                    
					if (currentProduct.variant) {
						var currentMasterProduct : dw.catalog.Product;
                        defaultVariantproduct = getDefaultVariant(currentProduct.getVariationModel().master.variationModel);
                        productName = empty(defaultVariantproduct.name) ? ' ' : YotpoUtils.escape(defaultVariantproduct.name, Constants.REGEX_FOR_YOTPO_DATA, '');
                        description = empty(defaultVariantproduct.custom.benefitsSection1) ? ' ' : YotpoUtils.escape(defaultVariantproduct.custom.benefitsSection1, Constants.REGEX_FOR_YOTPO_DATA, '');
                        mpn = empty(defaultVariantproduct.manufacturerSKU) ? ' ' : YotpoUtils.escape(defaultVariantproduct.manufacturerSKU, Constants.REGEX_FOR_YOTPO_DATA, '');
                        brand = empty(defaultVariantproduct.brand) ? ' ' : YotpoUtils.escape(defaultVariantproduct.brand, Constants.REGEX_FOR_YOTPO_DATA, '');
                        upc = empty(defaultVariantproduct.UPC) ? ' ' : YotpoUtils.escape(defaultVariantproduct.UPC, Constants.REGEX_FOR_YOTPO_DATA, '');
                        price = defaultVariantproduct.priceModel.price.value;
                        imageURL = encodeURI(YotpoUtils.getImageLink(defaultVariantproduct));
                        imageURL = empty(imageURL) ? 'Image not available' : imageURL;
                        productURL = URLUtils.abs('Product-Show', 'pid', defaultVariantproduct.ID);
    			    }                    
 
                    // Skipping the order if any of the following fields empty of product,
                    if (empty(masterProductID) || empty(productURL) || empty(currentProduct.name)) {
                        throw Constants.EXPORT_ORDER_MISSING_MANDATORY_FIELDS_ERROR;
                    }					

                    orderPayload += '"' + productID + '":{' +
                        '"url": "' + productURL + '",' +
                        '"name": "' + productName + '",' +
                        '"image": "' + imageURL + '",' +
                        '"description": "' + description + '",' +
                        '"price": "' + price + '",' +
                        '"specs":{ ' +
                            '"upc": "' + upc + '",' +
                            '"mpn": "' + mpn + '",' +
                            '"brand": "' + brand + '"' +
                        '},' +
                        '"group_id": "' + productGroupId + '"' +
                    '}';

                    firstProduct = false;
                }
            }

            orderPayload += '}';// end of products
            orderPayload += '}'; // end of order
            payload += orderPayload;
            firstOrder = false;
            counter++;

            // This indicates that the payload JSON is not empty and it has Orders to be exported,
            isPayloadEmpty = false;

            if (counter >= exportOrderConfig.orderFeedBatchSize) {
                break;
            }
        } catch (e) {
            YotpoLogger.logMessage('Skipping order ' + order.orderNo + ' in the export due to exception: ' + e, 'error', logLocation);
        }
    } // end of orders

    payload += ']'; // close tag of "orders": [
    payload += '}'; // close tag of JSON

    if (isPayloadEmpty) {
        payload = '';
    }
    return payload;
}

/**
 * This function submits the order to Yotpo. It makes HTTP request and reads the response and logs it.
 * It returns error in case of some problem in order submission.
 *
 * @param {Object} orderJSON 			: The order JSON in String format to be exported to Yotpo.
 * @param {string} yotpoAppKey 				: The appKey to connect to Yotpo.
 *
 * @returns {boolean} authenticationError : The flag to indicate if the error was due to Authentication failure.
 */
function sendOrdersToYotpo(orderJSON, yotpoAppKey) {
    var Result = require('dw/svc/Result');
    var ExportOrderServiceRegistry = require('~/cartridge/scripts/yotpo/serviceregistry/ExportOrderServiceRegistry');
    var Constants = require('~/cartridge/scripts/yotpo/utils/Constants');
    var YotpoLogger = require('~/cartridge/scripts/yotpo/utils/YotpoLogger');

    var logLocation = 'ExportOrderModel~sendOrdersToYotpo';
    var authenticationError = false; // default value

    try {
        var yotpoURL = ExportOrderServiceRegistry.yotpoExportOrdersSvc.getConfiguration().getCredential().getURL();

        if (empty(yotpoURL)) {
            YotpoLogger.logMessage('The URL is empty for int_yotpo.https.post.export.purchase.api service.', 'error', logLocation);
            throw Constants.EXPORT_ORDER_CONFIG_ERROR;
        }

        YotpoLogger.logMessage('Yotpo web path to pass order feed: ' + yotpoURL, 'debug', logLocation);

        yotpoURL = yotpoURL.replace('[appKey]', yotpoAppKey.toString());

        ExportOrderServiceRegistry.yotpoExportOrdersSvc.setURL(yotpoURL);
        var result = ExportOrderServiceRegistry.yotpoExportOrdersSvc.call(orderJSON);


        if (result.status === Result.OK) {
            YotpoLogger.logMessage('Order Feed sumbitted successfully.', 'debug', logLocation);
        } else if (result.status === Result.ERROR) {
            YotpoLogger.logMessage('The request to export order failed authentication. Error code: ' + result + '\n Error Text is: ' + result.msg + ' ' + result.errorMessage.error, 'error', logLocation);
            authenticationError = true;
        } else {
            YotpoLogger.logMessage('Could not export order to Yotpo - HTTP Status Code is: ' + result.error + '\n Error Text is: ' + result.errorMessage, 'error', logLocation);
            throw Constants.EXPORT_ORDER_SERVICE_ERROR;
        }
    } catch (e) {
        YotpoLogger.logMessage('Error occured while trying to upload feed - ' + e, 'error', logLocation);
        throw Constants.EXPORT_ORDER_SERVICE_ERROR;
    }

    return authenticationError;
}

/**
 * It updates the utoken retrieved from authentication request in Yotpo Configuration based on current locale ID.
 *
 * @param {string} localeID :The Locale ID currently in process.
 * @param {string} uTokenAuthCode :The access token retrieved from the authentication request to Yotpo.
 *
 * @returns {boolean} true
 */
function updateUToken(localeID, uTokenAuthCode) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var Transaction = require('dw/system/Transaction');
    var Constants = require('~/cartridge/scripts/yotpo/utils/Constants');

    var yotpoConfiguration = CustomObjectMgr.getCustomObject(Constants.YOTPO_CONFIGURATION_OBJECT, localeID);

    // save utokenAuthCode
    Transaction.wrap(function () {
        yotpoConfiguration.custom.utokenAuthCode = uTokenAuthCode;
    });

    return true;
}

/**
 * This function updates the utokenAuthCode in OrderJSON. The utokenAuthCode is retrieved
 * from authentication and should be updated in existing orderJSON to retry the order submission.
 *
 * @param {string} utokenAuthCode : The u-token authentication code
 * @param {Object} orderJSON : The order JSON in String format to be exported to Yotpo.
 *
 * @returns {Object} updatedOrderJSON : The updated order JSON in string format
 */
function updateUTokenInOrderJSON(utokenAuthCode, orderJSON) {
    var orderJSONParsed = JSON.parse(orderJSON);
    orderJSONParsed.utoken = utokenAuthCode; // Update utoken
    var updatedOrderJSON = JSON.stringify(orderJSONParsed);

    return updatedOrderJSON;
}

/**
 * It updates the Yotop Configuration object. It updates the last execution time of order process job with currentDateTime.
 *
 * @Param {Object} currentDateTime : The current date time.
 * @returns {boolean} boolean
 */
function updateJobExecutionTime(currentDateTime) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var Transaction = require('dw/system/Transaction');
    var Constants = require('~/cartridge/scripts/yotpo/utils/Constants');
    var YotpoLogger = require('~/cartridge/scripts/yotpo/utils/YotpoLogger');

    var logLocation = 'ExportOrderModel~updateJobExecutionTime';
    YotpoLogger.logMessage('Updating job execution time to : ' + currentDateTime, 'debug', logLocation);

    var yotpoJobsConfiguration = CustomObjectMgr.getCustomObject(Constants.YOTPO_JOBS_CONFIGURATION_OBJECT, Constants.YOTPO_JOB_CONFIG_ID);

    Transaction.wrap(function () {
        yotpoJobsConfiguration.custom.orderFeedJobLastExecutionDateTime = currentDateTime;
    });

    return true;
}

/**
 * This is the main function called by ExportOrder controller or pipeline to export orders.
 */
function exportOrder() {
    var Site = require('dw/system/Site');
    var AuthenticationModel = require('../authentication/AuthenticationModel');
    var Constants = require('~/cartridge/scripts/yotpo/utils/Constants');
    var CommonModel = require('../common/CommonModel');
    var YotpoLogger = require('~/cartridge/scripts/yotpo/utils/YotpoLogger');

    var logLocation = 'ExportOrderModel~exportOrder';
    var yotpoAppKey;
    var currentLocaleID;
    var utokenAuthCode;
    var ordersIterator;
    var authenticationError;
    var payload;
    var authenticationResult;

    var exportOrderConfig = {
        orderFeedBatchSize: Site.getCurrent().preferences.custom.yotpoOrdersBatchSize,
        producInformationFromMaster: Site.getCurrent().preferences.custom.producInformationFromMaster,
        exportGroupIdInOrder: Site.getCurrent().preferences.custom.exportGroupIdInOrder
    };

    var yotpoConfigurations = CommonModel.loadAllYotpoConfigurations();
    var yotpoJobConfigurations = CommonModel.loadYotpoJobConfigurations();

    YotpoLogger.logMessage('\n------ Yotpo Export Order Feed  --------' +
        '\n Current Site ID: ' + Site.getCurrent().getName() +
        '\n Date format for the Yotpo data: ' + Constants.DATE_FORMAT_FOR_YOTPO_DATA +
        '\n Site preference producInformationFromMaster: ' + exportOrderConfig.producInformationFromMaster +
        '\n Site preference exportGroupIdInOrder: ' + exportOrderConfig.exportGroupIdInOrder +
        '\n Site preference yotpoOrdersBatchSize: ' + exportOrderConfig.orderFeedBatchSize +
        '\n Last Execution Time: ' + yotpoJobConfigurations.orderFeedJobLastExecutionTime +
        '\n Current Execution Time: ' + yotpoJobConfigurations.currentDateTime, 'debug', logLocation);

    for (var loopIndex = 0; loopIndex < yotpoConfigurations.size(); loopIndex++) {
        var yotpoConfiguration = yotpoConfigurations[loopIndex];
        var processCurrentLocale = validateOrderFeedConfigData(yotpoConfiguration, yotpoJobConfigurations.orderFeedJobLastExecutionTime);

        if (processCurrentLocale) {
            utokenAuthCode = yotpoConfiguration.custom.utokenAuthCode;
            currentLocaleID = yotpoConfiguration.custom.localeID;
            yotpoAppKey = yotpoConfiguration.custom.appKey;

            ordersIterator = searchOrders(yotpoJobConfigurations.currentDateTime,
            yotpoJobConfigurations.orderFeedJobLastExecutionTime);

            YotpoLogger.logMessage('Processing Locale ID - ' + currentLocaleID +
                '\n Total Orders to Process - ' + ordersIterator.count, 'debug', logLocation);

            while (ordersIterator.hasNext()) {
                payload = prepareOrderJSON(yotpoConfiguration, ordersIterator, exportOrderConfig);
                if (!empty(payload)) {
                    authenticationError = sendOrdersToYotpo(payload, yotpoAppKey);

                    if (authenticationError) {
                        authenticationResult = AuthenticationModel.authenticate(yotpoConfiguration);
                        utokenAuthCode = authenticationResult.updatedUTokenAuthCode;
                        updateUToken(currentLocaleID, utokenAuthCode);
                        payload = updateUTokenInOrderJSON(utokenAuthCode, payload);

                        // retry export
                        authenticationError = sendOrdersToYotpo(payload, yotpoAppKey);

                        // If the error persist then should terminate here
                        if (authenticationError) {
                            throw Constants.EXPORT_ORDER_RETRY_ERROR;
                        }
                    }
                }
            }// end of while
        }
    }// end of for

    updateJobExecutionTime(yotpoJobConfigurations.currentDateTime);
}

function getDefaultVariant (pvm) {
    var variant = pvm.selectedVariant;
    if (variant) { return variant; }

    var attDefs = pvm.getProductVariationAttributes();
    var HashMap = require('dw/util/HashMap');
    var map = new HashMap();

    for (var i = 0, len = attDefs.length; i < len; i++) {
        var attribute = attDefs[i];
        var selectedValue = pvm.getSelectedValue(attribute);
        if (selectedValue && selectedValue.displayValue.length > 0) {
            map.put(attribute.ID,selectedValue.ID);
        }
    }

    var variants = pvm.getVariants(map);
    for (var k = 0; k < variants.length; k++) {
        var p = variants[k];
        if (p.onlineFlag && p.availabilityModel.availability > 0) {
            return p;
        }
    }
    return null;
}

/* Module Exports */
exports.exportOrder = exportOrder;
