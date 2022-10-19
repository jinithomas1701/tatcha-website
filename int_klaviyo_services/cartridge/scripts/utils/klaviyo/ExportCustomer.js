/**
*
*  	@input startDate : String
*   @input endDate : String
*
*/

function execute( pdict : PipelineDictionary )
{
	var io = require( 'dw/io' );
	var system = require( 'dw/system' );
	var CustomerMgr = require('dw/customer/CustomerMgr');
	var ExportUtils = require('~/cartridge/scripts/utils/klaviyo/ExportUtils');
	
	var customerFilePath = 'src/klaviyo/export/customer';
	var impexFilePath = io.File.IMPEX + "//" + customerFilePath;
	var limitPerFile = 500;
	var profileList;
	var fileWriter;
	var xsw;
	try {
		(new io.File(impexFilePath)).mkdirs();

		var startDate = pdict.startDate;
		var endDate = pdict.endDate;

		if(!empty(startDate) && !empty(endDate)) {
			profileList = CustomerMgr.searchProfiles("creationDate >= {0} and creationDate <= {1}","customerNo asc", startDate, endDate);
		} else {
			var date = lastExportDate = ExportUtils.getLastExportDate('customer');
			profileList = CustomerMgr.searchProfiles("creationDate > {0}","customerNo asc", date);
			var currentDate = new Date();
			ExportUtils.updateExportDate('customer',currentDate);
		}
		
		if (empty(profileList) || profileList.getCount() == 0) {
			system.Logger.error("No profiles for export.");
			return;
		}
		
		var file = new io.File(impexFilePath + "//" + 'customerexport' + new Date().toISOString() + '.xml');
		fileWriter = new io.FileWriter(file);
		xsw = new io.XMLStreamWriter(fileWriter);

		xsw.writeStartDocument();
		xsw.writeStartElement("customers");
		var counter = 1;

		while (profileList.hasNext()) {

			if(counter > limitPerFile) {
				xsw.writeEndElement();
				xsw.close();

				//Create New File
				file = new io.File(impexFilePath + "//" + 'customerexport' + new Date().toISOString() + '.xml');
				fileWriter = new io.FileWriter(file);
				xsw = new io.XMLStreamWriter(fileWriter);

				xsw.writeStartDocument();
				xsw.writeStartElement("customers");
				var counter = 1;
			}

			var profile = profileList.next();
			xsw.writeStartElement("customer");
			xsw.writeAttribute("customer-no", profile.customerNo);
				xsw.writeStartElement("profile");
						xsw.writeStartElement("first-name");
						xsw.writeCharacters(profile.firstName);
						xsw.writeEndElement();
						xsw.writeStartElement("second-name");
						xsw.writeCharacters(profile.secondName);
						xsw.writeEndElement();
						xsw.writeStartElement("last-name");
						xsw.writeCharacters(profile.lastName);
						xsw.writeEndElement();
						xsw.writeStartElement("email");
						xsw.writeCharacters(profile.email);
						xsw.writeEndElement();
						xsw.writeStartElement("phone-mobile");
						xsw.writeCharacters(profile.phoneMobile);
						xsw.writeEndElement();
						xsw.writeStartElement("creation-date");
						xsw.writeCharacters(profile.creationDate);
						xsw.writeEndElement();
						xsw.writeStartElement("last-login-time");
						xsw.writeCharacters(profile.lastLoginTime);
						xsw.writeEndElement();
						xsw.writeStartElement("last-visit-time");
						xsw.writeCharacters(profile.lastVisitTime);
						xsw.writeEndElement();
						xsw.writeStartElement("preferred-locale");
						xsw.writeCharacters(profile.preferredLocale);
						xsw.writeEndElement();
						xsw.writeStartElement("custom-attributes");
						xsw.writeStartElement("custom-attribute");
						xsw.writeAttribute("attribute-id", "newsletterFrequency");
						xsw.writeCharacters(profile.custom.newsletterFrequency);
						xsw.writeEndElement();
						xsw.writeStartElement("custom-attribute");
						xsw.writeAttribute("attribute-id", "newsletterSubscription");
						xsw.writeCharacters(profile.custom.newsletterSubscription);
						xsw.writeEndElement();
				xsw.writeEndElement();
			xsw.writeEndElement();
			xsw.writeEndElement();

			counter++;
		}

		xsw.writeEndElement();
		xsw.close();
		
		return PIPELET_NEXT;

	} catch(e)  {
		var exportErrorFile : io.File;
		var writerError : io.FileWriter;
		system.Logger.error("Unable to export customer: "+e.message);
		var logFilePath = impexFilePath + "//" + "log";
		(new io.File(logFilePath)).mkdirs();
		exportErrorFile = new io.File(logFilePath + "//" + "customer_exportError.log"); 			 
		writerError = new io.FileWriter(exportErrorFile, false);
		writerError.write(e.message);
		writerError.close();
		
		return PIPELET_ERROR;
	}
	finally {
		if (profileList) profileList.close();
		if (fileWriter) fileWriter.close();
		if (xsw) xsw.close();
	}

}
