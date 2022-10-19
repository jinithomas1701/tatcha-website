'use strict';

var base = module.superModule;

var viewedProductObj = {};
var checkoutObj = {};
var cartObj = {};
var categoryObj = {};
var placeOrderObj = {};
var searchObj = {};
var klaviyoTagUtils = require('*/cartridge/scripts/utils/klaviyo/klaviyoTagUtils.js');

/*
* @param {Object} klData - request param
*/
base.klaviyoOnSiteTags = function klaviyoOnSiteTags(klData) {    // eslint-disable-line

    if(typeof klData != 'undefined'){
        if (klData.event === 'Viewed Product') {
            viewedProductObj.data = klaviyoTagUtils.prepareViewedProductObject(klData);
            viewedProductObj.eventType = 'track';
            viewedProductObj.eventName = klData.event;
            return JSON.stringify(viewedProductObj);
        }
    
        if (klData.event === 'Started Checkout') {
            checkoutObj.data = klaviyoTagUtils.prepareCheckoutObj(klData);
            checkoutObj.eventType = 'track';
            checkoutObj.eventName = klData.event;
            return JSON.stringify(checkoutObj);
        }
    
        if (klData.event === 'Added to Cart') {
            cartObj.data = klaviyoTagUtils.prepareAddToCartObj(klData);
            cartObj.eventType = 'track';
            cartObj.eventName = klData.event;
            return JSON.stringify(cartObj);
        }
    
        if (klData.event === 'Placed Order') {
            placeOrderObj.data = klData;
            placeOrderObj.eventType = 'track';
            placeOrderObj.eventName = klData.event;
            return JSON.stringify(placeOrderObj);
        }
    
        if (klData.event === 'Viewed Category') {
            categoryObj.data = {};
            categoryObj.data['Viewed Category'] = klData.pageCategoryId;
            categoryObj.eventType = 'track';
            categoryObj.eventName = klData.event;
            return JSON.stringify(categoryObj);
        }
    
        if (klData.event === 'Site Search') {
            searchObj.data = {};
            searchObj.data['Search Term'] = klData.searchTerm;
            searchObj.data['Search Results Count'] = klData.searchResultsCount;
            searchObj.eventType = 'track';
            searchObj.eventName = klData.event;
            return JSON.stringify(searchObj);
        }
    }
};

module.exports = base;
