import React from 'react'
import PropTypes from 'prop-types'

import {FormattedNumber} from 'react-intl'

import {Box, Flex, Radio, Stack, Text, Image} from '@chakra-ui/react'

import {CreditCard} from './payment-methods/credit-card'
import {APSHosted} from './payment-methods/aps-hosted'
import {APSApplePay} from './payment-methods/apple-pay'

import {PAYMENT_METHODS_IDS, PAYMENT_METHODS_NAMES} from '../../../constants'

const PaymentMethod = ({paymentData, customer, selectedPaymentMethod, setApplePayData}) => {
    const {paymentMethod, basket, form, hideSubmitButton} = paymentData

    const PAYMENT_METHODS = [
        {
            id: PAYMENT_METHODS_IDS.CREDIT_CARD,
            component: (
                <CreditCard
                    form={form}
                    hideSubmitButton={hideSubmitButton}
                    selectedPaymentMethod={selectedPaymentMethod}
                    selectedPaymentProcessor={paymentMethod.paymentProcessorId}
                    customer={customer}
                />
            )
        },
        {
            id: PAYMENT_METHODS_IDS.APS_HOSTED,
            component: (
                <APSHosted selectedPaymentMethod={selectedPaymentMethod} />
            )
        },
        {
            id: PAYMENT_METHODS_IDS.APPLE_PAY,
            component: (
                <APSApplePay selectedPaymentMethod={selectedPaymentMethod} basket={basket} setApplePayData={setApplePayData} />
            )
        }
    ]

    if ((paymentMethod?.id !== PAYMENT_METHODS_IDS.APPLE_PAY && paymentMethod?.id !== PAYMENT_METHODS_IDS.APS_APPLE_PAY) ||
        ((paymentMethod?.id === PAYMENT_METHODS_IDS.APPLE_PAY || paymentMethod?.id === PAYMENT_METHODS_IDS.APS_APPLE_PAY) && window.ApplePaySession && ApplePaySession.canMakePayments())) {
        return (
            <>
                <Box py={3} px={[4, 4, 6]} bg="gray.50" borderBottom="1px solid" borderColor="gray.100">
                    <Radio value={paymentMethod?.id}>
                        <Flex justify="space-between">
                            <Stack direction="row" align="center">
                                <Text fontWeight="bold">
                                    {paymentMethod?.name}
                                </Text>
                            </Stack>
                            <Text fontWeight="bold">
                                <FormattedNumber
                                    value={basket?.orderTotal}
                                    style="currency"
                                    currency={basket?.currency}
                                />
                            </Text>
                        </Flex>
                    </Radio>
                </Box>

                {PAYMENT_METHODS.find((payment) => payment.id === paymentMethod?.id)?.component}
            </>
        )
    }
}

/**
 * PropTypes definition
 */

PaymentMethod.propTypes = {
    /** The form object returnd from `useForm` */
    form: PropTypes.object,

    /** Show or hide the submit button (for controlling the form from outside component) */
    hideSubmitButton: PropTypes.bool,

    /** Callback for form submit */
    onSubmit: PropTypes.func,

    paymentData: PropTypes.object,

    customer: PropTypes.object,

    selectedPaymentMethod: PropTypes.string,

    setApplePayData: PropTypes.func

}

export default PaymentMethod
