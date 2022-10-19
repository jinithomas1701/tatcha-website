/**
 * Initializes the workflow defintion overview.
 * 
 * @param {Object} configs The configuration object with the dynamic data.
 */
function initWorkflowDefintionOverview(configs) {
	var checkBoxRenderer = function(recordValue, metaData, record, rowIndex, columnIndex, dataStore) {
		if (record.get('selected')) {
			return  '<input name="workflowId" type="checkbox" value="' + record.get('id') + '" checked="checked">';
		} else {
			return  '<input name="workflowId" type="checkbox" value="' + record.get('id') + '">';
		}
	};
	
	var editButtonRenderer = function(recordValue, metaData, record, rowIndex, columnIndex, dataStore) {
		return '<input type="submit" name="' + record.get('htmlName') + '" value="Edit" class="button">';
    };
	
	var siteIdsRenderer = function(recordValue, metaData, record, rowIndex, columnIndex, dataStore) {
		var siteIds = record.get('siteIds');
		var result = '';
		for (var i=0; i<siteIds.length; i++) {
			result += siteIds[i] + '</br>';
		}
		return result;
    };
	
	var cm = new Ext.grid.ColumnModel([
		{
			"id"          : "selectAll",
			"header"      : "<input type=\"checkbox\" value=\"true\"/>",
			"width"       : 30,
			"fixed"       : true,
			"menuDisabled": true,
			"renderer"    : checkBoxRenderer,
			"editor"      : new Ext.form.Checkbox({height:20,width:20})
		},{
			"header"      : configs.resources.workflowName,
			"sortable"    : true,
			"menuDisabled": true,
			"dataIndex"   : "workflowname"
		},{
			"id"          : "description",
			"header"      : configs.resources.description,
			"menuDisabled": true,
			"dataIndex"   : "description"
		},{
			"header"      : configs.resources.sites,
			"menuDisabled": true,
			"renderer"    : siteIdsRenderer,
			"dataIndex"   : "siteIds"
		},{
			"header"      : configs.resources.enabled,
			"width"       : 50,
			"fixed"       : true,
			"menuDisabled": true,
			"dataIndex"   : "enabled",
			"renderer"    : function(recordValue, metaData, record, rowIndex, columnIndex, dataStore){
								return '<input name="muh" disabled="true" type="checkbox" '+(recordValue?'checked="checked"/>':'/>');
							}
		},{
			"header"      : configs.resources.actions,
			"width"       : 50,
			"fixed"       : true,
			"menuDisabled": true,
			"renderer"    : editButtonRenderer
		}
	]);

	var myReader = new Ext.data.ArrayReader({}, [
 		{"name": "id"},
 		{"name": "workflowname"},
 		{"name": "description"},
 		{"name": "enabled"},
 		{"name": "selected"},
 		{"name": "siteIds"},
 		{"name": "htmlName"}
 	]);
 	
 	var store = new Ext.data.Store({
 		"data"  : configs.myData,
 		"reader": myReader
	});
	
	var workflowDefintionGrid = new Ext.grid.GridPanel({
		"autoHeight"      : true,
		"autoExpandColumn": "description",
    	"store"           : store,
		"viewConfig"      : {
			"forceFit"      : true,
			"deferEmptyText": false,
			"emptyText"     : configs.resources.emptyWorkflowsHint
		},
		"collapsible": false,
	    "cm"         : cm,
	    "bbar"       : new Ext.Toolbar({
			"cls"  : "dwtoolbar",
			"items": [
				{
					"text"   : configs.resources.enable,
					"id"     : configs.enableButtonHtmlName,
					"handler": function(button) {
						workflowDefintionForm.getForm().submit(button);
					},
					"scope"  : this
				},
				{
					"text"   : configs.resources.disable,
					"id"     : configs.disableButtonHtmlName,
					"handler": function(button) {
						workflowDefintionForm.getForm().submit(button);
					},
					"scope"  : this
				},
				{
					"text"   : configs.resources.run,
					"id"     : configs.runButtonHtmlName,
					"tooltip": configs.resources.tooltip,
					"handler": function(button) {
						workflowDefintionForm.getForm().submit(button);
					},
					"scope"  : this
				},
				"->",
				{
					"text"   : configs.resources["new"],
					"id"     : configs.newButtonHtmlName,
					"handler": function(button){
						workflowDefintionForm.getForm().submit(button);
					},
					"scope"  : this
				},
				{
					"text"   : configs.resources["delete"],
					"id"     : configs.deleteButtonHtmlName,
					"handler": function(button) {
						Ext.Msg.confirm(
							configs.resources.deleteQuestionTitle,
							configs.resources.deleteQuestion,
							function(btn) {
								if (btn=='no') {
									return;
								}
								
								// This var will be defined below!
								workflowDefintionForm.getForm().submit(button);
					        }
					    );
					},
					"scope"  : this
				}
			]
		})
	});
	
	workflowDefintionGrid.on('headerclick',function (grid, colIndex, event){
		//react on click on checkbox only
		if (grid.colModel.getColumnId(colIndex) == 'selectAll') {
			//de-select all
			if (this.selectAllPressed==true) {
				this.getStore().each(function(record){
        			record.set('selected', false);
	        	}, this);
	        	this.selectAllPressed=false;
			} else{
				this.getStore().each(function(record){
        			record.set('selected',true);
	        	}, this);
				this.selectAllPressed=true;
			}
		}
		return true;
	});
	
	var workflowDefintionForm = new WorkflowForm({
		"items": [
			workflowDefintionGrid
		]
	});
	
	var descriptionPanel = new Ext.Panel({
		"html":"<div class=\"table_title_description\">" + configs.resources.descriptionText + "</div>"
	});
	
	var containerPanel = new Ext.Panel({
		"items"      : [
			descriptionPanel,
			workflowDefintionForm
		],
		"renderTo"   : "integrationframework-workflowScheduleOverview",
		"collapsible": true,
		"title"      : configs.resources.title
	});
	
	// Fix for ext js bug. The url config will not not be respected by the standardSubmit config!
	workflowDefintionForm.getForm().getEl().set({action: configs.formAction});
}

/**
 * Initializes the workflow defintion form.
 * 
 * @param {Object} configs The configuration object with the dynamic data.
 */
