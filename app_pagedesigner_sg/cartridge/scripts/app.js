'use strict';

var exportObject = module.superModule;
exportObject.getModel = function (modelName) {
    return require('*/cartridge/scripts/models/' + modelName + 'Model');
};
module.exports = exportObject;

