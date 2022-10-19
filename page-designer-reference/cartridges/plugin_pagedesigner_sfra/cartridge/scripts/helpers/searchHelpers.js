'use strict';

/**
 * Set content search configuration values
 *
 * @param {Object} params - Provided HTTP query parameters
 * @return {Object} - content search instance
 */
function setupContentSearch(params) {
    var ContentSearchModel = require('dw/content/ContentSearchModel');
    var ContentSearch = require('*/cartridge/models/search/contentSearch');
    var apiContentSearchModel = new ContentSearchModel();

    apiContentSearchModel.setRecursiveFolderSearch(false);

    apiContentSearchModel.setFilteredByFolder(false);
    apiContentSearchModel.setSearchPhrase(params.q);
    apiContentSearchModel.search();
    var contentSearchResult = apiContentSearchModel.getContent();
    var count = Number(apiContentSearchModel.getCount());
    var contentSearch = new ContentSearch(contentSearchResult, count, params.q, params.startingPage, null);

    return contentSearch;
}

module.exports = module.superModule;
exports.setupContentSearch = setupContentSearch;
