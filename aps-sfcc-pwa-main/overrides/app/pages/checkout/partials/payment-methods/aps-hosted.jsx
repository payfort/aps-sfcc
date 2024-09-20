import React, {useEffect} from 'react'
import PropTypes from 'prop-types'
import {FormattedMessage} from 'react-intl'

import {Box, Stack, Text} from '@chakra-ui/react'

import {PAYMENT_METHODS_IDS, SITE_PREFERENCES} from '../../../../constants'

export const APSHosted = ({selectedPaymentMethod}) => {
    if (SITE_PREFERENCES.APS_ENABLED && SITE_PREFERENCES.APS_HOSTED_ENABLED) {
        return (
            <Box display={selectedPaymentMethod === PAYMENT_METHODS_IDS.APS_HOSTED ? 'block' : 'none'}>
                <Stack padding={4}>
                    <Box>
                        <Text>
                            <FormattedMessage
                                defaultMessage="You will be redirected"
                                id="checkout_payment.heading.aps_redirect"
                            />
                        </Text>
                    </Box>
                </Stack>
            </Box>
        )
    } else {
        return null
    }
}

APSHosted.propTypes = {
    selectedPaymentMethod: PropTypes.string
}

export default APSHosted
