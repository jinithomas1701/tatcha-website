//XML Namespace
const XML_NAMESPACE = "http://www.demandware.com/xml/impex/jobs/2015-07-01";


//Object Type IDs for Schedule definition and relation
const WF_COMPONENT_TYPE	= 'WorkflowComponentDefinition';
const WF_SCHEDULE_TYPE 	= 'WorkflowScheduleDefinition';
const WF_RELATION_TYPE 	= 'WorkflowScheduleDefinitionWorkflowComponentDefinitionRelation';


//Job Framework requires a "from" email address, this one is used as default
const DEFAULT_FROM_EMAIL = 'legacy-schedule-mailer@demandware.com';


//Script Modules
var boguard 		= require('~/cartridge/scripts/boguard');
var CustomObjectMgr	= require('dw/object/CustomObjectMgr');
var StringWriter 	= require('dw/io/StringWriter');
var XMLStreamWriter = require('dw/io/XMLIndentingStreamWriter');
var Logger 			= require('dw/system/Logger');


//Globals
var stepIDs = [];

/**
 * Main output function
 */
function start() 
{
	var scheduleIterator = CustomObjectMgr.queryCustomObjects(WF_SCHEDULE_TYPE, "", "custom.name asc");
	var output = writeXml(scheduleIterator);
	
	//Render file download
	response.addHttpHeader(response.CONTENT_DISPOSITION, "attachment; filename=\"job-definitions.xml\"");
	response.setContentType('application/xml');
	response.writer.print(output);
}


/**
 * Main function for the Schedule XML export  
 * 
 * @param {dw.util.SeekableIterator} scheduleIterator
 * 
 * @returns String
 */
function writeXml(scheduleIterator) 
{
	var stringWriter = new StringWriter();
	var xsw = new XMLStreamWriter(stringWriter);
	xsw.setDefaultNamespace(XML_NAMESPACE);
	
	//<jobs>
	xsw.writeStartElement("jobs");
	xsw.writeAttribute('xmlns', XML_NAMESPACE);
	
		//Iterate over schedules and convert each of them to Job XML
	    while (scheduleIterator.hasNext()) {
	        var schedule = scheduleIterator.next();

	        //make sure that only fully written schedules make it to the string
	        try
	        {
	        	
	        	//<job>....</job>
	        	//test migration start, makes sure that no exception can spoil the format of the output file.
	        	var jobStringWriter = new StringWriter();
	        	var jobXSW = new XMLStreamWriter(jobStringWriter);
		        writeJob(schedule, jobXSW);
		        jobXSW.close();
		        jobStringWriter.close();
		        //test migration end
		        
		        //final migration
		        writeJob(schedule, xsw);
	        } 
	        catch( e ) 
	        {
	        	var errorMessage = [ "Migration failed for schedule with ID \"" + schedule.custom.ID + "\"" ];
	        	var attributeIDs = [ 'message', 'fileName', 'lineNumber' ];
	        	
	        	for each ( var attributeID in attributeIDs ) {
	        		if ( attributeID in e ) {
	        			errorMessage.push( attributeID + ': ' + e[attributeID] );
	        		}
	        	}
	        	
	        	Logger.error( errorMessage.join('\n') );
	        	xsw.writeComment("ERROR: " + errorMessage[0] + "\nMessage: " + e['message']);
	        }
	        
	    }
    
	//</jobs>
    xsw.writeEndElement();
    
    xsw.close();
    stringWriter.close();
    
    return stringWriter.valueOf();
}


/**
 * Writes one Job (=Workflow Schedule) to the XML
 * 
 * @param {dw.object.CustomObject} schedule
 * @param {dw.io.XMLIndentingStreamWriter} xsw
 */
