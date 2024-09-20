var PaymentInstrument = require('dw/order/PaymentInstrument');
var CurrentSite = require('dw/system/Site').getCurrent();
var constants = require('*/cartridge/scripts/util/constants');
var Transaction = require('dw/system/Transaction');

/**
 * Get APS's enablement status
 * @returns {boolean} - true if aps enabled, false otherwise
*/
function isAPSEnabled() {
    return !!CurrentSite.getCustomPreferenceValue('apsEnabled');
}

/**
 * Get APS's Hosted enablement status
 * @returns {boolean} - true if aps hosted enabled, false otherwise
*/
function isAPSHostedEnabled() {
    return !!CurrentSite.getCustomPreferenceValue('apsHostedEnabled');
}

/**
 * Get APS's Apple Pay enablement status
 * @returns {boolean} - true if aps apple pay enabled, false otherwise
*/
function isAPSApplePayEnabled() {
    return !!CurrentSite.getCustomPreferenceValue('apsApplePayEnabled');
}

/**
 * Get APS's hosted payment method ID
 * @returns {string} - aps's hosted payment method ID
*/
function getAPSHostedPaymentMethodId() {
    return constants.APS_HOSTED_PAYMENT_INSTRUMENT;
}

/**
 * Get APS's credit card payment method ID
 * @returns {string} - aps's credit card payment method ID
*/
function getAPSCreditCardPaymentMethodId() {
    return constants.APS_CARD_PAYMENT_INSTRUMENT;
}

/**
 * Get APS's apple pay payment method ID
 * @returns {string} - aps's apple pay payment method ID
*/
function getAPSApplePayPaymentMethodId() {
    return constants.APS_APPLE_PAY_PAYMENT_INSTRUMENT;
}

/**
 * Get APS's apple pay payment method ID
 * @returns {string} - aps's apple pay payment method ID
*/
function getDWApplePayPaymentMethodId() {
    return constants.DW_APPLE_PAY_PAYMENT_INSTRUMENT;
}

/**
 * Returns aps payment instrument from line item container
 * @param {dw.order.LineItemCtnr} lineItemCtnr - line item container
 * @returns {dw.order.PaymentInstrument|null} - aps payment instrument
 */
function getAPSPaymentInstrument(lineItemCtnr) {
    var paymentInstruments = lineItemCtnr.getPaymentInstruments();
    var iterator = paymentInstruments.iterator();
    var paymentInstrument;

    while (iterator.hasNext()) {
        paymentInstrument = iterator.next();
        if (paymentInstrument.getPaymentMethod() === constants.APS_HOSTED_PAYMENT_INSTRUMENT
            || paymentInstrument.getPaymentMethod() === constants.APS_CARD_PAYMENT_INSTRUMENT
            || paymentInstrument.getPaymentMethod() === constants.APS_APPLE_PAY_PAYMENT_INSTRUMENT
            || PaymentInstrument.METHOD_CREDIT_CARD.equals(paymentInstrument.getPaymentMethod())
            || PaymentInstrument.METHOD_DW_APPLE_PAY.equals(paymentInstrument.getPaymentMethod())) {
            return paymentInstrument;
        }
    }

    return null;
};

/**
 * Saves payment instrument to customers wallet
 * 
 * @param {Object} billingData - billing information entered by the user
 * @param {dw.order.Basket} currentBasket - The current basket
 * @param {dw.customer.Customer} customer - The current customer
 * @param {boolean} shouldCreateToken - Indicates whether to generate a new token for the saved card
 * @returns {dw.customer.CustomerPaymentInstrument} - Newly added stored payment instrument
 */
