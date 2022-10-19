'use strict';

var base = module.superModule;
base.gwpProduct = require('*/cartridge/models/productLineItem/decorators/gwpProduct');
base.proratedPrice = require('*/cartridge/models/productLineItem/decorators/proratedPrice');

module.exports = base;
