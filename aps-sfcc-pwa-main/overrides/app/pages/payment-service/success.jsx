import React, {useState, useEffect} from 'react'
import {useHistory, useParams} from 'react-router-dom'

import {useOrder} from '@salesforce/commerce-sdk-react'

import {Skeleton} from '@chakra-ui/react'

/**
 * PSP success redirect page component
 */
const PaymentServiceSuccess = () => {
    const {basketId} = useParams()
    const history = useHistory()
    const [orderNo, setOrderNo] = useState(null)
    const {data: order} = useOrder(
        {
            parameters: {orderNo}
        },
        {
            enabled: !!orderNo
        }
    )

    useEffect(() => {
        if (!orderNo) {
            const orderId = sessionStorage.getItem('orderNo')
            setOrderNo(orderId)
        }

        if (!basketId) {
            history.replace('/not-found')
        }
        if (order) {
            history.replace(`/checkout/confirmation/${order.orderNo}`)
        }
    }, [order, basketId, orderNo])

    return <Skeleton height="75vh" width="100%" />
}

export default PaymentServiceSuccess
