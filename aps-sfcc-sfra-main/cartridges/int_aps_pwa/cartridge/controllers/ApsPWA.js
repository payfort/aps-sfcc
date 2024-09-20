'use strict';
/* globals session, request */

var server = require('server');

var Logger = require('dw/system/Logger');
var OrderMgr = require('dw/order/OrderMgr');
var apsHelper = require('*/cartridge/scripts/helpers/apsHelper');
var paymentHelpersPWA = require('*/cartridge/scripts/helpers/paymentHelpersPWA');

server.post('HandleReturn', function (req, res, next) {
    var paymentInformation = request.getHttpParameterMap();
    var responseIsSafe = apsHelper.checkResponseSignature(paymentInformation);
    paymentHelpersPWA.getFailurePageRedirect(res);

    if (!responseIsSafe || !paymentInformation.status) {
        return;
    }

    var orderPaymentStatus = paymentInformation.status.stringValue;

    try {
        var orderNo = paymentInformation.merchant_reference.stringValue;
        var order = OrderMgr.getOrder(orderNo);
        if (order) {
            if (apsHelper.isOrderCompleteStatus(orderPaymentStatus)) {
                paymentHelpersPWA.getConfirmationPageRedirect(res, order);
            }

            apsHelper.updateOrderPaymentStatus(order, paymentInformation);
        }
    } catch (error) {
        Logger.error('Error in Order retrieve on Payment Redirect! Error: {0}', error.message);
    }

    return next();
});

module.exports = server.exports();
