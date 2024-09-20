'use strict';

var base = require('base/checkout/billing');
var cleave = require('../components/cleave');

base.handleCreditCardNumber = function () {
    cleave.handleCreditCardNumber('.cardNumber', '#cardType');
};

base.methods.updatePaymentInformation = function updatePaymentInformation(order) {
    // update payment details
    var $paymentSummary = $('.payment-details');
    var htmlToAppend = '';

    if (order.billing.payment
        && order.billing.payment.selectedPaymentInstruments
        && order.billing.payment.selectedPaymentInstruments.length > 0) {
        for (var i = 0; i < order.billing.payment.selectedPaymentInstruments.length; i++) {
            var instrument = order.billing.payment.selectedPaymentInstruments[i];
            switch (instrument.paymentMethod) {
                case 'CREDIT_CARD':
                    htmlToAppend += '<span>' + order.resources.cardType + ' '
                    + instrument.type
                    + '</span><div>'
                    + instrument.maskedCreditCardNumber
                    + '</div><div><span>'
                    + order.resources.cardEnding + ' '
                    + instrument.expirationMonth
                    + '/' + instrument.expirationYear
                    + '</span></div>';
                    break;
                case 'APS_HOSTED':
                    htmlToAppend += '<div><span>Amazon Payment Services</span></div>';
                    break;
                default:
                    htmlToAppend += '<div><span>' + instrument.paymentMethod + '</span></div>';
                    break;
            }
        }
    }

    $paymentSummary.empty().append(htmlToAppend);
};

module.exports = base;
