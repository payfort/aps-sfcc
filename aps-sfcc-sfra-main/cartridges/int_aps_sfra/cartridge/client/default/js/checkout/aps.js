
/**
 * Initializes APS checkout
 */
function initializeAPS() {
    const $apsConfig = $('.js-aps-config');
    const apsEnabled = $apsConfig.data('aps-enabled');
    const apsHostedEnabled = $apsConfig.data('aps-hosted-enabled');

    if ($('.js-aps-apple-pay-config').data('apple-pay-enabled') && window.ApplePaySession && ApplePaySession.canMakePayments()) {
        $('body').addClass('apple-pay-enabled');
    }

    if (apsEnabled && apsHostedEnabled) {
        require('int_aps_sfra/apsHosted').initialize();
    }
}

module.exports = {
    initializeAPS: initializeAPS
};