function initWorkflowScheduleDefintionForm(configs) {

	Ext.apply(Ext.form.VTypes, {
	    daterange : function(val, field) {
	        var date = field.parseDate(val);

	        if (!date) {
	            return false;
	        }
	        
	        if (field.startDateField) {
	            var start = Ext.getCmp(field.startDateField);
	            if (!start.maxValue || (date.getTime() != start.maxValue.getTime())) {
	                start.setMaxValue(date);
	                start.validate();
	            }
	        } else if (field.endDateField) {
	            var end = Ext.getCmp(field.endDateField);
	            if (!end.minValue || (date.getTime() != end.minValue.getTime())) {
	                end.setMinValue(date);
	                end.validate();
	            }
	        }
	        /*
	         * Always return true since we're only using this vtype to set the
	         * min/max allowed values (these are tested for after the vtype test)
	         */
	        return true;
	    },
	    idValidator: function(val, field) {
	    	if (!val || val.length <= 0) {
	    		return false;
	    	}
	    	
	    	if (configs.allWorkflowComponentIds[val] == true) {
	    		return false
	    	}
	    	return true;
	    },
	    idValidatorText: configs.resources.idInUse
	});
	
	var siteIds = [];
	var siteIdsMaxLength = 0;
	
	for (var i=0; i<configs.siteIds.length; i++) {
		siteIds.push({
			"xtype"         : "checkbox",
			"name"          : "siteIds",
			"inputValue"    : configs.siteIds[i].inputValue,
			"checked"       : configs.siteIds[i].checked,
			"labelSeparator": "",
			"boxLabel"      : configs.siteIds[i].boxLabel
		});
		if(configs.siteIds[i].boxLabel.length > siteIdsMaxLength){
			siteIdsMaxLength = configs.siteIds[i].boxLabel.length;
		}
	}
	
	var siteIDsCheckboxGroupConfig = {
		"layout"    : "column",
		"border"    : false,
		"fieldLabel": configs.resources.siteIds,
		"items"     : siteIds
	};
	
	var labelWidth = (siteIdsMaxLength <= 9) ? (100) : (siteIdsMaxLength * 10);
	if (configs.siteIds.length >= 4) {
		siteIDsCheckboxGroupConfig.columns = 4;
		siteIDsCheckboxGroupConfig.width = 4 * labelWidth;
	} else if (configs.siteIds.length >= 1) {
		siteIDsCheckboxGroupConfig.columns = configs.siteIds.length;
		siteIDsCheckboxGroupConfig.width = configs.siteIds.length * labelWidth;
	}
	var siteIDsCheckboxGroup = new Ext.form.CheckboxGroup(siteIDsCheckboxGroupConfig);
	if (configs.siteIds.length <= 0) {
		siteIDsCheckboxGroup = {
			"xtype": "panel",
			"html" : "<span style=\"color: red;\">" + configs.resources.noSiteIdsFound + "</span>"
		}
	}
	
	var executionWeekdays = new Array();
	for (var i=0; i<configs.form.RECURRING.executionWeekdays.length; i++) {
		executionWeekdays.push({
			"xtype"         : "checkbox",
			"name"          : "executionWeekdays",
			"inputValue"    : configs.form.RECURRING.executionWeekdays[i].inputValue,
			"checked"       : configs.form.RECURRING.executionWeekdays[i].checked,
			"labelSeparator": "",
			"boxLabel"      : configs.form.RECURRING.executionWeekdays[i].boxLabel
		});
	}
	
	var notificationEmails = [];
	for (var i=0; i<configs.notificationEmails.length; i++) {
		notificationEmails.push({
			"xtype"         : "textfield",
			"name"          : "notificationEmails",
			"value"         : configs.notificationEmails[i],
			"vtype"         : "email",
			"fieldLabel"    : (i == 0 ? configs.resources.notificationEmails : ""),
			"labelSeparator": (i == 0 ? ":" : ""),
			"width"         : 220,
	        "growMin"       : 220,
			"grow"          : true
		});
	}
	
	notificationEmails.push({
		"xtype"  : "button",
        "text"   : "Add another value",
        "cls"    : "formButtonAlignCorrection2",
        "handler": function() {
        	var target = Ext.getCmp('notificationEmailsFieldset');
        	if (target.items) {
            	// Before this button.
        		var p = target.items.items.length - 1;
        	} else {
            	var p = 0;
        	}
            target.insert(p, {
                "xtype"         : "textfield",
                "name"          : "notificationEmails",
                "vtype"         : "email",
                "labelSeparator": "",
                "width"         : 220,
    	        "growMin"       : 220,
    			"grow"          : true
            });
            target.doLayout();
        }
	});
	
	var notificationStatuses = [];
	for (var i=0; i<configs.notificationStatuses.length; i++) {
		notificationStatuses.push({
			"xtype"     : "checkbox",
			"name"      : "notificationStatuses",
			"boxLabel"  : configs.notificationStatuses[i].label,
			"inputValue": configs.notificationStatuses[i].value,
			"checked"   : configs.notificationStatuses[i].checked
		});
	}
	
	var items = [
		{
			"xtype"         : "textfield",
			"name"          : configs.form.id.htmlName,
			"fieldLabel"    : configs.form.id.label,
			"value"         : configs.form.id.value,
			"vtype"         : "idValidator",
			"allowBlank"    : false,
			"labelSeparator": ":&nbsp;<span class=\"red_asterix\">*</span>",
			"disabled"      : configs.isNewForm != true,
			"width"         : 220,
			"growMin"       : 220,
			"grow"          : true
		},{
			"xtype"     : "checkbox",
			"name"      : configs.form.enabled.htmlName,
			"fieldLabel": configs.form.enabled.label,
			"inputValue": true,
			"checked"   : configs.form.enabled.checked
		},{
			"xtype"     : "textfield",
			"name"      : configs.form.name.htmlName,
			"fieldLabel": configs.form.name.label,
			"value"     : configs.form.name.value,
			"width"     : 220,
			"growMin"   : 220,
			"grow"      : true
		},{
			"xtype"     : "textarea",
			"name"      : configs.form.description.htmlName,
			"fieldLabel": configs.form.description.label,
			"value"     : configs.form.description.value,
			"autoCreate":
				{
					tag: "textarea",
					style: "width:100%; height:60px;",
					autocomplete: "off"
				}
		},{
			"layout"    : "form",
			"border"    : false,
			"items"     : siteIDsCheckboxGroup
		},{
			"xtype"     	: "combo",
			"name"      	: configs.form.fileLogLevel.htmlName,
			"fieldLabel"	: configs.form.fileLogLevel.label,
			"value"			: configs.form.fileLogLevel.value,
			"labelSeparator": ":&nbsp;<span class=\"red_asterix\">*</span>",
			"allowBlank"    : false,
			"editable"		: false,
			"store"   		: [['none','none'],['error','error'],['debug','debug'],['info','info'],['warn','warn']],
			"triggerAction"	: 'all'
		},{
			"xtype"     	: "combo",
			"name"      	: configs.form.componentLogLevel.htmlName,
			"fieldLabel"	: configs.form.componentLogLevel.label,
			"value"			: configs.form.componentLogLevel.value,
			"labelSeparator": ":&nbsp;<span class=\"red_asterix\">*</span>",
			"allowBlank"    : false,
			"editable"		: false,
			"store"   		: [['none','none'],['error','error'],['debug','debug'],['info','info'],['warn','warn']],
			"triggerAction"	: 'all'
		},{
			"xtype"     : "radio",
			"id"        : "singleRadioButton",
			"name"      : configs.form.type.htmlName,
			"inputValue": configs.form.type.options.SINGLE.value,
			"boxLabel"  : configs.form.type.options.SINGLE.label,
			"checked"   : configs.form.type.options.SINGLE.checked,
			"width"     : 155,
			"handler"   : WorkflowHelper.radioTypeFieldsUpdater.createDelegate(this, [this], true),
			"hideLabel" : true
		},{
			"layout"  : "column",
			"id"      : "singleWorkflowFieldset",
			"border"  : false,
			"defaults": {
				"layout": "form",
				"border": false
			},
			"items": [
			    {
				    "cls"       : "extraRightMargin subOptionsLabelCorrection",
				    "labelWidth": 133,
				    "items"     : [{
						"xtype"         : "datefield",
						"format"        : Ext.dw.LocaleResources.dateFormat,
						"name"          : "singleDate",
						"allowBlank"    : false,
						"fieldLabel"    : configs.form.SINGLE.executionTime.label,
						"id"            : "singleExecutionDateField",
						"labelSeparator": ":&nbsp;<span class=\"red_asterix\">*</span>"
				    }]
			    },
			    {
					"labelWidth": 14,
				    "items": [{
						"xtype"         : "timefield",
						"format"        : Ext.dw.LocaleResources.timeFormat,
						"layout"        : "form",
						"name"          : "singleTime",
						"labelSeparator": "",
						"allowBlank"    : false,
						"fieldLabel"    : configs.resources.at,
						"width"         : 97,
						"id"            : "singleExecutionTimeField"
				    }]
			    },
			    {
			    	"xtype" : "textfield",
			    	"id"    : "singleExecutionTimeAndDateField",
			    	"name"  : configs.form.SINGLE.executionTime.htmlName,
			    	"value" : configs.form.SINGLE.executionTime.value,
			    	"hidden": true
			    }
			]
		},{
			"xtype"     : "radio",
			"id"        : "recurringRadioButton",
			"name"      : configs.form.type.htmlName,
			"inputValue": configs.form.type.options.RECURRING.value,
			"boxLabel"  : configs.form.type.options.RECURRING.label,
			"checked"   : configs.form.type.options.RECURRING.checked,
			"width"     : 155,
			"handler"   : WorkflowHelper.radioTypeFieldsUpdater.createDelegate(this, [this], true),
			"hideLabel" : true
		},{
			"border": false,
			"id"    : "recurringWorkflowFieldset",
			"items" : [
				{
					"layout"  : "column",
					"border"  : false,
					"defaults": {
						"layout": "form",
						"border": false
					},
					"items": [
					    {
						    "cls"       : "extraRightMargin subOptionsLabelCorrection",
						    "labelWidth": 133,
						    "items"     : [
					            {
					            	"xtype"         : "datefield",
					            	"id"            : "recurringExecutionDateFromField",
					            	"name"          : configs.form.RECURRING.executionActiveFrom.htmlName,
					            	"value"         : configs.form.RECURRING.executionActiveFrom.value,
					            	"fieldLabel"    : configs.form.RECURRING.executionActiveFrom.label,
					            	"format"        : Ext.dw.LocaleResources.dateFormat,
					            	"vtype"         : "daterange",
					            	"endDateField"  : "recurringExecutionDateToField",
					            	"allowBlank"    : false,
					            	"labelSeparator": ":&nbsp;<span class=\"red_asterix\">*</span>"
					            }
						    ]
					    },
					    {
						    "labelWidth": 14,
						    "items": [
								{
									"xtype"         : "datefield",
									"id"            : "recurringExecutionDateToField",
									"name"          : configs.form.RECURRING.executionActiveTo.htmlName,
									"value"         : configs.form.RECURRING.executionActiveTo.value,
									"fieldLabel"    : configs.form.RECURRING.executionActiveTo.label,
									"format"        : Ext.dw.LocaleResources.dateFormat,
									"vtype"         : "daterange",
									"startDateField": "recurringExecutionDateFromField"
								}
						    ]
					    }
					]
				}
				,{
					"layout"    : "form",
					"border"    : false,
					"cls"       : "subOptionsLabelCorrection",
					"labelWidth": 133,
					"items"     : [
						{
							"xtype"         : "timefield",
							"name"          : configs.form.RECURRING.executionTime.htmlName,
							"value"         : configs.form.RECURRING.executionTime.value,
							"fieldLabel"    : configs.form.RECURRING.executionTime.label,
							"format"        : Ext.dw.LocaleResources.timeFormat,
							"allowBlank"    : false,
							"width"         : 97,
							"labelSeparator": ":&nbsp;<span class=\"red_asterix\">*</span>"
						}
					]
				}
				,{
					"layout"  : "column",
					"border"  : false,
					"defaults": {
						"layout": "form",
						"border": false
					},
					"items": [
					    {
						    "cls"       : "extraRightMargin subOptionsLabelCorrection",
						    "labelWidth": 133,
						    "items"     : [
								{
									"xtype"         : "textfield",
									"name"          : configs.form.RECURRING.executionInterval.htmlName,
									"value"         : configs.form.RECURRING.executionInterval.value,
									"fieldLabel"    : configs.form.RECURRING.executionInterval.label,
									"allowBlank"    : false,
									"vtype"         : "numeric",
									"maxLength"     : 5,
									"width"         : 97,
									"labelSeparator": ":&nbsp;<span class=\"red_asterix\">*</span>"
								}
						    ]
					    },
					    {
					    	"labelWidth":14,
						    "items": [
								{
									"xtype"        : "combo",
									"name"         : "recurringIntervalDummy",
									"value"        : configs.form.RECURRING.executionIntervalType.value,
									"fieldLabel"   : configs.form.RECURRING.executionIntervalType.label,
									"allowBlank"   : false,
									"width"        : 97,
									"mode"         : "local",
									"displayField" : "text",
									"valueField"   : "value",
									"hiddenName"   : configs.form.RECURRING.executionIntervalType.htmlName,
									"editable"     : false,
									"triggerAction": "all",
									"store"        : configs.form.RECURRING.executionIntervalType.intervals,
									"hideLabel"    : false,
									"labelSeparator": "",
									"allowBlank"   : false
								}
						    ]
					    }
					]
				}
				,{
					"layout"    : "form",
					"border"    : false,
					"cls"       : "subOptionsLabelCorrection",
					"labelWidth": 133,
					"items"     : [
						new Ext.form.CheckboxGroup({
							"layout"    : "column",
							"columns"   : 4,
							"border"    : false,
							"width"     : 400,
							"fieldLabel": configs.resources.onTheseDays,
							"items"     : executionWeekdays
						})
					]
				}
			]
		},{
			"xtype"     : "checkbox",
			"id"        : "enableNotifications",
			"boxLabel"  : configs.resources.enableNotifications,
			"checked"   : configs.notificationEmails.length > 0 &&  configs.notificationEmails[0].length > 0,
			"width"     : 155,
			"handler"   : WorkflowHelper.handleEnableNotifications.createDelegate(this),
			"hideLabel" : true
		},{
			"border": false,
			"id"    : "notificationsFieldset",
			"items" : [
				{
					"layout"    : "form",
					"border"    : false,
					"cls"       : "subOptionsLabelCorrection",
					"labelWidth": 133,
					"items"     : new Ext.form.CheckboxGroup({
						"layout"    : "column",
						"columns"   : 3,
						"border"    : false,
						"width"     : 300,
						"fieldLabel": configs.resources.statuses,
						"items"     : notificationStatuses
					})
				},{	
					"layout"    : "form",
					"cls"       : "subOptionsLabelCorrection",
				    "labelWidth": 133,
			        "border"    : false,
				    "items"     : [ {
						"xtype"        : "combo",
						"layout"       : "form",
						"border"       : false,
						"name"         : "notificationModeDummy",
						"value"        : configs.form.notificationMode.value,
						"fieldLabel"   : configs.form.notificationMode.label,
						"allowBlank"   : false,
						"mode"         : "local",
						"displayField" : "text",
						"valueField"   : "value",
						"width"        : 97,
						"hiddenName"   : configs.form.notificationMode.htmlName,
						"editable"     : false,
						"triggerAction": "all",
						"store"        : configs.form.notificationMode.modes
				    } ]
			    },{
					"layout"    : "form",
					"cls"       : "subOptionsLabelCorrection",
					"labelWidth": 133,
			        "border"    : false,
			        "id"        : "notificationEmailsFieldset",
			        "items"     : notificationEmails
				}
			]
		},{
			"autoHeight": true,
			"title"     : configs.resources.componentsTitle,
			"cls"       : "componentsFieldset",
			"id"        : "componentsFieldset",
			"bbar"      : new Ext.Toolbar({
				"cls"  : "dwtoolbar",
				"items": [
					"->",
					{
						"text": configs.resources.componentsNew,
						"handler": function() {
		                	var target = Ext.getCmp('componentsFieldset');
		                	if (target.items) {
	                    		var p = target.items.items.length;
		                	} else {
			                	var p = 0;
		                	}
		                	
							new Ajax.Request(configs.newComponentURL, {
								"parameters": {
									"Index": sequence + 1
								},
								"onSuccess": function(response) {
									var newElem = target.insert(p, createWorkflowComponentDefintionPanel(Ext.util.JSON.decode(response.responseText), false));
									target.doLayout();
									WorkflowHelper.addDropZone(newElem.el);
									sequence++;
									
									WorkflowHelper.updateFormFields(Ext.getCmp('formPanel'), null, newElem);
								}
							});
						},
						scope: this
					}
				]
			})
		}
	];
	
	var formPanel = new WorkflowForm({
		"id"           : "formPanel",
		"layout"       : "form",
        "autoHeight"   : true,
		"border"       : false,
        "buttonAlign"  : "right",
    	"monitorValid" : true,
    	"items"        : new Ext.form.FieldSet({
			"id"        : "generalSet",
			"autoHeight": true,
			"labelWidth": 150,
			"labelAlign": "right",
			"border"    : false,
			"items"     : items
		}),
		"buttons"      : [{
			"text"   : configs.resources.run,
			"id"     : configs.runButtonHtmlName,
			"tooltip": configs.resources.tooltip,
			"handler": function(button) {
				formPanel.getForm().submit(button);
			},
			"scope"  : this
		},{
			"formBind" : true,
			"id"       : configs.applyButtonHtmlName,
			"name"     : configs.applyButtonHtmlName,
			"value"    : configs.resources.apply,
        	"text"     : configs.resources.apply,
			"handler"  : function(button) {
    			formPanel.getForm().submit(button);
			},
            "scope"    : this
	    }]
	});
	formPanel.getForm().on('beforeFormSubmit', function() {
    	//code for reorder components
    	WorkflowHelper.updateComponentPositions(this.el);
		
    	// Put the date and time of single workflow together in the corresponding hidden field
    	if (this.findField('singleRadioButton').getEl().dom.checked == true) {
    		var singleDate = this.findField('singleExecutionDateField');
    		var singleTime = this.findField('singleExecutionTimeField');
    		var singleExecutionTime = this.findField('singleExecutionTimeAndDateField');
    		singleExecutionTime.setValue(singleDate.value + ' ' + singleTime.value);
    	}
    	
    	// The same for single date and time fields inside parameters of components
		Ext.DomQuery.select('.datetimeComponentField').each(function(datetimeField){
			var date = Ext.DomQuery.select('.dateOfDatetimeField',datetimeField)[0];
			var time = Ext.DomQuery.select('.timeOfDatetimeField',datetimeField)[0];
			var input = Ext.DomQuery.select('.inputOfDatetimeField',datetimeField)[0];
			input.value = date.value + ' ' + time.value;
	    }, this);
	});
	
	var descriptionPanel = new Ext.Panel({
		"html":"<div class=\"table_title_description\">" + configs.resources.descriptionText + "</div>"
	});
	
	new Ext.Panel({
		"title"        : configs.resources.formTitle,
        "collapsible"  : true,
		"titleCollapse": true,
		"autoHeight"   : true,
		"border"       : true,
		"items"        : [descriptionPanel, formPanel],
		"renderTo"     : "integrationframework-workflowScheduleForm",
		"buttonAlign"  : "left",
		"buttons"      :[{
			"text"   : "<< Back to List",
            "handler": function(){
            	window.location.href = configs.backToListURL;
            },
            "scope"  : this
        }]
	});
	
	WorkflowHelper.radioTypeFieldsUpdater(Ext.getCmp('singleRadioButton'));
	WorkflowHelper.radioTypeFieldsUpdater(Ext.getCmp('recurringRadioButton'));
	WorkflowHelper.handleEnableNotifications(Ext.getCmp('enableNotifications'));
	
	//var singleExecutionTimeAndDateField = Ext.getCmp('singleExecutionTimeAndDateField').value.split(" ");
	//Ext.getCmp('singleExecutionDateField').setValue(singleExecutionTimeAndDateField[0]);
	//Ext.getCmp('singleExecutionTimeField').setValue(singleExecutionTimeAndDateField[1]);
	var singleDateTime = Ext.getCmp('singleExecutionTimeAndDateField').value;
    var singleDateTimeIndex = singleDateTime.indexOf(" ");
    Ext.getCmp('singleExecutionDateField').setValue(singleDateTime.substring(0, singleDateTimeIndex));
    Ext.getCmp('singleExecutionTimeField').setValue(singleDateTime.substring(singleDateTimeIndex + 1));

	
	var fs = Ext.getCmp('componentsFieldset');
    
	var dz1 = new Ext.dd.DropZone(fs.el, {
        ddGroup: 'group'
    });
	
	Ext.select('.componentWr',fs).each(
		WorkflowHelper.addDropZone
	);
	
	Ext.override(Ext.dd.DDProxy, {
		startDrag: function(x, y){
	        var dragEl = Ext.get(this.getDragEl().id);
	        var el = Ext.get(this.id);
	        var elHeader = Ext.get(Ext.DomQuery.select('.componentObject .x-panel-tl', el.dom)[0]);
	        this._fs = Ext.getCmp('componentsFieldset');
	        
			var compPanelCmp = Ext.getCmp(this.id);
			this._originalPos = this._fs.items.indexOf(compPanelCmp);
	        dragEl.applyStyles({
	            border: '',
	            'z-index': 2000,
	            height: 24
	        });
	        dragEl.update(elHeader.dom.innerHTML);
	        dragEl.addClass(elHeader.dom.className + ' dd-proxy');
	    },
	    onDragEnter: function(e, targetId){
	        var target = Ext.get(targetId);
	        if (target && target.dd instanceof Ext.dd.DDProxy) {
	            this._target = target;
	        }
	    },
	    onDragOver: function(e, targetId){
	        if (this._target) {
	            var elId = this.id;
	            if (elId != this._target.id && this._target.id == targetId) {
		            
		            var elCmp = Ext.getCmp(elId);
		            var targetPos = this._fs.items.indexOf(Ext.getCmp(this._target.id));
		            
		            var elPos = this._fs.items.indexOf(elCmp);
		            if (elPos<targetPos) {
		            	targetPos = targetPos + 1;
		            }
		            
		            var newCmp = elCmp.cloneConfig();
		            
		            // In this way we prevent errors in drag and drop for internet explorer
		            this._fs.insert(targetPos,newCmp);
		            this._fs.doLayout();
		            this._fs.remove(elCmp, true);
		            this._fs.doLayout();
		            
		            WorkflowHelper.addDropZone(newCmp.el);
		            this.id = newCmp.id;
		            this._target = Ext.get(newCmp.id);
	            }
	        }
	    },
		onDragOut: function(e, targetId) {
		    if('componentsFieldset' === targetId) {
		        var elems = Ext.select('.componentWr:not(.dd-proxy)',this._fs);
		        this._target = Ext.get(elems.elements[this._originalPos].id);
		        this.onDragOver(e,this._target.id);
		    }
		},
	    endDrag: function(){
	        this._target = null;
	        this._originalPos = null;
	        this._fs = null;
	    }
    
	});
	
	// Fix for ext js bug. The url config will not not be respected by the standardSubmit config!
	formPanel.getForm().getEl().set({action: configs.formAction});
	
	// The components are added afterwards, because for some reason the inner form elements will not be layed out correctly if they
	// are initialized through config options!
	if (configs.components && configs.components.length > 0) {
		var target = Ext.getCmp('componentsFieldset');
		var formPanel = Ext.getCmp('formPanel');
		var newElements = new Array();
		for (var i=configs.components.length-1; i>=0; i--) {
			var newElem = target.insert(0, createWorkflowComponentDefintionPanel(configs.components[i], true));
			
			newElements.push(newElem);
			sequence++;
			
			WorkflowHelper.updateFormFields(formPanel, null, newElem);
		}
		target.doLayout();
		
		// Init datetime fields of component parameters
		Ext.DomQuery.select('.datetimeComponentField').each(function(datetimeField){
			var input = Ext.DomQuery.select('.inputOfDatetimeField',datetimeField)[0];
			var datetimeRetrieved = input.value.split(" ");
			var date = Ext.DomQuery.select('.dateOfDatetimeField',datetimeField)[0];
			var time = Ext.DomQuery.select('.timeOfDatetimeField',datetimeField)[0];
			date.value = datetimeRetrieved[0];
			time.value = datetimeRetrieved[1];
			Ext.getCmp(date.id).validate();
			Ext.getCmp(time.id).validate();
	    }, this);
		
		newElements.each(function(newElem) {
			WorkflowHelper.addDropZone(newElem.el);
		});
	}
}

