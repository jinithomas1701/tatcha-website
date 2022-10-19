if(typeof l10n === 'undefined')
{
    var l10n=function(bundle,key,def)
    {
        return def;
    };
}


Ext.override(Ext.grid.CheckboxSelectionModel, {
	selectRow : function(row, keepExisting) {
		var deselect = this.isSelected(row);
		Ext.grid.CheckboxSelectionModel.superclass.selectRow.call(this, row, true);
		if (deselect) {
			this.deselectRow(row);
		}
	},
	handleMouseDown : function(g, rowIndex, e) {
		var wasSelected = this.isSelected(rowIndex);
		Ext.grid.CheckboxSelectionModel.superclass.handleMouseDown.call(this, g, rowIndex, e);
		if (!e.ctrlKey && wasSelected && this.isSelected(rowIndex)) {
			this.deselectRow(rowIndex);
		}
	}
});

// This fixes APP-21094, because IE 10 started doing attributes the correct way
Ext.override(Ext.Element, {
    getAttributeNS : Ext.isIE ? function(ns, name){
        var d = this.dom;
        if (!d.getAttributeNS) {
            var type = typeof d[ns+":"+name];
            if(type != 'undefined' && type != 'unknown'){
                return d[ns+":"+name];
            }
            return d[name];
        }
        return d.getAttributeNS(ns, name) || d.getAttribute(ns+":"+name) || d.getAttribute(name) || d[name];
    } : function(ns, name){
        var d = this.dom;
        return d.getAttributeNS(ns, name) || d.getAttribute(ns+":"+name) || d.getAttribute(name) || d[name];
    }
});

// This fixes parts of APP-22120: encode content before rendering it as text of a tree node,
// this fix avoids that content that contains html tags is executed as html
Ext.override(Ext.tree.TreeNodeUI, {
	onTextChange : function(node, text, oldText){
        if(this.rendered){
            this.textNode.innerHTML = Ext.util.Format.htmlEncode(text);
        }
    },
    renderElements : function(n, a, targetNode, bulkRender){
        // add some indent caching, this helps performance when rendering a large tree
        this.indentMarkup = n.parentNode ? n.parentNode.ui.getChildIndent() : '';

        var cb = typeof a.checked == 'boolean';

        var href = a.href ? a.href : Ext.isGecko ? "" : "#";
        var buf = ['<li class="x-tree-node"><div ext:tree-node-id="',n.id,'" class="x-tree-node-el x-tree-node-leaf x-unselectable ', a.cls,'" unselectable="on">',
            '<span class="x-tree-node-indent">',this.indentMarkup,"</span>",
            '<img src="', this.emptyIcon, '" class="x-tree-ec-icon x-tree-elbow" />',
            '<img src="', a.icon || this.emptyIcon, '" class="x-tree-node-icon',(a.icon ? " x-tree-node-inline-icon" : ""),(a.iconCls ? " "+a.iconCls : ""),'" unselectable="on" />',
            cb ? ('<input class="x-tree-node-cb" type="checkbox" ' + (a.checked ? 'checked="checked" />' : '/>')) : '',
            '<a hidefocus="on" class="x-tree-node-anchor" href="',href,'" tabIndex="1" ',
             a.hrefTarget ? ' target="'+a.hrefTarget+'"' : "", '><span unselectable="on">',Ext.util.Format.htmlEncode(n.text),"</span></a></div>",
            '<ul class="x-tree-node-ct" style="display:none;"></ul>',
            "</li>"].join('');

        var nel;
        if(bulkRender !== true && n.nextSibling && (nel = n.nextSibling.ui.getEl())){
            this.wrap = Ext.DomHelper.insertHtml("beforeBegin", nel, buf);
        }else{
            this.wrap = Ext.DomHelper.insertHtml("beforeEnd", targetNode, buf);
        }
        
        this.elNode = this.wrap.childNodes[0];
        this.ctNode = this.wrap.childNodes[1];
        var cs = this.elNode.childNodes;
        this.indentNode = cs[0];
        this.ecNode = cs[1];
        this.iconNode = cs[2];
        var index = 3;
        if(cb){
            this.checkbox = cs[3];
			// fix for IE6
			this.checkbox.defaultChecked = this.checkbox.checked;			
            index++;
        }
        this.anchor = cs[index];
        this.textNode = cs[index].firstChild;
    }
});

