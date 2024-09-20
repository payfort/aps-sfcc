import React from 'react'
import {Route, Switch, useRouteMatch} from 'react-router'
import OrderHistory from '@salesforce/retail-react-app/app/pages/account/order-history'

// OVERRIDE START
import OrderDetail from './order-detail'
// OVERRIDE END

const AccountOrders = () => {
    const {path} = useRouteMatch()

    return (
        <Switch>
            <Route exact path={path}>
                <OrderHistory />
            </Route>
            <Route exact path={`${path}/:orderNo`}>
                <OrderDetail />
            </Route>
        </Switch>
    )
}

AccountOrders.getTemplateName = () => 'account-order-history'

export default AccountOrders
