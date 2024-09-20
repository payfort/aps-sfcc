'use strict';

/**
 * Verifies the required information for billing form is provided.
 * @param {Object} paymentForm - the payment form
 * @param {Object} viewFormData - object contains billing form data
 * @returns {Object} an object that has error information or payment information
 */
function processForm(req, paymentForm, viewFormData) {
    var viewData = viewFormData;
    var apsApplePayData = paymentForm.applePayFields.apsApplePayData ? paymentForm.applePayFields.apsApplePayData : null;
    var error = true;

    if (apsApplePayData) {
        error = false;
        viewData.paymentMethod = {
            value: paymentForm.paymentMethod.htmlValue,
            htmlName: paymentForm.paymentMethod.htmlValue,
        };

        viewData.paymentInformation = {
            apsApplePayData: {
                value: apsApplePayData.htmlValue,
                htmlName: apsApplePayData.htmlName,
            },
        };
    }

    return {
        error: error,
        viewData: viewData,
    };
}

exports.processForm = processForm;
