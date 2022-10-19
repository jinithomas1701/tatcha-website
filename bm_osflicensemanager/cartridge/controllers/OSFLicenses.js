"use strict";

/* global empty, request */
// API includes
var CustomObjectMgr = require("dw/object/CustomObjectMgr");
var ISML = require("dw/template/ISML");
var Site = require("dw/system/Site");
var Transaction = require("dw/system/Transaction");

// OSF module includes
var OSFLicenseManager = require("*/cartridge/scripts/utils/osfLicenseManager");
var OSFLicenseConstants = require("*/cartridge/scripts/utils/licenseConstants");
var productList = require("*/cartridge/productsMapping.json");
var sessionUserName = session.getUserName();
if (sessionUserName === "storefront") {
    throw Error("Unauthorized Access");
}
/**
 * @description find product id and code from product name
 * @param {string} productName name of OSF product
 * @return {Object} product id and code
 */
function searchProductCredential(productName) {
    var products = productList.PRODUCTS;
    var productInfo = null;
    for (var i = 0; i < products.length; i += 1) {
        if (products[i].Name === productName) {
            productInfo = {
                productID: products[i].ID,
                productCode: products[i].Code
            };
            break;
        }
    }
    return productInfo;
}
/**
 * @description get instaled license information
 */
function getLicenses() {
    var osfLicenses = [];
    var installedProducts = [];

    var installedLicenses = CustomObjectMgr.queryCustomObjects(
        OSFLicenseConstants.CUSTOM_OBJECT_TYPE,
        "custom.siteID = {0}",
        "custom.productCode ASC",
        Site.current.ID
    );
    while (installedLicenses.hasNext()) {
        var license = installedLicenses.next();

        if (!empty(license.custom.activationKey)) {
            osfLicenses.push({
                licenseUniqueID: license.custom.licenseUniqueID,
                isValid: license.custom.isValid,
                productName: license.custom.productName,
                productID: license.custom.productID,
                activationKey: license.custom.activationKey,
                email: license.custom.email,
                validationDateKey: license.custom.validationDateKey,
                expiryDate: license.custom.expiryDate
            });
        }
        installedProducts.push(license.custom.productName);
    }

    ISML.renderTemplate("licenses", {
        osfLicenses: osfLicenses,
        productList: productList.PRODUCTS,
        installedProducts: installedProducts
    });
}
exports.GetLicenses = getLicenses;
exports.GetLicenses.public = true;

/**
 * @description install new license
 */
function saveLicense() {
    var license = JSON.parse(request.httpParameterMap.requestBodyAsString);

    if ((empty(license.productID) || empty(license.productCode)) && !empty(license.activationKey)) {
        var licenseCredential = searchProductCredential(license.productName);
        license.productCode = licenseCredential.productCode;
        license.productID = licenseCredential.productID;
    }

    OSFLicenseManager.installLicense(license);
}
exports.SaveLicense = saveLicense;
exports.SaveLicense.public = true;

/**
 * @description remove existing license
 */
function removeLicense() {
    var license = JSON.parse(request.httpParameterMap.requestBodyAsString);
    var result;
    var licenseToRemove = CustomObjectMgr.getCustomObject(
        OSFLicenseConstants.CUSTOM_OBJECT_TYPE,
        license.licenseUniqueID
    );

    var equalProduct = licenseToRemove.custom.productCode === license.productCode;
    var isValid = licenseToRemove.custom.isValid;
    var isInstalled = licenseToRemove.custom.isInstalled;

    if (license.action && equalProduct && (isValid || isInstalled)) {
        return;
    }

    try {
        Transaction.wrap(function () {
            CustomObjectMgr.remove(licenseToRemove);
        });
        result = {
            success: true,
            errorMsg: null
        };
    } catch (e) {
        result = {
            success: false,
            errorMsg: e.message
        };
    }
    ISML.renderTemplate("json", {
        jsonObject: result
    });
}
exports.RemoveLicense = removeLicense;
exports.RemoveLicense.public = true;

/**
 * @description Update license by removing and re adding license
 */
function updateLicense() {
    removeLicense();
    saveLicense();
}
exports.UpdateLicense = updateLicense;
exports.UpdateLicense.public = true;
