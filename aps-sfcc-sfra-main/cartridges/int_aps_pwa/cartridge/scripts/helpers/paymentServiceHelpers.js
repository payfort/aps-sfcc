'use strict';

/**
 * Calculate the amount still open to pay.
 * This accounts for all gift cards as well as other payment instruments.
 *
 * @param {dw.order.LineItemCtnr} lineItemContainer - the current line item container
 * @returns {dw.value.Money} Money object or undefined
 */
function getOpenOrderAmount(lineItemContainer) {
    var amountOpen = lineItemContainer.getTotalGrossPrice();
    var basketPaymentInstruments = lineItemContainer.getGiftCertificatePaymentInstruments();

    basketPaymentInstruments.toArray().forEach(function (paymentInstrument) {
        if (paymentInstrument.paymentTransaction) {
            var amount = paymentInstrument.paymentTransaction.amount;
            if (amount && amount.available && amount.value > 0) {
                amountOpen = amountOpen.subtract(amount);
            }
        }
    });
    return amountOpen;
}

/**
 * Gets current site language from the response object
 *
 * @param {SfraResponse} res - response object
 * @returns {string} - language
 */
function getLanguageFromResponse(res) {
    if (Object.hasOwnProperty.call(res.viewData, 'locale')) {
        return res.viewData.locale.split('_')[0].toLowerCase();
    }

    return '';
}

module.exports = {
    getOpenOrderAmount: getOpenOrderAmount,
    getLanguageFromResponse: getLanguageFromResponse
};
