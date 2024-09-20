/* Top Level */
import React, {useEffect, useState} from 'react'
import PropTypes from 'prop-types'

import {FormattedMessage, useIntl} from 'react-intl'
import {Controller} from 'react-hook-form'

/* Chakra Components */
import {Box, Stack, Heading, Button, Container} from '@chakra-ui/react'

/* Components */
import CCRadioGroup from '../cc-radio-group'
import CreditCardFields from '../../../../components/forms/credit-card-fields'

/* Constants */
import {PAYMENT_METHODS_IDS} from '../../../../constants'

export const CreditCard = ({
    form,
    hideSubmitButton,
    selectedPaymentMethod,
    selectedPaymentProcessor,
    customer
}) => {
    const {formatMessage} = useIntl()
    const [isCreditCardSelected, setIsCreditCardSelected] = useState(
        selectedPaymentMethod === PAYMENT_METHODS_IDS.CREDIT_CARD
    )

    const hasSavedCards = customer?.paymentInstruments?.length > 0
    const [isEditingPayment, setIsEditingPayment] = useState(!hasSavedCards)

    useEffect(() => {
        const currSelected = selectedPaymentMethod === PAYMENT_METHODS_IDS.CREDIT_CARD

        // Reset credit card form on selecting another payment method
        if (!currSelected) {
            form.reset({paymentInstrumentId: ''})
            setIsCreditCardSelected(currSelected)
            setIsEditingPayment(false)
        } else {
            setIsCreditCardSelected(true)

            // Show credit card form
            if (!hasSavedCards && !isEditingPayment) {
                setIsEditingPayment(true)
            }
        }
    }, [selectedPaymentMethod])

    // Opens/closes the 'add payment' form. Notice that when toggling either state,
    // we reset the form so as to remove any payment selection.
    const togglePaymentEdit = (showCreditCardForm) => {
        const isEditing = showCreditCardForm ?? !isEditingPayment

        form.reset({paymentInstrumentId: ''})
        setIsEditingPayment(isEditing)
        form.trigger()
    }

    // Acts as our `onChange` handler for paymentInstrumentId radio group. We do this
    // manually here so we can toggle off the 'add payment' form as needed.
    const onPaymentIdChange = (value) => {
        if (value && isEditingPayment) {
            togglePaymentEdit()
        }
        form.reset({paymentInstrumentId: value})
    }

    return (
        <Box
            p={[4, 4, 6]}
            borderBottom="1px solid"
            borderColor="gray.100"
            display={isCreditCardSelected ? 'block' : 'none'}
        >
            <Stack spacing={6}>
                {hasSavedCards && (
                    <Controller
                        name="paymentInstrumentId"
                        defaultValue=""
                        control={form.control}
                        rules={{
                            required:
                                !isEditingPayment && isCreditCardSelected
                                    ? formatMessage({
                                          defaultMessage: 'Please select a payment method.',
                                          id: 'payment_selection.message.select_payment_method'
                                      })
                                    : false
                        }}
                        render={({field: {value}}) => (
                            <CCRadioGroup
                                form={form}
                                value={value}
                                isEditingPayment={isEditingPayment}
                                togglePaymentEdit={togglePaymentEdit}
                                onPaymentIdChange={onPaymentIdChange}
                            />
                        )}
                    />
                )}
                <Box style={{display: 'none'}}>
                    <Controller
                        name="paymentProcessorId"
                        defaultValue={selectedPaymentProcessor}
                        control={form.control}
                        render={() => <></>}
                    />
                </Box>

                {isEditingPayment && (
                    <Box
                        {...(hasSavedCards && {
                            px: [4, 4, 6],
                            py: 6,
                            rounded: 'base',
                            border: '1px solid',
                            borderColor: 'blue.600'
                        })}
                    >
                        <Stack spacing={6}>
                            {hasSavedCards && (
                                <Heading as="h3" size="sm">
                                    <FormattedMessage
                                        defaultMessage="Add New Card"
                                        id="payment_selection.heading.add_new_card"
                                    />
                                </Heading>
                            )}
                            {selectedPaymentMethod === PAYMENT_METHODS_IDS.CREDIT_CARD && (
                                <CreditCardFields form={form} />
                            )}
                            {!hideSubmitButton && (
                                <Box>
                                    <Container variant="form">
                                        <Button
                                            isLoading={form.formState.isSubmitting}
                                            type="submit"
                                            w="full"
                                        >
                                            <FormattedMessage
                                                defaultMessage="Save & Continue"
                                                id="payment_selection.button.save_and_continue"
                                            />
                                        </Button>
                                    </Container>
                                </Box>
                            )}
                        </Stack>
                    </Box>
                )}
            </Stack>
        </Box>
    )
}

CreditCard.propTypes = {
    form: PropTypes.object,
    hideSubmitButton: PropTypes.bool,
    selectedPaymentMethod: PropTypes.string,
    selectedPaymentProcessor: PropTypes.string,
    customer: PropTypes.object
}

export default CreditCard
