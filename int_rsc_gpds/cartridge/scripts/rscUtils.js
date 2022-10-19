function getCustomersActiveSubscriptions () {
var RefillCustomerModel = require("int_smartorderrefill/cartridge/models/smartOrderRefill/refillCustomer.js");
	var refillCustomer = new RefillCustomerModel({
		customer: customer
	});
	var subscriptionsList = [];
	subscriptionsList = refillCustomer.getActiveSubscriptions();
	var subscriptionProds = [];
	if(!empty(subscriptionsList) && subscriptionsList.length > 0){
		for each(var subscription in subscriptionsList){
			var products = subscription.products;
			 for each(var prod in products){
				var prodName = dw.catalog.ProductMgr.getProduct(prod.ID);
				subscriptionProds.push(prodName.name);
			}
		}
		subscriptionProds = subscriptionProds.toString();
		session.privacy.subscriptionProds = subscriptionProds;
	}
	return subscriptionProds;
}










exports.getCustomersActiveSubscriptions = getCustomersActiveSubscriptions;