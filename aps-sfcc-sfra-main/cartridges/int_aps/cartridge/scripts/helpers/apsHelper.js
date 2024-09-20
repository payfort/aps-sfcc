var Site = require('dw/system/Site');
var MessageDigest = require('dw/crypto/MessageDigest');
var OrderMgr = require('dw/order/OrderMgr');
var PaymentMgr = require('dw/order/PaymentMgr');
var PaymentInstrument = require('dw/order/PaymentInstrument');
var Transaction = require('dw/system/Transaction');
var constants = require('*/cartridge/scripts/util/constants');
var URLUtils = require('dw/web/URLUtils');
var System = require('dw/system/System');
var Logger = require('dw/system/Logger');

/**
 * Creates a token. This should be replaced by utilizing a tokenization provider
 * @param {Object} paymentData The data of the payment
 * @returns {string} a token
 */
function getTokenData() {
    // Build the request data
    var UUIDUtils = require('dw/util/UUIDUtils');
    var orderPaymentNo = 'T-' + UUIDUtils.createUUID().toString();

    var tokenRequestData = {
        service_command: constants.APS_TOKENIZATION,
        access_code: Site.current.getCustomPreferenceValue('apsAccessCode'),
        merchant_identifier: Site.current.getCustomPreferenceValue('apsMerchantIdentifier'),
        merchant_reference: orderPaymentNo,
        language: request.locale.substr(0, 2),
        return_url: URLUtils.https('APS-HandleReturn').toString()
    };

    tokenRequestData.signature = getSignature(tokenRequestData, false, false);

    var serviceUrl = Site.current.getCustomPreferenceValue('apsMerchantURL').value

    tokenRequestData.call_url = serviceUrl;

    return tokenRequestData;
}

/**
 * Get signature by set of parameters
 *
 * @param {Object} signatureParams - order number as a merchant reference
 * @param {boolean} isResponse - if set - response pass phrase is used
 * @param {boolean} isApplePay - if it is true - Apple pay
 * @return {string} derivedSignature
 */
function getSignature(signatureParams, isResponse, isApplePay) {
    var shaType = isApplePay ? Site.current.getCustomPreferenceValue('apsApplePaySHAType') : Site.current.getCustomPreferenceValue('apsSHAType');
    var responsePhrase = isApplePay ? Site.current.getCustomPreferenceValue('apsApplePaySHAResponsePhrase') : Site.current.getCustomPreferenceValue('apsSHAResponsePhrase');
    var requestPhrase = isApplePay ? Site.current.getCustomPreferenceValue('apsApplePaySHARequestPhrase') : Site.current.getCustomPreferenceValue('apsSHARequestPhrase');
    var signature = new MessageDigest(shaType);
    var Bytes = require('dw/util/Bytes');
    var Encoding = require('dw/crypto/Encoding');

    var passPhrase;
    if (isResponse) {
        passPhrase = responsePhrase;
    } else {
        passPhrase = requestPhrase;
    }

    var signatureSequence = [];

    Object.keys(signatureParams).forEach(function (paramKey) {
        var value = signatureParams[paramKey];
        try {
            var keys = Object.keys(value)
            if(typeof value === 'object' && keys && keys.length > 0) {
                var nestedValue = [];
                keys.forEach(function (key) {
                    nestedValue.push(key + '=' + value[key]);
                });
                nestedValue = '{' + nestedValue.join(', ') + '}';
                value = nestedValue;
            }
        } catch (error) {
            // do nothing
        }
        signatureSequence.push(paramKey + '=' + value);
    });

    signatureSequence.sort();
    signatureSequence.push(passPhrase);
    signatureSequence.unshift(passPhrase);
    var finalPrase = signatureSequence.join('');

    var derivedSignature = Encoding.toHex(
        signature.digestBytes(new Bytes(finalPrase, 'UTF-8'))
    );

    return derivedSignature;
}

/**
 * Check if responce signature corresponds to the expected one
 *
 * @param {Object} params request params
 * @returns {boolean} true - signatures equally compare, false - not equal!
 */
function checkResponseSignature(params) {
    if (!params) {
        return false;
    }
    var responseSignature;
    var paramObj = {};

    var objectParams = params.parameterNames || Object.keys(params);

    for each (var param in objectParams) {
        var paramValue;
        if (Object.prototype.hasOwnProperty.call(params, 'get')) {
            paramValue = params.get(param).stringValue;
        } else {
            paramValue = params[param];
        }
        if (param !== 'signature') {
            paramObj[param] = paramValue;
        } else {
            responseSignature = paramValue;
        }
    }
    var calculatedSignature = getSignature(paramObj, true);
    var isResponseSafe = calculatedSignature === responseSignature

    return isResponseSafe;
}

