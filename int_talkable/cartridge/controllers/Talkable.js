"use strict";

/* API Includes */
var Site = require("dw/system/Site");

/* Script Modules */
var app = require("app_storefront_controllers/cartridge/scripts/app");
var guard = require("app_storefront_controllers/cartridge/scripts/guard");

/**
 * Renders the Dashboard Campaign
 */
exports.Dashboard = guard.ensure(["get", "loggedIn"], function() {
  if (Site.current.getCustomPreferenceValue("talkableDashboard")) {
    app.getView().render("talkable/dashboard");
  } else {
    app.getView().render("error/notfound");
  }
});

/**
 * Renders the Standalone Campaign
 */
exports.Standalone = guard.ensure(["get"], function() {
  if (Site.current.getCustomPreferenceValue("talkableStandalone")) {
    app.getView().render("talkable/standalone");
  } else {
    app.getView().render("error/notfound");
  }
});
