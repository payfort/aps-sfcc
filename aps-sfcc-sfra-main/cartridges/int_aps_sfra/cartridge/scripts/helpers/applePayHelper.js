const Site = require('dw/system/Site');
const currentSite = Site.getCurrent();
const purchaseService = require('*/cartridge/scripts/serviceregistry/purchaseService');
const cardHelper = require('*/cartridge/scripts/helpers/cardHelper');
const apsHelper = require('*/cartridge/scripts/helpers/apsHelper');
var constants = require('*/cartridge/scripts/util/constants');

/**
 * Builds a request for authorization and purchase for APS
 *
 * @param {dw.order.Order} order order object
 * @param {Object} appleToken apple pay token
 * @returns {Object} request object for authorization and purchase
 */
function buildRequest(order, appleToken) {
    var requestData = {};
    try {
        requestData = apsHelper.getRequestData(order.orderNo, order.getTotalGrossPrice(), true, false);
        requestData.digital_wallet = constants.APS_APPLE_PAY;
        requestData.apple_data = appleToken.paymentData.data;
        requestData.apple_signature = appleToken.paymentData.signature;
        requestData.apple_header = {
            apple_ephemeralPublicKey: appleToken.paymentData.header.ephemeralPublicKey,
            apple_publicKeyHash: appleToken.paymentData.header.publicKeyHash,
            apple_transactionId: appleToken.paymentData.header.transactionId
        };
        requestData.apple_paymentMethod = {
            apple_displayName: appleToken.paymentMethod.displayName,
            apple_network: appleToken.paymentMethod.network,
            apple_type: appleToken.paymentMethod.type
        };
    } catch (error) {
        var a = error;
        requestData = {};
    }

    requestData.signature = apsHelper.getSignature(requestData, false, true);

    return requestData;
}

/**
 * Send the request to APS
 *
 * @param {dw.order.Order} order order object
 * @param {Object} applepayToken apple pay token
 * @returns {Object} response from APS
 */
function sendPurchaseRequest(order, applepayToken) {
    var requestData = buildRequest(order, applepayToken);

    var gatewayResponse = purchaseService.getAPSPurchaseService.call(requestData);
    return cardHelper.handleResponse(gatewayResponse);
}

module.exports = {
    sendPurchaseRequest: sendPurchaseRequest
};
