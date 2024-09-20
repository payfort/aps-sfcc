/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import React, {useState, useRef, useEffect} from 'react'
import PropTypes from 'prop-types'
import {FormattedMessage, useIntl} from 'react-intl'
import {
    Box,
    Button,
    Checkbox,
    Container,
    Heading,
    Stack,
    Text,
    Divider
} from '@salesforce/retail-react-app/app/components/shared/ui'
import {useForm} from 'react-hook-form'
import {useToast} from '@salesforce/retail-react-app/app/hooks/use-toast'
import {useShopperBasketsMutation} from '@salesforce/commerce-sdk-react'
import {useCurrentBasket} from '@salesforce/retail-react-app/app/hooks/use-current-basket'
import {useCheckout} from '@salesforce/retail-react-app/app/pages/checkout/util/checkout-context'
import {
    getPaymentInstrumentCardType,
    getCreditCardIcon
} from '@salesforce/retail-react-app/app/utils/cc-utils'
import {
    ToggleCard,
    ToggleCardEdit,
    ToggleCardSummary
} from '@salesforce/retail-react-app/app/components/toggle-card'
import ShippingAddressSelection from '@salesforce/retail-react-app/app/pages/checkout/partials/shipping-address-selection'
import AddressDisplay from '@salesforce/retail-react-app/app/components/address-display'
import {PromoCode, usePromoCode} from '@salesforce/retail-react-app/app/components/promo-code'
import {API_ERROR_MESSAGE} from '@salesforce/retail-react-app/app/constants'

// OVERRIDE START
import {useCurrentCustomer} from '@salesforce/retail-react-app/app/hooks/use-current-customer'
import PaymentSelection from './payment-selection'
import {PAYMENT_METHODS_IDS, SITE_PREFERENCES} from '../../../constants'
import {getTokenMetaParams, parseAPSTokenResponse} from '../../../utils/apsHelper'
// OVERRIDE END

