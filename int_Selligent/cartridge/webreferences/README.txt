This directory is for web services that use Apache CXF.

Create the following files:

* filename.wsdl - the wsdl file for the web service

* filename.jks - (optional) if you are using a java keystore file for ws-security, it must 
  have the same filename as the wsdl.

* filename.properties - (optional) if you are using the properties file to generate fully 
  qualified class names to avoid class name collisions.See Resolving namespace collisions 
  for WSDLs and associated files below.

Note: The filename for all three files must be identical for the files to be used by the 
      platform.