/**
 * This script provides utility functions shared across other Linc
 * related scripts.
 */
var Site = require('dw/system/Site').getCurrent();

/**
 * Returns a date diff based on the order
 *
 * @param {Date} orderCreationDate
 * @returns {Number}
 */
function checkOrderDate(orderCreationDate) {
	var cutoffDate = Site.getCustomPreferenceValue('LincMigrationCutoffDate');
	var datediff = (orderCreationDate - cutoffDate);
	return datediff;
}

/**
 * Returns the Linc URL based on environment.
 *
 * @returns
 */
function getLincUrl(){

	var testMode = Site.getCustomPreferenceValue('LincTestMode');
	var url = Site.getCustomPreferenceValue('LincURL');

	if(testMode) {
		url = Site.getCustomPreferenceValue('LincStagingURL');
	}

	return url;
}


module.exports = {
    checkOrderDate: checkOrderDate,
    getLincUrl: getLincUrl
};
