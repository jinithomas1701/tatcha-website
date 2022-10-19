"use strict";var CustomObjectMgr=require("dw/object/CustomObjectMgr"),Resource=require("dw/web/Resource"),Site=require("dw/system/Site"),Transaction=require("dw/system/Transaction"),Logger=require("dw/system/Logger"),OSFLicenseConstants=require("~/cartridge/scripts/utils/licenseConstants"),OSFLicenseService=require("~/cartridge/scripts/utils/licenseService");function getLicenseUniqueID(e){return e+Site.current.httpsHostName+Site.current.ID}function getLicenseCustomObject(e){var t=getLicenseUniqueID(e);return CustomObjectMgr.getCustomObject(OSFLicenseConstants.CUSTOM_OBJECT_TYPE,t)}function installLicense(e){var t,i=e,n=getLicenseUniqueID(i.productCode),s=getProductInfo(i.productCode)[0],c=new Date;i.pcID=n,i.productName=s.Name,i.productID=s.ID;try{t=OSFLicenseService.installLicense(i)}catch(e){throw empty(t)&&Transaction.wrap(function(){(t=CustomObjectMgr.createCustomObject(OSFLicenseConstants.CUSTOM_OBJECT_TYPE,n)).custom.isValid=!1,t.custom.isInstalled=!1,t.custom.productCode=i.productCode||null,t.custom.productName=i.productName||null,t.custom.expiryDate=OSFLicenseConstants.EXPIRY_DATE.NONE,t.custom.productID=i.productID||null,t.custom.activationKey=i.activationKey||null,t.custom.email=i.email||null,t.custom.pcID=i.pcID||null,t.custom.siteID=Site.current.ID,t.custom.validationDateKey=c.getTime()}),Logger.getLogger("OSFLicenseManager","OSFLicenseManager").error(e),e}return t}function getLicenseStatus(e){var t;try{t=getLicenseCustomObject(e)}catch(e){Logger.getLogger("OSFLicenseManager","OSFLicenseManager").error(e)}return{isValid:!empty(t)&&t.custom.isValid,validationDateKey:empty(t)?"":t.custom.validationDateKey}}function getOrInstallLicense(e){var t=e,i="string"==typeof t,n=i?t:t.productCode,s=getLicenseCustomObject(n),c=getLicenseUniqueID(n);if(t.pcID=c,empty(s)||!s.custom.isInstalled){if(i){var r=Resource.msg("license.notinstalled","license",null);throw Logger.getLogger("OSFLicenseManager","OSFLicenseManager").error(r),new Error(r)}s=installLicense(t)}else i||Transaction.wrap(function(){s.custom.activationKey=t.activationKey||null,s.custom.email=t.email||null,s.custom.pcID=t.pcID||null});return{isValid:!empty(s)&&s.custom.isValid,validationDateKey:empty(s)?"":s.custom.validationDateKey}}function getProductInfo(t){return require("*/cartridge/productsMapping.json").PRODUCTS.filter(function(e){return e.Code===t})}function handleLicenseForm(e,t){var i=session.forms.license,n=getLicenseCustomObject(e),s=getProductInfo(e)[0],c={isValid:!1,isEntered:!1,expiryDate:""};if(!empty(i.submittedAction)&&i.valid)try{empty(i.licenseUniqueID.htmlValue)||empty(n)||Transaction.wrap(function(){CustomObjectMgr.remove(n)}),installLicense({activationKey:i.licensekey.htmlValue,email:i.email.htmlValue,productID:s.ID,productName:s.Name,productCode:s.Code}),response.redirect(t)}catch(e){Logger.getLogger("OSFLicenseManager","OSFLicenseManager").error(e)}return empty(n)||(c.isEntered=!0,c.isValid=n.custom.isValid,c.expiryDate=n.custom.expiryDate,i.email.value=n.custom.email,i.licensekey.value=n.custom.activationKey,i.licenseUniqueID.value=n.custom.licenseUniqueID),c}exports.installLicense=installLicense,exports.getLicenseStatus=getLicenseStatus,exports.getOrInstallLicense=getOrInstallLicense,exports.handleLicenseForm=handleLicenseForm;