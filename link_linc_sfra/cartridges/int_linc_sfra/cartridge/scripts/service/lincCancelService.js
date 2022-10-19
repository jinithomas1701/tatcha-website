/**
 * Initialize HTTP services for Linc cartridge
 */
importPackage( dw.svc );
importPackage( dw.net );
importPackage( dw.io );
var Logger = require('dw/system/Logger');

/**
 * Function to call the Linc Cancel Order API
 */
function callLincCancel(orderId) {
    try {
        var logger = Logger.getLogger('LincCancel');
        var credential = LincOrderCancelService.getConfiguration().getCredential();
        var token = 'Bearer ' + credential.user;

        if(!credential || !credential.user) {
            logger.info('callLincOrderCancel - Empty Credentials');
        }

        var url = credential.getURL() + '/'+orderId;
        LincOrderCancelService.setURL(url);
        LincOrderCancelService.addHeader('Content-Type', 'application/json');
        LincOrderCancelService.addHeader('Authorization', token);
        var result = LincOrderCancelService.call();
        logger.info('callLincOrderCancel - ' + result.msg);
    } catch (error) {
        throw new Error(error);
    }
}

module.exports = {
    callLincCancel : callLincCancel
}

/**
*
* HTTP Service Initialization
*
*/
var LincOrderCancelService = LocalServiceRegistry.createService("linc.cancel.order.service", {
    createRequest: function(service, params) {
        service = service.setRequestMethod("DELETE");
        service = service.setAuthentication('NONE');
        return params;
    },
    parseResponse: function(svc:HTTPService, client:HTTPClient) {
        return client.text;
    }
});
