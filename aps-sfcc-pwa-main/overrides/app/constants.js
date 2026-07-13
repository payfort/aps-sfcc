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

// SITE_PREFERENCES holds ONLY client-safe feature flags.
//
// Everything under `overrides/app/` is compiled into the public JavaScript
// bundle served from `/mobify/bundle/<deploy-id>/*.js` and is readable by any
// anonymous visitor via browser dev tools. Do NOT add any credential, secret,
// SHA phrase, access code, merchant identifier, or per-merchant URL here.
//
// APS credentials (apsSHARequestPhrase, apsAccessCode, apsMerchantIdentifier,
// apsMerchantURL, apsSHAType, apsReturnURL, apsTokenServiceCommand, etc.) MUST
// be configured as Business Manager custom preferences on the SFCC instance;
// the PWA obtains signed tokenization parameters from the
// `ApsPWA-GetTokenParams` endpoint provided by the `int_aps_pwa` cartridge.
export const SITE_PREFERENCES = {
    APS_ENABLED: true,
    APS_HOSTED_ENABLED: true,
    APS_APPLE_PAY_ENABLED: true
}

// PAYMENT AND ERROR CONSTANTS
export const PAYMENT_ERROR_SLUG = 'Invalid Payment details'
export const ERROR_MESSAGE_TRIM_REGEX = /(HTTPError [0-9]+: )+/g
export const ORDER_REVIEW_PAYMENT_ERROR = defineMessage({
    defaultMessage:
        'There was an error when processing the payment request, Please try with another payment method.',
    id: 'payment_error.message'
})
