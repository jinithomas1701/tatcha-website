'use strict';
/* global XML */

var xmlHelper = {};

/**
 * Parse XML into Object
 * @param {string} xmlStr XML string
 * @return {Object} Parsed object
 */
xmlHelper.parseXml = function (xmlStr) {
    var resultObj = {};
    var xmlObj = new XML(xmlStr);

    function formatNodeName(name) { // eslint-disable-line require-jsdoc
        var nameParts = name.split('-');
        for (var i = 1; i < nameParts.length; i++) {
            nameParts[i] = nameParts[i].charAt(0).toUpperCase() + nameParts[i].slice(1);
        }
        return nameParts.join('');
    }

    function parse(node, objectToParse) { // eslint-disable-line require-jsdoc
        var obj = objectToParse;
        var nodeName = formatNodeName(node.name().toString());
        var elements = node.elements();
        var element = null;
        var elementIndx = null;

        if (elements.length()) {
            var nodeType = node.attribute('type').toString();
            if (nodeType === 'array' || nodeType === 'collection') {
                obj[nodeName] = [];
                if (elements[0] && elements[0].hasSimpleContent() && nodeType !== 'collection') {
                    for (elementIndx in elements) {
                        element = elements[elementIndx];
                        obj[nodeName].push(element.text().toString());
                    }
                } else {
                    for (elementIndx in elements) {
                        element = elements[elementIndx];
                        parse(element, obj[nodeName]);
                    }
                }
            } else if (obj instanceof Array) {
                var objNew = {};
                obj.push(objNew);
                for (elementIndx in elements) {
                    element = elements[elementIndx];
                    parse(element, objNew);
                }
            } else {
                obj[nodeName] = {};
                for (elementIndx in elements) {
                    element = elements[elementIndx];
                    parse(element, obj[nodeName]);
                }
            }
        } else {
            obj[nodeName] = node.text().toString();
        }
    }

    parse(xmlObj, resultObj);
    return resultObj;
};

module.exports = xmlHelper;
