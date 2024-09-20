/* Top Level */
import React, {useEffect} from 'react'
import PropTypes from 'prop-types'

/* Hooks */
import {useCurrentCustomer} from '@salesforce/retail-react-app/app/hooks/use-current-customer'

/* Chakra Components */
import {Box, RadioGroup, Stack} from '@chakra-ui/react'

/* Conponents */
import PaymentMethod from './payment-method'
import {usePaymentMethodsForBasket} from '@salesforce/commerce-sdk-react'

const PaymentSelection = ({
    form,
    basket,
    hideSubmitButton,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    setApplePayData
}) => {
    const {data: customer} = useCurrentCustomer()
    const {data: paymentMethods} = usePaymentMethodsForBasket({
        parameters: {
            basketId: basket?.basketId
        }
    })

    useEffect(() => {
        let paymentMethodId = basket?.paymentInstruments?.[0]?.paymentMethodId
        if (!paymentMethodId) {
            setSelectedPaymentMethod(paymentMethods?.applicablePaymentMethods[0].id)
        }
    }, [])

    return (
        <form noValidate>
            <Stack spacing={8}>
                <Stack spacing={5}>
                    <Box border="1px solid" borderColor="gray.100" rounded="base" overflow="hidden">
                        <RadioGroup
                            value={selectedPaymentMethod}
                            onChange={setSelectedPaymentMethod}
                        >
                            {paymentMethods?.applicablePaymentMethods?.map(
                                (applicablePaymentMethod) => (
                                    <PaymentMethod
                                        key={applicablePaymentMethod.id}
                                        customer={customer}
                                        paymentData={{
                                            paymentMethod: applicablePaymentMethod,
                                            basket,
                                            form,
                                            hideSubmitButton
                                        }}
                                        selectedPaymentMethod={selectedPaymentMethod}
                                        setApplePayData={setApplePayData}
                                    />
                                )
                            )}
                        </RadioGroup>
                    </Box>
                </Stack>
            </Stack>
        </form>
    )
}

PaymentSelection.propTypes = {
    /** The form object returnd from `useForm` */
    form: PropTypes.object,
    selectedPaymentMethod: PropTypes.string,
    setSelectedPaymentMethod: PropTypes.func,
    setApplePayData: PropTypes.func,

    /** Show or hide the submit button (for controlling the form from outside component) */
    hideSubmitButton: PropTypes.bool,

    /** Callback for form submit */
    onSubmit: PropTypes.func,

    /**The current basket object */
    basket: PropTypes.object
}

export default PaymentSelection
