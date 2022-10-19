"use strict";

/**
 * Controller that provides rudimentary conversion of existing WorkflowComponentDefinitions into
 * a JSON format supported by the new internal DW integration framework.
 * This JSON can be imported into the new Framework
 *
 * @module controllers/Converter
 */

/* Script Modules */
var boguard = require("~/cartridge/scripts/boguard");

var cvLogger = require("dw/system/Logger");

//Custom object type ID where the WorkflowComponentDefinition are stored
const CUSTOM_OBJECT_TYPE = "WorkflowComponentDefinition";
const PATH_TO_EXECUTOR = "bc_integrationframework/cartridge/scripts/workflow/legacy/PipelineStepRunner";
const EXECUTOR_FUNCTION = "execute";

/**
 * Main controller function to get all component definitions and convert them into job steps.
 */
function start() {

    var CustomObjectMgr = require("dw/object/CustomObjectMgr");
    var customObjectsIterator = CustomObjectMgr.queryCustomObjects(CUSTOM_OBJECT_TYPE, "", "custom.name asc");
    var customObjects = [];

    //get all related custom objects and store them into simple object
    while (customObjectsIterator.hasNext()) {
        let co = customObjectsIterator.next();

        let obj = {
            "name"        : co.custom.name,
            "action"      : co.custom.action,
            "description" : co.custom.description
        };

        try {
            obj.parameters = co.custom.parameters ? JSON.parse(co.custom.parameters) : "";
        } catch (e) {
            cvLogger.error("Failed to parse parameters for WFC '" + co.custom.name + "' message: " + e);
        }

        customObjects.push(obj);
    }

    customObjectsIterator.close();

    //create job step JSON structure
    var jobStepJSON = convertIntoJobStepJSON(customObjects);

    //Render file download
    response.addHttpHeader(response.CONTENT_DISPOSITION, "attachment; filename=\"steptypes.json\"");
    response.setContentType("application/json");
    response.writer.print(jobStepJSON);

}
/**
 * Function to render an Array of workflow component objects into the JSON format required by the new integation framework
 *
 * @param  {Array} componentArray Array of component objects
 * @return {String} JSON String in job step import format
 */
function convertIntoJobStepJSON(componentArray) {

    var stepTypesObj = {
        "step-types" : {
            "script-module-step" : []
        }
    };

    //loop over all components and convert them individually
    for (let i in componentArray) {
        let step = convertComponentIntoSingleStep(componentArray[i]);

        stepTypesObj["step-types"]["script-module-step"].push(step);

    }

    return JSON.stringify(stepTypesObj, null, 4);

}

/**
 * Helper function to convert a single component into a Job Step
 *
 * @param  {Object} componentObject simple object {'name': name, 'action': action, 'description': description}
 * @return {Object} Job step object
 */
function convertComponentIntoSingleStep(componentObject) {

    var step = {
        "@type-id"       : "custom." + componentObject.name.replace(/[^a-zA-Z0-9\-]/g,"_"),
        //TODO reference to executor
        "module"         : PATH_TO_EXECUTOR,
        "function"       : EXECUTOR_FUNCTION,
        "parameters"     : parseParams(componentObject),
        //adding status codes allowed as per CS Integration Framework
        "status-codes":
            {
                status :
                    [
                        { "@code" : "ERROR",     description: "Used when an error occurred." },
                        { "@code" : "OK",        description: "Used when everything went well." },
                        { "@code" : "WARN",        description: "Used when small, but acceptable problems occurred."}
                    ]
            }
    };

    return step;

}
/**
 * Helper function to handle the action field
 *
 * @param  {Object} componentObject simple object {'name': name, 'action': action, 'description': description}
 * @return {Object} action object
 */
function parseAction(componentObject) {

    actionObj = {
        "@name"            : "Action",
        "description"    : "Legacy action of the community suite IF, to be called through the new Step Execution",
        "@type"            : "string",
        "@required"        : "true",
        "enum-values"    : {
            "value": [ componentObject.action ]
        }
    };

    return actionObj;
}

/**
 * Helper function to handle the parameters for a component
 *
 * @param  {Object} componentObject simple object {'name': name, 'action': action, 'description': description}
 * @return {Object} parameter object
 */
function parseParams(componentObject) {

    var action = parseAction(componentObject);

    var parametersObj = {
        "parameters" : []
    };

    parametersObj.parameters.push(action);

    //adding verbose flag
    parametersObj.parameters.push(
        {
            "@name": "Verbose",
            "description": "Enables verbose logging",
            "@type": "boolean",
            "@required": false,
            "@trim": true
        });

    //loop over all parameters
    for (let i in componentObject.parameters) {

        let obj = parseSingleParams(componentObject.parameters[i]);

        parametersObj.parameters.push(obj);
    }

    return parametersObj;

}

/**
 * Helper function to take care of a single parameter transformation. Handles the different parameter types.
 *
 * @param  {Object} param parameter object to be transformed into new format
 * @return {Object} transformed parameter object
 */
function parseSingleParams(param) {

    var type = param.type;

    var parameterObj = {
        "@name"         : param.id,
        "description"  : param.name,
        "@type"         : type,
        "@required"     : param.mandatory || false,
        "@trim"         : true

    };

    if (type === "enum") {
        parameterObj["@type"] = "string";
        parameterObj["enum-values"] ={ value: param.enumValues };
    } else if (type === "date") {
        parameterObj["@type"] = "date-string";
    } else if (type === "time") {
        parameterObj["@type"] = "time-string";
    } else if (type === "password") {
        //until the JFW supports passwords, we need to handle the fields as regular strings
        parameterObj["@type"] = "string";
    } else if (type === "datetime") {
        parameterObj["@type"] = "datetime-string";
    } else if (type === "int") {
        parameterObj["@type"] = "double";
    }

    return parameterObj;
}

/**
 * @see module:controllers/Converter~Start */
exports.Start = boguard.ensure(["https"], start);