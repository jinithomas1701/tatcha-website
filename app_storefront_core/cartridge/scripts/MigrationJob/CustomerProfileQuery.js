'use strict';

/**
 *
 * @module  CustomerExport
 */
'use strict';
//Date Format: 2020/07/03
/* Script Modules */
importPackage(dw.io);

exports.ExportExternalCustomerProfiles = function(pdict) {
	var CustomerMgr = require('dw/customer/CustomerMgr');

	if (!pdict.fromDate && !pdict.toDate) {
		return;
	}

	var fromDate = pdict.fromDate;

	var toDate = pdict.toDate;

	var fromOrderDate = new Date(pdict.fromDate);

	var toOrderDate = new Date(pdict.toDate);

	dw.system.Logger.info('From Date: ' + fromOrderDate);

	dw.system.Logger.info('To Date: ' + toOrderDate);

	var queryString = 'creationDate >= {0} and creationDate <= {1}';

	var profiles = CustomerMgr.searchProfiles('creationDate >= {0} and creationDate <= {1}', null, fromOrderDate, toOrderDate);

	try {
		var fileLocation = File.IMPEX + File.SEPARATOR + 'MigrationFiles'

		var dirTarget = new File(fileLocation);
		if (!dirTarget.exists()) {
			dirTarget.mkdirs();
		}

		var file = new File(fileLocation + File.SEPARATOR + 'ExportedCustomerList.csv');
		if (!file.exists()) {
			dw.system.Logger.error("ExportedCustomerList.csv file not found in the source. Creating new file");
			file.createNewFile();
		}


		var csvWriter = new CSVStreamWriter(new FileWriter(file));
		csvWriter.writeNext(['Customer ID', 'Customer Email']);
		for each(var profile in profiles) {
			var customer = profile.customer;
			if (customer && !empty(customer.externalProfiles)) {
				csvWriter.writeNext([profile.customerNo, profile.email]);
			}

		}

		csvWriter.close();
	}
	catch (e) {
		dw.system.Logger.error("Error occured while updating the migration attributes " + e);
	}

}

exports.ExportCustomerProfilesWithBirthdays = function(pdict) {
	var CustomerMgr = require('dw/customer/CustomerMgr');

	if (!pdict.fromDate && !pdict.toDate) {
		return;
	}

	var fromDate = pdict.fromDate;

	var toDate = pdict.toDate;

	var fromOrderDate = new Date(pdict.fromDate);

	var toOrderDate = new Date(pdict.toDate);

	dw.system.Logger.info('From Date: ' + fromOrderDate);

	dw.system.Logger.info('To Date: ' + toOrderDate);

	var queryString = 'creationDate >= {0} and creationDate <= {1}';

	var profiles = CustomerMgr.searchProfiles('creationDate >= {0} and creationDate <= {1}', null, fromOrderDate, toOrderDate);

	try {
		var fileLocation = File.IMPEX + File.SEPARATOR + 'MigrationFiles'

		var dirTarget = new File(fileLocation);
		if (!dirTarget.exists()) {
			dirTarget.mkdirs();
		}

		var file = new File(fileLocation + File.SEPARATOR + 'ExportCustomerProfilesWithBirthdays.csv');
		if (!file.exists()) {
			dw.system.Logger.error("ExportCustomerProfilesWithBirthdays.csv file not found in the source. Creating new file");
			file.createNewFile();
		}


		var csvWriter = new CSVStreamWriter(new FileWriter(file));
		csvWriter.writeNext(['Customer ID', 'Customer Email']);
		for each(var profile in profiles) {
			var birthday = profile.birthday;
			if (!empty(birthday)) {
				csvWriter.writeNext([profile.customerNo, profile.email, profile.birthday.toDateString()]);
			}

		}

		csvWriter.close();
	}
	catch (e) {
		dw.system.Logger.error("Error occured while updating the migration attributes " + e);
	}

}