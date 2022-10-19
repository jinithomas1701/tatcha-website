'use strict';

/**
 * Middleware to set security headers to API
 * @param req - Request object
 * @param res - Response object
 * @param next - - Next call in the middleware chain
 *
 * Need to move to custom base cartridge
 */
function setSecurityHeaders(req, res, next){
    res.setHttpHeader(dw.system.Response.X_FRAME_OPTIONS, dw.system.Response.X_FRAME_OPTIONS_DENY_VALUE );
    res.setHttpHeader(dw.system.Response.CONTENT_SECURITY_POLICY, "frame-ancestors 'self'" );
    res.setHttpHeader(dw.system.Response.X_XSS_PROTECTION, "1; mode=block" );
    res.setHttpHeader(dw.system.Response.X_CONTENT_TYPE_OPTIONS, "nosniff" );
    res.setHttpHeader(dw.system.Response.REFERRER_POLICY, "strict-origin" );

    next();
}

module.exports = {
    setSecurityHeaders: setSecurityHeaders
}