/**
 * Created the panel for a component row.
 * 
 * @param {Object} configs The configuration object with the dynamic data.
 * @param {boolean} collapsed true if the row should be collapsed (in case of an error the row is not collapsed).
 * 
 * @return {Ext.Panel} The created panel.
 */
function createWorkflowComponentDefintionPanel(configs, collapsed) {
	var workflowComponentDefinitions = new Array();
	for (var i=0; i<configs.workflowComponentDefinitions.length; i++) {
		workflowComponentDefinitions.push([configs.workflowComponentDefinitions[i], configs.workflowComponentDefinitions[i]]);
	}

	var parameterDefinitions = null;
	if (configs.parameterDefinitions && configs.parameterDefinitions.length > 0) {
		var items = new Array();
		
		for (var i=0; i<configs.parameterDefinitions.length; i++) {
			var formError = configs.formErrors[configs.parameterDefinitions[i].id];
			if (configs.componentInvalid == true && formError && formError.length > 0) {
				items.push({
					"style" : "margin-left: 150px",
					"layout": "form",
				    "items" : [{
				    	"xtype"    : "label",
				    	"autoWidth": true,
				    	"html"     : "<span class=\"error\">" + formError + "</span>"
				    }]
				});
			}								
			
			var field = {
				"name"      : configs.index + "_" + configs.parameterDefinitions[i].id,
				"fieldLabel": configs.parameterDefinitions[i].name
			};
			
			if (configs.parameterDefinitions[i].parameterDefinitionType == 'datetime') {
				field.name += '_date';
				field.cls = 'dateOfDatetimeField';
			}
			
			if (configs.parameterDefinitions[i].parameterDefinitionType == 'datetime' || configs.parameterDefinitions[i].parameterDefinitionType == 'date') {
				field.format = Ext.dw.LocaleResources.dateFormat;
			} else if (configs.parameterDefinitions[i].parameterDefinitionType == 'time') {
				field.format = Ext.dw.LocaleResources.timeFormat;
				field.width = 70;
			}
			
			if (configs.parameterDefinitions[i].parameterDefinitionType == 'enum') {
				field.xtype = 'combo';
				field.editable = false;
				field.triggerAction = 'all';
				field.allowBlank = false;
				field.labelSeparator = ':&nbsp;<span class=\"red_asterix\">*</span>';
				field.width = 250;
				field.minListWidth = field.width + 17;
				
				if (configs.parameterDefinitions[i].enumValues && configs.parameterDefinitions[i].enumValues.length > 0) {
					field.store = new Array();
					
					for (var j=0; j<configs.parameterDefinitions[i].enumValues.length; j++) {
						var ev = configs.parameterDefinitions[i].enumValues[j];
						if (typeof ev === 'object' && ev && 'name' in ev && 'value' in ev) {
							field.store.push([ev["value"], ev["name"]]);
						} else {
							field.store.push(configs.parameterDefinitions[i].enumValues[j]);
							//field.store.push([configs.parameterDefinitions[i].enumValues[j], configs.parameterDefinitions[i].enumValues[j]]);
						}
						
					}
				}
			} else {
				field.xtype = configs.parameterDefinitions[i].type;
			}
			
			if (configs.parameterDefinitions[i].parameterDefinitionType == 'boolean') {
				field.inputValue = configs.parameterDefinitions[i].value;
			} else {
				field.value = configs.parameterDefinitions[i].value;
			}
			
			if (configs.parameterDefinitions[i].parameterDefinitionType == 'int') {
				field.vtype = 'numeric';
			}
			
			if (configs.parameterDefinitions[i].parameterDefinitionType == 'password') {
				field.inputType = 'password';
			}
			
			if (configs.parameterDefinitions[i].checked == true) {
				field.checked = true;
			}
			
			if (configs.parameterDefinitions[i].mandatory == true) {
				field.allowBlank = false;
				field.labelSeparator = ':&nbsp;<span class=\"red_asterix\">*</span>';
			}
			
			if (configs.parameterDefinitions[i].parameterDefinitionType == 'datetime') {
				var wrapper = {
					"layout"  : "column",
					"cls"     : "datetimeComponentField",
					"border"  : false,
					"defaults": {
						"layout": "form",
						"border": false
					},
					"items"   : [
						{
						    "cls"  : "extraRightMargin",
						    "labelWidth": 150,
						    "items": field
						},{
							"labelWidth": 14,
						    "items": [{
								"name"      : configs.index + "_" + configs.parameterDefinitions[i].id + "_time",
								"cls"       : "timeOfDatetimeField",
								"xtype"     : "timefield",
								"format"    : Ext.dw.LocaleResources.timeFormat,
								"hideLabel" : true,
								"allowBlank": !(configs.parameterDefinitions[i].mandatory == true),
								"width"     : 70
							}]
						},{
							"xtype"     : "hidden",
							"allowBlank": true,
							"cls"       : "inputOfDatetimeField",
							"name"      : configs.index + "_" + configs.parameterDefinitions[i].id,
							"value"     : configs.parameterDefinitions[i].value
						}
					]
				};
														    
				items.push(wrapper);
			} else {
				items.push(field);
			}
		}
		
		parameterDefinitions = {
			"layout"  : "column",
			"border"  : false,
			"defaults": {
				"layout": "form",
				"border": false,
				"cls"   : "x-form-item"
			},
			"items"   : [
			    {
			    	"width": 155,
				    "items": [
						{
				    		"xtype": "label",
				    		"html" : "&nbsp;"
				    	}
					]
				},{
					"labelWidth": 150,
					"items"     : items
				}
			]
		};
	}
	
	var panelItems = [
		{
			"xtype"    : "hidden",
			"name"     : configs.index + "_position",
			"value"    : configs.index,
			"hidden"   : true,
			"hideLabel": true,
			"cls"      : "position"
		}, {
			"xtype"     : "textfield",
			"name"      : configs.index + '_displayName',
			"fieldLabel" : configs.resources.displayName,
			"value"     : configs.displayName,
			"width"     : 220,
			"growMin"   : 220,
			"grow"      : true
		}, new Ext.form.ComboBox({
			"width"        : 250,
			"minListWidth" : 250 + 17,
			"name"         : configs.index + "_componentType",
			"editable"     : false,
			"triggerAction": "all",
			"cls"          : "componentTypeCombo",
			"fieldLabel"   : configs.resources.type,
			"value"        : configs.name,
			"store"        : workflowComponentDefinitions,
			"listeners"    : {
				"select": function() {
					var selectElement = this.getEl();
					var fieldset = selectElement.up('.componentObject');
					var index = $(fieldset.dom).down('.position').value;
					
					new Ajax.Request(configs.newComponentURL, {
						"parameters": {
							"Index"                               : index,
							"selectedWorkflowComponentDefinitionID": selectElement.dom.value
						},
						"onSuccess" : function(response) {
							var compPanelEl = fieldset.up('.componentWr');
							var compPanelCmp = Ext.getCmp(compPanelEl.id);
					        var fs = Ext.getCmp('componentsFieldset');
				            var realIndex = fs.items.indexOf(compPanelCmp);
				            var newElem = fs.insert(realIndex, createWorkflowComponentDefintionPanel(Ext.util.JSON.decode(response.responseText), false));
				            
							fs.remove(compPanelCmp);
							fs.doLayout();
							WorkflowHelper.addDropZone(newElem.el);
							
							WorkflowHelper.updateFormFields(Ext.getCmp('formPanel'), compPanelCmp, newElem);
						}
					});
				}
			}
		}),{
			"layout"  : "column",
			"border"  : false,
			"defaults": {
				"layout": "form",
				"border": false,
				"cls"   : "x-form-item"
			},
			"items"   : [
			    {
			    	"width": 155,
				    "items": [{
				    	"xtype": "label",
				    	"text" : configs.resources.description
				    }]
				},{
					"columnWidth": 1,
					"items"      : [{
						"xtype" : "box",
						"cls"   : "staticFieldText",
						"autoEl": {"cn": configs.description}
					}]
				}
			]
		},{
			"layout"  : "column",
			"border"  : false,
			"defaults": {
				"layout": "form",
				"border": false,
				"cls"   : "x-form-item"
			},
			"items"   : [
			    {
			    	"width": 155,
				    "items": [{
				    	"xtype": "label",
				    	"text" : configs.resources.action
				    }]
				},{
					"columnWidth": 1,
					"items"      : [{
						"xtype" : "box",
						"cls"   : "staticFieldText",
						"autoEl": {cn: configs.action}
					}]
				}
			]
		},{
			"xtype"     : "checkbox",
			"name"      : configs.index + "_disabled",
			"fieldLabel": configs.resources.disabled,
			"inputValue": "true",
			"checked"   : configs.disabledChecked
		},{
			"xtype"     : "checkbox",
			"name"      : configs.index + "_asynchron",
			"fieldLabel": configs.resources.asynchron,
			"inputValue": "true",
			"checked"   : configs.asynchronChecked
		},{
			"xtype"     : "combo",
			"name"      : configs.index + "_fileLogLevel",
			"fieldLabel": configs.resources.fileLogLevel,
			"labelSeparator": ":&nbsp;<span class=\"red_asterix\">*</span>",
			"allowBlank"    : false,
			"editable"		: false,
			"store"   		: [['inherit','inherit'],['error','error'],['debug','debug'],['info','info'],['warn','warn']],
			"value"   		: configs.fileLogLevel,
			"triggerAction"	: 'all'
		},{
			"xtype"     : "combo",
			"name"      : configs.index + "_componentLogLevel",
			"fieldLabel": configs.resources.componentLogLevel,
			"labelSeparator": ":&nbsp;<span class=\"red_asterix\">*</span>",
			"allowBlank"    : false,
			"editable"		: false,
			"store"   		: [['inherit','inherit'],['error','error'],['debug','debug'],['info','info'],['warn','warn']],
			"value"   		: configs.componentLogLevel,
			"triggerAction"	: 'all'
		}
	];
	
	if (parameterDefinitions) {
		panelItems.push({
			"layout": "form",
			"items" : [
				{
			    	"xtype": "label",
			    	"text" : "Parameters:",
			    	"ctCls": "x-form-item"
			    }
			]
		});
		panelItems.push(parameterDefinitions);
	}
	
	var panel = new Ext.Panel({
		"border"   : false,
		"cls"      : "componentWr",
		"items"    : new Ext.Panel({
			"title"        : configs.resources.title,
			"collapsible"  : true,
			"collapsed"    : false,
			"titleCollapse": true,
			"cls"          : "componentObject",
			"autoHeight"   : true,
			"frame"        : true,
			"items"        : new Ext.Panel({
				"layout"    : "form",
				"labelWidth": 150,
				"items"     : panelItems
			}),
			"buttons"      : [{
				"text"   : configs.resources["delete"],
				"handler": WorkflowHelper.deleteComponent
			}],
		    "listeners"    : {
		        "render" : function (p) {
		        	if(collapsed && configs.componentInvalid != true) {
		            	p.collapse();
		        	}
		        },
		        "single" : true
		    }
		})
	});
	
	return panel;
}

