'use strict';

var Bytes = require('dw/util/Bytes');
var Encoding = require('dw/crypto/Encoding');
var WeakMessageDigest = require('dw/crypto/WeakMessageDigest');
var WeakMac = require('dw/crypto/WeakMac');

var paymentMethodWhHelper = {};

/**
 * Computes the hash value of sha1 Algorithm for the passed secret key
 * @param {*} key Private key
 * @returns {Bytes} Bytes
 */
function getSha1HashValue(key) {
    var privateKeyToBytes = new Bytes(key);
    var weakMessageDigest = new WeakMessageDigest(WeakMessageDigest.DIGEST_SHA_1);

    return weakMessageDigest.digestBytes(privateKeyToBytes);
}

/**
 * Computes the hash value for the passed payload using the passed secret key.
 * @param {*} key Private Key
 * @param {*} data Payload
 * @returns {string} Hex string
 */
function getHmacSha1HashValue(key, data) {
    var payloadToBytes = new Bytes(data);
    var weekMac = new WeakMac(WeakMac.HMAC_SHA_1);

    return weekMac.digest(payloadToBytes, getSha1HashValue(key));
}

/**
 * Creates array of bytes
 * @param {*} string String to unpack
 * @returns {Array} Array of bytes
 */
function getBytesFromString(string) {
    var bytes = [];

    for (var index = 0; index < string.length; index++) {
        bytes.push(string.charCodeAt(index));
    }

    return bytes;
}

/**
 * Creates zip array
 * @param {*} arrays Arrays of bytes
 * @returns {Array} Array
 */
function getZipArray(arrays) {
    var longestLength = arrays.reduce(function (prev, current) {
        return prev > current.length ? prev : current.length;
    }, 0);
    var zipArray = [];
    var currentIndex = 0;

    while (currentIndex < longestLength) {
        var nextArray = [];
        var i = currentIndex;

        arrays.forEach(function (array) {
            nextArray.push(array[i]);
        });

        zipArray.push(nextArray);

        currentIndex++;
    }

    return zipArray;
}

/**
 * Gets graph QL service credentials
 * @returns {*} Service config
 */
paymentMethodWhHelper.getBtServiceCredentials = function () {
    var createGraphQlService = require('*/cartridge/scripts/service/braintreeGraphQLService');
    var service = createGraphQlService();

    return service.configuration.credential;
};

/**
 * Compare signature with payload
 * @param {*} signature Signatare
 * @param {*} payload Payload
 * @returns {boolean} Boolean
 */
paymentMethodWhHelper.signatureWithPayloadComparizon = function (signature, payload) {
    if (signature == null || payload == null) return false;

    var signatureInBytes = getBytesFromString(signature);
    var payloadInBytes = getBytesFromString(payload);
    var result = 0;

    for (var [signatureInByte, payloadInByte] of getZipArray([signatureInBytes, payloadInBytes])) {
        result |= signatureInByte ^ payloadInByte;
    }

    return result === 0;
};

/**
 * Computes sha1 hex digest for payload using the passed secret key
 * @param {*} key Private Key
 * @param {*} data Payload
 * @returns {Bytes} Bytes
 */
paymentMethodWhHelper.getSha1HexDigestValue = function (key, data) {
    var hmacSha1HashValue = getHmacSha1HashValue(key, data);

    return Encoding.toHex(hmacSha1HashValue);
};

module.exports = paymentMethodWhHelper;
