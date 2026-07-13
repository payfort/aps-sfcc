/**
 *  APS purchase service
 */
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var logRedactor = require('*/cartridge/scripts/util/logRedactor');

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
     *
     * The APS request bag carries the shopper's CVV (`card_security_code`),
     * the APS vault token (`token_name`), the merchant credentials
     * (`access_code`, `merchant_identifier`), the request signature, and PII
     * (email, IP, card holder, PAN). None of those must reach the service
     * comm-log, which is readable from Business Manager and WebDAV. The
     * redactor scrubs the log-facing copy of the request while leaving the
     * actual outbound payload delivered to APS unchanged.
     *
     * @param {Object} request - Request object
     * @returns {string} - Log message
     */
    getRequestLogMessage: function (request) {
        return logRedactor.maskString(request);
    },

    /**
     * Allows filtering communication URL, request, and response log messages.
     *
     * @param {string} msg - original log message
     * @returns {string} - Message to be logged
     */
    filterLogMessage: function (msg) {
        return logRedactor.maskString(msg);
    },

    /**
     * Creates a response log message for the given response.
     *
     * APS purchase responses echo `token_name`, `merchant_reference`, the
     * response `signature`, `fort_id`, masked PAN, `card_holder_name`, and
     * customer identifiers. They must be scrubbed before being written to the
     * service comm-log.
     *
     * @param {Object} responseObj - service response object
     * @returns {string} - Log message
     */
    getResponseLogMessage: function (responseObj) {
        return logRedactor.maskString(responseObj && responseObj.text);
    }
});

exports.getAPSPurchaseService = getAPSPurchaseService;
