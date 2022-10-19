/**
* Description of the Controller and the logic it provides
*
* @module  controllers/ProductRecommendations
*/

'use strict';

// HINT: New Controller functions

/* Script Modules */
var Site = require('dw/system/Site');
var Transaction = require('dw/system/Transaction');
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var URLUtils = require('dw/web/URLUtils');
var securityHeader = require('~/cartridge/scripts/util/SecurityHeaders');


var showRecommendations = function(){
	
    var ritualFindermeta = app.getModel('Content').get('ritual_finder_results_meta');
    require('~/cartridge/scripts/meta').update(ritualFindermeta);
    securityHeader.setSecurityHeaders();
	
	var skinType = request.httpParameterMap.skinType.stringValue ? request.httpParameterMap.skinType.stringValue : ""; 
	var skinConcerns = request.httpParameterMap.skinConcerns.stringValue ? request.httpParameterMap.skinConcerns.stringValue : ""; 
	var prds = request.httpParameterMap.prds.stringValue ? request.httpParameterMap.prds.stringValue : "";
	var persona = request.httpParameterMap.persona.stringValue ? request.httpParameterMap.persona.stringValue : "";
	var filters = request.httpParameterMap.filters.stringValue ? request.httpParameterMap.filters.stringValue : "";
	var amFilters = request.httpParameterMap.amFilters.stringValue ? request.httpParameterMap.amFilters.stringValue : "";
	var pmFilters = request.httpParameterMap.pmFilters.stringValue ? request.httpParameterMap.pmFilters.stringValue : "";
	var skinSensitivity = request.httpParameterMap.skinSensitivity.stringValue ? request.httpParameterMap.skinSensitivity.stringValue : false; 
	var userSelectedTime = request.httpParameterMap.selectedTime.stringValue ? request.httpParameterMap.selectedTime.stringValue : false; 
	var amRDK = request.httpParameterMap.amRDK.stringValue ? request.httpParameterMap.amRDK.stringValue : "";
	var pmRDK = request.httpParameterMap.pmRDK.stringValue ? request.httpParameterMap.pmRDK.stringValue : "";
	var originalSkinType = skinType;
	
	//Remap to sensitive
	if(skinSensitivity == 'true') {
		skinType = 'sensitive';
	}
	
	if(skinType!='' && persona!='') {
		var recommendationConfigObj = JSON.parse(Site.getCurrent().getCustomPreferenceValue('recommendationConfig'));
		var recommendationUtil = require('app_storefront_core/cartridge/scripts/util/RecommendationUtil');		
		var recommendations = recommendationUtil.getPrdRecommendations(persona,skinType,skinConcerns,prds,amFilters,pmFilters,amRDK,pmRDK);
		var filtersAM = recommendationUtil.getFilters(recommendations,'AM');
		var filtersPM = recommendationUtil.getFilters(recommendations,'PM');
		var selectedSkinType = recommendationUtil.remapSkinType(originalSkinType,recommendationConfigObj.skinType);
		
		// Construct the original Url without 
		var originalUrl = URLUtils.https('ProductRecommendation-ShowRecommendations', 'skinType', skinType,'persona',persona,'skinConcerns',skinConcerns,'prds',prds);
		
		app.getView({
			persona: persona,
			skinType: selectedSkinType,
			skinConcerns: skinConcerns,
			filtersAM:filtersAM,
			filtersPM:filtersPM,
			recommendations: recommendations,
			originalUrl:originalUrl,
			userSelectedTime:userSelectedTime
		}).render('content/recommendations/whatsnextresults');
		
	} else {		
		response.redirect(URLUtils.https('Page-Show', 'cid', 'ritual_finder'));   
	}   
  
}

