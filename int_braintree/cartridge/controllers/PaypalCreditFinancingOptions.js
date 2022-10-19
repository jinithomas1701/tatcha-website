'use strict';

/* global dw request response */

var guard = require('*/cartridge/scripts/guard');
var creditFinancialOptionsHelper = require('*/cartridge/scripts/braintree/paypalCreditFinancingOptionsHelper');

/**
 * Entry point for retrieving lowest possible monthly cost
 */
function getLowestPossibleMonthlyCost() {
    var value = parseFloat(request.httpParameterMap.value.stringValue);
    var currencyCode = request.httpParameterMap.currencyCode.stringValue.toUpperCase();
    var countryCode = request.httpParameterMap.countryCode.stringValue;
    if (!countryCode) {
        countryCode = dw.util.Locale.getLocale(request.locale).country;
    }
    countryCode = countryCode.toUpperCase();
    var lowerPricePerMonth = creditFinancialOptionsHelper.getLowestPossibleMonthlyCost(value, currencyCode, countryCode);

    response.setContentType('application/json');
    response.setExpires(new Date(Date.now() + (24 * 60 * 60 * 1000)));
    response.setVaryBy('price_promotion');
    response.writer.print(JSON.stringify({
        value: lowerPricePerMonth.value,
        currencyCode: lowerPricePerMonth.currencyCode,
        labelText: dw.web.Resource.msgf('paypal.creditFinancingOptions.productTile.lowerMonthCost.ph', 'locale', '', lowerPricePerMonth.formatted)
    }, null, 2));
}

/**
 * Entry point for retrieving all Credit Financing Options
 */
function getAllOptionsData() {
    var value = parseFloat(request.httpParameterMap.value.stringValue);
    var currencyCode = request.httpParameterMap.currencyCode.stringValue.toUpperCase();
    var countryCode = request.httpParameterMap.countryCode.stringValue;
    if (!countryCode) {
        countryCode = dw.util.Locale.getLocale(request.locale).country;
    }
    countryCode = countryCode.toUpperCase();

    var allOptionsData;
    var lowerPricePerMonth;
    if (!value || !currencyCode || !countryCode) {
        allOptionsData = {
            error: {
                errorText: 'Not all parameters are passed. Should be: value, currencyCode, countryCode'
            }
        };
    } else {
        allOptionsData = creditFinancialOptionsHelper.getDataForAllOptionsBanner(value, currencyCode, countryCode);
        lowerPricePerMonth = creditFinancialOptionsHelper.getLowestPossibleMonthlyCost(value, currencyCode, countryCode);
        allOptionsData.lowerCostPerMonth = {
            value: lowerPricePerMonth.value,
            currencyCode: lowerPricePerMonth.currencyCode,
            formatted: lowerPricePerMonth.formatted
        };
    }

    response.setContentType('application/json');
    response.setExpires(new Date(Date.now() + (24 * 60 * 60 * 1000)));
    response.setVaryBy('price_promotion');
    response.writer.print(JSON.stringify(allOptionsData, null, 2));
}

exports.GetLowestPossibleMonthlyCost = guard.ensure(['get'], getLowestPossibleMonthlyCost);
exports.GetAllOptionsData = guard.ensure(['get'], getAllOptionsData);
