'use strict';

var base = module.superModule || {};

var HookMgr = require('dw/system/HookMgr');
var OrderMgr = require('dw/order/OrderMgr');
var PaymentInstrument = require('dw/order/PaymentInstrument');
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');
var collections = require('*/cartridge/scripts/util/collections');
var constants = require('*/cartridge/scripts/util/constants');

/**
 * handles the payment authorization for each payment instrument
 * @param {dw.order.Order} order - the order object
 * @param {string} orderNumber - The order number for the order
 * @param {Boolean} isPWARequest - is request is from PWA app
 * @returns {Object} an error object
 */
function handlePayments(order, orderNumber, isPWARequest) {
    var result = {};

    if (order.totalNetPrice !== 0.00) {
        var paymentInstruments = order.paymentInstruments;

        if (paymentInstruments.length === 0) {
            Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
            result.error = true;
        }

        if (!result.error) {
            for (var i = 0; i < paymentInstruments.length; i++) {
                var paymentInstrument = paymentInstruments[i];
                var paymentProcessor = PaymentMgr
                    .getPaymentMethod(paymentInstrument.paymentMethod)
                    .paymentProcessor;
                var authorizationResult;
                if (paymentProcessor === null) {
                    Transaction.begin();
                    paymentInstrument.paymentTransaction.setTransactionID(orderNumber);
                    Transaction.commit();
                } else {
                    if (HookMgr.hasHook('app.payment.processor.' +
                            paymentProcessor.ID.toLowerCase())) {
                        authorizationResult = HookMgr.callHook(
                            'app.payment.processor.' + paymentProcessor.ID.toLowerCase(),
                            'Authorize',
                            orderNumber,
                            paymentInstrument,
                            paymentProcessor,
                            order,
                            isPWARequest
                        );
                    } else {
                        authorizationResult = HookMgr.callHook(
                            'app.payment.processor.default',
                            'Authorize'
                        );
                    }

                    if (authorizationResult.error) {
                        Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
                        result.error = true;
                        break;
                    }

                    // check if the result has the 3d url to be redirected
                    // if so include it in the result object
                    if (authorizationResult.redirect) {
                        result.redirect = true;
                        result.redirectUrl = authorizationResult.redirectUrl;
                        break;
                    }

                    if (authorizationResult.apsResponse && (authorizationResult.status === constants.PURCHASE_SUCCESS || authorizationResult.status === constants.AUTHORIZATION_SUCCESS)) {
                        result.apsResponse = authorizationResult.apsResponse;
                        break;
                    }
                }
            }
        }
    }

    return result;
}

/**
 * saves payment instruemnt to customers wallet
 * @param {Object} billingData - billing information entered by the user
 * @param {dw.order.Basket} currentBasket - The current basket
 * @param {dw.customer.Customer} customer - The current customer
 * @returns {dw.customer.CustomerPaymentInstrument} - Newly stored payment Instrument
 */
function savePaymentInstrumentToWallet(billingData, currentBasket, customer) {
    var wallet = customer.getProfile().getWallet();

    var storedPaymentInstrument = null;
    Transaction.wrap(function () {
        storedPaymentInstrument = wallet.createPaymentInstrument(
            PaymentInstrument.METHOD_CREDIT_CARD
        );

        storedPaymentInstrument.setCreditCardHolder(billingData.paymentInformation.cardOwner.value);
        storedPaymentInstrument.setCreditCardNumber(
            billingData.paymentInformation.cardNumber.value
        );
        storedPaymentInstrument.setCreditCardType(billingData.paymentInformation.cardType.value);
        storedPaymentInstrument.setCreditCardExpirationMonth(
            billingData.paymentInformation.expirationMonth.value
        );
        storedPaymentInstrument.setCreditCardExpirationYear(
            billingData.paymentInformation.expirationYear.value
        );

        // A token has already been created in Handle hook
        storedPaymentInstrument.setCreditCardToken(billingData.paymentInformation.creditCardToken);
    });

    return storedPaymentInstrument;
}

/**
 * Deletes all non-gift certificate payment instruments from the current basket
 * @param {dw.order.Basket} basket - The current basket object
 */
function removeNonGiftCertificatePaymentInstruments(basket) {
    var paymentInstruments = basket.getPaymentInstruments();

    // remove all non-gift certficate payment instruments
    Transaction.wrap(function () {
        collections.forEach(
            paymentInstruments,
            function (basketPaymentInstrument) {
                if (basketPaymentInstrument && basketPaymentInstrument.paymentMethod !== PaymentInstrument.METHOD_GIFT_CERTIFICATE) {
                    basket.removePaymentInstrument(basketPaymentInstrument);
                }
            }
        );
    });
}

/**
 * returns the object that is filled with gift card/certificate values
 * @param {dw.order.Basket} lineItemContainer - current user basket.
 * @returns {Object} the object that keep gitCardCertificate attributes
 */
function getGiftCardTotals(lineItemContainer) {
    var Money = require('dw/value/Money');
    var giftCardTotal = new Money(0, lineItemContainer.currencyCode);
    collections.forEach(lineItemContainer.getGiftCertificatePaymentInstruments(), function (giftCertificatePaymentInstrument) {
        var giftCertificatePaymentInstrumentTransaction = giftCertificatePaymentInstrument.getPaymentTransaction();
        if (giftCertificatePaymentInstrumentTransaction) {
            var giftCertificatePaymentInstrumentAmount = giftCertificatePaymentInstrumentTransaction.getAmount();
            giftCardTotal = giftCardTotal.add(giftCertificatePaymentInstrumentAmount);
        }
    });

    return giftCardTotal;
}

base.savePaymentInstrumentToWallet = savePaymentInstrumentToWallet;
base.handlePayments = handlePayments;
base.removeNonGiftCertificatePaymentInstruments = removeNonGiftCertificatePaymentInstruments;
base.getGiftCardTotals = getGiftCardTotals;
module.exports = base;
