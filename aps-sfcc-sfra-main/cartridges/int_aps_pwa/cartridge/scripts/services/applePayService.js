'use strict';

var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Logger = require('dw/system/Logger');

function configureService(service, args) {
    var serviceMethod = args.method || 'GET';
    var serviceUrl = service.getURL();
    var serviceEndPoint = Object.hasOwnProperty.call(args, 'url') ? args.url : serviceUrl + '/' + args.endPoint;
    var serviceParams = '';


    service.setRequestMethod(serviceMethod);
    service.setURL(serviceEndPoint);

    if (args.payload) {
        var payload = args.payload || {};
        if (serviceMethod === 'GET') {
            serviceParams = Object
                .keys(payload)
                .map(function (param) {
                    encodeURIComponent(param) + '=' + encodeURIComponent(payload[param])
                })
                .join('&');
        } else {
            serviceParams = JSON.stringify(args.payload);
        }
    }

    return serviceParams;
}

module.exports = LocalServiceRegistry.createService('int.aps.applepay', {
    createRequest: function (service, args) {
        return configureService(service, args);
    },
    parseResponse: function (service, result) {
        var returns = result.text;

        try {
            returns = JSON.parse(result.text);
        } catch (e) {
            Logger.error('ApplePay Service error: {0}', JSON.stringify(e, null, '\t'));
        }

        return returns;
    },
    filterLogMessage: function (msg) {
        return msg;
    }
});
