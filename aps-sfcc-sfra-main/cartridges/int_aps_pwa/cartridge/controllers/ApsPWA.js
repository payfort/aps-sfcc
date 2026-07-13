'use strict';
/* globals session, request */

var server = require('server');

var BasketMgr = require('dw/order/BasketMgr');
var Logger = require('dw/system/Logger');
var OrderMgr = require('dw/order/OrderMgr');
var apsHelper = require('*/cartridge/scripts/helpers/apsHelper');
var paymentHelpersPWA = require('*/cartridge/scripts/helpers/paymentHelpersPWA');

/**
 * Issue a server-signed set of APS tokenization parameters to the PWA client.
 *
 * The APS SHA request phrase must never be shipped to the browser (it is a
 * merchant-account secret that authenticates every APS command, including
 * refund/capture/void). This endpoint keeps the phrase server-side, signs the
 * tokenization request payload using the phrase configured in Business Manager,
 * and returns only the identifiers plus the resulting signature to the client.
 *
 * The route is gated on the presence of an active shopper basket so that
 * anonymous scraping of signed parameter bags is not possible from an
 * unrelated context.
 */
server.get('GetTokenParams', server.middleware.https, function (req, res, next) {
    var currentBasket = BasketMgr.getCurrentBasket();
    if (!currentBasket) {
        res.setStatusCode(400);
        res.json({ error: true, message: 'No active basket.' });
        return next();
    }

    try {
        var tokenData = apsHelper.getTokenData();

        // getTokenData already includes the signature computed from the
        // server-side SHA request phrase and adds `call_url` from the
        // apsMerchantURL custom preference. Only publish the fields the client
        // needs to POST to APS -- do not leak any other preference values.
        res.json({
            service_command: tokenData.service_command,
            access_code: tokenData.access_code,
            merchant_identifier: tokenData.merchant_identifier,
            merchant_reference: tokenData.merchant_reference,
            language: tokenData.language,
            return_url: tokenData.return_url,
            signature: tokenData.signature,
            call_url: tokenData.call_url
        });
    } catch (e) {
        Logger.error('Failed to build APS token params for PWA: {0}', e.message);
        res.setStatusCode(500);
        res.json({ error: true });
    }

    return next();
});

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
