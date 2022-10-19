/**
* Runs legacy pipeline-based WorkflowComponents in via Job Step script.
* It mimics a Pipeline based execution of legacy WorkflowCompomentInstances.
*
* The only mandatory input parameter for such pipeline executions is assumed to be CurrentWorkflowComponentInstance. 
* All other legacy WorkflowComponent related aspects are assumed to be derived from the below. 
*
* @output ExecutionStatus : Object
*/

/**
 * WorkflowComponentInstance:
 * 
 * Action: 
 *	StandardComponents-Import
 * 
 * Definitions:
 *	[{
 *		"id": "objectType",
 *		"name": "Object Type",
 *		"type": "enum",
 *		"enumValues": [
 *			"abtestabtest",
 *			"activedata",
 *			"catalog",
 *			"coupon",
 *			"customer",
 *			"customergroup",
 *			"customobject",
 *			"giftcertificate",
 *			"inventory",
 *			"keyvaluemapping",
 *			"library",
 *			"pricebook",
 *			"productlist",
 *			"promotion",
 *			"shipping",
 *			"slot",
 *			"sourcecode",
 *			"store",
 *			"tax"
 *		],
 *		"mandatory": true
 *	}, {
 *		"id": "workingFolder",
 *		"name": "Working folder in IMPEX (e.g src/catalog)",
 *		"type": "string",
 *		"mandatory": false
 *	}, {
 *		"id": "filePattern",
 *		"name": "File name pattern (RegExp e.g. ^cat_.*)",
 *		"type": "string",
 *		"mandatory": false
 *	}, {
 *		"id": "importMode",
 *		"name": "Import Mode",
 *		"type": "enum",
 *		"enumValues": [
 *			"MERGE",
 *			"REPLACE",
 *			"UPDATE",
 *			"DELETE"
 *		],
 *		"mandatory": true
 *	}, {
 *		"id": "noFileFoundStatus",
 *		"name": "Treat 'no files found' as",
 *		"type": "enum",
 *		"enumValues": [
 *			"OK",
 *			"WARN",
 *			"ERROR"
 *		],
 *		"mandatory": true
 *	}, {
 *		"id": "importFailedStatus",
 *		"name": "Treat Import Failed as",
 *		"type": "enum",
 *		"enumValues": [
 *			"WARN",
 *			"ERROR"
 *		],
 *		"mandatory": true
 *	}, {
 *		"id": "catalogImportConfig",
 *		"name": "Catalog Import config (JSON) or Key/Value Mapping Name (String)",
 *		"type": "string",
 *		"mandatory": false
 *	}, {
 *		"id": "afterProcessAction",
 *		"name": "Handle file after process",
 *		"type": "enum",
 *		"enumValues": [
 *			"DELETE_FILE",
 *			"KEEP_FILE",
 *			"ARCHIVE_ZIPPED_WITH_LOGS",
 *			"ARCHIVE_PLAIN_FILE"
 *		],
 *		"mandatory": true
 *	}, {
 *		"id": "archiveFolder",
 *		"name": "Archive folder e.g. (src/archive)",
 *		"type": "string",
 *		"mandatory": false
 *	}]
 *
 *
 *
 * Parameters:
 * 	{
 *		"objectType": "keyvaluemapping",
 *		"workingFolder": "src/keyvalue",
 *		"filePattern": "ResourceBundle.csv",
 *		"importMode": "REPLACE",
 *		"noFileFoundStatus": "ERROR",
 *		"importFailedStatus": "ERROR",
 *		"catalogImportConfig": "",
 *		"afterProcessAction": "KEEP_FILE",
 *		"archiveFolder": ""
 * 	}
 */

//standard API
var HashMap 	= require('dw/util/HashMap');
var Pipeline 	= require('dw/system/Pipeline');
var Status 		= require('dw/system/Status');

//custom API
var WorkflowScheduleInstanceScriptAdapter = require('./objects/WorkflowScheduleInstanceScriptAdapter');
var WorkflowComponentInstanceScriptWrapper = require('./objects/WorkflowComponentInstanceScriptAdapter');

//initialize logger
var cvLogger = require('./libWorkflowLogToFile').getCurrentWorkflowInstanceFileLogger("PipelineStepRunner");

/**
 * Triggers the pipeline execution
 * 
 * @param {dw.util.HashMap} args 
 * @param {dw.job.JobStepExecution} jobStepExecution 
 * @returns {dw.system.Status}
 */
function execute( args, jobStepExecution ) 
{

	//Pipeline name and start node
	var action = args.Action;
	if ( empty(action) ) {
		cvLogger.error( 'Action not provided. Please add Pipeline and start node.' );
		return new Status( Status.ERROR );
	}
	
	//create parameters for WorkflowComponentInstanceWrapper
	var parameters = {};
	for (var arg in args) {
		if ( arg !== 'pipelineName' )
		{
			parameters[arg] = args[arg];
		}
	}
	
	if ( jobStepExecution ) {
		cvLogger.info( 'Executing legacy WorkflowComponent \'' + jobStepExecution.stepTypeID + '\' in context of job \'' + jobStepExecution.jobExecution.jobID + '\'' );
	} else {
		cvLogger.info( 'Executing legacy WorkflowComponent \'' + action + '\'' );
	}

	//creating initial pipeline dictionary
	var pdict = {};
	pdict.CurrentWorkflowScheduleInstance = new WorkflowScheduleInstanceScriptAdapter( parameters );
	pdict.CurrentWorkflowComponentInstance = new WorkflowComponentInstanceScriptWrapper( parameters );

	//executing the pipeline
	var Pipeline = require('dw/system/Pipeline');
	try
	{
		pdict = Pipeline.execute( action, pdict );
	} catch( e ) 
	{
		return new Status( Status.ERROR, 'ERROR' );
	}

	//post-processing the result
	var endNodeName = pdict.EndNodeName || 'OK';
	var status = Status.OK;
	if ( endNodeName === 'ERROR' ) {
		status = Status.ERROR;
	}
	return new Status( status, endNodeName );
}

/**
* Extracts regular parameter map from workflowComponentInstance.
*/
function createWorkflowComponentInstanceWrapper( workflowComponentInstance ) {
	var parameterMap = new HashMap();
	if ( workflowComponentInstance )
	{
		var parameterValues = JSON.parse(workflowComponentInstance.custom.parameterValues);
		for ( var attributeID in parameterValues ) {
			parameterMap.put( attributeID, workflowComponentInstance.getParameterValue(attributeID) );
		}
	}
	return parameterMap;
}

/*
 * Job exposed methods
 */
exports.execute = execute;
