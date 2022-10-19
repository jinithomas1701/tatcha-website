'use strict';

var braintreeGooglepayProcessor = require('~/cartridge/scripts/braintree/processorGooglepay');


/**
 * Create Braintree payment instrument and update shipping and billing address, if the new one was given
 * @param {Object} args Arguments
 * @param {boolean} fromCart Is checkout started from the Cart page
 * @returns {Object} handle call result
 */
function Handle(args, fromCart) {
    var result = braintreeGooglepayProcessor.handle(args.Basket, fromCart);
    return result;
}

/**
 * Create sale transaction and handle result
 * @param {Object} args Arguments
 * @returns {Object} sale call result
 */
function Authorize(args) {
    var result = braintreeGooglepayProcessor.authorize(args.OrderNo, args.PaymentInstrument);
    return result;
}

exports.Handle = Handle;
exports.Authorize = Authorize;
