/* eslint-disable no-param-reassign */
/* globals response, request */

var Logger = require('dw/system/Logger');
var currentSite = require('dw/system/Site').getCurrent();
var applePayService = require('*/cartridge/scripts/services/applePayService');

/**
 * Parses the Service response
 *
 * @param {Object} serviceResult the service result
 * @returns {null | Object} the service response
 */
function getServiceResponse(serviceResult) {
    if (serviceResult && serviceResult.OK) {
        return serviceResult.object;
    }
    Logger.error('ApplePay Service error: {0}', JSON.stringify(serviceResult, null, '\t'));
    return null;
}

/**
 * Sets the content type of the request and sends the response
 *
 * @param {Object} jsonData data to sent to the response
 */
function renderJson(jsonData) {
    response.setContentType('application/json');
    response.writer.print(JSON.stringify(jsonData));
}

/**
 * Parses the request body
 *
 * @returns {Object} the parsed request body
 */
function getBodyContent() {
    var requestBody = request.getHttpParameterMap().getRequestBodyAsString();
    try {
        requestBody = JSON.parse(requestBody);
    } catch (error) {
        return {};
    }

    return requestBody;
}

/**
 * Validated the sessions with Apple
 *
 * @param {Object} requestPayload request data
 * @returns {Object} the session data
 */
function validateMerchant(requestPayload) {
    var validateMerchantResponse = {};
    if (requestPayload.appleUrl) {
        requestPayload.initiativeContext = requestPayload.hostname;
        var validationRegex = currentSite.getCustomPreferenceValue('apsApplePayUrlValidationRegex');
        var url = requestPayload.appleUrl;
        if (url.match(validationRegex)) {
            delete requestPayload.appleUrl;
            delete requestPayload.isTrusted;
            delete requestPayload.hostname;

            requestPayload.initiative = 'web';
            requestPayload.merchantIdentifier = currentSite.getCustomPreferenceValue('apsApplePayMerchantID');
            requestPayload.displayName = currentSite.name;

            var requestData = {
                method: 'POST',
                url: url,
                payload: requestPayload
            };

            validateMerchantResponse = getServiceResponse(applePayService.call(requestData));
        }
    }

    return validateMerchantResponse;
}

module.exports = {
    validateMerchant: validateMerchant,
    getBodyContent: getBodyContent,
    renderJson: renderJson
};
