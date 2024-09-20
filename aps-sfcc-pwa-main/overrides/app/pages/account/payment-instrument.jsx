// top level
import React, {useState, useEffect} from 'react'
import PropTypes from 'prop-types'
import {FormattedMessage} from 'react-intl'

// components
import {Box, Text, Stack, Image} from '@chakra-ui/react'

// utils
import {getCreditCardIcon} from '@salesforce/retail-react-app/app/utils/cc-utils'
import {
    PAYMENT_METHODS_IDS,
    PAYMENT_METHOD_STATUSES,
    PAYMENT_METHODS_NAMES
} from '../../constants'

export const PaymentInstrument = ({instrument}) => {
    const [paymentMethod, setPaymentMethod] = useState(null)
    const [CardIcon, setCardIcon] = useState(null)

    useEffect(() => {
        const method = processPaymentMethod(instrument)
        setPaymentMethod(method)
        if (method === PAYMENT_METHODS_NAMES.CARD) {
            setCardIcon(getCreditCardIcon(instrument?.paymentCard?.cardType))
        }
    }, [])

    return (
        <Stack direction="row">
            {paymentMethod === PAYMENT_METHODS_NAMES.CARD && (
                <>
                    {CardIcon && <CardIcon layerStyle="ccIcon" />}
                    <Box>
                        <Text fontSize="sm">{instrument?.paymentCard?.cardType}</Text>
                        <Stack direction="row">
                            <Text fontSize="sm">
                                &bull;&bull;&bull;&bull; {instrument?.paymentCard?.numberLastDigits}
                            </Text>
                            <Text fontSize="sm">
                                {instrument?.paymentCard?.expirationMonth}/
                                {instrument?.paymentCard?.expirationYear}
                            </Text>
                        </Stack>
                    </Box>
                </>
            )}
            {paymentMethod === PAYMENT_METHODS_NAMES.APS_HOSTED && (
                <Stack spacing={3}>
                    <Text as="h3" fontSize="sm">
                        <FormattedMessage
                            defaultMessage="Amazon Payment Services"
                            id="checkout_payment.heading.aps"
                        />
                    </Text>
                </Stack>
            )}
            {paymentMethod === PAYMENT_METHOD_STATUSES.DECLINED && (
                <Box as="div">
                    <Text fontSize="sm">
                        <FormattedMessage
                            defaultMessage="Payment Declined"
                            id="account_order_detail.label.payment_declined"
                        />
                    </Text>
                </Box>
            )}
            {paymentMethod === PAYMENT_METHOD_STATUSES.NOTIMPLEMENTED && (
                <Box as="div">
                    <Text fontSize="sm">
                        <FormattedMessage
                            defaultMessage="Not Implemented"
                            id="account_order_detail.label.not_implemented"
                        />
                    </Text>
                </Box>
            )}
        </Stack>
    )
}

PaymentInstrument.propTypes = {
    instrument: PropTypes.object
}

export default PaymentInstrument

const processPaymentMethod = (instrument) => {
    switch (instrument.paymentMethodId) {
        case PAYMENT_METHODS_IDS.APS_HOSTED:
            return PAYMENT_METHODS_NAMES.APS_HOSTED
        case PAYMENT_METHODS_IDS.CREDIT_CARD:
        case PAYMENT_METHODS_IDS.APS_CARD:
            return PAYMENT_METHODS_NAMES.CARD
        default:
            return PAYMENT_METHOD_STATUSES.NOTIMPLEMENTED
    }
}