Ext.override(Ext.form.TextField, {
    // Fix bug APP-23219: text fields have a difficult time getting focus.  If you experience this problem, simply
    // call applyFocusFix and it will workaround the problem.
    applyFocusFix: function() {
        var selectOnFocus = this.selectOnFocus;
        this.el.on('mouseup', function(e){
            if (!this.hasFocus) {
                var self = this;
                setTimeout(function() {
                    self.focus();
                    if (selectOnFocus) {
                        self.select("");
                    }
                }, 30);
            }
        });
    }
});

// APP-24636: Image Manager locks browser tab using IE 9.  Workaround to add Range.createContextualFragement so
// that ExjJS will still work with IE9
if (typeof Range.prototype.createContextualFragment == "undefined") {
    Range.prototype.createContextualFragment = function(html) {
        var startNode = this.startContainer;
        var doc = startNode.nodeType == 9 ? startNode : startNode.ownerDocument;
        var container = doc.createElement("div");
        container.innerHTML = html;
        var frag = doc.createDocumentFragment(), n;
        while ( (n = container.firstChild) ) {
            frag.appendChild(n);
        }
        return frag;
    };
}


// Copied from Ext.js in the 4.2.1 source, better browser support
(function() {
    var check = function(regex){
            return regex.test(Ext.userAgent);
        },
        isStrict = document.compatMode == "CSS1Compat",
        version = function (is, regex) {
            var m;
            return (is && (m = regex.exec(Ext.userAgent))) ? parseFloat(m[1]) : 0;
        },
        docMode = document.documentMode,
        isOpera = check(/opera/),
        isOpera10_5 = isOpera && check(/version\/10\.5/),
        isChrome = check(/\bchrome\b/),
        isWebKit = check(/webkit/),
        isSafari = !isChrome && check(/safari/),
        isSafari2 = isSafari && check(/applewebkit\/4/),
        isSafari3 = isSafari && check(/version\/3/),
        isSafari4 = isSafari && check(/version\/4/),
        isSafari5_0 = isSafari && check(/version\/5\.0/),
        isSafari5 = isSafari && check(/version\/5/),
        isIE = !isOpera && check(/msie/),
        isIE7 = isIE && ((check(/msie 7/) && docMode != 8 && docMode != 9 && docMode != 10) || docMode == 7),
        isIE8 = isIE && ((check(/msie 8/) && docMode != 7 && docMode != 9 && docMode != 10) || docMode == 8),
        isIE9 = isIE && ((check(/msie 9/) && docMode != 7 && docMode != 8 && docMode != 10) || docMode == 9),
        isIE10 = isIE && ((check(/msie 10/) && docMode != 7 && docMode != 8 && docMode != 9) || docMode == 10),
        isIE6 = isIE && check(/msie 6/),
        isGecko = !isWebKit && check(/gecko/),
        isGecko3 = isGecko && check(/rv:1\.9/),
        isGecko4 = isGecko && check(/rv:2\.0/),
        isGecko5 = isGecko && check(/rv:5\./),
        isGecko10 = isGecko && check(/rv:10\./),
        isFF3_0 = isGecko3 && check(/rv:1\.9\.0/),
        isFF3_5 = isGecko3 && check(/rv:1\.9\.1/),
        isFF3_6 = isGecko3 && check(/rv:1\.9\.2/),
        isWindows = check(/windows|win32/),
        isMac = check(/macintosh|mac os x/),
        isLinux = check(/linux/),
        chromeVersion = version(true, /\bchrome\/(\d+\.\d+)/),
        firefoxVersion = version(true, /\bfirefox\/(\d+\.\d+)/),
        ieVersion = version(isIE, /msie (\d+\.\d+)/),
        operaVersion = version(isOpera, /version\/(\d+\.\d+)/),
        safariVersion = version(isSafari, /version\/(\d+\.\d+)/),
        webKitVersion = version(isWebKit, /webkit\/(\d+\.\d+)/),
        isSecure = /^https/i.test(window.location.protocol);

    Ext.dw = Ext.dw || {};
    Ext.dw.BrowserSupport = {
        isIEQuirks: isIE && (!isStrict && (isIE6 || isIE7 || isIE8 || isIE9)),
        isOpera : isOpera,
        isOpera10_5 : isOpera10_5,
        isWebKit : isWebKit,
        isChrome : isChrome,
        isSafari : isSafari,
        isSafari3 : isSafari3,
        isSafari4 : isSafari4,
        isSafari5 : isSafari5,
        isSafari5_0 : isSafari5_0,
        isSafari2 : isSafari2,
        isIE : isIE,
        isIE6 : isIE6,
        isIE7 : isIE7,
        isIE7m : isIE6 || isIE7,
        isIE7p : isIE && !isIE6,
        isIE8 : isIE8,
        isIE8m : isIE6 || isIE7 || isIE8,
        isIE8p : isIE && !(isIE6 || isIE7),
        isIE9 : isIE9,
        isIE9m : isIE6 || isIE7 || isIE8 || isIE9,
        isIE9p : isIE && !(isIE6 || isIE7 || isIE8),
        isIE10 : isIE10,
        isIE10m : isIE6 || isIE7 || isIE8 || isIE9 || isIE10,
        isIE10p : isIE && !(isIE6 || isIE7 || isIE8 || isIE9),
        isGecko : isGecko,
        isGecko3 : isGecko3,
        isGecko4 : isGecko4,
        isGecko5 : isGecko5,
        isGecko10 : isGecko10,
        isFF3_0 : isFF3_0,
        isFF3_5 : isFF3_5,
        isFF3_6 : isFF3_6,
        isFF4 : 4 <= firefoxVersion && firefoxVersion < 5,
        isFF5 : 5 <= firefoxVersion && firefoxVersion < 6,
        isFF10 : 10 <= firefoxVersion && firefoxVersion < 11,
        isLinux : isLinux,
        isWindows : isWindows,
        isMac : isMac,
        chromeVersion: chromeVersion,
        firefoxVersion: firefoxVersion,
        ieVersion: ieVersion,
        operaVersion: operaVersion,
        safariVersion: safariVersion,
        webKitVersion: webKitVersion,
        isSecure: isSecure
    };
})();

