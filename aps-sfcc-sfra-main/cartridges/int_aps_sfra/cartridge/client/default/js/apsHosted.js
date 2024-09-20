module.exports.initialize = function () {
    const $placeOrderButton = $('.place-order');

    $placeOrderButton.on('click', function (e) {
        if ($('.place-order').hasClass('js-aps-hosted-place-order')) {
            const $apsConfig = $('.js-aps-config');

            if ($apsConfig.data('aps-enabled') && $apsConfig.data('aps-hosted-enabled') && $apsConfig.data('data-url')) {
                e.stopPropagation();
                window.location = $apsConfig.data('data-url');
            }
        }
    });
};
