'use strict';

/**
 * Controller that renders the home page.
 *
 * @module controllers/Home
 */

var app = require('app_storefront_controllers/cartridge/scripts/app');
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var securityHeader = require('app_storefront_controllers/cartridge/scripts/util/SecurityHeaders');
var PageMgr = require('dw/experience/PageMgr');

/**
 * Renders the home page.
 */
function show() {
	
    // get page with fixed ID 'homepage'
    var page = PageMgr.getPage('homepage');
    // display the page using Page Designer if it exists and is published
    if (page != null && page.isVisible()) {
    	securityHeader.setSecurityHeaders();
        response.writer.print(PageMgr.renderPage(page.ID, ''));
    } else {
        var homemeta = app.getModel('Content').get('homepagemeta');
        require('app_storefront_controllers/cartridge/scripts/meta').update(homemeta);
        securityHeader.setSecurityHeaders();
        app.getView().render('content/home/homepage');
    }
}

/**
 * Remote include for the header.
 * This is designed as a remote include to achieve optimal caching results for the header.
 */
function includeHeader() {
    app.getView().render('components/header/header');
}

/**
 * Renders the category navigation and the menu to use as a remote include.
 * It is cached.
 *
 * @deprecated Converted into a template include.
 */
function includeHeaderMenu() {
    app.getView().render('components/header/headermenu');
}

/**
 * Renders customer information.
 *
 * This is designed as a remote include as it represents dynamic session information and must not be
 * cached.
 */
function includeHeaderCustomerInfo() {
    app.getView().render('components/header/headercustomerinfo');
}

/*
 * Render customer information - latest design (BS4)
 * */
function includeHeaderCustomerInfoBS() {
    app.getView().render('components/header/headercustomerinfo_bs');
}

function includeHeaderCustomerInfoMobileBS() {
    app.getView().render('components/header/headercustomerinfomobile_bs');
}

function includeHeaderCustomerInfoMobile() {
    app.getView().render('components/header/headercustomerinfomobile');
}

function includeRitualFinderReorderInfo(){
    app.getView().render('components/header/headercustomerreorderlink');
}

/**
 * Sets a 404 HTTP response code for the response and renders an error page (error/notfound template).
 */
function errorNotFound() {
    // @FIXME Correct would be to set a 404 status code but that breaks the page as it utilizes
    // remote includes which the WA won't resolve
	var metaData = app.getModel('Content').get('404-page');
    if (metaData) {
    	var pageMeta = require('app_storefront_controllers/cartridge/scripts/meta');
    	pageMeta.update(metaData);
	}
    securityHeader.setSecurityHeaders();
    response.setStatus(404);
    app.getView().render('error/notfound');
}

/**
 * Used in the setlayout.isml and htmlhead.isml templates to control device-aware display.
 * Sets the session custom property 'device' to mobile. Renders the changelayout.isml template.
 * TODO As we want to have a responsive layout, do we really need the below?
 */
function mobileSite() {
    session.custom.device = 'mobile';
    app.getView().render('components/changelayout');
}

/**
 * Sets the session custom property 'device' to mobile.  Renders the setlayout.isml template.
 * @FIXME remove - not responsive - maybe replace with a CSS class forcing the layout.
 */
function fullSite() {
    session.custom.device = 'fullsite';
    securityHeader.setSecurityHeaders();
    app.getView().render('components/changelayout');
}

/**
 * Renders the setlayout.isml template.
 * @FIXME remove - not responsive
 */
function setLayout() {
    app.getView().render('components/setlayout');
}

/**
 * Renders the devicelayouts.isml template.
 * @FIXME remove - not responsive
 */
function deviceLayouts() {
    app.getView().render('util/devicelayouts');
}

/*
 * Export the publicly available controller methods
 */
/** Renders the home page.
 * @see module:controllers/Home~show */
exports.Show = guard.ensure(['get'], show);
/** Remote include for the header.
 * @see module:controllers/Home~includeHeader */
exports.IncludeHeader = guard.ensure(['include'], includeHeader);
/** Renders the category navigation and the menu to use as a remote include.
 * @see module:controllers/Home~includeHeaderMenu */
exports.IncludeHeaderMenu = guard.ensure(['include'],includeHeaderMenu);
/** This is designed as a remote include as it represents dynamic session information and must not be cached.
 * @see module:controllers/Home~includeHeaderCustomerInfo */
exports.IncludeHeaderCustomerInfo = guard.ensure(['include'], includeHeaderCustomerInfo);


exports.IncludeHeaderCustomerInfoBS = guard.ensure(['include'], includeHeaderCustomerInfoBS);

exports.IncludeHeaderCustomerInfoMobile = guard.ensure(['include'], includeHeaderCustomerInfoMobile);
exports.IncludeHeaderCustomerInfoMobileBS = guard.ensure(['include'], includeHeaderCustomerInfoMobileBS);
/** Sets a 410 HTTP response code for the response and renders an error page
 * @see module:controllers/Home~errorNotFound */
exports.ErrorNotFound = guard.ensure(['get'], errorNotFound);
/** Used to control device-aware display.
 * @see module:controllers/Home~mobileSite */
exports.MobileSite = guard.ensure(['get'], mobileSite);
/** Sets the session custom property 'device' to mobile. Renders the setlayout.isml template.
 * @see module:controllers/Home~fullSite */
exports.FullSite = guard.ensure(['get'], fullSite);
/** Renders the setlayout.isml template.
 * @see module:controllers/Home~setLayout */
exports.SetLayout = guard.ensure(['get'], setLayout);
/** Renders the devicelayouts.isml template.
 * @see module:controllers/Home~deviceLayouts */
exports.DeviceLayouts = guard.ensure(['get'], deviceLayouts);
exports.IncludeRitualFinderReorderInfo = guard.ensure(['include'], includeRitualFinderReorderInfo);
