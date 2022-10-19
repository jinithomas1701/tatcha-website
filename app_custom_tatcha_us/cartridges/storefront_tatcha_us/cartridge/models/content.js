'use strict';

var base = module.superModule;

/**
 * Represents content model
 * @param  {dw.content.Content} contentValue - result of ContentMgr.getContent call
 * @param  {string} renderingTemplate - rendering template for the given content
 * @return {void}
 * @constructor
 */
function content(contentValue, renderingTemplate) {
    base.call(this, contentValue, renderingTemplate);
    this.custom = contentValue.custom;
    this.description = contentValue.description;
}

module.exports = content;