// APP-23552: IE10 - When searching for images, search and clear button disappear
// Change Ext.isIE to this.isIE.  This only makes it IE before 10 (when it was quirks mode)
Ext.override(Ext.form.TriggerField, {
    afterRender : function(){
        Ext.form.TriggerField.superclass.afterRender.call(this);
        var y;
        if(this.isIE() && this.el.getY() != (y = this.trigger.getY())){
            this.el.position();
            this.el.setY(y);
        }
    },

    onFocus : function(){
        Ext.form.TriggerField.superclass.onFocus.call(this);
        if(!this.mimicing){
            this.wrap.addClass('x-trigger-wrap-focus');
            this.mimicing = true;
            Ext.get(this.isIE() ? document.body : document).on("mousedown", this.mimicBlur, this, {delay: 10});
            if(this.monitorTab){
                this.el.on("keydown", this.checkTab, this);
            }
        }
    },

    // private
    triggerBlur : function(){
        this.mimicing = false;
        Ext.get(this.isIE() ? document.body : document).un("mousedown", this.mimicBlur, this);
        if(this.monitorTab){
            this.el.un("keydown", this.checkTab, this);
        }
        this.beforeBlur();
        this.wrap.removeClass('x-trigger-wrap-focus');
        Ext.form.TriggerField.superclass.onBlur.call(this);
    },

    isIE: function() {
        return Ext.dw.BrowserSupport.isIEQuirks;
    }
});

if (Ext.form.TextField)
{
    Ext.form.TextField.prototype.blankText=l10n("extjs.overrides","textfield.msg.required","This field is required.");
    Ext.form.TextField.prototype.minLengthText = l10n("extjs.overrides","textfield.msg.min_length","The minimum length for this field is {0}.");
    Ext.form.TextField.prototype.maxLengthText = l10n("extjs.overrides","textfield.msg.max_length","The maximum length for this field is {0}.");
}

/**
 * List compiled by mystix on the extjs.com forums.
 * Thank you Mystix!
 *
 * English Translations
 */


Ext.UpdateManager.defaults.indicatorText = '<div class="loading-indicator">'+(l10n("extjs.overrides","msg.loading","Loading..."))+'</div>';

if(Ext.View){
  Ext.View.prototype.emptyText = "";
}

if(Ext.grid.GridPanel){
  Ext.grid.GridPanel.prototype.ddText =l10n("extjs.overrides","gridpanel.msg.selected","{0} selected row(s)");
}

