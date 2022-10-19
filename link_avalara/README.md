# AvaTax for Salesforce B2C Commerce - Storefront Reference Architecture (SFRA)

Avalara is a leading provider of webservice-based sales tax automation solutions (AvaTax) for businesses of all sizes.
As the leading web-hosted on-demand sales tax solution, AvaTax is offered as a Software-as-a-Service (SaaS) alternative to more expensive and less adaptive software sales tax calculating and management solutions.
AvaTax integrates seamlessly with the market leading financial applications to provide end-to-end compliance that is completely automated.

This is a repository for AvaTax integration cartridge for Salesforce B2C Commerce - SFRA application.

# Getting Started

1. Clone this repository.

2. Run npm install to install all of the local dependencies (node version 8.x or current LTS release recommended)

3. Create dw.json file in the root of the project:

```
{
    "hostname": "your-sandbox-hostname.demandware.net",
    "username": "yourlogin",
    "password": "yourpwd",
    "code-version": "version_to_upload_to"
}
```

4. Run npm run uploadCartridge command that would upload `bm_avatax`, `int_avatax_sfra` and `int_avatax_svcclient` cartridges to the sandbox you specified in dw.json file.

5. Use `/metadata/avatax-site-import.zip` to import site data on your sandbox.

6. Add the `int_avatax_sfra` cartridge to your cartridge path in _Administration > Sites > Manage Sites > [your_sfra_site] - Settings_.

7. Add the bm_avatax cartridge to your BM cartridge path in _Administration > Sites > Manage Sites > Business Manager Site > Manage the Business Manager Site - Settings_.

8. Assign permissions to AvaTax modules under Business Manager in _Administration > Roles & Permissions > [user] > Business Manager Modules_

9. Fill in the service credentials in _Administration > Operations > Services > Credentials - credentials.avatax.rest_

10. Select all applicable settings under _Merchant Tools > AvaTax > AvaTax Settings_.

11. You should be ready to use the cartridge functionalities.

# Uploading

`npm run uploadCartridge` - Will upload `bm_avatax`, `int_avatax_sfra` and `int_avatax_svcclient` to the server. Requires a valid `dw.json` file at the root that is configured for the sandbox to upload.

# Testing

**Running unit tests**

You can run `npm test` to execute all unit tests in the project.
