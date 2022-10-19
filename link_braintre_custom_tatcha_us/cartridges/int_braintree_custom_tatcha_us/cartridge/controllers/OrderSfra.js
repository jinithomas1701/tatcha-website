'use strict';

var page = module.superModule;
var server = require('server');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var btBusinessLogic = require('*/cartridge/scripts/braintree/braintreeAPI/braintreeBusinessLogic');

server.extend(page);

/**
 * Creates customer on Braintree side if customer doesn't exist in Braintree
 */
function createCustomerOnBraintreeSide() {
    var customerVaultData = btBusinessLogic.isCustomerInVault(customer);

    if (!customerVaultData.isCustomerInVault && !customerVaultData.error) {
        btBusinessLogic.createCustomerOnBraintreeSide();
    }
}

server.append('CreateAccount', server.middleware.https,
    csrfProtection.validateAjaxRequest, function (req, res, next) {
        this.on('route:BeforeComplete', function (_, res) { // eslint-disable-line no-shadow
            if (customer.authenticated) {
                createCustomerOnBraintreeSide();
            }
        });
    next();
});

module.exports = server.exports();