if(Ext.TabPanelItem){
  Ext.TabPanelItem.prototype.closeText =l10n("extjs.overrides","tabpanel.msg.close","Close this tab");
}

if(Ext.LoadMask){
  Ext.LoadMask.prototype.msg =l10n("extjs.overrides","msg.loading","Loading...");
}


if(Ext.util.Format){
  Ext.util.Format.date = function(v, format){
    if(!v) return "";
    if(!(v instanceof Date)) v = new Date(Date.parse(v));
    return v.dateFormat(format || "m/d/Y");
  };
}


if(Ext.PagingToolbar){
  Ext.override(Ext.PagingToolbar, {
    beforePageText :l10n("extjs.overrides","paging.msg.page.1","Page"),
    afterPageText  :l10n("extjs.overrides","paging.msg.page.2","of {0}"),
    firstText      :l10n("extjs.overrides","paging.button.first","First Page"),
    prevText       :l10n("extjs.overrides","paging.button.previous","Previous Page"),
    nextText       :l10n("extjs.overrides","paging.button.next","Next Page"),
    lastText       :l10n("extjs.overrides","paging.button.last","Last Page"),
    refreshText    :l10n("extjs.overrides","paging.button.refresh","Refresh"),
    displayMsg     :l10n("extjs.overrides","paging.msg.elements","Displaying {0} - {1} of {2}"),
    emptyMsg       :l10n("extjs.overrides","paging.msg.page.empty","No data to display")
  });
}

if(Ext.form.Field){
  Ext.form.Field.prototype.invalidText = l10n("extjs.overrides","form.error.invalid","The value in this field is invalid.");
}

if(Ext.form.TextField){
  Ext.override(Ext.form.TextField, {
    minLengthText :l10n("extjs.overrides","textfield.msg.min_length","The minimum length for this field is {0}."),
    maxLengthText :l10n("extjs.overrides","textfield.msg.max_length","The maximum length for this field is {0}."),
    blankText     :l10n("extjs.overrides","textfield.msg.required","This field is required."),
    regexText     : "",
    emptyText     : null
  });
}

if(Ext.form.NumberField){
  Ext.override(Ext.form.NumberField, {
    minText :l10n("extjs.overrides","numberfield.msg.min_length","The minimum value for this field is {0}."),
    maxText :l10n("extjs.overrides","numberfield.msg.max_length","The maximum value for this field is {0}."),
    nanText :l10n("extjs.overrides","numberfield.error.invalid","{0} is not a valid number.")
  });
}

if(Ext.form.DateField){
  Ext.override(Ext.form.DateField, {
    disabledDaysText  :l10n("extjs.overrides","datefield.msg.disabled_days","Disabled"),
    disabledDatesText :l10n("extjs.overrides","datefield.msg.disabled_dates","Disabled"),
    minText           :l10n("extjs.overrides","datefield.error.date_after","The date in this field must be after {0}."),
    maxText           :l10n("extjs.overrides","datefield.error.date_before","The date in this field must be before {0}."),
    invalidText       :l10n("extjs.overrides","datefield.error.date_invalid","{0} is not a valid date. It must be in the format {1}."),
    format            :l10n("extjs.overrides","datefield.date_format","m/d/y"),
    altFormats        :l10n("extjs.overrides","datefield.date_alt_formats","m/d/Y|m-d-y|m-d-Y|m/d|m-d|md|mdy|mdY|d|Y-m-d")
  });
}

if(Ext.form.ComboBox){
  Ext.override(Ext.form.ComboBox, {
    loadingText       :l10n("extjs.overrides","combobox.msg.loading","Loading..."),
    valueNotFoundText : undefined
  });
}


