var btBusinessLogic = require('*/cartridge/scripts/braintree/braintreeAPI/braintreeBusinessLogic');
var Transaction = require('dw/system/Transaction');

/**
 * Creates customer on Braintree side if customer doesn't exist in Braintree
 */
function createCustomerOnBraintreeSide() {
    var customerVaultData = btBusinessLogic.isCustomerInVault(customer);

    if (!customerVaultData.isCustomerInVault && !customerVaultData.error) {
        btBusinessLogic.createCustomerOnBraintreeSide();
    }
}

function checkAndCreateCustomer() {
    var customerData = customer.getProfile();
    if(customer.isRegistered() && empty(customerData.custom.braintreeCustomerId)) {
        createCustomerOnBraintreeSide();
    }
}
module.exports = {
    createCustomerOnBraintreeSide:createCustomerOnBraintreeSide,
    checkAndCreateCustomer: checkAndCreateCustomer
}