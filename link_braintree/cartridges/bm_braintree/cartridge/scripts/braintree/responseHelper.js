var ISML = require('dw/template/ISML');

var responseHelper = {};

/**
 * Renders template
 * @param {string} templateName template name
 * @param {Object} templateData template data
 */
function render(templateName, templateData) {
    var data = templateData;
    if (typeof data !== 'object') {
        data = {};
    }
    try {
        ISML.renderTemplate(templateName, data);
    } catch (e) {
        throw new Error(e.javaMessage + '\n\r' + e.stack, e.fileName, e.lineNumber);
    }
}

/**
 * Renders JSON
 * @param {string} result result
 * @param {string} message message
 * @param {Object} additionalData additional data
 */
function renderJson(result, message, additionalData) {
    var data = {};
    if (!empty(result)) {
        data.result = result;
        data.message = message || null;
        data.additionalData = !empty(additionalData) ? additionalData : null;
    }
    // eslint-disable-next-line no-undef
    response.setContentType('application/json');
    // eslint-disable-next-line no-undef
    response.writer.print(JSON.stringify(data, null, 2));
}

/**
 * Renders error
 * @param {string} errorStr error string
 */
function renderError(errorStr) {
    render('braintreebm/util/servererror', {
        BraintreeError: errorStr
    });
}

responseHelper.render = render;
responseHelper.renderJson = renderJson;
responseHelper.renderError = renderError;
module.exports = responseHelper;