if(Ext.form.HtmlEditor){
  Ext.override(Ext.form.HtmlEditor, {
    createLinkText :l10n("extjs.overrides","htmleditor.label.create_link","Please enter the URL for the link:"),
    buttonTips : {
      bold : {
        title:l10n("extjs.overrides","htmleditor.tooltip.bold.title","Bold (Ctrl+B)."),
        text:l10n("extjs.overrides","htmleditor.tooltip.bold.text","Make the selected text bold."),
        cls: 'x-html-editor-tip'
      },
      italic : {
        title:l10n("extjs.overrides","htmleditor.tooltip.italic.title","Italic (Ctrl+I)."),
        text:l10n("extjs.overrides","htmleditor.tooltip.italic.text","Make the selected text italic."),
        cls: 'x-html-editor-tip'
      },
      underline : {
        title:l10n("extjs.overrides","htmleditor.tooltip.underline.title","Underline (Ctrl+U)."),
        text:l10n("extjs.overrides","htmleditor.tooltip.underline.text","Underline the selected text."),
        cls: 'x-html-editor-tip'
      },
      increasefontsize : {
        title:l10n("extjs.overrides","htmleditor.tooltip.increase_font.title","Grow text."),
        text:l10n("extjs.overrides","htmleditor.tooltip.increase_font.text","Increase the font size."),
        cls: 'x-html-editor-tip'
      },
      decreasefontsize : {
        title:l10n("extjs.overrides","htmleditor.tooltip.decrease_font.title","Shrink text."),
        text:l10n("extjs.overrides","htmleditor.tooltip.decrease_font.text","Decrease the font size."),
        cls: 'x-html-editor-tip'
      },
      backcolor : {
        title:l10n("extjs.overrides","htmleditor.tooltip.backcolor.title","Text highlight color."),
        text:l10n("extjs.overrides","htmleditor.tooltip.backcolor.text","Change the background color of the selected text."),
        cls: 'x-html-editor-tip'
      },
      forecolor : {
        title:l10n("extjs.overrides","htmleditor.tooltip.forecolor.title","Font color."),
        text:l10n("extjs.overrides","htmleditor.tooltip.forecolor.text","Change the color of the selected text."),
        cls: 'x-html-editor-tip'
      },
      justifyleft : {
        title:l10n("extjs.overrides","htmleditor.tooltip.left.title","Align text left."),
        text:l10n("extjs.overrides","htmleditor.tooltip.left.text","Align text to the left."),
        cls: 'x-html-editor-tip'
      },
      justifycenter : {
        title:l10n("extjs.overrides","htmleditor.tooltip.center.title","Center text."),
        text:l10n("extjs.overrides","htmleditor.tooltip.center.text","Center text in the editor."),
        cls: 'x-html-editor-tip'
      },
      justifyright : {
        title:l10n("extjs.overrides","htmleditor.tooltip.right.title","Align text right."),
        text:l10n("extjs.overrides","htmleditor.tooltip.right.text","Align text to the right."),
        cls: 'x-html-editor-tip'
      },
      insertunorderedlist : {
        title:l10n("extjs.overrides","htmleditor.tooltip.unordered_list.title","Bullet list."),
        text:l10n("extjs.overrides","htmleditor.tooltip.unordered_list.text","Start a bulleted list."),
        cls: 'x-html-editor-tip'
      },
      insertorderedlist : {
        title:l10n("extjs.overrides","htmleditor.tooltip.ordered_list.title","Numbered list."),
        text:l10n("extjs.overrides","htmleditor.tooltip.ordered_list.text","Start a numbered list."),
        cls: 'x-html-editor-tip'
      },
      createlink : {
        title:l10n("extjs.overrides","htmleditor.tooltip.createlink.title","Hyperlink."),
        text: l10n("extjs.overrides","htmleditor.tooltip.createlink.text","Make the selected text a hyperlink."),
        cls: 'x-html-editor-tip'
      },
      sourceedit : {
        title:l10n("extjs.overrides","htmleditor.tooltip.source.title","Source edit."),
        text:l10n("extjs.overrides","htmleditor.tooltip.source.text","Switch to source editing mode."),
        cls: 'x-html-editor-tip'
      }
    }
  });
}

if(Ext.form.BasicForm){
  Ext.form.BasicForm.prototype.waitTitle =l10n("extjs.overrides","form.loading","Please wait...");
}

if(Ext.grid.GridView){
  Ext.apply(Ext.grid.GridView.prototype, {
    sortAscText  :l10n("extjs.overrides","gridview.button.sort_asc","Sort Ascending"),
    sortDescText :l10n("extjs.overrides","gridview.button.sort_desc","Sort Descending"),
    lockText     :l10n("extjs.overrides","gridview.button.lock_column","Lock Column"),
    unlockText   :l10n("extjs.overrides","gridview.button.unlock_column","Unlock Column"),
    columnsText  :l10n("extjs.overrides","gridview.button.title.columns","Columns")
  });
}

