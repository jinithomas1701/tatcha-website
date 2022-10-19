'use strict';
/* global dw empty */

/**
* Job, which is reads input CSV file (DW_ID,bt_token,CC_last4,CC_type,CC_expmonth,CC_expyear) and checks if customer with id DW_ID already has such payment instrument with method token (bt_token) and if not creates new customer payment instrument with all dummy values except braintree payment token (bt_token).
*
* This Job accepts job parameters:
*
* file_name - input file short name without path (impex/src/braintree will be prepended automatically). If no parameter provided 'braintree_payment_tokens.csv' will be used as file name.
* ignore_exist_tokens - bool flag indicates if check for existing tokens should be skipped. If check skipped, this may cause to duplicated payment methods.
* remove_file - bool flag indicates if import file should be removed after processing.
* clean_wallet - bool flag indicates if all customer's saved methods should be removed before import
*
*/

var CustomerMgr = require('dw/customer').CustomerMgr;
var System = require('dw/system');
var Transaction = require('dw/system/Transaction');

function execute(parameters) { // eslint-disable-line require-jsdoc
    var helper = require('~/cartridge/scripts/braintree/braintreeHelper');
    var logger = helper.getLogger();

    // Options from the Job input parameters
    var options = {
        fileShortName: parameters.file_name || 'braintree_payment_tokens.csv',
        ignoreExistTokens: (parameters.ignore_exist_tokens === 'true'),
        removeInputFileAfterImport: (parameters.remove_file === 'true'),
        cleanUpCustomersWallet: (parameters.clean_wallet === 'true')
    };

    /**
     * isPaymentInstrumentExistsInWallet(wallet, payment_method_token) function. Accepts customer Wallet and Braintree Payment Method Token
     * Checks if customer has Payment Method with Braintree Token given
     * @param {dw.customer.Wallet} wallet Customer Wallet
     * @param {string} paymentMethodToken Braintree Payment Method Token
     * @returns {boolean} bool value indicates if customer has payment method with token given
     */
    function isPaymentInstrumentExistsInWallet(wallet, paymentMethodToken) {
        var instrumentsIterator = wallet.getPaymentInstruments().iterator();
        var exists = false;

        while (instrumentsIterator.hasNext()) {
            var pi = instrumentsIterator.next();
            if (!empty(pi.custom.braintreePaymentMethodToken) && pi.custom.braintreePaymentMethodToken === paymentMethodToken) {
                exists = true;
                break;
            }
        }

        return exists;
    }

    /**
     * createFakeCardNumber(tokenizedMethodDetails) function. Accepts tokenizedMethodDetails and creates semi-fake credit card number
     * @param {Object} tokenizedMethodDetails Object contains csv data
     * @returns {string} fakeNumberString fake number with correct last 4
     * @throws {Error} if no last4 in input csv
     */
    function createFakeCardNumber(tokenizedMethodDetails) {
        var fakeNumberString = tokenizedMethodDetails.prefix + tokenizedMethodDetails.midPart + tokenizedMethodDetails.creditCardLastFour;
        return fakeNumberString;
    }

    /**
    * Add prefixes hack for demandware
    * @param {Object} tokenizedMethodDetailsData Tokenized Method Details object
    * @returns {System.Status} Status
    */
    function decorateDetailsByType(tokenizedMethodDetailsData) {
        var tokenizedMethodDetails = tokenizedMethodDetailsData;

        tokenizedMethodDetails.midPart = String(Date.now().toString().substr(0, 8));

        switch (String(tokenizedMethodDetails.creditCardType).toLowerCase().replace(/\s/g, '')) {

            case 'visa':
                tokenizedMethodDetails.prefix = '4111';
                tokenizedMethodDetails.creditCardType = 'Visa';
                break;

            case 'mastercard':
                tokenizedMethodDetails.prefix = '5444';
                tokenizedMethodDetails.creditCardType = 'MasterCard';
                break;

            case 'americanexpress':
                tokenizedMethodDetails.prefix = '3782';
                tokenizedMethodDetails.creditCardType = 'Amex';
                break;

            case 'discover':
                tokenizedMethodDetails.prefix = '6011';
                tokenizedMethodDetails.creditCardType = 'Discover';
                break;

            default:
                tokenizedMethodDetails.prefix = '4111';
                tokenizedMethodDetails.creditCardType = 'Visa';
        }

        return tokenizedMethodDetails;
    }

    /**
     * createCustomerPaymentInstrument(customer_id, payment_method_token) function. Accepts customer ID and Braintree Payment Method Token
     * Creates Payment Instrument for the Customer with a given ID
     * @param {Object} tokenizedMethodDetailsData Object contains
     * @param {boolean} ignoreExistTokens indicates if exiting tokens should be ignored (may cause duplicates of Payment Instrumetns with the same tokens)
     * @throws {Error} if customer not found
     */
    function createCustomerPaymentInstrument(tokenizedMethodDetailsData, ignoreExistTokens) {
        var tokenizedMethodDetails = tokenizedMethodDetailsData;
        var customerId = tokenizedMethodDetails.customerId;
        var paymentMethodToken = tokenizedMethodDetails.braintreePaymentMethodToken;
        var creditCardExpMonth = tokenizedMethodDetails.creditCardExpMonth;
        var creditCardExpYear = tokenizedMethodDetails.creditCardExpYear;

        // Check if customer id was truncated (e.g. 4101 instead of 00004101) may be a rare case.
        if (customerId.length !== 7) {
            var prependBy = 8 - customerId.length;
            var prefix = '00000000';
            customerId = prefix.slice(0, prependBy) + customerId;
        }

        var customer = CustomerMgr.getCustomerByCustomerNumber(customerId);

        try {
            if (!customer) {
                throw new Error('No customer with ID given: ' + customerId);
            }

            var customerProfile = customer.getProfile();
            var customerWallet = customerProfile.getWallet();

            // Check if PM's should be checked first.
            if (!ignoreExistTokens) {
                var isPaymentInstrumentAlreadyExists = isPaymentInstrumentExistsInWallet(customerWallet, paymentMethodToken);

                if (isPaymentInstrumentAlreadyExists) {
                    logger.info('Cusomer with id: ' + customerId + ' already has Payment Instrument with Braintree Payment Method Token: ' + paymentMethodToken);
                    return; // Skip if customer already has Payment Instrument with payment method token provided
                }
            }

            var newPaymentInstrument = null;
            Transaction.wrap(function () {
                newPaymentInstrument = customerWallet.createPaymentInstrument(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);
            });

            var cardHolderName = (customerProfile.getFirstName() || '') + ' ' + (customerProfile.getLastName() || '');
            var cardNumber = '';

            try {
                tokenizedMethodDetails = decorateDetailsByType(tokenizedMethodDetails);
                cardNumber = createFakeCardNumber(tokenizedMethodDetails);
            } catch (error) {
                logger.warn('Braintree payment method cannot be imported for customer: ' + customerId + ' because csv have some issues with credit card related data');
                logger.error(error.toString());
                return; // Skip current customer row record
            }

            Transaction.wrap(function () {
                // Set dummy cc and braintree payment token to the payment instrument
                newPaymentInstrument.setCreditCardHolder(cardHolderName);
                newPaymentInstrument.setCreditCardNumber(cardNumber);
                newPaymentInstrument.setCreditCardExpirationMonth(creditCardExpMonth);
                newPaymentInstrument.setCreditCardExpirationYear(creditCardExpYear);
                newPaymentInstrument.setCreditCardType(tokenizedMethodDetails.creditCardType);
                newPaymentInstrument.custom.braintreePaymentMethodToken = paymentMethodToken;
            });
        } catch (err) {
            throw err;
        }

        logger.info('Braintree Payment instrument with token: ' + paymentMethodToken + ' added for customer: ' + customerId);
    }

    /**
     * removeAllInstruments(file) function. Removes all payment instruments from customers wallet
     * @param {dw.io.File} file File to read customer ids
     * @throws {Error}
     */
    function removeAllInstruments(file) {
        var importReader = new dw.io.FileReader(file);
        var importFileCsvReader = new dw.io.CSVStreamReader(importReader, ',', '"', 1);
        var line = '';

        Transaction.wrap(function () {
            while (line = importFileCsvReader.readNext()) { // eslint-disable-line no-cond-assign
                var customerId = line[0];
                var wallet = CustomerMgr.getCustomerByCustomerNumber(customerId).getProfile().getWallet();
                var instruments = wallet.getPaymentInstruments().iterator();
                while (instruments.hasNext()) {
                    wallet.removePaymentInstrument(instruments.next());
                }
            }
        });

        importFileCsvReader.close();
        importReader.close();
    }

    /**
     * importTokensJob(options) function. Accepts Input CSV (impex/src/braintree/braintree_payment_tokens.csv) with the structure: DW_ID,bt_token,CC_last4,CC_type,CC_expmonth,CC_expyear
     * Imports Braintree Payment Method Token to the customers with given ID's. Method token will be stored to
     * the newly created payment metthod record in the customer's wallet
     * @param {Object} opts for job, please see ImportTokens.ds
     *
     */
    function importTokensJob(opts) {
        var filePath = [dw.io.File.IMPEX, 'src', 'braintree', opts.fileShortName].join(dw.io.File.SEPARATOR);
        var importFile = new dw.io.File(filePath);
        var importReader = new dw.io.FileReader(importFile);
        var importFileCsvReader = new dw.io.CSVStreamReader(importReader, ',', '"', 1);
        var line = '';

        logger.info('Begin import process');

        // Remove all saved instruments
        if (opts.cleanUpCustomersWallet) {
            removeAllInstruments(importFile);
        }

        // Iterate through input CSV lines and create Payment Instrument for customer given
        while (line = importFileCsvReader.readNext()) { // eslint-disable-line no-cond-assign
            // DW_ID,bt_token,CC_last4,CC_type,CC_expmonth,CC_expyear from input CSV
            // Create handy object to pass through function calls
            var tokenizedMethodDetails = {
                customerId: line[0],
                braintreePaymentMethodToken: line[1],
                creditCardLastFour: line[2],
                creditCardType: line[3],
                creditCardExpMonth: parseInt(line[4], 10),
                creditCardExpYear: parseInt(line[5], 10)
            };

            try {
                createCustomerPaymentInstrument(tokenizedMethodDetails, opts.ignoreExistTokens);
            } catch (err) {
                logger.error(err.toString());
            }
        }

        importFileCsvReader.close();
        importReader.close();

        if (opts.removeInputFileAfterImport) {
            importFile.remove();
        }

        logger.info('Import process has finished');
    }

    try {
        importTokensJob(options);
    } catch (err) {
        logger.error(err.toString());
        return new System.Status(System.Status.ERROR);
    }

    return new System.Status(System.Status.OK);
}

exports.execute = execute;
