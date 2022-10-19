/**
 * Initialize HTTP services for a cartridge
 */
importPackage( dw.svc );
importPackage( dw.net );
importPackage( dw.io );
var Logger = require('dw/system/Logger');

/**
 * Function to call the Linc Shipment Order API
 */
function callLincShipment(data) {
    try {
        var logger = Logger.getLogger('Linc');
        var credential = LincShipmentService.getConfiguration().getCredential();
        var token = 'Bearer ' + credential.user;

        if(!credential || !credential.user) {
            logger.info('callLincShipment - Empty Credentials');
        }        
        
        LincShipmentService.addHeader('Content-Type', 'application/json');
        LincShipmentService.addHeader('Authorization', token);
        data = JSON.stringify(data);
        logger.info('payload - ' + data);
        var result = LincShipmentService.call(data);
        logger.info('callLincShipment - ' + result.msg);
    } catch (error) {
        throw new Error(error);
    }
}

module.exports = {
    callLincShipment : callLincShipment
}

/**
*
* HTTP Services
*
*/
var LincShipmentService = LocalServiceRegistry.createService("linc.shipment.service", {
    createRequest: function(service, params) {
        service = service.setRequestMethod("POST");
        service = service.setAuthentication('NONE');
        return params;
    },
    parseResponse: function(svc:HTTPService, client:HTTPClient) {
        return client.text;        
    }
});

