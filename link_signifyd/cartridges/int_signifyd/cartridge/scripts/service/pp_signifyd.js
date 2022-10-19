/**
* Demandware Script File
* To define input and output parameters, create entries of the form:
*
* @<paramUsageType> <paramName> : <paramDataType> [<paramComment>]
*
* where
*   <paramUsageType> can be either 'input' or 'output'
*   <paramName> can be any valid parameter name
*   <paramDataType> identifies the type of the parameter
*   <paramComment> is an optional comment
*
* For example:
*
* @input Order: dw.order.Order
*
*/
var Signifyd = require('./signifyd');


// eslint-disable-next-line no-unused-vars,,require-jsdoc
function execute(args) {
    var order = args.Order;
    // eslint-disable-next-line new-cap
    var result = Signifyd.Call(order);
    if (result) {
        // eslint-disable-next-line no-undef
        return PIPELET_NEXT;
    }
    // eslint-disable-next-line no-undef
    return PIPELET_ERROR;
}