/**
 * Initializes the workflow plan form.
 * 
 * @param {Object} configs The configuration object with the dynamic data.
 */
function initWorkflowPlanForm(configs) {
	var workflowScheduleGrid = new WorkflowScheduleGrid(configs);
	var dr = Ext.util.Format.dateRenderer('m/d/Y')
	
	workflowScheduleGrid.on('filterupdate',function(GridFilter,filter){
		// reload remotely for plannedstart only
		if(filter.dataIndex == "plannedstart"){
			if(filter.getValue().on){
				workflowScheduleGrid.store.reload({params : {dateFrom:dr(filter.getValue().on)}});
			}else{
				workflowScheduleGrid.store.reload({params : {dateFrom:dr(new Date())}});
			}
		}
	},workflowScheduleGrid);
	
	var descriptionPanel = new Ext.Panel({
		"autoHeight"    : true,
		"autoWidth"     : true,
		"style"         : "font:11px tahoma,arial,helvetica,sans-serif;",
		"title"         : "Description",
		"html"          : "<p style=\"padding:5px;\">The Workflow overview shows the workflows of the selected day (default is the current date). In order to select a different day please use the \"on ...\" filter of the \"Planned start\" column (note that the from/to filters won't work).<br />"+
				 		        "In order to see the content of a workflow, simply click the  \"+\" at the beginning of the row.<br />" +
				 		 		"To sort by a certain column, simply click the header of that column. At the right of each header there is a menu with additional functionality.</p>"
	});
	
	var panel = new Ext.Panel({
		"id"            : "tabPanel",
		"renderTo"      : "integrationframework-workflowPlan",
		"deferredRender": true,
		"autoHeight"    : true,
		"autoWidth"     : true,
		"items"         : [descriptionPanel,workflowScheduleGrid],
		"listeners"     : {}
	});
	panel.doLayout();
	
	workflowScheduleGrid.store.load();
}

