'use strict';

var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
var constants = require('*/cartridge/scripts/util/constants');

/**
 * Verifies that entered credit card information is a valid card. If the information is valid a
 * credit card payment instrument is created
 * @param {dw.order.Basket} basket Current users's basket
 * @param {Object} paymentInformation - the payment information
 * @param {string} paymentMethodID - paymentmethodID
 * @param {Object} req the request object
 * @return {Object} returns an error object
 */
var Handle = function (basket, paymentInformation, paymentMethodID, req) { // eslint-disable-line no-unused-vars
    var fieldErrors = [];
    var serverErrors = [];
    try {
        var currentBasket = basket;

        COHelpers.removeNonGiftCertificatePaymentInstruments(currentBasket);
        Transaction.wrap(function () {
            var paymentInstrument = currentBasket.createPaymentInstrument( // eslint-disable-line no-unused-vars
                constants.APS_HOSTED_PAYMENT_INSTRUMENT, currentBasket.totalGrossPrice
            );
        });
    } catch (e) {
        serverErrors.push(
            Resource.msg('error.payment.processor.not.supported', 'checkout', null)
        );
        return {
            fieldErrors: fieldErrors,
            serverErrors: serverErrors,
            error: true
        };
    }
    return {
        fieldErrors: fieldErrors,
        serverErrors: serverErrors,
        error: false
    };
};

/**
 * Authorizes a payment using a credit card. Customizations may use other processors and custom
 *      logic to authorize credit card payment.
 * @param {number} orderNumber - The current order's number
 * @param {dw.order.PaymentInstrument} paymentInstrument -  The payment instrument to authorize
 * @param {dw.order.PaymentProcessor} paymentProcessor -  The payment processor of the current
 *      payment method
 * @return {Object} returns an error object
 */
var Authorize = function (orderNumber, paymentInstrument, paymentProcessor) {
    var serverErrors = [];
    var fieldErrors = {};
    var error = false;

    return {
        fieldErrors: fieldErrors,
        serverErrors: serverErrors,
        error: error
    };
};



module.exports = {
    Handle: Handle,
    Authorize: Authorize
};