function writeJob(schedule, xsw) 
{
	//<job id="..." priority="...">
	xsw.writeStartElement("job");
	xsw.writeAttribute("job-id", 'Legacy_' + schedule.custom.ID.replace(/ /g, '_'));
	xsw.writeAttribute("priority", 0);
	
		//<description>
		xsw.writeStartElement('description');
		xsw.writeCharacters(schedule.custom.description);
		xsw.writeEndElement();
		
		if(!hasOrganizationContext(schedule) && !hasSiteContext(schedule)) {
			xsw.writeComment('No contexts enabled for this Job! Nothing will be exported.');
		}
		
		//Render flow with Organization context
		if(hasOrganizationContext(schedule)) {
			writeOrganizationContextFlow(schedule, xsw);
		}

		//Render flows with site context (have to be inside a split element)
		if(hasSiteContext(schedule)) {
			//<split>
			xsw.writeStartElement('split');
			
				//Site assignments
				writeSiteContextFlows(schedule, xsw);
			
				//Flow template generation
				writeFlowTemplate(schedule, xsw);

			//</split>			
			xsw.writeEndElement();
		}
		
		//Ruleset (Notifications)
		writeRules(schedule, xsw);
		
		//Triggers (Schedule)
		writeTriggers(schedule, xsw);
		
	//</job>
    xsw.writeEndElement();
}


/**
 * Writes one Flow template (= Workflow components) to the XML
 * 
 * @param {dw.object.CustomObject} schedule
 * @param {dw.io.XMLIndentingStreamWriter} xsw
 */
function writeOrganizationContextFlow(schedule, xsw) 
{
	//<flow>
	xsw.writeStartElement('flow');
	
		writeSteps(schedule, xsw);
		
	//</flow>
	xsw.writeEndElement();
}


/**
 * Writes one Flow template (= Workflow components) to the XML
 * 
 * @param {dw.object.CustomObject} schedule
 * @param {dw.io.XMLIndentingStreamWriter} xsw
 */
function writeFlowTemplate(schedule, xsw) 
{
	//<flow-template id="...">
	xsw.writeStartElement('flow-template');
	xsw.writeAttribute("template-id", getFlowID(schedule));
	
		writeSteps(schedule, xsw);
		
	//</flow-template>
	xsw.writeEndElement();
}


/**
 * Writes all Flows (= Site assignment) to the XML
 * 
 * @param {dw.object.CustomObject} schedule
 * @param {dw.io.XMLIndentingStreamWriter} xsw
 */
function writeSiteContextFlows(schedule, xsw) 
{
	schedule.custom.siteIds.forEach(function(siteId) {		
		if(siteId == 'Sites-Site') {
			return;
		}
		
		//<flow>
		xsw.writeStartElement("flow");
		
			//<context site-id="..."  />
			xsw.writeEmptyElement("context");	
			xsw.writeAttribute("site-id", siteId);
			
			//<template-ref template-id="..." />
			xsw.writeEmptyElement("template-ref");
			xsw.writeAttribute("template-id", getFlowID(schedule));
			
		//</flow>
		xsw.writeEndElement();
	});
}



/**
 * Writes the Ruleset (= Notifications) to the XML
 * 
 * @param {dw.object.CustomObject} schedule
 * @param {dw.io.XMLIndentingStreamWriter} xsw
 */
function writeRules(schedule, xsw) 
{
	if(schedule.custom.notificationStatuses.length == 0 || schedule.custom.notificationEmails.length == 0) {
		//No email notification configured
		return;
	}
	
	//<rules>
	xsw.writeStartElement('rules');
	
		//Map result statuses to Job Framework compatible statuses
		var statusList = mapStatusList(schedule.custom.notificationStatuses);			
		
		//<on-exit status="...">
		xsw.writeStartElement('on-exit');
		xsw.writeAttribute('enabled', 'true');
		xsw.writeAttribute('status', statusList.join(','));
			
			//<send-mail>
			xsw.writeStartElement('send-mail');
			
				//<from>...</from>
				xsw.writeStartElement('from');
				xsw.writeCharacters(DEFAULT_FROM_EMAIL);
				xsw.writeEndElement();
				
				//Convert receiver's mail addresses to CSV string
				var emailReceivers = schedule.custom.notificationEmails.join(',');
				
				//<to>....</to>
				xsw.writeStartElement('to');
				xsw.writeCharacters(emailReceivers);
				xsw.writeEndElement();
				
			//</send-mail>
			xsw.writeEndElement();
		
		
		//</on-exit>
		xsw.writeEndElement();
		
	//</rules>
	xsw.writeEndElement();
}


/**
 * Writes the Triggers (= Schedule) to the XML
 * 
 * @param {dw.object.CustomObject} schedule
 * @param {dw.io.XMLIndentingStreamWriter} xsw
 */
