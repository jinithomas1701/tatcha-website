var Status = require('dw/system/Status');


exports.afterPOST = function(basket) {
	        var currentCustomer : dw.customer.Customer = session.getCustomer();
	        
	        if (currentCustomer.authenticated) {
	            basket.setCustomerEmail(currentCustomer.profile.email);
	        }

};