# Salesforce Commerce Cloud APS Cartridge

APS provides a LINK cartridge to integrate with Salesforce Commerce Cloud (SFCC). This cartridge enables an SFCC storefront to use Amazon Payment Services (APS).

## Compatibility with SFCC architectures

The latest version of SFRA is 6.3.0
Compatibility Mode: 22.7

## Integration

This cartridge allows you to integrate with APS without the need for any development work from your end. Online payments are processed on the back-end using the [AMAZON API](https://paymentservices-reference.payfort.com/docs/api/build/index.html).

### How to customize the cartridge

If you are able to modularize your customizations, create a new cartridge in your /cartridges directory and name it, for example, `int_custom_cartridge`. These customizations will not be transpiled and will be preserved when you upgrade to a new cartridge version.

## Requirements

It is required to have an APS account to use the cartridge. You can do this [here](https://testfort.payfort.com/account-login).

## Installation, Usage and Configuration

Installation, Usage and Configuration is explained in APS's [online documentation](....).

#Step 1: Setup Cartridge Path
To set up the cartridge path: In the Business Manager, go to Administration > Sites > Manage Sites > [yourSite] > Settings
For the Cartridges, enter int_aps_sfra:app_storefront_base and select Apply

#Step 2: Upload metadata
APS cartridge comes with metadata to import.

Go to site_template folder and import all files to your sandbox.
On successful import, it creates following metadata.

Site Preferences (apsEnabled, apsAccessCode, apsMerchantIdentifier, apsSHAType, apsSHARequestPhrase, apsSHAResponsePhrase, apsMerchantURL, apsHostedEnabled, apsPaymentMode)
Services (int.aps.purchase, int.aps.tokenization with their credentials and profiles)
Payment Processor (APS_CARD, APS_HOSTED)
Payment Method (CREDIT_CARD, APS_HOSTED)

## Platform

Read more information about the [APS platform](https://paymentservices.aps.com/docs/EN/12.html).

## Licence

MIT license see LICENSE.
