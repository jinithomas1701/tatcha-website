'use strict';
var Logger = require('dw/system/Logger');

var io = require( 'dw/io' );
var app = require('app_storefront_controllers/cartridge/scripts/app');
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var response = require('app_storefront_controllers/cartridge/scripts/util/Response');

/**
 * Controller that renders the home page.
 *
 * @module controllers/ProductRecommendations
 */
function importProductRecommendationData() {

	var filePath = 'master_catalog_tatcha';
	var fileName = 'Product_Recommendation_Scores.csv';
	var file = new io.File(io.File.CATALOGS + "//" + filePath + "//" + fileName);

	var logger = Logger.getLogger('ProductRecommendationData', 'ProductRecommendationData - importProductRecommendationData()');

	var fileReader = new io.FileReader(file);
	var csvReader = new io.CSVStreamReader(fileReader);
	var line;
	var i = 0;
	var productConfig = {};
	var scoreConfig = {};
	var headerArray = [];
	while ((line = csvReader.readNext()) != null ) {
		scoreConfig = {};
		if (line[1] == 'Product ID') {
			for(var i = 4; i <= 19; i++) {
				headerArray[i] = line[i];
			}
		} else if (!empty(line[1])) {
			for(var i = 4; i <= 19; i++) {
				scoreConfig[headerArray[i]] = line[i];
			}
			productConfig[line[1]] = scoreConfig;
		}
	}
	response.renderJSON(productConfig);

}


exports.ImportProductRecommendationData = guard.ensure(['get'], importProductRecommendationData);