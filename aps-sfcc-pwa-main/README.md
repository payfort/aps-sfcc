# PWA Kit Generated App

Welcome to the PWA Kit!

## Getting Started

### Requirements

-   Node 18 or later
-   npm 9 or later

### Configuring the Amazon Payment Services credentials

The APS credentials (`apsSHARequestPhrase`, `apsAccessCode`, `apsMerchantIdentifier`,
`apsMerchantURL`, `apsSHAType`, `apsReturnURL`, `apsTokenServiceCommand`, and the
Apple Pay equivalents) MUST be configured as **Business Manager custom site
preferences** on the SFCC instance, exactly as documented for the SFRA cartridge.
They MUST NOT be placed in `overrides/app/constants.js` or any other file under
`overrides/app/`.

Everything under `overrides/app/` is compiled by `pwa-kit-dev` into the public
JavaScript bundle served from `/mobify/bundle/<deploy-id>/*.js` and is readable
by any anonymous visitor via browser dev tools. Placing the SHA request phrase
(or any other secret) there would allow an external actor to compute valid APS
signatures for arbitrary commands (REFUND, CAPTURE, VOID_AUTHORIZATION,
CHECK_STATUS, UPDATE_TOKEN, etc.) against `paymentservices.payfort.com` on
behalf of the merchant.

At tokenization time, the PWA fetches a fully signed parameter bag from the
`ApsPWA-GetTokenParams` endpoint provided by the `int_aps_pwa` cartridge; the
SHA request phrase never leaves the SFCC server.

### Run the Project Locally

```bash
npm start
```

This will open a browser and your storefront will be running on http://localhost:3000

### Deploy to Managed Runtime

```
npm run push -- -m "Message to help you recognize this bundle"
```

**Note**: This command will push to the MRT project that matches the name field in `package.json`. To push to a different project, include the `-s` argument.

**Important**: Access to the [Runtime Admin](https://runtime.commercecloud.com/) application is required to deploy bundles. To learn more, read our guide to [Push and Deploy Bundles](https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/guide/pushing-and-deploying-bundles.html).

## Customizing the application

This version of the application uses [Template Extensibility](https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/guide/template-extensibility.html) to empower you to more easily customize base templates. Please refer to our documentation for more information.

## 🌍 Localization

See the [Localization README.md](./packages/template-retail-react-app/translations/README.md) for important setup instructions for localization.

## 📖 Documentation

The full documentation for PWA Kit and Managed Runtime is hosted on the [Salesforce Developers](https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/overview) portal.

## Further documentation

For more information on working with the PWA Kit, refer to:

-   [Get Started](https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/guide/getting-started.html)
-   [Skills for Success](https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/guide/skills-for-success.html)
-   [Set Up API Access](https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/guide/setting-up-api-access.html)
-   [Configuration Options](https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/guide/configuration-options.html)
-   [Proxy Requests](https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/guide/proxying-requests.html)
-   [Push and Deploy Bundles](https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/guide/pushing-and-deploying-bundles.html)
-   [The Retail React App](https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/guide/retail-react-app.html)
-   [Rendering](https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/guide/rendering.html)
-   [Routing](https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/guide/routing.html)
-   [Phased Headless Rollouts](https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/guide/phased-headless-rollouts.html)
-   [Launch Your Storefront](https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/guide/launching-your-storefront.html)
