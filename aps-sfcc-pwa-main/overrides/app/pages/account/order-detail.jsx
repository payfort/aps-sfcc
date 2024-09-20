import React, {useState, useEffect} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'
import {useHistory, useRouteMatch} from 'react-router'
import {
    Box,
    Heading,
    Text,
    Stack,
    Badge,
    Flex,
    Button,
    Divider,
    Grid,
    SimpleGrid,
    Skeleton
} from '@salesforce/retail-react-app/app/components/shared/ui'
import {useOrder, useProducts} from '@salesforce/commerce-sdk-react'
import {ChevronLeftIcon} from '@salesforce/retail-react-app/app/components/icons'
import Link from '@salesforce/retail-react-app/app/components/link'
import OrderSummary from '@salesforce/retail-react-app/app/components/order-summary'
import ItemVariantProvider from '@salesforce/retail-react-app/app/components/item-variant'
import CartItemVariantImage from '@salesforce/retail-react-app/app/components/item-variant/item-image'
import CartItemVariantName from '@salesforce/retail-react-app/app/components/item-variant/item-name'
import CartItemVariantAttributes from '@salesforce/retail-react-app/app/components/item-variant/item-attributes'
import CartItemVariantPrice from '@salesforce/retail-react-app/app/components/item-variant/item-price'
import {useCurrentCustomer} from '@salesforce/retail-react-app/app/hooks/use-current-customer'
import PropTypes from 'prop-types'

// OVERRIDE START
import {PaymentInstrument} from './payment-instrument'
// OVERRIDE END

const onClient = typeof window !== 'undefined'

const OrderProducts = ({productItems, currency}) => {
    const productItemsMap = productItems.reduce(
        (map, item) => ({...map, [item.productId]: item}),
        {}
    )
    const ids = Object.keys(productItemsMap).join(',') ?? ''
    const {data: {data: products} = {}, isLoading} = useProducts(
        {
            parameters: {
                ids: ids
            }
        },
        {
            enabled: !!ids && onClient
        }
    )

    const variants = products?.map((product) => {
        const productItem = productItemsMap[product.id]
        return {
            ...productItem,
            ...product,
            price: productItem.price
        }
    })

    return (
        <>
            {!isLoading &&
                variants?.map((variant, index) => {
                    return (
                        <Box
                            p={[4, 6]}
                            key={index}
                            border="1px solid"
                            borderColor="gray.100"
                            borderRadius="base"
                        >
                            <ItemVariantProvider variant={variant} currency={currency}>
                                <Flex width="full" alignItems="flex-start">
                                    <CartItemVariantImage width={['88px', 36]} mr={4} />
                                    <Stack spacing={1} marginTop="-3px" flex={1}>
                                        <CartItemVariantName />
                                        <Flex
                                            width="full"
                                            justifyContent="space-between"
                                            alignItems="flex-end"
                                        >
                                            <CartItemVariantAttributes
                                                includeQuantity
                                                currency={currency}
                                            />
                                            <CartItemVariantPrice currency={currency} />
                                        </Flex>
                                    </Stack>
                                </Flex>
                            </ItemVariantProvider>
                        </Box>
                    )
                })}
        </>
    )
}

OrderProducts.propTypes = {
    productItems: PropTypes.array.isRequired,
    currency: PropTypes.string
}

