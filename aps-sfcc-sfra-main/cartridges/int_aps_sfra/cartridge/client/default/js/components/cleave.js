'use strict';
const MADA = 'mada';
const MADA_PATTERN = /^(58845|440647|440795|410621|420132|457997|474491|558563|446404|457865|968208|636120|417633|468540|468541|468542|468543|968201|446393|409201|458456|484783|968205|462220|455708|588848|455036|968203|486094|486095|486096|504300|440533|489318|489319|445564|968211|410685|406996|432328|428671|428672|428673|968206|446672|543357|434107|407197|407395|412565|431361|604906|521076|588850|968202|529415|535825|543085|524130|554180|549760|968209|524514|529741|537767|535989|536023|513213|520058|585265|588983|588982|589005|508160|531095|530906|532013|605141|968204|422817|422818|422819|428331|483010|483011|483012|589206|968207|419593|439954|423117|445682|465002|530060|531196)/;
var Cleave = require('cleave.js').default;

/**
 * Handle the type recognition, type record in data and the cvv max-length 
 * @param {String} cardTypeSelector - current order object
 * @param {String} type - current viewData object
 */
function handleCardsNumber(cardTypeSelector, type) {
    let creditCardTypes = {
        visa: 'Visa',
        mastercard: 'Master Card',
        amex: 'Amex',
        discover: 'Discover',
        mada: 'mada',
        unknown: 'Unknown'
    };

    $('.card-number-wrapper').attr('data-type', type);

    $(cardTypeSelector).val(creditCardTypes[Object.keys(creditCardTypes).indexOf(type) > -1
        ? type
        : 'unknown']);

    if (type === 'visa' || type === 'mastercard' || type === 'discover' || type === MADA) {
        $('#securityCode').attr('maxlength', 3);
    } else {
        $('#securityCode').attr('maxlength', 4);
    }

}

module.exports = {
    handleCreditCardNumber: function (cardFieldSelector, cardTypeSelector) {
        var prevCard = '';
        var cleave = new Cleave(cardFieldSelector, {
            creditCard: true,
            onValueChanged: function (e) { //this is invoked last since it's a callback
                if (e.target.rawValue.match(MADA_PATTERN)){
                    handleCardsNumber(cardTypeSelector, MADA);
                } else {
                    handleCardsNumber(cardTypeSelector, prevCard);
                }

            },
            onCreditCardTypeChanged: function (type) {
                prevCard = type;
                handleCardsNumber(cardTypeSelector, type);
            }
        });

        $(cardFieldSelector).data('cleave', cleave);
    },

    serializeData: function (form) {
        var serializedArray = form.serializeArray();

        serializedArray.forEach(function (item) {
            if (item.name.indexOf('cardNumber') > -1) {
                item.value = $('#cardNumber').data('cleave').getRawValue(); // eslint-disable-line
            }
        });

        return $.param(serializedArray);
    }
};