var ritualRecommendations = function(){
	
    securityHeader.setSecurityHeaders();
    
	var skinType = request.httpParameterMap.skinType.stringValue ? request.httpParameterMap.skinType.stringValue : ""; 
	var skinConcerns = request.httpParameterMap.skinConcerns.stringValue ? request.httpParameterMap.skinConcerns.stringValue : ""; 
	var prds = request.httpParameterMap.prds.stringValue ? request.httpParameterMap.prds.stringValue : "";
	var persona = request.httpParameterMap.persona.stringValue ? request.httpParameterMap.persona.stringValue : "";
	var filters = request.httpParameterMap.filters.stringValue ? request.httpParameterMap.filters.stringValue : "";

	if(skinType!='' && persona!='') {
		var recommendationConfigObj = JSON.parse(Site.getCurrent().getCustomPreferenceValue('recommendationConfig'));
		var recommendationUtil = require('app_storefront_core/cartridge/scripts/util/RecommendationUtil');		
		var recommendations = recommendationUtil.getActiveRecommendations(persona,skinType,skinConcerns,prds,filters);
		var filtersAM = recommendationUtil.getFilters(recommendations,'AM');
		var filtersPM = recommendationUtil.getFilters(recommendations,'PM');
		var selectedSkinType = recommendationUtil.remapSkinType(skinType,recommendationConfigObj.skinType);
		
		//AM filters
		var amFilters = [];
		var tempFilters = [];
		for(var i =0;i< recommendations.length;i++){
			if(!empty(recommendations[i].filterName)){
				if(tempFilters.toString().indexOf(recommendations[i].filterName) >= 0){
					continue;
				}
				amFilters.push(recommendations[i]);
				tempFilters.push(recommendations[i].filterName);
			}
		}	
		
		require('~/cartridge/scripts/util/Response').renderJSON({
				"response" : {
					persona: persona,
					skinType: selectedSkinType,
					recommendations:recommendations,
					status:"success"
				}
		});
		
	} else {
		
		require('~/cartridge/scripts/util/Response').renderJSON({
			"response" : {
				"recommendations":[],
				"status":"required fields missing"
			}
		});		
	}   
  
}

var ritualMetaData = function () {
	var recommendationMeta = JSON.parse(Site.getCurrent().getCustomPreferenceValue('recommendationMeta'));

	if(recommendationMeta && !empty(recommendationMeta)) {
		var skinTypes = {};
		var skinConcerns = {};
		var eyeConcerns = {};
		var productSelector = {};
		var ritualPreference = {};
		var skinSensitivity = {};

		skinTypes = recommendationMeta.skinType ? recommendationMeta.skinType: {};
		skinConcerns = recommendationMeta.skinConcerns ? recommendationMeta.skinConcerns: {};
		eyeConcerns = recommendationMeta.eyeConcerns ? recommendationMeta.eyeConcerns: {};
		productSelector = recommendationMeta.productSelector ? recommendationMeta.productSelector: {};
		ritualPreference = recommendationMeta.ritualPreference ? recommendationMeta.ritualPreference: {};
		skinSensitivity = recommendationMeta.skinSensitivity ? recommendationMeta.skinSensitivity: {};


		require('~/cartridge/scripts/util/Response').renderJSON({
			"response" : {
				skinTypes: skinTypes,
				skinConcerns: skinConcerns,
				eyeConcerns: eyeConcerns,
				productSelector: productSelector,
				ritualPreference: ritualPreference,
				skinSensitivity: skinSensitivity,
				status: 'success'
			}
		});
	} else {
		require('~/cartridge/scripts/util/Response').renderJSON({
			"response" : {
				skinTypes: {},
				skinConcerns: {},
				eyeConcerns: {},
				productSelector: {},
				ritualPreference: {},
				skinSensitivity: {},
				status: 'Meta not found'
			}
		});
	}

}


/* Exports of the controller */
exports.ShowRecommendations = guard.ensure(['get'], showRecommendations);
exports.RitualRecommendations = guard.ensure(['get'], ritualRecommendations);
exports.RitualMetaData = guard.ensure(['get'], ritualMetaData);