if(Ext.grid.GroupingView){
  Ext.apply(Ext.grid.GroupingView.prototype, {
    emptyGroupText :l10n("extjs.overrides","groupingview.msg.empty","(None)"),
    groupByText    :l10n("extjs.overrides","groupingview.button.group_by","Group by This Field"),
    showGroupsText :l10n("extjs.overrides","groupingview.button.show_groups","Show in Groups")
  });
}

if(Ext.grid.PropertyColumnModel){
  Ext.apply(Ext.grid.PropertyColumnModel.prototype, {
    nameText   :l10n("extjs.overrides","prop_columns.column.name","Name"),
    valueText  :l10n("extjs.overrides","prop_columns.column.value","Value"),
    dateFormat :l10n("extjs.overrides","prop_columns.date_format","m/j/Y")
  });
}

if(Ext.layout.BorderLayout && Ext.layout.BorderLayout.SplitRegion){
  Ext.apply(Ext.layout.BorderLayout.SplitRegion.prototype, {
    splitTip            :l10n("extjs.overrides","borderlayout.tooltip.drag_resize","Drag to resize."),
    collapsibleSplitTip :l10n("extjs.overrides","borderlayout.tooltip.splitter","Drag to resize. Double click to hide.")
  });
}


if(Ext.MessageBox){
  Ext.MessageBox.buttonText= {
    ok     :l10n("extjs.overrides","messagebox.button.ok","OK"),
    cancel :l10n("extjs.overrides","messagebox.button.cancel","Cancel"),
    yes    :l10n("extjs.overrides","messagebox.button.yes","Yes"),
    no     :l10n("extjs.overrides","messagebox.button.no","No")
  };
}

Ext.override(Date.monthNames = [
  l10n("extjs.overrides","datepicker.month.jan","January"),
  l10n("extjs.overrides","datepicker.month.feb","February"),
  l10n("extjs.overrides","datepicker.month.mar","March"),
  l10n("extjs.overrides","datepicker.month.apr","April"),
  l10n("extjs.overrides","datepicker.month.may","May"),
  l10n("extjs.overrides","datepicker.month.jun","June"),
  l10n("extjs.overrides","datepicker.month.jul","July"),
  l10n("extjs.overrides","datepicker.month.aug","August"),
  l10n("extjs.overrides","datepicker.month.sep","September"),
  l10n("extjs.overrides","datepicker.month.oct","October"),
  l10n("extjs.overrides","datepicker.month.nov","November"),
  l10n("extjs.overrides","datepicker.month.dec","December")
]);

Ext.override(Date.getShortMonthName = [
  l10n("extjs.overrides","datepicker.month_short.jan","Jan"),
  l10n("extjs.overrides","datepicker.month_short.feb","Feb"),
  l10n("extjs.overrides","datepicker.month_short.mar","Mar"),
  l10n("extjs.overrides","datepicker.month_short.apr","Apr"),
  l10n("extjs.overrides","datepicker.month_short.may","May"),
  l10n("extjs.overrides","datepicker.month_short.jun","Jun"),
  l10n("extjs.overrides","datepicker.month_short.jul","Jul"),
  l10n("extjs.overrides","datepicker.month_short.aug","Aug"),
  l10n("extjs.overrides","datepicker.month_short.sep","Sep"),
  l10n("extjs.overrides","datepicker.month_short.oct","Oct"),
  l10n("extjs.overrides","datepicker.month_short.nov","Nov"),
  l10n("extjs.overrides","datepicker.month_short.dec","Dec")
]);
Date.prototype.dayNames = [
  l10n("extjs.overrides","datepicker.days.sun","Sunday"),
  l10n("extjs.overrides","datepicker.days.mon","Monday"),
  l10n("extjs.overrides","datepicker.days.tue","Tuesday"),
  l10n("extjs.overrides","datepicker.days.wed","Wednesday"),
  l10n("extjs.overrides","datepicker.days.thu","Thursday"),
  l10n("extjs.overrides","datepicker.days.fri","Friday"),
  l10n("extjs.overrides","datepicker.days.sat","Saturday")
];


