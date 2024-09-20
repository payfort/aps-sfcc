import React, {useEffect} from 'react'

import {defineMessage} from 'react-intl'
import {useHistory} from 'react-router-dom'
import {useCurrentBasket} from '@salesforce/retail-react-app/app/hooks/use-current-basket'

import {Skeleton} from '@chakra-ui/react'

/**
 * PSP cancel redirect page component
 */
export default function PaymentServiceCancel() {
    const history = useHistory()
    const {data: basket} = useCurrentBasket()

    useEffect(() => {
        if (basket) {
            try {
                const result = {
                    error: defineMessage({
                        defaultMessage: 'There was an error while processing the payment request.',
                        id: 'checkout_payment.error_message'
                    }),
                    type: 'psp-cancel',
                    step: 'REVIEW_ORDER'
                }
                history.replace('/checkout', {state: result})
            } catch (e) {

            }
        }
    }, [basket])

    return <Skeleton height="75vh" width="100%" />
}
