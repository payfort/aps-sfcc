'use strict';
/* globals session, request, response */

var server = require('server');

var Site = require('dw/system/Site');
var BasketMgr = require('dw/order/BasketMgr');
var Logger = require('dw/system/Logger');
var URLUtils = require('dw/web/URLUtils');
var OrderMgr = require('dw/order/OrderMgr');
var apsHelper = require('*/cartridge/scripts/helpers/apsHelper');
var hostedHelper = require('*/cartridge/scripts/helpers/hostedHelper');

server.get('Redirect', server.middleware.https, function (req, res, next) {
    var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');

    var currentBasket = BasketMgr.getCurrentBasket();
    if (!currentBasket) {
        res.json({
            redirectUrl: URLUtils.url('Cart-Show').toString()
        });
        return next();
    }

    var order = COHelpers.createOrder(currentBasket);
    if (!order) {
        res.json({
            redirectUrl: URLUtils.url('Cart-Show').toString()
        });
        return next();
    }

    var viewData = {
        orderID: order.getOrderNo(),
        orderToken: order.getOrderToken(),
        hostedFormURL: Site.current.getCustomPreferenceValue('apsMerchantURL').value,
        hostedData: hostedHelper.getHostedRequestData(order.getOrderNo())
    }

    // Store the orderNo in session storage to enable
    // recreation of the basket in case of an order failure
    session.privacy.orderNo = order.orderNo;

    res.render('checkout/apsHostedForm', viewData);
    next();
});

server.post('HandleReturn', function (req, res, next) {
    var paymentInformation = request.getHttpParameterMap();
    var responseIsSafe = apsHelper.checkResponseSignature(paymentInformation);

    if (!responseIsSafe || !paymentInformation.status) {
        return;
    }

    var orderPaymentStatus = paymentInformation.status.stringValue;

    try {
        var orderNo = paymentInformation.merchant_reference.stringValue;
        var order = OrderMgr.getOrder(orderNo);
        if (order) {
            var redirectUrl = URLUtils.https('Cart-Show').toString();
            if (apsHelper.isOrderCompleteStatus(orderPaymentStatus)) {
                redirectUrl = URLUtils.https('Order-Confirm', 'ID', order.getOrderNo(), 'token', order.getOrderToken()).toString();
            }

            apsHelper.updateOrderPaymentStatus(order, paymentInformation);
        }
    } catch (error) {
        Logger.error('Error in Order retrieve on Payment Redirect! Error: {0}', error.message);
    }

    return response.redirect(redirectUrl);
});

server.post('HandleNotification', function (req, res, next) {
    res.setStatusCode(500);
    res.json({
        success: false
    });

    try {
        var httpParams = request.getHttpParameterMap();
        if (httpParams.requestBodyAsString) {
            var paymentInformation = JSON.parse(httpParams.requestBodyAsString);
            var responseIsSafe = apsHelper.checkResponseSignature(paymentInformation);

            if (!responseIsSafe || !paymentInformation.status) {
                Logger.error('Response is not safe or response does not contain status');
                return next();
            }

            var order = OrderMgr.getOrder(paymentInformation.merchant_reference);

            if (order) {
                var updateStatus = apsHelper.validateDirectPaymentOrder(order, paymentInformation);
                if (updateStatus.status !== 500) {
                    res.setStatusCode(updateStatus.status);
                    res.json({
                        success: true
                    });
                } else {
                    Logger.error('Error while updating orderNo {0}, {1}', order.orderNo, updateStatus.errorMessage);
                }
            }
        }
    } catch (e) {
        Logger.error('Error in order notification from APS!, Error: {0}', e.message);
    }

    return next();
});

module.exports = server.exports();
