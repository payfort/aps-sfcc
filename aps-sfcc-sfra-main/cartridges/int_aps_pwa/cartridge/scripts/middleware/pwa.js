var Response = require('dw/system/Response');
var Site = require('dw/system/Site').getCurrent();

/**
 * Applies the access controll origin for PWA site requests
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next call in the middleware chain
 * @returns {void}
*/
function allowCORS(req, res, next) {
    var pwaSiteHost = Site.getPreferences().getCustom().siteHost;

    if (pwaSiteHost) {
        response.setHttpHeader(Response.ACCESS_CONTROL_ALLOW_ORIGIN, pwaSiteHost);
        response.setHttpHeader(Response.ACCESS_CONTROL_ALLOW_CREDENTIALS, 'true');
    }

    next();
}

module.exports = {
    allowCORS: allowCORS
};
