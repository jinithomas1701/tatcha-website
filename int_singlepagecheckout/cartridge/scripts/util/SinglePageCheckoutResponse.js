'use strict';

/**
 * This module provides html output 
 *
 * @module util/SinglePageCheckoutResponse
 */

/**
 * Transforms the provided argument into html format
 */
exports.renderHTML = function (html) {
    response.setContentType('text/html; charset=UTF-8');
    response.writer.print(html);
};
