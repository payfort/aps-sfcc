/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import React from 'react'
import loadable from '@loadable/component'
import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'

// Components
import {Skeleton} from '@salesforce/retail-react-app/app/components/shared/ui'
import {configureRoutes} from '@salesforce/retail-react-app/app/utils/routes-utils'
import {routes as _routes} from '@salesforce/retail-react-app/app/routes'

const fallback = <Skeleton height="75vh" width="100%" />

// Create your pages here and add them to the routes array
// Use loadable to split code into smaller js chunks
const Home = loadable(() => import('./pages/home'), {fallback})
const MyNewRoute = loadable(() => import('./pages/my-new-route'))

const Account = loadable(() => import('./pages/account'), {fallback})
const Checkout = loadable(() => import('./pages/checkout'), {fallback})
const CheckoutConfirmation = loadable(() => import('./pages/checkout/confirmation'), {fallback})
const PaymentServiceSuccess = loadable(() => import('./pages/payment-service/success'), {fallback})
const PaymentServiceFailure = loadable(() => import('./pages/payment-service/failure'), {fallback})
const PaymentServiceCancel = loadable(() => import('./pages/payment-service/cancel'), {fallback})

const routes = [
    {
        path: '/',
        component: Home,
        exact: true
    },
    {
        path: '/checkout',
        component: Checkout,
        exact: true
    },
    {
        path: '/checkout/confirmation/:orderNo',
        component: CheckoutConfirmation
    },
    {
        path: '/psp-success/:basketId',
        component: PaymentServiceSuccess,
        exact: true
    },
    {
        path: '/psp-failure',
        component: PaymentServiceFailure,
        exact: true
    },
    {
        path: '/psp-cancel',
        component: PaymentServiceCancel,
        exact: true
    },
    {
        path: '/account',
        component: Account
    },
    {
        path: '/my-new-route',
        component: MyNewRoute
    },
    ..._routes
]

export default () => {
    const config = getConfig()
    return configureRoutes(routes, config, {
        ignoredRoutes: ['/callback', '*']
    })
}
