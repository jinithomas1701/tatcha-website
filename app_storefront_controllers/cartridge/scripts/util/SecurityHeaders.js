'use strict';

var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');

exports.setSecurityHeaders = function setSecurityHeaders() {
    response.setHttpHeader(dw.system.Response.X_FRAME_OPTIONS, dw.system.Response.X_FRAME_OPTIONS_DENY_VALUE );
    response.setHttpHeader(dw.system.Response.CONTENT_SECURITY_POLICY, "frame-ancestors 'self'" );
    response.setHttpHeader(dw.system.Response.X_XSS_PROTECTION, "1; mode=block" );
    response.setHttpHeader(dw.system.Response.X_CONTENT_TYPE_OPTIONS, "nosniff" );
    response.setHttpHeader(dw.system.Response.REFERRER_POLICY, "strict-origin" );
    
    /*response.setHttpHeader("X-SF-CC-Strict-Transport-Security", "max-age=31536000 ; includeSubDomains" );
    response.setHttpHeader("X-SF-CC-Expect-CT", "max-age=86400, enforce" );
    response.setHttpHeader("X-SF-CC-Feature-Policy", "vibrate 'none'; geolocation 'none'" );
    response.setHttpHeader("X-SF-CC-X-Permitted-Cross-Domain-Policies", "none" );*/
}
