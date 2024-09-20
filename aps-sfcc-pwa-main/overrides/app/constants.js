export * from '@salesforce/retail-react-app/app/constants'

import {defineMessage} from 'react-intl'

export const CUSTOM_HOME_TITLE = '🎉 Hello Extensible React Template!'
export const PAYMENT_METHODS_IDS = {
    CREDIT_CARD: 'CREDIT_CARD',
    APS_HOSTED: 'APS_HOSTED',
    APS_APPLE_PAY: 'APS_APPLE_PAY',
    APPLE_PAY: 'DW_APPLE_PAY',
    APS_CARD: 'APS_CARD'
}

export const PAYMENT_METHOD_STATUSES = {
    DECLINED: 'Declined',
    NOTIMPLEMENTED: 'Not Implemented'
}

export const PAYMENT_METHODS_NAMES = {
    APS_HOSTED: 'APS Hosted',
    APPLE_PAY: 'Apple Pay',
    CARD: 'Card'
}

export const SITE_PREFERENCES = {
    APS_ENABLED: true,
    APS_HOSTED_ENABLED: true,
    APS_APPLE_PAY_ENABLED: true,
    APS_MERCHANT_URL: 'https://sbcheckout.payfort.com/FortAPI/paymentPage',
    APS_TOKEN_SERVICE_COMMAND: 'TOKENIZATION',
    APS_SHA_TYPE: 'SHA-256',
    APS_ACCESS_CODE: '',
    APS_MERCHANT_IDENTIFIER: '',
    APS_RETURN_URL: '',
    APS_SHA_REQUEST_PHRASE: ''
}

// PAYMENT AND ERROR CONSTANTS
export const PAYMENT_ERROR_SLUG = 'Invalid Payment details'
export const ERROR_MESSAGE_TRIM_REGEX = /(HTTPError [0-9]+: )+/g
export const ORDER_REVIEW_PAYMENT_ERROR = defineMessage({
    defaultMessage:
        'There was an error when processing the payment request, Please try with another payment method.',
    id: 'payment_error.message'
})