/**
 * The general form for post submits without AJAX.
 */
var WorkflowForm = Ext.extend(Ext.form.FormPanel, {
	constructor: function(config) {
		var myConfigs = {
			"standardSubmit": true,
			"method"        : "POST",
		    "onSubmit"      : Ext.emptyFn,
		    "submit"        : function(button) {
				this.fireEvent('beforeFormSubmit');
				var f = this.getEl();
				f.createChild({"tag":"input", "type":"hidden", "name":encodeURIComponent(button.id), "value":"DoesNotMatter"});
				f.dom.submit();
			},
			"border"        : false,
			"bodyBorder"    : false
		};
		var mergedConfigs = Ext.apply(myConfigs, config);
		
		WorkflowForm.superclass.constructor.call(this, mergedConfigs);
	}
});

/**
 * A word wrapper column model.
 */
Ext.grid.WordWrapColumnModel = Ext.extend(Ext.grid.ColumnModel, {
   initComponent: function(){
      Ext.grid.WordWrapColumnModel.superclass.initComponent.apply(this, arguments);
   },

   getRenderer : function(col){
      if(!this.config[col].renderer){
         if (typeof(this.config[col].wordWrap)=='undefined' || this.config[col].wordWrap==true){
            return Ext.grid.ColumnModel.wordWrapRenderer;
         } else {
            return Ext.grid.ColumnModel.defaultRenderer;
         }
      }
      return this.config[col].renderer;
   },

   onRender: function(){
      Ext.grid.WordWrapColumnModel.superclass.onRender.apply(this, arguments);
   }
});
Ext.grid.ColumnModel.wordWrapRenderer = function(value){
    return '<div style="white-space:normal !important;">' + String.format('{0}', value) + '</div>';
};
Ext.reg('wordwrapcolumnmodel', Ext.grid.WordWrapColumnModel);