if(Ext.ux.DatePickerPlus){
  Ext.override(Ext.ux.DatePickerPlus, {
    todayText         : l10n("extjs.overrides","datepicker.button.today","Today"),
    minText           : l10n("extjs.overrides","datepicker.error.date_before","This date is before the minimum date."),
    maxText           : l10n("extjs.overrides","datepicker.error.date_after","This date is after the maximum date."),
    disabledDaysText  : "",
    disabledDatesText : "",
    monthNames        : Date.monthNames,
    dayNames          : Date.dayNames,
    nextText          : l10n("extjs.overrides","datepicker.tooltip.next_month","Next month (Control+Right)."),
    prevText          : l10n("extjs.overrides","datepicker.tooltip.prev_month","Previous month (Control+Left)."),
    monthYearText     : l10n("extjs.overrides","datepicker.tooltip.choose_month","Choose a month (Control+Up/Down to move years)."),
    todayTip          : l10n("extjs.overrides","datepicker.tooltip.today","{0} (Spacebar)."),
    format            : l10n("extjs.overrides","datepicker.date_format","m/d/y"),
    okText            : l10n("extjs.overrides","datepicker.button.ok","OK"),
    cancelText        : l10n("extjs.overrides","datepicker.button.cancel","Cancel"),
    startDay          : 0,
    weekName          : l10n("extjs.overrides","datepicker.label.week","Wk"),
    selectWeekText    : l10n("extjs.overrides","datepicker.tooltip.all_days","Click to select all days of this week."),
    selectMonthText   : l10n("extjs.overrides","datepicker.tooltip.all_weeks","Click to select all weeks of this month."),
    maxSelectionDaysTitle : l10n("extjs.overrides","datepicker.title","Datepicker"),
	maxSelectionDaysText : l10n("extjs.overrides","datepicker.error.max_days","You can only select a maximum amount of %0 days."),
	undoText          : l10n("extjs.overrides","datepicker.button.undo","Undo"),
    displayMaskText   : l10n("extjs.overrides","datepicker.msg.wait","Please wait..."),
    nextYearText      : l10n("extjs.overrides","datepicker.tooltip.next_year","Next year (Control+Up)."),
	prevYearText      : l10n("extjs.overrides","datepicker.tooltip.prev_vear","Previous year (Control+Down).")
  });
}
if(Ext.DatePicker){
  Ext.override(Ext.DatePicker, {
    todayText         : l10n("extjs.overrides","datepicker.button.today","Today"),
    minText           : l10n("extjs.overrides","datepicker.error.date_before","This date is before the minimum date."),
    maxText           : l10n("extjs.overrides","datepicker.error.date_after","This date is after the maximum date."),
    disabledDaysText  : "",
    disabledDatesText : "",
    monthNames        : Date.monthNames,
    dayNames          : Date.dayNames,
    nextText          : l10n("extjs.overrides","datepicker.tooltip.next_month","Next month (Control+Right)."),
    prevText          : l10n("extjs.overrides","datepicker.tooltip.prev_month","Previous month (Control+Left)."),
    monthYearText     : l10n("extjs.overrides","datepicker.tooltip.choose_month","Choose a month (Control+Up/Down to move years)."),
    todayTip          : l10n("extjs.overrides","datepicker.tooltip.today","{0} (Spacebar)."),
    format            : l10n("extjs.overrides","datepicker.date_format","m/d/y"),
    okText            : l10n("extjs.overrides","datepicker.button.ok","OK"),
    cancelText        : l10n("extjs.overrides","datepicker.button.cancel","Cancel"),
    startDay          : 0,
    weekName          : l10n("extjs.overrides","datepicker.label.week","Wk"),
    selectWeekText    : l10n("extjs.overrides","datepicker.tooltip.all_days","Click to select all days of this week."),
    selectMonthText   : l10n("extjs.overrides","datepicker.tooltip.all_weeks","Click to select all weeks of this month."),
    maxSelectionDaysTitle : l10n("extjs.overrides","datepicker.title","Datepicker"),
	maxSelectionDaysText : l10n("extjs.overrides","datepicker.error.max_days","You can only select a maximum amount of %0 days."),
	undoText          : l10n("extjs.overrides","datepicker.button.undo","Undo"),
    displayMaskText   : l10n("extjs.overrides","datepicker.msg.wait","Please wait..."),
    nextYearText      : l10n("extjs.overrides","datepicker.tooltip.next_year","Next year (Control+Up)."),
	prevYearText      : l10n("extjs.overrides","datepicker.tooltip.prev_vear","Previous year (Control+Down).")
  });
}
