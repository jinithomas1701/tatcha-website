'use strict';

var File = require( 'dw/io/File' );

/**
 * Returns files from a directory path.
 * 
 * @param directoryPath
 * @returns
 */
function getFilesFromDirectory (directoryPath) {
	var fileList : dw.util.List;
	var directory = new File(directoryPath);
	if (empty(directory)
	        || !directory.isDirectory()) {
		fileList = null;
		return fileList;
	}
	fileList = directory.listFiles();
	var fileListSorted : dw.util.ArrayList = fileList.sort(lexigraphic_comparison);
	return fileList;
	
}

/**
 * Method to sort the images based on name.
 * 
 * @param lhs
 * @param rhs
 * @returns
 */
function lexigraphic_comparison(lhs: File, rhs : File) {
	var comparison = 0;
	if (lhs.getName() < rhs.getName()) {
		comparison = -1;
	} else if (lhs.getName() > rhs.getName()) {
		comparison = 1;
	}
  return comparison;
}


module.exports = {
	getFilesFromDirectory: getFilesFromDirectory
};