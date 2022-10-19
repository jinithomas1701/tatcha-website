'use strict';

/**
* 	libExtole.js
*
*	This file is a library file for the Extole integration.
*	All helper/util functions are dedicated into libExtole.ds file.
*
*/

var Site = require('dw/system/Site');

var ExtoleSettings = {
	isExtoleEnabled : function() {
		return Site.getCurrent().getCustomPreferenceValue('extoleActivated') ? true : false;
	},
	
	getClientName : function() {
		return Site.getCurrent().getCustomPreferenceValue('extoleClientName') || "";
	},
	
	isApprovalAPIEnabled : function() {
		return Site.getCurrent().getCustomPreferenceValue('extoleActivateApprovalAPI') ? true : false;
	},
	
	getSiteLabel : function() {
		return Site.getCurrent().getCustomPreferenceValue('extoleSiteLabel');
	}
	
	
}	

module.exports = ExtoleSettings;