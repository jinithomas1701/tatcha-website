'use strict';

var File = require('dw/io/File');
var Status = require('dw/system/Status');
var Logger = require('dw/system/Logger');

var celigoFTPService = require('*/cartridge/scripts/init/celigoFTPService');

/**
 * Downloads files from SFTP/FTP to IMPEX
 * @returns {dw.system.Status} OK || ERROR
 */

function execute (parameters, stepExecution) {
 // input Parameters
 var SourceFolder;
 var TargetFolder;
 var ServiceID;

 SourceFolder = stepExecution.getParameterValue('SourceFolder');
 TargetFolder = stepExecution.getParameterValue('TargetFolder');
 ServiceID = stepExecution.getParameterValue('serviceID');

 var ftpService = celigoFTPService.getService(ServiceID);
 var updateFile = new File(File.IMPEX + File.SEPARATOR + TargetFolder);

 try {

    var isRemoteDirExist = ftpService.call('cd', SourceFolder);

    // Check if remote directory exists
    if (isRemoteDirExist.ok) {
       var fileList = ftpService.call('list', SourceFolder);

       fileList.object.forEach(function (filePath) {
            var fileName = filePath.name;
            var updateFile = new File(File.IMPEX + File.SEPARATOR + TargetFolder + fileName);
            var serviceResult = ftpService.call('getBinary', SourceFolder + fileName, updateFile);
            if (serviceResult.status === 'OK') {
                ftpService.call('del', SourceFolder + fileName);
            }
        });

    }
} catch (e) {
    Logger.error('Error occured while executing ftpDownload Script ' + e);
}
}

 /* Module Exports */
 exports.execute = execute;
