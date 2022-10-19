'use strict';

var server = require('server');

/**
 * Controller that renders the mparticle tags.
 *
 * @module controllers/Home
 */

var mParticleUtils = require('~/cartridge/scripts/mParticleUtils');

/*
 * Render the MParticle Tag Template
 */
server.get('RenderMParticleTags', function (req, res, next) {
	var mParticleData = mParticleUtils.buildMParticleData();
	//app.getView({mParticleData : mParticleData}).render('mParticle/mParticle_tag');
	res.render('mParticle/mParticle_tag',{
		mParticleData : mParticleData
	})
    next();
});

/*
 * Get mParticle Data
 */
server.post('BuildMParticleData', function (req, res, next) {
	var mParticleData = {};
	var httpParameterMap = request.httpParameterMap;
	var pageContext = httpParameterMap.pageContext.value;
	var checkoutState = httpParameterMap.checkoutState.value;
	var checkoutMode = httpParameterMap.checkoutMode.value;
	var paymentMethod = httpParameterMap.paymentMethod.value;
	mParticleData.pageContext = pageContext;
	mParticleData.pageTitle = httpParameterMap.pageContextTitle.value;
	if(pageContext == 'checkout') {
		mParticleData.profileData = mParticleUtils.buildCheckoutProfileData();
	} else {
		mParticleData.profileData = mParticleUtils.buildProfileData();
	}
	mParticleData.authenticated = (!empty(session.customer)) ? session.customer.authenticated : false;
	mParticleData.checkoutState = checkoutState;
	mParticleData.checkoutMode = checkoutMode;
	mParticleData.paymentMethod = paymentMethod;
	res.json({
		mParticleData: mParticleData
	});

	next();
});



/*
 * Export the publicly available controller methods
 */
/** Renders the home page.
 * @see module:controllers/MParticle~RenderMParticleTags */
module.exports = server.exports();