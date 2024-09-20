import React, {useEffect} from 'react'

import {defineMessage} from 'react-intl'
import {useHistory} from 'react-router-dom'
import {useCurrentBasket} from '@salesforce/retail-react-app/app/hooks/use-current-basket'

import {Skeleton} from '@chakra-ui/react'

/**
 * PSP failure redirect page component
 */
export default function PaymentServiceFailure() {
    const history = useHistory()
    const {data: basket} = useCurrentBasket()

    useEffect(() => {
        if (basket) {
            try {
                const result = {
                    step: 'REVIEW_ORDER',
                    error: defineMessage({
                        defaultMessage: 'There was an error while processing the payment request.',
                        id: 'checkout_payment.error_message'
                    })
                }

                if (basket.paymentInstruments[0].paymentMethodId === 'CREDIT_CARD') {
                    result.step = 'PAYMENT'
                    result.isCreditCard = true
                }

                history.replace('/checkout', {state: result})
            } catch (e) {

            }
        }
    }, [basket])

    return <Skeleton height="75vh" width="100%" />
}
