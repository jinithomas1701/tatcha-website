var Resource = require('dw/web/Resource');
var Encoding = require('dw/crypto/Encoding');
var xmlHelper = require('~/cartridge/scripts/braintree/helpers/xmlHelper');

var {
    getBtServiceCredentials,
    signatureWithPayloadComparizon,
    getSha1HexDigestValue
} = require('~/cartridge/scripts/braintree/helpers/paymentMethodWhHelper');

/**
 * WebHook init model
 */
function webHookInit() {
    this.credentials = getBtServiceCredentials();
}

/**
 * Matchs signatures with public key
 * @param {*} signaturePairs Array of signature pairs
 * @returns {string} Signature string or null
 */
function matchingSignature(signaturePairs) {
    for (var keyPair of signaturePairs) {
        var publicKey = keyPair[0];
        var signature = keyPair[1];

        if (this.credentials.user === publicKey) return signature;
    }

    return null;
}

/**
 * Parse payload into object
 * @param {*} payload Payment method webHook payload
 * @returns {Object} Notification object
 */
webHookInit.prototype.parsePayload = function (payload) {
    var illegalPattern = /^A-Za-z0-9+=\/\n]/;

    if (!payload) {
        throw Resource.msg('braintree.paymentMethod.webhook.payload.not.exist', 'locale', 'null');
    }

    if (illegalPattern.test(payload)) {
        throw Resource.msg('braintree.paymentMethod.webhook.payload.contains.illegal.characters', 'locale', 'null');
    }

    // Creates xml string from payload of characters encoded in base-64
    var xmlPayload = Encoding.fromBase64(payload).toString();

    return xmlHelper.parseXml(xmlPayload);
};

/**
 * Validates signature
 * @param {*} signatureString Signature
 * @param {*} payload Payload
 * @return {boolean} True if payload match the signature
 */
webHookInit.prototype.validateSignature = function (signatureString, payload) {
    if (!signatureString) {
        throw Resource.msg('braintree.paymentMethod.webhook.signature.not.exist', 'locale', 'null');
    }

    var signaturePairs = signatureString.split('&').filter(function (pair) {
        return pair.indexOf('|') !== -1;
    }).map(function (pair) {
        return pair.split('|');
    });
    var signature = matchingSignature.call(this, signaturePairs);
    var self = this;

    if (!signature) {
        throw Resource.msg('braintree.paymentMethod.webhook.signature.nomatch.public.key', 'locale', 'null');
    }

    var matches = [payload, payload + '\n'].some(function (data) {
        return signatureWithPayloadComparizon(signature, getSha1HexDigestValue(self.credentials.password, data));
    });

    if (!matches) {
        throw Resource.msg('braintree.paymentMethod.webhook.signature.doesnot.match.payload', 'locale', 'null');
    }

    return matches;
};

module.exports = webHookInit;
