var Status = require('dw/system/Status');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');

var constants = require('*/cartridge/scripts/util/constants');

/**
 * Save the reference of the basket to session so that we can save it to the order
 *
 * @param {dw.order.Basket} basket current basket
 */
exports.beforePOST = function (basket) {
    var basketID = basket.UUID;
    session.custom.basketID = basketID; // eslint-disable-line
};

/**
 * Authorize the payment and return the payment URL, also sets the reference basket ID to the order
 *
 * @param {dw.order.Order} order the created order
 * @param {Object} orderInput OCAPI order object
 * @returns {Status} status of the hook
 */
exports.afterPOST = function (order, orderInput) { // eslint-disable-line no-unused-vars
    var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
    var paymentInstrument = order.getPaymentInstrument();
    // Handles payment authorization
    isPWARequest = true;
    var handlePaymentResult = COHelpers.handlePayments(order, order.orderNo, isPWARequest);

    if (handlePaymentResult.error) {
        var errorMessage = Resource.msg('error.technical', 'checkout', null);
        if (handlePaymentResult.errorMessage) {
            errorMessage = handlePaymentResult.errorMessage;
        }

        return new Status(Status.ERROR, 'ERROR', errorMessage);
    }

    // handle payment redirect
    if (handlePaymentResult.redirectUrl) {
        Transaction.wrap(function () {
            order.custom.basketID = session.custom.basketID; // eslint-disable-line
        });
        delete session.custom.basketID; // eslint-disable-line
        return new Status(Status.OK);
    }

    if (paymentInstrument.getPaymentMethod() === constants.APS_HOSTED_PAYMENT_INSTRUMENT) {
        var hostedHelper = require('*/cartridge/scripts/helpers/hostedHelper');
        var hostedData = hostedHelper.getHostedRequestData(order.getOrderNo(), isPWARequest);
        Transaction.wrap(function () {
            order.custom.basketID = session.custom.basketID; // eslint-disable-line
            paymentInstrument.custom.apsPaymentData = JSON.stringify(hostedData);
        });
        delete session.custom.basketID; // eslint-disable-line
        return new Status(Status.OK);
    }

    var fraudDetectionStatus = handlePaymentResult.status || {status: null};
    // Places the order
    var placeOrderResult = COHelpers.placeOrder(order, fraudDetectionStatus);
    if (placeOrderResult.error) {
        return new Status(Status.ERROR);
    }

    return new Status(Status.OK);
};

/**
 * Adds the payment redirect URL to the order creation hook so that we can redirect the user to the payment page
 *
 * @param {dw.order.Order} order SFCC order object
 * @param {Object} orderResponse OCAPI order creation response
 */
exports.modifyPOSTResponse = function (order, orderResponse) {
    var apsHelpersPWA = require('*/cartridge/scripts/helpers/apsHelpersPWA');
    // This will set the redirect url only if order contains APS payment instrument
    // so we don't need to do an explicit check
    apsHelpersPWA.getAPSRedirectUrl(order, orderResponse);
};
