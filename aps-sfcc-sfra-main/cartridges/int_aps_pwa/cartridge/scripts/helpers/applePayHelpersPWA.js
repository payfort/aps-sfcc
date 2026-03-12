/* eslint-disable no-param-reassign */
/* globals response, request */

var Logger = require('dw/system/Logger');
var currentSite = require('dw/system/Site').getCurrent();
var applePayService = require('*/cartridge/scripts/services/applePayService');

/**
 * Hardcoded whitelist of Apple Pay merchant validation domains.
 * Source: https://developer.apple.com/documentation/apple_pay_on_the_web/setting_up_your_server
 * Only these domains are permitted as targets for merchant validation requests.
 */
var APPLE_PAY_ALLOWED_DOMAINS = [
    'apple-pay-gateway.apple.com',
    'apple-pay-gateway-nc-pod1.apple.com',
    'apple-pay-gateway-nc-pod2.apple.com',
    'apple-pay-gateway-nc-pod3.apple.com',
    'apple-pay-gateway-nc-pod4.apple.com',
    'apple-pay-gateway-nc-pod5.apple.com',
    'apple-pay-gateway-pr-pod1.apple.com',
    'apple-pay-gateway-pr-pod2.apple.com',
    'apple-pay-gateway-pr-pod3.apple.com',
    'apple-pay-gateway-pr-pod4.apple.com',
    'apple-pay-gateway-pr-pod5.apple.com',
    'cn-apple-pay-gateway.apple.com',
    'cn-apple-pay-gateway-sh-pod1.apple.com',
    'cn-apple-pay-gateway-sh-pod2.apple.com',
    'cn-apple-pay-gateway-sh-pod3.apple.com',
    'cn-apple-pay-gateway-tj-pod1.apple.com',
    'cn-apple-pay-gateway-tj-pod2.apple.com',
    'cn-apple-pay-gateway-tj-pod3.apple.com'
];

/**
 * Validates that a URL points to a known Apple Pay merchant validation domain.
 * Enforces HTTPS and checks the hostname against a hardcoded whitelist to prevent SSRF.
 *
 * @param {string} url - The URL to validate
 * @returns {boolean} true if the URL is a valid Apple Pay domain, false otherwise
 */
function isAllowedApplePayUrl(url) {
    if (!url || typeof url !== 'string') {
        return false;
    }

    // Enforce HTTPS scheme
    if (url.indexOf('https://') !== 0) {
        Logger.error('Apple Pay merchant validation URL rejected: non-HTTPS scheme - {0}', url);
        return false;
    }

    // Extract hostname from URL (between "https://" and the next "/" or ":" or end of string)
    var withoutScheme = url.substring(8); // length of 'https://'
    var hostname = withoutScheme.split('/')[0].split(':')[0].split('?')[0].toLowerCase();

    if (APPLE_PAY_ALLOWED_DOMAINS.indexOf(hostname) === -1) {
        Logger.error('Apple Pay merchant validation URL rejected: domain not in whitelist - {0}', url);
        return false;
    }

    return true;
}

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
        var url = requestPayload.appleUrl;

        // SSRF protection: validate URL against hardcoded Apple Pay domain whitelist
        if (!isAllowedApplePayUrl(url)) {
            Logger.error('Apple Pay merchant validation blocked: URL failed domain whitelist check - {0}', url);
            return validateMerchantResponse;
        }

        requestPayload.initiativeContext = requestPayload.hostname;
        var validationRegex = currentSite.getCustomPreferenceValue('apsApplePayUrlValidationRegex');
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
