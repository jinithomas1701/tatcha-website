var StringUtils	= require('dw/util/StringUtils');
var System		= require('dw/system/System');

/**
 * Class which provides basic workflow component infrastructure<br /><br />
 *
 * The workflow component instance is made available by the framework as pipeline dictionary key named 
 * <i>CurrentWorkflowComponentInstance</i>
 *
 * @constructor
 */
function WorkflowComponentInstanceScriptAdapter( parameters ) {
	this.parameters = parameters;
	this.object = {};
	this.object.custom = {};

	//@todo: replace with real schedule ID --> APP-42944
	var workflowScheduleInstanceID = this.getParameterValue('Action') + StringUtils.formatCalendar(System.getCalendar(), "yyyy-MM-dd_HH:mm:ss.SSS");
	this.object.custom.workflowScheduleInstanceID = workflowScheduleInstanceID;

	require('../libWorkflowLogToFile.ds').createWorkflowInstanceFileLogger(this);
	
	this.__noSuchMethod__ = function( functionName, parameters) {
		this.error( 'function \'' + functionName + '\' doesn\'t exist (any longer)!' );
	};
}

/**
 * Read a configuration parameter value
 */
WorkflowComponentInstanceScriptAdapter.prototype.getParameterValue = function(parameter) {
	//@TODO: Comment the returned calendar object instead of a date!!!
	if ( empty(this.parameters) ) {
		return null;
	}
	var returnValue = this.parameters[parameter];
	if ( returnValue instanceof Date )
	{
		var Calendar = require('dw/util/Calendar');
		var System = require('dw/system/System');

		var calendar = new Calendar();
		calendar.setTime(returnValue);
		calendar.setTimeZone(System.getInstanceTimeZone());
		return calendar;
	}
	return returnValue;
};

/**
 * Method to log within a WorkflowComponent. This method is supposed to be used by component developers.
 *
 * @param {Array} message The log message
 * @param {Array} scope The log scope (INFO (default), ERROR, WARN, FATAL)
 * @param {Array} files An array with File or URL objects for import/export files.
 */
WorkflowComponentInstanceScriptAdapter.prototype.addMessage = function(message, scope, files) {

	var currentScope = scope ? scope.toUpperCase() : 'INFO';

	if (!empty(files)) {
		for (var i=0; i<files.length; i++) {
			var file = files[i];
			if(file !== null){
				if(file instanceof dw.web.URL){
					message += '|||url:' + file.toString();
				}else if ('exists' in file && file.exists()) {
					message += '|||file:' + file.fullPath;
				}
			}
		}
	}

	this.logMessageToFile(message, currentScope);
};

/**
 * Method to log within a WorkflowComponent. This method is internal.
 *
 * @param {Array} message The log message
 * @param {Array} scope The log scope (INFO (default), ERROR, WARN, FATAL)
 * @param {Array} files An array with File or URL objects for import/export files.
 */
WorkflowComponentInstanceScriptAdapter.prototype.logMessageToComponent = function(message, scope, files) {
	this.addMessage(message, scope, files);
};

/**
 * Read the status messages of a component
 */
WorkflowComponentInstanceScriptAdapter.prototype.getStatusMessages = function() 
{
	cvLogger.warn('WorkflowComponentInstanceScriptWrapper.getStatusMessages: is obsolete!');
	return;
};

/**
 * Method is called by the framework in case a server restart is detected.
 */
WorkflowComponentInstanceScriptAdapter.prototype.handleServerRestart = function() {
	cvLogger.warn('WorkflowComponentInstanceScriptWrapper.getStatusMessages: is handleServerRestart!');
	return;
};

module.exports = WorkflowComponentInstanceScriptAdapter;