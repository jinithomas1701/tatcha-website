'use strict';

var base = module.superModule;
base.wishlist = require('*/cartridge/models/product/decorators/wishlist');
base.customFields = require('*/cartridge/models/product/decorators/customFields');
base.analyticFields = require('*/cartridge/models/product/decorators/analyticFields');
base.availability = require('*/cartridge/models/product/decorators/availability');
base.travelProductVariant = require('*/cartridge/models/product/decorators/travelProductVariant');
base.marketingFlag = require('*/cartridge/models/product/decorators/marketingFlag');

module.exports = base;
