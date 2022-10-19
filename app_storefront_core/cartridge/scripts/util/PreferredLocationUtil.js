importPackage( dw.system );
importPackage( dw.util );
var app = require('app_storefront_controllers/cartridge/scripts/app');
var Site = require('dw/system/Site');

/*
 * This function is used to send verification code  
 */

function setPreferredLocation(order,orderDetails) {
	
	// Location names in Netsuite
	var configJsonObj = JSON.parse(Site.getCurrent().getCustomPreferenceValue('preferredLocationConfig'));
	var locationRollings = configJsonObj.locationRollings;
	var locationCapacity = configJsonObj.locationCapacity;    	
	var preferredLocation = '';
	
    try {    	
    	// Rollins Configurations rules
    	var sendInternational = configJsonObj.sendInternational;
        var shippingMethods = configJsonObj.shippingMethods;
        var rollinsOnlyCategory = configJsonObj.rollinsOnlyCategory;
        var sendMultiLine = configJsonObj.sendMultiLine;
        
        // Check if gift card
		if ((typeof(orderDetails['SHIPPING_ADDRESS']) == 'undefined') || (typeof(orderDetails['SHIPPING_ADDRESS']) != 'undefined' && orderDetails['SHIPPING_ADDRESS'].length == 0)) {  
			preferredLocation = locationRollings;	
		}	

    	// Check for international 
    	if(!preferredLocation){
    		if(sendInternational && (orderDetails['SHIPPING_ADDRESS'][0]['COUNTRY_CODE'] != 'US')) {
    			preferredLocation = locationRollings;	
    		}	
    	}     	
    	
    	// Shipping Methods
    	if(!preferredLocation) {
	        for(var i=0;i<shippingMethods.length;i++){
	 			if(shippingMethods[i] == orderDetails['SHIPPING_METHOD']){
	 				preferredLocation = locationRollings; 
	 				break;
	 			}
	     	}
    	}

    	// Items 
    	if(!preferredLocation) {
	        for(var i=0;i<orderDetails['ITEM_CATEGORIES'].length;i++){
	 			if(orderDetails['ITEM_CATEGORIES'][i] == rollinsOnlyCategory){
	 				preferredLocation = locationRollings; 
	 				break;
	 			}
	     	}
    	}
    	
    	// Gift Msg 
    	if(!preferredLocation) {
    		if (typeof(orderDetails['GIFT_MESSAGE']) != 'undefined' && !empty(orderDetails['GIFT_MESSAGE'])) {  
    			preferredLocation = locationRollings;	
    		}	
    	}
    	
    	// Multiline
    	if(!preferredLocation) {
    		var minimumItems = configJsonObj.minMultiLineItems;
    	    if(typeof(minimumItems) == 'undefined' || empty(minimumItems)){
    	    	minimumItems = 1;
    	    }
    		
    		if (sendMultiLine && typeof(orderDetails['ITEMS']) != 'undefined' && (orderDetails['ITEMS'].length > minimumItems)) {  
    			preferredLocation = locationRollings;	
    		}	
    	}
    	
    	if(!preferredLocation) {
    		preferredLocation = locationCapacity;
    	}
    	
    	
	} 
	catch(e){
		preferredLocation = locationCapacity;
	}
	
	try{
		if(preferredLocation) {
		    Transaction.wrap(function () {
		        order.custom.preferredLocation = preferredLocation;
		    }); 
		}
	} catch(e){ }

}


module.exports.setPreferredLocation = setPreferredLocation;