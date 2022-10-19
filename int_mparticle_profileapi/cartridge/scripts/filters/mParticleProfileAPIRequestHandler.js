

/* global request, session, response */

/* Script Includes */
var mParticleSSOService = require('~/cartridge/scripts/service/mParticleSSOService');
var mParticleProfileAPIService = require("*/cartridge/scripts/service/mParticleProfileAPIService");
var mParticleAccessKeyGenerator = require("*/cartridge/scripts/helper/mParticleAccessKeyGenerator");


/* API Includes */
var Status = require("dw/system/Status");
var URLUtils = require("dw/web/URLUtils");
var Logger = require('dw/system/Logger');
var Site = require("dw/system/Site");

/**
 * This method will intercept all incoming requests in the storefront 
 */
function callProfileAPI() {
	var isProfileAPIEnabled = Site.getCurrent().getCustomPreferenceValue('enableMparticleProfileAPI');

	if (isProfileAPIEnabled) {
		var logger = Logger.getLogger('mParticleProfileAPI', 'mParticle - callProfileAPI()');

		var sessionValue = session.custom.mparticleAudiences;
		
		try {
			
			var cookies = request.getHttpCookies();
			var mpid = '';

			logger.debug("Starting loop. " + cookies.getCookieCount());

			for (var i = 0; i < cookies.getCookieCount(); i++) {
				var cookieName = cookies[i].getName();
				if (cookieName.indexOf("mpid") == 0) {
					logger.info("Found mparticle ID cookie.");

					mpid = cookies[i].getValue();

					logger.info("mparticle id from cookie: " + mpid);
				}

			}

			logger.info("Session value for mparticleAudiences before call: " + sessionValue);


			if (empty(session.custom.mparticleAudiences) || mpid != session.custom.mparticleID) {

				var accessToken = mParticleAccessKeyGenerator.getmParticleAccessToken();

				var audiences = 'NONE';

				if (!empty(mpid)) {
					audiences = mParticleProfileAPIService.callmParticleProfileAPI(accessToken, mpid);
				} else {
					logger.info("Empty MPID");
				}

				session.custom.mparticleAudiences = audiences;

				session.custom.mparticleID = mpid;

				logger.info("Set session value for mparticleAudiences to " + session.custom.mparticleAudiences);

			}

		} catch (e) {
			logger.error("Error calling profile API. Error: " + e.message);
		}


		return new Status(Status.OK);
	}
}



/* Module Exports */
module.exports = {
    onRequest: callProfileAPI
};