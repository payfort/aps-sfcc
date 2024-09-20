'use strict';

var server = require('server');
server.extend(module.superModule);

var CurrentSite = require('dw/system/Site').getCurrent();

var apsHelper = require('*/cartridge/scripts/helpers/apsHelper');

/**
 * Checkout-Begin : The Checkout-Begin endpoint will render the checkout shipping page for both guest shopper and returning shopper
 * @name Base/Checkout-Begin
 * @function
 * @memberof Checkout
 */
server.append('Begin', function (req, res, next) {
    var apsEnabled = !!CurrentSite.getCustomPreferenceValue('apsEnabled');

    if (apsEnabled) {
        var viewData = res.getViewData();
        var tokenData = apsHelper.getTokenData();

        if (tokenData.signature) {
            viewData.apsTokenData = JSON.stringify(tokenData);
        }
    }

    return next();
});


module.exports = server.exports();