/**
 * The form for the workflow plan.
 */
var WorkflowSchedulePlanAndRunningForm = Ext.extend(WorkflowForm, {
	constructor: function(config) {
		var fieldSetConfig = {
			"autoHeight": true,
			"labelWidth": 150,
			"labelAlign": "right",
			"border"    : false
		};
		if (config && config.items) {
			fieldSetConfig.items = config.items;
			
		}
		var general = new Ext.form.FieldSet(fieldSetConfig);
	
		var myConfigs = {
			"title"        : config.resources.configureQueryParameters,
			"cls"          : "workflowFormPanel",
			"layout"       : "form",
	        "autoHeight"   : true,
	        "collapsible"  : false,
			"titleCollapse": true,
			"border"       : false,
			"bodyBorder"   : true,
	        "buttonAlign"  : "right",
        	"monitorValid" : true
		};
		var mergedConfigs = Ext.apply(myConfigs, config);
		// The items must be overwritten, because they should be added the to wrapper fieldset.
		mergedConfigs.items = general;
		
		WorkflowSchedulePlanAndRunningForm.superclass.constructor.call(this, mergedConfigs);
	}
});

/**
 * The grid in the workflow plan.
 */
var WorkflowScheduleGrid = Ext.extend(Ext.grid.GridPanel, {
	constructor: function(config) {
		// Create row expander
		var expander = new Ext.grid.RowExpander({
			"expandOnDblClick": false,
			"tpl"             : "<div class=\"ux-row-expander-box\"></div>",
			"treeLeafProperty": "is_leaf",
			"actAsTree"       : true,
			"listeners"       : {
				"expand": function(expander, record, body, rowIndex) {
					var theGrid = this.grid
					if(record.get('loaded')){
						new ComponentGrid({
							data: record.get('components'),
							element: Ext.get(theGrid.getView().getRow(rowIndex)).child('.ux-row-expander-box'),
							resources: config.resources
						});
					}else{
						var rowMask = new Ext.LoadMask(theGrid.getView().getRow(rowIndex));
						rowMask.show();
						Ext.Ajax.request({
							url: config.jsonDetailsUrl,
							success: function(data){
								record.beginEdit();
								record.set('components',Ext.util.JSON.decode(data.responseText).components);
								record.set('loaded',true);
								record.endEdit();
								new ComponentGrid({
									data: record.get('components'),
									element: Ext.get(theGrid.getView().getRow(rowIndex)).child('.ux-row-expander-box'),
									resources: config.resources
								});
								rowMask.hide();
							},
							failure: function(data){
								rowMask.hide();
							},
							params: { 
								workflowId: record.get('workflowid'),
								plannedStart: record.get('plannedstart').format('m/d/Y H:i:s'),
								siteId: record.get('siteId')
							}
						});
					}
				}
			}
		});
		
		var logFileURLRenderer = function(recordValue, metaData, record, rowIndex, columnIndex, dataStore) {
			if ( record.json.hasOwnProperty('logFileURL') && record.json.logFileURL ) {
				return '<a href="' + record.json.logFileURL + '">download</a>';
			} else {
				return  ' ';
			}
		};
		
		var cm = new Ext.grid.WordWrapColumnModel([
			expander,
			{header: config.resources.workflowName, sortable: true, menuDisabled:false, dataIndex: 'workflowname'},
			{header: config.resources.workflowPlannedStartLabel, sortable: true, menuDisabled:false, dataIndex: 'plannedstart', renderer: Ext.util.Format.dateRenderer('d.m.Y H:i:s')},
			{header: config.resources.workflowStatusLabel, sortable: true, menuDisabled:false, dataIndex: 'status' /*, renderer: statusRenderer*/ },
			{header: config.resources.workflowStartTimeLabel, sortable: true, menuDisabled:false, dataIndex: 'starttime', renderer: Ext.util.Format.dateRenderer('d.m.Y H:i:s')},
			{id:'workflowEndTime', header: config.resources.workflowEndTimeLabel, sortable: false, menuDisabled:true, dataIndex: 'endtime', renderer: Ext.util.Format.dateRenderer('d.m.Y H:i:s')},
			{header: config.resources.workflowRuntimeLabel, sortable: true, menuDisabled:false, dataIndex: 'runtime'},
			{header: config.resources.siteIds, sortable: true, menuDisabled:false, dataIndex: 'siteId'},
			{header: config.resources.logFiles, sortable: false, menuDisabled:true, dataIndex: 'logFileURL', renderer: logFileURLRenderer}
		]);
		
		var store = new Ext.data.GroupingStore({
			//url:config.jsonStoreUrl+window.location.search,
			proxy: new Ext.data.HttpProxy(
		              new Ext.data.Connection({
	                      url: config.jsonStoreUrl+window.location.search,
	                      timeout: 90000 
	                  })
	              ),
	        reader: new Ext.data.JsonReader({
			id: 'id',
			root: 'data',
			fields: [
		              {name: 'workflowid'},
		              {name: 'workflowname'},
		              {name: 'plannedstart', type: 'date'},
		              {name: 'status'},
		              {name: 'starttime'},
		              {name: 'endtime', type: 'date'},
		              {name: 'runtime'},
		              {name: 'is_leaf', type: 'bool'},
		              {name: 'siteId'},
		              {name: 'components'}
		              ]
			}),
			sortInfo: {field: 'plannedstart', direction: 'ASC'},
			remoteSort: false,
			// comment this line to disable the grouping by site 
	        	groupField:'siteId'
		});
		
		var statuses = [];
		for(var i = 0, sl = config.statuses.length; i < sl; i++){
			statuses.push(config.statuses[i].name);
		}
		var filters = new Ext.ux.grid.GridFilters({
			filters:[
			    {type: 'numeric',  dataIndex: 'id'},
			    {type: 'string',  dataIndex: 'workflowname'},
			    {type: 'date',  dataIndex: 'plannedstart'},
			    {type: 'numeric', dataIndex: 'price'},
			    {type: 'list', dataIndex: 'status', options: statuses},
			    {type: 'boolean', dataIndex: 'is_leaf'},
			    {type: 'list',  dataIndex: 'siteId', options: config.siteIds}
		    ],
		    local : true,
		    buildQuery: function(filters){
			    var p = {};
				for(var i=0, len=filters.length; i<len; i++){
			        p.filters = Ext.encode(filters);
				}
				
				return p;
			}
		});
		
		var myConfigs = {
			"title"           : config.resources.workflowPlan,
			"autoHeight"      : true,
	    	"store"           : store,
	    	"getRowClassForExpanderPlugin" : function(record, rowIndex, p, store) {
	    		return record.get('siteId').replace(/[ ]/g, '') + ' ' + record.get('status').replace(/[ ]/g, '') + ' ' + record.get('workflowid').replace(/[ ]/g, '') + ' workflowRow';
	    	},
			"view"      : new Ext.grid.GroupingView({
				"forceFit"      : true,
				"deferEmptyText": false,
				"startCollapsed": true,
				"enableGrouping": false,
				"enableNoGroups": true,
				"emptyText"     : config.resources.noProcesses
			}),
			"frame"           : true,
			"cls"             : "workflowScheduleGrid",
			"collapsible"     : false,
			"trackMouseOver"  : false,
			"disableSelection": true,
			"loadMask"        : true,
			"plugins"         : [expander,filters],
		    "cm"              : cm,
		    "bbar"    : [
		               '->', // Fill
		               {
		                 text    : 'Reload',
		                 handler : function() {
		                   //refresh source grid
		            	   store.reload();
		                 }
		               }
		             ]
             // paging bar on the bottom
//             bbar: new Ext.PagingToolbar({
//                 pageSize: 25,
//                 store: store,
//                 displayInfo: true,
//                 displayMsg: 'Displaying workflows {0} - {1} of {2}',
//                 emptyMsg: "No workflows to display"
//             })
		};
		var mergedConfigs = Ext.apply(myConfigs, config);
		
		WorkflowSchedulePlanAndRunningForm.superclass.constructor.call(this, mergedConfigs);
	}
});

