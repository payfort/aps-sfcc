var Site = require('dw/system/Site');
var URLUtils = require('dw/web/URLUtils');
var OrderMgr = require('dw/order/OrderMgr');
var apsHelper = require('*/cartridge/scripts/helpers/apsHelper');
var constants = require('*/cartridge/scripts/util/constants');

/**
 * Check whether APS is enabled
 * @return {String} - is APS enabled
*/
var isAPSEnabled = function () {
    return Site.current.getCustomPreferenceValue('apsEnabled');
}

/**
 * Check whether APS Hosted is enabled
 * @return {String} - is APS enabled
*/
var isAPSHostedEnabled = function () {
    return Site.current.getCustomPreferenceValue('apsHostedEnabled');
}

/**
 * Returns aps payment instrument from line item container
 * @param {dw.order.LineItemCtnr} lineItemCtnr - line item container
 * @returns {dw.order.PaymentInstrument|null} - aps payment instrument
 */
var getHostedPaymentInstrument = function (lineItemCtnr) {
    var paymentInstruments = lineItemCtnr.getPaymentInstruments();
    var iterator = paymentInstruments.iterator();
    var paymentInstrument;

    while (iterator.hasNext()) {
        paymentInstrument = iterator.next();
        if (paymentInstrument.getPaymentMethod() === constants.APS_HOSTED_PAYMENT_INSTRUMENT) {
            return paymentInstrument;
        }
    }

    return null;
};

/**
 * Get recirect settings for hosted page
 * @return {Object} - redirect settings
*/
var getRedirectSettings = function () {
    var redirectSettings = {
        apsEnabled: isAPSEnabled(),
        apsHostedEnabled: isAPSHostedEnabled(),
        getDataUrl: URLUtils.https('APS-Redirect').toString()
    };

    return redirectSettings;
};

/**
 * Build aps hosted request data.
 * @param {String} orderNumber The order number
 * @param {boolean} isPWARequest Indicates whether the request originated from the PWA-Kit app
 * @returns {Object} The payment request data
 */
function getHostedRequestData(orderNumber, isPWARequest) {
    var order = OrderMgr.getOrder(orderNumber);
    var paymentInstrument = getHostedPaymentInstrument(order);
    var amountToBePaid = paymentInstrument.getPaymentTransaction().getAmount();
    var paymentData = apsHelper.getRequestData(orderNumber, amountToBePaid, false, false);

    paymentData.return_url = isPWARequest ? URLUtils.https('ApsPWA-HandleReturn').toString() : URLUtils.https('APS-HandleReturn').toString();
    paymentData.signature = apsHelper.getSignature(paymentData, false, false);

    return paymentData;
}

module.exports = {
    getRedirectSettings: getRedirectSettings,
    getHostedRequestData: getHostedRequestData,
    getHostedPaymentInstrument: getHostedPaymentInstrument
};