function writeTriggers(schedule, xsw) 
{
	//<triggers>
	xsw.writeStartElement('triggers');
	
		//Trigger is either "run-once" or "run-recurring" depending on WF Schedule Setup
		if(schedule.custom.type.value === 'SINGLE') {
			//<run-once>
			xsw.writeStartElement('run-once');
			
			//Always set to "disabled" - ignore schedule.custom.enabled
			xsw.writeAttribute('enabled', false);
			
				//Execution time: Split the ISO String into date + time
				var isoFromDateTime = schedule.custom.executionTime.toISOString();
				var isoFromDate = isoFromDateTime.substring(0, 10) + 'Z';
				var isoFromTime = isoFromDateTime.substring(11, 19);
			
				//<date-from>
				xsw.writeStartElement('date');
				xsw.writeCharacters(isoFromDate);
				xsw.writeEndElement();
				
				//<start-time>
				xsw.writeStartElement('time');
				xsw.writeCharacters(isoFromTime);
				xsw.writeEndElement();

			//</run-once>
			xsw.writeEndElement();
		} else {
			//<run-recurring>
			xsw.writeStartElement('run-recurring');
			
			//Always set to "disabled" - ignore schedule.custom.enabled
			xsw.writeAttribute('enabled', false);

				//<recurrence>
				xsw.writeStartElement('recurrence');
				
					//Start date/time: Split the ISO String into date + time
					var isoFromDateTime = (schedule.custom.executionActiveFrom || new Date()).toISOString();
					var isoFromDate = isoFromDateTime.substring(0, 10) + 'Z';
					var isoFromTime = isoFromDateTime.substring(11, 19);

				
					//<date-from>
					xsw.writeStartElement('date-from');
					xsw.writeCharacters(isoFromDate);
					xsw.writeEndElement();
					
					//End date set?
					if(schedule.custom.executionActiveTo) {
						//End date: Extract date part from ISO string
						var isoToDateTime = schedule.custom.executionActiveTo.toISOString();
						var isoToDate = isoToDateTime.substring(0, 10) + 'Z';
						
						//<date-to>
						xsw.writeStartElement('date-to');
						xsw.writeCharacters(isoToDate);
						xsw.writeEndElement();
					}
					
					//<start-time>
					xsw.writeStartElement('start-time');
					xsw.writeCharacters(isoFromTime );
					xsw.writeEndElement();
					
					//Put together the interval string, mapping required
					var intervalString = mapInterval(schedule.custom.executionInterval, schedule.custom.executionIntervalType.value);
					
					//<interval>
					xsw.writeStartElement('interval');
					xsw.writeCharacters(intervalString);
					xsw.writeEndElement();
					
					//Map weekdays (integers) to Job Framework Strings
					var weekdays = mapWeekdays(schedule.custom.executionWeekdays);
					
					//<day-of-week>
					xsw.writeStartElement('day-of-week');
					
						weekdays.forEach(function(day) {
							//<weekday>...</weekday>
							xsw.writeStartElement('weekday');
							xsw.writeCharacters(day);
							xsw.writeEndElement();
						});
					
					//</day-of-week>
					xsw.writeEndElement();
			
				//</recurrence>
				xsw.writeEndElement();
			//</run-recurring>
			xsw.writeEndElement();
		}
		
	//</triggers>
	xsw.writeEndElement();
}


/**
 * Writes the Steps (= Components) to the XML
 * 
 * @param {dw.object.CustomObject} schedule
 * @param {dw.io.XMLIndentingStreamWriter} xsw
 */
