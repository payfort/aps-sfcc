/*
 * APS request signing helper (PWA Kit client).
 *
 * IMPORTANT SECURITY NOTE
 * -----------------------
 * The APS SHA request phrase, access code, and merchant identifier are
 * merchant-account credentials. They must never appear in code that ships to
 * the browser: everything under `overrides/app/` is bundled by pwa-kit-dev
 * into a public JavaScript chunk served from `/mobify/bundle/<deploy-id>/*.js`
 * that any anonymous visitor can download and inspect.
 *
 * This module therefore does NOT compute the APS signature on the client and
 * does NOT read any secret from the client bundle. Instead it delegates to the
 * `int_aps_pwa` cartridge's `ApsPWA-GetTokenParams` controller, which reads the
 * SHA request phrase from the Business Manager custom preference on the server
 * and returns a fully signed tokenization parameter bag.
 */
import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'

/**
 * Request signed tokenization parameters from the SFCC server.
 *
 * The response contains only values that are already emitted to APS on the
 * wire (identifiers plus the server-computed signature and the APS merchant
 * URL). The SHA request phrase itself never leaves the SFCC server.
 *
 * @returns {Promise<Object>} signed token params, or an object with `error: true` on failure.
 */
export const getTokenMetaParams = async () => {
    const {app} = getConfig()
    const endpoint = `${app.sfccHost}${app.sfccSitePath}ApsPWA-GetTokenParams`

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            credentials: 'include',
            headers: {
                Accept: 'application/json'
            }
        })

        if (!response.ok) {
            console.error('Failed to obtain APS token params:', response.status)
            return {error: true}
        }

        return await response.json()
    } catch (error) {
        console.error('Failed to obtain APS token params:', error)
        return {error: true}
    }
}

export const parseAPSTokenResponse = (resp) => {
    const regex = new RegExp('var returnUrlParams = (\\{[^}]*\\});')
    const match = resp.match(regex)
    let returnUrlParams = {}

    if (match) {
        const returnUrlParamsString = match[1]
        returnUrlParams = JSON.parse(returnUrlParamsString)
    }

    return returnUrlParams
}