/**
 * The inner component's grid in the workflow plan.
 */
var ComponentGrid = Ext.extend(Ext.grid.GridPanel, {
	constructor: function(config) {
		var store = new Ext.data.Store({
			"reader": new Ext.data.ArrayReader({},[
				{ name: 'componentname' },
				{ name: 'componentstatus' },
				{ name: 'componentstarttime' },
				{ name: 'componentendtime' },
				{ name: 'componentruntime' },
				{ name: 'is_leaf', type: 'bool' },
				{ name: 'componentlogmessages'}
			]),
			"data"  : config.data
		});
		
		var componentExpander = new Ext.grid.RowExpander({
			"expandOnDblClick": false,
			"tpl"             : "<div class=\"ux-row-expander-box\"></div>",
			"treeLeafProperty": "is_leaf",
			"actAsTree"       : true,
			"listeners"       : {
				"expand": function(expander, record, body, rowIndex) {
					new LogMessageGrid({
						"data"     : record.get('componentlogmessages'),
						"element"  : Ext.get(this.grid.getView().getRow(rowIndex)).child('.ux-row-expander-box'),
						"resources": config.resources
					});
				}
			}
		});

		                                    				
		var myConfigs = {
			"store"           : store,
			"columns"         : [
				componentExpander,
				{ id: 'componentName', header: config.resources.componentName, width: 160, sortable: true, dataIndex: 'componentname' },
				{ header: config.resources.componentStatus, width: 160, sortable: true, dataIndex: 'componentstatus' },
				{ header: config.resources.componentStartTimeLabel, width: 160, sortable: true, dataIndex: 'componentstarttime' },
				{ header: config.resources.componentEndTimeLabel, width: 160, sortable: true, dataIndex: 'componentendtime' },
				{ header: config.resources.componentRuntimeLabel, width: 160, sortable: true, dataIndex: 'componentruntime' }
			],
			"autoExpandColumn": "componentName",
			"autoHeight"      : true,
			"border"          : false,
			"width"           : "100%",
			"trackMouseOver"  : false,
			"disableSelection": true,
			"plugins"         : componentExpander,
			"getRowClassForExpanderPlugin" : function(record, rowIndex, p, store) {
	    		return record.get('componentstatus');
	    	}
		};
		var mergedConfigs = Ext.apply(myConfigs, config);
		
		ComponentGrid.superclass.constructor.call(this, mergedConfigs);
		
		config.element && this.render(config.element);
	}
});

