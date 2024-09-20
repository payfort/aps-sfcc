'use strict';
/* globals session */

var server = require('server');
var pwa = require('*/cartridge/scripts/middleware/pwa');
var applePayHelpersPWA = require('*/cartridge/scripts/helpers/applePayHelpersPWA');

/**
 * Endpoint ApplePay-ValidateMerchant
 * Validates server side and fetches the session from Apple
 *
 */
server.post('ValidateMerchant', pwa.allowCORS, server.middleware.https, function (req, res, next) {
    var requestBody = applePayHelpersPWA.getBodyContent();
    var validateMerchantResponse = applePayHelpersPWA.validateMerchant(requestBody);

    applePayHelpersPWA.renderJson(validateMerchantResponse);
});

/**
 * Endpoint ApplePay-PaymentAuthorized
 * Creates the Basket payment instrument
 *
 * @returns {Object} error or success messages
 */
server.post('PaymentAuthorized', pwa.allowCORS, server.middleware.https, function (req, res, next) {
    return applePayHelpersPWA.renderJson({
        success: true
    });
});

module.exports = server.exports();
