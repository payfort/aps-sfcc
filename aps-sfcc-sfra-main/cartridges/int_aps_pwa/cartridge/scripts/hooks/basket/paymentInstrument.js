var Transaction = require('dw/system/Transaction');
var PaymentInstrument = require('dw/order/PaymentInstrument');
var PaymentMgr = require('dw/order/PaymentMgr');

/**
 * remove all payments instruments except the Gift certificate ones
 *
 * @param {dw.order.Basket} basket the basket Object
 * @param {dw.order.PaymentInstrument} paymentInstrument the order payment instrument
 */
exports.beforePOST = function (basket, paymentInstrument) {
    var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');

    // remove all non gift certficate payment instruments
    COHelpers.removeNonGiftCertificatePaymentInstruments(basket);
};

/**
 * Handle adding credit card payment instrument
 *
 * @param {dw.order.Basket} basket the basket Object
 * @param {dw.order.PaymentInstrument} paymentInstrument the order payment instrument
 * @returns {dw.system.Status}
 */
function handleCreditCardPaymentInstrument(basket, paymentInstrument) {
    var HookMgr = require('dw/system/HookMgr');
    var Resource = require('dw/web/Resource');
    var Status = require('dw/system/Status');

    var collections = require('*/cartridge/scripts/util/collections');
    var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
    var apsHelpersPWA = require('*/cartridge/scripts/helpers/apsHelpersPWA');

    var processor = PaymentMgr.getPaymentMethod(paymentInstrument.paymentMethodId).getPaymentProcessor();

    var result = {};
    if (processor) {
        if (HookMgr.hasHook('app.payment.processor.' + processor.ID.toLowerCase())) {
            var paymentInformation;
            var customerPaymentInstrumentId = Object.hasOwnProperty.call(paymentInstrument, 'customerPaymentInstrumentId') ? paymentInstrument.customerPaymentInstrumentId : null;
            var saveCard = Object.hasOwnProperty.call(paymentInstrument, 'c_saveCard') ? paymentInstrument.c_saveCard : false;
            var cardNumber = Object.hasOwnProperty.call(paymentInstrument, 'c_cardNumber') && !empty(paymentInstrument.c_cardNumber) ? paymentInstrument.c_cardNumber : paymentInstrument.paymentCard.number;

            var currentCustomer = basket.getCustomer();
            var isCustomerAuthenticated = currentCustomer.isAuthenticated() && currentCustomer.isRegistered();

            var customerPaymentInstrument;
            if (isCustomerAuthenticated && !saveCard) {
                var savedInstruments = currentCustomer.getProfile().getWallet().getPaymentInstruments('CREDIT_CARD');

                customerPaymentInstrument = collections.find(
                    savedInstruments,
                    function (item) {
                        return item.UUID === customerPaymentInstrumentId;
                    }
                );
            }

            if (customerPaymentInstrument) {
                paymentInformation = {
                    cardType: customerPaymentInstrument.creditCardType,
                    holder: customerPaymentInstrument.creditCardHolder,
                    number: customerPaymentInstrument.creditCardNumber,
                    expirationMonth: customerPaymentInstrument.creditCardExpirationMonth,
                    expirationYear: customerPaymentInstrument.creditCardExpirationYear,
                    creditCardToken: customerPaymentInstrument.creditCardToken,
                    securityCode: paymentInstrument.paymentCard.securityCode,
                    storedPaymentUUID: customerPaymentInstrumentId,
                    saveCard: true
                };
            } else {
                paymentInformation = Object.assign(
                    {},
                    paymentInstrument.paymentCard,
                    {
                        cardNumber: cardNumber,
                        saveCard: saveCard
                    }
                );
            }

            result = HookMgr.callHook(
                'app.payment.processor.' + processor.ID.toLowerCase() + '_pwa',
                'HandlePWA',
                basket,
                paymentInformation,
                paymentInstrument.paymentMethodId
            );

            if (!result) {
                result = {error: true};
            }

            if (!result.error && isCustomerAuthenticated && customerPaymentInstrument && !customerPaymentInstrument.creditCardToken) {
                // Payment instrument was created on the account page,
                // so the card token and bin should be added
                var updateCardResult = COHelpers.updateSavedPaymentInstrument(customerPaymentInstrumentId, result, currentCustomer);

                if (!updateCardResult) {
                    result.error = true;
                }
            }

            if (!result.error && isCustomerAuthenticated && saveCard) {
                // A credit card token has already been created in HandlePWA hook
                var shouldCreateToken = false;
                var saveCardResult = apsHelpersPWA.savePaymentInstrumentToWalletPWA(paymentInformation, basket, currentCustomer, shouldCreateToken);

                if (!saveCardResult) {
                    result.error = true;
                }
            }
        } else {
            result = HookMgr.callHook('app.payment.processor.default', 'Handle');
        }
    }

    if (!processor || result.error) {
        var errorMessage = result.errorMessage || Resource.msg('error.technical', 'checkout', null);
        return new Status(Status.ERROR, 'ERROR', errorMessage);
    }

    return new Status(Status.OK);
}

/**
 * Sets the payment transaction amount to the Checkout.com payment instrument
 *
 * @param {dw.order.Basket} basket the basket Object
 * @param {dw.order.PaymentInstrument} paymentInstrument the order payment instrument
 * @returns {dw.system.Status|void}
 */
exports.afterPOST = function (basket, paymentInstrument) {
    var processor = PaymentMgr.getPaymentMethod(paymentInstrument.paymentMethodId).getPaymentProcessor();
    var apsHelpersPWA = require('*/cartridge/scripts/helpers/apsHelpersPWA');

    if (PaymentInstrument.METHOD_CREDIT_CARD.equals(paymentInstrument.paymentMethodId) && apsHelpersPWA.isAPSItem(processor.ID)) {
        return handleCreditCardPaymentInstrument(basket, paymentInstrument);
    }

    if (apsHelpersPWA.isAPSItem(paymentInstrument.paymentMethodId) || paymentInstrument.paymentMethodId === apsHelpersPWA.getDWApplePayPaymentMethodId()) {
        var paymentServiceHelpers = require('*/cartridge/scripts/helpers/paymentServiceHelpers');

        var openOrderAmount = paymentServiceHelpers.getOpenOrderAmount(basket);
        var apsPaymentInstrument = apsHelpersPWA.getAPSPaymentInstrument(basket);

        Transaction.wrap(function () {
            apsPaymentInstrument.getPaymentTransaction().setAmount(openOrderAmount);
        });
    }
};
