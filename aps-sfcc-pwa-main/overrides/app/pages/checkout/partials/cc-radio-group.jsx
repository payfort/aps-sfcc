/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* Top Level */
import React, {useState, useRef} from 'react'
import PropTypes from 'prop-types'
import {FormattedMessage, useIntl, defineMessages} from 'react-intl'
import {useShopperCustomersMutation} from '@salesforce/commerce-sdk-react'

/* Chakra Components */
import {
    Box,
    Button,
    Stack,
    Text,
    SimpleGrid,
    FormControl,
    FormErrorMessage,
    FormLabel,
    useToast
} from '@chakra-ui/react'

/* Components */
import {PlusIcon} from '@salesforce/retail-react-app/app/components/icons'
import {RadioCard, RadioCardGroup} from '@salesforce/retail-react-app/app/components/radio-card'
import LoadingSpinner from '@salesforce/retail-react-app/app/components/loading-spinner'
import Field from '@salesforce/retail-react-app/app/components/field'

/* Hooks */
import useCreditCardFields from '@salesforce/retail-react-app/app/components/forms/useCreditCardFields'
import {useCurrentCustomer} from '@salesforce/retail-react-app/app/hooks/use-current-customer'

/* Utils */
import {getCreditCardIcon} from '@salesforce/retail-react-app/app/utils/cc-utils'

/* Constants */
import {API_ERROR_MESSAGE} from '../../../constants'

const SECURITY_CODE_FIELD_PROPS = {width: '7rem', size: 'sm', px: '0.5rem'}

const CCRadioGroup = ({
    form,
    value = '',
    isEditingPayment = false,
    togglePaymentEdit = () => null,
    onPaymentIdChange = () => null
}) => {
    const [loading, setLoading] = useState(false)
    // const {customer, creditCardFormControlRef} = useCheckout()

    const {data: customer} = useCurrentCustomer()
    const creditCardFormControlRef = useRef()
    const toast = useToast()
    const {formatMessage} = useIntl()

    const messages = defineMessages({
        successMessage: {defaultMessage: 'Successfully deleted credit card', id: 'payment_selection.deleted.credit_card'}
    })


    const fields = useCreditCardFields({form})

    const {mutateAsync: deleteCustomerPaymentInstrument} = useShopperCustomersMutation(
        'deleteCustomerPaymentInstrument'
    )
    const onRemove = async (paymentInstrumentId) => {
        setLoading(true)
        await deleteCustomerPaymentInstrument(
            {
                parameters: {customerId: customer.customerId, paymentInstrumentId}
            },
            {
                onError: () => {
                    toast({
                        title: formatMessage(API_ERROR_MESSAGE),
                        status: 'error',
                        position: 'top-right'
                    })
                },
                onSuccess: () => {
                    toast({
                        title: formatMessage(messages.successMessage),
                        status: 'success'
                    })
                },
                onSettled: () => {
                    setLoading(false)
                }
            }
        )
    }

    return (
        <FormControl
            id="paymentInstrumentId"
            isInvalid={form.formState.errors.paymentInstrumentId}
            isRequired={!isEditingPayment}
            ref={creditCardFormControlRef}
        >
            {form.formState.errors.paymentInstrumentId && (
                <FormErrorMessage marginTop={0} marginBottom={4}>
                    {form.formState.errors.paymentInstrumentId.message}
                </FormErrorMessage>
            )}

            <RadioCardGroup value={value} onChange={onPaymentIdChange}>
                {loading && <LoadingSpinner wrapperStyles={{height: '100%'}} />}
                <Stack spacing={4}>
                    <SimpleGrid columns={[1, 1, 2]} spacing={4}>
                        {customer.paymentInstruments?.map((payment) => {
                            const CardIcon = getCreditCardIcon(payment.paymentCard?.cardType)
                            const isSelected = value === payment.paymentInstrumentId
                            return (
                                <RadioCard
                                    key={payment.paymentInstrumentId}
                                    value={payment.paymentInstrumentId}
                                >
                                    <Stack direction="row">
                                        {CardIcon && <CardIcon layerStyle="ccIcon" />}
                                        <Stack spacing={2}>
                                            <Stack spacing={1}>
                                                <Text>{payment.paymentCard?.cardType}</Text>
                                                <Stack direction="row">
                                                    <Text>
                                                        &bull;&bull;&bull;&bull;{' '}
                                                        {payment.paymentCard?.numberLastDigits}
                                                    </Text>
                                                    <Text>
                                                        {payment.paymentCard?.expirationMonth}/
                                                        {payment.paymentCard?.expirationYear}
                                                    </Text>
                                                </Stack>
                                                <Text>{payment.paymentCard.holder}</Text>
                                            </Stack>

                                            {isSelected && (
                                                <Field
                                                    {...fields.securityCode}
                                                    formLabel={
                                                        <FormLabel>
                                                            {fields.securityCode.label}
                                                        </FormLabel>
                                                    }
                                                    type="text"
                                                    inputProps={({onChange}) => ({
                                                        ...fields.securityCode.inputProps({
                                                            onChange
                                                        }),
                                                        ...SECURITY_CODE_FIELD_PROPS
                                                    })}
                                                    inputGroupProps={{
                                                        width: SECURITY_CODE_FIELD_PROPS.width
                                                    }}
                                                />
                                            )}

                                            <Box>
                                                <Button
                                                    variant="link"
                                                    size="sm"
                                                    colorScheme="red"
                                                    onClick={() =>
                                                        onRemove(payment.paymentInstrumentId)
                                                    }
                                                >
                                                    <FormattedMessage
                                                        defaultMessage="Remove"
                                                        id="cc_radio_group.action.remove"
                                                    />
                                                </Button>
                                            </Box>
                                        </Stack>
                                    </Stack>
                                </RadioCard>
                            )
                        })}

                        {!isEditingPayment && (
                            <Button
                                variant="outline"
                                border="1px dashed"
                                borderColor="gray.200"
                                color="blue.600"
                                height={{lg: 'full'}}
                                minHeight={['44px', '44px', '154px']}
                                rounded="base"
                                fontWeight="medium"
                                leftIcon={<PlusIcon boxSize={'15px'} />}
                                onClick={togglePaymentEdit}
                            >
                                <FormattedMessage
                                    defaultMessage="Add New Card"
                                    id="cc_radio_group.button.add_new_card"
                                />
                            </Button>
                        )}
                    </SimpleGrid>
                </Stack>
            </RadioCardGroup>
        </FormControl>
    )
}

CCRadioGroup.propTypes = {
    /** The form object returned from `useForm` */
    form: PropTypes.object.isRequired,

    /** The current payment ID value */
    value: PropTypes.string,

    /** Flag for payment add/edit form, used for setting validation rules */
    isEditingPayment: PropTypes.bool,

    /** Method for toggling the payment add/edit form */
    togglePaymentEdit: PropTypes.func,

    /** Callback for notifying on value change */
    onPaymentIdChange: PropTypes.func
}

export default CCRadioGroup
