'use strict';

function optBillingAddressSameAsShipping () {
    $(document).find('.billing-address-block .billing-address').hide();
}


module.exports = {
    optBillingAddressSameAsShipping: optBillingAddressSameAsShipping
}