"use strict";
 
/**
 * Controller that provides rudimentary conversion of existing WorkflowComponentDefinitions into
 * a JSON format supported by the new internal DW integration framework.
 * This JSON can be imported into the new Framework
 *
 * @module controllers/Converter
 */
 
/* Script Modules */
var bg = require("~/cartridge/scripts/boguard");
var ISML = require("dw/template/ISML");


 
/**
 * Main controller function to get all component definitions and convert them into job steps.
 */
function start() 
{
    ISML.renderTemplate("migration/overview.isml");
}


/**
 * @see module:controllers/Converter~Start */
exports.Start = bg.ensure(["https"], start);
