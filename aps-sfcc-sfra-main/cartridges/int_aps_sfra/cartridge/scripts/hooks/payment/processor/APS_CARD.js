/* eslint-disable no-param-reassign */
/* globals request, empty, session */

'use strict';

var collections = require('*/cartridge/scripts/util/collections');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');

var PaymentInstrument = require('dw/order/PaymentInstrument');
var PaymentMgr = require('dw/order/PaymentMgr');
var PaymentStatusCodes = require('dw/order/PaymentStatusCodes');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');
var cardHelper = require('*/cartridge/scripts/helpers/cardHelper');
var Money = require('dw/value/Money');
var Logger = require('dw/system/Logger');

/**
 * Verifies that entered credit card information is a valid card. If the information is valid a
 * credit card payment instrument is created
 * @param {dw.order.Basket} basket Current users's basket
 * @param {Object} paymentInformation - the payment information
 * @param {string} paymentMethodID - paymentmethodID
 * @param {Object} req the request object
 * @return {Object} returns an error object
 */
function Handle(basket, paymentInformation, paymentMethodID, req) {
    var currentBasket = basket;
    var cardErrors = {};
    var cardNumber = paymentInformation.cardNumber.value;
    var cardSecurityCode = paymentInformation.securityCode.value;
    var expirationMonth = paymentInformation.expirationMonth.value;
    var expirationYear = paymentInformation.expirationYear.value;
    var serverErrors = [];
    var creditCardStatus;

    var cardType = paymentInformation.cardType.value;
    var paymentCard = PaymentMgr.getPaymentCard(cardType);

    // Validate payment instrument
    if (paymentMethodID === PaymentInstrument.METHOD_CREDIT_CARD) {
        var creditCardPaymentMethod = PaymentMgr.getPaymentMethod(PaymentInstrument.METHOD_CREDIT_CARD);
        var paymentCardValue = PaymentMgr.getPaymentCard(paymentInformation.cardType.value);

        var applicablePaymentCards = creditCardPaymentMethod.getApplicablePaymentCards(
            req.currentCustomer.raw,
            req.geolocation.countryCode,
            null
        );

        if (!applicablePaymentCards.contains(paymentCardValue)) {
            // Invalid Payment Instrument
            var invalidPaymentMethod = Resource.msg('error.payment.not.valid', 'checkout', null);
            return { fieldErrors: [], serverErrors: [invalidPaymentMethod], error: true };
        }
    }

    if (!paymentInformation.creditCardToken) {
        if (paymentCard) {
            creditCardStatus = paymentCard.verify(
                expirationMonth,
                expirationYear,
                cardNumber,
                cardSecurityCode
            );
        } else {
            cardErrors[paymentInformation.cardNumber.htmlName] =
                Resource.msg('error.invalid.card.number', 'creditCard', null);

            return { fieldErrors: [cardErrors], serverErrors: serverErrors, error: true };
        }

        if (creditCardStatus.error) {
            collections.forEach(creditCardStatus.items, function (item) {
                switch (item.code) {
                    case PaymentStatusCodes.CREDITCARD_INVALID_CARD_NUMBER:
                        cardErrors[paymentInformation.cardNumber.htmlName] =
                            Resource.msg('error.invalid.card.number', 'creditCard', null);
                        break;

                    case PaymentStatusCodes.CREDITCARD_INVALID_EXPIRATION_DATE:
                        cardErrors[paymentInformation.expirationMonth.htmlName] =
                            Resource.msg('error.expired.credit.card', 'creditCard', null);
                        cardErrors[paymentInformation.expirationYear.htmlName] =
                            Resource.msg('error.expired.credit.card', 'creditCard', null);
                        break;

                    case PaymentStatusCodes.CREDITCARD_INVALID_SECURITY_CODE:
                        cardErrors[paymentInformation.securityCode.htmlName] =
                            Resource.msg('error.invalid.security.code', 'creditCard', null);
                        break;
                    default:
                        serverErrors.push(
                            Resource.msg('error.card.information.error', 'creditCard', null)
                        );
                }
            });

            return { fieldErrors: [cardErrors], serverErrors: serverErrors, error: true };
        }
    }

    COHelpers.removeNonGiftCertificatePaymentInstruments(currentBasket);
    var giftCardTotal = COHelpers.getGiftCardTotals(currentBasket);
    var amount = new Money((currentBasket.totalGrossPrice.value - giftCardTotal.value), currentBasket.currencyCode);
    Transaction.wrap(function () {
        var paymentInstrument = currentBasket.createPaymentInstrument(
            PaymentInstrument.METHOD_CREDIT_CARD, amount
        );

        paymentInstrument.setCreditCardHolder(currentBasket.billingAddress.fullName);
        paymentInstrument.setCreditCardNumber(cardNumber);
        paymentInstrument.setCreditCardType(cardType);
        paymentInstrument.setCreditCardExpirationMonth(expirationMonth);
        paymentInstrument.setCreditCardExpirationYear(expirationYear);

        if (!empty(paymentInformation.storedPaymentUUID)) {
            session.privacy.cardSecurityCode = cardSecurityCode;
        }

        paymentInstrument.setCreditCardToken(paymentInformation.creditCardToken.value);
    });

    return { fieldErrors: cardErrors, serverErrors: serverErrors, error: false };
}


