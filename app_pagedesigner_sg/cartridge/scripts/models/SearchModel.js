'use strict';

/**
 * Model for search functionality.
 *
 * @module models/SearchModel
 */


/**
 * Search helper class providing enhanced search functionality.
 * @class module:models/SearchModel~SearchModel
 */
var contentSearchModel = module.superModule.initializeContentSearchModel(request.httpParameterMap);
var SearchModel = module.superModule;

/**
 * Creates and initializes a {dw.content.ContentSearchModel} based on the given HTTP parameters.
 *
 * @param {dw.web.HttpParameterMap} httpParameterMap HttpParameterMap to read content search parameters from.
 * @returns {dw.content.ContentSearchModel} Created and initialized product serach model.
 */
SearchModel.initializeContentSearchModel = function () {
    contentSearchModel.setFilteredByFolder(false);
    return contentSearchModel;
};

module.exports = SearchModel;
