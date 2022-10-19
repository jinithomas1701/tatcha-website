'use strict';

var braintreeCreditProcessor = require('~/cartridge/scripts/braintree/processorCredit');


/**
 * Create Braintree payment instrument and update shipping and billing address, if the new one was given
 * @param {Object} args Arguments
 * @returns {Object} handle call result
 */
function Handle(args) {
    var result = braintreeCreditProcessor.handle(args.Basket);
    return result;
}

/**
 * Create sale transaction and handle result
 * @param {Object} args Arguments
 * @returns {Object} sale call result
 */
function Authorize(args) {
    var result = braintreeCreditProcessor.authorize(args.OrderNo, args.PaymentInstrument);
    return result;
}

exports.Handle = Handle;
exports.Authorize = Authorize;