/**
 * Authorizes a payment using a credit card. Customizations may use other processors and custom
 *      logic to authorize credit card payment.
 * @param {Object} orderData - The current order's number and payment reference
 * @param {dw.order.PaymentInstrument} paymentInstrument -  The payment instrument to authorize
 * @param {dw.order.PaymentProcessor} paymentProcessor -  The payment processor of the current payment method
 * @param {dw.order.Order|null} order - Order
 * @param {boolean} isPWARequest Indicates whether the request originated from the PWA-Kit app
 * @return {Object} returns an error object
 */
function Authorize(orderData, paymentInstrument, paymentProcessor, order, isPWARequest) {
    var serverErrors = [];
    var fieldErrors = {};
    var error = false;
    var apsPaymentRequest;

    try {
        apsPaymentRequest = cardHelper.handleRequest(orderData, paymentInstrument, isPWARequest);

        if (apsPaymentRequest.unsafeRequest) {
            return {
                fieldErrors: fieldErrors,
                serverErrors: serverErrors,
                error: true,
                redirectUrl: '',
                message: apsPaymentRequest.message
            };
        }

        // Handle errors
        if (apsPaymentRequest.error) {
            error = true;
            if (apsPaymentRequest.message) {
                Logger.error('Error on Order Authorization (APS) step: {0}, status {1}', apsPaymentRequest.message, apsPaymentRequest.status);
                serverErrors.push(Resource.msg('error.technical', 'checkout', null));
            }

            Transaction.wrap(function () {
                if (apsPaymentRequest.transactionID) {
                    paymentInstrument.paymentTransaction.setTransactionID(apsPaymentRequest.transactionID);
                }
                paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
                paymentInstrument.custom.apsPaymentData = '';
            });
        } else {
            Transaction.wrap(function () {
                paymentInstrument.paymentTransaction.setTransactionID(apsPaymentRequest.transactionID);
                paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
                paymentInstrument.custom.apsPaymentData = '';
            });
        }
    } catch (e) {
        Logger.error('Error on Order Authorization (APS) step: {0}', e.message);
        error = true;
        serverErrors.push(Resource.msg('error.technical', 'checkout', null));
    }

    return {
        fieldErrors: fieldErrors,
        serverErrors: serverErrors,
        error: error,
        redirect: apsPaymentRequest && apsPaymentRequest.redirectUrl,
        redirectUrl: apsPaymentRequest && apsPaymentRequest.redirectUrl,
        message: apsPaymentRequest.message || '',
        status: apsPaymentRequest.status || '',
        apsResponse: apsPaymentRequest
    };
}

exports.Handle = Handle;
exports.Authorize = Authorize;
