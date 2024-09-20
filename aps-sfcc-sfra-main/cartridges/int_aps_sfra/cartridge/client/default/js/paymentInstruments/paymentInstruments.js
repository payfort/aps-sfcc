'use strict';

var base = require('base/paymentInstruments/paymentInstruments');
var cleave = require('../components/cleave');

base.handleCreditCardNumber = function () {
    if ($('#cardNumber').length && $('#cardType').length) {
        cleave.handleCreditCardNumber('#cardNumber', '#cardType');
    }
};

module.exports = base;
