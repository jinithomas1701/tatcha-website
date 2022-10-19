'use strict';

/**
 * Clear the promo form errors.
 */
function clearPreviousErrors() {
    if ($('.promocode-applied').length === 0) {
	    $('.promocode-link').show();
	    $('.coupon-missing-error').hide();
		$('.coupon-error-message').hide();
	    $('.promocode-form').hide();
	}
}

module.exports = {
    clearPreviousErrors: clearPreviousErrors
};