const Payment = ({submitOrderApplePay}) => {
    const {formatMessage} = useIntl()
    const {data: basket} = useCurrentBasket()
    const selectedShippingAddress = basket?.shipments && basket?.shipments[0]?.shippingAddress
    const selectedBillingAddress = basket?.billingAddress
    const appliedPayment = basket?.paymentInstruments && basket?.paymentInstruments[0]
    const [billingSameAsShipping, setBillingSameAsShipping] = useState(true) // By default, have billing addr to be the same as shipping
    const {mutateAsync: addPaymentInstrumentToBasket} = useShopperBasketsMutation(
        'addPaymentInstrumentToBasket'
    )
    const {mutateAsync: updateBillingAddressForBasket} = useShopperBasketsMutation(
        'updateBillingAddressForBasket'
    )
    const {mutateAsync: removePaymentInstrumentFromBasket} = useShopperBasketsMutation(
        'removePaymentInstrumentFromBasket'
    )

    const showToast = useToast()
    const showError = () => {
        showToast({
            title: formatMessage(API_ERROR_MESSAGE),
            status: 'error'
        })
    }

    const {step, STEPS, goToStep, goToNextStep} = useCheckout()

    const billingAddressForm = useForm({
        mode: 'onChange',
        shouldUnregister: false,
        defaultValues: {...selectedBillingAddress}
    })

    // OVERRIDE START
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null)
    const [applePayData, setApplePayData] = useState()
    const {data: customer} = useCurrentCustomer()
    const paymentSelectionRef = useRef()

    // Using destructuring to remove properties from the object...
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {removePromoCode, ...promoCodeProps} = usePromoCode()

    const paymentMethodForm = useForm()

    useEffect(() => {
        if (
            applePayData &&
            (selectedPaymentMethod === PAYMENT_METHODS_IDS.APPLE_PAY ||
                selectedPaymentMethod === PAYMENT_METHODS_IDS.APS_APPLE_PAY)
        ) {
            const submit = async () => {
                await onSubmit()
                await submitOrderApplePay()
            }
            submit()
        }
    }, [applePayData])

    const onBillingSubmit = async () => {
        const isFormValid = await billingAddressForm.trigger()

        if (!isFormValid) {
            return
        }
        const billingAddress = billingSameAsShipping
            ? selectedShippingAddress
            : billingAddressForm.getValues()
        // Using destructuring to remove properties from the object...
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {addressId, creationDate, lastModified, preferred, ...address} = billingAddress

        return updateBillingAddressForBasket({
            body: address,
            parameters: {basketId: basket.basketId, shipmentId: 'me'}
        })
    }

    const createPaymentInstrument = async ({
        instrument,
        paymentProcessorId,
        isSaved,
        securityCode
    }) => {
        let paymentInstrument = {}

        if (selectedPaymentMethod === PAYMENT_METHODS_IDS.CREDIT_CARD) {
            if (isSaved) {
                const {paymentCard} = instrument
                if (!paymentCard.creditCardExpired) {
                    paymentInstrument.paymentCard = {
                        securityCode: securityCode
                    }
                    paymentInstrument.amount = 1
                    paymentInstrument.customerPaymentInstrumentId = instrument.paymentInstrumentId
                } else {
                    // show some error
                }
            } else {
                const [expirationMonth, expirationYear] = instrument.expiry.split('/')
                const tokenParams = await getTokenMetaParams('en')

                const requestBody = new URLSearchParams()
                requestBody.append('service_command', tokenParams.service_command)
                requestBody.append('access_code', tokenParams.access_code)
                requestBody.append('merchant_identifier', tokenParams.merchant_identifier)
                requestBody.append('merchant_reference', tokenParams.merchant_reference)
                requestBody.append('language', tokenParams.language)
                requestBody.append('return_url', tokenParams.return_url)
                requestBody.append('signature', tokenParams.signature)
                requestBody.append('card_number', instrument.number.replace(/\s+/g, ''))
                requestBody.append('card_security_code', instrument.securityCode)
                requestBody.append('card_holder_name', instrument.holder)
                requestBody.append('expiry_date', expirationYear + expirationMonth)

                const tokenResponse = await fetch(SITE_PREFERENCES.APS_MERCHANT_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: requestBody.toString()
                })
                const data = await tokenResponse.text()
                const parsedResponse = parseAPSTokenResponse(data)

                if (parsedResponse.status !== '00') {
                    paymentInstrument.paymentCard = {
                        holder: instrument.holder,
                        maskedNumber: parsedResponse.card_number,
                        cardType: getPaymentInstrumentCardType(instrument.cardType),
                        expirationMonth: parseInt(expirationMonth),
                        expirationYear: parseInt(`20${expirationYear}`),
                        securityCode: instrument.securityCode,
                        creditCardToken: parsedResponse.token_name,
                        // TODO: These fields are required for saving the card to the customer's
                        // account. Im not sure what they are for or how to get them, so for now
                        // we're just passing some values to make it work. Need to investigate.
                        issueNumber: 'i117',
                        validFromMonth: 1,
                        validFromYear: 2020
                    }
                    paymentInstrument.c_saveCard = instrument?.saveCard || false
                    paymentInstrument.amount = 1

                    if (paymentProcessorId === 'APS_CARD') {
                        paymentInstrument.c_cardNumber = instrument.number.replace(/\s/g, '')
                    }
                }
            }
        }

        if (
            selectedPaymentMethod === PAYMENT_METHODS_IDS.APPLE_PAY ||
            selectedPaymentMethod === PAYMENT_METHODS_IDS.APS_APPLE_PAY
        ) {
            paymentInstrument.c_apsPaymentData = JSON.stringify(applePayData)
        }

        paymentInstrument = {
            ...paymentInstrument,
            paymentMethodId: selectedPaymentMethod
        }

        return paymentInstrument
    }

    const onSubmit = paymentMethodForm.handleSubmit(async (formValues) => {
        let paymentInstrument

        if (formValues.paymentInstrumentId) {
            const existingInstrument = customer.paymentInstruments.find(
                (instrument) => instrument.paymentInstrumentId === formValues.paymentInstrumentId
            )

            paymentInstrument = await createPaymentInstrument({
                instrument: existingInstrument,
                paymentProcessorId: formValues.paymentProcessorId,
                isSaved: true,
                securityCode: formValues.securityCode
            })
        } else {
            paymentInstrument = await createPaymentInstrument({
                instrument: formValues,
                paymentProcessorId: formValues.paymentProcessorId,
                isSaved: false,
                securityCode: null
            })
        }

        try {
            if (appliedPayment) {
                await removePaymentInstrumentFromBasket({
                    parameters: {
                        basketId: basket?.basketId,
                        paymentInstrumentId: appliedPayment.paymentInstrumentId
                    }
                })
            }
            await addPaymentInstrumentToBasket({
                parameters: {basketId: basket?.basketId},
                body: paymentInstrument
            })
            await onBillingSubmit()
            goToNextStep()
        } catch (e) {
            showError()
        }
    })

    // OVERRIDE END

    return (
        <ToggleCard
            id="step-3"
            title={formatMessage({defaultMessage: 'Payment', id: 'checkout_payment.title.payment'})}
            editing={step === STEPS.PAYMENT}
            isLoading={
                paymentMethodForm.formState.isSubmitting ||
                billingAddressForm.formState.isSubmitting
            }
            disabled={appliedPayment == null}
            onEdit={() => goToStep(STEPS.PAYMENT)}
        >
            <ToggleCardEdit>
                <Box mt={-2} mb={4}>
                    <PromoCode {...promoCodeProps} itemProps={{border: 'none'}} />
                </Box>

                <Stack spacing={6} ref={paymentSelectionRef}>
                    {/** OVERRIDE START */}

                    <PaymentSelection
                        form={paymentMethodForm}
                        basket={basket}
                        selectedPaymentMethod={selectedPaymentMethod}
                        setSelectedPaymentMethod={setSelectedPaymentMethod}
                        setApplePayData={setApplePayData}
                        hideSubmitButton
                    />

                    {/** OVERRIDE END */}

                    <Divider borderColor="gray.100" />

                    <Stack spacing={2}>
                        <Heading as="h3" fontSize="md">
                            <FormattedMessage
                                defaultMessage="Billing Address"
                                id="checkout_payment.heading.billing_address"
                            />
                        </Heading>

                        <Checkbox
                            name="billingSameAsShipping"
                            isChecked={billingSameAsShipping}
                            onChange={(e) => setBillingSameAsShipping(e.target.checked)}
                        >
                            <Text fontSize="sm" color="gray.700">
                                <FormattedMessage
                                    defaultMessage="Same as shipping address"
                                    id="checkout_payment.label.same_as_shipping"
                                />
                            </Text>
                        </Checkbox>

                        {billingSameAsShipping && selectedShippingAddress && (
                            <Box ps={7}>
                                <AddressDisplay address={selectedShippingAddress} />
                            </Box>
                        )}
                    </Stack>

                    {!billingSameAsShipping && (
                        <ShippingAddressSelection
                            form={billingAddressForm}
                            selectedAddress={selectedBillingAddress}
                            hideSubmitButton
                        />
                    )}

                    <Box pt={3}>
                        <Container variant="form">
                            <Button w="full" onClick={onSubmit}>
                                <FormattedMessage
                                    defaultMessage="Review Order"
                                    id="checkout_payment.button.review_order"
                                />
                            </Button>
                        </Container>
                    </Box>
                </Stack>
            </ToggleCardEdit>

            <ToggleCardSummary>
                <Stack spacing={6}>
                    {/** OVERRIDE START */}

                    {appliedPayment && appliedPayment?.paymentCard && (
                        <Stack spacing={3}>
                            <Heading as="h3" fontSize="md">
                                <FormattedMessage
                                    defaultMessage="Credit Card"
                                    id="checkout_payment.heading.credit_card"
                                />
                            </Heading>
                            <PaymentCardSummary payment={appliedPayment} />
                        </Stack>
                    )}

                    {SITE_PREFERENCES.APS_ENABLED &&
                        SITE_PREFERENCES.APS_HOSTED_ENABLED &&
                        appliedPayment &&
                        appliedPayment?.paymentMethodId === PAYMENT_METHODS_IDS.APS_HOSTED && (
                            <Stack spacing={3}>
                                <Heading as="h3" fontSize="md">
                                    <FormattedMessage
                                        defaultMessage="Amazon Payment Services"
                                        id="checkout_payment.heading.aps"
                                    />
                                    <form
                                        noValidate
                                        method="post"
                                        action={SITE_PREFERENCES.APS_MERCHANT_URL}
                                        id="aps-hosted-form"
                                        style={{display: 'none'}}
                                    ></form>
                                </Heading>
                            </Stack>
                        )}
                    {SITE_PREFERENCES.APS_ENABLED &&
                        SITE_PREFERENCES.APS_APPLE_PAY_ENABLED &&
                        appliedPayment &&
                        appliedPayment?.paymentMethodId === PAYMENT_METHODS_IDS.APPLE_PAY && (
                            <Stack spacing={3}>
                                <Heading as="h3" fontSize="md">
                                    <FormattedMessage
                                        defaultMessage="Amazon Payment Services"
                                        id="checkout_payment.heading.aps"
                                    />
                                </Heading>
                            </Stack>
                        )}

                    {/** OVERRIDE END */}

                    <Divider borderColor="gray.100" />
                    {selectedBillingAddress && (
                        <Stack spacing={2}>
                            <Heading as="h3" fontSize="md">
                                <FormattedMessage
                                    defaultMessage="Billing Address"
                                    id="checkout_payment.heading.billing_address"
                                />
                            </Heading>
                            <AddressDisplay address={selectedBillingAddress} />
                        </Stack>
                    )}
                </Stack>
            </ToggleCardSummary>
        </ToggleCard>
    )
}

const PaymentCardSummary = ({payment}) => {
    const CardIcon = getCreditCardIcon(payment?.paymentCard?.cardType)
    return (
        <Stack direction="row" alignItems="center" spacing={3}>
            {CardIcon && <CardIcon layerStyle="ccIcon" />}

            <Stack direction="row">
                <Text>{payment.paymentCard.cardType}</Text>
                <Text>&bull;&bull;&bull;&bull; {payment.paymentCard.numberLastDigits}</Text>
                <Text>
                    {payment.paymentCard.expirationMonth}/{payment.paymentCard.expirationYear}
                </Text>
            </Stack>
        </Stack>
    )
}

PaymentCardSummary.propTypes = {payment: PropTypes.object}

/**
 * PropTypes definition
 */

Payment.propTypes = {
    submitOrderApplePay: PropTypes.func
}

export default Payment