function savePaymentInstrumentToWalletPWA(billingData, currentBasket, customer, shouldCreateToken) {
    var wallet = customer.getProfile().getWallet();
    var storedPaymentInstrument;

    Transaction.wrap(function() {
        storedPaymentInstrument = wallet.createPaymentInstrument(PaymentInstrument.METHOD_CREDIT_CARD);
        var holder = billingData.holder || (currentBasket.billingAddress ? currentBasket.billingAddress.fullName : '');

        storedPaymentInstrument.setCreditCardHolder(holder);
        storedPaymentInstrument.setCreditCardNumber(billingData.cardNumber);
        storedPaymentInstrument.setCreditCardType(billingData.cardType);
        storedPaymentInstrument.setCreditCardExpirationMonth(billingData.expirationMonth);
        storedPaymentInstrument.setCreditCardExpirationYear(billingData.expirationYear);

        storedPaymentInstrument.setCreditCardToken(billingData.creditCardToken);
    });

    return storedPaymentInstrument;
}

/**
 * Checks if a payment instrument is APS.
 * @param {Object} item The payment instrument instance
 * @returns {boolean} If the instance matches conditions
 */
function isAPSItem(item) {
    return item.length > 0 && item.indexOf('APS_') >= 0;
}

/**
 * Modifies the payment methods for basket response for OCAPI, so that we can show only active APS payment methods
 *
 * @param {dw.order.Basket} basket the basket object
 * @param {Object} paymentMethodsResult applicable payment methods OCAPI result
 * @returns {void}
 */
function getApplicableAPSPaymentMethods(basket, paymentMethodsResult) {
    if (isAPSEnabled() && Object.hasOwnProperty.call(paymentMethodsResult, "applicablePaymentMethods")) {
        var applicablePaymentMethods = paymentMethodsResult.applicablePaymentMethods.toArray().filter(function (applicablePaymentMethod) {
            return (
                (applicablePaymentMethod.id !== getAPSHostedPaymentMethodId() || isAPSHostedEnabled()) &&
                (applicablePaymentMethod.id !== getAPSApplePayPaymentMethodId() || isAPSApplePayEnabled()) &&
                (applicablePaymentMethod.id !== getDWApplePayPaymentMethodId() || isAPSApplePayEnabled()) &&
                (applicablePaymentMethod.id !== getAPSCreditCardPaymentMethodId() || isAPSEnabled())
            );
        });

        paymentMethodsResult.applicablePaymentMethods = applicablePaymentMethods;
        // eslint-disable-line no-param-reassign
    }
}

/**
 * Adds the APS payment redirect URL to the order creation hook
 *
 * @param {dw.order.Order} order SFCC order object
 * @param {Object} orderResponse OCAPI order creation response
 */
function getAPSRedirectUrl(order, orderResponse) {
    var apsPaymentInstrument = getAPSPaymentInstrument(order);

    if (apsPaymentInstrument && Object.hasOwnProperty.call(apsPaymentInstrument.custom, 'paymentRedirectUrl') && apsPaymentInstrument.custom.paymentRedirectUrl) {
        orderResponse.c_paymentRedirectUrl = apsPaymentInstrument.custom.paymentRedirectUrl; // eslint-disable-line no-param-reassign
    }
}

/**
 * Gets the payment success URL for the PWA application
 *
 * @returns {string} the payment success URL
 */
function getSuccessUrlPWA() {
    return CurrentSite.getCustomPreferenceValue('apsSuccessURLPWA');
}

/**
 * Gets the payment failure URL for the PWA application
 *
 * @returns {string} the payment failure URL
 */
function getFailureUrlPWA() {
    return CurrentSite.getCustomPreferenceValue('apsFailureURLPWA');
}

module.exports = {
    getApplicableAPSPaymentMethods: getApplicableAPSPaymentMethods,
    getAPSPaymentInstrument: getAPSPaymentInstrument,
    isAPSItem: isAPSItem,
    getDWApplePayPaymentMethodId: getDWApplePayPaymentMethodId,
    savePaymentInstrumentToWalletPWA: savePaymentInstrumentToWalletPWA,
    getAPSRedirectUrl: getAPSRedirectUrl,
    getSuccessUrlPWA: getSuccessUrlPWA,
    getFailureUrlPWA: getFailureUrlPWA
};
