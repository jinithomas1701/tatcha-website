'use strict';
var server = require('server');

var Site = require('dw/system/Site');

/**
 * Loqate Address verification,
 * Method checks the address, and returns verification status and
 * a suggested address if one available from Loqate response,
 * **/
 server.post('VerifyAddress', server.middleware.https, function(req, res, next) {
    var loqate = require('~/cartridge/scripts/LoqateAddressHelper');
    var param = req.httpParameterMap;
    var hasError;

    if(!param || empty(param.Address)) {
        hasError = true;
    }

    var address = JSON.parse(param.Address.stringValue);
    if( (address['Address1'] && address['Address1'].length === 0) || (address['Country'] && address['Country'].length === 0) || (address['PostalCode'] && address['PostalCode'].length === 0) || (address['State'] && address['State'].length === 0)) {
        hasError = true;
    }

    if(hasError) {
        res.json({
            "response" : {
                "success": false
            }
        });
        return next();
    }

    try {
        // address verification service call
        var response = loqate.verifyAddress(address);

        if(!response) {
            res.json({
                "response" : {
                    "success": false
                }
            });
            return next();
        }

        if(response) {
            if(response.length > 0) {
                var rowData = response[0];
                var responseData ={};
                var hasAddressSuggetion = false;
                var isSuccess = false;
                var verificationStatus = '';

                // Comma separated list of acceptable AQI index (eg:- 'A,B')
                var acceptedAQIs = Site.getCurrent().getCustomPreferenceValue('LOQATE_Address_Quality_index');
                var AQIs = acceptedAQIs.toUpperCase();

                /**
                 * To check the address quality index returned by loquate,
                 * If it is greater than the min quality index configured, return loqate suggested address
                 * Else, return a flag indicating hasAddressSuggetion = false
                 * **/

                if(rowData && rowData.Matches && rowData.Matches.length > 0) {
                    isSuccess =  true;

                    var addressData = rowData.Matches[0];
                    var isValidAQI = addressData.AQI ? (AQIs.indexOf(addressData.AQI.toUpperCase()) > -1) : false;
                    var isValidPostVerificationValue = false;

                    if(addressData.AVC) {
                        isValidPostVerificationValue = (addressData.AVC[1] >= 4) ? true : false;
                    }

                    var addressMatchScore = 0;
                    var postProcessedVerificationMatchLevel = 0;

                    // set user entered address to response object
                    if(rowData.Input) {
                        responseData.inputAddress = rowData.Input;
                    }

                    //set address suggestion to response object
                    responseData.suggestedAddress = addressData;

                    if(addressData.AVC) {
                        var avcSplit = addressData.AVC.split('-');
                        if(avcSplit.length === 4) {
                            addressMatchScore = avcSplit[3];
                            postProcessedVerificationMatchLevel = avcSplit[0];
                        }
                    }

                    if(isValidAQI && isValidPostVerificationValue){
                        // Address suggestion available
                        hasAddressSuggetion = true;
                        verificationStatus = 'verified';

                    } else if ((isValidAQI && !isValidPostVerificationValue) || (!isValidAQI && isValidPostVerificationValue )) {
                        //addresses with some partial corrections required
                        hasAddressSuggetion = true;
                        verificationStatus = 'partial';

                    } else if((!addressData.hasOwnProperty('AQI')) || (addressData && (!isValidAQI && !isValidPostVerificationValue))) {

                        verificationStatus = 'unverified';
                        hasAddressSuggetion = true;

                    } else {
                        hasAddressSuggetion = false;
                    }

                } else {
                    hasAddressSuggetion =  false;
                }
            }

            res.json({
                "response" : {
                    "success": isSuccess,
                    "hasAddressSuggetion": hasAddressSuggetion,
                    "verificationStatus": verificationStatus,
                    "matchScore": addressMatchScore,
                    "postProcessMatch": postProcessedVerificationMatchLevel,
                    "data": responseData
                }
            });
            return next();
        }
    } catch(e) {
        res.json({
            "response" : {
                "success": false
            }
        });
        return next();
    }
});

module.exports = server.exports();
