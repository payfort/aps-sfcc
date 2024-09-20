'use strict';

var paymentServiceHelpers = require('*/cartridge/scripts/helpers/paymentServiceHelpers');
var apsHelpersPWA = require('*/cartridge/scripts/helpers/apsHelpersPWA');

/**
 * Get the confirmation page redirection.
 * @param {SfraResponse} res The HTTP response object
 * @param {dw.order.Order} order The order instance
 */
function getConfirmationPageRedirect(res, order) {
    var lang = paymentServiceHelpers.getLanguageFromResponse(res);

    var result = apsHelpersPWA.getSuccessUrlPWA();
    result = result.replace('{BASKET_ID}', order.custom.basketID)
    result = result.replace('{LANG}', lang)

    res.redirect(result);
}

/**
 * Get the failure page redirection.
 * @param {SfraResponse} res The HTTP response object
 */
function getFailurePageRedirect(res) {
    var lang = paymentServiceHelpers.getLanguageFromResponse(res);

    var result = apsHelpersPWA.getFailureUrlPWA();
    result = result.replace('{LANG}', lang)

    res.redirect(result);
}

module.exports = {
    getConfirmationPageRedirect: getConfirmationPageRedirect,
    getFailurePageRedirect: getFailurePageRedirect
};
