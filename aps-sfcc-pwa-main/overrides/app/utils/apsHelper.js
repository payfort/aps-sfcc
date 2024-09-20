import {SITE_PREFERENCES} from '../constants'

function generateUUID() {
    let randomString = ''

    for (let i = 0; i < 16; i++) {
        const randomHex = Math.floor(Math.random() * 16).toString(16)
        randomString += randomHex
    }

    return randomString
}

const getSignatureMainParams = (language) => {
    return {
        service_command: SITE_PREFERENCES.APS_TOKEN_SERVICE_COMMAND,
        access_code: SITE_PREFERENCES.APS_ACCESS_CODE,
        merchant_identifier: SITE_PREFERENCES.APS_MERCHANT_IDENTIFIER,
        merchant_reference: `T-${generateUUID()}`,
        language,
        return_url: SITE_PREFERENCES.APS_RETURN_URL
    }
}

const getSignature = async (signatureParams) => {
    let signatureSequence = []

    Object.keys(signatureParams).forEach(function (paramKey) {
        let value = signatureParams[paramKey]
        try {
            if (typeof value === 'object' && value !== null) {
                const keys = Object.keys(value)
                if (keys.length > 0) {
                    let nestedValue = []
                    keys.forEach(function (key) {
                        nestedValue.push(key + '=' + value[key])
                    })
                    nestedValue = '{' + nestedValue.join(', ') + '}'
                    value = nestedValue
                }
            }
        } catch (error) {
            // do nothing
        }
        signatureSequence.push(paramKey + '=' + value)
    })

    signatureSequence.sort()
    signatureSequence.push(SITE_PREFERENCES.APS_SHA_REQUEST_PHRASE)
    signatureSequence.unshift(SITE_PREFERENCES.APS_SHA_REQUEST_PHRASE)
    const finalPhrase = signatureSequence.join('')

    const encoder = new TextEncoder()
    const data = encoder.encode(finalPhrase)

    try {
        const hashBuffer = await window.crypto.subtle.digest(SITE_PREFERENCES.APS_SHA_TYPE, data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hashedString = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
        return hashedString
    } catch (error) {
        console.error('Error calculating signature:', error)
        return ''
    }
}
export const getTokenMetaParams = async (language) => {
    const metaParams = getSignatureMainParams(language)
    const signature = await getSignature(metaParams)
    return {
        ...metaParams,
        signature
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
