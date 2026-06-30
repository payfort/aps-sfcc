/**
 *  APS purchase service
 */
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');

var getAPSPurchaseService = LocalServiceRegistry.createService('int.aps.purchase', {
    /**
     * Creates a request object to be used when calling the service
     *
     * @param {dw.svc.HTTPService} service - Service being executed.
     * @param {Object} params - Parameters given to the call method.
     *
     * @returns {Object} - Request object to give to the execute method
     */
    createRequest: function (service, params) {
        service.addHeader('Content-Type', 'application/json');
        service.addHeader('Accept', '*/*');
        service.addHeader('accept-encoding', 'gzip,deflate');

        service.setRequestMethod('POST');

        var returnArgument = JSON.stringify(params);

        return returnArgument;
    },

    /**
     * Creates a response object from a successful service call.
     * This response object will be the output object of the call method's Result.
     *
     *  @param {dw.svc.Service} service - Service being executed
     *  @param {Object} response - Service-specific response object
     *
     * @returns {dw.svc.Result} - Object to return in the service call's Result.
     */
    parseResponse: function (service, resp) {
        return resp.text;
    },

    /**
     * Creates a communication log message for the given request.
     * Used to hide sensitive data in server request logs
     *
     * @param {Object} request - Request object
     * @returns {string} - Log message, or null to create and use the default message
     */
    getRequestLogMessage: function (request) {
        try {
            var requestObj = JSON.parse(request);
            if (requestObj.card_security_code) {
                requestObj.card_security_code = '***';
            }
            return JSON.stringify(requestObj);
        } catch (e) {
            return request.replace(/"card_security_code"\s*:\s*"[^"]*"/, '"card_security_code":"***"');
        }
    },

    /**
     * Allows filtering communication URL, request, and response log messages
     *
     * @param {string} msg - original log message
     * @returns {string} - Message to be logged
     */
    filterLogMessage: function (msg) {
        if (typeof msg === 'string' && msg.indexOf('card_security_code') !== -1) {
            return msg.replace(/"card_security_code"\s*:\s*"[^"]*"/g, '"card_security_code":"***"');
        }
        return msg;
    },

    /**
     * Creates a response log message for the given request
     * Can accept {Object} response - service response object
     *
     * @param {Object} responseObj - service response object
     * @returns {string} - Log message, or null to create and use the default message
     */
    getResponseLogMessage: function (responseObj) {
        return responseObj.text;
    }
});

exports.getAPSPurchaseService = getAPSPurchaseService;
