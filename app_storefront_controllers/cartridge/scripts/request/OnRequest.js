'use strict';

/**
 * The onRequest hook is called with every top-level request in a site. This happens both for requests to cached and non-cached pages.
 * For performance reasons the hook function should be kept short.
 *
 * @module  request/OnRequest
 */

var Status = require('dw/system/Status');
/* Queue-It changes start */
var QueueIt = require('int_queueit_controllers/cartridge/scripts/QueueIt.js');
/* Queue-It changes end */
var Logger = require('dw/system/Logger');

/**
 * The onRequest hook function.
 */
exports.onRequest = function() {
	/* Queue-It changes start */
	QueueIt.Start();
	/* Queue-It changes end */
	//logger.info("inside onRequest.");

	// Setting session cookie for new/returning.
	if (empty(session.custom.userType)) {
		var sitePrefs = require('dw/system/Site').getCurrent().getPreferences();
		var userTypeTrackingEnabled = 'userTypeTrackingEnabled' in sitePrefs.getCustom() && sitePrefs.getCustom()["userTypeTrackingEnabled"] ? sitePrefs.getCustom()["userTypeTrackingEnabled"] : null;

		if (userTypeTrackingEnabled) {

			var logger = Logger.getLogger('userTypeTracking', 'custom - userTypeTracking()');
			try {
				var cookies = request.getHttpCookies();
				session.custom.userType = 'new';
				var cookieName = '';
				for (var i = 0; i < cookies.getCookieCount(); i++) {
					cookieName = cookies[i].getName();
					if (cookieName.indexOf("dw_cookies_popup") == 0) {
						session.custom.userType = 'returning';
						break;
					}
				}
			} catch (e) {
				logger.error("Error setting userType Cookie. Error: " + e.message);
			}

		} else {
			session.custom.userType = 'none';
		}
	}

	return new Status(Status.OK);

};