function writeSteps(schedule, xsw)
{
	var componentAssignmentIterator = CustomObjectMgr.queryCustomObjects(WF_RELATION_TYPE, "custom.workflowScheduleDefinitionID={0}", "custom.position asc", [schedule.custom.ID]);
	var totalCount = componentAssignmentIterator.getCount();
	
	while ( totalCount > 0 ) {
		totalCount--;
		
		var excludedStep = false;
		
		var componentAssignment = componentAssignmentIterator.next();
		
		//Check if the step is using Date/TimeCondition action which is not supported anymore.
		var action = loadWorkflowComponentAction(componentAssignment);
		var isDateTimeCondition = (action == 'GeneralComponent-DateCondition' || action == 'GeneralComponent-TimeCondition' || action == 'GeneralComponent-DateTimeCondition');
		
		//Check for conditions that lead to exlusion from migration export
		if(componentAssignment.custom.disabled == true) {
			xsw.writeComment("Step is disabled so it will not be migrated!");
			excludedStep = true;
		} else if(isDateTimeCondition) {
			xsw.writeComment("Step is using 'DateCondition', 'TimeCondition' or 'DateTimeCondition' so it will not be migrated!");
			excludedStep = true;
		}
		
		//For disabled steps, begin comment around the whole step so it will not be imported
		if(excludedStep) {
			xsw.writeRaw("\n<!-- BEGIN DISABLED STEP -");
		}
		
		//Check for "Display name", use component ID if not set
		var stepID = 'displayName' in componentAssignment.custom ? componentAssignment.custom.displayName : componentAssignment.custom.workflowComponentDefinitionName;
		
		//<step>
		xsw.writeStartElement('step');
		xsw.writeAttribute('type', 'custom.' + componentAssignment.custom.workflowComponentDefinitionName.replace(/ /g, '_'));
		xsw.writeAttribute('enforce-restart', 'false');
		xsw.writeAttribute('step-id', getUniqueStepID(stepID));
		
			//Write Parameters
			writeStepParameters(componentAssignment, xsw);
			
			//Write rules for this step (continue until last step was executed)
			writeStepRule( (totalCount === 0), xsw);
			
		//</step>
		xsw.writeEndElement();
		
		//End commented section for disabled steps
		if(excludedStep) {
			xsw.writeRaw("\n- END DISABLED STEP -->\n\n");
		}
	};
}


/**
 * 
 * @param {dw.object.CustomObject} schedule
 * @param {dw.io.XMLIndentingStreamWriter} xsw
 */
function writeStepParameters(componentAssignment, xsw)
{
	//Load parameters (as object)
	var parameters = loadParameterValues(componentAssignment);
		
	if(parameters === 'ERROR') {
		xsw.writeCharacters("\n<!-- ERROR: Could not parse parameter values! -->");
	} else {
		//<parameters>
		xsw.writeStartElement('parameters');
		
			for(paramName in parameters) {
				//Empty values will not be added to XML
				if(parameters[paramName].length == 0)
					continue;
				
				//<parameter name="...">
				xsw.writeStartElement('parameter');
				xsw.writeAttribute('name', paramName);
					
					xsw.writeCharacters(parameters[paramName]);
				
				//</parameter>
				xsw.writeEndElement();
			};
		
		//</parameters>
		xsw.writeEndElement();
	}
}


/**
 * Writes <rules> section for steps
 * 
 * @param isLast
 * @param xsw
 */
function writeStepRule(isLast, xsw) 
{
	//<rules>
	xsw.writeStartElement('rules');
	
		//<on-exit>
		xsw.writeStartElement('on-exit');
		xsw.writeAttribute('status', '*');
		
			//Legacy logic did continue until last component was executes, no matter which exit status was returned?
			if(isLast == true) {
				//<stop />
				xsw.writeEmptyElement('stop');
			} else {
				//<continue />
				xsw.writeEmptyElement('continue');
			}
	
		//</on-exit>
		xsw.writeEndElement();
	
	//</rules>
	xsw.writeEndElement();
	
	
}


/**
 * Maps the list of IF-Workflow Statuses to a list if Job Framework compatible statuses
 * 
 * @param statuses
 * @returns {Array}
 */
function mapStatusList(statuses) 
{
	//Read list of configured status' and concatenate to CSV string
	var statusList = [];
	
	statuses.forEach(function(element) {
		switch(element) {
			case 'FINISHED_OK':
				statusList.push('OK');
				break;
			case 'FINISHED_WARN':
				statusList.push('WARN');
				break;
			case 'FINISHED_SKIPPED':
				statusList.push('FAILED');
				break;
			case 'FINISHED_ERROR':
				statusList.push('ERROR');
				break;
		}
	});
	
	return statusList;
}


/**
 * Maps interval value + type to a Job Framework compatible interval string
 * 
 * @param interval
 * @param intervalType
 */
function mapInterval(interval, intervalType) 
{
	//Value starts with amount of units
	var intervalString = interval;
	
	//Map unit type
	switch(intervalType) {
		case 'MINUTE':
			intervalString += 'm';
			break;
		case 'HOUR':
			intervalString += 'h';
			break;
		case 'DAY':
			intervalString += 'd';
			break;
		case 'WEEK':
			intervalString += 'w';
			break;
		case 'MONTH':
			intervalString += 'M';
			break;
		case 'YEAR':
			intervalString += 'y';
			break;
	}
	
	return intervalString;
}