/**
 * Calculates the amount value that is send to payfort
 * Before sending the amount value of any transaction,
 * it is needed to multiply the value with the currency decimal code according to ISO code 3.
 * For example: If the amount value was 500 AED; according to ISO code 3,
 * the value should be multiplied with 100 (2 decimal points); so it will be sent in the request as 50000.
 * Another example: If the amount value was 100 JOD; according to ISO code 3,
 * the value should be multiplied with 1000 (3 decimal points); so it will be sent in the request as 100000.
 * @param {dw.value.Money} amount - the amount of the transaction
 * @returns {string} returns the new amount as payfort requested
 */
function calculateAmount(amount) {
    var Currency = require('dw/util/Currency');
    var currency = Currency.getCurrency(amount.currencyCode);

    return Math.round(amount.multiply(Math.pow(10, currency.defaultFractionDigits)).value).toFixed();
}

/**
 * Build aps request data.
 * @param {String} orderNumber The order number
 * @param {String} amountToBePaid The Order Amount
 * @param {boolean} isApplePay  True if is apple pay
 * @param {boolean} addMeta True if meta data should be added
 * @returns {Object} The payment request data
 */
function getRequestData(orderNumber, amountToBePaid, isApplePay, addMeta) {
    var order = OrderMgr.getOrder(orderNumber);
    var accessCode = isApplePay ? Site.current.getCustomPreferenceValue('apsApplePayAccessCode') : Site.current.getCustomPreferenceValue('apsAccessCode');
    var paymentData = {
        command: Site.current.getCustomPreferenceValue('apsPaymentMode').value,
        access_code: accessCode,
        merchant_identifier: Site.current.getCustomPreferenceValue('apsMerchantIdentifier'),
        merchant_reference: order.orderNo,
        amount: calculateAmount(amountToBePaid),
        currency: order.getCurrencyCode(),
        language: request.locale.substr(0, 2),
        customer_email: order.getCustomerEmail(),
    };

    if (addMeta) {
        paymentData.app_programming = "SF B2C Commerce JavaScript"
        paymentData.app_framework = "SFCC B2C"
        paymentData.app_ver = (System.compatibilityMode / 100).toString()
        paymentData.app_plugin = "APS_SFDC_B2C"
        paymentData.app_plugin_version = "v1.0.0"
    }

    return paymentData;
}

/**
 * Confirm is a payment is valid from API response code.
 * @param {Object} gatewayResponse The gateway response
 * @returns {Object} The payment success or failure
 */
function paymentSuccess(gatewayResponse) {
    var orderStatus = {
        status: '',
        isOrderCompleteStatus: false
    }
    if (gatewayResponse && Object.prototype.hasOwnProperty.call(gatewayResponse, 'status')) {
        orderStatus.isOrderCompleteStatus = isOrderCompleteStatus(gatewayResponse.status);
        orderStatus.status = gatewayResponse.status;
    }

    return orderStatus;
}

/**
 * Format APS date.
 * @param {String} year expiration year
 * @param {String} month expiration month
 * @returns {Object} The payment success or failure
 */
function formatDate(year, month) {
    var formatMonth = parseInt(month, 10) < 10 ? '0' + month : month.toString();
    var expireDate = year.toString().slice(2, 4) + formatMonth;

    return expireDate;
}

/**
 * Removes orderNo from session.
 */
function resetOrderNo() {
    delete session.privacy.orderNo; // eslint-disable-line
};

/**
 * Removes Card security code from session.
 */
function resetCardSecurityCode() {
    delete session.privacy.cardSecurityCode; // eslint-disable-line
};

/**
 * Returns aps payment instrument from line item container
 * @param {dw.order.LineItemCtnr} lineItemCtnr - line item container
 * @returns {dw.order.PaymentInstrument|null} - aps payment instrument
 */
var getAPSPaymentInstrument = function (lineItemCtnr) {
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
 * Update order payment status on a web hook
 *
 * @param {dw.order.Order} order current order
 * @param {Object} paymentInformation payment information
 */
function updateOrderPaymentStatus(order, paymentInformation) {
    var Order = require('dw/order/Order');
    var paymentInstrument = getAPSPaymentInstrument(order);
    var orderPaymentStatus = paymentInformation.status.stringValue;
    var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.paymentMethod).paymentProcessor;

    if (order && (order.getPaymentStatus() == Order.PAYMENT_STATUS_NOTPAID) && (order.getStatus().value != Order.ORDER_STATUS_FAILED)) {
        if (orderPaymentStatus === constants.PURCHASE_SUCCESS) {
            var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
            COHelpers.placeOrder(order, orderPaymentStatus);

            Transaction.wrap(function () {
                paymentInstrument.paymentTransaction.setTransactionID(paymentInformation.fort_id.stringValue);
                paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
                order.setPaymentStatus(Order.PAYMENT_STATUS_PAID);
            });
        } else if (orderPaymentStatus !== constants.ON_HOLD
                    && orderPaymentStatus !== constants.TRANSACTION_PENDING
                    && orderPaymentStatus !== constants.UNCERTAIN_TRANSACTION
                    && orderPaymentStatus !== constants.AUTHORIZATION_SUCCESS
                    && orderPaymentStatus !== constants.CAPTURE_SUCCESS) {
            Transaction.wrap(function () {
                OrderMgr.failOrder(order, true);
            });
        }
    }
    resetOrderNo();
    resetCardSecurityCode();
}

