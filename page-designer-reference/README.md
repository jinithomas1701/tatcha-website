# README #

This repository contains example page types and a library of advanced component types for Salesforce B2C Commerce Page Designer. The example page types include a fixed layout page type and an open layout page type. The example component types include a product tile, headline banner, category tile, and several different layouts. 

This repository also includes data that you can import into SiteGenesis or Storefront Reference Architecture (SFRA) Installations with Site-ID RefArch or as a baseline to fit your installation. The data includes samples of pages assembled using the example page types and component types, including a fixed layout page, an open layout page, and a text-heavy help page that is discoverable from the search function.
The repository contains the following cartridges:

* `module_pagedesigner`: Custom cartridge for the storefront site, including the example page type and component type files.
* `bm_pagedesigner`:  Custom cartridge for the Business Manager site, including properties files for localization and thumbnail images for the UI. 
* `app_pagedesigner_sg`: Overlay cartridge for [SiteGenesis](https://github.com/SalesforceCommerceCloud/sitegenesis) (SG)
* `plugin_pagedesigner_sfra`: Overlay cartridge for [Storefront Reference Architecture](https://github.com/SalesforceCommerceCloud/storefront-reference-architecture/) (SFRA)

## Prerequisites

To enable Page Designer, in Business Manager:

1. Select Administration > Global Preferences > Feature Switches. 
2. Enable Page Designer beta.
3. Read and agree to the terms.
4. Click Apply.

After Page Designer is enabled, select Merchant Tools > Content > Page Designer to see the visual editor.


## Getting Started

### Confirm Compatibility Mode
Your site must be using compatiblity mode 17.7 or higher in order for the example page types and component types
in this repository to work correctly. 

See [Compatiblity Mode Considerations](https://documentation.b2c.commercecloud.salesforce.com/DOC1/topic/com.demandware.dochelp/SiteDevelopment/CompatibilityModeConsiderations.html) for
information about compatiblity mode.

### Install Cartridges

1. Clone or fork this repository.
2. Upload `module_pagedesigner` and `bm_pagedesigner` to your sandbox. 
3. If your site is based on SiteGenesis, upload `app_pagedesigner_sg` to your sandbox. If your site is based on SFRA, upload `plugin_pagedesigner_sfra` to your sandbox.
4. Add `bm_pagedesigner` to the cartridge path of the Business Manager site.
5. Add `module_pagedesigner` to the end of the cartridge path for your storefront site.
6. For SiteGenesis sites, add `app_pagedesigner_sg` to the front of the cartridge path for the storefront site. For SFRA sites, add `plugin_pagedesigner_sfra` to the front of the cartridge path for the storefront site.

For a SiteGenesis site, the cartridge path would look like this:
`app_pagedesigner_sg:sitegenesis_storefront_controllers:sitegenesis_storefront_core:module_pagedesigner`

For an SFRA site, the cartridge path would look like this:

`plugin_pagedesigner_sfra:app_storefront_base:module_pagedesigner`


### Import Data
Use the Site Import feature in Business Manager to upload and import the sample data from the `site-template` directory of the repository. 

For SiteGenesis sites, zip up the `site_template_sitegenesis` directory or use the `site_template_sitegenesis.zip` file.

For SFRA sites, zip up the `site_template_sfra` directory or use the `site_template_sfra.zip` file.

**Note** If you intend to test this reference on your own merchant site (instead of an SFRA or SiteGenesis demo site) please be aware that use case is _not_ supported by this reference material. You might need to modify the import files to match your site's configuration. For example, you might need to adjust library IDs in folder names and library XML files, and change category and product IDs.

You're now ready to start using Page Designer! 
In Business Manager, select Merchant Tools > Content > Page Designer to see the example page types, component types, and sample pages
from the cartridges that you uploaded.

## Localization
The `bm_pagedesigner` 
cartridge contains properties files that you can submit to be localized for the example page types, component types, 
and component type groups.   
When you add your own page types and component types, or if you modify the examples, you will need to 
update the properties files accordingly.

## Documentation
Detailed documentation about how to use this repository is available at [documentation/Implementation.md](./documentation/Implementation.md). 
For general information about developing for Page Designer, go to the [Salesforce B2C Commerce Infocenter](https://documentation.b2c.commercecloud.salesforce.com) and 
search on "Developing for Page Designer."

## Linting your code
We provide an npm script to make sure that your Javascript adheres to the guidelines of 
this repository. To use this linting script, enter these commands before committing your code:

```
npm install
npm run lint
```

## Contributing

1. Create a fork of this repository.
2. Ensure that your fork is up to date.
3. Create a working branch to hold your changes.
4. After making your changes, submit a pull request (https://github.com/SalesforceCommerceCloud/page-designer-reference/pull/new/master).

## License

Licensed under the current NDA and licensing agreement that’s in place with your organization. (Open-source licensing does not apply.)

## Support

This repository is a Salesforce B2C Commerce community plugin maintained by the Salesforce Customer Success Group. This repository isn’t supported by Salesforce Commerce Cloud Support. For feature requests or bugs, please open a GitHub issue. Contributions are welcome.
