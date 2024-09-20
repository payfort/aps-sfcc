'use strict';
/* globals request, empty */

var PaymentInstrument = require('dw/order/PaymentInstrument');
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');
var Resource = require('dw/web/Resource');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
var Money = require('dw/value/Money');

/**
 * Verifies that entered credit card information is a valid card for the PWA application. If the information is valid a
 * credit card payment instrument is created
 * @param {dw.order.Basket} basket Current user's basket
 * @param {Object} paymentInformation - the payment information
 * @param {string} paymentMethodID - paymentmethodID
 * @return {Object} returns an error object
 */
function HandlePWA(basket, paymentInformation, paymentMethodID) {
    var currentBasket = basket;
    var currentCustomer = currentBasket.getCustomer();
    var errorMessage = Resource.msg('error.technical', 'checkout', null);
    var result;
    var cardNumber = paymentInformation.cardNumber;
    var cardSecurityCode = paymentInformation.securityCode;
    var expirationMonth = paymentInformation.expirationMonth;
    var expirationYear = paymentInformation.expirationYear;
    var creditCardStatus;
    var cardHolder = paymentInformation.holder || (currentBasket.billingAddress ? currentBasket.billingAddress.fullName : '');

    var cardType = paymentInformation.cardType;
    var paymentCard = PaymentMgr.getPaymentCard(cardType);

    // Validate payment instrument
    if (paymentMethodID === PaymentInstrument.METHOD_CREDIT_CARD) {
        var creditCardPaymentMethod = PaymentMgr.getPaymentMethod(PaymentInstrument.METHOD_CREDIT_CARD);
        var paymentCardValue = PaymentMgr.getPaymentCard(cardType);

        var countryCode = request.getLocale().split('_')[1];
        var applicablePaymentCards = creditCardPaymentMethod.getApplicablePaymentCards(currentCustomer, countryCode, null);

        if (!applicablePaymentCards.contains(paymentCardValue)) {
            // Invalid Payment Instrument
            result = { error: true, errorMessage: errorMessage };
            return result;
        }
    }

    if (!paymentInformation.creditCardToken) {
        if (paymentCard) {
            creditCardStatus = paymentCard.verify(expirationMonth, expirationYear, cardNumber, cardSecurityCode);
        } else {
            result = { error: true, errorMessage: errorMessage };
            return result;
        }

        if (creditCardStatus.error) {
            result = { error: true, errorMessage: errorMessage };
            return result;
        }
    }

    COHelpers.removeNonGiftCertificatePaymentInstruments(currentBasket);
    var giftCardTotal = COHelpers.getGiftCardTotals(currentBasket);
    var amount = new Money((currentBasket.totalGrossPrice.value - giftCardTotal.value), currentBasket.currencyCode);
    Transaction.wrap(function () {
        var paymentInstrument = currentBasket.createPaymentInstrument(
            PaymentInstrument.METHOD_CREDIT_CARD, amount
        );

        paymentInstrument.setCreditCardHolder(cardHolder);
        paymentInstrument.setCreditCardNumber(cardNumber);
        paymentInstrument.setCreditCardType(cardType);
        paymentInstrument.setCreditCardExpirationMonth(expirationMonth);
        paymentInstrument.setCreditCardExpirationYear(expirationYear);

        if (!empty(paymentInformation.storedPaymentUUID)) {
            paymentInstrument.custom.apsPaymentData = JSON.stringify({ cvv: cardSecurityCode });
        }

        paymentInstrument.setCreditCardToken(paymentInformation.creditCardToken);
    });

    result = {
        error: false
    };

    return result;
}

exports.HandlePWA = HandlePWA;
