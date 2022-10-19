'use strict';

var server = require('server');
server.extend(module.superModule);

/**
 * Remote include for the header.
 * This is designed as a remote include to achieve optimal caching results for the header.
 */
server.get('IncludeHeader', function (req, res, next){
    res.render('components/header/header');
    next();
});

/**
 * Renders the category navigation and the menu to use as a remote include.
 * It is cached.
 *
 * @deprecated Converted into a template include.
 */
server.get('IncludeHeaderMenu', function (req, res, next){
    res.render('components/header/headermenu');
    next();
});

/**
 * Renders customer information.
 *
 * This is designed as a remote include as it represents dynamic session information and must not be
 * cached.
 */
server.get('IncludeHeaderCustomerInfo', function (req, res, next){
    res.render('components/header/headercustomerinfo');
    next();
});

server.get('IncludeHeaderCustomerInfoMobileBS', function (req, res, next){
    res.render('components/header/headercustomerinfomobile_bs');
    next();
});

server.get('IncludeHeaderCustomerInfoMobile', function (req, res, next){
    res.render('components/header/headercustomerinfomobile');
    next();
});

server.get('IncludeHeaderCustomerInfoBS', function (req, res, next){
    res.render('components/header/headercustomerinfo_bs');
    next();
});


/**
 * Used in the setlayout.isml and htmlhead.isml templates to control device-aware display.
 * Sets the session custom property 'device' to mobile. Renders the changelayout.isml template.
 * TODO As we want to have a responsive layout, do we really need the below?
 */
server.get('MobileSite', function (req, res, next){
    session.custom.device = 'mobile';
    res.render('components/changelayout');
    next();
});

/**
 * Sets the session custom property 'device' to mobile.  Renders the setlayout.isml template.
 * @FIXME remove - not responsive - maybe replace with a CSS class forcing the layout.
 */
server.get('FullSite', function (req, res, next){
    session.custom.device = 'fullsite';
    securityHeader.setSecurityHeaders();
    res.render('components/changelayout');
    next();
});

/**
 * Renders the setlayout.isml template.
 * @FIXME remove - not responsive
 */
server.get('SetLayout', function (req, res, next){
    res.render('components/setlayout');
    next();
});

/**
 * Renders the devicelayouts.isml template.
 * @FIXME remove - not responsive
 */
server.get('DeviceLayouts', function (req, res, next){
    res.render('util/devicelayouts');
    next();
});

module.exports = server.exports();