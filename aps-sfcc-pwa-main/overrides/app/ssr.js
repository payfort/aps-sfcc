/*
 * Copyright (c) 2023, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

'use strict'

import path from 'path'
import {getRuntime} from '@salesforce/pwa-kit-runtime/ssr/server/express'
import {defaultPwaKitSecurityHeaders} from '@salesforce/pwa-kit-runtime/utils/middleware'
import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'
import helmet from 'helmet'

const options = {
    // The build directory (an absolute path)
    buildDir: path.resolve(process.cwd(), 'build'),

    // The cache time for SSR'd pages (defaults to 600 seconds)
    defaultCacheTimeSeconds: 600,

    // The contents of the config file for the current environment
    mobify: getConfig(),

    // The port that the local dev server listens on
    port: 3000,

    // The protocol on which the development Express app listens.
    // Note that http://localhost is treated as a secure context for development,
    // except by Safari.
    protocol: 'http'
}

const runtime = getRuntime()

const {handler} = runtime.createHandler(options, (app) => {
    // Set default HTTP security headers required by PWA Kit
    app.use(defaultPwaKitSecurityHeaders)
    // Set custom HTTP security headers
    app.use(
        helmet({
            contentSecurityPolicy: {
                useDefaults: true,
                directives: {
                    'img-src': [
                        // Default source for product images - replace with your CDN
                        '*.commercecloud.salesforce.com'
                    ],
                    'script-src': [
                        // Used by the service worker in /worker/main.js
                        'storage.googleapis.com'
                    ],
                    'connect-src': [
                        // Connect to Einstein APIs
                        'api.cquotient.com',
                        '*.commercecloud.salesforce.com',
                        '*.payfort.com'
                    ]
                }
            }
        })
    )

    // Handle the redirect from SLAS as to avoid error
    app.get('/callback?*', (req, res) => {
        // This endpoint does nothing and is not expected to change
        // Thus we cache it for a year to maximize performance
        res.set('Cache-Control', `max-age=31536000`)
        res.send()
    })
    app.get('/robots.txt', runtime.serveStaticFile('static/robots.txt'))
    app.get('/favicon.ico', runtime.serveStaticFile('static/ico/favicon.ico'))

    app.get('/worker.js(.map)?', runtime.serveServiceWorker)
    // ApplePay domain verification
    app.get('/.well-known/apple-developer-merchantid-domain-association.txt', (req, res) => {
        const sitePrefProperty = `MIIQiQYJKoZIhvcNAQcCoIIQejCCEHYCAQExCzAJBgUrDgMCGgUAMIGXBgkqhkiG9w0BBwGggYkE
gYZ7InRlYW1JZCI6Ikg4UTZWSzlQVzkiLCJkb21haW4iOiJ0ZXN0LXB3YS10cmFpbmluZy1kZXZl
bG9wbWVudC5tb2JpZnktc3RvcmVmcm9udC5jb20iLCJkYXRlQ3JlYXRlZCI6IjIwMjQtMDMtMjgs
MTU6MDU6MjgiLCJ2ZXJzaW9uIjoxfaCCDT8wggQ0MIIDHKADAgECAghHPExh8pmI1DANBgkqhkiG
9w0BAQsFADBzMS0wKwYDVQQDDCRBcHBsZSBpUGhvbmUgQ2VydGlmaWNhdGlvbiBBdXRob3JpdHkx
IDAeBgNVBAsMF0NlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQsw
CQYDVQQGEwJVUzAeFw0yMzA0MTEyMjIzNTlaFw0yODA0MDkyMjIzNThaMFkxNTAzBgNVBAMMLEFw
cGxlIGlQaG9uZSBPUyBQcm92aXNpb25pbmcgUHJvZmlsZSBTaWduaW5nMRMwEQYDVQQKDApBcHBs
ZSBJbmMuMQswCQYDVQQGEwJVUzCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAOpD5PzT
U5-2gA_8xm1uisnWw9KO-92b98BL4ftI6c3zLBgyxu4s0zEwF9GoRML5qWSj4o7rq6eDgiwtwYYC
rwRXU5lNDDeQQ3Z2e26cG2sVseQB_Z2cFZt3f8D0I9GuoLJE-iFL0k2IvGqYA9FRpXTyX-77vlmB
R-NPYnu5Y6VP0o7KEE4xVY3tXJFHtvY309823yxbzxdOTcMFUT38GXCfAPi1idfXyzAV67nW7U17
ksxdgMsMOytHDchbcXu0wdvG12fQ11OGkJcB3v8GvR2ZhaTXz-7qQeRe_gpncCAVHZTuNGbuQmrP
36P1EErEmLLVXGhI7fuap3D-FpmzF_UCAwEAAaOB5TCB4jAMBgNVHRMBAf8EAjAAMB8GA1UdIwQY
MBaAFG_xlRhiXODI8cXtbBjJ4NNkUpggMEAGCCsGAQUFBwEBBDQwMjAwBggrBgEFBQcwAYYkaHR0
cDovL29jc3AuYXBwbGUuY29tL29jc3AwMy1haXBjYTA3MC8GA1UdHwQoMCYwJKAioCCGHmh0dHA6
Ly9jcmwuYXBwbGUuY29tL2FpcGNhLmNybDAdBgNVHQ4EFgQUT7M7SH1EjWogi0DlQzGC-Ya7h-Iw
DgYDVR0PAQH_BAQDAgeAMA8GCSqGSIb3Y2QGOgQCBQAwDQYJKoZIhvcNAQELBQADggEBAD-OHBTi
8LL2_3VRFsYdAxmMHbfj57CTGIu-qXLFBIRuDtl7HF8jOiMvq_yC53KZ2yOgdcNiToRny47ALE7G
4pcP4dAHX1zYjPd7kO0d0ADes2cCF21bPvNpssfTyVdk0a4CRswLeiNC0HL9dQ-nWQv-1VRmRbuh
5b3FPQtAEMtffonwDd9hPqdzQXhlVnmVhmUbZvUMTgqubl_tR1Kw8md2AaSiL4VzVhUgEalXEgVr
vLD3G0Y4XTX__5jGaQkTZR9Nxbsrrbus4LSALt4Bs74SJ_EpkYcspuVhlT-ufjULXC4OTfI2T7GB
CMuv2WJere86aSCboHi7nh98SoFueiUwggREMIIDLKADAgECAghcY8rkSjdTyTANBgkqhkiG9w0B
AQsFADBiMQswCQYDVQQGEwJVUzETMBEGA1UEChMKQXBwbGUgSW5jLjEmMCQGA1UECxMdQXBwbGUg
Q2VydGlmaWNhdGlvbiBBdXRob3JpdHkxFjAUBgNVBAMTDUFwcGxlIFJvb3QgQ0EwHhcNMTcwNTEw
MjEyNzMwWhcNMzAxMjMxMDAwMDAwWjBzMS0wKwYDVQQDDCRBcHBsZSBpUGhvbmUgQ2VydGlmaWNh
dGlvbiBBdXRob3JpdHkxIDAeBgNVBAsMF0NlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQK
DApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEB
AMlFagEPPoMEhsf8v9xe8B6B7hcwc2MmLt49eiTNkz5POUe6db7zwNLxWaKrH_4KhjzZLZoH8g5r
uSmRGl8iCovxclgFrkxLRMV5p4A8sIjgjAwnhF0Z5YcZNsvjxXa3sPRBclH0BVyDS6JtplG48Sbf
e16tZQzGsphRjLt9G0zBTsgIx9LtZAu03RuNT0B9G49IlpJb89CYftm8pBkOmWG7QV0BzFt3en0k
0NzTU__D3MWULLZaTY4YIzm92cZSPtHy9CWKoSqH_dgMRilR_-0XbIkla4e_imkUn3efwxW3aLOI
Rb2E5gYCQWQPrSoouBXJ4KynirpyBDSyeIz4soUCAwEAAaOB7DCB6TAPBgNVHRMBAf8EBTADAQH_
MB8GA1UdIwQYMBaAFCvQaUeUdgn-9GuNLkCm90dNfwheMEQGCCsGAQUFBwEBBDgwNjA0BggrBgEF
BQcwAYYoaHR0cDovL29jc3AuYXBwbGUuY29tL29jc3AwMy1hcHBsZXJvb3RjYTAuBgNVHR8EJzAl
MCOgIaAfhh1odHRwOi8vY3JsLmFwcGxlLmNvbS9yb290LmNybDAdBgNVHQ4EFgQUb_GVGGJc4Mjx
xe1sGMng02RSmCAwDgYDVR0PAQH_BAQDAgEGMBAGCiqGSIb3Y2QGAhIEAgUAMA0GCSqGSIb3DQEB
CwUAA4IBAQA6z6yYjb6SICEJrZXzsVwh-jYtVyBEdHNkkgizlqz3bZf6WzQ4J88SRtM8EfAHyZmQ
sdHoEQml46VrbGMIP54l-tWZnEzm5c6Osk1o7Iuro6JPihEVPtwUKxzGRLZvZ8VbT5UpLYdcP9yD
HndP7dpUpy3nE4HBY8RUCxtLCmooIgjUN5J8f2coX689P7esWR04NGRa7jNKGUJEKcTKGGvhwVMt
LfRNwhX2MzIYePEmb4pN65RMo-j_D7MDi2Xa6y7YZVCf3J-K3zGohFTcUlJB0rITHTFGR4hfPu7D
8owjBJXrrIo-gmwGny7ji0OaYls0DfSZzyzuunKGGSOl_I61MIIEuzCCA6OgAwIBAgIBAjANBgkq
hkiG9w0BAQUFADBiMQswCQYDVQQGEwJVUzETMBEGA1UEChMKQXBwbGUgSW5jLjEmMCQGA1UECxMd
QXBwbGUgQ2VydGlmaWNhdGlvbiBBdXRob3JpdHkxFjAUBgNVBAMTDUFwcGxlIFJvb3QgQ0EwHhcN
MDYwNDI1MjE0MDM2WhcNMzUwMjA5MjE0MDM2WjBiMQswCQYDVQQGEwJVUzETMBEGA1UEChMKQXBw
bGUgSW5jLjEmMCQGA1UECxMdQXBwbGUgQ2VydGlmaWNhdGlvbiBBdXRob3JpdHkxFjAUBgNVBAMT
DUFwcGxlIFJvb3QgQ0EwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDkkakJH5HbHkdQ
6wXtXnmELes2oldMVeyLGYne-Uts9QerIjAC6Bg--FAJ039BqJj50cpmnCRrEdCju-QbKsMflZ56
DKRHi1vUFjczy8QPTc4UadHJGXL1XQ7Vf1-b8iUDulWPTV0N8WQ1IxVLFVkds5T39pyez1C6wVhQ
Z48ItCD3y6wsIG9wtj8BMIy3Q88PnT3zK0koGsj-zrW5DtleHNbLPbU6rfQPDgCSC7EhFi501TwN
22IWq6NxkkdTVcGvL0Gz-PvjcM3mo0xFfh9Ma1CWQYnEdGILEINBhzOKgbEwWOxaBDKMaLOPHd5l
c_9nXmW8Sdh2nzMUZaF3lMktAgMBAAGjggF6MIIBdjAOBgNVHQ8BAf8EBAMCAQYwDwYDVR0TAQH_
BAUwAwEB_zAdBgNVHQ4EFgQUK9BpR5R2Cf70a40uQKb3R01_CF4wHwYDVR0jBBgwFoAUK9BpR5R2
Cf70a40uQKb3R01_CF4wggERBgNVHSAEggEIMIIBBDCCAQAGCSqGSIb3Y2QFATCB8jAqBggrBgEF
BQcCARYeaHR0cHM6Ly93d3cuYXBwbGUuY29tL2FwcGxlY2EvMIHDBggrBgEFBQcCAjCBthqBs1Jl
bGlhbmNlIG9uIHRoaXMgY2VydGlmaWNhdGUgYnkgYW55IHBhcnR5IGFzc3VtZXMgYWNjZXB0YW5j
ZSBvZiB0aGUgdGhlbiBhcHBsaWNhYmxlIHN0YW5kYXJkIHRlcm1zIGFuZCBjb25kaXRpb25zIG9m
IHVzZSwgY2VydGlmaWNhdGUgcG9saWN5IGFuZCBjZXJ0aWZpY2F0aW9uIHByYWN0aWNlIHN0YXRl
bWVudHMuMA0GCSqGSIb3DQEBBQUAA4IBAQBcNplMLXi37Yyb3PN3m_J20ncwT8EfhYOFG5k9Rzfy
qZtAjizUsZAS2L70c5vu0mQPy3lPNNiiPvl4_2vIB-x9OYOLUyDTOMSxv5pPCmv_K_xZpwUJfBdA
VhEedNO3iyM7R6PVbyTi69G3cN8PReEnyvFteO3ntRcXqNx-IjXKJdXZD9Zr1KIkIxH3oayPc4Fg
xhtbCS-SsvhESPBgOJ4V9T0mZyCKM2r3DYLP3uujL_lTaltkwGMzd_c6ByxW69oPIQ7aunMZT7XZ
Nn_Bh1XZp5m5MkL72NVxnn6hUrcbvZNCJBIqxw8dtk2cXmPIS4AXUKqK1drk_NAJBzewdXUhMYIC
hTCCAoECAQEwfzBzMS0wKwYDVQQDDCRBcHBsZSBpUGhvbmUgQ2VydGlmaWNhdGlvbiBBdXRob3Jp
dHkxIDAeBgNVBAsMF0NlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMu
MQswCQYDVQQGEwJVUwIIRzxMYfKZiNQwCQYFKw4DAhoFAKCB3DAYBgkqhkiG9w0BCQMxCwYJKoZI
hvcNAQcBMBwGCSqGSIb3DQEJBTEPFw0yNDAzMjgxNTA1MjhaMCMGCSqGSIb3DQEJBDEWBBQyROj_
VmDDcdEA31-D5iTfOzy1dTApBgkqhkiG9w0BCTQxHDAaMAkGBSsOAwIaBQChDQYJKoZIhvcNAQEB
BQAwUgYJKoZIhvcNAQkPMUUwQzAKBggqhkiG9w0DBzAOBggqhkiG9w0DAgICAIAwDQYIKoZIhvcN
AwICAUAwBwYFKw4DAgcwDQYIKoZIhvcNAwICASgwDQYJKoZIhvcNAQEBBQAEggEAc6WIEKgi09_K
LmOdMnNJMYr6bmroefX2rkdNZ7ZMUjjaQHjwnXt12YqjjK05VM0unkBDnmggjzcbn7ObXzalq1in
BwvB0HWLUDzwoBAhaq8kQEtqu4al1gjWonXnvJUPY2u2jKv6EcWBYoCvA4rorD1RXJ14SPPhoVIa
G-SpurnJwUofOj2Ai9m8_mmOK5nbPRXwYymt_Tqacv-KxyVHZqAzufjM8Wt2PfoF0mkgvFZiwJDA
DxhKmSSclZqrCBQ9PosWdO1ai3VB2j1kTfJnLuf5C47YntIpgGbyHpzQE9_caSfnZJSG5VhoGHTC
rWf3xsWPUEs2KfiQPmVkPI9hIg`

        res.send(sitePrefProperty)
    })
    app.get('*', runtime.render)

})
// SSR requires that we export a single handler function called 'get', that
// supports AWS use of the server that we created above.
export const get = handler
