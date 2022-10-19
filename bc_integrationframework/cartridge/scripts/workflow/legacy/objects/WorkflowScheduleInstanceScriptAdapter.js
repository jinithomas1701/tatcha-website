var StringUtils	= require('dw/util/StringUtils');
var System		= require('dw/system/System');
var Site		= require('dw/system/Site');

/**
 * Class which provides basic infrastructure for workflow schedule instance backward compatibility<br /><br />
 *
 * The workflow schedule instance is made available by the framework as pipeline dictionary key named 
 * <i>CurrentWorkflowScheduleInstance</i>
 *
 * @constructor
 */
function WorkflowScheduleInstance() {
	this.object = {};
	this.object.custom = {};
	//@todo: add proper schedule name --> APP-42944
	this.object.custom.workflowScheduleDefinitionID = "workflowScheduleDefinitionID";
	this.object.custom.siteId = Site.current.ID;
}

/**
 * Marks the start of the workflow schedule execution<br />
 * <b>Note that this is method is called by the framework and typically does not need to be called explicitly.</b>
 */
WorkflowScheduleInstance.prototype.start = function() {
	cvLogger.warn('WorkflowScheduleInstanceScriptWrapper.start: is deprecated/no longer usable as such!');
	return;
};

/**
 * Marks the end of the workflow schedule execution, if really all components were executed.<br />
 * <b>Note that this is method is called by the framework and typically does not need to be called explicitly.</b>
 */
WorkflowScheduleInstance.prototype.finish = function() {
	cvLogger.warn('WorkflowScheduleInstanceScriptWrapper.finish: is deprecated/no longer usable as such!');
	return;
};

/**
 * Returns the runtime of a finished workflow, null otherwise
 */
WorkflowScheduleInstance.prototype.getRuntime = function() {
	cvLogger.warn('WorkflowScheduleInstanceScriptWrapper.getRuntime: is deprecated/no longer usable as such!');
	return;
};

/**
 * Creates the workflow component instances belonging to the workflow<br />
 * Note that this is method is called by the framework and typically does not need to be called explicitly.
 */

WorkflowScheduleInstance.prototype.createWorkflowComponentInstances = function( siteId ) {
	cvLogger.warn('WorkflowScheduleInstanceScriptWrapper.createWorkflowComponentInstances: is deprecated/no longer usable as such!');
	return;
};

/**
 * Returns the workflow component instances of the workflow if they are already created.
 */
WorkflowScheduleInstance.prototype.getWorkflowComponentInstances = function() {
	cvLogger.warn('WorkflowScheduleInstanceScriptWrapper.getWorkflowComponentInstances: is deprecated/no longer usable as such!');
	return;
};

/**
 * Returns the status of the workflow
 */
WorkflowScheduleInstance.prototype.getStatus = function() {
	cvLogger.warn('WorkflowScheduleInstanceScriptWrapper.getStatus: is deprecated/no longer usable as such!');
	return;
};

/**
 * Returns the next waiting workflow component instance which needs to be executed.
 */
WorkflowScheduleInstance.prototype.getNextWaitingWorkflowComponentInstance = function() {
	cvLogger.warn('WorkflowScheduleInstanceScriptWrapper.getNextWaitingWorkflowComponentInstance: is deprecated/no longer usable as such!');
	return;
};

/**
 * Get the formatted component timestamp as string 
 */
WorkflowScheduleInstance.prototype.getTimestamp = function(format) {
	if (empty(this.custom.startTime) || empty(format)) {
		return '';
	}
	
	var calendar = new Calendar();
	calendar.setTimeZone(System.getInstanceTimeZone());
	
	calendar.setTime(this.custom.startTime);
	
	return StringUtils.formatCalendar(calendar, format);
};

/**
 * Sets the runtime data<br /><br />
 * 
 * <b>Note:</b><br />
 * Value must be serializable via JSON.stringify, so no system objects must be used!<br />
 * Existing values will be overwritten!<br />
 * The value type will get lost (except String, Number and Boolean values)!<br />
 */
WorkflowScheduleInstance.prototype.setRuntimeData = function( key, value) {
	cvLogger.warn('WorkflowScheduleInstanceScriptWrapper.setRuntimeData: is deprecated/no longer usable as such!');
	return;
};

/**
 * Returns the runtime data
 */
WorkflowScheduleInstance.prototype.getRuntimeData = function(key) {
	cvLogger.warn('WorkflowScheduleInstanceScriptWrapper.getRuntimeData: is deprecated/no longer usable as such!');
	return;
};

module.exports = WorkflowScheduleInstance;