// TREAT THE BELOW COMPONENT AS A FULL OVERRIDE
// Future improvement: This could be split into sub components to make it easier to read (template is too large)
const AccountOrderDetail = ({guestOrder}) => {
    const {params} = useRouteMatch()
    const history = useHistory()
    const {formatMessage, formatDate} = useIntl()
    const [order, setOrder] = useState(null)

    const {data: customer} = useCurrentCustomer()
    const {data: registeredOrder} = useOrder(
        {
            parameters: {orderNo: params.orderNo}
        },
        {
            enabled: onClient && !!params.orderNo
        }
    )

    useEffect(() => {
        if (guestOrder) {
            setOrder(guestOrder)
        } else {
            setOrder(registeredOrder)
        }
    }, [guestOrder, registeredOrder])

    return (
        <Stack spacing={6} data-testid="account-order-details-page">
            <Stack>
                {customer.isRegistered && (
                    <Box>
                        <Link to={'/account/orders'}>
                            <Button
                                variant="link"
                                leftIcon={<ChevronLeftIcon />}
                                size="sm"
                                onClick={(e) => {
                                    if (history.action === 'PUSH') {
                                        e.preventDefault()
                                        history.goBack()
                                    }
                                }}
                            >
                                <FormattedMessage
                                    defaultMessage="Back to Order History"
                                    id="account_order_detail.link.back_to_history"
                                />
                            </Button>
                        </Link>
                    </Box>
                )}

                <Stack spacing={[1, 2]}>
                    <Heading as="h1" fontSize={['lg', '2xl']}>
                        <FormattedMessage
                            defaultMessage="Order Details"
                            id="account_order_detail.title.order_details"
                        />
                    </Heading>

                    {order ? (
                        <Stack
                            direction={['column', 'row']}
                            alignItems={['flex-start', 'center']}
                            spacing={[0, 3]}
                            divider={
                                <Divider
                                    visibility={{base: 'hidden', lg: 'visible'}}
                                    orientation={{lg: 'vertical'}}
                                    h={[0, 4]}
                                />
                            }
                        >
                            <Text fontSize={['sm', 'md']}>
                                <FormattedMessage
                                    defaultMessage="Ordered: {date}"
                                    id="account_order_detail.label.ordered_date"
                                    values={{
                                        date: order.creationDate
                                            ? formatDate(new Date(order.creationDate), {
                                                  year: 'numeric',
                                                  day: 'numeric',
                                                  month: 'short'
                                              })
                                            : 'N/A'
                                    }}
                                />
                            </Text>
                            <Stack direction="row" alignItems="center">
                                <Text fontSize={['sm', 'md']}>
                                    <FormattedMessage
                                        defaultMessage="Order Number: {orderNumber}"
                                        id="account_order_detail.label.order_number"
                                        values={{orderNumber: order.orderNo}}
                                    />
                                </Text>
                                <Badge colorScheme="green">{order.status}</Badge>
                                {order.c_carriyoTrackingUrl && (
                                    <Link to={order.c_carriyoTrackingUrl}>
                                        <Button variant="outline" size="xs" h={5}>
                                            <FormattedMessage
                                                defaultMessage="Track Order"
                                                id="account_order_detail.link.track_order"
                                            />
                                        </Button>
                                    </Link>
                                )}
                            </Stack>
                        </Stack>
                    ) : (
                        <Skeleton h="20px" w="192px" />
                    )}
                </Stack>
            </Stack>

            <Box layerStyle="cardBordered">
                <Grid templateColumns={{base: '1fr', xl: '60% 1fr'}} gap={{base: 6, xl: 2}}>
                    <SimpleGrid columns={{base: 1, sm: 2}} columnGap={4} rowGap={5} py={{xl: 6}}>
                        {!order ? (
                            <>
                                <Stack>
                                    <Skeleton h="20px" w="84px" />
                                    <Skeleton h="20px" w="112px" />
                                    <Skeleton h="20px" w="56px" />
                                </Stack>
                                <Stack>
                                    <Skeleton h="20px" w="84px" />
                                    <Skeleton h="20px" w="56px" />
                                </Stack>
                                <Stack>
                                    <Skeleton h="20px" w="112px" />
                                    <Skeleton h="20px" w="84px" />
                                    <Skeleton h="20px" w="56px" />
                                </Stack>
                                <Stack>
                                    <Skeleton h="20px" w="60px" />
                                    <Skeleton h="20px" w="84px" />
                                    <Skeleton h="20px" w="56px" />
                                </Stack>
                            </>
                        ) : (
                            <>
                                {order.shipments.length && order.shipments[0] && (
                                    <Stack spacing={1}>
                                        <Text fontWeight="bold" fontSize="sm">
                                            <FormattedMessage
                                                defaultMessage="Shipping Method"
                                                id="account_order_detail.heading.shipping_method"
                                            />
                                        </Text>
                                        <Box>
                                            <Text fontSize="sm" textTransform="titlecase">
                                                {
                                                    {
                                                        not_shipped: formatMessage({
                                                            defaultMessage: 'Not shipped',
                                                            id: 'account_order_detail.shipping_status.not_shipped'
                                                        }),

                                                        part_shipped: formatMessage({
                                                            defaultMessage: 'Partially shipped',
                                                            id: 'account_order_detail.shipping_status.part_shipped'
                                                        }),
                                                        shipped: formatMessage({
                                                            defaultMessage: 'Shipped',
                                                            id: 'account_order_detail.shipping_status.shipped'
                                                        })
                                                    }[order.shipments[0].shippingStatus]
                                                }
                                            </Text>
                                            <Text fontSize="sm">
                                                {order.shipments[0].shippingMethod.name}
                                            </Text>
                                            <Text fontSize="sm">
                                                <FormattedMessage
                                                    defaultMessage="Tracking Number"
                                                    id="account_order_detail.label.tracking_number"
                                                />
                                                :{' '}
                                                {order.shipments[0].trackingNumber ||
                                                    formatMessage({
                                                        defaultMessage: 'Pending',
                                                        id: 'account_order_detail.label.pending_tracking_number'
                                                    })}
                                            </Text>
                                        </Box>
                                    </Stack>
                                )}

                                {order.paymentInstruments.length && order.paymentInstruments[0] && (
                                    <Stack spacing={1}>
                                        <Text fontWeight="bold" fontSize="sm">
                                            <FormattedMessage
                                                defaultMessage="Payment Method"
                                                id="account_order_detail.heading.payment_method"
                                            />
                                        </Text>
                                        <PaymentInstrument
                                            instrument={order?.paymentInstruments[0]}
                                        />
                                    </Stack>
                                )}

                                {order.shipments.length && order.shipments[0] && (
                                    <Stack spacing={1}>
                                        <Text fontWeight="bold" fontSize="sm">
                                            <FormattedMessage
                                                defaultMessage="Shipping Address"
                                                id="account_order_detail.heading.shipping_address"
                                            />
                                        </Text>
                                        <Box>
                                            <Text fontSize="sm">
                                                {order.shipments[0].shippingAddress.firstName}{' '}
                                                {order.shipments[0].shippingAddress.lastName}
                                            </Text>
                                            <Text fontSize="sm">
                                                {order.shipments[0].shippingAddress.address1}
                                            </Text>
                                            <Text fontSize="sm">
                                                {order.shipments[0].shippingAddress.city},{' '}
                                                {order.shipments[0].shippingAddress.stateCode}{' '}
                                                {order.shipments[0].shippingAddress.postalCode}
                                            </Text>
                                        </Box>
                                    </Stack>
                                )}

                                <Stack spacing={1}>
                                    <Text fontWeight="bold" fontSize="sm">
                                        <FormattedMessage
                                            defaultMessage="Billing Address"
                                            id="account_order_detail.heading.billing_address"
                                        />
                                    </Text>
                                    <Box>
                                        <Text fontSize="sm">
                                            {order.billingAddress.firstName}{' '}
                                            {order.billingAddress.lastName}
                                        </Text>
                                        <Text fontSize="sm">{order.billingAddress.address1}</Text>
                                        <Text fontSize="sm">
                                            {order.billingAddress.city},{' '}
                                            {order.billingAddress.stateCode}{' '}
                                            {order.billingAddress.postalCode}
                                        </Text>
                                    </Box>
                                </Stack>
                            </>
                        )}
                    </SimpleGrid>

                    {order ? (
                        <Box
                            py={{base: 6}}
                            px={{base: 6, xl: 8}}
                            background="gray.50"
                            borderRadius="base"
                        >
                            <OrderSummary basket={order} fontSize="sm" />
                        </Box>
                    ) : (
                        <Skeleton h="full" />
                    )}
                </Grid>
            </Box>

            <Stack spacing={4}>
                {order && (
                    <Text>
                        <FormattedMessage
                            defaultMessage="{count} items"
                            values={{
                                count: order.productItems.reduce((c, i) => i.quantity + c, 0) || 0
                            }}
                            id="account_order_detail.heading.num_of_items"
                        />
                    </Text>
                )}

                <Stack spacing={4}>
                    {!order ? (
                        [1, 2, 3].map((i) => (
                            <Box
                                key={i}
                                p={[4, 6]}
                                border="1px solid"
                                borderColor="gray.100"
                                borderRadius="base"
                            >
                                <Flex width="full" align="flex-start">
                                    <Skeleton boxSize={['88px', 36]} mr={4} />

                                    <Stack spacing={2}>
                                        <Skeleton h="20px" w="112px" />
                                        <Skeleton h="20px" w="84px" />
                                        <Skeleton h="20px" w="140px" />
                                    </Stack>
                                </Flex>
                            </Box>
                        ))
                    ) : (
                        <OrderProducts
                            productItems={order.productItems}
                            currency={order.currency}
                        />
                    )}
                </Stack>
            </Stack>
        </Stack>
    )
}

AccountOrderDetail.getTemplateName = () => 'account-order-history'
AccountOrderDetail.propTypes = {
    guestOrder: PropTypes.object
}

export default AccountOrderDetail
