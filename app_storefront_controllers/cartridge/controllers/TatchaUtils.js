'use strict';

var guard = require('~/cartridge/scripts/guard');
var app = require('~/cartridge/scripts/app');

var File = require( 'dw/io/File' );
var URLUtils = require('dw/web/URLUtils');
var TatchaFileUtils = require('app_storefront_core/cartridge/scripts/util/TatchaFileUtils');

/**
 * @function Gets gift card images from a directory in the Library.
 */
function getGiftCardImages() {
	
	var giftCardImagesDirPath = 'tatcha/default/images/gift-card-images';
	var libFilePath = File.LIBRARIES + "/" + giftCardImagesDirPath;
	
	var files = TatchaFileUtils.getFilesFromDirectory(libFilePath);
	var filePaths = [];
	
	for each(var file in files) {
		filePaths.push(file.getFullPath());
	}
	
	app.getView({
		imageFilePaths: filePaths
	}).render('product/giftcardimages');
	
}


/**
 * @function Gets gift card images from a directory in the Library.
 */
function getGiftCardImagesFromContentAssets() {
	
	var folder = new dw.content.ContentMgr.getFolder('gift-card-images');
	var contentList = new dw.util.ArrayList(folder.onlineContent);
	
	var filePaths = [];
	
	for each(var content in contentList) {
		filePaths.push(content.custom.image);
	}
	
	app.getView({
		imageFilePaths: filePaths
	}).render('product/giftcardimages');
	
}

/* @see module:controllers/TatchaUtils-GetGiftCardImages */
exports.GetGiftCardImages = guard.ensure(['get'], getGiftCardImages);
/* @see module:controllers/TatchaUtils-GetGiftCardImagesFromContentAssets */
exports.GetGiftCardImagesFromContentAssets = guard.ensure(['get'], getGiftCardImagesFromContentAssets);