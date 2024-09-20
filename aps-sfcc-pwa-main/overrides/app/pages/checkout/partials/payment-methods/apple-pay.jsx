import React from 'react'
import PropTypes from 'prop-types'
import {Box, Stack} from '@chakra-ui/react'
import {Helmet} from 'react-helmet'

import {PAYMENT_METHODS_IDS, SITE_PREFERENCES} from '../../../../constants'
import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'

export const APSApplePay = ({selectedPaymentMethod, basket, setApplePayData}) => {
    const {app} = getConfig()
    const APPLE_PAY_PATH = {
        APPLE_PAY_GET_REQUEST: `${app.sfccHost}${app.sfccSitePath}ApplePay-GetApplePayRequest`,
        APPLE_PAY_VALIDATE_MERCHANT: `${app.sfccHost}${app.sfccSitePath}ApplePay-ValidateMerchant`,
        APPLE_PAY_PAYMENT_AUTHORIZED: `${app.sfccHost}${app.sfccSitePath}ApplePay-PaymentAuthorized`
    }

    const FILTER_EVENT_KEY = [
        'isTrusted',
        'validationURL',
        'shippingContact',
        'paymentMethod',
        'shippingMethod',
        'payment'
    ]

    const filterEvent = (e) => {
        var filteredEvent = {}
        FILTER_EVENT_KEY.forEach((eventKey) => {
            if (e[eventKey]) {
                filteredEvent[eventKey] = e[eventKey]
            }
        })
        return filteredEvent
    }

    if (SITE_PREFERENCES.APS_ENABLED && SITE_PREFERENCES.APS_APPLE_PAY_ENABLED && window.ApplePaySession && ApplePaySession.canMakePayments()) {
        <Helmet>
            <script src="https://applepay.cdn-apple.com/jsapi/v1/apple-pay-sdk.js"></script>
        </Helmet>

        var paymentRequest = {
            countryCode: 'AE',
            currencyCode: basket.currency,
            total: {
                label: 'APS Apple Pay',
                amount: basket.orderTotal
            },
            supportedNetworks: ['visa', 'masterCard', 'amex'],
            merchantCapabilities: ['supports3DS']
        };

        var onPaymentAuthorized = async function (data) {
            const result = await fetch(APPLE_PAY_PATH.APPLE_PAY_PAYMENT_AUTHORIZED, {
                method: 'POST',
                body: JSON.stringify(data)
            });

            const dataRes = await result.json()
            data && setApplePayData(data.payment)
            return dataRes
        }

        function startApplePaySession() {
            var applePaySession = new ApplePaySession(1, paymentRequest);
            applePaySession.begin();

            applePaySession.onvalidatemerchant = function (event) {
                validateApplePaySession(event.validationURL, function (merchantSession) {
                    applePaySession.completeMerchantValidation(merchantSession)
                })
            }

            var validateApplePaySession = async function (appleUrl, callback) {
                const result = await fetch(APPLE_PAY_PATH.APPLE_PAY_VALIDATE_MERCHANT, {
                    method: 'POST',
                    body: JSON.stringify({
                        appleUrl: appleUrl,
                        hostname: window.location.hostname,
                        domainName: window.location.hostname
                    })
                })
                const dataRes = await result.json()
                callback(dataRes)
            }

            applePaySession.onpaymentauthorized = async function (event) {
                const response = await onPaymentAuthorized(Object.assign(filterEvent(event)));
                if (response.success) {
                    applePaySession.completePayment(window.ApplePaySession.STATUS_SUCCESS)
                } else {
                    applePaySession.completePayment(window.ApplePaySession.STATUS_FAILURE);
                }
            };
        };

        const buttonStyle = {
            width: '100%',
            height: '40px',
            borderRadius: '5px',
            display: 'inline-block',
            cursor: 'pointer',
            WebkitAppearance: '-apple-pay-button',
            applePayButtonStyle: 'black'
        };

        return (
            <Box display={selectedPaymentMethod === PAYMENT_METHODS_IDS.APPLE_PAY ? 'block' : 'none'}>
                <Stack padding={4}>
                    <Box>
                        <button style={buttonStyle} type="button" lang="en" onClick={() => startApplePaySession()}></button>
                    </Box>
                </Stack>
            </Box>
        )
    } else {
        return null
    }
}

APSApplePay.propTypes = {
    basket: PropTypes.object,
    selectedPaymentMethod: PropTypes.string,
    setApplePayData: PropTypes.func
}

export default APSApplePay
