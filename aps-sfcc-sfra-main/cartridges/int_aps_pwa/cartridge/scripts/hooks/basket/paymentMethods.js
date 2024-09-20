/**
 * Modifies the payment methods for basket response for OCAPI, so that we can show only active Checkout.com payment methods
 *
 * @param {dw.order.Basket} basket the basket object
 * @param {Object} paymentMethodsResult applicable payment methods OCAPI result
 */
exports.modifyGETResponse_v2 = function (basket, paymentMethodsResult) {
    // Get APS payment methods
    var apsHelpersPWA = require("*/cartridge/scripts/helpers/apsHelpersPWA");
    apsHelpersPWA.getApplicableAPSPaymentMethods(basket, paymentMethodsResult);
};
