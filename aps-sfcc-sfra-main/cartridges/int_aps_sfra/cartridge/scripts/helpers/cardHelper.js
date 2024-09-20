/* API Includes */
var Logger = require('dw/system/Logger');
var URLUtils = require('dw/web/URLUtils');

/** Utility * */
var purchaseService = require('*/cartridge/scripts/serviceregistry/purchaseService');
var apsHelper = require('*/cartridge/scripts/helpers/apsHelper');

/**
 * Build the gateway request.
 * @param {String} orderNumber The order number
 * @param {Object} paymentInstrument The payment data
 * @param {boolean} isPWARequest Indicates whether the request originated from the PWA-Kit app
 * @returns {Object} The payment request data
 */
function buildRequest(orderNumber, paymentInstrument, isPWARequest) { // eslint-disable-line no-unused-vars
    var amountToBePaid = paymentInstrument.getPaymentTransaction().getAmount();
    var requestData = apsHelper.getRequestData(orderNumber, amountToBePaid, false, true);
    requestData.remember_me = 'YES';

    if (!empty(session.privacy.cardSecurityCode)) {
        requestData.card_security_code = session.privacy.cardSecurityCode;
    }

    if (isPWARequest && !empty(paymentInstrument.custom.apsPaymentData)) {
        var apsData = JSON.parse(paymentInstrument.custom.apsPaymentData);
        requestData.card_security_code = apsData.cvv;
    }

    requestData.return_url = isPWARequest ? URLUtils.https('ApsPWA-HandleReturn').toString() : URLUtils.https('APS-HandleReturn').toString();
    requestData.token_name = paymentInstrument.getCreditCardToken();
    requestData.signature = apsHelper.getSignature(requestData, false, false);

    return requestData;
}

/**
 * Handle the payment request.
 * @param {String} orderNumber The order number
 * @param {Object} paymentInstrument The payment data
 * @param {boolean} isPWARequest Indicates whether the request originated from the PWA-Kit app
 * @returns {boolean} The request success or failure
 */
function handleRequest(orderNumber, paymentInstrument, isPWARequest) {
    // Build the request data
    var gatewayRequestData = buildRequest(orderNumber, paymentInstrument, isPWARequest);

    // call service with data:
    var gatewayResponse = purchaseService.getAPSPurchaseService.call(gatewayRequestData);

    // Process the response
    return handleResponse(gatewayResponse);
}

/**
 * Handle the payment response.
 * @param {Object} gatewayResponse The gateway response data
 * @returns {Object} The payment result
 */
function handleResponse(gatewayResponse) {
    var result;
    // Prepare the result
    var responseParams = verifyAPSResponse(gatewayResponse);

    var orderStatus = apsHelper.paymentSuccess(responseParams);

    if (responseParams.error) {
        return responseParams;
    }

    result = {
        error: false,
        redirectUrl: '',
        transactionID: responseParams.fort_id,
        message: responseParams.response_message,
        status: orderStatus.status,
        expiry_date: responseParams.expiry_date ? responseParams.expiry_date : ''
    };

    if (!orderStatus.isOrderCompleteStatus) {
        result.error = true;
        return result;
    }

    if (orderStatus.status === '20') {
        result.redirectUrl = responseParams['3ds_url'];
    }

    return result;
}

/**
 * Verify payment response.
 * @param {Object} gatewayResponse The gateway response data
 * @returns {Object} The payment result object or error object
 */
function verifyAPSResponse(gatewayResponse) {
    var responseParams;
    if (!gatewayResponse.object) {
        return {
            error: true,
            message: 'No response data from APS Service!',
            redirectUrl: '',
            status: 'Service Failed'
        };
    }

    try {
        responseParams = JSON.parse(gatewayResponse.object);
    } catch (error) {
        Logger.error('Problem parsing payment response body! Error: {0}', error.message);
        return {
            error: true,
            message: 'Error parsing response data!',
            redirectUrl: '',
            status: 'Error'
        };
    }

    var isRequestSafe = apsHelper.checkResponseSignature(responseParams);

    if (!isRequestSafe) {
        return {
            error: true,
            unsafeRequest: true,
            message: 'Response from APS Service can NOT be verified!',
            status: 'Unsafe'
        };
    }

    return responseParams;
}

module.exports = {
    handleRequest: handleRequest,
    handleResponse: handleResponse
};
