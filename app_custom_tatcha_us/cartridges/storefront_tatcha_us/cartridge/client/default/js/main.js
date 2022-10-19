'use strict';

require('base/main');
var processInclude = require('base/util');

$(document).ready(function () {
    processInclude(require('./components/clientSideValidation'));
});

require('base/components/spinner');
