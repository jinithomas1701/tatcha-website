/**
* Description of the Controller and the logic it provides
*
* @module  controllers/Blog
*/

'use strict';

/* API Includes */
var PagingModel = require('dw/web/PagingModel');
var URLUtils = require('dw/web/URLUtils');
var ContentMgr = require('dw/content/ContentMgr');
var SearchModel = require('dw/catalog/SearchModel');
var PropertyComparator = require('dw/util/PropertyComparator');

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');

/**
* Description of the function
*
* @return {String} The string 'myFunction'
*/
function show()
{
	var params = request.httpParameterMap;
	require('~/cartridge/scripts/util/SecurityHeaders').setSecurityHeaders();
   
    // Constructs the search based on the HTTP params and sets the categoryID.
    var Search = app.getModel('Search');
    var contentSearchModel = Search.initializeContentSearchModel(params);
    contentSearchModel.setFolderID('blog');

    // execute the content search
    contentSearchModel.search();
    
    var blogPage = params.page ? params.page.intValue : null;
	var contentList = new dw.util.ArrayList(contentSearchModel.folder.onlineContent);
	var propertyComparator = new PropertyComparator("custom.date", false);
	contentList.sort(propertyComparator);
	
	var contentPagingModel = new PagingModel(contentList.iterator(), contentList.size());
	
	if (params.start.submitted) {
		contentPagingModel.setStart(params.start.intValue);
    }

    if (params.sz.submitted) {
    	if(blogPage !== null) {
    		let contentSize = params.sz.intValue * blogPage;
    		contentPagingModel.setPageSize(contentSize);
    	} else {
    		contentPagingModel.setPageSize(params.sz.intValue);
    	}
    	
    } else {
    	if(blogPage !== null) {
    		let blogContentSize = 12 * blogPage;
    		let startItem = blogContentSize - 12;
    		contentPagingModel.setStart(startItem);
    		contentPagingModel.setPageSize(12);
    		//contentPagingModel.setPageSize(blogContentSize);
    	} else {
    		contentPagingModel.setPageSize(12);
    	}
    }
    
    
    var Content = require('~/cartridge/scripts/app').getModel('Content');
    var seoAsset = Content.get('blogseo');

    var pageMeta = require('~/cartridge/scripts/meta');
    pageMeta.update(seoAsset);

    
	app.getView({
		ContentSearchResult: contentSearchModel,
		ContentPagingModel: contentPagingModel
	}).render('content/blog/blog-home');
}

/*
 * Web exposed methods
 */
/** Renders a full featured product search result page.
 * @see module:controllers/Blog~show 
 * */
exports.Show            = guard.ensure(['get'], show);