/**
 * The inner log message grid in the workflow plan.
 */
var LogMessageGrid = Ext.extend(Ext.grid.GridPanel, {
	constructor: function(config) {
		var store = new Ext.data.Store({
			"reader": new Ext.data.ArrayReader({},[
				{ name: 'logtime' },
				{ name: 'logmessage' },
				{ name: 'files' }
			]),
			"data"  : config.data
		});
		
		var cm = new Ext.grid.WordWrapColumnModel([
			{ header: config.resources.time, width: 170, sortable: true, dataIndex: 'logtime' },
			{ id:'logMsg', header: config.resources.logMessage, width: 160, sortable: true, dataIndex: 'logmessage' },
			{ header: config.resources.logFiles, width: 100, sortable: false, dataIndex: 'files',
				renderer: function(recordValue, metaData, record, rowIndex, columnIndex, dataStore) {
					var files = record.get('files');
					var result = '';
					if (files && files.length > 0) {
						for (var i=0; i<files.length; i++) {
							result += '<a href="' + files[i] + '">' + config.resources.getLog + '</a>';
							if (i != files.length - 1) {
								result += '<br/>';
							}
						}
					}
					return result;
				}
			}
		]);
		
		var myConfigs = {
			"store"           : store,
			"cm"              : cm,
			"autoExpandColumn": "logMsg",
			"autoHeight"      : true,
			"border"          : false,
			"trackMouseOver"  : false,
			"disableSelection": true,
			"width"           : "100%"
		};
		var mergedConfigs = Ext.apply(myConfigs, config);
		
		LogMessageGrid.superclass.constructor.call(this, mergedConfigs);
		
		config.element && this.render(config.element);
	}
});

/**
 * Helper object for some general functions.
 */
var WorkflowHelper = {
	updateFormFields: function(formPanel, oldComponent, newComponent) {
		var formFieldFunction = function(component) {
			return component && component.xtype &&
				(component.xtype == 'checkbox' || component.xtype == 'combo'
				 || component.xtype == 'datefield' || component.xtype == 'fieldset'
				 || component.xtype == 'hidden' || component.xtype == 'htmleditor'
				 || component.xtype == 'numberfield' || component.xtype == 'radio'
				 || component.xtype == 'textarea' || component.xtype == 'textfield'
				 || component.xtype == 'timefield');
		};
		if (oldComponent && oldComponent != null) {
			var oldFields = oldComponent.findBy(formFieldFunction);

			for (var i=0; i<oldFields.length; i++) {
				formPanel.getForm().remove(oldFields[i]);
			}
		}

		if (newComponent && newComponent != null) {
			var newFields = newComponent.findBy(formFieldFunction);

			for (var i=0; i<newFields.length; i++) {
				formPanel.getForm().add(newFields[i]);
			}
		}
	},
	
	handleEnableNotifications: function(checkbox) {
		var fieldSet = Ext.getCmp('notificationsFieldset');
		
		if (checkbox.checked) {
			WorkflowHelper.enableFormFields(fieldSet);
		} else {
			WorkflowHelper.disableFormFields(fieldSet);
		}
	},
	
	radioTypeFieldsUpdater : function(p) {
		
		var fieldSet;
		
		if(p.inputValue=='SINGLE') {
			fieldSet = Ext.getCmp('singleWorkflowFieldset');
		}
		else if(p.inputValue=='RECURRING') {
			fieldSet = Ext.getCmp('recurringWorkflowFieldset');
		}
		
		if(p.checked) {
			WorkflowHelper.enableFormFields(fieldSet);
		}
		else {
			WorkflowHelper.disableFormFields(fieldSet);
		}
		
	},
	
	enableFormFields : function(i){
    	if (i.getXTypes().indexOf('/field/') != -1
    		|| i.getXTypes().indexOf('component/button') != -1) {
    		i.enable();
    		if ('validate' in i) {
    			i.validate();
    		}
    	}
        if(i.items) {
        	i.items.each(function(r) {
        		WorkflowHelper.enableFormFields(r);
        	});
        }
	},
	
	disableFormFields : function(i){
		if (i.getXTypes().indexOf('/field/') != -1
	    	|| i.getXTypes().indexOf('component/button') != -1) {
    		i.disable();
    		if ('clearInvalid' in i) {
    			i.clearInvalid();
    		}
    	}
        if(i.items) {
        	i.items.each(function(r) {
        		WorkflowHelper.disableFormFields(r);
        	});
        }
	},
	
	addDropZone: function(comp) {
		comp = Ext.get(comp.dom.id);
		comp.dd = new Ext.dd.DDProxy(comp.dom.id, 'group');
		// Only the header bar of the panel will response to drag event
		var panelHeaderId = Ext.get(Ext.DomQuery.select('.componentObject .x-panel-tl .x-panel-header', comp.dom)[0]).id;
		comp.dd.setHandleElId(panelHeaderId);
	},
	
	deleteComponent: function(button, e) {
    	Ext.Msg.confirm(
			'Confirm',
			'Are you sure you want to delete this component?',
			function(btn)
            {
				if(btn=='no') return;
				var fs = Ext.getCmp('componentsFieldset');
				var compId = Ext.getCmp(button.el.up('.componentWr').id).id; 
				var el = Ext.get(compId);
				fs.remove(Ext.getCmp(el.id),true);
				fs.doLayout();
            },
        	this
        );
	},
	
	updateComponentPositions: function(formElement) {
		var counter = 1;
		var fsEl = Ext.DomQuery.select('#componentsFieldset input.position', formElement.dom);
		fsEl.each(function(field) {
			field.value = counter++;
		});
	}
}