/**
 * Validate direct payments via webhook notification call
 *
 * @param {dw.order.Order} order current order
 * @param {Object} paymentInformation payment information
 */
function validateDirectPaymentOrder(order, paymentInformation) {
    var Order = require('dw/order/Order');
    var paymentInstrument = getAPSPaymentInstrument(order);
    var orderPaymentStatus = paymentInformation.status;
    var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.paymentMethod).paymentProcessor;
    var status = 204
    var errorMessage = null

    if (order && (order.getStatus().value != Order.ORDER_STATUS_FAILED)) {
        if (orderPaymentStatus == constants.PURCHASE_SUCCESS) {

            if (order.getPaymentStatus() == Order.PAYMENT_STATUS_NOTPAID) {
                try {
                    Transaction.wrap(function () {
                        paymentInstrument.paymentTransaction.setTransactionID(paymentInformation.fort_id);
                        paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
                        order.setPaymentStatus(Order.PAYMENT_STATUS_PAID);
                        order.addNote('aps_capture_success', JSON.stringify(paymentInformation))
                    });
                } catch (e) {
                    Logger.error('Was unable to update payment status for orderNo {0}', order.orderNo)
                    status = 500
                    errorMessage = e.message
                }
            } else {
                try {
                    Transaction.wrap(function () {
                        order.addNote('aps_capture_success', JSON.stringify(paymentInformation))
                    });
                } catch (e) {
                    Logger.error('Was unable to add order notes for orderNo {0}', order.orderNo)
                    status = 500
                    errorMessage = e.message
                }
            }
        } else if (orderPaymentStatus !== constants.ON_HOLD
                    && orderPaymentStatus !== constants.TRANSACTION_PENDING
                    && orderPaymentStatus !== constants.UNCERTAIN_TRANSACTION
                    && orderPaymentStatus !== constants.AUTHORIZATION_SUCCESS
                    && orderPaymentStatus !== constants.CAPTURE_SUCCESS) {
            Transaction.wrap(function () {
                OrderMgr.failOrder(order, true);
            });
        }
    }
    
    return {
        status: status,
        errorMessage: errorMessage
    }
}

/**
 * Update order payment status on a web hook
 *
 * @param {dw.order.Order} order current order
 * @param {Object} paymentInformation payment information
 */
function updateOrderPayment(order, paymentInformation, errCounter) {
    var Order = require('dw/order/Order');
    var paymentInstrument = getAPSPaymentInstrument(order);
    var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.paymentMethod).paymentProcessor;

    var errorCounter = errCounter || 0

    try {
        if (order && (order.getPaymentStatus() == Order.PAYMENT_STATUS_NOTPAID) && (order.getStatus().value != Order.ORDER_STATUS_FAILED)) {
            Transaction.wrap(function () {
                paymentInstrument.paymentTransaction.setTransactionID(paymentInformation.transactionID);
                paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
                order.setPaymentStatus(Order.PAYMENT_STATUS_PAID);
            });
        }
    } catch (e) {
        if (e.message.toLowerCase().indexOf("optimisticLock") && errorCounter < 10) {
            errorCounter++;
            Logger.warn('Trying to update order payment status for orderNo {0}', order.orderNo)
            updateOrderPayment(order, paymentInformation, errorCounter)
        } else {
            Logger.error('Optimistic locking failure when updating orderNo {0}', order.orderNo)
        }
    }

    resetOrderNo();
    resetCardSecurityCode();
}

/**
 * Check whether the order is complete
 *
 * @param {String} orderPaymentStatus order payment status
 * @returns {boolean} is order complete status
 */
function isOrderCompleteStatus(orderPaymentStatus) {
    return orderPaymentStatus === constants.UNCERTAIN_TRANSACTION
    || orderPaymentStatus === constants.PURCHASE_SUCCESS
    || orderPaymentStatus === constants.ON_HOLD
    || orderPaymentStatus === constants.TRANSACTION_PENDING
    || orderPaymentStatus === constants.AUTHORIZATION_SUCCESS
    || orderPaymentStatus === constants.CAPTURE_SUCCESS;
}

/**
 * Get the site country code from locale.
 * @returns {string} The site  country code
 */
function getSiteCountryCode() {
    return Site.getCurrent().defaultLocale.split('_')[1];
}

module.exports = {
    getRequestData: getRequestData,
    getSignature: getSignature,
    checkResponseSignature: checkResponseSignature,
    paymentSuccess: paymentSuccess,
    formatDate: formatDate,
    updateOrderPaymentStatus: updateOrderPaymentStatus,
    updateOrderPayment: updateOrderPayment,
    validateDirectPaymentOrder: validateDirectPaymentOrder,
    isOrderCompleteStatus: isOrderCompleteStatus,
    getSiteCountryCode: getSiteCountryCode,
    getTokenData: getTokenData
};
