var Transaction = require('dw/system/Transaction');
var Logger = require('dw/system/Logger');
var Resource = require('dw/web/Resource');
var Status = require('dw/system/Status');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
var constants = require('*/cartridge/scripts/util/constants');
var applePayHelper = require('*/cartridge/scripts/helpers/applePayHelper');
var apsHelper = require('*/cartridge/scripts/helpers/apsHelper');

/**
 * Verifies that entered credit card information is a valid card. If the information is valid a
 * credit card payment instrument is created
 * @param {dw.order.Basket} basket Current users's basket
 * @param {Object} paymentInformation - the payment information
 * @param {string} paymentMethodID - paymentmethodID
 * @param {Object} req the request object
 * @return {Object} returns an error object
 */
function Handle(basket, paymentInformation, paymentMethodID, req) { // eslint-disable-line no-unused-vars
    var fieldErrors = [];
    var serverErrors = [];
    try {
        var currentBasket = basket;

        COHelpers.removeNonGiftCertificatePaymentInstruments(currentBasket);
        Transaction.wrap(function () {
            var paymentInstrument = currentBasket.createPaymentInstrument( // eslint-disable-line no-unused-vars
                constants.APS_APPLE_PAY_PAYMENT_INSTRUMENT, currentBasket.totalGrossPrice
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
 * Attempts to authorize and purchase the order
 *
 * @param {Object} orderData object containing the order number
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Apple payment instrument
 * @param {string} paymentProcessor Payment processor ID
 * @returns {Object} object containing the error messag
 */
function Authorize(orderData, paymentInstrument, paymentProcessor, order, isPWARequest) {
    var applePayHelper = require('*/cartridge/scripts/helpers/applePayHelper');

    var serverErrors = [];
    var fieldErrors = {};
    var error = false;
    var apsPaymentResponse = null;

    try {
        var paymentInfo = JSON.parse(paymentInstrument.custom.apsPaymentData);
        apsPaymentResponse = applePayHelper.sendPurchaseRequest(order, paymentInfo.token);

        if (apsPaymentResponse.unsafeRequest) {
            return {
                fieldErrors: fieldErrors,
                serverErrors: serverErrors,
                error: true,
                redirectUrl: ''
            };
        }

        // Handle errors
        Transaction.wrap(function () {
            if (apsPaymentResponse.error) {
                error = true;

                if (apsPaymentResponse.transactionID) {
                    paymentInstrument.paymentTransaction.setTransactionID(apsPaymentResponse.transactionID);
                }
                paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
            } else {
                var paymentAmount = paymentInstrument.getPaymentTransaction().getAmount();
                COHelpers.removeNonGiftCertificatePaymentInstruments(order);

                var applePaymentInstrument = order.createPaymentInstrument(constants.APS_APPLE_PAY_PAYMENT_INSTRUMENT, paymentAmount);

                if (paymentInfo.token.paymentMethod) {
                    var applePaymentData = paymentInfo.token.paymentMethod;
                    var cardType = applePaymentData.network || '';

                    applePaymentInstrument.setCreditCardType(cardType);
                    applePaymentInstrument.setCreditCardNumber(applePaymentData.displayName.replace(cardType, '************'));

                    if (apsPaymentResponse && apsPaymentResponse.expiry_date) {
                        var expiryMonth = apsPaymentResponse.expiry_date.slice(2);
                        var expiryYear = apsPaymentResponse.expiry_date.slice(0, 2);

                        applePaymentInstrument.setCreditCardExpirationMonth(Number(expiryMonth));
                        applePaymentInstrument.setCreditCardExpirationYear(Number(expiryYear));
                    }
                }

                applePaymentInstrument.custom.apsPaymentData = '';
                if (apsPaymentResponse.transactionID) {
                    applePaymentInstrument.paymentTransaction.setTransactionID(apsPaymentResponse.transactionID);
                }
                applePaymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);

                if (apsHelper.isOrderCompleteStatus(apsPaymentResponse.status)) {
                    apsHelper.updateOrderPayment(order, apsPaymentResponse);
                }
            }
        });
    } catch (e) {
        Logger.error('Error on Order Authorization step: {0}', e.message);
        error = true;
        serverErrors.push(
            Resource.msg('error.technical', 'checkout', null)
        );
    }

    return {
        fieldErrors: fieldErrors,
        serverErrors: serverErrors,
        error: error,
        status: apsPaymentResponse.status || '',
        message: apsPaymentResponse.message || ''
    };
}

function authorizeOrderPayment(order, event) {
    var isEventTrusted = Object.prototype.hasOwnProperty.call(event, 'isTrusted') && event.isTrusted === true && order;

    if (isEventTrusted) {
        // Payment request
        var result = applePayHelper.sendPurchaseRequest(order, event.payment.token);

        Transaction.wrap(function() {
            order.removeAllPaymentInstruments();
            order.createPaymentInstrument('DW_APPLE_PAY', order.getTotalGrossPrice());
        });

        if (apsHelper.isOrderCompleteStatus(result.status)) {
            apsHelper.updateOrderPayment(order, result);
        }

        if (!result.error) {
            return new Status(Status.OK);
        }

    }

    return new Status(Status.ERROR);
};

function getRequest(basket, req) {
    session.custom.applepaysession = 'yes';  // eslint-disable-line
};

exports.Authorize = Authorize;
exports.Handle = Handle;
exports.authorizeOrderPayment = authorizeOrderPayment;
exports.getRequest = getRequest;
