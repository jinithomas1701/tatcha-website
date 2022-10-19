'use strict';

var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');

/**
 * Render logic for richtext component
 */
module.exports.render = function (context) {
    var model = new HashMap();
    var content = context.content;

    if (content.html) {
        model.html = content.html;
    }

    return new Template('experience/components/assets/htmlblock').render(model).text;
};