/**
 * Maps the IF integer-based weekdays to Job Framework compatible Strings
 * 
 * @param weekdays
 * @returns {Array}
 */
function mapWeekdays(weekdays) 
{
	var weekdayStrings = [];
	
	weekdays = weekdays.sort();
	
	weekdays.forEach(function(number) {
		switch(number) {
			case '1':
				weekdayStrings.push('Sunday');
				break;
			case '2':
				weekdayStrings.push('Monday');
				break;
			case '3':
				weekdayStrings.push('Tuesday');
				break;
			case '4':
				weekdayStrings.push('Wednesday');
				break;
			case '5':
				weekdayStrings.push('Thursday');
				break;
			case '6':
				weekdayStrings.push('Friday');
				break;
			case '7':
				weekdayStrings.push('Saturday');
				break;
			}
	});
	
	return weekdayStrings;
}


/**
 * Generates the Flow-ID out of the Schedule's name
 *  - removes spaces
 * 
 * @param schedule
 * @returns {String}
 */
function getFlowID(schedule) 
{
	return 'LegacyFlow-' + schedule.custom.ID.replace(' ', '_');
}


/**
 * Loads a componentAssignments's parameter values
 * 
 * @param {dw.object.CustomObject} componentAssignment
 * 
 * @returns {}|{String} "ERROR" on parse Error
 */
function loadParameterValues(componentAssignment) 
{
	var parameters = {};
	
	//Load parameters
	if(componentAssignment.custom.parameters && componentAssignment.custom.parameters.length > 0) {
		try {
			parameters = JSON.parse(componentAssignment.custom.parameters);
		} catch(e) {
			return 'ERROR';
		}
	}
	
	var action = loadWorkflowComponentAction(componentAssignment);
	parameters['Action'] = action;

	return parameters;
}


/**
 * Loads the WorkflowComponentDefinition and returns its action
 * 
 * @param {dw.object.CustomObject} componentAssignment CustomObject of type WorkflowScheduleDefinitionWorkflowComponentDefinitionRelation
 * @returns
 */
function loadWorkflowComponentAction(componentAssignment) 
{
	var componentDefinition = CustomObjectMgr.getCustomObject(WF_COMPONENT_TYPE, componentAssignment.custom.workflowComponentDefinitionName);
	if ( !componentDefinition  ) {
		throw new Error( WF_COMPONENT_TYPE + " \'" + componentAssignment.custom.workflowComponentDefinitionName + "\' doesn't exist." );
	} 
	else if ( empty( componentDefinition.custom ) || empty( componentDefinition.custom.action ) )
	{
		throw new Error( WF_COMPONENT_TYPE + " \'" + componentAssignment.custom.workflowComponentDefinitionName + "\' doesn't have an action defined." );
	}
	return componentDefinition.custom.action;
}

/**
 * Returns whether the schedule is configured for "Sites-Site" (=Organization) context
 * 
 * @param {String} workflowComponentName
 * @returns {Boolean}
 */
function hasOrganizationContext(schedule)
{
	var result = false;
	
	schedule.custom.siteIds.forEach(function(element) {
		if(element == 'Sites-Site') {
			result = true;
		}
	});
	
	return result;
}


/**
 * Returns whether the schedule is configured for "Sites-Site" (=Organization) context
 * 
 * @param {String} workflowComponentName
 * @returns {Boolean}
 */
function hasSiteContext(schedule)
{
	var result = false;
	
	schedule.custom.siteIds.forEach(function(element) {
		if(element != 'Sites-Site') {
			result = true;
		}
			
	});
	
	return result;
}


/**
 * Maintains a list of already used step-ids and adds a counting postfix to identical step-ids.
 * 
 * @param stepID
 * @returns
 */
function getUniqueStepID(stepID) 
{
	var stepCounter = 1;
	var plainStepID = stepID;
	
	while(stepIDs.indexOf(stepID) >= 0) {
		stepID = plainStepID + '_' + stepCounter;
		stepCounter++;
	}
	
	stepIDs.push(stepID);
	return stepID;
}


/**
 * @see module:controllers/Converter~Start 
 */
exports.Start = boguard.ensure(['https'], start);