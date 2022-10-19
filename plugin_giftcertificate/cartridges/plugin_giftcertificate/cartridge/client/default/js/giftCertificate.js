'use strict';
/* global $ */
var processInclude = require('base/util');

$(document).ready(function () {
    processInclude(require('./giftcert/giftcert'));
});
require('base/components/spinner');