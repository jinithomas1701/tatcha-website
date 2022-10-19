"use strict";

var Site = require("dw/system/Site");

/**
 * @module scripts/datadome/utils/Contants
 *
 * This is a file used to put all Constants here which will be reused in DataDome cartridge.
 */

exports.SITEGENESIS_CARTRIDGE_NAME = Site.getCurrent().getPreferences().custom.ddSGControllerCartridgeName;
